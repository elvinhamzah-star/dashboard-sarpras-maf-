import { useEffect, useState } from 'react'
import { getTalangan, adminUpdate, adminDelete } from '../lib/adminApi'
import { supabase, Talangan } from '../lib/supabase'
import { formatRupiah, formatTanggal } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import TalanganFormModal from './TalanganFormModal'

interface ProgramLite {
  id: string
  nama_pekerjaan: string
}

/**
 * Catatan Talangan — panel KHUSUS ADMIN di bawah halaman Keuangan.
 * Buku pribadi untuk "nalangin" pekerjaan yang dananya belum cair. Sengaja
 * BERDIRI SENDIRI: angkanya tidak pernah masuk ke saldoKas / Masuk / Keluar /
 * metrik Beranda. Data dibaca via PIN-gated get_talangan (lihat adminApi).
 */
export default function TalanganPanel() {
  const width = useWindowWidth()
  const isMobile = width < 600
  const [list, setList] = useState<Talangan[]>([])
  const [programs, setPrograms] = useState<ProgramLite[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Talangan | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = async () => {
    const { data } = await getTalangan()
    if (data) setList(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('programs').select('id, nama_pekerjaan').order('nama_pekerjaan').then(({ data }) => {
      if (data) setPrograms(data as ProgramLite[])
    })
  }, [])

  const berjalan = list.filter(t => t.status !== 'selesai')
  const selesai = list.filter(t => t.status === 'selesai')
  const totalBerjalan = berjalan.reduce((s, t) => s + (t.nominal || 0), 0)
  const totalSelesai = selesai.reduce((s, t) => s + (t.nominal || 0), 0)

  const toggleStatus = async (t: Talangan) => {
    setBusyId(t.id)
    const toSelesai = t.status !== 'selesai'
    await adminUpdate(
      'talangan',
      { status: toSelesai ? 'selesai' : 'berjalan', settled_at: toSelesai ? new Date().toISOString() : null },
      t.id,
    )
    await load()
    setBusyId(null)
  }

  const remove = async (t: Talangan) => {
    setBusyId(t.id)
    await adminDelete('talangan', t.id)
    setConfirmDeleteId(null)
    await load()
    setBusyId(null)
  }

  const openAdd = () => { setEditing(null); setShowForm(true) }
  const openEdit = (t: Talangan) => { setEditing(t); setShowForm(true) }

  const SummaryCard = ({ label, value, count, color, bg }: { label: string; value: number; count: string; color: string; bg: string }) => (
    <div style={{ flex: 1, minWidth: 150, background: bg, borderRadius: 10, padding: '11px 13px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color, letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: isMobile ? 17 : 19, fontWeight: 700, color, marginTop: 5, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(value)}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{count}</div>
    </div>
  )

  const btnStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, padding: '6px 11px', borderRadius: 8,
    border: '1px solid var(--border)', backgroundColor: 'var(--card)', cursor: 'pointer',
    color: 'var(--text-secondary)', whiteSpace: 'nowrap',
  }

  return (
    <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: isMobile ? 14 : 16, padding: isMobile ? 16 : 20, marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
        <svg width="16" height="16" fill="none" stroke="#D97706" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Catatan Talangan</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', backgroundColor: 'rgba(217,119,6,0.12)', borderRadius: 20, padding: '2px 9px', letterSpacing: '0.04em' }}>KHUSUS ADMIN</span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14 }}>
        Pekerjaan yang kamu bayari duluan karena dananya belum cair. <strong style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Tidak masuk hitungan arus kas.</strong>
      </div>

      {/* Ringkasan */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <SummaryCard label="TALANGAN BERJALAN" value={totalBerjalan} count={`${berjalan.length} pekerjaan belum diganti`} color="#D97706" bg="rgba(217,119,6,0.08)" />
        <SummaryCard label="SUDAH DIGANTI" value={totalSelesai} count={`${selesai.length} pekerjaan lunas`} color="#1B5E2B" bg="rgba(27,94,43,0.07)" />
      </div>

      {/* Daftar */}
      {loading ? (
        <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Memuat…</div>
      ) : list.length === 0 ? (
        <div style={{ padding: '28px 16px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 10 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Belum ada catatan talangan</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Catat saat kamu nalangin pekerjaan yang dananya belum cair.</div>
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {list.map((t, i) => {
            const done = t.status === 'selesai'
            const nama = t.nama_pekerjaan || programs.find(p => p.id === t.program_id)?.nama_pekerjaan || t.program_id
            const busy = busyId === t.id
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 10,
                  flexDirection: isMobile ? 'column' : 'row',
                  padding: '11px 13px',
                  borderBottom: i < list.length - 1 ? '1px solid var(--surface-min)' : 'none',
                  opacity: done ? 0.62 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{nama}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                    {formatTanggal(t.tanggal)}{t.keterangan ? ` · ${t.keterangan}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: done ? 'var(--text-secondary)' : '#D97706', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(t.nominal)}</div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: done ? '#1B5E2B' : '#D97706', backgroundColor: done ? 'rgba(27,94,43,0.12)' : 'rgba(217,119,6,0.13)', borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                    {done ? 'Selesai' : 'Berjalan'}
                  </span>
                </div>

                {/* Aksi */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                  {confirmDeleteId === t.id ? (
                    <>
                      <button disabled={busy} onClick={() => remove(t)} style={{ ...btnStyle, color: '#fff', backgroundColor: '#660000', border: '1px solid #660000' }}>
                        {busy ? '…' : 'Yakin hapus'}
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)} style={btnStyle}>Batal</button>
                    </>
                  ) : (
                    <>
                      <button disabled={busy} onClick={() => toggleStatus(t)} style={btnStyle}>
                        {done ? 'Jadikan Berjalan' : 'Tandai Selesai'}
                      </button>
                      <button onClick={() => openEdit(t)} style={btnStyle} aria-label="Edit">Edit</button>
                      <button onClick={() => setConfirmDeleteId(t.id)} style={{ ...btnStyle, color: '#660000' }} aria-label="Hapus">Hapus</button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tombol tambah */}
      <button
        onClick={openAdd}
        style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 7, backgroundColor: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Catat Talangan
      </button>

      {showForm && (
        <TalanganFormModal
          programs={programs}
          editing={editing}
          onClose={() => setShowForm(false)}
          onSuccess={load}
        />
      )}
    </div>
  )
}
