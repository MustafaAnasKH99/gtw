import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { heatFromRank, heatToRGB } from '../../utils/heat.js'
import { loadCoords } from '../../embedding/loadCoords.js'
import { fetchVizRanks } from '../../embedding/api.js'

const POINT_RADIUS = 0.012
const SECRET_SCALE = 2.6
const BRAND_RGB = { r: 0x00 / 255, g: 0x62 / 255, b: 0x39 / 255 }

export default function EmbeddingScene() {
  const [coords, setCoords] = useState(null)
  const [secretWord, setSecretWord] = useState(null)
  const [ranks, setRanks] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reranking, setReranking] = useState(false)
  const [error, setError] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [pinned, setPinned] = useState(null)
  const abortRef = useRef(null)

  const refresh = async (currentCoords) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setPinned(null)
    try {
      const words = currentCoords.map((c) => c.word)
      const data = await fetchVizRanks(words, undefined, controller.signal)
      setSecretWord(data.secret)
      setRanks(data.ranks)
      setError(null)
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Failed to rank words')
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadCoords()
      .then(async (data) => {
        if (cancelled) return
        setCoords(data)
        await refresh(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Failed to load visualization data')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => {
      cancelled = true
      if (abortRef.current) abortRef.current.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onReset = async () => {
    if (!coords || reranking) return
    setReranking(true)
    await refresh(coords)
    setReranking(false)
  }

  return (
    <div className="about__viz">
      <div className="about__viz-controls">
        <span className="about__viz-secret">
          {secretWord ? <>secret · <em>{secretWord}</em></> : ' '}
        </span>
        <button
          type="button"
          className="about__viz-reset"
          onClick={onReset}
          disabled={!coords || reranking || loading}
        >
          {reranking ? 'Reranking…' : 'Reset secret'}
        </button>
      </div>

      <div className="about__viz-canvas">
        {loading && <div className="about__viz-loading">Loading visualization…</div>}
        {error && !loading && (
          <div className="about__viz-error">
            {error}
            <button type="button" onClick={onReset} className="about__viz-reset">Retry</button>
          </div>
        )}
        {coords && !loading && !error && (
          <Canvas
            camera={{ position: [0, 0, 3], fov: 50 }}
            dpr={[1, 1.5]}
            frameloop="demand"
            gl={{ antialias: true }}
          >
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 5, 5]} intensity={0.5} />
            <PointCloud
              coords={coords}
              ranks={ranks}
              secretWord={secretWord}
              onHover={setHovered}
              onPick={setPinned}
            />
            {secretWord && ranks && coords && (
              <SecretMarker coords={coords} secretWord={secretWord} />
            )}
            {pinned && <PinnedMarker point={pinned} />}
            {hovered && <HoverLabel hovered={hovered} />}
            <OrbitControls
              enableDamping
              dampingFactor={0.08}
              enablePan={false}
              minDistance={0.8}
              maxDistance={6}
              makeDefault
            />
          </Canvas>
        )}
      </div>

      <p className="about__viz-caption">
        Hover a point to see the word, click to pin its label. Click <em>Reset secret</em> to pick a new one — the camera stays put so you can compare layouts.
      </p>
    </div>
  )
}

function PointCloud({ coords, ranks, secretWord, onHover, onPick }) {
  const meshRef = useRef(null)
  const { invalidate } = useThree()
  const count = coords.length

  const geometry = useMemo(() => new THREE.SphereGeometry(POINT_RADIUS, 12, 8), [])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: false, roughness: 0.6, metalness: 0.0 }),
    []
  )

  // Set per-instance position + scale.
  useEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    const secretIdx = secretWord ? coords.findIndex((c) => c.word === secretWord) : -1
    for (let i = 0; i < count; i++) {
      const c = coords[i]
      dummy.position.set(c.x, c.y, c.z)
      const scale = i === secretIdx ? SECRET_SCALE : 1
      dummy.scale.set(scale, scale, scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    invalidate()
  }, [coords, secretWord, count, invalidate])

  // Set per-instance color from ranks.
  useEffect(() => {
    if (!meshRef.current || !ranks) return
    const color = new THREE.Color()
    const secretIdx = secretWord ? coords.findIndex((c) => c.word === secretWord) : -1
    for (let i = 0; i < count; i++) {
      if (i === secretIdx) {
        color.setRGB(BRAND_RGB.r, BRAND_RGB.g, BRAND_RGB.b)
      } else {
        const rank = ranks[coords[i].word]
        if (rank == null) {
          color.setRGB(0.6, 0.6, 0.6)
        } else {
          const { r, g, b } = heatToRGB(heatFromRank(rank))
          color.setRGB(r, g, b)
        }
      }
      meshRef.current.setColorAt(i, color)
    }
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
    invalidate()
  }, [ranks, secretWord, coords, count, invalidate])

  const handleMove = (e) => {
    e.stopPropagation()
    if (e.instanceId == null) return
    const c = coords[e.instanceId]
    if (!c) return
    onHover({ index: e.instanceId, word: c.word, x: c.x, y: c.y, z: c.z })
  }
  const handleOut = () => onHover(null)
  const handleClick = (e) => {
    e.stopPropagation()
    if (e.instanceId == null) return
    const c = coords[e.instanceId]
    if (!c || c.word === secretWord) return
    onPick((prev) =>
      prev?.word === c.word ? null : { word: c.word, x: c.x, y: c.y, z: c.z }
    )
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      onPointerMove={handleMove}
      onPointerOut={handleOut}
      onClick={handleClick}
    />
  )
}

function SecretMarker({ coords, secretWord }) {
  const point = useMemo(
    () => coords.find((c) => c.word === secretWord),
    [coords, secretWord]
  )
  if (!point) return null
  return (
    <Billboard position={[point.x, point.y + 0.08, point.z]}>
      <Text
        fontSize={0.06}
        color="#006239"
        outlineWidth={0.006}
        outlineColor="#FBFAF7"
        anchorX="center"
        anchorY="bottom"
      >
        {secretWord}
      </Text>
    </Billboard>
  )
}

function PinnedMarker({ point }) {
  return (
    <Billboard position={[point.x, point.y + 0.08, point.z]}>
      <Text
        fontSize={0.06}
        color="#1A1A1A"
        outlineWidth={0.006}
        outlineColor="#FBFAF7"
        anchorX="center"
        anchorY="bottom"
      >
        {point.word}
      </Text>
    </Billboard>
  )
}

function HoverLabel({ hovered }) {
  return (
    <Html position={[hovered.x, hovered.y, hovered.z]} center distanceFactor={null} zIndexRange={[100, 0]}>
      <div className="viz-tooltip">{hovered.word}</div>
    </Html>
  )
}
