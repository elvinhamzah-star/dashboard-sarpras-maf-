import { useState, useEffect } from 'react'
import { fetchPrograms, fetchSubPrograms, Program, SubProgram } from '../lib/supabase'
import { deriveProgramTotals, CHECKLIST_PROGRESS_PROGRAM_IDS } from '../lib/deriveTotals'
import { getEffectiveProgress } from '../lib/data'

const STATUS_COLOR: Record<string, string> = {
  'Selesai':     '#16a34a',
  'On Going':    '#0958B1',
  'On Hold':     '#d97706',
  'Perencanaan': '#6b7280',
}
const STATUS_BG: Record<string, string> = {
  'Selesai':     '#dcfce7',
  'On Going':    '#dbeafe',
  'On Hold':     '#fef3c7',
  'Perencanaan': '#f3f4f6',
}

function getProgramProgress(p: Program, subs: SubProgram[]): number {
  const programSubs = subs.filter(sp => sp.program_id === p.id)
  if (programSubs.length === 0) return getEffectiveProgress(p)
  return deriveProgramTotals(p, programSubs).progress_percent
}

function computeOverallProgress(programs: Program[], subs: SubProgram[]): number | null {
  const active = programs.filter(p => p.status === 'On Going' || p.status === 'On Hold' || p.status === 'Selesai')
  const totalAnggaran = active.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  if (totalAnggaran === 0) return null
  const weighted = active.reduce((s, p) => s + getProgramProgress(p, subs) * (p.total_anggaran || 0), 0)
  return Math.round(weighted / totalAnggaran * 10) / 10
}

export default function BerandaPublik() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [subs, setSubs] = useState<SubProgram[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchPrograms(), fetchSubPrograms()]).then(([p, s]) => {
      setPrograms(p.data ?? [])
      setSubs(s.data ?? [])
      setLoading(false)
    })
  }, [])

  const overall = computeOverallProgress(programs, subs)

  const counts = {
    selesai:     programs.filter(p => p.status === 'Selesai').length,
    berjalan:    programs.filter(p => p.status === 'On Going').length,
    onHold:      programs.filter(p => p.status === 'On Hold').length,
    perencanaan: programs.filter(p => p.status === 'Perencanaan').length,
  }

  const activePrograms = programs.filter(p =>
    p.status === 'On Going' || p.status === 'On Hold' || p.status === 'Selesai' || p.status === 'Perencanaan'
  )

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: '#F0F4FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #CBD5E1', borderTopColor: '#0958B1', animation: 'spin 0.7s linear infinite' }} />
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#F0F4FA', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0A1628', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/pbb-app-icon-white.svg" alt="" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Sarpras MAF</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Progres Maintenance 2026</div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* Overall progress card */}
        <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: '24px 20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Progres Keseluruhan
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#0958B1', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {overall !== null ? `${overall}%` : '—'}
          </div>
          <div style={{ marginTop: 14, height: 8, backgroundColor: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${overall ?? 0}%`, backgroundColor: '#0958B1', borderRadius: 999, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: '#94A3B8' }}>
            Dihitung dari {programs.filter(p => p.status !== 'Perencanaan').length} pekerjaan aktif, dibobot anggaran
          </div>
        </div>

        {/* Status counts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Selesai',      count: counts.selesai,     color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Berjalan',     count: counts.berjalan,    color: '#0958B1', bg: '#eff6ff' },
            { label: 'On Hold',      count: counts.onHold,      color: '#d97706', bg: '#fffbeb' },
            { label: 'Perencanaan',  count: counts.perencanaan, color: '#6b7280', bg: '#f9fafb' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} style={{ backgroundColor: bg, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color, lineHeight: 1.3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Program list */}
        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, paddingLeft: 2 }}>
          Daftar Pekerjaan ({programs.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activePrograms.map(p => {
            const progress = getProgramProgress(p, subs)
            const isChecklist = CHECKLIST_PROGRESS_PROGRAM_IDS.has(p.id)
            return (
              <div key={p.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 2 }}>{p.id}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1E293B', lineHeight: 1.35 }}>{p.nama_pekerjaan}</div>
                  </div>
                  <span style={{
                    flexShrink: 0,
                    fontSize: 11, fontWeight: 600,
                    color: STATUS_COLOR[p.status] ?? '#6b7280',
                    backgroundColor: STATUS_BG[p.status] ?? '#f3f4f6',
                    borderRadius: 20, padding: '3px 10px',
                  }}>{p.status}</span>
                </div>
                {p.status !== 'Perencanaan' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{isChecklist ? 'Progres fisik (checklist)' : 'Progres'}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[p.status] ?? '#1E293B' }}>{progress}%</div>
                    </div>
                    <div style={{ height: 5, backgroundColor: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, backgroundColor: STATUS_COLOR[p.status] ?? '#0958B1', borderRadius: 999 }} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#94A3B8', lineHeight: 1.6 }}>
          Tim Rumah Tangga — Madrasah Al Fatih Situdaun<br />
          Data real-time dari dashboard internal
        </div>
      </div>
    </div>
  )
}
