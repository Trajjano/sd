import type { KeyValueStore } from '../services/storage';
import type { OnlineConfig, OnlineSession } from './api';
import { DEFAULT_CATEGORIES } from '../data/categories';

const KEY = 'semdefesa:v1:online-session';
const PROFILE = 'semdefesa:v1:online-profile';

export function loadSession(store: KeyValueStore): OnlineSession | null {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as OnlineSession;
    return s && s.roomId && s.playerId && s.secret ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(store: KeyValueStore, s: OnlineSession | null) {
  try {
    if (s) store.setItem(KEY, JSON.stringify(s));
    else store.removeItem(KEY);
  } catch {
    /* ignorado */
  }
}

export interface OnlineProfile {
  name: string;
  config: OnlineConfig;
}

export const DEFAULT_ONLINE_CONFIG: OnlineConfig = {
  rounds: 10,
  mode: 'secret',
  allowSelfVote: false,
  includeHeavy: false,
  menOnly: false,
  categories: DEFAULT_CATEGORIES,
};

/** Último nome e regras usados, para criar sala rapidinho. */
export function loadProfile(store: KeyValueStore): OnlineProfile {
  try {
    const raw = store.getItem(PROFILE);
    const p = raw ? (JSON.parse(raw) as Partial<OnlineProfile>) : {};
    return {
      name: typeof p.name === 'string' ? p.name : '',
      config: { ...DEFAULT_ONLINE_CONFIG, ...(p.config ?? {}) },
    };
  } catch {
    return { name: '', config: DEFAULT_ONLINE_CONFIG };
  }
}

export function saveProfile(store: KeyValueStore, p: OnlineProfile) {
  try {
    store.setItem(PROFILE, JSON.stringify(p));
  } catch {
    /* ignorado */
  }
}
