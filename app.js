// ═══════════════════════════════════════════════════════════════
// Building With AI — unified app logic
// Lesson track + Playground + the Builder (chat ↔ preview ↔ files)
// ═══════════════════════════════════════════════════════════════

const $ = id => document.getElementById(id);
const codeEditor = $('codeEditor');
const lineNumbers = $('lineNumbers');
const terminal = $('terminal');
const outputContent = $('outputContent');
const runBtn = $('runBtn');
const statusDot = $('statusDot');
const statusText = $('statusText');

let currentLesson = 'welcome';

// ─── helpers ───
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Minimal markdown for chat bubbles: ```blocks```, `inline`, **bold**, newlines
function mdLite(text) {
  const parts = String(text).split('```');
  let html = '';
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      const body = parts[i].replace(/^[a-z]*\n/, '');
      html += '<pre>' + esc(body) + '</pre>';
    } else {
      html += esc(parts[i])
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
        .replace(/\n/g, '<br>');
    }
  }
  return html;
}

// ═══════════════════════════════════════════════════════════════
// TERMINAL
// ═══════════════════════════════════════════════════════════════
function termLine(text, cls = 'term-info') {
  const div = document.createElement('div');
  div.className = `term-line ${cls}`;
  div.textContent = text;
  terminal.appendChild(div);
  terminal.scrollTop = terminal.scrollHeight;
}
function termPrompt(text) { termLine(`❯ ${text}`, 'term-prompt'); }
function termSuccess(text) { termLine(`✓ ${text}`, 'term-success'); }
function termWarn(text) { termLine(`⚠ ${text}`, 'term-warn'); }
function termError(text) { termLine(`✗ ${text}`, 'term-error'); }
function termTool(text) { termLine(`→ ${text}`, 'term-tool'); }
function termSep() {
  const div = document.createElement('div');
  div.className = 'term-separator';
  terminal.appendChild(div);
}
$('clearTermBtn').addEventListener('click', () => { terminal.innerHTML = ''; });

// ═══════════════════════════════════════════════════════════════
// LESSON VIEW
// ═══════════════════════════════════════════════════════════════
function updateLineNumbers() {
  const lines = codeEditor.value.split('\n').length;
  lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => `<div>${i + 1}</div>`).join('');
}
codeEditor.addEventListener('input', updateLineNumbers);
codeEditor.addEventListener('scroll', () => { lineNumbers.scrollTop = codeEditor.scrollTop; });
codeEditor.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = codeEditor.selectionStart;
    codeEditor.value = codeEditor.value.substring(0, s) + '    ' + codeEditor.value.substring(codeEditor.selectionEnd);
    codeEditor.selectionStart = codeEditor.selectionEnd = s + 4;
    updateLineNumbers();
  }
});

function switchLessonTab(panel) {
  document.querySelectorAll('#lessonView .editor-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.panel === panel));
  document.querySelectorAll('#lessonView .editor-panel').forEach(p => p.classList.remove('active'));
  $('panel' + panel.charAt(0).toUpperCase() + panel.slice(1)).classList.add('active');
}
document.querySelectorAll('#lessonView .editor-tab').forEach(tab => {
  tab.addEventListener('click', () => switchLessonTab(tab.dataset.panel));
});

// Learn tab content: kicker + explainer + try-it callout + guided exercises
function renderLearn(name, lesson) {
  const el = $('learnContent');
  let html = `<h1>${esc(lesson.title)}</h1>`;
  if (lesson.kicker) html += `<div class="doc-kicker">${esc(lesson.kicker)}</div>`;
  html += lesson.explain || '';

  if (lesson.tryIt) {
    html += `
      <div class="tryit">
        <div class="tryit-text">
          <div class="tryit-title">⚡ ${esc(lesson.tryIt.label)}</div>
          <div class="tryit-desc">${esc(lesson.tryIt.desc)}</div>
        </div>
        <button class="tryit-btn" id="tryItBtn">Try it in the Builder →</button>
      </div>`;
  }

  if (lesson.examples && lesson.examples.length) {
    html += `<div class="exercises-head"><h2>Guided exercises</h2>
      <p style="color:var(--text-dim)">Each card is a complete Goal → Rules → Context → Checks job. Load one into the Playground, press ▶ Run, and watch the terminal.</p></div>
      <div class="examples-grid" id="learnExamples"></div>`;
  }

  el.innerHTML = html;

  if (lesson.tryIt) {
    $('tryItBtn').addEventListener('click', () => openBuilderWith(lesson.tryIt.prompt));
  }
  if (lesson.examples && lesson.examples.length) {
    const grid = $('learnExamples');
    lesson.examples.forEach(ex => {
      const card = document.createElement('div');
      card.className = 'example-card';
      card.innerHTML = `
        <div class="ex-header">
          <div><div class="ex-title">${esc(ex.name)}</div><div class="ex-desc">${esc(ex.desc || '')}</div></div>
          <button class="ex-load-btn">Load into Playground</button>
        </div>
        <div class="ex-preview"><span>Goal:</span> ${esc(ex.goal)}${ex.context ? '<br><br><span>Context:</span> ' + esc(ex.context) : ''}</div>`;
      card.querySelector('.ex-load-btn').addEventListener('click', () => {
        $('bbGoal').value = ex.goal || '';
        $('bbSystem').value = ex.system || '';
        $('bbContext').value = ex.context || '';
        $('bbChecks').value = ex.checks || '';
        switchLessonTab('buildbox');
        termPrompt(`loaded exercise: ${ex.name}`);
      });
      grid.appendChild(card);
    });
  }
  el.closest('.lesson-doc').scrollTop = 0;
}

function loadLesson(name) {
  // Builder is its own view
  if (name === 'builder') {
    $('lessonView').classList.remove('active');
    $('builderView').classList.add('active');
    document.querySelectorAll('.sidebar-item').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.lesson === 'builder'));
    refreshBuilderUI();
    return;
  }
  $('builderView').classList.remove('active');
  $('lessonView').classList.add('active');

  currentLesson = name;
  const lesson = LESSONS[name];
  if (!lesson) return;

  const hasCode = Boolean(lesson.code);
  $('tabCode').classList.toggle('hidden', !hasCode);
  $('tabBuildbox').classList.toggle('hidden', !lesson.examples);
  $('tabOutput').classList.toggle('hidden', !hasCode && !lesson.examples);
  runBtn.style.display = (hasCode || lesson.examples) ? '' : 'none';

  renderLearn(name, lesson);
  switchLessonTab('learn');

  if (hasCode) {
    codeEditor.value = lesson.code;
    updateLineNumbers();
  }
  if (lesson.examples && lesson.examples.length) {
    const ex = lesson.examples[0];
    $('bbGoal').value = ex.goal || '';
    $('bbSystem').value = ex.system || '';
    $('bbContext').value = ex.context || '';
    $('bbChecks').value = ex.checks || '';
    $('bbTitle').textContent = lesson.title + ' — Playground';
  }

  document.querySelectorAll('.sidebar-item').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.lesson === name));

  termSep();
  termPrompt(`opened: ${lesson.title}`);
}

document.querySelectorAll('.sidebar-item').forEach(btn => {
  btn.addEventListener('click', () => loadLesson(btn.dataset.lesson));
});

// ─── Run (lesson view) ───
runBtn.addEventListener('click', async () => {
  runBtn.disabled = true;
  termSep();
  const activePanel = document.querySelector('#lessonView .editor-panel.active');
  const isBuildBox = activePanel?.id === 'panelBuildbox';
  const isCode = activePanel?.id === 'panelCode';

  if (!isBuildBox && !isCode) {
    // Run from Learn/Output tab: run the playground job
    switchLessonTab('buildbox');
  }

  if (isCode) {
    const code = codeEditor.value;
    termPrompt('analyzing code...');
    termLine(`sending ${code.split('\n').length} lines to model`);
    try {
      const res = await fetch('/api/run-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, lesson: currentLesson })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Run failed');
      data.trace.forEach(t => {
        if (t.includes('→')) termTool(t);
        else if (t.includes('✓') || t.includes('done')) termSuccess(t);
        else termLine(t, 'term-info');
      });
      if (data.usage) termLine(`tokens: ${data.usage.total_tokens || 'unknown'}`, 'term-info');
      termSuccess('analysis complete');
      outputContent.textContent = data.text;
      switchLessonTab('output');
    } catch (err) {
      termError(err.message);
      outputContent.textContent = 'Error: ' + err.message;
    }
  } else {
    termPrompt('running Playground job...');
    termLine('collecting goal, rules, context, checks');
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          goal: $('bbGoal').value,
          system: $('bbSystem').value,
          context: $('bbContext').value,
          checks: $('bbChecks').value,
          mode: 'workshop'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Run failed');
      data.trace.forEach(t => {
        if (t.startsWith('KEY:')) termLine(t, 'term-info');
        else if (t.startsWith('MODEL:')) termTool(t);
        else if (t.startsWith('CHECK:')) termWarn(t);
        else if (t.startsWith('LOOP:')) termSuccess(t);
        else termLine(t, 'term-info');
      });
      if (data.usage) termLine(`tokens: ${data.usage.total_tokens || 'unknown'}`, 'term-info');
      termSuccess('job complete');
      outputContent.textContent = data.text;
      switchLessonTab('output');
    } catch (err) {
      termError(err.message);
      outputContent.textContent = 'Error: ' + err.message;
    }
  }
  runBtn.disabled = false;
});

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && $('lessonView').classList.contains('active')) {
    e.preventDefault();
    runBtn.click();
  }
});

// ═══════════════════════════════════════════════════════════════
// BUILDER — chat ↔ live preview ↔ files
// ═══════════════════════════════════════════════════════════════
const STORE_FILES = 'bw.files';
const STORE_MSGS = 'bw.msgs';

let bFiles = {};      // path -> content (the project)
let bMsgs = [];       // [{role:'user'|'assistant', text, files:[paths]}]
let bBusy = false;
let bActiveFile = null;

try { bFiles = JSON.parse(localStorage.getItem(STORE_FILES) || '{}'); } catch { bFiles = {}; }
try { bMsgs = JSON.parse(localStorage.getItem(STORE_MSGS) || '[]'); } catch { bMsgs = []; }

function persistBuilder() {
  try {
    localStorage.setItem(STORE_FILES, JSON.stringify(bFiles));
    localStorage.setItem(STORE_MSGS, JSON.stringify(bMsgs.slice(-40)));
  } catch { /* storage full — keep going, session still works */ }
}

// ─── chat rendering ───
const chatMessages = $('chatMessages');
const chatInput = $('chatInput');
const sendBtn = $('sendBtn');

function fileChipHtml(path) {
  return `<button class="file-chip" data-open="${esc(path)}">📄 ${esc(path)}</button>`;
}

function renderMsg(m) {
  const div = document.createElement('div');
  div.className = 'msg msg-' + m.role;
  let inner = '';
  if (m.files && m.files.length) {
    inner += '<div style="margin-bottom:6px">' + m.files.map(fileChipHtml).join('') + '</div>';
  }
  inner += `<div class="msg-bubble">${m.role === 'user' ? esc(m.text) : mdLite(m.text || '…')}</div>`;
  div.innerHTML = inner;
  div.querySelectorAll('[data-open]').forEach(chip =>
    chip.addEventListener('click', () => openFileInCode(chip.dataset.open)));
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function renderChatAll() {
  chatMessages.innerHTML = '';
  if (!bMsgs.length) {
    const hello = document.createElement('div');
    hello.className = 'msg msg-assistant';
    hello.innerHTML = `<div class="msg-bubble">Hi! I'm the <b>Builder</b>. Describe an app or website and I'll write the real files — you'll see it live in the Preview, and you can download everything or open it in a full IDE anytime. What should we build?</div>`;
    chatMessages.appendChild(hello);
    return;
  }
  bMsgs.forEach(renderMsg);
}

// ─── sending ───
function modelMessages() {
  // last 12 turns, files summarized into assistant turns
  return bMsgs.slice(-12).map(m => ({
    role: m.role,
    content: m.text + (m.files && m.files.length ? `\n[files written: ${m.files.join(', ')}]` : '')
  }));
}

async function sendChat(text) {
  if (bBusy) return;
  text = text.trim();
  if (!text) return;

  bBusy = true;
  sendBtn.disabled = true;
  chatInput.value = '';
  chatInput.style.height = '';

  bMsgs.push({ role: 'user', text, files: [] });
  const asst = { role: 'assistant', text: '', files: [] };
  renderChatAll();

  // live assistant bubble with typing dots
  const liveDiv = document.createElement('div');
  liveDiv.className = 'msg msg-assistant';
  liveDiv.innerHTML = `<div class="live-files"></div><div class="msg-bubble"><span class="thinking"><i></i><i></i><i></i></span></div>`;
  chatMessages.appendChild(liveDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  const liveFilesEl = liveDiv.querySelector('.live-files');
  const liveBubble = liveDiv.querySelector('.msg-bubble');

  termSep();
  termPrompt('builder: ' + text.slice(0, 80));

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: modelMessages(), files: bFiles })
    });
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let gotText = false;

    const handle = (ev) => {
      if (ev.type === 'status') {
        termTool(ev.text);
      } else if (ev.type === 'file') {
        bFiles[ev.path] = ev.content;
        asst.files.push(ev.path);
        termSuccess(`wrote ${ev.path} (${ev.content.length.toLocaleString()} chars)`);
        liveFilesEl.innerHTML = asst.files.map(fileChipHtml).join('');
        liveFilesEl.querySelectorAll('[data-open]').forEach(chip =>
          chip.addEventListener('click', () => openFileInCode(chip.dataset.open)));
        refreshBuilderUI();
        persistBuilder();
      } else if (ev.type === 'delta') {
        // live token stream from the model
        asst.text += ev.text;
        gotText = true;
        liveBubble.innerHTML = mdLite(asst.text);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      } else if (ev.type === 'text') {
        // whole-block text (mock mode, turn-limit notices)
        asst.text += (asst.text ? '\n\n' : '') + ev.text;
        gotText = true;
        liveBubble.innerHTML = mdLite(asst.text);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      } else if (ev.type === 'error') {
        throw new Error(ev.error);
      } else if (ev.type === 'done') {
        if (ev.usage && ev.usage.total_tokens) termLine(`tokens: ${ev.usage.total_tokens}`, 'term-info');
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const chunks = buf.split('\n\n');
      buf = chunks.pop();
      for (const chunk of chunks) {
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) handle(JSON.parse(line.slice(6)));
        }
      }
    }

    if (!gotText && !asst.files.length) asst.text = 'Hmm, I didn’t produce anything — try rephrasing?';
    else if (!gotText) asst.text = 'Done — check the preview!';
    termSuccess('builder finished');
  } catch (err) {
    asst.text = (asst.text ? asst.text + '\n\n' : '') + '⚠ ' + err.message;
    termError(err.message);
  }

  bMsgs.push(asst);
  persistBuilder();
  renderChatAll();
  refreshPreviewNow();
  bBusy = false;
  sendBtn.disabled = false;
  chatInput.focus();
}

sendBtn.addEventListener('click', () => sendChat(chatInput.value));
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat(chatInput.value);
  }
});
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';
});

$('newProjectBtn').addEventListener('click', () => {
  if (Object.keys(bFiles).length && !confirm('Clear the chat and all project files? Download the .zip first if you want to keep them.')) return;
  bFiles = {};
  bMsgs = [];
  bActiveFile = null;
  persistBuilder();
  renderChatAll();
  refreshBuilderUI();
  termSep();
  termPrompt('builder: new project');
});

// Called by lesson "Try it" buttons
function openBuilderWith(prompt) {
  loadLesson('builder');
  chatInput.value = prompt;
  chatInput.dispatchEvent(new Event('input'));
  chatInput.focus();
  chatInput.setSelectionRange(0, 0);
  termSep();
  termPrompt('mission loaded — press Enter to send it, or edit it first');
}

// ─── builder right-side tabs ───
function switchBuilderTab(panel) {
  document.querySelectorAll('#builderView .editor-tab[data-bpanel]').forEach(t =>
    t.classList.toggle('active', t.dataset.bpanel === panel));
  document.querySelectorAll('#builderView .builder-panel').forEach(p => p.classList.remove('active'));
  $('bpanel' + panel.charAt(0).toUpperCase() + panel.slice(1)).classList.add('active');
}
document.querySelectorAll('#builderView .editor-tab[data-bpanel]').forEach(tab => {
  tab.addEventListener('click', () => switchBuilderTab(tab.dataset.bpanel));
});

// ─── preview ───
function normPath(p) { return p.replace(/^\.\//, ''); }

function buildPreviewDoc() {
  const paths = Object.keys(bFiles);
  if (!paths.length) {
    return `<!doctype html><html><head><style>
      body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
        font-family:-apple-system,Segoe UI,sans-serif;background:#f6f6fb;color:#666}
      .empty{text-align:center;max-width:420px;padding:20px}
      .empty h1{font-size:40px;margin:0 0 10px}</style></head>
      <body><div class="empty"><h1>🏗️</h1><b>Nothing here yet.</b>
      <p>Ask the Builder for something — a timer, a landing page, a little game — and it appears here, live.</p></div></body></html>`;
  }
  let entry = bFiles['index.html'] ? 'index.html' : paths.find(p => p.endsWith('.html'));
  if (!entry) {
    return `<!doctype html><html><head><style>
      body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
        font-family:-apple-system,'Segoe UI',sans-serif;background:#f6f6fb;color:#444}
      .card{max-width:460px;padding:28px;text-align:center}
      .card h1{font-size:34px;margin:0 0 8px}
      code{background:#e8e8f4;padding:1px 6px;border-radius:4px;font-size:13px}</style></head>
      <body><div class="card"><h1>🤖</h1><b>This is a script project — no web page to preview.</b>
      <p>Files: ${paths.map(p => '<code>' + esc(p) + '</code>').join(' ')}</p>
      <p>Read them in the <b>Code</b> tab, then <b>⬆ push to GitHub</b> or <b>⬇ download the .zip</b> and run it on your computer (the README has the steps).</p>
      </div></body></html>`;
  }
  let html = bFiles[entry];
  // Inline local stylesheets and scripts so the sandboxed iframe can use them
  html = html.replace(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi, (m, href) => {
    const f = bFiles[normPath(href)];
    return f !== undefined && /rel=["']?stylesheet/i.test(m) ? '<style>\n' + f + '\n</style>' : m;
  });
  html = html.replace(/<script\b[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (m, src) => {
    const f = bFiles[normPath(src)];
    return f !== undefined ? '<script>\n' + f + '\n<\/script>' : m;
  });
  return html;
}

// Writing srcdoc on every SSE file event can leave the frame blank in Chrome —
// debounce so a burst of file writes becomes one render.
let previewTimer = null;
function refreshPreviewNow() {
  clearTimeout(previewTimer);
  previewTimer = null;
  $('previewFrame').srcdoc = buildPreviewDoc();
}
function refreshPreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(refreshPreviewNow, 250);
}
$('refreshPreviewBtn').addEventListener('click', refreshPreviewNow);

// ─── code tab ───
const bcodeEditor = $('bcodeEditor');

function openFileInCode(path) {
  loadLesson('builder');
  switchBuilderTab('bcode');
  bActiveFile = path;
  renderBcodeFiles();
  bcodeEditor.value = bFiles[path] ?? '';
}

function deleteProjectFile(p) {
  delete bFiles[p];
  if (bActiveFile === p) { bActiveFile = null; bcodeEditor.value = ''; }
  persistBuilder();
  refreshBuilderUI();
  termWarn('deleted ' + p);
}

// Two-step delete button (click once to arm, again to delete) — native
// confirm() dialogs are avoided on purpose.
function makeDelButton(p) {
  const del = document.createElement('button');
  del.className = 'fdel';
  del.textContent = '✕';
  del.title = 'Delete ' + p;
  del.addEventListener('click', e => {
    e.stopPropagation();
    if (!del.classList.contains('arm')) {
      del.classList.add('arm');
      del.textContent = 'sure?';
      setTimeout(() => { del.classList.remove('arm'); del.textContent = '✕'; }, 2500);
      return;
    }
    deleteProjectFile(p);
  });
  return del;
}

function renderBcodeFiles() {
  const el = $('bcodeFiles');
  const paths = Object.keys(bFiles).sort();
  el.innerHTML = '';
  paths.forEach(p => {
    const row = document.createElement('div');
    row.className = 'file-row' + (p === bActiveFile ? ' active' : '');
    const name = document.createElement('span');
    name.className = 'fname';
    name.textContent = p;
    row.appendChild(name);
    row.appendChild(makeDelButton(p));
    row.addEventListener('click', () => {
      bActiveFile = p;
      renderBcodeFiles();
      bcodeEditor.value = bFiles[p];
    });
    el.appendChild(row);
  });

  // inline "new file" control
  const wrap = document.createElement('div');
  wrap.className = 'newfile';
  const input = document.createElement('input');
  input.className = 'newfile-input';
  input.placeholder = '＋ new file…';
  input.spellcheck = false;
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const nm = input.value.trim();
    if (!/^[\w.\-][\w.\-\/]*$/.test(nm)) { termWarn('file name: letters, numbers, dots, dashes (and / for folders)'); return; }
    if (bFiles[nm] === undefined) bFiles[nm] = '';
    bActiveFile = nm;
    persistBuilder();
    refreshBuilderUI();
    bcodeEditor.value = bFiles[nm];
    bcodeEditor.focus();
    termPrompt('created ' + nm);
  });
  wrap.appendChild(input);
  el.appendChild(wrap);
}

let saveTimer = null;
bcodeEditor.addEventListener('input', () => {
  if (!bActiveFile) return;
  bFiles[bActiveFile] = bcodeEditor.value;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persistBuilder();
    refreshPreview();
    renderFilesTable();
  }, 400);
});

// ─── files tab ───
function fmtSize(n) {
  return n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB';
}

function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function renderFilesTable() {
  const body = $('filesTableBody');
  const paths = Object.keys(bFiles).sort();
  $('filesEmpty').style.display = paths.length ? 'none' : '';
  $('fileCount').textContent = paths.length ? `(${paths.length})` : '';
  body.innerHTML = '';
  paths.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="f-name">📄 ${esc(p)}</td>
      <td class="f-size">${fmtSize(bFiles[p].length)}</td>
      <td class="f-actions"><button class="ghost-btn" data-dl="${esc(p)}">⬇</button> </td>`;
    tr.querySelector('.f-name').addEventListener('click', () => openFileInCode(p));
    tr.querySelector('[data-dl]').addEventListener('click', () =>
      downloadBlob(new Blob([bFiles[p]], { type: 'text/plain' }), p.split('/').pop()));
    tr.querySelector('.f-actions').appendChild(makeDelButton(p));
    body.appendChild(tr);
  });
}

// ─── import existing files into the project ───
$('importBtn').addEventListener('click', () => $('importInput').click());
$('importInput').addEventListener('change', async e => {
  for (const f of e.target.files) {
    if (f.size > 500000) { termWarn(f.name + ' skipped — over 500 KB'); continue; }
    const text = await f.text();
    if (text.slice(0, 1000).includes('\u0000')) { termWarn(f.name + ' skipped — not a text file'); continue; }
    bFiles[f.name] = text;
    termSuccess('imported ' + f.name + ' (' + fmtSize(text.length) + ')');
  }
  e.target.value = '';
  persistBuilder();
  refreshBuilderUI();
});

function refreshBuilderUI() {
  refreshPreview();
  renderBcodeFiles();
  renderFilesTable();
}

// ─── zip export (stored entries, no compression — no libraries needed) ───
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function makeZip(files) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;

  const u16 = v => new Uint8Array([v & 255, (v >> 8) & 255]);
  const u32 = v => new Uint8Array([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]);

  for (const [path, content] of Object.entries(files)) {
    const name = enc.encode(path);
    const data = enc.encode(content);
    const crc = crc32(data);
    // local file header
    const local = [u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data];
    const localSize = local.reduce((s, a) => s + a.length, 0);
    chunks.push(...local);
    // central directory record
    central.push(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), name);
    offset += localSize;
  }
  const centralSize = central.reduce((s, a) => s + a.length, 0);
  const count = Object.keys(files).length;
  const eocd = [u32(0x06054b50), u16(0), u16(0), u16(count), u16(count),
    u32(centralSize), u32(offset), u16(0)];
  return new Blob([...chunks, ...central, ...eocd], { type: 'application/zip' });
}

function downloadZip() {
  const paths = Object.keys(bFiles);
  if (!paths.length) { termWarn('no files to download yet'); return; }
  downloadBlob(makeZip(bFiles), 'my-ai-project.zip');
  termSuccess(`downloaded my-ai-project.zip (${paths.length} files)`);
}
$('zipBtn').addEventListener('click', downloadZip);
$('zipBtn2').addEventListener('click', downloadZip);

// ─── StackBlitz hand-off: a full in-browser IDE, files pre-loaded ───
function openStackBlitz() {
  const paths = Object.keys(bFiles);
  if (!paths.length) { termWarn('no files to open yet'); return; }
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://stackblitz.com/run';
  form.target = '_blank';
  const add = (name, value) => {
    const input = document.createElement('textarea');
    input.name = name;
    input.value = value;
    input.style.display = 'none';
    form.appendChild(input);
  };
  add('project[title]', 'My AI-built project');
  add('project[description]', 'Built with the Builder in the Building With AI course');
  add('project[template]', 'html');
  for (const [p, content] of Object.entries(bFiles)) add(`project[files][${p}]`, content);
  document.body.appendChild(form);
  form.submit();
  form.remove();
  termSuccess('opened project in StackBlitz — a full IDE in a new tab');
}
$('stackblitzBtn').addEventListener('click', openStackBlitz);
$('stackblitzBtn2').addEventListener('click', openStackBlitz);

// ─── GitHub push ────────────────────────────────────────────────
// Token lives in this browser's localStorage and is sent only to
// api.github.com. Repo is created on first push; later pushes commit
// only the files that actually changed.
const GH_TOKEN_KEY = 'bw.ghtoken';
const GH_REPO_KEY = 'bw.ghrepo';

function toB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

async function ghApi(pathname, token, opts = {}) {
  const res = await fetch('https://api.github.com' + pathname, {
    ...opts,
    headers: {
      'authorization': 'Bearer ' + token,
      'accept': 'application/vnd.github+json',
      ...(opts.body ? { 'content-type': 'application/json' } : {}),
    },
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const ghModal = $('ghModal');
const ghStatus = $('ghStatus');

function ghLog(text, cls = '') {
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = text;
  ghStatus.appendChild(line);
  ghStatus.scrollTop = ghStatus.scrollHeight;
}

function openGhModal() {
  if (!Object.keys(bFiles).length) { termWarn('no files to push yet — build something first'); return; }
  $('ghToken').value = localStorage.getItem(GH_TOKEN_KEY) || '';
  $('ghRepo').value = localStorage.getItem(GH_REPO_KEY) || '';
  ghStatus.innerHTML = '';
  ghModal.classList.add('open');
  ($('ghToken').value ? $('ghRepo') : $('ghToken')).focus();
}
$('ghBtn').addEventListener('click', openGhModal);
$('ghBtn2').addEventListener('click', openGhModal);
$('ghCancel').addEventListener('click', () => ghModal.classList.remove('open'));
ghModal.addEventListener('click', e => { if (e.target === ghModal) ghModal.classList.remove('open'); });

$('ghPushBtn').addEventListener('click', async () => {
  const token = $('ghToken').value.trim();
  const repo = $('ghRepo').value.trim();
  ghStatus.innerHTML = '';
  if (!token) return ghLog('Enter a personal access token first.', 'err');
  if (!/^[A-Za-z0-9._-]+$/.test(repo)) return ghLog('Repository name: letters, numbers, dashes, dots only.', 'err');

  const btn = $('ghPushBtn');
  btn.disabled = true;
  try {
    localStorage.setItem(GH_TOKEN_KEY, token);
    localStorage.setItem(GH_REPO_KEY, repo);

    ghLog('checking token...');
    const who = await ghApi('/user', token);
    if (!who.ok) throw new Error(who.status === 401 ? 'Token rejected (401). Check it was copied fully and has not expired.' : 'GitHub error ' + who.status);
    const login = who.data.login;
    ghLog('authenticated as ' + login, 'ok');

    let repoInfo = await ghApi(`/repos/${login}/${repo}`, token);
    if (repoInfo.status === 404) {
      ghLog('repo not found — creating ' + repo + '...');
      const created = await ghApi('/user/repos', token, {
        method: 'POST',
        body: JSON.stringify({
          name: repo,
          private: $('ghPrivate').checked,
          description: 'Built with the Builder — Building With AI course',
        }),
      });
      if (!created.ok) throw new Error('Could not create repo: ' + (created.data.message || created.status) + '. Fine-grained tokens need Administration: Read and write to create repos — or create the repo on github.com first and push again.');
      ghLog('repo created', 'ok');
    } else if (!repoInfo.ok) {
      throw new Error('GitHub error ' + repoInfo.status + ': ' + (repoInfo.data.message || ''));
    }

    let pushed = 0, skipped = 0;
    for (const [p, content] of Object.entries(bFiles)) {
      const existing = await ghApi(`/repos/${login}/${repo}/contents/${encodeURIComponent(p).replace(/%2F/g, '/')}`, token);
      const newB64 = toB64(content);
      if (existing.ok && !Array.isArray(existing.data) &&
          (existing.data.content || '').replace(/\n/g, '') === newB64) {
        ghLog('· ' + p + ' unchanged — skipped');
        skipped++;
        continue;
      }
      const put = await ghApi(`/repos/${login}/${repo}/contents/${encodeURIComponent(p).replace(/%2F/g, '/')}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          message: (existing.ok ? 'Update ' : 'Add ') + p + ' via the Builder',
          content: newB64,
          ...(existing.ok && existing.data.sha ? { sha: existing.data.sha } : {}),
        }),
      });
      if (!put.ok) throw new Error('Failed on ' + p + ': ' + (put.data.message || put.status));
      ghLog('✓ ' + p, 'ok');
      pushed++;
    }

    const url = `https://github.com/${login}/${repo}`;
    const link = document.createElement('div');
    link.innerHTML = `<span class="ok">done — ${pushed} pushed, ${skipped} unchanged → </span><a href="${url}" target="_blank" rel="noopener">${url}</a>`;
    ghStatus.appendChild(link);
    termSuccess(`pushed ${pushed} file(s) to ${login}/${repo}`);
  } catch (err) {
    ghLog('✗ ' + err.message, 'err');
    termError('GitHub push: ' + err.message);
  }
  btn.disabled = false;
});

// ═══════════════════════════════════════════════════════════════
// RESIZE HANDLE + STATUS + INIT
// ═══════════════════════════════════════════════════════════════
const resizeHandle = $('resizeHandle');
const terminalArea = $('terminalArea');
let resizing = false;
resizeHandle.addEventListener('mousedown', e => {
  resizing = true;
  document.body.style.cursor = 'ns-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});
document.addEventListener('mousemove', e => {
  if (!resizing) return;
  const mainRect = document.querySelector('.main').getBoundingClientRect();
  const newHeight = mainRect.bottom - e.clientY;
  terminalArea.style.height = Math.max(100, Math.min(newHeight, mainRect.height * 0.7)) + 'px';
});
document.addEventListener('mouseup', () => {
  resizing = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

async function checkStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    statusDot.classList.toggle('ok', data.hasKey);
    statusText.textContent = data.hasKey ? `Connected: ${data.model}` : 'No API key — mock mode';
    if (data.hasKey) termSuccess(`connected to ${data.model}`);
    else termWarn('no API key detected — running in mock mode');
  } catch {
    statusText.textContent = 'Server offline';
    termError('cannot reach server — is node server.js running?');
  }
}

loadLesson('welcome');
renderChatAll();
refreshBuilderUI();
termPrompt('Building With AI — ready');
termLine('work through the sidebar top to bottom; the Builder is where it all pays off');
checkStatus();
