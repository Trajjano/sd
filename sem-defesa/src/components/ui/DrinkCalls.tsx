import { motion } from 'motion/react';
import { Wine } from 'lucide-react';
import type { DrinkCall } from '../../game/rules/drinking';
import { joinNames } from '../../utils/text';

/** Frase do modo bebida: "Bia bebe 3 goles", "Ana e Caio bebem 2 goles cada", "Duda vira o copo". */
export function drinkSentence(call: DrinkCall, nameOf: (id: string) => string): string {
  const names = joinNames(call.ids.map(nameOf));
  const many = call.ids.length > 1;
  if (call.amount === 'vira o copo') return `${names} ${many ? 'viram' : 'vira'} o copo`;
  if (call.amount.startsWith('escolhe')) return `${names} ${many ? call.amount.replace('escolhe', 'escolhem') : call.amount}`;
  return `${names} ${many ? 'bebem' : 'bebe'} ${call.amount}${many ? ' cada' : ''}`;
}

export function DrinkCalls({ calls, nameOf, delay = 0.5 }: { calls: DrinkCall[]; nameOf: (id: string) => string; delay?: number }) {
  if (calls.length === 0) return null;
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, rotate: -4 }}
      animate={{ scale: 1, opacity: 1, rotate: -1.5 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18, delay }}
      className="mt-4 flex w-full max-w-[360px] flex-col gap-1.5 rounded-2xl bg-[#ffb000] p-3 text-left text-[#1a1000] shadow-[3px_4px_0_0_#000]"
      role="status"
    >
      {calls.map((c, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <Wine className="mt-0.5 size-5 shrink-0" />
          <div>
            <div className="text-[17px] leading-tight font-extrabold">{drinkSentence(c, nameOf)}</div>
            <div className="label mt-0.5 font-bold opacity-60">{c.reason}</div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
