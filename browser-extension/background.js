/* global chrome, browser */

if (typeof browser === "undefined" && typeof chrome !== "undefined") {
  browser = chrome;
}

const YOUTUBE_PROMPT_HISTORY_KEY = "trackeepYoutubePromptHistory";
const YOUTUBE_AUTO_PROMPT_KEY = "youtubeAutoPrompt";
const YOUTUBE_DISMISS_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const YOUTUBE_PROMPT_COOLDOWN_MS = 30 * 60 * 1000;
const YOUTUBE_HISTORY_LIMIT = 400;

function storageSyncGet(keys) {
  return new Promise((resolve) => {
    browser.storage.sync.get(keys, (items) => resolve(items || {}));
  });
}

function storageLocalGet(keys) {
  return new Promise((resolve) => {
    browser.storage.local.get(keys, (items) => resolve(items || {}));
  });
}

function storageLocalSet(values) {
  return new Promise((resolve) => {
    browser.storage.local.set(values, () => resolve());
  });
}

function parseResponseError(status, body) {
  if (!body) {
    return `Request failed with status ${status}.`;
  }

  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch (_) {
    // Keep raw body fallback.
  }

  const trimmed = String(body).trim();
  if (!trimmed) {
    return `Request failed with status ${status}.`;
  }

  return trimmed.slice(0, 180);
}

function parseYouTubeVideoMeta(rawUrl, rawTitle) {
  if (!rawUrl) {
    return null;
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch (_) {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const path = url.pathname || "";
  let videoId = "";

  if (host === "youtu.be") {
    videoId = path.slice(1).split("/")[0];
  } else if (path.startsWith("/watch")) {
    videoId = url.searchParams.get("v") || "";
  } else if (path.startsWith("/shorts/")) {
    videoId = path.split("/")[2] || "";
  } else if (path.startsWith("/embed/")) {
    videoId = path.split("/")[2] || "";
  }

  if (!videoId) {
    return null;
  }

  const title = (rawTitle || "").replace(/\s*-\s*YouTube$/i, "").trim();
  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: title || "YouTube video",
  };
}

function cleanupHistory(history) {
  const entries = Object.entries(history || {});
  if (entries.length <= YOUTUBE_HISTORY_LIMIT) {
    return history || {};
  }

  entries.sort((a, b) => {
    const aData = a[1] || {};
    const bData = b[1] || {};
    const aStamp = Math.max(aData.savedAt || 0, aData.dismissedAt || 0, aData.promptedAt || 0);
    const bStamp = Math.max(bData.savedAt || 0, bData.dismissedAt || 0, bData.promptedAt || 0);
    return bStamp - aStamp;
  });

  const compact = {};
  for (const [videoId, value] of entries.slice(0, YOUTUBE_HISTORY_LIMIT)) {
    compact[videoId] = value;
  }
  return compact;
}

async function getYouTubeHistory() {
  const data = await storageLocalGet([YOUTUBE_PROMPT_HISTORY_KEY]);
  return data[YOUTUBE_PROMPT_HISTORY_KEY] || {};
}

async function updateYouTubeHistory(videoId, patch) {
  if (!videoId) {
    return;
  }

  const history = await getYouTubeHistory();
  const current = history[videoId] || {};
  history[videoId] = { ...current, ...patch };
  const compact = cleanupHistory(history);
  await storageLocalSet({ [YOUTUBE_PROMPT_HISTORY_KEY]: compact });
}

async function getTrackeepConfig() {
  const items = await storageSyncGet([
    "trackeepApiBaseUrl",
    "trackeepApiKey",
    "trackeepAuthToken",
    YOUTUBE_AUTO_PROMPT_KEY,
  ]);

  const apiBaseUrl = String(items.trackeepApiBaseUrl || "").trim().replace(/\/+$/, "");
  const authToken = String(items.trackeepApiKey || items.trackeepAuthToken || "").trim();
  const youtubeAutoPrompt =
    typeof items[YOUTUBE_AUTO_PROMPT_KEY] === "boolean"
      ? items[YOUTUBE_AUTO_PROMPT_KEY]
      : true;

  return {
    apiBaseUrl,
    authToken,
    youtubeAutoPrompt,
  };
}

async function shouldPromptForYouTubeVideo(video) {
  if (!video || !video.videoId || !video.url) {
    return { showPrompt: false, reason: "invalid-video" };
  }

  const config = await getTrackeepConfig();
  if (!config.youtubeAutoPrompt) {
    return { showPrompt: false, reason: "disabled" };
  }

  if (!config.apiBaseUrl || !config.authToken) {
    return { showPrompt: false, reason: "missing-config" };
  }

  const history = await getYouTubeHistory();
  const entry = history[video.videoId] || {};
  const now = Date.now();

  if (entry.savedAt) {
    return { showPrompt: false, reason: "already-saved" };
  }

  if (entry.dismissedAt && now - entry.dismissedAt < YOUTUBE_DISMISS_COOLDOWN_MS) {
    return { showPrompt: false, reason: "dismissed-recently" };
  }

  if (entry.promptedAt && now - entry.promptedAt < YOUTUBE_PROMPT_COOLDOWN_MS) {
    return { showPrompt: false, reason: "prompted-recently" };
  }

  await updateYouTubeHistory(video.videoId, {
    promptedAt: now,
    title: video.title,
    url: video.url,
  });

  return { showPrompt: true };
}

async function saveYouTubeBookmark(video) {
  if (!video || !video.videoId || !video.url) {
    return { ok: false, error: "Invalid YouTube video metadata." };
  }

  const config = await getTrackeepConfig();
  if (!config.apiBaseUrl || !config.authToken) {
    return {
      ok: false,
      error: "Trackeep API URL or token missing. Open extension options first.",
    };
  }

  const title = (video.title || "YouTube video").trim();
  const payload = {
    title,
    url: video.url,
    description: "Saved from YouTube via Trackeep browser extension",
    tags: ["youtube", "video"],
    is_public: false,
  };

  let response;
  try {
    response = await fetch(`${config.apiBaseUrl}/bookmarks`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return {
      ok: false,
      error: `Could not connect to Trackeep: ${error && error.message ? error.message : "network error"}`,
    };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      ok: false,
      error: parseResponseError(response.status, body),
    };
  }

  await updateYouTubeHistory(video.videoId, {
    savedAt: Date.now(),
    title: title,
    url: video.url,
  });

  return { ok: true };
}

async function openPopupWithContext(data) {
  await storageLocalSet({ contextMenuData: data });
  try {
    const maybePromise = browser.action.openPopup();
    if (maybePromise && typeof maybePromise.then === "function") {
      await maybePromise;
    }
    return { ok: true };
  } catch (_) {
    return { ok: false, error: "Cannot open popup automatically in this browser context." };
  }
}

function setContextAndOpenPopup(tab, selection, isQuickSave, smartData) {
  const payload = {
    url: tab?.url || "",
    title: tab?.title || "",
    selection: selection || "",
    timestamp: Date.now(),
    isQuickSave: !!isQuickSave,
    smartData: smartData || null,
  };

  return openPopupWithContext(payload);
}

browser.commands.onCommand.addListener((command) => {
  if (command !== "quick-save") {
    return;
  }

  browser.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab) {
      return;
    }

    const info = { linkUrl: tab.url, srcUrl: tab.url };
    const smartData = await detectContentType(info, tab);
    await setContextAndOpenPopup(tab, "", true, smartData);
  });
});

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    browser.storage.sync.set(
      {
        isFirstInstall: true,
        installDate: new Date().toISOString(),
        [YOUTUBE_AUTO_PROMPT_KEY]: true,
      },
      () => {
        browser.runtime.openOptionsPage();
      }
    );
  }

  browser.contextMenus.create({
    id: "save-to-trackeep",
    title: "Save to Trackeep",
    contexts: ["page", "link", "selection", "image", "video"],
  });

  browser.contextMenus.create({
    id: "quick-save-to-trackeep",
    title: "Quick Save to Trackeep",
    contexts: ["page"],
  });
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "save-to-trackeep" && info.menuItemId !== "quick-save-to-trackeep") {
    return;
  }

  const smartData = await detectContentType(info, tab);
  const url = info.linkUrl || info.srcUrl || tab?.url || "";
  const title = tab?.title || "";
  const selection = info.selectionText || "";

  await openPopupWithContext({
    url,
    title,
    selection,
    timestamp: Date.now(),
    isQuickSave: info.menuItemId === "quick-save-to-trackeep",
    smartData,
  });
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return undefined;
  }

  (async () => {
    if (message.type === "trackeep:youtube-video-detected") {
      return shouldPromptForYouTubeVideo(message.video);
    }

    if (message.type === "trackeep:youtube-dismissed") {
      if (message.videoId) {
        await updateYouTubeHistory(message.videoId, { dismissedAt: Date.now() });
      }
      return { ok: true };
    }

    if (message.type === "trackeep:youtube-save-request") {
      return saveYouTubeBookmark(message.video);
    }

    if (message.type === "trackeep:youtube-open-saver") {
      const tab = sender && sender.tab ? sender.tab : null;
      const video = parseYouTubeVideoMeta(message.video && message.video.url, message.video && message.video.title);
      if (!tab || !video) {
        return { ok: false, error: "Could not open saver for this video." };
      }

      const smartData = {
        type: "video",
        platform: "youtube",
        suggestedTags: ["youtube", "video"],
      };

      return openPopupWithContext({
        url: video.url,
        title: video.title,
        selection: "",
        timestamp: Date.now(),
        isQuickSave: false,
        smartData,
      });
    }

    return undefined;
  })()
    .then((result) => sendResponse(result))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error && error.message ? error.message : "Unexpected extension error.",
      });
    });

  return true;
});

async function detectContentType(info, tab) {
  const url = info.linkUrl || info.srcUrl || tab?.url || "";
  const title = tab?.title || "";

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();

    const ytMeta = parseYouTubeVideoMeta(url, title);
    if (ytMeta) {
      return {
        type: "video",
        platform: "youtube",
        suggestedTags: ["video", "youtube"],
        autoTitle: ytMeta.title,
      };
    }

    if (url.includes("vimeo.com") || url.includes("dailymotion.com")) {
      return {
        type: "video",
        platform: domain.replace(".com", ""),
        suggestedTags: ["video", domain.replace(".com", "")],
      };
    }

    if (domain.includes("twitter.com") || domain.includes("x.com")) {
      return {
        type: "social",
        platform: "twitter",
        suggestedTags: ["social", "twitter", "tweet"],
      };
    }

    if (domain.includes("linkedin.com")) {
      return {
        type: "social",
        platform: "linkedin",
        suggestedTags: ["social", "linkedin", "professional"],
      };
    }

    if (domain.includes("reddit.com")) {
      return {
        type: "social",
        platform: "reddit",
        suggestedTags: ["social", "reddit", "discussion"],
      };
    }

    if (domain.includes("github.com")) {
      return {
        type: "code",
        platform: "github",
        suggestedTags: ["code", "github", "development", "repository"],
      };
    }

    if (domain.includes("stackoverflow.com")) {
      return {
        type: "code",
        platform: "stackoverflow",
        suggestedTags: ["code", "stackoverflow", "programming", "qa"],
      };
    }

    if (domain.includes("medium.com")) {
      return {
        type: "article",
        platform: "medium",
        suggestedTags: ["article", "blog", "medium"],
      };
    }

    if (domain.includes("docs.") || domain.includes("documentation")) {
      return {
        type: "documentation",
        suggestedTags: ["documentation", "docs", "reference"],
      };
    }

    if (
      domain.includes("news.") ||
      domain.includes("cnn.com") ||
      domain.includes("bbc.com") ||
      domain.includes("reuters.com") ||
      domain.includes("washingtonpost.com")
    ) {
      return {
        type: "news",
        suggestedTags: ["news", "article", "current-events"],
      };
    }

    if (
      domain.includes("amazon.com") ||
      domain.includes("ebay.com") ||
      domain.includes("shopify.com") ||
      domain.includes("etsy.com")
    ) {
      return {
        type: "shopping",
        suggestedTags: ["shopping", "product", "ecommerce"],
      };
    }

    return {
      type: "general",
      suggestedTags: ["bookmark", "webpage"],
    };
  } catch (_) {
    return {
      type: "general",
      suggestedTags: ["bookmark", "webpage"],
    };
  }
}
