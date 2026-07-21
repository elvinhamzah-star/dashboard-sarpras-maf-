import { useEffect, useState, useCallback } from 'react'
import {
  fetchPrograms, fetchProgramDocuments, fetchTransactions, fetchDocumentationProgramIds,
  Program, ProgramDocument, Transaction, DocCategory, hasMafCredentials,
} from '../lib/supabase'
import { adminInsert, adminDelete } from '../lib/adminApi'
import { STATUS_COLORS, getFileEmbedUrl, formatRupiah, formatTanggal } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import { useBackHandler } from '../lib/backNav'
import PdfViewerModal from './PdfViewerModal'

type Folder = 'rab' | 'kontrak' | 'bukti_transaksi'
type Sub = 'invoice' | 'pembayaran' | 'struk'

interface Props {
  isAdmin: boolean
  role: 'pbb' | 'maf' | null
  initialProgramId?: string | null
  initialCategory?: DocCategory | null
  onExit?: () => void
  onNavigate?: (page: string, programId?: string) => void
}

const FOLDER_META: Record<Folder, { label: string; color: string; bgColor: string; desc: string }> = {
  rab:             { label: 'RAB',             color: '#D97706', bgColor: 'rgba(217,119,6,0.1)',   desc: 'RAB Vendor & RAB Internal' },
  kontrak:         { label: 'Kontrak',         color: '#2563EB', bgColor: 'rgba(37,99,235,0.1)',   desc: 'SPK, surat kontrak & legalitas' },
  bukti_transaksi: { label: 'Bukti Transaksi', color: '#059669', bgColor: 'rgba(5,150,105,0.1)',   desc: 'Invoice & bukti pembayaran' },
}

const SUB_META: Record<Sub, { label: string; color: string; bgColor: string; desc: string }> = {
  invoice:    { label: 'Invoice Vendor',   color: '#7C3AED', bgColor: 'rgba(124,58,237,0.1)', desc: 'Tagihan dari pihak ketiga' },
  pembayaran: { label: 'Bukti Pembayaran', color: '#059669', bgColor: 'rgba(5,150,105,0.1)',  desc: 'Konfirmasi transfer & kwitansi' },
  struk:      { label: 'Struk / Nota',     color: '#D97706', bgColor: 'rgba(217,119,6,0.1)',  desc: 'Kwitansi, nota, & bukti fisik' },
}

function FolderIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
    </svg>
  )
}

function FileDocIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function ReceiptIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="2"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

export default function Dokumen({ isAdmin, role, initialProgramId, onExit, onNavigate }: Props) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [docs, setDocs] = useState<ProgramDocument[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [docPhotoProgramIds, setDocPhotoProgramIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Navigation
  const [level, setLevel] = useState<0 | 1 | 2 | 3>(0)
  const [selProgramId, setSelProgramId] = useState<string | null>(initialProgramId ?? null)
  const [selFolder, setSelFolder] = useState<Folder | null>(null)
  const [selSub, setSelSub] = useState<Sub | null>(null)

  // PDF viewer
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null)

  // Add form
  const [addForm, setAddForm] = useState<{ programId: string; folder: Folder; subfolder: Sub | null } | null>(null)
  const [addName, setAddName] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const width = useWindowWidth()
  const isMobile = width < 768

  useEffect(() => {
    if (initialProgramId) {
      setSelProgramId(initialProgramId)
      setLevel(1)
    }
  }, [initialProgramId])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [pRes, dRes, tRes, docPhotoRes] = await Promise.all([
      fetchPrograms(),
      fetchProgramDocuments(),
      fetchTransactions(),
      fetchDocumentationProgramIds(),
    ])
    setDocPhotoProgramIds(new Set((docPhotoRes.data ?? []).map((r: { program_id: string }) => r.program_id)))
    if (pRes.data) {
      const hasMaf = hasMafCredentials()
      setPrograms(
        role === 'maf' && hasMaf
          ? pRes.data.filter((p: Program) => p.id !== 'P-024')
          : pRes.data
      )
    }
    setDocs((dRes.data as ProgramDocument[] | null) ?? [])
    setTransactions(((tRes.data ?? []) as Transaction[]).filter(t => t.link_bukti))
    setLoading(false)
  }, [role])

  useEffect(() => { loadAll() }, [loadAll])

  const openFile = (url: string, name: string) => {
    const embedUrl = getFileEmbedUrl(url)
    if (embedUrl) setPdfViewer({ url: embedUrl, name })
    else window.open(url, '_blank')
  }

  const getDocsFor = (programId: string, folder: Folder, subfolder: Sub | null = null) =>
    docs.filter(d =>
      d.program_id === programId &&
      d.folder === folder &&
      (subfolder === null ? !d.subfolder : d.subfolder === subfolder)
    )

  const getTxBukti = (programId: string): Transaction[] => {
    const program = programs.find(p => p.id === programId)
    if (!program) return []
    return transactions.filter(tx =>
      tx.nama_pekerjaan === program.nama_pekerjaan && tx.link_bukti
    )
  }

  const countTotal = (programId: string): number => {
    const p = programs.find(x => x.id === programId)
    const rabAuto = p?.link_rab_detail ? 1 : 0
    return rabAuto + docs.filter(d => d.program_id === programId).length + getTxBukti(programId).length
  }

  const handleAdd = async () => {
    if (!addForm || !addName.trim() || addLoading) return
    if (addForm.folder === 'bukti_transaksi' && !addForm.subfolder) return
    setAddLoading(true)
    await adminInsert('program_documents', {
      program_id: addForm.programId,
      folder: addForm.folder,
      subfolder: addForm.subfolder,
      file_name: addName.trim(),
      file_url: addUrl.trim() || null,
    })
    setAddName('')
    setAddUrl('')
    setAddForm(null)
    await loadAll()
    setAddLoading(false)
  }

  const handleDelete = async (doc: ProgramDocument) => {
    if (!confirm(`Hapus "${doc.file_name}"?`)) return
    setDeletingIds(prev => new Set(prev).add(doc.id))
    await adminDelete('program_documents', doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    setDeletingIds(prev => { const s = new Set(prev); s.delete(doc.id); return s })
  }

  const goLevel = (l: 0 | 1 | 2 | 3) => {
    setLevel(l)
    if (l < 1) setSelProgramId(null)
    if (l < 2) setSelFolder(null)
    if (l < 3) setSelSub(null)
    setAddForm(null)
    setAddName('')
    setAddUrl('')
  }

  // Drive the mobile top-bar ← arrow. Levels 2–3 step up one. Level 1: if we were
  // deep-linked here from a program detail (onExit set), back returns to that
  // detail instead of dropping to the Dokumen list; otherwise step up to level 0.
  // Level 0 (program list) is the page's top → null (top bar shows the ☰ menu).
  useBackHandler(
    level > 1
      ? () => goLevel((level - 1) as 0 | 1 | 2)
      : level === 1
        ? (onExit ?? (() => goLevel(0)))
        : null,
  )

  const selProgram = programs.find(p => p.id === selProgramId)

  const filtered = programs.filter(p =>
    !search ||
    p.nama_pekerjaan.toLowerCase().includes(search.toLowerCase()) ||
    p.program.toLowerCase().includes(search.toLowerCase())
  )

  // ─── SHARED STYLES ────────────────────────────────────────────────

  const CARD: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
    padding: isMobile ? '14px 13px 12px' : '18px 16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: isMobile ? 7 : 10,
    minHeight: isMobile ? 105 : 125,
    transition: 'border-color 0.12s',
  }

  const GRID: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '135px' : '210px'}, 1fr))`,
    gap: 10,
  }

  // ─── BREADCRUMB ───────────────────────────────────────────────────

  const renderBreadcrumb = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 18 }}>
      <span
        onClick={() => goLevel(0)}
        style={{ fontSize: 13, color: level > 0 ? 'var(--blue)' : 'var(--text-primary)', fontWeight: 600, cursor: level > 0 ? 'pointer' : 'default' }}
      >
        Dokumen
      </span>
      {level >= 1 && selProgram && (
        <>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/</span>
          <span
            onClick={() => level > 1 ? goLevel(1) : undefined}
            style={{
              fontSize: 13,
              color: level > 1 ? 'var(--blue)' : 'var(--text-primary)',
              fontWeight: 600,
              cursor: level > 1 ? 'pointer' : 'default',
              maxWidth: isMobile ? 150 : 560,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selProgram.nama_pekerjaan}
          </span>
        </>
      )}
      {level >= 2 && selFolder && (
        <>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/</span>
          <span
            onClick={() => level > 2 ? goLevel(2) : undefined}
            style={{ fontSize: 13, color: level > 2 ? 'var(--blue)' : 'var(--text-primary)', fontWeight: 600, cursor: level > 2 ? 'pointer' : 'default' }}
          >
            {FOLDER_META[selFolder].label}
          </span>
        </>
      )}
      {level >= 3 && selSub && (
        <>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
            {SUB_META[selSub].label}
          </span>
        </>
      )}
    </div>
  )

  // ─── BACK BUTTON ──────────────────────────────────────────────────

  // Hidden at ≤768px — the mobile top-bar ← arrow handles back there.
  const renderBack = (toLevel: 0 | 1 | 2) => width <= 768 ? null : (
    <button
      onClick={() => goLevel(toLevel)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        color: 'var(--text-secondary)', background: 'var(--card)',
        border: '1px solid var(--border-subtle)', borderRadius: 99,
        padding: '6px 14px 6px 8px', cursor: 'pointer',
        fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
        transition: 'all 0.15s', marginBottom: 14,
      }}
      onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#fff'; b.style.background = 'var(--blue)'; b.style.borderColor = 'var(--blue)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(255,255,255,0.2)' }}
      onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'var(--text-secondary)'; b.style.background = 'var(--card)'; b.style.borderColor = 'var(--border-subtle)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(0,0,0,0.06)' }}
    >
      <span className="bk-ic" style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}>
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </span>
      {toLevel === 0 ? 'Kembali ke Daftar' : 'Kembali'}
    </button>
  )

  // ─── ADD FORM ─────────────────────────────────────────────────────

  const renderAddForm = (folder: Folder, subfolder: Sub | null) => {
    const isBuktiTx = folder === 'bukti_transaksi'
    const isOpen = isBuktiTx
      ? !!(addForm && addForm.folder === folder)
      : !!(addForm && addForm.folder === folder && addForm.subfolder === subfolder)
    const label = isBuktiTx ? FOLDER_META.bukti_transaksi.label : (subfolder ? SUB_META[subfolder].label : FOLDER_META[folder].label)
    const selectedSub = addForm?.subfolder ?? null
    const canSave = !addLoading && !!addName.trim() && (!isBuktiTx || !!selectedSub)
    return (
      <div style={{ marginTop: 10 }}>
        {isOpen ? (
          <div style={{ padding: '13px 14px', backgroundColor: 'rgba(26,111,232,0.04)', border: '1.5px dashed rgba(26,111,232,0.25)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Tambah {label}
            </div>
            {isBuktiTx && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 7 }}>
                  Jenis Dokumen <span style={{ color: '#660000' }}>*</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['invoice', 'pembayaran', 'struk'] as Sub[]).map(s => {
                    const sm = SUB_META[s]
                    const sel = selectedSub === s
                    return (
                      <button
                        key={s}
                        onClick={() => setAddForm(prev => prev ? { ...prev, subfolder: s } : prev)}
                        style={{
                          padding: '5px 12px', borderRadius: 20,
                          border: `1.5px solid ${sel ? sm.color : 'var(--border)'}`,
                          backgroundColor: sel ? sm.bgColor : 'transparent',
                          color: sel ? sm.color : 'var(--text-muted)',
                          fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                        }}
                      >
                        {sm.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <input
              value={addName}
              onChange={e => setAddName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Nama file..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 8 }}
            />
            <input
              value={addUrl}
              onChange={e => setAddUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Link Google Drive (opsional)"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleAdd}
                disabled={!canSave}
                style={{ padding: '7px 16px', borderRadius: 7, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: canSave ? 1 : 0.6 }}
              >
                {addLoading ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                onClick={() => { setAddForm(null); setAddName(''); setAddUrl('') }}
                style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid var(--border-subtle)', backgroundColor: 'var(--card)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setAddForm({ programId: selProgramId!, folder, subfolder: isBuktiTx ? null : subfolder }); setAddName(''); setAddUrl('') }}
            style={{ width: '100%', padding: 10, borderRadius: 10, border: '1.5px dashed rgba(26,111,232,0.3)', backgroundColor: 'transparent', color: 'var(--blue)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + Tambah {label}
          </button>
        )}
      </div>
    )
  }

  // ─── FILE CARD ────────────────────────────────────────────────────

  const renderFileCard = (
    key: string,
    name: string,
    fileUrl: string | null | undefined,
    accentColor: string,
    accentBg: string,
    icon: React.ReactNode,
    onDelete?: () => void,
    isDeleting?: boolean,
    subtitle?: string,
    badge?: React.ReactNode,
  ) => (
    <div
      key={key}
      onClick={() => fileUrl && openFile(fileUrl, name)}
      style={{ ...CARD, cursor: fileUrl ? 'pointer' : 'default' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = accentColor + '55' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {badge}
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              disabled={isDeleting}
              style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border-subtle)', backgroundColor: 'var(--card)', color: '#660000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, lineHeight: 1, fontFamily: 'inherit', flexShrink: 0 }}
            >
              {isDeleting ? '…' : '×'}
            </button>
          )}
        </div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', flex: 1, lineHeight: 1.35 }}>{name}</div>
      {subtitle && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subtitle}</div>
      )}
      {fileUrl ? (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
          <ExternalLinkIcon />
          Buka file
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada file</div>
      )}
    </div>
  )

  // ─── LEVEL 0: Program list ─────────────────────────────────────────

  const renderLevel0 = () => (
    <>
      {!isMobile && (
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.03em' }}>
            Dokumen Pekerjaan
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Pilih pekerjaan untuk melihat dokumen</p>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 18 }}>
        <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="15" height="15" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari pekerjaan..."
          style={{ width: '100%', boxSizing: 'border-box', paddingTop: isMobile ? 7 : 9, paddingBottom: isMobile ? 7 : 9, paddingLeft: 34, paddingRight: 12, borderRadius: 9, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 13 }}>
            Tidak ada pekerjaan ditemukan
          </div>
        ) : filtered.map(p => {
          const total = countTotal(p.id)
          return (
            <div
              key={p.id}
              onClick={() => { setSelProgramId(p.id); setLevel(1) }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '11px 14px' : '14px 16px', background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 12, cursor: 'pointer', transition: 'border-color 0.12s, box-shadow 0.12s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(26,111,232,0.3)'; if (!isMobile) { el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)' } }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--border-subtle)'; el.style.boxShadow = 'none' }}
            >
              <div style={{ width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, borderRadius: 10, backgroundColor: 'rgba(26,111,232,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FolderIcon color="var(--blue)" size={isMobile ? 17 : 20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{p.id}</span>
                <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                  {p.nama_pekerjaan}
                </div>
                {!isMobile && p.vendor && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.vendor}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                {total > 0 ? (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', padding: '2px 8px', borderRadius: 99 }}>
                    {total} file
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kosong</span>
                )}
                {!isMobile && typeof p.progress_percent === 'number' && (
                  <div style={{ width: 64, height: 3, borderRadius: 99, backgroundColor: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${p.progress_percent}%`, height: '100%', borderRadius: 99, backgroundColor: STATUS_COLORS[p.status] || 'var(--blue)' }} />
                  </div>
                )}
                <ChevronRight />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )

  // ─── LEVEL 1: category list rows ──────────────────────────────────

  const renderLevel1 = () => {
    const p = selProgram!
    const folders: Folder[] = ['rab', 'kontrak', 'bukti_transaksi']

    const ROW: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: isMobile ? '14px 14px' : '16px 18px',
      background: 'var(--card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 12,
      transition: 'border-color 0.12s, box-shadow 0.12s',
    }

    return (
      <>
        {renderBack(0)}
        {renderBreadcrumb()}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {folders.map(f => {
            const meta = FOLDER_META[f]
            const count = f === 'bukti_transaksi'
              ? getDocsFor(p.id, f, 'invoice').length + getDocsFor(p.id, f, 'pembayaran').length + getDocsFor(p.id, f, 'struk').length + getTxBukti(p.id).length
              : getDocsFor(p.id, f).length + (f === 'rab' && p.link_rab_detail ? 1 : 0)
            const isEmpty = count === 0
            const disabled = isEmpty && !isAdmin
            return (
              <div
                key={f}
                onClick={disabled ? undefined : () => { setSelFolder(f); setLevel(2) }}
                style={{ ...ROW, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1 }}
                onMouseEnter={disabled ? undefined : e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = meta.color + '55'
                  if (!isMobile) el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'
                }}
                onMouseLeave={disabled ? undefined : e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = 'var(--border-subtle)'
                  el.style.boxShadow = 'none'
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: disabled ? 'rgba(0,0,0,0.04)' : meta.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {f === 'bukti_transaksi'
                    ? <ReceiptIcon color={disabled ? 'var(--text-muted)' : meta.color} size={22} />
                    : <FolderIcon color={disabled ? 'var(--text-muted)' : meta.color} size={22} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: disabled ? 'var(--text-muted)' : 'var(--text-primary)', marginBottom: 2 }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {disabled ? 'Belum ada dokumen' : meta.desc}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  {!disabled && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: meta.color, backgroundColor: meta.bgColor, padding: '2px 8px', borderRadius: 99 }}>
                      {count} file
                    </span>
                  )}
                  {!disabled && <ChevronRight />}
                </div>
              </div>
            )
          })}

          {/* Dokumentasi → Galeri */}
          {(() => {
            const hasPhotos = docPhotoProgramIds.has(p.id)
            const disabled = !hasPhotos && !isAdmin
            const color = '#7C3AED'
            const bgColor = 'rgba(124,58,237,0.1)'
            return (
              <div
                onClick={disabled ? undefined : () => onNavigate?.('galeri', p.id)}
                style={{ ...ROW, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1 }}
                onMouseEnter={disabled ? undefined : e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = color + '55'
                  if (!isMobile) el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'
                }}
                onMouseLeave={disabled ? undefined : e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = 'var(--border-subtle)'
                  el.style.boxShadow = 'none'
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: disabled ? 'rgba(0,0,0,0.04)' : bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width={22} height={22} fill="none" stroke={disabled ? 'var(--text-muted)' : color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: disabled ? 'var(--text-muted)' : 'var(--text-primary)', marginBottom: 2 }}>
                    Dokumentasi
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {disabled ? 'Belum ada foto' : 'Foto & video progress pekerjaan'}
                  </div>
                </div>
                {!disabled && (
                  <div style={{ flexShrink: 0 }}>
                    <ChevronRight />
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </>
    )
  }

  // ─── LEVEL 2: files or subfolders ─────────────────────────────────

  const renderLevel2 = () => {
    const p = selProgram!
    const f = selFolder!
    const meta = FOLDER_META[f]

    if (f === 'bukti_transaksi') {
      const invoiceDocs = getDocsFor(p.id, f, 'invoice')
      const pembayaranDocs = getDocsFor(p.id, f, 'pembayaran')
      const strukDocs = getDocsFor(p.id, f, 'struk')
      const txFiles = getTxBukti(p.id)
      const totalCount = invoiceDocs.length + pembayaranDocs.length + strukDocs.length + txFiles.length
      const isEmpty = totalCount === 0

      const renderTypeBadge = (sub: Sub) => {
        const sm = SUB_META[sub]
        return (
          <span style={{
            display: 'inline-block', padding: '2px 7px', borderRadius: 99,
            fontSize: 10, fontWeight: 700,
            backgroundColor: sm.bgColor, color: sm.color,
          }}>
            {sm.label}
          </span>
        )
      }

      return (
        <>
          {renderBack(1)}
          {renderBreadcrumb()}
          {isEmpty && !addForm ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13, border: '1.5px dashed var(--border-subtle)', borderRadius: 12, marginBottom: 12 }}>
              Belum ada bukti transaksi
            </div>
          ) : (
            <div style={{ ...GRID, marginBottom: 12 }}>
              {invoiceDocs.map(doc => renderFileCard(
                doc.id, doc.file_name, doc.file_url,
                SUB_META.invoice.color, SUB_META.invoice.bgColor,
                <ReceiptIcon color={SUB_META.invoice.color} />,
                isAdmin ? () => handleDelete(doc) : undefined,
                deletingIds.has(doc.id),
                undefined,
                renderTypeBadge('invoice'),
              ))}
              {pembayaranDocs.map(doc => renderFileCard(
                doc.id, doc.file_name, doc.file_url,
                SUB_META.pembayaran.color, SUB_META.pembayaran.bgColor,
                <ReceiptIcon color={SUB_META.pembayaran.color} />,
                isAdmin ? () => handleDelete(doc) : undefined,
                deletingIds.has(doc.id),
                undefined,
                renderTypeBadge('pembayaran'),
              ))}
              {txFiles.map(tx => renderFileCard(
                tx.id,
                tx.deskripsi || 'Bukti Pembayaran',
                tx.link_bukti ?? null,
                SUB_META.pembayaran.color, SUB_META.pembayaran.bgColor,
                <ReceiptIcon color={SUB_META.pembayaran.color} />,
                undefined, false,
                [tx.tanggal ? formatTanggal(tx.tanggal) : '', tx.nominal ? formatRupiah(tx.nominal) : ''].filter(Boolean).join(' · '),
                renderTypeBadge('pembayaran'),
              ))}
              {strukDocs.map(doc => renderFileCard(
                doc.id, doc.file_name, doc.file_url,
                SUB_META.struk.color, SUB_META.struk.bgColor,
                <ReceiptIcon color={SUB_META.struk.color} />,
                isAdmin ? () => handleDelete(doc) : undefined,
                deletingIds.has(doc.id),
                undefined,
                renderTypeBadge('struk'),
              ))}
            </div>
          )}
          {isAdmin && renderAddForm('bukti_transaksi', null)}
        </>
      )
    }

    // RAB or Kontrak — file grid
    const manualDocs = getDocsFor(p.id, f)
    const rabAuto = f === 'rab' && p.link_rab_detail ? p.link_rab_detail : null
    const isEmpty = manualDocs.length === 0 && !rabAuto

    return (
      <>
        {renderBack(1)}
        {renderBreadcrumb()}
        {isEmpty && !addForm ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13, border: '1.5px dashed var(--border-subtle)', borderRadius: 12, marginBottom: 12 }}>
            Belum ada {meta.label}
          </div>
        ) : (
          <div style={{ ...GRID, marginBottom: 12 }}>
            {rabAuto && renderFileCard(
              '__rab_auto',
              `RAB ${p.nama_pekerjaan}`,
              rabAuto,
              meta.color,
              meta.bgColor,
              <FileDocIcon color={meta.color} />,
            )}
            {manualDocs.map(doc => renderFileCard(
              doc.id,
              doc.file_name,
              doc.file_url,
              meta.color,
              meta.bgColor,
              <FileDocIcon color={meta.color} />,
              isAdmin ? () => handleDelete(doc) : undefined,
              deletingIds.has(doc.id),
            ))}
          </div>
        )}
        {isAdmin && renderAddForm(f, null)}
      </>
    )
  }

  // ─── LEVEL 3: files in subfolder ──────────────────────────────────

  const renderLevel3 = () => {
    const p = selProgram!
    const s = selSub!
    const smeta = SUB_META[s]

    const invoiceDocs = s === 'invoice' ? getDocsFor(p.id, 'bukti_transaksi', 'invoice') : []
    const txFiles = s === 'pembayaran' ? getTxBukti(p.id) : []
    const isEmpty = invoiceDocs.length === 0 && txFiles.length === 0

    return (
      <>
        {renderBack(2)}
        {renderBreadcrumb()}
        {isEmpty && !addForm ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 13, border: '1.5px dashed var(--border-subtle)', borderRadius: 12, marginBottom: 12 }}>
            Belum ada {smeta.label}
          </div>
        ) : (
          <div style={{ ...GRID, marginBottom: 12 }}>
            {s === 'invoice' && invoiceDocs.map(doc => renderFileCard(
              doc.id,
              doc.file_name,
              doc.file_url,
              smeta.color,
              smeta.bgColor,
              <ReceiptIcon color={smeta.color} />,
              isAdmin ? () => handleDelete(doc) : undefined,
              deletingIds.has(doc.id),
            ))}
            {s === 'pembayaran' && txFiles.map(tx => renderFileCard(
              tx.id,
              tx.deskripsi || 'Bukti Pembayaran',
              tx.link_bukti ?? null,
              smeta.color,
              smeta.bgColor,
              <ReceiptIcon color={smeta.color} />,
              undefined,
              false,
              [tx.tanggal ? formatTanggal(tx.tanggal) : '', tx.nominal ? formatRupiah(tx.nominal) : ''].filter(Boolean).join(' · '),
            ))}
          </div>
        )}
        {isAdmin && s === 'invoice' && renderAddForm('bukti_transaksi', 'invoice')}
      </>
    )
  }

  // ─── ROOT ─────────────────────────────────────────────────────────

  return (
    <div style={{ padding: isMobile ? '16px' : '28px 28px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 56, color: 'var(--text-muted)', fontSize: 13 }}>Memuat...</div>
      ) : (
        <>
          {level === 0 && renderLevel0()}
          {level === 1 && renderLevel1()}
          {level === 2 && renderLevel2()}
          {level === 3 && renderLevel3()}
        </>
      )}

      {pdfViewer && (
        <PdfViewerModal url={pdfViewer.url} name={pdfViewer.name} onClose={() => setPdfViewer(null)} />
      )}
    </div>
  )
}
