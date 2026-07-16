/**
 * FilterSummaryBar
 *
 * Compact metric card row that appears when a status filter is active.
 * Renders 2–4 cards depending on the status, showing aggregate metrics
 * for all programs in that filter group.
 *
 * Used in:
 *  • Pekerjaan.tsx — full size, between filter tabs and card list
 *  • Beranda.tsx showDetail popup — compact size, between header and list
 */

import { Program, SubProgram } from '../lib/supabase'
import { deriveProgramTotals } from '../lib/deriveTotals'
import { formatRupiah } from '../lib/data'

interface Card {
  label: string
  value: string
  sub?: string
  accent: string
  bg: string
}

interface Props {
  status: string
  programs: Program[]
  subPrograms: SubProgram[]
  /** compact=true → smaller padding/font, used inside popups */
  compact?: boolean
  isMobile?: boolean
}

export default function FilterSummaryBar({
  status,
  programs,
  subPrograms,
  compact = false,
  isMobile = false,
}: Props) {
  if (programs.length === 0 || !status) return null

  // ── Aggregate derived totals ──────────────────────────────────────────────
  const derived = programs.map(p =>
    deriveProgramTotals(p, subPrograms.filter(s => s.program_id === p.id))
  )

  const totalAnggaran  = derived.reduce((s, d) => s + d.total_anggaran, 0)
  const totalRealisasi = derived.reduce((s, d) => s + d.realisasi_terkini, 0)
  const totalSisa      = totalAnggaran - totalRealisasi
  const serapPct       = totalAnggaran > 0
    ? ((totalRealisasi / totalAnggaran) * 100).toFixed(1)
    : '0'

  // Weighted-average progress (weight = anggaran per program)
  const weightBase   = totalAnggaran
  const avgProgress  = weightBase > 0
    ? Math.round(derived.reduce((s, d) => s + d.progress_percent * d.total_anggaran, 0) / weightBase)
    : derived.length > 0
      ? Math.round(derived.reduce((s, d) => s + d.progress_percent, 0) / derived.length)
      : 0

  // ── Efficiency (Selesai only) ─────────────────────────────────────────────
  const netDiff   = totalRealisasi - totalAnggaran
  const isOver    = netDiff > 0
  const isUnder   = netDiff < 0
  const effPct    = totalAnggaran > 0 ? Math.abs((netDiff / totalAnggaran) * 100).toFixed(1) : '0'
  // Value: rupiah number with sign prefix, or "Tepat Sesuai Pagu" if exact
  const effValue  = isUnder
    ? `+${formatRupiah(-netDiff)}`
    : isOver
      ? `-${formatRupiah(netDiff)}`
      : 'Tepat Sesuai Pagu'
  const effColor  = isUnder ? '#059669' : isOver ? '#DC2626' : '#6B7280'
  // Sub: label + percentage below/above pagu
  const effSub    = isUnder
    ? `efisiensi · ${effPct}% di bawah pagu`
    : isOver
      ? `melebihi pagu · ${effPct}% di atas pagu`
      : `dari ${programs.length} pekerjaan`

  // ── Build card definitions per status ─────────────────────────────────────
  let cards: Card[]

  if (status === 'Selesai') {
    cards = [
      {
        label: 'Total Anggaran',
        value: formatRupiah(totalAnggaran),
        sub: 'pagu awal seluruh pekerjaan',
        accent: '#1A6FE8',
        bg: 'rgba(26,111,232,0.06)',
      },
      {
        label: 'Nilai Realisasi',
        value: formatRupiah(totalRealisasi),
        sub: `${serapPct}% terserap`,
        accent: '#059669',
        bg: 'rgba(5,150,105,0.06)',
      },
      {
        label: 'Efisiensi Anggaran',
        value: effValue,
        sub: effSub,
        accent: effColor,
        bg: isOver ? 'rgba(220,38,38,0.06)' : isUnder ? 'rgba(5,150,105,0.06)' : 'rgba(107,114,128,0.06)',
      },
    ]
  } else if (status === 'On Going') {
    cards = [
      {
        label: 'Total Anggaran',
        value: formatRupiah(totalAnggaran),
        sub: `${programs.length} pekerjaan`,
        accent: '#1A6FE8',
        bg: 'rgba(26,111,232,0.06)',
      },
      {
        label: 'Realisasi Terkini',
        value: formatRupiah(totalRealisasi),
        sub: `${serapPct}% terserap`,
        accent: '#059669',
        bg: 'rgba(5,150,105,0.06)',
      },
      {
        label: 'Sisa Anggaran',
        value: formatRupiah(Math.abs(totalSisa)),
        sub: totalSisa < 0 ? 'melebihi pagu' : 'belum terserap',
        accent: totalSisa < 0 ? '#DC2626' : '#D97706',
        bg: totalSisa < 0 ? 'rgba(220,38,38,0.06)' : 'rgba(217,119,6,0.06)',
      },
      {
        label: 'Progress Rata-rata',
        value: `${avgProgress}%`,
        sub: 'bobot anggaran',
        accent: '#1A6FE8',
        bg: 'rgba(26,111,232,0.06)',
      },
    ]
  } else if (status === 'On Hold') {
    cards = [
      {
        label: 'Total Anggaran',
        value: formatRupiah(totalAnggaran),
        sub: `${programs.length} pekerjaan`,
        accent: '#1A6FE8',
        bg: 'rgba(26,111,232,0.06)',
      },
      {
        label: 'Realisasi Terkini',
        value: formatRupiah(totalRealisasi),
        sub: `${serapPct}% terserap`,
        accent: '#059669',
        bg: 'rgba(5,150,105,0.06)',
      },
      {
        label: 'Dana Tertahan',
        value: formatRupiah(totalSisa),
        sub: 'belum dapat dilanjutkan',
        accent: '#D97706',
        bg: 'rgba(217,119,6,0.06)',
      },
      {
        label: 'Jumlah Program',
        value: `${programs.length}`,
        sub: 'pekerjaan on hold',
        accent: '#6B7280',
        bg: 'rgba(107,114,128,0.06)',
      },
    ]
  } else {
    // Perencanaan — 2 cards only
    cards = [
      {
        label: 'Total Anggaran',
        value: formatRupiah(totalAnggaran),
        sub: 'direncanakan',
        accent: '#1A6FE8',
        bg: 'rgba(26,111,232,0.06)',
      },
      {
        label: 'Jumlah Program',
        value: `${programs.length}`,
        sub: 'belum dimulai',
        accent: '#6B7280',
        bg: 'rgba(107,114,128,0.06)',
      },
    ]
  }

  // ── Style tokens — intentionally understated, secondary to program cards ──
  // No shadow, no white bg — uses surface-raised so it visually sits "behind"
  // the white program cards below. Smaller fonts than PekerjaanDetail cards.
  const gap     = compact ? 6 : isMobile ? 6 : 8
  const pad     = compact ? '8px 10px' : isMobile ? '9px 11px' : '11px 14px'
  const lblSize = compact ? 8   : isMobile ? 8.5 : 9
  const valSize = compact ? 11  : isMobile ? 12  : 14
  const subSize = compact ? 8   : isMobile ? 8.5 : 9.5

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cards.length}, 1fr)`,
        gap,
        marginBottom: compact ? 0 : isMobile ? 10 : 12,
        padding: compact ? '8px 16px 10px' : 0,
        borderBottom: compact ? '1px solid var(--border-subtle)' : 'none',
        flexShrink: 0,
        animation: 'fadeSlideDown 0.18s ease',
      }}
    >
      {cards.map((card, i) => (
        <div
          key={i}
          style={{
            backgroundColor: 'var(--surface-raised)',
            borderRadius: compact ? 7 : 9,
            padding: pad,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{
            fontSize: lblSize,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: compact ? 2 : 3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {card.label}
          </div>
          <div style={{
            fontSize: valSize,
            fontWeight: 700,
            color: card.accent,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            {card.value}
          </div>
          {card.sub && (
            <div style={{
              fontSize: subSize,
              color: 'var(--text-muted)',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {card.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
