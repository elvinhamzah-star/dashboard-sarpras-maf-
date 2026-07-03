import { useEffect } from 'react'
import { Program } from '../lib/supabase'
import { formatRupiah } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'

export type MetricModalType = 'anggaran' | 'realisasi' | 'sisa' | 'penyerapan'

interface Props {
  type: MetricModalType
  programs: Program[]
  totalAnggaran: number
  totalRealisasi: number
  onClose: () => void
}

const CONFIG: Record<MetricModalType, { title: string; subtitle: string; color: string }> = {
  anggaran:   { title: 'Rincian Anggaran',       subtitle: 'Seluruh program & nilai anggarannya',         color: '#1A6FE8' },
  realisasi:  { title: 'Rincian Realisasi',       subtitle: 'Program yang sudah ada realisasi dana',       color: '#059669' },
  sisa:       { title: 'Sisa Anggaran per Program', subtitle: 'Diurutkan dari sisa terbesar',              color: '#D97706' },
  penyerapan: { title: 'Penyerapan per Program',  subtitle: 'Seberapa banyak anggaran yang terserap',      color: '#1A6FE8' },
}

function buildRows(type: MetricModalType, programs: Program[]) {
  switch (type) {
    case 'anggaran':
      return [...programs]
        .sort((a, b) => (b.total_anggaran || 0) - (a.total_anggaran || 0))
        .map(p => ({
          nama: p.nama_pekerjaan,
          status: p.status,
          amount: p.total_anggaran || 0,
          pct: null as number | null,
          sub: null as string | null,
        }))

    case 'realisasi':
      return [...programs]
        .filter(p => (p.realisasi_terkini || 0) > 0)
        .sort((a, b) => (b.realisasi_terkini || 0) - (a.realisasi_terkini || 0))
        .map(p => ({
          nama: p.nama_pekerjaan,
          status: p.status,
          amount: p.realisasi_terkini || 0,
          pct: p.total_anggaran ? Math.round(((p.realisasi_terkini || 0) / p.total_anggaran) * 100) : null,
          sub: p.total_anggaran ? `dari ${formatRupiah(p.total_anggaran)}` : null,
        }))

    case 'sisa': {
      return [...programs]
        .map(p => ({
          nama: p.nama_pekerjaan,
          status: p.status,
          amount: (p.total_anggaran || 0) - (p.realisasi_terkini || 0),
          pct: p.total_anggaran
            ? Math.round((1 - (p.realisasi_terkini || 0) / p.total_anggaran) * 100)
            : 100,
          sub: p.total_anggaran ? `dari ${formatRupiah(p.total_anggaran)}` : null,
        }))
        .sort((a, b) => b.amount - a.amount)
    }

    case 'penyerapan':
      return [...programs]
        .map(p => ({
          nama: p.nama_pekerjaan,
          status: p.status,
          amount: p.realisasi_terkini || 0,
          pct: p.total_anggaran ? Math.round(((p.realisasi_terkini || 0) / p.total_anggaran) * 100) : 0,
          sub: formatRupiah(p.realisasi_terkini || 0),
        }))
        .filter(r => r.pct !== null)
        .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
  }
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  'On Going':    { label: 'Berjalan',    color: '#0A7BC8', bg: 'rgba(10,123,200,0.1)' },
  'Selesai':     { label: 'Selesai',     color: '#1B5E2B', bg: 'rgba(27,94,43,0.1)'  },
  'On Hold':     { label: 'Tertunda',    color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  'Perencanaan': { label: 'Perencanaan', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
}

export default function MetricDetailModal({ type, programs, totalAnggaran, totalRealisasi, onClose }: Props) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const cfg = CONFIG[type]
  const rows = buildRows(type, programs)

  const footerLabel = type === 'anggaran' ? 'Total Anggaran'
    : type === 'realisasi' ? 'Total Realisasi'
    : type === 'sisa' ? 'Total Sisa Anggaran'
    : 'Total Realisasi'

  const footerAmount = type === 'anggaran' ? totalAnggaran
    : type === 'realisasi' ? totalRealisasi
    : type === 'sisa' ? (totalAnggaran - totalRealisasi)
    : totalRealisasi

  const footerSub = type === 'penyerapan'
    ? `Rata-rata penyerapan: ${totalAnggaran > 0 ? ((totalRealisasi / totalAnggaran) * 100).toFixed(1) : '0'}%`
    : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const panelStyle: React.CSSProperties = isMobile ? {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'var(--card)',
    borderRadius: '20px 20px 0 0',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
    zIndex: 1001,
  } : {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'var(--card)',
    borderRadius: 18,
    width: '90%',
    maxWidth: 520,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    zIndex: 1001,
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={panelStyle} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: isMobile ? '20px 18px 14px' : '20px 22px 14px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          {isMobile && (
            <div style={{ width: 36, height: 4, backgroundColor: 'var(--border-subtle)', borderRadius: 99, margin: '0 auto 14px' }} />
          )}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{cfg.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{cfg.subtitle}</div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: 'var(--text-muted)' }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {rows.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Tidak ada data
            </div>
          ) : (
            rows.map((row, i) => {
              const badge = STATUS_BADGE[row.status || '']
              const showBar = type === 'sisa' || type === 'penyerapan'
              const barPct = row.pct ?? 0
              const barColor = type === 'sisa'
                ? (barPct > 50 ? '#059669' : barPct > 20 ? '#D97706' : '#DC2626')
                : '#1A6FE8'

              return (
                <div key={i} style={{ padding: isMobile ? '12px 18px' : '12px 22px', borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: showBar ? 8 : 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>
                        {row.nama}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {badge && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: badge.color, backgroundColor: badge.bg, borderRadius: 5, padding: '2px 7px' }}>
                            {badge.label}
                          </span>
                        )}
                        {row.sub && (
                          <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{row.sub}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {type === 'penyerapan' ? (
                        <div style={{ fontSize: 15, fontWeight: 700, color: cfg.color, letterSpacing: '-0.02em' }}>
                          {row.pct}%
                        </div>
                      ) : (
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: type === 'sisa' ? (row.amount > 0 ? '#059669' : '#DC2626') : cfg.color, letterSpacing: '-0.01em' }}>
                          {formatRupiah(row.amount)}
                        </div>
                      )}
                    </div>
                  </div>

                  {showBar && (
                    <div style={{ height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(barPct, 100)}%`, height: '100%', backgroundColor: barColor, borderRadius: 99, transition: 'width 0.3s ease' }} />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer total */}
        <div style={{ padding: isMobile ? '14px 18px' : '14px 22px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-subtle)', flexShrink: 0, borderRadius: isMobile ? 0 : '0 0 18px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{footerLabel}</div>
              {footerSub && <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{footerSub}</div>}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: cfg.color, letterSpacing: '-0.02em' }}>
              {type === 'penyerapan'
                ? `${totalAnggaran > 0 ? ((totalRealisasi / totalAnggaran) * 100).toFixed(1) : '0'}%`
                : formatRupiah(footerAmount)
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
