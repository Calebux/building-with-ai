const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8000);
const BASE_URL = "https://openrouter.ai/api/v1";

// ─── .env SUPPORT (zero-dependency) ───
// Looks for ai-course/.env with KEY=value lines. Re-read on every call so
// adding the key doesn't need a server restart — just refresh the page.
function readEnvFile() {
  try {
    const out = {};
    for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}
function getApiKey() {
  return process.env.OPENROUTER_API_KEY || readEnvFile().OPENROUTER_API_KEY || "";
}
function getModel() {
  return process.env.OPENROUTER_MODEL || readEnvFile().OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324";
}
const MODEL = getModel();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type });
  if (Buffer.isBuffer(body) || typeof body === "string") {
    res.end(body);
  } else {
    res.end(JSON.stringify(body));
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request too large"));
      }
    });
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

function loadVault() {
  const vault = path.join(ROOT, "sample-vault");
  return fs.readdirSync(vault)
    .filter((name) => name.endsWith(".md"))
    .map((name) => ({
      name,
      text: fs.readFileSync(path.join(vault, name), "utf8"),
    }));
}

function searchVault(query) {
  const terms = String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (!terms.length) return [];

  return loadVault()
    .map((note) => {
      const lines = note.text.split(/\n+/);
      const hits = lines.filter((line) =>
        terms.some((term) => line.toLowerCase().includes(term))
      );
      return { ...note, hits, score: hits.length };
    })
    .filter((note) => note.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

// ─── BUILD BOX MESSAGES ───
function buildMessages({ goal, system, context, checks, mode }) {
  const retrieved = searchVault(`${goal} ${context}`)
    .map((note) => `[${note.name}]\n${note.hits.join("\n")}`)
    .join("\n\n");

  const jobSystem = system ? system : `You help beginners build practical AI workflows.

You must use this job loop:
1. Understand the user's desired outcome.
2. Plan the smallest complete workflow.
3. Draft the result.
4. Check the draft against the acceptance checks.
5. Revise if needed.
6. Return a final answer only when the checks pass.

Use plain language. Avoid code unless the user explicitly asks for it.
Return your answer with these sections:
PLAN:
DRAFT:
CHECK:
FINAL:`;

  const user = `Mode: ${mode || "builder"}

Goal:
${goal || "(no goal provided)"}

Context from the student:
${context || "(none)"}

Relevant Obsidian/sample notes:
${retrieved || "(no matching notes)"}

Acceptance checks:
${checks || "- The answer completes the whole job.\n- The answer is beginner-friendly.\n- The answer includes a next action."}`;

  return [
    { role: "system", content: jobSystem },
    { role: "user", content: user },
  ];
}

// ─── CODE ANALYSIS MESSAGES ───
function buildCodeMessages({ code, lesson }) {
  const systemPrompt = `You are an expert AI programming teacher in a live workshop IDE.
The student is viewing code for a lesson called "${lesson}".
Your job is to:
1. Explain what this code does, line by line if needed.
2. Show what would happen if you ran it (simulate the output).
3. Point out the key insight — the one thing they should remember.
4. Suggest one small modification they could try.

Be concise and practical. Use the code they provided, don't rewrite it from scratch.
Format your response clearly with sections: EXPLANATION, SIMULATED OUTPUT, KEY INSIGHT, TRY THIS.`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Here is the code the student is looking at:\n\n\`\`\`python\n${code}\n\`\`\`` },
  ];
}

// ─── MOCK MODE ───
function mockRun(input) {
  const notes = searchVault(`${input.goal || ""} ${input.context || ""}`);
  return {
    model: "mock-mode",
    usedKey: false,
    trace: [
      "KEY: OPENROUTER_API_KEY is not set — running in mock mode.",
      "LOOP: understand → plan → draft → check → final",
      `VAULT: found ${notes.length} matching sample note(s).`,
      "CHECK: answer must be complete, beginner-friendly, and actionable.",
    ],
    text: `PLAN:\nTurn the goal into one small workflow.\n\nDRAFT:\n${input.goal || "Choose a simple AI task"}.\n\nCHECK:\nThe workflow is short, practical, and does not require students to write code.\n\nFINAL:\nPaste a real task into the Goal box, add any notes in Context, then run it.\n\n[Mock mode — set OPENROUTER_API_KEY to get real responses]`,
  };
}

function mockCodeRun(input) {
  return {
    model: "mock-mode",
    usedKey: false,
    trace: [
      "KEY: OPENROUTER_API_KEY is not set — running in mock mode.",
      `CODE: received ${(input.code || "").split("\n").length} lines`,
      `LESSON: ${input.lesson || "unknown"}`,
    ],
    text: `EXPLANATION:\nThis code demonstrates a key concept from the "${input.lesson || "unknown"}" lesson.\n\nSIMULATED OUTPUT:\n(Mock mode — set OPENROUTER_API_KEY to see real analysis)\n\nKEY INSIGHT:\nSet the API key to unlock live code analysis.\n\nTRY THIS:\nRun: export OPENROUTER_API_KEY=your-key-here`,
  };
}

// ─── OPENROUTER API ───
async function callOpenRouter(messages, tools = undefined, toolChoice = undefined) {
  const key = getApiKey();
  if (!key) return null;

  const body = {
    model: MODEL,
    messages,
    max_tokens: 8000,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${key}`,
      "HTTP-Referer": "http://localhost:8000",
      "X-Title": "AI Workshop IDE",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenRouter API error ${response.status}`);
  }

  return data;
}

async function runBuildBox(input) {
  const key = getApiKey();
  if (!key) return mockRun(input);

  const messages = buildMessages(input);
  const trace = [
    "KEY: server has OPENROUTER_API_KEY (never sent to browser).",
    "VAULT: sample vault/context was added before the model call."
  ];

  const tools = [
    {
      type: "function",
      function: {
        name: "write_file",
        description: "Write content to a file. The path will be relative to the exports folder on the user's PC.",
        parameters: {
          type: "object",
          properties: {
            filename: { type: "string", description: "Name of the file, e.g. index.html or js/app.js" },
            content: { type: "string", description: "The full file content to write" }
          },
          required: ["filename", "content"]
        }
      }
    }
  ];

  const exportsDir = path.join(ROOT, "exports");
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  let finalModel = MODEL;
  let finalUsage = null;
  let maxTurns = 5;
  let finalOutput = "";

  for (let turn = 1; turn <= maxTurns; turn++) {
    trace.push(`LOOP: starting turn ${turn}`);
    const data = await callOpenRouter(messages, tools);
    const message = data.choices[0].message;
    finalModel = data.model || MODEL;
    finalUsage = data.usage || finalUsage;
    
    // Add assistant's message to conversation
    messages.push(message);

    if (message.content) {
      finalOutput += message.content + "\n\n";
    }

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const call of message.tool_calls) {
        if (call.function.name === "write_file") {
          try {
            const args = JSON.parse(call.function.arguments);
            trace.push(`MODEL: requested tool write_file for ${args.filename}`);
            
            const safePath = path.normalize(args.filename).replace(/^(\.\.(\/|\\|$))+/, '');
            const filePath = path.join(exportsDir, safePath);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, args.content);
            
            trace.push(`TOOL RESULT: successfully wrote ${args.filename} to PC!`);
            
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: `Success. File ${args.filename} was written to disk.`
            });
          } catch (e) {
            trace.push(`TOOL RESULT: Error writing file: ${e.message}`);
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              name: call.function.name,
              content: `Error: ${e.message}`
            });
          }
        }
      }
    } else {
      trace.push("CHECK: model finished without calling more tools.");
      break;
    }
    
    if (turn === maxTurns) {
      trace.push("CHECK: max turns reached, breaking loop.");
      finalOutput += "\\nMax turns reached before the agent decided it was finished.";
    }
  }

  return {
    model: finalModel,
    usedKey: true,
    usage: finalUsage,
    trace,
    text: finalOutput.trim() || "(Done with tools, no text output)",
  };
}

async function runCode(input) {
  const key = getApiKey();
  if (!key) return mockCodeRun(input);

  const messages = buildCodeMessages(input);
  const data = await callOpenRouter(messages);

  return {
    model: data.model || MODEL,
    usedKey: true,
    usage: data.usage || null,
    trace: [
      `CODE: analyzed ${(input.code || "").split("\n").length} lines`,
      `MODEL: ${data.model || MODEL}`,
      `LESSON: ${input.lesson || "unknown"}`,
      "→ explanation generated",
      "→ output simulated",
      "✓ done",
    ],
    text: data.choices?.[0]?.message?.content || "(empty response)",
  };
}

// ─── BUILDER CHAT (SSE) ───
// The Builder's write_file tool is VIRTUAL: files are streamed to the browser
// and live in its localStorage, never on this server's disk. That keeps the
// server stateless, so one hosted instance serves a whole classroom safely.
function sseStart(res) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    "connection": "keep-alive",
  });
}
function sseSend(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

const MOCK_SITE = {
  "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Hello from the Builder</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
  <main>
    <h1>Hello! 👋</h1>
    <p>The Builder made this page in <b>mock mode</b> — no API key is set on the server, so this is a canned demo project. Set <code>OPENROUTER_API_KEY</code> to build for real.</p>
    <button id="btn">You clicked me 0 times</button>
  </main>
  <script src="app.js"><\/script>
</body>
</html>`,
  "styles.css": `body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #1e1e2e, #3a2a5e);
  color: #fff;
}
main { text-align: center; max-width: 420px; padding: 32px; }
h1 { font-size: 44px; margin: 0 0 12px; }
p { line-height: 1.6; color: #cfcfe8; }
code { background: rgba(255,255,255,0.12); padding: 2px 6px; border-radius: 4px; }
button {
  margin-top: 18px;
  background: #7c7cf8;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 22px;
  font-size: 15px;
  cursor: pointer;
}
button:hover { opacity: 0.85; }`,
  "app.js": `let count = 0;
document.getElementById('btn').addEventListener('click', (e) => {
  count++;
  e.target.textContent = 'You clicked me ' + count + ' times';
});`,
};

function mockChat(res) {
  sseSend(res, { type: "status", text: "mock mode: no OPENROUTER_API_KEY set" });
  for (const [p, content] of Object.entries(MOCK_SITE)) {
    sseSend(res, { type: "file", path: p, content });
  }
  sseSend(res, {
    type: "text",
    text: "I built a small demo page (mock mode — the server has no API key, so every request returns this same project). Check the Preview tab, poke at the files, and try the download buttons. Once a key is set, I'll build whatever you describe.",
  });
  sseSend(res, { type: "done" });
}

function builderSystemPrompt(files) {
  const paths = Object.keys(files || {});
  let fileContext = "The project is currently empty.";
  if (paths.length) {
    fileContext = "Current project files:\n\n" + paths
      .map((p) => {
        const body = String(files[p]).slice(0, 6000);
        return `--- ${p} ---\n${body}`;
      })
      .join("\n\n");
  }
  return `You are the Builder — an expert, friendly AI developer inside a beginner AI course.

CRITICAL: the ONLY way to deliver anything is the write_file tool. Code in your chat reply is thrown away — the user never sees it. If they asked you to build or change something and you reply without calling write_file, they receive nothing. Call write_file FIRST, talk after.

You build two kinds of projects:

1. WEB APPS — self-contained HTML/CSS/JS, shown in a live preview.
   - Main page must be index.html; reference other files with relative paths (styles.css, app.js).
   - No external resources: no CDNs, no external fonts, no remote images. Use system fonts, CSS gradients, emoji, and inline SVG.
   - Make the design modern and polished: good spacing, dark-mode friendly palettes, subtle transitions.

2. SCRIPTS & BOTS — Node.js scripts (agents, Telegram bots, automations, CLIs).
   - Target Node 18+ and ZERO npm dependencies whenever possible (fetch is built in). If a dependency is truly unavoidable, include a package.json and say so in the reply.
   - Secrets (API keys, bot tokens) must ALWAYS come from environment variables (process.env.X) — never hardcode them, never ask the user to paste one into a file that could be shared.
   - Name the main file clearly (bot.js, agent.js) and ALWAYS include a README.md with: what it does, required env vars, setup steps, and the exact run command.
   - There is no live preview for scripts — end your reply telling the user to check the Files tab, then push to GitHub or download the .zip and run it locally.

Shared rules:
- write_file for EVERY file you create or change; always COMPLETE file contents — never fragments, diffs, or placeholders.
- When changing an existing project, rewrite only the files that need to change, but each rewritten file must be complete.
- After writing files, reply with 1–3 friendly sentences: what you built and one idea they could ask for next. No code in the reply — the files speak for themselves.
- Your users are beginners. Be encouraging and skip jargon.

${fileContext}`;
}

// Streaming variant of the OpenRouter call. Forwards text deltas and announces
// tool calls as they start, so the browser shows live progress instead of a
// multi-minute silent wait. Returns the assembled assistant message + usage.
async function callOpenRouterStream(messages, tools, toolChoice, onDelta, signal) {
  const key = getApiKey();
  const body = {
    model: MODEL,
    messages,
    max_tokens: 8000,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${key}`,
      "HTTP-Referer": "http://localhost:8000",
      "X-Title": "Building With AI",
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || `OpenRouter API error ${response.status}`);
  }

  const message = { role: "assistant", content: "", tool_calls: [] };
  const announced = new Set();
  let usage = null;
  let buf = "";
  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;
      let json;
      try { json = JSON.parse(payload); } catch { continue; }
      usage = json.usage || usage;
      const delta = json.choices?.[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        message.content += delta.content;
        onDelta({ kind: "text", text: delta.content });
      }
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const i = tc.index ?? 0;
          if (!message.tool_calls[i]) {
            message.tool_calls[i] = { id: tc.id || `call_${i}`, type: "function", function: { name: "", arguments: "" } };
          }
          const cur = message.tool_calls[i];
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.function.name += tc.function.name;
          if (tc.function?.arguments) {
            cur.function.arguments += tc.function.arguments;
            if (!announced.has(i)) {
              const m = cur.function.arguments.match(/"filename"\s*:\s*"([^"]+)"/);
              if (m) {
                announced.add(i);
                onDelta({ kind: "toolstart", filename: m[1] });
              }
            }
          }
        }
      }
    }
  }

  if (message.tool_calls.length === 0) delete message.tool_calls;
  if (!message.content) message.content = null;
  return { message, usage };
}

async function handleChat(req, res) {
  let input;
  try {
    input = await readBody(req);
  } catch (e) {
    return send(res, 400, { error: e.message });
  }

  sseStart(res);
  const key = getApiKey();
  if (!key) {
    mockChat(res);
    return res.end();
  }

  const tools = [
    {
      type: "function",
      function: {
        name: "write_file",
        description: "Create or overwrite one file in the user's project. Always send the complete file contents.",
        parameters: {
          type: "object",
          properties: {
            filename: { type: "string", description: "Relative path, e.g. index.html or styles.css" },
            content: { type: "string", description: "The full file content" },
          },
          required: ["filename", "content"],
        },
      },
    },
  ];

  const messages = [
    { role: "system", content: builderSystemPrompt(input.files) },
    ...(Array.isArray(input.messages) ? input.messages : []),
  ];

  let usage = null;
  let filesWritten = 0;
  let nudged = false;
  let forceNext = false;
  const projectEmpty = Object.keys(input.files || {}).length === 0;
  const maxTurns = 8;

  // Stop paying for tokens the moment the browser disconnects
  const ac = new AbortController();
  res.on("close", () => ac.abort());

  try {
    for (let turn = 1; turn <= maxTurns; turn++) {
      sseSend(res, { type: "status", text: turn === 1 ? "thinking..." : `turn ${turn}: continuing...` });
      const toolChoice = forceNext ? { type: "function", function: { name: "write_file" } } : undefined;
      forceNext = false;
      const { message, usage: u } = await callOpenRouterStream(
        messages, tools, toolChoice,
        (d) => {
          if (d.kind === "text") sseSend(res, { type: "delta", text: d.text });
          else if (d.kind === "toolstart") sseSend(res, { type: "status", text: `writing ${d.filename}...` });
        },
        ac.signal
      );
      usage = u || usage;
      messages.push(message);

      // Some models (DeepSeek especially) narrate the build in prose instead of
      // calling the tool. If a fresh build request produced zero files, nudge
      // once and force write_file on the next call.
      if ((!message.tool_calls || message.tool_calls.length === 0) &&
          filesWritten === 0 && projectEmpty && !nudged) {
        nudged = true;
        forceNext = true;
        sseSend(res, { type: "status", text: "model skipped the files — nudging it to write them..." });
        messages.push({
          role: "user",
          content: "You replied without calling write_file, so no files exist and the user sees nothing. Call write_file now for EVERY file of the app (index.html first). Do not describe the code — write it.",
        });
        continue;
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const call of message.tool_calls) {
          let result = "Unknown tool";
          if (call.function.name === "write_file") {
            try {
              const args = JSON.parse(call.function.arguments);
              const safePath = path
                .normalize(String(args.filename))
                .replace(/^([/\\]|(\.\.(\/|\\|$)))+/, "");
              sseSend(res, { type: "file", path: safePath, content: String(args.content) });
              filesWritten++;
              result = `Success. ${safePath} saved to the project.`;
            } catch (e) {
              result = `Error: ${e.message}`;
            }
          }
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.function.name,
            content: result,
          });
        }
        // Interim commentary already streamed as deltas.
      } else {
        break; // final answer — its text already streamed as deltas
      }

      if (turn === maxTurns) {
        sseSend(res, { type: "text", text: "(I hit my turn limit — the project may be incomplete. Ask me to continue.)" });
      }
    }
    sseSend(res, { type: "done", usage });
  } catch (error) {
    sseSend(res, { type: "error", error: error.message });
  }
  res.end();
}

// ─── HTTP HANDLER ───
async function handleApi(req, res) {
  if (req.url === "/api/chat" && req.method === "POST") {
    return handleChat(req, res);
  }

  if (req.url === "/api/status") {
    return send(res, 200, {
      hasKey: Boolean(getApiKey()),
      model: MODEL,
      baseUrl: BASE_URL,
    });
  }

  if (req.url === "/api/vault") {
    return send(res, 200, { notes: loadVault() });
  }

  if (req.url === "/api/run" && req.method === "POST") {
    try {
      const input = await readBody(req);
      const result = await runBuildBox(input);
      return send(res, 200, result);
    } catch (error) {
      return send(res, 500, { error: error.message });
    }
  }

  if (req.url === "/api/run-code" && req.method === "POST") {
    try {
      const input = await readBody(req);
      const result = await runCode(input);
      return send(res, 200, result);
    } catch (error) {
      return send(res, 500, { error: error.message });
    }
  }

  return send(res, 404, { error: "Not found" });
}

function serveStatic(req, res) {
  const cleanUrl = decodeURIComponent(req.url.split("?")[0]);
  let rel = cleanUrl === "/" ? "/index.html" : cleanUrl;
  const file = path.normalize(path.join(ROOT, rel));

  if (!file.startsWith(ROOT)) return send(res, 403, "Forbidden", "text/plain");

  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, "Not found", "text/plain");
    send(res, 200, data, MIME[path.extname(file)] || "application/octet-stream");
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`\n  Building With AI: http://127.0.0.1:${PORT}`);
  console.log(`  Model: ${MODEL}`);
  console.log(`  API key: ${getApiKey() ? "✓ set" : "✗ missing (mock mode — add it to ai-course/.env)"}\n`);
});
