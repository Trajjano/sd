import type { CategoryId, Question } from '../../types';
import caos from './caos';
import romance from './romance';
import vergonha from './vergonha';
import personalidade from './personalidade';
import dinheiro from './dinheiro';
import festa from './festa';
import segredos from './segredos';
import absurdo from './absurdo';
import semlimites from './semlimites';
import resenha from './resenha';
import baixaria from './baixaria';
import bar from './bar';

/** Banco completo. Para adicionar uma categoria, crie o arquivo e inclua aqui. */
export const QUESTIONS: Question[] = [
  ...caos,
  ...romance,
  ...vergonha,
  ...personalidade,
  ...dinheiro,
  ...festa,
  ...segredos,
  ...absurdo,
  ...semlimites,
  ...baixaria,
  ...bar,
  ...resenha,
];

export function countQuestions(categories: CategoryId[], includeHeavy: boolean): number {
  return filterQuestions(QUESTIONS, categories, includeHeavy).length;
}

export function filterQuestions(pool: Question[], categories: CategoryId[], includeHeavy: boolean): Question[] {
  const set = new Set(categories);
  return pool.filter((q) => set.has(q.category) && (includeHeavy || !q.heavy));
}
