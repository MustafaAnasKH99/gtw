import { lazy, Suspense, useEffect, useState } from 'react'

const EmbeddingScene = lazy(() => import('./embedding/EmbeddingScene.jsx'))

export default function AboutSection({ isActive }) {
  const [hasOpened, setHasOpened] = useState(false)

  useEffect(() => {
    if (isActive && !hasOpened) setHasOpened(true)
  }, [isActive, hasOpened])

  return (
    <section className="about">
      <header className="about__intro">
        <h2 className="about__title">About <em>GTW</em></h2>
        <p>
          Each round the server picks a secret word from a vocabulary of about 14,000 English
          words. Every guess is converted to an embedding — a 1,536-dimensional vector from
          OpenAI's <code>text-embedding-3-small</code> — and then ranked by cosine distance to
          the secret. Lower rank means semantically closer.
        </p>
        <p>
          To make that idea visible, the cloud below projects 2,000 of those embeddings down to
          three dimensions with PCA. Pick a secret, and every other word lights up by how close
          it is in the original 1,536-D space — not by where it lands in the projection. The
          coloring carries the story; the geometry just gives it somewhere to live.
        </p>
        <p className="about__note">
          The secret here is unrelated to your current game session.
        </p>
      </header>

      {hasOpened ? (
        <Suspense fallback={<div className="about__viz-loading about__viz-loading--standalone">Loading visualization…</div>}>
          <EmbeddingScene />
        </Suspense>
      ) : (
        <div className="about__viz-loading about__viz-loading--standalone">Visualization will load when this tab is opened.</div>
      )}

      <div className="about__stack">
        <h3 className="about__subtitle">How it's built</h3>
        <ul className="about__stack-list">
          <li><span className="about__stack-key">Frontend</span><span>React, Vite, react-three-fiber + drei</span></li>
          <li><span className="about__stack-key">Backend</span><span>Node, Express</span></li>
          <li><span className="about__stack-key">Embeddings</span><span>OpenAI <code>text-embedding-3-small</code></span></li>
          <li><span className="about__stack-key">Storage</span><span>Postgres + pgvector (Supabase)</span></li>
          <li><span className="about__stack-key">Ranking</span><span>Cosine distance via <code>&lt;=&gt;</code> operator</span></li>
          <li><span className="about__stack-key">3D layout</span><span>PCA on 1,536-D vectors → 3 components (ml-pca)</span></li>
        </ul>
      </div>
    </section>
  )
}
