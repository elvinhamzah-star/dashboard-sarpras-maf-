import { useEffect, useState } from 'react'
import { Documentation, BeforeAfterPair, fetchBeforeAfterPairs } from '../lib/supabase'
import { adminInsert, adminDelete } from '../lib/adminApi'
import { getDriveThumbnailUrl, formatTanggal } from '../lib/data'
import ModalShell from './ModalShell'

interface Props {
  programId: string
  programName: string
  docs: Documentation[]
  onClose: () => void
  onSaved: () => void
}

type PickSlot = 'before' | 'after'

export default function ManageBeforeAfterModal({ programId, programName, docs, onClose, onSaved }: Props) {
  const [pairs, setPairs] = useState<BeforeAfterPair[]>([])
  const [loading, setLoading] = useState(true)
  const [beforeId, setBeforeId] = useState<string | null>(null)
  const [afterId, setAfterId] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [picking, setPicking] = useState<PickSlot | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const programDocs = docs.filter(d => d.program_id === programId)

  const loadPairs = async () => {
    setLoading(true)
    const { data } = await fetchBeforeAfterPairs()
    setPairs((data ?? []).filter(p => p.program_id === programId))
    setLoading(false)
  }

  useEffect(() => { loadPairs() }, [programId])

  const docById = (id: string | null) => (id ? programDocs.find(d => d.id === id) : undefined)

  const resetForm = () => { setBeforeId(null); setAfterId(null); setLabel(''); setPicking(null) }

  const handleSave = async (): Promise<boolean> => {
    if (!beforeId || !afterId) { setError('Pilih foto Sebelum dan Sesudah untuk membuat pasangan'); return false }
    setSaving(true)
    setError('')
    const { error: err } = await adminInsert('before_after_pairs', {
      id: crypto.randomUUID(),
      program_id: programId,
      before_doc_id: beforeId,
      after_doc_id: afterId,
      label: label.trim() || null,
      urutan: pairs.length,
    })
    setSaving(false)
    if (err) { setError('Gagal menyimpan: ' + err.message); return false }
    resetForm()
    await loadPairs()
    onSaved()
    return true
  }

  // "Selesai" — auto-save pending pair (if both slots filled) then close
  const handleSelesai = async () => {
    if (beforeId && afterId) {
      const ok = await handleSave()
      if (!ok) return  // save failed — stay open, show error
    }
    onClose()
  }

  const handleDelete = async (id: string) => {
    const { error: err } = await adminDelete('before_after_pairs', id)
    if (err) { setError('Gagal menghapus: ' + err.message); return }
    await loadPairs()
    onSaved()
  }

  const thumb = (d: Documentation | undefined) => d ? getDriveThumbnailUrl(d.link_foto) : null

  // ── Picker overlay: choose a photo from this program's docs ──
  if (picking) {
    const slotDocs = picking === 'before'
      ? programDocs.filter(d => d.fase === 'Kondisi Awal' || d.fase === 'Proses Pekerjaan')
      : programDocs.filter(d => d.fase === 'Kondisi Akhir')
    return (
      <ModalShell key="picker" onClose={() => setPicking(null)} maxWidth={640}>
        <div style={{ padding: '20px 20px 28px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Pilih foto {picking === 'before' ? 'Sebelum' : 'Sesudah'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
            {picking === 'before' ? 'Foto Kondisi Awal atau Proses Pekerjaan' : 'Foto Kondisi Akhir'}
          </div>
          {slotDocs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>
              {picking === 'before' ? 'Belum ada foto Kondisi Awal / Proses Pekerjaan.' : 'Belum ada foto Kondisi Akhir.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
              {slotDocs.map(d => {
                const t = thumb(d)
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      if (picking === 'before') setBeforeId(d.id); else setAfterId(d.id)
                      setPicking(null)
                    }}
                    style={{ padding: 0, border: '2px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: 'var(--surface-raised)', aspectRatio: '4/3', position: 'relative' }}
                  >
                    {t ? <img src={t} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>Tanpa preview</div>
                    )}
                    {d.fase && <span style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'rgba(0,0,0,0.6)', color: '#fff' }}>{d.fase}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </ModalShell>
    )
  }

  const slotBox = (slot: PickSlot) => {
    const id = slot === 'before' ? beforeId : afterId
    const d = docById(id)
    const t = thumb(d)
    const accent = slot === 'before' ? '#660000' : '#059669'
    return (
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {slot === 'before' ? 'Sebelum' : 'Sesudah'}
        </div>
        <button
          onClick={() => setPicking(slot)}
          style={{ width: '100%', aspectRatio: '4/3', borderRadius: 10, border: `1.5px dashed ${d ? 'transparent' : 'var(--border-strong)'}`, background: 'var(--surface-raised)', cursor: 'pointer', overflow: 'hidden', position: 'relative', padding: 0 }}
        >
          {t ? (
            <img src={t} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 6, color: 'var(--text-muted)' }}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Pilih foto</span>
            </div>
          )}
        </button>
      </div>
    )
  }

  return (
    <ModalShell key="main" onClose={onClose} maxWidth={560}>
      <div style={{ padding: '22px 20px 28px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Kelola Sebelum / Sesudah</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3, marginBottom: 18 }}>{programName}</div>

        {error && <div style={{ marginBottom: 14, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', color: '#E53E3E', fontSize: 12 }}>{error}</div>}

        {/* Builder */}
        <div style={{ background: 'var(--surface-raised)', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            {slotBox('before')}
            {slotBox('after')}
          </div>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label (opsional) — mis. nama titik / lokasi"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', backgroundColor: 'var(--card)', marginBottom: 12 }}
          />
          <button
            onClick={handleSave}
            disabled={saving || !beforeId || !afterId}
            style={{
              width: '100%', padding: '10px', borderRadius: 9,
              border: '1px solid var(--border-subtle)',
              backgroundColor: (!beforeId || !afterId) ? 'transparent' : 'rgba(26,111,232,0.07)',
              color: (!beforeId || !afterId) ? 'var(--text-muted)' : 'var(--blue)',
              fontSize: 13.5, fontWeight: 600,
              cursor: (saving || !beforeId || !afterId) ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1, fontFamily: 'inherit'
            }}
          >
            {saving ? 'Menyimpan...' : 'Tambah Pasangan'}
          </button>
        </div>

        {/* Selesai button */}
        <button
          onClick={handleSelesai}
          disabled={saving}
          style={{ width: '100%', padding: '9px', borderRadius: 9, border: '1px solid rgba(5,150,105,0.3)', backgroundColor: 'rgba(5,150,105,0.07)', color: '#059669', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', marginBottom: 20, opacity: saving ? 0.7 : 1 }}
        >
          {(beforeId && afterId) ? (saving ? 'Menyimpan...' : 'Simpan & Selesai') : 'Selesai'}
        </button>

        {/* Existing pairs */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
          Pasangan tersimpan ({pairs.length})
        </div>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12.5, padding: '10px 0' }}>Memuat...</div>
        ) : pairs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 12.5, padding: '10px 0' }}>Belum ada pasangan.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pairs.map(p => {
              const b = thumb(docById(p.before_doc_id))
              const a = thumb(docById(p.after_doc_id))
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--card)' }}>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <div style={{ width: 44, height: 34, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-raised)' }}>
                      {b ? <img src={b} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                    </div>
                    <div style={{ width: 44, height: 34, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-raised)' }}>
                      {a ? <img src={a} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.label || 'Tanpa label'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {docById(p.before_doc_id)?.tanggal ? formatTanggal(docById(p.before_doc_id)!.tanggal) : '—'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(102,0,0,0.1)', color: '#660000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ModalShell>
  )
}
