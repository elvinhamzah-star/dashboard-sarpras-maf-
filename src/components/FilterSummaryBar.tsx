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
  const netDiff  = totalRealisasi - totalAnggaran
  const isOver   = netDiff > 0
  const isUnder  = netDiff < 0
  const effLabel = isUnder ? 'Efisien' : isOver ? 'Melebihi Pagu' : 'Tepat sesuai pagu'
  const effColor = isUnder ? '#059669' : isOver ? '#DC2626' : '#6B7280'
  const effSub   = netDiff !== 0
    ? (isUnder ? `hemat ${formatRupiah(-netDiff)}` : `lebih ${formatRupiah(netDiff)}`)
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
        value: effLabel,
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

  // ── Style tokens ──────────────────────────────────────────────────────────
  const isSmall  = compact || isMobile
  const gap      = isSmall ? 7 : 12
  const pad      = compact ? '9px 11px' : isMobile ? '10px 11px' : '13px 15px'
  const lblSize  = compact ? 8.5 : isMobile ? 9 : 9.5
  const valSize  = compact ? 11   : isMobile ? 12 : 13.5
  const subSize  = compact ? 8.5 : isMobile ? 9  : 10

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cards.length}, 1fr)`,
        gap,
        marginBottom: compact ? 0 : isMobile ? 12 : 16,
        padding: compact ? '10px 16px 12px' : 0,
        borderBottom: compact ? '1px solid var(--border-subtle)' : 'none',
        flexShrink: 0,
        animation: 'fadeSlideDown 0.18s ease',
      }}
    >
      {cards.map((card, i) => (
        <div
          key={i}
          style={{
            backgroundColor: card.bg,
            borderRadius: compact ? 8 : 10,
            padding: pad,
            border: `1px solid ${card.accent}22`,
          }}
        >
          <div style={{
            fontSize: lblSize,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            marginBottom: compact ? 3 : 5,
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
            lineHeight: 1.15,
          }}>
            {card.value}
          </div>
          {card.sub && (
            <div style={{
              fontSize: subSize,
              color: 'var(--text-muted)',
              marginTop: 3,
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
