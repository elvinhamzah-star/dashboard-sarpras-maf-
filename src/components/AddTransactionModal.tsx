import { useState, useEffect, useRef, useCallback } from 'react'
import { useEscapeKey } from '../lib/useEscapeKey'
import { adminInsert } from '../lib/adminApi'
import { formatRupiah } from '../lib/data'
import { supabase } from '../lib/supabase'
import ModalShell from './ModalShell'

const ACCEPTED = 'application/pdf,image/png,image/jpeg'
const MAX_MB = 10

async function uploadBukti(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('bukti-transaksi').upload(path, file, { upsert: false })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('bukti-transaksi').getPublicUrl(path)
  return data.publicUrl
}

interface Program { id: string; nama_pekerjaan: string }

interface AddTransactionModalProps {
  onClose: () => void
  onSuccess: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  fontSize: 14,
  color: 'var(--text-primary)',
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
  useEscapeKey(onClose)
  const [programs, setPrograms] = useState<Program[]>([])
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [pekerjaan, setPekerjaan] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [jenis, setJenis] = useState('Masuk')
  const [nominal, setNominal] = useState('')
  const [sumber, setSumber] = useState('PBB')
  const [bukti, setBukti] = useState('')
  const [buktiFile, setBuktiFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFileChange = (file: File | null) => {
    if (!file) return
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File terlalu besar (maks ${MAX_MB} MB)`)
      return
    }
    setBuktiFile(file)
    setBukti('')
    setError('')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileChange(file)
  }, [])

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
    if (dropdownOpen) setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 50)
  }, [dropdownOpen])

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const DROPDOWN_HEIGHT = 290
      const fitsBelow = rect.bottom + 6 + DROPDOWN_HEIGHT < viewportHeight
      setDropdownPos({
        top: fitsBelow ? rect.bottom + 6 : Math.max(8, rect.top - DROPDOWN_HEIGHT - 6),
        left: rect.left,
        width: rect.width,
      })
    }
    setDropdownOpen(true)
  }

  const STATIC_OPTIONS = ['Dana PBB']
  const filteredStatic = STATIC_OPTIONS.filter(n =>
    n.toLowerCase().includes(search.toLowerCase())
  )
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
      setError('Semua field harus diisi (kecuali Bukti)')
      return
    }

    const nominalNum = parseFloat(nominal)
    if (nominalNum <= 0) {
      setError('Nominal harus lebih dari 0')
      return
    }

    let linkBukti: string | null = bukti.trim() || null

    if (buktiFile) {
      setUploading(true)
      try {
        linkBukti = await uploadBukti(buktiFile)
      } catch (e: unknown) {
        setUploading(false)
        setError('Gagal upload file: ' + (e instanceof Error ? e.message : String(e)))
        return
      }
      setUploading(false)
    }

    setSaving(true)
    const { error: err } = await adminInsert('transactions', {
      tanggal,
      nama_pekerjaan: pekerjaan,
      deskripsi: keterangan,
      jenis_transaksi: jenis,
      nominal: nominalNum,
      sumber,
      link_bukti: linkBukti,
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
    <ModalShell onClose={onClose} maxWidth={500}>
      {close => (
      <div style={{ padding: '28px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Tambah Transaksi</div>
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
          <div style={{ width: '100%', overflow: 'hidden' }}>
            <input
              type="date"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
              style={{ ...inputStyle, maxWidth: '100%', display: 'block' }}
            />
          </div>
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
                border: `1px solid ${dropdownOpen ? 'var(--blue)' : 'var(--border)'}`,
                backgroundColor: 'var(--card)',
                fontSize: 13,
                color: pekerjaan ? 'var(--text-primary)' : 'var(--text-muted)',
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
                border: '1px solid var(--border-subtle)',
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
                        border: '1px solid var(--border-subtle)',
                        fontSize: 16,
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                        backgroundColor: 'var(--surface-raised)',
                      }}
                    />
                  </div>
                </div>

                {/* List */}
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {filteredStatic.length === 0 && filteredPrograms.length === 0 ? (
                    <div style={{ padding: '16px 14px', fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>
                      Tidak ada hasil
                    </div>
                  ) : (
                    <>
                      {filteredStatic.map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleSelect(name)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            border: 'none',
                            borderBottom: '1px solid var(--surface-min)',
                            backgroundColor: name === pekerjaan ? 'rgba(26,111,232,0.06)' : 'transparent',
                            color: name === pekerjaan ? 'var(--blue)' : 'var(--text-primary)',
                            fontSize: 13,
                            fontWeight: name === pekerjaan ? 600 : 500,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                          onMouseEnter={e => {
                            if (name !== pekerjaan)
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-min)'
                          }}
                          onMouseLeave={e => {
                            if (name !== pekerjaan)
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                          }}
                        >
                          {name === pekerjaan && (
                            <svg width="13" height="13" fill="none" stroke="#1A6FE8" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </span>
                        </button>
                      ))}
                      {filteredPrograms.map((p, i) => (
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
                            color: p.nama_pekerjaan === pekerjaan ? 'var(--blue)' : 'var(--text-primary)',
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
                      ))}
                    </>
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
                  border: `1px solid ${jenis === j ? 'var(--blue)' : 'var(--border)'}`,
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
                <span style={{ fontSize: 12.5, fontWeight: jenis === j ? 600 : 400, color: jenis === j ? 'var(--blue)' : 'var(--text-secondary)' }}>
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
              <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 4, fontWeight: 500 }}>
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

        {/* Bukti Transaksi */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Bukti Transaksi (Opsional)</label>

          {/* Drop zone / file picker */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            style={{ display: 'none' }}
            onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
          />

          {!buktiFile ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--blue)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '18px 14px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: dragOver ? 'rgba(26,111,232,0.04)' : 'var(--bg)',
                transition: 'border-color 0.15s, background 0.15s',
                marginBottom: 8,
              }}
            >
              <svg width="24" height="24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 8px' }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>
                Klik atau drag file ke sini
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                PDF, PNG, atau JPG · maks {MAX_MB} MB
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg)', marginBottom: 8 }}>
              <svg width="18" height="18" fill="none" stroke="#059669" strokeWidth="1.75" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {buktiFile.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {(buktiFile.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                onClick={e => { e.stopPropagation(); setBuktiFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', flexShrink: 0 }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}

          {/* Fallback: paste URL */}
          {!buktiFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-subtle)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>atau tempel link</span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-subtle)' }} />
            </div>
          )}
          {!buktiFile && (
            <input
              type="url"
              value={bukti}
              onChange={e => setBukti(e.target.value)}
              placeholder="https://drive.google.com/..."
              style={{ ...inputStyle, marginTop: 8 }}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={close}
            style={{
              padding: '10px 16px', borderRadius: 10,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)', color: 'var(--text-muted)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              backgroundColor: 'var(--blue)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              opacity: (saving || uploading) ? 0.7 : 1,
            }}
          >
            {uploading ? 'Mengupload...' : saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
      )}
    </ModalShell>
  )
}
