import { Minus, Square, X } from 'lucide-react'
import { api } from '@/lib/runtime'
import { Tooltip } from '@/components/ui'

export function WindowTitleBar() {
  const isMac = typeof window !== 'undefined' && window.navigator.platform.toLowerCase().includes('mac')
  const handleMinimize = () => api.window.minimize()
  const handleMaximize = () => api.window.maximize()
  const handleClose = () => api.window.close()

  return (
    <header className="window-titlebar">
      <div className="titlebar-content">
        <img src="icon.png" alt="" className="titlebar-icon" />
        <span className="titlebar-title">BBDown GUI</span>
      </div>

      {!isMac && (
        <div className="window-controls">
          <Tooltip content="最小化" side="bottom">
            <button className="window-control-btn" onClick={handleMinimize} tabIndex={0}>
              <Minus size={16} strokeWidth={1.5} />
            </button>
          </Tooltip>
          <Tooltip content="最大化/还原" side="bottom">
            <button className="window-control-btn" onClick={handleMaximize} tabIndex={0}>
              <Square size={14} strokeWidth={1.5} />
            </button>
          </Tooltip>
          <Tooltip content="关闭" side="bottom">
            <button className="window-control-btn close" onClick={handleClose} tabIndex={0}>
              <X size={16} strokeWidth={1.5} />
            </button>
          </Tooltip>
        </div>
      )}
    </header>
  )
}
