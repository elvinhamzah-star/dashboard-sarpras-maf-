import { useState, useRef, useEffect, type CSSProperties } from 'react'
import { Transaction, ProgramSnapshot, Program } from '../lib/supabase'
import { formatRupiah } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'

interface BerandaChartProps {
  transactions: Transaction[]
  snapshots: ProgramSnapshot[]
  programs: Program[]
  /** Saat true, render tanpa kartu + judul sendiri (dipakai di dalam SectionPanel) */
  bare?: boolean
  /** Saat true, hanya tampilkan line chart progress % — sembunyikan bars keuangan (untuk MAF) */
  progressOnly?: boolean
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const BAR_H = 180
const MONTH_W = 78
const BAR_W = 18
const BAR_GAP = 4

// Chart color palette — picked from existing dashboard elements
const C_MASUK    = '#1B5E2B'  // green — konsisten dengan badge Masuk di Keuangan
const C_KELUAR   = '#660000'  // dark red — konsisten dengan badge Keluar
const C_PROGRESS = '#1A6FE8'  // blue — seragam dengan aksen utama dashboard

// Left Y-axis: compact Rupiah format (e.g. 500Rb, 1Jt, 1.5M)
function formatCompactRp(val: number): string {
  if (val === 0) return '0'
  if (val >= 1_000_000_000) {
    const v = val / 1_000_000_000
    return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'M'
  }
  if (val >= 1_000_000) {
    const v = val / 1_000_000
    return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'Jt'
  }
  if (val >= 1_000) {
    const v = val / 1_000
    return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'Rb'
  }
  return String(Math.round(val))
}

/**
 * Interpolate a program's estimated progress at the midpoint of a given month.
 *
 * Logic:
 *  - Before tanggal_mulai                      → 0%
 *  - Status "Selesai" after tanggal_selesai     → 100%
 *  - Status "Selesai" between start and end     → linear 0→100%
 *  - Status "On Going"/"On Hold" up to today    → linear 0→current_progress
 *  - Status "On Going"/"On Hold" after today    → hold at current_progress
 */
function interpolateProgress(prog: Program, yearMonth: string): number {
  if (!prog.tanggal_mulai) return 0

  const [y, m] = yearMonth.split('-').map(Number)
  const midDate = new Date(y, m - 1, 15)
  const startDate = new Date(prog.tanggal_mulai)

  if (midDate < startDate) return 0

  if (prog.status === 'Selesai') {
    if (prog.tanggal_selesai) {
      const endDate = new Date(prog.tanggal_selesai)
      if (midDate >= endDate) return 100
      const elapsed = (midDate.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())
      return Math.round(Math.max(0, Math.min(100, elapsed * 100)))
    }
    return 100
  }

  // On Going / On Hold / Perencanaan — interpolate 0% → current progress_percent
  const currentPct = prog.progress_percent ?? 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (midDate >= today) return currentPct
  if (today.getTime() <= startDate.getTime()) return 0
  const elapsed = (midDate.getTime() - startDate.getTime()) / (today.getTime() - startDate.getTime())
  return Math.round(Math.max(0, Math.min(currentPct, elapsed * currentPct)))
}

/**
 * Weighted-average progress per bulan — formula SAMA dengan angka di Beranda:
 *   - Exclude Perencanaan + Operasional
 *   - Weighted by total_anggaran
 */
function calcMonthProgress(programs: Program[], yearMonth: string): number | null {
  const relevant = programs.filter(p =>
    p.status !== 'Perencanaan' &&
    p.jenis_pekerjaan !== 'Operasional'
  )
  if (relevant.length === 0) return null

  const totalAnggaran = relevant.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  if (totalAnggaran === 0) return null

  const weightedSum = relevant.reduce((s, p) => {
    const pct = p.tanggal_mulai ? interpolateProgress(p, yearMonth) : 0
    return s + pct * (p.total_anggaran || 0)
  }, 0)

  return Math.round(weightedSum / totalAnggaran)
}

export default function BerandaChart({ transactions, snapshots, programs, bare = false, progressOnly = false }: BerandaChartProps) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // For progressOnly: measure actual container width so all months fit exactly
  const progressContainerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(300)
  useEffect(() => {
    if (!progressOnly || !progressContainerRef.current) return
    const ro = new ResizeObserver(entries => {
      setContainerW(entries[0].contentRect.width)
    })
    ro.observe(progressContainerRef.current)
    return () => ro.disconnect()
  }, [progressOnly])

  // Spending per month
  const byMonth: Record<string, { masuk: number; keluar: number }> = {}
  transactions.forEach(t => {
    const ym = t.tanggal?.slice(0, 7)
    if (!ym) return
    if (!byMonth[ym]) byMonth[ym] = { masuk: 0, keluar: 0 }
    if (t.jenis_transaksi === 'Masuk') byMonth[ym].masuk += t.nominal || 0
    else if (t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB') byMonth[ym].keluar += t.nominal || 0
  })

  // Merge all months from transactions + snapshots
  const allYMs = new Set([
    ...Object.keys(byMonth),
    ...snapshots.map(s => s.snapshot_date?.slice(0, 7)).filter(Boolean) as string[],
  ])
  const months = [...allYMs].sort().map(ym => ({
    ym,
    label: MONTHS_ID[parseInt(ym.slice(5, 7)) - 1],
    masuk: byMonth[ym]?.masuk || 0,
    keluar: byMonth[ym]?.keluar || 0,
  }))

  // Progress per month — interpolated from program dates
  const progressByMonth: (number | null)[] = months.map(m => calcMonthProgress(programs, m.ym))
  const hasProgress = progressByMonth.some(p => p != null)

  const maxRp = Math.max(...months.flatMap(m => [m.masuk, m.keluar]), 1)
  const minTotalW = months.length * MONTH_W

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [months.length])

  if (transactions.length === 0 && snapshots.length === 0 && programs.length === 0) return null

  const hovered = hoveredIdx !== null ? months[hoveredIdx] : null
  const hovProg = hoveredIdx !== null ? progressByMonth[hoveredIdx] : null
  // Posisi tooltip edge-aware: bar di sisi kanan → rata kanan, kiri → rata kiri,
  // sisanya center. Mencegah tooltip nyembul keluar panel (overflow terpotong).
  const tipRatio = hoveredIdx !== null ? (hoveredIdx + 0.5) / months.length : 0.5
  const tipPos: CSSProperties = tipRatio > 0.66
    ? { right: 0, transform: 'none' }
    : tipRatio < 0.34
      ? { left: 0, transform: 'none' }
      : { left: `${tipRatio * 100}%`, transform: 'translateX(-50%)' }

  return (
    <div style={bare ? {} : {
      backgroundColor: 'var(--card)',
      borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      padding: '16px 20px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: 20,
    }}>
      {/* Header — judul disediakan SectionPanel saat bare; di sini sisakan subjudul saja */}
      {bare ? (
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Perkembangan {months.length} bulan
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Realisasi & Progress
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Perkembangan {months.length} bulan
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ position: 'relative' }}>
        {/* ── progressOnly: SVG area line chart (untuk MAF) ── */}
        {progressOnly && hasProgress && (() => {
          const svgH = isMobile ? 110 : 140
          const pts = progressByMonth.map((p, i) => ({ x: i, y: p ?? 0, label: months[i].label, ym: months[i].ym }))
          const n = pts.length
          if (n === 0) return null
          const lastIdx = n - 1

          // Y-axis fixed to 100% so users can gauge progress relative to completion
          const maxAxis = 100
          const guides = [25, 50, 75, 100]

          const AREA_ID = 'prog-area-grad'
          // PAD_LEFT = PAD_RIGHT supaya titik Jan & Jul simetris dari tepi
          // Y-axis labels berada di zona PAD_LEFT (kiri), tidak overlap ke chart
          const PAD_LEFT = isMobile ? 30 : 32
          const PAD_RIGHT = isMobile ? 14 : 16
          // Subtract small buffer so SVG content never hits the overflow:hidden boundary of parent card
          const svgW = Math.max(200, containerW - 4)
          const chartW = svgW - PAD_LEFT - PAD_RIGHT

          const getX = (i: number) => PAD_LEFT + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW)
          // map pct to Y within svgH with small top/bottom padding
          const getY = (pct: number) => svgH * 0.06 + (1 - pct / maxAxis) * svgH * 0.88

          return (
            <div ref={progressContainerRef} style={{ position: 'relative', width: '100%' }}>
              <svg
                width={svgW}
                height={svgH + 22}
                style={{ display: 'block', overflow: 'visible' }}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <defs>
                  <linearGradient id={AREA_ID} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C_PROGRESS} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={C_PROGRESS} stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Guide lines — full width chart; Y labels di zona kiri (PAD_LEFT) */}
                {guides.map(pct => {
                  const y = getY(pct)
                  return (
                    <g key={pct}>
                      <line x1={PAD_LEFT} y1={y} x2={svgW - PAD_RIGHT} y2={y} stroke="var(--border-subtle)" strokeWidth="1" />
                      <text x={PAD_LEFT - 4} y={y + 3} fontSize="8" fill="var(--text-muted)" opacity="0.8" textAnchor="end">{pct}%</text>
                    </g>
                  )
                })}

                {/* Area fill */}
                <path
                  d={[
                    `M ${getX(0)} ${getY(pts[0].y)}`,
                    ...pts.slice(1).map((p, i) => `L ${getX(i + 1)} ${getY(p.y)}`),
                    `L ${getX(lastIdx)} ${svgH}`,
                    `L ${getX(0)} ${svgH}`,
                    'Z',
                  ].join(' ')}
                  fill={`url(#${AREA_ID})`}
                />

                {/* Line */}
                <polyline
                  points={pts.map((p, i) => `${getX(i)},${getY(p.y)}`).join(' ')}
                  fill="none"
                  stroke={C_PROGRESS}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Dots + hover areas */}
                {pts.map((p, i) => {
                  const cx = getX(i)
                  const cy = getY(p.y)
                  const isHov = hoveredIdx === i
                  const isLast = i === lastIdx
                  const showLabel = isHov || (isLast && hoveredIdx === null)
                  return (
                    <g key={p.ym}>
                      {/* Invisible hit area */}
                      <rect
                        x={cx - chartW / (2 * Math.max(n - 1, 1))}
                        y={0}
                        width={chartW / Math.max(n - 1, 1)}
                        height={svgH}
                        fill="transparent"
                        onMouseEnter={() => setHoveredIdx(i)}
                      />
                      {/* Dot — last point slightly bigger always */}
                      <circle
                        cx={cx} cy={cy}
                        r={isLast ? (isHov ? 6 : 5) : (isHov ? 5 : 3.5)}
                        fill={C_PROGRESS}
                        stroke="#fff"
                        strokeWidth={isLast || isHov ? 2 : 1.5}
                      />
                      {/* Value label — always on last, hover on others */}
                      {showLabel && (
                        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill={C_PROGRESS}>{p.y}%</text>
                      )}
                      {/* Month label — last always blue, hover blue */}
                      <text
                        x={cx} y={svgH + 16}
                        textAnchor="middle" fontSize="9"
                        fill={isLast || isHov ? C_PROGRESS : 'var(--text-muted)'}
                        fontWeight={isLast || isHov ? '700' : '400'}
                      >{p.label}</text>
                    </g>
                  )
                })}
              </svg>
            </div>
          )
        })()}

        {/* ── Normal tooltip (untuk chart reguler) ── */}
        {!progressOnly && <div style={{
          position: 'absolute', top: 0,
          ...tipPos,
          backgroundColor: '#1E293B', color: '#fff',
          borderRadius: 8, padding: '7px 12px',
          pointerEvents: 'none', zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          opacity: hovered ? 1 : 0, transition: 'opacity 0.12s ease',
          whiteSpace: 'nowrap',
        }}>
          <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 5, fontWeight: 600 }}>{hovered?.label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {hovered && hovered.masuk > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: C_MASUK, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{formatRupiah(hovered.masuk)}</span>
              </div>
            )}
            {hovered && hovered.keluar > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: C_KELUAR, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{formatRupiah(hovered.keluar)}</span>
              </div>
            )}
            {hovProg != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: C_PROGRESS, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>Progress {hovProg}%</span>
              </div>
            )}
          </div>
        </div>}

        {/* Dual Y-axis + Scrollable bars — hidden in progressOnly mode */}
        {!progressOnly && <div style={{ display: 'flex', alignItems: 'flex-start' }}>

          {/* Left Y-axis — Rupiah scale */}
          <div style={{ width: 44, flexShrink: 0, position: 'relative', height: BAR_H }}>
            {[25, 50, 75, 100].map(pct => (
              <div key={pct} style={{
                position: 'absolute',
                top: BAR_H - (pct / 100) * BAR_H,
                right: 6,
                transform: 'translateY(-50%)',
                fontSize: 9,
                color: 'var(--text-muted)',
                textAlign: 'right',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}>
                {formatCompactRp((maxRp * pct) / 100)}
              </div>
            ))}
          </div>

          {/* Scrollable area — overflowX auto agar scroll kalau bulan banyak */}
          <div ref={scrollRef} style={{ overflowX: 'auto', paddingBottom: 2, flex: 1, minWidth: 0 }}>

            {/* Guide lines + bars */}
            <div style={{ position: 'relative', minWidth: minTotalW, width: '100%' }}>
              {[25, 50, 75, 100].map(pct => (
                <div key={pct} style={{
                  position: 'absolute',
                  top: BAR_H - (pct / 100) * BAR_H,
                  left: 0, right: 0,
                  height: 1,
                  backgroundColor: 'var(--border-subtle)',
                  opacity: 0.5,
                }} />
              ))}

              {/* Bars — flex:1 per kolom agar rata, minWidth agar tidak terlalu sempit */}
              <div style={{ display: 'flex', width: '100%', position: 'relative', zIndex: 1 }}>
                {months.map((m, i) => {
                  const masukH = m.masuk > 0 ? Math.max(4, (m.masuk / maxRp) * BAR_H) : 3
                  const keluarH = m.keluar > 0 ? Math.max(4, (m.keluar / maxRp) * BAR_H) : 3
                  const prog = progressByMonth[i]
                  const progH = prog != null ? Math.max(4, (prog / 100) * BAR_H) : 3
                  const isHov = hoveredIdx === i
                  const masukActive = m.masuk > 0
                  const keluarActive = m.keluar > 0
                  const progActive = prog != null && prog > 0

                  return (
                    <div
                      key={m.ym}
                      style={{ flex: 1, minWidth: MONTH_W, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default' }}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {/* 3 bars */}
                      <div style={{
                        display: 'flex',
                        gap: BAR_GAP,
                        height: BAR_H,
                        alignItems: 'flex-end',
                      }}>
                        {/* Masuk */}
                        <div style={{
                          width: BAR_W,
                          height: masukH,
                          backgroundColor: masukActive ? C_MASUK : 'var(--border-subtle)',
                          borderRadius: 0,
                          opacity: isHov ? 1 : masukActive ? 0.8 : 0.3,
                          transition: 'opacity 0.15s, height 0.3s ease',
                        }} />
                        {/* Keluar */}
                        <div style={{
                          width: BAR_W,
                          height: keluarH,
                          backgroundColor: keluarActive ? C_KELUAR : 'var(--border-subtle)',
                          borderRadius: 0,
                          opacity: isHov ? 1 : keluarActive ? 0.8 : 0.3,
                          transition: 'opacity 0.15s, height 0.3s ease',
                        }} />
                        {/* Progress */}
                        {hasProgress && (
                          <div style={{
                            width: BAR_W,
                            height: progH,
                            backgroundColor: progActive ? C_PROGRESS : 'var(--border-subtle)',
                            borderRadius: 0,
                            opacity: isHov ? 1 : progActive ? 0.8 : 0.3,
                            transition: 'opacity 0.15s, height 0.3s ease',
                            position: 'relative',
                          }}>
                            {/* Progress % label on top of bar when hovered */}
                            {isHov && prog != null && prog > 0 && (
                              <div style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginBottom: 2,
                                fontSize: 8.5,
                                fontWeight: 700,
                                color: C_PROGRESS,
                                whiteSpace: 'nowrap',
                              }}>
                                {prog}%
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Month label */}
                      <div style={{
                        fontSize: 10,
                        marginTop: 6,
                        color: isHov ? C_MASUK : 'var(--text-muted)',
                        fontWeight: isHov ? 700 : 400,
                        transition: 'color 0.12s',
                        userSelect: 'none',
                      }}>
                        {m.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Y-axis — Progress % scale */}
          {hasProgress && (
            <div style={{ width: 30, flexShrink: 0, position: 'relative', height: BAR_H }}>
              {[25, 50, 75, 100].map(pct => (
                <div key={pct} style={{
                  position: 'absolute',
                  top: BAR_H - (pct / 100) * BAR_H,
                  left: 6,
                  transform: 'translateY(-50%)',
                  fontSize: 9,
                  color: C_PROGRESS,
                  opacity: 0.8,
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}>
                  {pct}%
                </div>
              ))}
            </div>
          )}

        </div>}
      </div>

      {/* Footer legend — hanya untuk chart reguler */}
      {!progressOnly && <div style={{
        display: 'flex',
        gap: isMobile ? 16 : 28,
        flexWrap: 'nowrap',
        justifyContent: isMobile ? 'center' : 'flex-start',
        marginTop: 14, paddingTop: 12,
        borderTop: '1px solid var(--border-subtle)',
      }}>
        {[
          { color: C_MASUK, label: 'Masuk', desc: 'Dana kas masuk', descShort: 'Kas masuk', show: true },
          { color: C_KELUAR, label: 'Keluar', desc: 'Realisasi pengeluaran', descShort: 'Pengeluaran', show: true },
          { color: C_PROGRESS, label: 'Progress', desc: 'Progress fisik program', descShort: 'Fisik program', show: hasProgress },
        ].filter(it => it.show).map(it => (
          <div key={it.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, backgroundColor: it.color, marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{it.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap' }}>{isMobile ? it.descShort : it.desc}</div>
            </div>
          </div>
        ))}
      </div>}
    </div>
  )
}
