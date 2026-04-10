/* global chrome, browser */

if (typeof browser === "undefined" && typeof chrome !== "undefined") {
  browser = chrome;
}

const PROMPT_HOST_ID = "__trackeepYoutubePromptHost";
let lastNotifiedVideoId = "";
let lastUrl = "";

function parseYouTubeVideo(url, title) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (_) {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname || "";
  let videoId = "";

  if (host === "youtu.be") {
    videoId = path.slice(1).split("/")[0];
  } else if (path.startsWith("/watch")) {
    videoId = parsed.searchParams.get("v") || "";
  } else if (path.startsWith("/shorts/")) {
    videoId = path.split("/")[2] || "";
  } else if (path.startsWith("/embed/")) {
    videoId = path.split("/")[2] || "";
  }

  if (!videoId) {
    return null;
  }

  const cleanedTitle = (title || "").replace(/\s*-\s*YouTube$/i, "").trim();

  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: cleanedTitle || "YouTube video",
  };
}

function sendMessage(message, callback) {
  try {
    browser.runtime.sendMessage(message, callback);
  } catch (_) {
    if (typeof callback === "function") {
      callback(undefined);
    }
  }
}

function closePrompt() {
  const existing = document.getElementById(PROMPT_HOST_ID);
  if (existing) {
    existing.remove();
  }
}

function renderPrompt(video) {
  closePrompt();

  const host = document.createElement("div");
  host.id = PROMPT_HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });

  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
      }
      .card {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 320px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: linear-gradient(180deg, rgba(17, 20, 31, 0.96) 0%, rgba(9, 11, 18, 0.98) 100%);
        color: #e9edf8;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.38);
        padding: 14px;
        font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
        backdrop-filter: blur(18px);
        z-index: 2147483647;
        transform: translateY(-10px);
        opacity: 0;
        animation: trackeep-slide-in 180ms ease-out forwards;
      }
      @keyframes trackeep-slide-in {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.05);
        border-radius: 999px;
        padding: 4px 9px;
        font-size: 11px;
        line-height: 1;
        color: #b5c0db;
      }
      h3 {
        margin: 10px 0 6px;
        font-size: 14px;
        line-height: 1.35;
        color: #f8faff;
      }
      p {
        margin: 0;
        font-size: 12px;
        line-height: 1.45;
        color: #b5c0db;
      }
      .actions {
        margin-top: 12px;
        display: flex;
        gap: 8px;
      }
      button {
        border: 0;
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .primary {
        background: linear-gradient(135deg, #4d7dff 0%, #3859f8 100%);
        color: #ffffff;
        flex: 1;
      }
      .secondary {
        background: rgba(255, 255, 255, 0.08);
        color: #e9edf8;
      }
      .ghost {
        background: transparent;
        color: #9fa9c8;
      }
      .status {
        margin-top: 10px;
        min-height: 17px;
        font-size: 12px;
      }
      .status.error {
        color: #ff8e8e;
      }
      .status.ok {
        color: #73e2b8;
      }
      .truncate {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    </style>
    <div class="card">
      <span class="tag">Trackeep · YouTube</span>
      <h3>Save this video to your Trackeep?</h3>
      <p class="truncate" title="${escapeHtml(video.title)}">${escapeHtml(video.title)}</p>
      <div class="actions">
        <button class="primary" id="saveNow">Save now</button>
        <button class="secondary" id="openSaver">Open saver</button>
        <button class="ghost" id="later">Later</button>
      </div>
      <div class="status" id="status"></div>
    </div>
  `;

  document.documentElement.appendChild(host);

  const saveBtn = shadow.getElementById("saveNow");
  const openBtn = shadow.getElementById("openSaver");
  const laterBtn = shadow.getElementById("later");
  const statusEl = shadow.getElementById("status");

  const setStatus = (message, type) => {
    statusEl.textContent = message || "";
    statusEl.className = `status${type ? ` ${type}` : ""}`;
  };

  saveBtn.addEventListener("click", () => {
    saveBtn.disabled = true;
    openBtn.disabled = true;
    laterBtn.disabled = true;
    setStatus("Saving to Trackeep...", "");

    sendMessage({ type: "trackeep:youtube-save-request", video }, (response) => {
      if (browser.runtime && browser.runtime.lastError) {
        setStatus("Could not reach extension background worker.", "error");
      } else if (response && response.ok) {
        setStatus("Saved successfully.", "ok");
        setTimeout(closePrompt, 1200);
      } else {
        setStatus(
          response && response.error
            ? response.error
            : "Save failed. Open saver to review.",
          "error"
        );
        saveBtn.disabled = false;
        openBtn.disabled = false;
        laterBtn.disabled = false;
      }
    });
  });

  openBtn.addEventListener("click", () => {
    sendMessage({ type: "trackeep:youtube-open-saver", video }, () => {
      closePrompt();
    });
  });

  laterBtn.addEventListener("click", () => {
    sendMessage({ type: "trackeep:youtube-dismissed", videoId: video.videoId }, () => {
      closePrompt();
    });
  });

  window.setTimeout(() => {
    closePrompt();
  }, 18000);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function detectAndNotify(force) {
  const video = parseYouTubeVideo(window.location.href, document.title);
  if (!video) {
    closePrompt();
    return;
  }

  if (!force && video.videoId === lastNotifiedVideoId && window.location.href === lastUrl) {
    return;
  }

  lastNotifiedVideoId = video.videoId;
  lastUrl = window.location.href;

  sendMessage({ type: "trackeep:youtube-video-detected", video }, (response) => {
    if (browser.runtime && browser.runtime.lastError) {
      return;
    }
    if (response && response.showPrompt) {
      renderPrompt(video);
    } else {
      closePrompt();
    }
  });
}

function initDetection() {
  let previousHref = window.location.href;

  const check = () => {
    if (window.location.href !== previousHref) {
      previousHref = window.location.href;
      detectAndNotify(true);
    }
  };

  window.addEventListener("yt-navigate-finish", () => detectAndNotify(true), true);
  window.addEventListener("popstate", () => detectAndNotify(true), true);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      detectAndNotify(false);
    }
  });

  const observer = new MutationObserver(check);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.setInterval(check, 1200);
  detectAndNotify(true);
}

initDetection();
