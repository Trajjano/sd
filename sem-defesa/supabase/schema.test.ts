import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

// Roda o schema real do Supabase num Postgres local (PGlite) e exercita as regras do servidor.

let db: PGlite;
const sql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

type Creds = { room_id: string; code: string; player_id: string; secret: string };

async function rpc<T = unknown>(fn: string, ...args: unknown[]): Promise<T> {
  const params = args.map((_, i) => `$${i + 1}`).join(', ');
  const res = await db.query<{ r: T }>(`select public.${fn}(${params}) as r`, args.map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : a)));
  return res.rows[0]?.r as T;
}

async function room(id: string) {
  const res = await db.query<Record<string, any>>('select * from public.rooms where id = $1', [id]);
  return res.rows[0];
}

async function expectError(p: Promise<unknown>, msg: RegExp) {
  await expect(p).rejects.toThrow(msg);
}

const deck = Array.from({ length: 12 }, (_, i) => ({ id: `q${i}`, text: `Pergunta ${i}?`, category: 'caos' }));
const cfg = (over: Record<string, unknown> = {}) => ({ rounds: 3, mode: 'secret', allowSelfVote: false, includeHeavy: false, categories: ['caos'], ...over });

async function setupRoom(names: string[], config = cfg()) {
  const host = await rpc<Creds>('sd_create_room', names[0], config);
  const others: Creds[] = [];
  for (const n of names.slice(1)) others.push(await rpc<Creds>('sd_join_room', host.code.toLowerCase(), n));
  return [host, ...others];
}

const vote = (r: Creds, p: Creds, target: Creds) => rpc('sd_vote', r.room_id, p.player_id, p.secret, target.player_id);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin;`);
  await db.exec(sql);
  // rodar de novo precisa funcionar (idempotente)
  await db.exec(sql);
}, 60_000);

describe('salas online (SQL)', () => {
  it('cria sala com código de 5 letras e entra por código', async () => {
    const [host, b] = await setupRoom(['Ana', 'Bia']);
    expect(host.code).toMatch(/^[A-Z2-9]{5}$/);
    const r = await room(host.room_id);
    expect(r.host_id).toBe(host.player_id);
    expect(b.room_id).toBe(host.room_id);
  });

  it('valida nome, nome repetido e sala inexistente', async () => {
    const [host] = await setupRoom(['Júlia']);
    await expectError(rpc('sd_join_room', host.code, 'julia'), /mesmo nome|esse nome/);
    await expectError(rpc('sd_join_room', host.code, '   '), /Digite seu nome/);
    await expectError(rpc('sd_join_room', 'ZZZZZ', 'Leo'), /não encontrada/);
  });

  it('só o anfitrião começa e precisa de 3 jogadores', async () => {
    const [host, b] = await setupRoom(['Ana', 'Bia']);
    await expectError(rpc('sd_start', host.room_id, host.player_id, host.secret, deck), /pelo menos 3/);
    const c = await rpc<Creds>('sd_join_room', host.code, 'Caio');
    await expectError(rpc('sd_start', host.room_id, b.player_id, b.secret, deck), /Só quem criou/);
    await expectError(rpc('sd_start', host.room_id, host.player_id, 'errado', deck), /não está nesta sala/);
    await rpc('sd_start', host.room_id, host.player_id, host.secret, deck);
    const r = await room(host.room_id);
    expect(r.status).toBe('voting');
    expect(r.question.id).toBe('q0');
    expect(r.voter_ids).toHaveLength(3);
    // ninguém entra depois de começar
    await expectError(rpc('sd_join_room', host.code, 'Duda'), /já começou/);
    void c;
  });

  it('votos secretos: bloqueia duplicado e em si mesmo, fecha quando todos votam', async () => {
    const [a, b, c, d] = await setupRoom(['Ana', 'Bia', 'Caio', 'Duda']);
    await rpc('sd_start', a.room_id, a.player_id, a.secret, deck);
    await expectError(vote(a, a, a), /si mesmo/);
    await vote(a, a, b);
    await expectError(vote(a, a, c), /já votou/);
    let r = await room(a.room_id);
    expect(r.voted_ids).toEqual([a.player_id]);
    expect(r.status).toBe('voting');
    expect(r.history).toEqual([]);
    await vote(a, b, a);
    await vote(a, c, b);
    await vote(a, d, a);
    r = await room(a.room_id);
    expect(r.status).toBe('reveal');
    const res = r.history[0];
    expect(res.totalVotes).toBe(4);
    expect(res.isTie).toBe(true);
    expect(res.topIds).toEqual([a.player_id, b.player_id]);
    expect(res.tally[c.player_id]).toBe(0);
    await expectError(vote(a, a, b), /já fechou/);
  });

  it('o navegador não consegue ler votos nem segredos', async () => {
    await db.exec('set role anon');
    try {
      await expectError(db.query('select * from public.room_votes'), /permission denied/);
      await expectError(db.query('select * from public.player_secrets'), /permission denied/);
      await expectError(db.query(`update public.rooms set status = 'finished'`), /permission denied/);
      const ok = await db.query('select count(*) from public.rooms');
      expect(ok.rows).toHaveLength(1);
    } finally {
      await db.exec('reset role');
    }
  });

  it('avança rodadas, troca carta e termina no limite', async () => {
    const [a, b, c] = await setupRoom(['Ana', 'Bia', 'Caio'], cfg({ rounds: 2 }));
    await rpc('sd_start', a.room_id, a.player_id, a.secret, deck);
    await rpc('sd_skip', a.room_id, a.player_id, a.secret);
    expect((await room(a.room_id)).question.id).toBe('q1');
    await vote(a, a, b);
    await expectError(rpc('sd_skip', a.room_id, a.player_id, a.secret), /já votou/);
    await vote(a, b, c);
    await vote(a, c, b);
    await expectError(rpc('sd_next', a.room_id, b.player_id, b.secret), /Só quem criou/);
    await rpc('sd_next', a.room_id, a.player_id, a.secret);
    let r = await room(a.room_id);
    expect(r.round).toBe(2);
    expect(r.question.id).toBe('q2');
    expect(r.voted_ids).toEqual([]);
    await vote(a, a, c);
    await vote(a, b, c);
    await vote(a, c, a);
    await rpc('sd_next', a.room_id, a.player_id, a.secret);
    r = await room(a.room_id);
    expect(r.status).toBe('finished');
    expect(r.history).toHaveLength(2);
    // jogar de novo direto
    await rpc('sd_start', a.room_id, a.player_id, a.secret, deck);
    r = await room(a.room_id);
    expect(r.status).toBe('voting');
    expect(r.history).toEqual([]);
    expect(r.round).toBe(1);
  });

  it('sobrevivência: elimina o mais votado e ele não recebe mais votos', async () => {
    const [a, b, c, d] = await setupRoom(['Ana', 'Bia', 'Caio', 'Duda'], cfg({ mode: 'survival', rounds: 10 }));
    await rpc('sd_start', a.room_id, a.player_id, a.secret, deck);
    await vote(a, a, b);
    await vote(a, b, c);
    await vote(a, c, b);
    await vote(a, d, b);
    let r = await room(a.room_id);
    expect(r.history[0].eliminatedId).toBe(b.player_id);
    expect(r.survivors).not.toContain(b.player_id);
    await rpc('sd_next', a.room_id, a.player_id, a.secret);
    r = await room(a.room_id);
    expect(r.candidate_ids).not.toContain(b.player_id);
    expect(r.voter_ids).toContain(b.player_id); // continua votando
    await expectError(vote(a, a, b), /participante válido/);
  });

  it('anfitrião encerra votação sem esperar quem sumiu; saída passa o anfitrião adiante', async () => {
    const [a, b, c] = await setupRoom(['Ana', 'Bia', 'Caio']);
    await rpc('sd_start', a.room_id, a.player_id, a.secret, deck);
    await expectError(rpc('sd_close_voting', a.room_id, a.player_id, a.secret), /Ninguém votou/);
    await vote(a, b, c);
    await rpc('sd_close_voting', a.room_id, a.player_id, a.secret);
    let r = await room(a.room_id);
    expect(r.status).toBe('reveal');
    expect(r.history[0].totalVotes).toBe(1);
    await rpc('sd_next', a.room_id, a.player_id, a.secret);
    // Caio sai no meio: a rodada fecha com quem ficou
    await vote(a, a, b);
    await vote(a, b, a);
    await rpc('sd_leave', a.room_id, c.player_id, c.secret);
    r = await room(a.room_id);
    expect(r.status).toBe('reveal');
    // anfitrião sai: Bia vira anfitriã
    await rpc('sd_leave', a.room_id, a.player_id, a.secret);
    r = await room(a.room_id);
    expect(r.host_id).toBe(b.player_id);
  });

  it('anfitrião remove jogador no lobby e sala cheia barra o 13º', async () => {
    const players = await setupRoom(Array.from({ length: 12 }, (_, i) => `J${i}`));
    const [a, x] = players;
    await expectError(rpc('sd_join_room', a.code, 'Treze'), /cheia/);
    await rpc('sd_kick', a.room_id, a.player_id, a.secret, x.player_id);
    await rpc('sd_join_room', a.code, 'Treze');
    const count = await db.query<{ n: number }>('select count(*)::int as n from public.room_players where room_id = $1', [a.room_id]);
    expect(count.rows[0].n).toBe(12);
  });
});
