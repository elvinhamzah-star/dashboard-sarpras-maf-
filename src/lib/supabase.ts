import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sgslsiyoompzuhuwzgyi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnc2xzaXlvb21wenVodXd6Z3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTk3MDQsImV4cCI6MjA5Njc5NTcwNH0.DjPItl9oump1FH75v8JayuAeVW1mRmORAgppa9Nna0I'

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
  tanggal_mulai?: string
  tanggal_selesai?: string
  target_selesai?: string
  isu_utama: string
  link_rab_detail?: string
  link_kontrak?: string
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
  vendor: string
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
  titik?: string
  link_foto: string
  tipe_file?: 'foto' | 'video'
  drive_link?: string
  caption?: string
  deskripsi?: string
  tanggal: string
  created_at: string
  updated_at?: string
}

export interface BeforeAfterPair {
  id: string
  program_id: string
  before_doc_id: string | null
  after_doc_id: string | null
  label?: string | null
  urutan: number
  created_at?: string
}

// MAF management role credentials. Mirrors the sessionStorage-backed
// dashboard_role flag in App.tsx: that flag survives a page reload, so these
// credentials must too, or a reload would leave the UI rendering in MAF mode
// while silently falling back to unfiltered direct table queries (the
// Man Power exclusion would be bypassed entirely). Cleared on logout, same
// as dashboard_auth/dashboard_role.
let mafUsername: string | null = sessionStorage.getItem('maf_username')
let mafPin: string | null = sessionStorage.getItem('maf_pin')

export function setMafCredentials(username: string, pin: string) {
  mafUsername = username
  mafPin = pin
  sessionStorage.setItem('maf_username', username)
  sessionStorage.setItem('maf_pin', pin)
}

export function clearMafCredentials() {
  mafUsername = null
  mafPin = null
  sessionStorage.removeItem('maf_username')
  sessionStorage.removeItem('maf_pin')
}

export function hasMafCredentials() {
  return !!(mafUsername && mafPin)
}

async function fetchMafData<T>(resource: 'programs' | 'sub_programs' | 'transactions') {
  if (!mafUsername || !mafPin) {
    return { data: null as T[] | null, error: new Error('MAF credentials not set') }
  }
  const { data, error } = await supabase.functions.invoke('maf-data', {
    body: { resource, username: mafUsername, pin: mafPin },
  })
  if (error) return { data: null as T[] | null, error }
  return { data: (data as { data: T[] }).data, error: null }
}

export const fetchAppConfig = (key: string) =>
  supabase.from('app_config').select('value').eq('key', key).single()

export async function fetchPrograms() {
  const { data, error } = await supabase.from('programs').select('*').order('id', { ascending: true })
  return { data, error }
}

export async function fetchTransactions() {
  // Always fetch directly so totals include Man Power regardless of role.
  // Keuangan display filters Man Power rows for the maf role on the frontend.
  const { data, error } = await supabase.from('transactions').select('*').order('tanggal', { ascending: false })
  return { data, error }
}
export const fetchDocumentation = () => supabase.from('documentation').select('*').order('tanggal', { ascending: false })
export const fetchDocumentationProgramIds = () => supabase.from('documentation').select('program_id')
export const fetchBeforeAfterPairs = () => supabase.from('before_after_pairs').select('*').order('urutan', { ascending: true })
export const fetchSnapshots = () => supabase.from('program_snapshots').select('*').order('snapshot_date', { ascending: true })
export async function fetchSubPrograms() {
  if (hasMafCredentials()) return fetchMafData<SubProgram>('sub_programs')
  const { data, error } = await supabase.from('sub_programs').select('*').order('id', { ascending: true })
  return { data, error }
}
export const fetchProgramSnapshots = (programId: string) =>
  supabase.from('program_snapshots').select('*').eq('program_id', programId).order('snapshot_date', { ascending: true })

export const fetchWeeklyNotes = () =>
  supabase.from('weekly_notes').select('*').order('week_start', { ascending: true })

export type DocCategory = 'rab_detail' | 'kontrak' | 'bukti_transaksi'

export interface ProgramDocument {
  id: string
  program_id: string
  folder: string        // 'rab' | 'kontrak' | 'bukti_transaksi'
  subfolder: string | null  // 'invoice' | 'pembayaran' | null
  file_name: string
  file_url: string | null
  created_at: string
}

export const fetchProgramDocuments = () =>
  supabase.from('program_documents').select('*').order('created_at', { ascending: true })

export interface MonthlyReport {
  id: number
  bulan: string
  catatan_evaluasi: string
  rencana: string
  created_at: string
  updated_at: string
}

export async function fetchMonthlyReport(bulan: string): Promise<{ data: MonthlyReport | null; error: unknown }> {
  const { data, error } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('bulan', bulan)
    .maybeSingle()
  return { data: data as MonthlyReport | null, error }
}
