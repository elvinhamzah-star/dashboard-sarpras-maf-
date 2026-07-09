import { Program } from '../lib/supabase'
import { formatRupiah } from '../lib/data'

interface BerandaAlertsProps {
  programs: Program[]
  showOverdue?: boolean
  showOverBudget?: boolean
}

export default function BerandaAlerts({ programs, showOverdue = true, showOverBudget = true }: BerandaAlertsProps) {
  const today = new Date().toISOString().split('T')[0]

  const overdue = showOverdue ? programs.filter(p =>
    p.target_selesai &&
    p.target_selesai < today &&
    !['Selesai', 'On Hold', 'Perencanaan'].includes(p.status)
  ) : []

  const overBudget = showOverBudget ? programs.filter(p => (p.sisa_anggaran ?? 0) < 0) : []

  if (overdue.length === 0 && overBudget.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {overdue.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(102,0,0,0.05)',
          border: '1px solid rgba(102,0,0,0.18)',
          borderLeft: '3px solid #660000',
          borderRadius: 10,
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <svg width="14" height="14" fill="none" stroke="#660000" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#660000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {overdue.length} Program Melewati Deadline
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {overdue.map(p => {
              const daysLate = Math.floor(
                (new Date(today).getTime() - new Date(p.target_selesai!).getTime()) / 86400000
              )
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>{p.nama_pekerjaan}</span>
                  <span style={{ fontSize: 11, color: '#660000', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {daysLate} Hari Terlambat
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {overBudget.length > 0 && (
        <div style={{
          backgroundColor: 'var(--card)',
          border: '1px solid rgba(217,119,6,0.18)',
          borderLeft: '3px solid #D97706',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 16px',
            borderBottom: '1px solid rgba(217,119,6,0.1)',
            backgroundColor: 'rgba(217,119,6,0.03)',
          }}>
            <svg width="14" height="14" fill="none" stroke="#D97706" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {overBudget.length} Program Melebihi Anggaran
            </span>
          </div>
          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 16px 12px' }}>
            {overBudget.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '6px 0',
                borderBottom: i < overBudget.length - 1 ? '1px solid rgba(217,119,6,0.1)' : 'none',
              }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>{p.nama_pekerjaan}</span>
                <span style={{ fontSize: 11, color: '#D97706', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  −{formatRupiah(Math.abs(p.sisa_anggaran ?? 0))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
