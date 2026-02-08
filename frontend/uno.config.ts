import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
  presetWind,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetWind(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  theme: {
    colors: {
      // Exact Papra color palette
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))',
      },
      secondary: {
        DEFAULT: 'hsl(var(--secondary))',
        foreground: 'hsl(var(--secondary-foreground))',
      },
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      card: {
        DEFAULT: 'hsl(var(--card))',
        foreground: 'hsl(var(--card-foreground))',
      },
      popover: {
        DEFAULT: 'hsl(var(--popover))',
        foreground: 'hsl(var(--popover-foreground))',
      },
      muted: {
        DEFAULT: 'hsl(var(--muted))',
        foreground: 'hsl(var(--muted-foreground))',
      },
      accent: {
        DEFAULT: 'hsl(var(--accent))',
        foreground: 'hsl(var(--accent-foreground))',
      },
      destructive: {
        DEFAULT: 'hsl(var(--destructive))',
        foreground: 'hsl(var(--destructive-foreground))',
      },
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      warning: {
        DEFAULT: 'hsl(var(--warning))',
        foreground: 'hsl(var(--warning-foreground))',
      },
      // Keep some legacy colors for compatibility
      gray: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#e5e5e5',
        300: '#d4d4d4',
        400: '#a3a3a3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
        950: '#0a0a0a',
      },
    },
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
    },
    borderRadius: {
      DEFAULT: '.25rem',
      sm: '.25rem',
      md: '.375rem',
      lg: '.5rem',
      xl: '.75rem',
    },
    spacing: {
      '18': '4.5rem',
      '88': '22rem',
      '128': '32rem',
    },
    fontSize: {
      'xs': ['0.75rem', '1rem'],
      'sm': ['0.875rem', '1.25rem'],
      'base': ['1rem', '1.5rem'],
      'lg': ['1.125rem', '1.75rem'],
      'xl': ['1.25rem', '1.75rem'],
      '2xl': ['1.5rem', '2rem'],
      '3xl': ['1.875rem', '2.25rem'],
      '4xl': ['2.25rem', '2.5rem'],
      '6xl': ['3.75rem', '1'],
    },
    fontWeight: {
      'normal': '400',
      'medium': '500',
      'semibold': '600',
      'bold': '700',
    },
    lineHeight: {
      'tight': '1.25',
      'none': '1',
      'relaxed': '1.625',
    },
    letterSpacing: {
      'tight': '-0.025em',
      'widest': '0.1em',
    },
    transitionDuration: {
      'DEFAULT': '0.15s',
    },
    transitionTimingFunction: {
      'DEFAULT': 'cubic-bezier(.4, 0, .2, 1)',
      'out': 'cubic-bezier(0, 0, .2, 1)',
      'in-out': 'cubic-bezier(.4, 0, .2, 1)',
      'linear': 'linear',
    },
  },
  shortcuts: {
    // Papra button variants
    'btn-primary': 'bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2',
    'btn-secondary': 'bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2',
    'btn-outline': 'border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2',
    'btn-ghost': 'hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2',
    'btn-papra-ghost': 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent/50 hover:text-accent-foreground',
    'btn-papra-secondary': 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80',
    
    // Papra card
    'card': 'bg-card text-card-foreground border rounded-lg shadow-sm',
    'card-papra': 'rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-border/80',
    
    // Papra input
    'input': 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    
    // Papra navigation
    'nav-item-papra': 'inline-flex rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-9 px-4 py-2 justify-start items-center gap-2 dark:text-muted-foreground truncate',
    'nav-item-papra-active': 'bg-accent/50 text-accent-foreground',
    
    // Papra sidebar
    'sidebar-papra': 'w-280px border-r border-r-border flex-shrink-0 hidden md:block bg-card',
    
    // Papra utilities
    'w-280px': 'w-[280px]',
    'size-5\\.5': 'w-[1.375rem] h-[1.375rem]',
    'transition-papra': 'transition-all duration-150 ease-[cubic-bezier(.4,0,.2,1)]',
    'focus-papra': 'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
  },
})
