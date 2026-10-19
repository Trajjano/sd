import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Copy,
  Crown,
  DoorOpen,
  Flag,
  Loader2,
  MoreHorizontal,
  Play,
  RotateCcw,
  Settings2,
  Share2,
  Shuffle,
  StopCircle,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../app/AppContext';
import { BRAND } from '../../app/brand';
import { online, inviteLink, type OnlineConfig, type OnlinePlayer, type OnlineRoom, type OnlineSession } from '../../online/api';
import { useOnlineRoom } from '../../online/useOnlineRoom';
import { deckForRoom, isLastRound, roomToMatch } from '../../online/adapter';
import { saveProfile, loadProfile } from '../../online/session';
import { getCategory } from '../../data/categories';
import { recordMatch } from '../../game/scoring/summary';
import { loadRecent, pushRecent } from '../../services/storage';
import { Button, IconButton } from '../../components/buttons/Button';
import { CardBack, FlipCard, QuestionFace } from '../../components/cards/Cards';
import { ConfirmSheet, Sheet } from '../../components/modals/Sheet';
import { PlayerAvatar } from '../../components/ui/PlayerAvatar';
import { Screen } from '../../components/ui/Screen';
import { Stamp } from '../../components/animations/Effects';
import { RevealView } from '../Reveal/RevealView';
import { ResultsScreen } from '../Results/ResultsScreen';
import { OnlineRules } from './OnlineRules';
import { plural } from '../../utils/text';

const RECORDED_KEY = 'semdefesa:v1:online-recorded';

export function OnlineRoomScreen({
  session,
  onExit,
  toast,
}: {
  session: OnlineSession;
  onExit: () => void;
  toast: (m: string) => void;
}) {
  const { room, players, live, netError, problem, refresh } = useOnlineRoom(session);
  const { store, stats, setStats } = useApp();
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    if (busy) return false;
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
      await refresh();
      return true;
    } catch (e) {
      toast((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (problem === 'closed') toast('A sala foi encerrada.');
    if (problem === 'kicked') toast('Você saiu da sala.');
    if (problem) onExit();
  }, [problem, onExit, toast]);

  // Estatísticas locais: registra cada partida terminada uma única vez.
  useEffect(() => {
    if (!room || room.status !== 'finished' || room.history.length === 0) return;
    const key = `${room.id}:${room.history.map((h) => h.question.id).join(',')}`;
    let done: string[] = [];
    try {
      done = JSON.parse(store.getItem(RECORDED_KEY) ?? '[]');
    } catch {
      done = [];
    }
    if (done.includes(key)) return;
    store.setItem(RECORDED_KEY, JSON.stringify([key, ...done].slice(0, 30)));
    setStats(recordMatch(stats, roomToMatch(room, players)));
    pushRecent(store, room.history.map((h) => h.question.id));
  }, [room, players, store, stats, setStats]);

  const nameOf = useMemo(() => {
    const m = new Map(players.map((p) => [p.id, p.name]));
    return (id: string) => m.get(id) ?? '?';
  }, [players]);

  if (!room) {
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="size-10 animate-spin text-acid" />
          <p className="display text-[30px]">Entrando na sala {session.code}…</p>
          {netError && <p className="max-w-[30ch] text-[15px] text-danger">{netError}</p>}
          <Button variant="ghost" onClick={onExit}>
            Voltar ao início
          </Button>
        </div>
      </Screen>
    );
  }

  const isHost = room.host_id === session.playerId;
  const hostName = room.host_id ? nameOf(room.host_id) : 'o anfitrião';
  const active = players.filter((p) => !p.left_at);
  const inGame = room.status === 'voting' || room.status === 'reveal';

  const header = (
    <header className="flex h-14 shrink-0 items-center gap-3">
      <IconButton label="Opções da sala" onClick={() => setMenu(true)}>
        <MoreHorizontal />
      </IconButton>
      <div className="min-w-0 flex-1">
        {inGame ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="label text-white/55">Rodada · sala {room.code}</span>
              <span className="display text-[20px] tabular-nums">
                {room.round}
                <span className="text-white/40">/{room.config.rounds}</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-acid"
                initial={false}
                animate={{ width: `${(Math.min(room.round, room.config.rounds) / room.config.rounds) * 100}%` }}
              />
            </div>
          </>
        ) : (
          <span className="label text-white/55">Sala {room.code}</span>
        )}
      </div>
      <span
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
          netError ? 'bg-danger/20 text-danger' : 'bg-white/[0.06] text-white/60'
        }`}
        title={netError ?? (live ? 'Conectado em tempo real' : 'Conectado')}
      >
        <span className={`size-2 rounded-full ${netError ? 'bg-danger' : live ? 'bg-acid' : 'bg-[#ffd23f]'}`} />
        {netError ? 'sem sinal' : 'online'}
      </span>
    </header>
  );

  let body: React.ReactNode = null;
  if (room.status === 'lobby') {
    body = (
      <Lobby
        room={room}
        players={active}
        session={session}
        isHost={isHost}
        hostName={hostName}
        busy={busy}
        onStart={() => act(() => online.start(session, deckForRoom(room, loadRecent(store))))}
        onKick={(p) => act(() => online.kick(session, p.id), `${p.name} saiu da sala.`)}
        onSaveRules={(c) => {
          saveProfile(store, { ...loadProfile(store), config: c });
          return act(() => online.updateConfig(session, c), 'Regras atualizadas.');
        }}
        toast={toast}
      />
    );
  } else if (room.status === 'voting') {
    body = (
      <Voting
        key={`v-${room.round}`}
        room={room}
        players={players}
        session={session}
        isHost={isHost}
        hostName={hostName}
        nameOf={nameOf}
        busy={busy}
        onVote={(t) => act(() => online.vote(session, t))}
        onSkip={() => act(() => online.skip(session))}
        onClose={() => act(() => online.closeVoting(session))}
      />
    );
  } else if (room.status === 'reveal') {
    const result = room.history[room.history.length - 1];
    body = result ? (
      <RevealView
        key={`r-${room.id}-${room.history.length}`}
        result={result}
        nameOf={nameOf}
        isLast={isLastRound(room)}
        voterCount={room.voter_ids.length}
        onNext={isHost ? () => void act(() => online.next(session)) : undefined}
        waitingFor={hostName}
      />
    ) : null;
  }

  if (room.status === 'finished') {
    return (
      <>
        <ResultsScreen
          key={`res-${room.id}-${room.history.length}`}
          match={roomToMatch(room, players)}
          actions={
            <div className="mt-8 flex flex-col gap-3">
              {isHost ? (
                <>
                  <Button
                    size="lg"
                    block
                    icon={<RotateCcw />}
                    disabled={busy || active.length < 3}
                    sound="confirm"
                    onClick={() => void act(() => online.start(session, deckForRoom(room, loadRecent(store))))}
                  >
                    {active.length < 3 ? 'Precisa de 3 na sala' : 'Jogar de novo'}
                  </Button>
                  <Button variant="secondary" block icon={<Users />} disabled={busy} onClick={() => void act(() => online.backToLobby(session))}>
                    Voltar à sala (entra gente nova)
                  </Button>
                </>
              ) : (
                <WaitingBar text={`Aguardando ${hostName} começar outra partida`} />
              )}
              <Button variant="ghost" block icon={<DoorOpen />} onClick={() => setConfirmLeave(true)}>
                Sair da sala
              </Button>
            </div>
          }
        />
        <LeaveSheet
          open={confirmLeave}
          onCancel={() => setConfirmLeave(false)}
          onConfirm={async () => {
            setConfirmLeave(false);
            await act(() => online.leave(session)).catch(() => undefined);
            onExit();
          }}
        />
      </>
    );
  }

  return (
    <Screen className={room.status === 'lobby' ? '' : 'safe-bottom'}>
      {header}
      <AnimatePresence mode="wait">
        <motion.div
          key={room.status}
          className="flex flex-1 flex-col"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
        >
          {body}
        </motion.div>
      </AnimatePresence>

      <Sheet open={menu} onClose={() => setMenu(false)} title={`Sala ${room.code}`}>
        <p className="mb-5 text-[15px] text-white/65">
          {plural(active.length, 'pessoa na sala', 'pessoas na sala')}. {isHost ? 'Você é quem comanda a sala.' : `Quem comanda: ${hostName}.`}
        </p>
        <div className="flex flex-col gap-3 pb-2">
          <Button size="lg" block onClick={() => setMenu(false)}>
            Continuar
          </Button>
          {isHost && inGame && (
            <Button
              variant="secondary"
              block
              icon={<Flag />}
              onClick={() => {
                setMenu(false);
                void act(() => online.finish(session));
              }}
            >
              Encerrar partida e ver resultado
            </Button>
          )}
          <Button
            variant="ghost"
            block
            icon={<DoorOpen />}
            onClick={() => {
              setMenu(false);
              setConfirmLeave(true);
            }}
          >
            Sair da sala
          </Button>
        </div>
      </Sheet>
      <LeaveSheet
        open={confirmLeave}
        isHost={isHost}
        onCancel={() => setConfirmLeave(false)}
        onConfirm={async () => {
          setConfirmLeave(false);
          await act(() => online.leave(session));
          onExit();
        }}
      />
    </Screen>
  );
}

function LeaveSheet({
  open,
  isHost,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  isHost?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmSheet
      open={open}
      title="Sair da sala?"
      message={
        isHost
          ? 'O comando da sala passa para a próxima pessoa. Você não volta para esta partida.'
          : 'Você não volta para esta partida. Os outros continuam jogando.'
      }
      confirmLabel="Sair da sala"
      cancelLabel="Ficar"
      danger
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

function WaitingBar({ text }: { text: string }) {
  return (
    <div className="flex min-h-[60px] items-center justify-center gap-2 rounded-[20px] bg-white/[0.06] px-4 text-center text-[15px] font-bold text-white/70 ring-1 ring-inset ring-white/10">
      <span className="size-2 shrink-0 animate-pulse rounded-full bg-acid" />
      {text}
    </div>
  );
}

/* ---------------- Lobby ---------------- */

function rulesSummary(c: OnlineConfig) {
  const mode = c.mode === 'survival' ? 'Sobrevivência' : 'Votação secreta';
  const cats = c.categories.filter((id) => c.includeHeavy || id !== 'semlimites');
  return `${mode} · ${plural(c.rounds, 'rodada', 'rodadas')} · ${plural(cats.length, 'categoria', 'categorias')}${c.menOnly ? ' · Só homens' : ''}${c.includeHeavy ? ' · +18' : ''}`;
}

function Lobby({
  room,
  players,
  session,
  isHost,
  hostName,
  busy,
  onStart,
  onKick,
  onSaveRules,
  toast,
}: {
  room: OnlineRoom;
  players: OnlinePlayer[];
  session: OnlineSession;
  isHost: boolean;
  hostName: string;
  busy: boolean;
  onStart: () => void;
  onKick: (p: OnlinePlayer) => void;
  onSaveRules: (c: OnlineConfig) => Promise<boolean>;
  toast: (m: string) => void;
}) {
  const { sfx } = useApp();
  const [qr, setQr] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [draft, setDraft] = useState(room.config);
  const link = inviteLink(room.code);
  const missing = Math.max(0, 3 - players.length);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: '#0b0910', light: '#f4f1e8' }, errorCorrectionLevel: 'M' })
      .then((url) => alive && setQr(url))
      .catch(() => setQr(null));
    return () => {
      alive = false;
    };
  }, [link]);

  const share = async () => {
    const text = `Bora jogar ${BRAND.name}? Entra na sala ${room.code}:`;
    try {
      if (navigator.share) {
        await navigator.share({ title: BRAND.name, text, url: link });
        return;
      }
    } catch {
      return; // cancelado
    }
    try {
      await navigator.clipboard.writeText(`${text} ${link}`);
      toast('Convite copiado. Cole no grupo.');
    } catch {
      toast(`Link: ${link}`);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      toast('Código copiado.');
    } catch {
      /* sem permissão */
    }
  };

  return (
    <div className="flex flex-1 flex-col pb-36">
      <section className="mt-3 rounded-[26px] bg-paper p-4 text-ink shadow-[4px_5px_0_0_#000]">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="label font-bold text-ink/55">Código da sala</div>
            <button type="button" onClick={copyCode} className="mt-1 flex items-center gap-2 text-left" aria-label={`Copiar código ${room.code}`}>
              <span className="display text-[clamp(40px,13vw,58px)] leading-none tracking-[0.08em]">{room.code}</span>
              <Copy className="size-5 shrink-0 text-ink/40" />
            </button>
            <p className="mt-2 text-[13px] leading-snug text-ink/65">Aponte a câmera para o QR code ou digite o código em “Entrar numa sala”.</p>
          </div>
          <div className="aspect-square w-[34%] max-w-[140px] shrink-0 overflow-hidden rounded-xl bg-paper-shade">
            {qr && <img src={qr} alt={`QR code para entrar na sala ${room.code}`} className="h-full w-full" />}
          </div>
        </div>
        <Button variant="primary" size="md" block className="mt-4 !bg-ink !text-acid !shadow-[0_4px_0_0_#000]" icon={<Share2 />} onClick={share}>
          Mandar convite
        </Button>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="display text-[26px]">Na sala</h2>
          <span className="label pb-1 text-white/50">{players.length}/12</span>
        </div>
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {players.map((p) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-2.5 pl-3 ring-1 ring-inset ring-white/10"
              >
                <PlayerAvatar name={p.name} size={36} />
                <span className="min-w-0 flex-1 truncate text-[17px] font-extrabold">
                  {p.name}
                  {p.id === session.playerId && <span className="ml-2 text-[13px] font-semibold text-white/45">você</span>}
                </span>
                {p.id === room.host_id && (
                  <span className="label flex items-center gap-1 rounded-md bg-acid px-1.5 py-1 font-bold text-ink">
                    <Crown className="size-3.5" /> comanda
                  </span>
                )}
                {isHost && p.id !== session.playerId && (
                  <button
                    type="button"
                    aria-label={`Remover ${p.name}`}
                    onClick={() => onKick(p)}
                    className="grid size-10 place-items-center rounded-xl text-white/45 active:bg-white/10"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
          {missing > 0 && (
            <li className="rounded-2xl border-2 border-dashed border-white/15 p-4 text-center text-[14px] font-semibold text-white/45">
              Falta{missing > 1 ? 'm' : ''} {plural(missing, 'pessoa', 'pessoas')} para começar
            </li>
          )}
        </ul>
      </section>

      <section className="mt-7 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/10">
        <div className="label text-white/50">Regras</div>
        <p className="mt-1 text-[16px] font-bold">{rulesSummary(room.config)}</p>
        <p className="mt-1 text-[13px] leading-snug text-white/50">
          {room.config.categories.map((c) => getCategory(c).tag).join(' · ')}
        </p>
        {isHost && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            icon={<Settings2 />}
            onClick={() => {
              setDraft(room.config);
              setRulesOpen(true);
            }}
          >
            Mudar regras
          </Button>
        )}
      </section>

      <div className="safe-bottom safe-x fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md bg-gradient-to-t from-ink via-ink/95 to-transparent pt-8">
        {isHost ? (
          <Button size="lg" block icon={<Play className="fill-current" />} disabled={busy || missing > 0} sound="confirm" onClick={onStart}>
            {missing > 0 ? `Esperando mais ${plural(missing, 'pessoa', 'pessoas')}` : `Começar com ${players.length}`}
          </Button>
        ) : (
          <WaitingBar text={`Aguardando ${hostName} começar`} />
        )}
      </div>

      <Sheet open={rulesOpen} onClose={() => setRulesOpen(false)} title="Regras da sala">
        <div className="no-scrollbar max-h-[62dvh] overflow-y-auto pb-4">
          <OnlineRules value={draft} onChange={setDraft} />
        </div>
        <div className="pb-2 pt-2">
          <Button
            size="lg"
            block
            disabled={busy}
            onClick={async () => {
              sfx('confirm');
              if (await onSaveRules(draft)) setRulesOpen(false);
            }}
          >
            Salvar regras
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

/* ---------------- Votação ---------------- */

function Voting({
  room,
  players,
  session,
  isHost,
  hostName,
  nameOf,
  busy,
  onVote,
  onSkip,
  onClose,
}: {
  room: OnlineRoom;
  players: OnlinePlayer[];
  session: OnlineSession;
  isHost: boolean;
  hostName: string;
  nameOf: (id: string) => string;
  busy: boolean;
  onVote: (target: string) => Promise<boolean>;
  onSkip: () => void;
  onClose: () => void;
}) {
  const { sfx, reduced } = useApp();
  const q = room.question!;
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null); // id da pergunta em que votei
  const [sealing, setSealing] = useState(false);
  const firstQ = useRef(q.id);

  useEffect(() => {
    setFlipped(false);
    setSelected(null);
    const t = window.setTimeout(() => {
      setFlipped(true);
      sfx('flip', 10);
    }, firstQ.current === q.id ? 400 : 250);
    return () => window.clearTimeout(t);
  }, [q.id, sfx]);

  const canVote = room.voter_ids.includes(session.playerId);
  const voted = room.voted_ids.includes(session.playerId) || sentAt === q.id;
  const targets = room.candidate_ids.filter((id) => room.config.allowSelfVote || id !== session.playerId);
  const voters = room.voter_ids.filter((id) => !players.find((p) => p.id === id)?.left_at);
  const doneCount = room.voted_ids.length;

  const confirm = async () => {
    if (!selected || sealing) return;
    setSealing(true);
    sfx('confirm', [10, 30, 18]);
    const ok = await onVote(selected);
    if (!ok) {
      setSealing(false);
      return;
    }
    setSentAt(q.id);
    window.setTimeout(() => setSealing(false), reduced ? 150 : 650);
  };

  return (
    <div className="flex flex-1 flex-col">
      {room.config.mode === 'survival' && (
        <div className="no-scrollbar -mx-4 mt-1 flex gap-1.5 overflow-x-auto px-4">
          {players
            .filter((p) => room.voter_ids.includes(p.id) || room.history.some((h) => h.candidateIds.includes(p.id)))
            .map((p) => (
              <span
                key={p.id}
                className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-bold ${
                  room.candidate_ids.includes(p.id) ? 'bg-white/10 text-white' : 'text-white/35 line-through decoration-danger decoration-2'
                }`}
              >
                {p.name}
              </span>
            ))}
        </div>
      )}

      <div className="flex justify-center pt-3 pb-4">
        <motion.div
          key={q.id}
          initial={{ y: -120, rotate: -10, scale: 0.8, opacity: 0 }}
          animate={{ y: 0, rotate: -1.5, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 19 }}
          className="aspect-[3/4]"
          style={{ width: voted ? 'min(80vw, 320px, calc(52dvh * 0.75))' : 'min(66vw, 250px, calc(36dvh * 0.75))' }}
        >
          <FlipCard
            className="h-full w-full"
            flipped={flipped}
            back={<CardBack />}
            front={<QuestionFace question={q} number={room.round} compact={!voted} />}
          />
        </motion.div>
      </div>

      {isHost && doneCount === 0 && !voted && (
        <div className="mb-3 flex justify-center">
          <Button variant="ghost" size="sm" icon={<Shuffle />} disabled={busy} onClick={onSkip}>
            Trocar carta (ninguém votou ainda)
          </Button>
        </div>
      )}

      {!canVote ? (
        <WaitingBar text="Você entrou no meio: vota a partir da próxima rodada" />
      ) : voted ? (
        <section aria-live="polite">
          <div className="flex items-center justify-between">
            <span className="label text-acid">Voto enviado</span>
            <span className="label text-white/55">
              {doneCount} de {voters.length} votaram
            </span>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {voters.map((id) => {
              const done = room.voted_ids.includes(id);
              return (
                <li key={id} className={`flex items-center gap-2 rounded-xl p-2 ${done ? 'bg-white/[0.07]' : 'bg-white/[0.03]'}`}>
                  <PlayerAvatar name={nameOf(id)} size={26} />
                  <span className={`min-w-0 flex-1 truncate text-[14px] font-bold ${done ? '' : 'text-white/45'}`}>{nameOf(id)}</span>
                  {done ? <Check className="size-4 text-acid" strokeWidth={3} /> : <Loader2 className="size-4 animate-spin text-white/35" />}
                </li>
              );
            })}
          </ul>
          {isHost && doneCount < voters.length && (
            <Button variant="secondary" block className="mt-4" icon={<StopCircle />} disabled={busy} onClick={onClose}>
              Encerrar votação sem esperar
            </Button>
          )}
          {!isHost && <p className="mt-4 text-center text-[13px] text-white/45">Quando todo mundo votar, a revelação aparece em todos os celulares. {hostName} comanda a sala.</p>}
        </section>
      ) : (
        <section className="pb-28">
          <div className="mb-2 flex items-center justify-between">
            <span className="label text-white/55">Quem é?</span>
            <span className="label text-white/40">
              {doneCount}/{voters.length} votaram
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Participantes">
            {targets.map((id, i) => {
              const activeSel = selected === id;
              return (
                <motion.button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={activeSel}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: selected && !activeSel ? 0.55 : 1, y: 0, scale: activeSel ? 1.03 : 1 }}
                  transition={{ delay: selected ? 0 : i * 0.03, type: 'spring', stiffness: 500, damping: 30 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelected(id);
                    sfx('select', 10);
                  }}
                  className={`flex min-h-[58px] items-center gap-2.5 rounded-2xl p-2.5 text-left ring-inset ${
                    activeSel ? 'bg-acid text-ink shadow-[0_5px_0_0_var(--color-acid-deep)]' : 'bg-white/[0.06] text-white ring-1 ring-white/10'
                  }`}
                >
                  <PlayerAvatar name={nameOf(id)} size={32} />
                  <span className="min-w-0 flex-1 truncate text-[16px] font-extrabold">{nameOf(id)}</span>
                </motion.button>
              );
            })}
          </div>
          <div className="safe-bottom safe-x fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md bg-gradient-to-t from-ink via-ink/95 to-transparent pt-8">
            <Button size="lg" block disabled={!selected || sealing} sound={null} onClick={() => void confirm()}>
              {sealing ? 'Enviando…' : selected ? 'Confirmar voto' : 'Toque em alguém'}
            </Button>
          </div>
        </section>
      )}

      <AnimatePresence>
        {sealing && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-ink/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Stamp className="text-[40px]">Voto guardado</Stamp>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
