import { useState } from 'react'
import { adminInsert } from '../lib/adminApi'

interface AddTransactionModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AddTransactionModal({ onClose, onSuccess }: AddTransactionModalProps) {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [pekerjaan, setPekerjaan] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [jenis, setJenis] = useState('Masuk')
  const [nominal, setNominal] = useState('')
  const [sumber, setSumber] = useState('PBB')
  const [bukti, setBukti] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!tanggal || !pekerjaan.trim() || !keterangan.trim() || !nominal) {
      setError('Semua field harus diisi (kecuali Link Bukti)')
      return
    }

    const nominalNum = parseFloat(nominal)
    if (nominalNum <= 0) {
      setError('Nominal harus lebih dari 0')
      return
    }

    setSaving(true)
    const { error: err } = await adminInsert('transactions', {
      tanggal,
      nama_pekerjaan: pekerjaan,
      deskripsi: keterangan,
      jenis_transaksi: jenis,
      nominal: nominalNum,
      sumber,
      link_bukti: bukti || null,
    })
    setSaving(false)

    if (err) {
      setError('Gagal menambah transaksi: ' + err.message)
      return
    }

    onSuccess()
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(13,24,41,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: '28px',
          width: '100%',
          maxWidth: 500,
          boxShadow: '0 20px 60px rgba(13,24,41,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1829' }}>Tambah Transaksi</div>
          <div style={{ fontSize: 12, color: '#6B7A99', marginTop: 4 }}>Catat transaksi keuangan baru</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#991b1b', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Tanggal
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={e => setTanggal(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              fontSize: 13,
              color: '#0D1829',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Nama Pekerjaan
          </label>
          <input
            type="text"
            value={pekerjaan}
            onChange={e => setPekerjaan(e.target.value)}
            placeholder="Contoh: Pengecatan Gedung MAF"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              fontSize: 13,
              color: '#0D1829',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Keterangan
          </label>
          <textarea
            value={keterangan}
            onChange={e => setKeterangan(e.target.value)}
            rows={3}
            placeholder="Detail transaksi..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              fontSize: 13,
              color: '#0D1829',
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Jenis Transaksi
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Masuk', 'Keluar', 'Keluar PBB'].map(j => (
              <label key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  value={j}
                  checked={jenis === j}
                  onChange={e => setJenis(e.target.value)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: '#0D1829' }}>{j}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Nominal
            </label>
            <input
              type="number"
              value={nominal}
              onChange={e => setNominal(e.target.value)}
              placeholder="0"
              min="0"
              step="1000"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid rgba(26,43,94,0.15)',
                fontSize: 13,
                color: '#0D1829',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Sumber
            </label>
            <select
              value={sumber}
              onChange={e => setSumber(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid rgba(26,43,94,0.15)',
                fontSize: 13,
                color: '#0D1829',
                backgroundColor: '#fff',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <option>PBB</option>
              <option>Hamzah</option>
              <option>Lainnya</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Link Bukti (Opsional)
          </label>
          <input
            type="url"
            value={bukti}
            onChange={e => setBukti(e.target.value)}
            placeholder="https://..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              fontSize: 13,
              color: '#0D1829',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              backgroundColor: '#fff',
              color: '#6B7A99',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#0858b0',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
