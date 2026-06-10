import { createSignal } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { getApiV1BaseUrl } from '@/lib/api-url'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconBuilding, IconCheck, IconWorld, IconLock } from '@tabler/icons-solidjs'
import { useHaptics } from '@/lib/haptics'

const API_BASE_URL = getApiV1BaseUrl()

const WORKSPACE_ICONS = [
  { id: 'building', icon: IconBuilding, label: 'Building' },
  { id: 'world', icon: IconWorld, label: 'World' },
  { id: 'lock', icon: IconLock, label: 'Lock' },
  { id: 'check', icon: IconCheck, label: 'Check' },
]

export const WorkspaceSetup = () => {
  const navigate = useNavigate()
  const haptics = useHaptics()
  const [name, setName] = createSignal('')
  const [description, setDescription] = createSignal('')
  const [isPublic, setIsPublic] = createSignal(false)
  const [selectedIcon, setSelectedIcon] = createSignal('building')
  const [isLoading, setIsLoading] = createSignal(false)
  const [error, setError] = createSignal('')

  const handleCreate = async () => {
    const trimmed = name().trim()
    if (!trimmed) {
      setError('Workspace name required')
      return
    }
    setError('')
    setIsLoading(true)

    try {
      const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/teams`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: trimmed,
          description: description().trim(),
          is_public: isPublic()
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create workspace')
      }

      const data = await response.json()
      const workspace = {
        id: String(data.team?.id || data.id),
        name: trimmed,
        icon: selectedIcon()
      }
      localStorage.setItem('trackeep_workspace_id', workspace.id)
      localStorage.setItem('trackeep_workspace_name', workspace.name)
      localStorage.setItem('trackeep_workspace_icon', workspace.icon)
      window.dispatchEvent(new CustomEvent('trackeep:workspace-changed', { detail: workspace }))
      haptics.success()
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
      haptics.error()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div class="p-6 max-w-lg mx-auto">
      <h1 class="text-2xl font-bold text-foreground mb-2">Create Workspace</h1>
      <p class="text-muted-foreground mb-6">Set up your first workspace to get started.</p>

      <Card class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">Name</label>
          <input
            type="text"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder="My Workspace"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-foreground mb-2">Description</label>
          <textarea
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
            placeholder="Optional description"
            class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
            rows={3}
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-foreground mb-2">Icon</label>
          <div class="flex gap-2">
            {WORKSPACE_ICONS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  type="button"
                  onClick={() => setSelectedIcon(item.id)}
                  class={`p-3 rounded-lg border transition-colors ${
                    selectedIcon() === item.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                  title={item.label}
                >
                  <Icon class="size-5" />
                </button>
              )
            })}
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPublic()}
            onChange={(e) => setIsPublic(e.currentTarget.checked)}
            class="rounded border-input"
          />
          <label class="text-sm text-foreground">Public workspace</label>
        </div>

        {error() && <p class="text-sm text-destructive">{error()}</p>}

        <Button onClick={handleCreate} disabled={isLoading()} class="w-full">
          {isLoading() ? 'Creating...' : 'Create Workspace'}
        </Button>
      </Card>
    </div>
  )
}
