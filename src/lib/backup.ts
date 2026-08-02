import { supabase } from './supabase'
import { getTalangan, hasAdminPin } from './adminApi'

// Business-data tables only. Deliberately excludes `app_config` (holds bcrypt
// PIN/login hashes) and `admin_pin_attempts` (rate-limit log, no business
// value) -- a backup file must never carry credential material.
const BACKUP_TABLES = [
  'programs',
  'sub_programs',
  'issues',
  'documentation',
  'transactions',
  'activities',
  'work_notes',
  'weekly_notes',
  'program_snapshots',
  'program_documents',
  'before_after_pairs',
] as const

export async function downloadBackup(): Promise<{ ok: boolean; error?: string }> {
  const results = await Promise.all(
    BACKUP_TABLES.map(async table => {
      const { data, error } = await supabase.from(table).select('*')
      return [table, error ? [] : (data ?? [])] as const
    })
  )
  const tables: Record<string, unknown[]> = Object.fromEntries(results)

  // `talangan` is private (no anon read policy) -- only include it when the
  // current session already has a verified admin PIN in memory.
  if (hasAdminPin()) {
    const { data } = await getTalangan()
    tables.talangan = data ?? []
  }

  const payload = {
    app: 'dashboard-sarpras-maf',
    exported_at: new Date().toISOString(),
    tables,
  }

  let blob: Blob
  try {
    blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  } catch {
    return { ok: false, error: 'Gagal membuat file backup' }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backup-sarpras-maf-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  return { ok: true }
}
