import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Check, EyeOff, Flame, Megaphone, Plus, Trash2, UserRoundX } from 'lucide-react';
import { useRef, useState } from 'react';
import type { GameMode, MatchConfig, SetupDraft } from '../../types';
import { useApp } from '../../app/AppContext';
import { QUESTIONS, countQuestions } from '../../data/questions';
import { MAX_NAME_LENGTH, MAX_PLAYERS, MAX_ROUNDS, MIN_PLAYERS, MIN_ROUNDS, validateSetup, type SetupError } from '../../game/validation/setup';
import { Button } from '../../components/buttons/Button';
import { SectionTitle, Stepper, Toggle } from '../../components/ui/Controls';
import { Screen, ScreenHeader } from '../../components/ui/Screen';
import { CategoryGrid } from '../../components/setup/CategoryGrid';
import { MenOnlyToggle } from '../../components/setup/MenOnlyToggle';
import { uid } from '../../utils/random';
import { plural } from '../../utils/text';

const MODES: { id: GameMode; name: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'secret', name: 'Votação secreta', desc: 'O celular passa de mão em mão. Ninguém vê o voto de ninguém.', icon: <EyeOff /> },
  { id: 'open', name: 'Votação aberta', desc: 'Todo mundo aponta junto e uma pessoa anota o placar.', icon: <Megaphone /> },
  { id: 'survival', name: 'Sobrevivência', desc: 'O mais votado de cada rodada sai da disputa. Quem sobrar leva o título.', icon: <Flame /> },
];

export function SetupScreen({
  draft,
  onChange,
  onBack,
  onStart,
}: {
  draft: SetupDraft;
  onChange: (d: SetupDraft) => void;
  onBack: () => void;
  onStart: (config: MatchConfig) => void;
}) {
  const { settings, updateSettings, sfx } = useApp();
  const [errors, setErrors] = useState<SetupError[]>([]);
  const [shake, setShake] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  // chaves estáveis para animar a remoção do item certo
  const keys = useRef<string[]>([]);
  while (keys.current.length < draft.names.length) keys.current.push(uid());
  keys.current.length = draft.names.length;

  const set = (patch: Partial<SetupDraft>) => {
    const next = { ...draft, ...patch };
    onChange(next);
    if (errors.length) setErrors(revalidate(next));
  };

  const revalidate = (d: SetupDraft) => {
    const r = validateSetup({ ...d, allowSelfVote: settings.allowSelfVote }, QUESTIONS, () => '');
    return r.ok ? [] : r.errors;
  };

  const badIndexes = new Set(errors.flatMap((e) => e.indexes ?? []));
  const playerErrors = errors.filter((e) => e.field === 'players');

  const addPlayer = () => {
    if (draft.names.length >= MAX_PLAYERS) return;
    keys.current.push(uid());
    set({ names: [...draft.names, ''] });
    window.setTimeout(() => inputs.current[draft.names.length]?.focus(), 40);
  };

  const removePlayer = (i: number) => {
    keys.current.splice(i, 1);
    set({ names: draft.names.filter((_, j) => j !== i) });
  };

  const allowedCategories = draft.categories.filter((c) => draft.includeHeavy || c !== 'semlimites');
  const available = countQuestions(draft.menOnly ? [...allowedCategories, 'resenha'] : allowedCategories, draft.includeHeavy);
  const filledNames = draft.names.filter((n) => n.trim()).length;

  const start = () => {
    const r = validateSetup({ ...draft, allowSelfVote: settings.allowSelfVote }, QUESTIONS, () => uid());
    if (!r.ok) {
      setErrors(r.errors);
      setShake((s) => s + 1);
      sfx('tie', [20, 40, 20]);
      const first = r.errors.find((e) => e.indexes?.length)?.indexes?.[0];
      if (first !== undefined) inputs.current[first]?.focus();
      return;
    }
    // ids únicos mesmo com o mesmo gerador
    const seen = new Set<string>();
    const players = r.config.players.map((p) => {
      let id = p.id;
      while (seen.has(id)) id = uid();
      seen.add(id);
      return { ...p, id };
    });
    onStart({ ...r.config, players });
  };

  return (
    <Screen>
      <ScreenHeader onBack={onBack} center={<span className="display text-[22px]">Nova partida</span>} />

      <div className="flex-1 pb-36">
        {/* Jogadores */}
        <section className="mt-4">
          <SectionTitle aside={`${filledNames}/${MAX_PLAYERS}`}>Quem vai jogar</SectionTitle>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {draft.names.map((name, i) => (
                <motion.li
                  key={keys.current[i]}
                  layout
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 40, height: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <div
                    className={`flex items-center gap-2 rounded-2xl bg-white/[0.05] p-1.5 pl-3 ring-1 ring-inset transition-colors ${
                      badIndexes.has(i) ? 'ring-danger' : 'ring-white/10 focus-within:ring-acid'
                    }`}
                  >
                    <span className="label w-6 shrink-0 text-white/40">{String(i + 1).padStart(2, '0')}</span>
                    <input
                      ref={(el) => {
                        inputs.current[i] = el;
                      }}
                      value={name}
                      maxLength={MAX_NAME_LENGTH + 4}
                      onChange={(e) => {
                        const names = draft.names.slice();
                        names[i] = e.target.value;
                        set({ names });
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        if (i === draft.names.length - 1) addPlayer();
                        else inputs.current[i + 1]?.focus();
                      }}
                      enterKeyHint={i === draft.names.length - 1 ? 'done' : 'next'}
                      autoComplete="off"
                      autoCapitalize="words"
                      placeholder={`Jogador ${i + 1}`}
                      aria-label={`Nome do jogador ${i + 1}`}
                      aria-invalid={badIndexes.has(i)}
                      className="min-w-0 flex-1 bg-transparent py-2.5 text-[18px] font-bold text-white placeholder:font-semibold placeholder:text-white/25 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removePlayer(i)}
                      disabled={draft.names.length <= MIN_PLAYERS}
                      aria-label={`Remover jogador ${i + 1}`}
                      className="grid size-11 shrink-0 place-items-center rounded-xl text-white/45 active:bg-white/10 disabled:opacity-20"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <AnimatePresence>
            {playerErrors.map((e) => (
              <motion.p
                key={e.message}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 flex items-start gap-2 text-[14px] font-semibold text-danger"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {e.message}
              </motion.p>
            ))}
          </AnimatePresence>
          <Button
            variant="secondary"
            block
            className="mt-3 border-2 border-dashed border-white/20 !bg-transparent !shadow-none"
            icon={<Plus />}
            onClick={addPlayer}
            disabled={draft.names.length >= MAX_PLAYERS}
          >
            {draft.names.length >= MAX_PLAYERS ? `Máximo de ${MAX_PLAYERS}` : 'Adicionar jogador'}
          </Button>
        </section>

        {/* Modo */}
        <section className="mt-9">
          <SectionTitle>Modo de jogo</SectionTitle>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Modo de jogo">
            {MODES.map((m) => {
              const active = draft.mode === m.id;
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
                    active ? 'bg-acid text-ink ring-0' : 'bg-white/[0.04] text-white ring-1 ring-white/10'
                  }`}
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl [&>svg]:size-5 ${active ? 'bg-ink text-acid' : 'bg-white/[0.07] text-acid'}`}
                  >
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
          {draft.mode !== 'open' && (
            <div className="mt-2">
              <Toggle
                checked={settings.allowSelfVote}
                onChange={(v) => updateSettings({ allowSelfVote: v })}
                label="Pode votar em si mesmo"
                description="Desligado por padrão. Às vezes a pessoa sabe que é ela."
                icon={<UserRoundX />}
              />
            </div>
          )}
        </section>

        {/* Rodadas */}
        <section className="mt-9">
          <SectionTitle>Rodadas</SectionTitle>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/10">
            <Stepper label="rodadas" value={draft.rounds} min={MIN_ROUNDS} max={MAX_ROUNDS} onChange={(rounds) => set({ rounds })} />
            <div className="flex gap-1.5">
              {[5, 10, 15].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    sfx('tick', 6);
                    set({ rounds: n });
                  }}
                  className={`label h-10 w-11 rounded-lg font-bold ${draft.rounds === n ? 'bg-white text-ink' : 'bg-white/[0.07] text-white/70'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {draft.mode === 'survival' && (
            <p className="mt-2 text-[13px] text-white/55">A partida acaba antes se sobrar só uma pessoa na disputa.</p>
          )}
        </section>

        {/* Categorias */}
        <section className="mt-9">
          <SectionTitle aside={plural(available, 'carta', 'cartas')}>Categorias</SectionTitle>
          <div className="mb-3">
            <MenOnlyToggle checked={Boolean(draft.menOnly)} includeHeavy={draft.includeHeavy} onChange={(menOnly) => set({ menOnly })} />
          </div>
          <CategoryGrid selected={draft.categories} includeHeavy={draft.includeHeavy} onChange={(categories) => set({ categories })} />
          {errors
            .filter((e) => e.field !== 'players')
            .map((e) => (
              <p key={e.message} className="mt-1 flex items-start gap-2 text-[14px] font-semibold text-danger">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {e.message}
              </p>
            ))}
          <div className="mt-3">
            <Toggle
              checked={draft.includeHeavy}
              onChange={(v) =>
                set({
                  includeHeavy: v,
                  categories: v && !draft.categories.includes('semlimites') ? [...draft.categories, 'semlimites'] : draft.categories,
                })
              }
              label="Conteúdo pesado (+18)"
              description="Libera perguntas mais ácidas e a categoria Sem limites."
              icon={<Flame />}
            />
          </div>
        </section>
      </div>

      {/* Barra fixa com o botão de começar */}
      <div className="safe-bottom safe-x fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md bg-gradient-to-t from-ink via-ink/95 to-transparent pt-8">
        <motion.div key={shake} animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : undefined} transition={{ duration: 0.35 }}>
          <Button size="lg" block onClick={start} sound={null}>
            {filledNames >= 3 ? `Começar com ${filledNames} jogadores` : 'Começar partida'}
          </Button>
        </motion.div>
      </div>
    </Screen>
  );
}
