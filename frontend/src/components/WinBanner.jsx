export default function WinBanner({ secretWord, guessCount }) {
  if (!secretWord) return null

  return (
    <div className="win-banner">
      <span className="win-banner__label">Solved</span>
      <span className="win-banner__word">{secretWord}</span>
      <span className="win-banner__count">in {guessCount} {guessCount === 1 ? 'guess' : 'guesses'}</span>
    </div>
  )
}
