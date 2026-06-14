import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { adminInsert, adminUpdate } from '../lib/adminApi'

interface WeeklyNote {
  id: string
  week_start: string
  week_end: string
  content: string
  created_at: string
  updated_at: string
}

interface CatatanPekanCardProps {
  isAdmin: boolean
}

export default function CatatanPekanCard({ isAdmin }: CatatanPekanCardProps) {
  const [notes, setNotes] = useState<WeeklyNote[]>([])
  const [currentNote, setCurrentNote] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const getWeekDates = (date = new Date()) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const weekStart = new Date(d.setDate(diff))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    return {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0],
    }
  }

  const currentWeek = getWeekDates()

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('weekly_notes')
      .select('*')
      .order('week_start', { ascending: false })

    if (data) {
      setNotes(data as WeeklyNote[])
      // Load current week's note
      const current = data.find((n: WeeklyNote) => n.week_start === currentWeek.start)
      setCurrentNote(current?.content || '')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async () => {
    if (!currentNote.trim()) {
      setError('Catatan tidak boleh kosong')
      return
    }

    setSaving(true)
    setError('')

    const existing = notes.find(n => n.week_start === currentWeek.start)

    if (existing) {
      const { error: err } = await adminUpdate('weekly_notes', {
        content: currentNote,
        week_start: currentWeek.start,
        week_end: currentWeek.end,
      }, existing.id)
      if (err) {
        setError(err.message || 'Gagal menyimpan')
      } else {
        load()
      }
    } else {
      const { error: err } = await adminInsert('weekly_notes', {
        week_start: currentWeek.start,
        week_end: currentWeek.end,
        content: currentNote,
      })
      if (err) {
        setError(err.message || 'Gagal menyimpan')
      } else {
        load()
      }
    }
    setSaving(false)
  }

  const formatWeekRange = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    return `${s.getDate()} - ${e.getDate()} ${months[e.getMonth()]}`
  }

  if (loading) return null

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 14,
        border: '1px solid rgba(15,23,42,0.07)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        marginTop: 20,
        marginBottom: 0,
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', letterSpacing: '-0.02em' }}>
            📋 Catatan Pekan
          </div>
          <div style={{ fontSize: 12, color: '#9CAABB', marginTop: 3 }}>
            {formatWeekRange(currentWeek.start, currentWeek.end)}
          </div>
        </div>
        {!isAdmin && notes.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(15,23,42,0.1)',
              backgroundColor: '#fff',
              color: '#5C6B82',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(15,23,42,0.04)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#0F1C2E'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#5C6B82'
            }}
          >
            Riwayat
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px' }}>
        {!showHistory ? (
          <>
            {isAdmin ? (
              <>
                <textarea
                  value={currentNote}
                  onChange={e => setCurrentNote(e.target.value)}
                  placeholder="Apa yang sudah dikerjakan minggu ini? Rencana minggu depan? Masalah apa?"
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(26,43,94,0.15)',
                    fontSize: 13,
                    color: '#0D1829',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    marginBottom: 12,
                  }}
                />
                {error && (
                  <div style={{ marginBottom: 12, padding: 8, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#991b1b', fontSize: 12 }}>
                    {error}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleSave}
                    disabled={saving || !currentNote.trim()}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: '#1A6FE8',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: saving || !currentNote.trim() ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Catatan'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ color: '#5C6B82', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {currentNote || <span style={{ color: '#C8D2E0', fontStyle: 'italic' }}>Belum ada catatan untuk minggu ini</span>}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notes.length === 0 ? (
              <div style={{ color: '#9CAABB', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Belum ada riwayat catatan</div>
            ) : (
              notes.map(note => (
                <div
                  key={note.id}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: 'rgba(15,23,42,0.03)',
                    border: '1px solid rgba(15,23,42,0.06)',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9CAABB', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {formatWeekRange(note.week_start, note.week_end)}
                  </div>
                  <div style={{ fontSize: 12, color: '#5C6B82', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {note.content}
                  </div>
                </div>
              ))
            )}
            <button
              onClick={() => setShowHistory(false)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid rgba(15,23,42,0.1)',
                backgroundColor: '#fff',
                color: '#5C6B82',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 4,
              }}
            >
              Kembali
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
