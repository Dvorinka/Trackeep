import { cva, type VariantProps } from 'class-variance-authority'
import { splitProps, Show } from 'solid-js'
import { cn } from '@/lib/utils'
import { IconLoader2 } from '@tabler/icons-solidjs'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-papra focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
        outline:
          'border border-input bg-background hover:bg-accent/50 hover:text-accent-foreground shadow-sm',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
        ghost: 'text-primary hover:bg-accent/50 hover:text-primary/80',
        link: 'text-primary underline-offset-4 hover:underline',
        papra: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200',
        papraOutline: 'border border-border bg-card hover:bg-accent/50 hover:text-accent-foreground shadow-sm hover:shadow-md transition-all duration-200',
        papraGhost: 'hover:bg-accent/50 hover:text-accent-foreground transition-all duration-200',
        papraSecondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md transition-all duration-200',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
        iconSm: 'h-9 w-9',
        iconLg: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends VariantProps<typeof buttonVariants> {
    asChild?: boolean
    class?: string
    disabled?: boolean
    loading?: boolean
    onClick?: (e: MouseEvent) => void
    children: any
  }

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, [
    'variant',
    'size',
    'class',
    'asChild',
    'disabled',
    'loading',
    'onClick',
    'children',
  ])

  const isDisabled = () => local.disabled || local.loading

  return (
    <button
      class={cn(buttonVariants({ variant: local.variant, size: local.size }), local.class)}
      disabled={isDisabled()}
      onClick={local.onClick}
      {...others}
    >
      <Show when={local.loading}>
        <IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
      </Show>
      <Show when={!local.loading}>
        {local.children}
      </Show>
    </button>
  )
}
