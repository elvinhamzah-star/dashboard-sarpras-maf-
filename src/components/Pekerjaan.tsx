import { useEffect, useState } from 'react'
import { fetchPrograms, fetchSubPrograms, hasMafCredentials, Program, SubProgram } from '../lib/supabase'
import { STATUS_COLORS, STATUS_BG, formatRupiah, getEffectiveProgress } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'

interface PekerjaanProps {
  isAdmin: boolean
  onSelectProgram: (id: string) => void
  onAddPekerjaan: () => void
  activeStatus: string
  onStatusChange: (s: string) => void
  search: string
  onSearchChange: (s: string) => void
}

const STATUS_TABS = ['Semua', 'On Going', 'On Hold', 'Selesai', 'Perencanaan']

export default function Pekerjaan({ isAdmin, onSelectProgram, onAddPekerjaan, activeStatus, onStatusChange, search, onSearchChange }: PekerjaanProps) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const isNarrow = width < 900
  const [programs, setPrograms] = useState<Program[]>([])
  const [subPrograms, setSubPrograms] = useState<SubProgram[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data }, { data: subData }] = await Promise.all([fetchPrograms(), fetchSubPrograms()])
      if (data) setPrograms(hasMafCredentials() ? data.filter(p => p.jenis_pekerjaan !== 'Operasional') : data)
      if (subData) setSubPrograms(subData)
      setLoading(false)
    }
    load()
  }, [])

  const getVendorDisplay = (p: Program): string => {
    const subs = subPrograms.filter(s => s.program_id === p.id)
    if (subs.length === 0) return p.vendor || ''
    const unique = [...new Set(subs.map(s => s.vendor).filter(v => v && v.trim()))]
    if (unique.length === 0) return p.vendor || ''
    return unique.join(' · ')
  }

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
    <div style={{ padding: isMobile ? '16px 14px 48px' : '28px 28px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
            Daftar Pekerjaan
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 5, fontWeight: 400 }}>
            {programs.length} Total Pekerjaan
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={onAddPekerjaan}
            style={{
              backgroundColor: 'var(--blue)',
              color: 'var(--card)',
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
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--blue)'
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
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 34,
              paddingRight: 12,
              paddingTop: 9,
              paddingBottom: 9,
              border: '1px solid var(--border)',
              borderRadius: 9,
              fontSize: 13,
              color: 'var(--text-primary)',
              backgroundColor: 'var(--card)',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {STATUS_TABS.map(tab => {
            const isActive = activeStatus === tab
            const tabColor = tab === 'Semua' ? 'var(--blue)' : STATUS_COLORS[tab] || 'var(--text-secondary)'
            const count = statusCounts[tab] || 0
            return (
              <button
                key={tab}
                onClick={() => onStatusChange(tab)}
                style={{
                  padding: '6px 13px',
                  borderRadius: 8,
                  border: isActive ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: isActive ? (tab === 'Semua' ? 'var(--blue)' : `${STATUS_COLORS[tab]}18`) : 'transparent',
                  color: isActive ? (tab === 'Semua' ? '#fff' : tabColor) : 'var(--text-secondary)',
                  transition: 'all 0.13s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {tab}
                {count > 0 && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    backgroundColor: isActive && tab !== 'Semua' ? `${STATUS_COLORS[tab]}25` : isActive ? 'rgba(255,255,255,0.2)' : 'var(--surface-2)',
                    color: isActive ? (tab === 'Semua' ? '#fff' : tabColor) : 'var(--text-muted)',
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

      {/* Card List */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Memuat Data...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Tidak Ada Pekerjaan Ditemukan.</div>
      ) : isNarrow ? (
        /* ── MOBILE / TABLET: original card style ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((p) => {
            const pct = getEffectiveProgress(p)
            return (
              <div
                key={p.id}
                onClick={() => onSelectProgram(p.id)}
                style={{ padding: '14px 16px', border: '1px solid #D8DDE8', borderRadius: 12, backgroundColor: 'var(--card)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      {p.isu_utama && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#D97706', flexShrink: 0 }} />}
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.nama_pekerjaan}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {p.id}{getVendorDisplay(p) ? ` · ${getVendorDisplay(p)}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, backgroundColor: STATUS_BG[p.status] || 'var(--border-subtle)', color: STATUS_COLORS[p.status] || 'var(--text-secondary)' }}>
                      {p.status}
                    </span>
                    <svg width="13" height="13" fill="none" stroke="#C8D2E0" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: STATUS_COLORS[p.status] || 'var(--blue)', borderRadius: 10 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[p.status] || 'var(--blue)', minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Anggaran</div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(p.total_anggaran || 0)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>Realisasi</div>
                    <div style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: (p.realisasi_terkini || 0) > 0 ? '#059669' : 'var(--text-muted)' }}>
                      {formatRupiah(p.realisasi_terkini || 0)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── DESKTOP: card list with hover effects ── */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {filtered.map((p) => {
            const pct = getEffectiveProgress(p)
            return (
              <div
                key={p.id}
                onClick={() => onSelectProgram(p.id)}
                style={{ padding: '18px 20px', border: '1px solid #D8DDE8', borderRadius: 12, backgroundColor: 'var(--card)', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'; el.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; el.style.transform = 'translateY(0)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      {p.isu_utama && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#D97706', flexShrink: 0 }} />}
                      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                        {p.nama_pekerjaan}
                      </div>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {p.id}{getVendorDisplay(p) ? ` · ${getVendorDisplay(p)}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, backgroundColor: STATUS_BG[p.status] || 'var(--border-subtle)', color: STATUS_COLORS[p.status] || 'var(--text-secondary)' }}>
                      {p.status}
                    </span>
                    <svg width="13" height="13" fill="none" stroke="#C8D2E0" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: STATUS_COLORS[p.status] || 'var(--blue)', borderRadius: 10, transition: 'width 0.3s ease' }} />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_COLORS[p.status] || 'var(--blue)', minWidth: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Anggaran</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(p.total_anggaran || 0)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Realisasi</div>
                    <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: (p.realisasi_terkini || 0) > 0 ? '#059669' : 'var(--text-muted)' }}>
                      {formatRupiah(p.realisasi_terkini || 0)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
