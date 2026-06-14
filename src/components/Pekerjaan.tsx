import { useEffect, useState } from 'react'
import { fetchPrograms, Program } from '../lib/supabase'
import { STATUS_COLORS, STATUS_BG, formatRupiah } from '../lib/data'

interface PekerjaanProps {
  isAdmin: boolean
  onSelectProgram: (id: string) => void
  onAddPekerjaan: () => void
}

const STATUS_TABS = ['Semua', 'On Going', 'Selesai', 'Perencanaan', 'On Hold']

export default function Pekerjaan({ isAdmin, onSelectProgram, onAddPekerjaan }: PekerjaanProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeStatus, setActiveStatus] = useState('Semua')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await fetchPrograms()
      if (data) setPrograms(data)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = programs.filter(p => {
    const matchSearch =
      p.nama_pekerjaan?.toLowerCase().includes(search.toLowerCase()) ||
      p.id?.toLowerCase().includes(search.toLowerCase()) ||
      p.vendor?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = activeStatus === 'Semua' || p.status === activeStatus
    return matchSearch && matchStatus
  })

  const statusCounts: Record<string, number> = { Semua: programs.length }
  programs.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  })

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F1C2E', margin: 0, letterSpacing: '-0.03em' }}>
            Daftar Pekerjaan
          </h1>
          <p style={{ color: '#5C6B82', fontSize: 13, marginTop: 5, fontWeight: 400 }}>
            {programs.length} total pekerjaan
          </p>
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
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A6FE8'
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

      {/* Search + Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <svg
            width="15" height="15"
            fill="none" stroke="#9CAABB" strokeWidth="2"
            viewBox="0 0 24 24"
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Cari pekerjaan, vendor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 34,
              paddingRight: 12,
              paddingTop: 9,
              paddingBottom: 9,
              border: '1px solid rgba(15,23,42,0.1)',
              borderRadius: 9,
              fontSize: 13,
              color: '#0F1C2E',
              backgroundColor: '#fff',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {STATUS_TABS.map(tab => {
            const isActive = activeStatus === tab
            const tabColor = tab === 'Semua' ? '#1A6FE8' : STATUS_COLORS[tab] || '#5C6B82'
            const count = statusCounts[tab] || 0
            return (
              <button
                key={tab}
                onClick={() => setActiveStatus(tab)}
                style={{
                  padding: '6px 13px',
                  borderRadius: 8,
                  border: isActive ? 'none' : '1px solid rgba(15,23,42,0.1)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: isActive ? (tab === 'Semua' ? '#1A6FE8' : `${STATUS_COLORS[tab]}18`) : '#fff',
                  color: isActive ? (tab === 'Semua' ? '#fff' : tabColor) : '#5C6B82',
                  transition: 'all 0.13s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(15,23,42,0.04)'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#0F1C2E'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#5C6B82'
                  }
                }}
              >
                {tab}
                {count > 0 && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    backgroundColor: isActive && tab !== 'Semua' ? `${STATUS_COLORS[tab]}25` : isActive ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.07)',
                    color: isActive ? (tab === 'Semua' ? '#fff' : tabColor) : '#9CAABB',
                    padding: '1px 5px',
                    borderRadius: 5,
                    lineHeight: 1.6,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 14,
          border: '1px solid rgba(15,23,42,0.07)',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9CAABB', fontSize: 13 }}>Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9CAABB', fontSize: 13 }}>Tidak ada pekerjaan ditemukan.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr>
                {['ID', 'Nama Pekerjaan', 'Program', 'Progress', 'Anggaran', 'Realisasi', 'Status', ''].map(h => (
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
              {filtered.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => onSelectProgram(p.id)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: '#fff',
                    transition: 'background 0.12s',
                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(15,23,42,0.04)' : 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFF')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
                >
                  <td style={{ padding: '12px 16px', fontSize: 11.5, color: '#9CAABB', fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {p.id}
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                    <div style={{ fontSize: 13, color: '#0F1C2E', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                      {p.nama_pekerjaan}
                    </div>
                    {p.vendor && (
                      <div style={{ fontSize: 11, color: '#9CAABB', marginTop: 2 }}>{p.vendor}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#5C6B82', whiteSpace: 'nowrap' }}>
                    {p.program || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          flex: 1,
                          height: 4,
                          backgroundColor: 'rgba(15,23,42,0.07)',
                          borderRadius: 10,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(p.progress_percent || 0, 100)}%`,
                            height: '100%',
                            backgroundColor: STATUS_COLORS[p.status] || '#1A6FE8',
                            borderRadius: 10,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: STATUS_COLORS[p.status] || '#1A6FE8', minWidth: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {p.progress_percent || 0}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12.5, color: '#0F1C2E', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(p.total_anggaran || 0)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12.5, color: '#059669', fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(p.realisasi_terkini || 0)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 9px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: STATUS_BG[p.status] || 'rgba(15,23,42,0.06)',
                        color: STATUS_COLORS[p.status] || '#5C6B82',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <svg width="14" height="14" fill="none" stroke="#C8D2E0" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
