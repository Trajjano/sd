import type { ReactNode } from 'react';

/**
 * Bonequinhos originais dos jogadores, desenhados em SVG (64×64).
 * Para criar um novo, adicione um item com id único, nome, cor de fundo e o desenho.
 */
export interface AvatarDef {
  id: string;
  name: string;
  bg: string;
  art: ReactNode;
}

const INK = '#0b0910';
const W = '#ffffff';

const eyes = (x1: number, x2: number, y: number, r = 2.6) => (
  <>
    <circle cx={x1} cy={y} r={r} fill={INK} />
    <circle cx={x2} cy={y} r={r} fill={INK} />
    <circle cx={x1 + r * 0.35} cy={y - r * 0.35} r={r * 0.35} fill={W} />
    <circle cx={x2 + r * 0.35} cy={y - r * 0.35} r={r * 0.35} fill={W} />
  </>
);

const smile = (cx: number, cy: number, w = 8) => (
  <path d={`M${cx - w / 2} ${cy} Q${cx} ${cy + w * 0.55} ${cx + w / 2} ${cy}`} fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
);

export const AVATARS: AvatarDef[] = [
  {
    id: 'alien',
    name: 'Alien',
    bg: '#3b1a63',
    art: (
      <>
        <line x1="24" y1="20" x2="18" y2="8" stroke="#7dff6a" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="40" y1="20" x2="46" y2="8" stroke="#7dff6a" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="18" cy="8" r="3.2" fill="#d4ff2a" />
        <circle cx="46" cy="8" r="3.2" fill="#d4ff2a" />
        <path d="M32 14c11 0 18 9 18 19 0 12-9 21-18 21s-18-9-18-21c0-10 7-19 18-19z" fill="#7dff6a" />
        <ellipse cx="24.5" cy="34" rx="5.5" ry="8.5" transform="rotate(-25 24.5 34)" fill={INK} />
        <ellipse cx="39.5" cy="34" rx="5.5" ry="8.5" transform="rotate(25 39.5 34)" fill={INK} />
        <circle cx="26" cy="31" r="1.6" fill={W} />
        <circle cx="41" cy="31" r="1.6" fill={W} />
        <path d="M29 47q3 2 6 0" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'gato',
    name: 'Gato',
    bg: '#ffd23f',
    art: (
      <>
        <path d="M15 30 17 8 31 20z" fill="#f2f0ea" />
        <path d="M49 30 47 8 33 20z" fill="#f2f0ea" />
        <path d="M18 24 19 13 26 19z" fill="#ff9ec4" />
        <path d="M46 24 45 13 38 19z" fill="#ff9ec4" />
        <circle cx="32" cy="36" r="18" fill="#f2f0ea" />
        <ellipse cx="25" cy="34" rx="2.4" ry="3.6" fill={INK} />
        <ellipse cx="39" cy="34" rx="2.4" ry="3.6" fill={INK} />
        <path d="M30 40h4l-2 2.5z" fill="#ff6fa8" />
        <path d="M32 42.5q-2 3-5 1.5M32 42.5q2 3 5 1.5" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 38h9M12 43l9-2M52 38h-9M52 43l-9-2" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'cachorro',
    name: 'Cachorro',
    bg: '#57d6ff',
    art: (
      <>
        <ellipse cx="15" cy="32" rx="6" ry="13" transform="rotate(18 15 32)" fill="#6b3e1f" />
        <ellipse cx="49" cy="32" rx="6" ry="13" transform="rotate(-18 49 32)" fill="#6b3e1f" />
        <circle cx="32" cy="34" r="17" fill="#c98a4b" />
        <ellipse cx="32" cy="42" rx="10" ry="7.5" fill="#f2dcc0" />
        <ellipse cx="32" cy="38.5" rx="4" ry="3" fill={INK} />
        {eyes(25, 39, 30)}
        <path d="M32 41.5v3M28 45q4 3 8 0" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M30 47q2 4 4 0z" fill="#ff6fa8" />
      </>
    ),
  },
  {
    id: 'sapo',
    name: 'Sapo',
    bg: '#ff9f1c',
    art: (
      <>
        <ellipse cx="32" cy="42" rx="23" ry="15" fill="#3fcf6a" />
        <circle cx="20" cy="26" r="9" fill="#3fcf6a" />
        <circle cx="44" cy="26" r="9" fill="#3fcf6a" />
        <circle cx="20" cy="26" r="6" fill={W} />
        <circle cx="44" cy="26" r="6" fill={W} />
        <circle cx="21" cy="27" r="3" fill={INK} />
        <circle cx="43" cy="27" r="3" fill={INK} />
        <path d="M17 43q15 10 30 0" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="16" cy="40" r="2.5" fill="#ff6fa8" opacity=".7" />
        <circle cx="48" cy="40" r="2.5" fill="#ff6fa8" opacity=".7" />
      </>
    ),
  },
  {
    id: 'urso',
    name: 'Urso',
    bg: '#b58cff',
    art: (
      <>
        <circle cx="17" cy="20" r="8" fill="#8b5a2b" />
        <circle cx="47" cy="20" r="8" fill="#8b5a2b" />
        <circle cx="17" cy="20" r="4" fill="#d9a066" />
        <circle cx="47" cy="20" r="4" fill="#d9a066" />
        <circle cx="32" cy="35" r="18" fill="#8b5a2b" />
        <ellipse cx="32" cy="42" rx="9" ry="7" fill="#d9a066" />
        <ellipse cx="32" cy="39" rx="3.6" ry="2.6" fill={INK} />
        {eyes(25, 39, 31)}
        {smile(32, 44, 7)}
      </>
    ),
  },
  {
    id: 'raposa',
    name: 'Raposa',
    bg: '#6c5cff',
    art: (
      <>
        <path d="M13 32 15 8 29 20z" fill="#ff7a1a" />
        <path d="M51 32 49 8 35 20z" fill="#ff7a1a" />
        <path d="M17 24 18 14 24 19z" fill={INK} />
        <path d="M47 24 46 14 40 19z" fill={INK} />
        <path d="M32 18c12 0 19 8 19 17 0 7-6 12-12 15l-7 6-7-6c-6-3-12-8-12-15 0-9 7-17 19-17z" fill="#ff7a1a" />
        <path d="M14 36c5 6 11 8 18 20 7-12 13-14 18-20-6 2-12 2-18 8-6-6-12-6-18-8z" fill="#fff4e6" />
        <ellipse cx="32" cy="49" rx="3" ry="2.2" fill={INK} />
        <path d="M22 32q3-3 6 0M36 32q3-3 6 0" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'porco',
    name: 'Porco',
    bg: '#2fe39a',
    art: (
      <>
        <path d="M14 26 16 12 27 20z" fill="#ff7fb3" />
        <path d="M50 26 48 12 37 20z" fill="#ff7fb3" />
        <circle cx="32" cy="35" r="18" fill="#ffa3c8" />
        <ellipse cx="32" cy="41" rx="9" ry="6.5" fill="#ff6fa8" />
        <ellipse cx="29" cy="41" rx="1.8" ry="2.6" fill="#8a1f4b" />
        <ellipse cx="35" cy="41" rx="1.8" ry="2.6" fill="#8a1f4b" />
        {eyes(24, 40, 30)}
      </>
    ),
  },
  {
    id: 'macaco',
    name: 'Macaco',
    bg: '#ff5a36',
    art: (
      <>
        <circle cx="13" cy="34" r="7" fill="#7a4a26" />
        <circle cx="51" cy="34" r="7" fill="#7a4a26" />
        <circle cx="13" cy="34" r="3.6" fill="#e8b98a" />
        <circle cx="51" cy="34" r="3.6" fill="#e8b98a" />
        <circle cx="32" cy="33" r="18" fill="#7a4a26" />
        <path d="M32 24c-5-4-14-2-14 6 0 4 2 6 3 7-1 2-2 4-2 6 0 6 6 9 13 9s13-3 13-9c0-2-1-4-2-6 1-1 3-3 3-7 0-8-9-10-14-6z" fill="#e8b98a" />
        {eyes(26, 38, 31)}
        <circle cx="30" cy="40" r="1.2" fill={INK} />
        <circle cx="34" cy="40" r="1.2" fill={INK} />
        {smile(32, 45, 10)}
      </>
    ),
  },
  {
    id: 'robo',
    name: 'Robô',
    bg: '#ff4fa3',
    art: (
      <>
        <line x1="32" y1="18" x2="32" y2="9" stroke="#c9ccd6" strokeWidth="2.5" />
        <circle cx="32" cy="8" r="3.5" fill="#d4ff2a" />
        <rect x="12" y="18" width="40" height="34" rx="8" fill="#c9ccd6" />
        <rect x="8" y="29" width="5" height="12" rx="2" fill="#9aa0ad" />
        <rect x="51" y="29" width="5" height="12" rx="2" fill="#9aa0ad" />
        <rect x="17" y="24" width="30" height="15" rx="5" fill={INK} />
        <circle cx="25" cy="31.5" r="4" fill="#d4ff2a" />
        <circle cx="39" cy="31.5" r="4" fill="#d4ff2a" />
        <rect x="22" y="43" width="20" height="5" rx="2" fill="#9aa0ad" />
        <path d="M27 43v5M32 43v5M37 43v5" stroke="#c9ccd6" strokeWidth="1.5" />
      </>
    ),
  },
  {
    id: 'fantasma',
    name: 'Fantasma',
    bg: '#6c5cff',
    art: (
      <>
        <path d="M14 56V30c0-10 8-18 18-18s18 8 18 18v26l-6-4-6 4-6-4-6 4-6-4z" fill="#f4f1e8" />
        <ellipse cx="25" cy="31" rx="3.2" ry="4.6" fill={INK} />
        <ellipse cx="39" cy="31" rx="3.2" ry="4.6" fill={INK} />
        <ellipse cx="32" cy="42" rx="3.5" ry="4.5" fill={INK} />
        <circle cx="20" cy="38" r="2.6" fill="#ff9ec4" opacity=".6" />
        <circle cx="44" cy="38" r="2.6" fill="#ff9ec4" opacity=".6" />
      </>
    ),
  },
  {
    id: 'coruja',
    name: 'Coruja',
    bg: '#57d6ff',
    art: (
      <>
        <path d="M14 22 18 10 26 18zM50 22 46 10 38 18z" fill="#6b4226" />
        <ellipse cx="32" cy="37" rx="19" ry="19" fill="#8a5a3b" />
        <ellipse cx="32" cy="45" rx="11" ry="9" fill="#d9b48a" />
        <circle cx="24" cy="31" r="8.5" fill="#f4f1e8" />
        <circle cx="40" cy="31" r="8.5" fill="#f4f1e8" />
        <circle cx="24" cy="31" r="4.2" fill={INK} />
        <circle cx="40" cy="31" r="4.2" fill={INK} />
        <circle cx="25.5" cy="29.5" r="1.4" fill={W} />
        <circle cx="41.5" cy="29.5" r="1.4" fill={W} />
        <path d="M29 38h6l-3 5z" fill="#ff9f1c" />
      </>
    ),
  },
  {
    id: 'pinguim',
    name: 'Pinguim',
    bg: '#ff9f1c',
    art: (
      <>
        <ellipse cx="32" cy="36" rx="19" ry="21" fill="#1d1b26" />
        <path d="M32 24c-4-4-14-3-14 8 0 10 6 19 14 19s14-9 14-19c0-11-10-12-14-8z" fill="#f4f1e8" />
        {eyes(26, 38, 32, 2.4)}
        <path d="M27.5 38h9l-4.5 5z" fill="#ffb21c" />
        <circle cx="21" cy="40" r="2.4" fill="#ff9ec4" opacity=".7" />
        <circle cx="43" cy="40" r="2.4" fill="#ff9ec4" opacity=".7" />
      </>
    ),
  },
  {
    id: 'capivara',
    name: 'Capivara',
    bg: '#2fe39a',
    art: (
      <>
        <circle cx="18" cy="19" r="4.5" fill="#7a5233" />
        <circle cx="46" cy="19" r="4.5" fill="#7a5233" />
        <rect x="10" y="18" width="44" height="36" rx="17" fill="#a0714a" />
        <rect x="18" y="36" width="28" height="16" rx="8" fill="#7a5233" />
        <ellipse cx="27" cy="41" rx="2" ry="1.4" fill={INK} />
        <ellipse cx="37" cy="41" rx="2" ry="1.4" fill={INK} />
        <path d="M21 30q3-2.5 6 0M37 30q3-2.5 6 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="32" cy="12" r="6" fill="#ff8a1c" />
        <path d="M32 6q3-4 7-2-2 4-7 2z" fill="#2fbf5a" />
      </>
    ),
  },
  {
    id: 'polvo',
    name: 'Polvo',
    bg: '#ffd23f',
    art: (
      <>
        <path d="M12 44c0 6 4 9 6 6s2 6 6 6 3-6 6-6 3 6 6 6 4-6 6-6 6 3 6-3v-12H12z" fill="#ff4fbf" />
        <path d="M12 38c0-14 9-24 20-24s20 10 20 24z" fill="#ff4fbf" />
        <circle cx="25" cy="30" r="5" fill={W} />
        <circle cx="39" cy="30" r="5" fill={W} />
        <circle cx="25.5" cy="31" r="2.6" fill={INK} />
        <circle cx="38.5" cy="31" r="2.6" fill={INK} />
        <circle cx="32" cy="39" r="2.4" fill={INK} />
        <circle cx="20" cy="22" r="2" fill="#ff8fd8" />
        <circle cx="42" cy="20" r="1.5" fill="#ff8fd8" />
      </>
    ),
  },
  {
    id: 'diabinho',
    name: 'Diabinho',
    bg: '#2a1146',
    art: (
      <>
        <path d="M15 24c-2-8 1-14 5-16-1 5 1 9 5 11zM49 24c2-8-1-14-5-16 1 5-1 9-5 11z" fill="#ffd23f" />
        <circle cx="32" cy="36" r="18" fill="#ff3b30" />
        <path d="M21 30l8 3M43 30l-8 3" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="25.5" cy="35" r="2.6" fill={INK} />
        <circle cx="38.5" cy="35" r="2.6" fill={INK} />
        <path d="M22 42q10 9 20 0z" fill={INK} />
        <path d="M26 42.5l2 3 2-2.8M34 42.6l2 3 2-3" fill={W} />
      </>
    ),
  },
  {
    id: 'dino',
    name: 'Dino',
    bg: '#ff4fa3',
    art: (
      <>
        <path d="M18 18l4-8 4 7 4-8 4 8 4-7 4 8z" fill="#2a9d6a" />
        <rect x="12" y="16" width="40" height="38" rx="16" fill="#5dd39e" />
        <rect x="12" y="38" width="40" height="16" rx="8" fill="#4bbf8a" />
        <path d="M18 38h28l-2 3-2-3-2 3-2-3-2 3-2-3-2 3-2-3-2 3-2-3-2 3-2-3-2 3z" fill={W} />
        {eyes(24, 40, 28, 3)}
        <circle cx="28" cy="34" r="1.2" fill={INK} />
        <circle cx="36" cy="34" r="1.2" fill={INK} />
      </>
    ),
  },
];

const BY_ID = new Map(AVATARS.map((a) => [a.id, a]));

/** Avatar escolhido ou, se não houver, um sorteado de forma fixa a partir do nome. */
export function resolveAvatar(avatar: string | null | undefined, name: string): AvatarDef {
  if (avatar && BY_ID.has(avatar)) return BY_ID.get(avatar)!;
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

/** Próximo avatar livre (para novos jogadores não repetirem bicho). */
export function nextFreeAvatar(taken: (string | null | undefined)[], seed = 0): string {
  const used = new Set(taken.filter(Boolean));
  for (let i = 0; i < AVATARS.length; i++) {
    const a = AVATARS[(seed + i) % AVATARS.length];
    if (!used.has(a.id)) return a.id;
  }
  return AVATARS[seed % AVATARS.length].id;
}

export function isAvatarId(id: unknown): id is string {
  return typeof id === 'string' && BY_ID.has(id);
}
