import { For, createSignal, onCleanup, onMount, Show } from 'solid-js'
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
  IconSchool,
  IconChartLine,
  IconBrandGithub,
  IconClock,
  IconCalendar,
  IconLogout,
  IconBuilding,
  IconPlus,
  IconWorld,
  IconLock,
  IconCheck,
  IconStar,
  IconHeart,
  IconBriefcase,
  IconEdit
} from '@tabler/icons-solidjs'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Switch } from '../ui/Switch'
import { ModalPortal } from '../ui/ModalPortal'
import { useAuth } from '@/lib/auth'
import { getApiV1BaseUrl } from '@/lib/api-url'
import { useHaptics } from '@/lib/haptics'

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
]

const API_BASE_URL = getApiV1BaseUrl()
const DEFAULT_WORKSPACE_NAME = 'Trackeep Workspace'

interface WorkspaceOption {
  id: string
  name: string
  icon: typeof IconFileText
  iconId?: string
  description?: string
  is_public?: boolean
}

const WORKSPACE_ICONS = [
  { id: 'building', icon: IconBuilding },
  { id: 'world', icon: IconWorld },
  { id: 'lock', icon: IconLock },
  { id: 'check', icon: IconCheck },
  { id: 'star', icon: IconStar },
  { id: 'heart', icon: IconHeart },
  { id: 'home', icon: IconHome },
  { id: 'briefcase', icon: IconBriefcase },
]

const getWorkspaceIcon = (iconId: string) => {
  const found = WORKSPACE_ICONS.find((i) => i.id === iconId)
  return found ? found.icon : IconBuilding
}

const getAuthToken = () => localStorage.getItem('trackeep_token') || localStorage.getItem('token') || ''

export interface SidebarProps {
  class?: string
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar(props: SidebarProps) {
  const location = useLocation()
  const { logout } = useAuth()
  const haptics = useHaptics()
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = createSignal(false)
  const [workspaces, setWorkspaces] = createSignal<WorkspaceOption[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = createSignal<string>('')
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = createSignal(false)
  const [workspaceName, setWorkspaceName] = createSignal('')
  const [workspaceDescription, setWorkspaceDescription] = createSignal('')
  const [workspaceIsPublic, setWorkspaceIsPublic] = createSignal(false)
  const [isCreatingWorkspace, setIsCreatingWorkspace] = createSignal(false)
  const [createWorkspaceError, setCreateWorkspaceError] = createSignal('')
  const [isEditWorkspaceModalOpen, setIsEditWorkspaceModalOpen] = createSignal(false)
  const [editingWorkspace, setEditingWorkspace] = createSignal<WorkspaceOption | null>(null)
  const [editWorkspaceName, setEditWorkspaceName] = createSignal('')
  const [editWorkspaceDescription, setEditWorkspaceDescription] = createSignal('')
  const [editWorkspaceIsPublic, setEditWorkspaceIsPublic] = createSignal(false)
  const [editWorkspaceIcon, setEditWorkspaceIcon] = createSignal('building')
  const [isSavingWorkspace, setIsSavingWorkspace] = createSignal(false)
  const [saveWorkspaceError, setSaveWorkspaceError] = createSignal('')

  const selectedWorkspace = () => {
    const list = workspaces()
    const found = list.find((workspace) => workspace.id === selectedWorkspaceId())
    return found || list[0] || { id: 'default', name: DEFAULT_WORKSPACE_NAME, icon: IconFileText }
  }

  const persistSelectedWorkspace = (workspace: WorkspaceOption) => {
    localStorage.setItem('trackeep_workspace_id', workspace.id)
    localStorage.setItem('trackeep_workspace_name', workspace.name)
    window.dispatchEvent(
      new CustomEvent('trackeep:workspace-changed', {
        detail: {
          id: workspace.id,
          name: workspace.name,
        },
      }),
    )
  }

  const isActive = (href: string) => {
    const currentPath = location.pathname
    if (href === '/app' && currentPath === '/app') return true
    return currentPath === href
  }

  const handleWorkspaceSelect = (workspace: WorkspaceOption) => {
    setSelectedWorkspaceId(workspace.id)
    persistSelectedWorkspace(workspace)
    setIsWorkspaceDropdownOpen(false)
  }

  const resetCreateWorkspaceForm = () => {
    setWorkspaceName('')
    setWorkspaceDescription('')
    setWorkspaceIsPublic(false)
    setCreateWorkspaceError('')
  }

  const openCreateWorkspaceModal = () => {
    setIsWorkspaceDropdownOpen(false)
    resetCreateWorkspaceForm()
    setIsCreateWorkspaceModalOpen(true)
  }

  const closeCreateWorkspaceModal = () => {
    if (isCreatingWorkspace()) return
    setIsCreateWorkspaceModalOpen(false)
    resetCreateWorkspaceForm()
  }

  const toggleWorkspaceDropdown = () => {
    setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen())
  }

  const normalizeWorkspace = (team: { id?: number | string; name?: string; description?: string; is_public?: boolean; icon_id?: string }): WorkspaceOption => {
    const name = team.name?.trim() || DEFAULT_WORKSPACE_NAME
    const iconId = team.icon_id || 'building'
    return {
      id: String(team.id ?? `workspace-${Date.now()}`),
      name,
      icon: getWorkspaceIcon(iconId),
      iconId,
      description: team.description,
      is_public: team.is_public,
    }
  }

  const loadWorkspaces = async () => {
    const token = getAuthToken()
    if (!token) {
      const fallbackWorkspace = {
        id: 'local-default',
        name: DEFAULT_WORKSPACE_NAME,
        icon: IconBuilding,
        iconId: 'building',
      }
      setWorkspaces([fallbackWorkspace])
      setSelectedWorkspaceId(fallbackWorkspace.id)
      persistSelectedWorkspace(fallbackWorkspace)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/teams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      let mappedWorkspaces: WorkspaceOption[] = []
      if (response.ok) {
        const data = await response.json()
        const teams = Array.isArray(data?.teams) ? data.teams : []
        mappedWorkspaces = teams.map(normalizeWorkspace)
      }

      if (mappedWorkspaces.length === 0) {
        const currentPath = window.location.pathname
        if (currentPath === '/app' || currentPath === '/app/') {
          window.location.href = '/app/workspace-setup'
        }
        return
      }

      setWorkspaces(mappedWorkspaces)

      const persistedWorkspaceId = localStorage.getItem('trackeep_workspace_id') || ''
      const initialSelection =
        mappedWorkspaces.find((workspace) => workspace.id === persistedWorkspaceId) || mappedWorkspaces[0]

      setSelectedWorkspaceId(initialSelection.id)
      persistSelectedWorkspace(initialSelection)
    } catch (error) {
      console.error('Failed to load workspaces:', error)
      const fallbackWorkspace = {
        id: 'local-default',
        name: DEFAULT_WORKSPACE_NAME,
        icon: IconBuilding,
        iconId: 'building',
      }
      setWorkspaces([fallbackWorkspace])
      setSelectedWorkspaceId(fallbackWorkspace.id)
      persistSelectedWorkspace(fallbackWorkspace)
    }
  }

  const handleCreateWorkspace = async () => {
    const trimmed = workspaceName().trim()
    const description = workspaceDescription().trim()
    const isPublic = workspaceIsPublic()

    if (!trimmed) {
      setCreateWorkspaceError('Workspace name is required.')
      return
    }

    setCreateWorkspaceError('')
    setIsCreatingWorkspace(true)
    const token = getAuthToken()
    if (!token) {
      const localWorkspace = {
        id: `local-${Date.now()}`,
        name: trimmed,
        icon: getWorkspaceIcon('building'),
        iconId: 'building',
      }
      setWorkspaces((prev) => [localWorkspace, ...prev])
      handleWorkspaceSelect(localWorkspace)
      setIsCreateWorkspaceModalOpen(false)
      resetCreateWorkspaceForm()
      setIsCreatingWorkspace(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmed,
          description,
          is_public: isPublic,
        }),
      })

      if (!response.ok) {
        let message = `Failed to create workspace: ${response.status}`
        try {
          const data = await response.json()
          message = data?.error || data?.message || message
        } catch {
          // Keep fallback message
        }
        throw new Error(message)
      }

      const data = await response.json()
      const createdWorkspace = normalizeWorkspace(data.team)
      setWorkspaces((prev) => [createdWorkspace, ...prev])
      handleWorkspaceSelect(createdWorkspace)
      setIsCreateWorkspaceModalOpen(false)
      resetCreateWorkspaceForm()
    } catch (error) {
      console.error('Failed to create workspace:', error)
      setCreateWorkspaceError(error instanceof Error ? error.message : 'Failed to create workspace.')
    } finally {
      setIsCreatingWorkspace(false)
    }
  }

  const openEditWorkspaceModal = (workspace: WorkspaceOption) => {
    setEditingWorkspace(workspace)
    setEditWorkspaceName(workspace.name)
    setEditWorkspaceDescription(workspace.description || '')
    setEditWorkspaceIsPublic(workspace.is_public || false)
    setEditWorkspaceIcon(workspace.iconId || 'building')
    setSaveWorkspaceError('')
    setIsEditWorkspaceModalOpen(true)
    setIsWorkspaceDropdownOpen(false)
  }

  const closeEditWorkspaceModal = () => {
    if (isSavingWorkspace()) return
    setIsEditWorkspaceModalOpen(false)
    setEditingWorkspace(null)
  }

  const handleSaveWorkspace = async () => {
    const workspace = editingWorkspace()
    if (!workspace) return
    const trimmed = editWorkspaceName().trim()
    if (!trimmed) {
      setSaveWorkspaceError('Workspace name required')
      return
    }
    setSaveWorkspaceError('')
    setIsSavingWorkspace(true)
    const token = getAuthToken()
    if (!token) {
      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === workspace.id
            ? { ...w, name: trimmed, description: editWorkspaceDescription(), is_public: editWorkspaceIsPublic(), iconId: editWorkspaceIcon(), icon: getWorkspaceIcon(editWorkspaceIcon()) }
            : w
        )
      )
      setIsEditWorkspaceModalOpen(false)
      setIsSavingWorkspace(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/teams/${workspace.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: trimmed,
          description: editWorkspaceDescription().trim(),
          is_public: editWorkspaceIsPublic(),
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data?.error || 'Failed to save workspace')
      }
      setWorkspaces((prev) =>
        prev.map((w) =>
          w.id === workspace.id
            ? { ...w, name: trimmed, description: editWorkspaceDescription(), is_public: editWorkspaceIsPublic(), iconId: editWorkspaceIcon(), icon: getWorkspaceIcon(editWorkspaceIcon()) }
            : w
        )
      )
      if (selectedWorkspaceId() === workspace.id) {
        persistSelectedWorkspace({
          ...workspace,
          name: trimmed,
          icon: getWorkspaceIcon(editWorkspaceIcon()),
          iconId: editWorkspaceIcon()
        })
      }
      setIsEditWorkspaceModalOpen(false)
    } catch (error) {
      setSaveWorkspaceError(error instanceof Error ? error.message : 'Failed to save workspace')
    } finally {
      setIsSavingWorkspace(false)
    }
  }

  // Close dropdown when clicking outside
  onMount(() => {
    void loadWorkspaces()

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (!target.closest('#workspace-selector')) {
        setIsWorkspaceDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    onCleanup(() => document.removeEventListener('click', handleClickOutside))
  })

  return (
    <>
      <div
        class={`fixed inset-y-0 left-0 z-50 border-r border-r-border bg-card transition-all duration-300 ease-in-out overflow-hidden md:relative md:inset-y-auto md:left-auto md:transform-none ${
          props.isOpen ? 'w-[280px] translate-x-0' : 'w-[280px] -translate-x-full md:w-0 md:translate-x-0 md:pointer-events-none'
        }`}
      >
        <div class="w-[280px] h-full flex">
          <div class="h-full flex flex-col pb-6 flex-1 min-w-0">
            <div class="px-4 pt-4">
              <A
                href="/app"
                class="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/40 transition-colors"
              >
                <img
                  src="/trackeep.svg"
                  alt="Trackeep Logo"
                  class="w-7 h-7 app-logo-mono"
                />
                <span class="font-semibold tracking-tight text-foreground">Trackeep</span>
              </A>
            </div>

            {/* Organization Selector */}
          <div class="p-4 pb-0 pt-3 min-w-0 max-w-full" id="workspace-selector">
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
                    <For each={workspaces()}>
                      {(workspace) => (
                        <div class="flex items-center gap-1 px-2 py-1 rounded-sm hover:bg-accent/50 transition-colors group" classList={{ "bg-accent/30": workspace.id === selectedWorkspace().id }}>
                          <button
                            type="button"
                            onClick={() => handleWorkspaceSelect(workspace)}
                            class="flex flex-1 items-center gap-2 text-sm focus:outline-none"
                            role="option"
                          >
                            {(() => {
                              const Icon = workspace.icon
                              return <Icon class="size-4 text-muted-foreground" />
                            })()}
                            <span class="text-left truncate">{workspace.name}</span>
                            <Show when={workspace.id === selectedWorkspace().id}>
                              <div class="w-2 h-2 bg-primary rounded-full"></div>
                            </Show>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditWorkspaceModal(workspace)}
                            class="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent/50 transition-opacity"
                            title="Edit workspace"
                          >
                            <IconEdit class="size-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </For>
                    <div class="border-t border-border mt-1 pt-1">
                      <button
                        type="button"
                        onClick={openCreateWorkspaceModal}
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
                    onClick={() => haptics.navigation()}
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
              onClick={async () => {
                await logout()
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

      <Show when={isCreateWorkspaceModalOpen()}>
        <ModalPortal>
          <>
            <div
              class="fixed inset-0 z-[90] bg-black/50"
              onClick={closeCreateWorkspaceModal}
            />
            <div class="fixed top-1/2 left-1/2 z-[100] w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
              <div class="rounded-lg border border-border bg-card shadow-xl">
                <div class="border-b border-border p-5">
                  <h3 class="text-lg font-semibold text-foreground">Create Workspace</h3>
                  <p class="mt-1 text-sm text-muted-foreground">Add a new workspace for your team or projects.</p>
                </div>

                <div
                  class="space-y-4 p-5"
                >
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium text-foreground">
                      Name
                    </label>
                    <Input
                      type="text"
                      placeholder="Workspace name"
                      value={workspaceName()}
                      onInput={(event) => setWorkspaceName((event.currentTarget as HTMLInputElement).value)}
                      required
                      disabled={isCreatingWorkspace()}
                    />
                  </div>

                  <div class="space-y-1.5">
                    <label class="text-sm font-medium text-foreground" for="workspace-description">
                      Description
                    </label>
                    <textarea
                      id="workspace-description"
                      rows={3}
                      class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Optional description"
                      value={workspaceDescription()}
                      onInput={(event) => setWorkspaceDescription((event.currentTarget as HTMLTextAreaElement).value)}
                      disabled={isCreatingWorkspace()}
                    />
                  </div>

                  <div class="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                    <div>
                      <p class="text-sm font-medium text-foreground">Public workspace</p>
                      <p class="text-xs text-muted-foreground">Allow all members to discover this workspace.</p>
                    </div>
                    <Switch
                      checked={workspaceIsPublic()}
                      onCheckedChange={setWorkspaceIsPublic}
                      disabled={isCreatingWorkspace()}
                    />
                  </div>

                  <Show when={createWorkspaceError()}>
                    <p class="text-sm text-destructive">{createWorkspaceError()}</p>
                  </Show>

                  <div class="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={closeCreateWorkspaceModal}
                      disabled={isCreatingWorkspace()}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => void handleCreateWorkspace()} disabled={isCreatingWorkspace()}>
                      {isCreatingWorkspace() ? 'Creating...' : 'Create Workspace'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        </ModalPortal>
      </Show>

      <Show when={isEditWorkspaceModalOpen()}>
        <ModalPortal>
          <>
            <div
              class="fixed inset-0 z-[90] bg-black/50"
              onClick={closeEditWorkspaceModal}
            />
            <div class="fixed top-1/2 left-1/2 z-[100] w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
              <div class="rounded-lg border border-border bg-card shadow-xl">
                <div class="border-b border-border p-5">
                  <h3 class="text-lg font-semibold text-foreground">Edit Workspace</h3>
                  <p class="mt-1 text-sm text-muted-foreground">Update workspace details and icon.</p>
                </div>

                <div class="space-y-4 p-5">
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium text-foreground">Name</label>
                    <Input
                      type="text"
                      placeholder="Workspace name"
                      value={editWorkspaceName()}
                      onInput={(event) => setEditWorkspaceName((event.currentTarget as HTMLInputElement).value)}
                      disabled={isSavingWorkspace()}
                    />
                  </div>

                  <div class="space-y-1.5">
                    <label class="text-sm font-medium text-foreground">Description</label>
                    <textarea
                      rows={3}
                      class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Optional description"
                      value={editWorkspaceDescription()}
                      onInput={(event) => setEditWorkspaceDescription((event.currentTarget as HTMLTextAreaElement).value)}
                      disabled={isSavingWorkspace()}
                    />
                  </div>

                  <div>
                    <label class="text-sm font-medium text-foreground mb-2 block">Icon</label>
                    <div class="flex gap-2 flex-wrap">
                      {WORKSPACE_ICONS.map((item) => {
                        const Icon = item.icon
                        return (
                          <button
                            type="button"
                            onClick={() => setEditWorkspaceIcon(item.id)}
                            class={`p-2 rounded-lg border transition-colors ${
                              editWorkspaceIcon() === item.id
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                            disabled={isSavingWorkspace()}
                          >
                            <Icon class="size-5" />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div class="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                    <div>
                      <p class="text-sm font-medium text-foreground">Public workspace</p>
                      <p class="text-xs text-muted-foreground">Allow all members to discover this workspace.</p>
                    </div>
                    <Switch
                      checked={editWorkspaceIsPublic()}
                      onCheckedChange={setEditWorkspaceIsPublic}
                      disabled={isSavingWorkspace()}
                    />
                  </div>

                  <Show when={saveWorkspaceError()}>
                    <p class="text-sm text-destructive">{saveWorkspaceError()}</p>
                  </Show>

                  <div class="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={closeEditWorkspaceModal}
                      disabled={isSavingWorkspace()}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => void handleSaveWorkspace()} disabled={isSavingWorkspace()}>
                      {isSavingWorkspace() ? 'Saving...' : 'Save Workspace'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        </ModalPortal>
      </Show>
    </>
  )
}
