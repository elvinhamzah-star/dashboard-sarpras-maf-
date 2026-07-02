import { Program } from '../lib/supabase'
import { formatRupiah } from '../lib/data'

interface BerandaAlertsProps {
  programs: Program[]
}

export default function BerandaAlerts({ programs }: BerandaAlertsProps) {
  const today = new Date().toISOString().split('T')[0]

  const overdue = programs.filter(p =>
    p.target_selesai &&
    p.target_selesai < today &&
    !['Selesai', 'On Hold', 'Perencanaan'].includes(p.status)
  )

  const overBudget = programs.filter(p => (p.sisa_anggaran ?? 0) < 0)

  if (overdue.length === 0 && overBudget.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {overdue.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(220,38,38,0.05)',
          border: '1px solid rgba(220,38,38,0.18)',
          borderLeft: '3px solid #DC2626',
          borderRadius: 10,
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <svg width="14" height="14" fill="none" stroke="#DC2626" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
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
          border: '1px solid var(--border-subtle)',
          borderLeft: '3px solid #D97706',
          borderRadius: 10,
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {overBudget.length} Program Melebihi Anggaran
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {overBudget.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
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
