import { describe, it, expect } from 'vitest'
import { deriveProgramTotals, withChecklistProgress, deriveHasilRincianFromSubPrograms } from './deriveTotals'

describe('deriveProgramTotals realisasi matching', () => {
  const program = { id: 'P-019', jenis_pekerjaan: 'Pengadaan', progress_percent: 0, total_anggaran: 1000000, realisasi_terkini: 0, sisa_anggaran: 0, nama_pekerjaan: 'Pengadaan Depot Air Minum' }

  it('matches by program_id when set, ignoring a mismatched nama_pekerjaan', () => {
    const transactions = [{ nama_pekerjaan: 'nama lama yang beda', program_id: 'P-019', jenis_transaksi: 'Keluar', nominal: 300000 }]
    expect(deriveProgramTotals(program as never, [], transactions as never).realisasi_terkini).toBe(300000)
  })

  it('falls back to name match when program_id is null (legacy row)', () => {
    const transactions = [{ nama_pekerjaan: 'Pengadaan Depot Air Minum', program_id: null, jenis_transaksi: 'Keluar', nominal: 150000 }]
    expect(deriveProgramTotals(program as never, [], transactions as never).realisasi_terkini).toBe(150000)
  })
})

describe('withChecklistProgress', () => {
  // Sakan Bukhoro (id 20): 2 dari 14 item diceklis Selesai (nilai gabungan
  // Rp 39.470.000 dari total checklist Rp 64.130.000) -> progres 62%.
  const bukhoro = { id: 20, progress_percent: 6, realisasi_terkini: 0, sisa_anggaran: 78203240, total_anggaran: 78203240 }
  const tasks = [
    { sub_program_id: 20, nilai: 34200000, status: 'Selesai' as const },
    { sub_program_id: 20, nilai: 5270000, status: 'Selesai' as const },
    { sub_program_id: 20, nilai: 3600000, status: 'Belum Mulai' as const },
    { sub_program_id: 20, nilai: 8405000, status: 'Belum Mulai' as const },
    { sub_program_id: 20, nilai: 5050000, status: 'Belum Mulai' as const },
    { sub_program_id: 20, nilai: 900000, status: 'Belum Mulai' as const },
    { sub_program_id: 20, nilai: 475000, status: 'Belum Mulai' as const },
    { sub_program_id: 20, nilai: 225000, status: 'Belum Mulai' as const },
    { sub_program_id: 20, nilai: 200000, status: 'Belum Mulai' as const },
    { sub_program_id: 20, nilai: 1800000, status: 'Belum Mulai' as const },
    { sub_program_id: 20, nilai: 2250000, status: 'Belum Mulai' as const },
    { sub_program_id: 20, nilai: 270000, status: 'Belum Mulai' as const },
    { sub_program_id: 20, nilai: 675000, status: 'Belum Mulai' as const },
    { sub_program_id: 20, nilai: 810000, status: 'Belum Mulai' as const },
  ]

  it('recomputes progress_percent from checklist status', () => {
    expect(withChecklistProgress([bukhoro], tasks)[0].progress_percent).toBe(62)
  })

  it('does NOT touch realisasi_terkini/sisa_anggaran — itu murni input manual, bukan nilai RAB checklist', () => {
    const result = withChecklistProgress([bukhoro], tasks)[0] as typeof bukhoro
    expect(result.realisasi_terkini).toBe(0)
    expect(result.sisa_anggaran).toBe(78203240)
  })

  it('leaves subs without any checklist task untouched', () => {
    const other = { id: 99, progress_percent: 40, realisasi_terkini: 503767470, sisa_anggaran: 698642920, total_anggaran: 1202410390 }
    expect(withChecklistProgress([other], tasks)[0]).toEqual(other)
  })
})

describe('deriveHasilRincianFromSubPrograms', () => {
  it('pakai realisasi_terkini manual, bukan nilai RAB checklist', () => {
    // Sakan Bukhoro: checklist bilang Rp 39.470.000 (lihat suite di atas),
    // tapi realisasi manual yang beneran masuk ke user baru Rp 0 — hasilnya
    // harus ngikut yang manual, jadi gedung ini gak nongol sama sekali.
    const subs = [
      { nama_gedung: 'Sakan Bukhoro', realisasi_terkini: 0, status: 'On Going' },
      { nama_gedung: 'Sakan Tirmidz', realisasi_terkini: 43726900, status: 'On Going' },
      { nama_gedung: 'Sakan Qozvin', realisasi_terkini: 160171350, status: 'Selesai' },
      { nama_gedung: 'Sakan Cordova', realisasi_terkini: 0, status: 'Perencanaan' },
    ]
    const result = deriveHasilRincianFromSubPrograms(subs as never)
    expect(result).toEqual([
      { nama: 'Sakan Qozvin', biaya: 160171350, satuan: 'gedung', ukuran: 1, status: 'Selesai' },
      { nama: 'Sakan Tirmidz', biaya: 43726900, satuan: 'gedung', ukuran: 1, status: 'Berjalan' },
    ])
  })
})
