-- SaaS billing, Stripe subscriptions, usage metering, credits, quotas and invoices

create type public.billing_plan as enum ('free', 'pro', 'team', 'enterprise');
create type public.billing_interval as enum ('month', 'year');
create type public.usage_metric as enum ('ai_prompt', 'ai_image', 'ai_resize', 'ai_enhance', 'export', 'premium_export', 'storage_bytes', 'seat');

create table public.workspace_billing (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  plan_id public.billing_plan not null default 'free',
  billing_status text not null default 'active',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  billing_email text,
  seat_count integer not null default 1 check (seat_count > 0),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  status text not null,
  plan_id public.billing_plan not null,
  interval public.billing_interval not null default 'month',
  quantity integer not null default 1 check (quantity > 0),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.subscription_items (
  id uuid primary key default gen_random_uuid(),
  subscription_id text not null references public.subscriptions(stripe_subscription_id) on delete cascade,
  stripe_subscription_item_id text not null unique,
  stripe_price_id text not null,
  quantity integer not null default 1 check (quantity > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.usage_tracking (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  metric public.usage_metric not null,
  quantity bigint not null check (quantity > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.quota_usage (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  metric public.usage_metric not null,
  used bigint not null default 0 check (used >= 0),
  period_start timestamptz not null,
  period_end timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(workspace_id, metric, period_start)
);

create table public.ai_credits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  credits_granted integer not null default 0 check (credits_granted >= 0),
  credits_used integer not null default 0 check (credits_used >= 0),
  overage_credits integer not null default 0 check (overage_credits >= 0),
  reset_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(workspace_id, period_start)
);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  replayed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  stripe_invoice_id text not null unique,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status text,
  number text,
  currency text not null default 'usd',
  amount_due integer not null default 0,
  amount_paid integer not null default 0,
  hosted_invoice_url text,
  invoice_pdf text,
  period_start timestamptz,
  period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.payment_history (
  id uuid primary key default gen_random_uuid(),
  stripe_invoice_id text references public.invoices(stripe_invoice_id) on delete set null,
  stripe_customer_id text not null,
  status text not null,
  amount integer not null default 0,
  currency text not null default 'usd',
  paid_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index workspace_billing_workspace_idx on public.workspace_billing(workspace_id, plan_id, billing_status);
create index subscriptions_workspace_status_idx on public.subscriptions(workspace_id, status, current_period_end desc);
create index usage_tracking_workspace_metric_idx on public.usage_tracking(workspace_id, metric, created_at desc);
create index quota_usage_workspace_metric_idx on public.quota_usage(workspace_id, metric, period_start desc);
create index ai_credits_workspace_period_idx on public.ai_credits(workspace_id, period_start desc);
create index billing_events_type_created_idx on public.billing_events(event_type, created_at desc);
create index invoices_workspace_created_idx on public.invoices(workspace_id, created_at desc);

create trigger workspace_billing_set_updated_at before update on public.workspace_billing for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger subscription_items_set_updated_at before update on public.subscription_items for each row execute function public.set_updated_at();
create trigger quota_usage_set_updated_at before update on public.quota_usage for each row execute function public.set_updated_at();
create trigger ai_credits_set_updated_at before update on public.ai_credits for each row execute function public.set_updated_at();
create trigger invoices_set_updated_at before update on public.invoices for each row execute function public.set_updated_at();

create or replace function public.increment_quota_usage(target_workspace_id uuid, target_metric public.usage_metric, increment_by bigint, period_start_at timestamptz, period_end_at timestamptz)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare next_used bigint;
begin
  insert into public.quota_usage(workspace_id, metric, used, period_start, period_end)
  values (target_workspace_id, target_metric, increment_by, period_start_at, period_end_at)
  on conflict (workspace_id, metric, period_start)
  do update set used = public.quota_usage.used + increment_by, updated_at = timezone('utc', now())
  returning used into next_used;
  return next_used;
end;
$$;

alter table public.workspace_billing enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_items enable row level security;
alter table public.usage_tracking enable row level security;
alter table public.quota_usage enable row level security;
alter table public.ai_credits enable row level security;
alter table public.billing_events enable row level security;
alter table public.invoices enable row level security;
alter table public.payment_history enable row level security;

create policy workspace_billing_member_read on public.workspace_billing for select using (public.is_workspace_member(workspace_id, 'viewer'));
create policy workspace_billing_admin_write on public.workspace_billing for all using (public.is_workspace_member(workspace_id, 'admin')) with check (public.is_workspace_member(workspace_id, 'admin'));
create policy workspace_billing_service_all on public.workspace_billing for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy subscriptions_member_read on public.subscriptions for select using (public.is_workspace_member(workspace_id, 'viewer'));
create policy subscriptions_service_all on public.subscriptions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy subscription_items_member_read on public.subscription_items for select using (exists (select 1 from public.subscriptions s where s.stripe_subscription_id = subscription_id and public.is_workspace_member(s.workspace_id, 'viewer')));
create policy subscription_items_service_all on public.subscription_items for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy usage_tracking_member_read on public.usage_tracking for select using (public.is_workspace_member(workspace_id, 'viewer'));
create policy usage_tracking_service_all on public.usage_tracking for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy quota_usage_member_read on public.quota_usage for select using (public.is_workspace_member(workspace_id, 'viewer'));
create policy quota_usage_service_all on public.quota_usage for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy ai_credits_member_read on public.ai_credits for select using (public.is_workspace_member(workspace_id, 'viewer'));
create policy ai_credits_service_all on public.ai_credits for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy billing_events_service_all on public.billing_events for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy invoices_member_read on public.invoices for select using (workspace_id is not null and public.is_workspace_member(workspace_id, 'viewer'));
create policy invoices_service_all on public.invoices for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy payment_history_service_all on public.payment_history for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
