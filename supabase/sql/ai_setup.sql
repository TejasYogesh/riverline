-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Sets up pgvector + a small knowledge base for the "Ask Riverline" agent.

create extension if not exists vector;

-- Reference data (not per-user), so no RLS needed here.
create table if not exists credit_tips (
  id bigint generated always as identity primary key,
  content text not null,
  embedding vector(768) -- Gemini text-embedding-004 output size
);

-- Cosine-similarity search used by the ask-riverline edge function.
create or replace function match_credit_tips(query_embedding vector(768), match_count int default 3)
returns table (id bigint, content text, similarity float)
language sql stable
as $$
  select id, content, 1 - (embedding <=> query_embedding) as similarity
  from credit_tips
  order by embedding <=> query_embedding
  limit match_count;
$$;
