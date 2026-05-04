// rank → 0–1 heat scalar (log scale, rank 1 = hottest)
export function heatFromRank(rank) {
  if (rank <= 1) return 1
  return Math.max(0, 1 - Math.log(rank) / Math.log(5000))
}

// heat → OKLCH color string interpolated across cold→warm→hot
export function heatToColor(heat) {
  if (heat >= 0.5) {
    // amber (#C87A00 in oklch) → deep green (#006239)
    const t = (heat - 0.5) * 2
    const l = 0.6 + t * (0.47 - 0.6)
    const c = 0.14 + t * (0.13 - 0.14)
    const h = 70 + t * (153 - 70)
    return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`
  } else {
    // cool grey (#8A8A8A) → amber
    const t = heat * 2
    const l = 0.58 + t * (0.6 - 0.58)
    const c = 0.0 + t * 0.14
    const h = 70
    return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`
  }
}
