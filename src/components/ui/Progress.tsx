import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import './styles.css'

export interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  variant?: 'default' | 'success' | 'danger'
}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className = '', variant = 'default', value, ...props }, ref) => {
    const classes = `ui-progress ui-progress-${variant} ${className}`.trim()
    return (
      <ProgressPrimitive.Root ref={ref} className={classes} {...props}>
        <ProgressPrimitive.Indicator
          className="ui-progress-indicator"
          style={{ width: `${value || 0}%` }}
        />
      </ProgressPrimitive.Root>
    )
  }
)

Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
