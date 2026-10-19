import { AnimatePresence, motion } from 'motion/react';
import { Check, EyeOff, Flag, Hand, Home, Megaphone, Minus, Plus, Shuffle, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { MatchState, Player, Tally } from '../../types';
import { isMatchOver, type MatchAction } from '../../game/engine/match';
import { candidateIds, currentVoterId, eligibleTargets, maxOpenVotes } from '../../game/rules/voting';
import { useApp } from '../../app/AppContext';
import { Button, IconButton } from '../../components/buttons/Button';
import { CardBack, FlipCard, QuestionFace } from '../../components/cards/Cards';
import { Sheet } from '../../components/modals/Sheet';
import { PlayerAvatar } from '../../components/ui/PlayerAvatar';
import { Scribble } from '../../components/ui/Logo';
import { Stamp } from '../../components/animations/Effects';
import { Screen } from '../../components/ui/Screen';
import { RevealView } from '../Reveal/RevealView';

interface Props {
  match: MatchState;
  dispatch: (a: MatchAction) => void;
  onLeave: () => void;
}

export function GameScreen({ match, dispatch, onLeave }: Props) {
  const { settings, updateSettings } = useApp();
  const [menu, setMenu] = useState(false);
  const players = match.config.players;
  const nameOf = useMemo(() => {
    const map = new Map(players.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? '?';
  }, [players]);

  const privacy = match.phase === 'handoff';

  return (
    <Screen className={privacy ? '' : 'safe-bottom'}>
      {/* Barra superior */}
      <header className="flex h-14 shrink-0 items-center gap-3">
        <IconButton label="Menu da partida" onClick={() => setMenu(true)}>
          <X />
        </IconButton>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <span className="label text-white/55">Rodada</span>
            <span className="display text-[20px] tabular-nums">
              {match.round}
              <span className="text-white/40">/{match.config.rounds}</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-acid"
              initial={false}
              animate={{ width: `${(Math.min(match.round, match.config.rounds) / match.config.rounds) * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
        <IconButton
          label={settings.sound ? 'Desativar sons' : 'Ativar sons'}
          onClick={() => updateSettings({ sound: !settings.sound })}
        >
          {settings.sound ? <Volume2 /> : <VolumeX />}
        </IconButton>
      </header>

      <AnimatePresence mode="wait">
        {match.phase === 'question' && <QuestionView key={`q-${match.round}`} match={match} dispatch={dispatch} nameOf={nameOf} />}
        {match.phase === 'handoff' && (
          <HandoffView key={`h-${match.round}-${match.voterIndex}`} match={match} dispatch={dispatch} nameOf={nameOf} />
        )}
        {match.phase === 'voting' && (
          <VotingView key={`v-${match.round}-${match.voterIndex}`} match={match} dispatch={dispatch} nameOf={nameOf} />
        )}
        {match.phase === 'open-voting' && <OpenVotingView key={`o-${match.round}`} match={match} dispatch={dispatch} />}
        {match.phase === 'reveal' && (
          <RevealView
            key={`r-${match.round}`}
            result={match.history[match.history.length - 1]}
            nameOf={nameOf}
            isLast={isMatchOver(match)}
            voterCount={match.config.players.length}
            onNext={() => dispatch({ type: 'next' })}
          />
        )}
      </AnimatePresence>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Pausa">
        <p className="mb-5 text-[15px] text-white/65">
          {match.history.length === 0
            ? 'Nenhuma rodada foi revelada ainda.'
            : `${match.history.length} ${match.history.length === 1 ? 'rodada revelada' : 'rodadas reveladas'} até aqui.`}{' '}
          Votos da rodada atual que ainda não foram revelados serão descartados se você encerrar.
        </p>
        <div className="flex flex-col gap-3 pb-2">
          <Button size="lg" block onClick={() => setMenu(false)}>
            Continuar jogando
          </Button>
          <Button
            variant="secondary"
            block
            icon={<Flag />}
            onClick={() => {
              setMenu(false);
              dispatch({ type: 'finish' });
            }}
          >
            Encerrar e ver resultado
          </Button>
          <Button
            variant="ghost"
            block
            icon={<Home />}
            onClick={() => {
              setMenu(false);
              onLeave();
            }}
          >
            Voltar ao início (dá pra continuar depois)
          </Button>
        </div>
      </Sheet>
    </Screen>
  );
}

type ViewProps = { match: MatchState; dispatch: (a: MatchAction) => void; nameOf: (id: string) => string };

const viewMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16, transition: { duration: 0.18 } },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

/* ---------------- Carta na mesa ---------------- */

function QuestionView({ match, dispatch, nameOf }: ViewProps) {
  const { sfx } = useApp();
  const [flipped, setFlipped] = useState(false);
  const qid = match.question.id;

  useEffect(() => {
    setFlipped(false);
    const t = window.setTimeout(() => {
      setFlipped(true);
      sfx('flip', 10);
    }, 420);
    return () => window.clearTimeout(t);
  }, [qid, sfx]);

  const mode = match.config.mode;
  const hint =
    mode === 'open'
      ? 'Leiam juntos, discutam e apontem. Sem segredo nenhum.'
      : 'Todo mundo leu? Agora cada um vota escondido.';

  return (
    <motion.section {...viewMotion} className="flex flex-1 flex-col">
      {mode === 'survival' && <SurvivorsBar match={match} nameOf={nameOf} />}

      <div className="flex flex-1 items-center justify-center py-4">
        <motion.div
          key={qid}
          initial={{ y: -260, rotate: -16, scale: 0.7, opacity: 0 }}
          animate={{ y: 0, rotate: -1.5, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 170, damping: 19 }}
          className="aspect-[3/4] w-[min(84vw,340px)] max-h-[58dvh]"
          style={{ maxWidth: 'calc(58dvh * 0.75)' }}
        >
          <FlipCard
            className="h-full w-full"
            flipped={flipped}
            back={<CardBack label={`rodada ${match.round}`} />}
            front={<QuestionFace question={match.question} number={match.round} />}
          />
        </motion.div>
      </div>

      <p className="mb-4 text-center text-[15px] font-semibold text-white/60">{hint}</p>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="lg"
          className="!px-4"
          aria-label="Trocar carta"
          icon={<Shuffle />}
          sound={null}
          onClick={() => dispatch({ type: 'skip' })}
        />
        <Button
          size="lg"
          block
          className="flex-1"
          sound="confirm"
          icon={mode === 'open' ? <Megaphone /> : <EyeOff />}
          onClick={() => dispatch({ type: 'startVoting' })}
        >
          {mode === 'open' ? 'Registrar votação' : 'Começar votação'}
        </Button>
      </div>
    </motion.section>
  );
}

function SurvivorsBar({ match, nameOf }: { match: MatchState; nameOf: (id: string) => string }) {
  const alive = new Set(match.survivors);
  return (
    <div className="mt-2">
      <div className="label mb-2 text-white/50">
        Na disputa: {match.survivors.length} de {match.config.players.length}
      </div>
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
        {match.config.players.map((p) => (
          <span
            key={p.id}
            className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-bold ${
              alive.has(p.id) ? 'bg-white/10 text-white' : 'text-white/35 line-through decoration-danger decoration-2'
            }`}
          >
            {nameOf(p.id)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Tela de privacidade ---------------- */

function HandoffView({ match, dispatch, nameOf }: ViewProps) {
  const voterId = currentVoterId(match)!;
  const name = nameOf(voterId);
  const total = match.voterOrder.length;
  const done = match.votes.length;
  return (
    <motion.section
      {...viewMotion}
      className="fixed inset-0 z-40 flex flex-col bg-plum px-5"
      style={{
        paddingTop: 'max(24px, env(safe-area-inset-top))',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        background:
          'repeating-linear-gradient(-45deg, transparent 0 22px, rgb(212 255 42 / 0.05) 22px 24px), radial-gradient(100% 70% at 50% 0%, #4a1f80, #1a0b2e 75%)',
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between">
          <span className="label text-white/60">
            Voto {done + 1} de {total}
          </span>
          <div className="flex gap-1" aria-hidden="true">
            {match.voterOrder.map((_, i) => (
              <span key={i} className={`h-2 w-4 rounded-full ${i < done ? 'bg-acid' : i === done ? 'bg-white' : 'bg-white/20'}`} />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <motion.div
            initial={{ rotate: -20, scale: 0.6, opacity: 0 }}
            animate={{ rotate: -6, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}
            className="mb-6 grid size-16 place-items-center rounded-2xl bg-acid text-ink shadow-[4px_5px_0_0_#000]"
          >
            <Hand className="size-8" />
          </motion.div>
          <p className="display text-[34px] text-white/70">Passe o celular para</p>
          <div className="relative mt-2 inline-block self-start">
            <h1 className="display break-words text-[clamp(52px,17vw,92px)] leading-[0.88] text-white">{name}</h1>
            <Scribble className="absolute -bottom-3 left-0 h-5 w-full" delay={0.35} />
          </div>
          <p className="mt-10 max-w-[30ch] text-[16px] leading-snug text-white/60">
            Ninguém espia. Quando estiver só com você, toque no botão.
          </p>
        </div>

        <Button size="lg" block sound="select" onClick={() => dispatch({ type: 'confirmHandoff' })}>
          Sou eu, {name}
        </Button>
      </div>
    </motion.section>
  );
}

/* ---------------- Voto secreto ---------------- */

function VotingView({ match, dispatch, nameOf }: ViewProps) {
  const { sfx, reduced } = useApp();
  const voterId = currentVoterId(match)!;
  const targets = eligibleTargets(match, voterId);
  const [selected, setSelected] = useState<string | null>(null);
  const [sealed, setSealed] = useState(false);
  const selfBlocked = !match.config.allowSelfVote && candidateIds(match).includes(voterId);

  const confirm = () => {
    if (!selected || sealed) return;
    setSealed(true);
    sfx('confirm', [10, 30, 18]);
    window.setTimeout(() => dispatch({ type: 'vote', voterId, targetId: selected }), reduced ? 250 : 750);
  };

  return (
    <motion.section {...viewMotion} className="relative flex flex-1 flex-col">
      <div className="mt-3 flex items-center gap-3">
        <PlayerAvatar name={nameOf(voterId)} size={44} />
        <div className="min-w-0">
          <div className="label text-acid">Vez de votar</div>
          <div className="display truncate text-[30px]">{nameOf(voterId)}</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-paper p-4 text-ink">
        <p className="display text-[21px] leading-[1.02]" style={{ fontVariationSettings: "'wdth' 82" }}>
          {match.question.text}
        </p>
      </div>

      <div className="mt-5 mb-2 flex items-center justify-between">
        <span className="label text-white/55">Escolha uma pessoa</span>
        {selfBlocked && <span className="text-[12px] text-white/40">Você não pode votar em si</span>}
      </div>

      <div className={`grid gap-2 pb-28 ${targets.length > 6 ? 'grid-cols-2' : 'grid-cols-1 min-[360px]:grid-cols-2'}`} role="radiogroup" aria-label="Participantes">
        {targets.map((id, i) => {
          const active = selected === id;
          return (
            <motion.button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: selected && !active ? 0.55 : 1, y: 0, scale: active ? 1.03 : 1 }}
              transition={{ delay: selected ? 0 : i * 0.03, type: 'spring', stiffness: 500, damping: 30 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (sealed) return;
                setSelected(id);
                sfx('select', 10);
              }}
              className={`flex min-h-[64px] items-center gap-3 rounded-2xl p-3 text-left ring-inset ${
                active ? 'bg-acid text-ink shadow-[0_6px_0_0_var(--color-acid-deep)]' : 'bg-white/[0.06] text-white ring-1 ring-white/10'
              }`}
            >
              <PlayerAvatar name={nameOf(id)} size={36} />
              <span className="min-w-0 flex-1 truncate text-[17px] font-extrabold">{nameOf(id)}</span>
              <AnimatePresence>
                {active && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="grid size-6 place-items-center rounded-full bg-ink text-acid">
                    <Check className="size-4" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <div className="safe-bottom safe-x fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md bg-gradient-to-t from-ink via-ink/95 to-transparent pt-8">
        <Button size="lg" block disabled={!selected || sealed} onClick={confirm} sound={null}>
          {selected ? 'Confirmar voto' : 'Toque em alguém'}
        </Button>
      </div>

      {/* Selo de voto guardado: cobre a tela para esconder a escolha */}
      <AnimatePresence>
        {sealed && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-ink/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12 }}
          >
            <div className="flex flex-col items-center gap-4">
              <Stamp className="text-[44px]">Voto guardado</Stamp>
              <span className="label text-white/50">segredo é segredo</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/* ---------------- Votação aberta ---------------- */

function OpenVotingView({ match, dispatch }: { match: MatchState; dispatch: (a: MatchAction) => void }) {
  const { sfx } = useApp();
  const max = maxOpenVotes(match);
  const candidates = candidateIds(match);
  const players: Player[] = match.config.players.filter((p) => candidates.includes(p.id));
  const [tally, setTally] = useState<Tally>(() => Object.fromEntries(candidates.map((id) => [id, 0])));
  const total = Object.values(tally).reduce((a, b) => a + b, 0);

  const change = (id: string, delta: number) => {
    const next = Math.max(0, (tally[id] ?? 0) + delta);
    if (delta > 0 && total >= max) return;
    sfx(delta > 0 ? 'select' : 'tick', 6);
    setTally({ ...tally, [id]: next });
  };

  return (
    <motion.section {...viewMotion} className="flex flex-1 flex-col">
      <div className="mt-3 flex items-start gap-3 rounded-2xl bg-[#ffd23f] p-4 text-ink">
        <Megaphone className="mt-0.5 size-6 shrink-0" />
        <div>
          <div className="text-[16px] font-extrabold leading-tight">Votação aberta — não é secreta</div>
          <div className="mt-1 text-[14px] leading-snug text-ink/75">
            Contem até três e todo mundo aponta ao mesmo tempo. Uma pessoa anota quantos dedos cada um recebeu.
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-paper p-4 text-ink">
        <p className="display text-[21px] leading-[1.02]" style={{ fontVariationSettings: "'wdth' 82" }}>
          {match.question.text}
        </p>
      </div>

      <div className="mt-5 mb-2 flex items-center justify-between">
        <span className="label text-white/55">Placar da mesa</span>
        <span className={`label font-bold ${total === max ? 'text-acid' : 'text-white/70'}`}>
          {total} de {max} votos
        </span>
      </div>

      <ul className="flex flex-col gap-2 pb-28">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-2 pl-3 ring-1 ring-inset ring-white/10">
            <PlayerAvatar name={p.name} size={34} />
            <span className="min-w-0 flex-1 truncate text-[17px] font-extrabold">{p.name}</span>
            <button
              type="button"
              aria-label={`Tirar voto de ${p.name}`}
              disabled={(tally[p.id] ?? 0) === 0}
              onClick={() => change(p.id, -1)}
              className="grid size-11 place-items-center rounded-xl bg-white/[0.07] disabled:opacity-25"
            >
              <Minus className="size-5" />
            </button>
            <motion.span key={tally[p.id]} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="display w-8 text-center text-[28px] tabular-nums">
              {tally[p.id] ?? 0}
            </motion.span>
            <button
              type="button"
              aria-label={`Dar voto para ${p.name}`}
              disabled={total >= max}
              onClick={() => change(p.id, 1)}
              className="grid size-11 place-items-center rounded-xl bg-acid text-ink disabled:bg-white/10 disabled:text-white/30"
            >
              <Plus className="size-5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="safe-bottom safe-x fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md bg-gradient-to-t from-ink via-ink/95 to-transparent pt-8">
        <Button size="lg" block disabled={total < 1} sound="confirm" onClick={() => dispatch({ type: 'openTally', tally })}>
          {total < 1 ? 'Registre pelo menos um voto' : 'Revelar resultado'}
        </Button>
      </div>
    </motion.section>
  );
}
