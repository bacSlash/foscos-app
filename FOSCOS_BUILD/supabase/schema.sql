-- FoSCoS Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── USERS ────────────────────────────────────────────────────────────────────
create table if not exists users (
  id            uuid primary key default uuid_generate_v4(),
  firebase_uid  text unique not null,
  mobile        text unique not null,
  role          text not null check (role in ('fbo', 'consumer', 'agent', 'officer')),
  name          text,
  email         text,
  created_at    timestamptz default now()
);

-- ─── APPLICATIONS ─────────────────────────────────────────────────────────────
create table if not exists applications (
  id            uuid primary key default uuid_generate_v4(),
  app_number    text unique not null,   -- e.g. FSSAI-2026-38642
  user_id       uuid references users(id) on delete cascade,
  tier          text not null check (tier in ('basic', 'state', 'central', 'temp')),
  status        text not null default 'submitted'
                  check (status in ('submitted','docs_review','under_review','inspection','approved','rejected')),
  details       jsonb not null default '{}',  -- all form field values
  cart          jsonb not null default '[]',  -- OSS cart items
  fee_total     integer not null default 0,
  duration      integer not null default 1,
  filed_at      timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── DOCUMENTS ────────────────────────────────────────────────────────────────
create table if not exists documents (
  id              uuid primary key default uuid_generate_v4(),
  application_id  uuid references applications(id) on delete cascade,
  user_id         uuid references users(id) on delete cascade,
  doc_key         text not null,          -- e.g. 'photo_id', 'address_proof'
  doc_label       text not null,
  storage_path    text,                   -- Supabase Storage path
  file_name       text,
  mime_type       text,
  status          text not null default 'pending'
                    check (status in ('pending','verified','flagged','missing')),
  officer_note    text,
  uploaded_at     timestamptz default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid references users(id)
);

-- ─── LICENSES ─────────────────────────────────────────────────────────────────
create table if not exists licenses (
  id              uuid primary key default uuid_generate_v4(),
  application_id  uuid references applications(id),
  user_id         uuid references users(id) on delete cascade,
  license_number  text unique not null,
  license_type    text not null,
  business_name   text not null,
  status          text not null default 'active' check (status in ('active','expired','suspended')),
  issued_at       timestamptz default now(),
  expires_at      timestamptz not null,
  details         jsonb not null default '{}'
);

-- ─── GRIEVANCES ───────────────────────────────────────────────────────────────
create table if not exists grievances (
  id              uuid primary key default uuid_generate_v4(),
  complaint_id    text unique not null,   -- e.g. GRV-2026-001
  consumer_id     uuid references users(id),
  fbo_name        text not null,
  fbo_license     text,
  food_rating     integer check (food_rating between 1 and 5),
  hygiene_rating  integer check (hygiene_rating between 1 and 5),
  premises_rating integer check (premises_rating between 1 and 5),
  issues          jsonb default '[]',
  comments        text,
  status          text not null default 'submitted'
                    check (status in ('submitted','under_review','resolved')),
  priority        text default 'normal' check (priority in ('critical','high','normal')),
  officer_id      uuid references users(id),
  filed_at        timestamptz default now(),
  resolved_at     timestamptz
);

-- ─── AGENT CLIENTS ────────────────────────────────────────────────────────────
create table if not exists agent_clients (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid references users(id) on delete cascade,
  client_id   uuid references users(id) on delete cascade,
  linked_at   timestamptz default now(),
  unique (agent_id, client_id)
);

-- ─── INSPECTIONS ──────────────────────────────────────────────────────────────
create table if not exists inspections (
  id              uuid primary key default uuid_generate_v4(),
  application_id  uuid references applications(id),
  officer_id      uuid references users(id),
  scheduled_at    timestamptz,
  status          text default 'scheduled' check (status in ('scheduled','completed','missed')),
  notes           text,
  created_at      timestamptz default now()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
create index if not exists idx_applications_user on applications(user_id);
create index if not exists idx_applications_status on applications(status);
create index if not exists idx_documents_application on documents(application_id);
create index if not exists idx_documents_status on documents(status);
create index if not exists idx_grievances_consumer on grievances(consumer_id);
create index if not exists idx_licenses_user on licenses(user_id);
create index if not exists idx_agent_clients_agent on agent_clients(agent_id);

-- ─── REALTIME ─────────────────────────────────────────────────────────────────
-- Run these in Supabase Dashboard → Database → Replication → Enable for:
-- alter publication supabase_realtime add table documents;
-- alter publication supabase_realtime add table applications;

-- ─── STORAGE POLICIES ─────────────────────────────────────────────────────────
-- After creating 'documents' bucket in Storage dashboard, run:
-- (Supabase RLS for storage — authenticated users can upload/read their own files)

-- insert policy
create policy "Users can upload their own documents"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- select policy
create policy "Users can read their own documents"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- officer select policy (officers can read all documents)
create policy "Officers can read all documents"
  on storage.objects for select
  using (bucket_id = 'documents');

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
alter table users enable row level security;
alter table applications enable row level security;
alter table documents enable row level security;
alter table licenses enable row level security;
alter table grievances enable row level security;

-- Users can read/update their own row
create policy "users_own" on users for all using (firebase_uid = current_setting('request.jwt.claims', true)::jsonb->>'sub');

-- Applications: owner can read/insert; officers can read all
create policy "apps_owner" on applications for all using (
  user_id = (select id from users where firebase_uid = current_setting('request.jwt.claims', true)::jsonb->>'sub')
);

-- Documents: same as applications
create policy "docs_owner" on documents for all using (
  user_id = (select id from users where firebase_uid = current_setting('request.jwt.claims', true)::jsonb->>'sub')
);

-- ─── SAMPLE OFFICER USER ──────────────────────────────────────────────────────
-- After setting up, insert an officer record manually:
-- insert into users (firebase_uid, mobile, role, name) values ('OFFICER_FIREBASE_UID', '9999999999', 'officer', 'Rajesh Kumar');
