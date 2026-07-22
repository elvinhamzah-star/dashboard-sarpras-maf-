import { useEffect } from 'react'
import { Program } from '../lib/supabase'
import { formatRupiah } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import ModalShell from './ModalShell'

export type MetricModalType = 'anggaran' | 'realisasi' | 'sisa' | 'penyerapan'

interface Props {
  type: MetricModalType
  programs: Program[]
  totalAnggaran: number
  totalRealisasi: number
  onClose: () => void
  inline?: boolean
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
  sisa:       '#D97706',
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

export default function MetricDetailModal({ type, programs, totalAnggaran, totalRealisasi, onClose, inline }: Props) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const ps = isMobile ? 16 : 24
  const totalSisa = totalAnggaran - totalRealisasi
  const penyerapan = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0
  const withRealisasi = programs.filter(p => (p.realisasi_terkini || 0) > 0)
  const accent = ACCENT[type]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    if (!inline) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      if (!inline) document.body.style.overflow = ''
    }
  }, [onClose, inline])

  const rowSt = (isLast: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14,
    padding: `${isMobile ? 14 : 16}px ${ps}px`,
    borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
  })

  const rankSt: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
    minWidth: 16, textAlign: 'right', flexShrink: 0,
  }
  const nameSt: React.CSSProperties = {
    flex: 1, fontSize: isMobile ? 12.5 : 14, color: 'var(--text-primary)', lineHeight: 1.3,
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
      <div style={{ fontSize: isMobile ? 12.5 : 14, fontWeight: 600, whiteSpace: 'nowrap' }}>{primary}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{secondary}</div>
    </div>
  )

  const renderRows = () => {
    if (type === 'anggaran') {
      const sorted = [...programs].sort((a, b) => (b.total_anggaran || 0) - (a.total_anggaran || 0))
      const els: JSX.Element[] = []
      sorted.forEach((p, i) => {
        const pct = totalAnggaran > 0 ? ((p.total_anggaran || 0) / totalAnggaran * 100).toFixed(1) : '0'
        els.push(
          <div key={p.id} style={rowSt(i === sorted.length - 1)}>
            <span style={rankSt}>{i + 1}</span>
            <span style={nameSt}>{p.nama_pekerjaan}</span>
            {valBox(
              <span style={{ color: 'var(--text-primary)' }}>{formatRupiah(p.total_anggaran || 0)}</span>,
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
                <span style={{ color: 'var(--text-primary)' }}>{formatRupiah(p.realisasi_terkini || 0)}</span>,
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
      withSisa.forEach(({ prog, sisa }, i) => {
        els.push(
          <div key={prog.id} style={rowSt(i === withSisa.length - 1)}>
            <span style={rankSt}>{i + 1}</span>
            <span style={nameSt}>{prog.nama_pekerjaan}</span>
            {valBox(
              <span style={{ color: 'var(--text-primary)' }}>{formatRupiah(sisa)}</span>,
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
                <span style={{ color: 'var(--text-primary)' }}>{pct}%</span>,
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

  const headerTotal =
    type === 'anggaran'  ? formatRupiah(totalAnggaran) :
    type === 'realisasi' ? formatRupiah(totalRealisasi) :
    type === 'sisa'      ? formatRupiah(totalSisa) :
    `${penyerapan.toFixed(1)}%`

  const headerSub =
    type === 'anggaran'  ? `${programs.length} program pekerjaan` :
    type === 'realisasi' ? `${withRealisasi.length} dari ${programs.length} program terealisasi` :
    type === 'sisa'      ? `${penyerapan.toFixed(1)}% sudah terserap` :
    `${formatRupiah(totalRealisasi)} dari ${formatRupiah(totalAnggaran)}`

  const ftrLeft =
    type === 'anggaran'   ? `${programs.length} program` :
    type === 'realisasi'  ? `${withRealisasi.length} program aktif` :
    type === 'sisa'       ? `${programs.length} program` :
    `${withRealisasi.length} program aktif`

  const iconSize = isMobile ? 40 : 44

  // ── Inline panel (desktop) ──
  if (inline) {
    return (
      <div style={{
        backgroundColor: 'var(--card)',
        borderRadius: 14,
        border: `1px solid ${accent}30`,
        boxShadow: `0 4px 24px ${accent}12`,
        overflow: 'hidden',
        marginBottom: 20,
        animation: 'fadeSlideDown 0.18s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '12px 24px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button
              onClick={onClose}
              style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border-subtle)', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
              {ICONS[type]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{LABEL[type]}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{headerSub}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: accent, letterSpacing: '-0.01em' }}>{headerTotal}</div>
            </div>
          </div>
        </div>
        {/* List */}
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {programs.length === 0
            ? <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Tidak ada data</div>
            : renderRows()
          }
        </div>
        {/* Footer */}
        <div style={{ padding: '10px 24px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: accent, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ftrLeft}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ModalShell
      onClose={onClose}
      maxWidth={960}
      zIndex={1000}
      backdropColor="rgba(0,0,0,0.4)"
      contentScroll={false}
    >
      {close => (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: isMobile ? '88vh' : '82vh' }}>

        {/* Header */}
        <div style={{ padding: isMobile ? `10px ${ps}px 14px` : `14px ${ps}px 16px`, borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, userSelect: 'none' }}>
          {/* Close button — baris sendiri di atas */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: isMobile ? 8 : 10 }}>
            <button
              onClick={close}
              style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {/* Content row: icon + label/sub | total sejajar kolom kanan list */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: iconSize, height: iconSize, borderRadius: 10,
              backgroundColor: `${accent}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: accent, flexShrink: 0,
            }}>
              {ICONS[type]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {LABEL[type]}
              </div>
              <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', marginTop: 2 }}>{headerSub}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: accent, letterSpacing: '-0.01em' }}>{headerTotal}</div>
            </div>
          </div>
        </div>

        {/* List — minHeight:0 is required or WebKit/Safari collapses this
            flex:1 child to 0 height (min-height:auto ≠ 0 with overflow:auto),
            hiding every row while header + footer stay visible. */}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: accent, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ftrLeft}</span>
          </div>
        </div>

      </div>
      )}
    </ModalShell>
  )
}
