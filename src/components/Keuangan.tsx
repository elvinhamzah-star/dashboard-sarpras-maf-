import { useEffect, useState } from 'react'
import { fetchTransactions, Transaction } from '../lib/supabase'
import { formatRupiah, formatTanggal, TRANSACTION_COLORS } from '../lib/data'
import AddTransactionModal from './AddTransactionModal'

interface KeuanganProps {
  isAdmin?: boolean
}

const JENIS_ICONS: Record<string, JSX.Element> = {
  Masuk: (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  ),
  Keluar: (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>
  ),
  'Keluar PBB': (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>
  ),
}

export default function Keuangan({ isAdmin = false }: KeuanganProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterJenis, setFilterJenis] = useState<string>('Semua')
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSerapan, setShowSerapan] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await fetchTransactions()
      if (data) setTransactions(data.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()))
      setLoading(false)
    }
    load()
  }, [])

  const masukList = transactions.filter(t => t.jenis_transaksi === 'Masuk')
  const keluarList = transactions.filter(t => t.jenis_transaksi === 'Keluar')
  const keluarPBBList = transactions.filter(t => t.jenis_transaksi === 'Keluar PBB')

  const totalMasuk = masukList.reduce((s, t) => s + (t.nominal || 0), 0)
  const totalKeluar = keluarList.reduce((s, t) => s + (t.nominal || 0), 0)
  const totalKeluarPBB = keluarPBBList.reduce((s, t) => s + (t.nominal || 0), 0)
  const totalDeployment = totalMasuk + totalKeluarPBB
  const saldoKas = totalMasuk - totalKeluar

  const filtered = filterJenis === 'Semua'
    ? transactions
    : transactions.filter(t => t.jenis_transaksi === filterJenis)

  const itemsPerPage = 20
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const start = (page - 1) * itemsPerPage
  const paged = filtered.slice(start, start + itemsPerPage)

  const heroCards = [
    {
      title: 'Dana Masuk',
      value: formatRupiah(totalMasuk),
      subtitle: `${masukList.length} transaksi diterima`,
      color: '#059669',
      borderColor: '#059669',
    },
    {
      title: 'Saldo Kas',
      value: formatRupiah(saldoKas),
      subtitle: 'Sisa saldo kas Sarpras',
      color: saldoKas >= 0 ? '#059669' : '#DC2626',
      borderColor: saldoKas >= 0 ? '#059669' : '#DC2626',
    },
  ]

  const smallCards = [
    {
      title: 'Dana Keluar',
      value: formatRupiah(totalKeluar),
      subtitle: `${keluarList.length} transaksi`,
      color: '#DC2626',
    },
    {
      title: 'Keluar PBB',
      value: formatRupiah(totalKeluarPBB),
      subtitle: `${keluarPBBList.length} transaksi`,
      color: '#D97706',
    },
    {
      title: 'Total Deployment',
      value: formatRupiah(totalDeployment),
      subtitle: 'Masuk + Keluar PBB',
      color: '#1A6FE8',
    },
  ]

  const serapanBulanan = (() => {
    const map: Record<string, { keluar: number; keluarPBB: number }> = {}
    transactions.forEach(t => {
      if (t.jenis_transaksi === 'Masuk') return
      const ym = t.tanggal.slice(0, 7)
      if (!map[ym]) map[ym] = { keluar: 0, keluarPBB: 0 }
      if (t.jenis_transaksi === 'Keluar') map[ym].keluar += t.nominal || 0
      else if (t.jenis_transaksi === 'Keluar PBB') map[ym].keluarPBB += t.nominal || 0
    })
    const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([ym, v]) => {
        const [y, m] = ym.split('-')
        return { label: `${MONTHS[parseInt(m) - 1]} ${y}`, keluar: v.keluar, keluarPBB: v.keluarPBB, total: v.keluar + v.keluarPBB }
      })
  })()

  const JENIS_TABS = ['Semua', 'Masuk', 'Keluar', 'Keluar PBB']

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F1C2E', margin: 0, letterSpacing: '-0.03em' }}>Keuangan</h1>
          <p style={{ color: '#5C6B82', fontSize: 13, marginTop: 5 }}>Riwayat transaksi keuangan Sarpras MAF</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#1A6FE8',
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              boxShadow: '0 1px 3px rgba(26,111,232,0.3), 0 4px 12px rgba(26,111,232,0.2)',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A6FE8' }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Transaksi
          </button>
        )}
      </div>

      {/* Hero Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
        {heroCards.map(card => (
          <div
            key={card.title}
            style={{
              backgroundColor: '#fff',
              borderRadius: 14,
              padding: '22px 24px',
              border: '1px solid rgba(15,23,42,0.07)',
              borderLeft: `3px solid ${card.borderColor}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'box-shadow 0.18s, transform 0.18s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'
              el.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
              el.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CAABB', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              {card.title}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color, marginBottom: 6, letterSpacing: '-0.03em', lineHeight: 1.1, wordBreak: 'break-word' }}>
              {card.value}
            </div>
            <div style={{ fontSize: 12, color: '#9CAABB' }}>{card.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Small Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 22 }}>
        {smallCards.map(card => (
          <div
            key={card.title}
            style={{
              backgroundColor: '#fff',
              borderRadius: 14,
              padding: '16px 18px',
              border: '1px solid rgba(15,23,42,0.07)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'box-shadow 0.18s, transform 0.18s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'
              el.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
              el.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CAABB', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {card.title}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: card.color, marginBottom: 6, letterSpacing: '-0.02em', lineHeight: 1.2, wordBreak: 'break-word' }}>
              {card.value}
            </div>
            <div style={{ fontSize: 11, color: '#9CAABB' }}>{card.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Serapan per Bulan */}
      {serapanBulanan.length > 0 && (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 14,
            border: '1px solid rgba(15,23,42,0.07)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            marginBottom: 22,
          }}
        >
          <div
            onClick={() => setShowSerapan(v => !v)}
            style={{
              padding: '14px 20px',
              borderBottom: showSerapan ? '1px solid rgba(15,23,42,0.06)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', letterSpacing: '-0.02em' }}>Serapan per Bulan</div>
              <div style={{ fontSize: 12, color: '#9CAABB', marginTop: 2 }}>Realisasi pengeluaran bulanan</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CAABB', fontSize: 12, fontWeight: 600 }}>
              <span>{showSerapan ? 'Sembunyikan' : 'Tampilkan Detail'}</span>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                style={{ transform: showSerapan ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
          {showSerapan && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                <thead>
                  <tr>
                    {['Bulan', 'Dana Keluar', 'Keluar PBB', 'Total Serapan'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Bulan' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: '#9CAABB', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(15,23,42,0.06)', backgroundColor: '#FAFBFC', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {serapanBulanan.map((row, i) => (
                    <tr
                      key={row.label}
                      style={{ borderBottom: i < serapanBulanan.length - 1 ? '1px solid rgba(15,23,42,0.04)' : 'none', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
                    >
                      <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#0F1C2E' }}>{row.label}</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, color: '#DC2626', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.keluar > 0 ? formatRupiah(row.keluar) : '—'}</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, color: '#D97706', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.keluarPBB > 0 ? formatRupiah(row.keluarPBB) : '—'}</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: '#0F1C2E', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Transactions Table */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 14,
          border: '1px solid rgba(15,23,42,0.07)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', letterSpacing: '-0.02em' }}>Riwayat Transaksi</div>
            <div style={{ fontSize: 12, color: '#9CAABB', marginTop: 2 }}>{filtered.length} transaksi</div>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {JENIS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => { setFilterJenis(tab); setPage(1) }}
                style={{
                  padding: '5px 11px',
                  borderRadius: 7,
                  border: filterJenis === tab ? 'none' : '1px solid rgba(15,23,42,0.1)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: filterJenis === tab ? '#1A6FE8' : '#fff',
                  color: filterJenis === tab ? '#fff' : '#5C6B82',
                  transition: 'all 0.13s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9CAABB', fontSize: 13 }}>Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9CAABB', fontSize: 13 }}>Belum ada transaksi.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr>
                  {['Tanggal', 'Pekerjaan', 'Keterangan', 'Jenis', 'Nominal', 'Bukti'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '11px 16px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#9CAABB',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        borderBottom: '1px solid rgba(15,23,42,0.06)',
                        backgroundColor: '#FAFBFC',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((t, i) => {
                  const isMasuk = t.jenis_transaksi === 'Masuk'
                  const isKeluarPBB = t.jenis_transaksi === 'Keluar PBB'
                  const nominalColor = isMasuk ? '#059669' : isKeluarPBB ? '#D97706' : '#DC2626'
                  const badgeColor = TRANSACTION_COLORS[t.jenis_transaksi] || { bg: '#6B7A99', text: '#fff' }

                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: i < paged.length - 1 ? '1px solid rgba(15,23,42,0.04)' : 'none',
                        backgroundColor: '#fff',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
                    >
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#5C6B82', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {formatTanggal(t.tanggal)}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 160 }}>
                        <div style={{ fontSize: 12.5, color: '#0F1C2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {t.nama_pekerjaan || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 180 }}>
                        <div style={{ fontSize: 12, color: '#5C6B82', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.deskripsi || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 9px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: badgeColor.bg,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.jenis_transaksi}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: nominalColor, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {isMasuk ? '+' : '-'}{formatRupiah(t.nominal || 0)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {t.link_bukti ? (
                          <button
                            onClick={() => window.open(t.link_bukti, '_blank')}
                            style={{
                              padding: '5px 11px',
                              borderRadius: 7,
                              border: '1px solid rgba(26,111,232,0.2)',
                              backgroundColor: 'rgba(26,111,232,0.06)',
                              color: '#1A6FE8',
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(26,111,232,0.12)'
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(26,111,232,0.06)'
                            }}
                          >
                            Lihat Bukti
                          </button>
                        ) : (
                          <span style={{ color: '#C8D2E0', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > itemsPerPage && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 12, color: '#9CAABB' }}>
              {start + 1}–{Math.min(start + itemsPerPage, filtered.length)} dari {filtered.length} transaksi
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  border: '1px solid rgba(15,23,42,0.1)',
                  backgroundColor: '#fff',
                  cursor: page === 1 ? 'default' : 'pointer',
                  opacity: page === 1 ? 0.4 : 1,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#5C6B82',
                  transition: 'all 0.12s',
                }}
              >
                ← Sebelumnya
              </button>
              <span style={{ fontSize: 12, color: '#9CAABB', padding: '0 4px' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  border: '1px solid rgba(15,23,42,0.1)',
                  backgroundColor: '#fff',
                  cursor: page === totalPages ? 'default' : 'pointer',
                  opacity: page === totalPages ? 0.4 : 1,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#5C6B82',
                  transition: 'all 0.12s',
                }}
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </div>

      {isAdmin && showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={async () => {
            const { data } = await fetchTransactions()
            if (data) setTransactions(data.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()))
            setPage(1)
          }}
        />
      )}
    </div>
  )
}
