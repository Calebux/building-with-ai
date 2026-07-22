"""
LAB 1 - The Agent Loop
======================

The whole point of this file: an agent is a WHILE LOOP around a model
that can call tools. That's it. About 40 real lines.

Everything else in the agent world -- frameworks, orchestrators, "autonomous
agents" -- is decoration on this loop.

Run:  python lab1_loop.py "How many words are in notes.txt?"

Setup:
    pip install anthropic
    export ANTHROPIC_API_KEY=sk-ant-...
"""

import json
import os
import sys
from pathlib import Path

from anthropic import Anthropic

client = Anthropic()
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")

# Sandbox: the agent may only touch files inside this folder.
# Rule one of tool design -- the tool enforces the boundary, not the prompt.
WORKDIR = Path(__file__).parent / "sandbox"
WORKDIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# 1. THE TOOLS
#    A tool is a JSON schema (so the model knows how to call it)
#    plus a Python function (so something actually happens).
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "name": "list_files",
        "description": "List the files available in the working directory.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "read_file",
        "description": "Read the full text contents of a file by name.",
        "input_schema": {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "Name of the file, e.g. 'notes.txt'",
                }
            },
            "required": ["filename"],
        },
    },
    {
        "name": "write_file",
        "description": "Write text to a file, overwriting it if it exists.",
        "input_schema": {
            "type": "object",
            "properties": {
                "filename": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["filename", "content"],
        },
    },
]


def safe_path(filename: str) -> Path:
    """Resolve a filename inside WORKDIR, refusing anything that escapes it."""
    p = (WORKDIR / filename).resolve()
    if not str(p).startswith(str(WORKDIR.resolve())):
        raise ValueError("path outside the working directory")
    return p


def run_tool(name: str, args: dict) -> str:
    """Dispatch a tool call. Always returns a string. Never raises."""
    try:
        if name == "list_files":
            files = [f.name for f in WORKDIR.iterdir() if f.is_file()]
            return "\n".join(files) if files else "(the directory is empty)"

        if name == "read_file":
            return safe_path(args["filename"]).read_text()

        if name == "write_file":
            path = safe_path(args["filename"])
            path.write_text(args["content"])
            return f"Wrote {len(args['content'])} characters to {args['filename']}."

        return f"Error: no tool named {name}"

    except Exception as e:
        # Errors go BACK TO THE MODEL as text, not up as a crash.
        # This is what lets the agent recover -- it reads the error and retries.
        return f"Error: {type(e).__name__}: {e}"


# ---------------------------------------------------------------------------
# 2. THE LOOP
#    Read this function slowly. It is the entire lesson.
# ---------------------------------------------------------------------------

def agent(task: str, max_turns: int = 12) -> str:
    messages = [{"role": "user", "content": task}]

    for turn in range(max_turns):
        response = client.messages.create(
            model=MODEL,
            max_tokens=2000,
            # Thinking off: keeps this teaching example fast, cheap, and
            # predictable. Newer models think before answering by default,
            # which adds a pause and can push the real answer past max_tokens.
            thinking={"type": "disabled"},
            tools=TOOLS,
            messages=messages,
        )

        # The assistant's turn always goes into the transcript, whatever it was.
        messages.append({"role": "assistant", "content": response.content})

        # Show the model's reasoning as it goes.
        for block in response.content:
            if block.type == "text" and block.text.strip():
                print(f"\n[turn {turn}] {block.text.strip()}")

        # NO tool calls -> the model is done talking. Exit the loop.
        if response.stop_reason != "tool_use":
            return "".join(b.text for b in response.content if b.type == "text")

        # Tool calls -> run every one, collect results, feed them back.
        results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"  -> {block.name}({json.dumps(block.input)[:80]})")
                output = run_tool(block.name, block.input)
                print(f"  <- {output[:120]}")
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": output,
                    }
                )

        # Tool results are sent as a USER turn. That surprises everyone at first.
        messages.append({"role": "user", "content": results})

    return "Hit the turn limit without finishing."


# ---------------------------------------------------------------------------
# 3. RUN IT
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Set ANTHROPIC_API_KEY first.")

    # Seed a file so there's something to work with on the first run.
    seed = WORKDIR / "notes.txt"
    if not seed.exists():
        seed.write_text(
            "Team standup notes.\n"
            "- Shipped the billing fix, took three days longer than estimated.\n"
            "- Onboarding flow still drops 40% of users at the email step.\n"
            "- Priya is out next week; Marcus covers the on-call rotation.\n"
            "- We still have not decided on the pricing change.\n"
        )

    task = " ".join(sys.argv[1:]) or (
        "Read notes.txt, then write a file called actions.md listing only the "
        "items that need a decision or an owner."
    )

    print(f"TASK: {task}\n" + "=" * 60)
    answer = agent(task)
    print("\n" + "=" * 60 + f"\nFINAL: {answer}")


# ---------------------------------------------------------------------------
# EXERCISES
#
# 1. Run it. Then delete notes.txt and run it again. Watch the agent
#    discover the file is missing and change its plan. You did not write
#    that recovery logic -- the loop gave it to you for free.
#
# 2. Set max_turns=2 and run the default task. What breaks, and what does
#    the failure look like from the user's side? This is why turn limits
#    matter in production.
#
# 3. Add a fourth tool: word_count(filename). Notice you changed two
#    things -- the schema and the dispatcher -- and nothing else.
#
# 4. Break something on purpose: in read_file, always return
#    "Error: permission denied". Run it. Does the agent give up, retry
#    forever, or work around it? Run it three times. Same behaviour?
#    This is your first taste of why agents need evals, not vibes.
#
# 5. HARD: the transcript grows every turn, so long tasks get expensive and
#    eventually overflow the context window. Add a step that summarises
#    older turns once messages exceeds 20. What information can you afford
#    to lose? This question is the whole field of context engineering.
# ---------------------------------------------------------------------------
