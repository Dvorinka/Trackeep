import { splitProps } from 'solid-js'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

export interface LabelProps {
  class?: string;
  for?: string;
  children?: any;
}

export function Label(props: LabelProps) {
  const [local, others] = splitProps(props, ['class']);
  
  return (
    <label class={cn(labelVariants(), local.class)} {...others}>
      {props.children}
    </label>
  );
}
