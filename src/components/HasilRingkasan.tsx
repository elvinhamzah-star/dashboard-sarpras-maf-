import { useEffect, useState } from 'react'
import {
  Program,
  Documentation,
  BeforeAfterPair,
  HasilKategori,
  fetchBeforeAfterPairs,
  fetchDocumentation,
  invalidateCache,
} from '../lib/supabase'
import { formatRupiah, getDriveThumbnailUrl } from '../lib/data'
import { katFromJenis } from './HasilFormModal'
import ManageBeforeAfterModal from './ManageBeforeAfterModal'

interface Props {
  program: Program
  isMobile: boolean
  isAdmin?: boolean
  onNavigateGaleri?: () => void
}

const NILAI_LABEL: Record<HasilKategori, { label: string; sub: string }> = {
  fisik: { label: 'Nilai Aset', sub: 'nilai perolehan aset jadi' },
  barang: { label: 'Nilai Pengadaan', sub: 'nilai barang yang diadakan' },
  jasa: { label: 'Total Realisasi', sub: 'total realisasi operasional' },
}

export default function HasilRingkasan({ program, isMobile, isAdmin, onNavigateGaleri }: Props) {
  const [pairs, setPairs] = useState<BeforeAfterPair[]>([])
  const [docs, setDocs] = useState<Documentation[]>([])
  const [showManageBA, setShowManageBA] = useState(false)

  // Refetch BA pairs after the manage modal saves, so the featured list here
  // updates immediately without a full page reload.
  const refreshPairs = async () => {
    invalidateCache('before_after_pairs')
    const { data } = await fetchBeforeAfterPairs()
    if (data) setPairs((data as BeforeAfterPair[]).filter(p => p.program_id === program.id))
  }

  useEffect(() => {
    let alive = true
    Promise.all([fetchBeforeAfterPairs(), fetchDocumentation()]).then(([pRes, dRes]) => {
      if (!alive) return
      if (pRes.data) setPairs((pRes.data as BeforeAfterPair[]).filter(p => p.program_id === program.id))
      if (dRes.data) setDocs((dRes.data as Documentation[]).filter(d => d.program_id === program.id))
    })
    return () => { alive = false }
  }, [program.id])

  const kat: HasilKategori = program.hasil_kategori || katFromJenis(program.jenis_pekerjaan)
  const nilaiCfg = NILAI_LABEL[kat]
  const nilaiAset = program.hasil_nilai_aset ?? program.realisasi_terkini ?? 0
  const anggaran = program.total_anggaran ?? 0
  const realisasi = program.realisasi_terkini ?? 0
  const efisiensi = anggaran - realisasi
  const efisiensiPct = anggaran > 0 ? (efisiensi / anggaran) * 100 : 0
  const isHemat = efisiensi > 0
  const isOver = efisiensi < 0
  const isPas = efisiensi === 0
  const pctStr = Math.abs(efisiensiPct).toFixed(1).replace('.', ',')

  const dampak = program.hasil_dampak ?? []
  const docById = (id: string | null) => (id ? docs.find(d => d.id === id) : undefined)
  // Hanya pasangan yang ditandai admin ("tampil_ringkasan") yang muncul di sini,
  // dibatasi maks. 2 teratas (urutan). Selebihnya tetap ada di Galeri.
  const featuredPairs = pairs.filter(p => p.tampil_ringkasan).slice(0, 2)

  const cardStyle: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    padding: isMobile ? '15px 16px' : '20px 22px',
    marginBottom: isMobile ? 11 : 14,
  }
  const eyebrowStyle: React.CSSProperties = {
    fontSize: 10.5,
    color: 'var(--text-muted)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  }
  const boxBase: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
    padding: isMobile ? '12px 13px' : '18px 17px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    textAlign: 'center',
  }
  const valStyle: React.CSSProperties = {
    fontSize: isMobile ? 16 : 20,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    marginTop: isMobile ? 6 : 7,
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--text-primary)',
  }
  const subStyle: React.CSSProperties = {
    fontSize: isMobile ? 10 : 11,
    color: 'var(--text-muted)',
    marginTop: 4,
  }
  const washHemat: React.CSSProperties = { background: 'rgba(27,94,43,0.05)', border: '1px solid rgba(27,94,43,0.14)' }
  const washOver: React.CSSProperties = { background: 'rgba(102,0,0,0.045)', border: '1px solid rgba(102,0,0,0.12)' }

  return (
    <div>
      {/* 1. Metrics — adaptif. Mobile: Nilai (hero, full-width) + duo di bawah.
          Desktop: 3 kolom sama lebar, font angka seragam. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? 9 : 12,
          marginBottom: isMobile ? 11 : 14,
        }}
      >
        {/* Nilai Aset — hero (full-width) di mobile, kolom biasa di desktop */}
        <div
          style={{
            ...boxBase,
            gridColumn: isMobile ? '1 / -1' : undefined,
            padding: isMobile ? '14px 13px' : '18px 17px',
          }}
        >
          <div style={eyebrowStyle}>{nilaiCfg.label}</div>
          <div style={{ ...valStyle, fontSize: 20, marginTop: 6, color: 'var(--blue)' }}>
            {formatRupiah(nilaiAset)}
          </div>
          <div style={{ ...subStyle, fontSize: isMobile ? 10.5 : 11 }}>{nilaiCfg.sub}</div>
        </div>

        {/* Total Anggaran */}
        <div style={boxBase}>
          <div style={eyebrowStyle}>Total Anggaran</div>
          <div style={valStyle}>{formatRupiah(anggaran)}</div>
          <div style={subStyle}>pagu awal pekerjaan</div>
        </div>

        {/* Efisiensi / Selisih — adaptif 3 state */}
        <div style={{ ...boxBase, ...(isHemat ? washHemat : isOver ? washOver : {}) }}>
          <div style={eyebrowStyle}>{isOver ? 'Selisih Anggaran' : 'Efisiensi Anggaran'}</div>
          {isPas ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: isMobile ? 11 : 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(26,111,232,0.12)', color: 'var(--blue-dark)' }}>
                Tepat sesuai pagu
              </span>
            </div>
          ) : (
            <>
              <div style={valStyle}>
                {isOver && <span style={{ color: '#660000' }}>+ </span>}
                {formatRupiah(Math.abs(efisiensi))}
              </div>
              <div style={{ ...subStyle, color: isHemat ? 'var(--green)' : '#660000', fontWeight: 700 }}>
                {pctStr}% {isHemat ? 'di bawah pagu' : 'di atas pagu'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Dampak & Manfaat */}
      {dampak.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 11 }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            </span>
            <span style={{ ...eyebrowStyle }}>Dampak &amp; Manfaat</span>
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, margin: 0, padding: 0 }}>
            {dampak.map((d, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: isMobile ? 12.5 : 13.5, lineHeight: 1.45, color: 'var(--text-primary)', fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', marginTop: 6, flexShrink: 0 }} />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Kondisi Sebelum & Sesudah — dokumentasi di paling bawah.
          Hanya relevan untuk pekerjaan Selesai — On Going/On Hold secara
          definisi belum punya kondisi "Sesudah". Untuk admin di pekerjaan
          Selesai, kartu selalu muncul (walau belum ada pasangan yang
          ditampilkan) agar tombol Kelola tetap tersedia dari halaman ini. */}
      {program.status === 'Selesai' && (featuredPairs.length > 0 || isAdmin) && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 9, margin: '4px 2px 13px' }}>
            <h2 style={{ fontSize: isMobile ? 13.5 : 14.5, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>Kondisi Sebelum &amp; Sesudah</h2>
            {isAdmin && (isMobile ? (
              <button
                onClick={() => setShowManageBA(true)}
                title="Kelola Sebelum/Sesudah"
                aria-label="Kelola Sebelum/Sesudah"
                style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border-subtle)', background: 'var(--card)', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--blue)'; b.style.color = '#fff'; b.style.borderColor = 'var(--blue)' }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--card)'; b.style.color = 'var(--text-muted)'; b.style.borderColor = 'var(--border-subtle)' }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </button>
            ) : (
              <button
                onClick={() => setShowManageBA(true)}
                title="Kelola Sebelum/Sesudah"
                style={{ height: 34, padding: '0 14px', borderRadius: 9, border: '1px solid var(--border-subtle)', background: 'var(--card)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, flexShrink: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--blue)'; b.style.color = '#fff'; b.style.borderColor = 'var(--blue)' }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--card)'; b.style.color = 'var(--text-secondary)'; b.style.borderColor = 'var(--border-subtle)' }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                Kelola Sebelum/Sesudah
              </button>
            ))}
          </div>
          {featuredPairs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: isMobile ? '20px 12px' : '28px 16px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: isMobile ? 12.5 : 13, marginBottom: 6 }}>Belum ada pasangan Sebelum/Sesudah yang ditampilkan di sini</div>
              <div style={{ fontSize: 12 }}>Klik <strong>Kelola Sebelum/Sesudah</strong> untuk memilih foto (maks. 2).</div>
            </div>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {featuredPairs.map(pair => {
              const beforeDoc = docById(pair.before_doc_id)
              const afterDoc = docById(pair.after_doc_id)
              const cell = (d: Documentation | undefined, kind: 'before' | 'after') => {
                const thumb = d ? getDriveThumbnailUrl(d.link_foto, 'w800') : null
                return (
                  <div style={{ flex: 1, position: 'relative', height: isMobile ? 160 : 280, background: kind === 'before' ? 'linear-gradient(135deg, #8a97a8, #6b7789)' : 'linear-gradient(135deg, #35a06b, #1f7d4e)', display: 'flex', alignItems: 'flex-end', padding: isMobile ? 9 : 11, overflow: 'hidden' }}>
                    {thumb && <img src={thumb} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                    {/* Label Sebelum/Sesudah — style & font size disamakan dengan halaman Galeri */}
                    <div style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: isMobile ? 4 : 5, fontSize: isMobile ? 8.5 : 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', padding: isMobile ? '3px 7px' : '4px 10px', borderRadius: 99 }}>
                      <span style={{ width: isMobile ? 5 : 6, height: isMobile ? 5 : 6, borderRadius: '50%', background: kind === 'before' ? '#ff5a5a' : '#34d399' }} />
                      {kind === 'before' ? 'Sebelum' : 'Sesudah'}
                    </div>
                  </div>
                )
              }
              return (
                <div key={pair.id} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                    {cell(beforeDoc, 'before')}
                    {cell(afterDoc, 'after')}
                  </div>
                  {pair.label && (
                    <div style={{ padding: isMobile ? '9px 12px' : '10px 13px', fontSize: isMobile ? 12 : 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{pair.label}</div>
                  )}
                </div>
              )
            })}
          </div>
          )}
          {featuredPairs.length > 0 && onNavigateGaleri && (
            <button
              onClick={onNavigateGaleri}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, width: '100%', padding: 9, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--blue)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Lihat semua dokumentasi di Galeri
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}
        </div>
      )}

      {isAdmin && showManageBA && (
        <ManageBeforeAfterModal
          programId={program.id}
          programName={program.nama_pekerjaan}
          docs={docs}
          onClose={() => setShowManageBA(false)}
          onSaved={refreshPairs}
        />
      )}
    </div>
  )
}
