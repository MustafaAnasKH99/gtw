import { useState } from 'react'

export default function GuessInput({ onSubmit, disabled, submitting }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const word = value.trim().toLowerCase()
    if (!word) return
    onSubmit(word, setError, () => setValue(''))
  }

  return (
    <form className="guess-input" onSubmit={handleSubmit}>
      <div className="guess-input__row">
        <span className="guess-input__prefix">›</span>
        <input
          className="guess-input__field"
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError('') }}
          placeholder={disabled ? 'Puzzle solved' : 'Enter a word…'}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <button
          className="guess-input__submit"
          type="submit"
          disabled={disabled || submitting || !value.trim()}
        >
          {submitting ? '…' : 'Enter'}
        </button>
      </div>
      {error && <p className="guess-input__error">{error}</p>}
    </form>
  )
}
