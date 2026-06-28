# Executive Beranda Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Beranda menjadi executive cockpit satu halaman yang langsung menampilkan alert masalah, tren progress, grafik keuangan, dan ringkasan vendor — tanpa perlu klik ke halaman lain.

**Architecture:** Beranda.tsx tetap menjadi root orchestrator; data fetch diperluas dengan `fetchSnapshots`. Lima komponen baru (`BerandaAlerts`, `BerandaWeekOverWeek`, `BerandaChart`, `BerandaVendor`) masing-masing menerima data via props dari Beranda.tsx. Freshness indicator ditambahkan langsung di header Beranda.tsx. Tidak ada library baru — grafik menggunakan native SVG.

**Tech Stack:** React 18, TypeScript, Supabase JS v2, native SVG (tidak ada chart library baru).

## Global Constraints

- Inline styles ONLY — tidak ada Tailwind utility classes di JSX
- CSS variables yang valid di project ini: `var(--blue)`, `var(--card)`, `var(--border)`, `var(--border-subtle)`, `var(--border-strong)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--surface-2)`, `var(--surface-subtle)`, `var(--bg)`, `var(--blue)`
- SVG `fill=` dan `stroke=` harus pakai hex literal, BUKAN `var()` (SVG attribute tidak support CSS variables)
- Tidak ada npm dependency baru — gunakan native JS/SVG/CSS
- Semua currency diformat pakai `formatRupiah()` dari `src/lib/data.ts`
- Dev server: `npm run dev` (port 5173)
- Deploy: `git push` ke `main` → Vercel auto-deploy

---

## File Map

| File | Action | Tanggung Jawab |
|---|---|---|
| `src/components/Beranda.tsx` | Modify | Extend fetch (snapshots + raw transactions), tambah freshness, compose komponen baru |
| `src/components/BerandaAlerts.tsx` | Create | Alert program melewati deadline + melebihi anggaran |
| `src/components/BerandaWeekOverWeek.tsx` | Create | Progress delta 7 hari (dari program_snapshots) |
| `src/components/BerandaChart.tsx` | Create | Bar chart pengeluaran per bulan (SVG) |
| `src/components/BerandaVendor.tsx` | Create | Ringkasan per vendor: jumlah program, anggaran, realisasi, avg progress |

---

## Task 1: BerandaAlerts — Deadline & Budget Overages

**Files:**
- Create: `src/components/BerandaAlerts.tsx`
- Modify: `src/components/Beranda.tsx` (import + gunakan, letakkan setelah page header)

**Interfaces:**
- Consumes: `programs: Program[]` dari `src/lib/supabase.ts`
- Produces: komponen standalone, tidak ada export lain

**Logic:**
- Overdue: `p.target_selesai` ada AND < `today` AND status NOT IN `['Selesai', 'On Hold', 'Perencanaan']`
- Budget overage: `(p.sisa_anggaran ?? 0) < 0`
- Return `null` jika tidak ada masalah (komponen tidak muncul sama sekali)

- [ ] **Step 1: Buat `src/components/BerandaAlerts.tsx`**

```tsx
import { Program } from '../lib/supabase'
import { formatRupiah } from '../lib/data'

interface BerandaAlertsProps {
  programs: Program[]
}

export default function BerandaAlerts({ programs }: BerandaAlertsProps) {
  const today = new Date().toISOString().split('T')[0]

  const overdue = programs.filter(p =>
    p.target_selesai &&
    p.target_selesai < today &&
    !['Selesai', 'On Hold', 'Perencanaan'].includes(p.status)
  )

  const overBudget = programs.filter(p => (p.sisa_anggaran ?? 0) < 0)

  if (overdue.length === 0 && overBudget.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {overdue.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(220,38,38,0.05)',
          border: '1px solid rgba(220,38,38,0.18)',
          borderLeft: '3px solid #DC2626',
          borderRadius: 10,
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <svg width="14" height="14" fill="none" stroke="#DC2626" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {overdue.length} Program Melewati Deadline
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {overdue.map(p => {
              const daysLate = Math.floor(
                (new Date(today).getTime() - new Date(p.target_selesai!).getTime()) / 86400000
              )
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>{p.nama_pekerjaan}</span>
                  <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {daysLate} hari terlambat
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {overBudget.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(217,119,6,0.05)',
          border: '1px solid rgba(217,119,6,0.18)',
          borderLeft: '3px solid #D97706',
          borderRadius: 10,
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <svg width="14" height="14" fill="none" stroke="#D97706" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {overBudget.length} Program Melebihi Anggaran
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {overBudget.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>{p.nama_pekerjaan}</span>
                <span style={{ fontSize: 11, color: '#D97706', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  lebih {formatRupiah(Math.abs(p.sisa_anggaran ?? 0))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Tambah import + pakai BerandaAlerts di Beranda.tsx**

Di bagian import (baris 1-4):
```tsx
import BerandaAlerts from './BerandaAlerts'
```

Di return JSX, sisipkan setelah `{/* Page Header */}` div (setelah baris 162, sebelum `{/* Metric Cards */}`):
```tsx
<BerandaAlerts programs={programs} />
```

- [ ] **Step 3: Verify di browser**

Jalankan `npm run dev`. Buka `localhost:5173`. Jika ada program dengan `target_selesai` di masa lalu atau `sisa_anggaran < 0`, alert akan muncul. Jika tidak ada, komponen tidak muncul (normal). Untuk test, bisa periksa di Supabase apakah ada data seperti itu.

- [ ] **Step 4: Commit**

```bash
git add src/components/BerandaAlerts.tsx src/components/Beranda.tsx
git commit -m "feat: Phase 3 - alert deadline & budget overage (BerandaAlerts)"
```

---

## Task 2: Freshness Indicator di Page Header

**Files:**
- Modify: `src/components/Beranda.tsx` (tambah kalkulasi freshness + render di header)

**Interfaces:**
- Consumes: `programs: Program[]` (sudah ada di state), field `updated_at?: string`
- Produces: teks "data diperbarui X hari lalu" di samping tanggal

- [ ] **Step 1: Tambah kalkulasi freshness di Beranda.tsx**

Letakkan setelah baris `const penyerapan = ...` (sekitar baris 78), sebelum `const progressPrograms = ...`:

```tsx
const mostRecentUpdate = programs.reduce((latest, p) => {
  if (!p.updated_at) return latest
  return p.updated_at > latest ? p.updated_at : latest
}, '')

const freshnessDays = mostRecentUpdate
  ? Math.floor((Date.now() - new Date(mostRecentUpdate).getTime()) / 86400000)
  : null
```

- [ ] **Step 2: Tambah freshness label di header**

Ganti `<p style={{ color: 'var(--text-secondary)', ... }}>{getTodayFormatted()}</p>` (sekitar baris 160) dengan:

```tsx
<p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 5, fontWeight: 400, display: 'flex', alignItems: 'center', gap: 8 }}>
  {getTodayFormatted()}
  {freshnessDays !== null && (
    <span style={{
      fontSize: 11,
      color: freshnessDays === 0 ? '#059669' : freshnessDays <= 3 ? '#D97706' : '#DC2626',
      fontWeight: 700,
    }}>
      · data diperbarui {freshnessDays === 0 ? 'hari ini' : `${freshnessDays} hari lalu`}
    </span>
  )}
</p>
```

- [ ] **Step 3: Verify di browser**

Freshness indicator muncul di bawah judul "Dashboard Sarpras MAF". Warna: hijau (hari ini), kuning (1-3 hari), merah (>3 hari).

- [ ] **Step 4: Commit**

```bash
git add src/components/Beranda.tsx
git commit -m "feat: Phase 3 - freshness indicator di Beranda header"
```

---

## Task 3: BerandaChart — Monthly Spending Bar Chart

**Files:**
- Modify: `src/components/Beranda.tsx` (tambah import `Transaction`, state `rawTransactions`, populate di useEffect)
- Create: `src/components/BerandaChart.tsx`

**Interfaces:**
- Consumes: `transactions: Transaction[]` dari `src/lib/supabase.ts`
- Produces: SVG bar chart, tidak ada export lain

**Note:** Beranda.tsx saat ini TIDAK menyimpan raw transactions — hanya menghitung `totalRealisasi`. Perlu tambah state `rawTransactions`.

- [ ] **Step 1: Extend Beranda.tsx — import & state**

Ganti baris import supabase (baris 2):
```tsx
import { fetchPrograms, fetchTransactions, fetchSnapshots, Program, ProgramSnapshot, Transaction } from '../lib/supabase'
```

Tambah state baru setelah `const [listFilter, setListFilter] = useState('On Going')` (sekitar baris 55):
```tsx
const [rawTransactions, setRawTransactions] = useState<Transaction[]>([])
const [snapshots, setSnapshots] = useState<ProgramSnapshot[]>([])
```

- [ ] **Step 2: Extend useEffect di Beranda.tsx untuk fetch snapshots + simpan raw transactions**

Ganti seluruh blok `const load = async () => { ... }` (baris 58-73):

```tsx
const load = async () => {
  setLoading(true)
  const [{ data: progData }, { data: txData }, { data: snapData }] = await Promise.all([
    fetchPrograms(),
    fetchTransactions(),
    fetchSnapshots(),
  ])
  if (progData) setPrograms(progData)
  if (txData) {
    setRawTransactions(txData)
    const realisasi = txData
      .filter(t => t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB')
      .reduce((s, t) => s + (t.nominal || 0), 0)
    setTotalRealisasi(realisasi)
  }
  if (snapData) setSnapshots(snapData)
  setLoading(false)
}
```

- [ ] **Step 3: Buat `src/components/BerandaChart.tsx`**

```tsx
import { Transaction } from '../lib/supabase'
import { formatRupiah } from '../lib/data'

interface BerandaChartProps {
  transactions: Transaction[]
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export default function BerandaChart({ transactions }: BerandaChartProps) {
  // Group by YYYY-MM, hanya outflow
  const byMonth: Record<string, number> = {}
  transactions
    .filter(t => t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB')
    .forEach(t => {
      const ym = t.tanggal?.slice(0, 7)
      if (ym) byMonth[ym] = (byMonth[ym] || 0) + (t.nominal || 0)
    })

  // 6 bulan terakhir
  const months: { ym: string; label: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const ym = d.toISOString().slice(0, 7)
    months.push({
      ym,
      label: `${MONTHS_ID[d.getMonth()]} '${d.getFullYear().toString().slice(2)}`,
      total: byMonth[ym] || 0,
    })
  }

  const maxVal = Math.max(...months.map(m => m.total), 1)
  const barW = 36
  const chartH = 90
  const gap = 14
  const totalW = months.length * (barW + gap) - gap

  if (transactions.length === 0) return null

  return (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      padding: '16px 20px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: 20,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        Pengeluaran per Bulan
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, marginBottom: 18 }}>6 bulan terakhir</div>

      <div style={{ overflowX: 'auto' }}>
        <svg
          width={Math.max(totalW, 300)}
          height={chartH + 28}
          style={{ display: 'block', minWidth: '100%' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {months.map((m, i) => {
            const barH = m.total > 0 ? Math.max(5, (m.total / maxVal) * chartH) : 3
            const x = i * (barW + gap)
            const y = chartH - barH
            return (
              <g key={m.ym}>
                <title>{m.label}: {formatRupiah(m.total)}</title>
                <rect
                  x={x} y={y}
                  width={barW} height={barH}
                  rx="5"
                  fill={m.total > 0 ? '#1A6FE8' : '#E2E8F0'}
                  opacity={m.total > 0 ? 0.8 : 1}
                />
                <text
                  x={x + barW / 2}
                  y={chartH + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#94A3B8"
                  fontFamily="inherit"
                >
                  {m.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Tambah import + pakai BerandaChart di Beranda.tsx**

Tambah import:
```tsx
import BerandaChart from './BerandaChart'
```

Di JSX, tambahkan setelah `<BerandaAlerts programs={programs} />` dan sebelum `{/* Metric Cards */}`:

Tidak — letakkan setelah Metric Cards dan setelah BerandaWeekOverWeek (yang dibuat di Task 4). Untuk saat ini, sisipkan setelah metric cards, sebelum `{/* Status Pekerjaan */}`:
```tsx
<BerandaChart transactions={rawTransactions} />
```

- [ ] **Step 5: Verify di browser**

Bar chart 6 bulan muncul. Hover setiap bar → tooltip menampilkan bulan dan nominal. Bulan tanpa transaksi tampil sebagai bar pendek abu-abu.

- [ ] **Step 6: Commit**

```bash
git add src/components/BerandaChart.tsx src/components/Beranda.tsx
git commit -m "feat: Phase 3 - monthly spending chart (BerandaChart)"
```

---

## Task 4: BerandaWeekOverWeek — Progress Delta 7 Hari

**Files:**
- Create: `src/components/BerandaWeekOverWeek.tsx`
- Modify: `src/components/Beranda.tsx` (import + gunakan, pass snapshots)

**Note:** `fetchSnapshots` dan state `snapshots: ProgramSnapshot[]` sudah ditambahkan di Task 3. Task ini hanya perlu membuat komponen dan memasangnya.

**Interfaces:**
- Consumes:
  - `programs: Program[]` — untuk nama dan status
  - `snapshots: ProgramSnapshot[]` — dari `src/lib/supabase.ts`, field: `program_id: string`, `snapshot_date: string`, `progress_percent: number | null`
- Produces: komponen standalone

**Logic:**
- Hanya tampilkan program On Going yang bukan Operasional
- Per program: ambil semua snapshots miliknya, sort by `snapshot_date` ascending
- Jika < 2 snapshots → delta = null → tampil "–"
- `latest` = snapshot terakhir
- `weekAgoSnap` = snapshot dengan `snapshot_date` paling dekat dengan 7 hari lalu
- Jika `weekAgoSnap.snapshot_date === latest.snapshot_date` → hanya 1 unik → delta = null
- `delta` = `(latest.progress_percent ?? p.progress_percent) - weekAgoSnap.progress_percent`

- [ ] **Step 1: Buat `src/components/BerandaWeekOverWeek.tsx`**

```tsx
import { Program, ProgramSnapshot } from '../lib/supabase'

interface Props {
  programs: Program[]
  snapshots: ProgramSnapshot[]
}

export default function BerandaWeekOverWeek({ programs, snapshots }: Props) {
  const ongoingPrograms = programs.filter(
    p => p.status === 'On Going' && p.jenis_pekerjaan !== 'Operasional'
  )

  if (ongoingPrograms.length === 0) return null

  const now = Date.now()
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000

  const rows = ongoingPrograms.map(p => {
    const programSnaps = snapshots
      .filter(s => s.program_id === p.id)
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))

    if (programSnaps.length < 2) {
      return { program: p, current: p.progress_percent, prev: null as number | null, delta: null as number | null }
    }

    const latest = programSnaps[programSnaps.length - 1]
    const weekAgoTarget = now - oneWeekMs

    const weekAgoSnap = programSnaps.reduce((closest, s) => {
      const diff = Math.abs(new Date(s.snapshot_date).getTime() - weekAgoTarget)
      const closestDiff = Math.abs(new Date(closest.snapshot_date).getTime() - weekAgoTarget)
      return diff < closestDiff ? s : closest
    })

    if (weekAgoSnap.snapshot_date === latest.snapshot_date) {
      return { program: p, current: latest.progress_percent ?? p.progress_percent, prev: null as number | null, delta: null as number | null }
    }

    const current = latest.progress_percent ?? p.progress_percent
    const prev = weekAgoSnap.progress_percent ?? 0
    return { program: p, current, prev, delta: (current ?? 0) - prev }
  })

  return (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      padding: '16px 20px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: 20,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        Progress Pekan Ini
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, marginBottom: 16 }}>
        Perubahan dari 7 hari lalu · {ongoingPrograms.length} program On Going
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(({ program, current, prev, delta }) => (
          <div key={program.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                marginBottom: 5,
              }}>
                {program.nama_pekerjaan}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, current ?? 0)}%`,
                    backgroundColor: '#1A6FE8',
                    borderRadius: 99,
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', minWidth: 28, textAlign: 'right' }}>
                  {current ?? 0}%
                </span>
              </div>
            </div>

            <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 68 }}>
              {delta === null ? (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>–</span>
              ) : delta > 0 ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>▲ +{delta}%</span>
              ) : delta < 0 ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>▼ {delta}%</span>
              ) : (
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)' }}>→ 0%</span>
              )}
              {prev !== null && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>dari {prev}%</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Tambah import + pakai BerandaWeekOverWeek di Beranda.tsx**

Tambah import:
```tsx
import BerandaWeekOverWeek from './BerandaWeekOverWeek'
```

Di JSX, letakkan setelah metric cards, sebelum `<BerandaChart>`:
```tsx
<BerandaWeekOverWeek programs={programs} snapshots={snapshots} />
```

Urutan akhir JSX setelah Metric Cards:
```
<BerandaWeekOverWeek programs={programs} snapshots={snapshots} />
<BerandaChart transactions={rawTransactions} />
```

- [ ] **Step 3: Verify di browser**

Program On Going muncul dengan progress bar. Program yang punya 2+ snapshots menampilkan delta (hijau/merah). Program baru (1 snapshot atau tidak ada snapshot) menampilkan "–".

- [ ] **Step 4: Commit**

```bash
git add src/components/BerandaWeekOverWeek.tsx src/components/Beranda.tsx
git commit -m "feat: Phase 3 - week-over-week progress (BerandaWeekOverWeek)"
```

---

## Task 5: BerandaVendor — Ringkasan per Vendor

**Files:**
- Create: `src/components/BerandaVendor.tsx`
- Modify: `src/components/Beranda.tsx` (import + gunakan)

**Interfaces:**
- Consumes: `programs: Program[]`
- Produces: komponen standalone

**Logic:**
- Group programs by `p.vendor`, skip program tanpa vendor
- Per vendor: jumlah program, total anggaran, total realisasi, avg progress (dibulatkan)
- Sort by total anggaran DESC

- [ ] **Step 1: Buat `src/components/BerandaVendor.tsx`**

```tsx
import { Program } from '../lib/supabase'
import { formatRupiah } from '../lib/data'

interface Props {
  programs: Program[]
}

export default function BerandaVendor({ programs }: Props) {
  const byVendor: Record<string, Program[]> = {}
  programs.forEach(p => {
    if (!p.vendor) return
    if (!byVendor[p.vendor]) byVendor[p.vendor] = []
    byVendor[p.vendor].push(p)
  })

  const vendors = Object.entries(byVendor)
    .map(([vendor, progs]) => ({
      vendor,
      count: progs.length,
      totalAnggaran: progs.reduce((s, p) => s + (p.total_anggaran || 0), 0),
      totalRealisasi: progs.reduce((s, p) => s + (p.realisasi_terkini || 0), 0),
      avgProgress: Math.round(
        progs.reduce((s, p) => s + (p.progress_percent || 0), 0) / progs.length
      ),
    }))
    .sort((a, b) => b.totalAnggaran - a.totalAnggaran)

  if (vendors.length === 0) return null

  return (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      overflow: 'hidden',
      marginBottom: 20,
    }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Ringkasan per Vendor
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {vendors.length} vendor aktif
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr>
              {['Vendor', 'Program', 'Progress', 'Anggaran', 'Realisasi'].map(h => (
                <th
                  key={h}
                  style={{
                    padding: '9px 16px',
                    textAlign: 'left',
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--surface-subtle)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendors.map((v, i) => (
              <tr
                key={v.vendor}
                style={{
                  borderBottom: i < vendors.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}
              >
                <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {v.vendor}
                </td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {v.count}
                </td>
                <td style={{ padding: '11px 16px', minWidth: 120 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        width: `${v.avgProgress}%`,
                        height: '100%',
                        backgroundColor: '#1A6FE8',
                        borderRadius: 99,
                      }} />
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1A6FE8', minWidth: 32 }}>
                      {v.avgProgress}%
                    </span>
                  </div>
                </td>
                <td style={{
                  padding: '11px 16px', fontSize: 12.5,
                  color: 'var(--text-primary)', whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatRupiah(v.totalAnggaran)}
                </td>
                <td style={{
                  padding: '11px 16px', fontSize: 12.5,
                  color: '#059669', fontWeight: 600, whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatRupiah(v.totalRealisasi)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Tambah import + pakai BerandaVendor di Beranda.tsx**

Tambah import:
```tsx
import BerandaVendor from './BerandaVendor'
```

Di JSX, letakkan setelah `<BerandaChart>`, sebelum `{/* Status Pekerjaan */}`:
```tsx
<BerandaVendor programs={programs} />
```

- [ ] **Step 3: Verify di browser**

Tabel vendor muncul. Sort by anggaran DESC. Progress bar per vendor menampilkan rata-rata progress. Vendor tanpa data vendor di program tidak muncul.

- [ ] **Step 4: Commit**

```bash
git add src/components/BerandaVendor.tsx src/components/Beranda.tsx
git commit -m "feat: Phase 3 - vendor summary table (BerandaVendor)"
```

---

## Task 6: Final Layout Composition & Push

**Files:**
- Modify: `src/components/Beranda.tsx` (periksa urutan, bersihkan imports)

Urutan JSX final di Beranda.tsx:
```
1. Page Header (dengan freshness indicator) — sudah ada dari Task 2
2. <BerandaAlerts programs={programs} />         — Task 1
3. Metric Cards (4 kartu)                        — sudah ada
4. <BerandaWeekOverWeek programs={programs} snapshots={snapshots} />  — Task 4
5. <BerandaChart transactions={rawTransactions} />                    — Task 3
6. <BerandaVendor programs={programs} />                              — Task 5
7. {/* Status Pekerjaan */} (existing collapsible)
8. {/* Laporan Pekanan */} (existing collapsible)
```

- [ ] **Step 1: Verifikasi urutan import di Beranda.tsx**

Import section seharusnya:
```tsx
import { useEffect, useState } from 'react'
import { fetchPrograms, fetchTransactions, fetchSnapshots, Program, ProgramSnapshot, Transaction } from '../lib/supabase'
import { formatRupiah, getTodayFormatted, STATUS_COLORS } from '../lib/data'
import LaporanPekananCard from './LaporanPekananCard'
import BerandaAlerts from './BerandaAlerts'
import BerandaWeekOverWeek from './BerandaWeekOverWeek'
import BerandaChart from './BerandaChart'
import BerandaVendor from './BerandaVendor'
```

- [ ] **Step 2: Verifikasi urutan JSX di return()**

Pastikan urutan komponen sudah benar sesuai dengan final layout di atas.

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: build berhasil tanpa TypeScript error.

- [ ] **Step 4: Visual check menyeluruh di browser**

Buka `localhost:5173`. Cek:
- Header menampilkan freshness indicator
- Jika ada program overdue/over-budget: alert muncul berwarna merah/kuning
- Metric cards masih benar
- Week-over-week section muncul untuk program On Going
- Bar chart 6 bulan muncul
- Tabel vendor muncul
- Progress Pekerjaan dan Laporan Pekanan masih bisa toggle seperti sebelumnya

- [ ] **Step 5: Commit final + push**

```bash
git add src/components/Beranda.tsx src/components/BerandaAlerts.tsx src/components/BerandaWeekOverWeek.tsx src/components/BerandaChart.tsx src/components/BerandaVendor.tsx
git commit -m "feat: Phase 3 - compose executive Beranda (alerts, WoW, chart, vendor)"
git push
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Alert deadline → BerandaAlerts (Task 1)
- [x] Alert budget overage → BerandaAlerts (Task 1)
- [x] Freshness indicator → Beranda.tsx header (Task 2)
- [x] Monthly spending chart → BerandaChart (Task 3)
- [x] Week-over-week progress → BerandaWeekOverWeek (Task 4)
- [x] Vendor summary → BerandaVendor (Task 5)
- [x] Semua komponen lama (Progress Pekerjaan, Laporan Pekanan) tetap berfungsi

**Type consistency:**
- `Program` dari `src/lib/supabase.ts` — field yang digunakan: `id`, `nama_pekerjaan`, `status`, `jenis_pekerjaan`, `target_selesai`, `sisa_anggaran`, `total_anggaran`, `realisasi_terkini`, `progress_percent`, `vendor`, `updated_at` — semua sudah ada di interface
- `ProgramSnapshot` — field: `id`, `program_id`, `snapshot_date`, `progress_percent` — semua ada
- `Transaction` — field: `tanggal`, `jenis_transaksi`, `nominal` — semua ada
- `rawTransactions: Transaction[]` ditambahkan di Task 3 dan dipakai di Task 3 & 4
- `snapshots: ProgramSnapshot[]` ditambahkan di Task 3 dan dipakai di Task 4
