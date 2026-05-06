export default function Header({ guessCount, onReset }) {
  return (
    <header className="header">
      <h1 className="header__title">
        Guess <em>the</em> Word
      </h1>
      <div className="header__meta">
        <span className="header__count">
          {guessCount > 0 ? `${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'}` : ''}
        </span>
        <button className="header__reset" onClick={onReset} type="button">
          {guessCount > 0 ? 'Reset' : 'New game'}
        </button>
      </div>
    </header>
  )
}
