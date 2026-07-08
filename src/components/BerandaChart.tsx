import { useState, useRef, useEffect } from 'react'
import { Transaction, ProgramSnapshot } from '../lib/supabase'
import { formatRupiah } from '../lib/data'

interface BerandaChartProps {
  transactions: Transaction[]
  snapshots: ProgramSnapshot[]
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const BAR_H = 110
const PROG_H = 60
const MONTH_W = 62

export default function BerandaChart({ transactions, snapshots }: BerandaChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  // Weighted average progress per month (latest snapshot per program)
  const progressByMonth: (number | null)[] = months.map(m => {
    const monthSnaps = snapshots.filter(s => s.snapshot_date?.startsWith(m.ym) && s.progress_percent != null)
    const latest: Record<string, ProgramSnapshot> = {}
    monthSnaps.forEach(s => {
      if (!latest[s.program_id] || s.snapshot_date > latest[s.program_id].snapshot_date) {
        latest[s.program_id] = s
      }
    })
    const snaps = Object.values(latest).filter(s => s.progress_percent != null)
    if (snaps.length === 0) return null
    return Math.round(snaps.reduce((sum, s) => sum + (s.progress_percent || 0), 0) / snaps.length)
  })

  const maxVal = Math.max(...months.flatMap(m => [m.masuk, m.keluar]), 1)
  const totalW = months.length * MONTH_W
  const hasProgress = progressByMonth.some(p => p != null)

  // Y position inside progress area: top = 100%, bottom = 0%
  const dotY = (pct: number) => 10 + ((100 - pct) / 100) * (PROG_H - 26)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [months.length])

  if (transactions.length === 0 && snapshots.length === 0) return null

  const hovered = hoveredIdx !== null ? months[hoveredIdx] : null
  const hovProg = hoveredIdx !== null ? progressByMonth[hoveredIdx] : null
  const tooltipLeft = hoveredIdx !== null
    ? Math.min(Math.max((hoveredIdx + 0.5) / months.length * 100, 13), 87)
    : 50

  return (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      padding: '16px 20px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Realisasi & Progress
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Perkembangan {months.length} bulan
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#1A6FE8' }} />
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Masuk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#94A3B8' }} />
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Keluar</span>
          </div>
          {hasProgress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: '#059669' }} />
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Progress</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ position: 'relative' }}>
        {/* Tooltip */}
        <div style={{
          position: 'absolute', bottom: '100%',
          left: `${tooltipLeft}%`, transform: 'translateX(-50%)',
          marginBottom: 8,
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
                <div style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: '#1A6FE8', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{formatRupiah(hovered.masuk)}</span>
              </div>
            )}
            {hovered && hovered.keluar > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: '#94A3B8', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{formatRupiah(hovered.keluar)}</span>
              </div>
            )}
            {hovProg != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#059669', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>Progress {hovProg}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable area */}
        <div ref={scrollRef} style={{ overflowX: 'auto', paddingBottom: 2 }}>

          {/* Bar chart */}
          <div style={{ display: 'flex', width: totalW }}>
            {months.map((m, i) => {
              const masukPct = m.masuk > 0 ? Math.max(4 / BAR_H * 100, (m.masuk / maxVal) * 100) : 0
              const keluarPct = m.keluar > 0 ? Math.max(4 / BAR_H * 100, (m.keluar / maxVal) * 100) : 0
              const isHov = hoveredIdx === i
              return (
                <div
                  key={m.ym}
                  style={{ width: MONTH_W, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default' }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div style={{ display: 'flex', gap: 4, height: BAR_H, alignItems: 'flex-end' }}>
                    <div style={{ width: 20, height: masukPct > 0 ? `${masukPct}%` : 3, backgroundColor: masukPct > 0 ? '#1A6FE8' : 'var(--border-subtle)', borderRadius: '3px 3px 0 0', opacity: isHov ? 1 : 0.72, transition: 'opacity 0.15s' }} />
                    <div style={{ width: 20, height: keluarPct > 0 ? `${keluarPct}%` : 3, backgroundColor: keluarPct > 0 ? '#94A3B8' : 'var(--border-subtle)', borderRadius: '3px 3px 0 0', opacity: isHov ? 1 : keluarPct > 0 ? 0.72 : 0.4, transition: 'opacity 0.15s' }} />
                  </div>
                  <div style={{ fontSize: 10, marginTop: 6, color: isHov ? '#1A6FE8' : 'var(--text-muted)', fontWeight: isHov ? 700 : 400, transition: 'color 0.12s', userSelect: 'none' }}>
                    {m.label}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Progress line */}
          {hasProgress && (
            <div style={{ position: 'relative', height: PROG_H, width: totalW, marginTop: 4 }}>
              <svg width={totalW} height={PROG_H} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
                {/* Connecting lines */}
                {months.map((_, i) => {
                  const p1 = progressByMonth[i]
                  const p2 = progressByMonth[i + 1]
                  if (p1 == null || p2 == null) return null
                  return (
                    <line
                      key={`l${i}`}
                      x1={(i + 0.5) * MONTH_W} y1={dotY(p1)}
                      x2={(i + 1.5) * MONTH_W} y2={dotY(p2)}
                      stroke="#059669" strokeWidth="1.5" strokeLinecap="round"
                      opacity="0.7"
                    />
                  )
                })}
                {/* Dots */}
                {months.map((_, i) => {
                  const p = progressByMonth[i]
                  if (p == null) return null
                  const cx = (i + 0.5) * MONTH_W
                  const cy = dotY(p)
                  const isHov = hoveredIdx === i
                  return (
                    <g key={`d${i}`}>
                      <circle cx={cx} cy={cy} r={isHov ? 5 : 4} fill="#059669" opacity={isHov ? 1 : 0.85} />
                      {isHov && <circle cx={cx} cy={cy} r="7" fill="none" stroke="#059669" strokeWidth="1.5" opacity="0.3" />}
                    </g>
                  )
                })}
              </svg>
              {/* % labels */}
              <div style={{ position: 'absolute', top: 0, left: 0, display: 'flex', width: totalW, height: PROG_H, pointerEvents: 'none' }}>
                {months.map((_, i) => {
                  const p = progressByMonth[i]
                  if (p == null) return <div key={i} style={{ width: MONTH_W }} />
                  const cy = dotY(p)
                  const labelTop = cy > PROG_H - 22 ? cy - 16 : cy + 8
                  return (
                    <div key={i} style={{ width: MONTH_W, position: 'relative' }}>
                      <span style={{
                        position: 'absolute',
                        left: '50%', transform: 'translateX(-50%)',
                        top: labelTop,
                        fontSize: 9.5, fontWeight: 700, color: '#059669',
                        whiteSpace: 'nowrap',
                      }}>
                        {p}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
