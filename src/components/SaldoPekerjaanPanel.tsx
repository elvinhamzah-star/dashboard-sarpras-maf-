import { useEffect, useState } from 'react'
import { fetchPrograms, fetchTransactions, invalidateCache, Program } from '../lib/supabase'
import { formatRupiah, STATUS_COLORS, STATUS_BG } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import { MOBILE_BREAKPOINT } from '../lib/breakpoint'
import EditDanaMasukModal from './EditDanaMasukModal'

interface Row {
  program: Program
  masuk: number
  keluar: number
  saldo: number
  sisaPengajuan: number
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
  const isMobile = width < MOBILE_BREAKPOINT
  const [rows, setRows] = useState<Row[]>([])
  const [unmatchedKeluar, setUnmatchedKeluar] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editingRow, setEditingRow] = useState<Row | null>(null)

  const loadData = () => {
    Promise.all([fetchPrograms(), fetchTransactions()]).then(([pRes, tRes]) => {
      if (!pRes.data || !tRes.data) { setLoading(false); return }
      const txs = tRes.data
      const programNames = new Set(pRes.data.map(p => p.nama_pekerjaan))

      const computed: Row[] = pRes.data.map(p => {
        const masuk = p.dana_masuk || 0
        const keluar = txs
          .filter(t => t.nama_pekerjaan === p.nama_pekerjaan && (t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB'))
          .reduce((s, t) => s + (t.nominal || 0), 0)
        return { program: p, masuk, keluar, saldo: masuk - keluar, sisaPengajuan: (p.total_anggaran || 0) - masuk }
      })

      // Urutan sama seperti Halaman Pekerjaan (P-001 -> P-025), biar gak bikin bingung
      computed.sort((a, b) => a.program.id.localeCompare(b.program.id))

      // Keluar yang tidak terkait pekerjaan spesifik (Man Power, dll)
      const unmatched = txs
        .filter(t => !programNames.has(t.nama_pekerjaan) && (t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB'))
        .reduce((s, t) => s + (t.nominal || 0), 0)

      setRows(computed)
      setUnmatchedKeluar(unmatched)
      setLoading(false)
    })
  }

  useEffect(() => { loadData() }, [])

  const handleDanaMasukSaved = (programId: string, nominal: number) => {
    invalidateCache('programs')
    setRows(prev => prev.map(r => {
      if (r.program.id !== programId) return r
      const masuk = nominal
      const saldo = masuk - r.keluar
      const sisaPengajuan = (r.program.total_anggaran || 0) - masuk
      return { ...r, masuk, saldo, sisaPengajuan, program: { ...r.program, dana_masuk: nominal } }
    }).sort((a, b) => a.program.id.localeCompare(b.program.id)))
  }

  if (loading) {
    return <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Memuat data…</div>
  }

  const totalMasuk = rows.reduce((s, r) => s + r.masuk, 0)
  const totalKeluar = rows.reduce((s, r) => s + r.keluar, 0) + unmatchedKeluar
  const saldoKas = totalMasuk - totalKeluar
  const talanganRows = rows.filter(r => r.saldo < 0)
  const totalTalangan = talanganRows.reduce((s, r) => s + Math.abs(r.saldo), 0)

  const saldoColor = saldoKas >= 0 ? '#1B5E2B' : 'var(--color-danger)'

  return (
    <div>
      {/* Summary cards — cuma 2: Saldo Kas (dgn breakdown) + Talangan (sinyal utama) */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, background: 'var(--card)', border: '1px solid var(--border)', borderTop: `2px solid ${saldoKas >= 0 ? 'rgba(27,94,43,0.4)' : 'rgba(102,0,0,0.4)'}`, borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: saldoColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Saldo Kas</div>
          <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 5, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(saldoKas)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Masuk {formatRupiah(totalMasuk)} &middot; Keluar {formatRupiah(totalKeluar)}
          </div>
        </div>
        {totalTalangan > 0 && (
          <div style={{ flex: 1, minWidth: 200, background: 'var(--card)', border: '1px solid var(--border)', borderTop: '2px solid rgba(217,119,6,0.5)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#B45309', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Talangan</div>
            <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 5, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(totalTalangan)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{talanganRows.length} Pekerjaan</div>
          </div>
        )}
      </div>

      {/* Tabel */}
      <style>{`.saldo-row:hover td { background-color: var(--surface-2); }`}</style>
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? 11 : 12 }}>
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
                  className="saldo-row"
                  style={{ backgroundColor: isTalangan ? 'rgba(217,119,6,0.1)' : 'transparent' }}
                >
                  <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>{r.program.nama_pekerjaan}</div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 600, backgroundColor: STATUS_BG[r.program.status] || 'var(--surface-2)', color: STATUS_COLORS[r.program.status] || 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'currentColor', flexShrink: 0 }} />
                      {r.program.status}
                    </span>
                  </td>

                  {/* Dana Masuk — teks biasa (bukan angka utama), buka modal buat edit */}
                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => setEditingRow(r)}
                      title="Klik untuk ubah dana masuk"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontWeight: 400,
                        fontSize: 'inherit',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        color: 'var(--text-secondary)',
                        fontFamily: 'inherit',
                      }}
                    >
                      {r.masuk > 0 ? formatRupiah(r.masuk) : '—'}
                      <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ opacity: 0.4, flexShrink: 0 }}>
                        <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  </td>

                  {/* Dana Keluar — teks biasa juga, bukan angka utama */}
                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 400, color: r.keluar > 0 ? 'var(--text-secondary)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {r.keluar > 0 ? formatRupiah(r.keluar) : '—'}
                  </td>

                  {/* Saldo — angka utama: bold hitam, tanpa tanda plus. Baris talangan
                      ditandai lewat tint background (di atas), minus sudah cukup jelasin defisit. */}
                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {r.saldo === 0 ? (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    ) : (
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {isTalangan ? '−' : ''}{formatRupiah(Math.abs(r.saldo))}
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: r.sisaPengajuan <= 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {r.sisaPengajuan > 0 ? formatRupiah(r.sisaPengajuan) : (r.sisaPengajuan === 0 ? '—' : <span style={{ color: 'var(--color-danger)' }}>Over RAB</span>)}
                  </td>
                </tr>
              )
            })}

            {/* Transaksi Keluar yang nama_pekerjaan-nya tak cocok ke program manapun
                (mis. nama pekerjaan direname/dihapus setelah transaksi dicatat) */}
            {unmatchedKeluar > 0 && (
              <tr style={{ backgroundColor: 'var(--surface-2)', opacity: 0.8 }}>
                <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>—</td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Tidak Terkait Pekerjaan Manapun</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Nama pekerjaan di transaksi tak cocok ke daftar pekerjaan saat ini</div>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-muted)' }}>—</td>
                <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatRupiah(unmatchedKeluar)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-muted)' }}>—</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-muted)' }}>—</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: 'var(--surface-2)', borderTop: '2px solid var(--border)' }}>
              <td colSpan={2} style={{ ...tdStyle, fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Total
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(totalMasuk)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(totalKeluar)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {saldoKas < 0 ? '−' : ''}{formatRupiah(Math.abs(saldoKas))}
              </td>
              <td style={tdStyle} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
        Klik nominal di kolom Dana Masuk untuk ubah alokasi per pekerjaan. Dana Keluar otomatis dari transaksi. Sisa Pengajuan = Total Anggaran − Dana Masuk.
      </div>

      {editingRow && (
        <EditDanaMasukModal
          programId={editingRow.program.id}
          namaPekerjaan={editingRow.program.nama_pekerjaan}
          currentValue={editingRow.masuk}
          onClose={() => setEditingRow(null)}
          onSuccess={nominal => handleDanaMasukSaved(editingRow.program.id, nominal)}
        />
      )}
    </div>
  )
}
