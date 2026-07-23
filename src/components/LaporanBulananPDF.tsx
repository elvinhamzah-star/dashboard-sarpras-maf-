import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import { Program, Transaction, ProgramSnapshot } from '../lib/supabase'
import { formatRupiah, monthLabelFromYM, STATUS_COLORS } from '../lib/data'

export interface LaporanPDFProps {
  bulan: string
  prevBulan: string
  programs: Program[]
  transactions: Transaction[]
  prevTransactions: Transaction[]
  progressByProgram: Record<string, number>
  prevProgressByProgram: Record<string, number>
  catatanEvaluasi: string
  rencana: string
  generatedAt: string
}

const BLUE = '#1A6FE8'
const BLUE_LIGHT = '#EFF6FF'
const BLUE_MID = '#BFDBFE'
const DARK = '#1E293B'
const MUTED = '#64748B'
const BORDER = '#E2E8F0'
const SURFACE = '#F8FAFC'
const GREEN = '#1B5E2B'
const GREEN_BG = '#F0FDF4'
const RED = '#660000'
const RED_BG = '#FEF2F2'
const AMBER = '#D97706'
const AMBER_BG = '#FFFBEB'
const PAD = 32

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: DARK,
    backgroundColor: '#FFFFFF',
    padding: PAD,
  },
  // Slide header strip
  slideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 18,
    paddingBottom: 10,
    borderBottom: `2px solid ${BLUE}`,
  },
  slideTitle: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    letterSpacing: -0.3,
  },
  slideBreadcrumb: {
    fontSize: 8,
    color: MUTED,
  },
  // Stat boxes
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 8,
    padding: 12,
    border: `1px solid ${BORDER}`,
  },
  statBoxBlue: {
    flex: 1,
    backgroundColor: BLUE_LIGHT,
    borderRadius: 8,
    padding: 12,
    border: `1px solid ${BLUE_MID}`,
  },
  statBoxGreen: {
    flex: 1,
    backgroundColor: GREEN_BG,
    borderRadius: 8,
    padding: 12,
    border: `1px solid #A7F3D0`,
  },
  statBoxAmber: {
    flex: 1,
    backgroundColor: AMBER_BG,
    borderRadius: 8,
    padding: 12,
    border: `1px solid #FCD34D`,
  },
  statLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    lineHeight: 1,
  },
  statValueBlue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    lineHeight: 1,
  },
  statValueGreen: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    lineHeight: 1,
  },
  statValueAmber: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: AMBER,
    lineHeight: 1,
  },
  statSub: {
    fontSize: 8,
    color: MUTED,
    marginTop: 3,
  },
  statDelta: {
    fontSize: 8,
    marginTop: 3,
  },
  // Mini status boxes
  miniStatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStat: {
    flex: 1,
    borderRadius: 6,
    padding: '8 10',
    borderLeft: `3px solid ${BLUE}`,
    backgroundColor: SURFACE,
  },
  miniLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  miniValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  miniSub: {
    fontSize: 7.5,
    color: MUTED,
    marginTop: 1,
  },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: '6 8',
    borderRadius: '4 4 0 0',
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '5 8',
    borderBottom: `1px solid ${BORDER}`,
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: '5 8',
    borderBottom: `1px solid ${BORDER}`,
    backgroundColor: SURFACE,
  },
  thCell: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tdCell: {
    fontSize: 8.5,
    color: DARK,
  },
  tdMuted: {
    fontSize: 8.5,
    color: MUTED,
  },
  // Badge
  badge: {
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
  },
  // Alert box
  alertBox: {
    flexDirection: 'row',
    backgroundColor: AMBER_BG,
    border: `1px solid #FCD34D`,
    borderLeft: `4px solid ${AMBER}`,
    borderRadius: 6,
    padding: '10 14',
    marginBottom: 12,
    alignItems: 'flex-start',
    gap: 10,
  },
  alertText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#92400E',
  },
  alertSub: {
    fontSize: 8.5,
    color: '#B45309',
    marginTop: 3,
  },
  // Body text
  bodyText: {
    fontSize: 9.5,
    lineHeight: 1.65,
    color: DARK,
  },
  footer: {
    position: 'absolute',
    bottom: PAD,
    left: PAD,
    right: PAD,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: `1px solid ${BORDER}`,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7.5,
    color: MUTED,
  },
})

function pct(curr: number, total: number): string {
  if (total === 0) return '0.0%'
  return ((curr / total) * 100).toFixed(1) + '%'
}

function deltaStr(curr: number, prev: number): string {
  if (prev === 0) return curr > 0 ? '+100%' : '—'
  const p = ((curr - prev) / prev) * 100
  return (p >= 0 ? '↑ +' : '↓ ') + Math.abs(p).toFixed(1) + '%'
}

function deltaColor(curr: number, prev: number): string {
  return curr >= prev ? GREEN : RED
}

function sumByJenis(txs: Transaction[], jenis: string[]): number {
  return txs.filter(t => jenis.includes(t.jenis_transaksi)).reduce((s, t) => s + (t.nominal || 0), 0)
}

function nextMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 1)
  return monthLabelFromYM(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
}

function SlideFooter({ bulan, gen }: { bulan: string; gen: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Laporan Bulanan Sarpras MAF · {monthLabelFromYM(bulan)}</Text>
      <Text style={s.footerText}>Dibuat {gen}</Text>
    </View>
  )
}

export default function LaporanBulananPDF({
  bulan,
  prevBulan,
  programs,
  transactions,
  prevTransactions,
  progressByProgram,
  prevProgressByProgram,
  catatanEvaluasi,
  rencana,
  generatedAt,
}: LaporanPDFProps) {
  const bulanLabel = monthLabelFromYM(bulan)
  const prevBulanLabel = monthLabelFromYM(prevBulan)

  // Kumulatif dari data program
  const totalAnggaran = programs.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const realisasiKumulatif = programs.reduce((s, p) => s + (p.realisasi_terkini || 0), 0)
  const sisaAnggaran = totalAnggaran - realisasiKumulatif
  const penyerapanPct = totalAnggaran > 0 ? (realisasiKumulatif / totalAnggaran) * 100 : 0

  // Progress rata-rata
  const avgProgress = programs.length > 0
    ? programs.reduce((s, p) => s + (progressByProgram[p.id] ?? p.progress_percent ?? 0), 0) / programs.length
    : 0
  const avgProgressPrev = programs.length > 0
    ? programs.reduce((s, p) => s + (prevProgressByProgram[p.id] ?? 0), 0) / programs.length
    : 0

  // Status counts
  const statusCount: Record<string, number> = {}
  programs.forEach(p => { statusCount[p.status] = (statusCount[p.status] || 0) + 1 })

  // Over-budget
  const overBudget = programs.filter(p => (p.realisasi_terkini || 0) > (p.total_anggaran || 0) && (p.total_anggaran || 0) > 0)

  // Keuangan bulan ini
  const masukIni = sumByJenis(transactions, ['Masuk'])
  const keluarIni = sumByJenis(transactions, ['Keluar', 'Keluar PBB'])
  const masukPrev = sumByJenis(prevTransactions, ['Masuk'])
  const keluarPrev = sumByJenis(prevTransactions, ['Keluar', 'Keluar PBB'])

  const isAtRisk = overBudget.length > 0
  const statusColors = STATUS_COLORS as Record<string, string>

  // Bar visual (percentage as width string)
  const penyerapanBarW = Math.min(penyerapanPct, 100).toFixed(1) + '%'

  return (
    <Document>

      {/* ─── SLIDE 1: COVER ─── */}
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Top blue accent bar */}
        <View style={{ backgroundColor: BLUE, height: 4, marginBottom: 20, borderRadius: 2 }} />

        <View style={{ flexDirection: 'row', gap: 24, flex: 1 }}>
          {/* Left column */}
          <View style={{ width: '38%' }}>
            {/* Logo + org */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <View style={{ width: 40, height: 40, backgroundColor: BLUE, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Helvetica-Bold' }}>PBB</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK }}>Peradaban Baik Bahagia</Text>
                <Text style={{ fontSize: 8.5, color: MUTED }}>Sarpras Madrasah Al-Fatih</Text>
              </View>
            </View>

            <View style={{ borderBottom: `1px solid ${BORDER}`, marginBottom: 16 }} />

            <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>LAPORAN BULANAN</Text>
            <Text style={{ fontSize: 26, fontFamily: 'Helvetica-Bold', color: DARK, lineHeight: 1.1, marginBottom: 4 }}>Sarpras MAF</Text>
            <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 20 }}>{bulanLabel}</Text>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={{ fontSize: 8, color: MUTED, width: 80 }}>Periode</Text>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{bulanLabel}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={{ fontSize: 8, color: MUTED, width: 80 }}>Dibandingkan</Text>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{prevBulanLabel}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={{ fontSize: 8, color: MUTED, width: 80 }}>Dibuat</Text>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{generatedAt}</Text>
              </View>
            </View>

            {/* Status badge */}
            <View style={{
              marginTop: 20,
              backgroundColor: isAtRisk ? AMBER_BG : GREEN_BG,
              border: `1px solid ${isAtRisk ? '#FCD34D' : '#A7F3D0'}`,
              borderRadius: 8,
              padding: '10 12',
            }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: isAtRisk ? '#92400E' : '#065F46', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                {isAtRisk ? '⚠ AT RISK' : '✓ ON TRACK'}
              </Text>
              <Text style={{ fontSize: 8, color: isAtRisk ? '#B45309' : '#047857' }}>
                {isAtRisk
                  ? `${overBudget.length} pekerjaan melebihi RAB`
                  : 'Semua pekerjaan dalam batas anggaran'}
              </Text>
            </View>
          </View>

          {/* Right column */}
          <View style={{ flex: 1 }}>
            {/* 4 key stats */}
            <View style={s.statRow}>
              <View style={s.statBoxBlue}>
                <Text style={s.statLabel}>Anggaran terserap</Text>
                <Text style={s.statValueBlue}>{penyerapanPct.toFixed(1)}%</Text>
                <Text style={s.statSub}>{formatRupiah(realisasiKumulatif)} dari {formatRupiah(totalAnggaran)}</Text>
              </View>
              <View style={s.statBoxGreen}>
                <Text style={s.statLabel}>Progress fisik rata-rata</Text>
                <Text style={s.statValueGreen}>{avgProgress.toFixed(1)}%</Text>
                <Text style={s.statSub}>{deltaStr(avgProgress, avgProgressPrev)} vs {prevBulanLabel}</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statLabel}>Sisa anggaran</Text>
                <Text style={{ ...s.statValue, fontSize: 16 }}>{formatRupiah(sisaAnggaran)}</Text>
                <Text style={s.statSub}>dari total {formatRupiah(totalAnggaran)}</Text>
              </View>
              <View style={isAtRisk ? s.statBoxAmber : s.statBox}>
                <Text style={s.statLabel}>Pekerjaan bermasalah</Text>
                <Text style={{ ...s.statValue, color: isAtRisk ? AMBER : GREEN }}>{overBudget.length}</Text>
                <Text style={s.statSub}>{isAtRisk ? 'over budget' : 'semua normal'}</Text>
              </View>
            </View>

            {/* Divider */}
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Status Pekerjaan</Text>

            {/* Status count boxes */}
            <View style={s.miniStatRow}>
              {Object.entries(statusColors).map(([status, color]) => (
                <View key={status} style={{ ...s.miniStat, borderLeft: `3px solid ${color}` }}>
                  <Text style={{ ...s.miniLabel, color }}>{status}</Text>
                  <Text style={{ ...s.miniValue, color }}>{statusCount[status] || 0}</Text>
                  <Text style={s.miniSub}>pekerjaan</Text>
                </View>
              ))}
            </View>

            {/* Penyerapan bar */}
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 7.5, color: MUTED }}>Penyerapan kumulatif</Text>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BLUE }}>{penyerapanPct.toFixed(1)}%</Text>
              </View>
              <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3 }}>
                <View style={{ height: 6, width: penyerapanBarW, backgroundColor: BLUE, borderRadius: 3 }} />
              </View>
            </View>
          </View>
        </View>

        <SlideFooter bulan={bulan} gen={generatedAt} />
      </Page>

      {/* ─── SLIDE 2: STATUS PROYEK ─── */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.slideHeader}>
          <View>
            <Text style={s.slideTitle}>Status Proyek</Text>
            <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{bulanLabel} — ringkasan kondisi seluruh pekerjaan</Text>
          </View>
          <Text style={s.slideBreadcrumb}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
        </View>

        {/* 4 big stats */}
        <View style={s.statRow}>
          <View style={s.statBoxBlue}>
            <Text style={s.statLabel}>Anggaran terserap (kumulatif)</Text>
            <Text style={s.statValueBlue}>{penyerapanPct.toFixed(1)}%</Text>
            <Text style={s.statSub}>{formatRupiah(realisasiKumulatif)} dari total {formatRupiah(totalAnggaran)}</Text>
          </View>
          <View style={s.statBoxGreen}>
            <Text style={s.statLabel}>Progress fisik rata-rata</Text>
            <Text style={s.statValueGreen}>{avgProgress.toFixed(1)}%</Text>
            <Text style={{ ...s.statSub, color: deltaColor(avgProgress, avgProgressPrev) }}>
              {deltaStr(avgProgress, avgProgressPrev)} vs {prevBulanLabel}
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Sisa anggaran</Text>
            <Text style={{ ...s.statValue, fontSize: 16 }}>{formatRupiah(sisaAnggaran)}</Text>
            <Text style={s.statSub}>cukup untuk {(sisaAnggaran / Math.max(keluarIni || 1, 1)).toFixed(0)} bln (asumsi burn rate saat ini)</Text>
          </View>
          <View style={isAtRisk ? s.statBoxAmber : s.statBoxGreen}>
            <Text style={s.statLabel}>Pekerjaan bermasalah</Text>
            <Text style={{ ...s.statValue, color: isAtRisk ? AMBER : GREEN }}>{overBudget.length}</Text>
            <Text style={s.statSub}>{isAtRisk ? overBudget.map(p => p.nama_pekerjaan.split(' ').slice(0, 3).join(' ')).join(', ') : 'semua dalam batas'}</Text>
          </View>
        </View>

        {/* Warning if over-budget */}
        {isAtRisk && overBudget.map(p => (
          <View key={p.id} style={s.alertBox}>
            <View style={{ flex: 1 }}>
              <Text style={s.alertText}>⚠ Perlu Perhatian: {p.nama_pekerjaan}</Text>
              <Text style={s.alertSub}>
                Realisasi {formatRupiah(p.realisasi_terkini || 0)} melebihi RAB {formatRupiah(p.total_anggaran || 0)} — selisih {formatRupiah((p.realisasi_terkini || 0) - (p.total_anggaran || 0))}
              </Text>
            </View>
          </View>
        ))}

        {/* Status grid */}
        <View style={{ marginTop: isAtRisk ? 4 : 14 }}>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Distribusi Status Pekerjaan</Text>
          <View style={s.miniStatRow}>
            {Object.entries(statusColors).map(([status, color]) => (
              <View key={status} style={{ ...s.miniStat, borderLeft: `3px solid ${color}` }}>
                <Text style={{ ...s.miniLabel, color }}>{status}</Text>
                <Text style={{ ...s.miniValue, color }}>{statusCount[status] || 0}</Text>
                <Text style={s.miniSub}>dari {programs.length} total</Text>
              </View>
            ))}
          </View>
        </View>

        <SlideFooter bulan={bulan} gen={generatedAt} />
      </Page>

      {/* ─── SLIDE 3: KEUANGAN KUMULATIF ─── */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.slideHeader}>
          <View>
            <Text style={s.slideTitle}>Keuangan s.d. {bulanLabel}</Text>
            <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>Realisasi kumulatif vs total anggaran · transaksi {bulanLabel}</Text>
          </View>
          <Text style={s.slideBreadcrumb}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          {/* Left: monthly transactions */}
          <View style={{ width: '50%' }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Transaksi {bulanLabel}</Text>
            <View style={{ gap: 8 }}>
              <View style={{ backgroundColor: SURFACE, borderRadius: 8, padding: '10 12', border: `1px solid ${BORDER}`, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ ...s.statLabel, marginBottom: 3 }}>Pengeluaran</Text>
                  <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: RED }}>{formatRupiah(keluarIni)}</Text>
                </View>
                <Text style={{ fontSize: 8, color: deltaColor(keluarIni, keluarPrev) }}>{deltaStr(keluarIni, keluarPrev)}</Text>
              </View>
              <View style={{ backgroundColor: SURFACE, borderRadius: 8, padding: '10 12', border: `1px solid ${BORDER}`, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ ...s.statLabel, marginBottom: 3 }}>Pemasukan</Text>
                  <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: GREEN }}>{formatRupiah(masukIni)}</Text>
                </View>
                <Text style={{ fontSize: 8, color: deltaColor(masukIni, masukPrev) }}>{deltaStr(masukIni, masukPrev)}</Text>
              </View>
              <View style={{ backgroundColor: masukIni >= keluarIni ? GREEN_BG : RED_BG, borderRadius: 8, padding: '10 12', border: `1px solid ${masukIni >= keluarIni ? '#A7F3D0' : '#FECACA'}` }}>
                <Text style={{ ...s.statLabel, marginBottom: 3 }}>Net {bulanLabel}</Text>
                <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: masukIni >= keluarIni ? GREEN : RED }}>
                  {masukIni >= keluarIni ? '+' : '-'}{formatRupiah(Math.abs(masukIni - keluarIni))}
                </Text>
                <Text style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>{masukIni >= keluarIni ? 'surplus' : 'defisit'} bulan ini</Text>
              </View>
            </View>

            {/* Burn rate note */}
            <View style={{ marginTop: 10, backgroundColor: BLUE_LIGHT, borderRadius: 6, padding: '8 10', border: `1px solid ${BLUE_MID}` }}>
              <Text style={{ fontSize: 8, color: '#1D4ED8' }}>
                Dengan pengeluaran {formatRupiah(keluarIni)}/bln, sisa anggaran {formatRupiah(sisaAnggaran)} mencukupi ±{keluarIni > 0 ? Math.floor(sisaAnggaran / keluarIni) : '∞'} bulan ke depan.
              </Text>
            </View>
          </View>

          {/* Right: cumulative breakdown */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Anggaran Kumulatif</Text>

            {/* Budget bar */}
            <View style={{ backgroundColor: SURFACE, borderRadius: 8, padding: '14 14', border: `1px solid ${BORDER}`, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 8, color: MUTED }}>Total anggaran</Text>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{formatRupiah(totalAnggaran)}</Text>
              </View>
              {/* Big progress bar */}
              <View style={{ height: 16, backgroundColor: '#E2E8F0', borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>
                <View style={{ height: 16, width: penyerapanBarW, backgroundColor: BLUE, borderRadius: 8 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: BLUE, borderRadius: 2 }} />
                  <Text style={{ fontSize: 8, color: MUTED }}>Terpakai {penyerapanPct.toFixed(1)}%</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: '#E2E8F0', borderRadius: 2 }} />
                  <Text style={{ fontSize: 8, color: MUTED }}>Sisa {(100 - penyerapanPct).toFixed(1)}%</Text>
                </View>
              </View>
            </View>

            {/* Three numbers */}
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '6 10', borderRadius: 6, backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
                <Text style={{ fontSize: 8.5, color: DARK }}>Total anggaran</Text>
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK }}>{formatRupiah(totalAnggaran)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '6 10', borderRadius: 6, backgroundColor: BLUE_LIGHT, border: `1px solid ${BLUE_MID}` }}>
                <Text style={{ fontSize: 8.5, color: DARK }}>Sudah terpakai (kumulatif)</Text>
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BLUE }}>{formatRupiah(realisasiKumulatif)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '6 10', borderRadius: 6, backgroundColor: GREEN_BG, border: `1px solid #A7F3D0` }}>
                <Text style={{ fontSize: 8.5, color: DARK }}>Sisa anggaran</Text>
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: GREEN }}>{formatRupiah(sisaAnggaran)}</Text>
              </View>
            </View>
          </View>
        </View>

        <SlideFooter bulan={bulan} gen={generatedAt} />
      </Page>

      {/* ─── SLIDE 4: STATUS PEKERJAAN ─── */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.slideHeader}>
          <View>
            <Text style={s.slideTitle}>Status Pekerjaan — {bulanLabel}</Text>
            <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>Progress terkini, RAB, dan realisasi per pekerjaan</Text>
          </View>
          <Text style={s.slideBreadcrumb}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
        </View>

        <View style={s.tableHeader}>
          <Text style={{ ...s.thCell, flex: 3 }}>Pekerjaan</Text>
          <Text style={{ ...s.thCell, flex: 2 }}>Vendor</Text>
          <Text style={{ ...s.thCell, flex: 1.5, textAlign: 'center' }}>Progress</Text>
          <Text style={{ ...s.thCell, flex: 1, textAlign: 'right' }}>Delta</Text>
          <Text style={{ ...s.thCell, flex: 2, textAlign: 'right' }}>RAB</Text>
          <Text style={{ ...s.thCell, flex: 2, textAlign: 'right' }}>Realisasi</Text>
          <Text style={{ ...s.thCell, flex: 1.5, textAlign: 'center' }}>Status</Text>
        </View>

        {programs.map((p, i) => {
          const prog = progressByProgram[p.id] ?? p.progress_percent ?? 0
          const prevProg = prevProgressByProgram[p.id] ?? 0
          const diff = prog - prevProg
          const color = statusColors[p.status] || MUTED
          const isOver = (p.realisasi_terkini || 0) > (p.total_anggaran || 0) && (p.total_anggaran || 0) > 0
          const rowStyle = isOver ? { ...s.tableRow, backgroundColor: '#FFF7ED' } : (i % 2 === 0 ? s.tableRow : s.tableRowAlt)
          return (
            <View key={p.id} style={rowStyle}>
              <Text style={{ ...s.tdCell, flex: 3, fontFamily: isOver ? 'Helvetica-Bold' : 'Helvetica', color: isOver ? RED : DARK }}>
                {isOver ? '⚠ ' : ''}{p.nama_pekerjaan}
              </Text>
              <Text style={{ ...s.tdMuted, flex: 2 }}>{p.vendor || '—'}</Text>
              {/* Progress with mini bar */}
              <View style={{ flex: 1.5, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ height: 5, width: '80%', backgroundColor: '#E2E8F0', borderRadius: 3, marginBottom: 2 }}>
                  <View style={{ height: 5, width: pct(prog, 100), backgroundColor: prog >= 100 ? GREEN : BLUE, borderRadius: 3 }} />
                </View>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: prog >= 100 ? GREEN : BLUE }}>{prog}%</Text>
              </View>
              <Text style={{ ...s.tdCell, flex: 1, textAlign: 'right', color: diff > 0 ? GREEN : diff < 0 ? RED : MUTED, fontFamily: diff !== 0 ? 'Helvetica-Bold' : 'Helvetica' }}>
                {diff > 0 ? '+' : ''}{diff !== 0 ? diff.toFixed(0) + '%' : '—'}
              </Text>
              <Text style={{ ...s.tdMuted, flex: 2, textAlign: 'right' }}>{formatRupiah(p.total_anggaran || 0)}</Text>
              <Text style={{ ...s.tdCell, flex: 2, textAlign: 'right', color: isOver ? RED : DARK }}>{formatRupiah(p.realisasi_terkini || 0)}</Text>
              <View style={{ flex: 1.5, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ backgroundColor: color + '22', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 }}>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color }}>{p.status}</Text>
                </View>
              </View>
            </View>
          )
        })}

        <SlideFooter bulan={bulan} gen={generatedAt} />
      </Page>

      {/* ─── SLIDE 5: EVALUASI & RENCANA ─── */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.slideHeader}>
          <View>
            <Text style={s.slideTitle}>Evaluasi & Rencana</Text>
            <Text style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{bulanLabel} → {nextMonthLabel(bulan)}</Text>
          </View>
          <Text style={s.slideBreadcrumb}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 16, flex: 1 }}>
          {/* Evaluasi */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <View style={{ width: 14, height: 14, backgroundColor: SURFACE, borderRadius: 3, border: `1px solid ${BORDER}`, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 8 }}>📋</Text>
              </View>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK }}>Evaluasi {bulanLabel}</Text>
            </View>
            <View style={{ backgroundColor: SURFACE, borderRadius: 8, padding: 14, border: `1px solid ${BORDER}`, flex: 1, minHeight: 140 }}>
              <Text style={s.bodyText}>
                {catatanEvaluasi || '(Belum diisi — tambahkan evaluasi dari halaman Laporan Bulanan di dashboard)'}
              </Text>
            </View>
          </View>

          {/* Rencana */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <View style={{ width: 14, height: 14, backgroundColor: BLUE_LIGHT, borderRadius: 3, border: `1px solid ${BLUE_MID}`, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 8 }}>🎯</Text>
              </View>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: BLUE }}>Rencana {nextMonthLabel(bulan)}</Text>
            </View>
            <View style={{ backgroundColor: BLUE_LIGHT, borderRadius: 8, padding: 14, border: `1px solid ${BLUE_MID}`, flex: 1, minHeight: 140 }}>
              <Text style={{ ...s.bodyText, color: '#1E3A5F' }}>
                {rencana || '(Belum diisi — tambahkan rencana bulan depan dari halaman Laporan Bulanan di dashboard)'}
              </Text>
            </View>
          </View>
        </View>

        {/* Generated footer note */}
        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'center' }}>
          <Text style={{ fontSize: 8, color: MUTED, textAlign: 'center' }}>
            Laporan ini dibuat otomatis dari dashboard Sarpras MAF · {generatedAt}
          </Text>
        </View>

        <SlideFooter bulan={bulan} gen={generatedAt} />
      </Page>

    </Document>
  )
}

// Suppress unused import warning
void (undefined as unknown as ProgramSnapshot)
