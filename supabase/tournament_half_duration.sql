-- Durata di un tempo (minuti) per categoria.
-- Prima viveva solo in localStorage dello staff (match_settings.half_duration):
-- il pubblico non la riceveva e calcolava il minuto del 2° tempo con 30' fissi.
-- NULL = non impostata → client usa il default 30.
alter table public.tournaments
  add column if not exists half_duration smallint
  check (half_duration is null or half_duration between 1 and 90);

comment on column public.tournaments.half_duration is
  'Minuti per tempo della categoria (live timer admin + minuto 2° tempo sul pubblico). NULL = default 30.';
