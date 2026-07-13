# Detail Realisasi Tab + Derive-at-Render Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split each pekerjaan detail into a money-only "Ringkasan" tab and a new "Detail Realisasi" tab (rincian), and make every total (list, detail, hasil) derive from a single source at render so parent and child data can never diverge.

**Architecture:** Introduce one pure helper `deriveProgramTotals(program, subs)` in a new `src/lib/deriveTotals.ts` — the single source of truth for a program's anggaran/realisasi/progress when it has sub-programs. Every render site (list card, detail header, detail summary table, beranda aggregate) calls this helper instead of reading stored `program.*` money fields. A second pure helper `deriveNilaiAset(program)` reconciles the Hasil "Nilai Aset" against `sum(hasil_rincian.biaya)` and flags mismatches. No DB writes, no triggers, no write-back — derivation happens at render so it is never stale. Rincian UI moves out of Ringkasan into its own tab, applied identically across all three statuses (Selesai, On Going, On Hold).

**Tech Stack:** React 18 + TypeScript (strict), Vite, inline styles (no CSS framework), Supabase. Vitest is added in Task 1 solely to unit-test the two pure derive helpers (the sync correctness is the user's #1 requirement: "gak pernah ada kejadian beda data"). React components are verified via `npx tsc --noEmit` + Preview MCP browser render (project norm), not unit tests.

## Global Constraints

- **Preview-first:** Task 0 (HTML preview in `/public/`) must be built and approved by the user BEFORE any component code changes (Tasks 4–5). Copy from MEMORY "Preview first rule".
- **No git push** without explicit user confirmation. All work is local-only.
- **Verification is dual:** `npx tsc --noEmit` must pass AND the actual browser render must be confirmed via Preview MCP (serverId `04426f4f-7227-49c5-9add-c4357214a398`, port 5173). `tsc` alone is unreliable for JSX/esbuild errors.
- **No data loss:** realisasi derives from subs ONLY when at least one sub carries realisasi > 0; otherwise keep the parent's stored realisasi (protects P-001's Rp140.706.000 whose 17 subs have realisasi=0).
- **Colors/tokens (verbatim):** blue `var(--blue)` `#1A6FE8` / `#1560d4`; green `var(--green)` `#059669` / `#047857`; orange `#D97706`; maroon `#660000`. Text: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`. Surfaces: `var(--card)`, `var(--surface-raised)`, `var(--surface-2)`, `var(--border-subtle)`, `var(--border)`.
- **Warning/mismatch banner style (user-mandated, verbatim):** white background `var(--card)`, maroon text `#660000`, thin maroon border `1px solid rgba(102,0,0,0.28)`, **NO icon** (no triangle-alert SVG). Calm but legible — never a loud amber fill. Use this for BOTH the Ringkasan Nilai Aset warning and the HasilFormModal Nilai warning.
- **isMobile** = `width < 600` (from `useWindowWidth()`).
- **Rupiah:** always via `formatRupiah` from `../lib/data`.

---

## File Structure

- **Create** `src/lib/deriveTotals.ts` — pure helpers `deriveProgramTotals`, `deriveNilaiAset`, and their exported types. Single source of truth for parent/child sync.
- **Create** `src/lib/deriveTotals.test.ts` — Vitest unit tests for the two helpers.
- **Create** `public/detail-realisasi-tab-preview.html` — mobile-first mockup of the new two-tab layout + Nilai Aset warning.
- **Modify** `package.json` — add `vitest` devDependency + `test` script.
- **Modify** `vite.config.ts` — add vitest `test` config block (jsdom not needed; helpers are pure).
- **Modify** `src/components/PekerjaanDetail.tsx` — add "Detail Realisasi" tab; make Ringkasan money-only; header cards + summary table read derived totals; show Nilai Aset warning.
- **Modify** `src/components/HasilRingkasan.tsx` — remove the embedded `<HasilRincianCard>` (now lives in its own tab); surface Nilai Aset warning.
- **Modify** `src/components/HasilFormModal.tsx` — auto-derive the Nilai field from `sum(rincian)` with an editable override + mismatch warning.
- **Modify** `src/components/Pekerjaan.tsx` — list cards read `deriveProgramTotals` instead of stored `p.total_anggaran`/`p.realisasi_terkini`.

---

## Task 1: Pure sync helper `deriveProgramTotals` + `deriveNilaiAset`

**Files:**
- Create: `src/lib/deriveTotals.ts`
- Create: `src/lib/deriveTotals.test.ts`
- Modify: `package.json` (scripts + devDependency)
- Modify: `vite.config.ts` (test config)

**Interfaces:**
- Consumes: `Program`, `SubProgram`, `HasilRincianItem` types from `./supabase`; `getEffectiveProgress` from `./data`.
- Produces:
  ```ts
  export interface DerivedTotals {
    total_anggaran: number
    realisasi_terkini: number
    sisa_anggaran: number
    progress_percent: number      // rounded integer 0..100+
    hasSubs: boolean
    realisasiFromSubs: boolean     // true when realisasi came from summing subs
  }
  export function deriveProgramTotals(
    program: Pick<Program, 'jenis_pekerjaan' | 'progress_percent' | 'total_anggaran' | 'realisasi_terkini' | 'sisa_anggaran'>,
    subs: Pick<SubProgram, 'progress_percent' | 'total_anggaran' | 'realisasi_terkini'>[],
  ): DerivedTotals

  export interface NilaiAsetInfo {
    derived: number          // sum(hasil_rincian.biaya)
    stored: number | null    // program.hasil_nilai_aset
    display: number          // stored ?? derived ?? realisasi
    mismatch: boolean        // stored != derived while both meaningful
  }
  export function deriveNilaiAset(
    program: Pick<Program, 'hasil_nilai_aset' | 'hasil_rincian' | 'realisasi_terkini'>,
  ): NilaiAsetInfo
  ```

- [ ] **Step 1: Install vitest and add the test script**

Run:
```bash
cd /Users/mac/dashboard-sarpras-maf-v2 && npm i -D vitest@^2.1.0
```
Expected: `vitest` added to devDependencies, no peer-dependency errors.

Then edit `package.json` — add a `test` script next to the existing ones:
```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run"
  },
```

- [ ] **Step 2: Add the vitest config block to `vite.config.ts`**

Open `vite.config.ts`. Add a `test` key to the config object passed to `defineConfig` (keep all existing plugins/options unchanged):
```ts
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
```
If `vite.config.ts` imports from `'vite'` only, also add the triple-slash reference at the very top of the file so the `test` key type-checks:
```ts
/// <reference types="vitest/config" />
```

- [ ] **Step 3: Write the failing tests**

Create `src/lib/deriveTotals.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { deriveProgramTotals, deriveNilaiAset } from './deriveTotals'

const P = (over: Partial<Parameters<typeof deriveProgramTotals>[0]> = {}) => ({
  jenis_pekerjaan: 'Proyek',
  progress_percent: 0,
  total_anggaran: 0,
  realisasi_terkini: 0,
  sisa_anggaran: 0,
  ...over,
})
const S = (
  progress_percent: number,
  total_anggaran: number,
  realisasi_terkini: number,
) => ({ progress_percent, total_anggaran, realisasi_terkini })

describe('deriveProgramTotals', () => {
  it('no subs → returns parent stored values', () => {
    const r = deriveProgramTotals(
      P({ progress_percent: 40, total_anggaran: 100, realisasi_terkini: 30, sisa_anggaran: 70 }),
      [],
    )
    expect(r).toEqual({
      total_anggaran: 100,
      realisasi_terkini: 30,
      sisa_anggaran: 70,
      progress_percent: 40,
      hasSubs: false,
      realisasiFromSubs: false,
    })
  })

  it('no subs, Operasional → progress derived from realisasi ratio', () => {
    const r = deriveProgramTotals(
      P({ jenis_pekerjaan: 'Operasional', total_anggaran: 200, realisasi_terkini: 50, progress_percent: 0 }),
      [],
    )
    expect(r.progress_percent).toBe(25) // 50/200
    expect(r.hasSubs).toBe(false)
  })

  it('subs sum anggaran; realisasi kept at parent when all subs have realisasi 0 (P-001 case)', () => {
    const r = deriveProgramTotals(
      P({ total_anggaran: 999, realisasi_terkini: 140706000 }),
      [S(50, 100000000, 0), S(0, 40706000, 0)],
    )
    expect(r.total_anggaran).toBe(140706000)       // sum of subs, not the stale 999
    expect(r.realisasi_terkini).toBe(140706000)    // kept from parent — subs carry none
    expect(r.realisasiFromSubs).toBe(false)
    expect(r.sisa_anggaran).toBe(0)
  })

  it('subs carry realisasi → realisasi summed from subs', () => {
    const r = deriveProgramTotals(
      P({ total_anggaran: 1, realisasi_terkini: 5 }),
      [S(100, 100, 80), S(50, 100, 20)],
    )
    expect(r.total_anggaran).toBe(200)
    expect(r.realisasi_terkini).toBe(100) // 80 + 20
    expect(r.realisasiFromSubs).toBe(true)
    expect(r.sisa_anggaran).toBe(100)
  })

  it('progress is anggaran-weighted average of subs', () => {
    const r = deriveProgramTotals(
      P(),
      [S(100, 300, 0), S(0, 100, 0)], // (100*300 + 0*100)/400 = 75
    )
    expect(r.progress_percent).toBe(75)
  })

  it('progress falls back to plain mean when subs have zero anggaran', () => {
    const r = deriveProgramTotals(P(), [S(40, 0, 0), S(60, 0, 0)])
    expect(r.progress_percent).toBe(50)
  })
})

describe('deriveNilaiAset', () => {
  it('derives from rincian sum and flags mismatch with stored', () => {
    const r = deriveNilaiAset({
      hasil_nilai_aset: 500,
      hasil_rincian: [{ nama: 'a', ukuran: 0, satuan: 'm²', biaya: 300 }],
      realisasi_terkini: 0,
    })
    expect(r.derived).toBe(300)
    expect(r.stored).toBe(500)
    expect(r.display).toBe(500)   // manual override wins for display
    expect(r.mismatch).toBe(true)
  })

  it('no mismatch when stored equals derived', () => {
    const r = deriveNilaiAset({
      hasil_nilai_aset: 300,
      hasil_rincian: [{ nama: 'a', ukuran: 0, satuan: 'm²', biaya: 300 }],
      realisasi_terkini: 0,
    })
    expect(r.mismatch).toBe(false)
  })

  it('no rincian → derived 0, no mismatch, display falls back to stored then realisasi', () => {
    const r = deriveNilaiAset({ hasil_nilai_aset: null, hasil_rincian: [], realisasi_terkini: 42 })
    expect(r.derived).toBe(0)
    expect(r.mismatch).toBe(false)
    expect(r.display).toBe(42)
  })
})
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npm test`
Expected: FAIL — `deriveTotals.ts` does not exist / functions not defined.

- [ ] **Step 5: Implement `src/lib/deriveTotals.ts`**

Create `src/lib/deriveTotals.ts`:
```ts
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

/**
 * Single source of truth for a program's money + progress.
 * When the program has sub-programs, everything derives from them so the
 * parent card, detail header, and list view can never show divergent data.
 * Realisasi is summed from subs ONLY when at least one sub carries realisasi
 * (> 0); otherwise the parent's stored realisasi is kept (no data loss for
 * programs that track money at the parent level, e.g. P-001).
 */
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

  // Anggaran-weighted average progress; plain mean if subs carry no anggaran.
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

/**
 * Reconciles the Hasil "Nilai Aset" against sum(hasil_rincian.biaya).
 * `display` prefers a manual stored override; `mismatch` is true when a manual
 * value disagrees with the rincian sum so the UI can warn the admin.
 */
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
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npm test`
Expected: PASS — all 9 tests green.

- [ ] **Step 7: Type-check**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/mac/dashboard-sarpras-maf-v2 && git add src/lib/deriveTotals.ts src/lib/deriveTotals.test.ts package.json package-lock.json vite.config.ts && git commit -m "feat: add derive-at-render sync helpers with tests"
```

---

## Task 0 (do FIRST, before Tasks 4–5): HTML preview of the two-tab layout

> Ordered after Task 1 in this document for readability, but per the preview-first rule this preview must be built and shown to the user BEFORE the component edits in Tasks 4–5. Tasks 1–3 (pure helper + read-only derive wiring) may proceed in parallel since they change no visible layout.

**Files:**
- Create: `public/detail-realisasi-tab-preview.html`

**Interfaces:**
- Consumes: nothing (standalone static mockup).
- Produces: a visual reference the user approves; no code depends on it.

- [ ] **Step 1: Build the preview**

Create `public/detail-realisasi-tab-preview.html` — a self-contained mobile-first mockup (reuse the visual language of `public/realisasi-ongoing-preview.html`). It must show, in a phone-width frame:
1. Header card (ID, status pill, title, meta grid) — unchanged.
2. Metric cards row: Total Anggaran / Realisasi Terkini / Sisa / Progress — with a tiny caption "dihitung dari 2 sub pekerjaan" when derived from subs.
3. Tab row with **four** tabs: `Ringkasan` (active) · `Detail Realisasi` · `Dokumen` · `Sub Pekerjaan`.
4. **Ringkasan tab body = money summary ONLY** (no rincian): the metadata table WITHOUT the duplicated money rows (keep ID, Program, Nama, Jenis, Status, Progress, Vendor, Catatan, Dibuat). For a Selesai example, show the three hero metric boxes (Nilai Aset / Total Anggaran / Efisiensi) instead.
5. A second frame with the **Detail Realisasi tab active**: shows the `HasilRincianCard` content expanded (per-lokasi rincian + Total Keseluruhan), and at the top a **Nilai Aset warning banner** example: white bg `var(--card)` / maroon text `#660000` / border `1px solid rgba(102,0,0,0.28)`, **no icon**, copy: "Nilai Aset manual (Rp500.000.000) berbeda dari total rincian (Rp480.000.000). Perbarui salah satunya agar sinkron."
6. A toggle at the top switching between "Selesai" and "On Going" sample data so the user sees the layout is identical across statuses.

Use dummy data: PBB-014 Renovasi Aula Utama, Anggaran Rp500jt, Realisasi Rp320jt, Sisa Rp180jt, Progress 64%, rincian across 2 lokasi totalling Rp300jt.

- [ ] **Step 2: Render the preview in the browser and confirm**

Serve it and open `http://localhost:5173/detail-realisasi-tab-preview.html` via Preview MCP; screenshot at 375px width. Confirm: four tabs visible, Ringkasan has no money-row duplication, Detail Realisasi shows rincian + warning banner, status toggle swaps sample data cleanly, no layout overflow.

- [ ] **Step 3: Stop and get user approval**

Present the screenshot to the user. Do NOT proceed to Tasks 4–5 until the user approves the layout. (No commit needed for a preview file unless the user asks.)

---

## Task 2: Wire derived totals into PekerjaanDetail header + summary table

**Files:**
- Modify: `src/components/PekerjaanDetail.tsx`

**Interfaces:**
- Consumes: `deriveProgramTotals` from Task 1.
- Produces: nothing new; changes what the existing header cards / summary table display.

- [ ] **Step 1: Import the helper**

At the top of `src/components/PekerjaanDetail.tsx`, after the `HasilRincianCard` import (line 13), add:
```tsx
import { deriveProgramTotals, deriveNilaiAset } from '../lib/deriveTotals'
```

- [ ] **Step 2: Compute derived totals once, near `const pct`**

Replace the existing line (currently line 129):
```tsx
  const pct = getEffectiveProgress(program)
```
with:
```tsx
  const derived = deriveProgramTotals(program, subPrograms.filter(s => s.program_id === program.id))
  const pct = derived.progress_percent
```

- [ ] **Step 3: Point the metric cards at derived values**

In the "Metric Cards" block (currently lines 320–343), replace the four card definitions:
```tsx
          { label: 'Total Anggaran', value: formatRupiah(program.total_anggaran || 0), color: 'var(--blue)' },
          { label: 'Realisasi Terkini', value: formatRupiah(program.realisasi_terkini || 0), color: '#059669' },
          { label: 'Sisa Anggaran', value: formatRupiah(program.sisa_anggaran || 0), color: '#D97706' },
          { label: 'Progress', value: `${pct}%`, color: statusColor },
```
with:
```tsx
          { label: 'Total Anggaran', value: formatRupiah(derived.total_anggaran), color: 'var(--blue)' },
          { label: 'Realisasi Terkini', value: formatRupiah(derived.realisasi_terkini), color: '#059669' },
          { label: 'Sisa Anggaran', value: formatRupiah(derived.sisa_anggaran), color: '#D97706' },
          { label: 'Progress', value: `${pct}%`, color: statusColor },
```

- [ ] **Step 4: Point the Ringkasan summary table money rows at derived values**

In the `activeTab === 'Ringkasan' && !isSelesai` table (currently lines 462–465), replace:
```tsx
                    ['Progress', `${getEffectiveProgress(program)}%`],
                    ['Total Anggaran', formatRupiah(program.total_anggaran || 0)],
                    ['Realisasi Terkini', formatRupiah(program.realisasi_terkini || 0)],
                    ['Sisa Anggaran', formatRupiah(program.sisa_anggaran || 0)],
```
with:
```tsx
                    ['Progress', `${pct}%`],
                    ['Total Anggaran', formatRupiah(derived.total_anggaran)],
                    ['Realisasi Terkini', formatRupiah(derived.realisasi_terkini)],
                    ['Sisa Anggaran', formatRupiah(derived.sisa_anggaran)],
```

- [ ] **Step 5: Type-check**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npx tsc --noEmit`
Expected: no errors. (`getEffectiveProgress` is still imported/used elsewhere via the helper; if tsc reports it as unused, leave the import — it is re-exported through `deriveTotals`. If tsc flags an unused import specifically, remove `getEffectiveProgress` from the `../lib/data` import line.)

- [ ] **Step 6: Verify in browser**

Open the app via Preview MCP, navigate to a program WITH sub-programs (P-001 or P-019). Confirm the header Progress now reflects the anggaran-weighted average (P-001 should show ~37%, not the stale 25%) and Total Anggaran equals the sum of its subs. Screenshot.

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/dashboard-sarpras-maf-v2 && git add src/components/PekerjaanDetail.tsx && git commit -m "fix: derive parent detail totals from sub-programs at render"
```

---

## Task 3: Wire derived totals into the Pekerjaan list cards

**Files:**
- Modify: `src/components/Pekerjaan.tsx`

**Interfaces:**
- Consumes: `deriveProgramTotals` from Task 1; `subPrograms` state already loaded (line 46, populated line 61).
- Produces: nothing new; changes what list cards display so lists match detail.

- [ ] **Step 1: Import the helper**

Add near the other `../lib/*` imports at the top of `src/components/Pekerjaan.tsx`:
```tsx
import { deriveProgramTotals } from '../lib/deriveTotals'
```

- [ ] **Step 2: Add a per-program derive helper next to `getVendorDisplay`**

After `getVendorDisplay` (ends at line 81), add:
```tsx
  const getDerived = (p: Program) =>
    deriveProgramTotals(p, subPrograms.filter(s => s.program_id === p.id))
```

- [ ] **Step 3: Use derived money in the card body**

In the card render (currently lines 248–252), replace:
```tsx
                        <div style={{ fontSize: 13, fontWeight: 700, color: (p.realisasi_terkini || 0) > 0 ? '#059669' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatRupiah(p.realisasi_terkini || 0)}
                        </div>
```
and the "dari … total_anggaran" line, with a computed `const d = getDerived(p)` at the top of the card's map callback and `d.realisasi_terkini` / `d.total_anggaran` in place of `p.realisasi_terkini` / `p.total_anggaran`. Concretely, find the `.map(p => (` (or `filtered.map`) that renders each card and insert as the first line of its body:
```tsx
                  const d = getDerived(p)
```
then replace every `p.realisasi_terkini || 0` with `d.realisasi_terkini` and every `p.total_anggaran || 0` with `d.total_anggaran` inside that card. If the map uses an implicit-return arrow `p => (`, convert it to a block body `p => { const d = getDerived(p); return ( … ) }`.

- [ ] **Step 4: Type-check**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify in browser**

Open the Pekerjaan list via Preview MCP. Confirm the P-001 card's "dari Rp…" total matches the sum shown on its detail page (they must be identical). Screenshot both.

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/dashboard-sarpras-maf-v2 && git add src/components/Pekerjaan.tsx && git commit -m "fix: derive Pekerjaan list card totals from sub-programs"
```

---

## Task 4: Add "Detail Realisasi" tab; make Ringkasan money-only (all 3 statuses)

**Files:**
- Modify: `src/components/PekerjaanDetail.tsx`
- Modify: `src/components/HasilRingkasan.tsx`

**Interfaces:**
- Consumes: `HasilRincianCard` (already imported in PekerjaanDetail), `deriveNilaiAset` (imported Task 2).
- Produces: a new `Tab` value `'Detail Realisasi'`; Ringkasan no longer renders rincian.

> Prerequisite: Task 0 preview approved by the user.

- [ ] **Step 1: Add the tab to the `Tab` type and the tabs array**

Change the type union (line 24):
```tsx
type Tab = 'Ringkasan' | 'Detail Realisasi' | 'Dokumen' | 'Sub Pekerjaan'
```
Change the `tabs` array (currently line 89). The Detail Realisasi tab should appear only when there is rincian to show (any status). Replace:
```tsx
  const tabs: Tab[] = ['Ringkasan', 'Dokumen', ...(subPrograms.length > 0 || isAdmin ? ['Sub Pekerjaan' as Tab] : [])]
```
with:
```tsx
  const hasRincian = (program?.hasil_rincian?.length ?? 0) > 0
  const tabs: Tab[] = [
    'Ringkasan',
    ...(hasRincian || isAdmin ? ['Detail Realisasi' as Tab] : []),
    'Dokumen',
    ...(subPrograms.length > 0 || isAdmin ? ['Sub Pekerjaan' as Tab] : []),
  ]
```
Note: `program` is guaranteed non-null past the `if (!program)` guard at line 111, but `tabs` is declared at line 89 (before the guard). Use the optional chain `program?.hasil_rincian?.length` shown above so it is safe at that position.

- [ ] **Step 2: Remove the rincian block from the Berjalan Ringkasan branch**

In the `activeTab === 'Ringkasan' && !isSelesai` branch, delete the trailing block (currently lines 500–505):
```tsx
            {/* Rincian realisasi berjalan (On Going / On Hold) — tertutup by default */}
            {isBerjalan && (
              <div style={{ marginTop: 16 }}>
                <HasilRincianCard program={program} isMobile={isMobile} />
              </div>
            )}
```
(Ringkasan is now money-only for berjalan statuses; rincian moves to the new tab in Step 4.)

- [ ] **Step 3: Add the Nilai Aset mismatch warning to the Ringkasan header (all statuses)**

Immediately inside the `activeTab === 'Ringkasan' && isSelesai` branch's `<div>` (right after line 411 `<div>`), and also inside the `!isSelesai` branch after its opening `<div>` (line 428), insert a shared warning banner. To avoid duplication, compute once near `const derived` (Task 2 Step 2 area):
```tsx
  const nilaiInfo = deriveNilaiAset(program)
```
Then define a small inline element just before the `return (` is not possible (JSX), so render it directly in each branch. Add this JSX at the top of BOTH Ringkasan branches:
```tsx
            {nilaiInfo.mismatch && (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--card)', border: '1px solid rgba(102,0,0,0.28)', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#660000', lineHeight: 1.45 }}>
                  Nilai Aset manual (<b>{formatRupiah(nilaiInfo.stored ?? 0)}</b>) berbeda dari total rincian (<b>{formatRupiah(nilaiInfo.derived)}</b>). Perbarui salah satunya via <b>Edit</b> agar sinkron.
                </div>
              </div>
            )}
```

- [ ] **Step 4: Add the Detail Realisasi tab body**

After the closing of the `activeTab === 'Ringkasan' && !isSelesai` block (the `)}` currently at line 507) and before `{activeTab === 'Dokumen' && (` (line 509), insert:
```tsx
        {activeTab === 'Detail Realisasi' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Detail Realisasi</h3>
              {isAdmin && (
                <button
                  onClick={() => setShowHasilForm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--card)', color: 'var(--blue)', border: '1px solid rgba(26,111,232,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                  {program.hasil_filled_at ? (isSelesai ? 'Edit Hasil' : 'Edit Realisasi') : (isSelesai ? 'Lengkapi Data Hasil' : 'Catat Realisasi')}
                </button>
              )}
            </div>
            {(program.hasil_rincian?.length ?? 0) > 0 ? (
              <HasilRincianCard program={program} isMobile={isMobile} defaultOpen />
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 13, marginBottom: 8 }}>Belum ada detail realisasi</div>
                {isAdmin && <div style={{ fontSize: 12 }}>Klik <strong>{isSelesai ? 'Lengkapi Data Hasil' : 'Catat Realisasi'}</strong> untuk merinci realisasi</div>}
              </div>
            )}
          </div>
        )}
```
Note `defaultOpen` is passed so the dedicated tab shows rincian expanded (the collapse toggle inside the card still works).

- [ ] **Step 5: Keep the money-summary hero for Selesai in Ringkasan (remove rincian there)**

`HasilRingkasan` currently renders `<HasilRincianCard>` internally (section 3). Edit `src/components/HasilRingkasan.tsx`: delete the line (currently line 172):
```tsx
      {/* 3. Rincian Realisasi Pekerjaan — tertutup by default, tombol "Tampilkan detail" */}
      <HasilRincianCard program={program} isMobile={isMobile} />
```
and remove the now-unused import (line 12):
```tsx
import HasilRincianCard from './HasilRincianCard'
```
This makes the Selesai Ringkasan money-only (metrics + Dampak + Before/After), matching the Berjalan Ringkasan. Rincian for Selesai now lives in the Detail Realisasi tab.

- [ ] **Step 6: Remove the now-redundant "Catat/Edit Realisasi" button from the Berjalan Ringkasan header**

Since realisasi editing now lives on the Detail Realisasi tab (Step 4 button), remove the duplicate from the Ringkasan `!isSelesai` header (currently lines 433–441):
```tsx
                  {isBerjalan && (
                    <button
                      onClick={() => setShowHasilForm(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--card)', color: 'var(--blue)', border: '1px solid rgba(26,111,232,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                      {program.hasil_filled_at ? 'Edit Realisasi' : 'Catat Realisasi'}
                    </button>
                  )}
```
Likewise, in the Selesai Ringkasan branch, the existing "Edit Hasil / Lengkapi Data Hasil" button (lines 412–422) can stay OR be removed for consistency; remove it so all rincian editing is centralized on the Detail Realisasi tab. Delete lines 412–422 (the `{isAdmin && (…Edit Hasil…)}` block inside the Selesai branch). `isBerjalan` may now be unused in the Ringkasan header — if tsc flags it, keep it (still used at line 501 area / Step 2 removed that; verify usage and delete the `const isBerjalan` declaration only if tsc reports it unused).

- [ ] **Step 7: Type-check**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npx tsc --noEmit`
Expected: no errors. Resolve any "declared but never used" for `isBerjalan` / `HasilRincianCard` by removing the specific unused declaration/import only.

- [ ] **Step 8: Verify all three statuses in browser**

Via Preview MCP, open one Selesai, one On Going, and one On Hold program (admin view). For each confirm: (a) four tabs present, (b) Ringkasan shows money summary only — no rincian, (c) Detail Realisasi tab shows the rincian expanded with a working collapse toggle and the Edit/Catat button, (d) if a program has a manual Nilai Aset ≠ rincian sum, the amber warning shows in Ringkasan. Screenshot each status at 375px.

- [ ] **Step 9: Commit**

```bash
cd /Users/mac/dashboard-sarpras-maf-v2 && git add src/components/PekerjaanDetail.tsx src/components/HasilRingkasan.tsx && git commit -m "feat: move rincian into dedicated Detail Realisasi tab across all statuses"
```

---

## Task 5: Auto-derive Nilai Aset from rincian in HasilFormModal (with override + warning)

**Files:**
- Modify: `src/components/HasilFormModal.tsx`

**Interfaces:**
- Consumes: existing `totBiaya` (live sum of rincian, line 259), `nilai`/`setNilai` state, `formatDigits`/`digitsToNumber`.
- Produces: on save, `hasil_nilai_aset` stays admin-controllable but defaults to `totBiaya`; an inline warning appears when the two differ.

- [ ] **Step 1: Track whether the admin manually overrode the Nilai field**

After the `nilai` state (line 214–216), add a companion flag:
```tsx
  const [nilaiTouched, setNilaiTouched] = useState(false)
```

- [ ] **Step 2: Auto-fill Nilai from the live rincian total until the admin edits it**

Add an effect after the `totBiaya` computation (after line 259). Import `useEffect` — change line 1:
```tsx
import { useState, useEffect } from 'react'
```
then add:
```tsx
  // Nilai Aset auto-mengikuti total rincian sampai admin mengubahnya manual.
  useEffect(() => {
    if (!nilaiTouched && cfg.rincian) {
      setNilai(totBiaya ? totBiaya.toLocaleString('id-ID') : '')
    }
  }, [totBiaya, nilaiTouched, cfg.rincian])
```
(`cfg.rincian` is true for `fisik`/`barang`, false for `jasa` — for jasa the Nilai is entered directly and should not auto-follow.)

- [ ] **Step 3: Mark the field touched on manual edit**

In the Nilai `<input>` onChange (line 390), replace:
```tsx
                onChange={e => setNilai(formatDigits(e.target.value))}
```
with:
```tsx
                onChange={e => { setNilaiTouched(true); setNilai(formatDigits(e.target.value)) }}
```

- [ ] **Step 4: Show a mismatch warning under the Nilai field**

After the hint `<div>` that ends at line 397 (`</div>` following `cfg.nilaiHint`), add:
```tsx
              {cfg.rincian && digitsToNumber(nilai) !== totBiaya && totBiaya > 0 && (
                <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--card)', border: '1px solid rgba(102,0,0,0.28)' }}>
                  <div style={{ fontSize: 11, color: '#660000', lineHeight: 1.4 }}>
                    Berbeda dari total rincian (<b>{formatRupiah(totBiaya)}</b>).{' '}
                    <button type="button" onClick={() => { setNilaiTouched(false); setNilai(totBiaya.toLocaleString('id-ID')) }} style={{ background: 'none', border: 'none', padding: 0, color: '#660000', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11 }}>Samakan</button>
                  </div>
                </div>
              )}
```

- [ ] **Step 5: Type-check**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Verify in browser**

Via Preview MCP open the Hasil form (admin) on a fisik program. Confirm: (a) Nilai field auto-fills as you add/edit rincian biaya, (b) typing a different Nilai stops the auto-follow and shows the amber "Berbeda dari total rincian … Samakan" warning, (c) clicking "Samakan" resets Nilai to the rincian total and clears the warning. Screenshot.

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/dashboard-sarpras-maf-v2 && git add src/components/HasilFormModal.tsx && git commit -m "feat: auto-derive Nilai Aset from rincian with manual override warning"
```

---

## Self-Review

**Spec coverage:**
- "Detail Realisasi its own tab, all 3 statuses" → Task 4 (Steps 1, 4, 8 verify Selesai/On Going/On Hold).
- "Ringkasan = money summary only, no repetition" → Task 4 Steps 2, 5, 6.
- "Totals always synced, never divergent" → Task 1 (helper + tests), Task 2 (detail), Task 3 (list). Single source `deriveProgramTotals` used at every render site.
- "P-001 sub→parent progress bug" → Task 1 weighted-progress rule + test; Task 2 Step 6 verifies ~37%.
- "P-001 realisasi kept at parent (Option A, no data loss)" → Task 1 `realisasiFromSubs` rule + test.
- "Nilai Aset auto-derive with warning on mismatch" → Task 1 `deriveNilaiAset`, Task 4 Step 3 (display warning), Task 5 (form auto-derive + warning).
- "Preview-first" → Task 0, gated before Tasks 4–5.

**Placeholder scan:** No TBD/TODO; every code step shows full code. Warning banner copy is concrete. Test bodies are complete.

**Type consistency:** `deriveProgramTotals` / `deriveNilaiAset` signatures and the `DerivedTotals` / `NilaiAsetInfo` return shapes are identical across Tasks 1→2→3. Tab value `'Detail Realisasi'` matches between the `Tab` union, the `tabs` array, and the `activeTab === 'Detail Realisasi'` guard. `nilaiInfo`/`derived` variable names consistent within PekerjaanDetail.

**Open risk flagged for the implementer:** Task 3 Step 3 and Task 4 Step 6 depend on exact current line numbers that shift as edits land — always re-Grep for the literal strings shown before editing rather than trusting line numbers.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-13-detail-realisasi-tab-sync.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Note: per the preview-first rule, Task 0's HTML preview should be built and approved before Tasks 4–5 regardless of execution style.

Which approach?
