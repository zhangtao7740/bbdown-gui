/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react'
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components'
import { api } from '@/lib/runtime'
import { useAppStore } from '@/store/appStore'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { settings, updateSetting, saveSettings } = useAppStore()
  const [isDark, setIsDark] = useState(false)

  const applyTheme = useCallback((dark: boolean) => {
    setIsDark(dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    if (dark) {
      document.body.classList.add('dark-theme')
    } else {
      document.body.classList.remove('dark-theme')
    }
  }, [])

  useEffect(() => {
    const initTheme = async () => {
      if (settings.theme === 'system') {
        const systemIsDark = await api.theme.isDark()
        applyTheme(systemIsDark)
      } else {
        applyTheme(settings.theme === 'dark')
      }
    }
    void initTheme()
  }, [settings.theme, applyTheme])

  useEffect(() => {
    const unsubscribe = api.theme.onChanged((systemIsDark) => {
      if (settings.theme === 'system') {
        applyTheme(systemIsDark)
      }
    })
    return unsubscribe
  }, [settings.theme, applyTheme])

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark'
    updateSetting('theme', newTheme)
    void saveSettings()
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <FluentProvider theme={isDark ? webDarkTheme : webLightTheme}>
        {children}
      </FluentProvider>
    </ThemeContext.Provider>
  )
}
