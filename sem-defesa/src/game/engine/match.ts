import type { MatchConfig, MatchState, Question, Tally } from '../../types';
import { buildDeck, drawNext } from './deck';
import { buildRoundResult, tallyVotes } from '../scoring/tally';
import {
  GameRuleError,
  candidateIds,
  currentVoterId,
  eligibleTargets,
  maxOpenVotes,
  voterOrderForRound,
} from '../rules/voting';
import { uid, type Rng } from '../../utils/random';

/**
 * Máquina de estados da partida.
 *
 *  question ──startVoting──▶ handoff ──confirmHandoff──▶ voting ──castVote──┐
 *     │                         ▲                                          │
 *     │                         └──────────── (ainda falta gente) ◀───────┤
 *     └──startVoting (aberta)──▶ open-voting ──submitOpenTally──▶ reveal ◀─┘
 *                                                                     │
 *                       question ◀──nextRound── (há rodadas) ◀────────┤
 *                       finished ◀──nextRound── (acabou)      ◀───────┘
 *
 * Todas as funções são puras: recebem um estado e devolvem outro, ou lançam GameRuleError.
 */

export function createMatch(config: MatchConfig, pool: Question[], rng: Rng, recentIds: string[] = []): MatchState {
  const deck = buildDeck(pool, config, rng, recentIds);
  const ids = config.players.map((p) => p.id);
  return {
    id: uid(rng),
    config,
    phase: 'question',
    round: 1,
    deck,
    deckIndex: 0,
    question: deck[0],
    votes: [],
    voterOrder: voterOrderForRound(ids, 1),
    voterIndex: 0,
    history: [],
    survivors: ids.slice(),
    startedAt: Date.now(),
    finishedAt: null,
  };
}

function assertPhase(state: MatchState, ...phases: MatchState['phase'][]) {
  if (state.phase === 'finished') throw new GameRuleError('MATCH_OVER', 'A partida já terminou.');
  if (!phases.includes(state.phase))
    throw new GameRuleError('WRONG_PHASE', `Ação inválida na fase "${state.phase}".`);
}

/** Troca a carta da mesa antes de começar a votação. */
export function skipQuestion(state: MatchState, rng: Rng): MatchState {
  assertPhase(state, 'question');
  const next = drawNext(state.deck, state.deckIndex, rng);
  return { ...state, deck: next.deck, deckIndex: next.index, question: next.question };
}

export function startVoting(state: MatchState): MatchState {
  assertPhase(state, 'question');
  if (state.config.mode === 'open') return { ...state, phase: 'open-voting', votes: [] };
  return { ...state, phase: 'handoff', votes: [], voterIndex: 0 };
}

export function confirmHandoff(state: MatchState): MatchState {
  assertPhase(state, 'handoff');
  return { ...state, phase: 'voting' };
}

export function castVote(state: MatchState, voterId: string, targetId: string): MatchState {
  assertPhase(state, 'voting');
  const expected = currentVoterId(state);
  if (state.votes.some((v) => v.voterId === voterId))
    throw new GameRuleError('DUPLICATE_VOTE', 'Esse jogador já votou nesta rodada.');
  if (voterId !== expected) throw new GameRuleError('NOT_YOUR_TURN', 'Não é a vez desse jogador.');
  if (!candidateIds(state).includes(targetId))
    throw new GameRuleError('INVALID_TARGET', 'Escolha um participante válido.');
  if (!eligibleTargets(state, voterId).includes(targetId))
    throw new GameRuleError('SELF_VOTE', 'Votar em si mesmo está desativado.');

  const votes = [...state.votes, { voterId, targetId }];
  const voterIndex = state.voterIndex + 1;
  if (voterIndex < state.voterOrder.length) {
    return { ...state, votes, voterIndex, phase: 'handoff' };
  }
  return closeRound({ ...state, votes, voterIndex });
}

export function submitOpenTally(state: MatchState, tally: Tally): MatchState {
  assertPhase(state, 'open-voting');
  const candidates = candidateIds(state);
  const clean: Tally = {};
  for (const id of candidates) clean[id] = 0;
  for (const [id, value] of Object.entries(tally)) {
    if (!candidates.includes(id)) throw new GameRuleError('INVALID_TARGET', 'Participante inválido no placar.');
    if (!Number.isInteger(value) || value < 0)
      throw new GameRuleError('INVALID_TALLY', 'Os votos precisam ser números inteiros.');
    clean[id] = value;
  }
  const total = Object.values(clean).reduce((a, b) => a + b, 0);
  if (total < 1) throw new GameRuleError('INVALID_TALLY', 'Registre pelo menos um voto.');
  if (total > maxOpenVotes(state))
    throw new GameRuleError('INVALID_TALLY', `No máximo ${maxOpenVotes(state)} votos (um por pessoa).`);

  const result = buildRoundResult({
    round: state.round,
    question: state.question,
    mode: state.config.mode,
    tally: clean,
    candidateIds: candidates,
  });
  return { ...state, phase: 'reveal', history: [...state.history, result] };
}

function closeRound(state: MatchState): MatchState {
  const candidates = candidateIds(state);
  const result = buildRoundResult({
    round: state.round,
    question: state.question,
    mode: state.config.mode,
    tally: tallyVotes(state.votes, candidates),
    candidateIds: candidates,
  });
  const survivors = result.eliminatedId ? state.survivors.filter((id) => id !== result.eliminatedId) : state.survivors;
  return { ...state, phase: 'reveal', history: [...state.history, result], survivors };
}

export function isMatchOver(state: MatchState): boolean {
  if (state.phase === 'finished') return true;
  if (state.history.length >= state.config.rounds) return true;
  if (state.config.mode === 'survival' && state.survivors.length <= 1) return true;
  return false;
}

export function nextRound(state: MatchState, rng: Rng): MatchState {
  assertPhase(state, 'reveal');
  if (isMatchOver(state)) return { ...state, phase: 'finished', finishedAt: Date.now() };
  const round = state.round + 1;
  const next = drawNext(state.deck, state.deckIndex, rng);
  return {
    ...state,
    phase: 'question',
    round,
    deck: next.deck,
    deckIndex: next.index,
    question: next.question,
    votes: [],
    voterIndex: 0,
    voterOrder: voterOrderForRound(
      state.config.players.map((p) => p.id),
      round,
    ),
  };
}

/** Encerra antes do fim. Rodada em andamento (sem revelação) é descartada. */
export function finishMatch(state: MatchState): MatchState {
  if (state.phase === 'finished') return state;
  return { ...state, phase: 'finished', votes: [], finishedAt: Date.now() };
}

/** Nova partida com a mesma configuração. */
export function restartMatch(state: MatchState, pool: Question[], rng: Rng): MatchState {
  const recent = state.deck.slice(0, state.deckIndex + 1).map((q) => q.id);
  return createMatch(state.config, pool, rng, recent);
}

/** Quantos votos faltam na rodada (sem revelar em quem). */
export function votingProgress(state: MatchState): { done: number; total: number } {
  return { done: state.votes.length, total: state.voterOrder.length };
}

// ---------- Reducer para a interface ----------

export type MatchAction =
  | { type: 'skip' }
  | { type: 'startVoting' }
  | { type: 'confirmHandoff' }
  | { type: 'vote'; voterId: string; targetId: string }
  | { type: 'openTally'; tally: Tally }
  | { type: 'next' }
  | { type: 'finish' };

export function reduceMatch(state: MatchState, action: MatchAction, rng: Rng): MatchState {
  switch (action.type) {
    case 'skip':
      return skipQuestion(state, rng);
    case 'startVoting':
      return startVoting(state);
    case 'confirmHandoff':
      return confirmHandoff(state);
    case 'vote':
      return castVote(state, action.voterId, action.targetId);
    case 'openTally':
      return submitOpenTally(state, action.tally);
    case 'next':
      return nextRound(state, rng);
    case 'finish':
      return finishMatch(state);
  }
}
