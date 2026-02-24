import { createSignal, onMount, Show } from 'solid-js';
import { IconPalette, IconCheck, IconRepeat, IconSun, IconMoon, IconDownload, IconUpload, IconEye, IconEyeOff } from '@tabler/icons-solidjs';
import { ColorPicker } from '@/components/ui/ColorPicker';

interface ColorScheme {
  name: string;
  primary: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
}

export const ColorSwitcher = () => {
  const [schemes, setSchemes] = createSignal<ColorScheme[]>([]);
  const [currentScheme, setCurrentScheme] = createSignal('default');
  const [isDarkMode, setIsDarkMode] = createSignal(false);
  const [customColors, setCustomColors] = createSignal({
    primary: '#5ab9ff',
    background: '#000000',
    foreground: '#ffffff',
    muted: '#262727',
    border: '#262626'
  });
  const [showAdvanced, setShowAdvanced] = createSignal(false);
  const [savedSchemes, setSavedSchemes] = createSignal<ColorScheme[]>([]);
  const [showPreview, setShowPreview] = createSignal(true);

  onMount(() => {
    // Check current theme
    const currentTheme = document.documentElement.getAttribute('data-kb-theme');
    setIsDarkMode(currentTheme === 'dark');
    
    // Load saved color scheme from localStorage
    const savedScheme = localStorage.getItem('colorScheme');
    const savedColors = localStorage.getItem('customColors');
    
    if (savedColors && savedScheme === 'custom') {
      try {
        const colors = JSON.parse(savedColors);
        setCustomColors(colors);
        applyCustomColors();
      } catch (e) {
        console.error('Failed to load custom colors:', e);
      }
    } else if (savedScheme) {
      setCurrentScheme(savedScheme);
    }
    
    // Predefined color schemes with more options
    setSchemes([
      {
        name: 'default',
        primary: '#5ab9ff',
        background: isDarkMode() ? '#1a1a1a' : '#ffffff',
        foreground: isDarkMode() ? '#ffffff' : '#000000',
        muted: isDarkMode() ? '#262727' : '#f5f5f5',
        border: '#262626'
      },
      {
        name: 'ocean',
        primary: '#0077be',
        background: isDarkMode() ? '#001f3f' : '#e6f3ff',
        foreground: isDarkMode() ? '#ffffff' : '#000000',
        muted: isDarkMode() ? '#003366' : '#cce7ff',
        border: '#004080'
      },
      {
        name: 'forest',
        primary: '#228b22',
        background: isDarkMode() ? '#0d2818' : '#f0f8f0',
        foreground: isDarkMode() ? '#ffffff' : '#000000',
        muted: isDarkMode() ? '#1a431a' : '#d4edd4',
        border: '#2d5a2d'
      },
      {
        name: 'sunset',
        primary: '#ff6b35',
        background: isDarkMode() ? '#2c1810' : '#fff5f0',
        foreground: isDarkMode() ? '#ffffff' : '#000000',
        muted: isDarkMode() ? '#5c2e00' : '#ffe4d6',
        border: '#8b4513'
      },
      {
        name: 'purple',
        primary: '#8b5cf6',
        background: isDarkMode() ? '#1a0033' : '#f8f5ff',
        foreground: isDarkMode() ? '#ffffff' : '#000000',
        muted: isDarkMode() ? '#330066' : '#ede9fe',
        border: '#4d0099'
      },
      {
        name: 'rose',
        primary: '#f43f5e',
        background: isDarkMode() ? '#2d1111' : '#fff1f2',
        foreground: isDarkMode() ? '#ffffff' : '#000000',
        muted: isDarkMode() ? '#5a1a1a' : '#ffe4e6',
        border: '#881337'
      },
      {
        name: 'amber',
        primary: '#f59e0b',
        background: isDarkMode() ? '#2d1a00' : '#fffbeb',
        foreground: isDarkMode() ? '#ffffff' : '#000000',
        muted: isDarkMode() ? '#5c4a00' : '#fef3c7',
        border: '#78350f'
      },
      {
        name: 'emerald',
        primary: '#10b981',
        background: isDarkMode() ? '#022c22' : '#ecfdf5',
        foreground: isDarkMode() ? '#ffffff' : '#000000',
        muted: isDarkMode() ? '#064e3b' : '#d1fae5',
        border: '#047857'
      },
      {
        name: 'cyan',
        primary: '#06b6d4',
        background: isDarkMode() ? '#022c3a' : '#ecfeff',
        foreground: isDarkMode() ? '#ffffff' : '#000000',
        muted: isDarkMode() ? '#164e63' : '#cffafe',
        border: '#0891b2'
      },
      {
        name: 'indigo',
        primary: '#6366f1',
        background: isDarkMode() ? '#1e1b4b' : '#eef2ff',
        foreground: isDarkMode() ? '#ffffff' : '#000000',
        muted: isDarkMode() ? '#312e81' : '#e0e7ff',
        border: '#4338ca'
      }
    ]);
  });

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode();
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.setAttribute('data-kb-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-kb-theme');
      localStorage.setItem('theme', 'light');
    }
    
    // Update schemes with new theme
    updateSchemesForTheme(newDarkMode);
  };

  const updateSchemesForTheme = (dark: boolean) => {
    setSchemes([
      {
        name: 'default',
        primary: '#5ab9ff',
        background: dark ? '#1a1a1a' : '#ffffff',
        foreground: dark ? '#ffffff' : '#000000',
        muted: dark ? '#262727' : '#f5f5f5',
        border: '#262626'
      },
      {
        name: 'ocean',
        primary: '#0077be',
        background: dark ? '#001f3f' : '#e6f3ff',
        foreground: dark ? '#ffffff' : '#000000',
        muted: dark ? '#003366' : '#cce7ff',
        border: '#004080'
      },
      {
        name: 'forest',
        primary: '#228b22',
        background: dark ? '#0d2818' : '#f0f8f0',
        foreground: dark ? '#ffffff' : '#000000',
        muted: dark ? '#1a431a' : '#d4edd4',
        border: '#2d5a2d'
      },
      {
        name: 'sunset',
        primary: '#ff6b35',
        background: dark ? '#2c1810' : '#fff5f0',
        foreground: dark ? '#ffffff' : '#000000',
        muted: dark ? '#5c2e00' : '#ffe4d6',
        border: '#8b4513'
      },
      {
        name: 'purple',
        primary: '#8b5cf6',
        background: dark ? '#1a0033' : '#f8f5ff',
        foreground: dark ? '#ffffff' : '#000000',
        muted: dark ? '#330066' : '#ede9fe',
        border: '#4d0099'
      }
    ]);
  };

  const applyScheme = (scheme: ColorScheme) => {
    setCurrentScheme(scheme.name);
    setCustomColors(scheme);
    
    // Save to localStorage for persistence
    localStorage.setItem('colorScheme', scheme.name);
    localStorage.removeItem('customColors'); // Clear custom colors when applying preset
    
    // Apply colors to CSS variables with proper HSL conversion
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
    
    // Apply the colors
    root.style.setProperty('--primary', hexToHsl(scheme.primary));
    root.style.setProperty('--background', hexToHsl(scheme.background));
    root.style.setProperty('--foreground', hexToHsl(scheme.foreground));
    root.style.setProperty('--muted', hexToHsl(scheme.muted));
    root.style.setProperty('--border', scheme.border);
    
    // Also set as CSS custom properties for direct use
    root.style.setProperty('--colors-primary', hexToHsl(scheme.primary));
    root.style.setProperty('--colors-background', hexToHsl(scheme.background));
    root.style.setProperty('--colors-foreground', hexToHsl(scheme.foreground));
    root.style.setProperty('--colors-muted', hexToHsl(scheme.muted));
    root.style.setProperty('--colors-border', scheme.border);
  };

  const applyCustomColors = () => {
    const root = document.documentElement;
    const colors = customColors();
    
    // Save custom colors to localStorage
    localStorage.setItem('colorScheme', 'custom');
    localStorage.setItem('customColors', JSON.stringify(colors));
    
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
    
    // Apply the colors
    root.style.setProperty('--primary', hexToHsl(colors.primary));
    root.style.setProperty('--background', hexToHsl(colors.background));
    root.style.setProperty('--foreground', hexToHsl(colors.foreground));
    root.style.setProperty('--muted', hexToHsl(colors.muted));
    root.style.setProperty('--border', colors.border);
    
    // Also set as CSS custom properties for direct use
    root.style.setProperty('--colors-primary', hexToHsl(colors.primary));
    root.style.setProperty('--colors-background', hexToHsl(colors.background));
    root.style.setProperty('--colors-foreground', hexToHsl(colors.foreground));
    root.style.setProperty('--colors-muted', hexToHsl(colors.muted));
    root.style.setProperty('--colors-border', colors.border);
    
    setCurrentScheme('custom');
  };

  const resetColors = () => {
    const defaultScheme = schemes().find(s => s.name === 'default');
    if (defaultScheme) {
      applyScheme(defaultScheme);
    }
  };

  // Advanced functions
  const exportColorScheme = () => {
    const scheme = currentScheme() === 'custom' ? { ...customColors(), name: 'custom' } : schemes().find(s => s.name === currentScheme());
    if (scheme) {
      const data = JSON.stringify(scheme, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scheme.name}-color-scheme.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const importColorScheme = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const scheme = JSON.parse(e.target?.result as string) as ColorScheme;
          if (scheme.name && scheme.primary && scheme.background && scheme.foreground && scheme.muted && scheme.border) {
            setCustomColors(scheme);
            applyCustomColors();
          } else {
            alert('Invalid color scheme format');
          }
        } catch (error) {
          alert('Failed to import color scheme');
        }
      };
      reader.readAsText(file);
    }
  };

  const saveCustomScheme = () => {
    const schemeName = prompt('Enter a name for your custom scheme:');
    if (schemeName && customColors()) {
      const newScheme: ColorScheme = {
        name: schemeName,
        ...customColors()
      };
      const updatedSchemes = [...savedSchemes(), newScheme];
      setSavedSchemes(updatedSchemes);
      localStorage.setItem('savedSchemes', JSON.stringify(updatedSchemes));
    }
  };

  return (
    <div class="p-6 mt-4 pb-32 max-w-5xl mx-auto">
      <h1 class="text-3xl font-bold text-foreground mb-6 flex items-center gap-2">
        <IconPalette class="size-8" />
        Color Switcher
      </h1>

      <div class="space-y-6">
        {/* Dark Mode Toggle */}
        <div class="border rounded-lg p-6">
          <h2 class="text-xl font-semibold text-foreground mb-4">Theme Mode</h2>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              {isDarkMode() ? (
                <IconMoon class="size-6 text-primary" />
              ) : (
                <IconSun class="size-6 text-primary" />
              )}
              <div>
                <h3 class="font-medium text-foreground">
                  {isDarkMode() ? 'Dark Mode' : 'Light Mode'}
                </h3>
                <p class="text-sm text-muted-foreground">
                  Toggle between dark and light theme
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-2 px-4"
            >
              {isDarkMode() ? <IconSun class="size-4 text-primary-foreground" /> : <IconMoon class="size-4 text-primary-foreground" />}
              Switch to {isDarkMode() ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>

        {/* Predefined Schemes */}
        <div class="border rounded-lg p-6">
          <h2 class="text-xl font-semibold text-foreground mb-4">Color Schemes</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schemes().map((scheme) => (
              <div
                class={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  currentScheme() === scheme.name ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => applyScheme(scheme)}
              >
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-medium text-foreground capitalize">{scheme.name}</h3>
                  {currentScheme() === scheme.name && (
                    <IconCheck class="size-5 text-primary" />
                  )}
                </div>
                <div class="flex gap-1 mb-3">
                  <div
                    class="w-8 h-8 rounded border"
                    style={`background-color: ${scheme.primary}`}
                    title="Primary"
                  />
                  <div
                    class="w-8 h-8 rounded border"
                    style={`background-color: ${scheme.background}`}
                    title="Background"
                  />
                  <div
                    class="w-8 h-8 rounded border"
                    style={`background-color: ${scheme.muted}`}
                    title="Muted"
                  />
                  <div
                    class="w-8 h-8 rounded border"
                    style={`background-color: ${scheme.border}`}
                    title="Border"
                  />
                </div>
                <div class="text-xs text-muted-foreground">
                  Click to apply this scheme
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Colors */}
        <div class="border rounded-lg p-6">
          <h2 class="text-xl font-semibold text-foreground mb-4">Custom Colors</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-2">
                Primary Color
              </label>
              <ColorPicker
                value={customColors().primary}
                onChange={(color) => setCustomColors(prev => ({ ...prev, primary: color }))}
                savedColors={['#5ab9ff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6ab04c']}
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-2">
                Background Color
              </label>
              <div class="flex gap-2">
                <input
                  type="color"
                  value={customColors().background}
                  onInput={(e) => setCustomColors(prev => ({ ...prev, background: e.currentTarget.value }))}
                  class="h-10 w-16 rounded border border-input"
                />
                <input
                  type="text"
                  value={customColors().background}
                  onInput={(e) => setCustomColors(prev => ({ ...prev, background: e.currentTarget.value }))}
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-2">
                Foreground Color
              </label>
              <div class="flex gap-2">
                <input
                  type="color"
                  value={customColors().foreground}
                  onInput={(e) => setCustomColors(prev => ({ ...prev, foreground: e.currentTarget.value }))}
                  class="h-10 w-16 rounded border border-input"
                />
                <input
                  type="text"
                  value={customColors().foreground}
                  onInput={(e) => setCustomColors(prev => ({ ...prev, foreground: e.currentTarget.value }))}
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-2">
                Muted Color
              </label>
              <div class="flex gap-2">
                <input
                  type="color"
                  value={customColors().muted}
                  onInput={(e) => setCustomColors(prev => ({ ...prev, muted: e.currentTarget.value }))}
                  class="h-10 w-16 rounded border border-input"
                />
                <input
                  type="text"
                  value={customColors().muted}
                  onInput={(e) => setCustomColors(prev => ({ ...prev, muted: e.currentTarget.value }))}
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-muted-foreground mb-2">
                Border Color
              </label>
              <div class="flex gap-2">
                <input
                  type="color"
                  value={customColors().border}
                  onInput={(e) => setCustomColors(prev => ({ ...prev, border: e.currentTarget.value }))}
                  class="h-10 w-16 rounded border border-input"
                />
                <input
                  type="text"
                  value={customColors().border}
                  onInput={(e) => setCustomColors(prev => ({ ...prev, border: e.currentTarget.value }))}
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>

          <div class="flex gap-4 mt-6">
            <button
              type="button"
              onClick={applyCustomColors}
              class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-2 px-4"
            >
              <IconPalette class="size-4 text-primary-foreground" />
              Apply Custom Colors
            </button>
            <button
              type="button"
              onClick={resetColors}
              class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-auto items-center gap-2 py-2 px-4 border"
            >
              <IconRepeat class="size-4 text-foreground" />
              Reset to Default
            </button>
          </div>
        </div>

        {/* Advanced Options */}
        <div class="border rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-foreground">Advanced Options</h2>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced())}
              class="inline-flex justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-auto items-center gap-2 py-1 px-3"
            >
              {showAdvanced() ? 'Hide Advanced' : 'Show Advanced'}
            </button>
          </div>
          
          <Show when={showAdvanced()}>
            <div class="space-y-4">
              {/* Export/Import */}
              <div class="flex gap-4">
                <button
                  type="button"
                  onClick={exportColorScheme}
                  class="inline-flex justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-2 px-4"
                >
                  <IconDownload class="size-4 text-primary-foreground" />
                  Export Scheme
                </button>
                <label class="inline-flex justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-auto items-center gap-2 py-2 px-4 border cursor-pointer">
                  <IconUpload class="size-4 text-foreground" />
                  Import Scheme
                  <input
                    type="file"
                    accept=".json"
                    onChange={importColorScheme}
                    class="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveCustomScheme}
                  class="inline-flex justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-auto items-center gap-2 py-2 px-4 border"
                >
                  Save Custom Scheme
                </button>
              </div>

              {/* Preview Toggle */}
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-foreground">Show Preview Panel</span>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview())}
                  class="inline-flex justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-auto items-center gap-2 py-1 px-3"
                >
                  {showPreview() ? <IconEye class="size-4 text-foreground" /> : <IconEyeOff class="size-4 text-foreground" />}
                  {showPreview() ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </Show>
        </div>

        {/* Preview */}
        <Show when={showPreview()}>
          <div class="border rounded-lg p-6">
          <h2 class="text-xl font-semibold text-foreground mb-4">Preview</h2>
          <div class="space-y-4">
            <div class="p-4 bg-muted rounded-lg">
              <h3 class="font-medium text-foreground mb-2">Sample Content</h3>
              <p class="text-muted-foreground mb-3">
                This is how your content will look with the selected colors.
              </p>
              <button class="inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-auto items-center gap-2 py-2 px-4">
                Sample Button
              </button>
            </div>
            
            <div class="border rounded-lg p-4">
              <h3 class="font-medium text-foreground mb-2">Border Example</h3>
              <p class="text-muted-foreground">
                This shows how borders will appear with your color scheme.
              </p>
            </div>
          </div>
        </div>
        </Show>
      </div>
    </div>
  );
};
