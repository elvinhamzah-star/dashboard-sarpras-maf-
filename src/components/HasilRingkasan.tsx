import { useEffect, useState } from 'react'
import {
  Program,
  Documentation,
  BeforeAfterPair,
  HasilKategori,
  fetchBeforeAfterPairs,
  fetchDocumentation,
} from '../lib/supabase'
import { formatRupiah, getDriveThumbnailUrl } from '../lib/data'
import { katFromJenis } from './HasilFormModal'

interface Props {
  program: Program
  isMobile: boolean
  onNavigateGaleri?: () => void
}

const NILAI_LABEL: Record<HasilKategori, { label: string; sub: string }> = {
  fisik: { label: 'Nilai Aset', sub: 'nilai perolehan aset jadi' },
  barang: { label: 'Nilai Pengadaan', sub: 'nilai barang yang diadakan' },
  jasa: { label: 'Total Realisasi', sub: 'total realisasi operasional' },
}

const RINCIAN_TITLE: Record<HasilKategori, string> = {
  fisik: 'Rincian Hasil per Lokasi',
  barang: 'Rincian Pengadaan per Item',
  jasa: '',
}

export default function HasilRingkasan({ program, isMobile, onNavigateGaleri }: Props) {
  const [pairs, setPairs] = useState<BeforeAfterPair[]>([])
  const [docs, setDocs] = useState<Documentation[]>([])

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

  const dampak = program.hasil_dampak ?? []
  const rincian = program.hasil_rincian ?? []
  const docById = (id: string | null) => (id ? docs.find(d => d.id === id) : undefined)

  // Live totals for rincian footer
  const totUkuran = rincian.reduce((s, r) => s + (Number(r.ukuran) || 0), 0)
  const totBiaya = rincian.reduce((s, r) => s + (Number(r.biaya) || 0), 0)
  const perUnit = totUkuran > 0 ? Math.round(totBiaya / totUkuran) : 0
  const satuan = rincian[0]?.satuan || (kat === 'fisik' ? 'm²' : 'unit')

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

  return (
    <div>
      {/* 1. Metrics — Nilai (hero) + Anggaran + Efisiensi */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? 9 : 12,
          marginBottom: isMobile ? 11 : 14,
        }}
      >
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: isMobile ? '11px 13px' : '15px 17px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            gridColumn: isMobile ? '1 / -1' : undefined,
          }}
        >
          <div style={eyebrowStyle}>{nilaiCfg.label}</div>
          <div style={{ fontSize: isMobile ? 15.5 : 18, fontWeight: 700, letterSpacing: '-0.03em', marginTop: isMobile ? 5 : 7, color: 'var(--blue)' }}>
            {formatRupiah(nilaiAset)}
          </div>
          <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', marginTop: 4 }}>{nilaiCfg.sub}</div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: isMobile ? '11px 13px' : '15px 17px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={eyebrowStyle}>Total Anggaran</div>
          <div style={{ fontSize: isMobile ? 15.5 : 18, fontWeight: 700, letterSpacing: '-0.03em', marginTop: isMobile ? 5 : 7, color: 'var(--text-primary)' }}>
            {formatRupiah(anggaran)}
          </div>
          <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', marginTop: 4 }}>pagu awal pekerjaan</div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: isMobile ? '11px 13px' : '15px 17px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={eyebrowStyle}>Efisiensi</div>
          <div style={{ fontSize: isMobile ? 15.5 : 18, fontWeight: 700, letterSpacing: '-0.03em', marginTop: isMobile ? 5 : 7, color: efisiensi >= 0 ? 'var(--green)' : '#dc2626' }}>
            {formatRupiah(Math.abs(efisiensi))}
          </div>
          <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {efisiensi > 0
              ? `${efisiensiPct.toFixed(1).replace('.', ',')}% di bawah anggaran`
              : efisiensi < 0
                ? `${Math.abs(efisiensiPct).toFixed(1).replace('.', ',')}% di atas anggaran`
                : 'sesuai anggaran'}
          </div>
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

      {/* 3. Kondisi Sebelum & Sesudah */}
      {pairs.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '4px 2px 13px' }}>
            <span style={{ width: 4, height: 17, borderRadius: 2, background: 'var(--blue)' }} />
            <h2 style={{ fontSize: isMobile ? 13 : 14.5, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>Kondisi Sebelum &amp; Sesudah</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pairs.slice(0, 2).map(pair => {
              const beforeDoc = docById(pair.before_doc_id)
              const afterDoc = docById(pair.after_doc_id)
              const cell = (d: Documentation | undefined, kind: 'before' | 'after') => {
                const thumb = d ? getDriveThumbnailUrl(d.link_foto, 'w800') : null
                return (
                  <div style={{ flex: 1, position: 'relative', height: isMobile ? 148 : 210, background: kind === 'before' ? 'linear-gradient(135deg, #8a97a8, #6b7789)' : 'linear-gradient(135deg, #35a06b, #1f7d4e)', display: 'flex', alignItems: 'flex-end', padding: isMobile ? 9 : 11, overflow: 'hidden' }}>
                    {thumb && <img src={thumb} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <span style={{ position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#fff', background: 'rgba(0,0,0,0.42)', padding: '3px 9px', borderRadius: 99 }}>
                      {kind === 'before' ? 'Sebelum' : 'Sesudah'}
                    </span>
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
          {onNavigateGaleri && (
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

      {/* 4. Rincian Hasil (fisik/barang) */}
      {kat !== 'jasa' && rincian.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '4px 2px 13px' }}>
            <span style={{ width: 4, height: 17, borderRadius: 2, background: 'var(--green)' }} />
            <h2 style={{ fontSize: isMobile ? 13 : 14.5, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>{RINCIAN_TITLE[kat]}</h2>
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
              {rincian.length} {kat === 'fisik' ? 'titik' : 'item'}
            </span>
          </div>

          {/* Total keseluruhan — ringkasan di atas, sebelum rincian per lokasi */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '11px 13px' : '12px 15px', borderRadius: 11, background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.15)', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Keseluruhan</span>
            <span style={{ fontSize: isMobile ? 15 : 16, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {kat === 'fisik' ? (
                <>
                  {totUkuran.toLocaleString('id-ID')} {satuan}
                  <small style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--green)', marginTop: 2 }}>≈ Rp {perUnit.toLocaleString('id-ID')} / {satuan}</small>
                </>
              ) : (
                <>
                  {formatRupiah(totBiaya)}
                  <small style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--green)', marginTop: 2 }}>{rincian.length} item</small>
                </>
              )}
            </span>
          </div>

          {rincian.map((r, i) => {
            const perItem = r.ukuran > 0 ? Math.round(r.biaya / r.ukuran) : 0
            return (
              <div key={i} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: 11, padding: isMobile ? '11px 13px' : '13px 15px', marginBottom: 9 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{r.nama || '-'}</div>
                  <div>
                    <div style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(r.biaya)}</div>
                    {kat === 'fisik' && perItem > 0 && (
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, textAlign: 'right' }}>Rp {perItem.toLocaleString('id-ID')} / {r.satuan}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--surface-2)', padding: '3px 9px', borderRadius: 7 }}>
                    {kat === 'fisik' ? 'Luas' : 'Jumlah'} <b style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{r.ukuran.toLocaleString('id-ID')}</b>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 10.5 }}>{r.satuan}</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
