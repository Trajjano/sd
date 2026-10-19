import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import type { SetupDraft } from '../types';
import { useApp } from './AppContext';
import { useMatch } from '../hooks/useMatch';
import { loadSetup, saveSetup } from '../services/storage';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { SetupScreen } from '../screens/Setup/SetupScreen';
import { GameScreen } from '../screens/Gameplay/GameScreen';
import { ResultsScreen } from '../screens/Results/ResultsScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { StatsScreen } from '../screens/Stats/StatsScreen';
import { HowToScreen } from '../screens/HowTo/HowToScreen';
import { OnlineEntryScreen } from '../screens/Online/OnlineEntryScreen';
import { OnlineRoomScreen } from '../screens/Online/OnlineRoomScreen';
import { loadSession, saveSession } from '../online/session';
import type { OnlineSession } from '../online/api';
import { ConfirmSheet } from '../components/modals/Sheet';
import { Button } from '../components/buttons/Button';

type ScreenId = 'home' | 'setup' | 'game' | 'settings' | 'stats' | 'howto' | 'online-entry' | 'online-room';

export function App() {
  const { store } = useApp();
  const [screen, setScreen] = useState<ScreenId>('home');
  const [returnTo, setReturnTo] = useState<ScreenId>('home');
  const [draft, setDraft] = useState<SetupDraft>(() => loadSetup(store));
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [leaveAsk, setLeaveAsk] = useState(false);
  const [onlineSession, setOnlineSession] = useState<OnlineSession | null>(() => loadSession(store));
  const [inviteCode, setInviteCode] = useState<string | undefined>(undefined);
  const toastTimer = useRef<number>(0);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const game = useMatch(toast);

  const go = useCallback((s: ScreenId) => {
    setScreen(s);
    window.scrollTo({ top: 0 });
  }, []);

  const updateDraft = (d: SetupDraft) => {
    setDraft(d);
    saveSetup(store, d);
  };

  // Link de convite: ?sala=ABCDE abre direto a tela de entrar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('sala');
    if (!code) return;
    params.delete('sala');
    const rest = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    if (onlineSession?.code === clean) {
      setScreen('online-room');
    } else {
      setInviteCode(clean);
      setScreen('online-entry');
    }
    // só na abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enterOnline = useCallback(
    (s: OnlineSession) => {
      saveSession(store, s);
      setOnlineSession(s);
      setInviteCode(undefined);
      go('online-room');
    },
    [store, go],
  );

  const exitOnline = useCallback(() => {
    saveSession(store, null);
    setOnlineSession(null);
    go('home');
  }, [store, go]);

  // Botão "voltar" do Android/navegador: navega dentro do jogo em vez de sair.
  const screenRef = useRef(screen);
  screenRef.current = screen;
  useEffect(() => {
    window.history.pushState({ semdefesa: true }, '');
    const onPop = () => {
      const s = screenRef.current;
      if (s === 'home') {
        window.history.back();
        return;
      }
      window.history.pushState({ semdefesa: true }, '');
      if (s === 'game') setLeaveAsk(true);
      else go('home');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [go]);

  // PWA: aviso de atualização e de modo offline pronto.
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({ onRegisterError: () => undefined });

  useEffect(() => {
    if (offlineReady) {
      toast('Pronto para jogar offline.');
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady, toast]);

  const openSettings = () => {
    setReturnTo(screen);
    go('settings');
  };

  let content: React.ReactNode;
  if (screen === 'game' && game.match) {
    content =
      game.match.phase === 'finished' ? (
        <ResultsScreen
          key={`res-${game.match.id}`}
          match={game.match}
          onPlayAgain={() => game.restart()}
          onNewSetup={() => go('setup')}
          onHome={() => go('home')}
        />
      ) : (
        <GameScreen
          key={`game-${game.match.id}`}
          match={game.match}
          dispatch={game.dispatch}
          onLeave={() => {
            game.suspend();
            go('home');
          }}
        />
      );
  } else if (screen === 'online-room' && onlineSession) {
    content = <OnlineRoomScreen key={`online-${onlineSession.roomId}`} session={onlineSession} onExit={exitOnline} toast={toast} />;
  } else if (screen === 'online-entry') {
    content = (
      <OnlineEntryScreen
        key={`entry-${inviteCode ?? ''}`}
        initialCode={inviteCode}
        onBack={() => {
          setInviteCode(undefined);
          go('home');
        }}
        onEnter={enterOnline}
      />
    );
  } else if (screen === 'setup') {
    content = (
      <SetupScreen
        key="setup"
        draft={draft}
        onChange={updateDraft}
        onBack={() => go('home')}
        onStart={(config) => {
          game.start(config);
          go('game');
        }}
      />
    );
  } else if (screen === 'settings') {
    content = <SettingsScreen key="settings" onBack={() => go(returnTo === 'settings' ? 'home' : returnTo)} toast={toast} />;
  } else if (screen === 'stats') {
    content = <StatsScreen key="stats" onBack={() => go('home')} onStart={() => go('setup')} toast={toast} />;
  } else if (screen === 'howto') {
    content = <HowToScreen key="howto" onBack={() => go('home')} onStart={() => go('setup')} />;
  } else {
    content = (
      <HomeScreen
        key="home"
        onStart={() => go('setup')}
        onStartOnline={() => {
          setInviteCode(undefined);
          go(onlineSession ? 'online-room' : 'online-entry');
        }}
        onJoin={() => {
          setInviteCode('');
          go(onlineSession ? 'online-room' : 'online-entry');
        }}
        onlineCode={onlineSession?.code ?? null}
        onReturnOnline={() => go('online-room')}
        onHowTo={() => go('howto')}
        onStats={() => go('stats')}
        onSettings={openSettings}
        resumable={game.resumable}
        onResume={() => {
          game.resume();
          go('game');
        }}
        onDiscard={() => {
          game.discard();
          toast('Partida descartada.');
        }}
      />
    );
  }

  return (
    <div className="bg-stage grain min-h-[100dvh] overflow-x-hidden">
      <AnimatePresence mode="wait">{content}</AnimatePresence>

      <ConfirmSheet
        open={leaveAsk}
        title="Sair da partida?"
        message="A partida fica salva e dá pra continuar pela tela inicial."
        confirmLabel="Sair para o início"
        cancelLabel="Continuar jogando"
        onCancel={() => setLeaveAsk(false)}
        onConfirm={() => {
          setLeaveAsk(false);
          game.suspend();
          go('home');
        }}
      />

      {/* Toasts */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            key={toastMsg}
            role="status"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed inset-x-0 top-0 z-[70] mx-auto flex max-w-md justify-center px-4"
            style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
          >
            <div className="rounded-2xl bg-paper px-4 py-3 text-[15px] font-bold text-ink shadow-[3px_4px_0_0_#000]">{toastMsg}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {needRefresh && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="safe-x fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-md"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center gap-3 rounded-2xl bg-night p-3 ring-1 ring-acid/50">
              <span className="flex-1 pl-1 text-[14px] font-bold">Nova versão disponível.</span>
              <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
                Depois
              </Button>
              <Button size="sm" onClick={() => void updateServiceWorker(true)}>
                Atualizar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
