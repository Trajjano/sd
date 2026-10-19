import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  KEYS,
  clearStats,
  loadActiveMatch,
  loadSettings,
  loadSetup,
  loadStats,
  memoryStore,
  saveActiveMatch,
  saveSettings,
  saveSetup,
  saveStats,
} from './storage';
import { createMatch, finishMatch } from '../game/engine/match';
import { QUESTIONS } from '../data/questions';
import { seededRng } from '../utils/random';
import { emptyLifetimeStats } from '../game/scoring/summary';

describe('persistência', () => {
  it('salva e recarrega configurações', () => {
    const store = memoryStore();
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    saveSettings(store, { sound: false, haptics: false, allowSelfVote: true, motion: 'reduced' });
    expect(loadSettings(store)).toEqual({ sound: false, haptics: false, allowSelfVote: true, motion: 'reduced' });
  });

  it('ignora dados corrompidos e usa padrões', () => {
    const store = memoryStore();
    store.setItem(KEYS.settings, '{quebrado');
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    store.setItem(KEYS.settings, JSON.stringify({ sound: 'sim', motion: 'turbo' }));
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
  });

  it('lembra a última configuração de partida', () => {
    const store = memoryStore();
    saveSetup(store, { names: ['Ana', 'Bia', 'Caio', 'Duda'], rounds: 7, categories: ['festa'], includeHeavy: true, mode: 'survival' });
    const s = loadSetup(store);
    expect(s.names).toEqual(['Ana', 'Bia', 'Caio', 'Duda']);
    expect(s.rounds).toBe(7);
    expect(s.categories).toEqual(['festa']);
    expect(s.mode).toBe('survival');
    store.setItem(KEYS.setup, JSON.stringify({ names: ['Ana'], categories: ['inexistente'], rounds: 999 }));
    const fixed = loadSetup(store);
    expect(fixed.names).toHaveLength(3);
    expect(fixed.categories.length).toBeGreaterThan(0);
    expect(fixed.rounds).toBe(10);
  });

  it('salva, limpa estatísticas e guarda partida em andamento', () => {
    const store = memoryStore();
    saveStats(store, { ...emptyLifetimeStats(), matches: 3 });
    expect(loadStats(store).matches).toBe(3);
    clearStats(store);
    expect(loadStats(store).matches).toBe(0);

    const m = createMatch(
      { players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }], rounds: 3, categories: ['caos'], includeHeavy: false, mode: 'secret', allowSelfVote: false },
      QUESTIONS,
      seededRng(1),
    );
    saveActiveMatch(store, m);
    expect(loadActiveMatch(store)?.id).toBe(m.id);
    saveActiveMatch(store, finishMatch(m));
    expect(loadActiveMatch(store)).toBeNull();
  });
});
