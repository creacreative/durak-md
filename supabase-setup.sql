-- Rulează o singură dată în Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 20),
  country text not null default 'MD' check (country in ('MD','RO','IT','UA','DE','GB','US','OTHER')),
  level integer not null default 1 check (level >= 1),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  games integer not null default 0 check (games >= 0),
  first_place integer not null default 0 check (first_place >= 0),
  durak_count integer not null default 0 check (durak_count >= 0),
  coins integer not null default 60 check (coins >= 0),
  owned_cosmetics jsonb not null default '["classic"]'::jsonb,
  equipped_cosmetic text not null default 'classic',
  created_at timestamptz not null default now()
);

-- Istoric de partide, pentru profil personal și pentru a alimenta clasamentul.
create table if not exists public.game_history (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  place integer not null check (place >= 1),
  total_players integer not null check (total_players >= place),
  coins_earned integer not null default 0 check (coins_earned >= 0),
  created_at timestamptz not null default now(),
  unique(game_id, user_id)
);
create index if not exists game_history_user_idx on public.game_history(user_id, created_at desc);

create table if not exists public.public_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6,8}$'),
  name text not null check (char_length(name) between 3 and 30),
  host_id uuid not null references public.profiles(id) on delete cascade,
  players integer not null default 1 check (players between 1 and 6),
  max_players integer not null default 6 check (max_players between 2 and 6),
  status text not null default 'waiting' check (status in ('waiting','playing','closed')),
  created_at timestamptz not null default now()
);
create table if not exists public.public_room_members (
  room_id uuid not null references public.public_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id)
);

alter table public.profiles enable row level security;
alter table public.public_rooms enable row level security;
alter table public.public_room_members enable row level security;

drop policy if exists "authenticated profiles are visible" on public.profiles;
create policy "authenticated profiles are visible" on public.profiles for select to authenticated using (true);
drop policy if exists "users update own safe profile fields" on public.profiles;
create policy "users update own safe profile fields" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);
revoke update on public.profiles from authenticated;
grant update(username,country) on public.profiles to authenticated;

drop policy if exists "authenticated users see rooms" on public.public_rooms;
create policy "authenticated users see rooms" on public.public_rooms for select to authenticated using (true);
drop policy if exists "authenticated users create own rooms" on public.public_rooms;
create policy "authenticated users create own rooms" on public.public_rooms for insert to authenticated with check (auth.uid()=host_id);
drop policy if exists "hosts update own rooms" on public.public_rooms;
create policy "hosts update own rooms" on public.public_rooms for update to authenticated using (auth.uid()=host_id) with check (auth.uid()=host_id);
drop policy if exists "hosts delete own rooms" on public.public_rooms;
create policy "hosts delete own rooms" on public.public_rooms for delete to authenticated using (auth.uid()=host_id);

create or replace function public.create_profile_for_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,username,country)
  values(new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'username'),''),'Jucator-'||left(new.id::text,6)),20), coalesce(new.raw_user_meta_data->>'country','MD'));
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_profile_for_new_user();

create or replace function public.join_public_room(p_room_id uuid) returns text
language plpgsql security definer set search_path=public as $$
declare room_code text;
begin
  if auth.uid() is null then raise exception 'Autentificare necesara'; end if;
  select code into room_code from public.public_rooms where id=p_room_id and status='waiting' and players<max_players for update;
  if room_code is null then raise exception 'Masa este plina sau inchisa'; end if;
  insert into public.public_room_members(room_id,user_id) values(p_room_id,auth.uid()) on conflict do nothing;
  update public.public_rooms r set players=1+(select count(*) from public.public_room_members m where m.room_id=r.id) where r.id=p_room_id;
  return room_code;
end; $$;
revoke all on function public.join_public_room(uuid) from public;
grant execute on function public.join_public_room(uuid) to authenticated;

-- Curăță mesele abandonate după două ore când lista este citită.
create or replace function public.close_stale_rooms() returns void
language sql security definer set search_path=public as $$
  update public.public_rooms set status='closed' where status='waiting' and created_at < now()-interval '2 hours';
$$;
revoke all on function public.close_stale_rooms() from public;

alter table public.game_history enable row level security;
drop policy if exists "authenticated users see game history" on public.game_history;
create policy "authenticated users see game history" on public.game_history for select to authenticated using (true);

-- Singura cale de a scrie un rezultat de partidă: monedele și statisticile
-- se calculează aici, server-side, ca un client rau-intentionat sa nu-si
-- poata acorda monede sau victorii false direct din browser.
create or replace function public.record_game_result(p_game_id text, p_place integer, p_total_players integer) returns jsonb
language plpgsql security definer set search_path=public as $$
declare reward integer; already boolean;
begin
  if auth.uid() is null then raise exception 'Autentificare necesara'; end if;
  if p_place < 1 or p_total_players < p_place then raise exception 'Rezultat invalid'; end if;
  select exists(select 1 from public.game_history where game_id=p_game_id and user_id=auth.uid()) into already;
  if already then
    return (select jsonb_build_object('coins',coins,'already_recorded',true) from public.profiles where id=auth.uid());
  end if;
  reward := case when p_place=1 then 50 when p_place=p_total_players then 8 else 25 end;
  insert into public.game_history(game_id,user_id,place,total_players,coins_earned) values(p_game_id,auth.uid(),p_place,p_total_players,reward);
  update public.profiles set
    games = games+1,
    wins = wins + case when p_place < p_total_players then 1 else 0 end,
    losses = losses + case when p_place = p_total_players then 1 else 0 end,
    first_place = first_place + case when p_place=1 then 1 else 0 end,
    durak_count = durak_count + case when p_place=p_total_players then 1 else 0 end,
    coins = coins + reward
  where id=auth.uid();
  return (select jsonb_build_object('coins',coins,'already_recorded',false) from public.profiles where id=auth.uid());
end; $$;
revoke all on function public.record_game_result(text,integer,integer) from public;
grant execute on function public.record_game_result(text,integer,integer) to authenticated;

-- Cumparare cosmetic: pretul se verifica server-side fata de o lista fixa,
-- ca un client rau-intentionat sa nu poata "cumpara" ceva la pret 0.
create or replace function public.buy_cosmetic(p_cosmetic_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare price integer; owned jsonb; balance integer;
begin
  if auth.uid() is null then raise exception 'Autentificare necesara'; end if;
  price := case p_cosmetic_id
    when 'classic' then 0 when 'kepka' then 70 when 'gospodar' then 120
    when 'punk' then 170 when 'rege' then 240 when 'samurai' then 300
    when 'masa-rosie' then 90 when 'masa-albastra' then 90 when 'carti-aurii' then 150
    when 'rama-argint' then 60 when 'rama-aur' then 160 when 'titlu-gospodar' then 100
    else null end;
  if price is null then raise exception 'Obiect necunoscut'; end if;
  select owned_cosmetics, coins into owned, balance from public.profiles where id=auth.uid() for update;
  if owned ? p_cosmetic_id then return jsonb_build_object('error','already_owned'); end if;
  if balance < price then return jsonb_build_object('error','insufficient_coins'); end if;
  update public.profiles set coins = coins - price, owned_cosmetics = owned_cosmetics || to_jsonb(p_cosmetic_id), equipped_cosmetic = p_cosmetic_id where id=auth.uid();
  return (select jsonb_build_object('coins',coins,'owned',owned_cosmetics) from public.profiles where id=auth.uid());
end; $$;
revoke all on function public.buy_cosmetic(text) from public;
grant execute on function public.buy_cosmetic(text) to authenticated;

create or replace function public.equip_cosmetic(p_cosmetic_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Autentificare necesara'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and owned_cosmetics ? p_cosmetic_id) then
    return jsonb_build_object('error','not_owned');
  end if;
  update public.profiles set equipped_cosmetic = p_cosmetic_id where id=auth.uid();
  return jsonb_build_object('equipped', p_cosmetic_id);
end; $$;
revoke all on function public.equip_cosmetic(text) from public;
grant execute on function public.equip_cosmetic(text) to authenticated;

-- Clasament global: primii 50 dupa victorii, apoi dupa numarul de partide.
create or replace view public.leaderboard as
  select username, country, wins, games, first_place, durak_count
  from public.profiles
  where games > 0
  order by wins desc, games desc
  limit 50;
grant select on public.leaderboard to authenticated;
