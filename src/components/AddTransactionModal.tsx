import { useState, useEffect, useRef } from 'react'
import { adminInsert } from '../lib/adminApi'
import { formatRupiah } from '../lib/data'
import { supabase } from '../lib/supabase'

interface Program { id: string; nama_pekerjaan: string }

interface AddTransactionModalProps {
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
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

export default function AddTransactionModal({ onClose, onSuccess }: AddTransactionModalProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [pekerjaan, setPekerjaan] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [jenis, setJenis] = useState('Masuk')
  const [nominal, setNominal] = useState('')
  const [sumber, setSumber] = useState('PBB')
  const [bukti, setBukti] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('programs').select('id, nama_pekerjaan').order('nama_pekerjaan').then(({ data }) => {
      if (data) setPrograms(data)
    })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen) setTimeout(() => searchRef.current?.focus(), 50)
  }, [dropdownOpen])

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 6, left: rect.left, width: rect.width })
    }
    setDropdownOpen(true)
  }

  const filteredPrograms = programs.filter(p =>
    p.nama_pekerjaan.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (name: string) => {
    setPekerjaan(name)
    setDropdownOpen(false)
    setSearch('')
  }

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
          backgroundColor: 'var(--card)',
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
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Catat transaksi keuangan baru</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#E53E3E', fontSize: 12 }}>
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

        {/* Nama Pekerjaan — custom dropdown */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nama Pekerjaan</label>
          <div ref={dropdownRef}>
            {/* Trigger */}
            <button
              ref={triggerRef}
              type="button"
              onClick={() => dropdownOpen ? (setDropdownOpen(false), setSearch('')) : openDropdown()}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: `1px solid ${dropdownOpen ? '#1A6FE8' : 'rgba(26,43,94,0.15)'}`,
                backgroundColor: 'var(--card)',
                fontSize: 13,
                color: pekerjaan ? '#0D1829' : 'var(--text-muted)',
                fontFamily: 'inherit',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                textAlign: 'left',
                outline: 'none',
                boxShadow: dropdownOpen ? '0 0 0 3px rgba(26,111,232,0.12)' : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pekerjaan || 'Pilih pekerjaan...'}
              </span>
              <svg
                width="14" height="14" fill="none" stroke="#9CAABB" strokeWidth="2.5" viewBox="0 0 24 24"
                style={{ flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Dropdown panel — fixed to escape modal overflow clipping */}
            {dropdownOpen && (
              <div style={{
                position: 'fixed',
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 200,
                backgroundColor: 'var(--card)',
                borderRadius: 12,
                border: '1px solid rgba(26,43,94,0.12)',
                boxShadow: '0 8px 32px rgba(13,24,41,0.14)',
                overflow: 'hidden',
              }}>
                {/* Search */}
                <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ position: 'relative' }}>
                    <svg
                      width="13" height="13" fill="none" stroke="#9CAABB" strokeWidth="2" viewBox="0 0 24 24"
                      style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    >
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Cari pekerjaan..."
                      style={{
                        width: '100%',
                        padding: '8px 10px 8px 30px',
                        borderRadius: 8,
                        border: '1px solid rgba(26,43,94,0.12)',
                        fontSize: 12.5,
                        color: '#0D1829',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                        backgroundColor: '#F7F9FC',
                      }}
                    />
                  </div>
                </div>

                {/* List */}
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {filteredPrograms.length === 0 ? (
                    <div style={{ padding: '16px 14px', fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>
                      Tidak ada hasil
                    </div>
                  ) : (
                    filteredPrograms.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelect(p.nama_pekerjaan)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          border: 'none',
                          borderBottom: i < filteredPrograms.length - 1 ? '1px solid var(--surface-min)' : 'none',
                          backgroundColor: p.nama_pekerjaan === pekerjaan ? 'rgba(26,111,232,0.06)' : 'transparent',
                          color: p.nama_pekerjaan === pekerjaan ? '#1A6FE8' : '#0D1829',
                          fontSize: 13,
                          fontWeight: p.nama_pekerjaan === pekerjaan ? 600 : 400,
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                        onMouseEnter={e => {
                          if (p.nama_pekerjaan !== pekerjaan)
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-min)'
                        }}
                        onMouseLeave={e => {
                          if (p.nama_pekerjaan !== pekerjaan)
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                        }}
                      >
                        {p.nama_pekerjaan === pekerjaan && (
                          <svg width="13" height="13" fill="none" stroke="#1A6FE8" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.nama_pekerjaan}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
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
                  backgroundColor: jenis === j ? 'rgba(26,111,232,0.07)' : 'var(--card)',
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
                <span style={{ fontSize: 12.5, fontWeight: jenis === j ? 600 : 400, color: jenis === j ? '#1A6FE8' : 'var(--text-secondary)' }}>
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
              style={{ ...inputStyle, backgroundColor: 'var(--card)', cursor: 'pointer' }}
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
              backgroundColor: 'var(--card)', color: 'var(--text-muted)',
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
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
