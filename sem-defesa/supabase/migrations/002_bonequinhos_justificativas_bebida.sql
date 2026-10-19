-- SEM DEFESA — atualização v2 (bonequinhos, justificativas, modo bebida).
-- Para quem já rodou a versão anterior. Pode rodar mais de uma vez.
-- Instalação do zero: use o schema.sql completo.
alter table public.room_players add column if not exists avatar text;
alter table public.room_votes   add column if not exists comment text;
drop function if exists public.sd_create_room(text, jsonb);
drop function if exists public.sd_join_room(text, text);
drop function if exists public.sd_vote(uuid, uuid, text, uuid);

create or replace function public._clean_avatar(p text) returns text
language sql immutable as $$
  select case when p ~ '^[a-z0-9_-]{1,20}$' then p else null end
$$;

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
    'drinking', coalesce((p ->> 'drinking')::boolean, false),
    'categories', coalesce(p -> 'categories', '[]'::jsonb)
  );
end $$;

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
  comments jsonb;
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

  -- Justificativas sem quem escreveu, em ordem alfabética (não entrega a ordem de votação).
  select coalesce(jsonb_agg(jsonb_build_object('targetId', target_id::text, 'text', comment) order by comment), '[]'::jsonb)
    into comments
  from room_votes
  where room_id = p_room and round = r.round and comment is not null and length(comment) > 0
    and r.candidate_ids ? target_id::text;

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
      'candidateIds', r.candidate_ids,
      'comments', comments
    ))
  where id = p_room;
end $$;

create or replace function public.sd_create_room(p_name text, p_config jsonb, p_avatar text default null)
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
  insert into room_players (room_id, name, seat, avatar) values (room_id, n, 0, _clean_avatar(p_avatar)) returning id into player_id;
  insert into player_secrets (player_id, secret) values (player_id, secret);
  update rooms set host_id = player_id where id = room_id;

  return jsonb_build_object('room_id', room_id, 'code', new_code, 'player_id', player_id, 'secret', secret);
end $$;

create or replace function public.sd_join_room(p_code text, p_name text, p_avatar text default null)
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

  insert into room_players (room_id, name, seat, avatar)
  values (r.id, n, coalesce((select max(seat) + 1 from room_players where room_id = r.id), 0), _clean_avatar(p_avatar))
  returning id into player_id;
  insert into player_secrets (player_id, secret) values (player_id, secret);
  perform _touch(r.id);

  return jsonb_build_object('room_id', r.id, 'code', r.code, 'player_id', player_id, 'secret', secret);
end $$;

create or replace function public.sd_vote(p_room uuid, p_player uuid, p_secret text, p_target uuid, p_comment text default null)
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

  insert into room_votes (room_id, round, voter_id, target_id, comment)
  values (p_room, r.round, p_player, p_target, nullif(left(regexp_replace(trim(coalesce(p_comment, '')), '\s+', ' ', 'g'), 80), ''));
  update rooms set voted_ids = voted_ids || to_jsonb(p_player::text) where id = p_room;
  perform _maybe_close(p_room);
  perform _touch(p_room);
end $$;

create or replace function public.sd_set_avatar(p_room uuid, p_player uuid, p_secret text, p_avatar text)
returns void
language plpgsql security definer set search_path = public as $$
declare r public.rooms := _auth(p_room, p_player, p_secret);
begin
  update room_players set avatar = _clean_avatar(p_avatar) where id = p_player;
  perform _touch(p_room);
end $$;

do $$
declare role_name text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format('revoke all on public.player_secrets, public.room_votes from %I', role_name);
      execute format('revoke insert, update, delete on public.rooms, public.room_players from %I', role_name);
      execute format('grant select on public.rooms, public.room_players to %I', role_name);
      execute format('grant execute on function
        public.sd_create_room(text, jsonb, text), public.sd_join_room(text, text, text),
        public.sd_set_avatar(uuid, uuid, text, text),
        public.sd_update_config(uuid, uuid, text, jsonb), public.sd_kick(uuid, uuid, text, uuid),
        public.sd_leave(uuid, uuid, text), public.sd_start(uuid, uuid, text, jsonb),
        public.sd_skip(uuid, uuid, text), public.sd_vote(uuid, uuid, text, uuid, text),
        public.sd_close_voting(uuid, uuid, text), public.sd_next(uuid, uuid, text),
        public.sd_finish(uuid, uuid, text), public.sd_back_to_lobby(uuid, uuid, text)
        to %I', role_name);
    end if;
  end loop;
end $$;
