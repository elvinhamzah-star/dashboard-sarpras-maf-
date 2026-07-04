import { useEffect, useState, useCallback } from 'react'
import {
  fetchPrograms, fetchProgramDocuments,
  Program, ProgramDocument, DocCategory, hasMafCredentials,
} from '../lib/supabase'
import { adminInsert, adminDelete } from '../lib/adminApi'
import { STATUS_COLORS, STATUS_BG, extractDriveFileId } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'

interface Props {
  isAdmin: boolean
  role: 'pbb' | 'maf' | null
  initialProgramId?: string | null
  initialCategory?: DocCategory | null
}

const CATS: DocCategory[] = ['rab_detail', 'kontrak', 'bukti_transaksi']
const CAT_LABEL: Record<DocCategory, string> = {
  rab_detail: 'RAB Detail',
  kontrak: 'Kontrak',
  bukti_transaksi: 'Bukti Transaksi',
}
const CAT_COLOR: Record<DocCategory, string> = {
  rab_detail: '#1a6fe8',
  kontrak: '#059669',
  bukti_transaksi: '#D97706',
}

function FileIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function PdfViewerModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const driveOpenUrl = url.replace('/preview', '/view')

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        backgroundColor: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 920,
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--bg)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 40px 100px rgba(0,0,0,0.55)',
        maxHeight: '90vh',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--card)', gap: 12, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <FileIcon color="var(--blue)" size={16} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <a
              href={driveOpenUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600, color: 'var(--blue)',
                backgroundColor: 'rgba(26,111,232,0.08)',
                border: '1px solid rgba(26,111,232,0.18)',
                borderRadius: 7, padding: '5px 11px', textDecoration: 'none',
              }}
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Buka di Drive
            </a>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg)', color: 'var(--text-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, lineHeight: 1, fontFamily: 'inherit',
              }}
            >×</button>
          </div>
        </div>
        {/* iframe area */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <iframe
            src={url}
            style={{ width: '100%', height: '76vh', border: 'none', display: 'block' }}
            allow="autoplay"
            title={name}
          />
        </div>
      </div>
    </div>
  )
}

export default function Dokumen({ isAdmin, role, initialProgramId, initialCategory }: Props) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [docs, setDocs] = useState<ProgramDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(initialProgramId ?? null)
  const [catMap, setCatMap] = useState<Record<string, DocCategory>>(() => {
    if (initialProgramId && initialCategory) return { [initialProgramId]: initialCategory }
    return {}
  })
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null)
  const [addForm, setAddForm] = useState<{ programId: string; category: DocCategory } | null>(null)
  const [addName, setAddName] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const width = useWindowWidth()
  const isMobile = width < 768

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [pRes, dRes] = await Promise.all([fetchPrograms(), fetchProgramDocuments()])
    if (pRes.data) {
      const hasMaf = hasMafCredentials()
      setPrograms(
        role === 'maf' && hasMaf
          ? pRes.data.filter(p => p.jenis_pekerjaan === 'Operasional' && p.id !== 'P-024')
          : pRes.data
      )
    }
    // Graceful: table may not exist yet, treat as empty
    setDocs((dRes.data as ProgramDocument[] | null) ?? [])
    setLoading(false)
  }, [role])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (initialProgramId) {
      setExpandedId(initialProgramId)
      if (initialCategory) {
        setCatMap(prev => ({ ...prev, [initialProgramId]: initialCategory }))
      }
    }
  }, [initialProgramId, initialCategory])

  const getDocsFor = (programId: string, cat: DocCategory) =>
    docs.filter(d => d.program_id === programId && d.category === cat)
        .sort((a, b) => a.urutan - b.urutan)

  const getCat = (programId: string): DocCategory => catMap[programId] ?? 'rab_detail'

  const setCat = (programId: string, cat: DocCategory) =>
    setCatMap(prev => ({ ...prev, [programId]: cat }))

  const totalDocs = (programId: string) =>
    CATS.reduce((sum, c) => sum + getDocsFor(programId, c).length, 0)

  const openPdf = (doc: ProgramDocument) => {
    const fileId = extractDriveFileId(doc.file_url)
    if (fileId) {
      setPdfViewer({ url: `https://drive.google.com/file/d/${fileId}/preview`, name: doc.nama_file })
    } else {
      window.open(doc.file_url, '_blank')
    }
  }

  const handleAdd = async () => {
    if (!addForm || !addName.trim() || !addUrl.trim() || addLoading) return
    setAddLoading(true)
    const existing = getDocsFor(addForm.programId, addForm.category)
    await adminInsert('program_documents', {
      program_id: addForm.programId,
      category: addForm.category,
      nama_file: addName.trim(),
      file_url: addUrl.trim(),
      urutan: existing.length,
    })
    setAddName('')
    setAddUrl('')
    setAddForm(null)
    await loadAll()
    setAddLoading(false)
  }

  const handleDelete = async (doc: ProgramDocument) => {
    if (!confirm(`Hapus "${doc.nama_file}"?`)) return
    setDeletingIds(prev => new Set(prev).add(doc.id))
    await adminDelete('program_documents', doc.id)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    setDeletingIds(prev => { const s = new Set(prev); s.delete(doc.id); return s })
  }

  const filtered = programs.filter(p =>
    !search ||
    p.nama_pekerjaan.toLowerCase().includes(search.toLowerCase()) ||
    p.program.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: isMobile ? '16px' : '28px 32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: isMobile ? 14 : 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 5px', letterSpacing: '-0.03em' }}>
          Dokumen Pekerjaan
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontWeight: 400 }}>
          RAB Detail, Kontrak, dan Bukti Transaksi per pekerjaan
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
          width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari pekerjaan..."
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '9px 12px 9px 36px',
            borderRadius: 10, border: '1.5px solid var(--border)',
            backgroundColor: 'var(--card)', color: 'var(--text-primary)',
            fontSize: 13, fontFamily: 'inherit', outline: 'none',
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Memuat...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Tidak ada pekerjaan ditemukan</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(p => {
            const isExpanded = expandedId === p.id
            const cat = getCat(p.id)
            const catDocs = getDocsFor(p.id, cat)
            const total = totalDocs(p.id)
            const isAddingHere = !!(addForm && addForm.programId === p.id && addForm.category === cat)

            return (
              <div
                key={p.id}
                style={{
                  borderRadius: 12,
                  border: isExpanded ? '1.5px solid rgba(26,111,232,0.3)' : '1.5px solid var(--border-subtle)',
                  backgroundColor: 'var(--card)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Accordion header */}
                <div
                  onClick={() => {
                    setExpandedId(isExpanded ? null : p.id)
                    setAddForm(null)
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(26,111,232,0.04)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent' }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {p.id}
                      </span>
                      <span style={{
                        display: 'inline-block', padding: '1px 7px', borderRadius: 20,
                        fontSize: 10.5, fontWeight: 700,
                        backgroundColor: STATUS_BG[p.status] || 'var(--border-subtle)',
                        color: STATUS_COLORS[p.status] || 'var(--text-muted)',
                        flexShrink: 0,
                      }}>
                        {p.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.nama_pekerjaan}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {total > 0 ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', padding: '2px 8px', borderRadius: 99 }}>
                        {total} file
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kosong</span>
                    )}
                    <svg
                      width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2" viewBox="0 0 24 24"
                      style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {/* Category tabs */}
                    <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                      {CATS.map(c => {
                        const cnt = getDocsFor(p.id, c).length
                        const isActive = cat === c
                        return (
                          <button
                            key={c}
                            onClick={() => { setCat(p.id, c); setAddForm(null) }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                              backgroundColor: isActive ? CAT_COLOR[c] : 'var(--border-subtle)',
                              color: isActive ? '#fff' : 'var(--text-muted)',
                              transition: 'all 0.15s',
                            }}
                          >
                            {CAT_LABEL[c]}
                            {cnt > 0 && (
                              <span style={{
                                fontSize: 10, fontWeight: 700,
                                backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)',
                                borderRadius: 99, padding: '0 5px', minWidth: 16, textAlign: 'center',
                              }}>
                                {cnt}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Document list for active category */}
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {catDocs.length === 0 && !isAddingHere && (
                        <div style={{
                          padding: '24px 16px', textAlign: 'center',
                          color: 'var(--text-muted)', fontSize: 13,
                          borderRadius: 10, border: '1px dashed var(--border-subtle)',
                          backgroundColor: 'var(--bg)',
                        }}>
                          Belum ada {CAT_LABEL[cat]}
                        </div>
                      )}

                      {catDocs.map(doc => {
                        const fileId = extractDriveFileId(doc.file_url)
                        const isDeleting = deletingIds.has(doc.id)
                        return (
                          <div
                            key={doc.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 14px',
                              backgroundColor: 'var(--bg)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 10,
                            }}
                          >
                            {/* File icon */}
                            <div style={{
                              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                              backgroundColor: `${CAT_COLOR[cat]}18`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <FileIcon color={CAT_COLOR[cat]} size={16} />
                            </div>
                            {/* Name */}
                            <span style={{
                              flex: 1, minWidth: 0,
                              fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {doc.nama_file}
                            </span>
                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                              <button
                                onClick={() => openPdf(doc)}
                                style={{
                                  padding: '5px 14px', borderRadius: 7, border: 'none',
                                  cursor: 'pointer', fontFamily: 'inherit',
                                  backgroundColor: fileId ? CAT_COLOR[cat] : 'rgba(26,111,232,0.1)',
                                  color: fileId ? '#fff' : 'var(--blue)',
                                  fontSize: 12, fontWeight: 600,
                                }}
                              >
                                {fileId ? 'Preview' : 'Buka ↗'}
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDelete(doc)}
                                  disabled={isDeleting}
                                  style={{
                                    width: 28, height: 28, borderRadius: 7,
                                    border: '1px solid var(--border-subtle)',
                                    backgroundColor: 'var(--card)',
                                    color: isDeleting ? 'var(--text-muted)' : '#dc2626',
                                    cursor: isDeleting ? 'default' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 16, lineHeight: 1, fontFamily: 'inherit',
                                  }}
                                >
                                  {isDeleting ? '…' : '×'}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {/* Admin: add form */}
                      {isAdmin && isAddingHere && (
                        <div style={{
                          padding: '14px 16px',
                          backgroundColor: 'rgba(26,111,232,0.04)',
                          border: '1.5px dashed rgba(26,111,232,0.25)',
                          borderRadius: 10,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                            Tambah {CAT_LABEL[cat]}
                          </div>
                          <input
                            value={addName}
                            onChange={e => setAddName(e.target.value)}
                            placeholder="Nama file (mis. RAB PBB 2025)"
                            style={{
                              width: '100%', boxSizing: 'border-box',
                              padding: '8px 10px', borderRadius: 8,
                              border: '1.5px solid var(--border)',
                              backgroundColor: 'var(--card)', color: 'var(--text-primary)',
                              fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 8,
                            }}
                          />
                          <input
                            value={addUrl}
                            onChange={e => setAddUrl(e.target.value)}
                            placeholder="Link Google Drive (https://drive.google.com/file/d/...)"
                            style={{
                              width: '100%', boxSizing: 'border-box',
                              padding: '8px 10px', borderRadius: 8,
                              border: '1.5px solid var(--border)',
                              backgroundColor: 'var(--card)', color: 'var(--text-primary)',
                              fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 12,
                            }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={handleAdd}
                              disabled={addLoading || !addName.trim() || !addUrl.trim()}
                              style={{
                                padding: '7px 16px', borderRadius: 7, border: 'none',
                                backgroundColor: 'var(--blue)', color: '#fff',
                                fontSize: 12, fontWeight: 600, cursor: addLoading || !addName.trim() || !addUrl.trim() ? 'not-allowed' : 'pointer',
                                opacity: addLoading || !addName.trim() || !addUrl.trim() ? 0.6 : 1,
                                fontFamily: 'inherit',
                              }}
                            >
                              {addLoading ? 'Menyimpan...' : 'Simpan'}
                            </button>
                            <button
                              onClick={() => { setAddForm(null); setAddName(''); setAddUrl('') }}
                              style={{
                                padding: '7px 16px', borderRadius: 7,
                                border: '1px solid var(--border-subtle)',
                                backgroundColor: 'var(--card)', color: 'var(--text-muted)',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Admin: add button */}
                      {isAdmin && !isAddingHere && (
                        <button
                          onClick={() => {
                            setAddForm({ programId: p.id, category: cat })
                            setAddName('')
                            setAddUrl('')
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(26,111,232,0.06)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                          style={{
                            width: '100%', padding: '9px', borderRadius: 9,
                            border: '1.5px dashed rgba(26,111,232,0.3)',
                            backgroundColor: 'transparent', color: 'var(--blue)',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'inherit', transition: 'background-color 0.15s',
                          }}
                        >
                          + Tambah {CAT_LABEL[cat]}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* PDF Viewer Modal */}
      {pdfViewer && (
        <PdfViewerModal
          url={pdfViewer.url}
          name={pdfViewer.name}
          onClose={() => setPdfViewer(null)}
        />
      )}
    </div>
  )
}
