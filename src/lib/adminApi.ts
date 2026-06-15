import { supabase } from './supabase'

// The admin PIN is held in memory only after a successful server-side verification.
// It is never persisted and is required for every write (insert/update/delete),
// which all go through PIN-gated SECURITY DEFINER functions in the database.
let adminPin: string | null = null

export function setAdminPin(pin: string) {
  adminPin = pin
}

export function clearAdminPin() {
  adminPin = null
}

export function hasAdminPin() {
  return !!adminPin
}

// Verify a PIN against the server (bcrypt hash stored in a locked table).
export async function verifyPin(pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_admin_pin', { p_pin: pin })
  if (error) return false
  return data === true
}

// Change the admin PIN (validated against the current PIN on the server).
export async function changePin(currentPin: string, newPin: string) {
  const { data, error } = await supabase.rpc('update_admin_pin', {
    p_current_pin: currentPin,
    p_new_pin: newPin,
  })
  return { ok: data === true, error }
}

export async function adminInsert(table: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('admin_insert', {
    p_pin: adminPin,
    p_table: table,
    p_payload: payload,
  })
  return { data, error }
}

export async function adminUpdate(
  table: string,
  payload: Record<string, unknown>,
  id: string | number,
) {
  const { data, error } = await supabase.rpc('admin_update', {
    p_pin: adminPin,
    p_table: table,
    p_payload: payload,
    p_id: String(id),
  })
  return { data, error }
}

export async function adminUpsertConfig(key: string, value: string) {
  const { error } = await supabase.rpc('admin_upsert_config', {
    p_pin: adminPin,
    p_key: key,
    p_value: value,
  })
  return { error }
}

export async function adminDelete(table: string, id: string | number) {
  const { error } = await supabase.rpc('admin_delete', {
    p_pin: adminPin,
    p_table: table,
    p_id: String(id),
  })
  return { error }
}
