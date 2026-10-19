import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CategoryId, Question, RoundResult } from '../types';

/**
 * Modo online: cada jogador no próprio celular.
 * Toda regra do jogo online roda no banco (supabase/schema.sql); aqui só chamamos as funções.
 */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const onlineConfigured = Boolean(URL && KEY);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!URL || !KEY) throw new OnlineError('Modo online não configurado neste site.');
  if (!client) {
    client = createClient(URL, KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return client;
}

export class OnlineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OnlineError';
  }
}

export type OnlineMode = 'secret' | 'survival';

export interface OnlineConfig {
  rounds: number;
  mode: OnlineMode;
  allowSelfVote: boolean;
  includeHeavy: boolean;
  categories: CategoryId[];
  /** Mistura o pacote Resenha dos caras. */
  menOnly?: boolean;
}

export interface OnlineRoom {
  id: string;
  code: string;
  host_id: string | null;
  status: 'lobby' | 'voting' | 'reveal' | 'finished';
  config: OnlineConfig;
  round: number;
  question: Question | null;
  voter_ids: string[];
  candidate_ids: string[];
  voted_ids: string[];
  survivors: string[];
  history: RoundResult[];
  version: number;
  updated_at: string;
}

export interface OnlinePlayer {
  id: string;
  name: string;
  seat: number;
  left_at: string | null;
}

export interface OnlineSession {
  roomId: string;
  code: string;
  playerId: string;
  secret: string;
  name: string;
}

function friendly(e: unknown): OnlineError {
  const msg = (e as { message?: string })?.message ?? '';
  if (/Failed to fetch|NetworkError|Load failed|fetch/i.test(msg) && !/Sala|jogador|votou|anfitri/i.test(msg))
    return new OnlineError('Sem conexão com o servidor. Confira a internet e tente de novo.');
  return new OnlineError(msg || 'Algo deu errado. Tente de novo.');
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new OnlineError('Você está sem internet.');
  try {
    const { data, error } = await supabase().rpc(fn, args);
    if (error) throw error;
    return data as T;
  } catch (e) {
    throw friendly(e);
  }
}

const auth = (s: OnlineSession) => ({ p_room: s.roomId, p_player: s.playerId, p_secret: s.secret });

type Creds = { room_id: string; code: string; player_id: string; secret: string };
const toSession = (c: Creds, name: string): OnlineSession => ({
  roomId: c.room_id,
  code: c.code,
  playerId: c.player_id,
  secret: c.secret,
  name,
});

export const online = {
  async createRoom(name: string, config: OnlineConfig) {
    const c = await call<Creds>('sd_create_room', { p_name: name, p_config: config });
    return toSession(c, name.trim());
  },
  async joinRoom(code: string, name: string) {
    const c = await call<Creds>('sd_join_room', { p_code: code, p_name: name });
    return toSession(c, name.trim());
  },
  updateConfig: (s: OnlineSession, config: OnlineConfig) => call<void>('sd_update_config', { ...auth(s), p_config: config }),
  kick: (s: OnlineSession, target: string) => call<void>('sd_kick', { ...auth(s), p_target: target }),
  leave: (s: OnlineSession) => call<void>('sd_leave', auth(s)),
  start: (s: OnlineSession, deck: Question[]) => call<void>('sd_start', { ...auth(s), p_deck: deck }),
  skip: (s: OnlineSession) => call<void>('sd_skip', auth(s)),
  vote: (s: OnlineSession, target: string) => call<void>('sd_vote', { ...auth(s), p_target: target }),
  closeVoting: (s: OnlineSession) => call<void>('sd_close_voting', auth(s)),
  next: (s: OnlineSession) => call<void>('sd_next', auth(s)),
  finish: (s: OnlineSession) => call<void>('sd_finish', auth(s)),
  backToLobby: (s: OnlineSession) => call<void>('sd_back_to_lobby', auth(s)),

  async fetchRoom(roomId: string): Promise<{ room: OnlineRoom | null; players: OnlinePlayer[] }> {
    try {
      const db = supabase();
      const [r, p] = await Promise.all([
        db.from('rooms').select('*').eq('id', roomId).limit(1),
        db.from('room_players').select('id,name,seat,left_at').eq('room_id', roomId).order('seat', { ascending: true }),
      ]);
      if (r.error) throw r.error;
      if (p.error) throw p.error;
      return { room: (r.data?.[0] as OnlineRoom | undefined) ?? null, players: (p.data ?? []) as OnlinePlayer[] };
    } catch (e) {
      throw friendly(e);
    }
  },

  /** Avisa quando a sala muda. Devolve função para cancelar e informa se o tempo real conectou. */
  subscribe(roomId: string, onChange: () => void, onStatus: (live: boolean) => void): () => void {
    let channel: ReturnType<SupabaseClient['channel']> | null = null;
    try {
      channel = supabase()
        .channel(`room-${roomId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, onChange)
        .subscribe((status) => onStatus(status === 'SUBSCRIBED'));
    } catch {
      onStatus(false);
    }
    return () => {
      if (channel) void supabase().removeChannel(channel);
    };
  },
};

/** Link de convite que abre direto na tela de entrar. */
export function inviteLink(code: string): string {
  const base = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
  return `${base}?sala=${encodeURIComponent(code)}`;
}
