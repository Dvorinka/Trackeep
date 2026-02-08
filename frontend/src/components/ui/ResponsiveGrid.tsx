import type { ParentComponent } from 'solid-js'
import { cn } from '@/lib/utils'

interface ResponsiveGridProps {
  class?: string
  cols?: {
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  gap?: number
  autoFit?: boolean
  minItemWidth?: string
}

export const ResponsiveGrid: ParentComponent<ResponsiveGridProps> = (props) => {
  const getGridClasses = () => {
    const cols = props.cols || { sm: 1, md: 2, lg: 3, xl: 4 }
    const gap = props.gap || 4

    let classes = 'grid'
    
    // Add grid columns for each breakpoint
    if (cols.sm) classes += ` grid-cols-${cols.sm}`
    if (cols.md) classes += ` md:grid-cols-${cols.md}`
    if (cols.lg) classes += ` lg:grid-cols-${cols.lg}`
    if (cols.xl) classes += ` xl:grid-cols-${cols.xl}`
    if (cols['2xl']) classes += ` 2xl:grid-cols-${cols['2xl']}`

    // Add gap
    classes += ` gap-${gap}`

    // Auto-fit functionality
    if (props.autoFit) {
      classes += ` grid-cols-[repeat(auto-fit,minmax(${props.minItemWidth || '250px'},1fr))]`
    }

    return classes
  }

  return (
    <div
      class={cn(getGridClasses(), props.class)}
    >
      {props.children}
    </div>
  )
}

interface MasonryGridProps {
  class?: string
  columnCount?: number
  gap?: number
}

export const MasonryGrid: ParentComponent<MasonryGridProps> = (props) => {
  return (
    <div
      class={cn('space-y-4', props.class)}
      style={{
        'column-count': props.columnCount?.toString() || '3',
        'column-gap': `${props.gap || 16}px`
      }}
    >
      {props.children}
    </div>
  )
}
