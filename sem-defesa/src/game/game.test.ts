import { describe, expect, it } from 'vitest';
import type { MatchConfig, MatchState } from '../types';
import { QUESTIONS } from '../data/questions';
import { CATEGORIES } from '../data/categories';
import { validateSetup, type SetupInput } from './validation/setup';
import {
  castVote,
  confirmHandoff,
  createMatch,
  finishMatch,
  isMatchOver,
  nextRound,
  restartMatch,
  skipQuestion,
  startVoting,
  submitOpenTally,
} from './engine/match';
import { GameRuleError, eligibleTargets, currentVoterId } from './rules/voting';
import { tallyVotes, topOfTally } from './scoring/tally';
import { summarizeMatch, recordMatch, emptyLifetimeStats } from './scoring/summary';
import { roundMessage } from './rules/messages';
import { seededRng } from '../utils/random';
import { roundDrinks } from './rules/drinking';

const rng = seededRng(42);
const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

function config(over: Partial<MatchConfig> = {}): MatchConfig {
  const n = over.players?.length ?? 4;
  return {
    players: ids(n).map((id, i) => ({ id, name: ['Ana', 'Bia', 'Caio', 'Duda', 'Edu', 'Fê'][i] ?? id })),
    rounds: 3,
    categories: ['caos', 'vergonha'],
    includeHeavy: false,
    mode: 'secret',
    allowSelfVote: false,
    ...over,
  };
}

const input = (over: Partial<SetupInput> = {}): SetupInput => ({
  names: ['Ana', 'Bia', 'Caio'],
  rounds: 5,
  categories: ['caos'],
  includeHeavy: false,
  mode: 'secret',
  allowSelfVote: false,
  ...over,
});

/** Roda a votação secreta inteira: targets[i] é o voto do i-ésimo eleitor na ordem. */
function voteAll(state: MatchState, targets: string[]): MatchState {
  let s = startVoting(state);
  for (const t of targets) {
    s = confirmHandoff(s);
    s = castVote(s, currentVoterId(s)!, t);
  }
  return s;
}

function expectRule(fn: () => unknown, code: GameRuleError['code']) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(GameRuleError);
    expect((e as GameRuleError).code).toBe(code);
    return;
  }
  throw new Error(`Esperava GameRuleError ${code}`);
}

describe('banco de perguntas', () => {
  it('tem pelo menos 150 perguntas, ids únicos e todas as categorias preenchidas', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(150);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    expect(new Set(QUESTIONS.map((q) => q.text.toLowerCase())).size).toBe(QUESTIONS.length);
    for (const c of CATEGORIES) expect(QUESTIONS.filter((q) => q.category === c.id).length).toBeGreaterThanOrEqual(15);
  });
  it('categoria adulta é inteira marcada como pesada', () => {
    expect(QUESTIONS.filter((q) => q.category === 'semlimites').every((q) => q.heavy)).toBe(true);
  });
});

describe('validação da partida', () => {
  const mk = (i: number) => `id${i}`;
  it('aceita 3 a 12 jogadores', () => {
    expect(validateSetup(input(), QUESTIONS, mk).ok).toBe(true);
    const twelve = Array.from({ length: 12 }, (_, i) => `Jogador ${i + 1}`);
    expect(validateSetup(input({ names: twelve }), QUESTIONS, mk).ok).toBe(true);
  });
  it('recusa menos de 3 e mais de 12', () => {
    const two = validateSetup(input({ names: ['Ana', 'Bia'] }), QUESTIONS, mk);
    expect(two.ok).toBe(false);
    const thirteen = validateSetup(input({ names: Array.from({ length: 13 }, (_, i) => `J${i}`) }), QUESTIONS, mk);
    expect(thirteen.ok).toBe(false);
  });
  it('recusa nomes vazios e duplicados (ignorando acento e caixa)', () => {
    const r = validateSetup(input({ names: ['Ana', '  ', 'Bia'] }), QUESTIONS, mk);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].indexes).toEqual([1]);
    const d = validateSetup(input({ names: ['Júlia', 'julia ', 'Bia'] }), QUESTIONS, mk);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.errors.find((e) => e.indexes?.length === 2)?.indexes).toEqual([0, 1]);
  });
  it('limpa espaços e exige categoria e rodadas válidas', () => {
    const r = validateSetup(input({ names: ['  Ana   Maria ', 'Bia', 'Caio'] }), QUESTIONS, mk);
    expect(r.ok && r.config.players[0].name).toBe('Ana Maria');
    expect(validateSetup(input({ categories: [] }), QUESTIONS, mk).ok).toBe(false);
    expect(validateSetup(input({ rounds: 0 }), QUESTIONS, mk).ok).toBe(false);
    expect(validateSetup(input({ rounds: 31 }), QUESTIONS, mk).ok).toBe(false);
  });
  it('ignora a categoria adulta quando o conteúdo pesado está desligado', () => {
    expect(validateSetup(input({ categories: ['semlimites'] }), QUESTIONS, mk).ok).toBe(false);
    const ok = validateSetup(input({ categories: ['semlimites', 'caos'] }), QUESTIONS, mk);
    expect(ok.ok && ok.config.categories).toEqual(['caos']);
    expect(validateSetup(input({ categories: ['semlimites'], includeHeavy: true }), QUESTIONS, mk).ok).toBe(true);
  });
});

describe('baralho', () => {
  it('respeita categorias e conteúdo pesado', () => {
    const m = createMatch(config({ categories: ['segredos'] }), QUESTIONS, rng);
    expect(m.deck.every((q) => q.category === 'segredos' && !q.heavy)).toBe(true);
  });
  it('trocar carta não muda de fase e muda a pergunta', () => {
    const m = createMatch(config(), QUESTIONS, rng);
    const s = skipQuestion(m, rng);
    expect(s.phase).toBe('question');
    expect(s.question.id).not.toBe(m.question.id);
  });
  it('recicla o baralho quando as cartas acabam', () => {
    let s = createMatch(config({ rounds: 30 }), QUESTIONS, rng);
    s = { ...s, deck: s.deck.slice(0, 2), deckIndex: 0, question: s.deck[0] };
    s = skipQuestion(s, rng);
    s = skipQuestion(s, rng);
    expect(s.deckIndex).toBe(0);
    expect(s.question).toBeDefined();
  });
});

describe('só homens', () => {
  it('intercala o pacote Resenha dos caras com as categorias escolhidas', () => {
    const m = createMatch(config({ categories: ['festa'], menOnly: true, rounds: 10 }), QUESTIONS, rng);
    const firstTen = m.deck.slice(0, 10).map((q) => q.category);
    expect(firstTen.filter((c) => c === 'resenha')).toHaveLength(5);
    expect(firstTen.filter((c) => c === 'festa')).toHaveLength(5);
    expect(m.deck.every((q) => !q.heavy)).toBe(true);
  });
  it('sem a opção, o pacote não aparece nem se for escolhido', () => {
    const m = createMatch(config({ categories: ['caos'] }), QUESTIONS, rng);
    expect(m.deck.some((q) => q.category === 'resenha')).toBe(false);
    const v = validateSetup(input({ categories: ['resenha', 'caos'] }), QUESTIONS, (i) => `id${i}`);
    expect(v.ok && v.config.categories).toEqual(['caos']);
  });
  it('só homens funciona mesmo sem outra categoria', () => {
    const v = validateSetup(input({ categories: [], menOnly: true }), QUESTIONS, (i) => `id${i}`);
    expect(v.ok).toBe(true);
  });
});

describe('justificativas e modo bebida', () => {
  it('guarda a justificativa limpa e publica em ordem alfabética, sem quem votou', () => {
    let s = confirmHandoff(startVoting(createMatch(config(), QUESTIONS, rng)));
    s = castVote(s, 'p0', 'p1', '  zebra   total ');
    s = castVote(confirmHandoff(s), 'p1', 'p2', '');
    s = castVote(confirmHandoff(s), 'p2', 'p1', 'abacaxi ' + 'x'.repeat(200));
    s = castVote(confirmHandoff(s), 'p3', 'p1');
    const c = s.history[0].comments!;
    expect(c).toHaveLength(2);
    expect(c[0].text.startsWith('abacaxi')).toBe(true);
    expect(c[0].text.length).toBe(80);
    expect(c[1]).toEqual({ targetId: 'p1', text: 'zebra total' });
    expect(JSON.stringify(c)).not.toMatch(/voterId|p0|p3/);
  });
  it('regras de gole', () => {
    const base = { round: 1, question: QUESTIONS[0], mode: 'secret' as const, tally: {}, candidateIds: [], eliminatedId: null };
    expect(roundDrinks({ ...base, totalVotes: 4, topIds: ['a'], topCount: 4, isTie: false })[0].amount).toBe('vira o copo');
    expect(roundDrinks({ ...base, totalVotes: 5, topIds: ['a'], topCount: 3, isTie: false })[0].amount).toBe('3 goles');
    expect(roundDrinks({ ...base, totalVotes: 9, topIds: ['a'], topCount: 6, isTie: false })[0].amount).toBe('4 goles');
    expect(roundDrinks({ ...base, totalVotes: 4, topIds: ['a', 'b'], topCount: 2, isTie: true })[0]).toMatchObject({ ids: ['a', 'b'], amount: '2 goles' });
    expect(roundDrinks({ ...base, mode: 'survival', totalVotes: 4, topIds: ['a'], topCount: 2, isTie: false, eliminatedId: 'a' })[0].amount).toBe('vira o copo');
  });
  it('avatar escolhido vai para o jogador e nomes inválidos são ignorados', () => {
    const v = validateSetup(input({ avatars: ['alien', 'xx', 'gato'] }), QUESTIONS, (i) => `id${i}`);
    expect(v.ok && v.config.players.map((p) => p.avatar)).toEqual(['alien', undefined, 'gato']);
  });
});

describe('votação secreta', () => {
  it('registra votos em ordem e só revela no fim', () => {
    let s = startVoting(createMatch(config(), QUESTIONS, rng));
    expect(s.phase).toBe('handoff');
    s = confirmHandoff(s);
    s = castVote(s, 'p0', 'p1');
    expect(s.phase).toBe('handoff');
    expect(s.history).toHaveLength(0);
    s = voteAllFrom(s, ['p0', 'p0', 'p1']);
    expect(s.phase).toBe('reveal');
    expect(s.history[0].tally).toEqual({ p0: 2, p1: 2, p2: 0, p3: 0 });
  });

  function voteAllFrom(state: MatchState, targets: string[]): MatchState {
    let s = state;
    for (const t of targets) s = castVote(confirmHandoff(s), currentVoterId(s)!, t);
    return s;
  }

  it('bloqueia voto duplicado, fora da vez e alvo inválido', () => {
    let s = confirmHandoff(startVoting(createMatch(config(), QUESTIONS, rng)));
    expectRule(() => castVote(s, 'p1', 'p2'), 'NOT_YOUR_TURN');
    expectRule(() => castVote(s, 'p0', 'ninguem'), 'INVALID_TARGET');
    s = castVote(s, 'p0', 'p1');
    s = confirmHandoff(s);
    expectRule(() => castVote(s, 'p0', 'p2'), 'DUPLICATE_VOTE');
  });

  it('impede votar em si mesmo por padrão e permite quando configurado', () => {
    const s = confirmHandoff(startVoting(createMatch(config(), QUESTIONS, rng)));
    expectRule(() => castVote(s, 'p0', 'p0'), 'SELF_VOTE');
    expect(eligibleTargets(s, 'p0')).not.toContain('p0');
    const s2 = confirmHandoff(startVoting(createMatch(config({ allowSelfVote: true }), QUESTIONS, rng)));
    expect(castVote(s2, 'p0', 'p0').votes).toHaveLength(1);
  });

  it('não aceita votos na fase errada nem depois de encerrar a rodada', () => {
    const m = createMatch(config(), QUESTIONS, rng);
    expectRule(() => castVote(m, 'p0', 'p1'), 'WRONG_PHASE');
    expectRule(() => castVote(startVoting(m), 'p0', 'p1'), 'WRONG_PHASE'); // ainda na tela de privacidade
    const revealed = voteAll(m, ['p1', 'p2', 'p3', 'p0']);
    expect(revealed.phase).toBe('reveal');
    expectRule(() => castVote(revealed, 'p0', 'p1'), 'WRONG_PHASE');
    expectRule(() => confirmHandoff(revealed), 'WRONG_PHASE');
  });

  it('total de votos é igual ao número de eleitores, não de candidatos', () => {
    const s = voteAll(createMatch(config(), QUESTIONS, rng), ['p1', 'p2', 'p1', 'p1']);
    expect(s.history[0].totalVotes).toBe(4);
    expect(s.history[0].topIds).toEqual(['p1']);
    expect(s.history[0].topCount).toBe(3);
    expect(s.history[0].isTie).toBe(false);
  });
});

describe('contagem e empates', () => {
  it('conta corretamente e ignora alvos fora da lista', () => {
    const t = tallyVotes(
      [
        { voterId: 'a', targetId: 'x' },
        { voterId: 'b', targetId: 'x' },
        { voterId: 'c', targetId: 'zzz' },
      ],
      ['x', 'y'],
    );
    expect(t).toEqual({ x: 2, y: 0 });
  });
  it('identifica empates sem escolher vencedor', () => {
    expect(topOfTally({ a: 2, b: 2, c: 1 })).toEqual({ topIds: ['a', 'b'], topCount: 2 });
    expect(topOfTally({ a: 0, b: 0 })).toEqual({ topIds: [], topCount: 0 });
    const s = voteAll(createMatch(config(), QUESTIONS, rng), ['p1', 'p0', 'p1', 'p0']);
    expect(s.history[0].isTie).toBe(true);
    expect(s.history[0].topIds.sort()).toEqual(['p0', 'p1']);
    const name = (id: string) => id.toUpperCase();
    expect(roundMessage(s.history[0], name, rng)).toMatch(/P1|P0|empat/i);
  });
});

describe('progressão de rodadas e fim', () => {
  it('avança rodadas, termina no limite e gera resumo correto', () => {
    let s = createMatch(config({ rounds: 2 }), QUESTIONS, rng);
    s = voteAll(s, ['p1', 'p0', 'p1', 'p1']);
    expect(isMatchOver(s)).toBe(false);
    s = nextRound(s, rng);
    expect(s.phase).toBe('question');
    expect(s.round).toBe(2);
    expect(s.voterOrder[0]).toBe('p1'); // ordem gira
    s = voteAll(s, ['p2', 'p3', 'p2', 'p2']);
    s = nextRound(s, rng);
    expect(s.phase).toBe('finished');
    expectRule(() => startVoting(s), 'MATCH_OVER');

    const sum = summarizeMatch(s);
    expect(sum.roundsPlayed).toBe(2);
    expect(sum.totalVotes).toBe(8);
    expect(sum.ranking[0].votesReceived).toBe(3);
    // p1 e p2 têm 3 votos cada → empate no topo, mesma posição
    expect(sum.champions.sort()).toEqual(['p1', 'p2']);
    expect(sum.ranking[0].rank).toBe(1);
    expect(sum.ranking[1].rank).toBe(1);
  });

  it('encerrar antes descarta a rodada incompleta', () => {
    let s = voteAll(createMatch(config(), QUESTIONS, rng), ['p1', 'p2', 'p1', 'p1']);
    s = nextRound(s, rng);
    s = confirmHandoff(startVoting(s));
    s = castVote(s, currentVoterId(s)!, 'p2');
    s = finishMatch(s);
    expect(s.phase).toBe('finished');
    expect(summarizeMatch(s).roundsPlayed).toBe(1);
    expect(summarizeMatch(s).totalVotes).toBe(4);
  });

  it('reiniciar cria partida limpa com a mesma configuração', () => {
    let s = voteAll(createMatch(config(), QUESTIONS, rng), ['p1', 'p2', 'p1', 'p1']);
    s = finishMatch(s);
    const r = restartMatch(s, QUESTIONS, rng);
    expect(r.phase).toBe('question');
    expect(r.round).toBe(1);
    expect(r.history).toHaveLength(0);
    expect(r.config).toEqual(s.config);
    expect(r.id).not.toBe(s.id);
  });
});

describe('votação aberta', () => {
  it('registra o placar coletivo e valida limites', () => {
    let s = startVoting(createMatch(config({ mode: 'open' }), QUESTIONS, rng));
    expect(s.phase).toBe('open-voting');
    expectRule(() => submitOpenTally(s, { p0: 0 }), 'INVALID_TALLY');
    expectRule(() => submitOpenTally(s, { p0: 5 }), 'INVALID_TALLY');
    expectRule(() => submitOpenTally(s, { p0: -1, p1: 2 }), 'INVALID_TALLY');
    expectRule(() => submitOpenTally(s, { x: 1 }), 'INVALID_TARGET');
    s = submitOpenTally(s, { p0: 3, p2: 1 });
    expect(s.phase).toBe('reveal');
    expect(s.history[0].tally).toEqual({ p0: 3, p1: 0, p2: 1, p3: 0 });
    expect(s.history[0].totalVotes).toBe(4);
  });
});

describe('sobrevivência social', () => {
  it('elimina o mais votado, salva todos no empate e termina com um sobrevivente', () => {
    let s = createMatch(config({ mode: 'survival', rounds: 10 }), QUESTIONS, rng);
    s = voteAll(s, ['p1', 'p0', 'p0', 'p0']); // p0 sai
    expect(s.history[0].eliminatedId).toBe('p0');
    expect(s.survivors).toEqual(['p1', 'p2', 'p3']);
    s = nextRound(s, rng);
    // eliminado não pode mais receber votos
    let v = confirmHandoff(startVoting(s));
    expectRule(() => castVote(v, currentVoterId(v)!, 'p0'), 'INVALID_TARGET');
    // rodada 2, ordem: p1,p2,p3,p0 → empate entre p2 e p3
    s = voteAll(s, ['p2', 'p3', 'p2', 'p3']);
    expect(s.history[1].isTie).toBe(true);
    expect(s.history[1].eliminatedId).toBeNull();
    expect(s.survivors).toHaveLength(3);
    s = nextRound(s, rng); // ordem p2,p3,p0,p1
    s = voteAll(s, ['p1', 'p1', 'p1', 'p2']); // p1 sai
    s = nextRound(s, rng); // ordem p3,p0,p1,p2
    s = voteAll(s, ['p2', 'p2', 'p3', 'p3']);
    s = nextRound(s, rng); // empate, segue
    s = voteAll(s, ['p3', 'p3', 'p3', 'p2']); // ordem p0,p1,p2,p3 → p3 sai
    expect(s.survivors).toEqual(['p2']);
    expect(isMatchOver(s)).toBe(true);
    s = nextRound(s, rng);
    expect(s.phase).toBe('finished');
    expect(summarizeMatch(s).survivors).toEqual(['p2']);
    v = s;
  });
});

describe('estatísticas acumuladas', () => {
  it('soma partidas e títulos por nome', () => {
    let s = voteAll(createMatch(config({ rounds: 1 }), QUESTIONS, rng), ['p1', 'p2', 'p1', 'p1']);
    s = nextRound(s, rng);
    let stats = recordMatch(emptyLifetimeStats(), s, 1000);
    stats = recordMatch(stats, s, 2000);
    expect(stats.matches).toBe(2);
    expect(stats.rounds).toBe(2);
    expect(stats.players['bia'].titles).toBe(2);
    expect(stats.players['bia'].votesReceived).toBe(6);
    expect(stats.byMode.secret).toBe(2);
  });
  it('não registra partida sem rodadas', () => {
    const s = finishMatch(createMatch(config(), QUESTIONS, rng));
    expect(recordMatch(emptyLifetimeStats(), s).matches).toBe(0);
  });
});
