import { motion } from 'motion/react';
import { BRAND } from '../../app/brand';

/** Escudo rachado: o "sem defesa" em forma de símbolo. */
export function CrackedShield({ className = '', color = 'currentColor' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 32 36" className={className} aria-hidden="true">
      <path
        d="M16 2 L29 7 V17 C29 25.5 23.5 31 16 34 C8.5 31 3 25.5 3 17 V7 Z"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M17 3 L13 13 L19 17 L12 27 L15 33" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Rabisco de marcador. */
export function Scribble({ className = '', color = 'var(--color-acid)', delay = 0 }: { className?: string; color?: string; delay?: number }) {
  return (
    <svg viewBox="0 0 300 24" preserveAspectRatio="none" className={className} aria-hidden="true">
      <motion.path
        d="M4 15 C 50 6, 90 20, 140 11 S 230 6, 296 13 M 20 19 C 80 14, 150 22, 270 15"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

/** Logotipo completo, empilhado. */
export function Logo({ className = '' }: { className?: string }) {
  const [top, bottom] = BRAND.logoLines;
  return (
    <div className={`relative inline-flex flex-col items-start select-none ${className}`} aria-label={BRAND.name} role="img">
      <motion.div
        initial={{ rotate: -14, scale: 0.6, opacity: 0 }}
        animate={{ rotate: -5, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.1 }}
        className="relative z-10 -mb-2 ml-1 inline-flex items-center gap-2 rounded-xl bg-acid px-3 py-1 text-ink shadow-[3px_4px_0_0_#000]"
      >
        <CrackedShield className="h-[0.9em] w-auto text-[clamp(22px,7vw,34px)]" />
        <span className="display text-[clamp(26px,8vw,40px)]">{top}</span>
      </motion.div>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="display relative text-[clamp(64px,22vw,118px)] leading-[0.82] text-white [text-shadow:4px_5px_0_#4a1f80]"
      >
        {bottom}
        <Scribble className="absolute -bottom-3 left-[2%] h-5 w-[96%]" delay={0.45} />
      </motion.div>
    </div>
  );
}

/** Versão compacta da marca para cabeçalhos. */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} aria-label={BRAND.name} role="img">
      <span className="grid size-9 -rotate-6 place-items-center rounded-[10px] bg-acid text-ink shadow-[2px_3px_0_0_#000]">
        <span className="display text-[17px] leading-none">{BRAND.mark}</span>
      </span>
      <span className="display hidden text-[20px] leading-none tracking-tight text-white min-[380px]:inline">{BRAND.name}</span>
    </div>
  );
}
