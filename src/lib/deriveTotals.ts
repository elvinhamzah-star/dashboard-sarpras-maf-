import { Program, SubProgram, SubProgramTask } from './supabase'
import type { Transaction } from './supabase'
import { getEffectiveProgress } from './data'

const STATUS_WEIGHT: Record<string, number> = { 'Selesai': 1, 'On Progress': 0.5, 'Belum Mulai': 0 }

/**
 * Progress satu gedung dari checklist item-nya — rata-rata tertimbang nilai
 * (Selesai=100%, On Progress=50%, Belum Mulai=0%). Return null kalau gedung
 * ini belum punya checklist sama sekali, supaya caller tau harus fallback ke
 * progress_percent manual yang lama.
 */
export function computeChecklistProgress(tasks: Pick<SubProgramTask, 'nilai' | 'status'>[]): number | null {
  if (tasks.length === 0) return null
  const total = tasks.reduce((s, t) => s + (t.nilai || 0), 0)
  if (total <= 0) return null
  const weighted = tasks.reduce((s, t) => s + (STATUS_WEIGHT[t.status] ?? 0) * (t.nilai || 0), 0)
  return Math.round((weighted / total) * 100)
}

/**
 * Timpa progress_percent tiap sub-pekerjaan yang sudah punya checklist dengan
 * angka hasil hitung otomatis — supaya deriveProgramTotals (yang consume
 * progress_percent ini buat rollup ke level program) ikut kebawa otomatis
 * tanpa perlu diubah sama sekali.
 */
export function withChecklistProgress<T extends Pick<SubProgram, 'id' | 'progress_percent'>>(
  subs: T[],
  tasks: Pick<SubProgramTask, 'sub_program_id' | 'nilai' | 'status'>[],
): T[] {
  if (tasks.length === 0) return subs
  const bySubId = new Map<string, typeof tasks>()
  for (const t of tasks) {
    const arr = bySubId.get(t.sub_program_id)
    if (arr) arr.push(t)
    else bySubId.set(t.sub_program_id, [t])
  }
  return subs.map(s => {
    const subTasks = bySubId.get(s.id)
    if (!subTasks) return s
    const computed = computeChecklistProgress(subTasks)
    return computed === null ? s : { ...s, progress_percent: computed }
  })
}

/**
 * Estimasi tanggal selesai (ETA) satu gedung — dari kecepatan realisasi nilai
 * checklist sejak tanggal_mulai_aktual, diekstrapolasi ke sisa nilai yang
 * belum kelar. Return null kalau belum ada tanggal mulai, belum ada progress
 * sama sekali (pace 0 → gak bisa dihitung), atau sudah 100%.
 */
export function computeSubProgramEta(
  tanggalMulaiAktual: string | null | undefined,
  tasks: Pick<SubProgramTask, 'nilai' | 'status'>[],
): Date | null {
  if (!tanggalMulaiAktual || tasks.length === 0) return null
  const total = tasks.reduce((s, t) => s + (t.nilai || 0), 0)
  if (total <= 0) return null
  const selesai = tasks.reduce((s, t) => s + (STATUS_WEIGHT[t.status] ?? 0) * (t.nilai || 0), 0)
  const sisa = total - selesai
  if (sisa <= 0) return null // sudah 100%, gak perlu ETA
  const mulai = new Date(tanggalMulaiAktual)
  const hariBerjalan = Math.max(1, Math.round((Date.now() - mulai.getTime()) / 86400000))
  const kecepatanPerHari = selesai / hariBerjalan
  if (kecepatanPerHari <= 0) return null
  const hariLagi = Math.ceil(sisa / kecepatanPerHari)
  return new Date(mulai.getTime() + (hariBerjalan + hariLagi) * 86400000)
}

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
