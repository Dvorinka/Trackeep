import { getApiV1BaseUrl } from '@/lib/api-url';

export const getAuthCallbackUrl = (): string => {
  return new URL('/auth/callback', window.location.origin).toString();
};

export const startGitHubSignIn = (): void => {
  const apiBase = getApiV1BaseUrl();
  const frontendRedirect = getAuthCallbackUrl();

  window.location.href =
    `${apiBase}/auth/github?frontend_redirect=${encodeURIComponent(frontendRedirect)}`;
};

export const startGitHubOAuth = startGitHubSignIn;
