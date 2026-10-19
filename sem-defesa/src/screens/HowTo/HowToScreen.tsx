import { motion } from 'motion/react';
import { EyeOff, Flame, Hand, Megaphone, Play, Smartphone, Sparkles, Users, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import { BRAND } from '../../app/brand';
import { Button } from '../../components/buttons/Button';
import { SectionTitle } from '../../components/ui/Controls';
import { Screen, ScreenHeader } from '../../components/ui/Screen';

const STEPS: { icon: ReactNode; title: string; text: string }[] = [
  { icon: <Users />, title: 'Juntem a galera', text: 'De 3 a 12 pessoas. Num celular só (passando de mão em mão) ou cada um no seu.' },
  { icon: <Sparkles />, title: 'Vira a carta', text: 'Aparece uma pergunta tipo "Quem sumiria da festa sem avisar?". Todo mundo lê.' },
  { icon: <Smartphone />, title: 'Passa o celular', text: 'Cada pessoa vota em segredo em quem mais combina com a carta e passa adiante.' },
  { icon: <Hand />, title: 'Revelação', text: 'Os votos viram um por um. O mais votado leva a carta. Empate? Todo mundo leva.' },
];

const MODES: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <Wifi />,
    title: 'Cada um no seu celular',
    text: 'Uma pessoa cria a sala e os outros entram pelo código ou QR code. Todo mundo vê a carta e vota no próprio celular, e a revelação aparece ao mesmo tempo para todos. Precisa de internet.',
  },
  { icon: <EyeOff />, title: 'Votação secreta', text: 'O modo clássico. Ninguém sabe quem votou em quem — nem depois.' },
  {
    icon: <Megaphone />,
    title: 'Votação aberta',
    text: 'Sem segredo: contem até três, todo mundo aponta e uma pessoa registra o placar. Mais rápido e mais barraco.',
  },
  {
    icon: <Flame />,
    title: 'Sobrevivência social',
    text: 'O mais votado de cada rodada sai da disputa (continua votando, mas não pode mais ser votado). Empate não elimina ninguém. Quem sobrar no final é o "ficha limpa".',
  },
];

export function HowToScreen({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  return (
    <Screen className="safe-bottom">
      <ScreenHeader onBack={onBack} center={<span className="display text-[22px]">Como jogar</span>} />

      <p className="mt-4 text-[18px] font-bold leading-snug">{BRAND.slogan}</p>

      <ol className="mt-6 flex flex-col gap-3">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 * i }}
            className="flex gap-4 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/10"
          >
            <div className="flex flex-col items-center">
              <span className="display text-[34px] leading-none text-acid">{i + 1}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 text-[17px] font-extrabold [&>svg]:size-5 [&>svg]:text-white/60">
                {s.icon} {s.title}
              </div>
              <p className="mt-1 text-[15px] leading-snug text-white/65">{s.text}</p>
            </div>
          </motion.li>
        ))}
      </ol>

      <section className="mt-9">
        <SectionTitle>Modos</SectionTitle>
        <div className="flex flex-col gap-2">
          {MODES.map((m) => (
            <div key={m.title} className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/10">
              <div className="flex items-center gap-2 text-[17px] font-extrabold [&>svg]:size-5 [&>svg]:text-acid">
                {m.icon} {m.title}
              </div>
              <p className="mt-1 text-[15px] leading-snug text-white/65">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-9">
        <SectionTitle>Regras da casa</SectionTitle>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-snug text-white/65 marker:text-acid">
          <li>Por padrão ninguém vota em si mesmo. Dá pra liberar nas configurações.</li>
          <li>Não gostou da carta? Troque antes de começar a votação.</li>
          <li>O conteúdo pesado (+18) vem desligado. Ligue só se a mesa topar.</li>
          <li>É zoeira entre amigos. Se alguém não estiver curtindo, troca a carta e segue.</li>
        </ul>
      </section>

      <Button size="lg" block className="mt-9" icon={<Play />} onClick={onStart} sound="confirm">
        Bora jogar
      </Button>
    </Screen>
  );
}
