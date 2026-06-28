import { Program, ProgramSnapshot } from '../lib/supabase'

interface Props {
  programs: Program[]
  snapshots: ProgramSnapshot[]
}

export default function BerandaWeekOverWeek({ programs, snapshots }: Props) {
  const ongoingPrograms = programs.filter(
    p => p.status === 'On Going' && p.jenis_pekerjaan !== 'Operasional'
  )

  if (ongoingPrograms.length === 0) return null

  const now = Date.now()
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000

  const rows = ongoingPrograms.map(p => {
    const programSnaps = snapshots
      .filter(s => s.program_id === p.id)
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))

    if (programSnaps.length < 2) {
      return { program: p, current: p.progress_percent, prev: null as number | null, delta: null as number | null }
    }

    const latest = programSnaps[programSnaps.length - 1]
    const weekAgoTarget = now - oneWeekMs

    const weekAgoSnap = programSnaps.reduce((closest, s) => {
      const diff = Math.abs(new Date(s.snapshot_date).getTime() - weekAgoTarget)
      const closestDiff = Math.abs(new Date(closest.snapshot_date).getTime() - weekAgoTarget)
      return diff < closestDiff ? s : closest
    })

    if (weekAgoSnap.snapshot_date === latest.snapshot_date) {
      return { program: p, current: latest.progress_percent ?? p.progress_percent, prev: null as number | null, delta: null as number | null }
    }

    const current = latest.progress_percent ?? p.progress_percent
    const prev = weekAgoSnap.progress_percent ?? 0
    return { program: p, current, prev, delta: (current ?? 0) - prev }
  })

  return (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      padding: '16px 20px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: 20,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        Progress Pekan Ini
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, marginBottom: 16 }}>
        Perubahan dari 7 hari lalu · {ongoingPrograms.length} program On Going
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(({ program, current, prev, delta }) => (
          <div key={program.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                marginBottom: 5,
              }}>
                {program.nama_pekerjaan}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, current ?? 0)}%`,
                    backgroundColor: '#1A6FE8',
                    borderRadius: 99,
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', minWidth: 28, textAlign: 'right' }}>
                  {current ?? 0}%
                </span>
              </div>
            </div>

            <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 68 }}>
              {delta === null ? (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>–</span>
              ) : delta > 0 ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>▲ +{delta}%</span>
              ) : delta < 0 ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>▼ {delta}%</span>
              ) : (
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)' }}>→ 0%</span>
              )}
              {prev !== null && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>dari {prev}%</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
