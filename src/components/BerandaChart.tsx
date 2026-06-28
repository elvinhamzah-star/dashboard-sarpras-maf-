import { useState } from 'react'
import { Transaction } from '../lib/supabase'
import { formatRupiah } from '../lib/data'

interface BerandaChartProps {
  transactions: Transaction[]
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export default function BerandaChart({ transactions }: BerandaChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const byMonth: Record<string, number> = {}
  transactions
    .filter(t => t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB')
    .forEach(t => {
      const ym = t.tanggal?.slice(0, 7)
      if (ym) byMonth[ym] = (byMonth[ym] || 0) + (t.nominal || 0)
    })

  const months: { ym: string; label: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const ym = d.toISOString().slice(0, 7)
    months.push({
      ym,
      label: `${MONTHS_ID[d.getMonth()]} '${d.getFullYear().toString().slice(2)}`,
      total: byMonth[ym] || 0,
    })
  }

  const maxVal = Math.max(...months.map(m => m.total), 1)
  const barW = 36
  const chartH = 90
  const gap = 14
  const svgW = months.length * (barW + gap) - gap

  if (transactions.length === 0) return null

  const hovered = hoveredIdx !== null ? months[hoveredIdx] : null
  // clamp tooltip so it doesn't overflow left or right edge
  const rawPct = hoveredIdx !== null ? ((hoveredIdx * (barW + gap) + barW / 2) / svgW) * 100 : 0
  const tooltipPct = Math.min(Math.max(rawPct, 12), 88)

  return (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      padding: '16px 20px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: 20,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        Pengeluaran per Bulan
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, marginBottom: 14 }}>
        6 bulan terakhir
      </div>

      <div style={{ overflowX: 'auto' }}>
        {/* Fixed-height wrapper so chart doesn't jump when tooltip appears */}
        <div style={{ position: 'relative', minWidth: 300, paddingTop: 48 }}>

          {/* Tooltip — always rendered, fades in/out */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: `${tooltipPct}%`,
            transform: 'translateX(-50%)',
            backgroundColor: '#1E293B',
            color: '#fff',
            borderRadius: 8,
            padding: '6px 11px',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.12s ease, left 0.1s ease',
            whiteSpace: 'nowrap',
          }}>
            <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2, fontWeight: 500 }}>
              {hovered?.label ?? ''}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              {hovered && hovered.total > 0 ? formatRupiah(hovered.total) : 'Tidak ada pengeluaran'}
            </div>
          </div>

          <svg
            width={svgW}
            height={chartH + 28}
            style={{ display: 'block', minWidth: '100%' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {months.map((m, i) => {
              const barH = m.total > 0 ? Math.max(5, (m.total / maxVal) * chartH) : 3
              const x = i * (barW + gap)
              const y = chartH - barH
              const isHovered = hoveredIdx === i
              return (
                <g
                  key={m.ym}
                  style={{ cursor: 'default' }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* full-height invisible hit area */}
                  <rect x={x} y={0} width={barW} height={chartH} fill="transparent" />
                  <rect
                    x={x} y={y}
                    width={barW} height={barH}
                    rx="5"
                    fill={m.total > 0 ? '#1A6FE8' : '#E2E8F0'}
                    opacity={isHovered ? 1 : m.total > 0 ? 0.72 : 1}
                    style={{ transition: 'opacity 0.12s ease' }}
                  />
                  <text
                    x={x + barW / 2}
                    y={chartH + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill={isHovered ? '#1A6FE8' : '#94A3B8'}
                    fontWeight={isHovered ? '700' : '400'}
                    fontFamily="inherit"
                    style={{ transition: 'fill 0.12s ease' }}
                  >
                    {m.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </div>
  )
}
