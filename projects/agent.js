// agent.js — a real AI agent in ~70 lines (Lesson 4). Node 18+, no installs.
//
// Tools: list_files, read_file, write_file — scoped to THIS folder.
// Run it: OPENROUTER_API_KEY=sk-or-...  node agent.js "your task here"

const fs = require("fs");
const path = require("path");

const KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324";
const MAX_TURNS = 8;

if (!KEY) {
  console.log("Set OPENROUTER_API_KEY first — see the Setup lesson.");
  process.exit(1);
}

// ── THE TOOLS — plain functions. The sandbox check IS the security. ──
function safe(p) {
  const full = path.resolve(p);
  if (!full.startsWith(process.cwd())) throw new Error("outside the sandbox");
  return full;
}
const toolFns = {
  list_files: () => fs.readdirSync(".").join("\n"),
  read_file: (a) => fs.readFileSync(safe(a.path), "utf8"),
  write_file: (a) => { fs.writeFileSync(safe(a.path), a.content); return "wrote " + a.path; },
};

// What the model sees. Descriptions are prompt engineering (Lesson 2).
const tools = [
  { type: "function", function: { name: "list_files",
      description: "List the files in the current folder.",
      parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "read_file",
      description: "Read a text file in the current folder and return its contents.",
      parameters: { type: "object",
        properties: { path: { type: "string", description: "File name, e.g. notes.txt" } },
        required: ["path"] } } },
  { type: "function", function: { name: "write_file",
      description: "Write content to a file in the current folder, replacing it if it exists.",
      parameters: { type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"] } } },
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

// ── THE LOOP — this is the whole agent (Lesson 1) ──
async function agent(task) {
  const messages = [{ role: "user", content: task }];

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const msg = await callModel(messages);
    messages.push(msg);

    if (!msg.tool_calls) return msg.content; // nothing left to ask for → done

    for (const call of msg.tool_calls) {
      const args = JSON.parse(call.function.arguments || "{}");
      console.log("  → " + call.function.name + " " + JSON.stringify(args).slice(0, 80));
      let result;
      try { result = String(toolFns[call.function.name](args)); }
      catch (e) { result = "Error: " + e.message; } // errors go back as TEXT (Lesson 2)
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }
  return "Stopped: hit the turn limit without finishing. (This failing LOUDLY is a feature.)";
}

const task = process.argv[2] || "List the files you can see and describe each in one line.";
console.log("TASK: " + task + "\n");
agent(task).then((answer) => console.log("\nANSWER:\n" + answer));
