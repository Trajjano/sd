import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MotionConfig, useReducedMotion } from 'motion/react';
import type { LifetimeStats, Settings } from '../types';
import { browserStore, loadSettings, loadStats, saveSettings, saveStats, type KeyValueStore } from '../services/storage';
import { playSfx, setSoundEnabled, type Sfx } from '../services/audio';
import { buzz, setHapticsEnabled } from '../services/haptics';

interface AppCtx {
  store: KeyValueStore;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  stats: LifetimeStats;
  setStats: (s: LifetimeStats) => void;
  /** true quando as animações devem ser reduzidas. */
  reduced: boolean;
  sfx: (name: Sfx, vibrate?: number | number[]) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [store] = useState(browserStore);
  const [settings, setSettings] = useState(() => loadSettings(store));
  const [stats, setStatsState] = useState(() => loadStats(store));
  const systemReduced = useReducedMotion() ?? false;

  useEffect(() => {
    setSoundEnabled(settings.sound);
    setHapticsEnabled(settings.haptics);
  }, [settings.sound, settings.haptics]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) =>
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        saveSettings(store, next);
        return next;
      }),
    [store],
  );

  const setStats = useCallback(
    (s: LifetimeStats) => {
      setStatsState(s);
      saveStats(store, s);
    },
    [store],
  );

  const reduced = settings.motion === 'reduced' || (settings.motion === 'system' && systemReduced);

  const sfx = useCallback((name: Sfx, vibrate?: number | number[]) => {
    playSfx(name);
    if (vibrate !== undefined) buzz(vibrate);
  }, []);

  const value = useMemo(
    () => ({ store, settings, updateSettings, stats, setStats, reduced, sfx }),
    [store, settings, updateSettings, stats, setStats, reduced, sfx],
  );

  return (
    <Ctx.Provider value={value}>
      <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>{children}</MotionConfig>
    </Ctx.Provider>
  );
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp fora do AppProvider');
  return ctx;
}
