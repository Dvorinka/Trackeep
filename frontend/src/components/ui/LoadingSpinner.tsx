import { IconLoader2 } from '@tabler/icons-solidjs'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  class?: string
  text?: string
}

export const LoadingSpinner = (props: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div class={cn('flex items-center gap-2', props.class)}>
      <IconLoader2 class={cn('animate-spin text-primary', sizeClasses[props.size || 'md'])} />
      {props.text && (
        <span class="text-sm text-muted-foreground">{props.text}</span>
      )}
    </div>
  )
}

export const FullPageLoader = (props: { text?: string }) => {
  return (
    <div class="min-h-[400px] flex items-center justify-center">
      <div class="text-center">
        <LoadingSpinner size="lg" text={props.text || 'Loading...'} />
      </div>
    </div>
  )
}
