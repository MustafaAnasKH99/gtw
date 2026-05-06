import { useState, useEffect, useMemo } from 'react'
import TabNav from './components/TabNav.jsx'
import GameSection from './components/GameSection.jsx'
import AboutSection from './components/AboutSection.jsx'
import BuiltBySection from './components/BuiltBySection.jsx'
import { newGame, submitGuess } from './api.js'
import { heatFromRank } from './utils/heat.js'
import { loadSession, saveSession, clearSession } from './utils/storage.js'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function App() {
  const [activeTab, setActiveTab] = useState('game')
  const [sessionId, setSessionId] = useState(null)
  const [guesses, setGuesses] = useState([])
  const [won, setWon] = useState(false)
  const [secretWord, setSecretWord] = useState(null)
  const [latestWord, setLatestWord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [startupError, setStartupError] = useState(null)

  async function startNewGame() {
    setLoading(true)
    setStartupError(null)
    clearSession()
    try {
      const { sessionId: id } = await newGame()
      setSessionId(id)
      setGuesses([])
      setWon(false)
      setSecretWord(null)
      setLatestWord(null)
      saveSession({ sessionId: id, date: todayStr(), guesses: [], won: false, secretWord: null })
    } catch (err) {
      setSessionId(null)
      setStartupError(err.message || 'Could not start a new game')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const saved = loadSession()
    if (saved && saved.date === todayStr() && saved.sessionId) {
      setSessionId(saved.sessionId)
      setGuesses(saved.guesses || [])
      setWon(saved.won || false)
      setSecretWord(saved.secretWord || null)
      setLoading(false)
    } else {
      startNewGame()
    }
  }, [])

  async function handleGuess(word, setError, clearInput) {
    if (guesses.some((g) => g.word === word)) {
      setError('Already guessed that word')
      return
    }

    setSubmitting(true)
    try {
      const data = await submitGuess(sessionId, word)
      const entry = { word: data.word, rank: data.rank, heat: heatFromRank(data.rank) }
      const nextGuesses = [...guesses, entry]
      setGuesses(nextGuesses)
      setLatestWord(data.word)
      clearInput()

      if (data.won) {
        setWon(true)
        setSecretWord(data.word)
        saveSession({ sessionId, date: todayStr(), guesses: nextGuesses, won: true, secretWord: data.word })
      } else {
        saveSession({ sessionId, date: todayStr(), guesses: nextGuesses, won: false, secretWord: null })
      }
    } catch (err) {
      if (err.status === 401) {
        await startNewGame()
        setError('Session expired — started a new game. Try again.')
      } else {
        setError(err.message || 'Something went wrong')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const closest = useMemo(() => {
    if (guesses.length === 0) return null
    return guesses.reduce((best, g) => (g.rank < best.rank ? g : best))
  }, [guesses])

  const latestGuess = useMemo(() => {
    if (!latestWord) return null
    return guesses.find((g) => g.word === latestWord) ?? null
  }, [guesses, latestWord])

  if (loading) {
    return (
      <div className="app">
        <div className="app__loading">Loading…</div>
      </div>
    )
  }

  const innerClass = activeTab === 'about' ? 'app__inner app__inner--wide' : 'app__inner'

  return (
    <div className="app">
      <div className={innerClass}>
        <TabNav active={activeTab} onChange={setActiveTab} />
        <div className="tab-panels">
          <section hidden={activeTab !== 'game'}>
            <GameSection
              guesses={guesses}
              won={won}
              secretWord={secretWord}
              closest={closest}
              latestGuess={latestGuess}
              latestWord={latestWord}
              submitting={submitting}
              startupError={startupError}
              onReset={startNewGame}
              onGuess={handleGuess}
            />
          </section>
          <section hidden={activeTab !== 'about'}>
            <AboutSection isActive={activeTab === 'about'} />
          </section>
          <section hidden={activeTab !== 'builtby'}>
            <BuiltBySection />
          </section>
        </div>
      </div>
    </div>
  )
}
