import { useState } from 'react'
import { Program, ProgramSnapshot, SubProgram } from '../lib/supabase'
import { STATUS_COLORS, formatRupiah } from '../lib/data'

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function formatTanggal(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`
}

interface Props {
  programs: Program[]
  snapshots: ProgramSnapshot[]
  subPrograms: SubProgram[]
  progressLapangan: string | null
  freshnessDays: number | null
  lastUpdated: string
}

const TABS = ['On Going', 'On Hold', 'Selesai', 'Perencanaan']

function getVendorDisplay(program: Program, subPrograms: SubProgram[]): string {
  const subs = subPrograms.filter(s => s.program_id === program.id)
  if (subs.length === 0) return program.vendor || ''
  const uniqueVendors = [...new Set(subs.map(s => s.vendor).filter(v => v && v.trim()))]
  if (uniqueVendors.length === 0) return program.vendor || ''
  return uniqueVendors.join(' · ')
}

export default function BerandaWeekOverWeek({ programs, snapshots, subPrograms, progressLapangan, freshnessDays, lastUpdated }: Props) {
  const [activeTab, setActiveTab] = useState('On Going')

  const now = Date.now()
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000

  const wowMap: Record<string, { delta: number | null; prev: number | null }> = {}
  programs
    .filter(p => p.status === 'On Going' && p.jenis_pekerjaan !== 'Operasional')
    .forEach(p => {
      const programSnaps = snapshots
        .filter(s => s.program_id === p.id)
        .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))

      if (programSnaps.length < 2) {
        wowMap[p.id] = { delta: null, prev: null }
        return
      }

      const latest = programSnaps[programSnaps.length - 1]
      const weekAgoTarget = now - oneWeekMs
      const weekAgoSnap = programSnaps.reduce((closest, s) => {
        const diff = Math.abs(new Date(s.snapshot_date).getTime() - weekAgoTarget)
        const closestDiff = Math.abs(new Date(closest.snapshot_date).getTime() - weekAgoTarget)
        return diff < closestDiff ? s : closest
      })

      if (weekAgoSnap.snapshot_date === latest.snapshot_date) {
        wowMap[p.id] = { delta: null, prev: null }
        return
      }

      const current = latest.progress_percent ?? p.progress_percent ?? 0
      const prev = weekAgoSnap.progress_percent ?? 0
      wowMap[p.id] = { delta: current - prev, prev }
    })

  const countByStatus: Record<string, number> = {}
  programs.forEach(p => {
    countByStatus[p.status] = (countByStatus[p.status] || 0) + 1
  })

  const filteredPrograms = programs.filter(p => p.status === activeTab)

  const freshnessColor = freshnessDays === null
    ? 'var(--text-muted)'
    : freshnessDays === 0
      ? '#059669'
      : freshnessDays <= 3
        ? '#D97706'
        : '#DC2626'

  return (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      overflow: 'hidden',
      marginBottom: 20,
    }}>
      <div style={{ padding: '16px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Progress Program
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            {programs.length} program total
          </div>
        </div>
        {progressLapangan && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#7C3AED', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {progressLapangan}%
            </div>
            <div style={{ fontSize: 10, color: freshnessColor, fontWeight: 500, marginTop: 4 }}>
              {lastUpdated ? `diperbarui ${formatTanggal(lastUpdated)}` : 'progress lapangan'}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab
          const color = STATUS_COLORS[tab] || '#888'
          const count = countByStatus[tab] || 0
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '4px 12px', borderRadius: 20, border: 'none',
                cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
                backgroundColor: isActive ? color : 'var(--border-subtle)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.13s', fontFamily: 'inherit',
              }}
            >
              {tab} · {count}
            </button>
          )
        })}
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredPrograms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 12 }}>
            Tidak ada program dengan status ini.
          </div>
        ) : activeTab === 'Selesai' ? (
          filteredPrograms.map(p => {
            const sisa = p.sisa_anggaran ?? (p.total_anggaran ?? 0) - (p.realisasi_terkini ?? 0)
            const isEfficient = sisa > 0
            const isOver = sisa < 0
            const realisasiPct = p.total_anggaran
              ? Math.min(100, Math.round(((p.realisasi_terkini ?? 0) / p.total_anggaran) * 100))
              : 0
            return (
              <div key={p.id} style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1.5px solid var(--border-subtle)',
                borderLeft: '3px solid #059669',
                backgroundColor: 'var(--card)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.nama_pekerjaan}
                    </div>
                    {getVendorDisplay(p, subPrograms) && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{getVendorDisplay(p, subPrograms)}</div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatRupiah(p.realisasi_terkini ?? 0)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                      dari {formatRupiah(p.total_anggaran ?? 0)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${realisasiPct}%`,
                      backgroundColor: isOver ? '#DC2626' : '#059669',
                      borderRadius: 99,
                    }} />
                  </div>
                  {isEfficient && (
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, flexShrink: 0,
                      color: '#059669',
                      backgroundColor: 'rgba(5,150,105,0.1)',
                      padding: '2px 7px', borderRadius: 99,
                    }}>
                      Efisiensi {formatRupiah(sisa)}
                    </span>
                  )}
                  {isOver && (
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, flexShrink: 0,
                      color: '#DC2626',
                      backgroundColor: 'rgba(220,38,38,0.08)',
                      padding: '2px 7px', borderRadius: 99,
                    }}>
                      Lebih {formatRupiah(Math.abs(sisa))}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        ) : activeTab === 'Perencanaan' ? (
          filteredPrograms.map(p => (
            <div key={p.id} style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1.5px solid var(--border-subtle)',
              backgroundColor: 'var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.nama_pekerjaan}
                </div>
                {getVendorDisplay(p, subPrograms) && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{getVendorDisplay(p, subPrograms)}</div>
                )}
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                {p.total_anggaran ? (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(p.total_anggaran)}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Belum ditetapkan</span>
                )}
              </div>
            </div>
          ))
        ) : (
          filteredPrograms.map(p => {
            const wow = wowMap[p.id]
            const color = STATUS_COLORS[p.status] || '#1A6FE8'
            const isOnHold = p.status === 'On Hold'
            return (
              <div key={p.id} style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: `1.5px solid var(--border-subtle)`,
                borderLeft: isOnHold ? `3px solid ${color}` : `3px solid ${color}`,
                backgroundColor: 'var(--card)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.nama_pekerjaan}
                    </div>
                    {getVendorDisplay(p, subPrograms) && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{getVendorDisplay(p, subPrograms)}</div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 60 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color }}>
                      {p.progress_percent || 0}%
                    </div>
                    {p.status === 'On Going' && wow && (
                      wow.delta === null ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>–</span>
                      ) : wow.delta > 0 ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>▲ +{wow.delta}%</span>
                      ) : wow.delta < 0 ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>▼ {wow.delta}%</span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>→ 0%</span>
                      )
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 10, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, p.progress_percent || 0)}%`,
                    backgroundColor: color,
                    borderRadius: 99,
                  }} />
                </div>

                {p.isu_utama && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                      <svg width="11" height="11" fill="none" stroke="#D97706" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catatan</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 4 }}>
                      {p.isu_utama.split('\n').filter(l => l.trim()).map((line, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1, flexShrink: 0 }}>•</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
