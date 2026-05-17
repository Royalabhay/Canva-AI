-- AI workflow engine persistence, auditing, prompt history, and usage billing hooks

create table if not exists public.ai_workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  workflow_type text not null check (workflow_type in ('prompt_to_design','resize','enhance','template_generation','image_generation','background_removal')),
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  model text,
  trace jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.ai_workflows(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  generation_type text not null check (generation_type in ('design','image','template','copy','palette','layout','resize','enhancement')),
  prompt text not null,
  result jsonb not null default '{}'::jsonb,
  fabric_json jsonb,
  thumbnail_url text,
  status text not null default 'completed' check (status in ('queued','running','completed','failed','cancelled')),
  model text,
  token_input integer not null default 0,
  token_output integer not null default 0,
  cost_cents integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  workflow_id uuid references public.ai_workflows(id) on delete set null,
  model text not null,
  provider text not null default 'openai',
  operation text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  credits integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.ai_prompt_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  prompt text not null,
  sanitized_prompt text not null,
  prompt_hash text not null,
  workflow_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.ai_template_generations (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.ai_workflows(id) on delete set null,
  template_id uuid references public.templates(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  prompt text not null,
  category text,
  status text not null default 'completed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index if not exists ai_workflows_workspace_status_idx on public.ai_workflows(workspace_id, status, created_at desc) where deleted_at is null;
create index if not exists ai_generations_workspace_type_idx on public.ai_generations(workspace_id, generation_type, created_at desc) where deleted_at is null;
create index if not exists ai_usage_workspace_created_idx on public.ai_usage_logs(workspace_id, created_at desc) where deleted_at is null;
create index if not exists ai_prompt_history_user_idx on public.ai_prompt_history(user_id, created_at desc) where deleted_at is null;
create index if not exists ai_prompt_history_hash_idx on public.ai_prompt_history(prompt_hash) where deleted_at is null;
create index if not exists ai_template_generations_workspace_idx on public.ai_template_generations(workspace_id, created_at desc) where deleted_at is null;

create trigger set_ai_workflows_updated_at before update on public.ai_workflows for each row execute function public.set_updated_at();
create trigger set_ai_generations_updated_at before update on public.ai_generations for each row execute function public.set_updated_at();
create trigger set_ai_usage_logs_updated_at before update on public.ai_usage_logs for each row execute function public.set_updated_at();
create trigger set_ai_prompt_history_updated_at before update on public.ai_prompt_history for each row execute function public.set_updated_at();
create trigger set_ai_template_generations_updated_at before update on public.ai_template_generations for each row execute function public.set_updated_at();

alter table public.ai_workflows enable row level security;
alter table public.ai_generations enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.ai_prompt_history enable row level security;
alter table public.ai_template_generations enable row level security;

create policy ai_workflows_member_read on public.ai_workflows for select using (workspace_id is null or public.is_workspace_member(workspace_id, 'viewer'));
create policy ai_workflows_editor_write on public.ai_workflows for all using (workspace_id is null or public.is_workspace_member(workspace_id, 'editor')) with check (workspace_id is null or public.is_workspace_member(workspace_id, 'editor'));
create policy ai_generations_member_read on public.ai_generations for select using (workspace_id is null or public.is_workspace_member(workspace_id, 'viewer'));
create policy ai_generations_editor_write on public.ai_generations for all using (workspace_id is null or public.is_workspace_member(workspace_id, 'editor')) with check (workspace_id is null or public.is_workspace_member(workspace_id, 'editor'));
create policy ai_usage_member_read on public.ai_usage_logs for select using (workspace_id is null or public.is_workspace_member(workspace_id, 'admin'));
create policy ai_usage_insert on public.ai_usage_logs for insert with check (workspace_id is null or public.is_workspace_member(workspace_id, 'viewer'));
create policy ai_prompt_history_owner on public.ai_prompt_history for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_template_generations_member_read on public.ai_template_generations for select using (workspace_id is null or public.is_workspace_member(workspace_id, 'viewer'));
create policy ai_template_generations_editor_write on public.ai_template_generations for all using (workspace_id is null or public.is_workspace_member(workspace_id, 'editor')) with check (workspace_id is null or public.is_workspace_member(workspace_id, 'editor'));
