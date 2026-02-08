// Simple YouTube page test
console.log('🎬 YouTube Page Test');

// Check demo mode
const isDemoMode = localStorage.getItem('demoMode') === 'true';
console.log('Demo mode:', isDemoMode);

if (!isDemoMode) {
  localStorage.setItem('demoMode', 'true');
  console.log('Set demo mode, please refresh the page');
} else {
  console.log('✅ Demo mode active');
  
  // Test search
  setTimeout(() => {
    const searchInput = document.querySelector('input[placeholder*="Search"]');
    if (searchInput) {
      searchInput.value = 'SolidJS';
      searchInput.dispatchEvent(new Event('input'));
      
      setTimeout(() => {
        const searchBtn = document.querySelector('button:has-text("Search")');
        if (searchBtn) {
          searchBtn.click();
          console.log('✅ Search triggered');
        }
      }, 500);
    }
  }, 1000);
}
