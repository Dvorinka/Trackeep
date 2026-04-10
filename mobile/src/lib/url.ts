const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|10\.0\.2\.2|10\.0\.3\.2|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i;
const API_SUFFIX_RE = /\/api\/v1\/?$/i;

function hasProtocol(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value);
}

export function normalizeInstanceUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Instance URL is required.');
  }

  const hostCandidate = trimmed.replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//, '').split('/')[0].toLowerCase();
  const scheme = LOCAL_HOST_RE.test(hostCandidate) ? 'http' : 'https';
  const withScheme = hasProtocol(trimmed) ? trimmed : `${scheme}://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error('Invalid instance URL format.');
  }

  let path = parsed.pathname.replace(/\/+$/, '');
  path = path.replace(API_SUFFIX_RE, '');

  const normalizedPath = path === '/' ? '' : path;
  return `${parsed.protocol}//${parsed.host}${normalizedPath}`;
}

export function getApiBaseUrl(instanceUrl: string): string {
  const root = normalizeInstanceUrl(instanceUrl);
  return `${root}/api/v1`;
}
