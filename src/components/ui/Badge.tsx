import * as React from 'react'
import './styles.css'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const classes = `ui-badge ui-badge-${variant} ${className}`.trim()
    return <span className={classes} ref={ref} {...props} />
  }
)

Badge.displayName = 'Badge'

export { Badge }
