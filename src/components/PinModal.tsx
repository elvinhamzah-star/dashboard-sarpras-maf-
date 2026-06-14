import { useState } from 'react'
import { verifyPin, setAdminPin } from '../lib/adminApi'

interface PinModalProps {
  onSuccess: () => void
  onClose: () => void
}

export default function PinModal({ onSuccess, onClose }: PinModalProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const handleSubmit = async () => {
    if (checking) return
    setChecking(true)
    setError('')
    const ok = await verifyPin(pin)
    setChecking(false)
    if (ok) {
      setAdminPin(pin)
      onSuccess()
    } else {
      setError('PIN salah. Coba lagi.')
      setPin('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: '#0D1829' }}>Masuk Mode Admin</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            style={{ color: '#6B7A99' }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: '#6B7A99' }}>
          Masukkan PIN 4 digit untuk mengakses fitur admin.
        </p>

        <input
          type="password"
          maxLength={4}
          value={pin}
          onChange={e => {
            setPin(e.target.value.replace(/\D/g, ''))
            setError('')
          }}
          onKeyDown={handleKeyDown}
          placeholder="----"
          className="w-full border rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:ring-2 mb-4"
          style={{
            borderColor: error ? '#ef4444' : 'rgba(26,43,94,0.15)',
            color: '#0D1829',
          }}
          autoFocus
        />

        {error && (
          <p className="text-sm text-red-500 mb-4 text-center">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={pin.length !== 4 || checking}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all"
          style={{
            backgroundColor: pin.length === 4 && !checking ? '#0858b0' : '#ccc',
            cursor: pin.length === 4 && !checking ? 'pointer' : 'not-allowed',
          }}
        >
          {checking ? 'Memeriksa…' : 'Masuk'}
        </button>
      </div>
    </div>
  )
}
