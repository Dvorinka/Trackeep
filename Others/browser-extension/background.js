/* global chrome */

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-trackeep',
    title: 'Save to Trackeep',
    contexts: ['page', 'link', 'selection', 'image', 'video']
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-trackeep') return;

  // Open popup with pre-filled data based on context
  const url = info.linkUrl || info.srcUrl || tab?.url || '';
  const title = tab?.title || '';
  const selection = info.selectionText || '';

  // Store temporary data for popup to read
  chrome.storage.local.set({
    contextMenuData: {
      url,
      title,
      selection,
      timestamp: Date.now()
    }
  }, () => {
    // Open the popup (or focus it if already open)
    chrome.action.openPopup();
  });
});
