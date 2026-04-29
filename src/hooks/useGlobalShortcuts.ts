import { useEffect, useCallback } from 'react'
import type { TabValue } from '@/components/layout/SidebarNav'

interface UseGlobalShortcutsOptions {
  currentTab: TabValue
  setSelectedTab: (tab: TabValue) => void
  refreshData?: () => void
}

const tabIndexMap: Record<string, TabValue> = {
  '1': 'download',
  '2': 'tasks',
  '3': 'history',
  '4': 'settings',
  '5': 'about',
}

export function useGlobalShortcuts({ currentTab, setSelectedTab, refreshData }: UseGlobalShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = window.navigator.platform.toLowerCase().includes('mac')
      const modifierKey = isMac ? e.metaKey : e.ctrlKey

      if (modifierKey && e.key in tabIndexMap) {
        e.preventDefault()
        setSelectedTab(tabIndexMap[e.key])
        return
      }

      if (modifierKey && e.key === ',') {
        e.preventDefault()
        setSelectedTab('settings')
        return
      }

      if (modifierKey && e.key === 'r') {
        e.preventDefault()
        refreshData?.()
        return
      }

      if (currentTab === 'download' && modifierKey && e.key === 'Enter') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('bbdown:download-confirm'))
        return
      }

      if (currentTab === 'download' && modifierKey && e.key.toLowerCase() === 'a') {
        const target = e.target as HTMLElement
        if (target.closest('[data-page-selector]')) {
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('bbdown:download-select-all-pages'))
          return
        }
      }

      if (currentTab === 'tasks' && e.key === ' ') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('bbdown:tasks-toggle-focused'))
        return
      }

      if (currentTab === 'tasks' && modifierKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('bbdown:tasks-toggle-log'))
        return
      }

      if (currentTab === 'tasks' && modifierKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('bbdown:tasks-copy-focused'))
        return
      }

      if (currentTab === 'history' && modifierKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('bbdown:history-focus-search'))
        return
      }

      if (currentTab === 'history' && e.key === 'Enter') {
        window.dispatchEvent(new CustomEvent('bbdown:history-toggle-focused'))
        return
      }

      if (currentTab === 'history' && (e.key === 'Delete' || (isMac && e.key === 'Backspace' && modifierKey))) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('bbdown:history-delete-focused'))
        return
      }

      if (e.key === 'Escape') {
        const dialogs = document.querySelectorAll('[role="dialog"]')
        if (dialogs.length > 0) {
          const closeBtn = dialogs[dialogs.length - 1].querySelector('[data-close-dialog]') as HTMLElement
          closeBtn?.click()
        }
      }
    },
    [currentTab, setSelectedTab, refreshData]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
