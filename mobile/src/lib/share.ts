import { ShareIntent } from 'expo-share-intent';

const URL_PATTERN = /(https?:\/\/[^\s]+)/gi;

export interface ShareDraft {
  title: string;
  url: string;
  description: string;
  source: 'share-intent' | 'manual';
}

function firstUrlFromText(text: string | null | undefined): string | null {
  if (!text) {
    return null;
  }

  const matches = text.match(URL_PATTERN);
  if (!matches || matches.length === 0) {
    return null;
  }

  return matches[0];
}

function firstCandidateTitleFromText(text: string | null | undefined, url: string): string | null {
  if (!text) {
    return null;
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.includes(url) && !/https?:\/\//i.test(line));

  if (lines.length === 0) {
    return null;
  }

  return lines[0];
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch {
    return null;
  }
}

function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      return 'YouTube Video';
    }

    return host.replace(/^www\./, '');
  } catch {
    return 'Shared Link';
  }
}

export function buildShareDraft(shareIntent: ShareIntent): ShareDraft | null {
  const url = normalizeUrl(shareIntent.webUrl) || normalizeUrl(firstUrlFromText(shareIntent.text));

  if (!url) {
    return null;
  }

  const rawTitle = shareIntent.meta?.title?.trim() || firstCandidateTitleFromText(shareIntent.text, url);
  const title = rawTitle && rawTitle.length > 0 ? rawTitle : titleFromUrl(url);

  let description = '';
  if (shareIntent.text) {
    const cleaned = shareIntent.text.replace(url, '').trim();
    if (cleaned && cleaned.length > 0) {
      description = cleaned.slice(0, 1200);
    }
  }

  return {
    title,
    url,
    description,
    source: 'share-intent',
  };
}

export function looksLikeYouTube(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes('youtube.com') || host.includes('youtu.be');
  } catch {
    return false;
  }
}
