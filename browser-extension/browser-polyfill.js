/* global chrome, browser */

// Browser compatibility polyfill
if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
  browser = chrome;
}

// Export the browser object for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = browser;
}
