import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { adminInsert, adminUpdate } from '../lib/adminApi'
import { Program } from '../lib/supabase'
import BulletInput from './BulletInput'

interface WeeklyNote {
  id: string
  week_start: string
  week_end: string
  content: string
}

interface LaporanData {
  dikerjakan: string[]
  kendala: string[]
  rencana: string[]
}

interface LaporanPekananCardProps {
  isAdmin: boolean
  programs: Program[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const getWeekDates = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset * 7)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(d)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

const formatWeekRange = (start: string, end: string) => {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`
  }
  return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`
}

const parseContent = (content: string): LaporanData => {
  try {
    const p = JSON.parse(content)
    return {
      dikerjakan: Array.isArray(p.dikerjakan) ? p.dikerjakan : [],
      kendala: Array.isArray(p.kendala) ? p.kendala : [],
      rencana: Array.isArray(p.rencana) ? p.rencana : [],
    }
  } catch {
    return { dikerjakan: [], kendala: [], rencana: [] }
  }
}

const BulletList = ({ items }: { items: string[] }) => {
  const filtered = items.filter(i => i.trim())
  if (filtered.length === 0) {
    return <div style={{ fontSize: 12, color: '#C8D2E0', fontStyle: 'italic' }}>Belum ada catatan</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {filtered.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#9CAABB', flexShrink: 0, marginTop: 7 }} />
          <span style={{ fontSize: 13, color: '#0F1C2E', lineHeight: 1.5 }}>{item}</span>
        </div>
      ))}
    </div>
  )
}

export default function LaporanPekananCard({ isAdmin, programs }: LaporanPekananCardProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [note, setNote] = useState<WeeklyNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dikerjakan, setDikerjakan] = useState<string[]>([])
  const [kendala, setKendala] = useState<string[]>([])
  const [rencana, setRencana] = useState<string[]>([])

  const week = getWeekDates(weekOffset)
  const isCurrentWeek = weekOffset === 0

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('weekly_notes')
      .select('*')
      .eq('week_start', week.start)
      .maybeSingle()

    if (data) {
      setNote(data as WeeklyNote)
      const parsed = parseContent(data.content)
      setDikerjakan(parsed.dikerjakan)
      setKendala(parsed.kendala)
      setRencana(parsed.rencana)
    } else {
      setNote(null)
      setDikerjakan([])
      setKendala([])
      setRencana([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [weekOffset])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const content = JSON.stringify({
      dikerjakan: dikerjakan.filter(d => d.trim()),
      kendala: kendala.filter(k => k.trim()),
      rencana: rencana.filter(r => r.trim()),
    })

    const payload = { week_start: week.start, week_end: week.end, content }
    const result = note
      ? await adminUpdate('weekly_notes', payload, note.id)
      : await adminInsert('weekly_notes', payload)

    if (result.error) setError(result.error.message || 'Gagal menyimpan')
    else load()
    setSaving(false)
  }

  const activePrograms = programs.filter(p => p.status !== 'Selesai' && p.status !== 'selesai')

  const sections = [
    {
      key: 'dikerjakan',
      label: 'Sudah dikerjakan',
      items: dikerjakan,
      setter: setDikerjakan,
      placeholder: 'Progres atau pencapaian minggu ini...',
      iconColor: '#059669',
      icon: (
        <svg width="14" height="14" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 9"/>
        </svg>
      ),
    },
    {
      key: 'kendala',
      label: 'Kendala / update penting',
      items: kendala,
      setter: setKendala,
      placeholder: 'Kendala atau hal penting yang perlu dilaporkan...',
      iconColor: '#D97706',
      icon: (
        <svg width="14" height="14" fill="none" stroke="#D97706" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
    },
    {
      key: 'rencana',
      label: 'Rencana minggu depan',
      items: rencana,
      setter: setRencana,
      placeholder: 'Target atau rencana untuk minggu berikutnya...',
      iconColor: '#1A6FE8',
      icon: (
        <svg width="14" height="14" fill="none" stroke="#1A6FE8" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
    },
  ]

  if (loading) return null

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 14,
      border: '1px solid rgba(15,23,42,0.07)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', letterSpacing: '-0.02em' }}>Laporan Pekanan</div>
          <div style={{ fontSize: 12, color: '#9CAABB', marginTop: 2 }}>{formatWeekRange(week.start, week.end)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', background: '#fff', color: '#5C6B82', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            ← Sebelumnya
          </button>
          {weekOffset < 0 && (
            <>
              <button
                onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
                style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.1)', background: '#fff', color: '#5C6B82', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                →
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: '#1A6FE8', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Pekan ini
              </button>
            </>
          )}
        </div>
      </div>

      {/* Pekerjaan Aktif */}
      {activePrograms.length > 0 && (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CAABB', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Pekerjaan Aktif
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activePrograms.slice(0, 5).map(p => (
              <div key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#0F1C2E', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.nama_pekerjaan}
                  </span>
                  <span style={{ fontSize: 11, color: '#9CAABB', flexShrink: 0 }}>{p.progress_percent || 0}%</span>
                </div>
                <div style={{ height: 4, backgroundColor: 'rgba(15,23,42,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, p.progress_percent || 0)}%`, backgroundColor: '#1A6FE8', borderRadius: 99, transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3 catatan sections */}
      {sections.map((s, idx) => (
        <div key={s.key} style={{ padding: '14px 20px', borderBottom: idx < sections.length - 1 || (isAdmin && isCurrentWeek) ? '1px solid rgba(15,23,42,0.06)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {s.icon}
            <span style={{ fontSize: 11, fontWeight: 700, color: '#5C6B82', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s.label}
            </span>
          </div>
          {isAdmin && isCurrentWeek
            ? <BulletInput items={s.items} onChange={s.setter} placeholder={s.placeholder} />
            : <BulletList items={s.items} />
          }
        </div>
      ))}

      {/* Save button */}
      {isAdmin && isCurrentWeek && (
        <div style={{ padding: '12px 20px' }}>
          {error && (
            <div style={{ marginBottom: 8, padding: 8, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#991b1b', fontSize: 12 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', backgroundColor: '#1A6FE8', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Menyimpan...' : 'Simpan Laporan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
