interface BulletInputProps {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}

export default function BulletInput({ items, onChange, placeholder = 'Tulis poin...' }: BulletInputProps) {
  const update = (i: number, val: string) => {
    const next = [...items]
    next[i] = val
    onChange(next)
  }
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const add = () => onChange([...items, ''])

  return (
    <div>
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--text-secondary)', flexShrink: 0 }} />
              <input
                type="text"
                value={item}
                onChange={e => update(i, e.target.value)}
                placeholder={placeholder}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(26,43,94,0.15)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  backgroundColor: 'var(--card)',
                }}
              />
              <button
                onClick={() => remove(i)}
                title="Hapus poin"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 20, lineHeight: 1,
                  padding: '0 2px', flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={add}
        style={{
          width: '100%',
          padding: '7px 10px',
          borderRadius: 8,
          border: '1px dashed rgba(26,43,94,0.2)',
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: 12,
          fontFamily: 'inherit',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          justifyContent: 'center',
          transition: 'border-color 0.15s',
        }}
      >
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Tambah poin
      </button>
    </div>
  )
}
