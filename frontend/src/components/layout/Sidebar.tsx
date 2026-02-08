import { For, createSignal, onMount, Show } from 'solid-js'
import { A, useLocation } from '@solidjs/router'
import { 
  IconBookmark, 
  IconChecklist, 
  IconFolder, 
  IconHome, 
  IconNotebook,
  IconSettings,
  IconVideo,
  IconFileText,
  IconChevronDown,
  IconTrash,
  IconUsers,
  IconBrain,
  IconSchool,
  IconChartLine,
  IconBrandGithub,
  IconClock,
  IconCalendar,
  IconLogout,
  IconBuilding,
  IconPlus
} from '@tabler/icons-solidjs'
import { UpdateChecker } from '../ui/UpdateChecker'

const navigation = [
  { name: 'Home', href: '/app', icon: IconHome },
  { name: 'Bookmarks', href: '/app/bookmarks', icon: IconBookmark },
  { name: 'Tasks', href: '/app/tasks', icon: IconChecklist },
  { name: 'Time Tracking', href: '/app/time-tracking', icon: IconClock },
  { name: 'Calendar', href: '/app/calendar', icon: IconCalendar },
  { name: 'Files', href: '/app/files', icon: IconFolder },
  { name: 'Notes', href: '/app/notes', icon: IconNotebook },
  { name: 'YouTube', href: '/app/youtube', icon: IconVideo },
  { name: 'Members', href: '/app/members', icon: IconUsers },
  { name: 'Learning', href: '/app/learning-paths', icon: IconSchool },
  { name: 'Stats', href: '/app/stats', icon: IconChartLine },
  { name: 'GitHub', href: '/app/github', icon: IconBrandGithub },
  { name: 'AI Assistant', href: '/app/chat', icon: IconBrain },
]

const mockWorkspaces = [
  { id: '1', name: 'Trackeep Workspace', icon: IconFileText },
  { id: '2', name: 'Personal Projects', icon: IconBuilding },
  { id: '3', name: 'Team Collaboration', icon: IconUsers },
]

export interface SidebarProps {
  class?: string
}

export function Sidebar(_props: SidebarProps) {
  const location = useLocation()
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = createSignal(false)
  const [selectedWorkspace, setSelectedWorkspace] = createSignal(mockWorkspaces[0])

  const isActive = (href: string) => {
    const currentPath = location.pathname
    if (href === '/app' && currentPath === '/app') return true
    return currentPath === href
  }

  const handleWorkspaceSelect = (workspace: typeof mockWorkspaces[0]) => {
    setSelectedWorkspace(workspace)
    setIsWorkspaceDropdownOpen(false)
  }

  const toggleWorkspaceDropdown = () => {
    setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen())
  }

  // Close dropdown when clicking outside
  onMount(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (!target.closest('#workspace-selector')) {
        setIsWorkspaceDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  })

  return (
    <div class="w-280px border-r border-r-border flex-shrink-0 hidden md:block bg-card">
      <div class="flex h-full">
        <div class="h-full flex flex-col pb-6 flex-1 min-w-0">
          {/* Organization Selector */}
          <div class="p-4 pb-0 min-w-0 max-w-full" id="workspace-selector">
            <div role="group" class="w-full relative">
              <button
                type="button"
                onClick={toggleWorkspaceDropdown}
                aria-haspopup="listbox"
                aria-expanded={isWorkspaceDropdownOpen()}
                class="flex w-full items-center justify-between border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition rounded-lg h-auto pl-2"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <span class="p-1.5 rounded text-lg font-bold flex items-center bg-muted light:border dark:bg-primary/10 transition flex-shrink-0">
                    {(() => {
                      const workspace = selectedWorkspace()
                      return <workspace.icon class="size-5.5" style="color: hsl(var(--primary))" />
                    })()}
                  </span>
                  <span class="truncate text-base font-medium">{selectedWorkspace().name}</span>
                </span>
                <div class="size-4 opacity-50 ml-2 flex-shrink-0 transition-transform duration-200" classList={{ "rotate-180": isWorkspaceDropdownOpen() }}>
                  <IconChevronDown class="size-4" />
                </div>
              </button>

              {/* Dropdown Menu */}
              <Show when={isWorkspaceDropdownOpen()}>
                <div class="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-60 overflow-auto">
                  <div class="p-1" role="listbox">
                    <For each={mockWorkspaces}>
                      {(workspace) => (
                        <button
                          type="button"
                          onClick={() => handleWorkspaceSelect(workspace)}
                          class="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-accent/50 transition-colors focus:bg-accent/50 focus:outline-none"
                          role="option"
                          classList={{ "bg-accent/30": workspace.id === selectedWorkspace().id }}
                        >
                          {(() => {
                            const Icon = workspace.icon
                            return <Icon class="size-4 text-muted-foreground" />
                          })()}
                          <span class="flex-1 text-left truncate">{workspace.name}</span>
                          <Show when={workspace.id === selectedWorkspace().id}>
                            <div class="w-2 h-2 bg-primary rounded-full"></div>
                          </Show>
                        </button>
                      )}
                    </For>
                    <div class="border-t border-border mt-1 pt-1">
                      <button
                        type="button"
                        class="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-accent/50 transition-colors focus:bg-accent/50 focus:outline-none text-muted-foreground"
                      >
                        <IconPlus class="size-4" />
                        <span>Create Workspace</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Show>
            </div>
          </div>

          {/* Navigation */}
          <nav class="flex flex-col gap-0.5 mt-4 px-4">
            <For each={navigation}>
              {(item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <A
                    href={item.href}
                    class="group inline-flex rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 justify-start items-center gap-2 truncate relative overflow-hidden"
                    classList={{
                      "bg-[#262626] text-white font-medium shadow-sm": active,
                      "hover:bg-[#262626] hover:text-white text-[#a3a3a3]": !active
                    }}
                  >
                    <div class="relative z-10 flex items-center gap-2">
                      <Icon class={`size-5 transition-colors ${
                        active 
                          ? 'text-primary' 
                          : 'text-[#a3a3a3] group-hover:text-primary'
                      }`} />
                      <div class={`transition-colors ${
                        active 
                          ? 'text-white font-medium' 
                          : 'text-[#a3a3a3] group-hover:text-white'
                      }`}>{item.name}</div>
                    </div>
                    <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" classList={{
                      "bg-[#262626]": !active
                    }}></div>
                  </A>
                )
              }}
            </For>
          </nav>

          {/* Bottom Navigation */}
          <div class="flex-1"></div>
          
          {/* Update Checker */}
          <div class="px-4 mb-2">
            <UpdateChecker />
          </div>
          
          <nav class="flex flex-col gap-0.5 px-4">
            <A
              href="/app/removed-stuff"
              class="group inline-flex rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 justify-start items-center gap-2 truncate relative overflow-hidden"
              classList={{
                "bg-[#262626] text-white font-medium shadow-sm": isActive('/app/removed-stuff'),
                "hover:bg-[#262626] hover:text-white text-[#a3a3a3]": !isActive('/app/removed-stuff')
              }}
            >
              <div class="relative z-10 flex items-center gap-2">
                <IconTrash class={`size-5 transition-colors ${
                  isActive('/app/removed-stuff') 
                    ? 'text-white' 
                    : 'text-[#a3a3a3] group-hover:text-primary'
                }`} />
                <div class={`transition-colors ${
                  isActive('/app/removed-stuff')
                    ? 'text-white font-medium'
                    : 'text-[#a3a3a3] group-hover:text-white'
                }`}>Removed stuff</div>
              </div>
              <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" classList={{
                "bg-[#262626]": !isActive('/app/removed-stuff')
              }}></div>
            </A>
            <A
              href="/app/settings"
              class="group inline-flex rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 justify-start items-center gap-2 truncate relative overflow-hidden"
              classList={{
                "bg-[#262626] text-white font-medium shadow-sm": isActive('/app/settings'),
                "hover:bg-[#262626] hover:text-white text-[#a3a3a3]": !isActive('/app/settings')
              }}
            >
              <div class="relative z-10 flex items-center gap-2">
                <IconSettings class={`size-5 transition-colors ${
                  isActive('/app/settings') 
                    ? 'text-white' 
                    : 'text-[#a3a3a3] group-hover:text-primary'
                }`} />
                <div class={`transition-colors ${
                  isActive('/app/settings')
                    ? 'text-white font-medium'
                    : 'text-[#a3a3a3] group-hover:text-white'
                }`}>Settings</div>
              </div>
              <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" classList={{
                "bg-[#262626]": !isActive('/app/settings')
              }}></div>
            </A>
            <button
              onClick={() => {
                // Handle logout logic here
                localStorage.removeItem('auth_token')
                window.location.href = '/login'
              }}
              class="group inline-flex rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 justify-start items-center gap-2 truncate w-full relative overflow-hidden hover:bg-destructive/10 hover:text-destructive dark:text-muted-foreground"
            >
              <div class="relative z-10 flex items-center gap-2">
                <IconLogout class={`size-5 transition-colors text-[#a3a3a3]`} />
                <div class="transition-colors">Logout</div>
              </div>
              <div class="absolute inset-0 bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}
