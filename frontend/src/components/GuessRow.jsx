import { heatFromRank, heatToColor } from '../utils/heat.js'

export default function GuessRow({ guess, isLatest, won }) {
  const heat = heatFromRank(guess.rank)
  const color = heatToColor(heat)

  return (
    <li
      className={isLatest ? 'guess-row guess-row--latest' : 'guess-row'}
      style={{ animationDelay: isLatest ? '0ms' : undefined }}
    >
      <div className="guess-row__heat-bar" style={{ '--heat-color': color, '--heat-width': `${heat * 100}%` }} />
      <span
        className="guess-row__word"
        style={won && guess.rank === 1 ? { color: '#006239', fontStyle: 'italic' } : undefined}
      >
        {guess.word}
      </span>
      <span className="guess-row__rank" style={{ color }}>
        {guess.rank.toLocaleString()}
      </span>
    </li>
  )
}
