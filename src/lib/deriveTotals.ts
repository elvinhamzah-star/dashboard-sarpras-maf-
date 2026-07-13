import { Program, SubProgram } from './supabase'
import { getEffectiveProgress } from './data'

export interface DerivedTotals {
  total_anggaran: number
  realisasi_terkini: number
  sisa_anggaran: number
  progress_percent: number
  hasSubs: boolean
  realisasiFromSubs: boolean
}

export function deriveProgramTotals(
  program: Pick<Program, 'jenis_pekerjaan' | 'progress_percent' | 'total_anggaran' | 'realisasi_terkini' | 'sisa_anggaran'>,
  subs: Pick<SubProgram, 'progress_percent' | 'total_anggaran' | 'realisasi_terkini'>[],
): DerivedTotals {
  if (subs.length === 0) {
    return {
      total_anggaran: program.total_anggaran || 0,
      realisasi_terkini: program.realisasi_terkini || 0,
      sisa_anggaran: program.sisa_anggaran || 0,
      progress_percent: getEffectiveProgress(program),
      hasSubs: false,
      realisasiFromSubs: false,
    }
  }

  const total_anggaran = subs.reduce((s, x) => s + (Number(x.total_anggaran) || 0), 0)
  const subsRealisasi = subs.reduce((s, x) => s + (Number(x.realisasi_terkini) || 0), 0)
  const realisasiFromSubs = subs.some(x => (Number(x.realisasi_terkini) || 0) > 0)
  const realisasi_terkini = realisasiFromSubs ? subsRealisasi : (program.realisasi_terkini || 0)

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
  program: Pick<Program, 'hasil_nilai_aset' | 'hasil_rincian' | 'realisasi_terkini'>,
): NilaiAsetInfo {
  const rincian = program.hasil_rincian ?? []
  const derived = rincian.reduce((s, r) => s + (Number(r.biaya) || 0), 0)
  const stored = program.hasil_nilai_aset ?? null
  const display = stored ?? (derived > 0 ? derived : (program.realisasi_terkini ?? 0))
  const mismatch = stored !== null && derived > 0 && stored !== derived
  return { derived, stored, display, mismatch }
}
