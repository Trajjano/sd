import { motion } from 'motion/react';
import { Check, EyeOff, Flame, UserRoundX } from 'lucide-react';
import type { OnlineConfig, OnlineMode } from '../../online/api';
import { useApp } from '../../app/AppContext';
import { countQuestions } from '../../data/questions';
import { MAX_ROUNDS, MIN_ROUNDS } from '../../game/validation/setup';
import { SectionTitle, Stepper, Toggle } from '../../components/ui/Controls';
import { CategoryGrid } from '../../components/setup/CategoryGrid';
import { DrinkingToggle, HeavyToggle, MenOnlyToggle } from '../../components/setup/ModeToggles';
import { getCategory } from '../../data/categories';
import { plural } from '../../utils/text';

const MODES: { id: OnlineMode; name: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'secret', name: 'Votação secreta', desc: 'Cada um vota no próprio celular. Ninguém vê o voto de ninguém.', icon: <EyeOff /> },
  { id: 'survival', name: 'Sobrevivência', desc: 'O mais votado sai da disputa a cada rodada. Quem sobrar leva.', icon: <Flame /> },
];

export function availableCards(c: OnlineConfig) {
  const cats = c.categories.filter((id) => (c.includeHeavy || !getCategory(id).adult) && !getCategory(id).menOnly);
  if (c.menOnly) cats.push('resenha');
  return countQuestions(cats, c.includeHeavy);
}

/** Regras da sala online (modo, rodadas, categorias). */
export function OnlineRules({ value, onChange }: { value: OnlineConfig; onChange: (c: OnlineConfig) => void }) {
  const { sfx } = useApp();
  const set = (patch: Partial<OnlineConfig>) => onChange({ ...value, ...patch });
  const cards = availableCards(value);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionTitle>Modo de jogo</SectionTitle>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Modo de jogo">
          {MODES.map((m) => {
            const active = value.mode === m.id;
            return (
              <motion.button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  sfx('select', 8);
                  set({ mode: m.id });
                }}
                className={`flex items-start gap-3 rounded-2xl p-4 text-left ring-inset transition-colors ${
                  active ? 'bg-acid text-ink' : 'bg-white/[0.04] text-white ring-1 ring-white/10'
                }`}
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl [&>svg]:size-5 ${active ? 'bg-ink text-acid' : 'bg-white/[0.07] text-acid'}`}>
                  {m.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-extrabold leading-tight">{m.name}</span>
                  <span className={`mt-0.5 block text-[14px] leading-snug ${active ? 'text-ink/70' : 'text-white/55'}`}>{m.desc}</span>
                </span>
                {active && <Check className="mt-1 size-5 shrink-0" />}
              </motion.button>
            );
          })}
        </div>
        <div className="mt-2">
          <Toggle
            checked={value.allowSelfVote}
            onChange={(allowSelfVote) => set({ allowSelfVote })}
            label="Pode votar em si mesmo"
            description="Desligado por padrão."
            icon={<UserRoundX />}
          />
        </div>
      </section>

      <section>
        <SectionTitle>Rodadas</SectionTitle>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/10">
          <Stepper label="rodadas" value={value.rounds} min={MIN_ROUNDS} max={MAX_ROUNDS} onChange={(rounds) => set({ rounds })} />
          <div className="flex gap-1.5">
            {[5, 10, 15].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  sfx('tick', 6);
                  set({ rounds: n });
                }}
                className={`label h-10 w-11 rounded-lg font-bold ${value.rounds === n ? 'bg-white text-ink' : 'bg-white/[0.07] text-white/70'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionTitle aside={plural(cards, 'carta', 'cartas')}>Categorias</SectionTitle>
        <div className="mb-3 flex flex-col gap-2">
          <DrinkingToggle checked={Boolean(value.drinking)} categories={value.categories} onChange={(drinking, categories) => set({ drinking, categories })} />
          <MenOnlyToggle checked={Boolean(value.menOnly)} includeHeavy={value.includeHeavy} onChange={(menOnly) => set({ menOnly })} />
          <HeavyToggle checked={value.includeHeavy} categories={value.categories} onChange={(includeHeavy, categories) => set({ includeHeavy, categories })} />
        </div>
        <CategoryGrid selected={value.categories} includeHeavy={value.includeHeavy} onChange={(categories) => set({ categories })} />
      </section>
    </div>
  );
}
