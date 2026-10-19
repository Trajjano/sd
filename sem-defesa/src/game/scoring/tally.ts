import type { GameMode, Question, RoundResult, Tally, Vote, VoteComment } from '../../types';

/** Conta votos apenas para candidatos válidos; todos os candidatos aparecem (mesmo com 0). */
export function tallyVotes(votes: Vote[], candidateIds: string[]): Tally {
  const tally: Tally = Object.fromEntries(candidateIds.map((id) => [id, 0]));
  for (const v of votes) {
    if (v.targetId in tally) tally[v.targetId] += 1;
  }
  return tally;
}

export function topOfTally(tally: Tally): { topIds: string[]; topCount: number } {
  const counts = Object.values(tally);
  const topCount = counts.length ? Math.max(...counts) : 0;
  if (topCount <= 0) return { topIds: [], topCount: 0 };
  const topIds = Object.keys(tally).filter((id) => tally[id] === topCount);
  return { topIds, topCount };
}

export function buildRoundResult(args: {
  round: number;
  question: Question;
  mode: GameMode;
  tally: Tally;
  candidateIds: string[];
  comments?: VoteComment[];
}): RoundResult {
  const { topIds, topCount } = topOfTally(args.tally);
  const totalVotes = Object.values(args.tally).reduce((a, b) => a + b, 0);
  const isTie = topIds.length > 1;
  const eliminatedId = args.mode === 'survival' && !isTie && topIds.length === 1 ? topIds[0] : null;
  return {
    round: args.round,
    question: args.question,
    mode: args.mode,
    tally: { ...args.tally },
    totalVotes,
    topIds,
    topCount,
    isTie,
    eliminatedId,
    candidateIds: args.candidateIds.slice(),
    ...(args.comments && args.comments.length ? { comments: args.comments } : {}),
  };
}

export const MAX_COMMENT_LENGTH = 80;

/** Limpa a justificativa: sem espaços sobrando e no máximo 80 letras. */
export function cleanComment(text: string | undefined | null): string | undefined {
  const t = (text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_COMMENT_LENGTH);
  return t || undefined;
}

/** Justificativas sem a ordem de votação (ordem alfabética), para ninguém deduzir quem escreveu. */
export function anonymousComments(votes: Vote[], candidateIds: string[]): VoteComment[] {
  return votes
    .filter((v) => v.comment && candidateIds.includes(v.targetId))
    .map((v) => ({ targetId: v.targetId, text: v.comment! }))
    .sort((a, b) => a.text.localeCompare(b.text, 'pt-BR'));
}

/** Ordena candidatos por votos (desc), preservando a ordem original no empate. */
export function sortedTally(tally: Tally, order: string[]): { id: string; votes: number }[] {
  return order
    .filter((id) => id in tally)
    .map((id, i) => ({ id, votes: tally[id], i }))
    .sort((a, b) => b.votes - a.votes || a.i - b.i)
    .map(({ id, votes }) => ({ id, votes }));
}
