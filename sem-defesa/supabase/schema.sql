-- =====================================================================
-- SEM DEFESA — modo online (cada jogador no próprio celular)
--
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- Pode rodar de novo sem problema: ele recria as funções e mantém os dados.
--
-- Segurança:
--  * O navegador só consegue LER salas e nomes de jogadores.
--  * Toda alteração passa por funções (RPC) que conferem o "segredo" do jogador,
--    gerado na entrada e guardado só no celular dele.
--  * Os votos ficam numa tabela que o navegador não consegue ler. Só a contagem
--    final da rodada é publicada — ninguém descobre quem votou em quem.
-- =====================================================================

-- ---------- Tabelas ----------

create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  host_id       uuid,
  status        text not null default 'lobby' check (status in ('lobby', 'voting', 'reveal', 'finished')),
  config        jsonb not null default '{}'::jsonb,
  round         int  not null default 0,
  deck          jsonb not null default '[]'::jsonb,
  deck_index    int  not null default 0,
  question      jsonb,
  voter_ids     jsonb not null default '[]'::jsonb,  -- quem vota nesta rodada
  candidate_ids jsonb not null default '[]'::jsonb,  -- quem pode receber voto
  voted_ids     jsonb not null default '[]'::jsonb,  -- quem já votou (não diz em quem)
  survivors     jsonb not null default '[]'::jsonb,
  history       jsonb not null default '[]'::jsonb,  -- resultados das rodadas reveladas
  version       int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.room_players (
  id        uuid primary key default gen_random_uuid(),
  room_id   uuid not null references public.rooms(id) on delete cascade,
  name      text not null,
  seat      int  not null,
  left_at   timestamptz,
  joined_at timestamptz not null default now()
);
create index if not exists room_players_room_idx on public.room_players(room_id);

create table if not exists public.player_secrets (
  player_id uuid primary key references public.room_players(id) on delete cascade,
  secret    text not null
);

create table if not exists public.room_votes (
  room_id   uuid not null references public.rooms(id) on delete cascade,
  round     int  not null,
  voter_id  uuid not null references public.room_players(id) on delete cascade,
  target_id uuid not null,
  primary key (room_id, round, voter_id)
);

-- ---------- Permissões (RLS) ----------

alter table public.rooms          enable row level security;
alter table public.room_players   enable row level security;
alter table public.player_secrets enable row level security;
alter table public.room_votes     enable row level security;

drop policy if exists rooms_read on public.rooms;
create policy rooms_read on public.rooms for select using (true);

drop policy if exists room_players_read on public.room_players;
create policy room_players_read on public.room_players for select using (true);
-- player_secrets e room_votes: sem nenhuma policy => inacessíveis pelo navegador.

-- ---------- Funções internas ----------

create or replace function public._norm(p text) returns text
language sql immutable as $$
  select regexp_replace(
    translate(lower(trim(coalesce(p, ''))), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
    '\s+', ' ', 'g')
$$;

create or replace function public._clean_name(p text) returns text
language plpgsql immutable as $$
declare n text := regexp_replace(trim(coalesce(p, '')), '\s+', ' ', 'g');
begin
  if length(n) = 0 then raise exception 'Digite seu nome.'; end if;
  if length(n) > 18 then raise exception 'Nome com até 18 letras.'; end if;
  return n;
end $$;

create or replace function public._clean_config(p jsonb) returns jsonb
language plpgsql immutable as $$
declare
  r int := coalesce((p ->> 'rounds')::int, 10);
  m text := coalesce(p ->> 'mode', 'secret');
begin
  if r < 1 or r > 30 then raise exception 'Escolha entre 1 e 30 rodadas.'; end if;
  if m not in ('secret', 'survival') then m := 'secret'; end if;
  return jsonb_build_object(
    'rounds', r,
    'mode', m,
    'allowSelfVote', coalesce((p ->> 'allowSelfVote')::boolean, false),
    'includeHeavy', coalesce((p ->> 'includeHeavy')::boolean, false),
    'menOnly', coalesce((p ->> 'menOnly')::boolean, false),
    'categories', coalesce(p -> 'categories', '[]'::jsonb)
  );
end $$;

-- Confere jogador + segredo e devolve a sala travada para atualização.
create or replace function public._auth(p_room uuid, p_player uuid, p_secret text)
returns public.rooms
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  select * into r from rooms where id = p_room for update;
  if not found then raise exception 'Sala não encontrada.'; end if;
  if not exists (
    select 1 from room_players p join player_secrets s on s.player_id = p.id
    where p.id = p_player and p.room_id = p_room and s.secret = p_secret and p.left_at is null
  ) then
    raise exception 'Você não está nesta sala.';
  end if;
  return r;
end $$;

create or replace function public._require_host(r public.rooms, p_player uuid) returns void
language plpgsql as $$
begin
  if r.host_id is distinct from p_player then raise exception 'Só quem criou a sala pode fazer isso.'; end if;
end $$;

create or replace function public._active_ids(p_room uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(id order by seat), '[]'::jsonb)
  from room_players where room_id = p_room and left_at is null
$$;

create or replace function public._touch(p_room uuid) returns void
language sql security definer set search_path = public as $$
  update rooms set version = version + 1, updated_at = now() where id = p_room
$$;

-- Prepara a rodada atual: quem vota e quem pode ser votado.
create or replace function public._setup_round(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.rooms;
  active jsonb;
begin
  select * into r from rooms where id = p_room;
  active := _active_ids(p_room);
  update rooms set
    voter_ids = active,
    candidate_ids = case when r.config ->> 'mode' = 'survival'
      then (select coalesce(jsonb_agg(v), '[]'::jsonb) from jsonb_array_elements(r.survivors) v where active ? (v #>> '{}'))
      else active end,
    voted_ids = '[]'::jsonb,
    status = 'voting'
  where id = p_room;
end $$;

-- Fecha a votação: conta os votos e publica só o resultado.
create or replace function public._close_round(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.rooms;
  tally jsonb;
  total int;
  top_count int;
  top_ids jsonb;
  is_tie boolean;
  eliminated text;
begin
  select * into r from rooms where id = p_room;

  select coalesce(jsonb_object_agg(c.id, coalesce(v.n, 0)), '{}'::jsonb)
    into tally
  from (select value #>> '{}' as id from jsonb_array_elements(r.candidate_ids)) c
  left join (
    select target_id::text as id, count(*)::int as n
    from room_votes where room_id = p_room and round = r.round
    group by target_id
  ) v on v.id = c.id;

  select coalesce(sum(value::int), 0), coalesce(max(value::int), 0)
    into total, top_count
  from jsonb_each_text(tally);

  if top_count > 0 then
    select coalesce(jsonb_agg(c.value order by c.ord), '[]'::jsonb) into top_ids
    from jsonb_array_elements(r.candidate_ids) with ordinality as c(value, ord)
    where (tally ->> (c.value #>> '{}'))::int = top_count;
  else
    top_ids := '[]'::jsonb;
  end if;

  is_tie := jsonb_array_length(top_ids) > 1;
  eliminated := case
    when r.config ->> 'mode' = 'survival' and not is_tie and jsonb_array_length(top_ids) = 1
    then top_ids ->> 0 end;

  update rooms set
    status = 'reveal',
    survivors = case when eliminated is null then survivors
      else (select coalesce(jsonb_agg(s), '[]'::jsonb) from jsonb_array_elements(survivors) s where s #>> '{}' <> eliminated) end,
    history = history || jsonb_build_array(jsonb_build_object(
      'round', r.round,
      'question', r.question,
      'mode', r.config ->> 'mode',
      'tally', tally,
      'totalVotes', total,
      'topIds', top_ids,
      'topCount', top_count,
      'isTie', is_tie,
      'eliminatedId', eliminated,
      'candidateIds', r.candidate_ids
    ))
  where id = p_room;
end $$;

-- Fecha a rodada se todo mundo que ainda está na sala já votou.
create or replace function public._maybe_close(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms;
begin
  select * into r from rooms where id = p_room;
  if r.status = 'voting'
     and not exists (
       select 1 from jsonb_array_elements_text(r.voter_ids) v
       where not (r.voted_ids ? v)
         and exists (select 1 from room_players p where p.id = v::uuid and p.left_at is null)
     )
     and jsonb_array_length(r.voted_ids) > 0
  then
    perform _close_round(p_room);
  end if;
end $$;

-- ---------- Funções públicas (chamadas pelo app) ----------

create or replace function public.sd_create_room(p_name text, p_config jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  room_id uuid;
  player_id uuid;
  secret text := gen_random_uuid()::text || gen_random_uuid()::text;
  n text := _clean_name(p_name);
  cfg jsonb := _clean_config(p_config);
  i int;
begin
  -- limpeza de salas abandonadas
  delete from rooms where updated_at < now() - interval '24 hours';

  loop
    new_code := '';
    for i in 1..5 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from rooms where code = new_code);
  end loop;

  insert into rooms (code, config) values (new_code, cfg) returning id into room_id;
  insert into room_players (room_id, name, seat) values (room_id, n, 0) returning id into player_id;
  insert into player_secrets (player_id, secret) values (player_id, secret);
  update rooms set host_id = player_id where id = room_id;

  return jsonb_build_object('room_id', room_id, 'code', new_code, 'player_id', player_id, 'secret', secret);
end $$;

create or replace function public.sd_join_room(p_code text, p_name text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r public.rooms;
  n text := _clean_name(p_name);
  player_id uuid;
  secret text := gen_random_uuid()::text || gen_random_uuid()::text;
begin
  select * into r from rooms where code = upper(trim(p_code)) for update;
  if not found then raise exception 'Sala não encontrada. Confira o código.'; end if;
  if r.status <> 'lobby' then raise exception 'A partida já começou. Peça para quem criou a sala voltar ao lobby.'; end if;
  if (select count(*) from room_players where room_id = r.id and left_at is null) >= 12 then
    raise exception 'Sala cheia (máximo de 12 jogadores).';
  end if;
  if exists (select 1 from room_players where room_id = r.id and left_at is null and _norm(name) = _norm(n)) then
    raise exception 'Já tem alguém com esse nome na sala. Use um apelido.';
  end if;

  insert into room_players (room_id, name, seat)
  values (r.id, n, coalesce((select max(seat) + 1 from room_players where room_id = r.id), 0))
  returning id into player_id;
  insert into player_secrets (player_id, secret) values (player_id, secret);
  perform _touch(r.id);

  return jsonb_build_object('room_id', r.id, 'code', r.code, 'player_id', player_id, 'secret', secret);
end $$;

create or replace function public.sd_update_config(p_room uuid, p_player uuid, p_secret text, p_config jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms := _auth(p_room, p_player, p_secret);
begin
  perform _require_host(r, p_player);
  if r.status not in ('lobby', 'finished') then raise exception 'Não dá pra mudar as regras no meio da partida.'; end if;
  update rooms set config = _clean_config(p_config) where id = p_room;
  perform _touch(p_room);
end $$;

create or replace function public.sd_kick(p_room uuid, p_player uuid, p_secret text, p_target uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms := _auth(p_room, p_player, p_secret);
begin
  perform _require_host(r, p_player);
  if p_target = p_player then raise exception 'Você não pode se remover.'; end if;
  if r.status = 'lobby' then
    delete from room_players where id = p_target and room_id = p_room;
  else
    update room_players set left_at = now() where id = p_target and room_id = p_room;
    update rooms set survivors = (select coalesce(jsonb_agg(s), '[]'::jsonb) from jsonb_array_elements_text(survivors) s where s <> p_target::text)
    where id = p_room;
    perform _maybe_close(p_room);
  end if;
  perform _touch(p_room);
end $$;

create or replace function public.sd_leave(p_room uuid, p_player uuid, p_secret text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.rooms := _auth(p_room, p_player, p_secret);
  next_host uuid;
begin
  if r.status = 'lobby' then
    delete from room_players where id = p_player;
  else
    update room_players set left_at = now() where id = p_player;
    update rooms set survivors = (select coalesce(jsonb_agg(s), '[]'::jsonb) from jsonb_array_elements_text(survivors) s where s <> p_player::text)
    where id = p_room;
  end if;

  if r.host_id = p_player then
    select id into next_host from room_players where room_id = p_room and left_at is null order by seat limit 1;
    if next_host is null then
      delete from rooms where id = p_room;
      return;
    end if;
    update rooms set host_id = next_host where id = p_room;
  end if;

  perform _maybe_close(p_room);
  perform _touch(p_room);
end $$;

create or replace function public.sd_start(p_room uuid, p_player uuid, p_secret text, p_deck jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.rooms := _auth(p_room, p_player, p_secret);
  active jsonb;
begin
  perform _require_host(r, p_player);
  if r.status not in ('lobby', 'finished') then raise exception 'A partida já está rolando.'; end if;
  active := _active_ids(p_room);
  if jsonb_array_length(active) < 3 then raise exception 'Precisa de pelo menos 3 jogadores na sala.'; end if;
  if jsonb_typeof(p_deck) <> 'array' or jsonb_array_length(p_deck) < 1 or jsonb_array_length(p_deck) > 300 then
    raise exception 'Baralho inválido.';
  end if;

  delete from room_votes where room_id = p_room;
  update rooms set
    round = 1, deck = p_deck, deck_index = 0, question = p_deck -> 0,
    survivors = active, history = '[]'::jsonb
  where id = p_room;
  perform _setup_round(p_room);
  perform _touch(p_room);
end $$;

create or replace function public.sd_skip(p_room uuid, p_player uuid, p_secret text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.rooms := _auth(p_room, p_player, p_secret);
  idx int;
begin
  perform _require_host(r, p_player);
  if r.status <> 'voting' then raise exception 'Só dá pra trocar a carta durante a votação.'; end if;
  if jsonb_array_length(r.voted_ids) > 0 then raise exception 'Alguém já votou nesta carta.'; end if;
  idx := (r.deck_index + 1) % greatest(jsonb_array_length(r.deck), 1);
  update rooms set deck_index = idx, question = deck -> idx where id = p_room;
  perform _touch(p_room);
end $$;

create or replace function public.sd_vote(p_room uuid, p_player uuid, p_secret text, p_target uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms := _auth(p_room, p_player, p_secret);
begin
  if r.status <> 'voting' then raise exception 'A votação desta rodada já fechou.'; end if;
  if not (r.voter_ids ? p_player::text) then raise exception 'Você entrou depois: vota a partir da próxima rodada.'; end if;
  if r.voted_ids ? p_player::text then raise exception 'Você já votou nesta rodada.'; end if;
  if not (r.candidate_ids ? p_target::text) then raise exception 'Escolha um participante válido.'; end if;
  if p_target = p_player and not coalesce((r.config ->> 'allowSelfVote')::boolean, false) then
    raise exception 'Votar em si mesmo está desativado.';
  end if;

  insert into room_votes (room_id, round, voter_id, target_id) values (p_room, r.round, p_player, p_target);
  update rooms set voted_ids = voted_ids || to_jsonb(p_player::text) where id = p_room;
  perform _maybe_close(p_room);
  perform _touch(p_room);
end $$;

-- Anfitrião encerra a votação sem esperar quem sumiu (precisa de ao menos 1 voto).
create or replace function public.sd_close_voting(p_room uuid, p_player uuid, p_secret text)
returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms := _auth(p_room, p_player, p_secret);
begin
  perform _require_host(r, p_player);
  if r.status <> 'voting' then raise exception 'Não tem votação aberta.'; end if;
  if jsonb_array_length(r.voted_ids) = 0 then raise exception 'Ninguém votou ainda.'; end if;
  perform _close_round(p_room);
  perform _touch(p_room);
end $$;

create or replace function public.sd_next(p_room uuid, p_player uuid, p_secret text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.rooms := _auth(p_room, p_player, p_secret);
  idx int;
begin
  perform _require_host(r, p_player);
  if r.status <> 'reveal' then raise exception 'Ainda não terminou a revelação.'; end if;

  if jsonb_array_length(r.history) >= (r.config ->> 'rounds')::int
     or (r.config ->> 'mode' = 'survival' and jsonb_array_length(r.survivors) <= 1)
     or jsonb_array_length(_active_ids(p_room)) < 2 then
    update rooms set status = 'finished' where id = p_room;
  else
    idx := (r.deck_index + 1) % greatest(jsonb_array_length(r.deck), 1);
    update rooms set round = round + 1, deck_index = idx, question = deck -> idx where id = p_room;
    perform _setup_round(p_room);
  end if;
  perform _touch(p_room);
end $$;

create or replace function public.sd_finish(p_room uuid, p_player uuid, p_secret text)
returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms := _auth(p_room, p_player, p_secret);
begin
  perform _require_host(r, p_player);
  if r.status in ('voting', 'reveal') then
    update rooms set status = 'finished', voted_ids = '[]'::jsonb where id = p_room;
    perform _touch(p_room);
  end if;
end $$;

create or replace function public.sd_back_to_lobby(p_room uuid, p_player uuid, p_secret text)
returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms := _auth(p_room, p_player, p_secret);
begin
  perform _require_host(r, p_player);
  if r.status <> 'finished' then raise exception 'Termine a partida antes.'; end if;
  delete from room_players where room_id = p_room and left_at is not null;
  update rooms set status = 'lobby', round = 0, history = '[]'::jsonb, question = null,
    voter_ids = '[]'::jsonb, candidate_ids = '[]'::jsonb, voted_ids = '[]'::jsonb, survivors = '[]'::jsonb
  where id = p_room;
  perform _touch(p_room);
end $$;

-- ---------- Acesso ----------

revoke all on function
  public._auth(uuid, uuid, text), public._require_host(public.rooms, uuid), public._active_ids(uuid),
  public._touch(uuid), public._setup_round(uuid), public._close_round(uuid), public._maybe_close(uuid)
from public;

do $$
declare role_name text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format('revoke all on public.player_secrets, public.room_votes from %I', role_name);
      execute format('revoke insert, update, delete on public.rooms, public.room_players from %I', role_name);
      execute format('grant select on public.rooms, public.room_players to %I', role_name);
      execute format('grant execute on function
        public.sd_create_room(text, jsonb), public.sd_join_room(text, text),
        public.sd_update_config(uuid, uuid, text, jsonb), public.sd_kick(uuid, uuid, text, uuid),
        public.sd_leave(uuid, uuid, text), public.sd_start(uuid, uuid, text, jsonb),
        public.sd_skip(uuid, uuid, text), public.sd_vote(uuid, uuid, text, uuid),
        public.sd_close_voting(uuid, uuid, text), public.sd_next(uuid, uuid, text),
        public.sd_finish(uuid, uuid, text), public.sd_back_to_lobby(uuid, uuid, text)
        to %I', role_name);
    end if;
  end loop;
end $$;

-- ---------- Tempo real ----------
-- Avisa os celulares quando a sala muda (o app também confere a cada poucos segundos).

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.rooms;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
