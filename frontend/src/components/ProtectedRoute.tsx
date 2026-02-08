import { useAuth } from '@/lib/auth';
import { AuthenticationWarning } from '@/components/AuthenticationWarning';
import { isDemoMode } from '@/lib/demo-mode';

interface ProtectedRouteProps {
  children: any;
}

export const ProtectedRoute = (props: ProtectedRouteProps) => {
  // In demo mode, show UI immediately without any checks
  if (isDemoMode()) {
    console.log('[ProtectedRoute] Demo mode active - showing UI immediately');
    return props.children;
  }

  const { authState } = useAuth();

  console.log('[ProtectedRoute] Render:', {
    isDemoMode: isDemoMode(),
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading
  });

  // If not authenticated, show authentication warning (no loading state)
  if (!authState.isAuthenticated) {
    console.log('[ProtectedRoute] Rendering authentication warning');
    return <AuthenticationWarning />;
  }

  console.log('[ProtectedRoute] Rendering children');
  return props.children;
};
