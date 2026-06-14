import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { fetchPrograms, fetchIssues, fetchTransactions, Program, Issue, Transaction } from '../lib/supabase'
import { formatRupiahShort, formatRupiah, getTodayFormatted, STATUS_COLORS } from '../lib/data'
import EditIsuModal from './EditIsuModal'
import AddIsuModal from './AddIsuModal'
import PekerjaanTerbaruCard from './PekerjaanTerbaruCard'

interface BerandaProps {
  isAdmin: boolean
  onAddPekerjaan: () => void
}

const PIE_COLORS = ['#1A6FE8', '#059669', '#DC2626', '#D97706']

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const MetricIcon = ({ type }: { type: string }) => {
  const icons: Record<string, JSX.Element> = {
    anggaran: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
    realisasi: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    sisa: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
    penyerapan: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  }
  return icons[type] || null
}

export default function Beranda({ isAdmin, onAddPekerjaan }: BerandaProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null)
  const [addingIsu, setAddingIsu] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [pRes, iRes, tRes] = await Promise.all([fetchPrograms(), fetchIssues(), fetchTransactions()])
      if (pRes.data) setPrograms(pRes.data)
      if (iRes.data) setIssues(iRes.data)
      if (tRes.data) setTransactions(tRes.data)
      setLoading(false)
    }
    load()
  }, [])

  const totalAnggaran = programs.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const totalRealisasi = programs.reduce((s, p) => s + (p.realisasi_terkini || 0), 0)
  const totalSisa = programs.reduce((s, p) => s + (p.sisa_anggaran || 0), 0)
  const penyerapan = totalAnggaran > 0 ? ((totalRealisasi / totalAnggaran) * 100).toFixed(1) : '0'

  const statusCount: Record<string, number> = {}
  programs.forEach(p => {
    statusCount[p.status] = (statusCount[p.status] || 0) + 1
  })
  const pieData = Object.entries(statusCount).map(([name, value]) => ({ name, value }))

  const summaryCards = [
    {
      label: 'Total Anggaran',
      value: formatRupiah(totalAnggaran),
      iconType: 'anggaran',
      iconBg: 'rgba(26,111,232,0.1)',
      iconColor: '#1A6FE8',
      valueColor: '#1A6FE8',
      trend: `${programs.length} program`,
    },
    {
      label: 'Total Realisasi',
      value: formatRupiah(totalRealisasi),
      iconType: 'realisasi',
      iconBg: 'rgba(5,150,105,0.1)',
      iconColor: '#059669',
      valueColor: '#059669',
      trend: `${penyerapan}% terserap`,
    },
    {
      label: 'Sisa Anggaran',
      value: formatRupiah(totalSisa),
      iconType: 'sisa',
      iconBg: 'rgba(217,119,6,0.1)',
      iconColor: '#D97706',
      valueColor: '#D97706',
      trend: 'Belum digunakan',
    },
    {
      label: 'Penyerapan',
      value: `${penyerapan}%`,
      iconType: 'penyerapan',
      iconBg: 'rgba(26,111,232,0.1)',
      iconColor: '#1A6FE8',
      valueColor: '#0F1C2E',
      trend: 'Dari total anggaran',
    },
  ]

  if (loading) {
    return (
      <div style={{ padding: '28px 28px 40px' }}>
        {/* Skeleton header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ width: 240, height: 24, borderRadius: 8, backgroundColor: 'rgba(15,23,42,0.06)', marginBottom: 8 }} />
          <div style={{ width: 120, height: 14, borderRadius: 6, backgroundColor: 'rgba(15,23,42,0.04)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 20, height: 110, border: '1px solid rgba(15,23,42,0.06)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: 'rgba(15,23,42,0.05)', marginBottom: 14 }} />
              <div style={{ width: '60%', height: 11, borderRadius: 5, backgroundColor: 'rgba(15,23,42,0.05)', marginBottom: 8 }} />
              <div style={{ width: '80%', height: 20, borderRadius: 6, backgroundColor: 'rgba(15,23,42,0.05)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F1C2E', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Dashboard Sarpras MAF
          </h1>
          <p style={{ color: '#5C6B82', fontSize: 13, marginTop: 5, fontWeight: 400 }}>{getTodayFormatted()}</p>
        </div>
        {isAdmin && (
          <button
            onClick={onAddPekerjaan}
            style={{
              backgroundColor: '#1A6FE8',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '9px 18px',
              fontWeight: 600,
              fontSize: 13.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              letterSpacing: '-0.01em',
              boxShadow: '0 1px 3px rgba(26,111,232,0.3), 0 4px 12px rgba(26,111,232,0.2)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 6px rgba(26,111,232,0.35), 0 6px 18px rgba(26,111,232,0.25)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A6FE8'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(26,111,232,0.3), 0 4px 12px rgba(26,111,232,0.2)'
            }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Pekerjaan
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        {summaryCards.map(card => (
          <div
            key={card.label}
            style={{
              backgroundColor: '#fff',
              borderRadius: 14,
              padding: '18px 20px',
              border: '1px solid rgba(15,23,42,0.07)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'box-shadow 0.18s ease, transform 0.18s ease',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
              el.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
              el.style.transform = 'translateY(0)'
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                backgroundColor: card.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.iconColor,
                marginBottom: 14,
                flexShrink: 0,
              }}
            >
              <MetricIcon type={card.iconType} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#5C6B82', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 750, color: card.valueColor, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 6 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 11, color: '#9CAABB', fontWeight: 400 }}>{card.trend}</div>
          </div>
        ))}
      </div>

      {/* Middle Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 20 }}>
        {/* Isu Lapangan */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 14,
            border: '1px solid rgba(15,23,42,0.07)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', letterSpacing: '-0.02em' }}>Isu Lapangan</span>
              {issues.length > 0 && (
                <span
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    color: '#DC2626',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 20,
                    letterSpacing: '0.01em',
                  }}
                >
                  {issues.length}
                </span>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={() => setAddingIsu(true)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(15,23,42,0.12)',
                  borderRadius: 7,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  color: '#5C6B82',
                  fontSize: 12,
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#1A6FE8'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#1A6FE8'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(15,23,42,0.12)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#5C6B82'
                }}
              >
                + Tambah
              </button>
            )}
          </div>

          <div style={{ padding: '12px 16px', maxHeight: 300, overflowY: 'auto' }}>
            {issues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CAABB', fontSize: 13 }}>
                Tidak ada isu lapangan.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {issues.slice(0, 10).map(issue => {
                  const borderColor = issue.status_isu === 'Selesai' ? '#059669' : issue.status_isu === 'Proses' ? '#1A6FE8' : '#D97706'
                  const badgeBg = issue.status_isu === 'Selesai' ? 'rgba(5,150,105,0.08)' : issue.status_isu === 'Proses' ? 'rgba(26,111,232,0.08)' : 'rgba(217,119,6,0.08)'
                  const badgeColor = issue.status_isu === 'Selesai' ? '#059669' : issue.status_isu === 'Proses' ? '#1A6FE8' : '#D97706'
                  return (
                    <div
                      key={issue.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 9,
                        backgroundColor: '#F8FAFC',
                        borderLeft: `2.5px solid ${borderColor}`,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#F1F5F9' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = '#F8FAFC' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F1C2E', marginBottom: 3, letterSpacing: '-0.01em' }}>
                            {issue.nama_pekerjaan}
                          </div>
                          <div style={{ fontSize: 12, color: '#5C6B82', lineHeight: 1.4 }}>{issue.isu_kendala}</div>
                          {issue.tindak_lanjut && (
                            <div style={{ marginTop: 6, fontSize: 11, color: badgeColor, backgroundColor: badgeBg, display: 'inline-block', padding: '2px 8px', borderRadius: 5, fontWeight: 500 }}>
                              {issue.tindak_lanjut}
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => setEditingIssue(issue)}
                            style={{
                              flexShrink: 0,
                              background: 'none',
                              border: '1px solid rgba(15,23,42,0.1)',
                              borderRadius: 6,
                              padding: '4px 6px',
                              cursor: 'pointer',
                              color: '#9CAABB',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = '#1A6FE8'
                              ;(e.currentTarget as HTMLButtonElement).style.color = '#1A6FE8'
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(15,23,42,0.1)'
                              ;(e.currentTarget as HTMLButtonElement).style.color = '#9CAABB'
                            }}
                          >
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Status Pie Chart */}
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 14,
            border: '1px solid rgba(15,23,42,0.07)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', letterSpacing: '-0.02em' }}>Status Pekerjaan</span>
            <div style={{ fontSize: 12, color: '#9CAABB', marginTop: 3 }}>{programs.length} program aktif</div>
          </div>
          <div style={{ padding: '4px 16px 8px' }}>
            {pieData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CAABB', fontSize: 13 }}>Belum ada data program.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="46%"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.name] || PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`${v} pekerjaan`, '']}
                    contentStyle={{ borderRadius: 10, border: '1px solid rgba(15,23,42,0.08)', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => {
                      const count = pieData.find(d => d.name === value)?.value || 0
                      const color = STATUS_COLORS[value] || '#666'
                      return (
                        <span style={{ fontSize: 12, color: '#5C6B82' }}>
                          {value} <span style={{ color, fontWeight: 700 }}>{count}</span>
                        </span>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 14,
          border: '1px solid rgba(15,23,42,0.07)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          marginBottom: 0,
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', letterSpacing: '-0.02em' }}>Serapan Anggaran Bulanan</div>
          <div style={{ fontSize: 12, color: '#9CAABB', marginTop: 3 }}>Dana masuk, keluar, dan keluar PBB per bulan</div>
        </div>
        <div style={{ padding: '8px 8px 8px 0' }}>
          {(() => {
            const monthlyData: Record<number, { masuk: number; keluar: number; keluarPBB: number }> = {}
            transactions.forEach(t => {
              const date = new Date(t.tanggal)
              const month = date.getMonth()
              if (!monthlyData[month]) monthlyData[month] = { masuk: 0, keluar: 0, keluarPBB: 0 }
              if (t.jenis_transaksi === 'Masuk') monthlyData[month].masuk += t.nominal || 0
              else if (t.jenis_transaksi === 'Keluar') monthlyData[month].keluar += t.nominal || 0
              else if (t.jenis_transaksi === 'Keluar PBB') monthlyData[month].keluarPBB += t.nominal || 0
            })
            const chartData = Object.entries(monthlyData)
              .filter(([_, v]) => v.masuk > 0 || v.keluar > 0 || v.keluarPBB > 0)
              .map(([month, values]) => ({
                bulan: MONTHS[parseInt(month)].substring(0, 3),
                masuk: values.masuk,
                keluar: values.keluar,
                keluarPBB: values.keluarPBB,
              }))

            return (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={chartData} margin={{ top: 8, right: 20, left: 16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" vertical={false} />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11.5, fill: '#9CAABB' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9CAABB' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => v >= 1_000_000_000 ? `${(v/1_000_000_000).toFixed(0)}M` : `${(v/1_000_000).toFixed(0)}Jt`}
                  />
                  <Tooltip
                    formatter={(v: number) => formatRupiah(v)}
                    contentStyle={{ borderRadius: 10, border: '1px solid rgba(15,23,42,0.08)', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    cursor={{ fill: 'rgba(15,23,42,0.03)' }}
                  />
                  <Legend
                    formatter={(value) => {
                      const labels: Record<string, string> = { masuk: 'Dana Masuk', keluar: 'Dana Keluar Hamzah', keluarPBB: 'Dana Keluar PBB' }
                      return <span style={{ fontSize: 12, color: '#5C6B82' }}>{labels[value] || value}</span>
                    }}
                    wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                  />
                  <Bar dataKey="masuk" fill="#1A6FE8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="keluar" fill="#94A3B8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="keluarPBB" fill="#CBD5E1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )
          })()}
        </div>
      </div>

      {/* Pekerjaan Terbaru */}
      <PekerjaanTerbaruCard isAdmin={isAdmin} onSelectProgram={onAddPekerjaan} />

      {editingIssue && (
        <EditIsuModal
          issue={editingIssue}
          onClose={() => setEditingIssue(null)}
          onSuccess={async () => {
            const { data } = await fetchIssues()
            if (data) setIssues(data)
          }}
        />
      )}

      {addingIsu && (
        <AddIsuModal
          onClose={() => setAddingIsu(false)}
          onSuccess={async () => {
            const { data } = await fetchIssues()
            if (data) setIssues(data)
          }}
        />
      )}
    </div>
  )
}
