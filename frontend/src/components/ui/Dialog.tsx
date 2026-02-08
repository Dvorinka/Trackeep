import type { ComponentProps } from 'solid-js'
import { cn } from '@/lib/utils'

export interface DialogProps extends ComponentProps<'div'> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export interface DialogContentProps extends ComponentProps<'div'> {}

export interface DialogHeaderProps extends ComponentProps<'div'> {}

export interface DialogTitleProps extends ComponentProps<'h2'> {}

export interface DialogDescriptionProps extends ComponentProps<'p'> {}

export interface DialogFooterProps extends ComponentProps<'div'> {}

const Dialog = (props: DialogProps) => {
  return (
    <div
      class={cn(
        'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        props.class
      )}
      data-state={props.open ? 'open' : 'closed'}
      {...props}
    />
  )
}

const DialogContent = (props: DialogContentProps) => {
  return (
    <div
      class={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
        props.class
      )}
      {...props}
    />
  )
}

const DialogHeader = (props: DialogHeaderProps) => {
  return (
    <div
      class={cn('flex flex-col space-y-1.5 text-center sm:text-left', props.class)}
      {...props}
    />
  )
}

const DialogTitle = (props: DialogTitleProps) => {
  return (
    <h2
      class={cn('text-lg font-semibold leading-none tracking-tight', props.class)}
      {...props}
    />
  )
}

const DialogDescription = (props: DialogDescriptionProps) => {
  return (
    <p
      class={cn('text-sm text-muted-foreground', props.class)}
      {...props}
    />
  )
}

const DialogFooter = (props: DialogFooterProps) => {
  return (
    <div
      class={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', props.class)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
}
