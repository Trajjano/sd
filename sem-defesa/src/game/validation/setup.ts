import type { CategoryId, GameMode, MatchConfig, Player, Question } from '../../types';
import { filterQuestions } from '../../data/questions';
import { getCategory } from '../../data/categories';
import { cleanName, normalizeName } from '../../utils/text';
import { isAvatarId } from '../../data/avatars';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 30;
export const MAX_NAME_LENGTH = 18;

export interface SetupInput {
  names: string[];
  rounds: number;
  categories: CategoryId[];
  includeHeavy: boolean;
  mode: GameMode;
  allowSelfVote: boolean;
  menOnly?: boolean;
  drinking?: boolean;
  avatars?: string[];
}

export type SetupErrorField = 'players' | 'rounds' | 'categories';

export interface SetupError {
  field: SetupErrorField;
  message: string;
  /** Índices dos nomes com problema (vazio, duplicado ou longo). */
  indexes?: number[];
}

export type SetupValidation =
  | { ok: true; config: MatchConfig }
  | { ok: false; errors: SetupError[] };

export function validatePlayerCount(count: number): SetupError | null {
  if (count < MIN_PLAYERS) return { field: 'players', message: `Precisa de pelo menos ${MIN_PLAYERS} jogadores.` };
  if (count > MAX_PLAYERS) return { field: 'players', message: `O máximo é ${MAX_PLAYERS} jogadores.` };
  return null;
}

export function validateSetup(input: SetupInput, pool: Question[], makeId: (i: number) => string): SetupValidation {
  const errors: SetupError[] = [];

  const countError = validatePlayerCount(input.names.length);
  if (countError) errors.push(countError);

  const cleaned = input.names.map(cleanName);
  const empty = cleaned.map((n, i) => (n.length === 0 ? i : -1)).filter((i) => i >= 0);
  if (empty.length) errors.push({ field: 'players', message: 'Tem jogador sem nome.', indexes: empty });

  const tooLong = cleaned.map((n, i) => (n.length > MAX_NAME_LENGTH ? i : -1)).filter((i) => i >= 0);
  if (tooLong.length)
    errors.push({ field: 'players', message: `Nomes com até ${MAX_NAME_LENGTH} letras.`, indexes: tooLong });

  const seen = new Map<string, number[]>();
  cleaned.forEach((n, i) => {
    if (!n) return;
    const key = normalizeName(n);
    seen.set(key, [...(seen.get(key) ?? []), i]);
  });
  const dupes = [...seen.values()].filter((idx) => idx.length > 1).flat();
  if (dupes.length)
    errors.push({
      field: 'players',
      message: 'Nomes repetidos. Diferencie com sobrenome ou apelido (ex.: "Ana B.").',
      indexes: dupes,
    });

  if (!Number.isInteger(input.rounds) || input.rounds < MIN_ROUNDS || input.rounds > MAX_ROUNDS)
    errors.push({ field: 'rounds', message: `Escolha entre ${MIN_ROUNDS} e ${MAX_ROUNDS} rodadas.` });

  const categories = [...new Set(input.categories)];
  const allowedCategories = categories.filter((c) => (input.includeHeavy || !getCategory(c).adult) && !getCategory(c).menOnly);
  if (allowedCategories.length === 0 && !input.menOnly) {
    errors.push({ field: 'categories', message: 'Escolha pelo menos uma categoria.' });
  } else if (filterQuestions(pool, input.menOnly ? [...allowedCategories, 'resenha'] : allowedCategories, input.includeHeavy).length === 0) {
    errors.push({ field: 'categories', message: 'Essas categorias não têm cartas disponíveis.' });
  }

  if (errors.length) return { ok: false, errors };

  const players: Player[] = cleaned.map((name, i) => {
    const avatar = input.avatars?.[i];
    return { id: makeId(i), name, ...(isAvatarId(avatar) ? { avatar } : {}) };
  });
  return {
    ok: true,
    config: {
      players,
      rounds: input.rounds,
      categories: allowedCategories,
      includeHeavy: input.includeHeavy,
      mode: input.mode,
      allowSelfVote: input.allowSelfVote,
      menOnly: Boolean(input.menOnly),
      drinking: Boolean(input.drinking),
    },
  };
}
