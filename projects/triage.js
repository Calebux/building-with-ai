// triage.js — a real 3-step AI workflow (Lesson 3). Node 18+, no installs.
//
// The chain:  email → summarize → classify → draft reply
// Run it:     OPENROUTER_API_KEY=sk-or-...  node triage.js

const KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324";

if (!KEY) {
  console.log("Set OPENROUTER_API_KEY first — see the Setup lesson.");
  process.exit(1);
}

// One small helper: send a prompt, get text back. This is the whole "AI" part.
async function ask(prompt) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + KEY },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error && data.error.message) || "API error " + res.status);
  return data.choices[0].message.content.trim();
}

// The input. Later: read this from a file, an inbox, or a form.
const email = "Subject: charged twice?!\n" +
  "Hi, I was billed twice for invoice 4471 this month and the export\n" +
  "page is timing out. Finance is blocked on closing the quarter. - Dana";

// ── THE WORKFLOW — three small jobs, in an order YOU wrote ──
async function main() {
  console.log("STEP 1 — summarize");
  const summary = await ask("Summarize this email in 2 sentences:\n" + email);
  console.log(summary + "\n");

  console.log("STEP 2 — classify");
  const category = await ask(
    "Classify this issue. Reply with exactly one word - billing, bug, or question:\n" + summary);
  console.log(category + "\n");

  console.log("STEP 3 — draft a reply");
  const reply = await ask(
    "Draft a short, calm support reply for this " + category + " issue. No promises of refunds:\n" + summary);
  console.log(reply);
}

main().catch((e) => console.error("Workflow failed:", e.message));
