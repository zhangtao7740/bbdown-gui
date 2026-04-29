import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import './styles.css'

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(
  ({ className = '', ...props }, ref) => {
    const classes = `ui-switch ${className}`.trim()
    return (
      <SwitchPrimitive.Root ref={ref} className={classes} {...props}>
        <SwitchPrimitive.Thumb className="ui-switch-thumb" />
      </SwitchPrimitive.Root>
    )
  }
)

Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }
