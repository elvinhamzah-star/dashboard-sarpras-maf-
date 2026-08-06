import { useState, useEffect } from 'react'
import { fetchInventarisItemByKode, InventarisItem, InventarisUnit } from '../lib/supabase'
import { KONDISI_COLORS, KONDISI_BG, getDriveThumbnailUrl } from '../lib/data'

interface InventarisPublicPageProps {
  kode: string
}

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
            <div style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 10px rgba(15,28,46,0.06)', marginBottom: 16 }}>
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

            {/* List unit -- feed/katalog style */}
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, paddingLeft: 2 }}>
              {units.length} Unit
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {units.map(unit => (
                <div key={unit.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  backgroundColor: '#fff', borderRadius: 12, padding: '12px 14px',
                  boxShadow: '0 1px 4px rgba(15,28,46,0.04)',
                }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1E293B' }}>Unit {unit.urutan}</span>
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                    color: KONDISI_COLORS[unit.kondisi], backgroundColor: KONDISI_BG[unit.kondisi],
                  }}>
                    {unit.kondisi}
                  </span>
                </div>
              ))}
              {units.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: '#8A99AB', fontSize: 12.5, backgroundColor: '#fff', borderRadius: 12 }}>
                  Belum ada unit terdaftar.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
