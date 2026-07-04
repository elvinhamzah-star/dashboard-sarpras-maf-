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

const GROUP_COLORS: Record<string, string> = {
  'Selesai':  '#1B5E2B',
  'On Going': '#0A7BC8',
  'On Hold':  '#D97706',
}
const GROUP_LABELS: Record<string, string> = {
  'Selesai':  'Selesai',
  'On Going': 'Berjalan',
  'On Hold':  'Ditangguhkan',
}


const ACCENT: Record<string, string> = {
  anggaran:   '#1A6FE8',
  realisasi:  '#059669',
  sisa:       '#C2600A',
  penyerapan: '#1A6FE8',
}

const LABEL: Record<string, string> = {
  anggaran:   'Total Anggaran',
  realisasi:  'Total Realisasi',
  sisa:       'Sisa Anggaran',
  penyerapan: 'Penyerapan Dana',
}

function IconAnggaran() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  )
}
function IconRealisasi() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}
function IconSisa() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  )
}
function IconPenyerapan() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

const ICONS: Record<string, React.ReactNode> = {
  anggaran:   <IconAnggaran />,
  realisasi:  <IconRealisasi />,
  sisa:       <IconSisa />,
  penyerapan: <IconPenyerapan />,
}

export default function MetricDetailModal({ type, programs, totalAnggaran, totalRealisasi, onClose }: Props) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const ps = isMobile ? 16 : 20
  const totalSisa = totalAnggaran - totalRealisasi
  const penyerapan = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0
  const withRealisasi = programs.filter(p => (p.realisasi_terkini || 0) > 0)
  const accent = ACCENT[type]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const rowSt = (isLast: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: `10px ${ps}px`,
    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
  })

  const rankSt: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
    minWidth: 18, textAlign: 'right', flexShrink: 0,
  }
  const nameSt: React.CSSProperties = {
    flex: 1, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.35,
  }

  const groupHeader = (label: string, color: string, borderTop: boolean): JSX.Element => (
    <div key={`gh-${label}`} style={{
      padding: `5px ${ps}px`,
      backgroundColor: `${color}0B`,
      borderTop: borderTop ? '1px solid var(--border-subtle)' : 'none',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>
    </div>
  )

  const valBox = (primary: React.ReactNode, secondary: React.ReactNode): JSX.Element => (
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>{primary}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{secondary}</div>
    </div>
  )

  const renderRows = () => {
    if (type === 'anggaran') {
      const sorted = [...programs].sort((a, b) => (b.total_anggaran || 0) - (a.total_anggaran || 0))
      const els: JSX.Element[] = []
      els.push(groupHeader(`${programs.length} Program Pekerjaan`, accent, false))
      sorted.forEach((p, i) => {
        const pct = totalAnggaran > 0 ? ((p.total_anggaran || 0) / totalAnggaran * 100).toFixed(1) : '0'
        els.push(
          <div key={p.id} style={rowSt(i === sorted.length - 1)}>
            <span style={rankSt}>{i + 1}</span>
            <span style={nameSt}>{p.nama_pekerjaan}</span>
            {valBox(
              <span style={{ color: accent }}>{formatRupiah(p.total_anggaran || 0)}</span>,
              `${pct}% dari total`
            )}
          </div>
        )
      })
      return els
    }

    if (type === 'realisasi') {
      const groups: Array<'Selesai' | 'On Going' | 'On Hold'> = ['Selesai', 'On Going', 'On Hold']
      let rank = 1
      let hasGroup = false
      const els: JSX.Element[] = []
      groups.forEach(status => {
        const gp = programs
          .filter(p => p.status === status && (p.realisasi_terkini || 0) > 0)
          .sort((a, b) => (b.realisasi_terkini || 0) - (a.realisasi_terkini || 0))
        if (!gp.length) return
        const color = GROUP_COLORS[status]
        els.push(groupHeader(`${GROUP_LABELS[status]} ${gp.length} Pekerjaan`, color, hasGroup))
        hasGroup = true
        gp.forEach((p, i) => {
          const r = rank++
          const pct = p.total_anggaran ? ((p.realisasi_terkini || 0) / p.total_anggaran * 100).toFixed(1) : '0'
          els.push(
            <div key={p.id} style={rowSt(i === gp.length - 1)}>
              <span style={rankSt}>{r}</span>
              <span style={nameSt}>{p.nama_pekerjaan}</span>
              {valBox(
                <span style={{ color }}>{formatRupiah(p.realisasi_terkini || 0)}</span>,
                `${pct}% terserap`
              )}
            </div>
          )
        })
      })
      return els
    }

    if (type === 'sisa') {
      const withSisa = [...programs]
        .map(p => ({ prog: p, sisa: (p.total_anggaran || 0) - (p.realisasi_terkini || 0) }))
        .sort((a, b) => b.sisa - a.sisa)
      const els: JSX.Element[] = []
      els.push(groupHeader(`${programs.length} Program Pekerjaan`, accent, false))
      withSisa.forEach(({ prog, sisa }, i) => {
        els.push(
          <div key={prog.id} style={rowSt(i === withSisa.length - 1)}>
            <span style={rankSt}>{i + 1}</span>
            <span style={nameSt}>{prog.nama_pekerjaan}</span>
            {valBox(
              <span style={{ color: sisa > 0 ? accent : 'var(--text-muted)' }}>{formatRupiah(sisa)}</span>,
              `dari ${formatRupiah(prog.total_anggaran || 0)}`
            )}
          </div>
        )
      })
      return els
    }

    if (type === 'penyerapan') {
      const mapped = [...programs].map(p => ({
        prog: p,
        pct: p.total_anggaran ? Math.round((p.realisasi_terkini || 0) / p.total_anggaran * 100) : 0,
      }))
      const withReal = mapped.filter(x => x.pct > 0).sort((a, b) => b.pct - a.pct)
      const noReal   = mapped.filter(x => x.pct === 0).sort((a, b) => (b.prog.total_anggaran || 0) - (a.prog.total_anggaran || 0))
      const els: JSX.Element[] = []

      if (withReal.length > 0) {
        els.push(groupHeader(`Sudah Terealisasi ${withReal.length} Pekerjaan dari ${programs.length}`, accent, false))
        withReal.forEach(({ prog, pct }, i) => {
          els.push(
            <div key={prog.id} style={rowSt(i === withReal.length - 1 && noReal.length === 0)}>
              <span style={rankSt}>{i + 1}</span>
              <span style={nameSt}>{prog.nama_pekerjaan}</span>
              {valBox(
                <span style={{ color: accent }}>{pct}%</span>,
                formatRupiah(prog.realisasi_terkini || 0)
              )}
            </div>
          )
        })
      }

      if (noReal.length > 0) {
        els.push(groupHeader(`Belum Terealisasi ${noReal.length} Pekerjaan`, 'var(--text-muted)', withReal.length > 0))
        noReal.forEach(({ prog }, i) => {
          els.push(
            <div key={prog.id} style={rowSt(i === noReal.length - 1)}>
              <span style={rankSt}>{withReal.length + i + 1}</span>
              <span style={{ ...nameSt, color: 'var(--text-muted)' }}>{prog.nama_pekerjaan}</span>
              {valBox(
                <span style={{ color: 'var(--text-muted)' }}>0%</span>,
                formatRupiah(prog.total_anggaran || 0)
              )}
            </div>
          )
        })
      }

      return els
    }

    return null
  }

  // Header stat: compact, one line, bold dark text — color lives only in the icon box
  const renderStat = () => {
    const st: React.CSSProperties = {
      fontSize: isMobile ? 14 : 15,
      fontWeight: 700,
      color: 'var(--text-primary)',
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
      marginTop: 4,
    }
    if (type === 'anggaran')  return <div style={st}>{programs.length} Program Pekerjaan</div>
    if (type === 'realisasi') return <div style={st}>{withRealisasi.length} / {programs.length} Terealisasi</div>
    if (type === 'sisa')      return <div style={st}>{formatRupiah(totalSisa)}</div>
    return                           <div style={st}>{penyerapan.toFixed(1)}% Penyerapan</div>
  }

  const ftrLeft =
    type === 'anggaran'   ? `${programs.length} program` :
    type === 'realisasi'  ? `${withRealisasi.length} program aktif` :
    type === 'sisa'       ? `${programs.length} program` :
    formatRupiah(totalRealisasi)

  const ftrLabel =
    type === 'anggaran'   ? 'Total anggaran' :
    type === 'realisasi'  ? 'Total realisasi' :
    type === 'sisa'       ? 'Penyerapan' :
    'Total anggaran'

  const ftrValue =
    type === 'anggaran'   ? formatRupiah(totalAnggaran) :
    type === 'realisasi'  ? formatRupiah(totalRealisasi) :
    type === 'sisa'       ? `${penyerapan.toFixed(1)}%` :
    formatRupiah(totalAnggaran)

  const panelStyle: React.CSSProperties = isMobile ? {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'var(--card)',
    borderRadius: '18px 18px 0 0',
    maxHeight: '88vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 -12px 48px rgba(0,0,0,0.14)',
    zIndex: 1001,
    overflow: 'hidden',
  } : {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'var(--card)',
    borderRadius: 16,
    width: '92%', maxWidth: 480, maxHeight: '82vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 64px rgba(0,0,0,0.16)',
    zIndex: 1001,
    overflow: 'hidden',
  }

  const iconSize = isMobile ? 40 : 44

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div style={panelStyle} onClick={e => e.stopPropagation()}>

        {/* Header — mirrors the dashboard card style */}
        <div style={{ padding: isMobile ? `18px ${ps}px 14px` : `20px ${ps}px 16px`, borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          {isMobile && (
            <div style={{ width: 32, height: 4, backgroundColor: 'var(--border-subtle)', borderRadius: 99, margin: '0 auto 14px' }} />
          )}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

            {/* Colored icon box — same style as dashboard cards */}
            <div style={{
              width: iconSize, height: iconSize, borderRadius: 10,
              backgroundColor: `${accent}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: accent, flexShrink: 0,
            }}>
              {ICONS[type]}
            </div>

            {/* Title block */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {LABEL[type]}
              </div>
              {renderStat()}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border-subtle)', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: 'var(--text-muted)', marginTop: 1 }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {programs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Tidak ada data
            </div>
          ) : (
            <>
              {renderRows()}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: `10px ${ps}px`, borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-subtle)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: accent, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ftrLeft}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ftrLabel}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{ftrValue}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
