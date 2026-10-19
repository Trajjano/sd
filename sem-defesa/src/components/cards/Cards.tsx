import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { Question } from '../../types';
import { getCategory } from '../../data/categories';
import { BRAND } from '../../app/brand';
import { CrackedShield } from '../ui/Logo';

export function CategorySticker({ categoryId, className = '' }: { categoryId: Question['category']; className?: string }) {
  const cat = getCategory(categoryId);
  return (
    <span
      className={`label inline-flex items-center rounded-md border-2 border-ink px-2 py-1 font-bold shadow-[2px_2px_0_0_rgb(0_0_0/0.85)] ${className}`}
      style={{ background: cat.color, color: cat.ink }}
    >
      {cat.tag}
    </span>
  );
}

/** Frente da carta de pergunta. */
export function QuestionFace({
  question,
  number,
  compact = false,
}: {
  question: Question;
  number?: number;
  compact?: boolean;
}) {
  const cat = getCategory(question.category);
  const len = question.text.length;
  const size = compact
    ? 'text-[20px]'
    : len > 95
      ? 'text-[clamp(23px,6.6vw,30px)]'
      : len > 70
        ? 'text-[clamp(25px,7.2vw,33px)]'
        : 'text-[clamp(28px,8.2vw,38px)]';
  return (
    <div className="card-paper relative flex h-full w-full flex-col overflow-hidden rounded-[26px] p-5">
      {/* faixa da categoria */}
      <div className="absolute inset-x-0 top-0 h-2.5" style={{ background: cat.color }} />
      <div className="mt-1 flex items-center justify-between">
        <CategorySticker categoryId={question.category} className="-rotate-3" />
        {number !== undefined && (
          <span className="label font-bold text-ink/45">Nº {String(number).padStart(3, '0')}</span>
        )}
      </div>
      <div className="flex flex-1 items-center py-4">
        <p className={`display ${size} leading-[0.98] text-balance text-ink`} style={{ fontVariationSettings: "'wdth' 80" }}>
          {question.text}
        </p>
      </div>
      <div className="flex items-end justify-between border-t-2 border-dashed border-ink/15 pt-3">
        <span className="label font-bold text-ink/50">{cat.name}</span>
        <span className="flex items-center gap-1.5 text-ink/70">
          <CrackedShield className="h-4 w-auto" />
          {!compact && <span className="display text-[13px] tracking-tight">{BRAND.name}</span>}
        </span>
      </div>
      {question.heavy && (
        <span className="label absolute right-5 bottom-12 rotate-[-8deg] rounded border-2 border-danger px-1.5 py-0.5 font-bold text-danger/90">
          pesada
        </span>
      )}
    </div>
  );
}

/** Verso da carta. */
export function CardBack({ label }: { label?: string }) {
  return (
    <div className="card-back @container relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[26px] ring-1 ring-inset ring-white/10">
      <div className="absolute inset-3 rounded-[20px] border-2 border-dashed border-acid/30" />
      <div className="relative flex flex-col items-center">
        <span className="grid size-[38cqw] -rotate-6 place-items-center rounded-[22%] bg-acid text-ink shadow-[5px_6px_0_0_#000]">
          <span className="display text-[18cqw] leading-none">{BRAND.mark}</span>
        </span>
        <span className="display mt-[6cqw] text-[11cqw] text-white">{BRAND.name}</span>
        {label && <span className="label mt-2 text-acid/80 @max-[180px]:hidden">{label}</span>}
      </div>
      <span className="label absolute top-6 left-6 text-white/40 @max-[220px]:hidden">não vire</span>
      <span className="label absolute right-6 bottom-6 text-white/40 @max-[220px]:hidden">sem volta</span>
    </div>
  );
}

/** Carta que vira em 3D. `flipped=true` mostra a frente. */
export function FlipCard({
  flipped,
  front,
  back,
  className = '',
  duration = 0.6,
}: {
  flipped: boolean;
  front: ReactNode;
  back: ReactNode;
  className?: string;
  duration?: number;
}) {
  return (
    <div className={`[perspective:1400px] ${className}`}>
      <motion.div
        className="preserve-3d relative h-full w-full"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration, ease: [0.3, 1.25, 0.4, 1] }}
      >
        <div className="backface-hidden card-shadow absolute inset-0 rounded-[26px]">{back}</div>
        <div className="backface-hidden card-shadow absolute inset-0 rounded-[26px] [transform:rotateY(180deg)]">{front}</div>
      </motion.div>
    </div>
  );
}
