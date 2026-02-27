const DEFAULT_API_ORIGIN = 'http://localhost:8080';

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const trimApiSuffix = (value: string): string => value.replace(/\/api\/v1$/, '');

export const getApiOrigin = (): string => {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!raw) {
    return DEFAULT_API_ORIGIN;
  }

  const normalized = trimTrailingSlash(raw);
  return trimApiSuffix(normalized);
};

export const getApiV1BaseUrl = (): string => {
  const origin = getApiOrigin();
  return `${origin}/api/v1`;
};
