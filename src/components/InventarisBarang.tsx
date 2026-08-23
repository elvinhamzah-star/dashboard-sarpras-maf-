import { useState, useEffect, useMemo } from 'react'
import QRCode from 'qrcode'
import {
  fetchInventarisItems, fetchInventarisUnits, invalidateCache,
  InventarisItem, InventarisUnit, KondisiUnit,
} from '../lib/supabase'
import { adminInsert, adminUpdate, adminDelete } from '../lib/adminApi'
import { KONDISI_COLORS, KONDISI_BG, getDriveThumbnailUrl } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import { MOBILE_BREAKPOINT } from '../lib/breakpoint'
import Dropdown from './ui/Dropdown'
import AddInventarisItemModal from './AddInventarisItemModal'

const REMINDER_DAYS = 30
const KONDISI_OPTIONS: { value: KondisiUnit; label: string }[] = [
  { value: 'Baik', label: 'Baik' },
  { value: 'Rusak Ringan', label: 'Rusak Ringan' },
  { value: 'Rusak Berat', label: 'Rusak Berat' },
]

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function publicUrl(kode: string): string {
  return `${window.location.origin}/aset/${encodeURIComponent(kode)}`
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'block',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 9,
  border: '1px solid var(--border)', fontSize: 14, color: 'var(--text-primary)',
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', backgroundColor: 'var(--card)',
}

export default function InventarisBarang() {
  const width = useWindowWidth()
  const isMobile = width < MOBILE_BREAKPOINT

  const [items, setItems] = useState<InventarisItem[]>([])
  const [units, setUnits] = useState<InventarisUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [showPrintView, setShowPrintView] = useState(false)
  const [showReminderList, setShowReminderList] = useState(false)

  const load = async () => {
    const [itemsRes, unitsRes] = await Promise.all([fetchInventarisItems(), fetchInventarisUnits()])
    if (itemsRes.data) setItems(itemsRes.data)
    if (unitsRes.data) setUnits(unitsRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const refresh = async () => {
    invalidateCache('inventaris_items', 'inventaris_units')
    await load()
  }

  const unitsByItem = useMemo(() => {
    const map: Record<string, InventarisUnit[]> = {}
    units.forEach(u => { (map[u.item_id] ??= []).push(u) })
    Object.values(map).forEach(list => list.sort((a, b) => a.urutan - b.urutan))
    return map
  }, [units])

  const overdue = useMemo(() => {
    return items
      .map(item => ({ item, days: daysSince(item.last_checked_at) }))
      .filter(x => x.days >= REMINDER_DAYS)
      .sort((a, b) => b.days - a.days)
  }, [items])

  const selectedItem = items.find(i => i.id === selectedItemId) ?? null

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Memuat inventaris...</div>
  }

  if (showPrintView) {
    return <PrintStikerView items={items} unitsByItem={unitsByItem} onClose={() => setShowPrintView(false)} />
  }

  if (selectedItem) {
    return (
      <ItemDetailView
        item={selectedItem}
        units={unitsByItem[selectedItem.id] ?? []}
        isMobile={isMobile}
        onBack={() => setSelectedItemId(null)}
        onChange={refresh}
      />
    )
  }

  return (
    <div style={{ padding: isMobile ? '16px 14px 40px' : '24px 28px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: 'var(--text-primary)' }}>Inventaris Barang</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {items.length} jenis barang · {units.length} unit total
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowPrintView(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)',
              backgroundColor: 'var(--card)', color: 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
            Cetak Stiker
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 10, border: 'none',
              backgroundColor: 'var(--blue)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Tambah Barang
          </button>
        </div>
      </div>

      {/* Reminder banner */}
      {overdue.length > 0 && (
        <div style={{ marginBottom: 20, borderRadius: 14, border: '1px solid rgba(217,119,6,0.3)', backgroundColor: 'rgba(217,119,6,0.06)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowReminderList(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ display: 'flex', flexShrink: 0, color: '#B45309' }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#B45309' }}>
              {overdue.length} barang belum diperiksa lebih dari {REMINDER_DAYS} hari
            </span>
            <svg width="13" height="13" fill="none" stroke="#B45309" strokeWidth="2.4" viewBox="0 0 24 24"
              style={{ transform: showReminderList ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showReminderList && (
            <div style={{ borderTop: '1px solid rgba(217,119,6,0.2)' }}>
              {overdue.map(({ item, days }) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    padding: '10px 16px', border: 'none', borderBottom: '1px solid rgba(217,119,6,0.12)',
                    background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                    {item.nama_barang} <span style={{ color: 'var(--text-muted)' }}>({item.kode})</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#B45309', flexShrink: 0 }}>{days} hari</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid item */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
          Belum ada barang. Klik "Tambah Barang" untuk mulai.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {items.map(item => {
            const itemUnits = unitsByItem[item.id] ?? []
            const kondisiCounts: Record<string, number> = {}
            itemUnits.forEach(u => { kondisiCounts[u.kondisi] = (kondisiCounts[u.kondisi] ?? 0) + 1 })
            const thumb = item.foto ? getDriveThumbnailUrl(item.foto) : null
            return (
              <button
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left',
                  padding: 14, borderRadius: 14, border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--blue)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {thumb ? (
                    <img src={thumb} alt="" loading="lazy" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0, backgroundColor: 'var(--surface-min)' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: 'var(--surface-min)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="20" height="20" fill="none" stroke="var(--text-muted)" strokeWidth="1.75" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--blue)', letterSpacing: '0.03em' }}>{item.kode}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nama_barang}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {itemUnits.length === 0 ? (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Belum ada unit</span>
                  ) : (
                    Object.entries(kondisiCounts).map(([k, count]) => (
                      <span key={k} style={{
                        fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
                        color: KONDISI_COLORS[k], backgroundColor: KONDISI_BG[k],
                      }}>
                        {count} {k}
                      </span>
                    ))
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showAddModal && (
        <AddInventarisItemModal onClose={() => setShowAddModal(false)} onSuccess={refresh} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail view: edit item info, manage units (kondisi/tim per unit), QR preview
// ─────────────────────────────────────────────────────────────────────────────
function ItemDetailView({
  item, units, isMobile, onBack, onChange,
}: {
  item: InventarisItem
  units: InventarisUnit[]
  isMobile: boolean
  onBack: () => void
  onChange: () => Promise<void>
}) {
  const [editingInfo, setEditingInfo] = useState(false)
  const [namaBarang, setNamaBarang] = useState(item.nama_barang)
  const [spesifikasi, setSpesifikasi] = useState(item.spesifikasi ?? '')
  const [foto, setFoto] = useState(item.foto ?? '')
  const [tim, setTim] = useState(item.tim ?? '')
  const [savingInfo, setSavingInfo] = useState(false)
  const [error, setError] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [addingUnit, setAddingUnit] = useState(false)
  const [deletingItem, setDeletingItem] = useState(false)
  const [bulkKondisi, setBulkKondisi] = useState<KondisiUnit>(units[0]?.kondisi ?? 'Baik')
  const [bulkSaving, setBulkSaving] = useState(false)
  // Set only after a partial failure — narrows the next attempt to just the
  // units that failed, instead of re-writing (harmless but wasteful) or
  // masking which ones actually need attention.
  const [bulkFailedIds, setBulkFailedIds] = useState<Set<string> | null>(null)
  const [confirmingChecked, setConfirmingChecked] = useState(false)
  const checkedDays = daysSince(item.last_checked_at)

  useEffect(() => {
    QRCode.toDataURL(publicUrl(item.kode), { width: 240, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(''))
  }, [item.kode])

  useEffect(() => {
    setNamaBarang(item.nama_barang)
    setSpesifikasi(item.spesifikasi ?? '')
    setFoto(item.foto ?? '')
    setTim(item.tim ?? '')
  }, [item])

  const saveInfo = async () => {
    if (!namaBarang.trim()) { setError('Nama barang wajib diisi'); return }
    setSavingInfo(true)
    setError('')
    const { error: err } = await adminUpdate('inventaris_items', {
      nama_barang: namaBarang.trim(),
      spesifikasi: spesifikasi.trim() || null,
      foto: foto.trim() || null,
      tim: tim.trim() || null,
    }, item.id)
    setSavingInfo(false)
    if (err) { setError('Gagal menyimpan: ' + err.message); return }
    setEditingInfo(false)
    await onChange()
  }

  const addUnit = async () => {
    setAddingUnit(true)
    const nextUrutan = (units[units.length - 1]?.urutan ?? 0) + 1
    const { error: err } = await adminInsert('inventaris_units', {
      item_id: item.id,
      urutan: nextUrutan,
      kondisi: 'Baik',
    })
    setAddingUnit(false)
    if (err) { setError('Gagal menambah unit: ' + err.message); return }
    await onChange()
  }

  // Ubah kondisi unit (di sini atau di UnitRow) otomatis nge-refresh Pengecekan
  // Terakhir lewat trigger DB (cuma kalau kondisinya beneran berubah). Kalau
  // gak ada yang berubah nilainya, pakai tombol "Konfirmasi Pengecekan" di bawah.
  const bulkUpdate = async () => {
    setBulkSaving(true)
    setError('')
    const targets = bulkFailedIds ? units.filter(u => bulkFailedIds.has(u.id)) : units
    const results = await Promise.all(
      targets.map(u => adminUpdate('inventaris_units', { kondisi: bulkKondisi }, u.id).then(r => ({ id: u.id, error: r.error })))
    )
    setBulkSaving(false)
    const failed = results.filter(r => r.error)
    if (failed.length > 0) {
      setBulkFailedIds(new Set(failed.map(f => f.id)))
      setError(`Gagal update ${failed.length} dari ${targets.length} unit. Klik "Coba Lagi" untuk mengulang yang gagal saja.`)
      return
    }
    setBulkFailedIds(null)
    await onChange()
  }

  const confirmPengecekan = async () => {
    setConfirmingChecked(true)
    setError('')
    const { error: err } = await adminUpdate('inventaris_items', { last_checked_at: new Date().toISOString() }, item.id)
    setConfirmingChecked(false)
    if (err) { setError('Gagal konfirmasi pengecekan: ' + err.message); return }
    await onChange()
  }

  const deleteItem = async () => {
    if (!confirm(`Hapus "${item.nama_barang}" (${item.kode}) beserta semua unitnya? Tidak bisa dibatalkan.`)) return
    setDeletingItem(true)
    const { error: err } = await adminDelete('inventaris_items', item.id)
    setDeletingItem(false)
    if (err) { setError('Gagal menghapus: ' + err.message); return }
    onBack()
    await onChange()
  }

  return (
    <div style={{ padding: isMobile ? '16px 14px 40px' : '24px 28px 40px', maxWidth: 720 }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
          padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)',
          backgroundColor: 'var(--card)', color: 'var(--text-secondary)',
          fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        Kembali ke Inventaris
      </button>

      {error && (
        <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(102,0,0,0.1)', color: 'var(--color-danger)', fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Info card */}
      <div style={{ padding: 18, borderRadius: 14, border: '1px solid var(--border)', backgroundColor: 'var(--card)', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', letterSpacing: '0.03em', marginBottom: 6 }}>{item.kode}</div>
            {editingInfo ? (
              <div>
                <label style={labelStyle}>Nama Barang</label>
                <input value={namaBarang} onChange={e => setNamaBarang(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
                <label style={labelStyle}>Spesifikasi</label>
                <textarea value={spesifikasi} onChange={e => setSpesifikasi(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />
                <label style={labelStyle}>Link Foto</label>
                <input value={foto} onChange={e => setFoto(e.target.value)} placeholder="https://drive.google.com/..." style={{ ...inputStyle, marginBottom: 12 }} />
                <label style={labelStyle}>Penanggung Jawab</label>
                <input value={tim} onChange={e => setTim(e.target.value)} placeholder="Contoh: Tim Kebersihan" style={{ ...inputStyle, marginBottom: 12 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditingInfo(false); setNamaBarang(item.nama_barang); setSpesifikasi(item.spesifikasi ?? ''); setFoto(item.foto ?? ''); setTim(item.tim ?? '') }}
                    style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                    Batal
                  </button>
                  <button onClick={saveInfo} disabled={savingInfo}
                    style={{ padding: '8px 14px', borderRadius: 9, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: savingInfo ? 0.7 : 1 }}>
                    {savingInfo ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{item.nama_barang}</div>
                {item.spesifikasi && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>{item.spesifikasi}</div>}
                {item.foto && (
                  <img src={getDriveThumbnailUrl(item.foto, 'w400') ?? ''} alt="" style={{ width: 120, height: 120, borderRadius: 10, objectFit: 'cover', marginBottom: 10, display: 'block' }} />
                )}
                <button onClick={() => setEditingInfo(true)}
                  style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Edit Info
                </button>
              </>
            )}
          </div>

          {/* QR preview */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            {qrDataUrl && <img src={qrDataUrl} alt={`QR ${item.kode}`} style={{ width: 120, height: 120, borderRadius: 10, border: '1px solid var(--border-subtle)' }} />}
            <a href={publicUrl(item.kode)} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--blue)', textDecoration: 'none' }}>
              Buka halaman publik ↗
            </a>
          </div>
        </div>

        {/* Jumlah unit, penanggung jawab, pengecekan terakhir -- level barang, bukan
            per-unit lagi (barang yang sama selalu diperiksa & dipegang tim yang sama). */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Jumlah Unit</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{units.length} unit</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Penanggung Jawab</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: item.tim ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: item.tim ? 'normal' : 'italic' }}>
              {item.tim || 'Belum ada tim'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pengecekan Terakhir</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: checkedDays >= REMINDER_DAYS ? '#B45309' : 'var(--text-primary)' }}>
                {checkedDays} hari lalu
              </span>
              <button onClick={confirmPengecekan} disabled={confirmingChecked}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-secondary)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', opacity: confirmingChecked ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                {confirmingChecked ? '...' : 'Konfirmasi Pengecekan Hari Ini'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk update kondisi -- barang kaya ini biasa dicek bareng dalam satu kunjungan.
          Daripada edit kondisi satu-satu, terapkan ke semua unit sekaligus. Penanggung
          jawab & lokasi gak ikut sini -- lokasi karena emang beda per unit, penanggung
          jawab karena udah pindah ke level barang (edit lewat "Edit Info" di atas). */}
      {units.length > 1 && (
        <div style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(26,111,232,0.2)', backgroundColor: 'rgba(26,111,232,0.04)', marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--blue)', marginBottom: 10 }}>Update Kondisi Semua Unit Sekaligus</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={labelStyle}>Kondisi</label>
              <Dropdown value={bulkKondisi} options={KONDISI_OPTIONS} onChange={v => { setBulkKondisi(v as KondisiUnit); setBulkFailedIds(null) }} fontSize={13} />
            </div>
            <button onClick={bulkUpdate} disabled={bulkSaving}
              style={{ padding: '9px 16px', borderRadius: 9, border: 'none', backgroundColor: bulkFailedIds ? 'var(--color-danger)' : 'var(--blue)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: bulkSaving ? 0.7 : 1, whiteSpace: 'nowrap' }}>
              {bulkSaving ? 'Menerapkan...' : bulkFailedIds ? `Coba Lagi (${bulkFailedIds.size} Unit)` : `Terapkan ke ${units.length} Unit`}
            </button>
          </div>
        </div>
      )}

      {/* Units */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Unit ({units.length})</div>
        <button onClick={addUnit} disabled={addingUnit}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: addingUnit ? 0.7 : 1 }}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Tambah Unit
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {units.map(unit => (
          <UnitRow key={unit.id} unit={unit} onChange={onChange} />
        ))}
      </div>

      <button onClick={deleteItem} disabled={deletingItem}
        style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid rgba(224,62,62,0.3)', backgroundColor: 'rgba(224,62,62,0.08)', color: '#dc2626', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: deletingItem ? 0.7 : 1 }}>
        {deletingItem ? 'Menghapus...' : 'Hapus Barang Ini'}
      </button>
    </div>
  )
}

function UnitRow({ unit, onChange }: { unit: InventarisUnit; onChange: () => Promise<void> }) {
  const [lokasi, setLokasi] = useState(unit.lokasi ?? '')
  const [kondisi, setKondisi] = useState<KondisiUnit>(unit.kondisi)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const dirty = lokasi !== (unit.lokasi ?? '') || kondisi !== unit.kondisi

  const save = async () => {
    setSaving(true)
    const { error } = await adminUpdate('inventaris_units', { lokasi: lokasi.trim() || null, kondisi }, unit.id)
    setSaving(false)
    if (!error) await onChange()
  }

  const remove = async () => {
    if (!confirm(`Hapus unit ${unit.lokasi || `Unit ${unit.urutan}`}?`)) return
    setDeleting(true)
    const { error } = await adminDelete('inventaris_units', unit.id)
    setDeleting(false)
    if (!error) await onChange()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: 12, borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', flexShrink: 0, width: 56 }}>UNIT {unit.urutan}</div>
      <input
        value={lokasi}
        onChange={e => setLokasi(e.target.value)}
        placeholder="Lokasi (contoh: Halaman Depan)"
        style={{ ...inputStyle, flex: 2, minWidth: 160, padding: '9px 12px', fontSize: 13 }}
      />
      <div style={{ flex: 1, minWidth: 130 }}>
        <Dropdown value={kondisi} options={KONDISI_OPTIONS} onChange={v => setKondisi(v as KondisiUnit)} fontSize={13} />
      </div>
      {dirty && (
        <button onClick={save} disabled={saving}
          style={{ padding: '7px 12px', borderRadius: 8, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, opacity: saving ? 0.7 : 1 }}>
          {saving ? '...' : 'Simpan'}
        </button>
      )}
      <button onClick={remove} disabled={deleting}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: '#dc2626', cursor: 'pointer', flexShrink: 0 }}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Print view: bulk stiker generator -- 1 stiker design per kode, di-print
// sebanyak jumlah unit (biar tiap unit fisik bisa ditempelin).
// ─────────────────────────────────────────────────────────────────────────────
function PrintStikerView({
  items, unitsByItem, onClose,
}: {
  items: InventarisItem[]
  unitsByItem: Record<string, InventarisUnit[]>
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(items.map(i => i.id)))
  const [qrMap, setQrMap] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(true)

  useEffect(() => {
    let cancelled = false
    setGenerating(true)
    Promise.all(items.map(async item => {
      const url = await QRCode.toDataURL(publicUrl(item.kode), { width: 200, margin: 0 })
      return [item.kode, url] as const
    })).then(pairs => {
      if (cancelled) return
      setQrMap(Object.fromEntries(pairs))
      setGenerating(false)
    })
    return () => { cancelled = true }
  }, [items])

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const stickers: { kode: string; nama: string; unitNo: number }[] = []
  items.filter(i => selected.has(i.id)).forEach(item => {
    const count = unitsByItem[item.id]?.length ?? 1
    for (let i = 0; i < Math.max(count, 1); i++) {
      stickers.push({ kode: item.kode, nama: item.nama_barang, unitNo: i + 1 })
    }
  })

  return (
    <div style={{ padding: '20px 24px 60px' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #stiker-print-area, #stiker-print-area * { visibility: visible; }
          #stiker-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          #stiker-print-area .no-print { display: none !important; }
          .stiker-card { break-inside: avoid; page-break-inside: avoid; }
          @page { margin: 10mm; size: A4 portrait; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <button
          onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Kembali
        </button>
        <button
          onClick={() => window.print()}
          disabled={generating || stickers.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (generating || stickers.length === 0) ? 0.6 : 1 }}
        >
          {generating ? 'Menyiapkan QR...' : `Cetak ${stickers.length} Stiker`}
        </button>
      </div>

      <div className="no-print" style={{ marginBottom: 20, padding: 14, borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pilih barang</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {items.map(item => (
            <label key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8,
              border: `1px solid ${selected.has(item.id) ? 'var(--blue)' : 'var(--border)'}`,
              backgroundColor: selected.has(item.id) ? 'rgba(26,111,232,0.06)' : 'var(--bg)', cursor: 'pointer',
            }}>
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} style={{ margin: 0 }} />
              <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{item.kode} · {item.nama_barang}</span>
            </label>
          ))}
        </div>
      </div>

      <div id="stiker-print-area" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {stickers.map((s, i) => (
          <div key={`${s.kode}-${i}`} className="stiker-card" style={{
            border: '1px dashed #999', borderRadius: 8, padding: '10px 8px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#333' }}>TIM SARPRAS</div>
            {qrMap[s.kode] && <img src={qrMap[s.kode]} alt={s.kode} style={{ width: 80, height: 80 }} />}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>{s.kode}</div>
            <div style={{ fontSize: 9, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{s.nama}</div>
          </div>
        ))}
      </div>

      {stickers.length === 0 && !generating && (
        <div className="no-print" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
          Pilih minimal 1 barang untuk dicetak.
        </div>
      )}
    </div>
  )
}
