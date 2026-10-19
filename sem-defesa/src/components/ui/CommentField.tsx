import { AnimatePresence, motion } from 'motion/react';
import { MessageSquareQuote } from 'lucide-react';
import { MAX_COMMENT_LENGTH } from '../../game/scoring/tally';

/** Justificativa opcional do voto. Aparece anônima na revelação. */
export function CommentField({
  show,
  value,
  onChange,
  targetName,
}: {
  show: boolean;
  value: string;
  onChange: (v: string) => void;
  targetName?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4">
          <label htmlFor="vote-comment" className="mb-2 flex items-center gap-2 text-[14px] font-bold text-white/75">
            <MessageSquareQuote className="size-4 text-acid" />
            Por que {targetName ?? 'essa pessoa'}? <span className="font-semibold text-white/40">(opcional)</span>
          </label>
          <textarea
            id="vote-comment"
            value={value}
            maxLength={MAX_COMMENT_LENGTH}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            enterKeyHint="done"
            placeholder="Escreve o motivo… aparece sem seu nome"
            className="w-full resize-none rounded-2xl bg-white/[0.06] px-4 py-3 text-[16px] font-semibold text-white ring-1 ring-inset ring-white/10 placeholder:text-white/30 focus:ring-acid focus:outline-none"
          />
          <span className="mt-1 block text-right text-[12px] text-white/35 tabular-nums">
            {value.length}/{MAX_COMMENT_LENGTH}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
