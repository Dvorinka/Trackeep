import { ChevronDown } from 'lucide-solid';

import { cn } from '@/lib/utils';

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: any;
  class?: string;
}

export function Select(props: SelectProps) {
  return props.children;
}

export interface SelectTriggerProps {
  children?: any;
  class?: string;
}

export function SelectTrigger(props: SelectTriggerProps) {
  return (
    <div class={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      props.class
    )}>
      {props.children}
      <ChevronDown class="h-4 w-4 opacity-50" />
    </div>
  );
}

export interface SelectValueProps {
  placeholder?: string;
  value?: string;
}

export function SelectValue(props: SelectValueProps) {
  return <span>{props.value || props.placeholder}</span>;
}

export interface SelectContentProps {
  children?: any;
  class?: string;
}

export function SelectContent(props: SelectContentProps) {
  return (
    <div class={cn(
      "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
      props.class
    )}>
      <div class="p-1">
        {props.children}
      </div>
    </div>
  );
}

export interface SelectItemProps {
  value: string;
  children: any;
  onClick?: (value: string) => void;
  class?: string;
}

export function SelectItem(props: SelectItemProps) {
  return (
    <div
      class={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground hover:bg-accent cursor-pointer",
        props.class
      )}
      onClick={() => props.onClick?.(props.value)}
    >
      {props.children}
    </div>
  );
}
