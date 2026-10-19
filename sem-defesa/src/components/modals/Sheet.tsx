import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { Button } from '../buttons/Button';

/** Painel inferior modal (bottom sheet). */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="safe-bottom relative w-full max-w-md rounded-t-[28px] bg-night px-5 pt-3 ring-1 ring-white/10"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />
            {title && <h2 className="display mb-3 text-[30px]">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className="mb-6 text-[16px] leading-snug text-white/70">{message}</p>
      <div className="flex flex-col gap-3 pb-2">
        <Button variant={danger ? 'danger' : 'primary'} size="lg" block onClick={onConfirm} sound="confirm">
          {confirmLabel}
        </Button>
        <Button variant="secondary" size="md" block onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </Sheet>
  );
}
