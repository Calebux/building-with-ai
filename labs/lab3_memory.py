"""
LAB 3 - Memory that you can read with your own eyes
===================================================

Most "AI memory" products are a vector database you cannot inspect, cannot
edit, and cannot take with you.

There is a much better default for personal and team memory: MARKDOWN FILES
IN A FOLDER. Obsidian is a nice reader for that folder, but the folder is
the product. You can grep it, diff it, back it up, and read it in ten years.

This lab gives the agent from Lab 1 a memory directory and teaches it the
discipline of writing things down.

Run:
    python lab3_memory.py "I've decided we're going with usage-based pricing"
    python lab3_memory.py "what did I decide about pricing?"

Setup:
    pip install anthropic
    export ANTHROPIC_API_KEY=sk-ant-...
    export MEMORY_DIR=~/Documents/MyVault/memory     # optional
"""

import json
import os
import re
from datetime import date
from pathlib import Path

from anthropic import Anthropic

client = Anthropic()
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")

MEMORY_DIR = Path(os.environ.get("MEMORY_DIR", Path(__file__).parent / "memory")).expanduser()
MEMORY_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# The memory tools. Deliberately boring: search, read, append.
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "name": "search_memory",
        "description": (
            "Search memory files for a keyword. Returns matching lines with "
            "their filenames. Use this FIRST, before answering anything that "
            "might depend on earlier conversations."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
    {
        "name": "read_memory",
        "description": "Read a full memory file by name, e.g. 'pricing.md'.",
        "input_schema": {
            "type": "object",
            "properties": {"topic": {"type": "string"}},
            "required": ["topic"],
        },
    },
    {
        "name": "write_memory",
        "description": (
            "Append a durable fact to a topic file. Use for decisions, "
            "preferences, and stable facts about the user or project. "
            "Do NOT use for small talk or things true only today."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "Short kebab-case topic, e.g. 'pricing' or 'team'.",
                },
                "fact": {
                    "type": "string",
                    "description": "One self-contained sentence. Must make sense read alone in a year.",
                },
            },
            "required": ["topic", "fact"],
        },
    },
]


def topic_path(topic: str) -> Path:
    slug = re.sub(r"[^a-z0-9-]", "-", topic.lower().replace(" ", "-")).strip("-")
    if not slug:
        raise ValueError("empty topic")
    return MEMORY_DIR / f"{slug}.md"


def run_tool(name, args):
    try:
        if name == "search_memory":
            terms = args["query"].lower().split()
            hits = []
            for f in MEMORY_DIR.glob("*.md"):
                for line in f.read_text(errors="ignore").splitlines():
                    if any(t in line.lower() for t in terms) and line.strip():
                        hits.append(f"[{f.name}] {line.strip()}")
            return "\n".join(hits[:25]) if hits else "No memory found on that topic."

        if name == "read_memory":
            p = topic_path(args["topic"])
            return p.read_text() if p.exists() else f"No file for topic '{args['topic']}' yet."

        if name == "write_memory":
            p = topic_path(args["topic"])
            if not p.exists():
                p.write_text(f"# {args['topic']}\n\n")
            # Every fact is dated. Memory without timestamps rots silently.
            with p.open("a") as fh:
                fh.write(f"- {date.today().isoformat()} — {args['fact']}\n")
            return f"Saved to {p.name}."

        return f"Error: unknown tool {name}"

    except Exception as e:
        return f"Error: {type(e).__name__}: {e}"


# ---------------------------------------------------------------------------
# The system prompt is where memory DISCIPLINE lives.
# The tools make memory possible; this paragraph makes it happen.
# ---------------------------------------------------------------------------

SYSTEM = """You are an assistant with a persistent memory stored as markdown files.

Before answering anything that could depend on past conversations, call
search_memory. Do not rely on what is in your context window -- it is empty
at the start of every session.

When the user states a decision, a preference, or a durable fact, call
write_memory. Write one self-contained sentence that will still make sense
read alone in a year: "Caleb decided on usage-based pricing" not "he decided
on that". Prefer few, well-organised topic files over many scattered ones.

Do not record small talk, or things that are only true today."""


def agent(task, max_turns=10):
    messages = [{"role": "user", "content": task}]

    for _ in range(max_turns):
        r = client.messages.create(
            model=MODEL,
            max_tokens=1500,
            thinking={"type": "disabled"},  # fast, predictable tool calls for the demo
            system=SYSTEM,
            tools=TOOLS,
            messages=messages,
        )
        messages.append({"role": "assistant", "content": r.content})

        if r.stop_reason != "tool_use":
            return "".join(b.text for b in r.content if b.type == "text")

        results = []
        for b in r.content:
            if b.type == "tool_use":
                print(f"  [{b.name}] {json.dumps(b.input)[:100]}")
                results.append(
                    {"type": "tool_result", "tool_use_id": b.id, "content": run_tool(b.name, b.input)}
                )
        messages.append({"role": "user", "content": results})

    return "Turn limit reached."


if __name__ == "__main__":
    import sys

    task = " ".join(sys.argv[1:])
    if not task:
        raise SystemExit('Usage: python lab3_memory.py "your message"')

    print(f"Memory dir: {MEMORY_DIR}\n")
    print(agent(task))


# ---------------------------------------------------------------------------
# EXERCISES
#
# 1. Run three separate commands in a row -- tell it a decision, tell it a
#    preference, then ask it what you decided. Separate processes, no shared
#    context. Then open the memory folder and READ THE FILES. That
#    inspectability is the entire argument for this design.
#
# 2. Contradict yourself. Tell it you changed your mind on pricing. Look at
#    the file. Most likely it appended, and now the file holds two opposing
#    facts. What should happen instead? Try to fix it with prompt changes
#    alone, then with a new tool. Notice which works better.
#
# 3. Point MEMORY_DIR at a real Obsidian vault subfolder. Watch notes appear
#    in Obsidian live. Add [[wikilinks]] in the write_memory format string
#    and get a graph view of your agent's memory for free.
#
# 4. Let it run for a week of real use. The files will get messy: duplicates,
#    stale facts, junk topics. Write a second script -- a "consolidation"
#    pass -- that reads all memory files and rewrites them clean. Every
#    serious memory system needs this. Memory is not a write problem, it is
#    a maintenance problem.
#
# 5. DISCUSS: when is a vector database actually the right call here instead
#    of files and grep? (Roughly: past a few thousand notes, or when queries
#    are fuzzy rather than keyword-shaped. Below that, files win on every
#    axis that matters.)
# ---------------------------------------------------------------------------
