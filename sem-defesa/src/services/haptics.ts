let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

/** Vibração curta onde houver suporte (Android). No iPhone simplesmente não faz nada. */
export function buzz(pattern: number | number[] = 12) {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignorado */
  }
}
