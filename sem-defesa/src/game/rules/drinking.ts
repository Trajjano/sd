import type { MatchSummary, RoundResult } from '../../types';

/**
 * Modo bebida: quem bebe em cada revelação.
 * Regras (mostradas também na tela "Como jogar"):
 *  - Mais votado: 1 gole por voto recebido (máx. 4).
 *  - Unanimidade: vira o copo.
 *  - Empate: cada empatado bebe 2 goles.
 *  - Sobrevivência: quem sai da disputa vira o copo.
 * Bebida é sempre opcional: quem não bebe ou vai dirigir troca por água ou refri.
 */
export interface DrinkCall {
  ids: string[];
  /** Texto curto, ex.: "3 goles", "vira o copo". */
  amount: string;
  reason: string;
}

export function goles(n: number): string {
  return n === 1 ? '1 gole' : `${n} goles`;
}

export function roundDrinks(r: RoundResult): DrinkCall[] {
  if (r.topIds.length === 0) return [];
  if (r.mode === 'survival' && r.eliminatedId) {
    return [{ ids: [r.eliminatedId], amount: 'vira o copo', reason: 'saiu da disputa' }];
  }
  if (r.isTie) return [{ ids: r.topIds, amount: goles(2), reason: 'empate no topo' }];
  if (r.totalVotes > 1 && r.topCount === r.totalVotes) {
    return [{ ids: r.topIds, amount: 'vira o copo', reason: 'unanimidade' }];
  }
  return [{ ids: r.topIds, amount: goles(Math.min(4, Math.max(1, r.topCount))), reason: 'mais votado' }];
}

/** Saideira: o "campeão" da partida vira o copo; quem passou batido escolhe alguém pra brindar. */
export function finalDrinks(s: MatchSummary): DrinkCall[] {
  if (s.roundsPlayed === 0) return [];
  const calls: DrinkCall[] = [];
  const top = s.mode === 'survival' ? s.ranking.filter((r) => !s.survivors.includes(r.player.id)).slice(0, 1).map((r) => r.player.id) : s.champions;
  if (top.length) calls.push({ ids: top, amount: 'vira o copo', reason: s.mode === 'survival' ? 'mais queimado da noite' : 'mais votado da partida' });
  const clean = s.ranking.filter((r) => r.votesReceived === 0).map((r) => r.player.id);
  if (clean.length) calls.push({ ids: clean, amount: 'escolhe quem bebe 2 goles', reason: 'passou batido' });
  return calls;
}
