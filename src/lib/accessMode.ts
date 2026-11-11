// Flag mode publik (/publik). Modul terpisah tanpa dependensi browser supaya
// logika turunan (deriveTotals) tetap bisa diuji tanpa memuat klien Supabase.
let publicMode = false

export function setPublicMode(on: boolean) {
  publicMode = on
}

export function isPublicMode() {
  return publicMode
}
