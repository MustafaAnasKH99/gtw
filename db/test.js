import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { wordExists, getRandomWord, wordCount, getRank, closePool } from "./index.js";

test("database has words loaded", async () => {
  const count = await wordCount();
  assert.ok(count > 0, `expected rows in DB, got ${count}`);
  console.log(`  row count: ${count}`);
});

test("wordExists returns true for a known word", async () => {
  assert.equal(await wordExists("embassy"), true);
});

test("wordExists returns false for a non-word", async () => {
  assert.equal(await wordExists("xyznotaword123"), false);
});

test("getRandomWord returns a non-empty string", async () => {
  const word = await getRandomWord();
  assert.ok(typeof word === "string" && word.length > 0, `expected a word, got ${word}`);
});

test("getRandomWord result exists in the database", async () => {
  const word = await getRandomWord();
  assert.equal(await wordExists(word), true, `random word "${word}" not found in DB`);
});

test("getRank returns 1 for a word against itself", async () => {
  const rank = await getRank("embassy", "embassy");
  assert.equal(rank, 1);
});

test("getRank returns a positive integer > 1 for a different word", async () => {
  const rank = await getRank("embassy", "garden");
  assert.ok(Number.isInteger(rank) && rank > 1, `expected rank > 1, got ${rank}`);
});

// ---------------------------------------------------------------------------
// Server endpoint tests
// ---------------------------------------------------------------------------

describe("server endpoints", () => {
  let server;
  let baseUrl;
  let app;
  let sessions;

  before(async () => {
    ({ app, sessions } = await import("../server.js"));
    server = await new Promise(resolve => {
      const s = app.listen(0, () => resolve(s));
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve, reject) =>
      server.close(err => (err ? reject(err) : resolve()))
    );
    await closePool();
  });

  async function newGame() {
    const res = await fetch(`${baseUrl}/new-game`, { method: "POST" });
    return { res, body: await res.json() };
  }

  async function guess(sessionId, word) {
    const res = await fetch(`${baseUrl}/guess`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
      body: JSON.stringify({ word }),
    });
    return { res, body: await res.json() };
  }

  test("POST /new-game returns a sessionId and message", async () => {
    const { res, body } = await newGame();
    assert.equal(res.status, 200);
    assert.ok(typeof body.sessionId === "string" && body.sessionId.length > 0);
    assert.equal(body.message, "New game started");
  });

  test("POST /guess returns rank, total, and won: false for a regular word", async () => {
    const { body: game } = await newGame();
    const { res, body } = await guess(game.sessionId, "embassy");
    assert.equal(res.status, 200);
    assert.equal(body.word, "embassy");
    assert.ok(Number.isInteger(body.rank) && body.rank >= 1);
    assert.ok(Number.isInteger(body.total) && body.total > 0);
    assert.equal(body.won, false);
  });

  test("POST /guess with the secret word returns won: true", async () => {
    const { body: game } = await newGame();
    const secretWord = sessions.get(game.sessionId).secretWord;
    const { res, body } = await guess(game.sessionId, secretWord);
    assert.equal(res.status, 200);
    assert.equal(body.rank, 1);
    assert.equal(body.won, true);
  });

  test("session is deleted after winning", async () => {
    const { body: game } = await newGame();
    const secretWord = sessions.get(game.sessionId).secretWord;
    await guess(game.sessionId, secretWord);
    const { res, body } = await guess(game.sessionId, "embassy");
    assert.equal(res.status, 404);
    assert.ok(body.error.includes("session not found"));
  });

  test("POST /guess with an unrecognized word returns 404", async () => {
    const { body: game } = await newGame();
    const { res, body } = await guess(game.sessionId, "xyznotaword123");
    assert.equal(res.status, 404);
    assert.equal(body.error, "word not recognized");
  });

  test("POST /guess with no session header returns 404", async () => {
    const res = await fetch(`${baseUrl}/guess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: "embassy" }),
    });
    const body = await res.json();
    assert.equal(res.status, 404);
    assert.ok(body.error.includes("session not found"));
  });

  test("POST /guess with missing word returns 400", async () => {
    const { body: game } = await newGame();
    const res = await fetch(`${baseUrl}/guess`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-ID": game.sessionId },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.error, "missing word");
  });

  test("rank of secret word is always 1", async () => {
    const { body: game } = await newGame();
    const secretWord = sessions.get(game.sessionId).secretWord;
    const { body } = await guess(game.sessionId, secretWord);
    assert.equal(body.rank, 1);
  });

  test("rank is within valid range [1, total]", async () => {
    const { body: game } = await newGame();
    const { body } = await guess(game.sessionId, "embassy");
    assert.ok(body.rank >= 1 && body.rank <= body.total);
  });
});
