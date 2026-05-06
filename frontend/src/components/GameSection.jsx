import Header from './Header.jsx'
import WinBanner from './WinBanner.jsx'
import ClosestCard from './ClosestCard.jsx'
import GuessInput from './GuessInput.jsx'
import GuessList from './GuessList.jsx'

export default function GameSection({
  guesses,
  won,
  secretWord,
  closest,
  latestGuess,
  latestWord,
  submitting,
  startupError,
  onReset,
  onGuess,
}) {
  return (
    <>
      <Header guessCount={guesses.length} onReset={onReset} />
      {startupError && (
        <div className="guess-input__error" role="alert">
          {startupError} — press <strong>New game</strong> to retry.
        </div>
      )}
      {won
        ? <WinBanner secretWord={secretWord} guessCount={guesses.length} />
        : <ClosestCard guess={closest} />
      }
      {latestGuess && !won && (
        <div className="latest-hint">
          <span className="latest-hint__word">{latestGuess.word}</span>
          <span className="latest-hint__rank">rank {latestGuess.rank.toLocaleString()}</span>
        </div>
      )}
      <GuessInput onSubmit={onGuess} disabled={won} submitting={submitting} />
      <GuessList guesses={guesses} latestWord={latestWord} won={won} />
      <footer className="footer">Lower rank · closer meaning</footer>
    </>
  )
}
