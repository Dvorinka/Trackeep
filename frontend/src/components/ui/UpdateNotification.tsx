import { createSignal, onMount, Show, For } from 'solid-js'
import { 
  IconDownload, 
  IconRefresh, 
  IconX, 
  IconCheck, 
  IconAlertTriangle,
  IconLoader2
} from '@tabler/icons-solidjs'

interface UpdateInfo {
  version: string
  releaseNotes: string
  downloadUrl: string
  mandatory: boolean
  size: string
}

interface UpdateStatus {
  available: boolean
  downloading: boolean
  installing: boolean
  completed: boolean
  error: string | null
  progress: number
}

export function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = createSignal<UpdateInfo | null>(null)
  const [updateStatus, setUpdateStatus] = createSignal<UpdateStatus>({
    available: false,
    downloading: false,
    installing: false,
    completed: false,
    error: null,
    progress: 0
  })
  const [dismissed, setDismissed] = createSignal(false)
  const [expanded, setExpanded] = createSignal(false)

  onMount(() => {
    checkForUpdates()
    // Check for updates every 30 minutes
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000)
    return () => clearInterval(interval)
  })

  const checkForUpdates = async () => {
    try {
      const response = await fetch('/api/updates/check')
      if (response.ok) {
        const data = await response.json()
        if (data.updateAvailable) {
          setUpdateInfo(data.updateInfo)
          setUpdateStatus(prev => ({ ...prev, available: true }))
          setDismissed(false)
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error)
    }
  }

  const startUpdate = async () => {
    if (!updateInfo()) return

    setUpdateStatus(prev => ({ 
      ...prev, 
      downloading: true, 
      error: null, 
      progress: 0 
    }))

    try {
      // Start the update process
      const response = await fetch('/api/updates/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: updateInfo()?.version })
      })

      if (!response.ok) {
        throw new Error('Failed to start update')
      }

      // Monitor progress
      monitorUpdateProgress()
    } catch (error) {
      setUpdateStatus(prev => ({ 
        ...prev, 
        downloading: false, 
        error: error instanceof Error ? error.message : 'Update failed' 
      }))
    }
  }

  const monitorUpdateProgress = async () => {
    const progressInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/updates/progress')
        if (response.ok) {
          const progress = await response.json()
          
          setUpdateStatus(prev => ({
            ...prev,
            progress: progress.progress,
            installing: progress.installing,
            downloading: progress.downloading
          }))

          if (progress.completed) {
            clearInterval(progressInterval)
            setUpdateStatus(prev => ({ ...prev, completed: true }))
            
            // Reload page after a short delay to show completion
            setTimeout(() => {
              window.location.reload()
            }, 2000)
          } else if (progress.error) {
            clearInterval(progressInterval)
            setUpdateStatus(prev => ({ 
              ...prev, 
              downloading: false, 
              installing: false, 
              error: progress.error 
            }))
          }
        }
      } catch (error) {
        clearInterval(progressInterval)
        setUpdateStatus(prev => ({ 
          ...prev, 
          downloading: false, 
          installing: false, 
          error: 'Failed to monitor update progress' 
        }))
      }
    }, 1000)
  }

  const dismiss = () => {
    setDismissed(true)
    if (!updateInfo()?.mandatory) {
      setUpdateStatus(prev => ({ ...prev, available: false }))
    }
  }

  const status = updateStatus()
  const info = updateInfo()

  return (
    <Show when={status.available && !dismissed()}>
      <div class="border-b border-border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <div class="px-4 py-3">
          <div class="flex items-start gap-3">
            {/* Icon */}
            <div class="flex-shrink-0 mt-0.5">
              <Show 
                when={status.completed}
                fallback={
                  <Show 
                    when={status.error}
                    fallback={
                      <Show 
                        when={status.downloading || status.installing}
                        fallback={<IconDownload class="size-5 text-blue-600 dark:text-blue-400 animate-pulse" />}
                      >
                        <IconLoader2 class="size-5 text-blue-600 dark:text-blue-400 animate-spin" />
                      </Show>
                    }
                  >
                    <IconAlertTriangle class="size-5 text-red-600 dark:text-red-400" />
                  </Show>
                }
              >
                <IconCheck class="size-5 text-green-600 dark:text-green-400" />
              </Show>
            </div>

            {/* Content */}
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <Show 
                    when={status.completed}
                    fallback={
                      <Show 
                        when={status.error}
                        fallback={
                          <p class="text-sm font-medium text-blue-900 dark:text-blue-100">
                            New version {info?.version} available
                          </p>
                        }
                      >
                        <p class="text-sm font-medium text-red-900 dark:text-red-100">
                          Update failed
                        </p>
                      </Show>
                    }
                  >
                    <p class="text-sm font-medium text-green-900 dark:text-green-100">
                      Update completed! Reloading...
                    </p>
                  </Show>
                  
                  <Show when={!status.completed && !status.error}>
                    <p class="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      {info?.size} • {info?.mandatory ? 'Required update' : 'Optional update'}
                    </p>
                  </Show>
                </div>

                {/* Actions */}
                <div class="flex items-center gap-2 flex-shrink-0">
                  <Show when={!status.completed && !status.error && !status.downloading}>
                    <button
                      onClick={() => setExpanded(!expanded())}
                      class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      {expanded() ? 'Hide' : 'Details'}
                    </button>
                    
                    <button
                      onClick={startUpdate}
                      class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <IconDownload class="size-3" />
                      Update Now
                    </button>
                  </Show>

                  <Show when={status.downloading || status.installing}>
                    <div class="text-xs text-blue-600 dark:text-blue-400">
                      {status.installing ? 'Installing...' : `Downloading... ${Math.round(status.progress)}%`}
                    </div>
                  </Show>

                  <Show when={status.error}>
                    <button
                      onClick={startUpdate}
                      class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <IconRefresh class="size-3" />
                      Retry
                    </button>
                  </Show>

                  <Show when={!info?.mandatory}>
                    <button
                      onClick={dismiss}
                      class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <IconX class="size-4" />
                    </button>
                  </Show>
                </div>
              </div>

              {/* Progress Bar */}
              <Show when={status.downloading || status.installing}>
                <div class="mt-2">
                  <div class="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5">
                    <div 
                      class="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${status.progress}%` }}
                    ></div>
                  </div>
                </div>
              </Show>

              {/* Expanded Details */}
              <Show when={expanded() && info}>
                <div class="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-md border border-blue-200 dark:border-blue-800">
                  <h4 class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    What's new in {info?.version}
                  </h4>
                  <div class="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    <For each={info?.releaseNotes.split('\n').filter(line => line.trim()) || []}>
                      {(line) => <p>• {line}</p>}
                    </For>
                  </div>
                </div>
              </Show>

              {/* Error Message */}
              <Show when={status.error}>
                <div class="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
                  <p class="text-xs text-red-800 dark:text-red-200">
                    {status.error}
                  </p>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </Show>
  )
}
