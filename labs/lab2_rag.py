"""
LAB 2 - RAG over your own notes
===============================

RAG is not a technology. It is a sentence:

    "Find the few chunks of text most likely to answer this question,
     paste them into the prompt, and ask the model."

Retrieval is the hard part, and it is mostly a SEARCH problem, not an AI
problem. This lab makes you feel that. We build keyword search FIRST,
because it is often good enough and everyone skips it.

Run:
    python lab2_rag.py --vault ~/Documents/MyVault "what did I decide about pricing?"
    python lab2_rag.py --vault ~/Documents/MyVault --mode embed "how do I feel about my job?"

Setup:
    pip install anthropic
    pip install sentence-transformers   # only needed for --mode embed
    export ANTHROPIC_API_KEY=sk-ant-...
"""

import argparse
import math
import os
import re
from collections import Counter
from pathlib import Path

from anthropic import Anthropic

client = Anthropic()
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")


# ---------------------------------------------------------------------------
# 1. CHUNKING
#    The single most underrated decision in RAG. Chunk badly and no amount
#    of clever embedding will save you.
# ---------------------------------------------------------------------------

def load_chunks(vault: Path, max_chars: int = 1200):
    """
    Split every markdown file in the vault into chunks.

    We split on markdown headings, because in a notes vault a heading is a
    real semantic boundary -- a human already told us where the topic
    changes. Do not throw that signal away by splitting every 500 characters.
    """
    chunks = []

    for path in sorted(vault.rglob("*.md")):
        if any(part.startswith(".") for part in path.parts):
            continue  # skip .obsidian/ and friends

        text = path.read_text(errors="ignore")

        # Split before any line starting with #, keeping the heading.
        sections = re.split(r"\n(?=#{1,6}\s)", text)

        for section in sections:
            section = section.strip()
            if len(section) < 40:
                continue  # too short to be worth retrieving

            # Long sections get hard-split, with the heading repeated so each
            # piece still carries its context.
            if len(section) > max_chars:
                heading = section.split("\n")[0]
                body = section[len(heading):]
                for i in range(0, len(body), max_chars):
                    chunks.append(
                        {
                            "source": path.name,
                            "text": f"{heading}\n{body[i:i + max_chars]}".strip(),
                        }
                    )
            else:
                chunks.append({"source": path.name, "text": section})

    return chunks


# ---------------------------------------------------------------------------
# 2a. RETRIEVAL, KEYWORD (BM25) -- no dependencies, no API, runs instantly
# ---------------------------------------------------------------------------

def tokenize(s: str):
    return re.findall(r"[a-z0-9]+", s.lower())


def bm25_search(chunks, query, k=5, k1=1.5, b=0.75):
    """
    BM25: the workhorse of search for thirty years. Scores a chunk higher when
    it contains rare query words, many times, in a short document.
    Ship this before you ship a vector database.
    """
    docs = [tokenize(c["text"]) for c in chunks]
    N = len(docs)
    avg_len = sum(len(d) for d in docs) / N

    # How many documents contain each term?
    df = Counter()
    for d in docs:
        for term in set(d):
            df[term] += 1

    q_terms = tokenize(query)
    scored = []

    for chunk, doc in zip(chunks, docs):
        tf = Counter(doc)
        score = 0.0
        for term in q_terms:
            if term not in tf:
                continue
            idf = math.log(1 + (N - df[term] + 0.5) / (df[term] + 0.5))
            numerator = tf[term] * (k1 + 1)
            denominator = tf[term] + k1 * (1 - b + b * len(doc) / avg_len)
            score += idf * numerator / denominator
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[:k]


# ---------------------------------------------------------------------------
# 2b. RETRIEVAL, EMBEDDINGS -- finds meaning, misses exact names
# ---------------------------------------------------------------------------

_model = None


def embed_search(chunks, query, k=5):
    """
    Embeddings map text to vectors so that similar MEANING lands nearby.
    This finds "the compensation conversation" when you searched for "salary".
    It also confidently misses "invoice #4471" -- which BM25 nails instantly.

    Runs locally. No API key, no data leaving the machine.
    """
    global _model
    from sentence_transformers import SentenceTransformer, util

    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")

    doc_vecs = _model.encode([c["text"] for c in chunks], convert_to_tensor=True)
    q_vec = _model.encode(query, convert_to_tensor=True)

    scores = util.cos_sim(q_vec, doc_vecs)[0]
    top = scores.topk(min(k, len(chunks)))

    return [(float(s), chunks[int(i)]) for s, i in zip(top.values, top.indices)]


# ---------------------------------------------------------------------------
# 3. GENERATION
#    Note how much of the quality lives in this prompt, not the retrieval.
# ---------------------------------------------------------------------------

PROMPT = """Answer the question using only the notes below.

Rules:
- Cite the source filename in brackets after each claim, like [meeting-notes.md].
- If the notes do not contain the answer, say so plainly. Do not guess.
- Quote the user's own wording where it matters.

<notes>
{context}
</notes>

Question: {question}"""


def answer(question, results):
    context = "\n\n---\n\n".join(
        f"[{c['source']}]\n{c['text']}" for _, c in results
    )
    response = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        thinking={"type": "disabled"},  # keep it fast; the answer is the first text block
        messages=[{"role": "user", "content": PROMPT.format(context=context, question=question)}],
    )
    return response.content[0].text


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("question", nargs="+")
    ap.add_argument("--vault", required=True, help="Path to your Obsidian vault or notes folder")
    ap.add_argument("--mode", default="bm25", choices=["bm25", "embed"])
    ap.add_argument("-k", type=int, default=5)
    ap.add_argument("--show", action="store_true", help="Print retrieved chunks and stop")
    args = ap.parse_args()

    question = " ".join(args.question)
    vault = Path(args.vault).expanduser()

    chunks = load_chunks(vault)
    print(f"Indexed {len(chunks)} chunks from {vault}\n")
    if not chunks:
        raise SystemExit("No markdown found. Check the --vault path.")

    search = bm25_search if args.mode == "bm25" else embed_search
    results = search(chunks, question, k=args.k)

    print(f"RETRIEVED ({args.mode}):")
    for score, c in results:
        preview = c["text"][:100].replace("\n", " ")
        print(f"  {score:6.3f}  [{c['source']}] {preview}...")

    if args.show:
        raise SystemExit(0)

    print("\n" + "=" * 60)
    print(answer(question, results))


# ---------------------------------------------------------------------------
# EXERCISES
#
# 1. Point it at your real notes. Ask three questions you actually want
#    answered. Use --show to see ONLY what was retrieved.
#
# 2. Run the same question in both modes. Find one question where bm25 wins
#    and one where embed wins. Write down why. (Hint: exact names, IDs and
#    jargon favour bm25; vague or emotional questions favour embed.)
#
# 3. THE IMPORTANT ONE: find a question where the model answers confidently
#    and WRONGLY. Now use --show on that same question. In almost every case
#    the retrieval was bad, not the model. Most "the AI hallucinated"
#    complaints are really "my search was bad."
#
# 4. Change max_chars to 300, then to 4000. Re-run the same question.
#    Small chunks retrieve precisely but lose context; big chunks carry
#    context but dilute the signal and cost more. There is no correct
#    value, only a tradeoff you choose deliberately.
#
# 5. Delete the "If the notes do not contain the answer, say so plainly"
#    line from PROMPT. Ask something your notes definitely do not cover.
#    Compare. One sentence of prompt bought you most of your reliability.
#
# 6. HARD: hybrid retrieval. Run both searches, then merge with reciprocal
#    rank fusion -- score each chunk as sum(1 / (60 + rank)) across the two
#    result lists. This is what most production systems actually do, and
#    it is about fifteen lines.
# ---------------------------------------------------------------------------
