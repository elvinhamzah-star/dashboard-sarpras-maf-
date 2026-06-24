import { useState, useEffect } from 'react'

type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'dashboard_theme'

function getInitialTheme(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode)
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const initial = getInitialTheme()
    applyTheme(initial)
    return initial
  })

  useEffect(() => {
    applyTheme(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const toggle = () => setMode(m => m === 'light' ? 'dark' : 'light')
  const isDark = mode === 'dark'

  return { mode, isDark, toggle }
}
