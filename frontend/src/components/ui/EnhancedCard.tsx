import type { ParentComponent } from 'solid-js'
import { createSignal, Show } from 'solid-js'
import { cn } from '@/lib/utils'
import { IconLoader2, IconX } from '@tabler/icons-solidjs'

interface EnhancedCardProps {
  class?: string
  loading?: boolean
  error?: string
  closable?: boolean
  onClose?: () => void
  variant?: 'default' | 'bordered' | 'elevated' | 'ghost'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const EnhancedCard: ParentComponent<EnhancedCardProps> = (props) => {
  const [isVisible, setIsVisible] = createSignal(true)

  const handleClose = () => {
    setIsVisible(false)
    props.onClose?.()
  }

  const variantClasses = {
    default: 'bg-card border border-border shadow-sm',
    bordered: 'bg-card border-2 border-border',
    elevated: 'bg-card border border-border shadow-lg',
    ghost: 'bg-transparent border-0 shadow-none'
  }

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  return (
    <Show when={isVisible()}>
      <div
        class={cn(
          'rounded-lg transition-all duration-200 relative',
          variantClasses[props.variant || 'default'],
          paddingClasses[props.padding || 'md'],
          props.class
        )}
      >
        {/* Close button */}
        <Show when={props.closable}>
          <button
            onClick={handleClose}
            class="absolute top-2 right-2 p-1 rounded-md hover:bg-muted transition-colors"
          >
            <IconX class="h-4 w-4 text-muted-foreground" />
          </button>
        </Show>

        {/* Loading state */}
        <Show when={props.loading}>
          <div class="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
            <IconLoader2 class="h-6 w-6 animate-spin text-primary" />
          </div>
        </Show>

        {/* Error state */}
        <Show when={props.error}>
          <div class="absolute inset-0 bg-destructive/10 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
            <div class="text-center p-4">
              <p class="text-destructive text-sm font-medium">{props.error}</p>
            </div>
          </div>
        </Show>

        {/* Content */}
        <div class={cn('relative', props.loading && 'opacity-50')}>
          {props.children}
        </div>
      </div>
    </Show>
  )
}
