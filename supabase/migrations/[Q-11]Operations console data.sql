-- [Q-11] the operations console (Dashboard, Order Board, Payment, Sales Invoice, Finance,
-- Customers, Marketing, Team). Every order, payment, shipment lot, carton, customer,
-- marketing task and team member is one row here; `kind` says which list it belongs to
-- and `data` holds the record itself. Only people on the admin list can read or change it.
-- Safe to run more than once.

create table if not exists ops_records (
  kind        text not null,
  id          text not null,
  data        jsonb not null,
  pos         double precision not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  primary key (kind, id)
);

create index if not exists ops_records_kind_pos on ops_records (kind, pos);

alter table ops_records enable row level security;

drop policy if exists "admins manage operations" on ops_records;
create policy "admins manage operations" on ops_records
  for all using (public.is_admin()) with check (public.is_admin());

-- Live updates: when one person changes an order, everyone else's screen updates
do $$
begin
  alter publication supabase_realtime add table ops_records;
exception
  when duplicate_object then null;   -- already added
  when undefined_object then null;   -- no realtime publication on this project
end $$;
