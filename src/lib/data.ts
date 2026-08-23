// 'On Hold' / 'Rusak Ringan' use #B45309 (not the lighter #D97706 used for
// backgrounds/borders elsewhere) — #D97706 as TEXT on white is only 3.02:1,
// below WCAG AA's 4.5:1 for normal text; #B45309 clears it at ~5:1.
// 'Perencanaan' uses --color-neutral-dark (not --color-danger) — it's a
// planning stage, not a warning; 'Rusak Berat' below IS a genuine danger
// state (asset condition), so it keeps --color-danger.
export const STATUS_COLORS: Record<string, string> = {
  'Perencanaan': 'var(--color-neutral-dark)',
  'On Going': '#0A7BC8',
  'Selesai': '#1B5E2B',
  'On Hold': '#B45309',
}

export const STATUS_BG: Record<string, string> = {
  'Perencanaan': 'rgba(51,65,85,0.1)',
  'On Going': 'rgba(10,123,200,0.1)',
  'Selesai': 'rgba(27,94,43,0.1)',
  'On Hold': 'rgba(180,83,9,0.1)',
}

export const KONDISI_COLORS: Record<string, string> = {
  'Baik': '#059669',
  'Rusak Ringan': '#B45309',
  'Rusak Berat': 'var(--color-danger)',
}

export const KONDISI_BG: Record<string, string> = {
  'Baik': 'rgba(5,150,105,0.1)',
  'Rusak Ringan': 'rgba(180,83,9,0.1)',
  'Rusak Berat': 'rgba(102,0,0,0.1)',
}

export function formatRupiah(num: number): string {
  if (!num) return 'Rp 0'
  return 'Rp ' + num.toLocaleString('id-ID')
}

export function formatRupiahShort(num: number): string {
  if (!num) return 'Rp 0'
  const abs = Math.abs(num)
  const sign = num < 0 ? '-' : ''
  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000
    return `${sign}Rp ${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace('.', ',')} M`
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000
    return `${sign}Rp ${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace('.', ',')} Jt`
  }
  return `${sign}Rp ` + abs.toLocaleString('id-ID')
}

export function formatTanggal(dateStr: string): string {
  if (!dateStr) return '-'
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const d = new Date(dateStr)
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function getTodayFormatted(): string {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const d = new Date()
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

const MONTH_NAMES_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

// 'YYYY-MM' -> 'Juni 2026'
export function monthLabelFromYM(ym: string): string {
  const [y, m] = ym.split('-')
  return `${MONTH_NAMES_FULL[parseInt(m) - 1]} ${y}`
}

// Unique 'YYYY-MM' values from a list of date strings, sorted newest first.
export function monthsFromDates(dates: (string | undefined | null)[]): string[] {
  const set = new Set<string>()
  dates.forEach(d => { if (d) set.add(d.slice(0, 7)) })
  return Array.from(set).sort((a, b) => b.localeCompare(a))
}

// Updated darker transaction colors
export const TRANSACTION_COLORS: Record<string, { bg: string; text: string; light: string }> = {
  'Masuk': { bg: '#1B5E2B', text: '#fff', light: 'rgba(27,94,43,0.1)' },
  'Keluar': { bg: 'var(--color-neutral-dark)', text: '#fff', light: 'rgba(51,65,85,0.1)' },
  'Keluar PBB': { bg: '#92400e', text: '#fff', light: 'rgba(146,64,14,0.1)' },
}

// Google Drive helper functions
export function extractDriveFileId(link: string): string | null {
  const match = link.match(/\/d\/([^/]+)/)
  return match ? match[1] : null
}

// drive.google.com/thumbnail is unreliable under gallery-style bulk/burst access —
// observed taking 90s+ (sometimes never resolving) for a fresh batch of distinct
// file IDs, likely Google's abuse throttling for many-different-IDs-at-once.
// lh3.googleusercontent.com (Google's photo CDN, already used by getDriveViewUrl
// below) resolves the same files in single-digit milliseconds.
export function getDriveThumbnailUrl(driveLink: string, size = 'w400'): string | null {
  const fileId = extractDriveFileId(driveLink)
  return fileId ? `https://lh3.googleusercontent.com/d/${fileId}=${size}` : null
}

// Full-res viewer URL (for lightbox)
export function getDriveViewUrl(driveLink: string): string | null {
  const fileId = extractDriveFileId(driveLink)
  return fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : null
}

// Download URL for any Drive file (use in <a href> without download attr)
// drive.usercontent.google.com is the current proper download domain;
// uc?export=download on drive.google.com is deprecated and returns garbled content.
// confirm=t bypasses the virus-scan confirmation page for large files.
export function getDriveDownloadUrl(driveLink: string): string | null {
  const fileId = extractDriveFileId(driveLink)
  return fileId ? `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=t` : null
}

// Embed/preview URL for Drive files — use in <iframe> for cross-platform video playback
// Works without login for public files. More reliable than <video src> on mobile.
export function getDriveEmbedUrl(driveLink: string): string | null {
  const fileId = extractDriveFileId(driveLink)
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null
}

export function isValidDriveLink(link: string): boolean {
  return link.includes('/d/') && link.includes('drive.google.com')
}

// Returns an embeddable iframe URL for Drive files, Google Sheets, or null if unknown
export function getFileEmbedUrl(url: string): string | null {
  if (!url) return null
  // Google Sheets → htmlview is designed for iframe embedding (export?format=pdf triggers download, not inline)
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (sheetMatch) return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/htmlview?embedded=true`
  // Google Drive file (PDF, image, video)
  const fileId = extractDriveFileId(url)
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`
  return null
}

// Untuk jenis_pekerjaan 'Operasional' (Man Power), progress dihitung dari realisasi dana
export function getEffectiveProgress(p: { jenis_pekerjaan: string; progress_percent: number | string; total_anggaran: number; realisasi_terkini: number }): number {
  if (p.jenis_pekerjaan === 'Operasional' && p.total_anggaran > 0) {
    return Math.min(100, Math.round((p.realisasi_terkini / p.total_anggaran) * 100))
  }
  return Math.max(0, Math.min(100, Number(p.progress_percent) || 0))
}

// Label & placeholder field "titik" (sub-folder pengelompokan foto di Galeri)
// menyesuaikan jenis_pekerjaan — "Titik/Lokasi" cuma masuk akal buat pekerjaan
// fisik (Proyek). Pengadaan yang bundling beberapa komponen beda (mis. "Restorasi
// Mobil" + "Tempat Pengolahan Sampah") itu bukan lokasi; Program (kampanye/
// sosialisasi) sub-bagiannya lebih ke kegiatan/acara.
export function titikFieldConfig(jenisPekerjaan: string | undefined): { label: string; placeholder: string } {
  switch (jenisPekerjaan) {
    case 'Proyek':
      return { label: 'Titik / Lokasi', placeholder: 'Contoh: "Gedung A", "Titik 1"' }
    case 'Program':
      return { label: 'Kegiatan', placeholder: 'Contoh: "Sosialisasi ke Santri", "Lomba Kebersihan"' }
    case 'Pengadaan':
    case 'Operasional':
    default:
      return { label: 'Bagian / Komponen', placeholder: 'Contoh: "Mobil Kebersihan", "Tempat Pengolahan Sampah"' }
  }
}
