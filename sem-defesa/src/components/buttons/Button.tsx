import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { useApp } from '../../app/AppContext';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'paper';
type Size = 'lg' | 'md' | 'sm';

interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
  children?: ReactNode;
  /** Som ao tocar (padrão: tap). Use null para silêncio. */
  sound?: 'tap' | 'select' | 'confirm' | null;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-acid text-ink shadow-[0_5px_0_0_var(--color-acid-deep),0_14px_30px_-10px_rgb(212_255_42/0.45)] active:shadow-[0_1px_0_0_var(--color-acid-deep)] active:translate-y-[4px] disabled:bg-white/15 disabled:text-white/40 disabled:shadow-none',
  paper:
    'bg-paper text-ink shadow-[0_5px_0_0_#bdb5a0] active:shadow-[0_1px_0_0_#bdb5a0] active:translate-y-[4px]',
  secondary:
    'bg-white/[0.06] text-white ring-1 ring-inset ring-white/15 shadow-[0_4px_0_0_rgb(0_0_0/0.5)] active:translate-y-[3px] active:shadow-none disabled:opacity-40',
  ghost: 'bg-transparent text-white/80 hover:text-white active:bg-white/5 disabled:opacity-40',
  danger:
    'bg-danger text-white shadow-[0_5px_0_0_#a8202f] active:shadow-[0_1px_0_0_#a8202f] active:translate-y-[4px]',
};

const SIZES: Record<Size, string> = {
  lg: 'min-h-[60px] px-6 text-[19px] rounded-[20px] gap-3',
  md: 'min-h-[50px] px-5 text-[16px] rounded-2xl gap-2.5',
  sm: 'min-h-[42px] px-4 text-[14px] rounded-xl gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  block,
  children,
  className = '',
  sound = 'tap',
  onClick,
  disabled,
  ...rest
}: Props) {
  const { sfx } = useApp();
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      disabled={disabled}
      onClick={(e) => {
        if (sound) sfx(sound, 8);
        onClick?.(e);
      }}
      className={`relative inline-flex items-center justify-center font-extrabold tracking-tight transition-[transform,box-shadow,background-color] duration-100 ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon && <span className="shrink-0 [&>svg]:size-[1.15em]">{icon}</span>}
      {children && <span className="leading-tight">{children}</span>}
      {iconRight && <span className="shrink-0 [&>svg]:size-[1.15em]">{iconRight}</span>}
    </motion.button>
  );
}

export function IconButton({
  label,
  children,
  className = '',
  onClick,
  ...rest
}: Omit<HTMLMotionProps<'button'>, 'children'> & { label: string; children: ReactNode }) {
  const { sfx } = useApp();
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        sfx('tap', 6);
        onClick?.(e);
      }}
      className={`grid size-11 place-items-center rounded-full bg-white/[0.06] text-white/85 ring-1 ring-inset ring-white/10 active:bg-white/15 [&>svg]:size-5 ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
