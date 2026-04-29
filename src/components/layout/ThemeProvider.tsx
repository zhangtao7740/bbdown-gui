import { useEffect, type ReactNode } from 'react'
import { api, isRunningInElectron } from '@/lib/runtime'
import { useAppStore } from '@/store/appStore'

function getPlatformClass(): string {
  const platform = typeof navigator !== 'undefined' ? navigator.platform : ''
  if (platform.includes('Win')) return 'platform-win32'
  if (platform.includes('Mac')) return 'platform-darwin'
  return 'platform-linux'
}

function applyThemeClass(theme: 'system' | 'light' | 'dark') {
  const root = document.documentElement
  root.classList.remove('theme-light', 'theme-dark', 'theme-system')
  if (theme === 'light') root.classList.add('theme-light')
  else if (theme === 'dark') root.classList.add('theme-dark')
  else root.classList.add('theme-system')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppStore()

  useEffect(() => {
    const root = document.documentElement
    const platformClass = getPlatformClass()
    root.classList.add(platformClass)

    applyThemeClass(settings.theme)

    let unsubscribe: (() => void) | undefined
    if (settings.theme === 'system' && isRunningInElectron()) {
      unsubscribe = api.theme.onChanged(() => {
        // theme-system relies on CSS media queries; no class toggling needed.
      })
    }

    return () => {
      root.classList.remove(platformClass)
      unsubscribe?.()
    }
  }, [settings.theme])

  return <>{children}</>
}
