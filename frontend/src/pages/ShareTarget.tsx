import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { getApiV1BaseUrl } from '@/lib/api-url';
import { useNavigate } from '@solidjs/router';
import { createSignal, onMount, Show } from 'solid-js';

const API_BASE_URL = getApiV1BaseUrl();
const PENDING_SHARE_KEY = 'trackeep_pending_share_target';

interface PendingSharePayload {
  title: string;
  text: string;
  url: string;
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"')\]]+/i);
  if (!match) {
    return null;
  }

  return match[0].replace(/[),.;!?]+$/, '');
}

function normalizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}

function deriveTitle(url: string, providedTitle: string): string {
  const title = providedTitle.trim();
  if (title) {
    return title;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Shared Link';
  }
}

function isGenericTitle(title: string, url: string): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (normalized === 'shared link' || normalized === 'youtube video') {
    return true;
  }

  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return normalized === host;
  } catch {
    return false;
  }
}

function deriveDescription(sharedText: string, url: string): string {
  const cleaned = sharedText.replace(url, '').trim();
  return cleaned.slice(0, 1200);
}

function looksLikeYouTube(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes('youtube.com') || host.includes('youtu.be');
  } catch {
    return false;
  }
}

function writePendingShare(payload: PendingSharePayload): void {
  sessionStorage.setItem(PENDING_SHARE_KEY, JSON.stringify(payload));
}

function readPendingShare(): PendingSharePayload | null {
  const raw = sessionStorage.getItem(PENDING_SHARE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingSharePayload>;
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      text: typeof parsed.text === 'string' ? parsed.text : '',
      url: typeof parsed.url === 'string' ? parsed.url : '',
    };
  } catch {
    return null;
  }
}

function clearPendingShare(): void {
  sessionStorage.removeItem(PENDING_SHARE_KEY);
}

export const ShareTarget = () => {
  const navigate = useNavigate();

  const [status, setStatus] = createSignal<'processing' | 'success' | 'error' | 'auth'>('processing');
  const [message, setMessage] = createSignal('Saving shared content to Trackeep...');

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const incomingPayload: PendingSharePayload = {
      title: params.get('title') || '',
      text: params.get('text') || '',
      url: params.get('url') || '',
    };

    const hasIncomingPayload = Boolean(incomingPayload.title || incomingPayload.text || incomingPayload.url);
    if (hasIncomingPayload) {
      writePendingShare(incomingPayload);
    }

    const payload = hasIncomingPayload ? incomingPayload : readPendingShare();
    if (!payload) {
      setStatus('error');
      setMessage('No shared content detected.');
      return;
    }

    const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
    if (!token) {
      setStatus('auth');
      setMessage('Sign in required. Redirecting to login...');
      toast.info('Sign in required', 'Please sign in to save shared content.');
      navigate('/login?next=%2Fshare-target', { replace: true });
      return;
    }

    const rawUrl = payload.url || extractFirstUrl(payload.text) || '';
    const normalizedUrl = normalizeUrl(rawUrl);
    if (!normalizedUrl) {
      setStatus('error');
      setMessage('No valid URL found in shared content.');
      toast.error('Share failed', 'No valid URL found in shared payload.');
      clearPendingShare();
      return;
    }

    let title = deriveTitle(normalizedUrl, payload.title);
    let description = deriveDescription(payload.text, normalizedUrl);

    try {
      const metadataResponse = await fetch(`${API_BASE_URL}/bookmarks/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      if (metadataResponse.ok) {
        const metadata = await metadataResponse
          .json()
          .catch(() => ({})) as { title?: string; description?: string };
        if (
          typeof metadata.title === 'string' &&
          metadata.title.trim().length > 0 &&
          isGenericTitle(title, normalizedUrl)
        ) {
          title = metadata.title.trim();
        }

        if (
          typeof metadata.description === 'string' &&
          metadata.description.trim().length > 0 &&
          description.trim().length < 12
        ) {
          description = metadata.description.trim();
        }
      }
    } catch {
      // metadata enrichment is best-effort
    }

    try {
      const response = await fetch(`${API_BASE_URL}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          url: normalizedUrl,
          description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed with status ${response.status}`);
      }

      clearPendingShare();
      setStatus('success');
      const destination = looksLikeYouTube(normalizedUrl) ? '/app/youtube' : '/app/bookmarks';
      setMessage(
        looksLikeYouTube(normalizedUrl)
          ? 'Saved successfully. Redirecting to YouTube...'
          : 'Saved successfully. Redirecting to bookmarks...',
      );
      toast.success('Saved to Trackeep', 'Shared link was added to bookmarks.');

      setTimeout(() => {
        navigate(destination, { replace: true });
      }, 600);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Failed to save shared content';
      setStatus('error');
      setMessage(text);
      toast.error('Share failed', text);
    }
  });

  return (
    <div class="min-h-[50vh] flex items-center justify-center p-4">
      <Card class="w-full max-w-md p-6 space-y-4 border-border bg-card text-card-foreground">
        <h1 class="text-xl font-semibold">Trackeep Share Target</h1>
        <p class="text-sm text-muted-foreground">{message()}</p>

        <Show when={status() === 'processing'}>
          <div class="inline-block w-6 h-6 border-2 border-primary border-r-transparent rounded-full animate-spin" />
        </Show>

        <Show when={status() !== 'processing'}>
          <div class="flex gap-2">
            <Button
              onClick={() => navigate(status() === 'auth' ? '/login' : '/app/bookmarks', { replace: true })}
            >
              {status() === 'auth' ? 'Open Login' : 'Open Bookmarks'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/app', { replace: true })}>
              Go Home
            </Button>
          </div>
        </Show>
      </Card>
    </div>
  );
};
