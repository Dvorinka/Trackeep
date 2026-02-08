import { splitProps } from 'solid-js'
import { cn } from '@/lib/utils'

export interface InputProps {
  class?: string
  type?: string
  placeholder?: string
  value?: string
  onInput?: (e: InputEvent) => void
  onChange?: (e: Event) => void
  onKeyDown?: (e: KeyboardEvent) => void
  disabled?: boolean
  required?: boolean
}

export function Input(props: InputProps) {
  const [local, others] = splitProps(props, [
    'class',
    'type',
    'placeholder',
    'value',
    'onInput',
    'onChange',
    'onKeyDown',
    'disabled',
    'required',
  ])

  return (
    <input
      type={local.type || 'text'}
      class={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        local.class
      )}
      placeholder={local.placeholder}
      value={local.value}
      onInput={local.onInput}
      onChange={local.onChange}
      onKeyDown={local.onKeyDown}
      disabled={local.disabled}
      required={local.required}
      {...others}
    />
  )
}
