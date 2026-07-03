import { Program } from '../lib/supabase'
import { formatRupiah, getTodayFormatted, getEffectiveProgress } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import BerandaAlerts from './BerandaAlerts'

const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

interface Props {
  programs: Program[]
  totalAnggaran: number
  totalRealisasi: number
  formattedLastUpdated: string | null
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  'Selesai':     { label: 'Selesai',     color: '#059669',       bg: 'rgba(5,150,105,0.1)' },
  'On Going':    { label: 'Berjalan',    color: '#1A6FE8',       bg: 'rgba(26,111,232,0.1)' },
  'On Hold':     { label: 'Tertunda',    color: '#D97706',       bg: 'rgba(217,119,6,0.1)' },
  'Perencanaan': { label: 'Perencanaan', color: 'var(--text-muted)', bg: 'var(--surface-2)' },
}

export default function BerandaMAF({ programs, totalAnggaran, totalRealisasi, formattedLastUpdated }: Props) {
  const width = useWindowWidth()
  const isMobile = width < 600

  const penyerapan = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0

  const selesai    = programs.filter(p => p.status === 'Selesai').length
  const onGoing    = programs.filter(p => p.status === 'On Going').length
  const onHold     = programs.filter(p => p.status === 'On Hold').length

  const progressPrograms = programs.filter(p => p.status !== 'Perencanaan')
  const progressAnggaranTotal = progressPrograms.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const progressOverall = progressAnggaranTotal > 0
    ? (progressPrograms.reduce((s, p) => s + getEffectiveProgress(p) * (p.total_anggaran || 0), 0) / progressAnggaranTotal)
    : 0

  const summaryCards = [
    {
      label: 'Total Program',
      value: programs.length.toString(),
      iconBg: 'rgba(26,111,232,0.1)',
      iconColor: 'var(--blue)',
      trend: `${selesai} selesai`,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      ),
    },
    {
      label: 'Selesai',
      value: selesai.toString(),
      iconBg: 'rgba(5,150,105,0.1)',
      iconColor: '#059669',
      trend: `Dari ${programs.length} program`,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
    },
    {
      label: 'Progress',
      value: `${progressOverall.toFixed(1)}%`,
      iconBg: 'rgba(26,111,232,0.1)',
      iconColor: 'var(--blue)',
      trend: `${onGoing} berjalan · ${onHold} tertunda`,
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
    },
  ]

  const STATUS_ORDER = ['On Going', 'Selesai', 'On Hold', 'Perencanaan']
  const sortedPrograms = [...programs].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status || '')
    const bi = STATUS_ORDER.indexOf(b.status || '')
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <div style={{ padding: isMobile ? '16px 14px 48px' : '28px 28px 48px' }}>

      {/* Header — same style as Beranda */}
      {isMobile ? (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Dashboard Sarpras MAF
            </h1>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, flexShrink: 0, marginLeft: 8, marginTop: 2 }}>
              {getTodayFormatted()}
            </span>
          </div>
          {formattedLastUpdated && (
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, color: 'rgba(185,28,28,.6)', fontWeight: 500, border: '0.5px solid rgba(220,38,38,.22)', borderRadius: 5, padding: '2px 7px', background: 'rgba(220,38,38,.055)', marginTop: 5 }}>
              Diperbarui {formattedLastUpdated}
            </span>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Dashboard Sarpras MAF
            </h1>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400 }}>{getTodayFormatted()}</span>
              {formattedLastUpdated && (
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, color: 'rgba(185,28,28,.6)', fontWeight: 500, border: '0.5px solid rgba(220,38,38,.22)', borderRadius: 5, padding: '2px 8px', background: 'rgba(220,38,38,.055)' }}>
                  Diperbarui {formattedLastUpdated}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <BerandaAlerts programs={programs} />

      {/* 3 Metric Cards — same visual as PBB, 3 kolom */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 10 : 14, marginBottom: 20 }}>
        {summaryCards.map(card => (
          <div
            key={card.label}
            style={{ backgroundColor: 'var(--card)', borderRadius: 12, padding: isMobile ? '12px 13px' : '18px 20px', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 0.18s ease, transform 0.18s ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
          >
            <div style={{ width: isMobile ? 28 : 36, height: isMobile ? 28 : 36, borderRadius: 8, backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.iconColor, marginBottom: isMobile ? 8 : 14, flexShrink: 0 }}>
              {card.icon}
            </div>
            <div style={{ fontSize: isMobile ? 9.5 : 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: isMobile ? 4 : 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: isMobile ? 15 : 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: isMobile ? 3 : 6 }}>
              {card.value}
            </div>
            <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', fontWeight: 400 }}>{card.trend}</div>
          </div>
        ))}
      </div>

      {/* Ringkasan Anggaran — same card style, single combined view */}
      <div style={{ backgroundColor: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: isMobile ? '12px 14px' : '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Anggaran Dana Wakaf</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Keseluruhan program</div>
        </div>
        <div style={{ padding: isMobile ? '14px 14px' : '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Total Anggaran</div>
              <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{formatRupiah(totalAnggaran)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Terserap</div>
              <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: '#059669' }}>{penyerapan.toFixed(1)}%</div>
            </div>
          </div>
          <div style={{ height: 6, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ width: `${Math.min(penyerapan, 100)}%`, height: '100%', backgroundColor: '#1A6FE8', borderRadius: 99 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? 11 : 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Digunakan: <span style={{ color: '#059669', fontWeight: 600 }}>{formatRupiah(totalRealisasi)}</span>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              Sisa: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{formatRupiah(totalAnggaran - totalRealisasi)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Status per Program — same visual as BerandaVendor tapi tanpa detail keuangan */}
      <div style={{ backgroundColor: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: isMobile ? '12px 14px' : '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Status per Program</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{programs.length} Program</div>
        </div>
        <div style={{ padding: '4px 0' }}>
          {sortedPrograms.map((p, i) => {
            const progress = getEffectiveProgress(p)
            const st = STATUS_CFG[p.status || ''] ?? { label: p.status || '-', color: 'var(--text-muted)', bg: 'var(--surface-2)' }
            return (
              <div
                key={p.id}
                style={{ padding: isMobile ? '12px 14px' : '12px 20px', borderBottom: i < sortedPrograms.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1, paddingRight: 10, lineHeight: 1.3 }}>
                    {p.nama_pekerjaan}
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: st.color, backgroundColor: st.bg, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#1A6FE8', borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1A6FE8', minWidth: 34, textAlign: 'right' }}>
                    {progress}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
