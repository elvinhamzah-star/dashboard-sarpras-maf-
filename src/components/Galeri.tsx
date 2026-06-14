import { useEffect, useState } from 'react'
import { fetchDocumentation, Documentation, fetchPrograms, Program } from '../lib/supabase'
import { adminDelete } from '../lib/adminApi'
import { formatTanggal, getDriveThumbnailUrl } from '../lib/data'
import AddDocumentationModal from './AddDocumentationModal'
import EditDocumentationModal from './EditDocumentationModal'

interface GaleriProps {
  isAdmin?: boolean
}

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

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [docsResult, progsResult] = await Promise.all([
        fetchDocumentation(),
        fetchPrograms(),
      ])

      if (docsResult.error) {
        console.error('Documentation table error:', docsResult.error)
        setError('Tabel dokumentasi belum dibuat. Hubungi admin untuk setup database atau buat table di Supabase.')
      } else if (docsResult.data) {
        setDocs(docsResult.data)
      }

      if (progsResult.data) setPrograms(progsResult.data)
    } catch (err) {
      console.error('Galeri load error:', err)
      setError('Terjadi kesalahan memuat galeri. Pastikan tabel documentation sudah dibuat di Supabase.')
    }
    setLoading(false)
  }

  const filteredDocs = docs.filter(doc => {
    if (filterProgram !== 'Semua' && doc.program_id !== filterProgram) return false
    if (filterFase !== 'Semua' && doc.fase !== filterFase) return false
    return true
  })

  // Group docs by program
  const docsByProgram = filteredDocs.reduce((acc, doc) => {
    const prog = programs.find(p => p.id === doc.program_id)
    const progName = prog?.nama_pekerjaan || doc.program_id
    if (!acc[progName]) {
      acc[progName] = { program_id: doc.program_id, items: [] }
    }
    acc[progName].items.push(doc)
    return acc
  }, {} as Record<string, { program_id: string; items: Documentation[] }>)

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus dokumentasi ini?')) return
    const { error: err } = await adminDelete('documentation', id)
    if (err) {
      alert('Gagal menghapus: ' + err.message)
    } else {
      setDocs(docs.filter(d => d.id !== id))
    }
  }

  const FASE_INFO: Record<string, { color: string; badge: string }> = {
    'Kondisi Awal': { color: '#991b1b', badge: '🔴' },
    'Proses Pekerjaan': { color: '#1e40af', badge: '🔵' },
    'Kondisi Akhir': { color: '#15803d', badge: '🟢' },
  }

  return (
    <div style={{ padding: '24px 24px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0D1829', margin: 0 }}>Galeri Dokumentasi Pekerjaan</h1>
          <p style={{ color: '#6B7A99', fontSize: 13, margin: '4px 0 0' }}>
            {loading ? 'Memuat...' : `${filteredDocs.length} dokumentasi`}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#0858b0',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            + Tambah Dokumentasi
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Program Select */}
        <select
          value={filterProgram}
          onChange={e => setFilterProgram(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(26,43,94,0.15)',
            backgroundColor: '#fff',
            fontSize: 12,
            cursor: 'pointer',
            color: '#0D1829',
            fontWeight: 600,
          }}
        >
          <option value="Semua">Semua Program</option>
          {programs.map(p => (
            <option key={p.id} value={p.id}>
              {p.nama_pekerjaan}
            </option>
          ))}
        </select>

        {/* Fase Filter Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          {['Semua', 'Kondisi Awal', 'Proses Pekerjaan', 'Kondisi Akhir'].map(fase => (
            <button
              key={fase}
              onClick={() => setFilterFase(fase)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: filterFase === fase ? 'none' : '1px solid rgba(26,43,94,0.15)',
                backgroundColor: filterFase === fase ? '#0858b0' : '#fff',
                color: filterFase === fase ? '#fff' : '#6B7A99',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (filterFase !== fase) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(8,88,176,0.05)'
                }
              }}
              onMouseLeave={e => {
                if (filterFase !== fase) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff'
                }
              }}
            >
              {fase === 'Semua' ? 'Semua Fase' : fase}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#991b1b', fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#6B7A99', paddingTop: 60 }}>Memuat galeri...</div>
      ) : filteredDocs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: '#6B7A99',
            paddingTop: 80,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <svg width="48" height="48" fill="none" stroke="#ccc" strokeWidth="1.5" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <p style={{ margin: 0 }}>Belum ada dokumentasi foto.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(docsByProgram).map(([progName, { items }]) => (
            <div key={progName}>
              {/* Program Header */}
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#0D1829',
                  marginBottom: 16,
                  paddingBottom: 8,
                  borderBottom: '2px solid rgba(26,43,94,0.1)',
                }}
              >
                {progName}
              </div>

              {/* Group by Fase */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {(['Kondisi Awal', 'Proses Pekerjaan', 'Kondisi Akhir'] as const).map(fase => {
                  const phaseItems = items.filter(item => item.fase === fase || !item.fase)
                  if (phaseItems.length === 0) return null

                  return (
                    <div key={fase}>
                      {/* Phase Header */}
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: FASE_INFO[fase].color,
                          marginBottom: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>{FASE_INFO[fase].badge}</span>
                        {fase} ({phaseItems.length} item)
                      </div>

                      {/* Bubble Cards Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                          gap: 16,
                        }}
                      >
                        {phaseItems.map(doc => {
                          const thumbUrl = getDriveThumbnailUrl(doc.link_foto)
                          return (
                            <div
                              key={doc.id}
                              style={{
                                position: 'relative',
                                borderRadius: 16,
                                overflow: 'hidden',
                                backgroundColor: '#F5F7FA',
                                border: '1px solid rgba(26,43,94,0.07)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                              }}
                              onMouseEnter={e => {
                                const el = e.currentTarget as HTMLDivElement
                                el.style.boxShadow = '0 8px 24px rgba(8,88,176,0.15)'
                                el.style.transform = 'translateY(-4px)'
                              }}
                              onMouseLeave={e => {
                                const el = e.currentTarget as HTMLDivElement
                                el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
                                el.style.transform = 'translateY(0)'
                              }}
                              onClick={() => setLightboxDoc(doc)}
                            >
                              {/* Image */}
                              <div
                                style={{
                                  width: '100%',
                                  height: 140,
                                  backgroundColor: '#F5F7FA',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {thumbUrl ? (
                                  <img
                                    src={thumbUrl}
                                    alt={doc.caption}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                    }}
                                    onError={e => {
                                      ;(e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <svg width="40" height="40" fill="none" stroke="#ccc" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <path d="M21 15l-5-5L5 21" />
                                  </svg>
                                )}
                              </div>

                              {/* Info */}
                              <div style={{ padding: '12px' }}>
                                <div style={{ fontSize: 10, color: '#6B7A99', marginBottom: 4 }}>
                                  {formatTanggal(doc.tanggal)}
                                </div>
                                {doc.caption && (
                                  <div style={{ fontSize: 11, color: '#0D1829', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {doc.caption}
                                  </div>
                                )}
                              </div>

                              {/* Admin Edit & Delete Buttons */}
                              {isAdmin && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    display: 'flex',
                                    gap: 6,
                                  }}
                                >
                                  {/* Edit Button */}
                                  <div
                                    style={{
                                      backgroundColor: 'rgba(0,0,0,0.6)',
                                      border: 'none',
                                      color: '#fff',
                                      width: 28,
                                      height: 28,
                                      borderRadius: 50,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 14,
                                      opacity: 0,
                                      transition: 'opacity 0.2s',
                                    }}
                                    onMouseEnter={e => {
                                      ;(e.currentTarget as HTMLDivElement).style.opacity = '1'
                                    }}
                                    onMouseLeave={e => {
                                      ;(e.currentTarget as HTMLDivElement).style.opacity = '0'
                                    }}
                                    onClick={e => {
                                      e.stopPropagation()
                                      setEditingDoc(doc)
                                    }}
                                    role="button"
                                    title="Edit dokumentasi"
                                  >
                                    ✏️
                                  </div>

                                  {/* Delete Button */}
                                  <div
                                    style={{
                                      backgroundColor: 'rgba(0,0,0,0.6)',
                                      border: 'none',
                                      color: '#fff',
                                      width: 28,
                                      height: 28,
                                      borderRadius: 50,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 14,
                                      opacity: 0,
                                      transition: 'opacity 0.2s',
                                    }}
                                    onMouseEnter={e => {
                                      ;(e.currentTarget as HTMLDivElement).style.opacity = '1'
                                    }}
                                    onMouseLeave={e => {
                                      ;(e.currentTarget as HTMLDivElement).style.opacity = '0'
                                    }}
                                    onClick={e => {
                                      e.stopPropagation()
                                      handleDelete(doc.id)
                                    }}
                                    role="button"
                                    title="Hapus dokumentasi"
                                  >
                                    ✕
                                  </div>
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

      {/* Lightbox Modal */}
      {lightboxDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setLightboxDoc(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              maxWidth: 700,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setLightboxDoc(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                backgroundColor: 'rgba(0,0,0,0.6)',
                border: 'none',
                color: '#fff',
                width: 36,
                height: 36,
                borderRadius: 50,
                cursor: 'pointer',
                fontSize: 18,
                zIndex: 101,
              }}
            >
              ✕
            </button>

            {/* Image */}
            {getDriveThumbnailUrl(lightboxDoc.link_foto) && (
              <img
                src={getDriveThumbnailUrl(lightboxDoc.link_foto) || ''}
                alt={lightboxDoc.caption}
                style={{
                  width: '100%',
                  maxHeight: 500,
                  objectFit: 'cover',
                }}
              />
            )}

            {/* Info */}
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: '#6B7A99', marginBottom: 8 }}>
                {formatTanggal(lightboxDoc.tanggal)}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1829', marginBottom: 12 }}>
                {lightboxDoc.nama_pekerjaan}
              </div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 6,
                  backgroundColor: `${FASE_INFO[lightboxDoc.fase || ''].color}15`,
                  color: FASE_INFO[lightboxDoc.fase || ''].color,
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                {FASE_INFO[lightboxDoc.fase || ''].badge} {lightboxDoc.fase}
              </div>
              {lightboxDoc.caption && (
                <div style={{ fontSize: 13, color: '#6B7A99', lineHeight: 1.6, marginBottom: 16 }}>
                  {lightboxDoc.caption}
                </div>
              )}

              <a
                href={lightboxDoc.link_foto}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0858b0',
                  textDecoration: 'none',
                }}
              >
                Buka di Google Drive →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Add Documentation Modal */}
      {isAdmin && showAddModal && (
        <AddDocumentationModal
          programs={programs}
          onClose={() => setShowAddModal(false)}
          onSuccess={async () => {
            const { data } = await fetchDocumentation()
            if (data) setDocs(data)
            setShowAddModal(false)
          }}
        />
      )}

      {/* Edit Documentation Modal */}
      {isAdmin && editingDoc && (
        <EditDocumentationModal
          doc={editingDoc}
          programs={programs}
          onClose={() => setEditingDoc(null)}
          onSuccess={async () => {
            const { data } = await fetchDocumentation()
            if (data) setDocs(data)
            setEditingDoc(null)
          }}
        />
      )}
    </div>
  )
}
