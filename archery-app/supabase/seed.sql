-- Seed: 1 admin, 5 competitors, 1 sample tournament.
-- NOTE: auth.users rows are created via Supabase Auth in real flow.
-- For local dev, we insert directly into auth.users with a known password hash.

-- Helper: insert into auth.users (local dev only). Password = 'password123' (bcrypt).
-- The handle_new_auth_user trigger creates the public.users rows automatically.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@archery.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', ''),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a1@archery.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', ''),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a2@archery.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', ''),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a3@archery.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', ''),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a4@archery.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', ''),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a5@archery.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '')
on conflict (id) do nothing;

-- Update profile data on the auto-created public.users rows
update public.users set
  name = 'Admin', surname = 'User', role = 'admin',
  age = 35, gender = 'male', club = 'Federation', bow_type = 'recurve',
  profile_completed = true
where id = '00000000-0000-0000-0000-000000000001';

update public.users set
  name = 'Ahmet', surname = 'Yılmaz', age = 22, gender = 'male', club = 'İstanbul OK', bow_type = 'recurve', profile_completed = true
where id = '00000000-0000-0000-0000-000000000011';

update public.users set
  name = 'Ayşe', surname = 'Demir', age = 19, gender = 'female', club = 'Ankara OK', bow_type = 'compound', profile_completed = true
where id = '00000000-0000-0000-0000-000000000012';

update public.users set
  name = 'Mehmet', surname = 'Kaya', age = 28, gender = 'male', club = 'İzmir OK', bow_type = 'barebow', profile_completed = true
where id = '00000000-0000-0000-0000-000000000013';

update public.users set
  name = 'Zeynep', surname = 'Şahin', age = 16, gender = 'female', club = 'Bursa OK', bow_type = 'recurve', profile_completed = true
where id = '00000000-0000-0000-0000-000000000014';

update public.users set
  name = 'Can', surname = 'Öztürk', age = 24, gender = 'male', club = 'İstanbul OK', bow_type = 'traditional_turkish', profile_completed = true
where id = '00000000-0000-0000-0000-000000000015';

-- Sample tournament
insert into public.tournaments (id, name, date, bow_type, age_group, set_count, arrows_per_set, target_type, distance_meters, status, created_by)
values (
  '00000000-0000-0000-0000-0000000000a1',
  'Test Turnuvası 2026',
  current_date,
  'recurve',
  'seniors',
  10,
  3,
  'wa_122',
  70.0,
  'active',
  '00000000-0000-0000-0000-000000000001'
)
on conflict (id) do nothing;

-- Approved participants
insert into public.tournament_participants (tournament_id, user_id, target_number, status, approved_by, approved_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000011', '1A', 'approved', '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000012', '1B', 'approved', '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000013', '2A', 'approved', '00000000-0000-0000-0000-000000000001', now()),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000014', '2B', 'pending', null, null),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000015', '3A', 'pending', null, null)
on conflict do nothing;
