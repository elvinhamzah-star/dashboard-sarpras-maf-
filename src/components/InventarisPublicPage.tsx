import { useState, useEffect } from 'react'
import { fetchInventarisItemByKode, InventarisItem, InventarisUnit } from '../lib/supabase'
import { KONDISI_COLORS, KONDISI_BG, getDriveThumbnailUrl } from '../lib/data'

interface InventarisPublicPageProps {
  kode: string
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

const ICON_PIN = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2" style={{ flexShrink: 0 }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
)
const ICON_TEAM = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A99AB" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const ICON_CLOCK = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A99AB" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)

export default function InventarisPublicPage({ kode }: InventarisPublicPageProps) {
  const [item, setItem] = useState<InventarisItem | null>(null)
  const [units, setUnits] = useState<InventarisUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetchInventarisItemByKode(kode).then(({ item, units }) => {
      if (!item) { setNotFound(true); setLoading(false); return }
      setItem(item)
      setUnits(units)
      setLoading(false)
    })
  }, [kode])

  const thumb = item?.foto ? getDriveThumbnailUrl(item.foto, 'w800') : null
  const singleUnit = units.length === 1 ? units[0] : null

  return (
    <div style={{
      minHeight: '100dvh', backgroundColor: '#F5F7FA',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#0A1628' }}>
        <img src="/pbb-app-icon-white.svg" alt="" style={{ width: 30, height: 30, borderRadius: 7 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Tim Sarpras</div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)' }}>Inventaris Barang</div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 480, padding: '20px 16px 48px', boxSizing: 'border-box' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8A99AB', fontSize: 13 }}>Memuat...</div>
        )}

        {!loading && notFound && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginBottom: 6 }}>Barang tidak ditemukan</div>
            <div style={{ fontSize: 13, color: '#8A99AB' }}>Kode "{kode}" tidak terdaftar di sistem.</div>
          </div>
        )}

        {!loading && item && (
          <>
            {/* Kartu produk */}
            <div style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 10px rgba(15,28,46,0.06)', marginBottom: 12 }}>
              {thumb ? (
                <img src={thumb} alt={item.nama_barang} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block', backgroundColor: '#EEF1F5' }} />
              ) : (
                <div style={{ width: '100%', aspectRatio: '4/3', backgroundColor: '#EEF1F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="40" height="40" fill="none" stroke="#B7C1CE" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                </div>
              )}
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1A6FE8', letterSpacing: '0.04em', marginBottom: 4 }}>{item.kode}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: item.spesifikasi ? 6 : 0 }}>{item.nama_barang}</div>
                {item.spesifikasi && (
                  <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{item.spesifikasi}</div>
                )}
              </div>
            </div>

            {/* Info card -- level barang: jumlah unit, (kondisi kalau cuma 1 unit),
                penanggung jawab, pengecekan terakhir. Ini SELALU dari data item,
                bukan per-unit lagi (barang yang sama selalu dipegang & diperiksa
                oleh 1 tim yang sama, sekaligus semua unitnya). */}
            <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: units.length > 1 ? 10 : 0 }}>
              <Row label="Total unit" value={`${units.length} unit`} />
              {singleUnit && <Row label="Kondisi" value={<KondisiPill kondisi={singleUnit.kondisi} />} />}
              <Divider />
              <Row icon={ICON_TEAM} label="Penanggung jawab" value={item.tim || 'Belum ada tim'} muted={!item.tim} />
              <Row icon={ICON_CLOCK} label="Pengecekan terakhir" value={`${daysSince(item.last_checked_at)} hari lalu`} last />
            </div>

            {/* List per-unit -- cuma kalau lebih dari 1 unit (lokasi & kondisi beda-beda
                per unit; penanggung jawab & pengecekan terakhir udah di kartu atas). */}
            {units.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {units.map(unit => (
                  <div key={unit.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    backgroundColor: '#fff', borderRadius: 10, padding: '11px 12px',
                    borderLeft: unit.kondisi !== 'Baik' ? `3px solid ${KONDISI_COLORS[unit.kondisi]}` : undefined,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ color: unit.lokasi ? '#8A99AB' : '#C7CDD6' }}>{ICON_PIN}</span>
                      <span style={{
                        fontSize: 13.5, fontWeight: 500, color: unit.lokasi ? '#1E293B' : '#B0B8C4',
                        fontStyle: unit.lokasi ? 'normal' : 'italic',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {unit.lokasi || 'Lokasi belum diisi'}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500, color: KONDISI_COLORS[unit.kondisi], flexShrink: 0 }}>{unit.kondisi}</span>
                  </div>
                ))}
              </div>
            )}

            {units.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: '#8A99AB', fontSize: 12.5, backgroundColor: '#fff', borderRadius: 12, marginTop: 10 }}>
                Belum ada unit terdaftar.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Row({
  icon, label, value, muted, last,
}: {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
  muted?: boolean
  last?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      marginBottom: last ? 0 : 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        <span style={{ fontSize: 12, color: '#8A99AB' }}>{label}</span>
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: muted ? '#B0B8C4' : '#1E293B', fontStyle: muted ? 'italic' : 'normal' }}>
        {value}
      </span>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: '#F1F3F6', margin: '2px 0 10px' }} />
}

function KondisiPill({ kondisi }: { kondisi: InventarisUnit['kondisi'] }) {
  return (
    <span style={{
      fontSize: 12.5, fontWeight: 500, padding: '4px 10px', borderRadius: 99,
      color: KONDISI_COLORS[kondisi], backgroundColor: KONDISI_BG[kondisi],
    }}>
      {kondisi}
    </span>
  )
}
