import type { ComponentProps } from 'solid-js'
import { cn } from '@/lib/utils'

export interface SwitchProps extends ComponentProps<'button'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = (props: SwitchProps) => {
  const [local, others] = props.checked !== undefined 
    ? [{ checked: props.checked, onCheckedChange: props.onCheckedChange }, props]
    : [props, props]

  const handleClick = () => {
    if (local.onCheckedChange) {
      local.onCheckedChange(!local.checked)
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={local.checked}
      class={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        local.checked ? 'data-[state=checked]' : 'data-[state=unchecked]',
        props.class
      )}
      onClick={handleClick}
      {...others}
    >
      <span
        data-state={local.checked ? 'checked' : 'unchecked'}
        class={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
        )}
      />
    </button>
  )
}

export { Switch }
