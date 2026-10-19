import { motion } from 'motion/react';
import { BarChart3, BookOpen, LogIn, Play, RotateCcw, Settings as SettingsIcon, Smartphone, Users, Wifi, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { MatchState } from '../../types';
import { BRAND } from '../../app/brand';
import { useApp } from '../../app/AppContext';
import { QUESTIONS } from '../../data/questions';
import { Button, IconButton } from '../../components/buttons/Button';
import { CardBack, FlipCard, QuestionFace } from '../../components/cards/Cards';
import { Logo } from '../../components/ui/Logo';
import { Screen } from '../../components/ui/Screen';
import { Sheet } from '../../components/modals/Sheet';
import { pick } from '../../utils/random';

const SAFE_QUESTIONS = QUESTIONS.filter((q) => !q.heavy);

export function HomeScreen({
  onStart,
  onStartOnline,
  onJoin,
  onlineCode,
  onReturnOnline,
  onHowTo,
  onStats,
  onSettings,
  resumable,
  onResume,
  onDiscard,
}: {
  onStart: () => void;
  onStartOnline: () => void;
  onJoin: () => void;
  /** Código da sala online em que o jogador ainda está. */
  onlineCode: string | null;
  onReturnOnline: () => void;
  onHowTo: () => void;
  onStats: () => void;
  onSettings: () => void;
  resumable: MatchState | null;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const { sfx, reduced } = useApp();
  const [flipped, setFlipped] = useState(false);
  const [choose, setChoose] = useState(false);
  const [question, setQuestion] = useState(() => pick(SAFE_QUESTIONS));
  const number = useMemo(() => QUESTIONS.indexOf(question) + 1, [question]);

  const flip = () => {
    sfx('flip', 10);
    if (flipped) {
      setFlipped(false);
      // troca a pergunta enquanto a carta está de costas
      window.setTimeout(() => setQuestion(pick(SAFE_QUESTIONS)), 300);
    } else setFlipped(true);
  };

  return (
    <Screen className="safe-bottom">
      <header className="flex h-14 items-center justify-end gap-2">
        <IconButton label="Estatísticas" onClick={onStats}>
          <BarChart3 />
        </IconButton>
        <IconButton label="Configurações" onClick={onSettings}>
          <SettingsIcon />
        </IconButton>
      </header>

      <div className="mt-1">
        <Logo />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-5 max-w-[24ch] text-[17px] min-[400px]:max-w-[19ch] min-[400px]:text-[19px] [@media(max-height:700px)]:mt-3 font-bold leading-tight text-white"
        >
          {BRAND.slogan}
        </motion.p>
      </div>

      {/* Carta principal */}
      <div className="relative my-4 flex flex-1 items-center justify-center">
        <div className="relative aspect-[3/4] w-[clamp(96px,calc((100dvh-500px)*0.75),min(56vw,230px))]">
          <motion.div
            aria-hidden="true"
            className="card-back card-shadow absolute inset-0 rounded-[26px] opacity-70"
            initial={{ rotate: 0 }}
            animate={{ rotate: 9, x: 22, y: 6 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 14 }}
          />
          <motion.div
            className="absolute inset-0"
            initial={{ y: 60, opacity: 0, rotate: -12, scale: 0.85 }}
            animate={
              reduced
                ? { y: 0, opacity: 1, rotate: -3, scale: 1 }
                : { y: [0, -8, 0], opacity: 1, rotate: [-3, -1.5, -3], scale: 1 }
            }
            transition={
              reduced
                ? { duration: 0.3 }
                : {
                    y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
                    rotate: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 },
                    opacity: { duration: 0.4 },
                    scale: { type: 'spring', stiffness: 200, damping: 18 },
                  }
            }
          >
            <button
              type="button"
              onClick={flip}
              aria-label={flipped ? 'Virar a carta de volta' : 'Virar a carta para ver uma pergunta'}
              className="block h-full w-full rounded-[26px]"
            >
              <FlipCard
                className="h-full w-full"
                flipped={flipped}
                back={<CardBack label="toque pra virar" />}
                front={<QuestionFace question={question} number={number} compact />}
              />
            </button>
          </motion.div>
        </div>
      </div>

      {resumable && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex items-center gap-3 rounded-2xl bg-grape/40 p-3 ring-1 ring-inset ring-white/15"
        >
          <div className="min-w-0 flex-1 pl-1">
            <div className="label text-acid">Partida em andamento</div>
            <div className="truncate text-[15px] font-bold">
              Rodada {resumable.round} de {resumable.config.rounds} · {resumable.config.players.length} jogadores
            </div>
          </div>
          <IconButton label="Descartar partida" onClick={onDiscard} className="size-10">
            <X />
          </IconButton>
          <Button size="sm" onClick={onResume} icon={<RotateCcw />}>
            Continuar
          </Button>
        </motion.div>
      )}

      {onlineCode && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex items-center gap-3 rounded-2xl bg-grape/40 p-3 ring-1 ring-inset ring-white/15"
        >
          <Wifi className="ml-1 size-5 shrink-0 text-acid" />
          <div className="min-w-0 flex-1">
            <div className="label text-acid">Você está numa sala</div>
            <div className="truncate text-[15px] font-bold">Sala {onlineCode}</div>
          </div>
          <Button size="sm" onClick={onReturnOnline}>
            Voltar
          </Button>
        </motion.div>
      )}

      <div className="flex flex-col gap-3">
        <Button size="lg" block onClick={() => setChoose(true)} icon={<Play className="fill-current" />} sound="confirm">
          Começar partida
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onJoin} icon={<LogIn />}>
            Entrar numa sala
          </Button>
          <Button variant="secondary" onClick={onHowTo} icon={<BookOpen />}>
            Como jogar
          </Button>
        </div>
      </div>

      <Sheet open={choose} onClose={() => setChoose(false)} title="Como vão jogar?">
        <div className="flex flex-col gap-3 pb-3">
          {[
            {
              icon: <Smartphone />,
              title: 'Um celular só',
              text: 'O celular passa de mão em mão. Funciona sem internet.',
              go: onStart,
            },
            {
              icon: <Users />,
              title: 'Cada um no seu celular',
              text: 'Você cria uma sala e os amigos entram pelo código ou QR code. Precisa de internet.',
              go: onStartOnline,
            },
          ].map((o) => (
            <button
              key={o.title}
              type="button"
              onClick={() => {
                sfx('select', 8);
                setChoose(false);
                o.go();
              }}
              className="flex items-start gap-3 rounded-2xl bg-white/[0.05] p-4 text-left ring-1 ring-inset ring-white/10 active:bg-acid active:text-ink"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-acid text-ink [&>svg]:size-6">{o.icon}</span>
              <span>
                <span className="block text-[18px] font-extrabold leading-tight">{o.title}</span>
                <span className="mt-1 block text-[14px] leading-snug opacity-65">{o.text}</span>
              </span>
            </button>
          ))}
        </div>
      </Sheet>
      <p className="mt-4 text-center text-[13px] [@media(max-height:720px)]:hidden leading-snug text-white/45">{BRAND.pitch}</p>
    </Screen>
  );
}
