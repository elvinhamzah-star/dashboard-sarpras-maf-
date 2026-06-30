# MAF Management Read-Only Role — Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give MAF (madrasah) management their own login, separate from the PBB login, that shows nearly the full dashboard (all programs, financials, vendor detail, transactions, documentation) but excludes one specific program ("Man Power" — staff honor) and the internal weekly-report notes, enforced server-side so it can't be bypassed by inspecting network requests.

**Architecture:** Extend the existing single-credential login (`app_config` + `verify_login` RPC) to support a second credential pair with a `role` field. PBB role behaves exactly as today (direct Supabase table reads). MAF role's data reads are routed through a new Supabase Edge Function that uses the service-role key server-side to strip the "Man Power" program (id `P-024`) before returning JSON — so the exclusion happens at the data source, not in the UI.

**Tech Stack:** React + TypeScript (Vite), Supabase (Postgres + Edge Functions), existing `sessionStorage`-based auth pattern.

## Global Constraints

- Do not change PBB login behavior or credentials in any way.
- PIN for the new MAF login must be bcrypt-hashed via `pgcrypto`, stored in `app_config`, same pattern as `login_pin_hash`. Never store plaintext.
- MAF role must never be able to reach admin/write mode (no PIN-modal upgrade path, no insert/update/delete UI).
- Filtering must happen server-side (Edge Function using service-role key), not just hidden in React — client-side-only hiding does not satisfy this spec.
- Credentials for first rollout: PBB stays `sarpras` / existing PIN. MAF = username `madrasahalfatih`, PIN `1453`.

---

## Scope: What MAF Management Sees vs. Doesn't

**Visible (same as PBB view):**
- All programs except "Man Power" (P-024) — status, progress %, total anggaran, realisasi, vendor name, target selesai
- Sub-program (per-gedung) detail for programs that have it
- Transaction-level detail (date, nominal, jenis, deskripsi) for all visible programs
- Galeri Dokumentasi
- Beranda: alerts (overdue/over-budget), Week-over-Week, Chart, Vendor breakdown summary

**Hidden (MAF-specific exclusions):**
1. Program **"Man Power"** (id `P-024`) — and all its transactions — wherever it would otherwise appear (Pekerjaan list, Keuangan totals/list, Beranda aggregates, any program-count/budget-sum that would include it)
2. **Laporan Mingguan** card (`LaporanPekananCard`) on Beranda
3. **Riwayat Laporan** page (`RiwayatLaporan.tsx`) — navigation entry and route both hidden
4. Admin/write affordances — no PIN modal, no "Admin" toggle; badge reads "MAF" instead of "Viewer"/"Admin"

---

## 1. Database Changes

**`app_config` — add two rows** (mirrors existing `login_username` / `login_pin_hash` keys):
- `login_username_maf` = `madrasahalfatih`
- `login_pin_hash_maf` = `crypt('1453', gen_salt('bf'))`

**`verify_login` RPC — change return shape.**
Current: `RETURNS boolean`.
New: `RETURNS TABLE(ok boolean, role text)` (or a small JSON object) — checks against both PBB and MAF credential pairs, returns which role matched (or `ok=false` if neither).

```sql
CREATE OR REPLACE FUNCTION public.verify_login(p_username text, p_pin text)
RETURNS TABLE(ok boolean, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_username text;
  v_hash text;
BEGIN
  -- check PBB
  SELECT value INTO v_username FROM public.app_config WHERE key = 'login_username';
  SELECT value INTO v_hash FROM public.app_config WHERE key = 'login_pin_hash';
  IF v_username IS NOT NULL AND v_hash IS NOT NULL
     AND p_username = v_username AND v_hash = extensions.crypt(p_pin, v_hash) THEN
    RETURN QUERY SELECT true, 'pbb'::text;
    RETURN;
  END IF;

  -- check MAF
  SELECT value INTO v_username FROM public.app_config WHERE key = 'login_username_maf';
  SELECT value INTO v_hash FROM public.app_config WHERE key = 'login_pin_hash_maf';
  IF v_username IS NOT NULL AND v_hash IS NOT NULL
     AND p_username = v_username AND v_hash = extensions.crypt(p_pin, v_hash) THEN
    RETURN QUERY SELECT true, 'maf'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, NULL::text;
END;
$function$;
```

Existing brute-force lockout (`admin_pin_attempts`, 8 failures / 15-min window) logic must be preserved and apply to both credential pairs combined (don't let MAF login bypass the lockout that protects PBB, or vice versa) — reuse the same attempts table keyed by `p_username`.

---

## 2. Edge Function: `maf-data`

New Supabase Edge Function, deployed under the existing project. Responsibilities:
- Authenticate the request (the MAF role's session — see §3 for how the client proves it's an authenticated MAF session; simplest viable approach: client sends the MAF PIN hash check result it already obtained from `verify_login`, OR re-verify by passing username+PIN again to a server-side check before querying — avoid trusting an unauthenticated client claim of `role=maf`).
- Use the **service-role key** (stored as an Edge Function secret, never shipped to the client) to query `programs`, `sub_programs`, `transactions`.
- Filter out all rows where `program_id = 'P-024'` (or `programs.id = 'P-024'` for the programs table itself).
- Return the same shape the client already expects from `fetchPrograms` / `fetchSubPrograms` / `fetchTransactions`, so the rest of the React app needs minimal changes.

**Request contract:** `POST /functions/v1/maf-data` with `{ resource: 'programs' | 'sub_programs' | 'transactions' }`, returns `{ data: [...] }` or `{ error: string }`.

**Auth approach for the Edge Function:** re-verify username/PIN server-side on each call is simplest and avoids inventing a token scheme, but means the client must hold the PIN in memory for the session (same as the existing admin PIN pattern in `adminApi.ts` already does) and send it with each `maf-data` call. This keeps the design consistent with the codebase's existing pattern rather than introducing JWTs.

---

## 3. Frontend Changes

**`src/lib/adminApi.ts`**
- `verifyLogin` return type changes from `Promise<boolean>` to `Promise<{ ok: boolean; role: 'pbb' | 'maf' | null }>`.
- Keep the MAF PIN in memory for the session (same pattern as the existing admin PIN holder) so it can be sent with each `maf-data` call.

**`src/App.tsx`**
- Add `role` state (`'pbb' | 'maf' | null`), persisted to `sessionStorage` alongside `dashboard_auth` (e.g. new key `dashboard_role`).
- When `role === 'maf'`: never render the PIN-modal admin-upgrade entry point; badge shows "MAF"; `isAdmin` is permanently `false`.
- Hide the "Riwayat Laporan" navigation entry when `role === 'maf'`.

**`src/lib/supabase.ts`**
- `fetchPrograms`, `fetchSubPrograms`, `fetchTransactions` become role-aware: if current role is `'maf'`, call the `maf-data` Edge Function instead of querying Supabase tables directly; otherwise unchanged direct-query behavior for `'pbb'`.

**`src/components/Beranda.tsx`**
- Skip rendering `LaporanPekananCard` entirely when `role === 'maf'`.

**Routing / nav (wherever `RiwayatLaporan` is linked)**
- Hide the menu entry and guard the route so it's unreachable when `role === 'maf'`.

---

## 4. Error Handling

- `maf-data` Edge Function failure (network or server error) → existing fetch-error UI pattern (inline error + retry), already used elsewhere in the app. No silent fallback to direct table queries for MAF role under any circumstance — that would defeat the purpose of server-side filtering.
- `verify_login` returning `ok:false` → existing "Username atau PIN salah" error message in `LoginPage.tsx`, unchanged.

## 5. Testing

Manual verification (no automated test suite currently exists for this app):
- Log in as PBB (`sarpras`) — confirm zero behavior change vs. current production.
- Log in as MAF (`madrasahalfatih`) — confirm:
  - "Man Power" absent from Pekerjaan list, Keuangan totals/list, and any Beranda aggregate figures.
  - Laporan Mingguan card absent from Beranda.
  - Riwayat Laporan nav entry and route both inaccessible.
  - No PIN-modal / admin-upgrade UI visible anywhere; badge shows "MAF".
  - Open browser DevTools → Network tab while browsing as MAF: confirm no request returns Man Power data (the only data-fetching calls should hit `maf-data`, and its payloads must already exclude `P-024`).
- Confirm brute-force lockout still triggers after 8 failed attempts, for both username pairs.
