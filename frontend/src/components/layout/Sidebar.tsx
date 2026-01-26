import { For } from 'solid-js'
import { A } from '@solidjs/router'
import { 
  IconBookmark, 
  IconChecklist, 
  IconFolder, 
  IconHome, 
  IconNotebook,
  IconSettings 
} from '@tabler/icons-solidjs'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/app', icon: IconHome },
  { name: 'Bookmarks', href: '/app/bookmarks', icon: IconBookmark },
  { name: 'Tasks', href: '/app/tasks', icon: IconChecklist },
  { name: 'Files', href: '/app/files', icon: IconFolder },
  { name: 'Notes', href: '/app/notes', icon: IconNotebook },
  { name: 'Settings', href: '/app/settings', icon: IconSettings },
]

export interface SidebarProps {
  class?: string
}

export function Sidebar(props: SidebarProps) {
  return (
    <div class={cn('flex h-full w-64 flex-col bg-[#141415] border-r border-[#262626]', props.class)}>
      {/* Logo */}
      <div class="flex h-16 items-center px-6 border-b border-[#262626]">
        <div class="flex items-center space-x-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
            <span class="text-sm font-bold text-white">T</span>
          </div>
          <span class="text-xl font-semibold text-[#fafafa]">Trackeep</span>
        </div>
      </div>

      {/* Navigation */}
      <nav class="flex-1 space-y-1 px-3 py-4">
        <For each={navigation}>
          {(item) => {
            const Icon = item.icon
            return (
              <A
                href={item.href}
                class="flex items-center px-3 py-2 text-sm font-medium rounded-md text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#262626] transition-colors group"
                activeClass="bg-primary-600 text-white hover:bg-primary-700"
              >
                <Icon class="mr-3 h-5 w-5" />
                {item.name}
              </A>
            )
          }}
        </For>
      </nav>

      {/* User Section */}
      <div class="border-t border-[#262626] p-4">
        <div class="flex items-center space-x-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-[#262626]">
            <span class="text-sm font-medium text-[#a3a3a3]">U</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-[#fafafa] truncate">User</p>
            <p class="text-xs text-[#a3a3a3] truncate">user@trackeep.local</p>
          </div>
        </div>
      </div>
    </div>
  )
}
