import type { LifetimeStats, MatchState, MatchSummary, PlayerSummary } from '../../types';
import { normalizeName } from '../../utils/text';

export function summarizeMatch(state: MatchState): MatchSummary {
  const { players, mode } = state.config;
  const rows = players.map((player, order) => {
    let votesReceived = 0;
    let roundsOnTop = 0;
    let bestRound = 0;
    let eliminatedInRound: number | null = null;
    for (const r of state.history) {
      const v = r.tally[player.id] ?? 0;
      votesReceived += v;
      bestRound = Math.max(bestRound, v);
      if (r.topIds.includes(player.id)) roundsOnTop += 1;
      if (r.eliminatedId === player.id) eliminatedInRound = r.round;
    }
    return { player, votesReceived, roundsOnTop, bestRound, eliminatedInRound, order };
  });

  rows.sort(
    (a, b) => b.votesReceived - a.votesReceived || b.roundsOnTop - a.roundsOnTop || a.order - b.order,
  );

  // Ranking "competição": empatados em votos dividem a mesma posição.
  const ranking: PlayerSummary[] = [];
  rows.forEach((row, i) => {
    const prev = ranking[i - 1];
    const rank = prev && prev.votesReceived === row.votesReceived ? prev.rank : i + 1;
    const { order: _order, ...rest } = row;
    void _order;
    ranking.push({ ...rest, rank });
  });

  const championVotes = ranking[0]?.votesReceived ?? 0;
  const champions = championVotes > 0 ? ranking.filter((r) => r.votesReceived === championVotes).map((r) => r.player.id) : [];

  return {
    roundsPlayed: state.history.length,
    totalVotes: state.history.reduce((a, r) => a + r.totalVotes, 0),
    ranking,
    champions,
    championVotes,
    ties: state.history.filter((r) => r.isTie).length,
    survivors: mode === 'survival' ? state.survivors.slice() : [],
    mode,
  };
}

export function emptyLifetimeStats(): LifetimeStats {
  return {
    matches: 0,
    rounds: 0,
    votes: 0,
    ties: 0,
    byMode: { secret: 0, open: 0, survival: 0 },
    players: {},
    lastPlayedAt: null,
  };
}

/** Acumula uma partida nas estatísticas locais. Partidas sem rodadas não contam. */
export function recordMatch(stats: LifetimeStats, state: MatchState, now = Date.now()): LifetimeStats {
  const summary = summarizeMatch(state);
  if (summary.roundsPlayed === 0) return stats;
  const players = { ...stats.players };
  const titleHolders = new Set(summary.mode === 'survival' ? summary.survivors : summary.champions);
  for (const row of summary.ranking) {
    const key = normalizeName(row.player.name);
    const prev = players[key] ?? { name: row.player.name, matches: 0, votesReceived: 0, roundsOnTop: 0, titles: 0 };
    players[key] = {
      name: row.player.name,
      matches: prev.matches + 1,
      votesReceived: prev.votesReceived + row.votesReceived,
      roundsOnTop: prev.roundsOnTop + row.roundsOnTop,
      titles: prev.titles + (titleHolders.has(row.player.id) ? 1 : 0),
    };
  }
  return {
    matches: stats.matches + 1,
    rounds: stats.rounds + summary.roundsPlayed,
    votes: stats.votes + summary.totalVotes,
    ties: stats.ties + summary.ties,
    byMode: { ...stats.byMode, [summary.mode]: stats.byMode[summary.mode] + 1 },
    players,
    lastPlayedAt: now,
  };
}
