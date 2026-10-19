import type { MatchState, Question } from '../types';
import type { OnlinePlayer, OnlineRoom } from './api';
import { buildDeck } from '../game/engine/deck';
import { QUESTIONS } from '../data/questions';
import { defaultRng, type Rng } from '../utils/random';

/** Converte a sala online no formato da partida local, para reaproveitar resumo e tela final. */
export function roomToMatch(room: OnlineRoom, players: OnlinePlayer[]): MatchState {
  const placeholder: Question = room.question ?? { id: 'none', text: '', category: 'caos' };
  // Inclui quem jogou alguma rodada, mesmo que tenha saído depois.
  const inHistory = new Set(room.history.flatMap((r) => r.candidateIds));
  const shown = players.filter((p) => !p.left_at || inHistory.has(p.id));
  return {
    id: room.id,
    config: {
      players: shown.map((p) => ({ id: p.id, name: p.name, ...(p.avatar ? { avatar: p.avatar } : {}) })),
      rounds: room.config.rounds,
      categories: room.config.categories,
      includeHeavy: room.config.includeHeavy,
      mode: room.config.mode,
      allowSelfVote: room.config.allowSelfVote,
      menOnly: room.config.menOnly,
      drinking: room.config.drinking,
    },
    phase: room.status === 'finished' ? 'finished' : 'reveal',
    round: room.round,
    deck: [placeholder],
    deckIndex: 0,
    question: placeholder,
    votes: [],
    voterOrder: room.voter_ids,
    voterIndex: 0,
    history: room.history,
    survivors: room.survivors,
    startedAt: 0,
    finishedAt: null,
  };
}

/** Baralho enviado ao servidor quando a partida começa (com folga para trocas de carta). */
export function deckForRoom(room: OnlineRoom, recent: string[], rng: Rng = defaultRng): Question[] {
  const deck = buildDeck(
    QUESTIONS,
    {
      players: [],
      rounds: room.config.rounds,
      categories: room.config.categories,
      includeHeavy: room.config.includeHeavy,
      mode: room.config.mode,
      allowSelfVote: room.config.allowSelfVote,
      menOnly: room.config.menOnly,
    },
    rng,
    recent,
  );
  return deck.slice(0, Math.min(deck.length, room.config.rounds + 40));
}

/** A partida terminou pela regra (para o texto do botão na revelação). */
export function isLastRound(room: OnlineRoom): boolean {
  return (
    room.history.length >= room.config.rounds ||
    (room.config.mode === 'survival' && room.survivors.length <= 1)
  );
}
