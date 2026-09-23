import { describe, it, expect } from 'vitest'
import { deriveProgramTotals } from './deriveTotals'

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
