// rank → 0–1 heat scalar (log scale, rank 1 = hottest)
export function heatFromRank(rank) {
  if (rank <= 1) return 1
  return Math.max(0, 1 - Math.log(rank) / Math.log(5000))
}

// heat → {l, c, h} OKLCH coefficients shared across DOM and three.js paths.
function heatToOklch(heat) {
  if (heat >= 0.5) {
    // amber → deep green
    const t = (heat - 0.5) * 2
    return {
      l: 0.6 + t * (0.47 - 0.6),
      c: 0.14 + t * (0.13 - 0.14),
      h: 70 + t * (153 - 70),
    }
  }
  // cool grey → amber
  const t = heat * 2
  return {
    l: 0.58 + t * (0.6 - 0.58),
    c: 0.0 + t * 0.14,
    h: 70,
  }
}

// heat → OKLCH color string interpolated across cold→warm→hot
export function heatToColor(heat) {
  const { l, c, h } = heatToOklch(heat)
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`
}

// OKLCH → linear sRGB conversion (matches CSS Color Module 4).
// Output is { r, g, b } as floats in [0, 1] suitable for THREE.Color.setRGB.
function oklchToSrgb(l, c, h) {
  const hRad = (h * Math.PI) / 180
  const a = c * Math.cos(hRad)
  const b = c * Math.sin(hRad)

  // OKLab → LMS (cubed)
  const lp = l + 0.3963377774 * a + 0.2158037573 * b
  const mp = l - 0.1055613458 * a - 0.0638541728 * b
  const sp = l - 0.0894841775 * a - 1.2914855480 * b
  const lc = lp ** 3
  const mc = mp ** 3
  const sc = sp ** 3

  // LMS → linear sRGB
  let r = +4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc
  let g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc
  let bl = -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc

  // Linear → gamma-corrected sRGB
  const toSrgb = (v) => {
    const sign = v < 0 ? -1 : 1
    const av = Math.abs(v)
    return av <= 0.0031308 ? sign * 12.92 * av : sign * (1.055 * av ** (1 / 2.4) - 0.055)
  }
  r = toSrgb(r); g = toSrgb(g); bl = toSrgb(bl)

  return {
    r: Math.max(0, Math.min(1, r)),
    g: Math.max(0, Math.min(1, g)),
    b: Math.max(0, Math.min(1, bl)),
  }
}

// heat → { r, g, b } sRGB floats in [0, 1] for THREE.Color.setRGB.
export function heatToRGB(heat) {
  const { l, c, h } = heatToOklch(heat)
  return oklchToSrgb(l, c, h)
}
