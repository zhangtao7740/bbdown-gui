import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import './styles.css'

export interface TooltipProps {
  children: React.ReactElement
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delayDuration?: number
}

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = ({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration = 200,
}: TooltipProps) => {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="ui-tooltip-content"
          side={side}
          align={align}
          sideOffset={6}
        >
          {content}
          <TooltipPrimitive.Arrow className="ui-tooltip-arrow" width={8} height={4} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export { Tooltip, TooltipProvider }
