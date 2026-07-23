import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchTransactions, fetchAppConfig, Transaction, invalidateCache } from '../lib/supabase'
import { forcePageRepaint } from '../lib/forceRepaint'
import { formatRupiah, formatTanggal, TRANSACTION_COLORS, getFileEmbedUrl } from '../lib/data'
import { adminUpsertConfig } from '../lib/adminApi'
import { useWindowWidth } from '../lib/useWindowWidth'
import AddTransactionModal from './AddTransactionModal'
import EditTransactionModal from './EditTransactionModal'
import PdfViewerModal from './PdfViewerModal'

interface KeuanganProps {
  isAdmin?: boolean
  selectedMonth?: string | null
  onMonthChange?: (ym: string | null) => void
  role?: 'pbb' | 'maf' | null
}

const MONTH_ABBR: Record<string, string> = {
  Januari: 'Jan', Februari: 'Feb', Maret: 'Mar', April: 'Apr',
  Mei: 'Mei', Juni: 'Jun', Juli: 'Jul', Agustus: 'Agt',
  September: 'Sep', Oktober: 'Okt', November: 'Nov', Desember: 'Des',
}

export default function Keuangan({ isAdmin = false, role }: KeuanganProps) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterJenis, setFilterJenis] = useState<string>('Masuk')
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [viewingBukti, setViewingBukti] = useState<{ url: string; name: string } | null>(null)
  const [showRiwayat, setShowRiwayat] = useState(true)
  const [togglingRiwayat, setTogglingRiwayat] = useState(false)
  const [hoveredChartIdx, setHoveredChartIdx] = useState<number | null>(null)
  const chartScrollRef = useRef<HTMLDivElement>(null)
  const [showDeploymentPopup, setShowDeploymentPopup] = useState(false)
  const [showSaldoPopup, setShowSaldoPopup] = useState(false)

  // When either info popup closes, force a repaint so the card hover behind it
  // doesn't freeze (same stale-compositor-tile issue ModalShell guards against).
  const prevPopupOpen = useRef(false)
  useEffect(() => {
    const open = showDeploymentPopup || showSaldoPopup
    if (prevPopupOpen.current && !open) forcePageRepaint()
    prevPopupOpen.current = open
  }, [showDeploymentPopup, showSaldoPopup])

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

  const handleToggleRiwayat = async () => {
    const next = !showRiwayat
    setTogglingRiwayat(true)
    const { error } = await adminUpsertConfig('show_riwayat_transaksi', String(next))
    if (!error) setShowRiwayat(next)
    setTogglingRiwayat(false)
  }

  const isManPowerTx = (t: Transaction) => {
    const n = (t.nama_pekerjaan || '').toLowerCase()
    return n.includes('man power') || n.includes('honor')
  }

  // MAF must never see Man Power / Operasional finances in any total.
  const visibleTx = role === 'maf' ? transactions.filter(t => !isManPowerTx(t)) : transactions

  const masukList = visibleTx.filter(t => t.jenis_transaksi === 'Masuk')
  const keluarList = visibleTx.filter(t => t.jenis_transaksi === 'Keluar')
  const keluarPBBList = visibleTx.filter(t => t.jenis_transaksi === 'Keluar PBB')

  const totalMasuk = masukList.reduce((s, t) => s + (t.nominal || 0), 0)
  const totalKeluar = keluarList.reduce((s, t) => s + (t.nominal || 0), 0)
  const totalKeluarPBB = keluarPBBList.reduce((s, t) => s + (t.nominal || 0), 0)
  const totalDeployment = totalMasuk + totalKeluarPBB

  // Saldo Kas is a running balance — computed across all transactions the role may see.
  const saldoKas = visibleTx.reduce(
    (s, t) => s + (t.jenis_transaksi === 'Masuk' ? (t.nominal || 0) : t.jenis_transaksi === 'Keluar' ? -(t.nominal || 0) : 0),
    0,
  )

  const filtered = (filterJenis === 'Semua'
    ? visibleTx
    : visibleTx.filter(t => t.jenis_transaksi === filterJenis)
  )

  const itemsPerPage = 20
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const start = (page - 1) * itemsPerPage
  const paged = filtered.slice(start, start + itemsPerPage)

  // Monthly chart — Masuk vs (Keluar + Keluar PBB) — same as BerandaChart
  const chartData = (() => {
    const map: Record<string, { masuk: number; keluar: number }> = {}
    visibleTx.forEach(t => {
      const ym = t.tanggal?.slice(0, 7)
      if (!ym) return
      if (!map[ym]) map[ym] = { masuk: 0, keluar: 0 }
      if (t.jenis_transaksi === 'Masuk') map[ym].masuk += t.nominal || 0
      else if (t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB') map[ym].keluar += t.nominal || 0
    })
    const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, v]) => {
        const [y, m] = ym.split('-')
        const monthName = MONTHS[parseInt(m) - 1]
        return {
          label: `${monthName} ${y}`,
          abbr: MONTH_ABBR[monthName] || monthName.slice(0, 3),
          masuk: v.masuk,
          keluar: v.keluar,
        }
      })
      .slice(-8)
  })()

  const maxChartVal = Math.max(...chartData.flatMap(m => [m.masuk, m.keluar]), 1)
  const chartBarH = isMobile ? 72 : 96

  useEffect(() => {
    if (chartScrollRef.current) {
      chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth
    }
  }, [chartData.length])

  const filterCards = [
    { jenis: 'Masuk', label: 'Dana Masuk', value: totalMasuk, count: masukList.length, color: '#1B5E2B', bgActive: 'rgba(27,94,43,0.09)' },
    { jenis: 'Keluar', label: 'Dana Keluar', value: totalKeluar, count: keluarList.length, color: '#660000', bgActive: 'rgba(102,0,0,0.09)' },
    { jenis: 'Keluar PBB', label: 'Dana Keluar PBB', value: totalKeluarPBB, count: keluarPBBList.length, color: '#D97706', bgActive: 'rgba(217,119,6,0.09)' },
  ]

  return (
    <div style={{ padding: isMobile ? '16px 14px 56px' : '28px 28px 56px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isMobile ? 0 : 22, gap: 12, flexWrap: 'wrap' }}>
        {!isMobile && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
              Keuangan
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '5px 0 0' }}>
              Riwayat Transaksi Keuangan Sarpras MAF
            </p>
          </div>
        )}
        {isAdmin && !isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              onClick={handleToggleRiwayat}
              disabled={togglingRiwayat}
              title={showRiwayat ? 'Sembunyikan Riwayat dari viewer' : 'Tampilkan Riwayat ke viewer'}
              style={{ padding: '8px 13px', borderRadius: 10, border: `1px solid ${showRiwayat ? 'var(--border-strong)' : 'rgba(26,111,232,0.25)'}`, backgroundColor: showRiwayat ? 'var(--card)' : 'rgba(26,111,232,0.06)', color: showRiwayat ? 'var(--text-secondary)' : 'var(--blue)', fontSize: 12, fontWeight: 600, cursor: togglingRiwayat ? 'wait' : 'pointer', opacity: togglingRiwayat ? 0.6 : 1, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
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
              style={{ padding: '9px 18px', borderRadius: 10, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em', boxShadow: '0 1px 3px rgba(26,111,232,0.3)', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah Transaksi
            </button>
          </div>
        )}
      </div>

      {/* === ROW 1: Total Deployment + Saldo Kas (display only) === */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 10 : 14, marginBottom: isMobile ? 10 : 12 }}>
        {/* Total Deployment */}
        <div
          onClick={() => setShowDeploymentPopup(true)}
          style={{
            backgroundColor: 'var(--card)',
            borderRadius: isMobile ? 12 : 14,
            padding: isMobile ? '14px 13px' : '20px 22px',
            border: '1px solid var(--border)',
            borderTop: '3px solid var(--blue)',
            cursor: 'pointer',
            transition: 'box-shadow 0.18s ease, transform 0.18s ease',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.boxShadow = '0 6px 20px rgba(26,111,232,0.16)'
            el.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.boxShadow = 'none'
            el.style.transform = 'none'
          }}
        >
          <div style={{ fontSize: isMobile ? 9 : 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: isMobile ? 6 : 10 }}>
            Total Deployment
          </div>
          <div style={{ fontSize: isMobile ? 15 : 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, wordBreak: 'break-word' }}>
            {formatRupiah(totalDeployment)}
          </div>
          <div style={{ fontSize: isMobile ? 9.5 : 11, color: 'var(--text-muted)', marginTop: 5 }}>
            Dana Masuk + Keluar PBB
          </div>
        </div>

        {/* Saldo Kas */}
        <div
          onClick={() => setShowSaldoPopup(true)}
          style={{
            backgroundColor: 'var(--card)',
            borderRadius: isMobile ? 12 : 14,
            padding: isMobile ? '14px 13px' : '20px 22px',
            border: '1px solid var(--border)',
            borderTop: `3px solid ${saldoKas >= 0 ? '#1B5E2B' : '#660000'}`,
            cursor: 'pointer',
            transition: 'box-shadow 0.18s ease, transform 0.18s ease',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.boxShadow = `0 6px 20px ${saldoKas >= 0 ? 'rgba(27,94,43,0.16)' : 'rgba(102,0,0,0.16)'}`
            el.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.boxShadow = 'none'
            el.style.transform = 'none'
          }}
        >
          <div style={{ fontSize: isMobile ? 9 : 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: isMobile ? 6 : 10 }}>
            Saldo Kas
          </div>
          <div style={{ fontSize: isMobile ? 15 : 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, wordBreak: 'break-word' }}>
            {formatRupiah(saldoKas)}
          </div>
          <div style={{ fontSize: isMobile ? 9.5 : 11, color: 'var(--text-muted)', marginTop: 5 }}>
            Sisa Saldo Kas Sarpras
          </div>
        </div>
      </div>

      {/* === ROW 2: Filter cards (clickable) === */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 8 : 12, marginBottom: isMobile ? 16 : 22 }}>
        {filterCards.map(card => {
          const isActive = filterJenis === card.jenis
          const isDimmed = filterJenis !== 'Semua' && !isActive
          return (
            <button
              key={card.jenis}
              onClick={() => { setFilterJenis(isActive ? 'Semua' : card.jenis); setPage(1) }}
              onMouseEnter={e => {
                const el = e.currentTarget
                if (!isActive) {
                  el.style.backgroundColor = card.color + '12'
                  el.style.borderColor = card.color + '88'
                  el.style.borderTopColor = card.color
                }
                el.style.transform = 'translateY(-2px)'
                el.style.boxShadow = `0 4px 16px ${card.color}28`
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                if (!isActive) {
                  el.style.backgroundColor = 'var(--card)'
                  el.style.borderColor = 'var(--border)'
                  el.style.borderTopColor = 'var(--border-subtle)'
                }
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = 'none'
              }}
              style={{
                backgroundColor: isActive ? card.bgActive : 'var(--card)',
                borderRadius: isMobile ? 10 : 12,
                padding: isMobile ? '10px 10px' : '14px 16px',
                border: `1px solid ${isActive ? card.color : 'var(--border)'}`,
                borderTop: `2px solid ${isActive ? card.color : 'var(--border-subtle)'}`,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                opacity: isDimmed ? 0.42 : 1,
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontSize: isMobile ? 8 : 10, fontWeight: 700, color: isActive ? card.color : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: isMobile ? '0.02em' : '0.05em', marginBottom: isMobile ? 4 : 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isMobile ? card.label.replace('Dana ', '') : card.label}
              </div>
              <div style={{ fontSize: isMobile ? 12 : 19, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formatRupiah(card.value)}
              </div>
              <div style={{ fontSize: isMobile ? 9 : 10.5, color: isActive ? card.color : 'var(--text-muted)', marginTop: 3 }}>
                {card.count} Transaksi
              </div>
            </button>
          )
        })}
      </div>

      {/* === CHART: Pengeluaran Per Bulan === */}
      {chartData.length > 0 && (() => {
        const CHART_H = 120
        const BAR_W = 22
        const hovered = hoveredChartIdx !== null ? chartData[hoveredChartIdx] : null
        const tooltipLeft = hoveredChartIdx !== null
          ? Math.min(Math.max((hoveredChartIdx + 0.5) / chartData.length * 100, 13), 87)
          : 0
        return (
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: isMobile ? 12 : 14,
            padding: '16px 20px 18px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            marginBottom: isMobile ? 16 : 22,
          }}>
            {/* Header */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Arus Kas Per Bulan
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Perkembangan {chartData.length} bulan
              </div>
            </div>

            {/* Bars + Tooltip */}
            <div style={{ position: 'relative' }}>
              {/* Tooltip */}
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: `${tooltipLeft}%`,
                transform: 'translateX(-50%)',
                marginBottom: 8,
                backgroundColor: '#1E293B',
                color: '#fff',
                borderRadius: 8,
                padding: '7px 12px',
                pointerEvents: 'none',
                zIndex: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.12s ease',
                whiteSpace: 'nowrap',
              }}>
                <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 5, fontWeight: 600 }}>
                  {hovered?.abbr ?? ''}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: '#1B5E2B', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600 }}>
                      {hovered && hovered.masuk > 0 ? formatRupiah(hovered.masuk) : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: '#660000', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600 }}>
                      {hovered && hovered.keluar > 0 ? formatRupiah(hovered.keluar) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bar groups */}
              <div ref={chartScrollRef} style={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto', paddingBottom: 2 }}>
                {chartData.map((m, i) => {
                  const masukPct = m.masuk > 0 ? Math.max(4 / CHART_H * 100, (m.masuk / maxChartVal) * 100) : 0
                  const keluarPct = m.keluar > 0 ? Math.max(4 / CHART_H * 100, (m.keluar / maxChartVal) * 100) : 0
                  const isHov = hoveredChartIdx === i
                  return (
                    <div
                      key={m.label}
                      style={{ flex: 1, minWidth: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default' }}
                      onMouseEnter={() => setHoveredChartIdx(i)}
                      onMouseLeave={() => setHoveredChartIdx(null)}
                    >
                      <div style={{ display: 'flex', gap: 4, height: CHART_H, alignItems: 'flex-end' }}>
                        <div style={{
                          width: BAR_W,
                          height: masukPct > 0 ? `${masukPct}%` : 3,
                          backgroundColor: masukPct > 0 ? '#1B5E2B' : 'var(--border-subtle)',
                          borderRadius: '3px 3px 0 0',
                          opacity: isHov ? 1 : 0.72,
                          transition: 'opacity 0.15s ease',
                        }} />
                        <div style={{
                          width: BAR_W,
                          height: keluarPct > 0 ? `${keluarPct}%` : 3,
                          backgroundColor: keluarPct > 0 ? '#660000' : 'var(--border-subtle)',
                          borderRadius: '3px 3px 0 0',
                          opacity: isHov ? 1 : keluarPct > 0 ? 0.72 : 0.4,
                          transition: 'opacity 0.15s ease',
                        }} />
                      </div>
                      <div style={{
                        fontSize: 10,
                        marginTop: 7,
                        color: isHov ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: isHov ? 700 : 400,
                        transition: 'color 0.12s ease',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}>
                        {m.abbr}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Legend — same style as BerandaChart */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#1B5E2B', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Masuk</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 16 }}>Dana kas masuk</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#660000', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Keluar</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 16 }}>Pengeluaran program</span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* === RIWAYAT TRANSAKSI === */}
      {showRiwayat && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12 }}>
          {/* Riwayat header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Riwayat Transaksi
              </div>
              <div style={{ fontSize: isMobile ? 11 : 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {filtered.length} Transaksi
              </div>
            </div>
            {filterJenis !== 'Semua' && (() => {
              const color = filterJenis === 'Masuk' ? '#1B5E2B' : filterJenis === 'Keluar PBB' ? '#D97706' : '#660000'
              return (
                <button
                  onClick={() => { setFilterJenis('Semua'); setPage(1) }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px 4px 10px',
                    borderRadius: 99,
                    border: `1px solid ${color}55`,
                    backgroundColor: `${color}12`,
                    color: color,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}
                >
                  {filterJenis}
                  <span style={{ fontSize: 13, lineHeight: 1, opacity: 0.7 }}>×</span>
                </button>
              )
            })()}
          </div>

          {/* Loading / empty */}
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Memuat Data...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Belum Ada Transaksi.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12 }}>
              {paged.map(t => {
                const isMasukTx = t.jenis_transaksi === 'Masuk'
                const isKeluarPBBTx = t.jenis_transaksi === 'Keluar PBB'
                const nominalColor = isMasukTx ? '#1B5E2B' : isKeluarPBBTx ? '#D97706' : '#660000'
                const badgeColor = TRANSACTION_COLORS[t.jenis_transaksi] || { bg: 'var(--text-muted)', text: '#fff' }
                return (
                  <div
                    key={t.id}
                    style={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: isMobile ? 12 : 13,
                      padding: isMobile ? '12px 14px' : '14px 16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                        <div style={{ fontSize: isMobile ? 13 : 13.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                          {t.nama_pekerjaan || '-'}
                        </div>
                        {t.deskripsi && (
                          <div style={{ fontSize: isMobile ? 11 : 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.deskripsi}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: isMobile ? 13.5 : 15, fontWeight: 700, color: nominalColor, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {isMasukTx ? '+' : '-'}{formatRupiah(t.nominal || 0)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, backgroundColor: badgeColor.bg, color: '#fff', whiteSpace: 'nowrap' }}>
                          {t.jenis_transaksi}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatTanggal(t.tanggal)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {t.link_bukti && (
                          <button
                            onClick={() => {
                              const rawUrl = t.link_bukti!
                              const url = getFileEmbedUrl(rawUrl) ?? rawUrl
                              const name = t.nama_pekerjaan || 'Bukti Transaksi'
                              setViewingBukti({ url, name })
                            }}
                            style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(26,111,232,0.2)', backgroundColor: 'rgba(26,111,232,0.06)', color: 'var(--blue)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Bukti
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setEditingTransaction(t)}
                            style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
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
                {start + 1}–{Math.min(start + itemsPerPage, filtered.length)} dari {filtered.length} Transaksi
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--card)', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'inherit' }}
                >
                  ← Sebelumnya
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 4px' }}>{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', backgroundColor: 'var(--card)', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'inherit' }}
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile FABs — Tambah + Toggle Riwayat */}
      {isAdmin && isMobile && (
        <div style={{ position: 'fixed', bottom: 'calc(78px + env(safe-area-inset-bottom))', right: 18, zIndex: 50, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          {/* Mata — toggle riwayat */}
          <button
            onClick={handleToggleRiwayat}
            disabled={togglingRiwayat}
            title={showRiwayat ? 'Sembunyikan Riwayat' : 'Tampilkan Riwayat'}
            style={{ width: 46, height: 46, borderRadius: 14, border: `1.5px solid ${showRiwayat ? 'var(--border)' : 'rgba(26,111,232,0.3)'}`, backgroundColor: showRiwayat ? 'var(--card)' : 'rgba(26,111,232,0.08)', color: showRiwayat ? 'var(--text-secondary)' : 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: togglingRiwayat ? 'wait' : 'pointer', opacity: togglingRiwayat ? 0.6 : 1, boxShadow: '0 2px 10px rgba(0,0,0,0.1)', transition: 'all 0.15s' }}
          >
            {showRiwayat ? (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            )}
          </button>
          {/* + Tambah Transaksi */}
          <button
            onClick={() => setShowAddModal(true)}
            style={{ width: 46, height: 46, borderRadius: 14, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,232,0.35)', transition: 'transform 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      )}

      {/* Modals */}
      {isAdmin && showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          onSuccess={async () => {
            invalidateCache('transactions')
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
            invalidateCache('transactions')
            const { data } = await fetchTransactions()
            if (data) setTransactions(data.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()))
          }}
        />
      )}

      {viewingBukti && (
        <PdfViewerModal
          url={viewingBukti.url}
          name={viewingBukti.name}
          onClose={() => setViewingBukti(null)}
        />
      )}

      {/* ── Popup: Total Deployment ──
          Portaled to <body> so it escapes the page-transition wrapper
          (transform/will-change creates a containing block that would
          otherwise clip this position:fixed overlay → "nothing shows"). */}
      {showDeploymentPopup && createPortal(
        <div
          onClick={() => setShowDeploymentPopup(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,22,40,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'var(--card)', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(10,22,40,0.2)' }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Total Deployment</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 20 }}>
              {formatRupiah(totalDeployment)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '12px 14px', backgroundColor: 'rgba(27,94,43,0.06)', borderRadius: 10, border: '1px solid rgba(27,94,43,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1B5E2B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dana Masuk</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{masukList.length} transaksi</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(totalMasuk)}</div>
              </div>
              <div style={{ padding: '12px 14px', backgroundColor: 'rgba(217,119,6,0.06)', borderRadius: 10, border: '1px solid rgba(217,119,6,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dana Keluar PBB</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{keluarPBBList.length} transaksi</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(totalKeluarPBB)}</div>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: '12px 14px', backgroundColor: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.5 }}>
                Total Deployment mencakup seluruh dana yang telah dialirkan untuk program Sarpras MAF:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <span style={{ color: '#1B5E2B', fontWeight: 700, flexShrink: 0 }}>•</span>
                  <span><strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Dana Masuk</strong> — dana yang diterima dan dicatat langsung dalam kas Sarpras</span>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <span style={{ color: '#D97706', fontWeight: 700, flexShrink: 0 }}>•</span>
                  <span><strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Dana Keluar PBB</strong> — dana yang langsung disalurkan ke program tanpa melewati kas Sarpras</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowDeploymentPopup(false)}
              style={{ marginTop: 20, width: '100%', padding: '10px', borderRadius: 10, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Tutup
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Popup: Saldo Kas ── (portaled to <body>, same reason as above) */}
      {showSaldoPopup && createPortal(
        <div
          onClick={() => setShowSaldoPopup(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,22,40,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'var(--card)', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(10,22,40,0.2)' }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Saldo Kas</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 20 }}>
              {formatRupiah(saldoKas)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '12px 14px', backgroundColor: 'rgba(27,94,43,0.06)', borderRadius: 10, border: '1px solid rgba(27,94,43,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1B5E2B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Masuk</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{masukList.length} transaksi</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>+{formatRupiah(totalMasuk)}</div>
              </div>
              <div style={{ padding: '12px 14px', backgroundColor: 'rgba(102,0,0,0.05)', borderRadius: 10, border: '1px solid rgba(102,0,0,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#660000', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Keluar Program</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{keluarList.length} transaksi</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>−{formatRupiah(totalKeluar)}</div>
              </div>
              <div style={{ padding: '12px 14px', backgroundColor: saldoKas >= 0 ? 'rgba(27,94,43,0.06)' : 'rgba(102,0,0,0.05)', borderRadius: 10, border: `1px solid ${saldoKas >= 0 ? 'rgba(27,94,43,0.2)' : 'rgba(102,0,0,0.15)'}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>Saldo Kas</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: saldoKas >= 0 ? '#1B5E2B' : '#660000', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(saldoKas)}</div>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: '12px 14px', backgroundColor: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.5 }}>
                Saldo Kas mencerminkan dana kas Sarpras yang tersedia saat ini, dihitung dari:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <span style={{ color: '#1B5E2B', fontWeight: 700, flexShrink: 0 }}>•</span>
                  <span>Seluruh <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Dana Masuk</strong> yang telah diterima ke kas Sarpras</span>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <span style={{ color: '#660000', fontWeight: 700, flexShrink: 0 }}>•</span>
                  <span>Dikurangi seluruh <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>pengeluaran program</strong> yang telah dicairkan</span>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>•</span>
                  <span>Nilai positif menunjukkan sisa kas yang siap digunakan; nilai negatif menunjukkan defisit</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSaldoPopup(false)}
              style={{ marginTop: 20, width: '100%', padding: '10px', borderRadius: 10, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Tutup
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
