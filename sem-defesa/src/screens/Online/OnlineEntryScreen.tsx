import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, LogIn, Pencil, Plus, Wifi } from 'lucide-react';
import { AVATARS, isAvatarId } from '../../data/avatars';
import { AvatarPicker } from '../../components/ui/AvatarPicker';
import { PlayerAvatar } from '../../components/ui/PlayerAvatar';
import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { online, onlineConfigured, type OnlineSession } from '../../online/api';
import { loadProfile, saveProfile } from '../../online/session';
import { MAX_NAME_LENGTH } from '../../game/validation/setup';
import { Button } from '../../components/buttons/Button';
import { Screen, ScreenHeader } from '../../components/ui/Screen';
import { OnlineRules, availableCards } from './OnlineRules';

type Tab = 'create' | 'join';

export function OnlineEntryScreen({
  initialCode,
  onBack,
  onEnter,
}: {
  initialCode?: string;
  onBack: () => void;
  onEnter: (s: OnlineSession) => void;
}) {
  const { store, sfx } = useApp();
  const [profile] = useState(() => loadProfile(store));
  const [tab, setTab] = useState<Tab>(initialCode !== undefined ? 'join' : 'create');
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(() => (isAvatarId(profile.avatar) ? profile.avatar : AVATARS[Math.floor(Math.random() * AVATARS.length)].id));
  const [picking, setPicking] = useState(false);
  const [code, setCode] = useState(initialCode ?? '');
  const [config, setConfig] = useState(profile.config);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanName = name.trim().replace(/\s+/g, ' ');
  const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

  const submit = async () => {
    setError(null);
    if (!cleanName) return setError('Digite seu nome.');
    if (cleanName.length > MAX_NAME_LENGTH) return setError(`Nome com até ${MAX_NAME_LENGTH} letras.`);
    if (tab === 'join' && cleanCode.length !== 5) return setError('O código da sala tem 5 caracteres.');
    if (tab === 'create' && availableCards(config) === 0) return setError('Escolha pelo menos uma categoria.');
    setBusy(true);
    try {
      const session =
        tab === 'create' ? await online.createRoom(cleanName, config, avatar) : await online.joinRoom(cleanCode, cleanName, avatar);
      saveProfile(store, { name: cleanName, avatar, config });
      sfx('confirm', [10, 30, 10]);
      onEnter(session);
    } catch (e) {
      setError((e as Error).message);
      sfx('tie', [20, 40, 20]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader onBack={onBack} center={<span className="display text-[22px]">Cada um no seu celular</span>} />

      {!onlineConfigured ? (
        <div className="mt-8 rounded-2xl bg-white/[0.05] p-5 ring-1 ring-inset ring-white/10">
          <Wifi className="mb-3 size-8 text-acid" />
          <h2 className="display text-[28px]">Modo online desligado</h2>
          <p className="mt-2 text-[15px] leading-snug text-white/65">
            Este site ainda não foi ligado a um servidor. Quem publicou o jogo precisa configurar o Supabase (veja DEPLOY.md).
            Enquanto isso, dá pra jogar passando um celular só.
          </p>
          <Button className="mt-5" onClick={onBack}>
            Jogar num celular só
          </Button>
        </div>
      ) : (
        <div className="flex-1 pb-36">
          {/* abas */}
          <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-white/[0.04] p-1.5 ring-1 ring-inset ring-white/10" role="tablist">
            {(
              [
                ['create', 'Criar sala'],
                ['join', 'Entrar numa sala'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                type="button"
                onClick={() => {
                  sfx('select', 6);
                  setTab(id);
                  setError(null);
                }}
                className={`min-h-[46px] rounded-xl text-[15px] font-extrabold transition-colors ${tab === id ? 'bg-acid text-ink' : 'text-white/70'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[14px] leading-snug text-white/55">
            {tab === 'create'
              ? 'Você cria a sala, os amigos entram pelo código ou QR code e cada um vota no próprio celular. Precisa de internet.'
              : 'Digite o código que apareceu no celular de quem criou a sala.'}
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <div className="block">
              <span className="label mb-2 block text-white/55">Seu bonequinho e nome</span>
              <span className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setPicking(true);
                }}
                aria-label="Escolher bonequinho"
                className="relative shrink-0 rounded-[30%] active:scale-95"
              >
                <PlayerAvatar name={cleanName || 'Você'} avatar={avatar} size={56} />
                <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-acid text-ink shadow-[1px_1px_0_0_#000]">
                  <Pencil className="size-3.5" />
                </span>
              </button>
              <input
                id="online-name"
                aria-label="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={MAX_NAME_LENGTH + 4}
                autoComplete="nickname"
                autoCapitalize="words"
                enterKeyHint={tab === 'join' ? 'next' : 'done'}
                placeholder="Como te chamam"
                className="min-w-0 flex-1 rounded-2xl bg-white/[0.05] px-4 py-3.5 text-[18px] font-bold text-white ring-1 ring-inset ring-white/10 placeholder:font-semibold placeholder:text-white/25 focus:ring-acid focus:outline-none"
              />
              </span>
            </div>
            {tab === 'join' && (
              <label className="block">
                <span className="label mb-2 block text-white/55">Código da sala</span>
                <input
                  id="online-code"
                  value={cleanCode}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void submit()}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  inputMode="text"
                  placeholder="ABCDE"
                  aria-label="Código da sala"
                  className="display w-full rounded-2xl bg-white/[0.05] px-4 py-3 text-center text-[40px] tracking-[0.3em] text-white uppercase ring-1 ring-inset ring-white/10 placeholder:text-white/15 focus:ring-acid focus:outline-none"
                />
              </label>
            )}
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                className="mt-3 flex items-start gap-2 text-[14px] font-semibold text-danger"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
              </motion.p>
            )}
          </AnimatePresence>

          {tab === 'create' && (
            <div className="mt-8">
              <OnlineRules value={config} onChange={setConfig} />
            </div>
          )}
        </div>
      )}

      <AvatarPicker
        open={picking}
        value={avatar}
        onClose={() => setPicking(false)}
        onPick={(id) => {
          setAvatar(id);
          setPicking(false);
        }}
      />

      {onlineConfigured && (
        <div className="safe-bottom safe-x fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md bg-gradient-to-t from-ink via-ink/95 to-transparent pt-8">
          <Button size="lg" block disabled={busy} sound={null} icon={tab === 'create' ? <Plus /> : <LogIn />} onClick={() => void submit()}>
            {busy ? 'Conectando…' : tab === 'create' ? 'Criar sala' : 'Entrar na sala'}
          </Button>
        </div>
      )}
    </Screen>
  );
}
