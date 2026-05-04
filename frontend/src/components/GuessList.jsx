import GuessRow from './GuessRow.jsx'

export default function GuessList({ guesses, latestWord, won }) {
  if (guesses.length === 0) {
    return (
      <div className="guess-list__empty">
        <p>Guess a word to start.<br />Lower rank &mdash; closer meaning.</p>
      </div>
    )
  }

  const sorted = [...guesses].sort((a, b) => a.rank - b.rank)

  return (
    <ol className="guess-list">
      {sorted.map((g) => (
        <GuessRow
          key={g.word}
          guess={g}
          isLatest={g.word === latestWord}
          won={won}
        />
      ))}
    </ol>
  )
}
