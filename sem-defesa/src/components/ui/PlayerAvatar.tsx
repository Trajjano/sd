/** Avatar tipográfico gerado a partir do nome (sem fotos, sem dados pessoais). */
const PALETTE = ['#d4ff2a', '#ff5a36', '#ff4fa3', '#57d6ff', '#2fe39a', '#b58cff', '#ffd23f', '#f4f1e8'];

export function colorFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? '');
  return (first + second).toUpperCase();
}

export function PlayerAvatar({ name, size = 40, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`display grid shrink-0 place-items-center rounded-[30%] text-ink shadow-[2px_2px_0_0_#000] ${className}`}
      style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.42 }}
    >
      {initials(name)}
    </span>
  );
}
