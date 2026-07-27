import { useEffect, useState } from 'react'
import { fetchPrograms, fetchTransactions, Program } from '../lib/supabase'
import { formatRupiah } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'

interface Row {
  program: Program
  masuk: number
  keluar: number
  saldo: number
  sisaPengajuan: number
}

interface Unmatched {
  masuk: number
  keluar: number
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--border)',
  backgroundColor: 'var(--surface-2)',
}

const tdStyle: React.CSSProperties = {
  padding: '11px 12px',
  verticalAlign: 'middle',
  borderBottom: '1px solid var(--surface-min)',
}

export default function SaldoPekerjaanPanel() {
  const width = useWindowWidth()
  const isMobile = width < 600
  const [rows, setRows] = useState<Row[]>([])
  const [unmatched, setUnmatched] = useState<Unmatched>({ masuk: 0, keluar: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchPrograms(), fetchTransactions()]).then(([pRes, tRes]) => {
      if (!pRes.data || !tRes.data) { setLoading(false); return }
      const txs = tRes.data
      const programNames = new Set(pRes.data.map(p => p.nama_pekerjaan))

      const computed: Row[] = pRes.data.map(p => {
        const masuk = txs
          .filter(t => t.nama_pekerjaan === p.nama_pekerjaan && t.jenis_transaksi === 'Masuk')
          .reduce((s, t) => s + (t.nominal || 0), 0)
        const keluar = txs
          .filter(t => t.nama_pekerjaan === p.nama_pekerjaan && (t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB'))
          .reduce((s, t) => s + (t.nominal || 0), 0)
        return { program: p, masuk, keluar, saldo: masuk - keluar, sisaPengajuan: (p.total_anggaran || 0) - masuk }
      })

      // Talangan (saldo negatif) naik ke atas
      computed.sort((a, b) => {
        if (a.saldo < 0 && b.saldo >= 0) return -1
        if (a.saldo >= 0 && b.saldo < 0) return 1
        return a.program.nama_pekerjaan.localeCompare(b.program.nama_pekerjaan)
      })

      // Transaksi yang nama_pekerjaan-nya tidak cocok ke program manapun (Man Power, dll)
      const unmatchedMasuk = txs
        .filter(t => !programNames.has(t.nama_pekerjaan) && t.jenis_transaksi === 'Masuk')
        .reduce((s, t) => s + (t.nominal || 0), 0)
      const unmatchedKeluar = txs
        .filter(t => !programNames.has(t.nama_pekerjaan) && (t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB'))
        .reduce((s, t) => s + (t.nominal || 0), 0)

      setRows(computed)
      setUnmatched({ masuk: unmatchedMasuk, keluar: unmatchedKeluar })
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Memuat data…</div>
  }

  const totalMasuk = rows.reduce((s, r) => s + r.masuk, 0) + unmatched.masuk
  const totalKeluar = rows.reduce((s, r) => s + r.keluar, 0) + unmatched.keluar
  const saldoKas = totalMasuk - totalKeluar
  const talanganRows = rows.filter(r => r.saldo < 0)
  const totalTalangan = talanganRows.reduce((s, r) => s + Math.abs(r.saldo), 0)

  const SummaryCard = ({ label, value, color, bg, sub }: { label: string; value: number; color: string; bg: string; sub?: string }) => (
    <div style={{ flex: 1, minWidth: 140, background: bg, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color, marginTop: 5, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(value)}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <SummaryCard
          label="Saldo Kas"
          value={saldoKas}
          color={saldoKas >= 0 ? '#1B5E2B' : '#660000'}
          bg={saldoKas >= 0 ? 'rgba(27,94,43,0.08)' : 'rgba(102,0,0,0.08)'}
          sub="Total masuk − keluar"
        />
        <SummaryCard label="Total Dana Masuk" value={totalMasuk} color="#1A6FE8" bg="rgba(26,111,232,0.07)" sub={`${rows.filter(r => r.masuk > 0).length} pekerjaan`} />
        <SummaryCard label="Total Dana Keluar" value={totalKeluar} color="#660000" bg="rgba(102,0,0,0.07)" />
        {totalTalangan > 0 && (
          <SummaryCard
            label="Total Talangan"
            value={totalTalangan}
            color="#D97706"
            bg="rgba(217,119,6,0.09)"
            sub={`${talanganRows.length} pekerjaan perlu dana`}
          />
        )}
      </div>

      {/* Tabel */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? 12 : 13 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'center', width: 40 }}>No</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Nama Pekerjaan</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Dana Masuk</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Dana Keluar</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Saldo</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Sisa Pengajuan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isTalangan = r.saldo < 0
              return (
                <tr
                  key={r.program.id}
                  style={{ backgroundColor: isTalangan ? 'rgba(217,119,6,0.04)' : 'transparent' }}
                >
                  <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{r.program.nama_pekerjaan}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.program.status}</div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: r.masuk > 0 ? '#1B5E2B' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {r.masuk > 0 ? formatRupiah(r.masuk) : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: r.keluar > 0 ? '#660000' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {r.keluar > 0 ? formatRupiah(r.keluar) : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {r.saldo === 0 ? (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 700, color: isTalangan ? '#D97706' : '#1B5E2B' }}>
                          {isTalangan ? '−' : '+'}{formatRupiah(Math.abs(r.saldo))}
                        </div>
                        {isTalangan && (
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', backgroundColor: 'rgba(217,119,6,0.13)', borderRadius: 20, padding: '1px 7px', display: 'inline-block', marginTop: 2 }}>
                            TALANGAN
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: r.sisaPengajuan <= 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {r.sisaPengajuan > 0 ? formatRupiah(r.sisaPengajuan) : (r.sisaPengajuan === 0 ? '—' : <span style={{ color: '#660000' }}>Over RAB</span>)}
                  </td>
                </tr>
              )
            })}
          {/* Baris transaksi tidak terkait program (Man Power, biaya umum, dll) */}
          {(unmatched.masuk > 0 || unmatched.keluar > 0) && (
            <tr style={{ backgroundColor: 'var(--surface-2)', opacity: 0.8 }}>
              <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>—</td>
              <td style={tdStyle}>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Operasional / Tidak Terkait Pekerjaan</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Man Power, honor, biaya umum</div>
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: unmatched.masuk > 0 ? '#1B5E2B' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {unmatched.masuk > 0 ? formatRupiah(unmatched.masuk) : '—'}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: unmatched.keluar > 0 ? '#660000' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {unmatched.keluar > 0 ? formatRupiah(unmatched.keluar) : '—'}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-muted)' }}>—</td>
              <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-muted)' }}>—</td>
            </tr>
          )}
          </tbody>
          {/* Total row */}
          <tfoot>
            <tr style={{ backgroundColor: 'var(--surface-2)', borderTop: '2px solid var(--border)' }}>
              <td colSpan={2} style={{ ...tdStyle, fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Total
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#1B5E2B', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(totalMasuk)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#660000', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(totalKeluar)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: saldoKas >= 0 ? '#1B5E2B' : '#660000', fontVariantNumeric: 'tabular-nums' }}>
                {saldoKas >= 0 ? '+' : '−'}{formatRupiah(Math.abs(saldoKas))}
              </td>
              <td style={tdStyle} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
        Dana Masuk & Keluar dihitung otomatis dari riwayat transaksi. Sisa Pengajuan = Total Anggaran − Dana Masuk.
      </div>
    </div>
  )
}
