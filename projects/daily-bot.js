// daily-bot.js — dev edition: your GitHub day, delivered to Telegram.
// (Lesson 4, dev variant.) Node 18+, no installs.
//
// An agent checks your PRs (opened / merged), the issues you created or are
// assigned to, and — because plenty of devs push straight to main — recent
// commits as a fallback. Then it sends you one daily rundown.
//
// Required env vars:  OPENROUTER_API_KEY, GITHUB_USERNAME
// Optional:           GITHUB_TOKEN     (private repos + higher rate limits)
//                     DAYS_BACK        (default 1 — set 3 on a Monday)
//                     TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
//                     (omit the Telegram pair → DRY RUN: prints instead)
//
// Run it:  OPENROUTER_API_KEY=... GITHUB_USERNAME=you  node daily-bot.js

const KEY = process.env.OPENROUTER_API_KEY;
const GH_USER = process.env.GITHUB_USERNAME;
const GH_TOKEN = process.env.GITHUB_TOKEN;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;
const DAYS = Number(process.env.DAYS_BACK || 1);
const MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324";
const MAX_TURNS = 12;

if (!KEY || !GH_USER) {
  console.log("Set OPENROUTER_API_KEY and GITHUB_USERNAME first. See the README.");
  process.exit(1);
}

const SINCE = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10);

async function ghGet(pathname) {
  const headers = { accept: "application/vnd.github+json", "user-agent": "daily-bot" };
  if (GH_TOKEN) headers.authorization = "Bearer " + GH_TOKEN;
  const res = await fetch("https://api.github.com" + pathname, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error("GitHub " + res.status + ": " + (data.message || pathname));
  return data;
}

const repoOf = (item) => item.repository_url.split("/").slice(-2).join("/");

// ── THE TOOLS ──
const toolFns = {
  my_prs: async () => {
    const q = encodeURIComponent("is:pr author:" + GH_USER + " updated:>=" + SINCE);
    const data = await ghGet("/search/issues?q=" + q + "&per_page=30");
    if (!data.items.length) return "No pull requests updated since " + SINCE + ".";
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
      "/commits?since=" + SINCE + "T00:00:00Z&per_page=30");
    if (!commits.length) return "No commits since " + SINCE + ".";
    return commits.map((c) =>
      c.commit.author.date.slice(0, 10) + "  " + c.commit.message.split("\n")[0]).join("\n");
  },
  send_telegram: async (a) => {
    // Enforce plain text in the tool, not the prompt (Lesson 1's rule).
    const text = String(a.text).replace(/\*\*|__|##+ /g, "");
    if (!TG_TOKEN || !TG_CHAT) {
      console.log("\n──── DRY RUN (no Telegram credentials set) — the message: ────\n");
      console.log(text);
      console.log("\n──────────────────────────────────────────────────────────────");
      return "Sent (dry run: printed to the console).";
    }
    const res = await fetch("https://api.telegram.org/bot" + TG_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error("Telegram: " + data.description);
    return "Sent to Telegram.";
  },
};

// What the model sees (Lesson 2: descriptions are prompt engineering).
const tools = [
  { type: "function", function: { name: "my_prs",
      description: "My pull requests updated since " + SINCE + " — opened, merged, or closed. Check this FIRST.",
      parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "my_issues",
      description: "Open issues I created or that are assigned to me — my current plate.",
      parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "recent_repos",
      description: "My repositories by most recent push. Use with repo_commits when my_prs is quiet — I often commit straight to main.",
      parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "repo_commits",
      description: "Commit messages since " + SINCE + " for one repository.",
      parameters: { type: "object",
        properties: { repo: { type: "string", description: "Repository name" } },
        required: ["repo"] } } },
  { type: "function", function: { name: "send_telegram",
      description: "Send the final rundown to my Telegram. Call exactly once, at the end, with the complete message.",
      parameters: { type: "object",
        properties: { text: { type: "string", description: "The full rundown, plain text" } },
        required: ["text"] } } },
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

// ── THE LOOP — same as agent.js, same as always ──
async function agent(task) {
  const messages = [{ role: "user", content: task }];

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const msg = await callModel(messages);
    messages.push(msg);

    if (!msg.tool_calls) return msg.content;

    for (const call of msg.tool_calls) {
      const args = JSON.parse(call.function.arguments || "{}");
      console.log("  → " + call.function.name + " " + JSON.stringify(args).slice(0, 80));
      let result;
      try { result = String(await toolFns[call.function.name](args)); }
      catch (e) { result = "Error: " + e.message; }
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }
  return "Stopped: hit the turn limit.";
}

const task =
  "Today is " + new Date().toDateString() + ". You are my daily GitHub rundown bot, " +
  "covering activity since " + SINCE + ". 1) Call my_prs — report merges first, then " +
  "opened/updated PRs. 2) Call my_issues for what is on my plate. 3) If PRs were quiet, " +
  "call recent_repos and repo_commits on the fresh ones — I often push straight to main. " +
  "4) Then call send_telegram exactly once: what happened (merges and shipped work first), " +
  "what is open on my plate, and ONE suggested priority for today, chosen from the open " +
  "items — if items carry priority labels like P0/P1/P2, the most urgent (P0) always wins. " +
  "Plain text only, under 250 words, direct and encouraging.";

console.log("Daily GitHub rundown for @" + GH_USER + " (since " + SINCE + ")\n");
agent(task).then((answer) => console.log("\nAGENT: " + (answer || "done — report sent.")));
