import { splitProps } from 'solid-js'
import { cn } from '@/lib/utils'

export interface CardProps {
  class?: string
  children: any
  onClick?: () => void
}

export function Card(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children', 'onClick'])

  return (
    <div
      class={cn(
        'card-papra',
        local.class
      )}
      onClick={local.onClick}
      {...others}
    >
      {local.children}
    </div>
  )
}

export function CardHeader(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <div class={cn('flex flex-col space-y-1.5 p-6', local.class)} {...others}>
      {local.children}
    </div>
  )
}

export function CardTitle(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <h3
      class={cn('text-2xl font-semibold leading-none tracking-tight', local.class)}
      {...others}
    >
      {local.children}
    </h3>
  )
}

export function CardDescription(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <p class={cn('text-sm text-muted-foreground', local.class)} {...others}>
      {local.children}
    </p>
  )
}

export function CardContent(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children'])

  return <div class={cn('p-6 pt-0', local.class)} {...others}>{local.children}</div>
}

export function CardFooter(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <div class={cn('flex items-center p-6 pt-0', local.class)} {...others}>
      {local.children}
    </div>
  )
}
