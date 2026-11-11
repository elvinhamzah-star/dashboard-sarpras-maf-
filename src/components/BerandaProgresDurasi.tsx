import { useState, useRef, useEffect, type CSSProperties } from 'react'

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const YEAR = 2026
const PROJECT_START = new Date(YEAR, 0, 20)
const TOTAL_DAYS = 365
const DAY_MS = 86_400_000

// Ukuran & gaya mengikuti chart "Realisasi & Progress" di dashboard utama (BerandaChart).
const BAR_H = 180
const MONTH_W = 62
const BAR_W = 18
const BAR_GAP = 4
const C_PROGRESS = '#1A6FE8'
const C_DURASI = '#64748B'

interface Props {
  /** Deret bulanan (bulan lampau) yang dihitung server — bobot anggaran tidak dikirim ke klien. */
  monthly: { ym: string; progress: number }[]
  /** Progres terkini (sama dengan kartu Progress Pekerjaan) — dipakai untuk bulan terakhir. */
  liveProgress: number | null
  isMobile: boolean
}

interface Point {
  ym: string
  label: string
  hari: number
  durasiPct: number
  progress: number
}

function buildPoints(monthly: { ym: string; progress: number }[], liveProgress: number | null): Point[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const lastMonth = now.getFullYear() > YEAR ? 11 : now.getFullYear() < YEAR ? 0 : now.getMonth()

  return Array.from({ length: lastMonth + 1 }, (_, m) => {
    const isLast = m === lastMonth
    // Bulan lampau dihitung di tanggal 15 (sama dengan titik estimasi progres), bulan berjalan di hari ini.
    const date = isLast && now.getFullYear() === YEAR ? now : new Date(YEAR, m, 15)
    const hari = Math.max(0, Math.min(TOTAL_DAYS, Math.round((date.getTime() - PROJECT_START.getTime()) / DAY_MS)))
    const ym = `${YEAR}-${String(m + 1).padStart(2, '0')}`
    const estimated = monthly.find(x => x.ym === ym)?.progress ?? 0
    return {
      ym,
      label: MONTHS_ID[m],
      hari,
      durasiPct: (hari / TOTAL_DAYS) * 100,
      progress: isLast && liveProgress != null ? liveProgress : estimated,
    }
  })
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

export default function BerandaProgresDurasi({ monthly, liveProgress, isMobile }: Props) {
  const points = buildPoints(monthly, liveProgress)
  const n = points.length

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Bulan terbaru selalu terlihat saat grafik harus di-scroll (mobile).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [n])

  // Ketuk di luar grafik melepas bulan yang disematkan.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPinnedIdx(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const activeIdx = hoveredIdx ?? pinnedIdx
  const active = activeIdx !== null ? points[activeIdx] : null
  const tipRatio = activeIdx !== null ? (activeIdx + 0.5) / n : 0.5
  const tipPos: CSSProperties = tipRatio > 0.66
    ? { right: 0, transform: 'none' }
    : tipRatio < 0.34
      ? { left: 0, transform: 'none' }
      : { left: `${tipRatio * 100}%`, transform: 'translateX(-50%)' }

  const guides = [25, 50, 75, 100]

  return (
    <div ref={wrapRef}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Perkembangan {n} bulan
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Tooltip — hover (desktop) atau klik/ketuk (mobile) */}
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute', top: 0,
            ...tipPos,
            backgroundColor: '#1E293B', color: '#fff',
            borderRadius: 8, padding: '7px 12px',
            pointerEvents: 'none', zIndex: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            opacity: active ? 1 : 0, transition: 'opacity 0.12s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 5, fontWeight: 600 }}>{active ? `${active.label} ${YEAR}` : ''}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {active && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: C_DURASI, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Durasi {active.hari} hari ({fmt(Math.round(active.durasiPct * 10) / 10)}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: C_PROGRESS, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Progres {fmt(active.progress)}%</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {/* Sumbu kiri — durasi (hari) */}
          <div style={{ width: 44, flexShrink: 0, position: 'relative', height: BAR_H }}>
            {guides.map(pct => (
              <div key={pct} style={{
                position: 'absolute', top: BAR_H - (pct / 100) * BAR_H, right: 6,
                transform: 'translateY(-50%)', fontSize: 9, color: 'var(--text-muted)',
                textAlign: 'right', whiteSpace: 'nowrap', lineHeight: 1,
              }}>
                {Math.round((TOTAL_DAYS * pct) / 100)} hr
              </div>
            ))}
          </div>

          {/* Area bar — bisa di-scroll horizontal kalau bulan banyak */}
          <div ref={scrollRef} style={{ overflowX: 'auto', paddingBottom: 2, flex: 1, minWidth: 0 }}>
            <div style={{ position: 'relative', minWidth: n * MONTH_W, width: '100%' }}>
              {guides.map(pct => (
                <div key={pct} style={{
                  position: 'absolute', top: BAR_H - (pct / 100) * BAR_H, left: 0, right: 0,
                  height: 1, backgroundColor: 'var(--border-subtle)', opacity: 0.5,
                }} />
              ))}

              <div style={{ display: 'flex', width: '100%', position: 'relative', zIndex: 1 }}>
                {points.map((p, i) => {
                  const isActive = activeIdx === i
                  const durH = p.hari > 0 ? Math.max(4, (p.durasiPct / 100) * BAR_H) : 3
                  const progH = p.progress > 0 ? Math.max(4, (p.progress / 100) * BAR_H) : 3
                  return (
                    <div
                      key={p.ym}
                      style={{ flex: 1, minWidth: MONTH_W, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', touchAction: 'manipulation' }}
                      onPointerEnter={e => { if (e.pointerType === 'mouse') setHoveredIdx(i) }}
                      onPointerLeave={e => { if (e.pointerType === 'mouse') setHoveredIdx(null) }}
                      onClick={() => setPinnedIdx(prev => (prev === i ? null : i))}
                    >
                      <div style={{ display: 'flex', gap: BAR_GAP, height: BAR_H, alignItems: 'flex-end' }}>
                        <div style={{
                          width: BAR_W, height: durH,
                          backgroundColor: p.hari > 0 ? C_DURASI : 'var(--border-subtle)',
                          opacity: isActive ? 1 : p.hari > 0 ? 0.8 : 0.3,
                          transition: 'opacity 0.15s, height 0.3s ease',
                        }} />
                        <div style={{
                          width: BAR_W, height: progH,
                          backgroundColor: p.progress > 0 ? C_PROGRESS : 'var(--border-subtle)',
                          opacity: isActive ? 1 : p.progress > 0 ? 0.8 : 0.3,
                          transition: 'opacity 0.15s, height 0.3s ease',
                        }} />
                      </div>
                      <div style={{
                        fontSize: 10, marginTop: 6,
                        color: isActive ? C_PROGRESS : 'var(--text-muted)',
                        fontWeight: isActive ? 700 : 400,
                        transition: 'color 0.12s', userSelect: 'none',
                      }}>
                        {p.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sumbu kanan — progres (%) */}
          <div style={{ width: 30, flexShrink: 0, position: 'relative', height: BAR_H }}>
            {guides.map(pct => (
              <div key={pct} style={{
                position: 'absolute', top: BAR_H - (pct / 100) * BAR_H, left: 6,
                transform: 'translateY(-50%)', fontSize: 9, color: C_PROGRESS,
                opacity: 0.8, whiteSpace: 'nowrap', lineHeight: 1,
              }}>
                {pct}%
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda — urutan sama dengan urutan bar dan sumbu (kiri → kanan) */}
      <div style={{
        display: 'flex',
        gap: isMobile ? 16 : 28,
        flexWrap: 'nowrap',
        justifyContent: isMobile ? 'center' : 'flex-start',
        marginTop: 14, paddingTop: 12,
        borderTop: '1px solid var(--border-subtle)',
      }}>
        {[
          { color: C_DURASI, label: 'Durasi', desc: `Hari berjalan dari ${TOTAL_DAYS} hari`, descShort: 'Hari berjalan' },
          { color: C_PROGRESS, label: 'Progres', desc: 'Progres aktual pekerjaan', descShort: 'Progres aktual' },
        ].map(it => (
          <div key={it.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, backgroundColor: it.color, marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{it.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap' }}>{isMobile ? it.descShort : it.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
