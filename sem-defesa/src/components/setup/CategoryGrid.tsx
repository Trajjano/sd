import { motion } from 'motion/react';
import { Check, Lock } from 'lucide-react';
import type { CategoryId } from '../../types';
import { PICKABLE_CATEGORIES as CATEGORIES } from '../../data/categories';
import { useApp } from '../../app/AppContext';
import { Button } from '../buttons/Button';

/** Grade de categorias com cor própria; a adulta fica travada sem o conteúdo pesado. */
export function CategoryGrid({
  selected,
  includeHeavy,
  onChange,
}: {
  selected: CategoryId[];
  includeHeavy: boolean;
  onChange: (next: CategoryId[]) => void;
}) {
  const { sfx } = useApp();
  const toggle = (id: CategoryId) =>
    onChange(selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((c) => {
          const locked = c.adult && !includeHeavy;
          const active = selected.includes(c.id) && !locked;
          return (
            <motion.button
              key={c.id}
              type="button"
              aria-pressed={active}
              disabled={locked}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                sfx('select', 8);
                toggle(c.id);
              }}
              className="relative flex min-h-[62px] items-center gap-2.5 overflow-hidden rounded-2xl p-3 text-left ring-1 ring-inset ring-white/10 transition-colors disabled:opacity-35"
              style={active ? { background: c.color, color: c.ink } : { background: 'rgb(255 255 255 / 0.04)' }}
            >
              <span
                className="grid size-6 shrink-0 place-items-center rounded-md"
                style={active ? { background: c.ink, color: c.color } : { border: `2px solid ${c.color}` }}
              >
                {locked ? <Lock className="size-3.5 text-white" /> : active && <Check className="size-4" strokeWidth={3} />}
              </span>
              <span className="text-[14px] font-extrabold leading-tight">{c.name}</span>
            </motion.button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => onChange(CATEGORIES.map((c) => c.id))}>
          Marcar todas
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onChange([])}>
          Limpar
        </Button>
      </div>
    </>
  );
}
