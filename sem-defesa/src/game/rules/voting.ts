import type { MatchState } from '../../types';

export class GameRuleError extends Error {
  constructor(
    public code:
      | 'WRONG_PHASE'
      | 'NOT_YOUR_TURN'
      | 'DUPLICATE_VOTE'
      | 'INVALID_TARGET'
      | 'SELF_VOTE'
      | 'INVALID_TALLY'
      | 'MATCH_OVER',
    message: string,
  ) {
    super(message);
    this.name = 'GameRuleError';
  }
}

/** Quem pode receber votos nesta rodada. */
export function candidateIds(state: MatchState): string[] {
  if (state.config.mode === 'survival') return state.survivors.slice();
  return state.config.players.map((p) => p.id);
}

/** Alvos válidos para um eleitor específico. */
export function eligibleTargets(state: MatchState, voterId: string): string[] {
  const candidates = candidateIds(state);
  if (state.config.allowSelfVote) return candidates;
  return candidates.filter((id) => id !== voterId);
}

export function currentVoterId(state: MatchState): string | null {
  if (state.phase !== 'handoff' && state.phase !== 'voting') return null;
  return state.voterOrder[state.voterIndex] ?? null;
}

/** Ordem de votação gira a cada rodada, para ninguém sempre votar primeiro. */
export function voterOrderForRound(playerIds: string[], round: number): string[] {
  if (playerIds.length === 0) return [];
  const offset = (round - 1) % playerIds.length;
  return [...playerIds.slice(offset), ...playerIds.slice(0, offset)];
}

/** Total máximo de votos no modo aberto: uma pessoa, um voto. */
export function maxOpenVotes(state: MatchState): number {
  return state.config.players.length;
}
