import { describe, it, expect } from 'vitest'
import { deriveProgramTotals, deriveNilaiAset } from './deriveTotals'

const P = (over: Partial<Parameters<typeof deriveProgramTotals>[0]> = {}) => ({
  jenis_pekerjaan: 'Proyek',
  progress_percent: 0,
  total_anggaran: 0,
  realisasi_terkini: 0,
  sisa_anggaran: 0,
  ...over,
})
const S = (
  progress_percent: number,
  total_anggaran: number,
  realisasi_terkini: number,
) => ({ progress_percent, total_anggaran, realisasi_terkini })

describe('deriveProgramTotals', () => {
  it('no subs → returns parent stored values', () => {
    const r = deriveProgramTotals(
      P({ progress_percent: 40, total_anggaran: 100, realisasi_terkini: 30, sisa_anggaran: 70 }),
      [],
    )
    expect(r).toEqual({
      total_anggaran: 100,
      realisasi_terkini: 30,
      sisa_anggaran: 70,
      progress_percent: 40,
      hasSubs: false,
      realisasiFromSubs: false,
    })
  })

  it('no subs, Operasional → progress derived from realisasi ratio', () => {
    const r = deriveProgramTotals(
      P({ jenis_pekerjaan: 'Operasional', total_anggaran: 200, realisasi_terkini: 50, progress_percent: 0 }),
      [],
    )
    expect(r.progress_percent).toBe(25)
    expect(r.hasSubs).toBe(false)
  })

  it('subs sum anggaran; realisasi kept at parent when all subs have realisasi 0 (P-001 case)', () => {
    const r = deriveProgramTotals(
      P({ total_anggaran: 999, realisasi_terkini: 140706000 }),
      [S(50, 100000000, 0), S(0, 40706000, 0)],
    )
    expect(r.total_anggaran).toBe(140706000)
    expect(r.realisasi_terkini).toBe(140706000)
    expect(r.realisasiFromSubs).toBe(false)
    expect(r.sisa_anggaran).toBe(0)
  })

  it('subs carry realisasi → realisasi summed from subs', () => {
    const r = deriveProgramTotals(
      P({ total_anggaran: 1, realisasi_terkini: 5 }),
      [S(100, 100, 80), S(50, 100, 20)],
    )
    expect(r.total_anggaran).toBe(200)
    expect(r.realisasi_terkini).toBe(100)
    expect(r.realisasiFromSubs).toBe(true)
    expect(r.sisa_anggaran).toBe(100)
  })

  it('progress is anggaran-weighted average of subs', () => {
    const r = deriveProgramTotals(
      P(),
      [S(100, 300, 0), S(0, 100, 0)],
    )
    expect(r.progress_percent).toBe(75)
  })

  it('progress falls back to plain mean when subs have zero anggaran', () => {
    const r = deriveProgramTotals(P(), [S(40, 0, 0), S(60, 0, 0)])
    expect(r.progress_percent).toBe(50)
  })
})

describe('deriveNilaiAset', () => {
  it('derives from rincian sum and flags mismatch with stored', () => {
    const r = deriveNilaiAset({
      hasil_nilai_aset: 500,
      hasil_rincian: [{ nama: 'a', ukuran: 0, satuan: 'm²', biaya: 300 }],
      realisasi_terkini: 0,
    })
    expect(r.derived).toBe(300)
    expect(r.stored).toBe(500)
    expect(r.display).toBe(500)
    expect(r.mismatch).toBe(true)
  })

  it('no mismatch when stored equals derived', () => {
    const r = deriveNilaiAset({
      hasil_nilai_aset: 300,
      hasil_rincian: [{ nama: 'a', ukuran: 0, satuan: 'm²', biaya: 300 }],
      realisasi_terkini: 0,
    })
    expect(r.mismatch).toBe(false)
  })

  it('no rincian → derived 0, no mismatch, display falls back to stored then realisasi', () => {
    const r = deriveNilaiAset({ hasil_nilai_aset: null, hasil_rincian: [], realisasi_terkini: 42 })
    expect(r.derived).toBe(0)
    expect(r.mismatch).toBe(false)
    expect(r.display).toBe(42)
  })
})
