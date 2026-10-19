import { useCallback, useEffect, useRef, useState } from 'react';
import { online, type OnlinePlayer, type OnlineRoom, type OnlineSession } from './api';

export type RoomProblem = 'closed' | 'kicked' | null;

/**
 * Mantém a sala sincronizada: tempo real do Supabase + conferência periódica
 * (se o tempo real cair, a partida continua funcionando, só um pouco mais devagar).
 */
export function useOnlineRoom(session: OnlineSession | null) {
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [live, setLive] = useState(false);
  const [netError, setNetError] = useState<string | null>(null);
  const [problem, setProblem] = useState<RoomProblem>(null);
  const inflight = useRef(false);
  const queued = useRef(false);
  const lastVersion = useRef(-1);

  const refresh = useCallback(async () => {
    if (!session) return;
    if (inflight.current) {
      queued.current = true;
      return;
    }
    inflight.current = true;
    try {
      const data = await online.fetchRoom(session.roomId);
      setNetError(null);
      if (!data.room) {
        setProblem('closed');
        return;
      }
      const me = data.players.find((p) => p.id === session.playerId);
      if (!me || me.left_at) {
        setProblem('kicked');
        return;
      }
      if (data.room.version !== lastVersion.current) {
        lastVersion.current = data.room.version;
        setRoom(data.room);
      }
      setPlayers((prev) => (JSON.stringify(prev) === JSON.stringify(data.players) ? prev : data.players));
    } catch (e) {
      setNetError((e as Error).message);
    } finally {
      inflight.current = false;
      if (queued.current) {
        queued.current = false;
        void refresh();
      }
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    lastVersion.current = -1;
    setRoom(null);
    setPlayers([]);
    setProblem(null);
    void refresh();
    const unsubscribe = online.subscribe(session.roomId, () => void refresh(), setLive);
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [session, refresh]);

  // Conferência periódica: rápida sem tempo real, lenta com tempo real.
  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => void refresh(), live ? 8000 : 2000);
    return () => window.clearInterval(id);
  }, [session, live, refresh]);

  return { room, players, live, netError, problem, refresh };
}
