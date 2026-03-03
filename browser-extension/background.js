/* global chrome, browser */

// Browser compatibility polyfill
if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
  browser = chrome;
}

// Handle keyboard commands
browser.commands.onCommand.addListener((command) => {
  if (command === 'quick-save') {
    // Get current tab and trigger quick save
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (tab) {
        browser.storage.local.set({
          contextMenuData: {
            url: tab.url,
            title: tab.title,
            selection: '',
            timestamp: Date.now(),
            isQuickSave: true
          }
        }, () => {
          browser.action.openPopup();
        });
      }
    });
  }
});

// Handle first-time install
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set up first-time install flag
    browser.storage.sync.set({ 
      isFirstInstall: true,
      installDate: new Date().toISOString()
    }, () => {
      // Open options page for first-time setup
      browser.runtime.openOptionsPage();
    });
  }
  
  // Create context menus
  browser.contextMenus.create({
    id: 'save-to-trackeep',
    title: 'Save to Trackeep',
    contexts: ['page', 'link', 'selection', 'image', 'video']
  });
  
  // Quick save menu
  browser.contextMenus.create({
    id: 'quick-save-to-trackeep',
    title: 'Quick Save to Trackeep',
    contexts: ['page']
  });
});

// Handle context menu click
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-trackeep' && info.menuItemId !== 'quick-save-to-trackeep') return;

  // Detect content type and get smart data
  const smartData = await detectContentType(info, tab);
  
  // Open popup with pre-filled data based on context
  const url = info.linkUrl || info.srcUrl || tab?.url || '';
  const title = tab?.title || '';
  const selection = info.selectionText || '';

  // Store temporary data for popup to read
  browser.storage.local.set({
    contextMenuData: {
      url,
      title,
      selection,
      timestamp: Date.now(),
      isQuickSave: info.menuItemId === 'quick-save-to-trackeep',
      smartData
    }
  }, () => {
    // Open popup (or focus it if already open)
    browser.action.openPopup();
  });
});

// Smart content detection
async function detectContentType(info, tab) {
  const url = info.linkUrl || info.srcUrl || tab?.url || '';
  const title = tab?.title || '';
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // Video detection
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      return {
        type: 'video',
        platform: 'youtube',
        suggestedTags: ['video', 'youtube', 'educational'],
        autoTitle: extractYouTubeTitle(url) || title
      };
    }
    
    if (url.includes('vimeo.com') || url.includes('dailymotion.com')) {
      return {
        type: 'video',
        platform: domain.replace('.com', ''),
        suggestedTags: ['video', domain.replace('.com', '')]
      };
    }
    
    // Social media detection
    if (domain.includes('twitter.com') || domain.includes('x.com')) {
      return {
        type: 'social',
        platform: 'twitter',
        suggestedTags: ['social', 'twitter', 'tweet']
      };
    }
    
    if (domain.includes('linkedin.com')) {
      return {
        type: 'social',
        platform: 'linkedin',
        suggestedTags: ['social', 'linkedin', 'professional']
      };
    }
    
    if (domain.includes('reddit.com')) {
      return {
        type: 'social',
        platform: 'reddit',
        suggestedTags: ['social', 'reddit', 'discussion']
      };
    }
    
    // Development platforms
    if (domain.includes('github.com')) {
      return {
        type: 'code',
        platform: 'github',
        suggestedTags: ['code', 'github', 'development', 'repository']
      };
    }
    
    if (domain.includes('stackoverflow.com')) {
      return {
        type: 'code',
        platform: 'stackoverflow',
        suggestedTags: ['code', 'stackoverflow', 'programming', 'qa']
      };
    }
    
    if (domain.includes('medium.com')) {
      return {
        type: 'article',
        platform: 'medium',
        suggestedTags: ['article', 'blog', 'medium']
      };
    }
    
    // Documentation
    if (domain.includes('docs.') || domain.includes('documentation')) {
      return {
        type: 'documentation',
        suggestedTags: ['documentation', 'docs', 'reference']
      };
    }
    
    // News sites
    if (domain.includes('news.') || domain.includes('cnn.com') || domain.includes('bbc.com') || 
        domain.includes('reuters.com') || domain.includes('washingtonpost.com')) {
      return {
        type: 'news',
        suggestedTags: ['news', 'article', 'current-events']
      };
    }
    
    // E-commerce
    if (domain.includes('amazon.com') || domain.includes('ebay.com') || 
        domain.includes('shopify.com') || domain.includes('etsy.com')) {
      return {
        type: 'shopping',
        suggestedTags: ['shopping', 'product', 'ecommerce']
      };
    }
    
    // Default detection
    return {
      type: 'general',
      suggestedTags: ['bookmark', 'webpage']
    };
    
  } catch (e) {
    return {
      type: 'general',
      suggestedTags: ['bookmark', 'webpage']
    };
  }
}

// Extract YouTube video title
function extractYouTubeTitle(url) {
  try {
    const urlObj = new URL(url);
    const videoId = urlObj.searchParams.get('v');
    if (videoId) {
      // In a real implementation, you might fetch YouTube API
      // For now, return null and let the page title be used
      return null;
    }
  } catch (e) {
    return null;
  }
}
