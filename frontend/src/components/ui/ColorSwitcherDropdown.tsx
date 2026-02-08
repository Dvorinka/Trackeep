import { createSignal, onMount } from 'solid-js';
import { IconPalette, IconCheck, IconChevronDown } from '@tabler/icons-solidjs';

interface ColorScheme {
  name: string;
  primary: string;
}

export const ColorSwitcherDropdown = () => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [currentScheme, setCurrentScheme] = createSignal('default');
  const [schemes, setSchemes] = createSignal<ColorScheme[]>([]);

  onMount(() => {
    // Load saved color scheme from localStorage
    const savedScheme = localStorage.getItem('trackeep-color-scheme');
    if (savedScheme) {
      setCurrentScheme(savedScheme);
    }
    
    // Predefined color schemes - only changing primary color (removed monochrome)
    setSchemes([
      { name: 'default', primary: '#5ab9ff' },
      { name: 'ocean', primary: '#0077be' },
      { name: 'forest', primary: '#228b22' },
      { name: 'sunset', primary: '#ff6b35' },
      { name: 'purple', primary: '#8b5cf6' }
    ]);
    
    // Apply saved scheme on mount
    if (savedScheme) {
      const scheme = schemes().find(s => s.name === savedScheme);
      if (scheme) {
        applyScheme(scheme, false); // false = don't close dropdown
      }
    }
  });

  const applyScheme = (scheme: ColorScheme, closeDropdown = true) => {
    setCurrentScheme(scheme.name);
    
    // Save to localStorage for persistence
    localStorage.setItem('trackeep-color-scheme', scheme.name);
    
    // Apply only primary color to CSS variables
    const root = document.documentElement;
    
    // Convert hex to HSL for CSS variables
    const hexToHsl = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return '0 0% 100%';
      
      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    
    // Apply only the primary color
    root.style.setProperty('--primary', hexToHsl(scheme.primary));
    root.style.setProperty('--colors-primary', hexToHsl(scheme.primary));
    
    if (closeDropdown) {
      setIsOpen(false);
    }
  };

  return (
    <div class="relative">
      <button
        onClick={() => setIsOpen(!isOpen())}
        class="items-center justify-center rounded-md font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 py-1 text-base flex gap-1"
      >
        <IconPalette class="size-4" />
        <IconChevronDown class="text-muted-foreground text-sm" />
      </button>

      {isOpen() && (
        <>
          {/* Backdrop */}
          <div 
            class="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div class="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-md shadow-lg z-50">
            <div class="p-2">
              {schemes().map((scheme) => (
                <button
                  onClick={() => applyScheme(scheme)}
                  class={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${
                    currentScheme() === scheme.name ? 'bg-accent/50' : ''
                  }`}
                >
                  <div
                    class="w-4 h-4 rounded border border-border"
                    style={`background-color: ${scheme.primary}`}
                  />
                  <span class="capitalize">{scheme.name}</span>
                  {currentScheme() === scheme.name && (
                    <IconCheck class="size-4 text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
