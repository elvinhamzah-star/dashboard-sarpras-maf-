import { useEffect, useState, useRef } from 'react'
import { fetchDocumentation, Documentation, fetchPrograms, Program } from '../lib/supabase'
import { adminDelete } from '../lib/adminApi'
import { formatTanggal, getDriveThumbnailUrl, getDriveViewUrl, STATUS_COLORS, STATUS_BG, getEffectiveProgress } from '../lib/data'
import AddDocumentationModal from './AddDocumentationModal'
import EditDocumentationModal from './EditDocumentationModal'

interface GaleriProps {
  isAdmin?: boolean
  selectedMonth?: string | null
  onMonthChange?: (ym: string | null) => void
}

const FASE_INFO: Record<string, { color: string; bg: string; short: string }> = {
  'Kondisi Awal':    { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', short: 'Awal' },
  'Proses Pekerjaan':{ color: 'var(--blue)', bg: 'rgba(26,111,232,0.08)', short: 'Proses' },
  'Kondisi Akhir':   { color: '#059669', bg: 'rgba(5,150,105,0.08)', short: 'Akhir' },
}

const FASE_LIST = ['Semua', 'Kondisi Awal', 'Proses Pekerjaan', 'Kondisi Akhir'] as const

export default function Galeri({ isAdmin = false }: GaleriProps) {
  const [docs, setDocs] = useState<Documentation[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [filterProgram, setFilterProgram] = useState<string>('Semua')
  const [filterFase, setFilterFase] = useState<string>('Semua')
  const [filterStatus, setFilterStatus] = useState<string>('Semua')
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
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
      const [docsResult, progsResult] = await Promise.all([
        fetchDocumentation(),
        fetchPrograms(),
      ])
      if (docsResult.error) {
        setError('Tabel dokumentasi belum dibuat. Hubungi admin untuk setup database atau buat table di Supabase.')
      } else if (docsResult.data) {
        setDocs(docsResult.data)
      }
      if (progsResult.data) setPrograms(progsResult.data)
    } catch {
      setError('Terjadi kesalahan memuat galeri. Pastikan tabel documentation sudah dibuat di Supabase.')
    }
    setLoading(false)
  }

  // Level 1: filtered docs (for folder grid) — Perencanaan dikecualikan
  const filteredDocs = docs.filter(doc => {
    const prog = programs.find(p => p.id === doc.program_id)
    if (prog?.status === 'Perencanaan') return false
    if (filterProgram !== 'Semua' && doc.program_id !== filterProgram) return false
    if (filterStatus !== 'Semua' && prog?.status !== filterStatus) return false
    return true
  })

  // Level 2: docs inside the open folder
  const openFolderDocs = openFolderId
    ? docs.filter(doc => {
        if (doc.program_id !== openFolderId) return false
        if (filterFase !== 'Semua' && doc.fase !== filterFase) return false
            return true
      })
    : []

  const openFolderProgram = openFolderId ? programs.find(p => p.id === openFolderId) : null

  const docsByProgram = filteredDocs.reduce((acc, doc) => {
    const prog = programs.find(p => p.id === doc.program_id)
    const progName = prog?.nama_pekerjaan || doc.program_id
    if (!acc[progName]) acc[progName] = { program_id: doc.program_id, items: [] }
    acc[progName].items.push(doc)
    return acc
  }, {} as Record<string, { program_id: string; items: Documentation[] }>)

  const activeDocs = openFolderId ? openFolderDocs : filteredDocs

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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus dokumentasi ini?')) return
    const { error: err } = await adminDelete('documentation', id)
    if (err) alert('Gagal menghapus: ' + err.message)
    else setDocs(docs.filter(d => d.id !== id))
  }

  const selectedProgramName = filterProgram === 'Semua'
    ? 'Semua Program'
    : programs.find(p => p.id === filterProgram)?.nama_pekerjaan || 'Semua Program'

  const filteredProgramList = programs.filter(p =>
    p.nama_pekerjaan.toLowerCase().includes(programSearch.toLowerCase())
  )

  const handleOpenFolder = (programId: string) => {
    setOpenFolderId(programId)
    setFilterFase('Semua')
    setLightboxIndex(null)
  }

  const handleCloseFolder = () => {
    setOpenFolderId(null)
    setFilterFase('Semua')
    setLightboxIndex(null)
  }

  return (
    <div style={{ padding: '28px 28px 48px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          {openFolderId ? (
            <>
              <div style={{ marginBottom: 4 }}>
                <button
                  onClick={handleCloseFolder}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    color: 'var(--text-secondary)', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    padding: 0, letterSpacing: '-0.01em',
                    transition: 'color 0.15s', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--blue)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  Kembali ke Galeri
                </button>
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
                {openFolderProgram?.nama_pekerjaan || openFolderId}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0' }}>
                {docs.filter(d => d.program_id === openFolderId).length} foto dokumentasi
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
                Galeri Dokumentasi Pekerjaan
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '5px 0 0' }}>
                {loading ? 'Memuat...' : `${Object.keys(docsByProgram).length} folder · ${filteredDocs.length} foto`}
              </p>
            </>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '9px 18px', borderRadius: 10, border: 'none',
              backgroundColor: 'var(--blue)', color: 'var(--card)', fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center',
              gap: 7, letterSpacing: '-0.01em',
              boxShadow: '0 1px 3px rgba(26,111,232,0.3), 0 4px 12px rgba(26,111,232,0.2)',
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--blue)' }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Dokumentasi
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {openFolderId ? (
          // Level 2: fase filter + month
          <>
            <div style={{ display: 'flex', gap: 6 }}>
              {FASE_LIST.map(fase => {
                const isActive = filterFase === fase
                const c = fase === 'Semua' ? 'var(--blue)' : (FASE_INFO[fase]?.color || 'var(--blue)')
                return (
                  <button
                    key={fase}
                    onClick={() => setFilterFase(fase)}
                    style={{
                      padding: '6px 13px', borderRadius: 8, fontFamily: 'inherit',
                      border: isActive ? 'none' : '1px solid var(--border)',
                      backgroundColor: isActive ? (fase === 'Semua' ? 'var(--blue)' : `${c}18`) : 'transparent',
                      color: isActive ? (fase === 'Semua' ? '#fff' : c) : 'var(--text-secondary)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.13s',
                    }}
                  >
                    {fase === 'Semua' ? 'Semua Fase' : fase}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          // Level 1: status tabs + program dropdown
          <>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['Semua', 'On Going', 'On Hold', 'Selesai'] as const).map(s => {
                const isActive = filterStatus === s
                const c = s === 'Semua' ? 'var(--blue)' : (STATUS_COLORS[s] || 'var(--blue)')
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    style={{
                      padding: '6px 13px', borderRadius: 8, fontFamily: 'inherit',
                      border: isActive ? 'none' : '1px solid var(--border)',
                      backgroundColor: isActive ? (s === 'Semua' ? 'var(--blue)' : `${c}18`) : 'transparent',
                      color: isActive ? (s === 'Semua' ? '#fff' : c) : 'var(--text-secondary)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.13s',
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>

            {/* Program filter dropdown */}
            <div ref={dropdownRef}>
              <button
                ref={triggerRef}
                type="button"
                onClick={() => showProgramDropdown ? (setShowProgramDropdown(false), setProgramSearch('')) : openProgramDropdown()}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontFamily: 'inherit',
                  border: `1px solid ${showProgramDropdown ? 'var(--blue)' : 'var(--border)'}`,
                  backgroundColor: filterProgram !== 'Semua' ? 'rgba(26,111,232,0.06)' : 'var(--card)',
                  color: filterProgram !== 'Semua' ? 'var(--blue)' : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: showProgramDropdown ? '0 0 0 3px rgba(26,111,232,0.12)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M4 6h16M7 12h10M10 18h4"/>
                </svg>
                <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedProgramName}
                </span>
                <svg width="11" height="11" fill="none" stroke="#9CAABB" strokeWidth="2.5" viewBox="0 0 24 24"
                  style={{ transform: showProgramDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {showProgramDropdown && (
                <div style={{
                  position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width,
                  zIndex: 200, backgroundColor: 'var(--card)', borderRadius: 12,
                  border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(13,24,41,0.14)', overflow: 'hidden',
                }}>
                  <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ position: 'relative' }}>
                      <svg width="13" height="13" fill="none" stroke="#9CAABB" strokeWidth="2" viewBox="0 0 24 24"
                        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <input
                        ref={searchRef}
                        type="text"
                        value={programSearch}
                        onChange={e => setProgramSearch(e.target.value)}
                        placeholder="Cari program..."
                        style={{
                          width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8,
                          border: '1px solid var(--border-subtle)', fontSize: 12.5,
                          color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none',
                          boxSizing: 'border-box', backgroundColor: 'var(--surface-raised)',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                    <button type="button"
                      onClick={() => { setFilterProgram('Semua'); setShowProgramDropdown(false); setProgramSearch('') }}
                      style={{
                        width: '100%', padding: '10px 14px', border: 'none',
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: filterProgram === 'Semua' ? 'rgba(26,111,232,0.06)' : 'transparent',
                        color: filterProgram === 'Semua' ? 'var(--blue)' : 'var(--text-primary)',
                        fontSize: 13, fontWeight: filterProgram === 'Semua' ? 600 : 500,
                        fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                      onMouseEnter={e => { if (filterProgram !== 'Semua') (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-min)' }}
                      onMouseLeave={e => { if (filterProgram !== 'Semua') (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                    >
                      {filterProgram === 'Semua' && <svg width="13" height="13" fill="none" stroke="#1A6FE8" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>}
                      <span style={{ marginLeft: filterProgram === 'Semua' ? 0 : 21 }}>Semua Program</span>
                    </button>
                    {filteredProgramList.length === 0 ? (
                      <div style={{ padding: '16px 14px', fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>Tidak ada hasil</div>
                    ) : filteredProgramList.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setFilterProgram(p.id); setShowProgramDropdown(false); setProgramSearch('') }}
                        style={{
                          width: '100%', padding: '10px 14px', border: 'none', borderBottom: 'none',
                          backgroundColor: filterProgram === p.id ? 'rgba(26,111,232,0.06)' : 'transparent',
                          color: filterProgram === p.id ? 'var(--blue)' : 'var(--text-primary)',
                          fontSize: 13, fontWeight: filterProgram === p.id ? 600 : 400,
                          fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        onMouseEnter={e => { if (filterProgram !== p.id) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-min)' }}
                        onMouseLeave={e => { if (filterProgram !== p.id) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                      >
                        {filterProgram === p.id && <svg width="13" height="13" fill="none" stroke="#1A6FE8" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: filterProgram === p.id ? 0 : 21 }}>
                          {p.nama_pekerjaan}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#E53E3E', fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* ── CONTENT ─────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60 }}>Memuat galeri...</div>

      ) : openFolderId ? (
        /* ── Level 2: foto per fase ── */
        openFolderDocs.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <svg width="48" height="48" fill="none" stroke="#ccc" strokeWidth="1.5" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
            <p style={{ margin: 0 }}>Tidak Ada Foto Untuk Filter Ini.</p>
            <button
              onClick={() => { setFilterFase('Semua') }}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(26,111,232,0.3)', backgroundColor: 'rgba(26,111,232,0.06)', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Lihat semua fase
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {(['Kondisi Awal', 'Proses Pekerjaan', 'Kondisi Akhir'] as const).map(fase => {
              const phaseItems = openFolderDocs.filter(item => item.fase === fase || !item.fase)
              if (phaseItems.length === 0) return null
              const fi = FASE_INFO[fase]
              return (
                <div key={fase}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    marginBottom: 16, paddingBottom: 12,
                    borderBottom: `2px solid ${fi.color}22`,
                  }}>
                    <div style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: fi.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      {fase}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: fi.color,
                      backgroundColor: fi.bg, padding: '2px 9px', borderRadius: 20,
                    }}>
                      {phaseItems.length} foto
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                    {phaseItems.map(doc => {
                      const thumbUrl = getDriveThumbnailUrl(doc.link_foto)
                      return (
                        <div
                          key={doc.id}
                          style={{
                            position: 'relative', borderRadius: 12, overflow: 'hidden',
                            backgroundColor: 'var(--surface-raised)',
                            border: '1px solid var(--border-subtle)',
                            cursor: 'pointer', transition: 'box-shadow 0.22s, transform 0.22s',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          }}
                          onMouseEnter={e => {
                            const el = e.currentTarget as HTMLDivElement
                            el.style.boxShadow = '0 10px 28px rgba(8,88,176,0.16)'
                            el.style.transform = 'translateY(-3px)'
                            const img = el.querySelector('img') as HTMLImageElement | null
                            if (img) img.style.transform = 'scale(1.06)'
                            const overlay = el.querySelector('.galeri-caption-overlay') as HTMLElement | null
                            if (overlay) overlay.style.opacity = '1'
                            const actions = el.querySelector('.galeri-admin-actions') as HTMLElement | null
                            if (actions) actions.style.opacity = '1'
                          }}
                          onMouseLeave={e => {
                            const el = e.currentTarget as HTMLDivElement
                            el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
                            el.style.transform = 'translateY(0)'
                            const img = el.querySelector('img') as HTMLImageElement | null
                            if (img) img.style.transform = 'scale(1)'
                            const overlay = el.querySelector('.galeri-caption-overlay') as HTMLElement | null
                            if (overlay) overlay.style.opacity = '0'
                            const actions = el.querySelector('.galeri-admin-actions') as HTMLElement | null
                            if (actions) actions.style.opacity = '0'
                          }}
                          onClick={() => setLightboxIndex(openFolderDocs.indexOf(doc))}
                        >
                          <div style={{ width: '100%', height: 220, backgroundColor: 'var(--surface-raised)', overflow: 'hidden', position: 'relative' }}>
                            {thumbUrl ? (
                              <img src={thumbUrl} alt={doc.caption}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.35s ease', display: 'block' }}
                                onError={e => {
                                  const img = e.target as HTMLImageElement
                                  img.style.display = 'none'
                                  const placeholder = img.nextElementSibling as HTMLElement | null
                                  if (placeholder) placeholder.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div style={{ width: '100%', height: '100%', display: thumbUrl ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                              <svg width="32" height="32" fill="none" stroke="#C8D2E0" strokeWidth="1.5" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <path d="M21 15l-5-5L5 21"/>
                              </svg>
                              <span style={{ fontSize: 10, color: '#C8D2E0', fontWeight: 500 }}>Foto tidak tersedia</span>
                            </div>
                            <div
                              className="galeri-caption-overlay"
                              style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                background: 'linear-gradient(to top, rgba(8,18,36,0.84) 0%, rgba(8,18,36,0.45) 55%, transparent 100%)',
                                padding: '40px 12px 12px',
                                opacity: 0, transition: 'opacity 0.22s', pointerEvents: 'none',
                              }}
                            >
                              <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.6)', marginBottom: 3, fontWeight: 500 }}>
                                {formatTanggal(doc.tanggal)}
                              </div>
                              {doc.caption && (
                                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.92)', lineHeight: 1.35, fontWeight: 500, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                  {doc.caption}
                                </div>
                              )}
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="galeri-admin-actions" style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 5, opacity: 0, transition: 'opacity 0.2s' }}>
                              <div style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'var(--card)', width: 28, height: 28, borderRadius: 50, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                                onClick={e => { e.stopPropagation(); setEditingDoc(doc) }} role="button" title="Edit">✏️</div>
                              <div style={{ backgroundColor: 'rgba(220,38,38,0.7)', color: 'var(--card)', width: 28, height: 28, borderRadius: 50, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                                onClick={e => { e.stopPropagation(); handleDelete(doc.id) }} role="button" title="Hapus">✕</div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )

      ) : filteredDocs.length === 0 ? (
        /* ── Level 1 empty state ── */
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <svg width="48" height="48" fill="none" stroke="#ccc" strokeWidth="1.5" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
          {docs.length > 0 ? (
            <>
              <p style={{ margin: 0 }}>Tidak Ada Foto Untuk Filter Ini.</p>
              <button
                onClick={() => { setFilterProgram('Semua') }}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(26,111,232,0.3)', backgroundColor: 'rgba(26,111,232,0.06)', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Lihat semua foto
              </button>
            </>
          ) : (
            <p style={{ margin: 0 }}>Belum Ada Dokumentasi Foto.</p>
          )}
        </div>

      ) : (() => {
        /* ── Level 1: folder grid, grouped by status ── */
        const STATUS_ORDER = ['Selesai', 'On Going', 'On Hold'] as const
        const sortedEntries = Object.entries(docsByProgram).sort(([, a], [, b]) => {
          const pctA = getEffectiveProgress(programs.find(p => p.id === a.program_id) as Parameters<typeof getEffectiveProgress>[0] ?? { jenis_pekerjaan: '', progress_percent: 0, total_anggaran: 0, realisasi_terkini: 0 })
          const pctB = getEffectiveProgress(programs.find(p => p.id === b.program_id) as Parameters<typeof getEffectiveProgress>[0] ?? { jenis_pekerjaan: '', progress_percent: 0, total_anggaran: 0, realisasi_terkini: 0 })
          return pctB - pctA
        })

        const renderCard = (progName: string, program_id: string, items: Documentation[]) => {
          const prog = programs.find(p => p.id === program_id)
          const coverThumb = getDriveThumbnailUrl(items[0]?.link_foto)
          const statusColor = STATUS_COLORS[prog?.status || ''] || 'var(--blue)'
          const pct = prog ? getEffectiveProgress(prog) : 0
          return (
            <div
              key={progName}
              onClick={() => handleOpenFolder(program_id)}
              style={{
                backgroundColor: 'var(--card)', borderRadius: 14,
                border: '1px solid var(--border-subtle)', overflow: 'hidden',
                cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                el.style.transform = 'translateY(-3px)'
                const img = el.querySelector('img') as HTMLImageElement | null
                if (img) img.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
                el.style.transform = 'translateY(0)'
                const img = el.querySelector('img') as HTMLImageElement | null
                if (img) img.style.transform = 'scale(1)'
              }}
            >
              <div style={{ height: 180, backgroundColor: 'var(--surface-raised)', overflow: 'hidden', position: 'relative' }}>
                {coverThumb ? (
                  <img src={coverThumb} alt={progName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.35s ease', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="36" height="36" fill="none" stroke="#C8D2E0" strokeWidth="1.5" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
                  {items.length} foto
                </div>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: statusColor }} />
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: 3 }}>
                  {progName}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{prog?.id}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 3, backgroundColor: 'var(--surface-2)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: statusColor, borderRadius: 10 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                </div>
              </div>
            </div>
          )
        }

        if (filterStatus !== 'Semua') {
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {sortedEntries.map(([progName, { program_id, items }]) => renderCard(progName, program_id, items))}
            </div>
          )
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {STATUS_ORDER.map(status => {
              const entries = sortedEntries.filter(([, { program_id }]) =>
                programs.find(p => p.id === program_id)?.status === status
              )
              if (entries.length === 0) return null
              const color = STATUS_COLORS[status] || 'var(--blue)'
              return (
                <div key={status}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${color}22` }}>
                    <div style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{status}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                    {entries.map(([progName, { program_id, items }]) => renderCard(progName, program_id, items))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ── Lightbox (Level 2 only) ── */}
      {lightboxIndex !== null && openFolderId && activeDocs[lightboxIndex] && (() => {
        const doc = activeDocs[lightboxIndex]
        const hasPrev = lightboxIndex > 0
        const hasNext = lightboxIndex < activeDocs.length - 1
        const navBtn = (disabled: boolean, onClick: () => void, children: React.ReactNode) => (
          <button
            onClick={onClick}
            disabled={disabled}
            style={{
              backgroundColor: disabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.18)',
              border: 'none', color: 'var(--card)', width: 44, height: 44, borderRadius: 50,
              cursor: disabled ? 'default' : 'pointer', fontSize: 20, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              opacity: disabled ? 0.25 : 1, transition: 'background 0.15s, opacity 0.15s',
              backdropFilter: 'blur(4px)', zIndex: 102,
            }}
            onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.32)' }}
            onMouseLeave={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.18)' }}
          >
            {children}
          </button>
        )
        return (
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px 72px' }}
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
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 102 }} onClick={e => e.stopPropagation()}>
              {navBtn(!hasPrev, () => setLightboxIndex(i => i !== null ? i - 1 : null),
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
              )}
            </div>

            <div
              style={{ backgroundColor: 'var(--card)', borderRadius: 16, maxWidth: 880, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setLightboxIndex(null)}
                style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', border: 'none', color: 'var(--card)', width: 36, height: 36, borderRadius: 50, cursor: 'pointer', fontSize: 16, zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
              <div style={{ position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', color: 'var(--card)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, zIndex: 101 }}>
                {lightboxIndex + 1} / {activeDocs.length}
              </div>
              {getDriveViewUrl(doc.link_foto) && (
                <img
                  src={getDriveViewUrl(doc.link_foto) || ''}
                  alt={doc.caption || ''}
                  style={{ width: '100%', maxHeight: 620, objectFit: 'cover', display: 'block', borderRadius: '16px 16px 0 0' }}
                />
              )}
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{formatTanggal(doc.tanggal)}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: '-0.02em' }}>{doc.nama_pekerjaan}</div>
                {doc.fase && FASE_INFO[doc.fase] && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, marginBottom: 12, backgroundColor: FASE_INFO[doc.fase].bg, borderLeft: `3px solid ${FASE_INFO[doc.fase].color}` }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: FASE_INFO[doc.fase].color }}>{doc.fase}</span>
                  </div>
                )}
                {doc.caption && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{doc.caption}</div>
                )}
                <a href={doc.link_foto} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', fontSize: 13, fontWeight: 600, color: 'var(--blue)', textDecoration: 'none' }}>
                  Buka di Google Drive →
                </a>
              </div>
            </div>

            <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 102 }} onClick={e => e.stopPropagation()}>
              {navBtn(!hasNext, () => setLightboxIndex(i => i !== null ? i + 1 : null),
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
              )}
            </div>
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
