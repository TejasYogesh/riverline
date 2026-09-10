-- Run this once in the Supabase SQL Editor.
-- Lets a chat message carry structured chart data (from the show_chart tool)
-- alongside its text, so charts still render when reopening a past chat.
alter table chat_messages add column if not exists chart jsonb;
