import { useState, useRef, useEffect, type CSSProperties } from 'react'
import type { Program, SubProgram } from '../lib/supabase'
import { calcMonthProgress } from './BerandaChart'

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const YEAR = 2026
const PROJECT_START = new Date(YEAR, 0, 20)
const TOTAL_DAYS = 365
const DAY_MS = 86_400_000

const C_PROGRESS = '#1A6FE8'
const C_DURASI = '#64748B'

interface Props {
  programs: Program[]
  subPrograms: SubProgram[]
  /** Progres terkini (sama dengan kartu Progress Pekerjaan) — dipakai untuk titik terakhir. */
  liveProgress: number | null
  isMobile: boolean
}

interface Point {
  label: string
  hari: number
  durasiPct: number
  progress: number
}

function buildPoints(programs: Program[], subPrograms: SubProgram[], liveProgress: number | null): Point[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const lastMonth = now.getFullYear() > YEAR ? 11 : now.getFullYear() < YEAR ? 0 : now.getMonth()

  return Array.from({ length: lastMonth + 1 }, (_, m) => {
    const isLast = m === lastMonth
    // Bulan lampau dihitung di tanggal 15 (sama dengan titik estimasi progres), bulan berjalan di hari ini.
    const date = isLast && now.getFullYear() === YEAR ? now : new Date(YEAR, m, 15)
    const hari = Math.max(0, Math.min(TOTAL_DAYS, Math.round((date.getTime() - PROJECT_START.getTime()) / DAY_MS)))
    const ym = `${YEAR}-${String(m + 1).padStart(2, '0')}`
    const estimated = calcMonthProgress(programs, ym, false, subPrograms) ?? 0
    return {
      label: MONTHS_ID[m],
      hari,
      durasiPct: (hari / TOTAL_DAYS) * 100,
      progress: isLast && liveProgress != null ? liveProgress : estimated,
    }
  })
}

export default function BerandaProgresDurasi({ programs, subPrograms, liveProgress, isMobile }: Props) {
  const points = buildPoints(programs, subPrograms, liveProgress)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = points.length
  const svgH = isMobile ? 150 : 190
  const PAD_L = isMobile ? 32 : 36
  const PAD_R = isMobile ? 38 : 46
  const svgW = Math.max(240, width)
  const chartW = svgW - PAD_L - PAD_R
  const slotW = chartW / n
  const barW = Math.max(6, Math.min(18, slotW * 0.3))
  const getX = (i: number) => PAD_L + (i + 0.5) * slotW
  const getY = (pct: number) => svgH * 0.06 + (1 - pct / 100) * svgH * 0.88
  const guides = [0, 25, 50, 75, 100]

  const lastIdx = n - 1
  const hovered = hoveredIdx !== null ? points[hoveredIdx] : null
  const tipRatio = hoveredIdx !== null ? (hoveredIdx + 0.5) / n : 0.5
  const tipPos: CSSProperties = tipRatio > 0.66
    ? { right: 0 }
    : tipRatio < 0.34
      ? { left: 0 }
      : { left: `${tipRatio * 100}%`, transform: 'translateX(-50%)' }

  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        Progres aktual dan durasi berjalan dari {TOTAL_DAYS} hari
      </div>

      {hovered && (
        <div style={{
          position: 'absolute', top: 22, ...tipPos, zIndex: 5, pointerEvents: 'none',
          backgroundColor: '#1E293B', color: '#fff', borderRadius: 8, padding: '7px 12px',
          fontSize: 11, lineHeight: 1.5, whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        }}>
          <div style={{ fontWeight: 700 }}>{hovered.label} {YEAR}</div>
          <div>Progres aktual {fmt(hovered.progress)}%</div>
          <div>Durasi {hovered.hari} hari ({fmt(Math.round(hovered.durasiPct * 10) / 10)}%)</div>
        </div>
      )}

      <svg width={svgW} height={svgH + 22} style={{ display: 'block', overflow: 'visible' }} onMouseLeave={() => setHoveredIdx(null)} role="img" aria-label="Grafik progres aktual dan durasi hari per bulan">
        {guides.map(pct => (
          <g key={pct}>
            <line x1={PAD_L} y1={getY(pct)} x2={svgW - PAD_R} y2={getY(pct)} stroke="var(--border-subtle)" strokeWidth="1" />
            <text x={PAD_L - 5} y={getY(pct) + 3} fontSize="9" fill={C_PROGRESS} opacity="0.85" textAnchor="end">{pct}%</text>
            <text x={svgW - PAD_R + 5} y={getY(pct) + 3} fontSize="9" fill={C_DURASI} opacity="0.9" textAnchor="start">{Math.round(TOTAL_DAYS * pct / 100)} hr</text>
          </g>
        ))}

        {points.map((p, i) => {
          const cx = getX(i)
          const isLast = i === lastIdx
          const isHov = hoveredIdx === i
          const showLabels = hoveredIdx === null ? isLast : isHov
          const yBase = getY(0)
          const xDur = cx - barW - 1
          const xProg = cx + 1
          return (
            <g key={p.label}>
              <rect
                x={PAD_L + i * slotW} y={0} width={slotW} height={svgH}
                fill={isHov ? 'var(--surface-subtle)' : 'transparent'} opacity={isHov ? 0.6 : 1}
                onMouseEnter={() => setHoveredIdx(i)} onClick={() => setHoveredIdx(i)}
              />
              <rect x={xDur} y={getY(p.durasiPct)} width={barW} height={Math.max(0, yBase - getY(p.durasiPct))} rx="2" fill={C_DURASI} opacity="0.55" />
              <rect x={xProg} y={getY(p.progress)} width={barW} height={Math.max(0, yBase - getY(p.progress))} rx="2" fill={C_PROGRESS} />
              {showLabels && (
                <>
                  <text x={xDur + barW / 2} y={getY(p.durasiPct) - 5} textAnchor="middle" stroke="var(--card)" strokeWidth="3" paintOrder="stroke" fontSize="10" fontWeight="700" fill={C_DURASI}>{p.hari} hr</text>
                  <text x={xProg + barW / 2} y={getY(p.progress) - 5} textAnchor="middle" stroke="var(--card)" strokeWidth="3" paintOrder="stroke" fontSize="10" fontWeight="700" fill={C_PROGRESS}>{fmt(p.progress)}%</text>
                </>
              )}
              <text x={cx} y={svgH + 16} textAnchor="middle" fontSize="9" fill={showLabels ? C_PROGRESS : 'var(--text-muted)'} fontWeight={showLabels ? 700 : 400}>{p.label}</text>
            </g>
          )
        })}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px 20px', marginTop: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="10" height="10" aria-hidden="true"><rect width="10" height="10" rx="2" fill={C_PROGRESS} /></svg>
          Progres Aktual (skala kiri)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="10" height="10" aria-hidden="true"><rect width="10" height="10" rx="2" fill={C_DURASI} opacity="0.55" /></svg>
          Durasi Berjalan (skala kanan, hari)
        </span>
      </div>
      <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
        Titik bulan lampau adalah estimasi dari tanggal mulai tiap pekerjaan; titik terakhir adalah data terkini.
      </div>
    </div>
  )
}
