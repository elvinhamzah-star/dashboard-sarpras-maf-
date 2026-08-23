import { Program } from './supabase'

/**
 * Single source of truth for "is this program off-limits for the current role".
 * MAF must never see Man Power / Operasional financial or documentation data —
 * every gate (list filtering, click handlers, detail-view backstop) calls this
 * instead of re-deriving the jenis_pekerjaan check locally, so a new navigation
 * path can't accidentally skip the restriction.
 */
export function isRestrictedForRole(
  program: Pick<Program, 'jenis_pekerjaan'>,
  role: 'pbb' | 'maf' | null | undefined,
): boolean {
  return role === 'maf' && program.jenis_pekerjaan === 'Operasional'
}
