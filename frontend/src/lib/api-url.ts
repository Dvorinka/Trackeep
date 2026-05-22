/**
 * Centralized API URL resolver.
 *
 * Problem: Vite bakes import.meta.env values at build time. When the unified
 * Docker image is built without VITE_API_URL, every API call fell back to
 * 'http://localhost:8080', which broke production deployments (e.g. Casa).
 *
 * Solution: This helper checks the runtime-injected window.ENV first
 * (set by docker-entrypoint.sh via sed replacement in index.html), then
 * build-time import.meta.env, then dev fallback. In production unified
 * deployments (same origin) it returns '' so all API calls use relative
 * URLs like '/api/v1/...' that nginx proxies to the backend.
 */

const DEFAULT_API_ORIGIN = 'http://localhost:8080';

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const trimApiSuffix = (value: string): string => value.replace(/\/api\/v1$/, '');

export const getApiOrigin = (): string => {
  // 1. Runtime injection from index.html (highest priority for Docker deployments)
  const runtimeUrl = ((window as any).ENV?.VITE_API_URL as string | undefined)?.trim();
  if (runtimeUrl && runtimeUrl !== 'VITE_API_URL_PLACEHOLDER') {
    const normalized = trimTrailingSlash(runtimeUrl);
    return trimApiSuffix(normalized);
  }

  // 2. Build-time Vite env variable (for dev builds or pre-built images)
  const buildUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (buildUrl) {
    const normalized = trimTrailingSlash(buildUrl);
    return trimApiSuffix(normalized);
  }

  // 3. Development fallback
  if (import.meta.env.DEV) {
    return DEFAULT_API_ORIGIN;
  }

  // 4. Production unified deployment: same-origin relative URLs
  return '';
};

export const getApiV1BaseUrl = (): string => {
  const origin = getApiOrigin();
  return origin ? `${origin}/api/v1` : '/api/v1';
};
