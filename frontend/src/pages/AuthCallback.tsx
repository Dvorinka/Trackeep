import { createSignal, onMount } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getApiV1BaseUrl } from '@/lib/api-url';
import { useAuth } from '@/lib/auth';

export const AuthCallback = () => {
  const [status, setStatus] = createSignal<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = createSignal('Processing authentication...');
  const { setAuth } = useAuth();

  onMount(async () => {
    try {
      const apiBase = getApiV1BaseUrl();
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (!token) {
        throw new Error('Missing token');
      }

      window.history.replaceState({}, '', '/auth/callback');

      const res = await fetch(`${apiBase}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Authentication failed');
      }

      const data = await res.json();
      if (!data?.user) {
        throw new Error('Invalid authentication response');
      }

      setAuth(token, data.user);

      setStatus('success');
      setMessage('Authentication successful! Redirecting...');
      window.location.replace('/app');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Authentication failed');
    }
  });

  return (
    <div class="min-h-screen flex items-center justify-center bg-background">
      <Card class="p-8 max-w-md w-full">
        <div class="text-center">
          {status() === 'loading' && (
            <div class="flex flex-col items-center gap-4">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p class="text-lg text-foreground">{message()}</p>
            </div>
          )}
          
          {status() === 'success' && (
            <div class="flex flex-col items-center gap-4">
              <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p class="text-lg text-primary font-medium">{message()}</p>
            </div>
          )}
          
          {status() === 'error' && (
            <div class="flex flex-col items-center gap-4">
              <div class="w-12 h-12 bg-destructive rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <p class="text-lg text-destructive font-medium">{message()}</p>
              <Button onClick={() => window.location.href = '/login'}>
                Back to Login
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
