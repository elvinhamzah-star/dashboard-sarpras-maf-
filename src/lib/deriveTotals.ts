import { Program, SubProgram, Transaction } from './supabase'
import { getEffectiveProgress } from './data'

export interface DerivedTotals {
  total_anggaran: number
  realisasi_terkini: number
  sisa_anggaran: number
  progress_percent: number
  hasSubs: boolean
  realisasiFromSubs: boolean
}

/**
 * Realisasi = single source of truth adalah transaksi Keluar/Keluar PBB yang
 * nama_pekerjaan-nya cocok persis dengan program. Dihitung ulang tiap render
 * (bukan snapshot di kolom programs.realisasi_terkini) supaya kalau admin
 * mengedit nama_pekerjaan transaksi (mis. betulkan salah ketik), realisasi
 * otomatis re-sync tanpa perlu rekonsiliasi manual.
 */
function sumRealisasiFromTransactions(namaPekerjaan: string, transactions: Pick<Transaction, 'nama_pekerjaan' | 'jenis_transaksi' | 'nominal'>[]): number {
  return transactions
    .filter(t => t.nama_pekerjaan === namaPekerjaan && (t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB'))
    .reduce((s, t) => s + (t.nominal || 0), 0)
}

export function deriveProgramTotals(
  program: Pick<Program, 'jenis_pekerjaan' | 'progress_percent' | 'total_anggaran' | 'realisasi_terkini' | 'sisa_anggaran' | 'nama_pekerjaan'>,
  subs: Pick<SubProgram, 'progress_percent' | 'total_anggaran' | 'realisasi_terkini'>[],
  transactions?: Pick<Transaction, 'nama_pekerjaan' | 'jenis_transaksi' | 'nominal'>[],
): DerivedTotals {
  if (subs.length === 0) {
    const total_anggaran = program.total_anggaran || 0
    const realisasi_terkini = transactions
      ? sumRealisasiFromTransactions(program.nama_pekerjaan, transactions)
      : (program.realisasi_terkini || 0)
    return {
      total_anggaran,
      realisasi_terkini,
      sisa_anggaran: total_anggaran - realisasi_terkini,
      progress_percent: getEffectiveProgress(program),
      hasSubs: false,
      realisasiFromSubs: false,
    }
  }

  const total_anggaran = subs.reduce((s, x) => s + (Number(x.total_anggaran) || 0), 0)
  // Realisasi tetap dari transaksi (arus kas) — sama seperti program tanpa
  // sub-pekerjaan. realisasi_terkini per sub-pekerjaan (gedung) diisi manual
  // buat breakdown per-gedung, tapi seringkali telat/gak lengkap dibanding
  // uang yang sudah benar-benar keluar — jadi bukan acuan buat total.
  const realisasiFromSubs = subs.some(x => (Number(x.realisasi_terkini) || 0) > 0)
  const realisasi_terkini = transactions
    ? sumRealisasiFromTransactions(program.nama_pekerjaan, transactions)
    : (program.realisasi_terkini || 0)

  const weightBase = subs.reduce((s, x) => s + (Number(x.total_anggaran) || 0), 0)
  let progress_percent: number
  if (weightBase > 0) {
    const weighted = subs.reduce(
      (s, x) => s + (Number(x.progress_percent) || 0) * (Number(x.total_anggaran) || 0),
      0,
    )
    progress_percent = Math.round(weighted / weightBase)
  } else {
    const mean = subs.reduce((s, x) => s + (Number(x.progress_percent) || 0), 0) / subs.length
    progress_percent = Math.round(mean)
  }

  return {
    total_anggaran,
    realisasi_terkini,
    sisa_anggaran: total_anggaran - realisasi_terkini,
    progress_percent,
    hasSubs: true,
    realisasiFromSubs,
  }
}

export interface NilaiAsetInfo {
  derived: number
  stored: number | null
  display: number
  mismatch: boolean
}

export function deriveNilaiAset(
  program: Pick<Program, 'hasil_nilai_aset' | 'hasil_rincian' | 'realisasi_terkini' | 'hasil_kategori' | 'jenis_pekerjaan'>,
): NilaiAsetInfo {
  const rincian = program.hasil_rincian ?? []
  // Mode "barang" (Pengadaan): biaya tersimpan = harga satuan, subtotal baris = biaya × ukuran.
  const isBarang = program.hasil_kategori ? program.hasil_kategori === 'barang' : program.jenis_pekerjaan === 'Pengadaan'
  const derived = rincian.reduce((s, r) => s + (isBarang ? (Number(r.biaya) || 0) * (Number(r.ukuran) || 0) : (Number(r.biaya) || 0)), 0)
  const stored = program.hasil_nilai_aset ?? null
  const display = stored ?? (derived > 0 ? derived : (program.realisasi_terkini ?? 0))
  const mismatch = stored !== null && derived > 0 && stored !== derived
  return { derived, stored, display, mismatch }
}
