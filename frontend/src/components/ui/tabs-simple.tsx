import { createSignal } from 'solid-js';

import { cn } from '@/lib/utils';

export interface TabsProps {
  defaultValue?: string;
  children?: any;
  class?: string;
}

export function Tabs(props: TabsProps) {
  const [activeTab, setActiveTab] = createSignal(props.defaultValue || '');
  
  return (
    <div class={props.class}>
      {props.children?.map((child: any) => {
        if (child?.type === TabsList) {
          return child({ activeTab, setActiveTab });
        }
        if (child?.type === TabsContent) {
          return child({ activeTab });
        }
        return child;
      })}
    </div>
  );
}

export interface TabsListProps {
  children?: any;
  activeTab?: () => string;
  setActiveTab?: (tab: string) => void;
  class?: string;
}

export function TabsList(props: TabsListProps) {
  return (
    <div class={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      props.class
    )}>
      {props.children?.map((child: any) => {
        if (child?.type === TabsTrigger) {
          return child({ 
            isActive: child.props.value === props.activeTab?.(),
            onClick: () => props.setActiveTab?.(child.props.value)
          });
        }
        return child;
      })}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: any;
  isActive?: boolean;
  onClick?: () => void;
  class?: string;
}

export function TabsTrigger(props: TabsTriggerProps) {
  return (
    <button
      class={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        props.isActive 
          ? "bg-background text-foreground shadow-sm" 
          : "hover:bg-accent/50 hover:text-accent-foreground",
        props.class
      )}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  children: any;
  activeTab?: () => string;
  class?: string;
}

export function TabsContent(props: TabsContentProps) {
  if (props.value !== props.activeTab?.()) {
    return null;
  }
  
  return (
    <div class={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      props.class
    )}>
      {props.children}
    </div>
  );
}
