create table if not exists public.favoritos_openfoodfacts (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null references auth.users (id) on delete cascade,
    codigo_produto text not null check (length(trim(codigo_produto)) > 0),
    dados_produto jsonb not null
        check (jsonb_typeof(dados_produto) = 'object'),
    criado_em timestamptz not null default now(),
    constraint favoritos_openfoodfacts_usuario_produto_unique
        unique (usuario_id, codigo_produto)
);

alter table public.favoritos_openfoodfacts enable row level security;

revoke all on table public.favoritos_openfoodfacts from anon;
grant select, insert, delete on table public.favoritos_openfoodfacts to authenticated;

drop policy if exists "Users can view their own Open Food Facts favorites"
    on public.favoritos_openfoodfacts;
create policy "Users can view their own Open Food Facts favorites"
    on public.favoritos_openfoodfacts
    for select
    to authenticated
    using ((select auth.uid()) = usuario_id);

drop policy if exists "Users can save their own Open Food Facts favorites"
    on public.favoritos_openfoodfacts;
create policy "Users can save their own Open Food Facts favorites"
    on public.favoritos_openfoodfacts
    for insert
    to authenticated
    with check ((select auth.uid()) = usuario_id);

drop policy if exists "Users can remove their own Open Food Facts favorites"
    on public.favoritos_openfoodfacts;
create policy "Users can remove their own Open Food Facts favorites"
    on public.favoritos_openfoodfacts
    for delete
    to authenticated
    using ((select auth.uid()) = usuario_id);
