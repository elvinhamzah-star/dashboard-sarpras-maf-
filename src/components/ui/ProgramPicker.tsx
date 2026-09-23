import { useEffect, useState } from 'react'
import { fetchPrograms, Program } from '../../lib/supabase'
import Dropdown from './Dropdown'

interface ProgramPickerProps {
  programId: string | null
  onChangeProgram: (id: string | null, nama: string) => void
  zIndex?: number
}

export default function ProgramPicker({ programId, onChangeProgram, zIndex }: ProgramPickerProps) {
  const [programs, setPrograms] = useState<Program[]>([])

  useEffect(() => {
    fetchPrograms().then(({ data }) => { if (data) setPrograms(data) })
  }, [])

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
  }

  return (
    <div>
      <label style={labelStyle}>Pekerjaan</label>
      <Dropdown
        value={programId ?? ''}
        onChange={id => {
          const p = programs.find(x => x.id === id)
          onChangeProgram(id || null, p?.nama_pekerjaan ?? '')
        }}
        zIndex={zIndex}
        options={programs.map(p => ({ value: p.id, label: p.nama_pekerjaan }))}
        placeholder="Pilih pekerjaan..."
        searchable
        searchPlaceholder="Cari pekerjaan..."
      />
    </div>
  )
}
