import { useEffect, useState, useRef } from 'react'
import {
  SubProgram,
  Program,
  Transaction,
  ProgramDocument,
  Documentation,
  invalidateCache,
  fetchPrograms,
  fetchSubPrograms,
  fetchProgramDocuments,
  fetchTransactions,
  fetchDocumentation,
} from '../lib/supabase'
import { STATUS_COLORS, STATUS_BG, formatRupiah, formatTanggal, getFileEmbedUrl, getDriveThumbnailUrl } from '../lib/data'
import { adminInsert, adminDelete, adminUpdate } from '../lib/adminApi'
import PdfViewerModal from './PdfViewerModal'
import { useWindowWidth } from '../lib/useWindowWidth'
import UpdateProgressModal from './UpdateProgressModal'
import UpdateSubPekerjaanModal from './UpdateSubPekerjaanModal'
import AddSubPekerjaanModal from './AddSubPekerjaanModal'
import EditCatatanPekerjaanModal from './EditCatatanPekerjaanModal'
import EditProgramModal from './EditProgramModal'
import HasilFormModal from './HasilFormModal'
import HasilRingkasan from './HasilRingkasan'
import HasilRincianCard from './HasilRincianCard'
import { deriveProgramTotals, deriveNilaiAset } from '../lib/deriveTotals'

interface PekerjaanDetailProps {
  programId: string
  isAdmin: boolean
  role?: 'pbb' | 'maf' | null
  onBack: () => void
  onNavigate?: (page: string, programId?: string, category?: string) => void
  /** true when rendered inside a modal/bottom-sheet: hides the back button & edge-swipe (the shell owns closing) */
  embedded?: boolean
}

type Tab = 'Ringkasan' | 'Detail Realisasi' | 'Dokumen' | 'Sub Pekerjaan'

export default function PekerjaanDetail({ programId, isAdmin, role, onBack, onNavigate, embedded = false }: PekerjaanDetailProps) {
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
  const [showHasilForm, setShowHasilForm] = useState(false)
  const [hasilDismissed, setHasilDismissed] = useState(false)
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [editingSubProgram, setEditingSubProgram] = useState<SubProgram | null>(null)
  const [addingSubProgram, setAddingSubProgram] = useState(false)
  const [buktiExpanded, setBuktiExpanded] = useState(false)
  // Inline document management (replaces the removed Dokumen page).
  const [docForm, setDocForm] = useState<{ folder: 'rab' | 'kontrak' | 'bukti_transaksi'; subfolder: string | null } | null>(null)
  const [docName, setDocName] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [docSaving, setDocSaving] = useState(false)
  const [deletingDocIds, setDeletingDocIds] = useState<Set<string>>(new Set())
  const [galleryDocs, setGalleryDocs] = useState<Documentation[]>([])
  const [showManageDocs, setShowManageDocs] = useState(false)
  const [savingDocId, setSavingDocId] = useState<string | null>(null)
  const swipeTouchStartX = useRef<number | null>(null)
  const swipeTouchStartY = useRef<number | null>(null)
  const tabContentRef = useRef<HTMLDivElement>(null)
  const [tabMinHeight, setTabMinHeight] = useState(0)
  const [tabTransition, setTabTransition] = useState(false)

  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab) return
    const h = tabContentRef.current?.scrollHeight ?? 0
    if (h > 0) {
      setTabTransition(false)
      setTabMinHeight(h)
    }
    setActiveTab(tab)
  }

  useEffect(() => {
    if (tabMinHeight === 0) return
    const raf = requestAnimationFrame(() => {
      setTabTransition(true)
      setTabMinHeight(0)
    })
    return () => cancelAnimationFrame(raf)
  }, [activeTab])

  const openFile = (url: string, name: string) => {
    const embedUrl = getFileEmbedUrl(url)
    if (embedUrl) setPdfViewer({ url: embedUrl, name })
    else window.open(url, '_blank')
  }

  const load = async () => {
    setLoading(true)
    // Read from the shared in-memory cache (warmed by prefetchAll on login) and
    // filter client-side, instead of firing fresh per-program network queries on
    // every open. When the cache is warm this resolves in a microtask — the page
    // renders instantly with no network buffering. Admin write paths call
    // invalidateCache(...) before load(), so post-save reloads still fetch fresh.
    const [pRes, sRes, pdRes, tRes, docRes] = await Promise.all([
      fetchPrograms(),
      fetchSubPrograms(),
      fetchProgramDocuments(),
      fetchTransactions(),
      fetchDocumentation(),
    ])
    const prog = (pRes.data as Program[] | null)?.find(p => p.id === programId) ?? null
    if (prog) {
      setProgram(prog)
      // Transactions with a bukti link for this program (cache is already sorted tanggal desc).
      setTransactions(
        ((tRes.data as Transaction[] | null) ?? []).filter(
          t => t.nama_pekerjaan === prog.nama_pekerjaan && t.link_bukti,
        ),
      )
    } else {
      setProgram(null)
    }
    if (sRes.data) setSubPrograms((sRes.data as SubProgram[]).filter(s => s.program_id === programId))
    if (pdRes.data) setProgramDocs((pdRes.data as ProgramDocument[]).filter(d => d.program_id === programId))
    if (docRes.data) setGalleryDocs((docRes.data as Documentation[]).filter(d => d.program_id === programId && d.tipe_file === 'foto'))
    setLoading(false)
  }

  useEffect(() => { load() }, [programId])

  const handleAddDoc = async () => {
    if (!docForm || !docName.trim() || docSaving) return
    if (docForm.folder === 'bukti_transaksi' && !docForm.subfolder) return
    setDocSaving(true)
    await adminInsert('program_documents', {
      program_id: programId,
      folder: docForm.folder,
      subfolder: docForm.subfolder,
      file_name: docName.trim(),
      file_url: docUrl.trim() || null,
    })
    setDocName(''); setDocUrl(''); setDocForm(null)
    invalidateCache()
    await load()
    setDocSaving(false)
  }

  const handleDeleteDoc = async (doc: ProgramDocument) => {
    if (!confirm(`Hapus "${doc.file_name}"?`)) return
    setDeletingDocIds(prev => new Set(prev).add(doc.id))
    await adminDelete('program_documents', doc.id)
    setProgramDocs(prev => prev.filter(d => d.id !== doc.id))
    invalidateCache()
    setDeletingDocIds(prev => { const s = new Set(prev); s.delete(doc.id); return s })
  }

  // Admin-only trash button appended to a program_documents row.
  const renderDocDelete = (doc: ProgramDocument) => {
    if (!isAdmin) return null
    const deleting = deletingDocIds.has(doc.id)
    return (
      <button
        onClick={e => { e.stopPropagation(); handleDeleteDoc(doc) }}
        disabled={deleting}
        aria-label="Hapus dokumen"
        style={{ border: '1px solid rgba(224,62,62,0.25)', backgroundColor: 'rgba(224,62,62,0.08)', color: '#E03E3E', width: 30, height: 30, borderRadius: 8, cursor: deleting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: deleting ? 0.5 : 1, fontFamily: 'inherit', padding: 0 }}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    )
  }

  // Admin-only "+ Tambah" affordance: collapsed button, or the inline add form.
  const renderDocAdd = (folder: 'rab' | 'kontrak' | 'bukti_transaksi', accent: string, label: string) => {
    if (!isAdmin) return null
    const open = docForm?.folder === folder
    if (!open) {
      return (
        <button
          onClick={() => { setDocForm({ folder, subfolder: folder === 'bukti_transaksi' ? 'invoice' : null }); setDocName(''); setDocUrl('') }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 12, border: '1px dashed var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tambah {label}
        </button>
      )
    }
    const subs = [{ id: 'invoice', label: 'Invoice' }, { id: 'pembayaran', label: 'Pembayaran' }, { id: 'struk', label: 'Struk' }]
    const canSave = !!docName.trim() && !docSaving
    const inputSt: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 16, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', backgroundColor: 'var(--surface-raised)' }
    return (
      <div style={{ border: `1px solid ${accent}55`, borderRadius: 12, backgroundColor: 'var(--card)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>Tambah {label}</div>
        {folder === 'bukti_transaksi' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {subs.map(s => {
              const active = docForm?.subfolder === s.id
              return (
                <button key={s.id} onClick={() => setDocForm(prev => prev ? { ...prev, subfolder: s.id } : prev)}
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: active ? `1px solid ${accent}` : '1px solid var(--border-subtle)', backgroundColor: active ? `${accent}18` : 'transparent', color: active ? accent : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {s.label}
                </button>
              )
            })}
          </div>
        )}
        <input value={docName} onChange={e => setDocName(e.target.value)} placeholder="Nama dokumen" style={inputSt} />
        <input value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="Link / URL file (Google Drive, dll.)" onKeyDown={e => e.key === 'Enter' && handleAddDoc()} style={inputSt} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleAddDoc} disabled={!canSave}
            style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', backgroundColor: canSave ? accent : 'var(--border)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: canSave ? 'pointer' : 'default', fontFamily: 'inherit', opacity: docSaving ? 0.6 : 1 }}>
            {docSaving ? 'Menyimpan…' : 'Simpan'}
          </button>
          <button onClick={() => { setDocForm(null); setDocName(''); setDocUrl('') }}
            style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Batal
          </button>
        </div>
      </div>
    )
  }

  // Soft-mandatory: saat pekerjaan berstatus Selesai tapi data hasil belum
  // diisi, admin langsung diminta melengkapinya (baik setelah flip status via
  // modal maupun saat membuka pekerjaan Selesai lama yang belum di-backfill).
  // Sekali "Nanti Saja" ditekan, tidak muncul lagi selama view ini.
  useEffect(() => {
    if (isAdmin && program && program.status === 'Selesai' && !program.hasil_filled_at && !hasilDismissed) {
      setShowHasilForm(true)
    }
  }, [isAdmin, program?.status, program?.hasil_filled_at, hasilDismissed])

  const hasRincian = (program?.hasil_rincian?.length ?? 0) > 0
  const tabs: Tab[] = [
    'Ringkasan',
    ...(hasRincian || isAdmin ? ['Detail Realisasi' as Tab] : []),
    ...(subPrograms.length > 0 ? ['Sub Pekerjaan' as Tab] : []),
    'Dokumen',
  ]

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

  const derived = deriveProgramTotals(program, subPrograms.filter(s => s.program_id === program.id))
  const pct = derived.progress_percent
  const nilaiInfo = deriveNilaiAset(program)
  const statusColor = STATUS_COLORS[program.status] || 'var(--blue)'
  const isSelesai = program.status === 'Selesai'
  // Selesai + Ringkasan renders the multi-card Hasil layout, so the tab wrapper
  // drops its own white card to avoid nested cards.
  const bareRingkasan = isSelesai && activeTab === 'Ringkasan'

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
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 7,
            padding: '8px 12px',
            fontSize: isMobile ? 11.5 : 12.5,
            color: program.isu_utama ? 'var(--text-secondary)' : 'var(--text-muted)',
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
              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--surface-raised)'
            }
          }}
          onMouseLeave={e => {
            if (isAdmin && program.isu_utama) {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--card)'
            }
          }}
        >
          {program.isu_utama ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {program.isu_utama.split('\n').filter(l => l.trim()).map((line, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--text-muted)', flexShrink: 0, marginTop: 5 }} />
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

      {/* Metric Cards — hidden for Selesai (HasilRingkasan shows Nilai/Anggaran/Efisiensi instead), hidden for MAF (no money) */}
      {program.status === 'Selesai' && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Total Anggaran', value: formatRupiah(derived.total_anggaran), color: 'var(--blue)' },
          { label: 'Realisasi Terkini', value: formatRupiah(derived.realisasi_terkini), color: '#059669' },
          { label: 'Sisa Anggaran', value: formatRupiah(derived.sisa_anggaran), color: '#D97706' },
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
      )}

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
            onClick={() => handleTabChange(tab)}
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
        ref={tabContentRef}
        style={{
          minHeight: tabMinHeight,
          transition: tabTransition ? 'min-height 0.32s ease' : 'none',
          ...(bareRingkasan ? {} : {
            backgroundColor: 'var(--card)',
            borderRadius: 14,
            border: '1px solid var(--border-subtle)',
            padding: isMobile ? '14px 14px' : '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          })
        }}
      >
        {activeTab === 'Ringkasan' && isSelesai && (
          <div>
            {nilaiInfo.mismatch && (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--card)', border: '1px solid rgba(102,0,0,0.28)', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#660000', lineHeight: 1.45 }}>
                  Nilai Aset manual (<b>{formatRupiah(nilaiInfo.stored ?? 0)}</b>) berbeda dari total rincian (<b>{formatRupiah(nilaiInfo.derived)}</b>). Perbarui salah satunya via <b>Edit</b> agar sinkron.
                </div>
              </div>
            )}
            <HasilRingkasan program={program} isMobile={isMobile} isAdmin={isAdmin} onNavigateGaleri={() => onNavigate?.('galeri', program.id)} />
            <FeaturedDocsSection galleryDocs={galleryDocs} setGalleryDocs={setGalleryDocs} isAdmin={isAdmin} isMobile={isMobile} savingDocId={savingDocId} setSavingDocId={setSavingDocId} onManage={() => setShowManageDocs(true)} />
          </div>
        )}

        {activeTab === 'Ringkasan' && !isSelesai && (
          <div>
            {nilaiInfo.mismatch && (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--card)', border: '1px solid rgba(102,0,0,0.28)', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#660000', lineHeight: 1.45 }}>
                  Nilai Aset manual (<b>{formatRupiah(nilaiInfo.stored ?? 0)}</b>) berbeda dari total rincian (<b>{formatRupiah(nilaiInfo.derived)}</b>). Perbarui salah satunya via <b>Edit</b> agar sinkron.
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Ringkasan Pekerjaan</h3>
              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setShowEditProgram(true)}
                    style={{ backgroundColor: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--blue)' }}
                  >
                    Edit
                  </button>
                </div>
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
                    ['Progress', `${pct}%`],
                    ...( program.status === 'Selesai' ? [
                      ['Total Anggaran', formatRupiah(derived.total_anggaran)],
                      ['Realisasi Terkini', formatRupiah(derived.realisasi_terkini)],
                      ['Sisa Anggaran', formatRupiah(derived.sisa_anggaran)],
                    ] : []),
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
            <FeaturedDocsSection galleryDocs={galleryDocs} setGalleryDocs={setGalleryDocs} isAdmin={isAdmin} isMobile={isMobile} savingDocId={savingDocId} setSavingDocId={setSavingDocId} onManage={() => setShowManageDocs(true)} />
          </div>
        )}

        {activeTab === 'Detail Realisasi' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Detail Realisasi</h3>
              {isAdmin && (
                <button
                  onClick={() => setShowHasilForm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--card)', color: 'var(--blue)', border: '1px solid rgba(26,111,232,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                  {program.hasil_filled_at ? (isSelesai ? 'Edit Hasil' : 'Edit Realisasi') : (isSelesai ? 'Lengkapi Data Hasil' : 'Catat Realisasi')}
                </button>
              )}
            </div>
            {(program.hasil_rincian?.length ?? 0) > 0 ? (
              <HasilRincianCard program={program} isMobile={isMobile} defaultOpen />
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 13, marginBottom: 8 }}>Belum ada detail realisasi</div>
                {isAdmin && <div style={{ fontSize: 12 }}>Klik <strong>{isSelesai ? 'Lengkapi Data Hasil' : 'Catat Realisasi'}</strong> untuk merinci realisasi</div>}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Dokumen' && (
          <div>
            {!buktiExpanded ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Dokumen & Lampiran</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* RAB — flat rows, satu baris per file */}
                  {(() => {
                    const files = programDocs.filter(d => d.folder === 'rab')
                    const autoUrl = program.link_rab_detail
                    const allFiles: { key: string; name: string; url: string | null; doc?: ProgramDocument }[] = [
                      ...(autoUrl ? [{ key: '__rab_auto', name: `RAB · ${program.nama_pekerjaan}`, url: autoUrl }] : []),
                      ...files.map(d => ({ key: d.id, name: d.file_name || `RAB · ${program.nama_pekerjaan}`, url: d.file_url ?? null, doc: d })),
                    ]
                    return (
                      <>
                        {allFiles.length === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="18" height="18" fill="none" stroke="var(--text-muted)" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>RAB · {program.nama_pekerjaan}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Belum ada file RAB</div>
                            </div>
                          </div>
                        ) : allFiles.map(f => (
                          <div key={f.key} onClick={f.url ? () => openFile(f.url!, f.name) : undefined}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)', cursor: f.url ? 'pointer' : 'default' }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: f.url ? 'rgba(217,119,6,0.1)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="18" height="18" fill="none" stroke={f.url ? '#D97706' : 'var(--text-muted)'} strokeWidth="1.75" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: f.url ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                            </div>
                            {f.url && <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>}
                            {f.doc && renderDocDelete(f.doc)}
                          </div>
                        ))}
                        {renderDocAdd('rab', '#D97706', 'RAB')}
                      </>
                    )
                  })()}
                  {/* Kontrak — flat rows */}
                  {(() => {
                    const allFiles = programDocs.filter(d => d.folder === 'kontrak')
                    return (
                      <>
                        {allFiles.length === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="18" height="18" fill="none" stroke="var(--text-muted)" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Kontrak · {program.nama_pekerjaan}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Belum ada kontrak</div>
                            </div>
                          </div>
                        ) : allFiles.map(f => (
                          <div key={f.id} onClick={f.file_url ? () => openFile(f.file_url!, f.file_name) : undefined}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)', cursor: f.file_url ? 'pointer' : 'default' }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: f.file_url ? 'rgba(37,99,235,0.1)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="18" height="18" fill="none" stroke={f.file_url ? '#2563EB' : 'var(--text-muted)'} strokeWidth="1.75" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: f.file_url ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name || `Kontrak · ${program.nama_pekerjaan}`}</div>
                            </div>
                            {f.file_url && <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>}
                            {renderDocDelete(f)}
                          </div>
                        ))}
                        {renderDocAdd('kontrak', '#2563EB', 'Kontrak')}
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
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              {doc.subfolder
                                ? <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{doc.subfolder}</span>
                                : <span />}
                              {renderDocDelete(doc)}
                            </div>
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
                              {tx.nominal && (role !== 'maf' || program.status !== 'Perencanaan') && <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{formatRupiah(tx.nominal)}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {isAdmin && <div style={{ marginTop: 12 }}>{renderDocAdd('bukti_transaksi', '#059669', 'Bukti Transaksi')}</div>}
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
                    {/* Name row */}
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
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{sp.vendor}</div>
                    )}
                    {/* Progres % | Status badge row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: sp.vendor ? 0 : 6 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_COLORS[sp.status] || 'var(--blue)', fontVariantNumeric: 'tabular-nums' }}>
                        Progres {sp.progress_percent || 0}%
                      </span>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                        fontSize: 10.5, fontWeight: 700,
                        backgroundColor: STATUS_BG[sp.status] || 'var(--border-subtle)',
                        color: STATUS_COLORS[sp.status] || 'var(--text-secondary)',
                      }}>
                        {sp.status}
                      </span>
                    </div>
                    {(role !== 'maf' || program.status !== 'Perencanaan') && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, marginBottom: isAdmin ? 8 : 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Anggaran</div>
                        <div style={{ fontSize: 12, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(sp.total_anggaran || 0)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Realisasi</div>
                        <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(sp.realisasi_terkini || 0)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Sisa</div>
                        <div style={{ fontSize: 12, color: '#D97706', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(sp.sisa_anggaran || 0)}</div>
                      </div>
                    </div>
                    )}
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
            invalidateCache('programs', 'sub_programs')
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

      {showHasilForm && program && (
        <HasilFormModal
          program={program}
          onClose={() => { setShowHasilForm(false); setHasilDismissed(true) }}
          onSuccess={() => {
            invalidateCache('programs')
            setShowHasilForm(false)
            load()
          }}
        />
      )}

      {pdfViewer && (
        <PdfViewerModal url={pdfViewer.url} name={pdfViewer.name} onClose={() => setPdfViewer(null)} />
      )}

      {showManageDocs && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setShowManageDocs(false)}>
          <div style={{ width: '100%', maxWidth: 600, background: 'var(--card)', borderRadius: '16px 16px 0 0', padding: '20px 16px 32px', maxHeight: '82dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Kelola Foto Ringkasan</h3>
              <button onClick={() => setShowManageDocs(false)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Ketuk foto untuk tampilkan/sembunyikan di halaman Ringkasan.</div>
            {galleryDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 12px', color: 'var(--text-muted)', fontSize: 13 }}>Belum ada foto di Galeri untuk pekerjaan ini.</div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {galleryDocs.map(doc => {
                    const thumb = getDriveThumbnailUrl(doc.link_foto, 'w400')
                    const on = !!doc.tampil_ringkasan
                    const isSaving = savingDocId === doc.id
                    return (
                      <div key={doc.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: on ? '2px solid var(--blue)' : '2px solid var(--border)', background: 'var(--surface-2)', cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.65 : 1, transition: 'border-color 0.15s, opacity 0.15s' }} onClick={async () => {
                          if (isSaving) return
                          const next = !on
                          setSavingDocId(doc.id)
                          setGalleryDocs(prev => prev.map(d => d.id === doc.id ? { ...d, tampil_ringkasan: next } : d))
                          const { error } = await adminUpdate('documentation', { tampil_ringkasan: next }, doc.id)
                          if (error) setGalleryDocs(prev => prev.map(d => d.id === doc.id ? { ...d, tampil_ringkasan: on } : d))
                          setSavingDocId(null)
                        }}>
                        <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
                          {thumb
                            ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="24" height="24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
                          }
                        </div>
                        {(doc.fase || doc.caption) && (
                          <div style={{ padding: '5px 8px 6px', fontSize: 10.5, color: 'var(--text-secondary)', fontWeight: 500, background: 'var(--card)', lineHeight: 1.4 }}>
                            {doc.fase || doc.caption}
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 6, background: on ? 'var(--blue)' : 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                          {on && <svg width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface FeaturedDocsSectionProps {
  galleryDocs: Documentation[]
  setGalleryDocs: React.Dispatch<React.SetStateAction<Documentation[]>>
  isAdmin: boolean
  isMobile: boolean
  savingDocId: string | null
  setSavingDocId: (id: string | null) => void
  onManage: () => void
}

function FeaturedDocsSection({ galleryDocs, isAdmin, isMobile, onManage }: FeaturedDocsSectionProps) {
  const featuredDocs = galleryDocs.filter(d => d.tampil_ringkasan)
  if (featuredDocs.length === 0 && !isAdmin) return null
  return (
    <div style={{ marginTop: 16, background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: isMobile ? '14px 15px' : '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: featuredDocs.length > 0 ? 12 : 0 }}>
        <h3 style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>Dokumentasi</h3>
        {isAdmin && (
          <button
            onClick={onManage}
            style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--card)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, flexShrink: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.background = 'var(--blue)'; b.style.color = '#fff'; b.style.borderColor = 'var(--blue)' }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.background = 'var(--card)'; b.style.color = 'var(--text-secondary)'; b.style.borderColor = 'var(--border-subtle)' }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            Kelola Foto
          </button>
        )}
      </div>
      {featuredDocs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '18px 12px', color: 'var(--text-muted)', fontSize: 12.5 }}>
          Belum ada foto yang ditampilkan di sini.
          {isAdmin && <div style={{ marginTop: 4, fontSize: 12 }}>Klik <strong>Kelola Foto</strong> untuk memilih foto.</div>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 8 }}>
          {featuredDocs.map(doc => {
            const thumb = getDriveThumbnailUrl(doc.link_foto, 'w800')
            return (
              <div key={doc.id} style={{ borderRadius: 10, overflow: 'hidden', position: 'relative', aspectRatio: '4/3', background: 'var(--surface-2)' }}>
                {thumb
                  ? <img src={thumb} alt={doc.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="28" height="28" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
                }
                {(doc.fase || doc.caption) && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '18px 8px 7px', fontSize: 10.5, fontWeight: 600, color: '#fff', lineHeight: 1.35 }}>
                    {doc.fase || doc.caption}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
