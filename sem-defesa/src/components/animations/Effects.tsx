import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { useApp } from '../../app/AppContext';

/** Número que sobe progressivamente. */
export function CountUp({
  to,
  duration = 0.8,
  delay = 0,
  onTick,
  className = '',
}: {
  to: number;
  duration?: number;
  delay?: number;
  onTick?: () => void;
  className?: string;
}) {
  const { reduced } = useApp();
  const mv = useMotionValue(reduced ? to : 0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    if (reduced) {
      mv.set(to);
      return;
    }
    let last = 0;
    const controls = animate(mv, to, {
      duration: to === 0 ? 0.01 : duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        const r = Math.round(v);
        if (r !== last) {
          last = r;
          onTick?.();
        }
      },
    });
    return () => controls.stop();
  }, [to, duration, delay, reduced, mv, onTick]);
  return <motion.span className={`tabular-nums ${className}`}>{rounded}</motion.span>;
}

const CONFETTI_COLORS = ['#d4ff2a', '#ffffff', '#7a3cf0', '#ff4fa3', '#57d6ff', '#ffd23f'];

/** Confete leve (máx. ~36 peças). Some com movimento reduzido. */
export function Confetti({ count = 32, seed = 0 }: { count?: number; seed?: number }) {
  const { reduced } = useApp();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = (n: number) => {
          const x = Math.sin((i + 1) * 9301 + n * 49297 + seed * 233) * 10000;
          return x - Math.floor(x);
        };
        return {
          x: (r(1) - 0.5) * 340,
          y: -(180 + r(2) * 260),
          fall: 260 + r(3) * 320,
          rot: (r(4) - 0.5) * 720,
          w: 6 + r(5) * 8,
          h: 10 + r(6) * 10,
          delay: r(7) * 0.15,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          round: r(8) > 0.7,
        };
      }),
    [count, seed],
  );
  if (reduced) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-visible" aria-hidden="true">
      <div className="absolute top-1/3 left-1/2">
        {pieces.map((p, i) => (
          <motion.span
            key={i}
            className="absolute block"
            style={{ width: p.w, height: p.round ? p.w : p.h, background: p.color, borderRadius: p.round ? 999 : 2 }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
            animate={{
              x: [0, p.x, p.x * 1.15],
              y: [0, p.y, p.y + p.fall],
              rotate: p.rot,
              opacity: [1, 1, 0],
              scale: 1,
            }}
            transition={{ duration: 1.8, delay: p.delay, times: [0, 0.35, 1], ease: 'easeOut' }}
          />
        ))}
      </div>
    </div>
  );
}

/** Carimbo que bate na tela. */
export function Stamp({
  children,
  color = 'var(--color-acid)',
  rotate = -8,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  color?: string;
  rotate?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ scale: 2.6, opacity: 0, rotate: rotate - 10 }}
      animate={{ scale: 1, opacity: 1, rotate }}
      transition={{ type: 'spring', stiffness: 520, damping: 22, delay }}
      className={`display inline-block rounded-xl border-[5px] px-4 py-1.5 uppercase ${className}`}
      style={{ borderColor: color, color }}
    >
      {children}
    </motion.div>
  );
}
