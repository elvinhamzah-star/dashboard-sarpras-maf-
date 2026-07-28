import { useEffect, useState, useRef } from 'react'
import { fetchDocumentation, Documentation, fetchPrograms, Program, fetchBeforeAfterPairs, BeforeAfterPair, invalidateCache } from '../lib/supabase'
import { adminDelete } from '../lib/adminApi'
import { formatTanggal, getDriveThumbnailUrl, getDriveViewUrl, getDriveEmbedUrl, extractDriveFileId, STATUS_COLORS } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import { useBackHandler, useTopBarTitle } from '../lib/backNav'
import { forcePageRepaint } from '../lib/forceRepaint'
import { useRepaintOnClose } from '../lib/useRepaintOnClose'
import AddDocumentationModal from './AddDocumentationModal'
import EditDocumentationModal from './EditDocumentationModal'
import ManageBeforeAfterModal from './ManageBeforeAfterModal'
import ModalShell from './ModalShell'

// Sentinel fase value: the curated before/after comparison view
const FASE_BA = '__ba__'

interface GaleriProps {
  isAdmin?: boolean
  initialProgramId?: string | null
  /** When set, "Kembali ke Daftar" exits to the caller (e.g. Dokumen) instead of Galeri's own program list. */
  onExit?: () => void
}

const FASE_INFO: Record<string, { color: string; bg: string }> = {
  'Kondisi Awal':     { color: '#660000', bg: 'rgba(102,0,0,0.1)' },
  'Proses Pekerjaan': { color: 'var(--blue)', bg: 'rgba(26,111,232,0.1)' },
  'Kondisi Akhir':    { color: '#1B5E2B', bg: 'rgba(27,94,43,0.1)' },
  'Dokumentasi':      { color: 'var(--text-secondary)', bg: 'rgba(0,0,0,0.06)' },
}

const FASE_LIST = ['Semua', 'Kondisi Awal', 'Proses Pekerjaan', 'Kondisi Akhir', 'Dokumentasi'] as const

// Sentinel: entered Level 3 directly (program has only 1 or 0 distinct titik — skip Level 2)
const TITIK_ALL = '__all__'

export default function Galeri({ isAdmin = false, initialProgramId, onExit }: GaleriProps) {
  const width = useWindowWidth()
  const isMobile = width < 900

  const [docs, setDocs] = useState<Documentation[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [pairs, setPairs] = useState<BeforeAfterPair[]>([])
  const [showManageBA, setShowManageBA] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterProgram, setFilterProgram] = useState<string>('Semua')
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  // null = Level 2 (titik selection); string = Level 3 ('' = no-titik bucket, TITIK_ALL = all)
  const [selectedTitik, setSelectedTitik] = useState<string | null>(null)
  const [filterFase, setFilterFase] = useState<string>('Semua')
  const [showAddModal, setShowAddModal] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [lightboxImgLoaded, setLightboxImgLoaded] = useState(false)
  const [lightboxIsVideo, setLightboxIsVideo] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Documentation | null>(null)
  const [error, setError] = useState('')
  const [showProgramDropdown, setShowProgramDropdown] = useState(false)
  const [programSearch, setProgramSearch] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const touchStartX = useRef<number | null>(null)
  const mainSwipeStartX = useRef<number | null>(null)
  const mainSwipeStartY = useRef<number | null>(null)
  const autoOpenedRef = useRef(false)

  useEffect(() => { load() }, [])

  // Auto-open a specific program's folder when navigated from PekerjaanDetail
  useEffect(() => {
    if (!initialProgramId || loading || autoOpenedRef.current) return
    autoOpenedRef.current = true
    setFilterProgram(initialProgramId)
    openFolder(initialProgramId)
  // openFolder uses docs — run after docs are loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProgramId, loading])

  useEffect(() => {
    if (!showProgramDropdown) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowProgramDropdown(false)
        setProgramSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showProgramDropdown])

  useEffect(() => {
    if (showProgramDropdown) setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 50)
  }, [showProgramDropdown])

  const openProgramDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const DROPDOWN_HEIGHT = 290
      const fitsBelow = rect.bottom + 6 + DROPDOWN_HEIGHT < viewportHeight
      setDropdownPos({
        top: fitsBelow ? rect.bottom + 6 : Math.max(8, rect.top - DROPDOWN_HEIGHT - 6),
        left: rect.left,
        width: Math.max(rect.width, 260),
      })
    }
    setShowProgramDropdown(true)
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [docsResult, progsResult, pairsResult] = await Promise.all([fetchDocumentation(), fetchPrograms(), fetchBeforeAfterPairs()])
      if (docsResult.error) setError('Tabel dokumentasi belum dibuat. Hubungi admin.')
      else if (docsResult.data) setDocs(docsResult.data)
      if (progsResult.data) setPrograms(progsResult.data)
      if (pairsResult.data) setPairs(pairsResult.data)
    } catch {
      setError('Gagal memuat galeri.')
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus dokumentasi ini?')) return
    const { error: err } = await adminDelete('documentation', id)
    if (err) alert('Gagal menghapus: ' + err.message)
    else setDocs(docs.filter(d => d.id !== id))
  }

  // Returns sorted unique titik values for a program ('' = docs with no titik)
  const getDistinctTitik = (pid: string) => {
    const pd = docs.filter(d => d.program_id === pid)
    const set = [...new Set(pd.map(d => d.titik?.trim() || ''))]
    // Put '' (no-titik bucket) at end if present
    return set.sort((a, b) => a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, 'id'))
  }

  // Docs that pass the top-level program filter
  const filteredDocs = docs.filter(doc => {
    const prog = programs.find(p => p.id === doc.program_id)
    if (prog?.status === 'Perencanaan') return false
    if (filterProgram !== 'Semua' && doc.program_id !== filterProgram) return false
    return true
  })

  // Docs inside Level 3 (filtered by program, titik, and fase)
  const folderDocs = (openFolderId && selectedTitik !== null)
    ? docs.filter(d => {
        if (d.program_id !== openFolderId) return false
        if (selectedTitik !== TITIK_ALL) {
          if ((d.titik?.trim() || '') !== selectedTitik) return false
        }
        if (filterFase !== 'Semua' && d.fase !== filterFase) return false
        return true
      })
    : []

  // Curated before/after pairs for the currently open program
  const docById = (id: string | null | undefined) => (id ? docs.find(d => d.id === id) : undefined)
  const programPairs = openFolderId ? pairs.filter(p => p.program_id === openFolderId) : []
  const hasPairs = programPairs.length > 0
  const isBAView = filterFase === FASE_BA

  // Flat list of pair photos (before, after, before, after…) — drives the lightbox in BA view
  const baDocs: Documentation[] = isBAView
    ? programPairs.flatMap(p => [docById(p.before_doc_id), docById(p.after_doc_id)].filter((d): d is Documentation => !!d))
    : []

  // For lightbox — only used in Level 3
  const activeDocs = isBAView
    ? baDocs
    : (openFolderId && selectedTitik !== null) ? folderDocs : filteredDocs

  // Distinct titik of the currently open program
  const currentDistinctTitik = openFolderId ? getDistinctTitik(openFolderId) : []
  const openFolderHasManyTitik = currentDistinctTitik.length > 1

  const openFolder = (pid: string) => {
    const uniqueTitik = getDistinctTitik(pid)
    const progHasPairs = pairs.some(p => p.program_id === pid)
    setOpenFolderId(pid)
    setFilterFase(progHasPairs ? FASE_BA : 'Semua')   // BA view only if pairs exist; else show all photos grid
    setLightboxIndex(null)
    if (uniqueTitik.length > 1) {
      setSelectedTitik(null)     // → Level 2 (show BA pairs first)
    } else {
      setSelectedTitik(TITIK_ALL) // → Level 3 directly (skip Level 2)
    }
  }

  const openTitikFolder = (titik: string) => {
    setSelectedTitik(titik)
    setFilterFase('Semua')
    setLightboxIndex(null)
  }

  const backFromLevel3 = () => {
    if (openFolderHasManyTitik) {
      setSelectedTitik(null)   // → back to Level 2
      setLightboxIndex(null)
    } else {
      closeFolder()            // → back to Level 1
    }
  }

  const closeFolder = () => {
    setOpenFolderId(null)
    setSelectedTitik(null)
    setFilterFase('Semua')
    setLightboxIndex(null)
  }

  // Drive the mobile top-bar ← arrow: Level 3 → up one level, Level 2 → list,
  // Level 1 → exit to caller (only when entered via deep link). null = no back.
  useBackHandler(
    openFolderId
      ? selectedTitik !== null ? backFromLevel3 : closeFolder
      : onExit ?? null,
  )

  // Drive the mobile top-bar title: show program/titik name when drilled in.
  const _openProgram = openFolderId ? programs.find(p => p.id === openFolderId) : null
  const _openProgramName = _openProgram?.nama_pekerjaan || openFolderId || ''
  useTopBarTitle(openFolderId ? _openProgramName : null)

  const selectedProgramName = filterProgram === 'Semua'
    ? 'Pilih Program'
    : programs.find(p => p.id === filterProgram)?.nama_pekerjaan || 'Pilih Program'

  const filteredProgramList = programs
    .filter(p => p.status !== 'Perencanaan' && docs.some(d => d.program_id === p.id))
    .filter(p => p.nama_pekerjaan.toLowerCase().includes(programSearch.toLowerCase()))

  // All programs that have docs (for Level 1 grid)
  const mobilePrograms = programs
    .filter(p => p.status !== 'Perencanaan' && docs.some(d => d.program_id === p.id))
    .filter(p => filterProgram === 'Semua' || p.id === filterProgram)
    .sort((a, b) => {
      const order = ['Selesai', 'On Going', 'On Hold']
      return order.indexOf(a.status) - order.indexOf(b.status)
    })

  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setLightboxIndex(i => i !== null ? Math.max(0, i - 1) : null)
      if (e.key === 'ArrowRight') setLightboxIndex(i => i !== null ? Math.min(activeDocs.length - 1, i + 1) : null)
      if (e.key === 'Escape') setLightboxIndex(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightboxIndex, activeDocs.length])

  // When the fullscreen lightbox closes, force a repaint so album-card hover
  // behind it doesn't freeze (stale compositor tiles — see forcePageRepaint).
  const prevLightbox = useRef<number | null>(null)
  useEffect(() => {
    if (prevLightbox.current !== null && lightboxIndex === null) forcePageRepaint()
    prevLightbox.current = lightboxIndex
  }, [lightboxIndex])

  // Modal admin lain (ModalShell, pakai backdrop-filter) kena bug compositor
  // yang sama — tanpa ini tombol ✏️/✕ dan "Kelola" di kartu belakangnya jadi
  // "ngilang" dan butuh klik super presisi setelah modal ditutup.
  useRepaintOnClose(editingDoc !== null)
  useRepaintOnClose(showAddModal)
  useRepaintOnClose(showManageBA)

  // Reset image state + preload prev/next when lightbox navigates
  useEffect(() => {
    if (lightboxIndex === null) return
    setLightboxImgLoaded(false)
    setLightboxIsVideo(false)
    ;[lightboxIndex - 1, lightboxIndex + 1].forEach(idx => {
      const d = activeDocs[idx]
      if (!d) return
      const url = getDriveViewUrl(d.link_foto)
      if (url) new Image().src = url
    })
  }, [lightboxIndex])

  const renderPhotoCard = (doc: Documentation, globalIndex: number) => {
    const thumbUrl = getDriveThumbnailUrl(doc.link_foto)
    const fi = doc.fase ? FASE_INFO[doc.fase] : null
    return (
      <div
        key={doc.id}
        style={{
          position: 'relative', borderRadius: 12, overflow: 'hidden',
          backgroundColor: 'var(--card)', border: '1px solid var(--border-subtle)',
          cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
          el.style.transform = 'translateY(-2px)'
          const img = el.querySelector('img') as HTMLImageElement | null
          if (img) img.style.transform = 'scale(1.06)'
          const ov = el.querySelector('.cap-ov') as HTMLElement | null
          if (ov) ov.style.opacity = '1'
          const ac = el.querySelector('.adm-ac') as HTMLElement | null
          if (ac) ac.style.opacity = '1'
          // Preload full-res on hover so click is instant
          const viewUrl = getDriveViewUrl(doc.link_foto)
          if (viewUrl) new Image().src = viewUrl
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
          el.style.transform = 'translateY(0)'
          const img = el.querySelector('img') as HTMLImageElement | null
          if (img) img.style.transform = 'scale(1)'
          const ov = el.querySelector('.cap-ov') as HTMLElement | null
          if (ov) ov.style.opacity = '0'
          const ac = el.querySelector('.adm-ac') as HTMLElement | null
          if (ac) ac.style.opacity = '0'
        }}
        onClick={() => setLightboxIndex(globalIndex)}
      >
        <div style={{ width: '100%', aspectRatio: '4/3', backgroundColor: 'var(--surface-raised)', overflow: 'hidden', position: 'relative' }}>
          {thumbUrl ? (
            <img src={thumbUrl} alt={doc.caption || ''} loading="lazy" decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease', display: 'block' }}
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none'
                const ph = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null
                if (ph) ph.style.display = 'flex'
              }}
            />
          ) : null}
          <div style={{ width: '100%', height: '100%', display: thumbUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--border-strong)' }}>
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
          {doc.tipe_file === 'video' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
                <svg width="16" height="16" fill="#fff" viewBox="0 0 24 24" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>
          )}
          {doc.caption && (
            <div className="cap-ov" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(8,18,36,0.82) 0%, transparent 100%)', padding: '28px 10px 10px', opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.88)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{doc.caption}</div>
            </div>
          )}
        </div>
        <div style={{ padding: '8px 10px' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
            {doc.titik && selectedTitik === TITIK_ALL && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, backgroundColor: 'rgba(124,58,237,0.1)', color: '#7C3AED', whiteSpace: 'nowrap' }}>{doc.titik}</span>
            )}
            {fi && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, backgroundColor: fi.bg, color: fi.color, whiteSpace: 'nowrap' }}>
                {doc.fase === 'Proses Pekerjaan' ? 'Proses' : doc.fase}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTanggal(doc.tanggal)}</div>
        </div>
        {isAdmin && (
          <div className="adm-ac" style={{ position: 'absolute', top: 7, right: 7, display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.18s' }}>
            <button onClick={e => { e.stopPropagation(); setEditingDoc(doc) }}
              style={{ backgroundColor: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 50, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontFamily: 'inherit' }}>✏️</button>
            <button onClick={e => { e.stopPropagation(); handleDelete(doc.id) }}
              style={{ backgroundColor: 'rgba(102,0,0,0.7)', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 50, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontFamily: 'inherit' }}>✕</button>
          </div>
        )}
      </div>
    )
  }

  // ── Filter bar (Level 1) ──────────────────────────────────────────
  const closePicker = () => { setShowProgramDropdown(false); setProgramSearch('') }

  const renderFilterBar = () => (
    <div style={{ marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        onClick={() => setFilterProgram('Semua')}
        style={{
          padding: '6px 16px', borderRadius: 99, fontFamily: 'inherit',
          backgroundColor: filterProgram === 'Semua' ? 'var(--blue)' : 'var(--card)',
          color: filterProgram === 'Semua' ? '#fff' : 'var(--text-secondary)',
          fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          border: filterProgram === 'Semua' ? 'none' : '1px solid var(--border-subtle)',
        } as React.CSSProperties}
      >
        Semua
      </button>

      {/* Trigger button — same on mobile & desktop */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          ref={triggerRef}
          onClick={() => showProgramDropdown ? closePicker() : openProgramDropdown()}
          style={{
            padding: '6px 14px', borderRadius: 99, fontFamily: 'inherit',
            border: `1px solid ${filterProgram !== 'Semua' || showProgramDropdown ? 'var(--blue)' : 'var(--border-subtle)'}`,
            backgroundColor: filterProgram !== 'Semua' ? 'rgba(26,111,232,0.07)' : 'var(--card)',
            color: filterProgram !== 'Semua' ? 'var(--blue)' : 'var(--text-secondary)',
            fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedProgramName}</span>
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
            style={{ transform: (showProgramDropdown && !isMobile) ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* Desktop: fixed dropdown */}
        {showProgramDropdown && !isMobile && (
          <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 200, backgroundColor: 'var(--card)', borderRadius: 12, border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(13,24,41,0.14)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ position: 'relative' }}>
                <svg width="13" height="13" fill="none" stroke="#9CAABB" strokeWidth="2" viewBox="0 0 24 24" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input ref={searchRef} type="text" value={programSearch} onChange={e => setProgramSearch(e.target.value)} placeholder="Cari program..."
                  style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', backgroundColor: 'var(--surface-raised)' }} />
              </div>
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              <button type="button" onClick={() => { setFilterProgram('Semua'); closePicker() }}
                style={{ width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--border-subtle)', backgroundColor: filterProgram === 'Semua' ? 'rgba(26,111,232,0.06)' : 'transparent', color: filterProgram === 'Semua' ? 'var(--blue)' : 'var(--text-primary)', fontSize: 13, fontWeight: filterProgram === 'Semua' ? 600 : 400, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                Semua Program
              </button>
              {filteredProgramList.map(p => (
                <button key={p.id} type="button" onClick={() => { setFilterProgram(p.id); closePicker() }}
                  style={{ width: '100%', padding: '10px 14px', border: 'none', backgroundColor: filterProgram === p.id ? 'rgba(26,111,232,0.06)' : 'transparent', color: filterProgram === p.id ? 'var(--blue)' : 'var(--text-primary)', fontSize: 13, fontWeight: filterProgram === p.id ? 600 : 400, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.nama_pekerjaan}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {filterProgram !== 'Semua' && (
        <button onClick={() => setFilterProgram('Semua')} style={{ padding: '4px 10px', borderRadius: 99, border: '1px solid var(--border-subtle)', backgroundColor: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          ✕ Reset
        </button>
      )}

      {/* Mobile: bottom-sheet program picker */}
      {showProgramDropdown && isMobile && (
        <ModalShell onClose={closePicker} zIndex={200}>
          <div style={{ padding: '4px 16px 36px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
              Pilih Program
            </div>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <svg width="15" height="15" fill="none" stroke="#9CAABB" strokeWidth="2" viewBox="0 0 24 24"
                style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={programSearch}
                onChange={e => setProgramSearch(e.target.value)}
                placeholder="Cari program..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 34px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', backgroundColor: 'var(--surface-raised)' }}
              />
            </div>
            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button
                type="button"
                onClick={() => { setFilterProgram('Semua'); closePicker() }}
                style={{ padding: '13px 4px', border: 'none', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'transparent', color: filterProgram === 'Semua' ? 'var(--blue)' : 'var(--text-primary)', fontSize: 14, fontWeight: filterProgram === 'Semua' ? 700 : 400, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>Semua Program</span>
                {filterProgram === 'Semua' && <svg width="16" height="16" fill="none" stroke="var(--blue)" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
              {filteredProgramList.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setFilterProgram(p.id); closePicker() }}
                  style={{ padding: '13px 4px', border: 'none', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'transparent', color: filterProgram === p.id ? 'var(--blue)' : 'var(--text-primary)', fontSize: 14, fontWeight: filterProgram === p.id ? 700 : 400, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ flex: 1, paddingRight: 12, lineHeight: 1.35 }}>{p.nama_pekerjaan}</span>
                  {filterProgram === p.id && <svg width="16" height="16" fill="none" stroke="var(--blue)" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              ))}
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )

  // ── Level 2: Titik folder grid ────────────────────────────────────
  const renderTitikGrid = () => {
    if (!openFolderId) return null
    const totalProgDocs = docs.filter(d => d.program_id === openFolderId).length
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: isMobile ? 12 : 16 }}>
          {currentDistinctTitik.map(titik => {
            const titikDocs = docs.filter(d => d.program_id === openFolderId && (d.titik?.trim() || '') === titik)
            const cover = getDriveThumbnailUrl(titikDocs[0]?.link_foto)
            const titikLabel = titik || 'Dokumentasi Umum'
            const faseSet = [...new Set(titikDocs.map(d => d.fase).filter((f): f is string => !!f))]
            return (
              <div
                key={titik}
                onClick={() => openTitikFolder(titik)}
                style={{ backgroundColor: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-subtle)', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.18s, transform 0.18s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; el.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; el.style.transform = 'translateY(0)' }}
              >
                {/* Cover */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', backgroundColor: 'var(--surface-raised)', overflow: 'hidden' }}>
                  {cover ? (
                    <img src={cover} alt={titikLabel} loading="lazy" decoding="async"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--border-strong)' }}>
                      <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
                    {titikDocs.length} foto
                  </div>
                </div>
                {/* Body */}
                <div style={{ padding: isMobile ? '10px 12px' : '12px 14px' }}>
                  <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.35, marginBottom: 6 }}>
                    {titikLabel}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {faseSet.slice(0, 3).map(f => {
                      const fi = FASE_INFO[f]
                      return fi ? (
                        <span key={f} style={{ fontSize: 9.5, fontWeight: 600, padding: '1px 6px', borderRadius: 99, backgroundColor: fi.bg, color: fi.color }}>
                          {f === 'Proses Pekerjaan' ? 'Proses' : f === 'Kondisi Awal' ? 'Awal' : f === 'Kondisi Akhir' ? 'Akhir' : f}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // ── Resolve header content based on current level ─────────────────
  const openProgram = openFolderId ? programs.find(p => p.id === openFolderId) : null
  const openProgramName = openProgram?.nama_pekerjaan || openFolderId || ''
  const isLevel1 = !openFolderId
  const isLevel2 = !!openFolderId && selectedTitik === null
  const isLevel3 = !!openFolderId && selectedTitik !== null
  const titikDisplayName = selectedTitik === TITIK_ALL || selectedTitik === ''
    ? (selectedTitik === '' ? 'Dokumentasi Umum' : null)
    : selectedTitik

  return (
    <div
      style={{ padding: isMobile ? '16px 14px 48px' : '28px 28px 48px' }}
      onTouchStart={e => {
        if (!openFolderId || lightboxIndex !== null) return
        if (e.touches[0].clientX < 44) {
          mainSwipeStartX.current = e.touches[0].clientX
          mainSwipeStartY.current = e.touches[0].clientY
        }
      }}
      onTouchEnd={e => {
        if (mainSwipeStartX.current === null) return
        const dx = e.changedTouches[0].clientX - mainSwipeStartX.current
        const dy = Math.abs(e.changedTouches[0].clientY - (mainSwipeStartY.current || 0))
        if (dx > 55 && dy < 90) {
          if (isLevel3) backFromLevel3()
          else if (isLevel2) closeFolder()
        }
        mainSwipeStartX.current = null
        mainSwipeStartY.current = null
      }}
    >

      {/* Header */}
      <div style={{ marginBottom: (isMobile && isLevel1) ? 0 : 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {isLevel1 && (
            <>
              {onExit && width > 768 && (
                <button
                  onClick={onExit}
                  style={isMobile ? { display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', background: 'none', border: 'none', padding: 0, marginBottom: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit' } : { display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 99, padding: '6px 14px 6px 8px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s', marginBottom: 10 }}
                  onMouseEnter={e => { const b = e.currentTarget; b.style.color = '#fff'; b.style.background = 'var(--blue)'; b.style.borderColor = 'var(--blue)' }}
                  onMouseLeave={e => { const b = e.currentTarget; b.style.color = 'var(--text-secondary)'; b.style.background = 'var(--card)'; b.style.borderColor = 'var(--border-subtle)' }}
                >
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                  </span>
                  Kembali
                </button>
              )}
              <>
                <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
                  Galeri Dokumentasi
                </h1>
                {!isMobile && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '5px 0 0' }}>
                    Foto dokumentasi progres setiap pekerjaan
                  </p>
                )}
              </>
            </>
          )}

          {isLevel2 && (
            <>
              {width > 768 && <button
                onClick={closeFolder}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 99, padding: '6px 14px 6px 8px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s', marginBottom: 10 }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#fff'; b.style.background = 'var(--blue)'; b.style.borderColor = 'var(--blue)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(255,255,255,0.2)' }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'var(--text-secondary)'; b.style.background = 'var(--card)'; b.style.borderColor = 'var(--border-subtle)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(0,0,0,0.06)' }}
              >
                <span className="bk-ic" style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                </span>
                Kembali ke Daftar
              </button>}
              {/* Desktop: tampilkan judul di body. Mobile: judul sudah ada di top bar */}
              {!isMobile && (
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                  {openProgramName}
                </h1>
              )}
            </>
          )}

          {isLevel3 && (
            <>
              {width > 768 && <button
                onClick={backFromLevel3}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 99, padding: '6px 14px 6px 8px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s', marginBottom: 10 }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#fff'; b.style.background = 'var(--blue)'; b.style.borderColor = 'var(--blue)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(255,255,255,0.2)' }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'var(--text-secondary)'; b.style.background = 'var(--card)'; b.style.borderColor = 'var(--border-subtle)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(0,0,0,0.06)' }}
              >
                <span className="bk-ic" style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                </span>
                Kembali ke Daftar
              </button>}
              {/* Desktop: tampilkan breadcrumb/judul di body. Mobile: judul di top bar */}
              {!isMobile && (openFolderHasManyTitik && titikDisplayName !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>{openProgramName}</span>
                  <svg width="12" height="12" fill="none" stroke="var(--text-muted)" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                  <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{titikDisplayName}</span>
                </div>
              ) : (
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                  {openProgramName}
                </h1>
              ))}
            </>
          )}
        </div>

        {isAdmin && !isMobile && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{ padding: '9px 18px', borderRadius: 10, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(26,111,232,0.3)', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--blue)' }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Dokumentasi
          </button>
        )}
      </div>

      {error && <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#E53E3E', fontSize: 12 }}>{error}</div>}

      {/* ── Navigation levels ── */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60 }}>Memuat...</div>
      ) : isLevel3 ? (
        /* ── Level 3: BA default + "Tampilkan Semua" toggle ── */
        <>
          {/* Control bar */}
          <div style={{ marginBottom: 16 }}>
            {/* Row 1: segmented view toggle (if pairs exist) + admin kelola icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              {hasPairs ? (
                <button
                  onClick={() => setFilterFase(isBAView ? 'Semua' : FASE_BA)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit',
                    padding: isMobile ? '7px 14px' : '8px 16px', borderRadius: 10,
                    border: '1px solid var(--border-subtle)', background: 'var(--card)', color: 'var(--text-secondary)',
                    fontSize: isMobile ? 12 : 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--blue)'; b.style.color = 'var(--blue)' }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--border-subtle)'; b.style.color = 'var(--text-secondary)' }}
                >
                  {isBAView ? (
                    <>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                      Lihat Semua Foto
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                      Sebelum/Sesudah
                    </>
                  )}
                </button>
              ) : <div />}
              {isAdmin && (isMobile ? (
                <button
                  onClick={() => setShowManageBA(true)}
                  title="Kelola Sebelum/Sesudah"
                  style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border-subtle)', background: 'var(--card)', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--blue)'; b.style.color = '#fff'; b.style.borderColor = 'var(--blue)' }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--card)'; b.style.color = 'var(--text-muted)'; b.style.borderColor = 'var(--border-subtle)' }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
              ) : (
                <button
                  onClick={() => setShowManageBA(true)}
                  title="Kelola Sebelum/Sesudah"
                  style={{ height: 34, padding: '0 14px', borderRadius: 9, border: '1px solid var(--border-subtle)', background: 'var(--card)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, flexShrink: 0, transition: 'all 0.15s' }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--blue)'; b.style.color = '#fff'; b.style.borderColor = 'var(--blue)' }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--card)'; b.style.color = 'var(--text-secondary)'; b.style.borderColor = 'var(--border-subtle)' }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  Kelola Sebelum/Sesudah
                </button>
              ))}
            </div>
            {/* Row 2: fase chips — only in grid (Semua Foto) view */}
            {!isBAView && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: hasPairs ? 10 : 0 }}>
                {FASE_LIST.filter(f => f !== 'Semua').map(fase => {
                  const isActive = filterFase === fase
                  const c = FASE_INFO[fase]?.color || 'var(--blue)'
                  const hasFase = docs.some(d =>
                    d.program_id === openFolderId &&
                    d.fase === fase &&
                    (selectedTitik === TITIK_ALL || (d.titik?.trim() || '') === selectedTitik)
                  )
                  if (!hasFase) return null
                  return (
                    <button key={fase} onClick={() => setFilterFase(isActive ? 'Semua' : fase)}
                      style={{
                        padding: isMobile ? '5px 12px' : '6px 16px', borderRadius: 99, fontFamily: 'inherit',
                        border: isActive ? 'none' : '1px solid var(--border-subtle)',
                        backgroundColor: isActive ? `${c}18` : 'transparent',
                        color: isActive ? c : 'var(--text-secondary)',
                        fontSize: isMobile ? 11.5 : 12.5, fontWeight: 600, cursor: 'pointer',
                      }}>
                      {fase === 'Proses Pekerjaan' ? 'Proses' : fase}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {isBAView ? (
            /* ── BA view: show pairs or nothing ── */
            programPairs.length === 0 ? null : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 20, width: '100%' }}>
                {programPairs.map(pair => {
                  const beforeDoc = docById(pair.before_doc_id)
                  const afterDoc = docById(pair.after_doc_id)
                  const baIndexOf = (d: Documentation | undefined) => d ? baDocs.indexOf(d) : -1
                  const sideCell = (d: Documentation | undefined, kind: 'before' | 'after') => {
                    const dotColor = kind === 'before' ? '#ff5a5a' : '#34d399'
                    const t = d ? getDriveThumbnailUrl(d.link_foto, 'w800') : null
                    const chip = (
                      <div style={{ position: 'absolute', left: 8, bottom: 8, zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: isMobile ? 4 : 5, fontSize: isMobile ? 8.5 : 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', padding: isMobile ? '3px 7px' : '4px 10px', borderRadius: 99 }}>
                        <span style={{ width: isMobile ? 5 : 6, height: isMobile ? 5 : 6, borderRadius: '50%', background: dotColor }} />
                        {kind === 'before' ? 'Sebelum' : 'Sesudah'}
                      </div>
                    )
                    return (
                      <div style={{ flex: 1, position: 'relative', borderRadius: 11, overflow: 'hidden', aspectRatio: isMobile ? '4/3' : '16/10', background: 'var(--surface-raised)' }}>
                        {d && t ? (
                          <>
                            <div onClick={() => { const idx = baIndexOf(d); if (idx >= 0) setLightboxIndex(idx) }}
                              style={{ width: '100%', height: '100%', cursor: 'pointer' }}>
                              <img src={t} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            </div>
                            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '44%', background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)', pointerEvents: 'none' }} />
                          </>
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-muted)' }}>
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                            <span style={{ fontSize: 11.5, fontWeight: 500 }}>Belum ada foto</span>
                          </div>
                        )}
                        {chip}
                      </div>
                    )
                  }
                  return (
                    <div key={pair.id} style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', maxWidth: isMobile ? undefined : '90%', margin: isMobile ? undefined : '0 auto' }}>
                      {pair.label && (
                        <div style={{ padding: isMobile ? '11px 15px 9px' : '12px 16px 10px', fontSize: isMobile ? 13 : 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                          {pair.label}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 3, padding: '0 3px 3px' }}>
                        {sideCell(beforeDoc, 'before')}
                        {sideCell(afterDoc, 'after')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : folderDocs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60 }}>Tidak ada foto untuk fase ini.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: isMobile ? 10 : 14 }}>
              {folderDocs.map(doc => renderPhotoCard(doc, folderDocs.indexOf(doc)))}
            </div>
          )}
        </>
      ) : isLevel2 ? (
        /* ── Level 2: BA default (program-level), "Tampilkan Semua" → titik folders ── */
        <>
          {/* Control bar: segmented view toggle + admin kelola icon */}
          {hasPairs && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
              {/* Single toggle switcher */}
              <button
                onClick={() => setFilterFase(isBAView ? 'Semua' : FASE_BA)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit',
                  padding: isMobile ? '7px 14px' : '8px 16px', borderRadius: 10,
                  border: '1px solid var(--border-subtle)', background: 'var(--card)', color: 'var(--text-secondary)',
                  fontSize: isMobile ? 12 : 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--blue)'; b.style.color = 'var(--blue)' }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--border-subtle)'; b.style.color = 'var(--text-secondary)' }}
              >
                {isBAView ? (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    Lihat Semua Foto
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                    Sebelum/Sesudah
                  </>
                )}
              </button>
              {/* Admin: ikon kelola subtle */}
              {isAdmin && (isMobile ? (
                <button
                  onClick={() => setShowManageBA(true)}
                  title="Kelola Sebelum/Sesudah"
                  style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border-subtle)', background: 'var(--card)', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--blue)'; b.style.color = '#fff'; b.style.borderColor = 'var(--blue)' }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--card)'; b.style.color = 'var(--text-muted)'; b.style.borderColor = 'var(--border-subtle)' }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
              ) : (
                <button
                  onClick={() => setShowManageBA(true)}
                  title="Kelola Sebelum/Sesudah"
                  style={{ height: 34, padding: '0 14px', borderRadius: 9, border: '1px solid var(--border-subtle)', background: 'var(--card)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, flexShrink: 0, transition: 'all 0.15s' }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--blue)'; b.style.color = '#fff'; b.style.borderColor = 'var(--blue)' }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--card)'; b.style.color = 'var(--text-secondary)'; b.style.borderColor = 'var(--border-subtle)' }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  Kelola Sebelum/Sesudah
                </button>
              ))}
            </div>
          )}
          {isBAView ? (
            programPairs.length === 0 ? null : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 20, width: '100%' }}>
                {programPairs.map(pair => {
                  const beforeDoc = docById(pair.before_doc_id)
                  const afterDoc = docById(pair.after_doc_id)
                  const baIndexOf = (d: Documentation | undefined) => d ? baDocs.indexOf(d) : -1
                  const sideCell = (d: Documentation | undefined, kind: 'before' | 'after') => {
                    const dotColor = kind === 'before' ? '#ff5a5a' : '#34d399'
                    const t = d ? getDriveThumbnailUrl(d.link_foto, 'w800') : null
                    const chip = (
                      <div style={{ position: 'absolute', left: 8, bottom: 8, zIndex: 2, display: 'inline-flex', alignItems: 'center', gap: isMobile ? 4 : 5, fontSize: isMobile ? 8.5 : 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', padding: isMobile ? '3px 7px' : '4px 10px', borderRadius: 99 }}>
                        <span style={{ width: isMobile ? 5 : 6, height: isMobile ? 5 : 6, borderRadius: '50%', background: dotColor }} />
                        {kind === 'before' ? 'Sebelum' : 'Sesudah'}
                      </div>
                    )
                    return (
                      <div style={{ flex: 1, position: 'relative', borderRadius: 11, overflow: 'hidden', aspectRatio: isMobile ? '4/3' : '16/10', background: 'var(--surface-raised)' }}>
                        {d && t ? (
                          <>
                            <div onClick={() => { const idx = baIndexOf(d); if (idx >= 0) setLightboxIndex(idx) }}
                              style={{ width: '100%', height: '100%', cursor: 'pointer' }}>
                              <img src={t} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            </div>
                            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '44%', background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)', pointerEvents: 'none' }} />
                          </>
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-muted)' }}>
                            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                            <span style={{ fontSize: 11.5, fontWeight: 500 }}>Belum ada foto</span>
                          </div>
                        )}
                        {chip}
                      </div>
                    )
                  }
                  return (
                    <div key={pair.id} style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', maxWidth: isMobile ? undefined : '90%', margin: isMobile ? undefined : '0 auto' }}>
                      {pair.label && (
                        <div style={{ padding: isMobile ? '11px 15px 9px' : '12px 16px 10px', fontSize: isMobile ? 13 : 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                          {pair.label}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 3, padding: '0 3px 3px' }}>
                        {sideCell(beforeDoc, 'before')}
                        {sideCell(afterDoc, 'after')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            renderTitikGrid()
          )}
        </>
      ) : (
        /* ── Level 1: Program folder grid ── */
        <>
          {mobilePrograms.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60 }}>Belum ada dokumentasi foto.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: isMobile ? 12 : 16 }}>
              {mobilePrograms.map(prog => {
                const progDocs = docs.filter(d => d.program_id === prog.id)
                const cover = getDriveThumbnailUrl(progDocs[0]?.link_foto)
                const titikCount = getDistinctTitik(prog.id).length
                return (
                  <div
                    key={prog.id}
                    onClick={() => openFolder(prog.id)}
                    style={{ backgroundColor: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-subtle)', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.18s, transform 0.18s' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.14)'; el.style.transform = 'translateY(-3px)'; const img = el.querySelector('img'); if (img) img.style.transform = 'scale(1.07)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; el.style.transform = 'translateY(0)'; const img = el.querySelector('img'); if (img) img.style.transform = 'scale(1)' }}
                  >
                    {/* Cover — zoom is driven by the card's hover handlers above so
                        the whole album responds, not just the image itself. */}
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', backgroundColor: 'var(--surface-raised)', overflow: 'hidden' }}>
                      {cover ? (
                        <img src={cover} alt={prog.nama_pekerjaan} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.35s ease' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--border-strong)' }}>
                          <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                          </svg>
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
                        {progDocs.length} foto
                      </div>
                    </div>
                    {/* Info */}
                    <div style={{ padding: isMobile ? '10px 12px' : '12px 14px' }}>
                      <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.35, marginBottom: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {prog.nama_pekerjaan}
                      </div>
                      {titikCount > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 7px', borderRadius: 99, backgroundColor: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}>
                            {titikCount} titik
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && activeDocs[lightboxIndex] && (() => {
        const doc = activeDocs[lightboxIndex]
        const hasPrev = lightboxIndex > 0
        const hasNext = lightboxIndex < activeDocs.length - 1
        const fi = doc.fase ? FASE_INFO[doc.fase] : null
        const isVideoFile = doc.tipe_file === 'video' || lightboxIsVideo

        const desktopNavBtn = (dir: 'prev' | 'next') => {
          const isPrev = dir === 'prev'
          const disabled = isPrev ? !hasPrev : !hasNext
          return (
            <div style={{ position: 'fixed', [isPrev ? 'left' : 'right']: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 102 }} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => !disabled && setLightboxIndex(i => i !== null ? i + (isPrev ? -1 : 1) : null)}
                disabled={disabled}
                style={{ backgroundColor: disabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', width: 44, height: 44, borderRadius: 50, cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.2 : 1, fontFamily: 'inherit' }}
                onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.32)' }}
                onMouseLeave={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.18)' }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  {isPrev ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
                </svg>
              </button>
            </div>
          )
        }

        return (
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 100, overflowY: 'auto', padding: isMobile ? 0 : '24px 72px' }}
            onClick={() => setLightboxIndex(null)}
            onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
            onTouchEnd={e => {
              if (touchStartX.current === null) return
              const delta = e.changedTouches[0].clientX - touchStartX.current
              if (delta > 50 && hasPrev) setLightboxIndex(i => i !== null ? i - 1 : null)
              if (delta < -50 && hasNext) setLightboxIndex(i => i !== null ? i + 1 : null)
              touchStartX.current = null
            }}
          >
            {!isMobile && desktopNavBtn('prev')}

            <div
              style={{ backgroundColor: 'var(--card)', borderRadius: isMobile ? 0 : 16, maxWidth: isMobile ? '100%' : 880, width: '100%', position: 'relative', marginTop: 'auto', marginBottom: 'auto' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close button — larger on mobile to avoid mis-tap */}
              <button
                onClick={() => setLightboxIndex(null)}
                style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.65)', border: 'none', color: '#fff', width: isMobile ? 44 : 36, height: isMobile ? 44 : 36, borderRadius: 50, cursor: 'pointer', fontSize: 17, zIndex: 103, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
              >✕</button>

              {/* Counter badge */}
              <div style={{ position: 'absolute', top: isMobile ? 17 : 14, left: 14, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, zIndex: 101 }}>
                {lightboxIndex + 1} / {activeDocs.length}
              </div>

              {/* Media + overlay nav */}
              <div style={{ position: 'relative' }}>
                {isVideoFile ? (
                  // Video: iframe /preview Drive — satu-satunya metode inline yang jalan
                  // (hotlink ke <video> native diblokir Google). Mobile borderRadius 0 →
                  // tak ada isu iframe-bleed sudut membulat WebKit; iOS Safari main inline.
                  <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: isMobile ? 0 : '16px 16px 0 0', overflow: 'hidden', aspectRatio: '16/9', maxHeight: isMobile ? undefined : 540 }}>
                    <iframe
                      key={doc.id}
                      src={getDriveEmbedUrl(doc.link_foto) || ''}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      onClick={e => e.stopPropagation()}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block' }}
                    />
                    {/* Fallback — buka kualitas penuh di Drive (anchor asli andal di iOS) */}
                    <a
                      href={`https://drive.google.com/file/d/${extractDriveFileId(doc.link_foto) || ''}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 104, display: 'flex', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 10.5, fontWeight: 600, padding: '5px 10px', borderRadius: 20, textDecoration: 'none', letterSpacing: '0.01em' }}
                    >
                      <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      HD
                    </a>
                  </div>
                ) : (
                  <div style={{ position: 'relative', width: '100%', background: '#111', borderRadius: isMobile ? 0 : '16px 16px 0 0', lineHeight: 0, overflow: 'hidden', aspectRatio: '4/3', maxHeight: isMobile ? 480 : 600 }}>
                    <img src={getDriveThumbnailUrl(doc.link_foto) || ''} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: lightboxImgLoaded ? 0 : 1, transition: 'opacity 0.25s' }} />
                    <img key={doc.id} src={getDriveViewUrl(doc.link_foto) || ''} alt={doc.caption || ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: lightboxImgLoaded ? 1 : 0, transition: 'opacity 0.35s ease' }} onLoad={() => setLightboxImgLoaded(true)} onError={() => setLightboxIsVideo(true)} />
                  </div>
                )}

                {/* Mobile nav arrows — gradient strips on left/right */}
                {isMobile && hasPrev && (
                  <button
                    onClick={e => { e.stopPropagation(); setLightboxIndex(i => i !== null ? i - 1 : null) }}
                    style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 52, zIndex: 102, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 10, background: 'linear-gradient(to right, rgba(0,0,0,0.32), transparent)', border: 'none', cursor: 'pointer', color: '#fff' }}
                  >
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                )}
                {isMobile && hasNext && (
                  <button
                    onClick={e => { e.stopPropagation(); setLightboxIndex(i => i !== null ? i + 1 : null) }}
                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 52, zIndex: 102, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10, background: 'linear-gradient(to left, rgba(0,0,0,0.32), transparent)', border: 'none', cursor: 'pointer', color: '#fff' }}
                  >
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                )}

                {/* Swipe hint — brief fade in/out via CSS animation */}
                {isMobile && activeDocs.length > 1 && (
                  <div
                    key={`hint-${lightboxIndex}`}
                    style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 102, color: '#fff', fontSize: 11.5, fontWeight: 500, backgroundColor: 'rgba(0,0,0,0.5)', padding: '5px 16px', borderRadius: 20, whiteSpace: 'nowrap', pointerEvents: 'none', animation: 'swipeHint 2.5s ease 0.4s both' }}
                  >
                    ← Geser untuk lihat foto lainnya →
                  </div>
                )}
              </div>

              {/* Info section — compact */}
              <div style={{ padding: isMobile ? '10px 14px 14px' : '12px 18px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: isMobile ? 12.5 : 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.3 }}>{doc.nama_pekerjaan}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{formatTanggal(doc.tanggal)}</span>
                      {doc.titik && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99, backgroundColor: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>{doc.titik}</span>
                      )}
                    </div>
                    {doc.caption && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 5 }}>{doc.caption}</div>}
                  </div>
                  {fi && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 99, backgroundColor: fi.bg, color: fi.color, flexShrink: 0, whiteSpace: 'nowrap', marginTop: 2 }}>{doc.fase === 'Proses Pekerjaan' ? 'Proses' : doc.fase}</span>}
                </div>
              </div>
            </div>

            {!isMobile && desktopNavBtn('next')}
          </div>
        )
      })()}

      {isAdmin && showAddModal && (
        <AddDocumentationModal
          programs={programs}
          // Level 2/3: kunci program & isi titik dari konteks halaman supaya
          // foto/video tak nyasar ke pekerjaan lain atau bikin titik baru gara² typo.
          initialProgramId={openFolderId ?? undefined}
          lockProgram={!!openFolderId}
          initialTitik={selectedTitik !== null && selectedTitik !== TITIK_ALL ? selectedTitik : undefined}
          onClose={() => setShowAddModal(false)}
          onSuccess={async () => { invalidateCache('documentation', 'documentation_program_ids'); const { data } = await fetchDocumentation(); if (data) setDocs(data); setShowAddModal(false) }} />
      )}
      {isAdmin && editingDoc && (
        <EditDocumentationModal doc={editingDoc} programs={programs} onClose={() => setEditingDoc(null)}
          onSuccess={async () => { invalidateCache('documentation', 'documentation_program_ids'); const { data } = await fetchDocumentation(); if (data) setDocs(data); setEditingDoc(null) }} />
      )}
      {/* Mobile FAB — hanya tampil saat lightbox tutup */}
      {isAdmin && isMobile && lightboxIndex === null && (
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            position: 'fixed',
            bottom: 'calc(78px + env(safe-area-inset-bottom))',
            right: 18,
            zIndex: 50,
            width: 46,
            height: 46,
            borderRadius: 14,
            border: 'none',
            backgroundColor: 'var(--blue)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(26,111,232,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}

      {isAdmin && showManageBA && openFolderId && (
        <ManageBeforeAfterModal
          programId={openFolderId}
          programName={openProgramName}
          docs={docs}
          onClose={() => setShowManageBA(false)}
          onSaved={async () => { invalidateCache('before_after_pairs'); const { data } = await fetchBeforeAfterPairs(); if (data) setPairs(data) }}
        />
      )}
    </div>
  )
}
