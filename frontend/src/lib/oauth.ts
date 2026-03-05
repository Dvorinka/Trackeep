import { getApiV1BaseUrl } from '@/lib/api-url';

export const getOAuthCallbackUrl = (): string => {
  return new URL('/auth/callback', window.location.origin).toString();
};

export const startGitHubOAuth = (): void => {
  const apiBase = getApiV1BaseUrl();
  const frontendRedirect = getOAuthCallbackUrl();

  window.location.href =
    `${apiBase}/auth/github?frontend_redirect=${encodeURIComponent(frontendRedirect)}`;
};
