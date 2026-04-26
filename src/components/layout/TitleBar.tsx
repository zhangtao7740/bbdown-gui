import { Toolbar, ToolbarButton } from '@fluentui/react-components'
import {
  Subtract20Regular,
  Square20Regular,
  Dismiss20Regular,
  AnimalCat20Filled,
} from '@fluentui/react-icons'
import { api } from '@/lib/runtime'

export function TitleBar() {
  const handleMinimize = () => api.window.minimize()
  const handleMaximize = () => api.window.maximize()
  const handleClose = () => api.window.close()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '32px',
        padding: '0 8px',
        backgroundColor: 'transparent',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px' }}>
        <AnimalCat20Filled style={{ color: '#FB8C00' }} />
        <span style={{ fontSize: '12px', fontWeight: 500 }}>BBDown GUI</span>
      </div>

      <Toolbar
        size="small"
        style={{
          backgroundColor: 'transparent',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
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
    </div>
  )
}
