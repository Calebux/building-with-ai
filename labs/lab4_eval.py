"""
LAB 4 - Evals, or: how you know your tool actually works
========================================================

This is the least glamorous file in the course and the most important one.

The difference between a demo and an internal tool people trust is not model
quality. It is that someone wrote down what "correct" means and checked it
on every change.

You do not need a framework. You need a list of cases and a loop.

Run:
    python lab4_eval.py

Setup:
    pip install anthropic
    export ANTHROPIC_API_KEY=sk-ant-...
"""

import json
import os
import statistics
from concurrent.futures import ThreadPoolExecutor

from anthropic import Anthropic

client = Anthropic()
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")


# ---------------------------------------------------------------------------
# THE SYSTEM UNDER TEST
# Swap this for whatever you actually built. Everything below stays the same.
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You triage incoming support emails for a B2B software company.

Reply with JSON only:
{"category": "billing" | "bug" | "feature_request" | "other",
 "urgency": "high" | "normal" | "low",
 "summary": "one sentence"}

Urgency is high only if the customer is blocked from working, or money has
moved incorrectly. Frustrated tone alone is not high urgency."""


def triage(email: str) -> dict:
    r = client.messages.create(
        model=MODEL,
        max_tokens=300,
        # Thinking off so the 300-token budget goes to the JSON answer, not to
        # reasoning tokens -- otherwise the reply can get truncated and fail to parse.
        thinking={"type": "disabled"},
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": email}],
    )
    text = r.content[0].text.strip()
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(text)


# ---------------------------------------------------------------------------
# THE TEST CASES
# Write these BEFORE you tune the prompt. Include the nasty ones -- the
# ambiguous, the multi-issue, the angry-but-not-urgent. Ten hard cases beat
# a hundred easy ones.
# ---------------------------------------------------------------------------

CASES = [
    {
        "name": "clear bug, blocking",
        "input": "Nobody on our team can log in since this morning. We're dead in the water.",
        "expect": {"category": "bug", "urgency": "high"},
    },
    {
        "name": "billing error, money moved",
        "input": "We were charged $4,400 twice for the same invoice on the 3rd.",
        "expect": {"category": "billing", "urgency": "high"},
    },
    {
        "name": "angry but NOT blocking",
        "input": (
            "This is the third time I'm writing about the export button being "
            "in a stupid place. Absolutely infuriating design. Fix it."
        ),
        "expect": {"category": "feature_request", "urgency": "normal"},
    },
    {
        "name": "polite but IS blocking",
        "input": (
            "Hi, hope you're well! Small thing whenever you get a moment -- our "
            "nightly sync hasn't run since Tuesday so the finance team can't "
            "close the month. No rush!"
        ),
        "expect": {"category": "bug", "urgency": "high"},
    },
    {
        "name": "two issues at once",
        "input": (
            "Two things: the CSV export is missing a column, and separately "
            "can you add SSO to the roadmap?"
        ),
        "expect": {"category": "bug"},  # urgency deliberately unspecified
    },
    {
        "name": "not a support email at all",
        "input": "Hi, I'm a recruiter reaching out about a senior backend role.",
        "expect": {"category": "other", "urgency": "low"},
    },
]


def check(case):
    """Run one case. Only assert on the keys the case actually specifies."""
    try:
        got = triage(case["input"])
    except Exception as e:
        return {"name": case["name"], "pass": False, "why": f"crashed: {e}"}

    for key, want in case["expect"].items():
        if got.get(key) != want:
            return {
                "name": case["name"],
                "pass": False,
                "why": f"{key}: wanted {want!r}, got {got.get(key)!r}",
            }
    return {"name": case["name"], "pass": True, "why": ""}


def run_suite(runs_per_case=3):
    """
    Run every case several times.

    This matters more than people expect: models are non-deterministic, so a
    case that passes once may pass only 60% of the time. A suite that runs
    each case once will lie to you.
    """
    jobs = [c for c in CASES for _ in range(runs_per_case)]

    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(check, jobs))

    by_case = {}
    for r in results:
        by_case.setdefault(r["name"], []).append(r)

    print(f"{'CASE':<28} {'PASS RATE':<12} NOTE")
    print("-" * 78)

    rates = []
    for name, rs in by_case.items():
        rate = sum(r["pass"] for r in rs) / len(rs)
        rates.append(rate)
        failure = next((r["why"] for r in rs if not r["pass"]), "")
        flag = "OK " if rate == 1.0 else "!! " if rate >= 0.5 else "XX "
        print(f"{flag}{name:<25} {rate:>6.0%}      {failure[:40]}")

    print("-" * 78)
    print(f"Overall: {statistics.mean(rates):.0%}   ({len(CASES)} cases x {runs_per_case} runs)")
    print("\nAnything below 100% is a real defect, not noise.")


if __name__ == "__main__":
    run_suite()


# ---------------------------------------------------------------------------
# EXERCISES
#
# 1. Run it. Note the score. Now go fix the prompt to raise it. Re-run after
#    each edit. You are now doing engineering instead of vibing -- and you
#    will immediately feel the difference.
#
# 2. Find a case with a flaky pass rate (not 0%, not 100%). That is the most
#    dangerous kind of bug: it works in your demo and fails for your users.
#    How would you have caught it with runs_per_case=1? You wouldn't.
#
# 3. "Improve" the prompt by adding: "Always err on the side of high urgency
#    so nothing gets missed." Re-run. Watch a change that sounds obviously
#    good make the suite worse. This is why you need the suite.
#
# 4. Add three cases from your OWN domain -- real messages, real edge cases.
#    Notice how hard it is to write down what "correct" means. That
#    difficulty is the actual work of building a reliable tool.
#
# 5. LLM-as-judge: the "summary" field cannot be string-compared. Write a
#    grader that asks the model "does this summary capture the customer's
#    main issue? yes/no". Then ask the uncomfortable question: how do you
#    know the JUDGE is right? (Answer: you hand-grade 20 examples and check
#    the judge agrees with you. Turtles, but the stack is finite.)
#
# 6. Wire it into CI. A suite that runs only when you remember is a suite
#    that stops running in three weeks.
# ---------------------------------------------------------------------------
