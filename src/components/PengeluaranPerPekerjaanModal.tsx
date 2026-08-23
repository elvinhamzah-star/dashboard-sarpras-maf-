import { useState } from 'react'
import ModalShell from './ModalShell'
import { formatRupiah, formatTanggal, getFileEmbedUrl } from '../lib/data'
import { Transaction } from '../lib/supabase'

interface Props {
  transactions: Transaction[]
  onClose: () => void
  onViewBukti: (bukti: { url: string; name: string }) => void
}

interface Group {
  nama: string
  total: number
  count: number
  items: Transaction[]
}

export default function PengeluaranPerPekerjaanModal({ transactions, onClose, onViewBukti }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const groups: Group[] = (() => {
    const map = new Map<string, Group>()
    transactions
      .filter(t => t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB')
      .forEach(t => {
        const key = t.nama_pekerjaan || '(Tanpa Nama Pekerjaan)'
        if (!map.has(key)) map.set(key, { nama: key, total: 0, count: 0, items: [] })
        const g = map.get(key)!
        g.total += t.nominal || 0
        g.count += 1
        g.items.push(t)
      })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  })()

  const grandTotal = groups.reduce((s, g) => s + g.total, 0)

  return (
    <ModalShell onClose={onClose} maxWidth={640} contentScroll={false}>
      {() => (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '20px 22px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Pengeluaran per Pekerjaan
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
              {groups.length} pekerjaan &middot; Total {formatRupiah(grandTotal)}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 16px 20px' }}>
            {groups.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Belum ada pengeluaran tercatat.
              </div>
            ) : groups.map(g => {
              const isOpen = expanded === g.nama
              return (
                <div key={g.nama} style={{ border: '1px solid var(--border)', borderRadius: 10, marginTop: 8, overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : g.nama)}
                    style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 14px', backgroundColor: isOpen ? 'var(--surface-2)' : 'var(--card)',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    <div style={{ minWidth: 0, marginRight: 10 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.nama}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{g.count} transaksi</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatRupiah(g.total)}
                      </span>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                        style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {g.items
                        .slice()
                        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                        .map(t => {
                          const nominalColor = t.jenis_transaksi === 'Keluar PBB' ? '#B45309' : 'var(--color-neutral-dark)'
                          return (
                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, backgroundColor: 'var(--surface-2)' }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {t.deskripsi || '-'}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{formatTanggal(t.tanggal)}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: nominalColor, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                  -{formatRupiah(t.nominal || 0)}
                                </span>
                                {t.link_bukti && (
                                  <button
                                    onClick={() => onViewBukti({ url: getFileEmbedUrl(t.link_bukti!) ?? t.link_bukti!, name: t.nama_pekerjaan || 'Bukti Transaksi' })}
                                    style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(26,111,232,0.2)', backgroundColor: 'rgba(26,111,232,0.06)', color: 'var(--blue)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                                  >
                                    Bukti
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </ModalShell>
  )
}
