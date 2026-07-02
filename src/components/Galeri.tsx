import { useEffect, useState, useRef } from 'react'
import { fetchDocumentation, Documentation, fetchPrograms, Program } from '../lib/supabase'
import { adminDelete } from '../lib/adminApi'
import { formatTanggal, getDriveThumbnailUrl, getDriveViewUrl, STATUS_COLORS } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import AddDocumentationModal from './AddDocumentationModal'
import EditDocumentationModal from './EditDocumentationModal'

interface GaleriProps {
  isAdmin?: boolean
}

const FASE_INFO: Record<string, { color: string; bg: string }> = {
  'Kondisi Awal':     { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  'Proses Pekerjaan': { color: 'var(--blue)', bg: 'rgba(26,111,232,0.1)' },
  'Kondisi Akhir':    { color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  'Dokumentasi':      { color: 'var(--text-secondary)', bg: 'rgba(0,0,0,0.06)' },
}

const FASE_LIST = ['Semua', 'Kondisi Awal', 'Proses Pekerjaan', 'Kondisi Akhir', 'Dokumentasi'] as const

export default function Galeri({ isAdmin = false }: GaleriProps) {
  const width = useWindowWidth()
  const isMobile = width < 900

  const [docs, setDocs] = useState<Documentation[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [filterProgram, setFilterProgram] = useState<string>('Semua')
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [filterFase, setFilterFase] = useState<string>('Semua')
  const [showAddModal, setShowAddModal] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [editingDoc, setEditingDoc] = useState<Documentation | null>(null)
  const [error, setError] = useState('')
  const [showProgramDropdown, setShowProgramDropdown] = useState(false)
  const [programSearch, setProgramSearch] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => { load() }, [])

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

  // Docs that pass the top-level program filter
  const filteredDocs = docs.filter(doc => {
    const prog = programs.find(p => p.id === doc.program_id)
    if (prog?.status === 'Perencanaan') return false
    if (filterProgram !== 'Semua' && doc.program_id !== filterProgram) return false
    return true
  })

  // Docs inside the open folder (mobile), also filtered by fase
  const folderDocs = openFolderId
    ? docs.filter(d => {
        if (d.program_id !== openFolderId) return false
        if (filterFase !== 'Semua' && d.fase !== filterFase) return false
        return true
      })
    : []

  // Docs used for lightbox
  const activeDocs = (isMobile && openFolderId) ? folderDocs : filteredDocs

  const openFolder = (pid: string) => {
    setOpenFolderId(pid)
    setFilterFase('Semua')
    setLightboxIndex(null)
  }
  const closeFolder = () => {
    setOpenFolderId(null)
    setFilterFase('Semua')
    setLightboxIndex(null)
  }

  const selectedProgramName = filterProgram === 'Semua'
    ? 'Pilih Program'
    : programs.find(p => p.id === filterProgram)?.nama_pekerjaan || 'Pilih Program'

  const filteredProgramList = programs
    .filter(p => p.status !== 'Perencanaan' && docs.some(d => d.program_id === p.id))
    .filter(p => p.nama_pekerjaan.toLowerCase().includes(programSearch.toLowerCase()))

  // Desktop: group by program → titik
  const grouped = filteredDocs.reduce((acc, doc) => {
    const pid = doc.program_id
    if (!acc[pid]) acc[pid] = {}
    const titik = doc.titik?.trim() || ''
    if (!acc[pid][titik]) acc[pid][titik] = []
    acc[pid][titik].push(doc)
    return acc
  }, {} as Record<string, Record<string, Documentation[]>>)

  const programOrder = Object.keys(grouped).sort((a, b) => {
    const order = ['Selesai', 'On Going', 'On Hold']
    const sa = programs.find(p => p.id === a)?.status || ''
    const sb = programs.find(p => p.id === b)?.status || ''
    return order.indexOf(sa) - order.indexOf(sb)
  })

  // Mobile: all programs that have docs
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
          {doc.caption && (
            <div className="cap-ov" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(8,18,36,0.82) 0%, transparent 100%)', padding: '28px 10px 10px', opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.88)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{doc.caption}</div>
            </div>
          )}
        </div>
        <div style={{ padding: '8px 10px' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
            {doc.titik && (
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

  // ── Filter bar (shared) ──────────────────────────────────────────
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

  return (
    <div style={{ padding: isMobile ? '16px 14px 48px' : '28px 28px 48px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          {isMobile && openFolderId ? (
            <>
              <button
                onClick={closeFolder}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 6, fontFamily: 'inherit' }}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                Kembali
              </button>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                {programs.find(p => p.id === openFolderId)?.nama_pekerjaan || openFolderId}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '4px 0 0' }}>
                {docs.filter(d => d.program_id === openFolderId).length} foto dokumentasi
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
                Galeri Dokumentasi
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '5px 0 0' }}>
                {loading ? 'Memuat...' : isMobile
                  ? `${mobilePrograms.length} program · ${docs.filter(d => mobilePrograms.some(p => p.id === d.program_id)).length} foto`
                  : `${programOrder.length} program · ${filteredDocs.length} foto`
                }
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

      {/* ── MOBILE ── */}
      {isMobile ? (
        loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60 }}>Memuat...</div>
        ) : openFolderId ? (
          /* Inside folder: fase filter + photo grid */
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {FASE_LIST.map(fase => {
                const isActive = filterFase === fase
                const c = fase === 'Semua' ? 'var(--blue)' : (FASE_INFO[fase]?.color || 'var(--blue)')
                const hasFase = fase === 'Semua' || docs.some(d => d.program_id === openFolderId && d.fase === fase)
                if (!hasFase) return null
                return (
                  <button key={fase} onClick={() => setFilterFase(fase)}
                    style={{
                      padding: '5px 12px', borderRadius: 99, fontFamily: 'inherit',
                      border: isActive ? 'none' : '1px solid var(--border-subtle)',
                      backgroundColor: isActive ? (fase === 'Semua' ? 'var(--blue)' : `${c}18`) : 'transparent',
                      color: isActive ? (fase === 'Semua' ? '#fff' : c) : 'var(--text-secondary)',
                      fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                    }}>
                    {fase === 'Semua' ? 'Semua' : fase === 'Proses Pekerjaan' ? 'Proses' : fase}
                  </button>
                )
              })}
            </div>
            {folderDocs.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60 }}>Tidak ada foto untuk fase ini.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {folderDocs.map(doc => renderPhotoCard(doc, folderDocs.indexOf(doc)))}
              </div>
            )}
          </>
        ) : (
          /* Folder grid */
          <>
            {renderFilterBar()}
            {mobilePrograms.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60 }}>Belum ada dokumentasi foto.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {mobilePrograms.map(prog => {
                  const progDocs = docs.filter(d => d.program_id === prog.id)
                  const cover = getDriveThumbnailUrl(progDocs[0]?.link_foto)
                  const statusColor = STATUS_COLORS[prog.status] || 'var(--blue)'
                  return (
                    <div
                      key={prog.id}
                      onClick={() => openFolder(prog.id)}
                      style={{ backgroundColor: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-subtle)', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.18s' }}
                    >
                      {/* Cover */}
                      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', backgroundColor: 'var(--surface-raised)', overflow: 'hidden' }}>
                        {cover ? (
                          <img src={cover} alt={prog.nama_pekerjaan} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="28" height="28" fill="none" stroke="#C8D2E0" strokeWidth="1.5" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                            </svg>
                          </div>
                        )}
                        {/* N foto badge */}
                        <div style={{ position: 'absolute', bottom: 7, right: 7, backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                          {progDocs.length} foto
                        </div>
                        {/* Status stripe */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: statusColor }} />
                      </div>
                      {/* Info */}
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.35, marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {prog.nama_pekerjaan}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{prog.id}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, backgroundColor: `${statusColor}15`, color: statusColor }}>
                            {prog.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )
      ) : (
        /* ── DESKTOP: flat grouped grid ── */
        <>
          {renderFilterBar()}
          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <svg width="48" height="48" fill="none" stroke="#ccc" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
              </svg>
              <p style={{ margin: 0 }}>{docs.length > 0 ? 'Tidak ada foto untuk filter ini.' : 'Belum ada dokumentasi foto.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {programOrder.map((pid, progIdx) => {
                const prog = programs.find(p => p.id === pid)
                const titikGroups = grouped[pid]
                const titikKeys = Object.keys(titikGroups).sort()
                const hasNamedTitik = titikKeys.some(t => t !== '')
                const totalFotos = Object.values(titikGroups).reduce((s, d) => s + d.length, 0)
                return (
                  <div key={pid}>
                    {progIdx > 0 && <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '28px 0' }} />}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{prog?.nama_pekerjaan || pid}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{totalFotos} foto</span>
                      </div>
                      {prog?.id && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{prog.id}</div>}
                    </div>
                    {hasNamedTitik ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {titikKeys.map(titik => {
                          const titikDocs = titikGroups[titik]
                          return (
                            <div key={titik}>
                              {titik && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                  <div style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: '#7C3AED', flexShrink: 0 }} />
                                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{titik}</span>
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{titikDocs.length} foto</span>
                                </div>
                              )}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                                {titikDocs.map(doc => renderPhotoCard(doc, filteredDocs.indexOf(doc)))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                        {(titikGroups[''] || []).map(doc => renderPhotoCard(doc, filteredDocs.indexOf(doc)))}
                      </div>
                    )}
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
        const navBtn = (disabled: boolean, onClick: () => void, children: React.ReactNode) => (
          <button onClick={onClick} disabled={disabled}
            style={{ backgroundColor: disabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', width: 44, height: 44, borderRadius: 50, cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.25 : 1, zIndex: 102, fontFamily: 'inherit' }}
            onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.32)' }}
            onMouseLeave={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.18)' }}
          >{children}</button>
        )
        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: isMobile ? '0' : '16px 72px' }}
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
            {!isMobile && (
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 102 }} onClick={e => e.stopPropagation()}>
                {navBtn(!hasPrev, () => setLightboxIndex(i => i !== null ? i - 1 : null),
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>)}
              </div>
            )}
            <div style={{ backgroundColor: 'var(--card)', borderRadius: isMobile ? 0 : 16, maxWidth: isMobile ? '100%' : 880, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setLightboxIndex(null)}
                style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 50, cursor: 'pointer', fontSize: 16, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>✕</button>
              <div style={{ position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, zIndex: 101 }}>
                {lightboxIndex + 1} / {activeDocs.length}
              </div>
              {getDriveViewUrl(doc.link_foto) && (
                <img src={getDriveViewUrl(doc.link_foto) || ''} alt={doc.caption || ''}
                  style={{ width: '100%', maxHeight: 620, objectFit: 'cover', display: 'block', borderRadius: isMobile ? 0 : '16px 16px 0 0' }} />
              )}
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{formatTanggal(doc.tanggal)}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: '-0.02em' }}>{doc.nama_pekerjaan}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {doc.titik && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, backgroundColor: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>{doc.titik}</span>}
                  {fi && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, backgroundColor: fi.bg, color: fi.color }}>{doc.fase}</span>}
                </div>
                {doc.caption && <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{doc.caption}</div>}
                <a href={doc.link_foto} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: 13, fontWeight: 600, color: 'var(--blue)', textDecoration: 'none' }}>
                  Buka di Google Drive →
                </a>
              </div>
            </div>
            {!isMobile && (
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 102 }} onClick={e => e.stopPropagation()}>
                {navBtn(!hasNext, () => setLightboxIndex(i => i !== null ? i + 1 : null),
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>)}
              </div>
            )}
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
