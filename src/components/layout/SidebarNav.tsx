import { useRef, useCallback } from 'react'
import { Download, List, History, Settings, Info } from 'lucide-react'
import { Badge } from '@/components/ui'
import { APP_VERSION } from '@/lib/appInfo'

export type TabValue = 'download' | 'tasks' | 'history' | 'settings' | 'about'

interface SidebarNavProps {
  selectedTab: TabValue
  onTabChange: (tab: TabValue) => void
  activeTaskCount: number
}

const tabs = [
  { value: 'download' as TabValue, label: '下载', icon: Download },
  { value: 'tasks' as TabValue, label: '队列', icon: List },
  { value: 'history' as TabValue, label: '历史', icon: History },
  { value: 'settings' as TabValue, label: '设置', icon: Settings },
  { value: 'about' as TabValue, label: '关于', icon: Info },
]

export function SidebarNav({ selectedTab, onTabChange, activeTaskCount }: SidebarNavProps) {
  const navRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<TabValue, HTMLButtonElement>>(new Map())

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, tab: TabValue) => {
      const currentIndex = tabs.findIndex((t) => t.value === tab)

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          if (currentIndex > 0) {
            const prevTab = tabs[currentIndex - 1].value
            buttonRefs.current.get(prevTab)?.focus()
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          if (currentIndex < tabs.length - 1) {
            const nextTab = tabs[currentIndex + 1].value
            buttonRefs.current.get(nextTab)?.focus()
          }
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          onTabChange(tab)
          break
      }
    },
    [onTabChange]
  )

  return (
    <nav className="sidebar-nav" ref={navRef}>
      <ul className="sidebar-nav-list">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = selectedTab === tab.value
          return (
            <li key={tab.value} className="sidebar-nav-item">
              <button
                ref={(el) => {
                  if (el) buttonRefs.current.set(tab.value, el)
                }}
                className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => onTabChange(tab.value)}
                onKeyDown={(e) => handleKeyDown(e, tab.value)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="sidebar-nav-icon" size={18} strokeWidth={1.5} />
                <span className="sidebar-nav-label">{tab.label}</span>
                {tab.value === 'tasks' && activeTaskCount > 0 && (
                  <Badge variant="danger" className="sidebar-nav-badge">
                    {activeTaskCount > 99 ? '99+' : activeTaskCount}
                  </Badge>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="sidebar-footer">
        <div className="sidebar-version">BBDown GUI v{APP_VERSION}</div>
      </div>
    </nav>
  )
}
