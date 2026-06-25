SARPRAS MAF COWORK – FINAL SETUP (v2 Complete Configuration)

==================================================
CONTEXT & STATUS
==================================================

Nama Proyek: Sarpras MAF Dashboard v2
Operator: Hamzah (solo)
Current Status: Phase 0/1/4 done ✅ | Phase 2/3/5/6 pending ⏳

TECH STACK (VERIFIED):
- Frontend: React 18 + Vite + TypeScript (inline styles ONLY)
- Backend: Supabase PostgreSQL (project: sgslsiyoompzuhuwzgyi, ap-southeast-1)
- Deploy: Vercel (auto-deploy from main branch)
- Repo: github.com/elvinhamzah-star/dashboard-sarpras-maf-
- Local: /Users/mac/dashboard-sarpras-maf-v2
- Auth: sessionStorage + PIN via Supabase RPC (bcrypt)
- Storage: Google Drive for foto dokumentasi

DESIGN TOKENS (Inline):
- #1A6FE8 = biru (primary)
- #059669 = hijau (progress/done)
- #D97706 = amber (on hold/warning)
- #B91C1C = merah (planning/alert)
- #7C3AED = ungu (riwayat/archive)
- #0A1628 = navy (sidebar bg)

==================================================
5 PAGES & FEATURES IMPLEMENTED
==================================================

Beranda (Dashboard)
- KPI overview cards
- LaporanPekananCard: weekly report (On Going / On Hold / Perencanaan)
- Progress chart

Pekerjaan (Work Management)
- Program list + PekerjaanDetail modal per program
- UpdateProgressModal (writes to programs + program_snapshots)

Keuangan (Finance)
- Transaksi list + monthly filter
- AddTransactionModal

Galeri (Documentation)
- Foto dokumentasi + monthly/program/phase filters
- AddDocumentationModal (links to Google Drive)

Riwayat Laporan (Report Archive)
- Weekly notes v3 format per minggu
- Shows programMeta history
- Currently replaces Laporan presentation view

==================================================
SUPABASE ARCHITECTURE
==================================================

Tables (9 total):
1. programs          — pekerjaan/program utama
2. sub_programs      — sub-items per program
3. transactions      — keuangan/arus kas
4. documentation     — foto lapangan (Google Drive links)
5. issues            — isu/kendala per program
6. work_notes        — catatan kerja internal
7. weekly_notes      — laporan pekanan (JSON v3 content)
8. program_snapshots — riwayat progress (append-only)
9. app_config        — konfigurasi app + PIN hash

ALL WRITES via RPC:
- admin_insert('table_name', payload)
- admin_update('table_name', payload, id)
- admin_delete('table_name', id)

These RPCs have SECURITY DEFINER + hardcoded allowlist.
If adding new table → must update RPC allowlist in Supabase SQL.

==================================================
6-PHASE ROADMAP & RE-ENABLE STRATEGY
==================================================

✅ PHASE 0 — History/snapshot foundation
   Status: DONE
   What: program_snapshots table created + working

✅ PHASE 1 — Monthly filter across pages
   Status: DONE
   What: Keuangan, Galeri, Riwayat Laporan filter by bulan

✅ PHASE 4 — Presentation mode (Laporan slide deck)
   Status: READY TO RE-ENABLE (code exists, currently disabled)
   What: Full slide presentation view per minggu
   Current: Laporan.tsx exists, replaced by Riwayat Laporan page
   
   RE-ENABLE CHECKLIST (Zero breaking changes):
   [ ] 1. App.tsx → add 'laporan' to type Page definition
   [ ] 2. App.tsx → add case 'laporan' in renderPage() function
   [ ] 3. Sidebar.tsx → add 'laporan' menu item link
   [ ] 4. App.tsx → pass selectedMonth prop ke <Laporan />
   Estimasi: ~5 menit
   Can toggle on/off anytime per kebutuhan

⏳ PHASE 2 — Week-over-week progress comparison
   Status: PENDING
   Requirements: ≥2 program_snapshots dates to compare
   Output: Side-by-side progress deltas per program
   UI: New section in Beranda or standalone page
   Dependency: Phase 0 ✅ (snapshots table ready)

⏳ PHASE 3 — Executive Beranda redesign + alerts
   Status: PENDING
   Requirements: Deadline tracking, freshness indicators
   Output: Enhanced Beranda with alerts + metadata
   UI: Redesigned cards + color-coded warnings
   Dependency: Phase 1 ✅ (filters ready)

⏳ PHASE 5 — Google Slides export
   Status: PENDING
   Requirements: User setup Google Cloud OAuth + Slides API key
   Output: Export Laporan ke Google Slides
   Note: Blocked until Google Cloud setup complete (external dependency)

⏳ PHASE 6 — Global premium redesign
   Status: PENDING
   Requirements: Apply navy+gold theme dari Laporan ke all pages
   Output: Consistent premium look across all 5 pages
   Can start anytime (design-only, no data dependency)
   Recommended: Start after Phase 3 (get Beranda right first)

==================================================
COWORK DASHBOARD SECTIONS
==================================================

SECTION 1: 📊 PHASE PROGRESS TRACKER
Purpose: Monitor completion of pending phases + Phase 4 re-enable status
Widgets:
- Phase Status Grid: [Phase | Status | Dependencies | Blocker?]
  * Phase 2: Depends on Phase 0 ✅
  * Phase 3: Depends on Phase 1 ✅
  * Phase 4: Ready to enable (5 min task)
  * Phase 5: Blocked on Google Cloud setup
  * Phase 6: No dependencies
- Next Priority: Suggest which phase based on dependencies + user preference
- Phase 4 Re-enable Checklist: 4-step task to toggle presentation mode
- Completion Checklist: Feature-level checklist per phase
- Timeline: Estimated completion dates per phase

SECTION 2: 🔧 DEV ENVIRONMENT
Purpose: Track local dev setup + deployment status
Widgets:
- Dev Server Status: localhost:5173 running? (npm run dev)
- Build Status: Latest build clean? (npx tsc --noEmit)
- Vercel Deployment: Last deploy time + commit hash + live URL
- Branch Info: Current branch + unpushed changes + git status
- Supabase Status: RPC allowlist + recent migrations + table stats

SECTION 3: 💾 DATA & SUPABASE
Purpose: Monitor database health + recent operations
Widgets:
- Table Stats: Row count per table
- Recent Writes: Last 10 adminInsert/adminUpdate/adminDelete operations
- RPC Allowlist Audit: Current list of allowed tables + verification
- Migration Logs: Recent Supabase migrations + timestamps
- Admin RPC Health: Test admin_insert/admin_update/admin_delete status

SECTION 4: 📚 DOCUMENTATION & CONSTRAINTS
Purpose: Keep code reference + development constraints visible
Widgets:
- Design Tokens Reference: Color palette + hex values + usage
- Component Structure: Directory layout (/src/components) + file list
- Supabase Schema: Table definitions + RPC signatures + relationships
- Constraints Checklist:
  ✓ Inline styles ONLY (no Tailwind or CSS modules)
  ✓ Minimalist comments (explain WHY, not WHAT)
  ✓ All writes via admin RPCs (adminInsert/adminUpdate/adminDelete)
  ✓ PIN never hardcoded (use Supabase RPC + bcrypt)
  ✓ Phases execute sequentially (can reorder per user request)
  ✓ Mixed ID/EN naming (technical terms in EN)

==================================================
WORKFLOWS FOR COWORK
==================================================

WORKFLOW 1: RE-ENABLE PHASE 4 (Presentation Mode)
  Trigger: "Enable Laporan presentation mode" or "Toggle Phase 4 on"
  Time: ~5 minutes
  Steps:
    1. Open App.tsx
       - Find: type Page = 'beranda' | 'pekerjaan' | 'keuangan' | 'galeri' | 'riwayat'
       - Add: | 'laporan'
    2. In same file, find renderPage() function
       - Add case 'laporan': return <Laporan selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
    3. Open Sidebar.tsx
       - Add menu item: <NavItem label="Laporan" value="laporan" icon={...} />
    4. Verify App.tsx passes selectedMonth prop to <Laporan />
    5. Test: npm run dev → click menu item → verify page loads
    6. Commit: git add . && git commit -m "Enable Phase 4: Laporan presentation mode"
    7. Push: git push origin main → Vercel auto-deploys

WORKFLOW 2: START NEW PHASE (2, 3, 5, or 6)
  Trigger: "Start Phase [N]"
  Steps:
    1. Identify phase dependencies (check if prior phases complete)
    2. List features to implement (breakdown into tasks)
    3. Check if needs new Supabase table/RPC
    4. Create feature checklist
    5. Begin development cycle (create branch if needed)

WORKFLOW 3: ADD NEW SUPABASE TABLE
  Trigger: "Butuh tabel baru: [name]"
  Steps:
    1. Design table schema (columns, types, constraints)
    2. Apply migration via Supabase MCP (apply_migration tool)
    3. Update admin RPC allowlist in Supabase SQL
    4. Create TypeScript types in src/lib/types.ts
    5. Add to adminInsert/adminUpdate/adminDelete functions
    6. Test write operation with sample data
    7. Document table in Cowork schema reference

WORKFLOW 4: DEPLOY TO PRODUCTION
  Trigger: "Push ke production" or "Deploy sekarang"
  Steps:
    1. Run npm run build (check for TypeScript errors)
    2. Review git diff: git diff origin/main
    3. Commit changes: git add . && git commit -m "[message]"
    4. Push to main: git push origin main
    5. Verify Vercel auto-deploy (check vercel.com dashboard)
    6. Test live on production URL
    7. Document changes in deployment notes/GitHub release

WORKFLOW 5: TROUBLESHOOT LOCAL DEV
  Trigger: "Dev server mati" or "Build error" or "npm error"
  Steps:
    1. Check process: lsof -i :5173 (localhost:5173 in use?)
    2. Kill existing: pkill -f "vite" or pkill -f "node"
    3. Restart: cd /Users/mac/dashboard-sarpras-maf-v2 && npm run dev
    4. If build error: npx tsc --noEmit (read error messages carefully)
    5. Fix code + save (auto-reload should trigger)
    6. If persists: rm -rf node_modules && npm install

WORKFLOW 6: VERIFY CONSTRAINTS (Pre-deploy)
  Trigger: Before pushing to production
  Checklist:
    - [ ] No Tailwind classes (only inline styles: style={{...}})
    - [ ] Comments only explain WHY, not WHAT
    - [ ] All writes use adminInsert/adminUpdate/adminDelete RPCs
    - [ ] No PIN hardcoded anywhere (grep -r "admin_pin\|hardcoded" src/)
    - [ ] TypeScript compiles clean (npx tsc --noEmit)
    - [ ] Naming: camelCase (EN) or snake_case (ID) consistent
    - [ ] Design tokens used correctly (#1A6FE8, #059669, etc.)
    - [ ] Component props typed (no implicit any)

==================================================
QUICK PHASE DEPENDENCIES & SEQUENCING
==================================================

READY TO START IMMEDIATELY:
- Phase 2 (week-over-week) → depends on Phase 0 ✅
- Phase 3 (Beranda redesign) → depends on Phase 1 ✅
- Phase 4 (re-enable) → 5-min task, zero dependencies ✅
- Phase 6 (global redesign) → no dependencies (design-only)

BLOCKED:
- Phase 5 (Google Slides) → waiting for user Google Cloud setup (external)

RECOMMENDED SEQUENCE:
1. Phase 4 (5 min re-enable) → quick win
2. Phase 2 (week-over-week) → unlocks insights
3. Phase 3 (Beranda redesign) → high impact
4. Phase 6 (global redesign) → polish
5. Phase 5 (Google Slides) → after Google Cloud ready

==================================================
COWORK STARTING PROMPT FOR CLAUDE CODE
==================================================

You are Sarpras MAF v2 Development Steward.

ROLE:
- Guide Phase 2/3/5/6 implementation + Phase 4 re-enable
- Maintain constraints: inline styles, minimalist comments, admin RPCs, no hardcoded PIN
- Track dev environment health (local, build, deploy)
- Suggest next priority based on dependencies
- Monitor Supabase table operations + RPC allowlist
- Help troubleshoot local dev + deployment issues

CONTEXT:
- Project: React 18 + Vite + TypeScript (inline styles ONLY)
- Backend: Supabase PostgreSQL + admin RPCs
- Deploy: Vercel auto-deploy from main
- Local: /Users/mac/dashboard-sarpras-maf-v2
- Phases: 0/1/4 done ✅ | 2/3/5/6 pending ⏳
- Phase 4: Ready to re-enable (5 min task)

CONSTRAINTS:
✓ Inline styles ONLY (no Tailwind, no CSS modules)
✓ Comments: minimalist (WHY, not WHAT)
✓ Writes: always use adminInsert/adminUpdate/adminDelete RPCs
✓ PIN: never hardcoded (use Supabase RPC + bcrypt)
✓ Phases: execute sequentially (can reorder per user request)
✓ Language: Indonesian + English (technical terms in EN)

WORKFLOWS:
1. Re-enable Phase 4 → 4-step checklist → 5 min
2. Start new phase → list features → check dependencies → begin dev
3. Add new table → design schema → apply migration → update RPC
4. Deploy → build → commit → push main → verify Vercel
5. Troubleshoot → check processes, logs, TS errors
6. Pre-deploy → verify all constraints met

DECISION STYLE:
- Present options as inline numbered/lettered lists ONLY
- No external widgets, no markdown prose recommendations
- Use JSON for structured data (schemas, types, responses)
- Ask clarifying questions when phase scope unclear

STARTING OPTIONS:
"Apa yang mau dikerjakan dulu:
1. Re-enable Phase 4 (Laporan presentation mode) — 5 menit, quick win
2. Start Phase 2 (week-over-week progress) — unlocks insights
3. Start Phase 3 (Beranda redesign) — high impact UI overhaul
4. Start Phase 6 (global navy+gold redesign) — styling polish
5. Other: [describe]"

==================================================
MEMORY PINS FOR CLAUDE CODE
==================================================

1. Sarpras MAF v2 = React+Vite+TS frontend on Vercel + Supabase PostgreSQL backend
2. 5 pages: Beranda, Pekerjaan, Keuangan, Galeri, Riwayat Laporan
3. 9 Supabase tables: programs, sub_programs, transactions, documentation, issues, work_notes, weekly_notes, program_snapshots, app_config
4. Phase 0/1/4 done ✅ | Phase 2/3/5/6 pending ⏳
5. Phase 4 (Laporan.tsx) ready to re-enable: (1) App.tsx add 'laporan' type + renderPage case, (2) Sidebar.tsx add menu item, (3) pass selectedMonth + onMonthChange props. ~5 min, zero breaking changes.
6. ALL writes via admin RPCs (adminInsert/adminUpdate/adminDelete)
7. Inline styles ONLY — no Tailwind or CSS modules ever
8. Design tokens: #1A6FE8 (blue), #059669 (green), #D97706 (amber), #B91C1C (red), #7C3AED (purple), #0A1628 (navy)
9. Vercel auto-deploys from main branch
10. Google Drive stores foto dokumentasi links
11. PIN auth via Supabase RPC (bcrypt), never hardcode
12. Local dev: /Users/mac/dashboard-sarpras-maf-v2, npm run dev at localhost:5173

==================================================
TROUBLESHOOTING QUICK REFERENCE
==================================================

Dev server won't start:
→ lsof -i :5173
→ pkill -f "vite"
→ npm run dev

Build error:
→ npx tsc --noEmit
→ Read error, fix code, save

Vercel not deploying:
→ Check git branch (must be main)
→ Verify push: git push origin main
→ Check vercel.com dashboard for build logs

Supabase RPC error:
→ Verify allowlist includes table name
→ Check RPC signature matches call
→ Test with sample data via Supabase UI

==================================================
