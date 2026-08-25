import { Program } from './supabase'

/**
 * Single source of truth for "is this program off-limits for the current user".
 * Man Power / Operasional is admin-only — hidden from all non-admin users
 * (regardless of role). Every gate (list filtering, click handlers, detail-view
 * backstop) calls this so a new navigation path can't accidentally skip the
 * restriction.
 */
export function isRestrictedForRole(
  program: Pick<Program, 'jenis_pekerjaan'>,
  role: 'pbb' | 'maf' | null | undefined,
  isAdmin?: boolean,
): boolean {
  if (isAdmin) return false
  return program.jenis_pekerjaan === 'Operasional'
}
