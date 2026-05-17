-- Distributed rendering workers, video timelines and render observability

create type public.render_kind as enum ('video', 'image', 'audio', 'thumbnail', 'transcode');
create type public.render_status as enum ('queued', 'active', 'rendering', 'uploading', 'completed', 'failed', 'cancelled', 'dead_letter');

create table public.video_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  width integer not null default 1920,
  height integer not null default 1080,
  fps integer not null default 30,
  duration_ms integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.video_timelines (
  id uuid primary key default gen_random_uuid(),
  video_project_id uuid references public.video_projects(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  version integer not null default 1,
  timeline jsonb not null,
  duration_ms integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.render_workers (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null unique,
  pool text not null,
  hostname text not null,
  version text not null,
  concurrency integer not null default 1,
  gpu_enabled boolean not null default false,
  status text not null default 'starting',
  last_heartbeat_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  kind public.render_kind not null,
  status public.render_status not null default 'queued',
  priority integer not null default 5 check (priority between 1 and 10),
  progress integer not null default 0 check (progress between 0 and 100),
  worker_id text references public.render_workers(worker_id) on delete set null,
  payload jsonb not null,
  result jsonb not null default '{}'::jsonb,
  error_message text,
  attempts integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.render_outputs (
  id uuid primary key default gen_random_uuid(),
  render_job_id uuid not null references public.render_jobs(id) on delete cascade,
  bucket text not null,
  storage_path text not null,
  signed_url text,
  mime_type text not null,
  size_bytes bigint not null default 0,
  width integer,
  height integer,
  duration_ms integer,
  format text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.render_metrics (
  id uuid primary key default gen_random_uuid(),
  render_job_id uuid references public.render_jobs(id) on delete cascade,
  worker_id text references public.render_workers(worker_id) on delete set null,
  metric_name text not null,
  metric_value double precision not null,
  unit text not null default 'count',
  tags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.worker_health (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null references public.render_workers(worker_id) on delete cascade,
  status text not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index video_projects_workspace_idx on public.video_projects(workspace_id, created_at desc);
create index video_timelines_project_idx on public.video_timelines(video_project_id, version desc);
create index render_workers_pool_status_idx on public.render_workers(pool, status, last_heartbeat_at desc);
create index render_jobs_workspace_status_idx on public.render_jobs(workspace_id, status, created_at desc);
create index render_jobs_kind_priority_idx on public.render_jobs(kind, status, priority, created_at);
create index render_outputs_job_idx on public.render_outputs(render_job_id, created_at desc);
create index render_metrics_job_idx on public.render_metrics(render_job_id, metric_name, created_at desc);
create index worker_health_worker_idx on public.worker_health(worker_id, created_at desc);

create trigger video_projects_set_updated_at before update on public.video_projects for each row execute function public.set_updated_at();
create trigger video_timelines_set_updated_at before update on public.video_timelines for each row execute function public.set_updated_at();
create trigger render_workers_set_updated_at before update on public.render_workers for each row execute function public.set_updated_at();
create trigger render_jobs_set_updated_at before update on public.render_jobs for each row execute function public.set_updated_at();

alter table public.video_projects enable row level security;
alter table public.video_timelines enable row level security;
alter table public.render_workers enable row level security;
alter table public.render_jobs enable row level security;
alter table public.render_outputs enable row level security;
alter table public.render_metrics enable row level security;
alter table public.worker_health enable row level security;

create policy video_projects_member_read on public.video_projects for select using (public.is_workspace_member(workspace_id, 'viewer') and deleted_at is null);
create policy video_projects_editor_write on public.video_projects for all using (public.is_workspace_member(workspace_id, 'editor')) with check (public.is_workspace_member(workspace_id, 'editor'));
create policy video_timelines_member_read on public.video_timelines for select using (public.is_workspace_member(workspace_id, 'viewer'));
create policy video_timelines_editor_write on public.video_timelines for all using (public.is_workspace_member(workspace_id, 'editor')) with check (public.is_workspace_member(workspace_id, 'editor'));
create policy render_jobs_member_read on public.render_jobs for select using (public.is_workspace_member(workspace_id, 'viewer'));
create policy render_jobs_editor_insert on public.render_jobs for insert with check (requested_by = auth.uid() and public.is_workspace_member(workspace_id, 'editor'));
create policy render_jobs_service_all on public.render_jobs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy render_outputs_member_read on public.render_outputs for select using (exists (select 1 from public.render_jobs r where r.id = render_job_id and public.is_workspace_member(r.workspace_id, 'viewer')));
create policy render_outputs_service_all on public.render_outputs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy render_observability_admin_read on public.render_workers for select using (auth.role() = 'service_role' or exists (select 1 from public.workspace_members wm where wm.user_id = auth.uid() and wm.role in ('owner','admin') and wm.deleted_at is null));
create policy render_workers_service_all on public.render_workers for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy render_metrics_service_all on public.render_metrics for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy render_metrics_admin_read on public.render_metrics for select using (auth.role() = 'service_role');
create policy worker_health_service_all on public.worker_health for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
