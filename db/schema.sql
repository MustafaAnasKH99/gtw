-- Run this once in the Supabase SQL editor before migrating data
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS words (
  word TEXT PRIMARY KEY,
  embedding vector(1536) NOT NULL
);
