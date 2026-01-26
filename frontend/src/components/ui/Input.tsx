import { splitProps } from 'solid-js'
import { cn } from '@/lib/utils'

export interface InputProps {
  class?: string
  type?: string
  placeholder?: string
  value?: string
  onInput?: (e: InputEvent) => void
  onChange?: (e: Event) => void
  disabled?: boolean
}

export function Input(props: InputProps) {
  const [local, others] = splitProps(props, [
    'class',
    'type',
    'placeholder',
    'value',
    'onInput',
    'onChange',
    'disabled',
  ])

  return (
    <input
      type={local.type || 'text'}
      class={cn(
        'flex h-10 w-full rounded-md border border-[#262626] bg-[#141415] px-3 py-2 text-sm text-[#fafafa] placeholder-[#a3a3a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        local.class
      )}
      placeholder={local.placeholder}
      value={local.value}
      onInput={local.onInput}
      onChange={local.onChange}
      disabled={local.disabled}
      {...others}
    />
  )
}
