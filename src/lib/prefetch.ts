/**
 * prefetch.ts
 *
 * Fires all common data fetches in parallel right after login.
 * Results are stored in the in-memory cache (see supabase.ts).
 * By the time the user navigates to any page, data is already ready —
 * page renders become near-instant instead of waiting on a fresh network call.
 */
import {
  fetchPrograms,
  fetchTransactions,
  fetchDocumentation,
  fetchDocumentationProgramIds,
  fetchBeforeAfterPairs,
  fetchSnapshots,
  fetchSubPrograms,
  fetchWeeklyNotes,
  fetchProgramDocuments,
} from './supabase'

export function prefetchAll() {
  // Fire-and-forget — we don't need the results here, just warm the cache.
  Promise.allSettled([
    fetchPrograms(),
    fetchTransactions(),
    fetchDocumentation(),
    fetchDocumentationProgramIds(),
    fetchBeforeAfterPairs(),
    fetchSnapshots(),
    fetchSubPrograms(),
    fetchWeeklyNotes(),
    fetchProgramDocuments(),
  ])
}
