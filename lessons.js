// ═══════════════════════════════════════════════════════════════
// CURRICULUM
// Track: Loop → Tools → Workflows → Agents → Evals → Builder
// Each lesson: explain (Learn tab HTML) · code · examples · tryIt
// Code samples / exercise cards marked OLD.* come from lessons-data.js
// ═══════════════════════════════════════════════════════════════

const LESSONS = {

  // ───────────────────────────── START ─────────────────────────────

  welcome: {
    title: "Welcome",
    kicker: "How to learn AI by actually building with it — no installs, no prior coding required.",
    explain: `
<p>This is a hands-on course about <b>building things with language models</b> — not prompting them better. Everything runs right here in your browser. There is nothing to install.</p>

<h2>What you'll be able to do afterwards</h2>
<ul>
  <li>Explain what an AI agent actually is — a surprisingly small loop — and why every line of it is there</li>
  <li>Tell a <b>workflow</b> from an <b>agent</b>, and know which one a task needs (most people building AI products can't do this)</li>
  <li>Measure whether an AI tool actually works instead of eyeballing one lucky run</li>
  <li>Build a real, working web app by directing an AI — then take the files into a real IDE and keep going</li>
</ul>

<h2>How this app works</h2>
<ul>
  <li><b>The sidebar is the track.</b> Do the lessons in order: Loop → Tools → Workflows → Agents → Evals. Each one has a <b>Learn</b> tab (the idea, in plain language), a <b>Code</b> tab (the idea, as annotated code — press ▶ Run and the AI explains and simulates it), and a <b>Playground</b> (guided exercises you run against a live model).</li>
  <li><b>The Builder is where it pays off.</b> It's a chat: you describe an app, the AI writes real files, and you watch the site appear live in the preview. Every lesson ends with a "Try it in the Builder" mission.</li>
  <li><b>The terminal at the bottom never lies.</b> It shows you what's actually happening on every run — the same trace a professional would read. Get in the habit of watching it.</li>
</ul>

<blockquote><p><b>One thing to bring:</b> a real, tedious task from your own work or life. Something you do weekly. By the end of the course you'll point these tools at it.</p></blockquote>

<h2>The one honest warning</h2>
<p>The thing you're building on is <b>non-deterministic</b> — ask the same question five times, get five different answers. That is not a bug and it never goes away. Every design decision in this course exists because of it. If you take one habit from here: <i>run it more than once before you believe it.</i></p>
`,
  },

  setup: {
    title: "Setup",
    kicker: "For the class: nothing. For going further at home: twenty minutes.",
    explain: `
<h2>In class — you need nothing</h2>
<p>This site <i>is</i> the course. A browser is enough. The AI calls happen on the course server, so you don't need an account or an API key.</p>
<p>Check the dot in the top-right corner of this window:</p>
<ul>
  <li><b style="color:var(--green)">Green</b> — connected to a live model. Everything works for real.</li>
  <li><b style="color:var(--red)">Red</b> — mock mode. The app still works, but responses are canned placeholders. Tell your instructor.</li>
</ul>

<h2>At home — run it yourself (optional)</h2>
<p>The whole course is a folder with one small server file. To run your own copy:</p>
<pre><code>cd ai-course
node server.js          # then open http://localhost:8000</code></pre>
<p>To connect it to a real model, get an API key from <b>openrouter.ai</b> (a few dollars of credit is far more than this course uses) and set it before starting the server:</p>
<pre><code>export OPENROUTER_API_KEY=sk-or-your-key-here
node server.js</code></pre>
<blockquote><p><b>What is an API key?</b> A paid password for the AI model. It lives in an "environment variable" on the server so the browser never sees it. <b>Never</b> paste a key into a file you might share, or into a chat window — keys leak from screenshots more often than from hacks. If you leak one, revoke it; it takes ten seconds.</p></blockquote>

<h2>Going deeper — the Python labs (optional)</h2>
<p>The <code>labs/</code> folder contains four small Python scripts that rebuild what you'll learn here from scratch — the agent loop, retrieval, memory, and an eval harness. They need Python 3.10+ and an Anthropic API key. Start with:</p>
<pre><code>python3 labs/lab1_loop.py "list the files you can see"</code></pre>
<p>You should see the agent's thought process, a line saying <code>-&gt; list_files()</code>, and an answer. The labs are the best next step after finishing this track — but they are not required for the course.</p>
`,
  },

  // ───────────────────────────── LEARN ─────────────────────────────

  loop: {
    title: "1. The Loop",
    kicker: "Every AI agent — every coding agent, research agent, 'autonomous' product — is this one small loop.",
    explain: `
<h2>First: what a model actually is</h2>
<p>Strip the mystique and a language model is a function:</p>
<pre><code>text in → probability of the next word-chunk → pick one → repeat</code></pre>
<p>Four consequences matter, in order of how often they bite people:</p>
<ul>
  <li><b>It has no memory.</b> None. A "conversation" is your app re-sending the entire transcript every turn. When a chatbot remembers your name, some code stored that and pasted it back in.</li>
  <li><b>The context window is its whole world.</b> If something isn't in the prompt, it doesn't exist to the model — no matter how true or important it is.</li>
  <li><b>It can't do anything.</b> A model emits text. It cannot read your files or send your email unless someone wrote a function that does that and wired it up. (That's the next lesson.)</li>
  <li><b>Same input, different output.</b> Plan for it.</li>
</ul>

<h2>Copy-paste vs. a loop</h2>
<p>You already know the copy-paste workflow: ask the model something, read the answer, paste it somewhere, paste the result back, say "not quite, try again". <b>You are the loop.</b></p>
<p>An agent flips that. You give the model a goal and some tools; it requests a tool, <i>your code</i> runs it and feeds the result back; repeat until it stops asking. <b>Code is the loop.</b> Three things change qualitatively:</p>
<ul>
  <li><b>It reacts to what it finds.</b> The model sees the real error, the real file contents — and adapts. Nobody wrote that branching logic.</li>
  <li><b>It runs while you don't.</b> Twenty steps at 3am costs the same effort as one.</li>
  <li><b>It's a program.</b> Programs can be versioned, tested, scheduled, and handed to a colleague. Your clipboard technique can't.</li>
</ul>

<h2>The loop, in full</h2>
<p>Open the <b>Code</b> tab above and press ▶ Run — the AI will walk you through it line by line. It really is this small:</p>
<pre><code>while True:
    response = model(messages, tools)
    messages.append(response)

    if response.stop_reason != "tool_use":
        break                      # model has nothing left to ask for

    for call in response.tool_calls:
        result = run(call)         # YOUR code, YOUR permissions
        messages.append(result)    # goes back in as the next turn</code></pre>

<blockquote><p><b>Rule worth writing down:</b> never enforce a constraint in the prompt that you could enforce in the tool. Prompts are requests. Code is a boundary.</p></blockquote>
`,
    code: OLD.loop.code,
    examples: OLD.loop.examples,
    tryIt: {
      label: "See the loop with your own eyes",
      desc: "Have the Builder make you an animated diagram of the agent loop.",
      prompt: "Build a one-page site that visually explains the AI agent loop: a circle of steps (user task → model thinks → tool call → tool result → back to model → final answer) with a glowing dot that travels around the loop. Include a short plain-English caption for each step. Dark background, modern look.",
    },
  },

  tools: {
    title: "2. Tools",
    kicker: "A model can only emit text. Tools are how it gets hands.",
    explain: `
<h2>What a tool is</h2>
<p>A tool is a function <b>you</b> wrote — read a file, search the web, send an email — plus a short description the model can read. The model never runs anything. It <b>requests</b> a tool by name, your code decides whether to actually run it, and the result goes back into the conversation as text.</p>
<p>That separation is the entire safety story of agents:</p>
<blockquote><p>The model asks. <b>Your code decides.</b> If the tool can't do something, no clever prompt — and no malicious input — can make it happen.</p></blockquote>

<h2>Descriptions are prompt engineering</h2>
<p>The model chooses tools purely from their descriptions. A tool described as <code>"reads stuff"</code> gets picked at the wrong times and ignored at the right ones. Most "the agent is dumb" complaints trace back to an ambiguous tool description, not a dumb model.</p>
<p>A good description says <b>what it does</b>, <b>when to use it</b>, and <b>what it returns</b>:</p>
<pre><code>BAD:   "Search."
GOOD:  "Search past support tickets by keyword. Use this for
        questions about a customer's history. Returns the 5
        most recent matching tickets as text."</code></pre>

<h2>Errors are food, not failures</h2>
<p>When a tool fails, don't crash — return the error <i>as text</i> into the conversation. The model reads "Error: file not found" like any other information and routes around it: tries a different file, lists the directory, or asks you. That recovery logic is free; nobody writes it.</p>

<h2>Where the danger lives</h2>
<p>Tools are also where agents get real-world consequences. Before giving an agent a tool, ask: <i>what's the worst thing this tool can do if called with the worst possible input?</i> If the answer scares you, constrain the tool itself — read-only access, a specific folder instead of the whole disk, a draft instead of a send. We'll come back to this in Evals.</p>
`,
    code: OLD.tools.code,
    examples: OLD.tools.examples,
    tryIt: {
      label: "Play with tool calls",
      desc: "Build a fake 'agent dashboard' and watch tool calls appear in a log.",
      prompt: "Build a small web app that simulates an AI agent's tool calls. Three buttons — read_file, search_web, send_email — and when I click one, a realistic fake 'tool call' line appears in a scrolling terminal-style log (with timestamp, arguments, and a fake result). Make it look like a sleek developer console.",
    },
  },

  workflows: {
    title: "3. Workflows",
    kicker: "When YOU can write the steps down in advance, you don't need an agent — you need a recipe.",
    explain: `
<h2>The recipe and the cook</h2>
<p>Imagine you run a kitchen. Two ways to get dinner made:</p>
<ul>
  <li><b>A recipe:</b> step 1, step 2, step 3 — written in advance, same order every time. Anyone can follow it, and you know exactly what happens at each step. This is a <b>workflow</b>.</li>
  <li><b>A trusted cook:</b> you say "make dinner from whatever's in the fridge" and they decide what to do next after opening the fridge. This is an <b>agent</b>.</li>
</ul>
<p>Both use the same model. The difference is <b>who decides the next step</b>. In a workflow, you decided when you wrote it. In an agent, the model decides at run time, inside the loop from Lesson 1.</p>

<h2>The two workflow shapes that cover almost everything</h2>
<h3>Chaining</h3>
<p>Fixed steps, output of one feeding the next:</p>
<pre><code>email → [summarize it] → [classify it] → [draft a reply] → human reviews</code></pre>
<p>Each box is one model call with one small job. Small jobs fail less than big ones — "summarize this email" beats "handle this email" every time.</p>
<h3>Routing</h3>
<p>One classification step decides which fixed path to take:</p>
<pre><code>            ┌→ [billing pipeline]
email → [classify] → [bug pipeline]
            └→ [general pipeline]</code></pre>
<p>The model makes exactly one decision — which branch — and you wrote every branch. Predictability stays high.</p>

<h2>Why start here and not with agents?</h2>
<p>Workflows are <b>debuggable</b>. When step 2 of 3 produces garbage, you know exactly where to look. When an agent free-styles its way through fifteen tool calls and produces garbage, you get to reconstruct what it was thinking. Workflows are also cheaper, faster, and far more predictable — and <b>most business tasks are workflows</b>: the steps are known, they were just never written down.</p>

<blockquote><p><b>The rule:</b> use a workflow when you can write the steps down in advance. Reach for an agent only when you genuinely can't — when the next step depends on what the previous one finds. "Which is it?" is the single most useful question to ask about any AI feature you're planning — or reading a press release about.</p></blockquote>

<h2>The toolbox — what people actually build workflows with</h2>
<p>Three tiers. Start at the top and move down only when you hit a wall:</p>

<h3>Tier 1 — No-code, visual (start here)</h3>
<p>You drag boxes on a canvas: "when an email arrives → summarize with AI → post to Slack". No programming, and the company hosts everything for you.</p>
<table>
  <tr><th>Tool</th><th>What it is &amp; when to pick it</th></tr>
  <tr><td>Zapier</td><td>Connects thousands of apps (Gmail, Sheets, Slack, Notion) with trigger → action chains, and has AI steps built in. Pick it when your workflow is mostly "move data between apps I already use". Free tier is ~100 runs/month; it gets pricey at volume.</td></tr>
  <tr><td>Make</td><td>Same idea as Zapier but a visual canvas with real branching — you can literally see your router as split arrows. More power per dollar, slightly steeper learning curve.</td></tr>
  <tr><td>n8n</td><td>The open-source one. Use their cloud, or self-host it free on your own server. Has first-class AI/LLM nodes. Pick it when Zapier's bill grows, when data must stay on your machines, or when you want a visual builder you fully own.</td></tr>
</table>

<h3>Tier 2 — Visual, AI-native</h3>
<table>
  <tr><th>Tool</th><th>What it is &amp; when to pick it</th></tr>
  <tr><td>Flowise</td><td>Open-source drag-and-drop builder specifically for LLM chains — prompts, retrieval, and model calls as connectable blocks. Good middle step between "boxes" and "code".</td></tr>
  <tr><td>Langflow</td><td>Same category as Flowise, Python-flavored. Both let you export what you built and call it as an API.</td></tr>
</table>

<h3>Tier 3 — Code (what this course teaches)</h3>
<table>
  <tr><th>Tool</th><th>What it is &amp; when to pick it</th></tr>
  <tr><td>a plain script</td><td>The Code tab above is a real workflow: a file with three model calls. This is more than it sounds — a Python or JavaScript file you can version, test, and schedule is the professional default, not the beginner option.</td></tr>
  <tr><td>Vercel AI SDK</td><td>A JavaScript/TypeScript library with clean helpers for model calls, chains, streaming, and tool use. The natural choice if your workflow lives inside a web app.</td></tr>
  <tr><td>the raw API</td><td>Every model provider (Anthropic, OpenAI, OpenRouter) is just an HTTP call: send messages, get text. This course's own server does exactly this — no library at all. Zero magic, total control.</td></tr>
</table>

<h2>From laptop to live — deploying and plugging in the backend</h2>
<p>This is the part nobody explains to beginners, so here it is plainly. Every AI product you've ever used has the same three-part shape:</p>
<pre><code>browser (frontend)  →  YOUR backend  →  model API (OpenRouter/Anthropic/...)
 no secrets here        the key lives        charges your card
                        here, in an
                        "environment variable"</code></pre>
<p>The browser can never talk to the model API directly, because anything in the browser is public — someone would open dev tools, copy your API key, and spend your money. So there is always a small middle piece — <b>the backend</b> — that holds the key and forwards requests. "Plugging in the backend" means exactly this: put the key in an environment variable on a server, and have your frontend call <i>your</i> server instead of the model company. (This very app works that way: the page you're reading calls <code>/api/...</code> on its own little server, and the key sits in a file that never reaches the browser.)</p>
<p>Where should it all run? Depends on which of two shapes your workflow has:</p>

<h3>Shape A — it has a web page people visit</h3>
<table>
  <tr><th>Host</th><th>How it works, step by step</th></tr>
  <tr><td>Vercel / Netlify</td><td>Made for frontends with small backends attached ("serverless functions" — backend code that runs only when called, no server to manage). Steps: (1) push your project to GitHub, (2) log into Vercel or Netlify and click "import repository", (3) in the project settings add your API key as an environment variable, e.g. <code>OPENROUTER_API_KEY</code>, (4) deploy. You get a free https URL, and every git push redeploys automatically. Free tier is plenty for a class project.</td></tr>
  <tr><td>Render / Railway</td><td>For when your backend is a real, always-running server (like this course's <code>server.js</code>) rather than functions. Same flow: connect GitHub repo → set start command (<code>node server.js</code>) → add the env var → deploy. Render's free tier sleeps after idle (~30s cold start); Railway is ~$5/month but never sleeps.</td></tr>
  <tr><td>a VPS</td><td>A Virtual Private Server — a bare Linux box you rent for ~$4–6/month (Hetzner, DigitalOcean). You ssh in, install Node or Python, copy your code, run it with a process manager so it survives reboots, and point a domain at it. Total control, lowest long-term cost, most ways to shoot yourself in the foot. Choose it when you want to <i>learn servers</i> or self-host tools like n8n — not for your first deploy.</td></tr>
</table>

<h3>Shape B — no web page, it just runs on a schedule</h3>
<p>"Every morning, read yesterday's support emails and post a summary to Slack" needs no website — it needs a <b>scheduler</b>:</p>
<table>
  <tr><th>Runner</th><th>How it works</th></tr>
  <tr><td>GitHub Actions</td><td>The underrated free option. Your script lives in a GitHub repo with a small config file saying "run daily at 7am". GitHub runs it on their machines; the API key goes in the repo's Settings → Secrets. Free for most realistic volumes.</td></tr>
  <tr><td>Zapier / Make / n8n</td><td>Schedules are built in — a "every day at 7am" trigger box. If you built the workflow there, hosting and scheduling are already done.</td></tr>
  <tr><td>cron on a VPS</td><td>The classic: one line in the server's cron table runs your script on any schedule. Pairs with the VPS row above.</td></tr>
</table>

<blockquote><p><b>The beginner path, spelled out:</b> build the logic here in the Builder → download the .zip → push it to GitHub → import to Vercel or Netlify → add your key as an environment variable → share the URL. Each of those steps is 5–10 minutes the first time and 1 minute forever after.</p></blockquote>

<hr>
<h2>🔨 Build it for real — step by step</h2>
<p>Reading about workflows is not building one. Below are two complete projects — one without code, one with. Do at least one before moving to the Agents lesson. Both build the <b>same</b> workflow (email triage: summarize → classify → draft reply), so you can feel how the no-code and code versions are the same recipe wearing different clothes.</p>

<h3>Project A — no-code triage in Zapier (~30 min, nothing to install)</h3>
<ol>
  <li><b>Sign up</b> at zapier.com (free plan is enough) and click <b>Create → Zap</b>. A Zap is one workflow: a trigger followed by actions.</li>
  <li><b>Add the trigger</b> — the "when". Choose <b>Email by Zapier → New Inbound Email</b>. It gives you a private email address like <code>something@zapiermail.com</code>; anything sent there starts the workflow. (Later, swap this for Gmail — Email by Zapier just skips account-connecting while you learn.)</li>
  <li><b>Add the AI step</b> — the "think". Add an action, choose <b>AI by Zapier → Analyze and Return Data</b>, and write a prompt like: <i>"Classify this email as billing, bug, or question, rate urgency high or normal, and write a 1-sentence summary."</i> Then click into the prompt and <b>insert the Body field from step 1</b> — that little insert-a-field move is the whole trick of no-code tools: it's how data flows down the chain.</li>
  <li><b>Add the output step</b> — the "do". Add an action: <b>Google Sheets → Create Spreadsheet Row</b>. Make a sheet with columns (category, urgency, summary), connect your Google account, and map the AI step's outputs to the columns — same insert-a-field move.</li>
  <li><b>Test it.</b> Every step has a Test button — use it on each step, watching what data comes out. This is the no-code version of reading the terminal.</li>
  <li><b>Publish</b>, then email your Zapier address something dramatic ("we were charged twice and finance is blocked!!"). Within a minute a classified row appears in your sheet.</li>
</ol>
<blockquote><p><b>What you just built:</b> trigger = input, AI step = one model call, Sheets step = output. A chain, exactly like the diagram at the top of this lesson. In n8n or Make it's the same three boxes on a canvas.</p></blockquote>

<h3>Project B — the same triage as real code (~45 min)</h3>
<p>This is the identical workflow as a single file you own completely. You need: <b>Node.js 18+</b> (install from nodejs.org — the LTS button; check with <code>node --version</code> in a terminal) and an <b>OpenRouter API key</b> (openrouter.ai → Keys; see Setup).</p>
<ol>
  <li><b>Make a folder</b> called <code>triage</code> anywhere, and put this file in it — <a href="projects/triage.js" download>download triage.js</a>, or create the file and copy the code below with any text editor.</li>
  <li><b>Read it before running it.</b> It's 45 lines and every one is something you already learned: one <code>ask()</code> helper (the raw API from the toolbox), then three small jobs in an order we wrote.</li>
  <li><b>Run it</b> from a terminal in that folder:
<pre><code># Mac / Linux
OPENROUTER_API_KEY=sk-or-your-key  node triage.js

# Windows PowerShell
$env:OPENROUTER_API_KEY="sk-or-your-key"
node triage.js</code></pre></li>
  <li><b>Watch the chain run</b> — each step prints its output before feeding the next. Total cost: about $0.001.</li>
</ol>
<pre><code>// triage.js — a real 3-step AI workflow (Lesson 3). Node 18+, no installs.
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
  if (!res.ok) throw new Error((data.error &amp;&amp; data.error.message) || "API error " + res.status);
  return data.choices[0].message.content.trim();
}

// The input. Later: read this from a file, an inbox, or a form.
const email = "Subject: charged twice?!\\n" +
  "Hi, I was billed twice for invoice 4471 this month and the export\\n" +
  "page is timing out. Finance is blocked on closing the quarter. - Dana";

// ── THE WORKFLOW — three small jobs, in an order YOU wrote ──
async function main() {
  console.log("STEP 1 — summarize");
  const summary = await ask("Summarize this email in 2 sentences:\\n" + email);
  console.log(summary + "\\n");

  console.log("STEP 2 — classify");
  const category = await ask(
    "Classify this issue. Reply with exactly one word - billing, bug, or question:\\n" + summary);
  console.log(category + "\\n");

  console.log("STEP 3 — draft a reply");
  const reply = await ask(
    "Draft a short, calm support reply for this " + category + " issue. No promises of refunds:\\n" + summary);
  console.log(reply);
}

main().catch((e) =&gt; console.error("Workflow failed:", e.message));</code></pre>
<p><b>Now break it</b> (failures are the curriculum):</p>
<ul>
  <li>Change the classify prompt to just "Classify this" — watch the one-word contract collapse and imagine the Sheets column it would have corrupted.</li>
  <li>Change the email to one that's a bug AND a billing issue. Run it three times. Does it classify the same way every time? That wobble is why the Evals lesson exists.</li>
  <li>Swap the email for a real annoying one from your own inbox (remove names first).</li>
</ul>

<h3>Project C — put it on a schedule with GitHub Actions (~20 min)</h3>
<p>A workflow that only runs when you're at the keyboard isn't automation yet. GitHub will run it for you, free:</p>
<ol>
  <li>Create a free account at github.com, then a <b>new repository</b> (private is fine) and upload <code>triage.js</code> (the "uploading an existing file" link — no git commands needed). Or skip the uploading entirely: if the project is in the Builder, its <b>⬆ GitHub</b> button creates the repo and pushes the files for you.</li>
  <li>In the repo: <b>Settings → Secrets and variables → Actions → New repository secret</b>. Name: <code>OPENROUTER_API_KEY</code>, value: your key. This is the "environment variable on someone else's server" from the deploy section — the professional way to store a key.</li>
  <li>Add a second file at exactly this path: <code>.github/workflows/daily.yml</code> — <a href="projects/daily.yml" download>download it</a> or copy:
<pre><code># daily.yml — run triage.js on a schedule with GitHub Actions.
name: daily-triage
on:
  schedule:
    - cron: "0 7 * * *"   # every day at 07:00 UTC
  workflow_dispatch:       # adds a manual "Run workflow" button
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: node triage.js
        env:
          OPENROUTER_API_KEY: \${{ secrets.OPENROUTER_API_KEY }}</code></pre></li>
  <li>Open the repo's <b>Actions</b> tab → daily-triage → <b>Run workflow</b>. Watch it run on GitHub's machine and print the same three steps you saw locally. From now on it also runs itself every morning.</li>
</ol>
<blockquote><p><b>You have now deployed an AI workflow.</b> Code in a repo, key in a secret, a machine you don't own running it on a schedule. That's not a toy version of the real thing — that <i>is</i> the real thing.</p></blockquote>
`,
    code: `# Workflows — when YOU decide the steps
#
# A workflow is a fixed recipe. The model does each step,
# but YOU wrote the order. Compare with the agent loop,
# where the MODEL picks the next step.

# ─── SHAPE 1: CHAINING ───
# Output of one small model call feeds the next.

def summarize(email):
    return model("Summarize this email in 2 sentences: " + email)

def classify(summary):
    return model("Classify as billing/bug/question. One word: " + summary)

def draft_reply(summary, category):
    return model("Draft a short " + category + " reply for: " + summary)

def handle_email(email):
    summary  = summarize(email)          # step 1
    category = classify(summary)         # step 2
    return draft_reply(summary, category)  # step 3
    # Always these steps. Always this order. Debuggable.

# ─── SHAPE 2: ROUTING ───
# The model makes ONE decision: which branch. You wrote every branch.

def handle_email_routed(email):
    category = classify(email)
    if category == "billing":
        return billing_pipeline(email)   # fixed steps for billing
    if category == "bug":
        return bug_pipeline(email)       # fixed steps for bugs
    return general_pipeline(email)

# --- KEY INSIGHT ---
# Workflow: you decide the steps. Predictable, debuggable, cheap.
# Agent:    the model decides the steps, in a loop. Flexible, riskier.
#
# Start with a workflow. Upgrade to an agent ONLY when you
# cannot write the steps down in advance.
#
# Exercise: think of a task from your job. Can you write its
# steps down right now? Then it's a workflow.`,
    examples: [
      {
        name: "Recipe vs Cook",
        desc: "Explain the difference between a workflow and an agent without any code.",
        goal: "Explain the difference between an AI workflow and an AI agent using the kitchen analogy of a recipe versus a cook.",
        system: "You are a patient teacher. Use analogies. No jargon.",
        checks: "- Maps the recipe to a workflow (fixed steps, written in advance)\n- Maps the cook to an agent (decides the next step at run time)\n- States clearly WHO decides the next step in each\n- Under 200 words",
      },
      {
        name: "Design a Chain",
        desc: "Break a fuzzy job into a fixed chain of small model calls.",
        goal: "Break 'turn raw meeting notes into a Slack summary for the team' into a chain of 3 separate, small model-call steps.",
        system: "You are a workflow designer. Each step must be one small job with a clear input and output. Small jobs fail less than big ones.",
        context: "The input is messy stream-of-consciousness meeting notes. The final output must be a short Slack message with decisions and action items separated.",
        checks: "- Exactly 3 steps, each with named input and output\n- Each step is a genuinely small job (not 'handle the notes')\n- The output of each step is the input of the next\n- Ends with a human review step",
      },
      {
        name: "Workflow or Agent?",
        desc: "The judgment call this whole lesson exists to teach.",
        goal: "For each of these four tasks, decide: workflow or agent? Justify each in one sentence.",
        system: "You are a pragmatic AI architect. The rule: workflow when the steps can be written in advance, agent only when the next step depends on what the previous one finds.",
        context: "Tasks: (1) Every invoice that arrives, extract vendor, amount, and due date into a spreadsheet row. (2) 'Find out why our signups dropped last week' across analytics, support tickets, and release notes. (3) Translate every new blog post into Spanish and French. (4) 'Fix the failing test in this repository.'",
        checks: "- Marks 1 and 3 as workflows (steps known in advance)\n- Marks 2 and 4 as agents (next step depends on findings)\n- Each justification mentions who decides the next step\n- No hedging — a clear call on all four",
      },
      {
        name: "Pick the Right Tool",
        desc: "Zapier, n8n, GitHub Actions, or code? The judgment beginners actually need.",
        goal: "For each of these four workflow ideas, pick the most sensible tool (Zapier/Make, n8n self-hosted, GitHub Actions + a script, or a coded web app on Vercel) and justify each choice in one sentence.",
        system: "You are a pragmatic consultant. Pick the SIMPLEST tool that fits: no-code first, code only when needed. Mention cost and where the API key would live.",
        context: "Ideas: (1) When a Stripe payment fails, summarize the customer's history with AI and post it to Slack. (2) A company handling medical data wants AI email triage but data must never leave their own servers. (3) Every Monday 8am, summarize last week's GitHub issues into a report. (4) A public-facing page where visitors paste a contract and get a plain-English summary.",
        checks: "- Marks 1 as Zapier/Make (SaaS-to-SaaS glue, hosted for you)\n- Marks 2 as self-hosted n8n or code on their own VPS (data residency)\n- Marks 3 as GitHub Actions on a schedule (free, no server)\n- Marks 4 as a coded app on Vercel/Netlify with the key in an env var\n- Each answer says where the API key lives",
      },
      {
        name: "Hard: The Step That Needs a Decision",
        desc: "Find the exact point where a fixed chain stops being enough.",
        goal: "This support pipeline works until it doesn't: summarize → classify → draft reply. Identify the inputs where a fixed chain fails, and say what the SMALLEST fix is — routing, or a full agent?",
        system: "You are a systems designer who prefers the smallest sufficient mechanism. Adding an agent where a router suffices is over-engineering.",
        context: "Failing inputs: an email in French, an email that is actually spam, an email that contains three unrelated issues at once, and an email where the customer threatens legal action.",
        checks: "- Recognizes French/spam/legal as ROUTING problems (one classify step choosing a branch)\n- Recognizes the three-issues email as the genuinely hard case (split, then route each)\n- Explicitly rejects the full agent as unnecessary here\n- States the general principle: escalate mechanism only when the simpler one provably fails",
      },
    ],
    tryIt: {
      label: "Watch data flow through a chain",
      desc: "Build an interactive email-triage pipeline you can click through.",
      prompt: "Build a page that visualizes an email-triage workflow as three connected steps: Summarize → Classify → Draft reply. Include a sample messy email, and a Run button that animates the data flowing through each step, showing each step's output appearing in its box one after another (use fake but realistic outputs). Clean, modern pipeline diagram look.",
    },
  },

  agents: {
    title: "4. Agents",
    kicker: "The loop + tools + a goal. Forty lines. And one more idea — context — that makes or breaks them.",
    explain: `
<h2>You already know all the parts</h2>
<p>An agent is the loop from Lesson 1, the tools from Lesson 2, and a goal — run until the model stops asking for tools. The <b>Code</b> tab has a complete, working agent in ~40 lines. Every coding agent, research agent, and "autonomous" product you've read about is this pattern plus more tools and better prompts. Read it top to bottom; there is no hidden magic elsewhere.</p>
<p>What makes it an <i>agent</i> rather than a workflow: <b>the model picks the next step.</b> Ask it to "email the owner of the busiest server" and it will call <code>get_metrics</code>, read the result, pick the busiest server, feed that into <code>get_owner</code>, and feed <i>that</i> into <code>send_email</code> — a chain nobody wrote, assembled at run time from what each tool returned.</p>

<h2>The idea that makes agents work: context</h2>
<p>The context window is the model's <b>entire world</b>. Every turn of the loop, the model sees exactly one thing: the conversation so far — task, tool calls, tool results. It has no other source of knowledge about your problem. This has two hard consequences:</p>
<ul>
  <li><b>Space:</b> the window is finite, and you pay per token. You can't just shovel everything in.</li>
  <li><b>Attention:</b> more is not better. Bury the one line that matters among forty irrelevant ones and the model will miss it — reliably. This failure mode has a name: <i>context rot</i>.</li>
</ul>
<blockquote><p><b>The whole game:</b> get the right few thousand tokens into the window, and as little else as possible. When an agent misbehaves, the first debugging question is always the same: <i>what was actually in its context?</i> Usually the answer explains everything.</p></blockquote>

<h2>What can go wrong (and why it's survivable)</h2>
<ul>
  <li><b>It loops forever.</b> An agent chasing an unanswerable goal will happily call tools until the sun burns out. That's why every real agent has <code>max_turns</code> — and why hitting the limit should fail <i>loudly</i>, not return a half-answer that looks real.</li>
  <li><b>A tool keeps failing.</b> The agent retries, tries alternatives, then gives up or asks for help — different path each run. You cannot judge this behavior from one run, which is the whole argument for the next lesson.</li>
  <li><b>It reads something hostile.</b> If an agent reads untrusted text — emails, web pages — assume that text may contain instructions, and that the model may follow them. There is no reliable prompt-level fix. The defense is the Lesson 2 rule: the boundary lives in the <i>tools</i>, not the prompt.</li>
</ul>

<h2>The toolbox — what people actually build agents with</h2>

<h3>Step 0 — use one before you build one</h3>
<table>
  <tr><th>Tool</th><th>Why it matters</th></tr>
  <tr><td>Claude Code</td><td>A coding agent that lives in your terminal or editor: you give it a goal, it reads files, writes code, runs commands, and reports back — the 40-line loop from the Code tab, productionized. Using one daily for two weeks teaches you more about agents than any tutorial. (This entire course app was built by one.)</td></tr>
  <tr><td>Cursor / Copilot</td><td>Coding agents living inside an editor. Same loop, different packaging. Watch <i>which tool it calls next and why</i> — that's the skill transferring to you.</td></tr>
</table>

<h3>Step 1 — build with an SDK that keeps the loop visible</h3>
<table>
  <tr><th>Tool</th><th>What it gives you</th></tr>
  <tr><td>the raw API</td><td>What the Code tab shows: any model provider + a while-loop you wrote yourself. Genuinely viable for real tools, and the best way to learn. Start here.</td></tr>
  <tr><td>Claude Agent SDK</td><td>Anthropic's kit for building agents: the loop, tool plumbing, retries, and permissions handled for you, while the structure stays inspectable. The step up when your hand-rolled loop needs to get serious.</td></tr>
  <tr><td>OpenAI Agents SDK</td><td>Same category from OpenAI — agents, tool calls, and handoffs between multiple agents. Pick whichever matches the models you use.</td></tr>
  <tr><td>Vercel AI SDK</td><td>JavaScript/TypeScript. Its tool-calling helpers give you an agent loop in a few lines inside a web app — pairs naturally with a Vercel deploy from the Workflows lesson.</td></tr>
</table>

<h3>Step 2 — frameworks: handle with care</h3>
<table>
  <tr><th>Tool</th><th>The honest take</th></tr>
  <tr><td>LangChain / LangGraph</td><td>The most popular ecosystem; LangGraph models agents as graphs of steps. Powerful — but layers of abstraction sit between you and the loop, and when something misbehaves you debug the framework, not your logic. Fine <i>after</i> you can write the 40-liner from memory.</td></tr>
  <tr><td>CrewAI</td><td>"Teams" of agents with roles that collaborate. Looks amazing in demos; in practice multi-agent systems multiply every failure mode you met above. Learn single-agent reliability first.</td></tr>
  <tr><td>MCP servers</td><td>Not a framework — the plug format for tools (Lesson 2). Before writing a custom tool, check if an MCP server for it already exists (there are thousands: Slack, GitHub, databases, browsers). Same guardrails apply: a server someone else wrote still runs with whatever permissions you hand it.</td></tr>
</table>

<h2>Where agents run — plugging in the backend</h2>
<p>Same three-part shape you learned in Workflows — browser → your backend → model API, with the key in an environment variable on the backend — but agents add <b>one catch that bites everyone</b>:</p>
<blockquote><p><b>Agents run long.</b> A workflow is often one model call — a second or two. An agent might loop through fifteen tool calls over several minutes. Serverless functions (Vercel/Netlify) are built for short requests and cut you off after seconds-to-a-minute — fine for chat and single calls, fatal for long agent runs.</p></blockquote>
<p>So the hosting choice sharpens:</p>
<table>
  <tr><th>Situation</th><th>Where to run it</th></tr>
  <tr><td>short runs</td><td>An agent that finishes in under ~30 seconds (a few tool calls) fits a serverless function on Vercel/Netlify. Stream the response so the user watches progress instead of a spinner.</td></tr>
  <tr><td>long runs</td><td>A persistent server — Render, Railway, or a VPS — where a request can take as long as it needs. This course's own server is exactly this: <code>node server.js</code> on a box, streaming the Builder's progress live. What you're using right now IS the architecture.</td></tr>
  <tr><td>scheduled runs</td><td>An agent nobody watches ("triage the inbox nightly") is a script + a scheduler: GitHub Actions or cron on a VPS, key in the secrets store, transcript written to a log you actually read.</td></tr>
</table>
<p>And because an agent acts on the world, deployment is where the Evals-lesson guardrails stop being theory: budget the loop (<code>max_turns</code>, token caps, timeouts), log full transcripts, and gate anything irreversible behind a human. Deploying an unbudgeted agent is how you meet your first surprise API bill.</p>

<hr>
<h2>🔨 Build it for real — your first agent, step by step</h2>
<p>About 45 minutes, and it ends with an AI agent reading and writing files on <b>your</b> computer, using a loop you can see every line of. This is the same exercise professional engineers do to learn agents — there is no beginner version and expert version; there is just the loop.</p>

<h3>Step 1 — setup (~10 min, once)</h3>
<ol>
  <li>Install <b>Node.js 18+</b> from nodejs.org (the LTS button). Check it worked: open a terminal (Setup lesson explains terminals) and run <code>node --version</code>.</li>
  <li>Get an <b>OpenRouter key</b> at openrouter.ai → Keys (a few dollars of credit lasts this whole course).</li>
  <li>Make a folder called <code>my-agent</code> somewhere you can find it.</li>
</ol>

<h3>Step 2 — the agent (read it before you run it)</h3>
<p>Put <a href="projects/agent.js" download>agent.js</a> in your folder (download, or copy the code below into a new file with any text editor). It is exactly the three things this course taught: <b>tools</b> at the top (Lesson 2), a <b>model call</b> in the middle, and <b>the loop</b> at the bottom (Lesson 1). Nothing else.</p>
<pre><code>// agent.js — a real AI agent in ~70 lines (Lesson 4). Node 18+, no installs.
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
  list_files: () =&gt; fs.readdirSync(".").join("\\n"),
  read_file: (a) =&gt; fs.readFileSync(safe(a.path), "utf8"),
  write_file: (a) =&gt; { fs.writeFileSync(safe(a.path), a.content); return "wrote " + a.path; },
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
  if (!res.ok) throw new Error((data.error &amp;&amp; data.error.message) || "API error " + res.status);
  return data.choices[0].message;
}

// ── THE LOOP — this is the whole agent (Lesson 1) ──
async function agent(task) {
  const messages = [{ role: "user", content: task }];

  for (let turn = 1; turn &lt;= MAX_TURNS; turn++) {
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
console.log("TASK: " + task + "\\n");
agent(task).then((answer) =&gt; console.log("\\nANSWER:\\n" + answer));</code></pre>

<h3>Step 3 — give it something to chew on</h3>
<p>Put <a href="projects/notes.txt" download>notes.txt</a> (messy fake meeting notes) in the same folder — or write your own: a few real bullet points, some needing action, some noise.</p>

<h3>Step 4 — run it</h3>
<pre><code># Mac / Linux — from inside the my-agent folder
OPENROUTER_API_KEY=sk-or-your-key  node agent.js "Read notes.txt and write actions.md listing only the items that need an owner or a decision"

# Windows PowerShell
$env:OPENROUTER_API_KEY="sk-or-your-key"
node agent.js "Read notes.txt and write actions.md listing only the items that need an owner or a decision"</code></pre>
<p>This is a real run of this exact file (your wording will differ — Lesson 1 told you it would):</p>
<pre><code>TASK: Read notes.txt and write actions.md listing only the items that need an owner or a decision

  → read_file {"path":"notes.txt"}
  → write_file {"path":"actions.md","content":"- onboarding still losing users at the email ver

ANSWER:
The file actions.md has been created, listing only the items that
require an owner or a decision.</code></pre>

<h3>Step 5 — the moment that matters</h3>
<p>Open your folder. <b>actions.md exists.</b> The dying office plants and the moved retro are gone; the pricing decision and the on-call gap made the cut. Nobody wrote filtering logic — you gave a goal and tools, and the loop did the rest. Every agent product you will ever see demoed is this, scaled up.</p>

<h3>Step 6 — now break it (this is the actual lesson)</h3>
<table>
  <tr><th>Break</th><th>What it teaches</th></tr>
  <tr><td>delete notes.txt, run again</td><td>Watch the error go back in as text and the agent adapt — it will list files, or ask. Recovery logic nobody wrote.</td></tr>
  <tr><td>MAX_TURNS = 2</td><td>The loop gets cut off and says so loudly. Silent truncation is how agents lie; loud is a feature.</td></tr>
  <tr><td>blur a description to "reads stuff"</td><td>Watch tool choice degrade. Most "the agent is dumb" bugs live here.</td></tr>
  <tr><td>same task, 3 runs</td><td>Different paths, same-ish result. Now imagine debugging this from a colleague's screenshot — that's why you log transcripts.</td></tr>
  <tr><td>ask it to read ../secret.txt</td><td>The <code>safe()</code> check refuses. The prompt never protected you; the tool did.</td></tr>
</table>

<h3>Step 7 — make it yours</h3>
<p>Add one tool that touches <i>your</i> world, then give a task that needs two tools in sequence — that's when it stops feeling like a chatbot. Ideas that fit in 30 minutes: <code>search_files(text)</code> — loop over files and return matching lines; <code>fetch_url(url)</code> — fetch a page and strip tags; <code>today()</code> — return the date so it can write dated notes. Copy the shape of an existing tool: one plain function + one description block. When it works, you have built a personal agent no one else has — and you know every line, which is more than most people shipping "AI agents" can say.</p>
<blockquote><p><b>Then deploy it</b> the same way as the Workflows lesson's Project C: repo + secret + a schedule, or wrap it in a small server on Render when it needs a chat page. The Builder you've been using is literally this file plus a web page — read <code>server.js</code> in this course's repo and check.</p></blockquote>

<hr>
<h2>🏆 Capstone — your personal weekly rundown bot</h2>
<p>Everything in this course, in one real tool you'll actually keep — and here's the twist: <b>you will not write a single line of code.</b> You'll get it built by <i>prompting</i>, because directing an AI well — being specific, reading what comes back, catching what's wrong, asking for the fix — is the skill this course has secretly been teaching you all along. The Builder writes; you decide.</p>
<p><b>What you're building:</b> a bot that lives in the folder where your week's work already happens — notes, drafts, lists, plans, anything text. Run it, and an agent reads what changed this week, figures out what you did and what's still hanging, and sends the rundown to your phone on Telegram.</p>
<pre><code>            ┌─ list_files ─────┐
you ──task──►    THE LOOP      ├──► send_telegram ──► your phone
            └─ read_file ──────┘</code></pre>
<p>Look familiar? It's <code>agent.js</code> from earlier in this lesson with one new tool — a Telegram mouth. The loop doesn't change. It never changes. That's the entire point of this course.</p>

<h3>Step 1 — create your Telegram bot (~5 min, all clicking, no code)</h3>
<ol>
  <li>In Telegram, search for <b>@BotFather</b> (the official one, blue check), send <code>/newbot</code>, pick a name and a username. BotFather replies with a <b>token</b> like <code>7213...:AAH...</code> — copy it somewhere safe. It's a secret: treat it like a password.</li>
  <li>Open a chat with your new bot and send it any message ("hi"). Required — bots can't message you first.</li>
  <li>In a browser, visit <code>https://api.telegram.org/botYOUR_TOKEN/getUpdates</code> (your token pasted into the URL). In the reply, find <code>"chat":{"id":123456789</code> — that number is your <b>chat id</b>.</li>
</ol>

<h3>Step 2 — make your week folder (~2 min)</h3>
<p>Create a folder called <code>my-week</code> and drop this week's stuff in it: meeting notes, that half-written proposal, your to-do list, the draft you keep avoiding. Text files are what the bot reads (.txt, .md, .csv). No files like that? Start the habit today — one <code>week-notes.txt</code> where you jot what happened each day is enough, and it makes the bot dramatically more useful.</p>

<h3>Step 3 — prompt the Builder (this IS the exercise)</h3>
<p>Open the Builder and paste this spec — then <b>stay in the conversation</b>. The first version is never the final version; the skill is the back-and-forth.</p>
<pre><code>Build a Node.js script called rundown-bot.js: my personal weekly
rundown bot. It lives inside the folder where my work notes are.

Tools the agent can call:
- list_files: list the files in its folder, with how recently
  each one changed
- read_file: read one text file (.txt, .md, .csv only)
- send_telegram: send me a message with the Telegram Bot API using
  env vars TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID; if they are
  missing, print the message to the console instead (dry run)

Wire the tools into an OpenRouter tool-calling agent loop
(OPENROUTER_API_KEY from env, max 10 turns). The task: look at what
changed in the last 7 days, read those files, and send me one warm,
honest report - what I worked on, what looks unfinished, and one
small suggestion for next week. Plain text, under 300 words.
Zero npm dependencies. Include a README.md with setup steps.</code></pre>
<p>Now iterate like someone who read this course. Try these, in order, and read what changes each time:</p>
<ul>
  <li><i>"Explain what the loop in this file does, step by step, like I'm new."</i> — never ship what you can't explain.</li>
  <li><i>"Make it skip any file named private.md, and enforce that in the read_file tool itself, not in the prompt."</i> — Lesson 1's rule, applied by you, in plain English.</li>
  <li><i>"What happens if a file is huge? Add a size limit."</i> — you just did a code review without reading code.</li>
</ul>
<p><b>Shortcut if you're stuck:</b> <a href="projects/rundown-bot.js" download>download the tested version</a> and compare it with what your prompting produced. Spotting the differences is a better exercise than either file alone.</p>

<h3>Step 4 — run it, dry first</h3>
<p>Download the .zip from the Builder, put the files in your <code>my-week</code> folder, and run it <b>without</b> the Telegram variables — it prints instead of sending. Gate the outward-facing part until the boring parts work: that's the Evals-lesson guardrails, applied.</p>
<pre><code># Mac / Linux — from inside the my-week folder
OPENROUTER_API_KEY=sk-or-your-key  node rundown-bot.js

# Windows PowerShell
$env:OPENROUTER_API_KEY="sk-or-your-key"
node rundown-bot.js</code></pre>
<p>A real dry run of the tested version, on a folder holding a client proposal, a week of daily notes, and one stale ideas file:</p>
<pre><code>  → list_files {}
  → read_file {"path":"client-proposal.md"}
  → read_file {"path":"week-notes.txt"}
  → send_telegram {"text":"Here's your weekly rundown ..."}

This week, you worked on the Riverside Bakery proposal (3 pages
agreed, pricing drafted at $1,800 but you're unsure it's enough)
and built an email triage tool in your AI course.
What's unfinished: the bakery pricing, and your billing-model
decision - per project or per hour. For next week: finalize the
bakery pricing by Friday, and ask Tunde for advice if needed.</code></pre>
<p>Read that trace like a graduate of this course: it checked the folder, read the two files that changed this week, <b>skipped the stale ideas file and its own script</b>, spotted both unfinished decisions, and pulled "ask Tunde" out of the notes as its suggestion. Nobody wrote any of that logic. The loop plus good tool descriptions produced it.</p>

<h3>Step 5 — go live</h3>
<p>Add the two Telegram variables and run again — the rundown lands on your phone. Every Friday from now on: open the folder, run one command, get your week back in 300 words. (Automating even that command is genuinely optional — a bot you run on purpose is a bot you trust.)</p>

<blockquote><p><b>Take stock.</b> You specified an agent in plain English, reviewed what an AI built, demanded fixes using concepts you learned here — tools as boundaries, dry runs, size limits — and shipped a tool you'll actually use. That's not a course exercise imitating real work. That is real work.</p></blockquote>

<h3>🎓 The dev variant — your GitHub day, every morning (optional)</h3>
<p>If you live on GitHub, build the sibling whose eyes are your <i>repositories</i>: the PRs you opened and merged, the issues you filed or are assigned to, with commits as a fallback for the days you push straight to main. Same loop. Different eyes. Build it the same way — by prompting. Paste this into the Builder:</p>
<pre><code>Build a Node.js script called daily-bot.js: my daily GitHub rundown
bot. Zero npm dependencies (Node 18+ fetch).

Tools the agent can call:
- my_prs: my pull requests updated in the last DAYS_BACK days
  (GitHub search API: is:pr author:GITHUB_USERNAME), and whether
  each is OPEN, MERGED, or CLOSED
- my_issues: open issues I created or that are assigned to me
  (two searches, author: and assignee:, de-duplicated)
- recent_repos: my repos by most recent push
- repo_commits: commit messages since DAYS_BACK for one repo
  (fallback - I often commit straight to main)
- send_telegram: Telegram Bot API using env TELEGRAM_BOT_TOKEN and
  TELEGRAM_CHAT_ID; when missing, print instead (dry run).
  Strip markdown symbols inside the tool, not in the prompt.

Env vars: OPENROUTER_API_KEY, GITHUB_USERNAME, optional GITHUB_TOKEN
and DAYS_BACK (default 1). Agent loop via OpenRouter tool calling,
max 12 turns. The task: report merges and shipped work first, then
what is open on my plate, then ONE priority for today - if items
carry P0/P1/P2 labels, the most urgent always wins. Plain text,
under 250 words. Include a README.md with setup steps.</code></pre>
<p>Then iterate like you mean it:</p>
<ul>
  <li><i>"Show me exactly what the my_prs search query sends to GitHub, and explain each part."</i></li>
  <li><i>"On Mondays I want the weekend included — read DAYS_BACK from the environment and explain where I'd set it to 3."</i></li>
  <li><i>"Add a rule in the send_telegram tool: if the message is over 4000 characters, split it into two messages."</i> — you just handled a real API limit, by prompting.</li>
</ul>
<p>The tested version to compare against: <a href="projects/daily-bot.js" download>daily-bot.js</a>. Run it with <code>GITHUB_USERNAME=you</code> (dry-run first, as always). To make it truly daily: push it to a repo with the Builder's <b>⬆ GitHub</b> button and use the Workflows lesson's Actions pattern with <code>cron: "0 7 * * *"</code> — your rundown is waiting when you sit down.</p>
<p>And when you text it a question and get silence — that's not a bug, it's an architecture lesson, and the upgrade (<a href="projects/listen-bot.js" download>listen-bot.js</a> — v2 with ears) plus the full, mistakes-included story of building both is in the <b>📓 Build Diary</b> in the sidebar.</p>
`,
    code: OLD.agent.code,
    examples: OLD.agent.examples.concat([
      {
        name: "Where Does It Run?",
        desc: "Serverless, persistent server, or scheduler — the deployment judgment call.",
        goal: "For each of these three agents, decide where it should run (serverless function, persistent server like Render/VPS, or a scheduler like GitHub Actions) and justify each in a sentence.",
        system: "You are a pragmatic infrastructure advisor for beginners. The deciding factors: how long a run takes, whether a human is watching, and where the API key can live safely.",
        context: "Agents: (1) A support chatbot on a website — each reply takes 2-5 seconds. (2) A research agent that takes 5-10 minutes to investigate a company across many sources, watched live by the user. (3) An inbox-triage agent that runs every night at 2am with nobody watching.",
        checks: "- Marks 1 as serverless (short runs, scales with traffic)\n- Marks 2 as a persistent server with streaming (exceeds serverless timeouts)\n- Marks 3 as a scheduler (GitHub Actions or cron) with transcripts logged\n- Every answer says the key lives in an environment variable or secrets store, never the browser",
      },
      {
        name: "Hard: Find the One Line That Matters",
        desc: "Context rot — bury the key fact in a long brief and watch precision beat volume.",
        goal: "From this long, mostly-irrelevant brief, choose only what belongs in the agent's context window to answer the question, and justify every cut.",
        system: "You are a context engineer. Precision beats volume. Include only what changes the answer.",
        context: "Question: what is our refund window for enterprise customers? Brief: office move dates, the pricing team's history, three paragraphs on brand colors, one buried sentence -- 'Enterprise contracts allow refunds within 45 days, all others 30' -- then the holiday party and hiring plans.",
        checks: "- Keeps the single 45-day refund sentence\n- Explicitly drops the office, brand, party, and hiring content\n- Explains that burying that line among 40 is exactly how models miss it\n- Total selected context under 60 words",
      },
    ]),
    tryIt: {
      label: "Direct a real agent",
      desc: "The classic first build — describe an app, watch the files appear.",
      prompt: "Build a Pomodoro timer web app: a 25:00 countdown with Start, Pause, and Reset buttons, a satisfying progress ring, and a short break mode. Premium dark design — glassmorphism, nice typography. Make it actually work.",
    },
  },

  evals: {
    title: "5. Evals",
    kicker: "How you know your AI tool actually works — and the difference between a demo and something people can trust.",
    explain: `
<h2>The problem nobody warns you about</h2>
<p>You build an AI tool. You try it once. It works! You show a colleague. It fails. You tweak the prompt. Now it works on their example — did it still work on yours? You have no idea. Without a measuring stick you're doing this: <i>change the prompt, try one example, it looks better, ship it.</i> You have no idea whether you improved anything or quietly broke three other cases.</p>

<h2>An eval is just a checklist</h2>
<p>An eval is a list of inputs and what a correct output looks like. <b>That's the whole thing.</b> No framework, no math degree:</p>
<pre><code>Input:    "We were charged twice and the export is broken."
Correct:  category = billing, urgency = high

Input:    "Just wanted to say the new dashboard is great!"
Correct:  category = feedback, urgency = low</code></pre>
<p>Run every case, count the passes, get a score. Change your prompt, run again, compare. Now you're doing engineering instead of vibes.</p>

<h2>The moment that sells the whole practice</h2>
<p>Open the <b>Code</b> tab — it's a real 5-case eval harness. Now imagine adding this perfectly sensible instruction to your prompt: <i>"Always err on the side of high urgency so nothing gets missed."</i> Sounds responsible, right? Run the suite again and the score <b>drops</b> — normal-urgency cases now get marked high, which in real life means genuinely urgent tickets drown in noise. An obviously-good change measurably made things worse, and without the suite you'd have shipped it and never known. That moment is the entire argument for evals.</p>

<h2>What makes a suite good</h2>
<ul>
  <li><b>Hard cases, not easy ones.</b> Ten nasty examples beat a hundred obvious ones — the sarcastic review, the polite email that's actually an emergency, the message with three issues at once.</li>
  <li><b>Run each case several times.</b> Non-determinism means a case can pass 60% of the time. A suite that runs each case once will lie to you with a straight face.</li>
  <li><b>Write cases before you tune.</b> Otherwise you'll unconsciously write tests your current prompt already passes.</li>
  <li><b>Writing down what "correct" means is genuinely hard.</b> That difficulty is not a distraction from the work — it <i>is</i> the work.</li>
</ul>

<h2>Before you trust it: the guardrails</h2>
<p>A demo needs to work once, for you, while you watch. A tool needs to work most times, for others, when you're not watching. Evals get you measurement; guardrails make the remaining failures survivable:</p>
<table>
  <tr><th>Principle</th><th>In practice</th></tr>
  <tr><td>least privilege</td><td>Read-only access. A folder, not the whole disk. A scoped key.</td></tr>
  <tr><td>reversible</td><td>Draft, don't send. Stage, don't commit. Soft delete.</td></tr>
  <tr><td>human gate</td><td>Anything that spends money, emails a customer, or deletes data.</td></tr>
  <tr><td>constrain in code</td><td>If the tool can't do it, no prompt injection can make it happen.</td></tr>
  <tr><td>log everything</td><td>When it misbehaves you need to see exactly what it saw.</td></tr>
  <tr><td>budget the loop</td><td>Turn limits, token limits, timeouts. Runaway loops are expensive.</td></tr>
</table>
`,
    code: OLD.evals.code,
    examples: OLD.evals.examples,
    tryIt: {
      label: "Build an eval dashboard",
      desc: "Make the score visible — the way real AI teams see their systems.",
      prompt: "Build an eval dashboard page: a table of 5 test cases for a support-ticket classifier (input text, expected category, expected urgency), each with a pass/fail badge, a big overall score ring at the top, and a 'Run suite' button that re-runs with slightly randomized fake results to show the score changing between runs. Clean dashboard design.",
    },
  },

  diary: {
    title: "📓 Build Diary — how the author's bot really got built",
    kicker: "The exact steps, in order, mistakes left in. This happened on July 22, 2026, in one afternoon.",
    explain: `
<p>Every tutorial you've ever read was cleaned up afterwards. This one isn't. Below is the real sequence of building the author's GitHub → Telegram bot — the same one from Lesson 4's dev variant — including the three mistakes, because <b>the mistakes are where the lessons live</b>. Everything here was done with the concepts in this course and nothing else.</p>

<h2>1 · The spec came first, not the code</h2>
<p>The bot began as a plain-English paragraph: <i>"check my GitHub — PRs, merges, issues I created or am assigned — and give me a daily rundown on Telegram."</i> That paragraph became the Builder prompt you saw in Lesson 4. No code was written by hand at any point in this diary.</p>
<p><b>Proves:</b> specifying clearly is the work. The Builder (or any coding agent) handles the typing.</p>

<h2>2 · Mistake #1 — the token went into a chat window</h2>
<p>BotFather issued the bot token and the author pasted it… straight into an AI chat. The course's own Setup lesson says: <i>never paste a key into a chat window — keys leak from transcripts and screenshots more often than from hacks.</i></p>
<p>The fix is always the same and takes 20 seconds: BotFather → <code>/revoke</code> → new token → into <code>.env</code>. (Honesty corner: we kept the burned token "just for testing" and owed ourselves a rotation afterwards. Do better than we did.)</p>
<p><b>Proves:</b> secrets live in env files and secret stores, never in conversations. And leaked ≠ catastrophe <i>if</i> you rotate fast.</p>

<h2>3 · The bot couldn't hear us until we spoke first</h2>
<p>To send you messages, a Telegram bot needs your <b>chat id</b> — and it can't discover it, because <i>bots cannot message first</i>. The dance: send your bot a "hi", then read <code>getUpdates</code> in a browser and pull the id out of <code>"chat":{"id":…</code>. Our first check came back empty because the "hi" hadn't been sent yet.</p>
<p><b>Proves:</b> APIs have handshake rules. When something returns nothing, the first question is "did I complete the handshake?", not "is it broken?"</p>

<h2>4 · Dry run before live run</h2>
<p>First execution: Telegram credentials deliberately withheld, so <code>send_telegram</code> printed to the console instead of messaging anyone. Only after reading the output did we add the credentials.</p>
<p><b>Proves:</b> the Evals-lesson guardrail — gate the outward-facing part until the boring parts are verified. Build the risky tool with a dry-run mode from day one.</p>

<h2>5 · The model ignored "plain text" — so the tool stopped asking nicely</h2>
<p>The task said <i>plain text only</i>. The model sent <b>**markdown**</b> anyway. Instead of begging harder in the prompt, one line went into the <code>send_telegram</code> tool: strip the markdown before sending.</p>
<p><b>Proves:</b> Lesson 1's most important rule — never enforce in the prompt what you can enforce in code. Prompts are requests; code is a boundary.</p>

<h2>6 · The bot buried a P0 — caught by reading, fixed by one sentence</h2>
<p>First real rundown: it suggested a P2 task as "priority for today" while a P0 security issue sat open. A human read the output, spotted the bad judgment, and added one line to the task: <i>"if items carry P0/P1/P2 labels, the most urgent always wins."</i> Next run: P0 on top.</p>
<p><b>Proves:</b> evaluate by reading real outputs, then iterate. One reviewed run beats ten unreviewed ones.</p>

<h2>7 · Automation — and GitHub said no (correctly)</h2>
<p>To run daily without a laptop, the bot went to GitHub Actions: new repo, workflow file, cron. The push was <b>rejected</b> — the account's token lacked <code>workflow</code> scope, and GitHub refuses to let a token without it create workflow files. Annoying for ten seconds, then you realize: workflow files run arbitrary code with access to your secrets. Of course that needs a stronger key. One <code>gh auth refresh -s workflow</code> later, pushed.</p>
<p><b>Proves:</b> least privilege isn't just something you configure — it's something you'll collide with, and the collision means it's working.</p>

<h2>8 · Secrets went into the secret store — never through anyone's hands</h2>
<p>The API keys moved from the local <code>.env</code> file straight into GitHub's encrypted secrets with one command (<code>gh secret set -f</code>). Nobody read them, pasted them, or saw them on screen. Quirk discovered on the way: GitHub reserves every secret name starting with <code>GITHUB_</code> — the username went into the workflow as plain config instead, because a username was never a secret to begin with.</p>
<p><b>Proves:</b> the "environment variable on someone else's server" pattern from the Workflows lesson, done for real — and knowing what is <i>actually</i> secret is part of the skill.</p>

<h2>9 · First cloud run: ~30 seconds, ~$0.0003, phone buzzed</h2>
<p>Manual trigger from the Actions tab. GitHub's machine checked the PRs and issues, the agent wrote the rundown, Telegram delivered it. From then on: every morning at 07:00 UTC, laptop open or not.</p>
<p><b>Proves:</b> "deployed" is not a mystical state. It's your script + a scheduler + secrets, on a machine you don't own.</p>

<h2>10 · Mistake #3 — "I texted it a question and got no reply"</h2>
<p>The author messaged the bot: <i>"did I make any push today?"</i> Silence. Of course — v1 is a one-shot script. It wakes, speaks, and exits. <b>It has a mouth, not ears.</b> Nothing is listening between runs.</p>
<p>Making it answer required an architecture change, not a prompt change: a process that runs <i>forever</i>, long-polling Telegram, feeding each incoming message into the same agent loop as a task. That's v2 — and it's why it can't live on GitHub Actions or serverless: persistent listening needs a persistent process (Lesson 4's "where agents run", exactly as taught).</p>
<p><b>Proves:</b> when behavior surprises you, ask what the <i>architecture</i> allows before blaming the model. A scheduled script and a listening service are different animals.</p>

<h2>11 · v2 with ears — and the boundary lives in code</h2>
<p><a href="projects/listen-bot.js" download>listen-bot.js</a>: same GitHub tools, same loop, plus a polling loop with three details worth stealing:</p>
<ul>
  <li><b>It only answers one chat id.</b> Anyone on Telegram can find your bot and message it. The check is one <code>if</code> in code — no prompt could make that guarantee.</li>
  <li><b>Replies are cleaned and split in the reply helper</b> — markdown stripped, messages over Telegram's 4096-char limit chunked. API limits handled in code, again.</li>
  <li><b>Idle listening costs zero.</b> The model runs only when a message arrives. Ears are free; thinking is metered.</li>
</ul>
<p><b>Proves:</b> everything in this course composes. v2 = Lesson 1's loop + Lesson 2's tools + Lesson 4's architecture + Evals' guardrails, assembled in an afternoon by prompting.</p>

<hr>
<blockquote><p><b>Steal this whole arc.</b> Spec in plain English → build by prompting (Lesson 4 has the exact prompts) → dry run → read the output and fix judgment with sentences → automate with a scheduler → upgrade the architecture when behavior demands it. The files: <a href="projects/daily-bot.js" download>daily-bot.js</a> (the mouth) and <a href="projects/listen-bot.js" download>listen-bot.js</a> (the ears). Total model cost of everything on this page: under one cent.</p></blockquote>
`,
  },

  gallery: {
    title: "🧰 Agent Gallery — four agents you can build this week",
    kicker: "Same loop, same toolbox, different jobs. No GitHub required for any of them.",
    explain: `
<p>Here's the secret the capstone was setting up: <b>you don't need new agents, you need new tasks.</b> You already own a toolbox — <code>list_files</code>, <code>read_file</code>, <code>write_file</code>, <code>send_telegram</code> — and almost every useful personal agent is those four tools plus a different task sentence. At most, one new tool per project. Every recipe below is a paste-into-Builder prompt; build them exactly like the capstone: paste, read, iterate, dry-run, run.</p>

<h2>💰 Money Rundown <span style="color:var(--accent2)">★ easiest — zero new tools</span></h2>
<p>Your bank exports CSV (every bank does — look for "export" or "download" on the transactions page). Drop it in a folder; the agent categorizes the month, flags the weird stuff, and Telegrams the summary. <b>Privacy hygiene first:</b> open the CSV and delete the account-number column before the agent ever sees it — good habit, and a good lesson.</p>
<pre><code>Build a Node.js script called money-rundown.js: my monthly spending
explainer. It lives in a folder where I drop my bank's CSV export.

Tools: list_files (with modified dates), read_file (.csv and .txt
only, cap at 20000 chars), send_telegram (env TELEGRAM_BOT_TOKEN and
TELEGRAM_CHAT_ID, print instead when missing, strip markdown inside
the tool). Agent loop via OpenRouter (OPENROUTER_API_KEY, max 10
turns), zero npm dependencies, README.md included.

The task: find the newest CSV, read it, group my spending into
sensible categories with totals, flag anything unusual - duplicate
charges, unusually large amounts, subscriptions I may have forgotten
about - and send one plain-text summary under 300 words.</code></pre>
<p><i>Iterate with:</i> "Compare against the previous month's CSV if one exists, and tell me what changed the most."</p>

<h2>🕊️ Follow-up Chaser <span style="color:var(--accent2)">★★ — zero new tools, one important absence</span></h2>
<p>For freelancers, job hunters, and anyone whose money depends on people replying. A <code>contacts.csv</code> you keep by hand (name, context, last_contacted date); the agent finds who's gone quiet and <b>drafts</b> the nudges. Notice what's missing from the spec on purpose: there is no sending tool. The agent physically cannot message your clients — you read the drafts and send them yourself. That's the human gate from the Evals lesson, built in by architecture.</p>
<pre><code>Build a Node.js script called follow-up-chaser.js. It lives in a
folder containing contacts.csv with columns: name, context,
last_contacted (YYYY-MM-DD).

Tools: read_file, write_file - and deliberately NO sending tool of
any kind. Agent loop via OpenRouter (OPENROUTER_API_KEY, max 8
turns), zero npm dependencies, README.md included.

The task: today's date is known. Find everyone I have not contacted
in 14 or more days, and write drafts.md containing a short, warm,
specific follow-up message for each person based on their context
column. Drafts only - I review and send them myself. End by printing
how many drafts were written and who they are for.</code></pre>
<p><i>Iterate with:</i> "Match each draft's tone to the context — clients formal, friends casual."</p>

<h2>📰 Morning Briefing <span style="color:var(--accent2)">★★ — one new tool: fetch_url</span></h2>
<p>The agent reads the outside world — no API keys, no accounts, because RSS feeds are just public text. Nearly every news site has one (search "site name RSS"). Start with one feed, e.g. <code>feeds.bbci.co.uk/news/rss.xml</code>, then swap in your own interests.</p>
<pre><code>Build a Node.js script called briefing-bot.js: my morning news
briefing. At the top of the file, a FEEDS list with 2-3 RSS feed
URLs that I can edit (start with one example feed).

Tools: fetch_url (fetch a URL, strip the HTML/XML tags to plain
text, cap at 20000 chars), send_telegram (env vars as usual, print
when missing, strip markdown inside the tool). Agent loop via
OpenRouter (OPENROUTER_API_KEY, max 10 turns), zero npm
dependencies, README.md included.

The task: fetch every feed in FEEDS, then choose the 5 stories that
matter most across all of them - not 5 per feed. One line each:
what happened and why it matters. One plain-text message, under
250 words, no links unless truly worth clicking.</code></pre>
<p><i>Iterate with:</i> "Add a MY_INTERESTS list at the top and weight story selection toward it." Run it with your coffee — or put it on a schedule with the Workflows lesson's Actions pattern.</p>

<h2>📔 Journal Buddy <span style="color:var(--accent2)">★★★ — needs the v2 ears from the Build Diary</span></h2>
<p>The one students show their friends. You text your listener bot anything, anytime — "closed the bakery deal!", "rough day, shipped nothing" — and it files every message into a dated journal. Ask it questions and it answers from your own history. On "weekly", it hands your week back to you. This is an <i>upgrade prompt</i>: give the Builder your existing <code>listen-bot.js</code> (⤒ Import it into the project first) and ask for the change.</p>
<pre><code>Here is my existing Telegram listener bot (listen-bot.js). Upgrade
it into my journal buddy:

1. Add a write_file tool scoped to its own folder.
2. New behavior: any normal message I send gets appended to
   journal.md as a dated, self-contained entry (rewrite my shorthand
   into a full sentence, keep my meaning).
3. If my message is a question - like "what did I do this week?" -
   read journal.md and answer from it instead of appending.
4. If I text exactly "weekly", send me a warm summary of the last
   7 days of entries: wins, struggles, one pattern you notice.
5. Keep the chat-id security check exactly as it is.</code></pre>
<p><i>Iterate with:</i> "Never store a message that starts with 'private:' — and enforce that in the append tool, not the prompt."</p>

<hr>
<blockquote><p><b>The graduation test:</b> when you can look at something tedious in your own week and think "that's just list_files + read_file + one task sentence" — you're no longer a student of this course. You're a person who builds agents.</p></blockquote>
`,
  },

  // ───────────────────────────── REFERENCE ─────────────────────────────

  glossary: {
    title: "Glossary",
    kicker: "Every term this course uses, in plain language.",
    explain: `
<ul>
  <li><b>Token</b> — the unit a model reads and writes: roughly 4 characters or ¾ of a word in English. Models don't see words or letters, which is why they're weirdly bad at counting letters. You pay per token, and the context window is measured in them.</li>
  <li><b>Context window</b> — the model's entire world for one call: everything you send it, measured in tokens. If it's not in the window, the model doesn't know it.</li>
  <li><b>System prompt / rules</b> — the standing instructions that shape every response: who the AI is, what it must never do.</li>
  <li><b>Tool</b> — a function you wrote that the model can <i>request</i> (never run). The model asks, your code decides.</li>
  <li><b>Agent</b> — a loop around a model with tools attached, running until the model stops asking for tools. The model decides the next step.</li>
  <li><b>Workflow</b> — fixed steps you wrote in advance (chaining), possibly with one model-made branch decision (routing). You decide the steps.</li>
  <li><b>Eval</b> — a list of inputs and what correct outputs look like, run repeatedly to produce a score. The difference between engineering and vibes.</li>
  <li><b>Non-determinism</b> — same input, different output. The permanent background condition of everything in this course.</li>
  <li><b>Prompt injection</b> — when untrusted text (an email, a web page) contains instructions the model follows instead of yours. No reliable prompt-level fix exists; the defense is constraining tools.</li>
  <li><b>Context rot</b> — burying the fact that matters among paragraphs that don't, so the model misses it. More context is not better context.</li>
  <li><b>RAG (Retrieval-Augmented Generation)</b> — search a knowledge base, paste the best chunks into the context window, then ask. Search plus paste; the hard part is the search.</li>
  <li><b>Memory</b> — facts stored <i>outside</i> the model (often plain files) and pasted back into future conversations. How an AI "remembers you". A later-course topic — see What's Next.</li>
  <li><b>Structured output</b> — forcing the model to answer in a machine-readable format (JSON) instead of prose, so other software can consume it.</li>
  <li><b>MCP (Model Context Protocol)</b> — a standard plug format for packaging tools so any AI app can use them. Use existing servers before writing your own.</li>
</ul>
`,
  },

  cheat: {
    title: "Cheat Sheet",
    kicker: "The whole course on one page. If you remember nothing else, remember this.",
    explain: `
<h2>Mental models</h2>
<ul>
  <li>A model is a function from text to text. It has no memory and can't do anything on its own.</li>
  <li>An agent is a while-loop around that function with tools attached. Forty lines.</li>
  <li>A workflow is the same model calls with <b>your</b> steps; an agent lets the <b>model</b> pick the steps. Workflow first, agent only when you can't write the steps down.</li>
  <li>The context window is the model's entire world. If it's not in there, it doesn't exist.</li>
  <li>An eval is a list of cases and expected outputs. No framework required.</li>
</ul>

<h2>Rules of thumb</h2>
<table>
  <tr><td>run it 3×</td><td>Non-determinism means one run tells you almost nothing.</td></tr>
  <tr><td>tool &gt; prompt</td><td>Never enforce in the prompt what you can enforce in code.</td></tr>
  <tr><td>errors in-band</td><td>Return errors to the model as text so it can recover.</td></tr>
  <tr><td>small jobs</td><td>"Summarize this email" beats "handle this email". Chain small steps.</td></tr>
  <tr><td>less context</td><td>Precision beats volume. Long cluttered prompts degrade.</td></tr>
  <tr><td>evals before tuning</td><td>Or you'll write tests your prompt already passes.</td></tr>
  <tr><td>gate the irreversible</td><td>Money, customers, deletion — human in the loop.</td></tr>
  <tr><td>log transcripts</td><td>You can't debug what you can't see.</td></tr>
</table>

<h2>Debugging checklist — when an AI system misbehaves, in this order</h2>
<ol>
  <li><b>Print the full context.</b> What actually went into the window? Usually the answer is here.</li>
  <li><b>Run it 3 more times.</b> Consistent failure or flaky? Completely different bugs.</li>
  <li><b>Read the tool descriptions</b> as if you'd never seen them. Ambiguous?</li>
  <li><b>Check the tool results.</b> Did a tool silently return an error string the model then trusted?</li>
  <li><b>Only now</b> edit the prompt — and add an eval case first, so you can tell if it helped.</li>
</ol>

<h2>The loop, from memory</h2>
<pre><code>messages = [user_task]
while True:
    r = model(messages, tools)
    messages.append(r)
    if r.stop_reason != "tool_use":
        break
    for call in r.tool_calls:
        messages.append(run(call))   # errors included</code></pre>
`,
  },

  next: {
    title: "What's Next",
    kicker: "You now have the primitives. Everything else in this field is a recombination of them.",
    explain: `
<h2>Topics we deliberately saved for later</h2>
<p>These are real and useful — they're just not step one. Learn them once you've built something with the primitives:</p>
<ul>
  <li><b>Memory.</b> Once your agent works, you'll want it to remember things between sessions — your name, your preferences, last week's decision. The unfashionable truth: a folder of dated markdown files gets you shockingly far. Write self-contained sentences ("Caleb chose usage-based pricing", never "he chose that"), date everything, and let users see and edit what's stored. <code>labs/lab3_memory.py</code> builds it.</li>
  <li><b>RAG (retrieval).</b> "Answer questions from my documents" = search your files, paste the best chunks into the context window, ask. The model is the easy half; the search is the hard half. Try boring keyword search before standing up a vector database. <code>labs/lab2_rag.py</code> builds it over a folder of notes.</li>
  <li><b>Structured output.</b> When other software needs to consume the model's answer, force it into JSON with a schema instead of parsing prose. Every serious provider supports this natively — never regex your way out of free text.</li>
</ul>

<h2>Do these first</h2>
<ul>
  <li><b>Rebuild the loop from scratch</b>, no reference. If you can do it from memory you understand agents better than most people writing about them.</li>
  <li><b>Keep an eval suite</b> for one tool you actually use. This is the habit that compounds — it's what lets you upgrade models and rewrite prompts without fear.</li>
  <li><b>Take a Builder project into a real IDE.</b> Download the .zip or hit "Open in IDE", then keep going: add a feature yourself, break it, fix it.</li>
  <li><b>Use a coding agent daily</b> for a fortnight. Watching a well-built loop work is the fastest way to develop taste.</li>
</ul>

<h2>Worth reading</h2>
<ul>
  <li><b>docs.claude.com</b> — the tool-use and agent sections are unusually practical</li>
  <li><b>Anthropic's engineering blog</b> — particularly "Building effective agents" (the workflows-vs-agents framing you learned here comes from it) and their context-engineering posts</li>
  <li><b>Simon Willison's blog</b> — consistently the best signal-to-noise on what's actually new</li>
</ul>

<h2>Be sceptical of</h2>
<ul>
  <li><b>Any framework that hides the loop.</b> Once it's abstracted away you can't debug it, and debugging is most of the job.</li>
  <li><b>Benchmark numbers</b> without a task that resembles yours.</li>
  <li><b>"Autonomous agents"</b> — mostly the same loop plus optimism.</li>
  <li><b>Anyone who never mentions evals.</b> Reliable correlates tellingly with boring.</li>
</ul>
`,
  },
};
