import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { IconButton } from './Button'
import './styles.css'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className = '', ...props }, ref) => {
  const classes = `ui-dialog-overlay ${className}`.trim()
  return <DialogPrimitive.Overlay ref={ref} className={classes} {...props} />
})

DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

export interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showClose?: boolean
}

const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className = '', children, showClose = true, ...props }, ref) => {
    const classes = `ui-dialog-content ${className}`.trim()
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content ref={ref} className={classes} {...props}>
          {children}
          {showClose && (
            <DialogPrimitive.Close asChild>
              <IconButton size="sm" style={{ position: 'absolute', top: 12, right: 12 }}>
                <X size={16} />
              </IconButton>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    )
  }
)

DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const classes = `ui-dialog-header ${className}`.trim()
  return <div className={classes} {...props} />
}

DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const classes = `ui-dialog-footer ${className}`.trim()
  return <div className={classes} {...props} />
}

DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className = '', ...props }, ref) => {
  const classes = `ui-dialog-title ${className}`.trim()
  return <DialogPrimitive.Title ref={ref} className={classes} {...props} />
})

DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className = '', ...props }, ref) => {
  const classes = `ui-dialog-description ${className}`.trim()
  return <DialogPrimitive.Description ref={ref} className={classes} {...props} />
})

DialogDescription.displayName = DialogPrimitive.Description.displayName

const DialogBody = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const classes = `ui-dialog-body ${className}`.trim()
  return <div className={classes} {...props} />
}

DialogBody.displayName = 'DialogBody'

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogBody,
}
