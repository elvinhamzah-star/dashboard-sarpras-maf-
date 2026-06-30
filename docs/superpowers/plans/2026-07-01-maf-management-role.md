# MAF Management Read-Only Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second login (`madrasahalfatih` / PIN `1453`) that gives MAF management a read-only view of the dashboard identical to the PBB view, except the "Man Power" program (id `P-024`, staff honor) and the Laporan Mingguan / Riwayat Laporan pages are excluded — enforced server-side via a new Supabase Edge Function, not just hidden in the UI.

**Architecture:** `verify_login` RPC now returns `(ok, role)` instead of a bare boolean, backed by a second `app_config` credential pair. For `role='maf'`, the three list-fetching functions in `src/lib/supabase.ts` (`fetchPrograms`, `fetchSubPrograms`, `fetchTransactions`) route through a new `maf-data` Edge Function that re-verifies the MAF credentials server-side (using the service-role key) and strips `P-024` before returning data. `role='pbb'` is untouched — same direct table reads as today.

**Tech Stack:** React 18 + TypeScript (Vite), Supabase Postgres (SQL via the `apply_migration` MCP tool), Supabase Edge Functions (Deno, deployed via the `deploy_edge_function` MCP tool), `@supabase/supabase-js@^2.45.4`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-01-maf-management-role-design.md` — read it if anything below is ambiguous.
- Do not change PBB login behavior, credentials, or write/admin flow in any way.
- MAF PIN (`1453`) must be bcrypt-hashed via `pgcrypto` in `app_config`, same pattern as the existing `login_pin_hash`. Never store plaintext.
- MAF role must never reach admin/write mode — no PIN-modal upgrade path anywhere, no insert/update/delete UI.
- The "Man Power" exclusion must happen server-side (inside the `maf-data` Edge Function, using the service-role key). Client-side-only hiding does not satisfy this plan — if you find yourself filtering `P-024` in a React component instead of the Edge Function, stop and re-read this constraint.
- This codebase has **no automated test suite** (no Jest/Vitest/pytest configured — confirmed via `package.json`). "Test" steps below are manual, falsifiable verification: a SQL query against the live Supabase project, a direct Edge Function invocation, or driving the app in the browser. Do not skip them just because they aren't `pytest` commands.
- Correction vs. the spec: §4 of the design doc describes an "existing fetch-error UI pattern (inline error + retry)" for data-loading failures. That pattern only exists in write-modals (`AddTransactionModal.tsx`, `PinModal.tsx`, etc.) — `Beranda.tsx`, `Pekerjaan.tsx`, and `Keuangan.tsx` have no such thing today; they silently no-op (`if (data) setX(data)`) on any fetch failure, PBB or otherwise. This plan does not invent a new retry UI for the MAF path — `fetchPrograms`/`fetchSubPrograms`/`fetchTransactions` (Task 3) return the same `{ data, error }` shape regardless of role, so a `maf-data` failure surfaces exactly the way a PBB fetch failure already does (silently). Building a real retry UI is a separate, project-wide improvement, not in scope here.
- Supabase project ref for all MCP tool calls: `sgslsiyoompzuhuwzgyi`.
- Existing relevant identifiers (do not re-derive, use exactly): program id to exclude = `'P-024'`; transactions are tied to it via free-text `nama_pekerjaan = 'Man Power'` (no FK); `sub_programs` has zero rows for `P-024` today but must still be filtered defensively by `program_id`.

---

### Task 1: Database — MAF login credentials + role-aware `verify_login`

**Files:**
- DB migration via MCP tool `mcp__e5cb8625-dbfd-4f3e-a3b5-89afe45e6df5__apply_migration` (no local file — this project has no `supabase/migrations` folder checked into the repo; migrations are applied directly against the live project)

**Interfaces:**
- Consumes: nothing new (uses existing `public.app_config` table, `extensions.crypt`/`gen_salt` already used by `update_admin_pin`)
- Produces: `public.verify_login(p_username text, p_pin text) RETURNS TABLE(ok boolean, role text)` — role is `'pbb'` or `'maf'` on success, `(false, null)` on failure. This signature is what `src/lib/adminApi.ts` (Task 4) and the `maf-data` Edge Function (Task 2) both call.

- [ ] **Step 1: Apply the migration**

Call `mcp__e5cb8625-dbfd-4f3e-a3b5-89afe45e6df5__apply_migration` with `project_id: "sgslsiyoompzuhuwzgyi"`, `name: "add_maf_management_role"`, and this `query`:

```sql
-- MAF management login credentials (mirrors login_username / login_pin_hash)
insert into public.app_config (key, value, updated_at)
values ('login_username_maf', 'madrasahalfatih', now())
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.app_config (key, value, updated_at)
values ('login_pin_hash_maf', extensions.crypt('1453', extensions.gen_salt('bf')), now())
on conflict (key) do update set value = excluded.value, updated_at = now();

-- verify_login changes return type (bool -> TABLE(ok, role)); must drop first
drop function if exists public.verify_login(text, text);

create function public.verify_login(p_username text, p_pin text)
returns table(ok boolean, role text)
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  v_username text;
  v_hash text;
begin
  -- PBB credentials
  select value into v_username from public.app_config where key = 'login_username';
  select value into v_hash from public.app_config where key = 'login_pin_hash';
  if v_username is not null and v_hash is not null
     and p_username = v_username and v_hash = extensions.crypt(p_pin, v_hash) then
    return query select true, 'pbb'::text;
    return;
  end if;

  -- MAF credentials
  select value into v_username from public.app_config where key = 'login_username_maf';
  select value into v_hash from public.app_config where key = 'login_pin_hash_maf';
  if v_username is not null and v_hash is not null
     and p_username = v_username and v_hash = extensions.crypt(p_pin, v_hash) then
    return query select true, 'maf'::text;
    return;
  end if;

  return query select false, null::text;
end;
$$;

grant execute on function public.verify_login(text, text) to anon, authenticated, service_role, postgres;
```

- [ ] **Step 2: Verify via direct SQL — PBB credentials still work**

Call `mcp__e5cb8625-dbfd-4f3e-a3b5-89afe45e6df5__execute_sql` with `project_id: "sgslsiyoompzuhuwzgyi"`:

```sql
select * from public.verify_login('sarpras', '1234');
```

Expected: one row, `ok = true`, `role = 'pbb'` (adjust the PIN literal to whatever the current PBB PIN actually is if `1234` was since changed — check `app_config.login_pin_hash` history if unsure, or ask the user).

- [ ] **Step 3: Verify via direct SQL — MAF credentials work**

```sql
select * from public.verify_login('madrasahalfatih', '1453');
```

Expected: one row, `ok = true`, `role = 'maf'`.

- [ ] **Step 4: Verify via direct SQL — wrong credentials fail cleanly**

```sql
select * from public.verify_login('madrasahalfatih', '0000');
select * from public.verify_login('nobody', '1234');
```

Expected: both return one row with `ok = false`, `role = null`.

- [ ] **Step 5: Note (no commit needed)**

This task only touches the live database (no repo files change). Proceed to Task 2.

---

### Task 2: `maf-data` Edge Function

**Files:**
- Deploy via MCP tool `mcp__e5cb8625-dbfd-4f3e-a3b5-89afe45e6df5__deploy_edge_function` (function source lives in Supabase, not the git repo — same model as the migration in Task 1)

**Interfaces:**
- Consumes: `public.verify_login` (Task 1) via an admin Supabase client inside the function
- Produces: `POST {SUPABASE_URL}/functions/v1/maf-data` with body `{ resource: 'programs' | 'sub_programs' | 'transactions', username: string, pin: string }`, returns `{ data: T[] }` on success (200) or `{ error: string }` on failure (400/401/500). This contract is what `src/lib/supabase.ts` (Task 3) calls via `supabase.functions.invoke('maf-data', { body })`.

- [ ] **Step 1: Deploy the function**

Call `mcp__e5cb8625-dbfd-4f3e-a3b5-89afe45e6df5__deploy_edge_function` with:
- `project_id: "sgslsiyoompzuhuwzgyi"`
- `name: "maf-data"`
- `entrypoint_path: "index.ts"`
- `verify_jwt: true` (the anon key the app already sends is itself a valid JWT; this only checks the JWT is well-formed/unexpired — the actual MAF authorization happens inside the function body against `verify_login`)
- `files`: one file, `name: "index.ts"`, `content`:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

const EXCLUDED_PROGRAM_ID = 'P-024'
const ALLOWED_RESOURCES = ['programs', 'sub_programs', 'transactions'] as const
type Resource = typeof ALLOWED_RESOURCES[number]

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let body: { resource?: string; username?: string; pin?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { resource, username, pin } = body
  if (!resource || !ALLOWED_RESOURCES.includes(resource as Resource)) {
    return json({ error: 'Invalid resource' }, 400)
  }
  if (!username || !pin) {
    return json({ error: 'Missing credentials' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: verifyRows, error: verifyError } = await admin.rpc('verify_login', {
    p_username: username,
    p_pin: pin,
  })
  const verified = Array.isArray(verifyRows) ? verifyRows[0] : verifyRows
  if (verifyError || !verified || verified.ok !== true || verified.role !== 'maf') {
    return json({ error: 'Unauthorized' }, 401)
  }

  let query
  if (resource === 'programs') {
    query = admin.from('programs').select('*').neq('id', EXCLUDED_PROGRAM_ID).order('id', { ascending: true })
  } else if (resource === 'sub_programs') {
    query = admin.from('sub_programs').select('*').neq('program_id', EXCLUDED_PROGRAM_ID).order('id', { ascending: true })
  } else {
    query = admin.from('transactions').select('*').neq('nama_pekerjaan', 'Man Power').order('tanggal', { ascending: false })
  }

  const { data, error } = await query
  if (error) {
    return json({ error: error.message }, 500)
  }

  return json({ data }, 200)
})
```

- [ ] **Step 2: Verify — authorized MAF request excludes Man Power**

Call `mcp__e5cb8625-dbfd-4f3e-a3b5-89afe45e6df5__execute_sql` first to get the anon key isn't needed for this curl (the function itself re-verifies via PIN, not via the caller's JWT role), then invoke directly:

```bash
curl -s -X POST "https://sgslsiyoompzuhuwzgyi.supabase.co/functions/v1/maf-data" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon_key_from_src/lib/supabase.ts>" \
  -d '{"resource":"programs","username":"madrasahalfatih","pin":"1453"}'
```

Expected: `{"data":[...]}` array of programs where **no element has `"id":"P-024"`**.

- [ ] **Step 3: Verify — wrong PIN is rejected**

```bash
curl -s -X POST "https://sgslsiyoompzuhuwzgyi.supabase.co/functions/v1/maf-data" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon_key>" \
  -d '{"resource":"programs","username":"madrasahalfatih","pin":"0000"}'
```

Expected: HTTP 401, `{"error":"Unauthorized"}`.

- [ ] **Step 4: Verify — PBB credentials are rejected by this function**

```bash
curl -s -X POST "https://sgslsiyoompzuhuwzgyi.supabase.co/functions/v1/maf-data" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon_key>" \
  -d '{"resource":"programs","username":"sarpras","pin":"<pbb pin>"}'
```

Expected: HTTP 401 — `maf-data` only serves role `'maf'`, even with otherwise-valid credentials. This confirms a PBB user can't accidentally (or a curious party can't deliberately) pull the filtered MAF dataset and mistake it for anything meaningful, and more importantly confirms the role check is real, not just "any valid login passes."

- [ ] **Step 5: Verify — `transactions` and `sub_programs` resources also exclude Man Power**

Repeat Step 2's curl with `"resource":"transactions"` and confirm no row has `"nama_pekerjaan":"Man Power"`; repeat with `"resource":"sub_programs"` and confirm no row has `"program_id":"P-024"` (expected to already be empty per the Global Constraints note, but the filter must still be present in the query).

---

### Task 3: Role-aware data fetching in `src/lib/supabase.ts`

**Files:**
- Modify: `src/lib/supabase.ts:81-93` (the `fetchAppConfig`/`fetchPrograms`/`fetchTransactions`/`fetchDocumentation`/`fetchSnapshots`/`fetchSubPrograms`/`fetchProgramSnapshots`/`fetchWeeklyNotes` block)

**Interfaces:**
- Consumes: `supabase.functions.invoke` (from the `supabase` client already exported in this file), the `maf-data` contract from Task 2
- Produces: `setMafCredentials(username: string, pin: string): void`, `clearMafCredentials(): void`, `hasMafCredentials(): boolean` — consumed by `src/components/LoginPage.tsx` (Task 5) and `src/App.tsx` (Task 6). `fetchPrograms`, `fetchSubPrograms`, `fetchTransactions` keep their existing zero-argument call signature and `Promise<{ data: T[] | null; error: unknown }>`-shaped resolution (callers already do `const { data } = await fetchPrograms()` — unchanged).

- [ ] **Step 1: Add the MAF credential holder and `fetchMafData` helper**

In `src/lib/supabase.ts`, after the `Documentation` interface (after line 79, before `export const fetchAppConfig`), add:

```ts
// MAF management role credentials, held in memory only for the session
// (never persisted), mirroring the admin PIN pattern in adminApi.ts.
// Presence of these credentials routes programs/sub_programs/transactions
// reads through the maf-data Edge Function instead of direct table queries.
let mafUsername: string | null = null
let mafPin: string | null = null

export function setMafCredentials(username: string, pin: string) {
  mafUsername = username
  mafPin = pin
}

export function clearMafCredentials() {
  mafUsername = null
  mafPin = null
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
```

- [ ] **Step 2: Make `fetchPrograms`, `fetchSubPrograms`, `fetchTransactions` role-aware**

Replace lines 84, 85, 88 (currently):

```ts
export const fetchPrograms = () => supabase.from('programs').select('*').order('id', { ascending: true })
export const fetchTransactions = () => supabase.from('transactions').select('*').order('tanggal', { ascending: false })
```
```ts
export const fetchSubPrograms = () => supabase.from('sub_programs').select('*').order('id', { ascending: true })
```

with:

```ts
export async function fetchPrograms() {
  if (hasMafCredentials()) return fetchMafData<Program>('programs')
  const { data, error } = await supabase.from('programs').select('*').order('id', { ascending: true })
  return { data, error }
}

export async function fetchTransactions() {
  if (hasMafCredentials()) return fetchMafData<Transaction>('transactions')
  const { data, error } = await supabase.from('transactions').select('*').order('tanggal', { ascending: false })
  return { data, error }
}
```

and (keeping it next to the other `fetchSubPrograms`/`fetchProgramSnapshots` exports, same relative position):

```ts
export async function fetchSubPrograms() {
  if (hasMafCredentials()) return fetchMafData<SubProgram>('sub_programs')
  const { data, error } = await supabase.from('sub_programs').select('*').order('id', { ascending: true })
  return { data, error }
}
```

Leave `fetchDocumentation`, `fetchSnapshots`, `fetchProgramSnapshots`, `fetchWeeklyNotes`, `fetchAppConfig` untouched — Documentation has zero Man Power rows (verified directly against the DB), Galeri doesn't need filtering, and Laporan Mingguan/Riwayat are hidden at the component level (Tasks 6–7), not the data level.

- [ ] **Step 3: Type-check**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npx tsc -b --noEmit`
Expected: no new errors. If `fetchMafData`'s return type doesn't structurally match what callers expect (e.g. a caller destructures a field beyond `data`/`error`), fix the helper's return shape to match — don't change call sites.

- [ ] **Step 4: Manual verification in browser console**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npm run dev`, open the app, open browser DevTools console, and run:

```js
const mod = await import('/src/lib/supabase.ts')
console.log(await mod.fetchPrograms()) // hasMafCredentials() is false here -> direct query, full list including P-024
mod.setMafCredentials('madrasahalfatih', '1453')
console.log(await mod.fetchPrograms()) // now routes through maf-data -> no P-024
mod.clearMafCredentials()
```

Expected: first call's `data` array includes an element with `id: "P-024"`; second call's does not.

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/dashboard-sarpras-maf-v2
git add src/lib/supabase.ts
git commit -m "feat: route programs/sub_programs/transactions through maf-data when MAF credentials are set"
```

---

### Task 4: `verifyLogin` return-shape change in `src/lib/adminApi.ts`

**Files:**
- Modify: `src/lib/adminApi.ts:20-24`

**Interfaces:**
- Consumes: `verify_login` RPC shape from Task 1 (`TABLE(ok boolean, role text)`)
- Produces: `verifyLogin(username: string, pin: string): Promise<{ ok: boolean; role: 'pbb' | 'maf' | null }>` — consumed by `src/components/LoginPage.tsx` (Task 5)

- [ ] **Step 1: Update `verifyLogin`**

Replace lines 20-24:

```ts
export async function verifyLogin(username: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_login', { p_username: username, p_pin: pin })
  if (error) return false
  return data === true
}
```

with:

```ts
export async function verifyLogin(
  username: string,
  pin: string,
): Promise<{ ok: boolean; role: 'pbb' | 'maf' | null }> {
  const { data, error } = await supabase.rpc('verify_login', { p_username: username, p_pin: pin })
  if (error || !data) return { ok: false, role: null }
  const row = Array.isArray(data) ? data[0] : data
  if (!row || row.ok !== true) return { ok: false, role: null }
  return { ok: true, role: row.role as 'pbb' | 'maf' }
}
```

- [ ] **Step 2: Type-check**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npx tsc -b --noEmit`
Expected: error in `src/components/LoginPage.tsx` (still calling the old boolean-returning signature) — this is expected and resolved in Task 5. Confirm the error is *only* in `LoginPage.tsx` and not anywhere else (grep already confirmed `verifyLogin` has a single call site).

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/dashboard-sarpras-maf-v2
git add src/lib/adminApi.ts
git commit -m "feat: verifyLogin returns role alongside ok"
```

(This will leave the repo in a non-compiling state until Task 5 lands — acceptable here since Tasks 4–7 are a tightly-coupled slice meant to land together; if you're executing via subagent-driven-development with a review gate between every task, merge Tasks 4 and 5 into one task instead of committing this one standalone.)

---

### Task 5: `src/components/LoginPage.tsx` — wire role through on login

**Files:**
- Modify: `src/components/LoginPage.tsx:4-29`

**Interfaces:**
- Consumes: `verifyLogin` (Task 4), `setMafCredentials` (Task 3, import from `../lib/supabase`)
- Produces: `LoginPageProps.onLogin` signature changes from `() => void` to `(role: 'pbb' | 'maf') => void` — consumed by `src/App.tsx` (Task 6)

- [ ] **Step 1: Update imports and props**

Replace lines 1-6:

```tsx
import { useState } from 'react'
import { verifyLogin } from '../lib/adminApi'

interface LoginPageProps {
  onLogin: () => void
}
```

with:

```tsx
import { useState } from 'react'
import { verifyLogin } from '../lib/adminApi'
import { setMafCredentials } from '../lib/supabase'

interface LoginPageProps {
  onLogin: (role: 'pbb' | 'maf') => void
}
```

- [ ] **Step 2: Update `handleSubmit`**

Replace lines 16-29:

```tsx
  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    const ok = await verifyLogin(username.trim(), pin)
    setLoading(false)
    if (ok) {
      sessionStorage.setItem('dashboard_auth', '1')
      onLogin()
    } else {
      setError('Username atau PIN salah.')
      setPin('')
    }
  }
```

with:

```tsx
  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    const { ok, role } = await verifyLogin(username.trim(), pin)
    setLoading(false)
    if (ok && role) {
      if (role === 'maf') setMafCredentials(username.trim(), pin)
      sessionStorage.setItem('dashboard_auth', '1')
      sessionStorage.setItem('dashboard_role', role)
      onLogin(role)
    } else {
      setError('Username atau PIN salah.')
      setPin('')
    }
  }
```

- [ ] **Step 3: Type-check**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npx tsc -b --noEmit`
Expected: error now in `src/App.tsx` (`onLogin={() => setIsLoggedIn(true)}` doesn't match the new `(role) => void` signature) — expected, resolved in Task 6.

- [ ] **Step 4: Commit**

```bash
cd /Users/mac/dashboard-sarpras-maf-v2
git add src/components/LoginPage.tsx
git commit -m "feat: LoginPage passes resolved role to onLogin and sets MAF credentials"
```

---

### Task 6: `src/App.tsx` + `src/components/Sidebar.tsx` — role state, nav gating, admin gating

**Files:**
- Modify: `src/App.tsx` (state init at line 17, `handleLogoutDashboard` at line 63, `renderPage`/`PekerjaanDetail` branch at lines 72-81, `Beranda`/`Pekerjaan`/`Keuangan`/`Galeri`/`riwayat` cases at lines 85-103, mobile badge at lines 206-222, `Sidebar` invocation at lines 124-134, mobile FAB at line 256, `LoginPage` invocation at line 118)
- Modify: `src/components/Sidebar.tsx` (props interface lines 1-11, `menuItems` filtering, badge text lines 211-264, collapsed-mode admin button lines 339-362)

**Interfaces:**
- Consumes: `LoginPageProps.onLogin` role param (Task 5), `clearMafCredentials` (Task 3, import from `../lib/supabase`)
- Produces: `role: 'pbb' | 'maf' | null` state in `App`, passed as a new `role` prop to `Sidebar` and `Beranda` — `Beranda` consumes it in Task 7

- [ ] **Step 1: `App.tsx` — add role state, read/write `sessionStorage`**

Replace line 17:
```tsx
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('dashboard_auth') === '1')
```
with:
```tsx
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('dashboard_auth') === '1')
  const [role, setRole] = useState<'pbb' | 'maf' | null>(
    () => (sessionStorage.getItem('dashboard_role') as 'pbb' | 'maf' | null) ?? null,
  )
```

Add the import (alongside the existing `clearAdminPin` import on line 12):
```tsx
import { clearAdminPin } from './lib/adminApi'
import { clearMafCredentials } from './lib/supabase'
```

- [ ] **Step 2: `App.tsx` — clear MAF credentials on logout, guard `handleSelectProgram`**

Replace `handleLogoutDashboard` (lines 63-68):
```tsx
  const handleLogoutDashboard = () => {
    sessionStorage.removeItem('dashboard_auth')
    clearAdminPin()
    setIsAdmin(false)
    setIsLoggedIn(false)
  }
```
with:
```tsx
  const handleLogoutDashboard = () => {
    sessionStorage.removeItem('dashboard_auth')
    sessionStorage.removeItem('dashboard_role')
    clearAdminPin()
    clearMafCredentials()
    setIsAdmin(false)
    setIsLoggedIn(false)
    setRole(null)
  }
```

Replace `handleSelectProgram` (lines 50-52):
```tsx
  const handleSelectProgram = (id: string) => {
    setSelectedProgramId(id)
  }
```
with:
```tsx
  const handleSelectProgram = (id: string) => {
    if (role === 'maf' && id === 'P-024') return
    setSelectedProgramId(id)
  }
```

(This is the defensive guard called out in the spec: nothing in the MAF-visible Pekerjaan list can ever produce `id === 'P-024'` since `fetchPrograms` already excludes it, but `PekerjaanDetail` itself queries `supabase.from('programs')` directly rather than through `fetchPrograms` — see its `load()` function — so this guard is the only thing stopping a hand-crafted `selectedProgramId` from reaching that direct, unfiltered query.)

- [ ] **Step 3: `App.tsx` — riwayat page guard, login/render wiring**

Replace the `riwayat` case (line 102-103):
```tsx
      case 'riwayat':
        return <RiwayatLaporan />
```
with:
```tsx
      case 'riwayat':
        return role === 'maf' ? <Beranda isAdmin={isAdmin} role={role} /> : <RiwayatLaporan />
```

Replace the `LoginPage` invocation (line 118):
```tsx
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />
```
with:
```tsx
    return (
      <LoginPage
        onLogin={resolvedRole => {
          setRole(resolvedRole)
          setIsLoggedIn(true)
        }}
      />
    )
```

Update the `Beranda` case (line 85) and the `default` case (line 105) to pass `role`:
```tsx
      case 'beranda':
        return <Beranda isAdmin={isAdmin} role={role} />
```
```tsx
      default:
        return <Beranda isAdmin={isAdmin} role={role} />
```

- [ ] **Step 4: `App.tsx` — hide admin entry points and badge for MAF, pass `role` to `Sidebar`**

Replace the `Sidebar` invocation (lines 124-134):
```tsx
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpen={isMobile ? sidebarOpen : sidebarOpen}
        isMobile={isMobile}
        onToggle={() => setSidebarOpen(o => !o)}
        isAdmin={isAdmin}
        onLogout={() => { clearAdminPin(); setIsAdmin(false) }}
        onLogoutDashboard={handleLogoutDashboard}
        onShowPinModal={() => setShowPinModal(true)}
      />
```
with:
```tsx
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpen={isMobile ? sidebarOpen : sidebarOpen}
        isMobile={isMobile}
        onToggle={() => setSidebarOpen(o => !o)}
        isAdmin={isAdmin}
        role={role}
        onLogout={() => { clearAdminPin(); setIsAdmin(false) }}
        onLogoutDashboard={handleLogoutDashboard}
        onShowPinModal={() => setShowPinModal(true)}
      />
```

Replace the mobile badge (lines 206-222) — wrap the existing badge `<span>` block's content to show "MAF" and never "Admin" for that role:
```tsx
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                backgroundColor: isAdmin ? 'rgba(26,111,232,0.1)' : 'rgba(15,23,42,0.05)',
                color: isAdmin ? 'var(--blue)' : '#9CAABB',
                fontSize: 10.5,
                fontWeight: 700,
                padding: '4px 9px',
                borderRadius: 20,
                flexShrink: 0,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: isAdmin ? 'var(--blue)' : '#9CAABB' }} />
              {isAdmin ? 'Admin' : 'Viewer'}
            </span>
```
with:
```tsx
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                backgroundColor: isAdmin ? 'rgba(26,111,232,0.1)' : 'rgba(15,23,42,0.05)',
                color: isAdmin ? 'var(--blue)' : '#9CAABB',
                fontSize: 10.5,
                fontWeight: 700,
                padding: '4px 9px',
                borderRadius: 20,
                flexShrink: 0,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: isAdmin ? 'var(--blue)' : '#9CAABB' }} />
              {role === 'maf' ? 'MAF' : isAdmin ? 'Admin' : 'Viewer'}
            </span>
```

Replace the mobile FAB condition (line 256):
```tsx
      {isMobile && !isAdmin && !showPinModal && !showAddModal && (
```
with:
```tsx
      {isMobile && !isAdmin && role !== 'maf' && !showPinModal && !showAddModal && (
```

- [ ] **Step 5: `Sidebar.tsx` — accept `role`, filter `riwayat` menu item, hide admin entry points**

Add `role` to the props interface (lines 1-11):
```tsx
interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  isOpen: boolean
  isMobile?: boolean
  onToggle: () => void
  isAdmin: boolean
  role: 'pbb' | 'maf' | null
  onLogout: () => void
  onShowPinModal: () => void
  onLogoutDashboard: () => void
}
```

Update the function signature (line 70):
```tsx
export default function Sidebar({ currentPage, onNavigate, isOpen, isMobile = false, onToggle, isAdmin, onLogout, onShowPinModal, onLogoutDashboard }: SidebarProps) {
```
with:
```tsx
export default function Sidebar({ currentPage, onNavigate, isOpen, isMobile = false, onToggle, isAdmin, role, onLogout, onShowPinModal, onLogoutDashboard }: SidebarProps) {
```

Replace line 151:
```tsx
        {menuItems.map(item => {
```
with:
```tsx
        {menuItems.filter(item => role !== 'maf' || item.id !== 'riwayat').map(item => {
```

Replace the expanded-mode badge block (lines 213-232):
```tsx
        {expanded ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px', marginBottom: 4 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: isAdmin ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.06)',
                  color: isAdmin ? '#60A5FA' : 'rgba(255,255,255,0.4)',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 20,
                  letterSpacing: '0.01em',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isAdmin ? '#60A5FA' : 'rgba(255,255,255,0.3)', display: 'inline-block' }} />
                {isAdmin ? 'Mode Admin' : 'Mode Viewer'}
              </div>
              {!isAdmin && (
```
with:
```tsx
        {expanded ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px', marginBottom: 4 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: isAdmin ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.06)',
                  color: isAdmin ? '#60A5FA' : 'rgba(255,255,255,0.4)',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 20,
                  letterSpacing: '0.01em',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isAdmin ? '#60A5FA' : 'rgba(255,255,255,0.3)', display: 'inline-block' }} />
                {role === 'maf' ? 'Mode MAF' : isAdmin ? 'Mode Admin' : 'Mode Viewer'}
              </div>
              {!isAdmin && role !== 'maf' && (
```

Replace lines 340-362 (the collapsed-mode admin toggle button, ending right before the sibling `onLogoutDashboard` button that must stay untouched):
```tsx
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              onClick={isAdmin ? onLogout : onShowPinModal}
              title={isAdmin ? 'Keluar Mode Admin' : 'Masuk Mode Admin'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: isAdmin ? 'rgba(248,113,113,0.1)' : 'rgba(26,111,232,0.15)',
                border: `1px solid ${isAdmin ? 'rgba(248,113,113,0.2)' : 'rgba(26,111,232,0.2)'}`,
                cursor: 'pointer',
                color: isAdmin ? '#F87171' : '#60A5FA',
                padding: 0,
              }}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </button>
```
with:
```tsx
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {role !== 'maf' && (
              <button
                onClick={isAdmin ? onLogout : onShowPinModal}
                title={isAdmin ? 'Keluar Mode Admin' : 'Masuk Mode Admin'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: isAdmin ? 'rgba(248,113,113,0.1)' : 'rgba(26,111,232,0.15)',
                  border: `1px solid ${isAdmin ? 'rgba(248,113,113,0.2)' : 'rgba(26,111,232,0.2)'}`,
                  cursor: 'pointer',
                  color: isAdmin ? '#F87171' : '#60A5FA',
                  padding: 0,
                }}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </button>
            )}
```
Line 363 (`<button onClick={onLogoutDashboard} title="Keluar Dashboard"` and everything after it through the end of that button) is untouched — it stays a sibling inside the same outer `<div>`, rendered for every role.

- [ ] **Step 6: Type-check**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npx tsc -b --noEmit`
Expected: no errors (this task closes out the chain of errors introduced in Tasks 4-5). If `Beranda` now errors because it doesn't accept a `role` prop yet, that's expected — resolved in Task 7.

- [ ] **Step 7: Manual verification**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npm run dev`, then in the browser:
- Log in as `sarpras` / PBB PIN. Confirm: Sidebar shows all 5 nav items including "Riwayat Laporan"; badge reads "Viewer" (or "Admin" after entering the PIN modal); nothing regressed.
- Log out, log in as `madrasahalfatih` / `1453`. Confirm: Sidebar shows only 4 nav items (no "Riwayat Laporan"); badge reads "MAF"; no admin PIN button is visible anywhere (expanded or collapsed sidebar, desktop or mobile width); clicking "Riwayat Laporan" is impossible since the nav entry is gone.

- [ ] **Step 8: Commit**

```bash
cd /Users/mac/dashboard-sarpras-maf-v2
git add src/App.tsx src/components/Sidebar.tsx
git commit -m "feat: role-gated navigation and admin entry points for MAF login"
```

---

### Task 7: `src/components/Beranda.tsx` — hide Laporan Mingguan for MAF

**Files:**
- Modify: `src/components/Beranda.tsx:10-12` (props interface), `:50` (function signature), `:257-283` (Laporan Pekanan section)

**Interfaces:**
- Consumes: `role` prop from `App.tsx` (Task 6)
- Produces: nothing new downstream — this is the last consumer in the chain

- [ ] **Step 1: Add `role` to props**

Replace lines 10-12:
```tsx
interface BerandaProps {
  isAdmin: boolean
}
```
with:
```tsx
interface BerandaProps {
  isAdmin: boolean
  role: 'pbb' | 'maf' | null
}
```

Replace line 50:
```tsx
export default function Beranda({ isAdmin }: BerandaProps) {
```
with:
```tsx
export default function Beranda({ isAdmin, role }: BerandaProps) {
```

- [ ] **Step 2: Hide the Laporan Pekanan section for MAF**

Wrap the entire block from `{/* Laporan Pekanan */}` through its closing `</div>` (lines 257-283):
```tsx
      {/* Laporan Pekanan */}
      <div>
        <button
          onClick={() => setShowLaporan(v => !v)}
          ...
        >
          ...
        </button>
        {showLaporan && (
          <div style={{ marginTop: 12 }}>
            <LaporanPekananCard isAdmin={isAdmin} programs={programs} />
          </div>
        )}
      </div>
```
becomes:
```tsx
      {/* Laporan Pekanan */}
      {role !== 'maf' && (
      <div>
        <button
          onClick={() => setShowLaporan(v => !v)}
          ...
        >
          ...
        </button>
        {showLaporan && (
          <div style={{ marginTop: 12 }}>
            <LaporanPekananCard isAdmin={isAdmin} programs={programs} />
          </div>
        )}
      </div>
      )}
```
(Keep the button's full existing inner content exactly as-is — only the opening `{role !== 'maf' && (` before `<div>` and the matching closing `)}` after the outer `</div>` are new.)

- [ ] **Step 3: Type-check**

Run: `cd /Users/mac/dashboard-sarpras-maf-v2 && npx tsc -b --noEmit`
Expected: no errors anywhere in the project — this closes out the prop-drilling chain started in Task 6.

- [ ] **Step 4: Manual verification**

With `npm run dev` running:
- Log in as PBB. On Beranda, confirm the "Tampilkan Laporan Pekanan" toggle button is still present and works.
- Log in as MAF. On Beranda, confirm the toggle button and the Laporan Mingguan card are both entirely absent — not just collapsed, not in the DOM at all (check via browser DevTools Elements panel, search for "Laporan Pekanan").

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/dashboard-sarpras-maf-v2
git add src/components/Beranda.tsx
git commit -m "feat: hide Laporan Pekanan section from MAF role"
```

---

### Task 8: End-to-end verification and deploy

**Files:** none (verification only)

- [ ] **Step 1: Full regression pass as PBB**

Log in as `sarpras`. Walk through Beranda, Pekerjaan (including opening a non-Man-Power program's detail, and confirming "Man Power" itself still appears in the Pekerjaan list for this role), Keuangan, Galeri, Riwayat Laporan, and entering Admin mode via the PIN modal. Confirm zero behavior change from before this plan.

- [ ] **Step 2: Full pass as MAF**

Log in as `madrasahalfatih` / `1453`. Confirm:
- Beranda: no Laporan Pekanan card/toggle; all other cards (alerts, week-over-week, chart, vendor) show real numbers that match PBB's view minus Man Power's contribution.
- Pekerjaan: "Man Power" does not appear in the list; total program count is one less than the PBB view.
- Keuangan: total realisasi/transaction list excludes all "Man Power" / "Honor Hamzah" / "Honor Om Yus" entries; the displayed total is lower than the PBB view by exactly Rp 51.617.690 (the figure recorded in project memory for this program's realisasi).
- Galeri: identical to PBB view (no exclusions expected here).
- Sidebar: no "Riwayat Laporan" entry, no admin PIN affordance anywhere, badge reads "MAF".
- Open DevTools → Network tab, reload, click through every page: confirm every request that returns program/sub_program/transaction data hits `.../functions/v1/maf-data`, and inspect each response body to confirm none contains `"id":"P-024"`, `"program_id":"P-024"`, or `"nama_pekerjaan":"Man Power"`. Confirm there is **no** direct `rest/v1/programs`, `rest/v1/sub_programs`, or `rest/v1/transactions` request for this role (those would indicate the role-aware branch in Task 3 isn't being hit).

- [ ] **Step 3: Confirm brute-force behavior is unchanged**

This plan's `verify_login` has no rate-limiting (same as before — the existing `admin_pin_attempts` lockout protects the separate `verify_admin_pin`/write-mode PIN, not this login RPC; this plan does not add new lockout behavior since none existed on this function to begin with). Note this in the PR description if one is opened — it's a pre-existing condition, not a regression.

- [ ] **Step 4: Final commit**

If Step 1-2 surfaced any fixes, commit them individually per the file they touched, following the same commit-message style as the rest of this plan. If everything passed as-is, no commit is needed for this task — Task 8 is verification-only.
