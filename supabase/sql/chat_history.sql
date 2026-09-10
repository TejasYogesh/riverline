-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Adds persistent chat history for the "Ask Riverline" agent: multiple named
-- sessions per user, each with its own message list and Gemini interaction chain.

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  last_interaction_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_idx on chat_messages(session_id, created_at);

alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

create policy "own chat sessions" on chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own chat messages" on chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
