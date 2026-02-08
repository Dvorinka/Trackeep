import { createSignal, onMount } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const AuthCallback = () => {
  const [status, setStatus] = createSignal<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = createSignal('Processing authentication...');

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // Store the token from Trackeep backend
      localStorage.setItem('token', token);
      setStatus('success');
      setMessage('Authentication successful! Redirecting...');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/app';
      }, 2000);
    } else {
      setStatus('error');
      setMessage('Authentication failed. Please try again.');
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
