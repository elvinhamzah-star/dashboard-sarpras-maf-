import { Program } from '../lib/supabase'
import { formatRupiah } from '../lib/data'

interface Props {
  programs: Program[]
}

export default function BerandaVendor({ programs }: Props) {
  const byVendor: Record<string, Program[]> = {}
  programs.forEach(p => {
    if (!p.vendor) return
    if (!byVendor[p.vendor]) byVendor[p.vendor] = []
    byVendor[p.vendor].push(p)
  })

  const vendors = Object.entries(byVendor)
    .map(([vendor, progs]) => ({
      vendor,
      count: progs.length,
      totalAnggaran: progs.reduce((s, p) => s + (p.total_anggaran || 0), 0),
      totalRealisasi: progs.reduce((s, p) => s + (p.realisasi_terkini || 0), 0),
      avgProgress: Math.round(
        progs.reduce((s, p) => s + (p.progress_percent || 0), 0) / progs.length
      ),
    }))
    .sort((a, b) => b.totalAnggaran - a.totalAnggaran)

  if (vendors.length === 0) return null

  return (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      overflow: 'hidden',
      marginBottom: 20,
    }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Ringkasan per Vendor
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {vendors.length} vendor aktif
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr>
              {['Vendor', 'Program', 'Progress', 'Anggaran', 'Realisasi'].map(h => (
                <th
                  key={h}
                  style={{
                    padding: '9px 16px',
                    textAlign: 'left',
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--surface-subtle)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendors.map((v, i) => (
              <tr
                key={v.vendor}
                style={{ borderBottom: i < vendors.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
              >
                <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {v.vendor}
                </td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {v.count}
                </td>
                <td style={{ padding: '11px 16px', minWidth: 120 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        width: `${v.avgProgress}%`,
                        height: '100%',
                        backgroundColor: '#1A6FE8',
                        borderRadius: 99,
                      }} />
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1A6FE8', minWidth: 32 }}>
                      {v.avgProgress}%
                    </span>
                  </div>
                </td>
                <td style={{
                  padding: '11px 16px', fontSize: 12.5,
                  color: 'var(--text-primary)', whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatRupiah(v.totalAnggaran)}
                </td>
                <td style={{
                  padding: '11px 16px', fontSize: 12.5,
                  color: '#059669', fontWeight: 600, whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatRupiah(v.totalRealisasi)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
