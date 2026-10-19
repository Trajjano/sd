import type { MatchSummary, PlayerSummary, RoundResult } from '../../types';
import { pick, type Rng } from '../../utils/random';
import { joinNames } from '../../utils/text';

/** Mensagens engraçadas por contexto. {n} = nome(s). */
const ROUND = {
  unanimous: [
    'Unanimidade. Nem precisou de advogado.',
    '{n}, o grupo falou em uma só voz. E a voz te condenou.',
    'Todo mundo concordou. Isso não acontece nem pra escolher pizza.',
  ],
  landslide: [
    '{n} levou essa com folga. Sem defesa, sem recurso.',
    'Não foi uma votação, foi uma intervenção. {n}, a gente se preocupa.',
    '{n}, a carta tem seu nome escrito com marca-texto.',
  ],
  close: [
    'Por um voto. {n} quase escapou. Quase.',
    'Foi apertado, mas {n} vai carregar essa.',
    'Vitória suada. {n}, parabéns? Acho?',
  ],
  tie2: [
    'Empate! {n} vão dividir a culpa em parcelas iguais.',
    '{n}: nenhum dos dois escapou. Dupla criminosa.',
    'Empatou. {n} se olharam e souberam a verdade.',
  ],
  tieMany: [
    'Empate geral entre {n}. Esse grupo é um caso perdido.',
    '{n}: empate triplo (ou pior). Ninguém aqui é inocente.',
    'Tanta gente empatada que dava pra montar um time. Sobrou pra {n}.',
  ],
  scattered: [
    'Cada um votou em alguém diferente. Esse grupo não concorda nem no crime.',
    'Votos espalhados. Ou todo mundo é culpado, ou ninguém se conhece.',
  ],
  eliminated: [
    '{n} sai da disputa pelo título. Ficha suja confirmada.',
    '{n} foi queimado. Pode continuar votando, mas o título já era.',
  ],
  survivalTie: [
    'Empate! {n} se salvaram nesta. Ninguém sai da disputa.',
    'Empatou e ninguém foi queimado. Por enquanto.',
  ],
};

function fill(template: string, names: string[]): string {
  return template.replace('{n}', joinNames(names));
}

export function roundMessage(result: RoundResult, nameOf: (id: string) => string, rng: Rng): string {
  const names = result.topIds.map(nameOf);
  if (result.totalVotes === 0) return 'Ninguém recebeu voto. Suspeito.';
  if (result.mode === 'survival') {
    if (result.isTie) return fill(pick(ROUND.survivalTie, rng), names);
    if (result.eliminatedId) return fill(pick(ROUND.eliminated, rng), names);
  }
  if (result.isTie) {
    if (result.topCount === 1 && result.topIds.length === result.totalVotes) return pick(ROUND.scattered, rng);
    return fill(pick(result.topIds.length === 2 ? ROUND.tie2 : ROUND.tieMany, rng), names);
  }
  if (result.topCount === result.totalVotes && result.totalVotes > 1) return fill(pick(ROUND.unanimous, rng), names);
  const second = Object.entries(result.tally)
    .filter(([id]) => id !== result.topIds[0])
    .reduce((m, [, v]) => Math.max(m, v), 0);
  if (result.topCount - second <= 1) return fill(pick(ROUND.close, rng), names);
  return fill(pick(ROUND.landslide, rng), names);
}

/** Título de "prêmio" para cada jogador na tela final. */
export function playerTitle(row: PlayerSummary, summary: MatchSummary): string {
  if (summary.mode === 'survival') {
    if (summary.survivors.includes(row.player.id)) return 'Ficha limpa (por enquanto)';
    if (row.eliminatedInRound === 1) return 'Queimado logo de cara';
    if (row.eliminatedInRound) return `Caiu na rodada ${row.eliminatedInRound}`;
  }
  if (summary.champions.includes(row.player.id)) return summary.champions.length > 1 ? 'Culpa compartilhada' : 'Réu da noite';
  if (row.votesReceived === 0) return 'Passou batido. Suspeito.';
  if (row.bestRound >= 3 && row.roundsOnTop >= 1) return 'Teve uma rodada histórica';
  if (row.roundsOnTop >= 2) return 'Reincidente';
  if (row.roundsOnTop === 1) return 'Uma condenação na ficha';
  return 'Citado nos autos';
}

export function finalHeadline(summary: MatchSummary, nameOf: (id: string) => string): { title: string; subtitle: string } {
  if (summary.roundsPlayed === 0) {
    return { title: 'Ninguém foi julgado', subtitle: 'A partida acabou antes da primeira revelação.' };
  }
  if (summary.mode === 'survival') {
    const names = summary.survivors.map(nameOf);
    if (names.length === 1) return { title: names[0], subtitle: 'Último de pé. O mais inocente — ou o mais esperto.' };
    return { title: joinNames(names), subtitle: 'Sobreviveram juntos. O título fica dividido.' };
  }
  const names = summary.champions.map(nameOf);
  if (names.length === 1) return { title: names[0], subtitle: 'Mais votado da partida. Seus amigos te conhecem.' };
  return { title: joinNames(names), subtitle: 'Empate no topo. A culpa é coletiva.' };
}
