# Task 02 — Veritabanı Şeması (Supabase / PostgreSQL)

## Amaç
Tüm uygulama için güçlü tip kontrollü, indekslenmiş, RLS politikalı PostgreSQL şeması oluşturmak.

## Tablolar

### `users`
Supabase Auth `auth.users` ile 1:1 ilişkili profil tablosu.

```sql
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  surname text,
  age int check (age > 0 and age < 120),
  gender text check (gender in ('male','female','other')),
  club text,
  bow_type text check (bow_type in ('recurve','compound','barebow','traditional_turkish')),
  language text not null default 'tr' check (language in ('tr','en')),
  role text not null default 'competitor' check (role in ('admin','competitor')),
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_role_idx on public.users(role);
```

### `tournaments`
```sql
create type tournament_status as enum ('draft','active','completed','cancelled');
create type age_group as enum ('U11','U13','U15','U18','U21','seniors');
create type bow_type as enum ('recurve','compound','barebow','traditional_turkish');
create type target_type as enum (
  'wa_122','wa_80','wa_60','wa_40','three_d','puta','meydan'
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  bow_type bow_type not null,
  age_group age_group not null,
  set_count int not null check (set_count between 3 and 30),
  arrows_per_set int not null check (arrows_per_set in (3,4,5,6)),
  target_type target_type not null,
  distance_meters numeric(5,1) not null check (distance_meters > 0),
  status tournament_status not null default 'active',
  created_by uuid not null references public.users(id),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tournaments_status_idx on public.tournaments(status);
create index tournaments_created_by_idx on public.tournaments(created_by);
create index tournaments_date_idx on public.tournaments(date desc);
```

### `tournament_participants`
```sql
create type participant_status as enum ('pending','approved','rejected');

create table public.tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.users(id),
  target_number text not null, -- "1A", "2B"
  club_override text,           -- profilden farklıysa
  status participant_status not null default 'pending',
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  joined_at timestamptz not null default now(),
  unique (tournament_id, user_id),
  unique (tournament_id, target_number)
);

create index participants_tournament_idx on public.tournament_participants(tournament_id);
create index participants_user_idx on public.tournament_participants(user_id);
create index participants_status_idx on public.tournament_participants(status);
```

### `tournament_qr_tokens`
```sql
create type qr_kind as enum ('competitor','spectator');

create table public.tournament_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  kind qr_kind not null,
  token text not null unique,
  created_at timestamptz not null default now(),
  unique (tournament_id, kind)
);
```

### `sets`
Set-bazlı kilitleme ve commit takibi.

```sql
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.tournament_participants(id) on delete cascade,
  set_number int not null check (set_number > 0),
  is_committed boolean not null default false,
  committed_at timestamptz,
  unique (participant_id, set_number)
);
```

### `arrows`
Atış bazlı puan kayıtları.

```sql
create table public.arrows (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.sets(id) on delete cascade,
  arrow_number int not null check (arrow_number > 0),
  score_value int not null check (score_value between 0 and 11), -- 0=miss, 11=X (3D), normalde 0-10
  is_x boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (set_id, arrow_number)
);

create index arrows_set_idx on public.arrows(set_id);
```

**NOT:** `is_x = true` ise normalde `score_value = 10` (WA standardı). 3D hedefte X = 11 puan.

### `audit_log`
Yönetici puan düzeltmeleri için.

```sql
create table public.audit_log (
  id bigserial primary key,
  actor_id uuid not null references public.users(id),
  action text not null, -- 'score_correction','tournament_end','approval','rejection'
  entity_type text not null,
  entity_id uuid not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_actor_idx on public.audit_log(actor_id);
create index audit_entity_idx on public.audit_log(entity_type, entity_id);
```

## Trigger'lar

### `updated_at` otomatik güncelleme
```sql
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users
  for each row execute function set_updated_at();
create trigger tournaments_updated_at before update on public.tournaments
  for each row execute function set_updated_at();
create trigger arrows_updated_at before update on public.arrows
  for each row execute function set_updated_at();
```

### `is_committed` set'lerinde arrow değişikliğini engelleme
```sql
create or replace function prevent_committed_set_edit()
returns trigger as $$
declare
  committed boolean;
begin
  select is_committed into committed from public.sets where id = coalesce(new.set_id, old.set_id);
  if committed then
    -- Adminler service_role ile bypass edebilir
    raise exception 'Set committed; use admin override path';
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger arrows_lock_check before insert or update or delete on public.arrows
  for each row execute function prevent_committed_set_edit();
```

## Row Level Security (RLS)

```sql
alter table public.users enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.tournament_qr_tokens enable row level security;
alter table public.sets enable row level security;
alter table public.arrows enable row level security;
```

### `users` policies
```sql
-- Herkes kendi profilini okur/yazar
create policy users_self_select on public.users for select using (auth.uid() = id);
create policy users_self_update on public.users for update using (auth.uid() = id);

-- Adminler tüm kullanıcıları görür
create policy users_admin_select on public.users for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);
```

### `tournaments` policies
```sql
-- Herkes (giriş yapmış olsun olmasın) aktif/tamamlanmış turnuvayı okuyabilir
create policy tournaments_public_select on public.tournaments for select using (true);

-- Sadece adminler oluşturup düzenleyebilir
create policy tournaments_admin_all on public.tournaments for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);
```

### `tournament_participants` policies
```sql
-- Kullanıcı kendi katılım kaydını oluşturabilir (status=pending)
create policy participants_self_insert on public.tournament_participants for insert
  with check (auth.uid() = user_id and status = 'pending');

-- Kullanıcı kendi katılım kaydını okur
create policy participants_self_select on public.tournament_participants for select
  using (auth.uid() = user_id);

-- Adminler her şeyi yapabilir
create policy participants_admin_all on public.tournament_participants for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

-- Public read (skor tablosu için onaylanmışları gösteririz)
create policy participants_public_approved on public.tournament_participants for select
  using (status = 'approved');
```

### `arrows` ve `sets` policies
- Yarışmacı kendi `participant_id`'sine bağlı set/arrow'ları yazabilir.
- Herkes okuyabilir (skor tablosu).
- Admin override için `service_role` key Netlify Function tarafında kullanılır.

## Yardımcı View'ler

### `tournament_scoreboard` view
Skor tablosu için optimize edilmiş view.

```sql
create view public.tournament_scoreboard as
select
  tp.id as participant_id,
  tp.tournament_id,
  tp.target_number,
  u.id as user_id,
  u.name,
  u.surname,
  coalesce(tp.club_override, u.club) as club,
  u.gender,
  coalesce(sum(a.score_value), 0) as total,
  count(*) filter (where a.is_x) as x_count,
  count(*) filter (where a.score_value = 10 and not a.is_x) as ten_count,
  count(*) filter (where a.score_value = 9) as nine_count
from public.tournament_participants tp
join public.users u on u.id = tp.user_id
left join public.sets s on s.participant_id = tp.id
left join public.arrows a on a.set_id = s.id
where tp.status = 'approved'
group by tp.id, u.id;
```

## Migrations

`supabase/migrations/` altında zaman damgalı SQL dosyaları:
```
20260101000000_init_users.sql
20260101000001_init_tournaments.sql
20260101000002_init_participants.sql
20260101000003_init_qr_tokens.sql
20260101000004_init_sets_arrows.sql
20260101000005_init_audit.sql
20260101000006_rls_policies.sql
20260101000007_views.sql
20260101000008_triggers.sql
```

## Seed
`supabase/seed.sql` ile test verisi (1 admin, 5 yarışmacı, 1 örnek turnuva).

## Kabul Kriterleri

- [x] Tüm tablolar migration ile oluşturulabiliyor
- [x] RLS aktif ve test edildi (yetki olmayan kullanıcı yetkisiz veri göremiyor)
- [x] Trigger'lar çalışıyor (set committed sonrası arrow düzenlenemiyor)
- [x] View doğru sıralamayı veriyor
- [x] Index'ler oluşturuldu
- [x] Seed verisi yükleniyor

## Bağımlılık
- Task 01
