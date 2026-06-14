#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = 'https://sgslsiyoompzuhuwzgyi.supabase.co'
const SUPABASE_KEY = 'sb_publishable_3wYZACfd-9wKcx92loJWPg_jjF76A_7'
const TABLES = ['programs', 'sub_programs', 'transactions', 'documentation', 'issues', 'activities', 'work_notes']

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const now = new Date()
const stamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-')
const dir = join('backups', stamp)
mkdirSync(dir, { recursive: true })

let totalRows = 0
for (const table of TABLES) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) {
    console.error(`❌ ${table}: ${error.message}`)
    continue
  }
  const rows = data?.length ?? 0
  totalRows += rows
  writeFileSync(join(dir, `${table}.json`), JSON.stringify(data, null, 2))
  console.log(`✅ ${table}: ${rows} rows`)
}

console.log(`\n📦 Backup selesai → ${dir}/ (${totalRows} total rows)`)
console.log(`💡 Jalankan ini secara berkala: node scripts/backup.mjs`)
