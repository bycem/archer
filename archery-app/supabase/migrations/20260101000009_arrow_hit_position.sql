-- Görsel hedef modu: ok düşüş pozisyonu (normalize edilmiş -1..1 koordinat)
alter table public.arrows
  add column if not exists hit_x numeric(5,3),
  add column if not exists hit_y numeric(5,3);

alter table public.arrows
  add constraint arrows_hit_x_range
    check (hit_x is null or (hit_x >= -1.5 and hit_x <= 1.5)) not valid;

alter table public.arrows
  add constraint arrows_hit_y_range
    check (hit_y is null or (hit_y >= -1.5 and hit_y <= 1.5)) not valid;
