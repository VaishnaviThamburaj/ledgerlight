-- Ledgerlight: one-time Supabase setup
-- Paste this whole file into Supabase -> SQL Editor -> New query, then click "Run".
-- It is safe to run more than once.

-- 1. The invoices table (one row per uploaded document)
create table if not exists public.invoices (
  id               uuid primary key,
  file_name        text not null,
  file_path        text not null,
  status           text not null default 'needs_review'
                   check (status in ('needs_review', 'approved')),
  vendor_name      text,
  invoice_number   text,
  invoice_date     text,
  total            numeric(14, 2),
  data             jsonb not null,      -- current, human-corrected values
  original_data    jsonb not null,      -- exactly what the AI read (audit trail)
  extraction       jsonb not null,      -- which reader, confidence scores, notes
  verified_targets jsonb not null default '[]'::jsonb,
  approval_note    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  approved_at      timestamptz
);

create index if not exists invoices_status_idx   on public.invoices (status, created_at desc);
create index if not exists invoices_vendor_inv_idx on public.invoices (lower(vendor_name), lower(invoice_number));

-- 2. Lock the table. Only the app's server (using your secret key) can read or
--    write it. Browsers and the public "anon" key get nothing.
alter table public.invoices enable row level security;

-- 3. A private storage bucket for the original PDFs (max 25 MB each)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoices', 'invoices', false, 26214400, array['application/pdf'])
on conflict (id) do nothing;
