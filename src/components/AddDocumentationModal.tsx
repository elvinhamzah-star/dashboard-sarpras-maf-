import { useState, useRef } from 'react'
import { Program } from '../lib/supabase'
import { adminInsert } from '../lib/adminApi'
import { isValidDriveLink } from '../lib/data'

interface AddDocumentationModalProps {
  programs: Program[]
  onClose: () => void
  onSuccess: () => void
}

interface LinkRow {
  id: string
  link: string
  caption: string
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 9,
  border: '1px solid rgba(26,43,94,0.15)',
  fontSize: 13,
  color: '#0D1829',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

function newRow(): LinkRow {
  return { id: crypto.randomUUID(), link: '', caption: '' }
}

export default function AddDocumentationModal({ programs, onClose, onSuccess }: AddDocumentationModalProps) {
  const [programId, setProgramId] = useState('')
  const [fase, setFase] = useState('Kondisi Awal')
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState<LinkRow[]>([newRow()])
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const lastInputRef = useRef<HTMLInputElement>(null)

  const updateRow = (id: string, field: 'link' | 'caption', value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const addRow = () => {
    setRows(prev => [...prev, newRow()])
    setTimeout(() => lastInputRef.current?.focus(), 50)
  }

  const removeRow = (id: string) => {
    setRows(prev => prev.length === 1 ? prev : prev.filter(r => r.id !== id))
  }

  const handlePaste = (id: string, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    const links = text.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean)
    if (links.length <= 1) return

    e.preventDefault()
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id)
      const before = prev.slice(0, idx)
      const after = prev.slice(idx + 1)
      const pasted = links.map(link => ({ id: crypto.randomUUID(), link, caption: '' }))
      return [...before, ...pasted, ...after]
    })
  }

  const handleSave = async () => {
    setError('')

    if (!programId.trim()) { setError('Program harus dipilih'); return }

    const validRows = rows.filter(r => r.link.trim())
    if (validRows.length === 0) { setError('Minimal satu link harus diisi'); return }

    const invalidLinks = validRows.filter(r => !isValidDriveLink(r.link.trim()))
    if (invalidLinks.length > 0) {
      setError(`${invalidLinks.length} link tidak valid. Pastikan format: https://drive.google.com/file/d/FILE_ID/view`)
      return
    }

    const program = programs.find(p => p.id === programId)
    setSaving(true)
    setSaveProgress({ done: 0, total: validRows.length })

    let failed = 0
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      const { error: err } = await adminInsert('documentation', {
        id: crypto.randomUUID(),
        program_id: programId,
        nama_pekerjaan: program?.nama_pekerjaan,
        fase,
        link_foto: row.link.trim(),
        caption: row.caption.trim() || null,
        tanggal,
      })
      if (err) failed++
      setSaveProgress({ done: i + 1, total: validRows.length })
    }

    setSaving(false)
    setSaveProgress(null)

    if (failed > 0) {
      setError(`${failed} dari ${validRows.length} foto gagal disimpan. Coba lagi.`)
      return
    }

    onSuccess()
    onClose()
  }

  const validCount = rows.filter(r => r.link.trim()).length

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(13,24,41,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: 16,
          padding: '28px',
          width: '100%',
          maxWidth: 580,
          boxShadow: '0 20px 60px rgba(13,24,41,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1829' }}>Tambah Dokumentasi</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Upload beberapa foto sekaligus dari Google Drive
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', color: '#E53E3E', fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* Program */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Program</label>
          <select
            value={programId}
            onChange={e => setProgramId(e.target.value)}
            style={{ ...inputStyle, backgroundColor: 'var(--card)', cursor: 'pointer' }}
          >
            <option value="">-- Pilih Program --</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.nama_pekerjaan}</option>
            ))}
          </select>
        </div>

        {/* Fase + Tanggal side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Fase</label>
            <select
              value={fase}
              onChange={e => setFase(e.target.value)}
              style={{ ...inputStyle, backgroundColor: 'var(--card)', cursor: 'pointer' }}
            >
              {['Kondisi Awal', 'Proses Pekerjaan', 'Kondisi Akhir'].map(f => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Link rows */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Google Drive Links
              {rows.length > 1 && (
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>
                  ({rows.length} baris)
                </span>
              )}
            </label>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Bisa paste beberapa link sekaligus
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((row, i) => {
              const isInvalid = row.link.trim() && !isValidDriveLink(row.link.trim())
              return (
                <div key={row.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {/* Row number */}
                  <div style={{
                    width: 22, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#C8D2E0', flexShrink: 0, marginTop: 1,
                  }}>
                    {i + 1}
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {/* Drive link */}
                    <input
                      ref={i === rows.length - 1 ? lastInputRef : undefined}
                      type="url"
                      value={row.link}
                      onChange={e => updateRow(row.id, 'link', e.target.value)}
                      onPaste={e => handlePaste(row.id, e)}
                      placeholder="https://drive.google.com/file/d/…/view"
                      style={{
                        ...inputStyle,
                        borderColor: isInvalid ? '#F87171' : 'rgba(26,43,94,0.15)',
                        backgroundColor: isInvalid ? 'rgba(239,68,68,0.03)' : 'var(--card)',
                      }}
                    />
                    {/* Caption */}
                    <input
                      type="text"
                      value={row.caption}
                      onChange={e => updateRow(row.id, 'caption', e.target.value)}
                      placeholder="Caption (opsional)"
                      style={{ ...inputStyle, fontSize: 12, color: 'var(--text-secondary)', padding: '7px 12px' }}
                    />
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    title="Hapus baris"
                    style={{
                      width: 32, height: 38,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 8, border: '1px solid var(--border)',
                      backgroundColor: 'var(--card)', color: 'var(--text-muted)',
                      cursor: rows.length === 1 ? 'default' : 'pointer',
                      opacity: rows.length === 1 ? 0.3 : 1,
                      flexShrink: 0, marginTop: 1,
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => {
                      if (rows.length > 1) {
                        const btn = e.currentTarget as HTMLButtonElement
                        btn.style.backgroundColor = 'rgba(239,68,68,0.06)'
                        btn.style.color = '#DC2626'
                        btn.style.borderColor = 'rgba(220,38,38,0.2)'
                      }
                    }}
                    onMouseLeave={e => {
                      const btn = e.currentTarget as HTMLButtonElement
                      btn.style.backgroundColor = 'var(--card)'
                      btn.style.color = 'var(--text-muted)'
                      btn.style.borderColor = 'var(--border)'
                    }}
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Add row button */}
          <button
            onClick={addRow}
            style={{
              marginTop: 10,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 9,
              border: '1px dashed rgba(26,111,232,0.3)',
              backgroundColor: 'rgba(26,111,232,0.03)',
              color: '#1A6FE8', fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.12s',
            }}
            onMouseEnter={e => {
              const btn = e.currentTarget as HTMLButtonElement
              btn.style.backgroundColor = 'rgba(26,111,232,0.07)'
              btn.style.borderColor = 'rgba(26,111,232,0.5)'
            }}
            onMouseLeave={e => {
              const btn = e.currentTarget as HTMLButtonElement
              btn.style.backgroundColor = 'rgba(26,111,232,0.03)'
              btn.style.borderColor = 'rgba(26,111,232,0.3)'
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Link
          </button>
        </div>

        {/* Save progress bar */}
        {saveProgress && (
          <div style={{ marginTop: 12, marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
              <span>Menyimpan...</span>
              <span>{saveProgress.done}/{saveProgress.total}</span>
            </div>
            <div style={{ height: 4, borderRadius: 4, backgroundColor: 'rgba(26,111,232,0.12)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4, backgroundColor: '#1A6FE8',
                width: `${(saveProgress.done / saveProgress.total) * 100}%`,
                transition: 'width 0.2s',
              }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '10px 16px', borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              backgroundColor: 'var(--card)', color: 'var(--text-muted)',
              fontSize: 13, fontWeight: 600,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.5 : 1,
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              backgroundColor: '#1A6FE8', color: '#fff',
              fontSize: 13, fontWeight: 600,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
              minWidth: 120,
            }}
          >
            {saving
              ? `Menyimpan ${saveProgress?.done ?? 0}/${saveProgress?.total ?? validCount}...`
              : validCount > 1
                ? `Simpan ${validCount} Foto`
                : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
