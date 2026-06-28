import { useState } from 'react'
import { Transaction } from '../lib/supabase'
import { formatRupiah } from '../lib/data'

interface BerandaChartProps {
  transactions: Transaction[]
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const CHART_H = 110

export default function BerandaChart({ transactions }: BerandaChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const byMonth: Record<string, { masuk: number; keluar: number }> = {}
  transactions.forEach(t => {
    const ym = t.tanggal?.slice(0, 7)
    if (!ym) return
    if (!byMonth[ym]) byMonth[ym] = { masuk: 0, keluar: 0 }
    if (t.jenis_transaksi === 'Masuk') byMonth[ym].masuk += t.nominal || 0
    else if (t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB') byMonth[ym].keluar += t.nominal || 0
  })

  const months: { ym: string; label: string; masuk: number; keluar: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    // Gunakan local time (bukan toISOString/UTC) supaya bulan tidak geser karena timezone
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({
      ym,
      label: `${MONTHS_ID[d.getMonth()]} '${d.getFullYear().toString().slice(2)}`,
      masuk: byMonth[ym]?.masuk || 0,
      keluar: byMonth[ym]?.keluar || 0,
    })
  }

  const maxVal = Math.max(...months.flatMap(m => [m.masuk, m.keluar]), 1)

  if (transactions.length === 0) return null

  const hovered = hoveredIdx !== null ? months[hoveredIdx] : null
  const tooltipLeft = hoveredIdx !== null
    ? Math.min(Math.max((hoveredIdx + 0.5) / months.length * 100, 13), 87)
    : 0

  return (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      padding: '16px 20px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Pengeluaran Per Bulan
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            6 Bulan Terakhir
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#059669' }} />
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Masuk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#DC2626' }} />
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 500 }}>Keluar</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Tooltip */}
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: `${tooltipLeft}%`,
          transform: 'translateX(-50%)',
          marginBottom: 8,
          backgroundColor: '#1E293B',
          color: '#fff',
          borderRadius: 8,
          padding: '7px 12px',
          pointerEvents: 'none',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.12s ease',
          whiteSpace: 'nowrap',
        }}>
          <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 5, fontWeight: 600 }}>
            {hovered?.label ?? ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: '#059669', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>
                {hovered && hovered.masuk > 0 ? formatRupiah(hovered.masuk) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: '#DC2626', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>
                {hovered && hovered.keluar > 0 ? formatRupiah(hovered.keluar) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Bar groups */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          {months.map((m, i) => {
            const masukPct = m.masuk > 0 ? Math.max(4 / CHART_H * 100, (m.masuk / maxVal) * 100) : 0
            const keluarPct = m.keluar > 0 ? Math.max(4 / CHART_H * 100, (m.keluar / maxVal) * 100) : 0
            const isHovered = hoveredIdx === i

            return (
              <div
                key={m.ym}
                style={{ flex: 1, cursor: 'default' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div style={{ display: 'flex', gap: 3, height: CHART_H, alignItems: 'flex-end' }}>
                  <div style={{
                    flex: 1,
                    height: masukPct > 0 ? `${masukPct}%` : 3,
                    backgroundColor: masukPct > 0 ? '#059669' : 'var(--border-subtle)',
                    borderRadius: '3px 3px 0 0',
                    opacity: isHovered ? 1 : 0.72,
                    transition: 'opacity 0.15s ease',
                  }} />
                  <div style={{
                    flex: 1,
                    height: keluarPct > 0 ? `${keluarPct}%` : 3,
                    backgroundColor: keluarPct > 0 ? '#DC2626' : 'var(--border-subtle)',
                    borderRadius: '3px 3px 0 0',
                    opacity: isHovered ? 1 : keluarPct > 0 ? 0.72 : 0.4,
                    transition: 'opacity 0.15s ease',
                  }} />
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: 10,
                  marginTop: 7,
                  color: isHovered ? 'var(--blue)' : 'var(--text-muted)',
                  fontWeight: isHovered ? 700 : 400,
                  transition: 'color 0.12s ease',
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
  )
}
