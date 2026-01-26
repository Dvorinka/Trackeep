import { children } from 'solid-js'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/lib/utils'

export interface LayoutProps {
  children: any
  title?: string
  class?: string
}

export function Layout(props: LayoutProps) {
  const resolved = children(() => props.children)

  return (
    <div class={cn('flex h-screen bg-[#18181b]', props.class)}>
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div class="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header title={props.title} />
        
        {/* Page Content */}
        <main class="flex-1 overflow-y-auto bg-[#18181b] p-6">
          {resolved()}
        </main>
      </div>
    </div>
  )
}
