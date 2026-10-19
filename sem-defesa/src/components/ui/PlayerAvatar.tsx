import { resolveAvatar } from '../../data/avatars';

/** Bonequinho do jogador. Sem avatar escolhido, usa um fixo sorteado pelo nome. */
export function PlayerAvatar({
  name,
  avatar,
  size = 40,
  className = '',
}: {
  name: string;
  avatar?: string | null;
  size?: number;
  className?: string;
}) {
  const a = resolveAvatar(avatar, name);
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 overflow-hidden rounded-[30%] shadow-[2px_2px_0_0_#000] ${className}`}
      style={{ width: size, height: size, background: a.bg }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="block">
        {a.art}
      </svg>
    </span>
  );
}
