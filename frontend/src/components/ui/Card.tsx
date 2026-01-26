import { splitProps } from 'solid-js'
import { cn } from '@/lib/utils'

export interface CardProps {
  class?: string
  children: any
}

export function Card(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children'])

  return (
    <div
      class={cn(
        'rounded-lg border bg-[#141415] text-[#fafafa] shadow-sm border-[#262626]',
        local.class
      )}
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
    <p class={cn('text-sm text-[#a3a3a3]', local.class)} {...others}>
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
