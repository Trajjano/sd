import type { LifetimeStats, MatchState, SetupDraft, Settings } from '../types';
import { DEFAULT_CATEGORIES, CATEGORIES } from '../data/categories';
import { emptyLifetimeStats } from '../game/scoring/summary';

/** Interface mínima compatível com localStorage (permite testes sem navegador). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PREFIX = 'semdefesa:v1:';
export const KEYS = {
  settings: `${PREFIX}settings`,
  setup: `${PREFIX}setup`,
  stats: `${PREFIX}stats`,
  match: `${PREFIX}match`,
  recent: `${PREFIX}recent`,
} as const;

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  haptics: true,
  allowSelfVote: false,
  motion: 'system',
};

export const DEFAULT_SETUP: SetupDraft = {
  names: ['', '', ''],
  rounds: 10,
  categories: DEFAULT_CATEGORIES,
  includeHeavy: false,
  mode: 'secret',
  menOnly: false,
};

/** Memória de fallback se o localStorage estiver bloqueado (aba anônima, etc.). */
export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

export function browserStore(): KeyValueStore {
  try {
    const ls = window.localStorage;
    const probe = `${PREFIX}probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryStore();
  }
}

function read<T>(store: KeyValueStore, key: string): T | null {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(store: KeyValueStore, key: string, value: unknown): boolean {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

export function loadSettings(store: KeyValueStore): Settings {
  const raw = read<Partial<Settings>>(store, KEYS.settings) ?? {};
  return {
    sound: isBool(raw.sound) ? raw.sound : DEFAULT_SETTINGS.sound,
    haptics: isBool(raw.haptics) ? raw.haptics : DEFAULT_SETTINGS.haptics,
    allowSelfVote: isBool(raw.allowSelfVote) ? raw.allowSelfVote : DEFAULT_SETTINGS.allowSelfVote,
    motion: raw.motion === 'reduced' || raw.motion === 'full' || raw.motion === 'system' ? raw.motion : 'system',
  };
}

export function saveSettings(store: KeyValueStore, settings: Settings): boolean {
  return write(store, KEYS.settings, settings);
}

export function loadSetup(store: KeyValueStore): SetupDraft {
  const raw = read<Partial<SetupDraft>>(store, KEYS.setup);
  if (!raw) return { ...DEFAULT_SETUP, names: [...DEFAULT_SETUP.names] };
  const validIds = new Set(CATEGORIES.map((c) => c.id));
  const names = Array.isArray(raw.names) ? raw.names.filter((n) => typeof n === 'string').slice(0, 12) : [];
  const categories = Array.isArray(raw.categories) ? raw.categories.filter((c) => validIds.has(c)) : [];
  return {
    names: names.length >= 3 ? names : [...names, '', '', ''].slice(0, Math.max(3, names.length)),
    rounds: typeof raw.rounds === 'number' && raw.rounds >= 1 && raw.rounds <= 30 ? Math.round(raw.rounds) : DEFAULT_SETUP.rounds,
    categories: categories.length ? categories : DEFAULT_SETUP.categories,
    includeHeavy: isBool(raw.includeHeavy) ? raw.includeHeavy : false,
    mode: raw.mode === 'open' || raw.mode === 'survival' || raw.mode === 'secret' ? raw.mode : 'secret',
    menOnly: isBool(raw.menOnly) ? raw.menOnly : false,
  };
}

export function saveSetup(store: KeyValueStore, draft: SetupDraft): boolean {
  return write(store, KEYS.setup, draft);
}

export function loadStats(store: KeyValueStore): LifetimeStats {
  const raw = read<LifetimeStats>(store, KEYS.stats);
  const base = emptyLifetimeStats();
  if (!raw || typeof raw !== 'object' || typeof raw.matches !== 'number') return base;
  return { ...base, ...raw, byMode: { ...base.byMode, ...(raw.byMode ?? {}) }, players: raw.players ?? {} };
}

export function saveStats(store: KeyValueStore, stats: LifetimeStats): boolean {
  return write(store, KEYS.stats, stats);
}

export function clearStats(store: KeyValueStore): void {
  store.removeItem(KEYS.stats);
  store.removeItem(KEYS.recent);
}

/** Partida em andamento, para retomar se a página recarregar. */
export function loadActiveMatch(store: KeyValueStore): MatchState | null {
  const raw = read<MatchState>(store, KEYS.match);
  if (!raw || !raw.config || !Array.isArray(raw.history) || !raw.question || raw.phase === 'finished') return null;
  return raw;
}

export function saveActiveMatch(store: KeyValueStore, match: MatchState | null): void {
  if (!match || match.phase === 'finished') store.removeItem(KEYS.match);
  else write(store, KEYS.match, match);
}

export function loadRecent(store: KeyValueStore): string[] {
  const raw = read<string[]>(store, KEYS.recent);
  return Array.isArray(raw) ? raw.filter((s) => typeof s === 'string') : [];
}

export function pushRecent(store: KeyValueStore, ids: string[], limit = 90): void {
  const merged = [...ids, ...loadRecent(store).filter((id) => !ids.includes(id))].slice(0, limit);
  write(store, KEYS.recent, merged);
}
