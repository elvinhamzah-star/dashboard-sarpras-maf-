import { useEffect, useState, useCallback, useRef } from 'react'
import {
  fetchPrograms, fetchProgramDocuments, fetchTransactions,
  Program, ProgramDocument, Transaction, DocCategory, hasMafCredentials,
} from '../lib/supabase'
import { adminInsert, adminDelete } from '../lib/adminApi'
import { STATUS_COLORS, STATUS_BG, getFileEmbedUrl, formatRupiah, formatTanggal } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import PdfViewerModal from './PdfViewerModal'

interface Props {
  isAdmin: boolean
  role: 'pbb' | 'maf' | null
  initialProgramId?: string | null
  initialCategory?: DocCategory | null
}

const BASE_CATS: DocCategory[] = ['rab_detail', 'bukti_transaksi']
const CAT_LABEL: Record<DocCategory, string> = {
  rab_detail: 'RAB',
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

export default function Dokumen({ isAdmin, role, initialProgramId, initialCategory }: Props) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [docs, setDocs] = useState<ProgramDocument[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
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
  const expandedElRef = useRef<HTMLDivElement | null>(null)

  // When switching accordion items, scroll the newly-opened one into view
  useEffect(() => {
    if (!expandedId) return
    const timer = setTimeout(() => {
      expandedElRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 30)
    return () => clearTimeout(timer)
  }, [expandedId])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [pRes, dRes, tRes] = await Promise.all([fetchPrograms(), fetchProgramDocuments(), fetchTransactions()])
    if (pRes.data) {
      const hasMaf = hasMafCredentials()
      setPrograms(
        role === 'maf' && hasMaf
          ? pRes.data.filter(p => p.id !== 'P-024')
          : pRes.data
      )
    }
    // Graceful: table may not exist yet, treat as empty
    setDocs((dRes.data as ProgramDocument[] | null) ?? [])
    // Only keep transactions that have bukti links
    setTransactions((tRes.data ?? []).filter(t => t.link_bukti))
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

  const getCatsFor = (programId: string): DocCategory[] => {
    const hasKontrak = getDocsFor(programId, 'kontrak').length > 0
    return hasKontrak ? ['rab_detail', 'kontrak', 'bukti_transaksi'] : BASE_CATS
  }

  const getCat = (programId: string): DocCategory => {
    const cats = getCatsFor(programId)
    const stored = catMap[programId]
    return stored && cats.includes(stored) ? stored : 'rab_detail'
  }

  const setCat = (programId: string, cat: DocCategory) =>
    setCatMap(prev => ({ ...prev, [programId]: cat }))

  const totalDocs = (programId: string) =>
    (['rab_detail', 'kontrak', 'bukti_transaksi'] as DocCategory[]).reduce((sum, c) => sum + getDocsFor(programId, c).length, 0)

  const openFile = (url: string, name: string) => {
    const embedUrl = getFileEmbedUrl(url)
    if (embedUrl) setPdfViewer({ url: embedUrl, name })
    else window.open(url, '_blank')
  }

  // Auto-populate Bukti Transaksi from transactions table (matched by program name)
  const getTxBukti = (programId: string): Transaction[] => {
    const program = programs.find(p => p.id === programId)
    if (!program) return []
    return transactions.filter(tx =>
      tx.nama_pekerjaan === program.nama_pekerjaan && tx.link_bukti
    )
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
          RAB dan Bukti Transaksi per pekerjaan · Kontrak tampil bila ada
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
            const txBukti = cat === 'bukti_transaksi' ? getTxBukti(p.id) : []
            const rabLink = p.link_rab_detail ?? null
            const rabAutoEntry = cat === 'rab_detail' && rabLink ? rabLink : null
            const rabCount = rabLink ? 1 : 0
            const total = (['rab_detail', 'kontrak', 'bukti_transaksi'] as DocCategory[]).reduce((sum, c) => sum + getDocsFor(p.id, c).length, 0) + getTxBukti(p.id).length + rabCount
            const isAddingHere = !!(addForm && addForm.programId === p.id && addForm.category === cat)

            return (
              <div
                key={p.id}
                ref={isExpanded ? expandedElRef : null}
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
                      {getCatsFor(p.id).map(c => {
                        const autoBonus = c === 'rab_detail' && p.link_rab_detail ? 1 : c === 'bukti_transaksi' ? getTxBukti(p.id).length : 0
                        const cnt = getDocsFor(p.id, c).length + autoBonus
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
                      {catDocs.length === 0 && txBukti.length === 0 && !rabAutoEntry && !isAddingHere && (
                        <div style={{
                          padding: '24px 16px', textAlign: 'center',
                          color: 'var(--text-muted)', fontSize: 13,
                          borderRadius: 10, border: '1px dashed var(--border-subtle)',
                          backgroundColor: 'var(--bg)', fontStyle: cat === 'kontrak' ? 'italic' : 'normal',
                        }}>
                          {cat === 'kontrak'
                            ? 'Tidak ada kontrak untuk pekerjaan ini'
                            : `Belum ada ${CAT_LABEL[cat]}`}
                        </div>
                      )}

                      {catDocs.map(doc => {
                        const isDeleting = deletingIds.has(doc.id)
                        return (
                          <div
                            key={doc.id}
                            onClick={() => openFile(doc.file_url, doc.nama_file)}
                            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = `${CAT_COLOR[cat]}10` }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg)' }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 14px', cursor: 'pointer',
                              backgroundColor: 'var(--bg)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 10, transition: 'background-color 0.12s',
                            }}
                          >
                            <div style={{
                              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                              backgroundColor: `${CAT_COLOR[cat]}18`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <FileIcon color={CAT_COLOR[cat]} size={16} />
                            </div>
                            <span style={{
                              flex: 1, minWidth: 0,
                              fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {doc.nama_file}
                            </span>
                            {isAdmin && (
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(doc) }}
                                disabled={isDeleting}
                                style={{
                                  width: 28, height: 28, borderRadius: 7,
                                  border: '1px solid var(--border-subtle)',
                                  backgroundColor: 'var(--card)',
                                  color: isDeleting ? 'var(--text-muted)' : '#dc2626',
                                  cursor: isDeleting ? 'default' : 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 16, lineHeight: 1, fontFamily: 'inherit', flexShrink: 0,
                                }}
                              >
                                {isDeleting ? '…' : '×'}
                              </button>
                            )}
                          </div>
                        )
                      })}

                      {/* Auto-entry: RAB Detail from programs.link_rab_detail */}
                      {rabAutoEntry && (
                        <div
                          onClick={() => openFile(rabAutoEntry, `RAB ${p.nama_pekerjaan}`)}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = `${CAT_COLOR.rab_detail}10` }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg)' }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', cursor: 'pointer',
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 10, transition: 'background-color 0.12s',
                          }}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                            backgroundColor: 'rgba(26,111,232,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <FileIcon color={CAT_COLOR.rab_detail} size={16} />
                          </div>
                          <span style={{
                            flex: 1, minWidth: 0,
                            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            RAB {p.nama_pekerjaan}
                          </span>
                          <svg width="14" height="14" fill="none" stroke={CAT_COLOR.rab_detail} strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: 0.6 }}>
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </div>
                      )}

                      {/* Auto-populated Bukti Transaksi from transactions */}
                      {txBukti.map(tx => (
                        <div
                          key={tx.id}
                          onClick={() => openFile(tx.link_bukti!, tx.deskripsi || 'Bukti Transaksi')}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = `${CAT_COLOR.bukti_transaksi}10` }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bg)' }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', cursor: 'pointer',
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 10, transition: 'background-color 0.12s',
                          }}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                            backgroundColor: 'rgba(217,119,6,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <FileIcon color={CAT_COLOR.bukti_transaksi} size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {tx.deskripsi || 'Bukti Transaksi'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                              {tx.tanggal ? formatTanggal(tx.tanggal) : ''}{tx.nominal ? ` · ${formatRupiah(tx.nominal)}` : ''}
                            </div>
                          </div>
                          <svg width="14" height="14" fill="none" stroke={CAT_COLOR.bukti_transaksi} strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: 0.6 }}>
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </div>
                      ))}

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
