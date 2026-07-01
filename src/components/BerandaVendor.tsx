import { Program, SubProgram } from '../lib/supabase'
import { formatRupiah, getEffectiveProgress } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'

interface Props {
  programs: Program[]
  subPrograms: SubProgram[]
}

export default function BerandaVendor({ programs, subPrograms }: Props) {
  const width = useWindowWidth()
  const isNarrow = width < 900
  const programsWithSubs = new Set(subPrograms.map(s => s.program_id))

  const byVendor: Record<string, {
    programIds: Set<string>
    anggaran: number
    realisasi: number
    progressValues: number[]
  }> = {}

  const ensure = (v: string) => {
    if (!byVendor[v]) byVendor[v] = { programIds: new Set(), anggaran: 0, realisasi: 0, progressValues: [] }
  }

  // Sub-program vendor membawa data masing-masing
  subPrograms.forEach(s => {
    if (!s.vendor) return
    ensure(s.vendor)
    byVendor[s.vendor].programIds.add(s.program_id)
    byVendor[s.vendor].anggaran += s.total_anggaran || 0
    byVendor[s.vendor].realisasi += s.realisasi_terkini || 0
    byVendor[s.vendor].progressValues.push(s.progress_percent || 0)
  })

  // Program tanpa sub-program pakai program.vendor
  programs.forEach(p => {
    if (programsWithSubs.has(p.id) || !p.vendor) return
    ensure(p.vendor)
    byVendor[p.vendor].programIds.add(p.id)
    byVendor[p.vendor].anggaran += p.total_anggaran || 0
    byVendor[p.vendor].realisasi += p.realisasi_terkini || 0
    byVendor[p.vendor].progressValues.push(getEffectiveProgress(p))
  })

  const vendors = Object.entries(byVendor)
    .map(([vendor, d]) => ({
      vendor,
      count: d.programIds.size,
      totalAnggaran: d.anggaran,
      totalRealisasi: d.realisasi,
      avgProgress: d.progressValues.length > 0
        ? Math.round(d.progressValues.reduce((s, v) => s + v, 0) / d.progressValues.length)
        : 0,
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
          Ringkasan Per Vendor
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {vendors.length} Vendor Terdaftar
        </div>
      </div>

      {isNarrow ? (
        <div style={{ padding: '4px 0' }}>
          {vendors.map((v, i) => (
            <div key={v.vendor} style={{
              padding: '12px 16px',
              borderBottom: i < vendors.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{v.vendor}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v.count} Program</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${v.avgProgress}%`, height: '100%', backgroundColor: '#1A6FE8', borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1A6FE8', minWidth: 32 }}>
                  {v.avgProgress}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Anggaran</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(v.totalAnggaran)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Realisasi</div>
                  <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(v.totalRealisasi)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr>
                {['Vendor', 'Program', 'Progress', 'Anggaran', 'Realisasi'].map(h => (
                  <th key={h} style={{
                    padding: '9px 16px', textAlign: 'left',
                    fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--surface-subtle)', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendors.map((v, i) => (
                <tr key={v.vendor} style={{ borderBottom: i < vendors.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {v.vendor}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {v.count}
                  </td>
                  <td style={{ padding: '11px 16px', minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${v.avgProgress}%`, height: '100%', backgroundColor: '#1A6FE8', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1A6FE8', minWidth: 32 }}>
                        {v.avgProgress}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(v.totalAnggaran)}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12.5, color: '#059669', fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(v.totalRealisasi)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
