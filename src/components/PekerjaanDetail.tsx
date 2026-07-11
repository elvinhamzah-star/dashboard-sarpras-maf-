import { useEffect, useState, useRef } from 'react'
import { supabase, SubProgram, Program, Transaction, ProgramDocument, invalidateCache } from '../lib/supabase'
import { STATUS_COLORS, STATUS_BG, formatRupiah, formatTanggal, getEffectiveProgress, getFileEmbedUrl } from '../lib/data'
import PdfViewerModal from './PdfViewerModal'
import { useWindowWidth } from '../lib/useWindowWidth'
import UpdateProgressModal from './UpdateProgressModal'
import UpdateSubPekerjaanModal from './UpdateSubPekerjaanModal'
import AddSubPekerjaanModal from './AddSubPekerjaanModal'
import EditCatatanPekerjaanModal from './EditCatatanPekerjaanModal'
import EditProgramModal from './EditProgramModal'

interface PekerjaanDetailProps {
  programId: string
  isAdmin: boolean
  onBack: () => void
  onNavigate?: (page: string, programId?: string, category?: string) => void
  /** true when rendered inside a modal/bottom-sheet: hides the back button & edge-swipe (the shell owns closing) */
  embedded?: boolean
}

type Tab = 'Ringkasan' | 'Dokumen' | 'Sub Pekerjaan'

export default function PekerjaanDetail({ programId, isAdmin, onBack, onNavigate, embedded = false }: PekerjaanDetailProps) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const isNarrow = width < 1100
  const [program, setProgram] = useState<Program | null>(null)
  const [subPrograms, setSubPrograms] = useState<SubProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('Ringkasan')
  const [programDocs, setProgramDocs] = useState<ProgramDocument[]>([])
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showEditCatatan, setShowEditCatatan] = useState(false)
  const [showEditProgram, setShowEditProgram] = useState(false)
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [editingSubProgram, setEditingSubProgram] = useState<SubProgram | null>(null)
  const [addingSubProgram, setAddingSubProgram] = useState(false)
  const [buktiExpanded, setBuktiExpanded] = useState(false)
  const swipeTouchStartX = useRef<number | null>(null)
  const swipeTouchStartY = useRef<number | null>(null)

  const openFile = (url: string, name: string) => {
    const embedUrl = getFileEmbedUrl(url)
    if (embedUrl) setPdfViewer({ url: embedUrl, name })
    else window.open(url, '_blank')
  }

  const load = async () => {
    setLoading(true)
    const [pRes, sRes, pdRes] = await Promise.all([
      supabase.from('programs').select('*').eq('id', programId).single(),
      supabase.from('sub_programs').select('*').eq('program_id', programId).order('id', { ascending: true }),
      supabase.from('program_documents').select('*').eq('program_id', programId).order('created_at', { ascending: true }),
    ])
    if (pRes.data) {
      setProgram(pRes.data)
      // Fetch transactions with bukti for this program
      const tRes = await supabase
        .from('transactions')
        .select('*')
        .eq('nama_pekerjaan', pRes.data.nama_pekerjaan)
        .not('link_bukti', 'is', null)
        .order('tanggal', { ascending: false })
      setTransactions((tRes.data ?? []).filter(t => t.link_bukti))
    }
    if (sRes.data) setSubPrograms(sRes.data)
    if (pdRes.data) setProgramDocs(pdRes.data as ProgramDocument[])
    setLoading(false)
  }

  useEffect(() => { load() }, [programId])

  const tabs: Tab[] = ['Ringkasan', 'Dokumen', ...(subPrograms.length > 0 || isAdmin ? ['Sub Pekerjaan' as Tab] : [])]

  if (loading) {
    return (
      <div style={{ padding: isMobile ? '16px 14px 48px' : '28px 28px 48px', width: '100%', boxSizing: 'border-box' }}>
        {!embedded && <div className="skeleton" style={{ width: 150, height: 34, borderRadius: 99, marginBottom: 20 }} />}
        <div style={{ backgroundColor: 'var(--card)', borderRadius: 14, padding: isMobile ? 14 : '20px 24px', border: '1px solid var(--border-subtle)', marginBottom: 14 }}>
          <div className="skeleton" style={{ width: 90, height: 12, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: '70%', height: 22, marginBottom: 14 }} />
          <div className="skeleton" style={{ width: '100%', height: 46 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[72, 72, 96].map((w, i) => <div key={i} className="skeleton" style={{ width: w, height: 32, borderRadius: 99 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
          <div className="skeleton" style={{ height: 180, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 180, borderRadius: 14 }} />
        </div>
      </div>
    )
  }

  if (!program) {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 99, padding: '6px 14px 6px 8px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}
          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#fff'; b.style.background = 'var(--blue)'; b.style.borderColor = 'var(--blue)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(255,255,255,0.2)' }}
          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'var(--text-secondary)'; b.style.background = 'var(--card)'; b.style.borderColor = 'var(--border-subtle)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(0,0,0,0.06)' }}
        >
          <span className="bk-ic" style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </span>
          Kembali ke Daftar
        </button>
        <p style={{ color: 'var(--text-muted)', marginTop: 20 }}>Pekerjaan tidak ditemukan.</p>
      </div>
    )
  }

  const pct = getEffectiveProgress(program)
  const statusColor = STATUS_COLORS[program.status] || 'var(--blue)'

  return (
    <div
      style={{ padding: isMobile ? '16px 14px 48px' : '28px 28px 48px', width: '100%', boxSizing: 'border-box' }}
      onTouchStart={embedded ? undefined : e => {
        if (e.touches[0].clientX < 28) {
          swipeTouchStartX.current = e.touches[0].clientX
          swipeTouchStartY.current = e.touches[0].clientY
        }
      }}
      onTouchEnd={embedded ? undefined : e => {
        if (swipeTouchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - swipeTouchStartX.current
        const dy = Math.abs(e.changedTouches[0].clientY - (swipeTouchStartY.current || 0))
        if (dx > 72 && dy < 80) onBack()
        swipeTouchStartX.current = null
        swipeTouchStartY.current = null
      }}
    >

      {/* Back button — wide screens only (≤768px uses the top-bar ← arrow).
          Hidden when embedded in a modal — the shell owns closing. */}
      {!embedded && width > 768 && <button
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 99, padding: '6px 14px 6px 8px', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 20, fontFamily: 'inherit', transition: 'all 0.15s' }}
        onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#fff'; b.style.background = 'var(--blue)'; b.style.borderColor = 'var(--blue)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(255,255,255,0.2)' }}
        onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'var(--text-secondary)'; b.style.background = 'var(--card)'; b.style.borderColor = 'var(--border-subtle)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(0,0,0,0.06)' }}
      >
        <span className="bk-ic" style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </span>
        Kembali ke Daftar
      </button>}

      {/* Header Card */}
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: 14,
          padding: isMobile ? '14px 14px' : '20px 24px',
          border: '1px solid var(--border-subtle)',
          marginBottom: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Row 1: ID + title + button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: isMobile ? 10 : 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>{program.id}</span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 9px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  backgroundColor: STATUS_BG[program.status] || 'var(--border-subtle)',
                  color: statusColor,
                  letterSpacing: '0.01em',
                }}
              >
                {program.status}
              </span>
            </div>
            <h1 style={{ fontSize: isMobile ? 15 : 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3, letterSpacing: '-0.03em' }}>
              {program.nama_pekerjaan}
            </h1>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowUpdateModal(true)}
              style={{
                flexShrink: 0,
                backgroundColor: 'var(--blue)',
                color: 'var(--card)',
                border: 'none',
                borderRadius: 10,
                padding: isMobile ? '8px 13px' : '9px 18px',
                fontWeight: 600,
                fontSize: isMobile ? 12 : 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 1px 3px rgba(26,111,232,0.3)',
                letterSpacing: '-0.01em',
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--blue)' }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Update Progress
            </button>
          )}
        </div>
        {/* Row 2: Catatan — full width */}
        <div
          onClick={() => isAdmin && setShowEditCatatan(true)}
          style={{
            backgroundColor: program.isu_utama ? 'rgba(217,119,6,0.07)' : 'var(--surface-min)',
            borderLeft: program.isu_utama ? '2.5px solid #D97706' : '2.5px solid var(--border)',
            borderRadius: 7,
            padding: '8px 12px',
            fontSize: isMobile ? 11.5 : 12.5,
            color: program.isu_utama ? '#92400e' : 'var(--text-muted)',
            fontWeight: 500,
            cursor: isAdmin ? 'pointer' : 'default',
            transition: 'all 0.15s',
            minHeight: 32,
            display: 'flex',
            alignItems: program.isu_utama ? 'flex-start' : 'center',
            gap: 8,
          }}
          onMouseEnter={e => {
            if (isAdmin && program.isu_utama) {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(217,119,6,0.12)'
            }
          }}
          onMouseLeave={e => {
            if (isAdmin && program.isu_utama) {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(217,119,6,0.07)'
            }
          }}
        >
          {program.isu_utama ? (
            <>
              <svg width="13" height="13" fill="none" stroke="#D97706" strokeWidth="2" viewBox="0 0 24 24" style={{ marginTop: 2, flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {program.isu_utama.split('\n').filter(l => l.trim()).map((line, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#92400e', flexShrink: 0, marginTop: 5 }} />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (isAdmin ? '+ Tambah Catatan...' : 'Tidak Ada Catatan')}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {[
            { label: 'Program', value: program.program || '-' },
            { label: 'Jenis Pekerjaan', value: program.jenis_pekerjaan || '-' },
            { label: 'Tanggal Mulai', value: formatTanggal(program.tanggal_mulai || '') },
            { label: 'Tanggal Selesai', value: formatTanggal(program.tanggal_selesai || '') },
            {
              label: 'Vendor',
              value: (() => {
                const subs = subPrograms.filter(s => s.program_id === program.id)
                if (subs.length === 0) return program.vendor || '-'
                const unique = [...new Set(subs.map(s => s.vendor).filter(Boolean))]
                return unique.length > 0 ? unique.join(', ') : (program.vendor || '-')
              })(),
              fullWidth: true,
            },
          ].map(m => (
            <div key={m.label} style={'fullWidth' in m && m.fullWidth ? { gridColumn: '1 / -1' } : {}}>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontSize: isMobile ? 11.5 : 13, fontWeight: 600, color: 'var(--text-primary)' }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Total Anggaran', value: formatRupiah(program.total_anggaran || 0), color: 'var(--blue)' },
          { label: 'Realisasi Terkini', value: formatRupiah(program.realisasi_terkini || 0), color: '#059669' },
          { label: 'Sisa Anggaran', value: formatRupiah(program.sisa_anggaran || 0), color: '#D97706' },
          { label: 'Progress', value: `${pct}%`, color: statusColor },
        ].map(c => (
          <div
            key={c.label}
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: 12,
              padding: isMobile ? '10px 12px' : '16px 18px',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: isMobile ? 9.5 : 10.5, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: isMobile ? 4 : 8 }}>
              {c.label}
            </div>
            <div style={{ fontSize: isMobile ? 13 : 18, fontWeight: 700, color: c.color, letterSpacing: '-0.03em' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Progress Bar — hidden for completed works (100% is redundant once done) */}
      {program.status !== 'Selesai' && (
        <div
          style={{
            backgroundColor: 'var(--card)',
            borderRadius: 12,
            padding: isMobile ? '10px 12px' : '16px 20px',
            border: '1px solid var(--border-subtle)',
            marginBottom: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: isMobile ? 11.5 : 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Progress Pekerjaan</span>
            <span style={{ fontSize: isMobile ? 12.5 : 16, fontWeight: 700, color: statusColor, letterSpacing: '-0.02em' }}>{pct}%</span>
          </div>
          <div style={{ height: 8, backgroundColor: 'var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                backgroundColor: statusColor,
                borderRadius: 10,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: activeTab === tab ? 'none' : '1px solid var(--border)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: activeTab === tab ? 'var(--blue)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.13s',
              letterSpacing: '-0.01em',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: 14,
          border: '1px solid var(--border-subtle)',
          padding: isMobile ? '14px 14px' : '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {activeTab === 'Ringkasan' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Ringkasan Pekerjaan</h3>
              {isAdmin && (
                <button
                  onClick={() => setShowEditProgram(true)}
                  style={{ backgroundColor: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--blue)' }}
                >
                  Edit
                </button>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {[
                    ['ID', program.id],
                    ['Program', program.program || '-'],
                    ['Nama Pekerjaan', program.nama_pekerjaan],
                    ['Jenis Pekerjaan', program.jenis_pekerjaan || '-'],
                    ['Status', program.status],
                    ['Progress', `${getEffectiveProgress(program)}%`],
                    ['Total Anggaran', formatRupiah(program.total_anggaran || 0)],
                    ['Realisasi Terkini', formatRupiah(program.realisasi_terkini || 0)],
                    ['Sisa Anggaran', formatRupiah(program.sisa_anggaran || 0)],
                    ['Vendor', (() => { const subs = subPrograms.filter(s => s.program_id === program.id); if (subs.length === 0) return program.vendor || '-'; const u = [...new Set(subs.map(s => s.vendor).filter(Boolean))]; return u.length > 0 ? u.join(', ') : (program.vendor || '-') })()],
                    ['Catatan Pekerjaan', program.isu_utama
                      ? program.isu_utama.split('\n').filter((l: string) => l.trim()).map((line: string, idx: number) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: idx > 0 ? 3 : 0 }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--text-secondary)', flexShrink: 0, marginTop: 5 }} />
                            <span>{line}</span>
                          </div>
                        ))
                      : '-'],
                    ['Dibuat', formatTanggal(program.created_at)],
                  ].map(([label, value], i, arr) => {
                    const isCatatan = label === 'Catatan Pekerjaan'
                    const isLast = i === arr.length - 1
                    if (isMobile && isCatatan) {
                      return (
                        <tr key={String(label)} style={{ borderBottom: !isLast ? '1px solid var(--surface-subtle)' : 'none' }}>
                          <td colSpan={2} style={{ padding: '10px 0' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</div>
                          </td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={String(label)} style={{ borderBottom: !isLast ? '1px solid var(--surface-subtle)' : 'none' }}>
                        <td style={{ padding: '10px 0', color: 'var(--text-muted)', fontWeight: 600, width: '40%', minWidth: 140, verticalAlign: 'top', fontSize: 12 }}>{label}</td>
                        <td style={{ padding: '10px 0', color: 'var(--text-primary)', fontSize: 13 }}>{value}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Dokumen' && (
          <div>
            {!buktiExpanded ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Dokumen & Lampiran</h3>
                  {isAdmin && onNavigate && (
                    <button
                      onClick={() => onNavigate('dokumen', program.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: 'var(--card)', color: 'var(--blue)', border: '1px solid rgba(26,111,232,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Kelola
                      <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* RAB — flat rows, satu baris per file */}
                  {(() => {
                    const files = programDocs.filter(d => d.folder === 'rab')
                    const autoUrl = program.link_rab_detail
                    const allFiles: { key: string; name: string; url: string | null }[] = [
                      ...(autoUrl ? [{ key: '__rab_auto', name: `RAB · ${program.nama_pekerjaan}`, url: autoUrl }] : []),
                      ...files.map(d => ({ key: d.id, name: d.file_name || `RAB · ${program.nama_pekerjaan}`, url: d.file_url ?? null })),
                    ]
                    if (allFiles.length === 0) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="18" height="18" fill="none" stroke="var(--text-muted)" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>RAB · {program.nama_pekerjaan}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Belum ada file RAB</div>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <>
                        {allFiles.map(f => (
                          <div key={f.key} onClick={f.url ? () => openFile(f.url!, f.name) : undefined}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)', cursor: f.url ? 'pointer' : 'default' }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: f.url ? 'rgba(217,119,6,0.1)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="18" height="18" fill="none" stroke={f.url ? '#D97706' : 'var(--text-muted)'} strokeWidth="1.75" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: f.url ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                            </div>
                            {f.url && <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>}
                          </div>
                        ))}
                      </>
                    )
                  })()}
                  {/* Kontrak — flat rows */}
                  {(() => {
                    const allFiles = programDocs.filter(d => d.folder === 'kontrak')
                    if (allFiles.length === 0) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="18" height="18" fill="none" stroke="var(--text-muted)" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Kontrak · {program.nama_pekerjaan}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Belum ada kontrak</div>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <>
                        {allFiles.map(f => (
                          <div key={f.id} onClick={f.file_url ? () => openFile(f.file_url!, f.file_name) : undefined}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)', cursor: f.file_url ? 'pointer' : 'default' }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: f.file_url ? 'rgba(37,99,235,0.1)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="18" height="18" fill="none" stroke={f.file_url ? '#2563EB' : 'var(--text-muted)'} strokeWidth="1.75" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: f.file_url ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name || `Kontrak · ${program.nama_pekerjaan}`}</div>
                            </div>
                            {f.file_url && <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>}
                          </div>
                        ))}
                      </>
                    )
                  })()}
                  {/* Dokumentasi Foto → Galeri */}
                  {(() => {
                    const has = !!program.link_dokumentasi
                    return (
                      <div onClick={has ? () => onNavigate?.('galeri', program.id) : undefined} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)', cursor: has ? 'pointer' : 'default' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: has ? 'rgba(124,58,237,0.1)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="18" height="18" fill="none" stroke={has ? '#7C3AED' : 'var(--text-muted)'} strokeWidth="1.75" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: has ? 'var(--text-primary)' : 'var(--text-muted)', letterSpacing: '-0.01em' }}>Dokumentasi Foto · {program.nama_pekerjaan}</div>
                          {!has && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Belum ada dokumentasi</div>}
                        </div>
                        {has && <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>}
                      </div>
                    )
                  })()}
                  {/* Bukti Transaksi — program_documents + transactions */}
                  {(() => {
                    const txDocs = programDocs.filter(d => d.folder === 'bukti_transaksi')
                    const has = txDocs.length > 0 || transactions.length > 0
                    return (
                      <div onClick={has ? () => setBuktiExpanded(true) : undefined} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)', cursor: has ? 'pointer' : 'default' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: has ? 'rgba(5,150,105,0.1)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="18" height="18" fill="none" stroke={has ? '#059669' : 'var(--text-muted)'} strokeWidth="1.75" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: has ? 'var(--text-primary)' : 'var(--text-muted)', letterSpacing: '-0.01em' }}>Bukti Transaksi · {program.nama_pekerjaan}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{has ? `${txDocs.length + transactions.length} file` : 'Belum ada bukti transaksi'}</div>
                        </div>
                        {has && <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>}
                      </div>
                    )
                  })()}
                </div>
              </>
            ) : (
              <>
                {(() => {
                  const txDocs = programDocs.filter(d => d.folder === 'bukti_transaksi')
                  const totalCount = txDocs.length + transactions.length
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <button onClick={() => setBuktiExpanded(false)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px 6px 8px', borderRadius: 8, border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                          Kembali
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Bukti Transaksi</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalCount} file</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '130px' : '148px'}, 1fr))`, gap: 10 }}>
                        {txDocs.map(doc => (
                          <div
                            key={doc.id}
                            onClick={doc.file_url ? () => openFile(doc.file_url!, doc.file_name) : undefined}
                            style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 12px', borderRadius: 12, backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)', cursor: doc.file_url ? 'pointer' : 'default', minHeight: 110 }}
                          >
                            <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="18" height="18" fill="none" stroke="#059669" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </div>
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, flex: 1 }}>
                              {doc.file_name}
                            </div>
                            {doc.subfolder && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{doc.subfolder}</div>
                            )}
                          </div>
                        ))}
                        {transactions.map((tx, i) => (
                          <div
                            key={tx.id}
                            onClick={() => openFile(tx.link_bukti!, tx.deskripsi || `Transaksi ${i + 1}`)}
                            style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 12px', borderRadius: 12, backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)', cursor: 'pointer', minHeight: 110 }}
                          >
                            <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: 'rgba(217,119,6,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="18" height="18" fill="none" stroke="#D97706" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            </div>
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, flex: 1 }}>
                              {tx.deskripsi || `Transaksi ${i + 1}`}
                            </div>
                            <div>
                              {tx.tanggal && <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{formatTanggal(tx.tanggal)}</div>}
                              {tx.nominal && <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{formatRupiah(tx.nominal)}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}
              </>
            )}
          </div>
        )}

        {activeTab === 'Sub Pekerjaan' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Sub Pekerjaan <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({subPrograms.length})</span>
              </h3>
              {isAdmin && (
                <button
                  onClick={() => setAddingSubProgram(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 13px', borderRadius: 8,
                    border: 'none', backgroundColor: 'var(--blue)',
                    color: '#fff', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Tambah
                </button>
              )}
            </div>
            {subPrograms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 13, marginBottom: 8 }}>Belum ada sub pekerjaan</div>
                {isAdmin && (
                  <div style={{ fontSize: 12 }}>Klik <strong>Tambah</strong> untuk menambahkan item progress pertama</div>
                )}
              </div>
            ) : isNarrow ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {subPrograms.map((sp, i) => (
                  <div key={sp.id} style={{
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    backgroundColor: 'var(--card)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: 22, height: 22, borderRadius: 6,
                            backgroundColor: 'var(--blue)', color: '#fff',
                            fontSize: 11, fontWeight: 700, flexShrink: 0,
                          }}>{i + 1}</span>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                            {sp.nama_gedung}
                          </div>
                        </div>
                        {sp.vendor && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sp.vendor}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                          fontSize: 10.5, fontWeight: 700,
                          backgroundColor: STATUS_BG[sp.status] || 'var(--border-subtle)',
                          color: STATUS_COLORS[sp.status] || 'var(--text-secondary)',
                        }}>
                          {sp.status}
                        </span>
                        {sp.link_dokumentasi && (
                          <a
                            href={sp.link_dokumentasi}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 10.5, color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500,
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                            }}
                          >
                            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                            Folder
                          </a>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                      <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(sp.progress_percent || 0, 100)}%`, height: '100%', backgroundColor: STATUS_COLORS[sp.status] || 'var(--blue)', borderRadius: 10 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[sp.status] || 'var(--blue)', minWidth: 28 }}>
                        {sp.progress_percent || 0}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isAdmin ? 8 : 0 }}>
                      <div>
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Anggaran</div>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(sp.total_anggaran || 0)}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Realisasi</div>
                        <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(sp.realisasi_terkini || 0)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Sisa</div>
                        <div style={{ fontSize: 12, color: '#D97706', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(sp.sisa_anggaran || 0)}</div>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setEditingSubProgram(sp)}
                        style={{
                          background: 'none', border: '1px solid var(--border)', borderRadius: 7,
                          padding: '5px 12px', cursor: 'pointer', color: 'var(--text-secondary)',
                          fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead>
                    <tr>
                      {['No', 'Nama Gedung', 'Vendor', 'Progress', 'Anggaran', 'Realisasi', 'Sisa', 'Status', 'Dokumentasi', ''].map(h => (
                        <th
                          key={h}
                          style={{
                            padding: '10px 14px',
                            textAlign: 'left',
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            borderBottom: '1px solid var(--border-subtle)',
                            backgroundColor: 'var(--surface-raised)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subPrograms.map((sp, i) => (
                      <tr
                        key={sp.id}
                        style={{ borderBottom: i < subPrograms.length - 1 ? '1px solid var(--surface-min)' : 'none', backgroundColor: 'var(--card)', transition: 'background 0.1s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--surface-min)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--card)' }}
                      >
                        <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{sp.nama_gedung}</td>
                        <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{sp.vendor || '-'}</td>
                        <td style={{ padding: '11px 14px', minWidth: 120 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 10, overflow: 'hidden', minWidth: 40 }}>
                              <div
                                style={{
                                  width: `${Math.min(sp.progress_percent || 0, 100)}%`,
                                  height: '100%',
                                  backgroundColor: STATUS_COLORS[sp.status] || 'var(--blue)',
                                  borderRadius: 10,
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: STATUS_COLORS[sp.status] || 'var(--blue)', minWidth: 32 }}>{sp.progress_percent || 0}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {formatRupiah(sp.total_anggaran || 0)}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#059669', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {formatRupiah(sp.realisasi_terkini || 0)}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#D97706', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {formatRupiah(sp.sisa_anggaran || 0)}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 9px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              backgroundColor: STATUS_BG[sp.status] || 'var(--border-subtle)',
                              color: STATUS_COLORS[sp.status] || 'var(--text-secondary)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {sp.status}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {sp.link_dokumentasi ? (
                            <a
                              href={sp.link_dokumentasi}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                backgroundColor: 'var(--bg)',
                                color: 'var(--text-secondary)',
                                padding: '5px 10px',
                                borderRadius: 7,
                                fontSize: 11,
                                fontWeight: 500,
                                textDecoration: 'none',
                                border: '1px solid var(--border-subtle)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                              Folder
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                            <button
                              onClick={() => setEditingSubProgram(sp)}
                              style={{
                                background: 'none',
                                border: '1px solid var(--border)',
                                borderRadius: 7,
                                padding: '5px 10px',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                fontSize: 12,
                                fontWeight: 600,
                                transition: 'all 0.12s',
                              }}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--blue)'
                                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--blue)'
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showUpdateModal && program && (
        <UpdateProgressModal
          program={program}
          onClose={() => setShowUpdateModal(false)}
          onUpdated={() => {
            setShowUpdateModal(false)
            load()
          }}
        />
      )}

      {editingSubProgram && (
        <UpdateSubPekerjaanModal
          subProgram={editingSubProgram}
          onClose={() => setEditingSubProgram(null)}
          onSuccess={() => {
            invalidateCache('sub_programs', 'programs')
            setEditingSubProgram(null)
            load()
          }}
        />
      )}

      {addingSubProgram && program && (
        <AddSubPekerjaanModal
          programId={program.id}
          onClose={() => setAddingSubProgram(false)}
          onSuccess={() => {
            invalidateCache('sub_programs', 'programs')
            setAddingSubProgram(false)
            load()
          }}
        />
      )}

      {showEditCatatan && program && (
        <EditCatatanPekerjaanModal
          programId={program.id}
          currentNotes={program.isu_utama || ''}
          onClose={() => setShowEditCatatan(false)}
          onSuccess={() => {
            invalidateCache('programs')
            setShowEditCatatan(false)
            load()
          }}
        />
      )}

      {showEditProgram && program && (
        <EditProgramModal
          program={program}
          onClose={() => setShowEditProgram(false)}
          onSuccess={() => {
            invalidateCache('programs', 'sub_programs')
            setShowEditProgram(false)
            load()
          }}
        />
      )}

      {pdfViewer && (
        <PdfViewerModal url={pdfViewer.url} name={pdfViewer.name} onClose={() => setPdfViewer(null)} />
      )}
    </div>
  )
}
