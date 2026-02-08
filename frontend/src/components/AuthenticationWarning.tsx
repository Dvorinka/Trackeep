import { useNavigate } from '@solidjs/router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { isDemoMode } from '@/lib/demo-mode';

export const AuthenticationWarning = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/login?register=true');
  };

  const handleDemoMode = () => {
    if (isDemoMode()) {
      navigate('/login');
    }
  };

  return (
    <div class="min-h-screen bg-background flex items-center justify-center px-4 py-8 dark">
      <div class="w-full max-w-md">
        <Card class="p-8 border-border">
          <div class="text-center mb-8">
            <div class="mb-6">
              <div class="inline-flex items-center justify-center mb-4">
                <img 
                  src="/trackeepfavi_bg.png" 
                  alt="Trackeep Logo" 
                  class="w-12 h-12 rounded-xl"
                />
              </div>
              <h1 class="text-2xl font-bold tracking-tight mb-2 text-foreground">Authentication Required</h1>
              <p class="text-muted-foreground">Please sign in to access Trackeep</p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <div class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 class="font-medium text-amber-800 dark:text-amber-200 mb-1">Authentication Required</h3>
                  <p class="text-sm text-amber-700 dark:text-amber-300">
                    You need to be authenticated to access this page. Please sign in or create an account to continue.
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <Button
                class="w-full"
                size="lg"
                onClick={handleLogin}
              >
                Sign In
              </Button>

              <Button
                class="w-full"
                variant="outline"
                size="lg"
                onClick={handleRegister}
              >
                Create Account
              </Button>

              {isDemoMode() && (
                <Button
                  class="w-full"
                  variant="secondary"
                  size="lg"
                  onClick={handleDemoMode}
                >
                  🎭 Try Demo Mode
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
