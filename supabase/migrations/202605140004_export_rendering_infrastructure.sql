-- Production export, rendering, queue, and thumbnail infrastructure

create type public.export_format as enum ('png', 'jpg', 'svg', 'pdf', 'mp4');
create type public.export_status as enum ('queued', 'active', 'rendering', 'uploading', 'completed', 'failed', 'cancelled');
create type public.thumbnail_subject_type as enum ('project', 'template', 'design', 'ai_preview');

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  design_id uuid references public.designs(id) on delete set null,
  template_id uuid references public.templates(id) on delete set null,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  format public.export_format not null,
  status public.export_status not null default 'queued',
  options jsonb not null default '{}'::jsonb,
  bucket text,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  page_count integer not null default 1 check (page_count > 0),
  progress integer not null default 0 check (progress between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  signed_url_expires_at timestamptz,
  expires_at timestamptz default (timezone('utc', now()) + interval '7 days'),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  export_id uuid not null references public.exports(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  status public.export_status not null default 'queued',
  priority integer not null default 5 check (priority between 1 and 10),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts > 0),
  progress integer not null default 0 check (progress between 0 and 100),
  payload jsonb not null,
  result jsonb not null default '{}'::jsonb,
  last_error text,
  locked_by text,
  locked_at timestamptz,
  scheduled_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.render_tasks (
  id uuid primary key default gen_random_uuid(),
  export_id uuid not null references public.exports(id) on delete cascade,
  export_job_id uuid not null references public.export_jobs(id) on delete cascade,
  status public.export_status not null default 'queued',
  renderer text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  duration_ms integer,
  memory_peak_mb integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.thumbnails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_type public.thumbnail_subject_type not null,
  subject_id uuid not null,
  bucket text not null,
  storage_path text not null,
  mime_type text not null default 'image/webp',
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(workspace_id, subject_type, subject_id)
);

create index exports_workspace_status_idx on public.exports(workspace_id, status, created_at desc);
create index exports_requested_by_idx on public.exports(requested_by, created_at desc);
create index export_jobs_status_priority_idx on public.export_jobs(status, priority, scheduled_at);
create index export_jobs_export_id_idx on public.export_jobs(export_id);
create index render_tasks_job_idx on public.render_tasks(export_job_id, created_at desc);
create index thumbnails_subject_idx on public.thumbnails(workspace_id, subject_type, subject_id);

create trigger exports_set_updated_at before update on public.exports for each row execute function public.set_updated_at();
create trigger export_jobs_set_updated_at before update on public.export_jobs for each row execute function public.set_updated_at();
create trigger render_tasks_set_updated_at before update on public.render_tasks for each row execute function public.set_updated_at();
create trigger thumbnails_set_updated_at before update on public.thumbnails for each row execute function public.set_updated_at();

alter table public.exports enable row level security;
alter table public.export_jobs enable row level security;
alter table public.render_tasks enable row level security;
alter table public.thumbnails enable row level security;

create policy exports_member_read on public.exports for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy exports_editor_insert on public.exports for insert with check (requested_by = auth.uid() and public.is_workspace_member(workspace_id, 'editor'));
create policy exports_owner_update on public.exports for update using (requested_by = auth.uid() or public.is_workspace_member(workspace_id, 'admin')) with check (requested_by = auth.uid() or public.is_workspace_member(workspace_id, 'admin'));
create policy exports_service_all on public.exports for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy export_jobs_member_read on public.export_jobs for select using (public.is_workspace_member(workspace_id, 'viewer'));
create policy export_jobs_service_all on public.export_jobs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy render_tasks_member_read on public.render_tasks for select using (exists (select 1 from public.exports e where e.id = export_id and public.is_workspace_member(e.workspace_id, 'viewer')));
create policy render_tasks_service_all on public.render_tasks for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy thumbnails_member_read on public.thumbnails for select using (public.is_workspace_member(workspace_id, 'viewer'));
create policy thumbnails_service_all on public.thumbnails for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('exports', 'exports', false, 524288000, array['image/png','image/jpeg','image/svg+xml','application/pdf','video/mp4']),
  ('thumbnails', 'thumbnails', false, 10485760, array['image/png','image/jpeg','image/webp']),
  ('render-temp', 'render-temp', false, 524288000, array['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf','video/mp4','application/octet-stream'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy storage_exports_member_read on storage.objects for select using (
  bucket_id in ('exports','thumbnails') and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id::text = split_part(name, '/', 1)
      and wm.user_id = auth.uid()
      and wm.deleted_at is null
  )
);

create policy storage_exports_service_write on storage.objects for all using (bucket_id in ('exports','thumbnails','render-temp') and auth.role() = 'service_role') with check (bucket_id in ('exports','thumbnails','render-temp') and auth.role() = 'service_role');
