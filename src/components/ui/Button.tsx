import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import './styles.css'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const classes = `ui-button ui-button-${variant} ui-button-${size} ${className}`.trim()
    return <Comp className={classes} ref={ref} {...props} />
  }
)

Button.displayName = 'Button'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  asChild?: boolean
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className = '', variant = 'ghost', size = 'md', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const classes = `ui-button ui-icon-button ui-button-${variant} ui-icon-button-${size} ${className}`.trim()
    return <Comp className={classes} ref={ref} {...props} />
  }
)

IconButton.displayName = 'IconButton'

export { Button, IconButton }
