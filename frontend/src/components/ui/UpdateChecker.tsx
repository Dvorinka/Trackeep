import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { 
  IconRefresh, 
  IconCheck, 
  IconAlertTriangle,
  IconDownload,
  IconLoader2
} from '@tabler/icons-solidjs';
import { updateService, type UpdateInfo, type UpdateStatus } from '../../services/updateService';

interface UpdateCheckerProps {
  class?: string;
}

export function UpdateChecker(props: UpdateCheckerProps) {
  const [updateAvailable, setUpdateAvailable] = createSignal(false);
  const [updateInfo, setUpdateInfo] = createSignal<UpdateInfo | null>(null);
  const [updateStatus, setUpdateStatus] = createSignal<UpdateStatus>({
    available: false,
    downloading: false,
    installing: false,
    completed: false,
    progress: 0
  });
  const [isChecking, setIsChecking] = createSignal(false);
  const [showUpdateModal, setShowUpdateModal] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [currentVersion, setCurrentVersion] = createSignal('1.0.0');

  let pollCleanup: (() => void) | null = null;

  const checkForUpdates = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const response = await updateService.checkForUpdates();
      setUpdateAvailable(response.updateAvailable);
      setUpdateInfo(response.updateInfo || null);
      setCurrentVersion(response.currentVersion);
      
      if (response.updateAvailable && response.updateInfo) {
        setUpdateStatus(prev => ({ ...prev, available: true }));
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
      setError('Failed to check for updates');
    } finally {
      setIsChecking(false);
    }
  };

  const installUpdate = async () => {
    if (!updateInfo()) return;

    try {
      setError(null);
      await updateService.installUpdate(updateInfo()!.version);
      
      // Start polling for progress
      pollCleanup = updateService.pollUpdateProgress((progress: UpdateStatus) => {
        setUpdateStatus(progress);
        
        if (progress.completed) {
          setShowUpdateModal(false);
          // Show success notification or trigger reload
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
        
        if (progress.error) {
          setError(progress.error);
        }
      });
      
    } catch (err) {
      console.error('Failed to install update:', err);
      setError('Failed to install update');
    }
  };

  const cancelUpdate = () => {
    if (pollCleanup) {
      pollCleanup();
      pollCleanup = null;
    }
    setShowUpdateModal(false);
    setUpdateStatus({
      available: updateAvailable(),
      downloading: false,
      installing: false,
      completed: false,
      progress: 0
    });
  };

  onMount(() => {
    // Check for updates on component mount
    checkForUpdates();
    
    // Set current version
    setCurrentVersion(updateService.getCurrentVersion());
    
    // Check for updates periodically (every 30 minutes)
    const intervalId = setInterval(checkForUpdates, 30 * 60 * 1000);
    
    onCleanup(() => {
      clearInterval(intervalId);
      if (pollCleanup) {
        pollCleanup();
      }
    });
  });

  const getStatusIcon = () => {
    if (isChecking()) return <IconLoader2 class="size-4 animate-spin" />;
    if (updateStatus().downloading || updateStatus().installing) return <IconLoader2 class="size-4 animate-spin" />;
    if (updateStatus().completed) return <IconCheck class="size-4 text-green-500" />;
    if (updateAvailable()) return <IconDownload class="size-4 text-blue-500" />;
    if (error()) return <IconAlertTriangle class="size-4 text-red-500" />;
    return <IconRefresh class="size-4" />;
  };

  const getStatusText = () => {
    if (isChecking()) return 'Checking...';
    if (updateStatus().downloading) return `Downloading... ${Math.round(updateStatus().progress)}%`;
    if (updateStatus().installing) return `Installing... ${Math.round(updateStatus().progress)}%`;
    if (updateStatus().completed) return 'Update Complete';
    if (updateAvailable()) return 'Update Available';
    if (error()) return 'Update Failed';
    return 'Check Updates';
  };

  return (
    <>
      <div class={`flex items-center gap-2 ${props.class || ''}`}>
        <button
          onClick={() => updateAvailable() ? setShowUpdateModal(true) : checkForUpdates()}
          class="group inline-flex rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 justify-start items-center gap-2 truncate relative overflow-hidden w-full"
          classList={{
            "bg-blue-500/20 text-blue-400": updateAvailable() && !updateStatus().downloading && !updateStatus().installing,
            "hover:bg-blue-500/30": updateAvailable() && !updateStatus().downloading && !updateStatus().installing,
            "bg-orange-500/20 text-orange-400": updateStatus().downloading || updateStatus().installing,
            "hover:bg-orange-500/30": updateStatus().downloading || updateStatus().installing,
            "bg-green-500/20 text-green-400": updateStatus().completed,
            "hover:bg-green-500/30": updateStatus().completed,
            "bg-red-500/20 text-red-400": !!error(),
            "hover:bg-red-500/30": !!error(),
            "hover:bg-[#262626] hover:text-white text-[#a3a3a3]": !updateAvailable() && !updateStatus().downloading && !updateStatus().installing && !updateStatus().completed && !error()
          }}
          disabled={isChecking() || updateStatus().downloading || updateStatus().installing}
        >
          <div class="relative z-10 flex items-center gap-2">
            {getStatusIcon()}
            <div class="transition-colors truncate">
              {getStatusText()}
            </div>
          </div>
          <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
        </button>
      </div>

      {/* Update Modal */}
      <Show when={showUpdateModal() && updateInfo()}>
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-card border border-border rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-auto">
            <div class="p-6">
              <div class="flex items-center gap-3 mb-4">
                <IconDownload class="size-6 text-blue-500" />
                <h2 class="text-lg font-semibold">Update Available</h2>
              </div>

              <div class="space-y-4">
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-muted-foreground">Current Version</span>
                    <span class="text-sm font-medium">{currentVersion()}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-muted-foreground">Latest Version</span>
                    <span class="text-sm font-medium text-blue-500">{updateInfo()!.version}</span>
                  </div>
                </div>

                <div>
                  <h3 class="text-sm font-medium mb-2">Release Notes</h3>
                  <div class="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 rounded p-3">
                    {updateInfo()!.releaseNotes}
                  </div>
                </div>

                <div class="flex justify-between items-center text-sm">
                  <span class="text-muted-foreground">Download Size</span>
                  <span>{updateInfo()!.size}</span>
                </div>

                <Show when={updateStatus().downloading || updateStatus().installing}>
                  <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                      <span class="text-muted-foreground">
                        {updateStatus().downloading ? 'Downloading' : 'Installing'}
                      </span>
                      <span>{Math.round(updateStatus().progress)}%</span>
                    </div>
                    <div class="w-full bg-muted rounded-full h-2">
                      <div 
                        class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${updateStatus().progress}%` }}
                      ></div>
                    </div>
                  </div>
                </Show>

                <Show when={error()}>
                  <div class="bg-red-500/10 border border-red-500/20 rounded p-3">
                    <div class="flex items-center gap-2 text-red-500 text-sm">
                      <IconAlertTriangle class="size-4" />
                      <span>{error()}</span>
                    </div>
                  </div>
                </Show>

                <Show when={updateStatus().completed}>
                  <div class="bg-green-500/10 border border-green-500/20 rounded p-3">
                    <div class="flex items-center gap-2 text-green-500 text-sm">
                      <IconCheck class="size-4" />
                      <span>Update completed successfully! Restarting...</span>
                    </div>
                  </div>
                </Show>
              </div>

              <div class="flex gap-3 mt-6">
                <Show when={!updateStatus().downloading && !updateStatus().installing && !updateStatus().completed}>
                  <button
                    onClick={() => setShowUpdateModal(false)}
                    class="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    Later
                  </button>
                  <button
                    onClick={installUpdate}
                    disabled={updateStatus().downloading || updateStatus().installing}
                    class="flex-1 px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Show when={updateStatus().downloading || updateStatus().installing}>
                      <IconLoader2 class="size-4 animate-spin" />
                    </Show>
                    {updateStatus().downloading || updateStatus().installing ? 'Installing...' : 'Install Update'}
                  </button>
                </Show>

                <Show when={updateStatus().downloading || updateStatus().installing || error()}>
                  <button
                    onClick={cancelUpdate}
                    class="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </Show>

                <Show when={updateStatus().completed}>
                  <button
                    onClick={() => window.location.reload()}
                    class="w-full px-4 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                  >
                    Reload Application
                  </button>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}
