export const STATUS_COLORS: Record<string, string> = {
  'Perencanaan': '#DC2626',
  'On Going': '#0A7BC8',
  'Selesai': '#1B5E2B',
  'On Hold': '#D97706',
}

export const STATUS_BG: Record<string, string> = {
  'Perencanaan': 'rgba(220,38,38,0.1)',
  'On Going': 'rgba(10,123,200,0.1)',
  'Selesai': 'rgba(27,94,43,0.1)',
  'On Hold': 'rgba(217,119,6,0.1)',
}

export function formatRupiah(num: number): string {
  if (!num) return 'Rp 0'
  return 'Rp ' + num.toLocaleString('id-ID')
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
  'Masuk': { bg: '#059669', text: '#fff', light: 'rgba(5,150,105,0.1)' },
  'Keluar': { bg: '#991b1b', text: '#fff', light: 'rgba(153,27,27,0.1)' },
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

export function isValidDriveLink(link: string): boolean {
  return link.includes('/d/') && link.includes('drive.google.com')
}
