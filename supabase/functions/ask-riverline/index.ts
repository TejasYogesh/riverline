// "Ask Riverline" - a small tool-calling chat agent over the user's own
// credit_cards/bills data plus a pgvector knowledge base of credit tips.
// Deploy: npx supabase functions deploy ask-riverline
import { GoogleGenAI } from "npm:@google/genai";
import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Riverline's in-app financial assistant, shown in a small mobile chat bubble. You help the user understand their own credit card utilization and upcoming bills.
Rules:
- Always call get_account_snapshot before stating any of the user's real numbers (balances, limits, utilization %, bills). Never guess or make up numbers.
- Call search_credit_tips for "why"/"how" questions about credit health, or when general advice would help - and mention it's a general tip, not their own data.
- Call show_chart whenever the user asks to see/chart/graph/compare/visualize their cards or bills - the chart is rendered separately, so keep your own text reply short (1 sentence) when you call it. Mention once that they can switch it to a bar, pie, line, or scatter view right on the chart.
- Reply in plain sentences only: no markdown (no headers, no **bold**, no bullet lists, no horizontal rules).
- Maximum 3 short sentences. Lead with the direct answer, skip disclaimers and caveats.
- All amounts are in Indian Rupees - always format them as ₹ followed by the number (e.g. ₹36,000), never $.`;

const TOOLS = [
  {
    type: "function",
    name: "get_account_snapshot",
    description:
      "Returns the current user's credit cards (with utilization %) and unpaid upcoming bills. Call this before answering any question about the user's own balances, limits, or bills.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "search_credit_tips",
    description:
      'Searches a knowledge base of general credit-health tips (not the user\'s own data). Use for "why does X matter" or general advice questions.',
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The question or topic to search tips for",
        },
      },
      required: ["query"],
    },
  },
  {
    type: "function",
    name: "show_chart",
    description:
      "Renders a chart in the chat for the user's own data (the user can also switch chart type afterwards in the UI, so just pick the most sensible default). Call this whenever the user asks to 'show', 'chart', 'graph', 'visualize', or 'compare' their cards or bills, instead of (or alongside) describing the numbers in text.",
    parameters: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: ["utilization", "balance", "bills"],
          description:
            "utilization: % used per card. balance: current balance per card. bills: amount per upcoming unpaid bill.",
        },
        chart_type: {
          type: "string",
          enum: ["bar", "pie", "line", "scatter"],
          description:
            "bar/pie: compare categories. line: see values in sequence (good for bills by due date). scatter: see the relationship between two numbers per item (credit limit vs balance for cards, or days-until-due vs amount for bills). Defaults to bar.",
        },
      },
      required: ["metric"],
    },
  },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function getAccountSnapshot(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const [{ data: cards }, { data: bills }] = await Promise.all([
    supabase
      .from("credit_cards")
      .select("name,bank,credit_limit,current_balance")
      .eq("user_id", userId),
    supabase
      .from("bills")
      .select("title,amount,due_date,status")
      .eq("user_id", userId)
      .neq("status", "paid")
      .order("due_date", { ascending: true }),
  ]);

  const cardsWithPct = (cards ?? []).map((c: any) => ({
    ...c,
    utilization_pct:
      c.credit_limit > 0
        ? Math.round((c.current_balance / c.credit_limit) * 100)
        : 0,
  }));

  return { cards: cardsWithPct, upcoming_bills: bills ?? [] };
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

async function getChartData(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  metric: string,
  chartType: string,
) {
  if (metric === "bills") {
    const { data: bills } = await supabase
      .from("bills")
      .select("title,amount,due_date")
      .eq("user_id", userId)
      .neq("status", "paid")
      .order("due_date", { ascending: true })
      .limit(8);
    const rows = bills ?? [];
    return {
      type: chartType,
      metric: "bills",
      unit: "currency",
      labels: rows.map((b: any) => b.title),
      values: rows.map((b: any) => b.amount),
      // scatter: urgency (days until due) vs size (amount)
      points: rows.map((b: any) => ({ x: daysUntil(b.due_date), y: b.amount, label: b.title })),
      xLabel: "Days until due",
      yLabel: "Amount (₹)",
    };
  }

  const { data: cards } = await supabase
    .from("credit_cards")
    .select("name,credit_limit,current_balance")
    .eq("user_id", userId);
  const rows = cards ?? [];

  if (metric === "balance") {
    return {
      type: chartType,
      metric: "balance",
      unit: "currency",
      labels: rows.map((c: any) => c.name),
      values: rows.map((c: any) => c.current_balance),
      // scatter: credit limit vs current balance per card
      points: rows.map((c: any) => ({ x: c.credit_limit, y: c.current_balance, label: c.name })),
      xLabel: "Credit limit (₹)",
      yLabel: "Balance (₹)",
    };
  }

  return {
    type: chartType,
    metric: "utilization",
    unit: "percent",
    labels: rows.map((c: any) => c.name),
    values: rows.map((c: any) =>
      c.credit_limit > 0 ? Math.round((c.current_balance / c.credit_limit) * 100) : 0
    ),
    points: rows.map((c: any) => ({ x: c.credit_limit, y: c.current_balance, label: c.name })),
    xLabel: "Credit limit (₹)",
    yLabel: "Balance (₹)",
  };
}

async function searchCreditTips(
  supabase: ReturnType<typeof createClient>,
  query: string,
) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: query }] },
        outputDimensionality: 768,
      }),
    },
  );
  if (!res.ok)
    throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  const { embedding } = await res.json();

  const { data, error } = await supabase.rpc("match_credit_tips", {
    query_embedding: embedding.values,
    match_count: 3,
  });
  if (error) throw new Error(error.message);

  return (data ?? []).map((d: { content: string; similarity: number }) => ({
    tip: d.content,
    relevance: Number(d.similarity.toFixed(2)),
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: CORS_HEADERS });

  try {
    const { message, previousInteractionId } = await req.json();
    if (!message || typeof message !== "string") {
      return json({ error: 'Missing "message" string in body' }, 400);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Not authenticated" }, 401);

    let chartPayload: unknown = null;

    async function runTool(name: string, args: Record<string, unknown>) {
      if (name === "get_account_snapshot")
        return getAccountSnapshot(supabase, user!.id);
      if (name === "search_credit_tips")
        return searchCreditTips(supabase, String(args.query ?? ""));
      if (name === "show_chart") {
        const chart = await getChartData(
          supabase,
          user!.id,
          String(args.metric ?? "utilization"),
          String(args.chart_type ?? "bar"),
        );
        chartPayload = chart;
        return chart;
      }
      throw new Error(`Unknown tool: ${name}`);
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // ponytail: previousInteractionId is client-supplied and not verified against
    // this user - low risk (it's an unguessable token only the original caller
    // ever sees), but if this becomes multi-device or higher-stakes, store the
    // latest interaction id per user_id server-side instead of trusting the client.
    let interaction = await ai.interactions.create({
      model: GEMINI_MODEL,
      input: message,
      system_instruction: SYSTEM_PROMPT,
      tools: TOOLS,
      ...(previousInteractionId
        ? { previous_interaction_id: previousInteractionId }
        : {}),
    });

    // Tool-call loop, capped so a confused model can't spin forever.
    for (let i = 0; i < 5; i++) {
      const calls = interaction.steps.filter(
        (s: { type: string }) => s.type === "function_call",
      );
      if (calls.length === 0) break;

      const results = [];
      for (const call of calls) {
        let output: unknown;
        try {
          output = await runTool(call.name, call.arguments ?? {});
        } catch (err) {
          output = { error: String(err instanceof Error ? err.message : err) };
        }
        results.push({
          type: "function_result",
          name: call.name,
          call_id: call.id,
          result: [{ type: "text", text: JSON.stringify(output) }],
        });
      }

      interaction = await ai.interactions.create({
        model: GEMINI_MODEL,
        input: results,
        tools: TOOLS,
        previous_interaction_id: interaction.id,
      });
    }

    const reply =
      interaction.output_text ||
      "Sorry, I couldn't work that out - try rephrasing.";
    return json({ reply, interactionId: interaction.id, chart: chartPayload });
  } catch (err) {
    console.error(err);
    return json(
      { error: String(err instanceof Error ? err.message : err) },
      500,
    );
  }
});
