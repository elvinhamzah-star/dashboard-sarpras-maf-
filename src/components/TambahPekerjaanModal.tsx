import { useState } from 'react'
import { Program } from '../lib/supabase'
import { formatRupiah } from '../lib/data'

interface TambahPekerjaanModalProps {
  programs: Program[]
  onClose: () => void
  onSuccess: (data: {
    programId: string
    startDate: string
    endDate: string
    activities: string[]
    notes: string[]
  }) => void
}

export default function TambahPekerjaanModal({ programs, onClose, onSuccess }: TambahPekerjaanModalProps) {
  const [programId, setProgramId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [activitiesText, setActivitiesText] = useState('')
  const [notesText, setNotesText] = useState('')
  const [error, setError] = useState('')

  const selectedProgram = programs.find(p => p.id === programId)

  const handleSave = async () => {
    if (!programId.trim()) {
      setError('Pilih Nama Pekerjaan terlebih dahulu')
      return
    }
    if (!startDate.trim() || !endDate.trim()) {
      setError('Tanggal mulai dan berakhir harus diisi')
      return
    }

    // Parse activities (numbered list)
    const activities = activitiesText
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0)

    // Parse notes (bullet points)
    const notes = notesText
      .split('\n')
      .map(line => line.replace(/^[-•]\s*/, '').trim())
      .filter(line => line.length > 0)

    onSuccess({
      programId,
      startDate,
      endDate,
      activities,
      notes,
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(13,24,41,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: 16,
          padding: '28px',
          width: '100%',
          maxWidth: 600,
          boxShadow: '0 20px 60px rgba(13,24,41,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Tambah Pekerjaan</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Atur periode dan aktivitas pekerjaan</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', color: '#E53E3E', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Nama Pekerjaan
          </label>
          <select
            value={programId}
            onChange={e => setProgramId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              fontSize: 13,
              color: 'var(--text-primary)',
              backgroundColor: 'var(--card)',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <option value="">-- Pilih Pekerjaan --</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>
                {p.id} - {p.nama_pekerjaan}
              </option>
            ))}
          </select>
        </div>

        {/* Auto-filled info */}
        {selectedProgram && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, backgroundColor: 'rgba(8,88,176,0.05)', border: '1px solid rgba(8,88,176,0.1)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>INFO PEKERJAAN</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Progress</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1A6FE8' }}>{selectedProgram.progress_percent || 0}%</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Status</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedProgram.status}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Anggaran</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{formatRupiah(selectedProgram.total_anggaran || 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Realisasi</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1B5E2B' }}>{formatRupiah(selectedProgram.realisasi_terkini || 0)}</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Tanggal Mulai', value: startDate, onChange: setStartDate },
            { label: 'Tanggal Berakhir', value: endDate, onChange: setEndDate },
          ].map(({ label, value, onChange }) => (
            <div key={label}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg
                  width="15" height="15"
                  fill="none" stroke="#9CAABB" strokeWidth="2" viewBox="0 0 24 24"
                  style={{ position: 'absolute', left: 12, pointerEvents: 'none', flexShrink: 0, zIndex: 1 }}
                >
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input
                  type="date"
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: 34,
                    paddingRight: 12,
                    paddingTop: 10,
                    paddingBottom: 10,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: 'var(--card)',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Aktivitas Pekerjaan
          </label>
          <textarea
            value={activitiesText}
            onChange={e => setActivitiesText(e.target.value)}
            rows={4}
            placeholder="Format: Nomor diikuti aktivitas&#10;1. Perbaikan Sakan Qozvin (Ikhwan)&#10;2. Perbaikan Sakan Naisabur (Ikhwan)&#10;3. ..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              fontSize: 13,
              color: 'var(--text-primary)',
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Masukkan setiap aktivitas di baris baru dengan format: 1. aktivitas, 2. aktivitas, dst
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Catatan Pekerjaan
          </label>
          <textarea
            value={notesText}
            onChange={e => setNotesText(e.target.value)}
            rows={4}
            placeholder="Format: Bullet point dengan - atau •&#10;- Pekerjaan Baru 6 gedung dari total 17&#10;- Penambahan 1 Gedung diluar RAB&#10;- ..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              fontSize: 13,
              color: 'var(--text-primary)',
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Masukkan setiap catatan di baris baru dengan format: - catatan, - catatan, dst
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)',
              color: 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#1A6FE8',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}
