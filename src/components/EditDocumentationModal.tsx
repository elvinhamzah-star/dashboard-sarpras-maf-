import { useState } from 'react'
import { useEscapeKey } from '../lib/useEscapeKey'
import { Documentation, Program } from '../lib/supabase'
import { adminUpdate } from '../lib/adminApi'
import { isValidDriveLink } from '../lib/data'

interface EditDocumentationModalProps {
  doc: Documentation
  programs: Program[]
  onClose: () => void
  onSuccess: () => void
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 9,
  border: '1px solid var(--border)',
  fontSize: 13,
  color: 'var(--text-primary)',
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

export default function EditDocumentationModal({ doc, programs: _programs, onClose, onSuccess }: EditDocumentationModalProps) {
  useEscapeKey(onClose)
  const [fase, setFase] = useState(doc.fase || 'Kondisi Awal')
  const [tipeFile, setTipeFile] = useState<'foto' | 'video'>(doc.tipe_file || 'foto')
  const [tanggal, setTanggal] = useState(doc.tanggal || '')
  const [titik, setTitik] = useState(doc.titik || '')
  const [linkFoto, setLinkFoto] = useState(doc.link_foto || '')
  const [caption, setCaption] = useState(doc.caption || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isInvalidLink = linkFoto.trim() && !isValidDriveLink(linkFoto.trim())

  const handleSave = async () => {
    setError('')

    if (!fase.trim()) { setError('Fase harus dipilih'); return }
    if (!tanggal.trim()) { setError('Tanggal harus diisi'); return }
    if (linkFoto.trim() && !isValidDriveLink(linkFoto.trim())) {
      setError('Format Google Drive Link tidak valid. Gunakan: https://drive.google.com/file/d/FILE_ID/view')
      return
    }

    setSaving(true)
    const { error: err } = await adminUpdate('documentation', {
      fase,
      tipe_file: tipeFile,
      tanggal,
      titik: titik.trim() || null,
      link_foto: linkFoto.trim() || doc.link_foto,
      caption: caption.trim() || null,
    }, doc.id)
    setSaving(false)

    if (err) { setError('Gagal menyimpan: ' + err.message); return }
    onSuccess()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(13,24,41,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div
        style={{ backgroundColor: 'var(--card)', borderRadius: 16, padding: '28px', width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(13,24,41,0.2)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Dokumentasi</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{doc.nama_pekerjaan}</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', color: '#E53E3E', fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* Tipe File toggle */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Tipe File</label>
          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden', width: 'fit-content' }}>
            {(['foto', 'video'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTipeFile(t)}
                style={{ padding: '8px 22px', border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', backgroundColor: tipeFile === t ? 'var(--blue)' : 'var(--card)', color: tipeFile === t ? '#fff' : 'var(--text-secondary)' }}>
                {t === 'foto'
                  ? <><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>Foto</>
                  : <><svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>Video</>
                }
              </button>
            ))}
          </div>
        </div>

        {/* Fase + Tanggal */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Fase</label>
            <select
              value={fase}
              onChange={e => setFase(e.target.value)}
              style={{ ...inputStyle, backgroundColor: 'var(--card)', cursor: 'pointer' }}
            >
              {['Kondisi Awal', 'Proses Pekerjaan', 'Kondisi Akhir', 'Dokumentasi'].map(f => (
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

        {/* Titik */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Titik / Lokasi <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>(opsional)</span></label>
          <input
            type="text"
            value={titik}
            onChange={e => setTitik(e.target.value)}
            placeholder='Contoh: "Gedung A", "Titik 1"'
            style={inputStyle}
          />
        </div>

        {/* Link foto */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Google Drive Link</label>
          <input
            type="url"
            value={linkFoto}
            onChange={e => setLinkFoto(e.target.value)}
            placeholder="https://drive.google.com/file/d/…/view"
            style={{
              ...inputStyle,
              borderColor: isInvalidLink ? '#F87171' : 'var(--border)',
              backgroundColor: isInvalidLink ? 'rgba(239,68,68,0.03)' : 'var(--card)',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Kosongkan untuk tetap menggunakan link yang sama
          </div>
        </div>

        {/* Caption */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Caption <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>(opsional)</span></label>
          <input
            type="text"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Keterangan singkat foto ini"
            style={{ ...inputStyle, fontSize: 12, color: 'var(--text-secondary)', padding: '7px 12px' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1, fontFamily: 'inherit' }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
