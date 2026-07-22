// rundown-bot.js — your personal weekly rundown bot (Lesson 4 capstone).
// Node 18+, no installs.
//
// Put this file in the folder where your week's work lives — notes, drafts,
// lists, anything text. Run it, and an agent reads what changed recently and
// sends the rundown to your Telegram.
//
// Required env vars:  OPENROUTER_API_KEY
// Optional:           TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
//                     (omit them → DRY RUN: prints the message instead)
//
// Run it:  OPENROUTER_API_KEY=sk-or-...  node rundown-bot.js

const fs = require("fs");
const path = require("path");

const KEY = process.env.OPENROUTER_API_KEY;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;
const MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324";
const MAX_TURNS = 10;

if (!KEY) {
  console.log("Set OPENROUTER_API_KEY first — see the Setup lesson.");
  process.exit(1);
}

// ── THE TOOLS — the same folder tools as agent.js, plus a Telegram mouth ──
const READABLE = [".txt", ".md", ".csv", ".json"];

function safe(p) {
  const full = path.resolve(p);
  if (!full.startsWith(process.cwd())) throw new Error("outside the sandbox");
  return full;
}

const toolFns = {
  list_files: () => {
    return fs.readdirSync(".")
      .filter((n) => !n.startsWith("."))
      .map((n) => {
        const days = Math.floor((Date.now() - fs.statSync(n).mtimeMs) / 86400000);
        const age = days === 0 ? "today" : days === 1 ? "yesterday" : days + " days ago";
        return n + "  (last changed " + age + ")";
      })
      .join("\n");
  },
  read_file: (a) => {
    if (!READABLE.includes(path.extname(a.path).toLowerCase())) {
      return "Error: I only read text files (" + READABLE.join(", ") + ").";
    }
    return fs.readFileSync(safe(a.path), "utf8").slice(0, 20000);
  },
  send_telegram: async (a) => {
    // Models drift into markdown no matter what the prompt says.
    // Lesson 1's rule: enforce it in the tool, not the prompt.
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
  { type: "function", function: { name: "list_files",
      description: "List the files in my work folder with how recently each one changed. Use this FIRST to see where this week's activity was.",
      parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "read_file",
      description: "Read one text file (.txt, .md, .csv, .json) from my work folder.",
      parameters: { type: "object",
        properties: { path: { type: "string", description: "File name, e.g. notes.md" } },
        required: ["path"] } } },
  { type: "function", function: { name: "send_telegram",
      description: "Send my final rundown to my Telegram. Call this exactly once, at the end, with the complete message.",
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

// ── THE LOOP — unchanged from agent.js. The tools make the bot. ──
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
  "Today is " + new Date().toDateString() + ". You are my personal weekly rundown bot. " +
  "This folder is where my work lives. 1) Call list_files and notice what changed in the " +
  "last 7 days. 2) Read the recently-changed files (skip old ones and skip this script). " +
  "3) Then call send_telegram exactly once with my rundown: what I worked on this week, " +
  "what looks unfinished or undecided, and one small, concrete suggestion for next week. " +
  "Plain text only, under 300 words, warm but honest. " +
  "If nothing changed this week, say so kindly and suggest one way to restart momentum.";

console.log("Weekly rundown from: " + process.cwd() + "\n");
agent(task).then((answer) => console.log("\nAGENT: " + (answer || "done — rundown sent.")));
