// One-off script: embeds a handful of credit-health tips with Gemini and
// inserts them into the `credit_tips` table (see supabase/sql/ai_setup.sql).
// Run: node scripts/seed-credit-tips.mjs
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  const env = {};
  for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return env;
}

const env = { ...loadEnv(new URL('../.env', import.meta.url)), ...process.env };
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Missing Supabase env vars in .env');
if (!GEMINI_API_KEY) throw new Error('Add GEMINI_API_KEY=... to .env (not EXPO_PUBLIC_ prefixed)');

const TIPS = [
  'Keeping any single card’s utilization under 30% helps your credit score, even if your overall utilization across all cards is low.',
  'Utilization is calculated per card AND across all your cards combined — a maxed-out card can hurt your score even if others are empty.',
  'Paying at least the minimum by the due date matters more for your score than the size of the payment — missed payments hurt far more than high utilization.',
  'Paying down a balance before the statement closing date (not just the due date) can lower the balance that gets reported to credit bureaus.',
  'Closing an old credit card can shorten your credit history and raise your utilization on remaining cards — often better to keep it open with occasional small use.',
  'The debt avalanche method (pay off the highest-interest card first) saves the most money; the debt snowball method (smallest balance first) builds momentum through quick wins.',
  'Multiple hard inquiries in a short window (opening several new cards at once) can temporarily lower your score.',
  'A sudden drop in available credit — like a card issuer lowering your limit — raises your utilization ratio even if your spending hasn’t changed.',
];

async function embed(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: 768 }),
    },
  );
  if (!res.ok) throw new Error(`Gemini embed failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.embedding.values;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let inserted = 0;
for (const content of TIPS) {
  const embedding = await embed(content);
  const { error } = await supabase.from('credit_tips').insert({ content, embedding });
  if (error) throw new Error(`Insert failed for "${content.slice(0, 40)}...": ${error.message}`);
  inserted++;
  console.log(`[${inserted}/${TIPS.length}] seeded`);
}

if (inserted !== TIPS.length) throw new Error('Seed count mismatch');
console.log(`Done. Seeded ${inserted} credit tips.`);
