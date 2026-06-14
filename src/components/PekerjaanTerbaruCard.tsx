import { useState, useEffect, Fragment } from 'react'
import { supabase, Program, fetchPrograms } from '../lib/supabase'
import { formatRupiah, formatTanggal, STATUS_COLORS } from '../lib/data'
import TambahPekerjaanModal from './TambahPekerjaanModal'

interface PekerjaaItem {
  programId: string
  startDate: string
  endDate: string
  activities: string[]
  notes: string[]
}

interface PekerjaanTerbaruCardProps {
  isAdmin: boolean
  onSelectProgram?: (programId: string) => void
}

export default function PekerjaanTerbaruCard({ isAdmin, onSelectProgram }: PekerjaanTerbaruCardProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [pekerjaanList, setPekerjaanList] = useState<PekerjaaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null)
  const [filterFromDate, setFilterFromDate] = useState<string>('')
  const [filterToDate, setFilterToDate] = useState<string>('')

  const dateInputStyle = `
    .pekerjaan-date-input::placeholder {
      color: #9CAABB !important;
      opacity: 1 !important;
    }
    .pekerjaan-date-input::-webkit-input-placeholder {
      color: #9CAABB !important;
    }
    .pekerjaan-date-input:-moz-placeholder {
      color: #9CAABB !important;
    }
    .pekerjaan-date-input::-moz-placeholder {
      color: #9CAABB !important;
    }
    .pekerjaan-date-input:-ms-input-placeholder {
      color: #9CAABB !important;
    }
  `

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const progsRes = await fetchPrograms()
        if (progsRes.data) {
          const sorted = [...progsRes.data].sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
          setPrograms(sorted)

          // Try to load pekerjaan data from localStorage
          const stored = localStorage.getItem('pekerjaan_terbaru_list')
          if (stored) {
            try {
              setPekerjaanList(JSON.parse(stored))
            } catch (err) {
              console.error('Error loading pekerjaan data:', err)
            }
          }
        }
      } catch (err) {
        console.error('Error loading programs:', err)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleAddSuccess = (data: {
    programId: string
    startDate: string
    endDate: string
    activities: string[]
    notes: string[]
  }) => {
    const updatedList = pekerjaanList.filter(p => p.programId !== data.programId)
    updatedList.unshift(data)
    setPekerjaanList(updatedList)
    localStorage.setItem('pekerjaan_terbaru_list', JSON.stringify(updatedList))
    setShowAddModal(false)
  }

  const handleDelete = (programId: string) => {
    if (!window.confirm('Yakin ingin menghapus pekerjaan ini?')) return
    // Remove from programs list
    const updatedPrograms = programs.filter(p => p.id !== programId)
    setPrograms(updatedPrograms)
    // Also remove from custom pekerjaan data if exists
    const updatedList = pekerjaanList.filter(p => p.programId !== programId)
    setPekerjaanList(updatedList)
    localStorage.setItem('pekerjaan_terbaru_list', JSON.stringify(updatedList))
    setExpandedProgram(null)
  }

  const formatPeriod = (startDate: string, endDate: string) => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]}`
  }

  const getPekerjaanData = (programId: string) => {
    return pekerjaanList.find(p => p.programId === programId)
  }

  const getFilteredPrograms = () => {
    // Only show programs that have pekerjaan data (from localStorage)
    const programsWithData = programs.filter(prog => getPekerjaanData(prog.id))

    if (!filterFromDate && !filterToDate) {
      return programsWithData
    }

    const fromDate = filterFromDate ? new Date(filterFromDate) : null
    const toDate = filterToDate ? new Date(filterToDate) : null

    return programsWithData.filter(prog => {
      const pekData = getPekerjaanData(prog.id)
      if (!pekData) return true

      const pekStartDate = new Date(pekData.startDate)
      const pekEndDate = new Date(pekData.endDate)

      if (fromDate && pekEndDate < fromDate) return false
      if (toDate && pekStartDate > toDate) return false

      return true
    })
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
      <style>{dateInputStyle}</style>
      {/* Header — title kiri, filter + tombol kanan */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        {/* Kiri: judul + periode */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', letterSpacing: '-0.02em' }}>Pekerjaan Terbaru</div>
          {pekerjaanList.length > 0 && pekerjaanList[0] && (
            <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <span style={{ fontWeight: 500, color: '#9CAABB' }}>Periode:</span>
              <span style={{
                backgroundColor: 'rgba(15,23,42,0.05)',
                color: '#5C6B82',
                padding: '2px 9px',
                borderRadius: 5,
                fontSize: 11.5,
                fontWeight: 500,
              }}>
                {formatPeriod(pekerjaanList[0].startDate, pekerjaanList[0].endDate)}
              </span>
            </div>
          )}
        </div>

        {/* Kanan: filter inputs + tombol */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Dari Tanggal */}
          {[
            { label: 'Dari', value: filterFromDate, onChange: setFilterFromDate },
            { label: 'S/d', value: filterToDate, onChange: setFilterToDate },
          ].map(({ label, value, onChange }) => (
            <div key={label} style={{ position: 'relative', display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.09)', borderRadius: 8, height: 34, paddingLeft: 8, paddingRight: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9CAABB', whiteSpace: 'nowrap', flexShrink: 0, marginRight: 4 }}>{label}</span>
              <svg
                width="13" height="13"
                fill="none" stroke="#C8D2E0" strokeWidth="2" viewBox="0 0 24 24"
                style={{ flexShrink: 0, marginRight: 4 }}
              >
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <input
                type="date"
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: 12,
                  color: value ? '#0F1C2E' : '#9CAABB',
                  fontFamily: 'inherit',
                  backgroundColor: 'transparent',
                  width: 112,
                  cursor: 'pointer',
                }}
              />
            </div>
          ))}

          {/* Hapus Filter */}
          {(filterFromDate || filterToDate) && (
            <button
              onClick={() => { setFilterFromDate(''); setFilterToDate('') }}
              style={{
                height: 34,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid rgba(220,38,38,0.2)',
                backgroundColor: 'rgba(220,38,38,0.05)',
                color: '#DC2626',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.13s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(220,38,38,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(220,38,38,0.05)' }}
            >
              ✕ Reset
            </button>
          )}

          {/* Tambah (admin) */}
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                height: 34,
                padding: '0 14px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#1A6FE8',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                transition: 'background 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A6FE8' }}
            >
              + Tambah
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr>
              {['', 'No', 'Nama Pekerjaan', 'Progress', 'Anggaran', 'Realisasi', 'Status'].map(h => (
                <th
                  key={h}
                  style={{
                    padding: '11px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#9CAABB',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    borderBottom: '1px solid rgba(15,23,42,0.06)',
                    backgroundColor: '#FAFBFC',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getFilteredPrograms().map((prog, i) => {
              const pekData = getPekerjaanData(prog.id)
              const isExpanded = expandedProgram === prog.id
              return (
                <Fragment key={prog.id}>
                  {/* Main Row */}
                  <tr
                    style={{
                      borderBottom: '1px solid rgba(15,23,42,0.04)',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onClick={() => setExpandedProgram(isExpanded ? null : prog.id)}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFF')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
                  >
                    <td style={{ padding: '11px 16px', textAlign: 'center', width: 36 }}>
                      <span style={{ fontSize: 10, color: '#C8D2E0', transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                        ▶
                      </span>
                    </td>

                    <td style={{ padding: '11px 16px', fontSize: 12, color: '#9CAABB', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                    <td style={{ padding: '11px 16px', maxWidth: 180 }}>
                      <div style={{ fontSize: 13, color: '#0F1C2E', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                        {prog.nama_pekerjaan}
                      </div>
                    </td>

                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 56, height: 4, backgroundColor: 'rgba(15,23,42,0.07)', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${prog.progress_percent || 0}%`,
                              backgroundColor: STATUS_COLORS[prog.status] || '#1A6FE8',
                              borderRadius: 10,
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: STATUS_COLORS[prog.status] || '#1A6FE8', minWidth: 28, fontVariantNumeric: 'tabular-nums' }}>
                          {prog.progress_percent || 0}%
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '11px 16px', fontSize: 12.5, color: '#0F1C2E', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {formatRupiah(prog.total_anggaran || 0)}
                    </td>

                    <td style={{ padding: '11px 16px', fontSize: 12.5, color: '#059669', fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {formatRupiah(prog.realisasi_terkini || 0)}
                    </td>

                    <td style={{ padding: '11px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 9px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: STATUS_COLORS[prog.status] ? `${STATUS_COLORS[prog.status]}18` : 'rgba(15,23,42,0.06)',
                          color: STATUS_COLORS[prog.status] || '#5C6B82',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {prog.status}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded Details Row */}
                  {isExpanded && (
                    <tr style={{ backgroundColor: 'rgba(26,111,232,0.02)', borderBottom: '1px solid rgba(15,23,42,0.04)' }}>
                      <td colSpan={7} style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                          {/* Aktivitas */}
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F1C2E', marginBottom: 10, letterSpacing: '-0.01em' }}>
                              Aktivitas Pekerjaan
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {pekData && pekData.activities.length > 0 ? (
                                pekData.activities.map((activity, idx) => (
                                  <div key={idx} style={{ fontSize: 12, color: '#5C6B82', display: 'flex', gap: 8 }}>
                                    <span style={{ fontWeight: 700, color: '#9CAABB', minWidth: 18, flexShrink: 0 }}>{idx + 1}.</span>
                                    <span>{activity}</span>
                                  </div>
                                ))
                              ) : (
                                <div style={{ fontSize: 12, color: '#C8D2E0', fontStyle: 'italic' }}>Belum ada aktivitas</div>
                              )}
                            </div>
                          </div>

                          {/* Catatan */}
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F1C2E', marginBottom: 10, letterSpacing: '-0.01em' }}>
                              Catatan Pekerjaan
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {pekData && pekData.notes.length > 0 ? (
                                pekData.notes.map((note, idx) => (
                                  <div key={idx} style={{ fontSize: 12, color: '#5C6B82', display: 'flex', gap: 8 }}>
                                    <span style={{ color: '#C8D2E0', flexShrink: 0 }}>•</span>
                                    <span>{note}</span>
                                  </div>
                                ))
                              ) : (
                                <div style={{ fontSize: 12, color: '#C8D2E0', fontStyle: 'italic' }}>Belum ada catatan</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {isAdmin && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(15,23,42,0.05)' }}>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                handleDelete(prog.id)
                              }}
                              style={{
                                padding: '7px 14px',
                                borderRadius: 8,
                                border: '1px solid rgba(220,38,38,0.2)',
                                backgroundColor: 'rgba(220,38,38,0.05)',
                                color: '#DC2626',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.13s',
                              }}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(220,38,38,0.1)'
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(220,38,38,0.05)'
                              }}
                            >
                              Hapus Pekerjaan
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Tambah Pekerjaan Modal */}
      {isAdmin && showAddModal && (
        <TambahPekerjaanModal
          programs={programs}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  )
}
