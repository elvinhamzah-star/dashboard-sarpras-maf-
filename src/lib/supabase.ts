import { createClient } from '@supabase/supabase-js'
import { isPublicMode } from './accessMode'

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
  tanggal_mulai_aktual?: string | null
  created_at: string
}

export type SubProgramTaskStatus = 'Belum Mulai' | 'On Progress' | 'Selesai'

// Checklist item pekerjaan di dalam satu sub-pekerjaan (gedung) — mis. "Cat
// dinding kusam" di Sakan Naisabur. `sumber` menandai asal data (RAB/Periode 1/
// Periode 2/dst) supaya bisa ditelusur balik ke dokumen aslinya.
export interface SubProgramTask {
  id: number
  sub_program_id: string
  item: string
  nilai: number
  status: SubProgramTaskStatus
  sumber: string | null
  created_at: string
}

export interface Transaction {
  id: string
  tanggal: string
  jenis_transaksi: string
  nominal: number
  nama_pekerjaan: string
  program_id: string | null
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

// Server-side login session. The token is issued by start_session /
// start_session_link after the username+PIN (or login link) is verified in the
// database, and is required by app_read for every read of business data. Tab-scoped
// (sessionStorage), cleared on logout. Base tables are no longer readable with the
// anon key at all, so flipping a UI flag no longer exposes data.
let appSession: string | null = sessionStorage.getItem('app_session')

export function setAppSession(token: string) {
  appSession = token
  sessionStorage.setItem('app_session', token)
}

export function clearAppSession() {
  const token = appSession
  appSession = null
  sessionStorage.removeItem('app_session')
  sessionStorage.removeItem('maf_username')
  sessionStorage.removeItem('maf_pin')
  if (token) void supabase.rpc('end_session', { p_session: token })
}

export function hasAppSession() {
  return !!appSession
}

type ReadResult<T> = { data: T[] | null; error: unknown }

/** Authenticated read (RPC, role-filtered server-side) or sanitized public view. */
async function readData<T>(
  table: string,
  publicSource: { view: string; orderBy: string; ascending: boolean } | 'empty',
): Promise<ReadResult<T>> {
  // Public mode (/publik): reads come from sanitized views with no Rupiah amounts
  // and no Operasional/Man Power rows. No session needed.
  if (isPublicMode()) {
    if (publicSource === 'empty') return { data: [], error: null }
    const { data, error } = await supabase
      .from(publicSource.view).select('*')
      .order(publicSource.orderBy, { ascending: publicSource.ascending })
    return { data: (data as T[] | null), error }
  }
  if (!appSession) return { data: null, error: new Error('Belum login') }
  const { data, error } = await supabase.rpc('app_read', { p_session: appSession, p_table: table })
  if (error) {
    if ((error as { code?: string }).code === '28000') {
      window.dispatchEvent(new Event('app-unauthorized'))
    }
    return { data: null, error }
  }
  return { data: (data as T[]) ?? [], error: null }
}

export async function fetchPublicOverview(): Promise<{ overall: number | null; monthly: { ym: string; progress: number }[] }> {
  const { data, error } = await supabase.rpc('get_public_overview')
  if (error || !data) return { overall: null, monthly: [] }
  const d = data as { overall: number | null; monthly: { ym: string; progress: number }[] }
  return { overall: d.overall ?? null, monthly: d.monthly ?? [] }
}

export const fetchAppConfig = (key: string) =>
  supabase.from('app_config').select('value').eq('key', key).single()

export async function fetchPrograms() {
  const cached = fromCache<Program[]>('programs')
  if (cached) return { data: cached, error: null }
  const { data, error } = await readData<Program>('programs', { view: 'public_programs', orderBy: 'id', ascending: true })
  if (data) toCache('programs', data)
  return { data, error }
}

export async function fetchTransactions() {
  const cached = fromCache<Transaction[]>('transactions')
  if (cached) return { data: cached, error: null }
  const { data, error } = await readData<Transaction>('transactions', 'empty')
  if (data) toCache('transactions', data)
  return { data, error }
}
export async function fetchDocumentation() {
  const cached = fromCache<Documentation[]>('documentation')
  if (cached) return { data: cached, error: null }
  const { data, error } = await readData<Documentation>('documentation', { view: 'public_documentation', orderBy: 'tanggal', ascending: false })
  if (data) toCache('documentation', data)
  return { data, error }
}
export async function fetchDocumentationProgramIds() {
  const cached = fromCache<{ program_id: string }[]>('documentation_program_ids')
  if (cached) return { data: cached, error: null }
  const { data: docs, error } = await fetchDocumentation()
  const data = docs ? docs.map(d => ({ program_id: d.program_id })) : null
  if (data) toCache('documentation_program_ids', data)
  return { data, error }
}
export async function fetchBeforeAfterPairs() {
  const cached = fromCache<BeforeAfterPair[]>('before_after_pairs')
  if (cached) return { data: cached, error: null }
  const { data, error } = await readData<BeforeAfterPair>('before_after_pairs', { view: 'public_before_after_pairs', orderBy: 'urutan', ascending: true })
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
  const { data, error } = await readData<ProgramSnapshot>('program_snapshots', 'empty')
  if (data) toCache('snapshots', data)
  return { data, error }
}
export async function fetchSubPrograms() {
  const cached = fromCache<SubProgram[]>('sub_programs')
  if (cached) return { data: cached, error: null }
  const { data, error } = await readData<SubProgram>('sub_programs', { view: 'public_sub_programs', orderBy: 'id', ascending: true })
  if (data) toCache('sub_programs', data)
  return { data, error }
}
export async function fetchProgramSnapshots(programId: string) {
  const { data, error } = await fetchSnapshots()
  return { data: data ? data.filter(s => s.program_id === programId) : null, error }
}

export async function fetchSubProgramTasks() {
  const cached = fromCache<SubProgramTask[]>('sub_program_tasks')
  if (cached) return { data: cached, error: null }
  const { data, error } = await readData<SubProgramTask>('sub_program_tasks', { view: 'public_sub_program_tasks', orderBy: 'id', ascending: true })
  if (data) toCache('sub_program_tasks', data)
  return { data, error }
}

export interface WeeklyNoteRow {
  id: string
  week_start: string
  week_end: string
  content: string
  created_at: string
  updated_at: string
}

export async function fetchWeeklyNotes() {
  const cached = fromCache<WeeklyNoteRow[]>('weekly_notes')
  if (cached) return { data: cached, error: null }
  const { data, error } = await readData<WeeklyNoteRow>('weekly_notes', 'empty')
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
  const { data, error } = await readData<ProgramDocument>('program_documents', { view: 'public_program_documents', orderBy: 'created_at', ascending: true })
  if (data) toCache('program_documents', data)
  return { data, error }
}

