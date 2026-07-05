import { useEffect, useState, useRef } from 'react'
import { fetchDocumentation, Documentation, fetchPrograms, Program } from '../lib/supabase'
import { adminDelete } from '../lib/adminApi'
import { formatTanggal, getDriveThumbnailUrl, getDriveViewUrl, extractDriveFileId, STATUS_COLORS } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import AddDocumentationModal from './AddDocumentationModal'
import EditDocumentationModal from './EditDocumentationModal'

interface GaleriProps {
  isAdmin?: boolean
  initialProgramId?: string | null
}

const FASE_INFO: Record<string, { color: string; bg: string }> = {
  'Kondisi Awal':     { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  'Proses Pekerjaan': { color: 'var(--blue)', bg: 'rgba(26,111,232,0.1)' },
  'Kondisi Akhir':    { color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  'Dokumentasi':      { color: 'var(--text-secondary)', bg: 'rgba(0,0,0,0.06)' },
}

const FASE_LIST = ['Semua', 'Kondisi Awal', 'Proses Pekerjaan', 'Kondisi Akhir', 'Dokumentasi'] as const

// Sentinel: entered Level 3 directly (program has only 1 or 0 distinct titik — skip Level 2)
const TITIK_ALL = '__all__'

export default function Galeri({ isAdmin = false, initialProgramId }: GaleriProps) {
  const width = useWindowWidth()
  const isMobile = width < 900

  const [docs, setDocs] = useState<Documentation[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
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
  const [videoIframeLoaded, setVideoIframeLoaded] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Documentation | null>(null)
  const [error, setError] = useState('')
  const [showProgramDropdown, setShowProgramDropdown] = useState(false)
  const [programSearch, setProgramSearch] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const touchStartX = useRef<number | null>(null)
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
    if (showProgramDropdown) setTimeout(() => searchRef.current?.focus(), 50)
  }, [showProgramDropdown])

  const openProgramDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 260) })
    }
    setShowProgramDropdown(true)
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [docsResult, progsResult] = await Promise.all([fetchDocumentation(), fetchPrograms()])
      if (docsResult.error) setError('Tabel dokumentasi belum dibuat. Hubungi admin.')
      else if (docsResult.data) setDocs(docsResult.data)
      if (progsResult.data) setPrograms(progsResult.data)
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

  // For lightbox — only used in Level 3
  const activeDocs = (openFolderId && selectedTitik !== null) ? folderDocs : filteredDocs

  // Distinct titik of the currently open program
  const currentDistinctTitik = openFolderId ? getDistinctTitik(openFolderId) : []
  const openFolderHasManyTitik = currentDistinctTitik.length > 1

  const openFolder = (pid: string) => {
    const uniqueTitik = getDistinctTitik(pid)
    setOpenFolderId(pid)
    setFilterFase('Semua')
    setLightboxIndex(null)
    if (uniqueTitik.length > 1) {
      setSelectedTitik(null)     // → Level 2 (show titik folders)
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

  // Reset image state + preload prev/next when lightbox navigates
  useEffect(() => {
    if (lightboxIndex === null) return
    setLightboxImgLoaded(false)
    setLightboxIsVideo(false)
    setVideoIframeLoaded(false)
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
            <img src={thumbUrl} alt={doc.caption || ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease', display: 'block' }}
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none'
                const ph = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null
                if (ph) ph.style.display = 'flex'
              }}
            />
          ) : null}
          <div style={{ width: '100%', height: '100%', display: thumbUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" fill="none" stroke="#C8D2E0" strokeWidth="1.5" viewBox="0 0 24 24">
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
              style={{ backgroundColor: 'rgba(220,38,38,0.7)', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 50, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontFamily: 'inherit' }}>✕</button>
          </div>
        )}
      </div>
    )
  }

  // ── Filter bar (Level 1) ──────────────────────────────────────────
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

      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          ref={triggerRef}
          onClick={() => showProgramDropdown ? (setShowProgramDropdown(false), setProgramSearch('')) : openProgramDropdown()}
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
            style={{ transform: showProgramDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showProgramDropdown && (
          <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 200, backgroundColor: 'var(--card)', borderRadius: 12, border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(13,24,41,0.14)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ position: 'relative' }}>
                <svg width="13" height="13" fill="none" stroke="#9CAABB" strokeWidth="2" viewBox="0 0 24 24" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input ref={searchRef} type="text" value={programSearch} onChange={e => setProgramSearch(e.target.value)} placeholder="Cari program..."
                  style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: 12.5, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', backgroundColor: 'var(--surface-raised)' }} />
              </div>
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              <button type="button" onClick={() => { setFilterProgram('Semua'); setShowProgramDropdown(false); setProgramSearch('') }}
                style={{ width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--border-subtle)', backgroundColor: filterProgram === 'Semua' ? 'rgba(26,111,232,0.06)' : 'transparent', color: filterProgram === 'Semua' ? 'var(--blue)' : 'var(--text-primary)', fontSize: 13, fontWeight: filterProgram === 'Semua' ? 600 : 400, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                Semua Program
              </button>
              {filteredProgramList.map(p => (
                <button key={p.id} type="button" onClick={() => { setFilterProgram(p.id); setShowProgramDropdown(false); setProgramSearch('') }}
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
    </div>
  )

  // ── Level 2: Titik folder grid ────────────────────────────────────
  const renderTitikGrid = () => {
    if (!openFolderId) return null
    const totalProgDocs = docs.filter(d => d.program_id === openFolderId).length
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: isMobile ? 12 : 16 }}>
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
                    <img src={cover} alt={titikLabel}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="28" height="28" fill="none" stroke="#C8D2E0" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
                    {titikDocs.length} foto
                  </div>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#7C3AED' }} />
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
    <div style={{ padding: isMobile ? '16px 14px 48px' : '28px 28px 48px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {isLevel1 && (
            <>
              <h1 style={{ fontSize: isMobile ? 14 : 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
                Galeri Dokumentasi
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '5px 0 0' }}>
                {loading ? 'Memuat...' : `${mobilePrograms.length} program · ${docs.filter(d => mobilePrograms.some(p => p.id === d.program_id)).length} foto`}
              </p>
            </>
          )}

          {isLevel2 && (
            <>
              <button
                onClick={closeFolder}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 99, padding: '6px 14px 6px 8px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s', marginBottom: 10 }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#fff'; b.style.background = 'var(--blue)'; b.style.borderColor = 'var(--blue)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(255,255,255,0.2)' }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'var(--text-secondary)'; b.style.background = 'var(--card)'; b.style.borderColor = 'var(--border-subtle)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(0,0,0,0.06)' }}
              >
                <span className="bk-ic" style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                </span>
                Kembali ke Daftar
              </button>
              <h1 style={{ fontSize: isMobile ? 13 : 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                {openProgramName}
              </h1>
            </>
          )}

          {isLevel3 && (
            <>
              <button
                onClick={backFromLevel3}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 99, padding: '6px 14px 6px 8px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s', marginBottom: 10 }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#fff'; b.style.background = 'var(--blue)'; b.style.borderColor = 'var(--blue)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(255,255,255,0.2)' }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'var(--text-secondary)'; b.style.background = 'var(--card)'; b.style.borderColor = 'var(--border-subtle)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(0,0,0,0.06)' }}
              >
                <span className="bk-ic" style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                </span>
                Kembali ke Daftar
              </button>
              {openFolderHasManyTitik && titikDisplayName !== null ? (
                /* Breadcrumb: Program · Titik */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: isMobile ? 12 : 15, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>{openProgramName}</span>
                    <svg width="12" height="12" fill="none" stroke="var(--text-muted)" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                    <span style={{ fontSize: isMobile ? 13 : 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{titikDisplayName}</span>
                  </div>
                </div>
              ) : (
                <h1 style={{ fontSize: isMobile ? 13 : 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                  {openProgramName}
                </h1>
              )}
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '4px 0 0' }}>
                {docs.filter(d => {
                  if (d.program_id !== openFolderId) return false
                  if (selectedTitik !== TITIK_ALL && (d.titik?.trim() || '') !== selectedTitik) return false
                  return true
                }).length} foto dokumentasi
              </p>
            </>
          )}
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{ padding: isMobile ? '8px 14px' : '9px 18px', borderRadius: 10, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: isMobile ? 12.5 : 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(26,111,232,0.3)', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--blue)' }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {isMobile ? 'Tambah' : 'Tambah Dokumentasi'}
          </button>
        )}
      </div>

      {error && <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#E53E3E', fontSize: 12 }}>{error}</div>}

      {/* ── Navigation levels ── */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60 }}>Memuat...</div>
      ) : isLevel3 ? (
        /* ── Level 3: Fase filter + photo grid ── */
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {FASE_LIST.map(fase => {
              const isActive = filterFase === fase
              const c = fase === 'Semua' ? 'var(--blue)' : (FASE_INFO[fase]?.color || 'var(--blue)')
              const hasFase = fase === 'Semua' || docs.some(d =>
                d.program_id === openFolderId &&
                d.fase === fase &&
                (selectedTitik === TITIK_ALL || (d.titik?.trim() || '') === selectedTitik)
              )
              if (!hasFase) return null
              return (
                <button key={fase} onClick={() => setFilterFase(fase)}
                  style={{
                    padding: isMobile ? '5px 12px' : '6px 16px', borderRadius: 99, fontFamily: 'inherit',
                    border: isActive ? 'none' : '1px solid var(--border-subtle)',
                    backgroundColor: isActive ? (fase === 'Semua' ? 'var(--blue)' : `${c}18`) : 'transparent',
                    color: isActive ? (fase === 'Semua' ? '#fff' : c) : 'var(--text-secondary)',
                    fontSize: isMobile ? 11.5 : 12.5, fontWeight: 600, cursor: 'pointer',
                  }}>
                  {fase === 'Semua' ? 'Semua' : fase === 'Proses Pekerjaan' ? 'Proses' : fase}
                </button>
              )
            })}
          </div>
          {folderDocs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60 }}>Tidak ada foto untuk fase ini.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: isMobile ? 10 : 14 }}>
              {folderDocs.map(doc => renderPhotoCard(doc, folderDocs.indexOf(doc)))}
            </div>
          )}
        </>
      ) : isLevel2 ? (
        /* ── Level 2: Titik folder grid ── */
        renderTitikGrid()
      ) : (
        /* ── Level 1: Program folder grid ── */
        <>
          {renderFilterBar()}
          {mobilePrograms.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60 }}>Belum ada dokumentasi foto.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: isMobile ? 12 : 16 }}>
              {mobilePrograms.map(prog => {
                const progDocs = docs.filter(d => d.program_id === prog.id)
                const cover = getDriveThumbnailUrl(progDocs[0]?.link_foto)
                const statusColor = STATUS_COLORS[prog.status] || 'var(--blue)'
                const titikCount = getDistinctTitik(prog.id).length
                return (
                  <div
                    key={prog.id}
                    onClick={() => openFolder(prog.id)}
                    style={{ backgroundColor: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-subtle)', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.18s, transform 0.18s' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; el.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; el.style.transform = 'translateY(0)' }}
                  >
                    {/* Cover */}
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', backgroundColor: 'var(--surface-raised)', overflow: 'hidden' }}>
                      {cover ? (
                        <img src={cover} alt={prog.nama_pekerjaan} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          onMouseEnter={e => { (e.target as HTMLImageElement).style.transform = 'scale(1.05)' }}
                          onMouseLeave={e => { (e.target as HTMLImageElement).style.transform = 'scale(1)' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="32" height="32" fill="none" stroke="#C8D2E0" strokeWidth="1.5" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                          </svg>
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
                        {progDocs.length} foto
                      </div>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: statusColor }} />
                    </div>
                    {/* Info */}
                    <div style={{ padding: isMobile ? '10px 12px' : '12px 14px' }}>
                      <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.35, marginBottom: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {prog.nama_pekerjaan}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 7px', borderRadius: 99, backgroundColor: `${statusColor}15`, color: statusColor }}>
                          {prog.status}
                        </span>
                        {titikCount > 1 && (
                          <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 7px', borderRadius: 99, backgroundColor: 'rgba(124,58,237,0.08)', color: '#7C3AED' }}>
                            {titikCount} titik
                          </span>
                        )}
                      </div>
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
                  <div style={{ position: 'relative', width: '100%', background: '#111', borderRadius: isMobile ? 0 : '16px 16px 0 0', overflow: 'hidden', aspectRatio: '16/9', maxHeight: isMobile ? 240 : 540 }}>
                    <img src={getDriveThumbnailUrl(doc.link_foto) || ''} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {isMobile ? (
                      /* Mobile: Google Drive iframe doesn't play on iOS — open in Drive */
                      <div
                        style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.45)' }}
                        onClick={e => { e.stopPropagation(); window.open(doc.link_foto, '_blank') }}
                      >
                        <div style={{ width: 68, height: 68, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                          <svg width="26" height="26" fill="#111" viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                        </div>
                        <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, backgroundColor: 'rgba(0,0,0,0.55)', padding: '7px 18px', borderRadius: 24 }}>
                          Tap untuk putar video
                        </div>
                      </div>
                    ) : (
                      /* Desktop: iframe */
                      <>
                        <img src={getDriveThumbnailUrl(doc.link_foto) || ''} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: videoIframeLoaded ? 0 : 1, transition: 'opacity 0.3s' }} />
                        {!videoIframeLoaded && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, pointerEvents: 'none' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            </div>
                            <div style={{ color: '#fff', fontSize: 12, opacity: 0.75, backgroundColor: 'rgba(0,0,0,0.4)', padding: '4px 12px', borderRadius: 20 }}>Memuat video…</div>
                          </div>
                        )}
                        <iframe
                          key={doc.id}
                          src={`https://drive.google.com/file/d/${extractDriveFileId(doc.link_foto)}/preview`}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block', opacity: videoIframeLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
                          allow="autoplay"
                          allowFullScreen
                          onLoad={() => setVideoIframeLoaded(true)}
                        />
                      </>
                    )}
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
                    ← geser untuk navigasi →
                  </div>
                )}
              </div>

              {/* Info section */}
              <div style={{ padding: isMobile ? '14px 16px 18px' : 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{formatTanggal(doc.tanggal)}</div>
                <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>{doc.nama_pekerjaan}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: doc.caption ? 10 : 14 }}>
                  {doc.titik && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, backgroundColor: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>{doc.titik}</span>}
                  {fi && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, backgroundColor: fi.bg, color: fi.color }}>{doc.fase}</span>}
                </div>
                {doc.caption && <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>{doc.caption}</div>}
                <a
                  href={doc.link_foto} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none', backgroundColor: 'var(--blue)', padding: '8px 16px', borderRadius: 9 }}
                >
                  Buka di Google Drive
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            </div>

            {!isMobile && desktopNavBtn('next')}
          </div>
        )
      })()}

      {isAdmin && showAddModal && (
        <AddDocumentationModal programs={programs} onClose={() => setShowAddModal(false)}
          onSuccess={async () => { const { data } = await fetchDocumentation(); if (data) setDocs(data); setShowAddModal(false) }} />
      )}
      {isAdmin && editingDoc && (
        <EditDocumentationModal doc={editingDoc} programs={programs} onClose={() => setEditingDoc(null)}
          onSuccess={async () => { const { data } = await fetchDocumentation(); if (data) setDocs(data); setEditingDoc(null) }} />
      )}
    </div>
  )
}
