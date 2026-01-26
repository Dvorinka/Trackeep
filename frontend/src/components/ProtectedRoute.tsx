import { useAuth } from '@/lib/auth';
import { Login } from '@/pages/Login';

interface ProtectedRouteProps {
  children: any;
}

export const ProtectedRoute = (props: ProtectedRouteProps) => {
  const { authState } = useAuth();

  if (authState.isLoading) {
    return (
      <div class="min-h-screen bg-[#18181b] flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#39b9ff] mx-auto mb-4"></div>
          <p class="text-[#a3a3a3]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return <Login />;
  }

  return props.children;
};
