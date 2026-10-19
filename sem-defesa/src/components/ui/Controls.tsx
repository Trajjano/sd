import { motion } from 'motion/react';
import { Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '../../app/AppContext';

export function Toggle({
  checked,
  onChange,
  label,
  description,
  icon,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  const { sfx } = useApp();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        sfx('select', 8);
        onChange(!checked);
      }}
      className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] p-4 text-left ring-1 ring-inset ring-white/10 active:bg-white/[0.08] disabled:opacity-40"
    >
      {icon && <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-acid [&>svg]:size-5">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold leading-tight">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-white/55">{description}</span>}
      </span>
      <span
        className={`relative h-8 w-[54px] shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-acid' : 'bg-white/15'}`}
      >
        <motion.span
          className={`absolute top-1 size-6 rounded-full shadow ${checked ? 'bg-ink' : 'bg-white'}`}
          animate={{ left: checked ? 26 : 4 }}
          transition={{ type: 'spring', stiffness: 700, damping: 35 }}
        />
      </span>
    </button>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  format = (v) => String(v),
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  format?: (v: number) => string;
}) {
  const { sfx } = useApp();
  const set = (v: number) => {
    const next = Math.min(max, Math.max(min, v));
    if (next !== value) {
      sfx('tick', 6);
      onChange(next);
    }
  };
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        aria-label={`Diminuir ${label}`}
        disabled={value <= min}
        onClick={() => set(value - 1)}
        className="grid size-12 place-items-center rounded-xl bg-white/[0.07] ring-1 ring-inset ring-white/10 disabled:opacity-30"
      >
        <Minus className="size-5" />
      </motion.button>
      <motion.span
        key={value}
        initial={{ y: -8, opacity: 0.4 }}
        animate={{ y: 0, opacity: 1 }}
        className="display min-w-[3ch] text-center text-[34px] tabular-nums"
        aria-live="polite"
      >
        {format(value)}
      </motion.span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        aria-label={`Aumentar ${label}`}
        disabled={value >= max}
        onClick={() => set(value + 1)}
        className="grid size-12 place-items-center rounded-xl bg-white/[0.07] ring-1 ring-inset ring-white/10 disabled:opacity-30"
      >
        <Plus className="size-5" />
      </motion.button>
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="display text-[26px] text-white">{children}</h2>
      {aside && <div className="label pb-1 text-white/50">{aside}</div>}
    </div>
  );
}
