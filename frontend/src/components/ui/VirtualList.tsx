import { createSignal, For, Show } from 'solid-js'
import { cn } from '@/lib/utils'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => any
  overscan?: number
  class?: string
}

export function VirtualList<T>(props: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = createSignal(0)
  
  const overscan = props.overscan || 5
  const itemHeight = props.itemHeight
  
  const visibleRange = () => {
    const start = Math.floor(scrollTop() / itemHeight)
    const visibleCount = Math.ceil(props.containerHeight / itemHeight)
    const end = start + visibleCount
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(props.items.length, end + overscan)
    }
  }
  
  const totalHeight = () => props.items.length * itemHeight
  
  const offsetY = () => visibleRange().start * itemHeight
  
  const visibleItems = () => {
    const { start, end } = visibleRange()
    return props.items.slice(start, end).map((item, index) => ({
      item,
      index: start + index
    }))
  }
  
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement
    setScrollTop(target.scrollTop)
  }
  
  return (
    <div
      class={cn('overflow-auto', props.class)}
      style={{ height: `${props.containerHeight}px` }}
      onScroll={handleScroll}
    >
      <div style={{ height: `${totalHeight()}px`, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY()}px)` }}>
          <For each={visibleItems()}>
            {({ item, index }) => (
              <div style={{ height: `${itemHeight}px` }}>
                {props.renderItem(item, index)}
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

interface InfiniteScrollProps<T> {
  items: T[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  renderItem: (item: T, index: number) => any
  loader?: any
  class?: string
}

export function InfiniteScroll<T>(props: InfiniteScrollProps<T>) {
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement
    const { scrollTop, scrollHeight, clientHeight } = target
    
    // Load more when user is near the bottom
    if (
      !props.loading &&
      props.hasMore &&
      scrollHeight - scrollTop - clientHeight < 200
    ) {
      props.onLoadMore()
    }
  }
  
  return (
    <div
      class={cn('overflow-auto', props.class)}
      onScroll={handleScroll}
    >
      <For each={props.items}>
        {(item, index) => props.renderItem(item, index())}
      </For>
      
      <Show when={props.loading}>
        {props.loader || (
          <div class="p-4 text-center">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
      </Show>
      
      <Show when={!props.hasMore && props.items.length > 0}>
        <div class="p-4 text-center text-muted-foreground text-sm">
          No more items to load
        </div>
      </Show>
    </div>
  )
}
