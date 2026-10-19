import type { CategoryId, Question } from '../../types';

/**
 * Monta as perguntas de uma categoria.
 * Para adicionar uma pergunta, basta incluir uma linha em `normal` ou `heavy`.
 * Os ids são gerados a partir do texto, então reordenar não quebra estatísticas.
 */
export function defineQuestions(
  category: CategoryId,
  lists: { normal: string[]; heavy?: string[] },
): Question[] {
  const make = (text: string, heavy: boolean): Question => ({
    id: `${category}:${slug(text)}`,
    text: text.trim(),
    category,
    ...(heavy ? { heavy: true } : {}),
  });
  return [...lists.normal.map((t) => make(t, false)), ...(lists.heavy ?? []).map((t) => make(t, true))];
}

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}
