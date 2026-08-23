import { useState, useRef, useEffect } from 'react'
import { verifyLogin } from '../lib/adminApi'
import { setMafCredentials } from '../lib/supabase'
import { MOBILE_BREAKPOINT } from '../lib/breakpoint'

interface LoginPageProps {
  onLogin: (role: 'pbb' | 'maf') => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const usernameRef = useRef<HTMLInputElement>(null)

  // Auto-focus username only on desktop — prevents iOS viewport zoom
  useEffect(() => {
    if (!window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches) {
      usernameRef.current?.focus()
    }
  }, [])

  const canSubmit = username.trim().length > 0 && pin.length > 0 && !loading

  // Reset iOS viewport zoom — called after any input blur and before navigating away.
  // Briefly sets maximum-scale=1 (snaps zoom back to 1:1) then restores the original meta.
  const resetViewportZoom = () => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    if (!meta) return
    const orig = meta.content
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1'
    requestAnimationFrame(() => { meta.content = orig })
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    const { ok, role } = await verifyLogin(username.trim().toLowerCase(), pin)
    setLoading(false)
    if (ok && role) {
      resetViewportZoom()          // Undo any zoom before entering the app
      if (role === 'maf') setMafCredentials(username.trim().toLowerCase(), pin)
      sessionStorage.setItem('dashboard_auth', '1')
      sessionStorage.setItem('dashboard_role', role)
      onLogin(role)
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
        minHeight: '100dvh',
        backgroundColor: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: 20,
          padding: '44px 36px 36px',
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 4px 32px var(--border), 0 1px 4px var(--border-subtle)',
        }}
      >
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img
            src="/LogoPBBNew.svg"
            alt="Peradaban Baik Bahagia"
            style={{ width: 220, height: 'auto', display: 'block', margin: '0 auto 6px' }}
          />
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>
            Dashboard Sarpras MAF
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'var(--surface-2)', marginBottom: 28 }} />

        {/* Username */}
        <div style={{ marginBottom: 14 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
            display: 'block', marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Username
          </label>
          <input
            ref={usernameRef}
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            placeholder="Masukkan username"
            autoComplete="off"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: `1px solid ${error ? 'rgba(102,0,0,0.5)' : 'var(--border)'}`,
              fontSize: 16, color: 'var(--text-primary)', fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(26,111,232,0.5)' }}
            onBlur={e => {
              if (!error) e.currentTarget.style.borderColor = 'var(--border)'
              resetViewportZoom()
            }}
          />
        </div>

        {/* PIN */}
        <div style={{ marginBottom: error ? 8 : 24 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
            display: 'block', marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => { setPin(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            placeholder="PIN"
            autoComplete="current-password"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: `1px solid ${error ? 'rgba(102,0,0,0.5)' : 'var(--border)'}`,
              fontSize: 16, color: 'var(--text-primary)',
              fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
              backgroundColor: 'var(--card)',
            }}
            onFocus={e => { if (!error) e.currentTarget.style.borderColor = 'rgba(26,111,232,0.5)' }}
            onBlur={e => {
              if (!error) e.currentTarget.style.borderColor = 'var(--border)'
              resetViewportZoom()   // Reset zoom when PIN field loses focus
            }}
          />
        </div>

        {error && (
          <div style={{
            marginBottom: 16, padding: '9px 12px', borderRadius: 8,
            backgroundColor: 'rgba(102,0,0,0.07)', color: 'var(--color-danger)',
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
            backgroundColor: canSubmit ? 'var(--blue)' : 'var(--border)',
            color: canSubmit ? '#fff' : 'var(--text-muted)',
            fontSize: 14, fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', transition: 'all 0.15s',
            boxShadow: canSubmit ? '0 2px 8px rgba(26,111,232,0.25)' : 'none',
          }}
          onMouseEnter={e => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
          onMouseLeave={e => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--blue)' }}
        >
          {loading ? 'Memeriksa...' : 'Masuk'}
        </button>
      </div>
    </div>
  )
}
