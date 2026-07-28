export const STATUS_COLORS: Record<string, string> = {
  'Perencanaan': '#660000',
  'On Going': '#0A7BC8',
  'Selesai': '#1B5E2B',
  'On Hold': '#D97706',
}

export const STATUS_BG: Record<string, string> = {
  'Perencanaan': 'rgba(102,0,0,0.1)',
  'On Going': 'rgba(10,123,200,0.1)',
  'Selesai': 'rgba(27,94,43,0.1)',
  'On Hold': 'rgba(217,119,6,0.1)',
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
  'Keluar': { bg: '#660000', text: '#fff', light: 'rgba(102,0,0,0.1)' },
  'Keluar PBB': { bg: '#92400e', text: '#fff', light: 'rgba(146,64,14,0.1)' },
}

// Google Drive helper functions
export function extractDriveFileId(link: string): string | null {
  const match = link.match(/\/d\/([^/]+)/)
  return match ? match[1] : null
}

export function getDriveThumbnailUrl(driveLink: string, size = 'w400'): string | null {
  const fileId = extractDriveFileId(driveLink)
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=${size}` : null
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
  return Number(p.progress_percent) || 0
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
