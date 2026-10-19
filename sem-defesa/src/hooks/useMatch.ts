import { useCallback, useEffect, useRef, useState } from 'react';
import type { MatchConfig, MatchState } from '../types';
import { createMatch, reduceMatch, restartMatch, type MatchAction } from '../game/engine/match';
import { GameRuleError } from '../game/rules/voting';
import { recordMatch } from '../game/scoring/summary';
import { QUESTIONS } from '../data/questions';
import { loadActiveMatch, loadRecent, pushRecent, saveActiveMatch } from '../services/storage';
import { useApp } from '../app/AppContext';
import { defaultRng } from '../utils/random';

/** Liga a máquina de estados pura à interface: persistência, estatísticas e erros. */
export function useMatch(onError: (msg: string) => void) {
  const { store, stats, setStats } = useApp();
  const [match, setMatch] = useState<MatchState | null>(null);
  const [resumable, setResumable] = useState<MatchState | null>(() => loadActiveMatch(store));
  const recorded = useRef<Set<string>>(new Set());
  const statsRef = useRef(stats);
  statsRef.current = stats;

  // Salva a partida em andamento; registra estatísticas uma única vez ao terminar.
  useEffect(() => {
    if (!match) return;
    saveActiveMatch(store, match);
    if (match.phase === 'finished' && !recorded.current.has(match.id)) {
      recorded.current.add(match.id);
      setStats(recordMatch(statsRef.current, match));
      pushRecent(
        store,
        match.history.map((r) => r.question.id),
      );
    }
  }, [match, store, setStats]);

  const dispatch = useCallback(
    (action: MatchAction) => {
      setMatch((prev) => {
        if (!prev) return prev;
        try {
          return reduceMatch(prev, action, defaultRng);
        } catch (e) {
          const msg = e instanceof GameRuleError ? e.message : 'Algo deu errado. Tente de novo.';
          queueMicrotask(() => onError(msg));
          return prev;
        }
      });
    },
    [onError],
  );

  const start = useCallback(
    (config: MatchConfig) => {
      const m = createMatch(config, QUESTIONS, defaultRng, loadRecent(store));
      setResumable(null);
      setMatch(m);
      return m;
    },
    [store],
  );

  const restart = useCallback(() => {
    setMatch((prev) => (prev ? restartMatch(prev, QUESTIONS, defaultRng) : prev));
  }, []);

  const resume = useCallback(() => {
    if (!resumable) return;
    setMatch(resumable);
    setResumable(null);
  }, [resumable]);

  /** Sai da partida mantendo-a salva para continuar depois. */
  const suspend = useCallback(() => {
    if (match && match.phase !== 'finished') setResumable(match);
    setMatch(null);
  }, [match]);

  const discard = useCallback(() => {
    saveActiveMatch(store, null);
    setResumable(null);
    setMatch(null);
  }, [store]);

  return { match, resumable, dispatch, start, restart, resume, suspend, discard };
}
