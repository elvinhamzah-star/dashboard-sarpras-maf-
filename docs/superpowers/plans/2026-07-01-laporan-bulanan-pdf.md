# Laporan Bulanan PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah halaman "Laporan Bulanan" di dashboard yang menampilkan evaluasi otomatis dari data per bulan (keuangan + progress pekerjaan), dua field manual (catatan evaluasi + rencana bulan depan), dan export ke PDF multi-halaman berformat profesional.

**Architecture:** Halaman baru `LaporanBulanan` di React mengkonsumsi data dari Supabase (transactions, programs, program_snapshots) yang sudah ada, menghitung summary otomatis di client-side (tanpa LLM), dan menyimpan catatan/rencana per-bulan ke tabel baru `monthly_reports`. Export PDF dikerjakan client-side oleh `@react-pdf/renderer` — tidak ada server baru. Role `maf` tidak bisa mengakses halaman ini.

**Tech Stack:** React 18 + TypeScript, `@react-pdf/renderer` v4, Supabase Postgres (admin writes via PIN-gated RPC), inline styles + CSS variables.

## Global Constraints

- Semua style: inline styles only, CSS variables (`var(--card)`, `var(--text-primary)`, dll.) — tidak ada className atau Tailwind
- Warna status dari `STATUS_COLORS` di `src/lib/data.ts`: Perencanaan=#DC2626, On Going=#0A7BC8, Selesai=#1B5E2B, On Hold=#D97706
- Helper functions: `formatRupiah`, `monthLabelFromYM`, `monthsFromDates` dari `src/lib/data.ts`
- Admin writes: selalu melalui PIN-gated RPC — tidak pernah direct Supabase insert dari client
- Role `maf`: halaman laporan disembunyikan dari sidebar dan di-redirect ke Beranda (pola sama dengan `riwayat`)
- TypeScript: build via `npx tsc -b` (bukan `npx tsc -b --noEmit` — ada bug TS 5.5.4)
- Supabase project ID: `sgslsiyoompzuhuwzgyi`
- Program P-024 ("Man Power"): exclude dari semua kalkulasi di halaman laporan (sama seperti MAF role exclusion, tapi untuk konsistensi data internal)

---

## File Map

| File | Action | Keterangan |
|------|--------|------------|
| `src/components/LaporanBulanan.tsx` | Create | Halaman utama laporan — month selector, data view, admin edit fields, export button |
| `src/components/LaporanBulananPDF.tsx` | Create | Template PDF dengan `@react-pdf/renderer` — cover + 4 section halaman |
| `src/lib/supabase.ts` | Modify | Tambah interface `MonthlyReport` + `fetchMonthlyReport(bulan)` |
| `src/lib/adminApi.ts` | Modify | Tambah `upsertMonthlyReport(bulan, catatan, rencana)` |
| `src/App.tsx` | Modify | Tambah `'laporan'` ke `Page` type + routing + role guard |
| `src/components/Sidebar.tsx` | Modify | Tambah menu item laporan, hide untuk MAF |

---

## Task 1: DB Migration — tabel monthly_reports + RPC

**Files:**
- No file changes — dieksekusi langsung ke Supabase via MCP atau SQL editor

**Interfaces:**
- Produces: tabel `public.monthly_reports(id serial PK, bulan text UNIQUE, catatan_evaluasi text, rencana text, created_at timestamptz, updated_at timestamptz)` + function `admin_upsert_monthly_report(p_pin text, p_bulan text, p_catatan text, p_rencana text) returns boolean`

- [ ] **Step 1: Apply migration ke Supabase**

Jalankan SQL berikut di Supabase SQL Editor (project `sgslsiyoompzuhuwzgyi`) atau via Supabase MCP `apply_migration`:

```sql
-- Tabel laporan bulanan
create table if not exists public.monthly_reports (
  id serial primary key,
  bulan text unique not null,          -- 'YYYY-MM'
  catatan_evaluasi text default '',
  rencana text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: baca bebas, tulis hanya via RPC (SECURITY DEFINER)
alter table public.monthly_reports enable row level security;
create policy "monthly_reports_read" on public.monthly_reports
  for select using (true);

-- RPC untuk upsert (verifikasi PIN server-side)
create or replace function public.admin_upsert_monthly_report(
  p_pin text,
  p_bulan text,
  p_catatan text,
  p_rencana text
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  v_hash text;
begin
  -- Verify admin PIN
  select value into v_hash from public.app_config where key = 'login_pin_hash';
  if v_hash is null or not extensions.crypt(p_pin, v_hash) = v_hash then
    return false;
  end if;

  insert into public.monthly_reports (bulan, catatan_evaluasi, rencana, updated_at)
  values (p_bulan, p_catatan, p_rencana, now())
  on conflict (bulan) do update
    set catatan_evaluasi = excluded.catatan_evaluasi,
        rencana = excluded.rencana,
        updated_at = now();

  return true;
end;
$$;

grant execute on function public.admin_upsert_monthly_report(text, text, text, text)
  to anon, authenticated, service_role;
```

- [ ] **Step 2: Verify tabel terbuat**

Di Supabase Table Editor, cek tabel `monthly_reports` ada dengan kolom: `id`, `bulan`, `catatan_evaluasi`, `rencana`, `created_at`, `updated_at`.

- [ ] **Step 3: Test RPC manual**

Di SQL Editor:
```sql
-- Harus return false (PIN salah)
select admin_upsert_monthly_report('salah', '2026-06', 'test', 'test');

-- Harus return true (PIN benar — ganti '1234' dengan PIN admin aktual)
select admin_upsert_monthly_report('1234', '2026-06', 'Catatan Juni', 'Rencana Juli');

-- Cek data tersimpan
select * from monthly_reports;
```

Expected: false untuk PIN salah, true untuk PIN benar, row muncul di tabel.

---

## Task 2: Install @react-pdf/renderer + PDF template

**Files:**
- Create: `src/components/LaporanBulananPDF.tsx`

**Interfaces:**
- Consumes: props `LaporanPDFProps` (didefinisikan dalam task ini)
- Produces: exported `LaporanBulananPDF` component + `LaporanPDFProps` type

- [ ] **Step 1: Install library**

```bash
cd /Users/mac/dashboard-sarpras-maf-v2
npm install @react-pdf/renderer
```

Expected: `@react-pdf/renderer` masuk ke `package.json` dependencies.

- [ ] **Step 2: Verify build masih berjalan**

```bash
npx tsc -b
```

Expected: exit 0, tidak ada error TypeScript baru.

- [ ] **Step 3: Buat file LaporanBulananPDF.tsx**

```tsx
// src/components/LaporanBulananPDF.tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import { Program, Transaction } from '../lib/supabase'
import { formatRupiah, monthLabelFromYM, STATUS_COLORS } from '../lib/data'

export interface LaporanPDFProps {
  bulan: string              // 'YYYY-MM'
  prevBulan: string          // 'YYYY-MM' — bulan sebelumnya
  programs: Program[]
  transactions: Transaction[]        // transaksi bulan ini
  prevTransactions: Transaction[]    // transaksi bulan lalu
  progressByProgram: Record<string, number>      // progress bulan ini per program_id
  prevProgressByProgram: Record<string, number>  // progress bulan lalu per program_id
  catatanEvaluasi: string
  rencana: string
  generatedAt: string        // tanggal generate, e.g. "1 Juli 2026"
}

const BLUE = '#1A6FE8'
const DARK = '#1E293B'
const MUTED = '#64748B'
const BORDER = '#E2E8F0'
const PAGE_PADDING = 40

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: DARK,
    backgroundColor: '#FFFFFF',
    paddingTop: PAGE_PADDING,
    paddingBottom: PAGE_PADDING,
    paddingHorizontal: PAGE_PADDING,
  },
  // Cover
  coverTitle: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 6 },
  coverSub: { fontSize: 14, color: DARK, marginBottom: 4 },
  coverMeta: { fontSize: 10, color: MUTED },
  coverDivider: { borderBottom: `2px solid ${BLUE}`, marginVertical: 20 },
  // Section header
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 10, marginTop: 16 },
  sectionDivider: { borderBottom: `1px solid ${BORDER}`, marginBottom: 10 },
  // Stat block
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 12, border: `1px solid ${BORDER}` },
  statLabel: { fontSize: 8, color: MUTED, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  statValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK },
  statDelta: { fontSize: 9, marginTop: 4 },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: '6 8', borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', padding: '5 8', borderBottom: `1px solid ${BORDER}` },
  tableCell: { fontSize: 9 },
  tableCellBold: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  // Badge
  badge: { borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  // Text
  bodyText: { fontSize: 10, lineHeight: 1.6, color: DARK },
  mutedText: { fontSize: 9, color: MUTED },
})

function delta(curr: number, prev: number): string {
  if (prev === 0) return curr > 0 ? '+100%' : '—'
  const pct = ((curr - prev) / prev) * 100
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%'
}

function deltaColor(curr: number, prev: number): string {
  if (curr >= prev) return '#059669'
  return '#DC2626'
}

function sumByJenis(txs: Transaction[], jenis: string | string[]): number {
  const list = Array.isArray(jenis) ? jenis : [jenis]
  return txs.filter(t => list.includes(t.jenis_transaksi)).reduce((s, t) => s + (t.nominal || 0), 0)
}

export default function LaporanBulananPDF({
  bulan,
  prevBulan,
  programs,
  transactions,
  prevTransactions,
  progressByProgram,
  prevProgressByProgram,
  catatanEvaluasi,
  rencana,
  generatedAt,
}: LaporanPDFProps) {
  const bulanLabel = monthLabelFromYM(bulan)
  const prevBulanLabel = monthLabelFromYM(prevBulan)

  // Keuangan aggregates
  const totalAnggaran = programs.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const realisasi = programs.reduce((s, p) => s + (p.realisasi_terkini || 0), 0)
  const penyerapan = totalAnggaran > 0 ? (realisasi / totalAnggaran) * 100 : 0

  const masukIni = sumByJenis(transactions, 'Masuk')
  const keluarIni = sumByJenis(transactions, ['Keluar', 'Keluar PBB'])
  const masukPrev = sumByJenis(prevTransactions, 'Masuk')
  const keluarPrev = sumByJenis(prevTransactions, ['Keluar', 'Keluar PBB'])

  // Progress aggregates
  const avgProgress = programs.length > 0
    ? programs.reduce((s, p) => s + (progressByProgram[p.id] ?? p.progress_percent ?? 0), 0) / programs.length
    : 0
  const avgProgressPrev = programs.length > 0
    ? programs.reduce((s, p) => s + (prevProgressByProgram[p.id] ?? 0), 0) / programs.length
    : 0

  // Status counts
  const statusCount: Record<string, number> = {}
  programs.forEach(p => { statusCount[p.status] = (statusCount[p.status] || 0) + 1 })

  return (
    <Document>
      {/* ===== HALAMAN 1: COVER ===== */}
      <Page size="A4" style={s.page}>
        <View style={{ marginTop: 60 }}>
          {/* Logo text */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <View style={{ width: 48, height: 48, backgroundColor: BLUE, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Helvetica-Bold' }}>PBB</Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: DARK }}>Peradaban Baik Bahagia</Text>
              <Text style={{ fontSize: 10, color: MUTED }}>Sarpras Madrasah Al-Fatih</Text>
            </View>
          </View>

          <View style={s.coverDivider} />

          <Text style={s.coverTitle}>Laporan Bulanan</Text>
          <Text style={s.coverSub}>Perkembangan Sarpras & Keuangan</Text>
          <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: DARK, marginTop: 8, marginBottom: 24 }}>
            {bulanLabel}
          </Text>

          <View style={s.coverDivider} />

          <View style={{ flexDirection: 'row', gap: 24, marginTop: 8 }}>
            <View>
              <Text style={s.mutedText}>Periode</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{bulanLabel}</Text>
            </View>
            <View>
              <Text style={s.mutedText}>Dibandingkan dengan</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{prevBulanLabel}</Text>
            </View>
            <View>
              <Text style={s.mutedText}>Dibuat</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{generatedAt}</Text>
            </View>
          </View>

          {/* Status summary boxes */}
          <View style={{ ...s.statRow, marginTop: 32 }}>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <View key={status} style={{ ...s.statBox, borderLeft: `3px solid ${color}` }}>
                <Text style={{ ...s.statLabel, color }}>{status}</Text>
                <Text style={{ ...s.statValue, fontSize: 20 }}>{statusCount[status] || 0}</Text>
                <Text style={s.mutedText}>pekerjaan</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>

      {/* ===== HALAMAN 2: RINGKASAN EKSEKUTIF ===== */}
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
        <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 16 }}>Ringkasan Eksekutif</Text>
        <View style={{ borderBottom: `2px solid ${BLUE}`, marginBottom: 20 }} />

        {/* Keuangan stats */}
        <Text style={s.sectionTitle}>Anggaran & Realisasi</Text>
        <View style={s.statRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Total Anggaran</Text>
            <Text style={{ ...s.statValue, fontSize: 13 }}>{formatRupiah(totalAnggaran)}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Total Realisasi</Text>
            <Text style={{ ...s.statValue, fontSize: 13 }}>{formatRupiah(realisasi)}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Penyerapan</Text>
            <Text style={{ ...s.statValue, color: BLUE }}>{penyerapan.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Transaksi bulan ini */}
        <Text style={s.sectionTitle}>Transaksi {bulanLabel} vs {prevBulanLabel}</Text>
        <View style={s.statRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Dana Masuk</Text>
            <Text style={{ ...s.statValue, fontSize: 13, color: '#059669' }}>{formatRupiah(masukIni)}</Text>
            <Text style={{ ...s.statDelta, color: deltaColor(masukIni, masukPrev) }}>
              {delta(masukIni, masukPrev)} vs {prevBulanLabel}
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Dana Keluar</Text>
            <Text style={{ ...s.statValue, fontSize: 13, color: '#DC2626' }}>{formatRupiah(keluarIni)}</Text>
            <Text style={{ ...s.statDelta, color: deltaColor(keluarIni, keluarPrev) }}>
              {delta(keluarIni, keluarPrev)} vs {prevBulanLabel}
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Net Bulan Ini</Text>
            <Text style={{ ...s.statValue, fontSize: 13, color: masukIni - keluarIni >= 0 ? '#059669' : '#DC2626' }}>
              {formatRupiah(Math.abs(masukIni - keluarIni))}
            </Text>
            <Text style={s.mutedText}>{masukIni >= keluarIni ? 'surplus' : 'defisit'}</Text>
          </View>
        </View>

        {/* Progress pekerjaan */}
        <Text style={s.sectionTitle}>Progress Keseluruhan Pekerjaan</Text>
        <View style={s.statRow}>
          <View style={{ ...s.statBox, flex: 2 }}>
            <Text style={s.statLabel}>Rata-rata Progress {bulanLabel}</Text>
            <Text style={{ ...s.statValue, fontSize: 20, color: BLUE }}>{avgProgress.toFixed(1)}%</Text>
            <Text style={{ ...s.statDelta, color: deltaColor(avgProgress, avgProgressPrev) }}>
              {avgProgressPrev > 0
                ? `${delta(avgProgress, avgProgressPrev)} vs ${prevBulanLabel}`
                : `Bulan sebelumnya: ${avgProgressPrev.toFixed(1)}%`}
            </Text>
          </View>
          <View style={{ ...s.statBox, flex: 1 }}>
            <Text style={s.statLabel}>Total Program</Text>
            <Text style={{ ...s.statValue, fontSize: 20 }}>{programs.length}</Text>
            <Text style={s.mutedText}>pekerjaan aktif</Text>
          </View>
        </View>
      </Page>

      {/* ===== HALAMAN 3: DETAIL PEKERJAAN ===== */}
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
        <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 16 }}>Detail Pekerjaan</Text>
        <View style={{ borderBottom: `2px solid ${BLUE}`, marginBottom: 20 }} />

        {/* Tabel header */}
        <View style={s.tableHeader}>
          <Text style={{ ...s.tableCellBold, flex: 3 }}>Pekerjaan</Text>
          <Text style={{ ...s.tableCellBold, flex: 2 }}>Vendor</Text>
          <Text style={{ ...s.tableCellBold, flex: 1, textAlign: 'right' }}>Progress</Text>
          <Text style={{ ...s.tableCellBold, flex: 1, textAlign: 'right' }}>Delta</Text>
          <Text style={{ ...s.tableCellBold, flex: 1, textAlign: 'center' }}>Status</Text>
        </View>

        {programs.map(p => {
          const prog = progressByProgram[p.id] ?? p.progress_percent ?? 0
          const prevProg = prevProgressByProgram[p.id] ?? 0
          const diff = prog - prevProg
          const color = STATUS_COLORS[p.status] || MUTED
          return (
            <View key={p.id} style={s.tableRow}>
              <Text style={{ ...s.tableCell, flex: 3 }}>{p.nama_pekerjaan}</Text>
              <Text style={{ ...s.tableCell, flex: 2, color: MUTED }}>{p.vendor}</Text>
              <Text style={{ ...s.tableCellBold, flex: 1, textAlign: 'right', color: BLUE }}>{prog}%</Text>
              <Text style={{
                ...s.tableCell, flex: 1, textAlign: 'right',
                color: diff > 0 ? '#059669' : diff < 0 ? '#DC2626' : MUTED
              }}>
                {diff > 0 ? '+' : ''}{diff !== 0 ? diff.toFixed(0) + '%' : '—'}
              </Text>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ ...s.badge, backgroundColor: color + '20', color }}>
                  {p.status}
                </Text>
              </View>
            </View>
          )
        })}
      </Page>

      {/* ===== HALAMAN 4: DETAIL KEUANGAN ===== */}
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
        <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 16 }}>Detail Keuangan</Text>
        <View style={{ borderBottom: `2px solid ${BLUE}`, marginBottom: 20 }} />

        <Text style={s.sectionTitle}>Transaksi Bulan {bulanLabel}</Text>
        {transactions.length === 0 ? (
          <Text style={s.mutedText}>Tidak ada transaksi pada bulan ini.</Text>
        ) : (
          <>
            <View style={s.tableHeader}>
              <Text style={{ ...s.tableCellBold, flex: 1.5 }}>Tanggal</Text>
              <Text style={{ ...s.tableCellBold, flex: 3 }}>Keterangan</Text>
              <Text style={{ ...s.tableCellBold, flex: 1, textAlign: 'center' }}>Jenis</Text>
              <Text style={{ ...s.tableCellBold, flex: 2, textAlign: 'right' }}>Nominal</Text>
            </View>
            {transactions.slice(0, 30).map((t, i) => {
              const isKeluar = t.jenis_transaksi.startsWith('Keluar')
              return (
                <View key={t.id ?? i} style={s.tableRow}>
                  <Text style={{ ...s.tableCell, flex: 1.5, color: MUTED }}>
                    {t.tanggal ? t.tanggal.slice(0, 10) : '—'}
                  </Text>
                  <Text style={{ ...s.tableCell, flex: 3 }}>
                    {t.deskripsi || t.nama_pekerjaan || '—'}
                  </Text>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{
                      ...s.badge,
                      backgroundColor: isKeluar ? 'rgba(220,38,38,0.1)' : 'rgba(5,150,105,0.1)',
                      color: isKeluar ? '#DC2626' : '#059669',
                    }}>
                      {isKeluar ? 'Keluar' : 'Masuk'}
                    </Text>
                  </View>
                  <Text style={{ ...s.tableCellBold, flex: 2, textAlign: 'right', color: isKeluar ? '#DC2626' : '#059669' }}>
                    {formatRupiah(t.nominal || 0)}
                  </Text>
                </View>
              )
            })}
            {transactions.length > 30 && (
              <Text style={{ ...s.mutedText, marginTop: 6 }}>
                + {transactions.length - 30} transaksi lainnya (lihat dashboard untuk detail lengkap)
              </Text>
            )}
            {/* Subtotal */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
              <Text style={{ fontSize: 10, color: '#059669', fontFamily: 'Helvetica-Bold' }}>
                Masuk: {formatRupiah(masukIni)}
              </Text>
              <Text style={{ fontSize: 10, color: '#DC2626', fontFamily: 'Helvetica-Bold' }}>
                Keluar: {formatRupiah(keluarIni)}
              </Text>
            </View>
          </>
        )}
      </Page>

      {/* ===== HALAMAN 5: EVALUASI & RENCANA ===== */}
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
        <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 16 }}>Evaluasi & Rencana</Text>
        <View style={{ borderBottom: `2px solid ${BLUE}`, marginBottom: 20 }} />

        <Text style={{ ...s.sectionTitle, marginTop: 0 }}>Catatan Evaluasi — {bulanLabel}</Text>
        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 16, border: `1px solid ${BORDER}`, marginBottom: 20, minHeight: 120 }}>
          <Text style={s.bodyText}>
            {catatanEvaluasi || '(Belum diisi)'}
          </Text>
        </View>

        <Text style={s.sectionTitle}>Rencana Eksekusi — {monthLabelFromYM(nextMonth(bulan))}</Text>
        <View style={{ backgroundColor: '#F0F9FF', borderRadius: 8, padding: 16, border: `1px solid #BAE6FD`, minHeight: 120 }}>
          <Text style={s.bodyText}>
            {rencana || '(Belum diisi)'}
          </Text>
        </View>

        {/* Footer */}
        <View style={{ position: 'absolute', bottom: PAGE_PADDING, left: PAGE_PADDING, right: PAGE_PADDING }}>
          <View style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.mutedText}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
            <Text style={s.mutedText}>Dibuat: {generatedAt}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const next = new Date(y, m, 1) // bulan ke-m (0-indexed) = bulan m+1
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}
```

- [ ] **Step 4: Verify TypeScript clean**

```bash
npx tsc -b
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/components/LaporanBulananPDF.tsx
git commit -m "feat: tambah @react-pdf/renderer + PDF template LaporanBulanan"
```

---

## Task 3: Tambah fetch + upsert di supabase.ts + adminApi.ts

**Files:**
- Modify: `src/lib/supabase.ts` (tambah setelah baris terakhir, atau setelah `fetchWeeklyNotes`)
- Modify: `src/lib/adminApi.ts` (tambah setelah `adminDelete`)

**Interfaces:**
- Produces:
  - `MonthlyReport` interface
  - `fetchMonthlyReport(bulan: string): Promise<{ data: MonthlyReport | null; error: unknown }>`
  - `upsertMonthlyReport(bulan: string, catatan: string, rencana: string): Promise<{ ok: boolean; error: unknown }>`

- [ ] **Step 1: Tambah interface + fetch di supabase.ts**

Tambahkan setelah `export const fetchWeeklyNotes`:

```ts
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
```

- [ ] **Step 2: Tambah upsert di adminApi.ts**

Tambahkan setelah `adminDelete`:

```ts
export async function upsertMonthlyReport(bulan: string, catatan: string, rencana: string) {
  const { data, error } = await supabase.rpc('admin_upsert_monthly_report', {
    p_pin: adminPin,
    p_bulan: bulan,
    p_catatan: catatan,
    p_rencana: rencana,
  })
  return { ok: data === true, error }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc -b
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts src/lib/adminApi.ts
git commit -m "feat: tambah MonthlyReport fetch + upsert di supabase/adminApi"
```

---

## Task 4: Halaman LaporanBulanan

**Files:**
- Create: `src/components/LaporanBulanan.tsx`

**Interfaces:**
- Consumes:
  - `fetchPrograms()`, `fetchTransactions()`, `fetchSnapshots()` dari `src/lib/supabase.ts`
  - `fetchMonthlyReport(bulan)` dari `src/lib/supabase.ts`
  - `upsertMonthlyReport(bulan, catatan, rencana)` dari `src/lib/adminApi.ts`
  - `LaporanBulananPDF`, `LaporanPDFProps` dari `./LaporanBulananPDF`
  - `pdf` dari `@react-pdf/renderer` (client-side blob generation)
  - `MonthSelector` dari `./MonthSelector`
  - `formatRupiah`, `monthLabelFromYM`, `monthsFromDates`, `STATUS_COLORS` dari `../lib/data`
- Produces: `default export LaporanBulanan` component dengan props `{ isAdmin: boolean }`

- [ ] **Step 1: Buat LaporanBulanan.tsx**

```tsx
// src/components/LaporanBulanan.tsx
import { useState, useEffect, useCallback } from 'react'
import { pdf } from '@react-pdf/renderer'
import MonthSelector from './MonthSelector'
import LaporanBulananPDF from './LaporanBulananPDF'
import {
  fetchPrograms, fetchTransactions, fetchSnapshots,
  fetchMonthlyReport,
  Program, Transaction, ProgramSnapshot, MonthlyReport,
} from '../lib/supabase'
import { upsertMonthlyReport } from '../lib/adminApi'
import { formatRupiah, monthLabelFromYM, monthsFromDates, STATUS_COLORS, getTodayFormatted } from '../lib/data'

interface LaporanBulananProps {
  isAdmin: boolean
}

function prevMonthYM(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1) // m-1 bulan saat ini (0-indexed), -1 = bulan lalu
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function txsForMonth(txs: Transaction[], ym: string): Transaction[] {
  return txs.filter(t => t.tanggal?.startsWith(ym))
}

// Cari progress terakhir program di bulan tertentu dari snapshots
function progressInMonth(
  snapshots: ProgramSnapshot[],
  programId: string,
  ym: string,
): number | null {
  const inMonth = snapshots
    .filter(s => s.program_id === programId && s.snapshot_date?.startsWith(ym))
    .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))
  return inMonth[0]?.progress_percent ?? null
}

export default function LaporanBulanan({ isAdmin }: LaporanBulananProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [snapshots, setSnapshots] = useState<ProgramSnapshot[]>([])
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null)
  const [loading, setLoading] = useState(true)

  // Pilih bulan — default: bulan lalu (bukan bulan ini, karena laporan biasanya untuk bulan yang sudah selesai)
  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}` // bulan lalu
  const allMonths = monthsFromDates(transactions.map(t => t.tanggal))
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  const bulan = selectedMonth ?? (allMonths[0] || defaultMonth)
  const prevBulan = prevMonthYM(bulan)

  const [catatan, setCatatan] = useState('')
  const [rencana, setRencana] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchPrograms(), fetchTransactions(), fetchSnapshots()])
      .then(([pRes, tRes, sRes]) => {
        // Exclude P-024 (Man Power) — konsistensi dengan MAF exclusion
        setPrograms((pRes.data ?? []).filter(p => p.id !== 'P-024'))
        setTransactions(tRes.data ?? [])
        setSnapshots((sRes.data ?? []) as ProgramSnapshot[])
      })
      .finally(() => setLoading(false))
  }, [])

  // Load catatan/rencana saat bulan berubah
  useEffect(() => {
    fetchMonthlyReport(bulan).then(({ data }) => {
      setMonthlyReport(data)
      setCatatan(data?.catatan_evaluasi ?? '')
      setRencana(data?.rencana ?? '')
    })
  }, [bulan])

  const handleSave = useCallback(async () => {
    if (!isAdmin) return
    setSaving(true)
    setSaveMsg('')
    const { ok } = await upsertMonthlyReport(bulan, catatan, rencana)
    setSaving(false)
    setSaveMsg(ok ? 'Tersimpan' : 'Gagal menyimpan')
    setTimeout(() => setSaveMsg(''), 2500)
  }, [isAdmin, bulan, catatan, rencana])

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const txsBulanIni = txsForMonth(transactions, bulan)
      const txsBulanLalu = txsForMonth(transactions, prevBulan)

      const progressByProgram: Record<string, number> = {}
      const prevProgressByProgram: Record<string, number> = {}
      programs.forEach(p => {
        progressByProgram[p.id] = progressInMonth(snapshots, p.id, bulan) ?? p.progress_percent ?? 0
        prevProgressByProgram[p.id] = progressInMonth(snapshots, p.id, prevBulan) ?? 0
      })

      const blob = await pdf(
        <LaporanBulananPDF
          bulan={bulan}
          prevBulan={prevBulan}
          programs={programs}
          transactions={txsBulanIni}
          prevTransactions={txsBulanLalu}
          progressByProgram={progressByProgram}
          prevProgressByProgram={prevProgressByProgram}
          catatanEvaluasi={catatan}
          rencana={rencana}
          generatedAt={getTodayFormatted()}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Laporan-Bulanan-Sarpras-MAF-${bulan}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '32px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
        Memuat data...
      </div>
    )
  }

  const txsBulanIni = txsForMonth(transactions, bulan)
  const txsBulanLalu = txsForMonth(transactions, prevBulan)
  const masukIni = txsBulanIni.filter(t => t.jenis_transaksi === 'Masuk').reduce((s, t) => s + (t.nominal || 0), 0)
  const keluarIni = txsBulanIni.filter(t => t.jenis_transaksi.startsWith('Keluar')).reduce((s, t) => s + (t.nominal || 0), 0)
  const masukPrev = txsBulanLalu.filter(t => t.jenis_transaksi === 'Masuk').reduce((s, t) => s + (t.nominal || 0), 0)
  const keluarPrev = txsBulanLalu.filter(t => t.jenis_transaksi.startsWith('Keluar')).reduce((s, t) => s + (t.nominal || 0), 0)

  const progressByProgram: Record<string, number> = {}
  const prevProgressByProgram: Record<string, number> = {}
  programs.forEach(p => {
    progressByProgram[p.id] = progressInMonth(snapshots, p.id, bulan) ?? p.progress_percent ?? 0
    prevProgressByProgram[p.id] = progressInMonth(snapshots, p.id, prevBulan) ?? 0
  })

  const avgProgress = programs.length > 0
    ? programs.reduce((s, p) => s + (progressByProgram[p.id] ?? 0), 0) / programs.length
    : 0
  const avgProgressPrev = programs.length > 0
    ? programs.reduce((s, p) => s + (prevProgressByProgram[p.id] ?? 0), 0) / programs.length
    : 0

  const statusCount: Record<string, number> = {}
  programs.forEach(p => { statusCount[p.status] = (statusCount[p.status] || 0) + 1 })

  const card = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      padding: '16px 20px',
      marginBottom: 14,
      ...extra,
    }}>
      {children}
    </div>
  )

  const statMini = (label: string, val: string, sub: string, color = 'var(--text-primary)') => (
    <div style={{ flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: '-0.03em' }}>{val}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
    </div>
  )

  const deltaText = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? '+100%' : '—'
    const pct = ((curr - prev) / prev) * 100
    return (pct >= 0 ? '▲ +' : '▼ ') + Math.abs(pct).toFixed(1) + '%'
  }
  const deltaColor = (curr: number, prev: number) => curr >= prev ? '#059669' : '#DC2626'

  return (
    <div style={{ padding: '20px 20px 40px', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Laporan Bulanan
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Evaluasi, perbandingan & rencana eksekusi
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MonthSelector
            value={selectedMonth}
            onChange={setSelectedMonth}
            months={allMonths}
            allLabel="Pilih Bulan"
          />
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            style={{
              height: 32, padding: '0 14px', borderRadius: 8,
              backgroundColor: exporting ? 'var(--border-subtle)' : '#1A6FE8',
              color: exporting ? 'var(--text-muted)' : '#fff',
              border: 'none', cursor: exporting ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'background-color 0.15s',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Ringkasan Keuangan */}
      {card(
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
            Keuangan — {monthLabelFromYM(bulan)}
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {statMini('Dana Masuk', formatRupiah(masukIni),
              `${deltaText(masukIni, masukPrev)} vs ${monthLabelFromYM(prevBulan)}`,
              masukIni >= masukPrev ? '#059669' : '#DC2626'
            )}
            {statMini('Dana Keluar', formatRupiah(keluarIni),
              `${deltaText(keluarIni, keluarPrev)} vs ${monthLabelFromYM(prevBulan)}`,
              '#DC2626'
            )}
            {statMini('Net',
              formatRupiah(Math.abs(masukIni - keluarIni)),
              masukIni >= keluarIni ? 'surplus' : 'defisit',
              masukIni >= keluarIni ? '#059669' : '#DC2626'
            )}
            {statMini('Transaksi', String(txsBulanIni.length), `vs ${txsBulanLalu.length} bulan lalu`)}
          </div>
        </>
      )}

      {/* Progress Pekerjaan */}
      {card(
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
            Progress Pekerjaan
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
            {statMini(
              `Rata-rata ${monthLabelFromYM(bulan)}`,
              avgProgress.toFixed(1) + '%',
              `${deltaText(avgProgress, avgProgressPrev)} vs ${monthLabelFromYM(prevBulan)}`,
              '#1A6FE8'
            )}
            {Object.entries(STATUS_COLORS).map(([status, color]) =>
              statMini(status, String(statusCount[status] || 0), 'pekerjaan', color)
            )}
          </div>
          {/* Tabel per program */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-min)' }}>
                  {['Pekerjaan', 'Vendor', `Progress ${monthLabelFromYM(bulan)}`, `Delta vs ${monthLabelFromYM(prevBulan)}`, 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {programs.map(p => {
                  const prog = progressByProgram[p.id] ?? 0
                  const prevProg = prevProgressByProgram[p.id] ?? 0
                  const diff = prog - prevProg
                  const color = STATUS_COLORS[p.status] || 'var(--text-muted)'
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.nama_pekerjaan}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{p.vendor}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1A6FE8' }}>{prog}%</td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: diff > 0 ? '#059669' : diff < 0 ? '#DC2626' : 'var(--text-muted)' }}>
                        {diff > 0 ? '+' : ''}{diff !== 0 ? diff.toFixed(0) + '%' : '—'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ backgroundColor: color + '20', color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Catatan Evaluasi */}
      {card(
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
            Catatan Evaluasi — {monthLabelFromYM(bulan)}
          </div>
          {isAdmin ? (
            <textarea
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Tuliskan evaluasi bulan ini: apa yang berjalan baik, apa yang terlambat, masalah vendor, dll."
              rows={6}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px', borderRadius: 10,
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--surface-min)',
                color: 'var(--text-primary)', fontSize: 13,
                fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical',
                outline: 'none',
              }}
            />
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {catatan || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum diisi.</span>}
            </div>
          )}
        </>
      )}

      {/* Rencana Bulan Depan */}
      {card(
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A6FE8', marginBottom: 10 }}>
            Rencana Eksekusi — Bulan Depan
          </div>
          {isAdmin ? (
            <textarea
              value={rencana}
              onChange={e => setRencana(e.target.value)}
              placeholder="Tuliskan rencana bulan depan: target progress per pekerjaan, vendor yang perlu di-follow up, kebutuhan anggaran tambahan, dll."
              rows={6}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px', borderRadius: 10,
                border: '1px solid rgba(26,111,232,0.3)',
                backgroundColor: 'rgba(26,111,232,0.04)',
                color: 'var(--text-primary)', fontSize: 13,
                fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical',
                outline: 'none',
              }}
            />
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {rencana || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum diisi.</span>}
            </div>
          )}
        </>
      )}

      {/* Simpan button (admin only) */}
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              height: 36, padding: '0 20px', borderRadius: 10,
              backgroundColor: saving ? 'var(--border-subtle)' : '#1A6FE8',
              color: saving ? 'var(--text-muted)' : '#fff',
              border: 'none', cursor: saving ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              transition: 'background-color 0.15s',
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Catatan & Rencana'}
          </button>
          {saveMsg && (
            <span style={{ fontSize: 13, color: saveMsg === 'Tersimpan' ? '#059669' : '#DC2626', fontWeight: 600 }}>
              {saveMsg}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc -b
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/LaporanBulanan.tsx
git commit -m "feat: halaman LaporanBulanan — summary otomatis + edit catatan/rencana + export PDF"
```

---

## Task 5: Wire ke App.tsx + Sidebar.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: `LaporanBulanan` dari `./components/LaporanBulanan`

- [ ] **Step 1: Update App.tsx**

Tambah import + `'laporan'` ke `Page` type + routing:

```tsx
// Tambah import (baris setelah import RiwayatLaporan)
import LaporanBulanan from './components/LaporanBulanan'

// Update Page type (line ~14)
type Page = 'beranda' | 'pekerjaan' | 'keuangan' | 'galeri' | 'riwayat' | 'laporan'

// Update pageTitles
const pageTitles: Record<Page, string> = {
  beranda: 'Beranda',
  pekerjaan: 'Pekerjaan',
  keuangan: 'Keuangan',
  galeri: 'Galeri',
  riwayat: 'Riwayat Laporan',
  laporan: 'Laporan Bulanan',
}

// Tambah ke switch di renderPage(), SEBELUM 'default:':
case 'laporan':
  return role === 'maf'
    ? <Beranda isAdmin={isAdmin} role={role} />
    : <LaporanBulanan isAdmin={isAdmin} />
```

- [ ] **Step 2: Update Sidebar.tsx**

Tambah menu item baru setelah item `riwayat` di array `menuItems`:

```tsx
{
  id: 'laporan',
  label: 'Laporan Bulanan',
  icon: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
},
```

Dan filter `laporan` untuk MAF (sama pola dengan `riwayat`):

```tsx
// Update filter di render — dari:
{menuItems.filter(item => role !== 'maf' || item.id !== 'riwayat').map(item => {
// Menjadi:
{menuItems.filter(item => role !== 'maf' || !['riwayat', 'laporan'].includes(item.id)).map(item => {
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc -b
```

Expected: exit 0.

- [ ] **Step 4: Test manual di browser**

```bash
npm run dev
```

Buka `http://localhost:5173`, login sebagai `sarpras`. Cek:
- Menu sidebar "Laporan Bulanan" muncul dengan ikon dokumen
- Klik → halaman LaporanBulanan tampil dengan month selector + stat cards keuangan + tabel progress
- Masuk mode Admin → textarea catatan & rencana muncul, bisa diisi
- Klik "Simpan" → muncul "Tersimpan"
- Klik "Export PDF" → PDF terdownload dengan 5 halaman (cover, ringkasan, pekerjaan, keuangan, evaluasi)
- Login sebagai `madrasahalfatih` → menu "Laporan Bulanan" tidak muncul

- [ ] **Step 5: Commit + push**

```bash
git add src/App.tsx src/components/Sidebar.tsx
git commit -m "feat: wire LaporanBulanan ke routing App + Sidebar, hidden untuk MAF role"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ Evaluasi bulan ini (data otomatis): keuangan + progress per program
- ✅ Perbandingan bulan lalu vs bulan ini: delta masuk/keluar, delta progress per program
- ✅ Rencana eksekusi bulan depan: manual field, disimpan ke Supabase
- ✅ PDF multi-halaman (>2 halaman): 5 halaman — cover, ringkasan, pekerjaan, keuangan, evaluasi/rencana
- ✅ Format PDF profesional, fixed template
- ✅ MAF role tidak bisa akses
- ✅ Admin-gated write (save catatan/rencana)
- ✅ Viewer bisa baca tapi tidak bisa edit

**Placeholder scan:** Tidak ada TBD atau placeholder — semua kode lengkap.

**Type consistency:**
- `LaporanPDFProps` didefinisikan di `LaporanBulananPDF.tsx` Task 2, digunakan di `LaporanBulanan.tsx` Task 4 ✅
- `MonthlyReport` didefinisikan di `supabase.ts` Task 3, digunakan di `LaporanBulanan.tsx` Task 4 ✅
- `upsertMonthlyReport` signature di Task 3 cocok dengan penggunaan di Task 4 ✅
- `prevMonthYM` didefinisikan lokal di `LaporanBulanan.tsx` ✅
- `nextMonth` didefinisikan lokal di `LaporanBulananPDF.tsx` ✅
