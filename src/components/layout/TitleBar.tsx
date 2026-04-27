import { Toolbar, ToolbarButton } from '@fluentui/react-components'
import {
  Subtract20Regular,
  Square20Regular,
  Dismiss20Regular,
} from '@fluentui/react-icons'
import type { CSSProperties } from 'react'
import { api } from '@/lib/runtime'

export function TitleBar() {
  const isMac = typeof window !== 'undefined' && window.navigator.platform.toLowerCase().includes('mac')
  const handleMinimize = () => api.window.minimize()
  const handleMaximize = () => api.window.maximize()
  const handleClose = () => api.window.close()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMac ? 'flex-start' : 'space-between',
        height: '32px',
        padding: isMac ? '0 12px 0 86px' : '0 8px',
        backgroundColor: 'transparent',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
      } as CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px' }}>
        <img src="icon.png" alt="" style={{ width: '18px', height: '18px', borderRadius: '4px' }} />
        <span style={{ fontSize: '12px', fontWeight: 500 }}>BBDown GUI</span>
      </div>

      {!isMac && (
        <Toolbar
          size="small"
          style={{
            backgroundColor: 'transparent',
            WebkitAppRegion: 'no-drag',
          } as CSSProperties}
        >
          <ToolbarButton
            appearance="subtle"
            icon={<Subtract20Regular />}
            onClick={handleMinimize}
            style={{ width: '46px', borderRadius: 0 }}
          />
          <ToolbarButton
            appearance="subtle"
            icon={<Square20Regular />}
            onClick={handleMaximize}
            style={{ width: '46px', borderRadius: 0 }}
          />
          <ToolbarButton
            appearance="subtle"
            icon={<Dismiss20Regular />}
            onClick={handleClose}
            style={{
              width: '46px',
              borderRadius: 0,
              color: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E81123'
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'inherit'
            }}
          />
        </Toolbar>
      )}
    </div>
  )
}
