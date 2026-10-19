import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { AVATARS } from '../../data/avatars';
import { useApp } from '../../app/AppContext';
import { Sheet } from '../modals/Sheet';

/** Grade para escolher o bonequinho. Os já usados por outros aparecem marcados, mas podem repetir. */
export function AvatarPicker({
  open,
  title = 'Escolha seu bonequinho',
  value,
  taken = [],
  onPick,
  onClose,
}: {
  open: boolean;
  title?: string;
  value?: string | null;
  taken?: (string | null | undefined)[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const { sfx } = useApp();
  const used = new Set(taken.filter(Boolean));
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="grid grid-cols-4 gap-2.5 pb-4">
        {AVATARS.map((a) => {
          const active = a.id === value;
          const busy = !active && used.has(a.id);
          return (
            <motion.button
              key={a.id}
              type="button"
              whileTap={{ scale: 0.9 }}
              aria-pressed={active}
              aria-label={`${a.name}${busy ? ' (já escolhido)' : ''}`}
              onClick={() => {
                sfx('select', 8);
                onPick(a.id);
              }}
              className="flex flex-col items-center gap-1"
            >
              <span
                className={`relative block aspect-square w-full overflow-hidden rounded-[28%] ${active ? 'ring-4 ring-acid' : ''} ${busy ? 'opacity-35' : ''}`}
                style={{ background: a.bg }}
              >
                <svg viewBox="0 0 64 64" className="block h-full w-full">
                  {a.art}
                </svg>
                {active && (
                  <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-acid text-ink">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="text-[12px] font-bold text-white/70">{a.name}</span>
            </motion.button>
          );
        })}
      </div>
    </Sheet>
  );
}
