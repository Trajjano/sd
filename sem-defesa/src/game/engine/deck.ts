import type { MatchConfig, Question } from '../../types';
import { filterQuestions } from '../../data/questions';
import { MEN_PACK } from '../../data/categories';
import { shuffle, type Rng } from '../../utils/random';

/**
 * Monta o baralho da partida.
 * Cartas vistas recentemente vão para o fim do baralho, para variar entre partidas.
 * Com "Só homens", o pacote Resenha dos caras é intercalado com as categorias escolhidas.
 */
export function buildDeck(pool: Question[], config: MatchConfig, rng: Rng, recentIds: string[] = []): Question[] {
  const recent = new Set(recentIds);
  const order = (qs: Question[]) => [
    ...shuffle(qs.filter((q) => !recent.has(q.id)), rng),
    ...shuffle(qs.filter((q) => recent.has(q.id)), rng),
  ];
  const base = order(filterQuestions(pool, config.categories.filter((c) => c !== MEN_PACK), config.includeHeavy));
  const pack = config.menOnly ? order(filterQuestions(pool, [MEN_PACK], config.includeHeavy)) : [];
  if (base.length === 0 && pack.length === 0) throw new Error('Nenhuma carta disponível para essas categorias.');
  if (pack.length === 0) return base;
  // "Só homens": uma carta da resenha a cada duas, sem perder as categorias escolhidas.
  const out: Question[] = [];
  let i = 0;
  let j = 0;
  while (i < base.length || j < pack.length) {
    if (j < pack.length && (out.length % 2 === 0 || i >= base.length)) out.push(pack[j++]);
    else if (i < base.length) out.push(base[i++]);
  }
  return out;
}

/** Próxima carta; se o baralho acabar, recomeça embaralhado sem repetir a carta atual em seguida. */
export function drawNext(
  deck: Question[],
  index: number,
  rng: Rng,
): { deck: Question[]; index: number; question: Question } {
  const next = index + 1;
  if (next < deck.length) return { deck, index: next, question: deck[next] };
  const last = deck[index];
  let reshuffled = shuffle(deck, rng);
  if (reshuffled.length > 1 && reshuffled[0].id === last?.id) {
    reshuffled = [...reshuffled.slice(1), reshuffled[0]];
  }
  return { deck: reshuffled, index: 0, question: reshuffled[0] };
}
