export const STATUS_COLORS: Record<string, string> = {
  'Perencanaan': '#8B0000',
  'On Going': '#0A7BC8',
  'Selesai': '#1B5E2B',
  'On Hold': '#D97706',
}

export const STATUS_BG: Record<string, string> = {
  'Perencanaan': 'rgba(139,0,0,0.1)',
  'On Going': 'rgba(10,123,200,0.1)',
  'Selesai': 'rgba(27,94,43,0.1)',
  'On Hold': 'rgba(217,119,6,0.1)',
}

export function formatRupiah(num: number): string {
  if (!num) return 'Rp 0'
  return 'Rp ' + num.toLocaleString('id-ID')
}

export function formatRupiahShort(num: number): string {
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(0)}Jt`
  return formatRupiah(num)
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

export function formatNumberShort(num: number): string {
  if (!num) return '0'
  if (num >= 1_000_000_000) {
    const m = (num / 1_000_000_000).toFixed(1)
    return `${m}M`
  }
  if (num >= 1_000_000) {
    const jt = Math.round(num / 1_000_000)
    return `${jt}jt`
  }
  return num.toString()
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

export function getDriveThumbnailUrl(driveLink: string): string | null {
  const fileId = extractDriveFileId(driveLink)
  return fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : null
}

export function isValidDriveLink(link: string): boolean {
  return link.includes('/d/') && link.includes('drive.google.com')
}

// Fase colors for documentation
export const FASE_COLORS: Record<string, { bg: string; color: string; badge: string }> = {
  'Kondisi Awal': { bg: 'rgba(239,68,68,0.1)', color: '#991b1b', badge: '🔴' },
  'Proses Pekerjaan': { bg: 'rgba(59,130,246,0.1)', color: '#1e40af', badge: '🔵' },
  'Kondisi Akhir': { bg: 'rgba(34,197,94,0.1)', color: '#15803d', badge: '🟢' },
}
