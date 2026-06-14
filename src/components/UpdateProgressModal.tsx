import { useState } from 'react'
import { supabase, Program } from '../lib/supabase'

interface UpdateProgressModalProps {
  program: Program
  onClose: () => void
  onUpdated: () => void
}

const STATUS_OPTIONS = ['Perencanaan', 'On Going', 'Selesai', 'On Hold']

export default function UpdateProgressModal({ program, onClose, onUpdated }: UpdateProgressModalProps) {
  const [progress, setProgress] = useState(program.progress_percent?.toString() || '0')
  const [realisasi, setRealisasi] = useState(program.realisasi_terkini?.toString() || '0')
  const [status, setStatus] = useState(program.status || 'On Going')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const progressNum = parseFloat(progress) || 0
    const realisasiNum = parseFloat(realisasi) || 0
    const sisa = (program.total_anggaran || 0) - realisasiNum
    const { error: err } = await supabase
      .from('programs')
      .update({
        progress_percent: progressNum,
        realisasi_terkini: realisasiNum,
        sisa_anggaran: sisa,
        status,
      })
      .eq('id', program.id)
    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      onUpdated()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: '#0D1829' }}>Update Progress</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            style={{ color: '#6B7A99' }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#6B7A99', marginBottom: 20 }}>{program.nama_pekerjaan}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6 }}>
              Progress (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={progress}
              onChange={e => setProgress(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2"
              style={{ borderColor: 'rgba(26,43,94,0.15)', color: '#0D1829', fontSize: 14 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6 }}>
              Realisasi Terkini (Rp)
            </label>
            <input
              type="number"
              min="0"
              value={realisasi}
              onChange={e => setRealisasi(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2"
              style={{ borderColor: 'rgba(26,43,94,0.15)', color: '#0D1829', fontSize: 14 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6 }}>
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2"
              style={{ borderColor: 'rgba(26,43,94,0.15)', color: '#0D1829', fontSize: 14, backgroundColor: '#fff' }}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              background: 'transparent',
              color: '#6B7A99',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#0858b0',
              color: '#fff',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
