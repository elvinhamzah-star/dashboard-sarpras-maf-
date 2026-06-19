import { useState } from 'react'
import { adminUpdate } from '../lib/adminApi'
import { formatRupiah } from '../lib/data'
import { Transaction } from '../lib/supabase'

interface EditTransactionModalProps {
  transaction: Transaction
  onClose: () => void
  onSuccess: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid rgba(26,43,94,0.15)',
  fontSize: 13,
  color: '#0D1829',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6B7A99',
  display: 'block',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

export default function EditTransactionModal({ transaction, onClose, onSuccess }: EditTransactionModalProps) {
  const [tanggal, setTanggal] = useState(transaction.tanggal ?? '')
  const [pekerjaan, setPekerjaan] = useState(transaction.nama_pekerjaan ?? '')
  const [keterangan, setKeterangan] = useState(transaction.deskripsi ?? '')
  const [jenis, setJenis] = useState(transaction.jenis_transaksi ?? 'Masuk')
  const [nominal, setNominal] = useState(String(transaction.nominal ?? ''))
  const [sumber, setSumber] = useState(transaction.sumber ?? 'PBB')
  const [bukti, setBukti] = useState(transaction.link_bukti ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!tanggal || !pekerjaan.trim() || !keterangan.trim() || !nominal) {
      setError('Semua field harus diisi (kecuali Link Bukti)')
      return
    }

    const nominalNum = parseFloat(nominal)
    if (isNaN(nominalNum) || nominalNum <= 0) {
      setError('Nominal harus lebih dari 0')
      return
    }

    setSaving(true)
    const { error: err } = await adminUpdate('transactions', {
      tanggal,
      nama_pekerjaan: pekerjaan.trim(),
      deskripsi: keterangan.trim(),
      jenis_transaksi: jenis,
      nominal: nominalNum,
      sumber,
      link_bukti: bukti.trim() || null,
    }, transaction.id)
    setSaving(false)

    if (err) {
      setError('Gagal menyimpan: ' + err.message)
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
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1829' }}>Edit Transaksi</div>
          <div style={{ fontSize: 12, color: '#6B7A99', marginTop: 4 }}>Ubah detail transaksi yang dipilih</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#991b1b', fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* Tanggal */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Tanggal</label>
          <input
            type="date"
            value={tanggal}
            onChange={e => setTanggal(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Nama Pekerjaan */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nama Pekerjaan</label>
          <input
            type="text"
            value={pekerjaan}
            onChange={e => setPekerjaan(e.target.value)}
            placeholder="Nama pekerjaan..."
            style={inputStyle}
          />
        </div>

        {/* Keterangan */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Keterangan</label>
          <textarea
            value={keterangan}
            onChange={e => setKeterangan(e.target.value)}
            rows={3}
            placeholder="Detail transaksi..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Jenis Transaksi */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Jenis Transaksi</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Masuk', 'Keluar', 'Keluar PBB'].map(j => (
              <label
                key={j}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  padding: '8px 14px', borderRadius: 8,
                  border: `1px solid ${jenis === j ? '#1A6FE8' : 'rgba(26,43,94,0.13)'}`,
                  backgroundColor: jenis === j ? 'rgba(26,111,232,0.07)' : '#fff',
                  transition: 'all 0.12s',
                }}
              >
                <input
                  type="radio"
                  value={j}
                  checked={jenis === j}
                  onChange={e => setJenis(e.target.value)}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: 12.5, fontWeight: jenis === j ? 600 : 400, color: jenis === j ? '#1A6FE8' : '#5C6B82' }}>
                  {j}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Nominal + Sumber */}
        <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Nominal</label>
            <input
              type="number"
              value={nominal}
              onChange={e => setNominal(e.target.value)}
              placeholder="0"
              min="0"
              step="1000"
              style={inputStyle}
            />
            {nominal && parseFloat(nominal) > 0 && (
              <div style={{ fontSize: 11, color: '#1A6FE8', marginTop: 4, fontWeight: 500 }}>
                {formatRupiah(parseFloat(nominal))}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Sumber</label>
            <select
              value={sumber}
              onChange={e => setSumber(e.target.value)}
              style={{ ...inputStyle, backgroundColor: '#fff', cursor: 'pointer' }}
            >
              <option>PBB</option>
              <option>Hamzah</option>
              <option>Lainnya</option>
            </select>
          </div>
        </div>

        {/* Link Bukti */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Link Bukti (Opsional)</label>
          <input
            type="url"
            value={bukti}
            onChange={e => setBukti(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px', borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              backgroundColor: '#fff', color: '#6B7A99',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  )
}
