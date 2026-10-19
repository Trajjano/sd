import { motion } from 'motion/react';
import { ArrowRight, FastForward, MessageSquareQuote, Trophy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RoundResult } from '../../types';
import { roundMessage } from '../../game/rules/messages';
import { useApp } from '../../app/AppContext';
import { Button } from '../../components/buttons/Button';
import { FlipCard } from '../../components/cards/Cards';
import { Confetti, CountUp, Stamp } from '../../components/animations/Effects';
import { PlayerAvatar } from '../../components/ui/PlayerAvatar';
import { joinNames, plural } from '../../utils/text';
import { roundDrinks } from '../../game/rules/drinking';
import { DrinkCalls } from '../../components/ui/DrinkCalls';

type Stage = 'suspense' | 'flipping' | 'final';

/**
 * Revelação dos votos de uma rodada. Usada no modo local e no online.
 * Sem `onNext`, mostra quem precisa avançar (`waitingFor`).
 */
export function RevealView({
  result,
  nameOf,
  isLast,
  voterCount,
  onNext,
  waitingFor,
  avatarOf,
  drinking,
}: {
  result: RoundResult;
  nameOf: (id: string) => string;
  isLast: boolean;
  voterCount: number;
  onNext?: () => void;
  waitingFor?: string;
  avatarOf?: (id: string) => string | null | undefined;
  drinking?: boolean;
}) {
  const { sfx, reduced } = useApp();
  const [stage, setStage] = useState<Stage>('suspense');
  const [flippedCount, setFlippedCount] = useState(0);
  const timers = useRef<number[]>([]);

  const message = useMemo(() => roundMessage(result, nameOf, Math.random), [result, nameOf]);

  // Ordem de revelação: menos votados primeiro; os do topo viram juntos no final.
  const order = useMemo(() => {
    const ids = result.candidateIds.slice();
    const rest = ids.filter((id) => !result.topIds.includes(id)).sort((a, b) => result.tally[a] - result.tally[b]);
    return [...rest, ...result.topIds];
  }, [result]);
  const flipSteps = order.length - result.topIds.length + (result.topIds.length ? 1 : 0);
  const stepOf = (id: string) => (result.topIds.includes(id) ? flipSteps - 1 : order.indexOf(id));

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const finish = useCallback(() => {
    clear();
    setFlippedCount(flipSteps);
    setStage('final');
    if (result.isTie) sfx('tie', [30, 60, 30]);
    else sfx('winner', [20, 40, 60]);
  }, [flipSteps, result.isTie, sfx]);

  useEffect(() => {
    const suspense = reduced ? 250 : 1100;
    const gap = reduced ? 90 : 360;
    sfx('reveal');
    const t: number[] = [];
    t.push(window.setTimeout(() => setStage('flipping'), suspense));
    for (let i = 0; i < flipSteps; i++) {
      const extra = i === flipSteps - 1 ? (reduced ? 100 : 650) : 0; // pausa dramática antes do topo
      t.push(
        window.setTimeout(() => {
          setFlippedCount(i + 1);
          sfx('flip', 8);
        }, suspense + 200 + i * gap + extra),
      );
    }
    t.push(window.setTimeout(finish, suspense + 200 + flipSteps * gap + (reduced ? 200 : 1300)));
    timers.current = t;
    return clear;
    // roda uma vez por rodada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const final = stage === 'final';
  const topNames = result.topIds.map(nameOf);
  const over = isLast;
  const cols = order.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';
  const voters = voterCount;

  let stampText = 'Culpado';
  let stampColor = 'var(--color-acid)';
  if (result.mode === 'survival') {
    stampText = result.isTie ? 'Ninguém sai' : 'Queimado';
    stampColor = result.isTie ? '#57d6ff' : '#ff4d5e';
  } else if (result.isTie) {
    stampText = 'Empate';
    stampColor = '#ff4fa3';
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="relative flex flex-1 flex-col"
    >
      <div className="mt-2 rounded-2xl bg-white/[0.05] p-3 ring-1 ring-inset ring-white/10">
        <p className="text-[15px] font-bold leading-snug text-white/85">{result.question.text}</p>
        <p className="label mt-2 text-white/45">
          {plural(result.totalVotes, 'voto', 'votos')}
          {result.mode === 'open' ? ' · votação aberta' : ` · ${plural(voters, 'jogador votou', 'jogadores votaram')}`}
        </p>
      </div>

      {/* Suspense */}
      {stage === 'suspense' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="relative h-40 w-28">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="card-back card-shadow absolute inset-0 rounded-2xl"
                animate={reduced ? {} : { rotate: [i * 6 - 6, i * 6 - 2, i * 6 - 6], x: [0, (i - 1) * 6, 0], y: [0, -6, 0] }}
                transition={{ duration: 0.45, repeat: Infinity, delay: i * 0.08 }}
              />
            ))}
          </div>
          <motion.p
            className="display text-[34px]"
            animate={reduced ? {} : { opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          >
            Contando os votos…
          </motion.p>
        </div>
      )}

      {/* Cartas dos participantes */}
      {stage !== 'suspense' && (
        <div className="relative mt-4">
          {final && !result.isTie && result.topIds.length > 0 && <Confetti seed={result.round} />}

          {final && (
            <div className="relative z-20 mb-4 flex flex-col items-center text-center">
              <Stamp color={stampColor} className="text-[28px]">
                {stampText}
              </Stamp>
              <motion.h2
                initial={{ y: 16, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
                className="display mt-2 break-words text-[clamp(34px,11vw,56px)] leading-[0.9]"
              >
                {result.topIds.length ? (result.isTie ? topNames.join(' × ') : topNames[0]) : 'Ninguém'}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-2 max-w-[32ch] text-[15px] leading-snug text-white/70"
              >
                {result.topIds.length > 0 && (
                  <span className="font-bold text-white">
                    {result.isTie
                      ? `${plural(result.topCount, 'voto', 'votos')} cada. `
                      : `${plural(result.topCount, 'voto', 'votos')} de ${result.totalVotes}. `}
                  </span>
                )}
                {message}
              </motion.p>
              {drinking && <DrinkCalls calls={roundDrinks(result)} nameOf={nameOf} />}
            </div>
          )}

          <div className={`grid ${cols} gap-2.5`}>
            {(final ? [...result.topIds, ...order.filter((id) => !result.topIds.includes(id))] : order).map((id) => {
              const votes = result.tally[id] ?? 0;
              const isTop = result.topIds.includes(id);
              const shown = flippedCount > stepOf(id);
              return (
                <motion.div
                  key={id}
                  layout
                  initial={{ y: 30, opacity: 0 }}
                  animate={{
                    y: 0,
                    opacity: final && !isTop ? 0.45 : 1,
                    scale: final && isTop ? 1.04 : 1,
                    rotate: final && isTop && result.isTie && !reduced ? [0, -3, 3, -2, 0] : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22, rotate: { duration: 0.5 } }}
                  className={`relative ${order.length > 6 ? 'h-[100px]' : 'h-[112px]'}`}
                >
                  <FlipCard
                    className="h-full w-full"
                    flipped={shown}
                    duration={0.5}
                    back={
                      <div className="card-back flex h-full w-full items-center justify-center rounded-[26px]">
                        <span className="display text-[44px] text-acid/80">?</span>
                      </div>
                    }
                    front={
                      <div
                        className={`card-paper flex h-full w-full flex-col items-center justify-center gap-1 rounded-[26px] p-2 text-center ${
                          final && isTop ? 'ring-4 ring-acid ring-inset' : ''
                        }`}
                      >
                        <PlayerAvatar name={nameOf(id)} avatar={avatarOf?.(id)} size={order.length > 6 ? 28 : 34} />
                        <span className="w-full truncate text-[14px] font-extrabold text-ink">{nameOf(id)}</span>
                        <span className="display flex items-baseline gap-1 text-ink">
                          {shown ? (
                            <CountUp to={votes} duration={0.6} className="text-[32px] leading-none" />
                          ) : (
                            <span className="text-[32px] leading-none">0</span>
                          )}
                          <span className="label text-ink/50">{votes === 1 ? 'voto' : 'votos'}</span>
                        </span>
                      </div>
                    }
                  />
                  {final && isTop && (
                    <motion.span
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: -12 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.2 }}
                      className="absolute -top-2 -right-1 z-10 grid size-8 place-items-center rounded-full bg-acid text-ink shadow-[2px_2px_0_0_#000]"
                    >
                      <Trophy className="size-4" />
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {final && result.comments && result.comments.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6"
              aria-label="Justificativas"
            >
              <h3 className="label mb-2 flex items-center gap-2 text-white/55">
                <MessageSquareQuote className="size-4 text-acid" /> Por que votaram (anônimo)
              </h3>
              <ul className="flex flex-col gap-2">
                {result.comments.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-2xl bg-white/[0.05] p-3 ring-1 ring-inset ring-white/10">
                    <PlayerAvatar name={nameOf(c.targetId)} avatar={avatarOf?.(c.targetId)} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-bold text-white/45">sobre {nameOf(c.targetId)}</div>
                      <p className="text-[15px] font-semibold leading-snug break-words text-white">“{c.text}”</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.section>
          )}
          <div className="h-28" />
        </div>
      )}

      <div className="safe-bottom safe-x fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md bg-gradient-to-t from-ink via-ink/95 to-transparent pt-8">
        {final ? (
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            {onNext ? (
              <Button
                size="lg"
                block
                sound="confirm"
                iconRight={<ArrowRight />}
                onClick={onNext}
                aria-label={over ? 'Ver resultado final' : 'Próxima rodada'}
              >
                {over ? 'Ver resultado final' : 'Próxima rodada'}
              </Button>
            ) : (
              <div className="flex min-h-[60px] items-center justify-center gap-2 rounded-[20px] bg-white/[0.06] px-4 text-center text-[15px] font-bold text-white/70 ring-1 ring-inset ring-white/10">
                <span className="size-2 animate-pulse rounded-full bg-acid" />
                Aguardando {waitingFor ?? 'o anfitrião'} {over ? 'mostrar o resultado' : 'passar a rodada'}
              </div>
            )}
            {result.mode === 'survival' && result.eliminatedId && !over && (
              <p className="mt-2 text-center text-[13px] text-white/50">
                {joinNames([nameOf(result.eliminatedId)])} continua votando, mas não recebe mais votos.
              </p>
            )}
          </motion.div>
        ) : (
          <Button variant="ghost" block icon={<FastForward />} onClick={finish} sound={null}>
            Pular suspense
          </Button>
        )}
      </div>
    </motion.section>
  );
}
