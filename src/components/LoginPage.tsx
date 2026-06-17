import { useState } from 'react'
import { verifyLogin } from '../lib/adminApi'

interface LoginPageProps {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const canSubmit = username.trim().length > 0 && pin.length > 0 && !loading

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    const ok = await verifyLogin(username.trim(), pin)
    setLoading(false)
    if (ok) {
      sessionStorage.setItem('dashboard_auth', '1')
      onLogin()
    } else {
      setError('Username atau PIN salah.')
      setPin('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F1F4F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: '44px 36px 36px',
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 4px 32px rgba(15,23,42,0.10), 0 1px 4px rgba(15,23,42,0.06)',
        }}
      >
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img
            src="/LogoPBBNew.svg"
            alt="Peradaban Baik Bahagia"
            style={{ width: 260, height: 'auto', display: 'block', margin: '0 auto 6px' }}
          />
          <div style={{ fontSize: 12.5, color: '#9CAABB', fontWeight: 500 }}>
            Dashboard Sarpras MAF
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'rgba(15,23,42,0.07)', marginBottom: 28 }} />

        {/* Username */}
        <div style={{ marginBottom: 14 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, color: '#9CAABB',
            display: 'block', marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            placeholder="Masukkan username"
            autoFocus
            autoComplete="off"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(26,43,94,0.15)'}`,
              fontSize: 14, color: '#0D1829', fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(26,111,232,0.5)' }}
            onBlur={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(26,43,94,0.15)' }}
          />
        </div>

        {/* PIN */}
        <div style={{ marginBottom: error ? 8 : 24 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, color: '#9CAABB',
            display: 'block', marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            PIN
          </label>
          <input
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            placeholder="••••••"
            autoComplete="current-password"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(26,43,94,0.15)'}`,
              fontSize: 20, letterSpacing: '0.25em', color: '#0D1829',
              fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(26,111,232,0.5)' }}
            onBlur={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(26,43,94,0.15)' }}
          />
        </div>

        {error && (
          <div style={{
            marginBottom: 16, padding: '9px 12px', borderRadius: 8,
            backgroundColor: 'rgba(239,68,68,0.07)', color: '#DC2626',
            fontSize: 12.5, fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            backgroundColor: canSubmit ? '#1A6FE8' : 'rgba(15,23,42,0.08)',
            color: canSubmit ? '#fff' : '#9CAABB',
            fontSize: 14, fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', transition: 'all 0.15s',
            boxShadow: canSubmit ? '0 2px 8px rgba(26,111,232,0.25)' : 'none',
          }}
          onMouseEnter={e => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
          onMouseLeave={e => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A6FE8' }}
        >
          {loading ? 'Memeriksa...' : 'Masuk'}
        </button>
      </div>
    </div>
  )
}
