import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sgslsiyoompzuhuwzgyi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnc2xzaXlvb21wenVodXd6Z3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMTk3MDQsImV4cCI6MjA5Njc5NTcwNH0.DjPItl9oump1FH75v8JayuAeVW1mRmORAgppa9Nna0I'

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── In-memory data cache ─────────────────────────────────────────────────────
// Eliminates re-fetching the same table on every page navigation.
// TTL: 3 minutes. Cleared on logout and after admin writes.
const _cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 3 * 60 * 1000

function fromCache<T>(key: string): T | null {
  const e = _cache.get(key)
  if (!e) return null
  if (Date.now() - e.ts > CACHE_TTL) { _cache.delete(key); return null }
  return e.data as T
}

function toCache<T>(key: string, data: T): T {
  _cache.set(key, { data, ts: Date.now() })
  return data
}

/** Clear one cache key (after a mutation) or the entire cache (on logout). */
export function invalidateCache(...keys: string[]) {
  if (keys.length === 0) _cache.clear()
  else keys.forEach(k => _cache.delete(k))
}

/** Kategori hasil pekerjaan selesai — menentukan label & rincian di laporan. */
export type HasilKategori = 'fisik' | 'barang' | 'jasa'

/** Satu baris rincian hasil.
 *  - fisik  (mode "lokasi")  : nama = lokasi, aset = material, ukuran = volume
 *  - barang (mode "item")    : nama = item, ukuran = jumlah
 *  - jasa/Operasional (divisi): nama = divisi, ukuran = jumlah personel
 *  - jasa/Program (kegiatan)  : nama = kegiatan, status = Rencana|Berjalan|Selesai
 */
export interface HasilRincianItem {
  nama: string
  ukuran: number   // luas/volume, jumlah unit, atau jumlah personel
  satuan: string
  biaya: number
  aset?: string    // nama aset/material (mode lokasi) — satu lokasi bisa banyak aset
  status?: string  // status kegiatan (mode kegiatan): 'Rencana' | 'Berjalan' | 'Selesai'
}

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
  // ─── Data hasil pekerjaan selesai (diisi via HasilFormModal) ───
  hasil_kategori?: HasilKategori | null
  hasil_nilai_aset?: number | null
  hasil_dampak?: string[] | null
  hasil_rincian?: HasilRincianItem[] | null
  hasil_filled_at?: string | null
  dana_masuk?: number | null
  // Progress otomatis = realisasi_terkini / total_anggaran (dibulatkan), dijaga
  // trigger DB sync_program_realisasi tiap transaksi berubah. Cuma untuk
  // pekerjaan pengadaan murni belanja tanpa tahap instalasi/pemasangan.
  auto_progress_from_realisasi?: boolean
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

// Catatan talangan (admin-only, private). Pekerjaan yang dibayari duluan karena
// dananya belum cair. Terpisah TOTAL dari `transactions`/arus kas — angkanya tidak
// pernah masuk saldoKas/Masuk/Keluar. Dibaca via PIN-gated RPC `get_talangan`.
export interface Talangan {
  id: string
  program_id: string
  nama_pekerjaan?: string | null
  nominal: number
  tanggal: string
  keterangan?: string | null
  status: 'berjalan' | 'selesai'
  created_at: string
  settled_at?: string | null
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
  tampil_ringkasan?: boolean
}

export interface BeforeAfterPair {
  id: string
  program_id: string
  before_doc_id: string | null
  after_doc_id: string | null
  label?: string | null
  urutan: number
  /** Tampilkan pasangan ini di halaman Pekerjaan (Ringkasan). Maks. 2 teratas yang benar-benar dirender. */
  tampil_ringkasan?: boolean
  created_at?: string
}

// Inventaris Barang — 1 kode unik per JENIS barang (bukan per unit fisik), QR
// di stiker fisiknya mengarah ke halaman publik /aset/:kode (tanpa login).
export type KondisiUnit = 'Baik' | 'Rusak Ringan' | 'Rusak Berat'

export interface InventarisItem {
  id: string
  kode: string
  nama_barang: string
  spesifikasi?: string | null
  foto?: string | null
  tim?: string | null
  last_checked_at: string
  created_at: string
  updated_at: string
}

export interface InventarisUnit {
  id: string
  item_id: string
  urutan: number
  kondisi: KondisiUnit
  lokasi?: string | null
  created_at: string
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
  const cached = fromCache<Program[]>('programs')
  if (cached) return { data: cached, error: null }
  const { data, error } = await supabase.from('programs').select('*').order('id', { ascending: true })
  if (data) toCache('programs', data)
  return { data, error }
}

export async function fetchTransactions() {
  // Always fetch directly so totals include Man Power regardless of role.
  // Keuangan display filters Man Power rows for the maf role on the frontend.
  const cached = fromCache<Transaction[]>('transactions')
  if (cached) return { data: cached, error: null }
  const { data, error } = await supabase.from('transactions').select('*').order('tanggal', { ascending: false })
  if (data) toCache('transactions', data)
  return { data, error }
}
export async function fetchDocumentation() {
  const cached = fromCache<Documentation[]>('documentation')
  if (cached) return { data: cached, error: null }
  const { data, error } = await supabase.from('documentation').select('*').order('tanggal', { ascending: false })
  if (data) toCache('documentation', data)
  return { data, error }
}
export async function fetchDocumentationProgramIds() {
  const cached = fromCache<{ program_id: string }[]>('documentation_program_ids')
  if (cached) return { data: cached, error: null }
  const { data, error } = await supabase.from('documentation').select('program_id')
  if (data) toCache('documentation_program_ids', data)
  return { data, error }
}
export async function fetchBeforeAfterPairs() {
  const cached = fromCache<BeforeAfterPair[]>('before_after_pairs')
  if (cached) return { data: cached, error: null }
  const { data, error } = await supabase.from('before_after_pairs').select('*').order('urutan', { ascending: true })
  if (data) toCache('before_after_pairs', data)
  return { data, error }
}
export async function fetchInventarisItems() {
  const cached = fromCache<InventarisItem[]>('inventaris_items')
  if (cached) return { data: cached, error: null }
  const { data, error } = await supabase.from('inventaris_items').select('*').order('kode', { ascending: true })
  if (data) toCache('inventaris_items', data)
  return { data, error }
}
export async function fetchInventarisUnits() {
  const cached = fromCache<InventarisUnit[]>('inventaris_units')
  if (cached) return { data: cached, error: null }
  const { data, error } = await supabase.from('inventaris_units').select('*').order('urutan', { ascending: true })
  if (data) toCache('inventaris_units', data)
  return { data, error }
}
// Dipakai halaman publik /aset/:kode -- gak lewat cache (satu-off, dan gak perlu
// ikut ke-invalidate bareng cache admin).
export async function fetchInventarisItemByKode(kode: string) {
  const { data: item, error: itemError } = await supabase.from('inventaris_items').select('*').eq('kode', kode).maybeSingle()
  if (itemError || !item) return { item: null as InventarisItem | null, units: [] as InventarisUnit[], error: itemError }
  const { data: units, error: unitsError } = await supabase.from('inventaris_units').select('*').eq('item_id', item.id).order('urutan', { ascending: true })
  return { item: item as InventarisItem, units: (units ?? []) as InventarisUnit[], error: unitsError }
}
export async function fetchSnapshots() {
  const cached = fromCache<ProgramSnapshot[]>('snapshots')
  if (cached) return { data: cached, error: null }
  const { data, error } = await supabase.from('program_snapshots').select('*').order('snapshot_date', { ascending: true })
  if (data) toCache('snapshots', data)
  return { data, error }
}
export async function fetchSubPrograms() {
  // MAF role uses Edge Function — don't cache (different data per role)
  if (hasMafCredentials()) return fetchMafData<SubProgram>('sub_programs')
  const cached = fromCache<SubProgram[]>('sub_programs')
  if (cached) return { data: cached, error: null }
  const { data, error } = await supabase.from('sub_programs').select('*').order('id', { ascending: true })
  if (data) toCache('sub_programs', data)
  return { data, error }
}
export const fetchProgramSnapshots = (programId: string) =>
  supabase.from('program_snapshots').select('*').eq('program_id', programId).order('snapshot_date', { ascending: true })

export async function fetchWeeklyNotes() {
  const cached = fromCache<unknown[]>('weekly_notes')
  if (cached) return { data: cached, error: null }
  const { data, error } = await supabase.from('weekly_notes').select('*').order('week_start', { ascending: true })
  if (data) toCache('weekly_notes', data)
  return { data, error }
}

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

export async function fetchProgramDocuments() {
  const cached = fromCache<ProgramDocument[]>('program_documents')
  if (cached) return { data: cached, error: null }
  const { data, error } = await supabase.from('program_documents').select('*').order('created_at', { ascending: true })
  if (data) toCache('program_documents', data)
  return { data, error }
}

