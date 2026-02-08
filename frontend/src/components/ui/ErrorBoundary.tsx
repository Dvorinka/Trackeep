import { createSignal, type ParentComponent, Show } from 'solid-js'
import { IconAlertTriangle, IconRefresh, IconBug } from '@tabler/icons-solidjs'

interface ErrorInfo {
  error: Error
  reset: () => void
}

export const ErrorBoundary: ParentComponent<{ fallback?: (errorInfo: ErrorInfo) => any }> = (props) => {
  const [error, setError] = createSignal<Error | null>(null)
  const [errorCount, setErrorCount] = createSignal(0)

  const reset = () => {
    setError(null)
    setErrorCount(0)
  }

  const defaultFallback = (errorInfo: ErrorInfo) => (
    <div class="min-h-[400px] flex items-center justify-center">
      <div class="max-w-md w-full mx-auto p-6">
        <div class="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <div class="flex justify-center mb-4">
            <div class="p-3 bg-destructive/20 rounded-full">
              <IconAlertTriangle class="h-8 w-8 text-destructive" />
            </div>
          </div>
          
          <h2 class="text-xl font-semibold text-foreground mb-2">
            Something went wrong
          </h2>
          
          <p class="text-muted-foreground mb-4">
            {errorInfo.error.message || 'An unexpected error occurred'}
          </p>
          
          <Show when={errorCount() > 1}>
            <div class="bg-warning/10 border border-warning/20 rounded p-3 mb-4">
              <p class="text-warning-foreground text-sm">
                This error has occurred {errorCount()} times. Try refreshing the page if it persists.
              </p>
            </div>
          </Show>
          
          <div class="flex gap-3 justify-center">
            <button
              onClick={errorInfo.reset}
              class="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
            >
              <IconRefresh class="mr-2 h-4 w-4" />
              Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              class="inline-flex items-center px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
            >
              <IconRefresh class="mr-2 h-4 w-4" />
              Refresh Page
            </button>
          </div>
          
          <Show when={import.meta.env.DEV}>
            <details class="mt-4 text-left">
              <summary class="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center">
                <IconBug class="mr-2 h-4 w-4" />
                Error Details
              </summary>
              <pre class="mt-2 p-3 bg-muted rounded text-xs text-destructive overflow-auto">
                {errorInfo.error.stack}
              </pre>
            </details>
          </Show>
        </div>
      </div>
    </div>
  )

  return (
    <Show
      when={!error()}
      fallback={props.fallback ? props.fallback({ error: error()!, reset }) : defaultFallback({ error: error()!, reset })}
    >
      {props.children}
    </Show>
  )
}
