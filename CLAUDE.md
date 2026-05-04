# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Guess The Word (GTW)** — a word guessing game where the server picks a secret word each round. Players submit guesses and receive a closeness score (cosine similarity of embeddings) indicating how near their guess is to the secret word. Lower scores mean closer guesses. The game exposes a `/guess` endpoint that validates the word exists, computes similarity, and returns the score.

## Running Scripts

Requires Node.js ≥ 20.18.0. Install dependencies once:

```bash
npm install
```

Data pipeline (run in order when building/refreshing word data):

```bash
# 1. Extract words from Oxford PDF
node words_processing_code/main.js

# 2. Clean and filter extracted words
node words_processing_code/cleanText.js

# 3. Generate OpenAI embeddings for final_words.txt
node words_processing_code/generate_embeddings.js
```

There is no build step, no test runner, and no linter currently configured.

## Architecture

The project is in active development. The data pipeline is mostly complete; the server does not yet exist.

### Data Pipeline (`words_processing_code/`)

The directory `words_processing_code/` has the code and source files used to extract the final words. Those will not be used unless there is a need to refresh or update the database. This directory is for context and archival purposes only.

| Script | Input | Output | Purpose |
|---|---|---|---|
| `main.js` | `Oxford3000.pdf` | `output.txt` | PDF → raw text via pdf2json |
| `cleanText.js` | `output.txt` | `final_output_cleaned_*.txt` | Filter to valid English words |
| `generate_embeddings.js` | `final_words.txt` | `embeddings.json`, `embeddings.csv` | Embed each word via OpenAI |

**`final_words.txt`** — 14,685 unique English words; this is the authoritative word database used for `/guess` validation and embedding generation.

**`embeddings.json`** — JSON Lines file; each line is `{ "word": "...", "embedding": [...] }`. Only ~54 words are embedded so far (the loop in `generate_embeddings.js` is capped at 20 iterations for cost control).

### What Still Needs Building

Per the README:
- Select and integrate a database solution for storing/querying embeddings
- Complete embedding generation for all 14,685 words
- Implement the HTTP server with a `/guess` endpoint
- Implement cosine similarity calculation

## Key Conventions

- **ES6 modules** throughout (`"type": "module"` in package.json). Use `import`/`export`, not `require`.
- **OpenAI model** for embeddings: `text-embedding-3-small`. Do not switch models mid-pipeline or existing embeddings will be incompatible with new ones.
- **API keys must be in environment variables**, not hardcoded. `generate_embeddings.js` currently has a hardcoded key — this must be replaced with `process.env.OPENAI_API_KEY` before any further commits.
- The `/guess` endpoint must verify the word exists in `final_words.txt` before computing similarity.
- Similarity scoring: lower score = closer to secret word (distance, not similarity percentage).
