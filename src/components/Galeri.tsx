import { useEffect, useState, useRef } from 'react'
import { fetchDocumentation, Documentation, fetchPrograms, Program } from '../lib/supabase'
import { adminDelete } from '../lib/adminApi'
import { formatTanggal, getDriveThumbnailUrl } from '../lib/data'
import AddDocumentationModal from './AddDocumentationModal'
import EditDocumentationModal from './EditDocumentationModal'

interface GaleriProps {
  isAdmin?: boolean
}

const FASE_INFO: Record<string, { color: string; bg: string }> = {
  'Kondisi Awal':    { color: '#DC2626', bg: 'rgba(220,38,38,0.06)' },
  'Proses Pekerjaan':{ color: '#1A6FE8', bg: 'rgba(26,111,232,0.06)' },
  'Kondisi Akhir':   { color: '#059669', bg: 'rgba(5,150,105,0.06)' },
}

const FASE_LIST = ['Semua', 'Kondisi Awal', 'Proses Pekerjaan', 'Kondisi Akhir'] as const

export default function Galeri({ isAdmin = false }: GaleriProps) {
  const [docs, setDocs] = useState<Documentation[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [filterProgram, setFilterProgram] = useState<string>('Semua')
  const [filterFase, setFilterFase] = useState<string>('Semua')
  const [showAddModal, setShowAddModal] = useState(false)
  const [lightboxDoc, setLightboxDoc] = useState<Documentation | null>(null)
  const [editingDoc, setEditingDoc] = useState<Documentation | null>(null)
  const [error, setError] = useState('')
  const [showProgramDropdown, setShowProgramDropdown] = useState(false)
  const [programSearch, setProgramSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  const filteredDocs = docs.filter(doc => {
    if (filterProgram !== 'Semua' && doc.program_id !== filterProgram) return false
    if (filterFase !== 'Semua' && doc.fase !== filterFase) return false
    return true
  })

  const docsByProgram = filteredDocs.reduce((acc, doc) => {
    const prog = programs.find(p => p.id === doc.program_id)
    const progName = prog?.nama_pekerjaan || doc.program_id
    if (!acc[progName]) acc[progName] = { program_id: doc.program_id, items: [] }
    acc[progName].items.push(doc)
    return acc
  }, {} as Record<string, { program_id: string; items: Documentation[] }>)

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

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F1C2E', margin: 0, letterSpacing: '-0.03em' }}>Galeri Dokumentasi</h1>
          <p style={{ color: '#5C6B82', fontSize: 13, margin: '5px 0 0', fontWeight: 400 }}>
            {loading ? 'Memuat...' : `${filteredDocs.length} dokumentasi`}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '9px 18px', borderRadius: 10, border: 'none',
              backgroundColor: '#1A6FE8', color: '#fff', fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center',
              gap: 7, letterSpacing: '-0.01em',
              boxShadow: '0 1px 3px rgba(26,111,232,0.3), 0 4px 12px rgba(26,111,232,0.2)',
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A6FE8' }}
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

        {/* Custom Program Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => { setShowProgramDropdown(v => !v); setProgramSearch('') }}
            style={{
              padding: '9px 13px', borderRadius: 10,
              border: showProgramDropdown ? '1px solid #1A6FE8' : '1px solid rgba(15,23,42,0.13)',
              backgroundColor: '#fff', fontSize: 12.5, cursor: 'pointer',
              color: filterProgram === 'Semua' ? '#5C6B82' : '#0F1C2E',
              fontWeight: filterProgram === 'Semua' ? 500 : 600,
              display: 'flex', alignItems: 'center', gap: 8,
              minWidth: 180, maxWidth: 240, fontFamily: 'inherit',
              boxShadow: showProgramDropdown ? '0 0 0 3px rgba(26,111,232,0.12)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, color: '#9CAABB' }}>
              <path d="M3 3h18v4L13 13v8l-2-1v-7L3 7V3z"/>
            </svg>
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedProgramName}
            </span>
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
              style={{ transform: showProgramDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0, color: '#9CAABB' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showProgramDropdown && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30,
              backgroundColor: '#fff', borderRadius: 12,
              border: '1px solid rgba(15,23,42,0.1)',
              boxShadow: '0 8px 28px rgba(15,23,42,0.13)',
              minWidth: 240, maxWidth: 320, overflow: 'hidden',
            }}>
              <div style={{ padding: '10px 10px 8px' }}>
                <input
                  autoFocus
                  placeholder="Cari program..."
                  value={programSearch}
                  onChange={e => setProgramSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 8,
                    border: '1px solid rgba(15,23,42,0.1)', fontSize: 12,
                    color: '#0F1C2E', outline: 'none', fontFamily: 'inherit',
                    backgroundColor: 'rgba(15,23,42,0.03)', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                <button
                  onClick={() => { setFilterProgram('Semua'); setShowProgramDropdown(false); setProgramSearch('') }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '9px 14px',
                    border: 'none', borderBottom: '1px solid rgba(15,23,42,0.06)',
                    backgroundColor: filterProgram === 'Semua' ? 'rgba(26,111,232,0.07)' : 'transparent',
                    color: filterProgram === 'Semua' ? '#1A6FE8' : '#0F1C2E',
                    fontWeight: filterProgram === 'Semua' ? 700 : 500,
                    fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Semua Program
                </button>
                {filteredProgramList.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setFilterProgram(p.id); setShowProgramDropdown(false); setProgramSearch('') }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '9px 14px',
                      border: 'none', borderBottom: '1px solid rgba(15,23,42,0.04)',
                      backgroundColor: filterProgram === p.id ? 'rgba(26,111,232,0.07)' : 'transparent',
                      color: filterProgram === p.id ? '#1A6FE8' : '#5C6B82',
                      fontWeight: filterProgram === p.id ? 700 : 400,
                      fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {p.nama_pekerjaan}
                  </button>
                ))}
                {filteredProgramList.length === 0 && (
                  <div style={{ padding: '14px', fontSize: 12, color: '#9CAABB', textAlign: 'center' }}>
                    Tidak ditemukan
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fase Filter Tabs */}
        <div style={{ display: 'flex', gap: 7 }}>
          {FASE_LIST.map(fase => {
            const isActive = filterFase === fase
            const activeColor = fase === 'Semua' ? '#1A6FE8' : (FASE_INFO[fase]?.color || '#1A6FE8')
            return (
              <button
                key={fase}
                onClick={() => setFilterFase(fase)}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontFamily: 'inherit',
                  border: isActive ? 'none' : '1px solid rgba(15,23,42,0.13)',
                  backgroundColor: isActive ? activeColor : '#fff',
                  color: isActive ? '#fff' : '#6B7A99',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {fase === 'Semua' ? 'Semua Fase' : fase}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#991b1b', fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#6B7A99', paddingTop: 60 }}>Memuat galeri...</div>
      ) : filteredDocs.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#6B7A99', paddingTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <svg width="48" height="48" fill="none" stroke="#ccc" strokeWidth="1.5" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
          <p style={{ margin: 0 }}>Belum ada dokumentasi foto.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(docsByProgram).map(([progName, { items }]) => (
            <div
              key={progName}
              style={{
                backgroundColor: '#fff',
                borderRadius: 14,
                border: '1px solid rgba(15,23,42,0.07)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}
            >
              {/* Program Header */}
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid rgba(15,23,42,0.06)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  backgroundColor: 'rgba(15,23,42,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="14" height="14" fill="none" stroke="#5C6B82" strokeWidth="1.75" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F1C2E', letterSpacing: '-0.02em', flex: 1 }}>
                  {progName}
                </span>
                <span style={{ fontSize: 11, color: '#9CAABB', fontWeight: 500, flexShrink: 0 }}>
                  {items.length} foto
                </span>
              </div>

              {/* Fase sections */}
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {(['Kondisi Awal', 'Proses Pekerjaan', 'Kondisi Akhir'] as const).map(fase => {
                  const phaseItems = items.filter(item => item.fase === fase || !item.fase)
                  if (phaseItems.length === 0) return null
                  const fi = FASE_INFO[fase]

                  return (
                    <div key={fase}>
                      {/* Phase Header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 14px',
                        backgroundColor: fi.bg,
                        borderLeft: `3px solid ${fi.color}`,
                        borderRadius: '0 8px 8px 0',
                        marginBottom: 14,
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0F1C2E', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                          {fase}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: fi.color,
                          backgroundColor: `${fi.color}20`,
                          padding: '2px 9px', borderRadius: 20,
                        }}>
                          {phaseItems.length}
                        </span>
                      </div>

                      {/* Photo Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                        {phaseItems.map(doc => {
                          const thumbUrl = getDriveThumbnailUrl(doc.link_foto)
                          return (
                            <div
                              key={doc.id}
                              style={{
                                position: 'relative', borderRadius: 12, overflow: 'hidden',
                                backgroundColor: '#F5F7FA',
                                border: '1px solid rgba(15,23,42,0.07)',
                                cursor: 'pointer', transition: 'all 0.2s',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                              }}
                              onMouseEnter={e => {
                                const el = e.currentTarget as HTMLDivElement
                                el.style.boxShadow = '0 8px 24px rgba(8,88,176,0.15)'
                                el.style.transform = 'translateY(-3px)';
                                (el.querySelector('.galeri-admin-actions') as HTMLElement | null)?.style && ((el.querySelector('.galeri-admin-actions') as HTMLElement).style.opacity = '1')
                              }}
                              onMouseLeave={e => {
                                const el = e.currentTarget as HTMLDivElement
                                el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
                                el.style.transform = 'translateY(0)';
                                (el.querySelector('.galeri-admin-actions') as HTMLElement | null)?.style && ((el.querySelector('.galeri-admin-actions') as HTMLElement).style.opacity = '0')
                              }}
                              onClick={() => setLightboxDoc(doc)}
                            >
                              <div style={{ width: '100%', height: 170, backgroundColor: '#F5F7FA', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {thumbUrl ? (
                                  <img src={thumbUrl} alt={doc.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                ) : (
                                  <svg width="36" height="36" fill="none" stroke="#ccc" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <path d="M21 15l-5-5L5 21"/>
                                  </svg>
                                )}
                              </div>
                              <div style={{ padding: '10px 12px' }}>
                                <div style={{ fontSize: 10.5, color: '#9CAABB', marginBottom: 3 }}>{formatTanggal(doc.tanggal)}</div>
                                {doc.caption && (
                                  <div style={{ fontSize: 11.5, color: '#0F1C2E', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {doc.caption}
                                  </div>
                                )}
                              </div>
                              {isAdmin && (
                                <div className="galeri-admin-actions" style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 5, opacity: 0, transition: 'opacity 0.2s' }}>
                                  <div style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', width: 28, height: 28, borderRadius: 50, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                                    onClick={e => { e.stopPropagation(); setEditingDoc(doc) }} role="button" title="Edit">✏️</div>
                                  <div style={{ backgroundColor: 'rgba(220,38,38,0.7)', color: '#fff', width: 28, height: 28, borderRadius: 50, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
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
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxDoc && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
          onClick={() => setLightboxDoc(null)}>
          <div style={{ backgroundColor: '#fff', borderRadius: 16, maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightboxDoc(null)}
              style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 50, cursor: 'pointer', fontSize: 18, zIndex: 101 }}>✕</button>
            {getDriveThumbnailUrl(lightboxDoc.link_foto) && (
              <img src={getDriveThumbnailUrl(lightboxDoc.link_foto) || ''} alt={lightboxDoc.caption}
                style={{ width: '100%', maxHeight: 500, objectFit: 'cover' }} />
            )}
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: '#9CAABB', marginBottom: 8 }}>{formatTanggal(lightboxDoc.tanggal)}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F1C2E', marginBottom: 10, letterSpacing: '-0.02em' }}>{lightboxDoc.nama_pekerjaan}</div>
              {lightboxDoc.fase && FASE_INFO[lightboxDoc.fase] && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 6, marginBottom: 12,
                  backgroundColor: FASE_INFO[lightboxDoc.fase].bg,
                  borderLeft: `3px solid ${FASE_INFO[lightboxDoc.fase].color}`,
                }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: FASE_INFO[lightboxDoc.fase].color }}>
                    {lightboxDoc.fase}
                  </span>
                </div>
              )}
              {lightboxDoc.caption && (
                <div style={{ fontSize: 13, color: '#5C6B82', lineHeight: 1.6, marginBottom: 16 }}>{lightboxDoc.caption}</div>
              )}
              <a href={lightboxDoc.link_foto} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', fontSize: 13, fontWeight: 600, color: '#1A6FE8', textDecoration: 'none' }}>
                Buka di Google Drive →
              </a>
            </div>
          </div>
        </div>
      )}

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
