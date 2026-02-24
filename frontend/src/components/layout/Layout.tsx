import { children, createSignal, onMount } from 'solid-js'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AIChatPanel } from './AIChatPanel'
import { IconBrain } from '@tabler/icons-solidjs'

export interface LayoutProps {
  children: any
  title?: string
  class?: string
  fullBleed?: boolean
}

export function Layout(props: LayoutProps) {
  const resolved = children(() => props.children)
  const [isChatOpen, setIsChatOpen] = createSignal(false)
  const [isSidebarOpen, setIsSidebarOpen] = createSignal(false)

  onMount(() => {
    // Initialize dark mode from localStorage or system preference
    const savedTheme = localStorage.getItem('theme')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.setAttribute('data-kb-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-kb-theme')
    }

    // Initialize color scheme from localStorage
    const savedColorScheme = localStorage.getItem('colorScheme');
    const savedCustomColors = localStorage.getItem('customColors');
    
    if (savedColorScheme === 'custom' && savedCustomColors) {
      try {
        const colors = JSON.parse(savedCustomColors);
        
        // Apply custom colors
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
        
        const root = document.documentElement;
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
      } catch (e) {
        console.error('Failed to load custom colors:', e);
      }
    } else if (savedColorScheme) {
      // Apply predefined scheme
      const predefinedSchemes: Record<string, any> = {
        'default': { primary: '#5ab9ff', background: savedTheme === 'dark' ? '#1a1a1a' : '#ffffff', foreground: savedTheme === 'dark' ? '#ffffff' : '#000000', muted: savedTheme === 'dark' ? '#262727' : '#f5f5f5', border: '#262626' },
        'ocean': { primary: '#0077be', background: savedTheme === 'dark' ? '#001f3f' : '#e6f3ff', foreground: savedTheme === 'dark' ? '#ffffff' : '#000000', muted: savedTheme === 'dark' ? '#003366' : '#cce7ff', border: '#004080' },
        'forest': { primary: '#228b22', background: savedTheme === 'dark' ? '#0d2818' : '#f0f8f0', foreground: savedTheme === 'dark' ? '#ffffff' : '#000000', muted: savedTheme === 'dark' ? '#1a431a' : '#d4edd4', border: '#2d5a2d' },
        'sunset': { primary: '#ff6b35', background: savedTheme === 'dark' ? '#2c1810' : '#fff5f0', foreground: savedTheme === 'dark' ? '#ffffff' : '#000000', muted: savedTheme === 'dark' ? '#5c2e00' : '#ffe4d6', border: '#8b4513' },
        'purple': { primary: '#8b5cf6', background: savedTheme === 'dark' ? '#1a0033' : '#f8f5ff', foreground: savedTheme === 'dark' ? '#ffffff' : '#000000', muted: savedTheme === 'dark' ? '#330066' : '#ede9fe', border: '#4d0099' },
        'rose': { primary: '#f43f5e', background: savedTheme === 'dark' ? '#2d1111' : '#fff1f2', foreground: savedTheme === 'dark' ? '#ffffff' : '#000000', muted: savedTheme === 'dark' ? '#5a1a1a' : '#ffe4e6', border: '#881337' },
        'amber': { primary: '#f59e0b', background: savedTheme === 'dark' ? '#2d1a00' : '#fffbeb', foreground: savedTheme === 'dark' ? '#ffffff' : '#000000', muted: savedTheme === 'dark' ? '#5c4a00' : '#fef3c7', border: '#78350f' },
        'emerald': { primary: '#10b981', background: savedTheme === 'dark' ? '#022c22' : '#ecfdf5', foreground: savedTheme === 'dark' ? '#ffffff' : '#000000', muted: savedTheme === 'dark' ? '#064e3b' : '#d1fae5', border: '#047857' },
        'cyan': { primary: '#06b6d4', background: savedTheme === 'dark' ? '#022c3a' : '#ecfeff', foreground: savedTheme === 'dark' ? '#ffffff' : '#000000', muted: savedTheme === 'dark' ? '#164e63' : '#cffafe', border: '#0891b2' },
        'indigo': { primary: '#6366f1', background: savedTheme === 'dark' ? '#1e1b4b' : '#eef2ff', foreground: savedTheme === 'dark' ? '#ffffff' : '#000000', muted: savedTheme === 'dark' ? '#312e81' : '#e0e7ff', border: '#4338ca' }
      };
      
      const scheme = predefinedSchemes[savedColorScheme];
      if (scheme) {
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
        
        const root = document.documentElement;
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
        root.style.setProperty('--colors-border', hexToHsl(scheme.border));
      }
    }
  })

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen())
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen())
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  return (
    <div class="min-h-screen font-sans text-sm font-400 bg-background text-foreground">
      
      <div class="flex flex-row h-screen min-h-0 relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen() && (
          <div 
            class="fixed inset-0 bg-black/50 z-40" 
            onClick={closeSidebar}
          />
        )}
        
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen()} onClose={closeSidebar} />
        
        {/* Main Content */}
        <div class="flex-1 min-h-0 flex flex-col">
          {/* Header */}
          <Header title={props.title} onMenuClick={toggleSidebar} />
          
          {/* Page Content */}
          <main class="flex-1 overflow-auto max-w-screen">
            <div class={props.fullBleed ? "h-full" : "p-2 max-w-7xl mx-auto"}>
              {resolved()}
            </div>
          </main>
        </div>

        {/* Floating AI Button */}
        <button
          onClick={toggleChat}
          class="fixed bottom-6 right-8 z-40 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 hover:scale-110 w-14 h-14"
          title="AI Assistant"
        >
          <IconBrain class="size-6 text-primary-foreground" />
        </button>

        {/* AI Chat Panel */}
        <AIChatPanel isOpen={isChatOpen()} onClose={() => setIsChatOpen(false)} />
      </div>
    </div>
  )
}
