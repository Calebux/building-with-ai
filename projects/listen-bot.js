// listen-bot.js — v2 with EARS. A persistent Telegram bot that answers
// questions about your GitHub. (Lesson 4, dev variant.) Node 18+, no installs.
//
// v1 (daily-bot.js) has a mouth: it speaks on a schedule and exits.
// v2 adds ears: it long-polls Telegram forever, and each incoming message
// becomes a task for the same agent loop. Idle listening is free — the
// model only runs when you ask something.
//
// Required env vars:  OPENROUTER_API_KEY, GITHUB_USERNAME,
//                     TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// Optional:           GITHUB_TOKEN (private repos + higher rate limits)
//
// Run it:  export $(grep -v '^#' .env | xargs) && node listen-bot.js
// It must run on a machine that stays awake: your laptop while you work,
// or a small always-on server (Railway / a VPS). Serverless won't do —
// this is the "long runs need a persistent server" row from Lesson 4.

const KEY = process.env.OPENROUTER_API_KEY;
const GH_USER = process.env.GITHUB_USERNAME;
const GH_TOKEN = process.env.GITHUB_TOKEN;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;
const MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324";
const MAX_TURNS = 8;

if (!KEY || !GH_USER || !TG_TOKEN || !TG_CHAT) {
  console.log("Need OPENROUTER_API_KEY, GITHUB_USERNAME, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.");
  process.exit(1);
}

// ── Telegram helper ──
async function tg(method, payload) {
  const res = await fetch("https://api.telegram.org/bot" + TG_TOKEN + "/" + method, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const data = await res.json();
  if (!data.ok) throw new Error("Telegram " + method + ": " + data.description);
  return data;
}

// Reply helper: strips markdown and splits at Telegram's 4096-char limit —
// both enforced here in code, not in the prompt (Lesson 1's rule).
async function reply(text) {
  const clean = String(text).replace(/\*\*|__|##+ /g, "").trim() || "(empty reply)";
  for (let i = 0; i < clean.length; i += 3900) {
    await tg("sendMessage", { chat_id: TG_CHAT, text: clean.slice(i, i + 3900) });
  }
}

// ── GitHub helper + tools (same eyes as daily-bot, now with a days knob) ──
async function ghGet(pathname) {
  const headers = { accept: "application/vnd.github+json", "user-agent": "listen-bot" };
  if (GH_TOKEN) headers.authorization = "Bearer " + GH_TOKEN;
  const res = await fetch("https://api.github.com" + pathname, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error("GitHub " + res.status + ": " + (data.message || pathname));
  return data;
}
const repoOf = (item) => item.repository_url.split("/").slice(-2).join("/");
const sinceIso = (days) => new Date(Date.now() - (days || 1) * 86400000).toISOString().slice(0, 10);

const toolFns = {
  my_prs: async (a) => {
    const q = encodeURIComponent("is:pr author:" + GH_USER + " updated:>=" + sinceIso(a.days));
    const data = await ghGet("/search/issues?q=" + q + "&per_page=30");
    if (!data.items.length) return "No pull requests updated in the last " + (a.days || 1) + " day(s).";
    return data.items.map((p) => {
      const state = p.pull_request && p.pull_request.merged_at ? "MERGED"
        : p.state === "open" ? "OPEN" : "CLOSED";
      return "[" + repoOf(p) + "] " + state + "  " + p.title;
    }).join("\n");
  },
  my_issues: async () => {
    const authored = await ghGet("/search/issues?q=" +
      encodeURIComponent("is:issue is:open author:" + GH_USER) + "&per_page=30");
    const assigned = await ghGet("/search/issues?q=" +
      encodeURIComponent("is:issue is:open assignee:" + GH_USER) + "&per_page=30");
    const seen = new Set();
    const all = [...authored.items, ...assigned.items].filter((i) =>
      seen.has(i.id) ? false : seen.add(i.id));
    if (!all.length) return "No open issues created by or assigned to me.";
    return all.map((i) => "[" + repoOf(i) + "] #" + i.number + "  " + i.title).join("\n");
  },
  recent_repos: async () => {
    const repos = await ghGet("/users/" + GH_USER + "/repos?sort=pushed&per_page=10");
    return repos.map((r) => r.name + "  (last push " + String(r.pushed_at).slice(0, 10) + ")").join("\n");
  },
  repo_commits: async (a) => {
    const commits = await ghGet("/repos/" + GH_USER + "/" + a.repo +
      "/commits?since=" + sinceIso(a.days) + "T00:00:00Z&per_page=30");
    if (!commits.length) return "No commits in " + a.repo + " in the last " + (a.days || 1) + " day(s).";
    return commits.map((c) =>
      c.commit.author.date.slice(0, 10) + "  " + c.commit.message.split("\n")[0]).join("\n");
  },
};

const tools = [
  { type: "function", function: { name: "my_prs",
      description: "My pull requests updated in the last N days (default 1) — opened, merged, or closed.",
      parameters: { type: "object",
        properties: { days: { type: "number", description: "How many days back to look (default 1)" } } } } },
  { type: "function", function: { name: "my_issues",
      description: "Open issues I created or that are assigned to me — my current plate.",
      parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "recent_repos",
      description: "My repositories by most recent push — where the action is.",
      parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "repo_commits",
      description: "Commit messages from the last N days (default 1) for one repository. I often push straight to main, so this is where pushes show up.",
      parameters: { type: "object",
        properties: { repo: { type: "string" }, days: { type: "number" } },
        required: ["repo"] } } },
];

async function callModel(messages) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + KEY },
    body: JSON.stringify({ model: MODEL, messages, tools }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error && data.error.message) || "API error " + res.status);
  return data.choices[0].message;
}

// ── memory: short rolling history so follow-up questions make sense ──
const history = [];

function systemPrompt() {
  return "You are @" + GH_USER + "'s personal GitHub assistant on Telegram. " +
    "Today is " + new Date().toDateString() + ". Answer questions about their GitHub " +
    "activity using the tools — pushes usually mean commits (repo_commits), not just PRs. " +
    "Be concise and direct: a Telegram message, not an essay. Plain text only, no markdown. " +
    "If the question is not about GitHub, still answer briefly and helpfully.";
}

// ── THE LOOP — one run per incoming message ──
async function answer(text) {
  history.push({ role: "user", content: text });
  const messages = [{ role: "system", content: systemPrompt() }, ...history.slice(-10)];
  let nudged = false;

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const msg = await callModel(messages);
    messages.push(msg);

    if (!msg.tool_calls) {
      // Some models write the tool call as TEXT instead of calling it.
      // Without this guard, that gibberish gets sent as the "answer".
      const fake = /Function\[|```json|"repo"\s*:|"days"\s*:/.test(msg.content || "");
      if (fake && !nudged) {
        nudged = true;
        console.log("    (model wrote a tool call as text — nudging it to call for real)");
        messages.push({ role: "user",
          content: "You wrote the tool call as text instead of actually calling the tool. Nothing ran. Call the real tool now, then answer normally." });
        continue;
      }
      const final = msg.content || "(no answer)";
      history.push({ role: "assistant", content: final });
      return final;
    }

    for (const call of msg.tool_calls) {
      const args = JSON.parse(call.function.arguments || "{}");
      console.log("    → " + call.function.name + " " + JSON.stringify(args).slice(0, 80));
      let result;
      try { result = String(await toolFns[call.function.name](args)); }
      catch (e) { result = "Error: " + e.message; }
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }
  const bail = "I hit my turn limit on that one — try asking something narrower.";
  history.push({ role: "assistant", content: bail });
  return bail;
}

// ── THE EARS — long-poll Telegram forever ──
async function main() {
  const me = await tg("getMe");
  console.log("👂 listening as @" + me.result.username + "  (chat " + TG_CHAT + ")");
  console.log("   text the bot on Telegram — Ctrl+C here to stop\n");

  if (process.argv.includes("--hello")) {
    await reply("👂 v2 online — I have ears now. Ask me things like:\n" +
      "· any pushes today?\n· what's on my plate?\n· what happened in CELO-cards this week?");
  }

  // skip any backlog from before startup
  let offset = 0;
  const last = await tg("getUpdates", { offset: -1 });
  if (last.result.length) offset = last.result[0].update_id + 1;

  while (true) {
    let updates;
    try {
      updates = await tg("getUpdates", { timeout: 50, offset });
    } catch (e) {
      console.log("poll error, retrying in 5s: " + e.message);
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    for (const u of updates.result) {
      offset = u.update_id + 1;
      const m = u.message;
      if (!m || !m.text) continue;

      // The boundary lives in code: only my chat gets answers.
      if (String(m.chat.id) !== String(TG_CHAT)) {
        console.log("ignored message from unknown chat " + m.chat.id);
        continue;
      }

      console.log("YOU: " + m.text);
      tg("sendChatAction", { chat_id: TG_CHAT, action: "typing" }).catch(() => {});
      try {
        const out = await answer(m.text);
        console.log("BOT: " + out.slice(0, 120).replace(/\n/g, " ") + "\n");
        await reply(out);
      } catch (e) {
        console.log("error: " + e.message);
        await reply("⚠ Something broke: " + e.message).catch(() => {});
      }
    }
  }
}

main().catch((e) => { console.error("fatal: " + e.message); process.exit(1); });
