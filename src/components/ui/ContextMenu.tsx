import * as React from 'react'
import { createPortal } from 'react-dom'
import './styles.css'

export interface ContextMenuItem {
  label: string
  onSelect: () => void | Promise<unknown>
  disabled?: boolean
  danger?: boolean
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  children: React.ReactElement<{ onContextMenu?: React.MouseEventHandler }>
}

export function ContextMenu({ items, children }: ContextMenuProps) {
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null)
  const [focusedIndex, setFocusedIndex] = React.useState(-1)
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const triggerElRef = React.useRef<HTMLElement | null>(null)
  const enabledItems = items.filter((item) => !item.disabled)

  const closeMenu = React.useCallback(() => {
    setPosition(null)
    setFocusedIndex(-1)
    triggerElRef.current?.focus()
  }, [])

  const selectEnabledItem = React.useCallback(async (index: number) => {
    const item = enabledItems[index]
    if (!item) return
    closeMenu()
    await item.onSelect()
  }, [closeMenu, enabledItems])

  React.useEffect(() => {
    if (!position) return undefined
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return
      closeMenu()
    }
    window.addEventListener('click', handleClick)
    window.addEventListener('scroll', closeMenu, true)
    window.addEventListener('resize', closeMenu)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeMenu()
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        void selectEnabledItem(focusedIndex >= 0 ? focusedIndex : 0)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = prev + 1
          return next >= enabledItems.length ? 0 : next
        })
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = prev - 1
          return next < 0 ? enabledItems.length - 1 : next
        })
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', closeMenu, true)
      window.removeEventListener('resize', closeMenu)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [position, enabledItems.length, focusedIndex, closeMenu, selectEnabledItem])

  React.useEffect(() => {
    if (position && focusedIndex >= 0 && menuRef.current) {
      const buttons = menuRef.current.querySelectorAll<HTMLButtonElement>('.ui-context-menu-item:not(:disabled)')
      buttons[focusedIndex]?.focus()
    }
  }, [position, focusedIndex])

  const child = React.Children.only(children)
  const handleContextMenu: React.MouseEventHandler = (event) => {
    child.props.onContextMenu?.(event)
    if (event.defaultPrevented || enabledItems.length === 0) return
    event.preventDefault()
    triggerElRef.current = event.currentTarget as HTMLElement
    setPosition({ x: event.clientX, y: event.clientY })
    setFocusedIndex(0)
  }

  const wrappedChild = React.cloneElement(child, { onContextMenu: handleContextMenu as React.MouseEventHandler })

  return (
    <>
      {wrappedChild}
      {position && createPortal(
        <div
          ref={menuRef}
          className="ui-context-menu"
          style={{ left: position.x, top: position.y }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {items.map((item) => {
            const enabledIndex = enabledItems.indexOf(item)
            return (
              <button
                key={item.label}
                className={`ui-context-menu-item ${item.danger ? 'ui-context-menu-item-danger' : ''}`}
                disabled={item.disabled}
                role="menuitem"
                tabIndex={enabledIndex === focusedIndex ? 0 : -1}
                onClick={async () => {
                  if (enabledIndex < 0) return
                  await selectEnabledItem(enabledIndex)
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
