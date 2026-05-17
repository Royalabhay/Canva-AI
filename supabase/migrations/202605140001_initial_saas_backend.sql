-- Canva AI production SaaS backend schema

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create type public.workspace_role as enum ('owner', 'admin', 'editor', 'viewer');
create type public.asset_kind as enum ('image', 'video', 'font', 'audio', 'document', 'other');
create type public.activity_action as enum ('created', 'updated', 'deleted', 'duplicated', 'uploaded', 'exported', 'invited');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(owner_id, slug)
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'viewer',
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(workspace_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  thumbnail_url text,
  metadata jsonb not null default '{}'::jsonb,
  last_opened_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(workspace_id, slug)
);

create table public.designs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  fabric_json jsonb not null default '{"version":"6","objects":[]}'::jsonb,
  width integer not null default 1920 check (width > 0),
  height integer not null default 1080 check (height > 0),
  thumbnail_url text,
  metadata jsonb not null default '{}'::jsonb,
  autosaved_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.design_elements (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  fabric_object_id text not null,
  object_type text not null,
  properties jsonb not null default '{}'::jsonb,
  z_index integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(design_id, fabric_object_id)
);

create table public.design_versions (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  version integer not null check (version > 0),
  fabric_json jsonb not null,
  thumbnail_url text,
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(design_id, version)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind public.asset_kind not null default 'image',
  bucket text not null,
  path text not null,
  filename text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes > 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  public_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(bucket, path)
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  category text,
  fabric_json jsonb not null,
  thumbnail_url text,
  is_public boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  colors jsonb not null default '[]'::jsonb,
  fonts jsonb not null default '[]'::jsonb,
  logos jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action public.activity_action not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index profiles_email_idx on public.profiles(email) where deleted_at is null;
create index organizations_owner_idx on public.organizations(owner_id) where deleted_at is null;
create index workspaces_owner_idx on public.workspaces(owner_id) where deleted_at is null;
create index workspace_members_user_idx on public.workspace_members(user_id) where deleted_at is null;
create index workspace_members_workspace_idx on public.workspace_members(workspace_id) where deleted_at is null;
create index projects_workspace_updated_idx on public.projects(workspace_id, updated_at desc) where deleted_at is null;
create index projects_owner_idx on public.projects(owner_id) where deleted_at is null;
create index designs_project_idx on public.designs(project_id) where deleted_at is null;
create index designs_workspace_idx on public.designs(workspace_id) where deleted_at is null;
create index design_elements_design_z_idx on public.design_elements(design_id, z_index) where deleted_at is null;
create index design_versions_design_version_idx on public.design_versions(design_id, version desc) where deleted_at is null;
create index assets_workspace_kind_idx on public.assets(workspace_id, kind, created_at desc) where deleted_at is null;
create index templates_public_idx on public.templates(is_public, category) where deleted_at is null;
create index brand_kits_workspace_idx on public.brand_kits(workspace_id) where deleted_at is null;
create index activity_logs_workspace_idx on public.activity_logs(workspace_id, created_at desc) where deleted_at is null;

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger set_workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger set_workspace_members_updated_at before update on public.workspace_members for each row execute function public.set_updated_at();
create trigger set_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger set_designs_updated_at before update on public.designs for each row execute function public.set_updated_at();
create trigger set_design_elements_updated_at before update on public.design_elements for each row execute function public.set_updated_at();
create trigger set_design_versions_updated_at before update on public.design_versions for each row execute function public.set_updated_at();
create trigger set_assets_updated_at before update on public.assets for each row execute function public.set_updated_at();
create trigger set_templates_updated_at before update on public.templates for each row execute function public.set_updated_at();
create trigger set_brand_kits_updated_at before update on public.brand_kits for each row execute function public.set_updated_at();
create trigger set_activity_logs_updated_at before update on public.activity_logs for each row execute function public.set_updated_at();

create or replace function public.is_workspace_member(target_workspace_id uuid, minimum_role public.workspace_role default 'viewer')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.deleted_at is null
      and (
        minimum_role = 'viewer'
        or wm.role in ('owner', 'admin', 'editor') and minimum_role = 'editor'
        or wm.role in ('owner', 'admin') and minimum_role = 'admin'
        or wm.role = 'owner' and minimum_role = 'owner'
      )
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_id uuid;
begin
  insert into public.profiles(id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, avatar_url = excluded.avatar_url;

  insert into public.workspaces(owner_id, name, slug)
  values (new.id, 'Personal Workspace', concat('personal-', substring(new.id::text from 1 for 8)))
  returning id into workspace_id;

  insert into public.workspace_members(workspace_id, user_id, role, accepted_at)
  values (workspace_id, new.id, 'owner', timezone('utc', now()));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.increment_design_version()
returns trigger
language plpgsql
as $$
begin
  if new.fabric_json is distinct from old.fabric_json then
    new.version = old.version + 1;
    new.autosaved_at = coalesce(new.autosaved_at, timezone('utc', now()));
  end if;
  return new;
end;
$$;

create trigger increment_design_version before update on public.designs for each row execute function public.increment_design_version();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.designs enable row level security;
alter table public.design_elements enable row level security;
alter table public.design_versions enable row level security;
alter table public.assets enable row level security;
alter table public.templates enable row level security;
alter table public.brand_kits enable row level security;
alter table public.activity_logs enable row level security;

create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_member_select on public.organizations for select using (owner_id = auth.uid() and deleted_at is null);
create policy organizations_owner_write on public.organizations for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy workspaces_member_select on public.workspaces for select using (public.is_workspace_member(id, 'viewer') and deleted_at is null);
create policy workspaces_owner_insert on public.workspaces for insert with check (owner_id = auth.uid());
create policy workspaces_admin_update on public.workspaces for update using (public.is_workspace_member(id, 'admin')) with check (public.is_workspace_member(id, 'admin'));

create policy workspace_members_select on public.workspace_members for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy workspace_members_admin_write on public.workspace_members for all using (public.is_workspace_member(workspace_id, 'admin')) with check (public.is_workspace_member(workspace_id, 'admin'));

create policy projects_member_select on public.projects for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy projects_editor_insert on public.projects for insert with check (owner_id = auth.uid() and public.is_workspace_member(workspace_id, 'editor'));
create policy projects_editor_update on public.projects for update using (public.is_workspace_member(workspace_id, 'editor')) with check (public.is_workspace_member(workspace_id, 'editor'));
create policy projects_admin_delete on public.projects for delete using (public.is_workspace_member(workspace_id, 'admin'));

create policy designs_member_select on public.designs for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy designs_editor_insert on public.designs for insert with check (owner_id = auth.uid() and public.is_workspace_member(workspace_id, 'editor'));
create policy designs_editor_update on public.designs for update using (public.is_workspace_member(workspace_id, 'editor')) with check (public.is_workspace_member(workspace_id, 'editor'));
create policy designs_admin_delete on public.designs for delete using (public.is_workspace_member(workspace_id, 'admin'));

create policy design_elements_member_select on public.design_elements for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy design_elements_editor_write on public.design_elements for all using (public.is_workspace_member(workspace_id, 'editor')) with check (public.is_workspace_member(workspace_id, 'editor'));

create policy design_versions_member_select on public.design_versions for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy design_versions_editor_insert on public.design_versions for insert with check (public.is_workspace_member(workspace_id, 'editor'));

create policy assets_member_select on public.assets for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy assets_editor_insert on public.assets for insert with check (owner_id = auth.uid() and public.is_workspace_member(workspace_id, 'editor'));
create policy assets_owner_update on public.assets for update using (owner_id = auth.uid() or public.is_workspace_member(workspace_id, 'admin')) with check (owner_id = auth.uid() or public.is_workspace_member(workspace_id, 'admin'));

create policy templates_public_or_member_select on public.templates for select using (is_public = true or (workspace_id is not null and public.is_workspace_member(workspace_id, 'viewer')));
create policy templates_editor_write on public.templates for all using (workspace_id is not null and public.is_workspace_member(workspace_id, 'editor')) with check (workspace_id is not null and public.is_workspace_member(workspace_id, 'editor'));

create policy brand_kits_member_select on public.brand_kits for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy brand_kits_editor_write on public.brand_kits for all using (public.is_workspace_member(workspace_id, 'editor')) with check (public.is_workspace_member(workspace_id, 'editor'));

create policy activity_logs_member_select on public.activity_logs for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy activity_logs_member_insert on public.activity_logs for insert with check (actor_id = auth.uid() and public.is_workspace_member(workspace_id, 'viewer'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('uploads', 'uploads', false, 52428800, array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','video/mp4','application/pdf']),
  ('exports', 'exports', false, 104857600, array['image/png','image/jpeg','application/pdf','video/mp4']),
  ('templates', 'templates', false, 52428800, array['image/png','image/jpeg','image/webp','application/json']),
  ('brand-assets', 'brand-assets', false, 52428800, array['image/png','image/jpeg','image/webp','image/svg+xml','font/ttf','font/otf','font/woff','font/woff2'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy storage_workspace_member_read on storage.objects for select using (
  bucket_id in ('uploads','exports','templates','brand-assets')
  and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id::text = split_part(name, '/', 1)
      and wm.user_id = auth.uid()
      and wm.deleted_at is null
  )
);

create policy storage_workspace_editor_insert on storage.objects for insert with check (
  bucket_id in ('uploads','exports','templates','brand-assets')
  and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id::text = split_part(name, '/', 1)
      and wm.user_id = auth.uid()
      and wm.role in ('owner','admin','editor')
      and wm.deleted_at is null
  )
);

create policy storage_workspace_owner_update on storage.objects for update using (owner = auth.uid());
create policy storage_workspace_owner_delete on storage.objects for delete using (owner = auth.uid());
