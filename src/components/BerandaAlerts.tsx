import { useState } from 'react'
import { Program } from '../lib/supabase'
import { formatRupiah } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import ModalShell from './ModalShell'

interface BerandaAlertsProps {
  programs: Program[]
  showOverdue?: boolean
  showOverBudget?: boolean
  /** Saat true, alert menempel di dalam panel induk (hapus margin bawah, beri jarak atas) */
  embedded?: boolean
}

export default function BerandaAlerts({ programs, showOverdue = true, showOverBudget = true, embedded = false }: BerandaAlertsProps) {
  const today = new Date().toISOString().split('T')[0]
  const [showOverBudgetDetail, setShowOverBudgetDetail] = useState(false)
  const width = useWindowWidth()
  const isMobile = width < 600

  const overdue = showOverdue ? programs.filter(p =>
    p.target_selesai &&
    p.target_selesai < today &&
    !['Selesai', 'On Hold', 'Perencanaan'].includes(p.status)
  ) : []

  const overBudget = showOverBudget ? programs.filter(p => (p.sisa_anggaran ?? 0) < 0) : []

  if (overdue.length === 0 && overBudget.length === 0) return null

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: embedded ? 20 : 0, marginBottom: embedded ? 0 : 20 }}>
      {overdue.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(102,0,0,0.05)',
          border: '1px solid rgba(102,0,0,0.18)',
          borderLeft: '3px solid #660000',
          borderRadius: 10,
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <svg width="12" height="12" fill="none" stroke="#660000" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#660000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  <span style={{ fontSize: 11.5, color: 'var(--text-primary)', fontWeight: 500 }}>{p.nama_pekerjaan}</span>
                  <span style={{ fontSize: 10.5, color: '#660000', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {daysLate} Hari Terlambat
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {overBudget.length > 0 && (
        <div
          onClick={() => setShowOverBudgetDetail(true)}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = '#660000'
            el.style.backgroundColor = '#6600000D'
            el.style.boxShadow = '0 4px 16px #66000028'
            el.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = 'var(--border-subtle)'
            el.style.backgroundColor = 'var(--surface-raised)'
            el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
            el.style.transform = 'translateY(0)'
          }}
          style={{
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {overBudget.length} Program Melebihi Anggaran
            </span>
          </div>
          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 16px 12px' }}>
            {overBudget.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '6px 0',
                borderBottom: i < overBudget.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-primary)', fontWeight: 500 }}>{p.nama_pekerjaan}</span>
                <span style={{ fontSize: 10.5, color: '#660000', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  −{formatRupiah(Math.abs(p.sisa_anggaran ?? 0))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {showOverBudgetDetail && overBudget.length > 0 && (
      <ModalShell onClose={() => setShowOverBudgetDetail(false)} maxWidth={960} zIndex={1000} backdropColor="rgba(0,0,0,0.4)" contentScroll={false}>
        {(close) => {
          const totalSelisih = overBudget.reduce((s, p) => s + Math.abs(p.sisa_anggaran ?? 0), 0)
          return (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: isMobile ? '90vh' : '82vh' }}>
            {/* Header */}
            <div style={{ padding: isMobile ? '6px 20px 14px' : '18px 20px 15px', borderBottom: '1px solid var(--border-subtle)', position: 'relative', flexShrink: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', paddingRight: 34 }}>
                {overBudget.length} Program Melebihi Anggaran
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                Keterangan pekerjaan yang melampaui pagu anggaran
              </div>
              <button
                onClick={close}
                style={{
                  position: 'absolute', top: isMobile ? 3 : 15, right: 15,
                  width: 28, height: 28, borderRadius: 8, border: 'none',
                  background: 'var(--surface-min)', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Body — scroll */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {overBudget.map(p => {
                const lines = (p.isu_utama || '').split('\n').map(l => l.trim()).filter(Boolean)
                return (
                  <div key={p.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 11, overflow: 'hidden' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      padding: '11px 14px', background: 'var(--surface-min)', borderBottom: '1px solid var(--border-subtle)',
                    }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{p.nama_pekerjaan}</span>
                      <span style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Selisih</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatRupiah(Math.abs(p.sisa_anggaran ?? 0))}
                        </span>
                      </span>
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                        Catatan Pekerjaan
                      </div>
                      {lines.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {lines.map((line, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--text-secondary)', flexShrink: 0, marginTop: 6 }} />
                              <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{line}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Belum ada catatan. Tambahkan alasan di halaman detail pekerjaan.
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer — sticky ringkasan (samakan bentuk dengan modal metrik) */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-subtle)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#660000', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{overBudget.length} program</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total selisih</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{formatRupiah(totalSelisih)}</div>
                </div>
              </div>
            </div>
          </div>
          )
        }}
      </ModalShell>
    )}
    </>
  )
}
