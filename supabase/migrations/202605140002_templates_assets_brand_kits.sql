-- Templates marketplace, asset management, and brand kit extensions

create table if not exists public.template_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

alter table public.templates add column if not exists category_id uuid references public.template_categories(id) on delete set null;
alter table public.templates add column if not exists visibility text not null default 'private' check (visibility in ('private','workspace','public'));
alter table public.templates add column if not exists status text not null default 'draft' check (status in ('draft','review','published','archived'));
alter table public.templates add column if not exists is_featured boolean not null default false;
alter table public.templates add column if not exists is_premium boolean not null default false;
alter table public.templates add column if not exists preview_url text;
alter table public.templates add column if not exists version integer not null default 1 check (version > 0);
alter table public.templates add column if not exists published_at timestamptz;

create table if not exists public.template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  version integer not null check (version > 0),
  fabric_json jsonb not null,
  thumbnail_url text,
  preview_url text,
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(template_id, version)
);

create table if not exists public.template_favorites (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(template_id, user_id)
);

create table if not exists public.asset_folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  parent_id uuid references public.asset_folders(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  path text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(workspace_id, path)
);

alter table public.assets add column if not exists folder_id uuid references public.asset_folders(id) on delete set null;
alter table public.assets add column if not exists tags text[] not null default '{}'::text[];
alter table public.assets add column if not exists checksum text;
alter table public.assets add column if not exists status text not null default 'ready' check (status in ('pending','processing','ready','failed','archived'));
alter table public.assets add column if not exists last_used_at timestamptz;
alter table public.assets add column if not exists cdn_url text;

create table if not exists public.asset_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  color text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(workspace_id, slug)
);

create table if not exists public.asset_favorites (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(asset_id, user_id)
);

create table if not exists public.asset_recent_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null default 'used',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.workspace_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  permissions jsonb not null default '{"viewer":true,"editor":true}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(workspace_id, asset_id)
);

create table if not exists public.brand_colors (
  id uuid primary key default gen_random_uuid(),
  brand_kit_id uuid not null references public.brand_kits(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  value text not null check (value ~* '^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.brand_fonts (
  id uuid primary key default gen_random_uuid(),
  brand_kit_id uuid not null references public.brand_kits(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  family text not null,
  weight text,
  style text,
  asset_id uuid references public.assets(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index if not exists template_categories_slug_idx on public.template_categories(slug) where deleted_at is null;
create index if not exists templates_marketplace_idx on public.templates(visibility, status, is_featured, is_premium, created_at desc) where deleted_at is null;
create index if not exists templates_category_idx on public.templates(category_id, created_at desc) where deleted_at is null;
create index if not exists template_versions_template_idx on public.template_versions(template_id, version desc) where deleted_at is null;
create index if not exists template_favorites_user_idx on public.template_favorites(user_id, created_at desc) where deleted_at is null;
create index if not exists assets_search_idx on public.assets(workspace_id, kind, created_at desc) where deleted_at is null;
create index if not exists assets_tags_gin_idx on public.assets using gin(tags);
create index if not exists asset_folders_workspace_idx on public.asset_folders(workspace_id, path) where deleted_at is null;
create index if not exists asset_favorites_user_idx on public.asset_favorites(user_id, created_at desc) where deleted_at is null;
create index if not exists asset_recent_user_idx on public.asset_recent_events(user_id, created_at desc) where deleted_at is null;
create index if not exists workspace_assets_workspace_idx on public.workspace_assets(workspace_id, created_at desc) where deleted_at is null;
create index if not exists brand_colors_kit_idx on public.brand_colors(brand_kit_id, sort_order) where deleted_at is null;
create index if not exists brand_fonts_kit_idx on public.brand_fonts(brand_kit_id) where deleted_at is null;

create trigger set_template_categories_updated_at before update on public.template_categories for each row execute function public.set_updated_at();
create trigger set_template_versions_updated_at before update on public.template_versions for each row execute function public.set_updated_at();
create trigger set_template_favorites_updated_at before update on public.template_favorites for each row execute function public.set_updated_at();
create trigger set_asset_folders_updated_at before update on public.asset_folders for each row execute function public.set_updated_at();
create trigger set_asset_tags_updated_at before update on public.asset_tags for each row execute function public.set_updated_at();
create trigger set_asset_favorites_updated_at before update on public.asset_favorites for each row execute function public.set_updated_at();
create trigger set_asset_recent_events_updated_at before update on public.asset_recent_events for each row execute function public.set_updated_at();
create trigger set_workspace_assets_updated_at before update on public.workspace_assets for each row execute function public.set_updated_at();
create trigger set_brand_colors_updated_at before update on public.brand_colors for each row execute function public.set_updated_at();
create trigger set_brand_fonts_updated_at before update on public.brand_fonts for each row execute function public.set_updated_at();

create or replace function public.increment_template_version()
returns trigger
language plpgsql
as $$
begin
  if new.fabric_json is distinct from old.fabric_json then
    new.version = old.version + 1;
  end if;
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at = timezone('utc', now());
  end if;
  return new;
end;
$$;

drop trigger if exists increment_template_version on public.templates;
create trigger increment_template_version before update on public.templates for each row execute function public.increment_template_version();

alter table public.template_categories enable row level security;
alter table public.template_versions enable row level security;
alter table public.template_favorites enable row level security;
alter table public.asset_folders enable row level security;
alter table public.asset_tags enable row level security;
alter table public.asset_favorites enable row level security;
alter table public.asset_recent_events enable row level security;
alter table public.workspace_assets enable row level security;
alter table public.brand_colors enable row level security;
alter table public.brand_fonts enable row level security;

create policy template_categories_read on public.template_categories for select using (deleted_at is null);
create policy template_categories_admin_write on public.template_categories for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy template_versions_read on public.template_versions for select using (
  deleted_at is null and exists (
    select 1 from public.templates t
    where t.id = template_id and (t.visibility = 'public' or (t.workspace_id is not null and public.is_workspace_member(t.workspace_id, 'viewer')))
  )
);
create policy template_versions_editor_insert on public.template_versions for insert with check (workspace_id is not null and public.is_workspace_member(workspace_id, 'editor'));

create policy template_favorites_owner on public.template_favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy asset_folders_member_read on public.asset_folders for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy asset_folders_editor_write on public.asset_folders for all using (public.is_workspace_member(workspace_id, 'editor')) with check (public.is_workspace_member(workspace_id, 'editor'));

create policy asset_tags_member_read on public.asset_tags for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy asset_tags_editor_write on public.asset_tags for all using (public.is_workspace_member(workspace_id, 'editor')) with check (public.is_workspace_member(workspace_id, 'editor'));

create policy asset_favorites_owner on public.asset_favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy asset_recent_owner on public.asset_recent_events for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_workspace_member(workspace_id, 'viewer'));
create policy workspace_assets_member_read on public.workspace_assets for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy workspace_assets_editor_write on public.workspace_assets for all using (public.is_workspace_member(workspace_id, 'editor')) with check (public.is_workspace_member(workspace_id, 'editor'));

create policy brand_colors_member_read on public.brand_colors for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy brand_colors_editor_write on public.brand_colors for all using (public.is_workspace_member(workspace_id, 'editor')) with check (public.is_workspace_member(workspace_id, 'editor'));
create policy brand_fonts_member_read on public.brand_fonts for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy brand_fonts_editor_write on public.brand_fonts for all using (public.is_workspace_member(workspace_id, 'editor')) with check (public.is_workspace_member(workspace_id, 'editor'));

insert into public.template_categories(slug, name, sort_order) values
  ('social-media', 'Social Media', 10),
  ('presentations', 'Presentations', 20),
  ('posters', 'Posters', 30),
  ('resumes', 'Resumes', 40),
  ('business', 'Business', 50),
  ('marketing', 'Marketing', 60),
  ('ecommerce', 'Ecommerce', 70),
  ('video', 'Video', 80)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('workspace-assets', 'workspace-assets', false, 104857600, array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','video/mp4','video/webm','application/pdf']),
  ('template-previews', 'template-previews', true, 52428800, array['image/png','image/jpeg','image/webp','image/gif']),
  ('videos', 'videos', false, 524288000, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy storage_workspace_assets_member_read on storage.objects for select using (
  bucket_id in ('workspace-assets','videos') and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id::text = split_part(name, '/', 1) and wm.user_id = auth.uid() and wm.deleted_at is null
  )
);
create policy storage_workspace_assets_editor_insert on storage.objects for insert with check (
  bucket_id in ('workspace-assets','videos') and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id::text = split_part(name, '/', 1) and wm.user_id = auth.uid() and wm.role in ('owner','admin','editor') and wm.deleted_at is null
  )
);
create policy storage_template_previews_read on storage.objects for select using (bucket_id = 'template-previews');
create policy storage_template_previews_editor_insert on storage.objects for insert with check (
  bucket_id = 'template-previews' and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id::text = split_part(name, '/', 1) and wm.user_id = auth.uid() and wm.role in ('owner','admin','editor') and wm.deleted_at is null
  )
);
