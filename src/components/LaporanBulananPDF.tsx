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
const DARK = '#1E293B'
const MUTED = '#64748B'
const BORDER = '#E2E8F0'
const PAGE_PADDING = 40

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: DARK,
    backgroundColor: '#FFFFFF',
    paddingTop: PAGE_PADDING,
    paddingBottom: PAGE_PADDING,
    paddingHorizontal: PAGE_PADDING,
  },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 10, marginTop: 16 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 12, border: `1px solid ${BORDER}` },
  statLabel: { fontSize: 8, color: MUTED, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  statValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK },
  statDelta: { fontSize: 9, marginTop: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: '6 8', borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', padding: '5 8', borderBottom: `1px solid ${BORDER}` },
  tableCell: { fontSize: 9 },
  tableCellBold: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  badge: { borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  bodyText: { fontSize: 10, lineHeight: 1.6, color: DARK },
  mutedText: { fontSize: 9, color: MUTED },
})

function deltaStr(curr: number, prev: number): string {
  if (prev === 0) return curr > 0 ? '+100%' : '—'
  const pct = ((curr - prev) / prev) * 100
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%'
}

function deltaColor(curr: number, prev: number): string {
  return curr >= prev ? '#059669' : '#DC2626'
}

function sumByJenis(txs: Transaction[], jenis: string | string[]): number {
  const list = Array.isArray(jenis) ? jenis : [jenis]
  return txs.filter(t => list.includes(t.jenis_transaksi)).reduce((s, t) => s + (t.nominal || 0), 0)
}

function nextMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 1)
  return monthLabelFromYM(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
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

  const totalAnggaran = programs.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const realisasi = programs.reduce((s, p) => s + (p.realisasi_terkini || 0), 0)
  const penyerapan = totalAnggaran > 0 ? (realisasi / totalAnggaran) * 100 : 0

  const masukIni = sumByJenis(transactions, 'Masuk')
  const keluarIni = sumByJenis(transactions, ['Keluar', 'Keluar PBB'])
  const masukPrev = sumByJenis(prevTransactions, 'Masuk')
  const keluarPrev = sumByJenis(prevTransactions, ['Keluar', 'Keluar PBB'])

  const avgProgress = programs.length > 0
    ? programs.reduce((s, p) => s + (progressByProgram[p.id] ?? p.progress_percent ?? 0), 0) / programs.length
    : 0
  const avgProgressPrev = programs.length > 0
    ? programs.reduce((s, p) => s + (prevProgressByProgram[p.id] ?? 0), 0) / programs.length
    : 0

  const statusCount: Record<string, number> = {}
  programs.forEach(p => { statusCount[p.status] = (statusCount[p.status] || 0) + 1 })

  return (
    <Document>
      {/* HALAMAN 1: COVER */}
      <Page size="A4" style={s.page}>
        <View style={{ marginTop: 60 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <View style={{ width: 48, height: 48, backgroundColor: BLUE, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Helvetica-Bold' }}>PBB</Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: DARK }}>Peradaban Baik Bahagia</Text>
              <Text style={{ fontSize: 10, color: MUTED }}>Sarpras Madrasah Al-Fatih</Text>
            </View>
          </View>
          <View style={{ borderBottom: `2px solid ${BLUE}`, marginVertical: 20 }} />
          <Text style={{ fontSize: 28, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 6 }}>Laporan Bulanan</Text>
          <Text style={{ fontSize: 14, color: DARK, marginBottom: 4 }}>Perkembangan Sarpras & Keuangan</Text>
          <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: DARK, marginTop: 8, marginBottom: 24 }}>{bulanLabel}</Text>
          <View style={{ borderBottom: `2px solid ${BLUE}`, marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', gap: 24, marginTop: 8 }}>
            <View>
              <Text style={s.mutedText}>Periode</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{bulanLabel}</Text>
            </View>
            <View>
              <Text style={s.mutedText}>Dibandingkan dengan</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{prevBulanLabel}</Text>
            </View>
            <View>
              <Text style={s.mutedText}>Dibuat</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{generatedAt}</Text>
            </View>
          </View>
          <View style={{ ...s.statRow, marginTop: 32 }}>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <View key={status} style={{ ...s.statBox, borderLeft: `3px solid ${color}` }}>
                <Text style={{ ...s.statLabel, color }}>{status}</Text>
                <Text style={{ ...s.statValue, fontSize: 20 }}>{statusCount[status] || 0}</Text>
                <Text style={s.mutedText}>pekerjaan</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>

      {/* HALAMAN 2: RINGKASAN EKSEKUTIF */}
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
        <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 16 }}>Ringkasan Eksekutif</Text>
        <View style={{ borderBottom: `2px solid ${BLUE}`, marginBottom: 20 }} />
        <Text style={s.sectionTitle}>Anggaran & Realisasi</Text>
        <View style={s.statRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Total Anggaran</Text>
            <Text style={{ ...s.statValue, fontSize: 13 }}>{formatRupiah(totalAnggaran)}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Total Realisasi</Text>
            <Text style={{ ...s.statValue, fontSize: 13 }}>{formatRupiah(realisasi)}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Penyerapan</Text>
            <Text style={{ ...s.statValue, color: BLUE }}>{penyerapan.toFixed(1)}%</Text>
          </View>
        </View>
        <Text style={s.sectionTitle}>Transaksi {bulanLabel} vs {prevBulanLabel}</Text>
        <View style={s.statRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Dana Masuk</Text>
            <Text style={{ ...s.statValue, fontSize: 13, color: '#059669' }}>{formatRupiah(masukIni)}</Text>
            <Text style={{ ...s.statDelta, color: deltaColor(masukIni, masukPrev) }}>
              {deltaStr(masukIni, masukPrev)} vs {prevBulanLabel}
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Dana Keluar</Text>
            <Text style={{ ...s.statValue, fontSize: 13, color: '#DC2626' }}>{formatRupiah(keluarIni)}</Text>
            <Text style={{ ...s.statDelta, color: deltaColor(keluarIni, keluarPrev) }}>
              {deltaStr(keluarIni, keluarPrev)} vs {prevBulanLabel}
            </Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Net Bulan Ini</Text>
            <Text style={{ ...s.statValue, fontSize: 13, color: masukIni - keluarIni >= 0 ? '#059669' : '#DC2626' }}>
              {formatRupiah(Math.abs(masukIni - keluarIni))}
            </Text>
            <Text style={s.mutedText}>{masukIni >= keluarIni ? 'surplus' : 'defisit'}</Text>
          </View>
        </View>
        <Text style={s.sectionTitle}>Progress Keseluruhan Pekerjaan</Text>
        <View style={s.statRow}>
          <View style={{ ...s.statBox, flex: 2 }}>
            <Text style={s.statLabel}>Rata-rata Progress {bulanLabel}</Text>
            <Text style={{ ...s.statValue, fontSize: 20, color: BLUE }}>{avgProgress.toFixed(1)}%</Text>
            <Text style={{ ...s.statDelta, color: deltaColor(avgProgress, avgProgressPrev) }}>
              {deltaStr(avgProgress, avgProgressPrev)} vs {prevBulanLabel}
            </Text>
          </View>
          <View style={{ ...s.statBox, flex: 1 }}>
            <Text style={s.statLabel}>Total Program</Text>
            <Text style={{ ...s.statValue, fontSize: 20 }}>{programs.length}</Text>
            <Text style={s.mutedText}>pekerjaan aktif</Text>
          </View>
        </View>
      </Page>

      {/* HALAMAN 3: DETAIL PEKERJAAN */}
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
        <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 16 }}>Detail Pekerjaan</Text>
        <View style={{ borderBottom: `2px solid ${BLUE}`, marginBottom: 20 }} />
        <View style={s.tableHeader}>
          <Text style={{ ...s.tableCellBold, flex: 3 }}>Pekerjaan</Text>
          <Text style={{ ...s.tableCellBold, flex: 2 }}>Vendor</Text>
          <Text style={{ ...s.tableCellBold, flex: 1, textAlign: 'right' }}>Progress</Text>
          <Text style={{ ...s.tableCellBold, flex: 1, textAlign: 'right' }}>Delta</Text>
          <Text style={{ ...s.tableCellBold, flex: 1, textAlign: 'center' }}>Status</Text>
        </View>
        {programs.map(p => {
          const prog = progressByProgram[p.id] ?? p.progress_percent ?? 0
          const prevProg = prevProgressByProgram[p.id] ?? 0
          const diff = prog - prevProg
          const color = STATUS_COLORS[p.status] || MUTED
          return (
            <View key={p.id} style={s.tableRow}>
              <Text style={{ ...s.tableCell, flex: 3 }}>{p.nama_pekerjaan}</Text>
              <Text style={{ ...s.tableCell, flex: 2, color: MUTED }}>{p.vendor}</Text>
              <Text style={{ ...s.tableCellBold, flex: 1, textAlign: 'right', color: BLUE }}>{prog}%</Text>
              <Text style={{ ...s.tableCell, flex: 1, textAlign: 'right', color: diff > 0 ? '#059669' : diff < 0 ? '#DC2626' : MUTED }}>
                {diff > 0 ? '+' : ''}{diff !== 0 ? diff.toFixed(0) + '%' : '—'}
              </Text>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ ...s.badge, backgroundColor: color + '20', color }}>{p.status}</Text>
              </View>
            </View>
          )
        })}
      </Page>

      {/* HALAMAN 4: DETAIL KEUANGAN */}
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
        <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 16 }}>Detail Keuangan</Text>
        <View style={{ borderBottom: `2px solid ${BLUE}`, marginBottom: 20 }} />
        <Text style={s.sectionTitle}>Transaksi Bulan {bulanLabel}</Text>
        {transactions.length === 0 ? (
          <Text style={s.mutedText}>Tidak ada transaksi pada bulan ini.</Text>
        ) : (
          <>
            <View style={s.tableHeader}>
              <Text style={{ ...s.tableCellBold, flex: 1.5 }}>Tanggal</Text>
              <Text style={{ ...s.tableCellBold, flex: 3 }}>Keterangan</Text>
              <Text style={{ ...s.tableCellBold, flex: 1, textAlign: 'center' }}>Jenis</Text>
              <Text style={{ ...s.tableCellBold, flex: 2, textAlign: 'right' }}>Nominal</Text>
            </View>
            {transactions.slice(0, 30).map((t, i) => {
              const isKeluar = t.jenis_transaksi.startsWith('Keluar')
              return (
                <View key={t.id ?? i} style={s.tableRow}>
                  <Text style={{ ...s.tableCell, flex: 1.5, color: MUTED }}>{t.tanggal ? t.tanggal.slice(0, 10) : '—'}</Text>
                  <Text style={{ ...s.tableCell, flex: 3 }}>{t.deskripsi || t.nama_pekerjaan || '—'}</Text>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ ...s.badge, backgroundColor: isKeluar ? 'rgba(220,38,38,0.1)' : 'rgba(5,150,105,0.1)', color: isKeluar ? '#DC2626' : '#059669' }}>
                      {isKeluar ? 'Keluar' : 'Masuk'}
                    </Text>
                  </View>
                  <Text style={{ ...s.tableCellBold, flex: 2, textAlign: 'right', color: isKeluar ? '#DC2626' : '#059669' }}>
                    {formatRupiah(t.nominal || 0)}
                  </Text>
                </View>
              )
            })}
            {transactions.length > 30 && (
              <Text style={{ ...s.mutedText, marginTop: 6 }}>
                + {transactions.length - 30} transaksi lainnya (lihat dashboard untuk detail lengkap)
              </Text>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
              <Text style={{ fontSize: 10, color: '#059669', fontFamily: 'Helvetica-Bold' }}>Masuk: {formatRupiah(masukIni)}</Text>
              <Text style={{ fontSize: 10, color: '#DC2626', fontFamily: 'Helvetica-Bold' }}>Keluar: {formatRupiah(keluarIni)}</Text>
            </View>
          </>
        )}
      </Page>

      {/* HALAMAN 5: EVALUASI & RENCANA */}
      <Page size="A4" style={s.page}>
        <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
        <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 16 }}>Evaluasi & Rencana</Text>
        <View style={{ borderBottom: `2px solid ${BLUE}`, marginBottom: 20 }} />
        <Text style={{ ...s.sectionTitle, marginTop: 0 }}>Catatan Evaluasi — {bulanLabel}</Text>
        <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 16, border: `1px solid ${BORDER}`, marginBottom: 20, minHeight: 120 }}>
          <Text style={s.bodyText}>{catatanEvaluasi || '(Belum diisi)'}</Text>
        </View>
        <Text style={s.sectionTitle}>Rencana Eksekusi — {nextMonthLabel(bulan)}</Text>
        <View style={{ backgroundColor: '#F0F9FF', borderRadius: 8, padding: 16, border: `1px solid #BAE6FD`, minHeight: 120 }}>
          <Text style={s.bodyText}>{rencana || '(Belum diisi)'}</Text>
        </View>
        <View style={{ position: 'absolute', bottom: PAGE_PADDING, left: PAGE_PADDING, right: PAGE_PADDING }}>
          <View style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.mutedText}>Laporan Bulanan Sarpras MAF · {bulanLabel}</Text>
            <Text style={s.mutedText}>Dibuat: {generatedAt}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// Suppress unused import warning — ProgramSnapshot is part of the public API contract
void (undefined as unknown as ProgramSnapshot)
