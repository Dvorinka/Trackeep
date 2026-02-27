import { useAuth } from '@/lib/auth';
import { AuthenticationWarning } from '@/components/AuthenticationWarning';
import { isDemoMode } from '@/lib/demo-mode';
import { Show } from 'solid-js';

interface ProtectedRouteProps {
  children: any;
}

export const ProtectedRoute = (props: ProtectedRouteProps) => {
  const { authState } = useAuth();

  return (
    <Show when={!isDemoMode()} fallback={props.children}>
      <Show
        when={!authState.isLoading}
        fallback={
          <div class="min-h-screen bg-background flex items-center justify-center px-4 py-8">
            <div class="text-center">
              <div class="inline-block w-8 h-8 border-2 border-primary border-r-transparent rounded-full animate-spin mb-3"></div>
              <p class="text-sm text-muted-foreground">Checking authentication...</p>
            </div>
          </div>
        }
      >
        <Show when={authState.isAuthenticated} fallback={<AuthenticationWarning />}>
          {props.children}
        </Show>
      </Show>
    </Show>
  );
};
