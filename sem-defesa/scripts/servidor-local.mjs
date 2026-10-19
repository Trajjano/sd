// Servidor de teste para o modo online, sem precisar do Supabase.
// Roda o mesmo supabase/schema.sql num Postgres embutido (PGlite) e imita a API REST do Supabase.
// Não tem tempo real: o app percebe e passa a conferir a sala a cada 2 segundos.
//
// Uso:
//   npm run servidor:local
//   (em outro terminal) VITE_SUPABASE_URL=http://SEU-IP:54321 VITE_SUPABASE_ANON_KEY=local npm run dev
//
// Só para testes na sua rede. Os dados somem quando o servidor para.

import http from 'node:http';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const PORT = Number(process.env.PORT ?? 54321);
const db = new PGlite();
await db.exec('create role anon nologin; create role authenticated nologin;');
await db.exec(readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));

const TABLES = { rooms: ['id', 'code'], room_players: ['id', 'room_id'] };
const FN = /^sd_[a-z_]+$/;

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);

    if (rpc && req.method === 'POST') {
      const fn = rpc[1];
      if (!FN.test(fn)) return send(res, 404, { message: 'Função não encontrada' });
      const args = await readBody(req);
      const names = Object.keys(args);
      const values = names.map((k) => (args[k] !== null && typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k]));
      const list = names
        .map((k, i) => `${k} => $${i + 1}${args[k] !== null && typeof args[k] === 'object' ? '::jsonb' : ''}`)
        .join(', ');
      const out = await db.query(`select public.${fn}(${list}) as r`, values);
      return send(res, 200, out.rows[0]?.r ?? null);
    }

    const table = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1];
    if (table && TABLES[table] && req.method === 'GET') {
      const where = [];
      const values = [];
      for (const [k, v] of url.searchParams) {
        if (TABLES[table].includes(k) && v.startsWith('eq.')) {
          values.push(v.slice(3));
          where.push(`${k}::text = $${values.length}`);
        }
      }
      const order = url.searchParams.get('order') === 'seat.asc' ? ' order by seat asc' : '';
      const limit = Number(url.searchParams.get('limit')) || 100;
      const out = await db.query(
        `select * from public.${table}${where.length ? ` where ${where.join(' and ')}` : ''}${order} limit ${Math.min(limit, 100)}`,
        values,
      );
      return send(res, 200, out.rows);
    }

    send(res, 404, { message: 'Rota não suportada no servidor local' });
  } catch (e) {
    send(res, 400, { message: e.message, code: 'P0001', details: null, hint: null });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor local do modo online em http://localhost:${PORT}`);
});
