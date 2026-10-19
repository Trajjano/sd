import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from '../buttons/Button';
import { LogoMark } from './Logo';

/** Container padrão de tela, com transição de entrada. */
export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={`safe-x safe-top mx-auto flex min-h-[100dvh] w-full max-w-md flex-col ${className}`}
    >
      {children}
    </motion.main>
  );
}

export function ScreenHeader({
  onBack,
  backLabel = 'Voltar',
  right,
  center,
}: {
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
  center?: ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2">
      <div className="flex min-w-11 items-center">
        {onBack ? (
          <IconButton label={backLabel} onClick={onBack}>
            <ArrowLeft />
          </IconButton>
        ) : (
          <LogoMark />
        )}
      </div>
      <div className="min-w-0 flex-1 text-center">{center ?? (onBack ? <LogoMark className="justify-center" /> : null)}</div>
      <div className="flex min-w-11 items-center justify-end gap-2">{right}</div>
    </header>
  );
}
