import { useState, useEffect, useMemo } from 'react'
import Header from './components/Header.jsx'
import WinBanner from './components/WinBanner.jsx'
import ClosestCard from './components/ClosestCard.jsx'
import GuessInput from './components/GuessInput.jsx'
import GuessList from './components/GuessList.jsx'
import { newGame, submitGuess } from './api.js'
import { heatFromRank } from './utils/heat.js'
import { loadSession, saveSession, clearSession } from './utils/storage.js'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function App() {
  const [sessionId, setSessionId] = useState(null)
  const [guesses, setGuesses] = useState([])
  const [won, setWon] = useState(false)
  const [secretWord, setSecretWord] = useState(null)
  const [latestWord, setLatestWord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function startNewGame() {
    setLoading(true)
    clearSession()
    try {
      const { sessionId: id } = await newGame()
      setSessionId(id)
      setGuesses([])
      setWon(false)
      setSecretWord(null)
      setLatestWord(null)
      saveSession({ sessionId: id, date: todayStr(), guesses: [], won: false, secretWord: null })
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
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const closest = useMemo(() => {
    if (guesses.length === 0) return null
    return guesses.reduce((best, g) => (g.rank < best.rank ? g : best))
  }, [guesses])

  if (loading) {
    return (
      <div className="app">
        <div className="app__loading">Loading…</div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="app__inner">
        <Header guessCount={guesses.length} onReset={startNewGame} />
        {won
          ? <WinBanner secretWord={secretWord} guessCount={guesses.length} />
          : <ClosestCard guess={closest} />
        }
        <GuessInput onSubmit={handleGuess} disabled={won} submitting={submitting} />
        <GuessList guesses={guesses} latestWord={latestWord} won={won} />
        <footer className="footer">Lower rank · closer meaning</footer>
      </div>
    </div>
  )
}
