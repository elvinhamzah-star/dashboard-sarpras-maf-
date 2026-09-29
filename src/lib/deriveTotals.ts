import { Program, SubProgram, SubProgramTask, HasilRincianItem } from './supabase'
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
 * Timpa progress_percent tiap sub-pekerjaan yang sudah punya checklist,
 * dari status item-nya (Selesai/On Progress/Belum Mulai) — supaya
 * deriveProgramTotals (rollup ke level program) dan kolom PROGRES di tabel
 * Sub Pekerjaan ikut kebawa otomatis, tanpa perlu diubah sama sekali di
 * caller.
 *
 * SENGAJA tidak menyentuh realisasi_terkini/sisa_anggaran. Checklist cuma
 * nunjukin progres fisik (kerjaan sudah dikerjakan atau belum) — nilai
 * item-nya adalah estimasi RAB, bukan bukti uang sudah keluar. Realisasi
 * per gedung tetap murni input manual (UpdateSubPekerjaanModal), diisi user
 * dari data vendor/invoice asli. Sebelumnya fungsi ini ikut menimpa
 * realisasi_terkini pakai nilai RAB checklist yang "Selesai" — itu keliru:
 * ceklis status jadi otomatis mengubah angka Realisasi padahal user cuma
 * bermaksud update progres fisik, dan RAB periode 2 P-001 sendiri eksplisit
 * bukan pagu per-item/per-gedung (pagu gabungan, termin gak nempel ke satu
 * item). Lihat percakapan 2026-09-28.
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
    if (computed === null) return s
    return { ...s, progress_percent: computed }
  })
}

/**
 * Estimasi tanggal selesai (ETA) satu gedung — dari kecepatan realisasi nilai
 * checklist sejak tanggal_mulai_aktual, diekstrapolasi ke sisa nilai yang
 * belum kelar. Return null kalau belum ada tanggal mulai, belum ada progress
 * sama sekali (pace 0 → gak bisa dihitung), sudah 100%, atau progress masih
 * terlalu rendah (<15%) buat dipercaya — sample sekecil itu diekstrapolasi ke
 * sisa 85%+ pekerjaan gampang meleset jauh (mis. baru 6% jalan tapi udah
 * diproyeksi >1 tahun lagi), jadi mending gak nampilin angka sama sekali
 * (sama kayak gedung yang belum punya tanggal_mulai_aktual).
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
  if (selesai / total < 0.15) return null // progress terlalu rendah, sample belum cukup buat diekstrapolasi
  const mulai = new Date(tanggalMulaiAktual)
  const hariBerjalan = Math.max(1, Math.round((Date.now() - mulai.getTime()) / 86400000))
  if (hariBerjalan < 14) return null // belum cukup lama berjalan buat dipercaya kecepatannya
  const kecepatanPerHari = selesai / hariBerjalan
  if (kecepatanPerHari <= 0) return null
  const hariLagi = Math.ceil(sisa / kecepatanPerHari)
  return new Date(mulai.getTime() + (hariBerjalan + hariLagi) * 86400000)
}

/**
 * "Detail Realisasi" (hasil_rincian) per gedung, diturunkan dari
 * realisasi_terkini manual tiap sub-pekerjaan (diisi user dari data
 * vendor/invoice lewat form Edit Sub Pekerjaan) — BUKAN dari nilai RAB
 * checklist. Checklist (lihat withChecklistProgress) cuma acuan progres
 * fisik; nilai Rupiah yang beneran keluar tetap murni input manual, supaya
 * "Detail Realisasi" gak pernah nunjukin angka yang beda dari REALISASI
 * TERKINI di ringkasan (dua-duanya sekarang sama-sama gak bersumber dari
 * RAB). Lihat percakapan 2026-09-28/29.
 *
 * Cuma gedung yang realisasinya sudah > 0 yang dimasukkan — gedung yang
 * belum ada uang keluar sama sekali gak nambah baris Rp 0.
 */
export function deriveHasilRincianFromSubPrograms(
  subs: Pick<SubProgram, 'nama_gedung' | 'realisasi_terkini' | 'status'>[],
): HasilRincianItem[] {
  const STATUS_LABEL: Record<string, HasilRincianItem['status']> = {
    'Selesai': 'Selesai',
    'Perencanaan': 'Rencana',
  }
  const result: HasilRincianItem[] = []
  for (const s of subs) {
    const realisasi = Number(s.realisasi_terkini) || 0
    if (realisasi <= 0) continue
    result.push({ nama: s.nama_gedung, biaya: realisasi, satuan: 'gedung', ukuran: 1, status: STATUS_LABEL[s.status] ?? 'Berjalan' })
  }
  return result.sort((a, b) => b.biaya - a.biaya)
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
 * tersambung ke program ini. Dicocokkan lewat program_id kalau transaksinya
 * sudah punya (jalur utama sejak FK program_id ditambahkan), fallback ke
 * exact nama_pekerjaan match cuma buat transaksi legacy yang belum sempat
 * di-backfill. Dihitung ulang tiap render (bukan snapshot di kolom
 * programs.realisasi_terkini) supaya kalau admin mengedit program_id/nama
 * transaksi (mis. betulkan salah ketik), realisasi otomatis re-sync tanpa
 * perlu rekonsiliasi manual.
 */
function sumRealisasiFromTransactions(
  programId: string,
  namaPekerjaan: string,
  transactions: Pick<Transaction, 'nama_pekerjaan' | 'program_id' | 'jenis_transaksi' | 'nominal'>[],
): number {
  return transactions
    .filter(t => {
      const matches = t.program_id ? t.program_id === programId : t.nama_pekerjaan === namaPekerjaan
      return matches && (t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB')
    })
    .reduce((s, t) => s + (t.nominal || 0), 0)
}

export function deriveProgramTotals(
  program: Pick<Program, 'id' | 'jenis_pekerjaan' | 'progress_percent' | 'total_anggaran' | 'realisasi_terkini' | 'sisa_anggaran' | 'nama_pekerjaan'>,
  subs: Pick<SubProgram, 'progress_percent' | 'total_anggaran' | 'realisasi_terkini'>[],
  transactions?: Pick<Transaction, 'nama_pekerjaan' | 'program_id' | 'jenis_transaksi' | 'nominal'>[],
): DerivedTotals {
  if (subs.length === 0) {
    const total_anggaran = program.total_anggaran || 0
    const realisasi_terkini = transactions
      ? sumRealisasiFromTransactions(program.id, program.nama_pekerjaan, transactions)
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
    ? sumRealisasiFromTransactions(program.id, program.nama_pekerjaan, transactions)
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
