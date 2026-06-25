import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sgslsiyoompzuhuwzgyi.supabase.co'
const supabaseKey = 'sb_publishable_3wYZACfd-9wKcx92loJWPg_jjF76A_7'

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Program {
  id: string
  program: string
  nama_pekerjaan: string
  jenis_pekerjaan: string
  status: string
  progress_percent: number
  total_anggaran: number
  realisasi_terkini: number
  sisa_anggaran: number
  vendor: string
  target_selesai?: string
  isu_utama: string
  link_rab_detail?: string
  link_dokumentasi?: string
  link_bukti_transaksi?: string
  created_at: string
  updated_at?: string
}

export interface ProgramSnapshot {
  id: number
  program_id: string
  snapshot_date: string
  progress_percent: number | null
  realisasi_terkini: number | null
  sisa_anggaran: number | null
  total_anggaran: number | null
  status: string | null
  note?: string | null
  created_at: string
}

export interface SubProgram {
  id: string
  program_id: string
  nama_gedung: string
  progress_percent: number
  total_anggaran: number
  realisasi_terkini: number
  sisa_anggaran: number
  status: string
  link_dokumentasi?: string
  created_at: string
}

export interface Transaction {
  id: string
  tanggal: string
  jenis_transaksi: string
  nominal: number
  nama_pekerjaan: string
  deskripsi: string
  sumber?: string | null
  link_bukti?: string | null
  created_at: string
}

export interface Documentation {
  id: string
  program_id: string
  nama_pekerjaan?: string
  fase?: string
  link_foto: string
  drive_link?: string
  caption?: string
  deskripsi?: string
  tanggal: string
  created_at: string
  updated_at?: string
}

export const fetchAppConfig = (key: string) =>
  supabase.from('app_config').select('value').eq('key', key).single()

export const fetchPrograms = () => supabase.from('programs').select('*').order('id', { ascending: true })
export const fetchTransactions = () => supabase.from('transactions').select('*').order('tanggal', { ascending: false })
export const fetchDocumentation = () => supabase.from('documentation').select('*').order('tanggal', { ascending: false })
export const fetchSnapshots = () => supabase.from('program_snapshots').select('*').order('snapshot_date', { ascending: true })
export const fetchProgramSnapshots = (programId: string) =>
  supabase.from('program_snapshots').select('*').eq('program_id', programId).order('snapshot_date', { ascending: true })
