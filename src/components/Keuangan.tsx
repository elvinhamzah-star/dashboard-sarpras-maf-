import { useEffect, useState } from 'react'
import { fetchTransactions, fetchAppConfig, Transaction } from '../lib/supabase'
import { formatRupiah, formatTanggal, TRANSACTION_COLORS, monthsFromDates, monthLabelFromYM } from '../lib/data'
import { adminUpsertConfig } from '../lib/adminApi'
import { useWindowWidth } from '../lib/useWindowWidth'
import AddTransactionModal from './AddTransactionModal'
import EditTransactionModal from './EditTransactionModal'
import MonthSelector from './MonthSelector'

interface KeuanganProps {
  isAdmin?: boolean
  selectedMonth?: string | null
  onMonthChange?: (ym: string | null) => void
  role?: 'pbb' | 'maf' | null
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

export default function Keuangan({ isAdmin = false, selectedMonth = null, onMonthChange, role }: KeuanganProps) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const isNarrow = width < 900
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterJenis, setFilterJenis] = useState<string>('Semua')
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [showSerapan, setShowSerapan] = useState(false)
  const [showRiwayat, setShowRiwayat] = useState(true)
  const [togglingRiwayat, setTogglingRiwayat] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [txRes, cfgRes] = await Promise.all([
        fetchTransactions(),
        fetchAppConfig('show_riwayat_transaksi'),
      ])
      if (txRes.data) setTransactions(txRes.data.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()))
      if (cfgRes.data) setShowRiwayat(cfgRes.data.value === 'true')
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => { setPage(1) }, [selectedMonth])

  const handleToggleRiwayat = async () => {
    const next = !showRiwayat
    setTogglingRiwayat(true)
    const { error } = await adminUpsertConfig('show_riwayat_transaksi', String(next))
    if (!error) setShowRiwayat(next)
    setTogglingRiwayat(false)
  }

  // Month filter: available months from data, and the set scoped to the selected month
  const availableMonths = monthsFromDates(transactions.map(t => t.tanggal))
  const monthTransactions = selectedMonth
    ? transactions.filter(t => t.tanggal?.slice(0, 7) === selectedMonth)
    : transactions

  const masukList = monthTransactions.filter(t => t.jenis_transaksi === 'Masuk')
  const keluarList = monthTransactions.filter(t => t.jenis_transaksi === 'Keluar')
  const keluarPBBList = monthTransactions.filter(t => t.jenis_transaksi === 'Keluar PBB')

  const totalMasuk = masukList.reduce((s, t) => s + (t.nominal || 0), 0)
  const totalKeluar = keluarList.reduce((s, t) => s + (t.nominal || 0), 0)
  const totalKeluarPBB = keluarPBBList.reduce((s, t) => s + (t.nominal || 0), 0)
  const totalDeployment = totalMasuk + totalKeluarPBB
  // Saldo Kas is a running balance (stock), so always compute it across ALL
  // transactions — never scope it to the selected month like the flow cards.
  const saldoKas = transactions.reduce(
    (s, t) => s + (t.jenis_transaksi === 'Masuk' ? (t.nominal || 0) : t.jenis_transaksi === 'Keluar' ? -(t.nominal || 0) : 0),
    0,
  )

  const isManPowerTx = (t: Transaction) => {
    const n = (t.nama_pekerjaan || '').toLowerCase()
    return n.includes('man power') || n.includes('honor')
  }

  const filtered = (filterJenis === 'Semua'
    ? monthTransactions
    : monthTransactions.filter(t => t.jenis_transaksi === filterJenis)
  ).filter(t => role !== 'maf' || !isManPowerTx(t))

  const itemsPerPage = 20
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const start = (page - 1) * itemsPerPage
  const paged = filtered.slice(start, start + itemsPerPage)

  const heroCards = [
    {
      title: 'Dana Masuk',
      value: formatRupiah(totalMasuk),
      subtitle: `${masukList.length} Transaksi Diterima`,
      color: '#059669',
      borderColor: '#059669',
    },
    {
      title: 'Saldo Kas',
      value: formatRupiah(saldoKas),
      subtitle: selectedMonth ? 'Sisa Saldo Kas (Total Keseluruhan)' : 'Sisa Saldo Kas Sarpras',
      color: saldoKas >= 0 ? '#059669' : '#DC2626',
      borderColor: saldoKas >= 0 ? '#059669' : '#DC2626',
    },
  ]

  const smallCards = [
    {
      title: 'Dana Keluar',
      value: formatRupiah(totalKeluar),
      subtitle: `${keluarList.length} Transaksi`,
      color: '#DC2626',
      borderColor: '#DC2626',
    },
    {
      title: 'Keluar PBB',
      value: formatRupiah(totalKeluarPBB),
      subtitle: `${keluarPBBList.length} Transaksi`,
      color: '#D97706',
      borderColor: '#D97706',
    },
    {
      title: 'Total Deployment',
      value: formatRupiah(totalDeployment),
      subtitle: 'Masuk + Keluar PBB',
      color: 'var(--blue)',
      borderColor: 'var(--blue)',
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
    <div style={{ padding: isMobile ? '16px 14px 48px' : '28px 28px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>Keuangan</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 5 }}>
            {selectedMonth
              ? `Transaksi Bulan ${monthLabelFromYM(selectedMonth)}`
              : 'Riwayat Transaksi Keuangan Sarpras MAF'}
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleToggleRiwayat}
              disabled={togglingRiwayat}
              title={showRiwayat ? 'Sembunyikan Riwayat Transaksi dari viewer' : 'Tampilkan Riwayat Transaksi ke viewer'}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                border: `1px solid ${showRiwayat ? 'var(--border-strong)' : 'rgba(26,111,232,0.25)'}`,
                backgroundColor: showRiwayat ? 'var(--card)' : 'rgba(26,111,232,0.06)',
                color: showRiwayat ? 'var(--text-secondary)' : 'var(--blue)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: togglingRiwayat ? 'wait' : 'pointer',
                opacity: togglingRiwayat ? 0.6 : 1,
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {showRiwayat ? (
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              ) : (
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              )}
              {showRiwayat ? 'Riwayat: Terlihat' : 'Riwayat: Tersembunyi'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: 'var(--blue)',
                color: 'var(--card)',
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
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--blue)' }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah Transaksi
            </button>
          </div>
        )}
      </div>

      {/* Month filter bar */}
      {onMonthChange && availableMonths.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <MonthSelector value={selectedMonth} months={availableMonths} onChange={onMonthChange} />
          {selectedMonth && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {monthTransactions.length} Transaksi · {formatRupiah(totalMasuk)} Masuk · {formatRupiah(totalKeluar + totalKeluarPBB)} Keluar
            </span>
          )}
        </div>
      )}

      {/* Summary Cards — unified 2×2 grid on mobile, hero+small split on desktop */}
      {isMobile ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 10 }}>
            {[...heroCards, ...smallCards.slice(0, 2)].map(card => (
              <div key={card.title} style={{
                backgroundColor: 'var(--card)',
                borderRadius: 12,
                padding: '12px 13px',
                border: '1px solid var(--border-subtle)',
                borderTop: `2px solid ${card.borderColor}`,
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3, letterSpacing: '-0.02em', lineHeight: 1.2, wordBreak: 'break-word' }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{card.subtitle}</div>
              </div>
            ))}
          </div>
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: 12,
            padding: '12px 13px',
            border: '1px solid var(--border-subtle)',
            borderTop: `2px solid var(--blue)`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Total Deployment
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3, letterSpacing: '-0.02em', lineHeight: 1.2, wordBreak: 'break-word' }}>
              {formatRupiah(totalDeployment)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Masuk + Keluar PBB</div>
          </div>
        </div>
      ) : (
        <>
          {/* Hero Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
            {heroCards.map(card => (
              <div
                key={card.title}
                style={{
                  backgroundColor: 'var(--card)',
                  borderRadius: 14,
                  padding: '22px 24px',
                  border: '1px solid #D8DDE8',
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
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.03em', lineHeight: 1.1, wordBreak: 'break-word' }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{card.subtitle}</div>
              </div>
            ))}
          </div>

          {/* Small Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 22 }}>
            {smallCards.map(card => (
              <div
                key={card.title}
                style={{
                  backgroundColor: 'var(--card)',
                  borderRadius: 14,
                  padding: '16px 18px',
                  border: '1px solid #D8DDE8',
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
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  {card.title}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.02em', lineHeight: 1.2, wordBreak: 'break-word' }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{card.subtitle}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Serapan Per Bulan */}
      {serapanBulanan.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--card)',
            borderRadius: 14,
            border: '1px solid #D8DDE8',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            marginBottom: 22,
          }}
        >
          <div
            onClick={() => setShowSerapan(v => !v)}
            style={{
              padding: '14px 20px',
              borderBottom: showSerapan ? '1px solid var(--border-subtle)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Serapan Per Bulan</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Realisasi Pengeluaran Bulanan</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
              <span>{showSerapan ? 'Sembunyikan' : 'Tampilkan Detail'}</span>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                style={{ transform: showSerapan ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
          {showSerapan && (
            <div style={{ padding: '4px 0' }}>
              {serapanBulanan.map((row, i) => (
                <div key={row.label} style={{
                  padding: isMobile ? '12px 16px' : '14px 20px',
                  borderBottom: i < serapanBulanan.length - 1 ? '1px solid #EDF0F5' : 'none',
                }}>
                  <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{row.label}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Dana Keluar</div>
                      <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: '#DC2626', fontVariantNumeric: 'tabular-nums' }}>{row.keluar > 0 ? formatRupiah(row.keluar) : '—'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Keluar PBB</div>
                      <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: '#D97706', fontVariantNumeric: 'tabular-nums' }}>{row.keluarPBB > 0 ? formatRupiah(row.keluarPBB) : '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Total</div>
                      <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(row.total)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transactions Grid */}
      {showRiwayat && <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Riwayat Transaksi</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{filtered.length} Transaksi</div>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {JENIS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => { setFilterJenis(tab); setPage(1) }}
                style={{
                  padding: '5px 11px',
                  borderRadius: 7,
                  border: filterJenis === tab ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: filterJenis === tab ? 'var(--blue)' : 'transparent',
                  color: filterJenis === tab ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.13s',
                  fontFamily: 'inherit',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Memuat Data...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Belum Ada Transaksi.</div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: isMobile ? 10 : 12,
          }}>
            {paged.map(t => {
              const isMasukTx = t.jenis_transaksi === 'Masuk'
              const isKeluarPBBTx = t.jenis_transaksi === 'Keluar PBB'
              const nominalColor = isMasukTx ? '#059669' : isKeluarPBBTx ? '#D97706' : '#DC2626'
              const badgeColor = TRANSACTION_COLORS[t.jenis_transaksi] || { bg: 'var(--text-muted)', text: 'var(--card)' }
              return (
                <div key={t.id} style={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid #D8DDE8',
                  borderRadius: 12,
                  padding: isMobile ? '12px 14px' : '14px 16px',
                  transition: 'box-shadow 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                      <div style={{ fontSize: isMobile ? 13 : 13.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                        {t.nama_pekerjaan || '-'}
                      </div>
                      {t.deskripsi && (
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.deskripsi}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: nominalColor, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {isMasukTx ? '+' : '-'}{formatRupiah(t.nominal || 0)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                        fontSize: 10.5, fontWeight: 700,
                        backgroundColor: badgeColor.bg, color: 'var(--card)', whiteSpace: 'nowrap',
                      }}>
                        {t.jenis_transaksi}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatTanggal(t.tanggal)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {t.link_bukti && (
                        <button
                          onClick={() => window.open(t.link_bukti ?? undefined, '_blank', 'noopener,noreferrer')}
                          style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(26,111,232,0.2)', backgroundColor: 'rgba(26,111,232,0.06)', color: 'var(--blue)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(26,111,232,0.12)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(26,111,232,0.06)' }}
                        >
                          Bukti ↗
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => setEditingTransaction(t)}
                          style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.backgroundColor = 'rgba(26,111,232,0.06)'; b.style.color = 'var(--blue)' }}
                          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.backgroundColor = 'var(--card)'; b.style.color = 'var(--text-secondary)' }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > itemsPerPage && (
          <div style={{ paddingTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {start + 1}–{Math.min(start + itemsPerPage, filtered.length)} Dari {filtered.length} Transaksi
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)',
                  cursor: page === 1 ? 'default' : 'pointer',
                  opacity: page === 1 ? 0.4 : 1,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  transition: 'all 0.12s',
                }}
              >
                ← Sebelumnya
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 4px' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)',
                  cursor: page === totalPages ? 'default' : 'pointer',
                  opacity: page === totalPages ? 0.4 : 1,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  transition: 'all 0.12s',
                }}
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </div>

      }

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

      {isAdmin && editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSuccess={async () => {
            const { data } = await fetchTransactions()
            if (data) setTransactions(data.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()))
          }}
        />
      )}
    </div>
  )
}
