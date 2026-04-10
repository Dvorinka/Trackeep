import { ShareIntent, ShareIntentFile } from 'expo-share-intent';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';

import { colors } from '../components/UI';
import { trackeepApi } from '../lib/api';
import { buildShareDraft, looksLikeYouTube, ShareDraft } from '../lib/share';
import { User } from '../types';

interface ShareIntentState {
  hasShareIntent: boolean;
  shareIntent: ShareIntent;
  resetShareIntent: (clearNativeModule?: boolean) => void;
  error: string | null;
}

interface WebAppScreenProps {
  instanceUrl: string;
  token: string;
  user: User;
  onLogout: () => Promise<void>;
  shareIntentState: ShareIntentState;
}

type BridgeMessage = {
  type: 'NAV_CHANGE' | 'AUTH_LOGOUT' | 'AUTH_TOKEN' | 'BOOTSTRAP_DONE';
  payload?: Record<string, unknown>;
};

const ROUTES: Array<{ label: string; path: string }> = [
  { label: 'Dashboard', path: '/app' },
  { label: 'Bookmarks', path: '/app/bookmarks' },
  { label: 'Tasks', path: '/app/tasks' },
  { label: 'Notes', path: '/app/notes' },
  { label: 'Files', path: '/app/files' },
  { label: 'YouTube', path: '/app/youtube' },
  { label: 'Time', path: '/app/time-tracking' },
];

function isInternalUrl(url: string, instanceUrl: string): boolean {
  if (!url) {
    return false;
  }

  if (url.startsWith('about:blank') || url.startsWith('data:') || url.startsWith('javascript:')) {
    return true;
  }

  try {
    const target = new URL(url);
    const base = new URL(instanceUrl);
    return target.origin === base.origin;
  } catch {
    return false;
  }
}

function pathFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/app';
  }
}

function toAbsolute(instanceUrl: string, path: string): string {
  return new URL(path, `${instanceUrl}/`).toString();
}

function isGenericShareTitle(title: string, url: string): boolean {
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

function uniqueFiles(files: ShareIntentFile[]): ShareIntentFile[] {
  const seen = new Set<string>();
  const result: ShareIntentFile[] = [];

  for (const file of files) {
    const key = `${file.path}|${file.fileName}|${file.size || 0}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(file);
  }

  return result;
}

export function WebAppScreen({ instanceUrl, token, user, onLogout, shareIntentState }: WebAppScreenProps) {
  const { hasShareIntent, shareIntent, resetShareIntent, error: shareIntentError } = shareIntentState;

  const webRef = useRef<WebView>(null);

  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [webLoading, setWebLoading] = useState(true);
  const [webError, setWebError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('/app');

  const [showManualShare, setShowManualShare] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualDescription, setManualDescription] = useState('');

  const [incomingDraft, setIncomingDraft] = useState<ShareDraft | null>(null);
  const [incomingFiles, setIncomingFiles] = useState<ShareIntentFile[]>([]);
  const [draftMetadataLoading, setDraftMetadataLoading] = useState(false);

  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareInfo, setShareInfo] = useState<string | null>(null);

  const appUrl = toAbsolute(instanceUrl, '/app');
  const incomingIsYouTube = incomingDraft ? looksLikeYouTube(incomingDraft.url) : false;

  const injectedBeforeLoad = useMemo(() => {
    const injectedUser = JSON.stringify(user);

    return `
      (function() {
        try {
          localStorage.setItem('trackeep_token', ${JSON.stringify(token)});
          localStorage.setItem('token', ${JSON.stringify(token)});
          localStorage.setItem('trackeep_user', JSON.stringify(${injectedUser}));
          localStorage.setItem('user', JSON.stringify(${injectedUser}));
          window.__TRACKEEP_MOBILE__ = true;

          if (!window.__TRACKEEP_BRIDGE__) {
            window.__TRACKEEP_BRIDGE__ = true;

            var postBridge = function(type, payload) {
              try {
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
                  JSON.stringify({ type: type, payload: payload || {} })
                );
              } catch (_) {}
            };

            var notifyAuthState = function() {
              var activeToken = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
              if (!activeToken) {
                postBridge('AUTH_LOGOUT', {});
              } else {
                postBridge('AUTH_TOKEN', {});
              }
            };

            var notifyNav = function() {
              postBridge('NAV_CHANGE', {
                href: window.location.href,
                path: window.location.pathname + window.location.search + window.location.hash,
              });
            };

            var originalSetItem = localStorage.setItem.bind(localStorage);
            var originalRemoveItem = localStorage.removeItem.bind(localStorage);

            localStorage.setItem = function(key, value) {
              originalSetItem(key, value);
              if (key === 'trackeep_token' || key === 'token') {
                notifyAuthState();
              }
            };

            localStorage.removeItem = function(key) {
              originalRemoveItem(key);
              if (key === 'trackeep_token' || key === 'token') {
                notifyAuthState();
              }
            };

            var originalPushState = history.pushState.bind(history);
            history.pushState = function() {
              var result = originalPushState.apply(history, arguments);
              notifyNav();
              return result;
            };

            var originalReplaceState = history.replaceState.bind(history);
            history.replaceState = function() {
              var result = originalReplaceState.apply(history, arguments);
              notifyNav();
              return result;
            };

            window.addEventListener('popstate', notifyNav);
            notifyNav();
            postBridge('BOOTSTRAP_DONE', { hasToken: true });
          }
        } catch (error) {
          console.error('Mobile bootstrap failed', error);
        }
        true;
      })();
    `;
  }, [token, user]);

  const instanceLabel = useMemo(() => {
    try {
      return new URL(instanceUrl).host;
    } catch {
      return instanceUrl;
    }
  }, [instanceUrl]);

  useEffect(() => {
    setShareError(shareIntentError);
  }, [shareIntentError]);

  useEffect(() => {
    if (!hasShareIntent) {
      return;
    }

    setShareInfo(null);
    setShareError(null);

    const draft = buildShareDraft(shareIntent);
    const files = uniqueFiles(shareIntent.files || []);

    if (draft) {
      setIncomingDraft(draft);
      setIncomingFiles([]);
      return;
    }

    if (files.length > 0) {
      setIncomingFiles(files);
      setIncomingDraft(null);
      return;
    }

    setShareError('Shared content was received but no supported URL or file was detected.');
    resetShareIntent();
  }, [
    hasShareIntent,
    shareIntent.text,
    shareIntent.webUrl,
    shareIntent.files,
    shareIntent.meta,
    resetShareIntent,
  ]);

  useEffect(() => {
    if (!incomingDraft?.url) {
      return;
    }

    let cancelled = false;
    setDraftMetadataLoading(true);

    void trackeepApi.bookmarks
      .metadata(instanceUrl, token, incomingDraft.url)
      .then((metadata) => {
        if (cancelled || !metadata) {
          return;
        }

        setIncomingDraft((current) => {
          if (!current || current.url !== incomingDraft.url) {
            return current;
          }

          const betterTitle =
            metadata.title && metadata.title.trim().length > 0 && isGenericShareTitle(current.title, current.url)
              ? metadata.title.trim()
              : current.title;

          const betterDescription =
            metadata.description && metadata.description.trim().length > 0 && current.description.trim().length < 12
              ? metadata.description.trim()
              : current.description;

          return {
            ...current,
            title: betterTitle,
            description: betterDescription,
          };
        });
      })
      .catch(() => {
        // metadata enrichment is best-effort only
      })
      .finally(() => {
        if (!cancelled) {
          setDraftMetadataLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [incomingDraft?.url, instanceUrl, token]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        webRef.current?.goBack();
        return true;
      }
      return false;
    });

    return () => sub.remove();
  }, [canGoBack]);

  const clearIncomingShare = useCallback(() => {
    setIncomingDraft(null);
    setIncomingFiles([]);
    setDraftMetadataLoading(false);
    resetShareIntent();
  }, [resetShareIntent]);

  const refreshWebView = useCallback(() => {
    webRef.current?.reload();
  }, []);

  const navigateTo = useCallback(
    (path: string) => {
      const target = toAbsolute(instanceUrl, path);
      webRef.current?.injectJavaScript(`window.location.assign(${JSON.stringify(target)}); true;`);
      setCurrentPath(path);
    },
    [instanceUrl],
  );

  const openCurrentInBrowser = useCallback(async () => {
    const target = toAbsolute(instanceUrl, currentPath || '/app');
    await Linking.openURL(target);
  }, [instanceUrl, currentPath]);

  const saveBookmark = async (draft: ShareDraft, routeAfterSave = '/app/bookmarks') => {
    setShareBusy(true);
    setShareError(null);
    setShareInfo(null);

    try {
      await trackeepApi.bookmarks.create(instanceUrl, token, {
        title: draft.title.trim(),
        url: draft.url.trim(),
        description: draft.description.trim() || 'Shared from Trackeep Mobile',
      });

      const isYoutube = looksLikeYouTube(draft.url);
      setShareInfo(isYoutube ? 'Saved YouTube link to Trackeep.' : 'Saved bookmark to Trackeep.');
      clearIncomingShare();
      navigateTo(routeAfterSave);
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'Failed to save shared bookmark.');
    } finally {
      setShareBusy(false);
    }
  };

  const uploadIncomingFiles = async (files: ShareIntentFile[]) => {
    setShareBusy(true);
    setShareError(null);
    setShareInfo(null);

    try {
      for (const file of files) {
        await trackeepApi.files.uploadFromUri(instanceUrl, token, {
          uri: file.path,
          name: file.fileName,
          mimeType: file.mimeType,
          description: 'Shared from mobile',
        });
      }

      setShareInfo(
        files.length === 1
          ? `Uploaded \"${files[0].fileName}\" to Trackeep Files.`
          : `Uploaded ${files.length} shared files to Trackeep Files.`,
      );
      clearIncomingShare();
      navigateTo('/app/files');
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'Failed to upload shared files.');
    } finally {
      setShareBusy(false);
    }
  };

  const submitManualShare = async () => {
    const draft: ShareDraft = {
      title: manualTitle.trim(),
      url: manualUrl.trim(),
      description: manualDescription.trim(),
      source: 'manual',
    };

    if (!draft.title || !draft.url) {
      setShareError('Title and URL are required for quick share.');
      return;
    }

    try {
      new URL(draft.url);
    } catch {
      setShareError('Quick share URL must be a valid absolute URL.');
      return;
    }

    await saveBookmark(draft, looksLikeYouTube(draft.url) ? '/app/youtube' : '/app/bookmarks');
    setManualTitle('');
    setManualUrl('');
    setManualDescription('');
    setShowManualShare(false);
  };

  const onWebMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const raw = event.nativeEvent.data;
      if (!raw) {
        return;
      }

      try {
        const message = JSON.parse(raw) as BridgeMessage;

        if (message.type === 'NAV_CHANGE') {
          const path = typeof message.payload?.path === 'string' ? message.payload.path : null;
          if (path) {
            setCurrentPath(path);
          }
          return;
        }

        if (message.type === 'AUTH_LOGOUT') {
          void onLogout();
          return;
        }
      } catch {
        // Ignore malformed bridge messages.
      }
    },
    [onLogout],
  );

  const onShouldStartLoadWithRequest = useCallback(
    (request: { url: string }) => {
      if (isInternalUrl(request.url, instanceUrl)) {
        return true;
      }

      void Linking.openURL(request.url);
      return false;
    },
    [instanceUrl],
  );

  const onNavigationStateChange = useCallback((state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
    setCanGoForward(state.canGoForward);
    setCurrentPath(pathFromUrl(state.url));
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.instanceText}>Connected: {instanceLabel}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routePills}>
          {ROUTES.map((route) => {
            const active = currentPath.startsWith(route.path);
            return (
              <Pressable
                key={route.path}
                style={[styles.routePill, active ? styles.routePillActive : undefined]}
                onPress={() => navigateTo(route.path)}
              >
                <Text style={[styles.routePillText, active ? styles.routePillTextActive : undefined]}>{route.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.topButtons}>
          <Pressable style={styles.topButton} onPress={() => setShowManualShare((prev) => !prev)}>
            <Text style={styles.topButtonText}>Quick Share</Text>
          </Pressable>
          <Pressable style={styles.topButton} onPress={refreshWebView}>
            <Text style={styles.topButtonText}>Reload</Text>
          </Pressable>
          <Pressable style={styles.topButton} onPress={() => void openCurrentInBrowser()}>
            <Text style={styles.topButtonText}>Browser</Text>
          </Pressable>
          <Pressable style={[styles.topButton, styles.topButtonDanger]} onPress={() => void onLogout()}>
            <Text style={[styles.topButtonText, styles.topButtonDangerText]}>Logout</Text>
          </Pressable>
        </View>
      </View>

      {showManualShare ? (
        <View style={styles.sharePanel}>
          <Text style={styles.sharePanelTitle}>Quick Share To Trackeep</Text>
          <TextInput
            placeholder="Title"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={manualTitle}
            onChangeText={setManualTitle}
          />
          <TextInput
            placeholder="https://example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={manualUrl}
            onChangeText={setManualUrl}
          />
          <TextInput
            placeholder="Description (optional)"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.textarea]}
            value={manualDescription}
            onChangeText={setManualDescription}
            multiline
          />
          {looksLikeYouTube(manualUrl.trim()) ? (
            <Text style={styles.infoTextInline}>YouTube link detected. It will be saved and opened in YouTube section.</Text>
          ) : null}
          <View style={styles.shareActions}>
            <Pressable style={styles.secondaryButton} onPress={() => setShowManualShare(false)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={() => void submitManualShare()} disabled={shareBusy}>
              <Text style={styles.primaryButtonText}>{shareBusy ? 'Saving...' : 'Save Bookmark'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {incomingDraft ? (
        <View style={styles.sharePanel}>
          <Text style={styles.sharePanelTitle}>Incoming Shared Link</Text>
          <Text style={styles.shareLine}>Title: {incomingDraft.title}</Text>
          <Text style={styles.shareLine}>URL: {incomingDraft.url}</Text>
          {incomingDraft.description ? <Text style={styles.shareLine}>Text: {incomingDraft.description}</Text> : null}
          {draftMetadataLoading ? <Text style={styles.infoTextInline}>Fetching page metadata...</Text> : null}
          <View style={styles.shareActions}>
            <Pressable style={styles.secondaryButton} onPress={clearIncomingShare} disabled={shareBusy}>
              <Text style={styles.secondaryButtonText}>Dismiss</Text>
            </Pressable>
            {incomingIsYouTube ? (
              <Pressable
                style={styles.primaryButton}
                onPress={() => void saveBookmark(incomingDraft, '/app/youtube')}
                disabled={shareBusy}
              >
                <Text style={styles.primaryButtonText}>{shareBusy ? 'Saving...' : 'Save + Open YouTube'}</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.primaryButton, incomingIsYouTube ? styles.primaryButtonAlt : undefined]}
              onPress={() => void saveBookmark(incomingDraft)}
              disabled={shareBusy}
            >
              <Text style={styles.primaryButtonText}>{shareBusy ? 'Saving...' : 'Save To Bookmarks'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {incomingFiles.length > 0 ? (
        <View style={styles.sharePanel}>
          <Text style={styles.sharePanelTitle}>Incoming Shared Files ({incomingFiles.length})</Text>
          {incomingFiles.slice(0, 3).map((file) => (
            <Text key={`${file.path}-${file.fileName}`} style={styles.shareLine}>
              • {file.fileName}
            </Text>
          ))}
          {incomingFiles.length > 3 ? <Text style={styles.shareLine}>...and {incomingFiles.length - 3} more</Text> : null}
          <View style={styles.shareActions}>
            <Pressable style={styles.secondaryButton} onPress={clearIncomingShare} disabled={shareBusy}>
              <Text style={styles.secondaryButtonText}>Dismiss</Text>
            </Pressable>
            <Pressable
              style={styles.primaryButton}
              onPress={() => void uploadIncomingFiles(incomingFiles)}
              disabled={shareBusy}
            >
              <Text style={styles.primaryButtonText}>{shareBusy ? 'Uploading...' : 'Upload To Files'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {shareError ? <Text style={styles.errorText}>{shareError}</Text> : null}
      {shareInfo ? <Text style={styles.infoText}>{shareInfo}</Text> : null}
      {webError ? <Text style={styles.errorText}>Web app failed to load: {webError}</Text> : null}

      <View style={styles.webContainer}>
        <WebView
          ref={webRef}
          source={{ uri: appUrl }}
          injectedJavaScriptBeforeContentLoaded={injectedBeforeLoad}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled
          setSupportMultipleWindows={false}
          onMessage={onWebMessage}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onLoadStart={() => {
            setWebLoading(true);
            setWebError(null);
          }}
          onLoadEnd={() => setWebLoading(false)}
          onError={(event) => {
            setWebLoading(false);
            setWebError(event.nativeEvent.description || 'Unknown network error');
          }}
          onNavigationStateChange={onNavigationStateChange}
        />
        {webLoading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}
      </View>

      <View style={styles.navBar}>
        <Pressable
          style={[styles.navButton, !canGoBack ? styles.navButtonDisabled : undefined]}
          onPress={() => webRef.current?.goBack()}
          disabled={!canGoBack}
        >
          <Text style={styles.navButtonText}>Back</Text>
        </Pressable>
        <Pressable
          style={[styles.navButton, !canGoForward ? styles.navButtonDisabled : undefined]}
          onPress={() => webRef.current?.goForward()}
          disabled={!canGoForward}
        >
          <Text style={styles.navButtonText}>Forward</Text>
        </Pressable>
        <Pressable style={styles.navButton} onPress={refreshWebView}>
          <Text style={styles.navButtonText}>Refresh</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    borderBottomWidth: 1,
    borderColor: '#D8E1EC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  instanceText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  routePills: {
    gap: 8,
    paddingRight: 8,
  },
  routePill: {
    borderWidth: 1,
    borderColor: '#D6DEE8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  routePillActive: {
    backgroundColor: '#E6F6FB',
    borderColor: '#8adcf2',
  },
  routePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  routePillTextActive: {
    color: colors.primaryDark,
  },
  topButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  topButton: {
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  topButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  topButtonDanger: {
    backgroundColor: '#FEE2E2',
  },
  topButtonDangerText: {
    color: '#991B1B',
  },
  sharePanel: {
    marginHorizontal: 12,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6DEE8',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  sharePanelTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  shareLine: {
    color: colors.muted,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D6DEE8',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  shareActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#D6DEE8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
  primaryButton: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.primary,
  },
  primaryButtonAlt: {
    backgroundColor: colors.primaryDark,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  infoText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  infoTextInline: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
  },
  webContainer: {
    flex: 1,
    marginTop: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#D8E1EC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  navButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6DEE8',
    backgroundColor: '#F8FAFC',
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.45,
  },
  navButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
});
