import { heatFromRank, heatToColor } from '../utils/heat.js'

export default function ClosestCard({ guess }) {
  if (!guess) return null

  const heat = heatFromRank(guess.rank)
  const color = heatToColor(heat)

  return (
    <div className="closest-card" style={{ '--accent-color': color }}>
      <div className="closest-card__accent" />
      <div className="closest-card__body">
        <span className="closest-card__label">Closest so far</span>
        <span className="closest-card__word">{guess.word}</span>
        <span className="closest-card__rank" style={{ color }}>rank {guess.rank.toLocaleString()}</span>
      </div>
    </div>
  )
}
