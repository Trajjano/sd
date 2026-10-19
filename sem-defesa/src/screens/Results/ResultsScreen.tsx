import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Home, RotateCcw, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MatchState } from '../../types';
import { summarizeMatch } from '../../game/scoring/summary';
import { finalHeadline, playerTitle } from '../../game/rules/messages';
import { getCategory } from '../../data/categories';
import { useApp } from '../../app/AppContext';
import { Button } from '../../components/buttons/Button';
import { Confetti, CountUp, Stamp } from '../../components/animations/Effects';
import { PlayerAvatar } from '../../components/ui/PlayerAvatar';
import { Scribble } from '../../components/ui/Logo';
import { Screen } from '../../components/ui/Screen';
import { CategorySticker } from '../../components/cards/Cards';
import { plural } from '../../utils/text';

const MODE_LABEL = { secret: 'Votação secreta', open: 'Votação aberta', survival: 'Sobrevivência social' } as const;

export function ResultsScreen({
  match,
  onPlayAgain,
  onNewSetup,
  onHome,
  actions,
}: {
  match: MatchState;
  onPlayAgain?: () => void;
  onNewSetup?: () => void;
  onHome?: () => void;
  /** Substitui os botões padrão (usado no modo online). */
  actions?: ReactNode;
}) {
  const { sfx } = useApp();
  const summary = useMemo(() => summarizeMatch(match), [match]);
  const nameOf = useMemo(() => {
    const m = new Map(match.config.players.map((p) => [p.id, p.name]));
    return (id: string) => m.get(id) ?? '?';
  }, [match]);
  const head = finalHeadline(summary, nameOf);
  const [open, setOpen] = useState(false);
  const maxVotes = Math.max(1, ...summary.ranking.map((r) => r.votesReceived));
  const hasWinner = summary.roundsPlayed > 0;
  const tied = summary.mode === 'survival' ? summary.survivors.length > 1 : summary.champions.length > 1;

  useEffect(() => {
    if (hasWinner) sfx(tied ? 'tie' : 'winner', [30, 50, 80]);
  }, [hasWinner, tied, sfx]);

  return (
    <Screen className="safe-bottom">
      <div className="relative pt-6">
        {hasWinner && <Confetti count={36} seed={7} />}
        <div className="label text-white/50">
          Fim de jogo · {MODE_LABEL[summary.mode]}
        </div>
        <div className="mt-4 flex flex-col items-start">
          <Stamp className="text-[26px]" color={tied ? '#ff4fa3' : 'var(--color-acid)'} rotate={-5}>
            {summary.mode === 'survival' ? (tied ? 'Sobreviventes' : 'Sobrevivente') : tied ? 'Empate no topo' : 'Mais votado'}
          </Stamp>
          <div className="relative mt-4">
            <motion.h1
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 18 }}
              className="display break-words text-[clamp(48px,16vw,84px)] leading-[0.86]"
            >
              {head.title}
            </motion.h1>
            {hasWinner && <Scribble className="absolute -bottom-3 left-0 h-5 w-full" delay={0.6} />}
          </div>
          <p className="mt-6 text-[17px] font-semibold leading-snug text-white/75">{head.subtitle}</p>
        </div>
      </div>

      {/* Números da partida */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        {[
          { label: 'rodadas', value: summary.roundsPlayed },
          { label: 'votos', value: summary.totalVotes },
          { label: 'empates', value: summary.ties },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/[0.05] p-3 text-center ring-1 ring-inset ring-white/10">
            <CountUp to={s.value} delay={0.4} className="display block text-[34px] leading-none" />
            <span className="label mt-1 block text-white/50">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Ranking */}
      <section className="mt-8">
        <h2 className="display mb-3 text-[26px]">Ranking da vergonha</h2>
        <ol className="flex flex-col gap-2">
          {summary.ranking.map((row, i) => {
            const champion =
              summary.mode === 'survival' ? summary.survivors.includes(row.player.id) : summary.champions.includes(row.player.id);
            return (
              <motion.li
                key={row.player.id}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.07 }}
                className={`relative overflow-hidden rounded-2xl p-3 ring-1 ring-inset ${champion ? 'bg-acid/10 ring-acid/60' : 'bg-white/[0.04] ring-white/10'}`}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 bg-white/[0.06]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(row.votesReceived / maxVotes) * 100}%` }}
                  transition={{ delay: 0.7 + i * 0.07, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
                <div className="relative flex items-center gap-3">
                  <span className="display w-7 text-center text-[24px] text-white/50">{row.rank}</span>
                  <PlayerAvatar name={row.player.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px] font-extrabold">{row.player.name}</div>
                    <div className={`text-[13px] font-semibold ${champion ? 'text-acid' : 'text-white/55'}`}>
                      {playerTitle(row, summary)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="display text-[28px] leading-none tabular-nums">{row.votesReceived}</div>
                    <div className="label text-white/45">{row.votesReceived === 1 ? 'voto' : 'votos'}</div>
                  </div>
                </div>
                <div className="relative mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-10 text-[12px] text-white/50">
                  <span>No topo: {plural(row.roundsOnTop, 'rodada', 'rodadas')}</span>
                  <span>Recorde: {plural(row.bestRound, 'voto', 'votos')} numa rodada</span>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </section>

      {/* Resumo rodada a rodada */}
      {summary.roundsPlayed > 0 && (
        <section className="mt-6">
          <button
            type="button"
            onClick={() => {
              sfx('tap');
              setOpen(!open);
            }}
            aria-expanded={open}
            className="flex w-full items-center justify-between rounded-2xl bg-white/[0.04] p-4 text-left ring-1 ring-inset ring-white/10"
          >
            <span className="text-[16px] font-extrabold">Resumo da partida</span>
            <motion.span animate={{ rotate: open ? 180 : 0 }}>
              <ChevronDown className="size-5" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.ol
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {match.history.map((r) => (
                  <li key={r.round} className="mt-2 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/5">
                    <div className="flex items-center gap-2">
                      <span className="label text-white/45">R{r.round}</span>
                      <CategorySticker categoryId={r.question.category} />
                    </div>
                    <p className="mt-2 text-[14px] font-semibold leading-snug text-white/80">{r.question.text}</p>
                    <p className="mt-1.5 text-[13px] text-white/55">
                      {r.topIds.length === 0
                        ? 'Ninguém votado.'
                        : `${r.isTie ? 'Empate: ' : ''}${r.topIds.map(nameOf).join(', ')} — ${plural(r.topCount, 'voto', 'votos')}${r.isTie ? ' cada' : ''} de ${r.totalVotes}`}
                      {r.eliminatedId && <span className="text-danger"> · {nameOf(r.eliminatedId)} saiu</span>}
                    </p>
                  </li>
                ))}
              </motion.ol>
            )}
          </AnimatePresence>
        </section>
      )}

      {actions ?? (
      <div className="mt-8 flex flex-col gap-3">
        <Button size="lg" block icon={<RotateCcw />} onClick={onPlayAgain} sound="confirm">
          Jogar de novo
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" icon={<Settings2 />} onClick={onNewSetup}>
            Ajustar
          </Button>
          <Button variant="secondary" icon={<Home />} onClick={onHome}>
            Início
          </Button>
        </div>
      </div>
      )}
      <p className="mt-4 text-center text-[12px] text-white/35">
        Categorias: {match.config.categories.map((c) => getCategory(c).name).join(' · ')}
      </p>
    </Screen>
  );
}
