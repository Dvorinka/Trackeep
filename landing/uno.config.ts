import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetUno,
  presetWebFonts,
  transformerDirectives
} from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      collections: {
        ph: '@iconify-json/ph'
      }
    }),
    presetTypography(),
    presetWebFonts({
      fonts: {
        sans: 'Inter:400,500,600,700,800',
        mono: 'JetBrains Mono:400,500'
      }
    })
  ],
  transformers: [
    transformerDirectives()
  ],
  theme: {
    colors: {
      primary: '#5BC4F2',
      background: {
        light: '#FFFFFF',
        dark: '#1A1A1A'
      },
      foreground: {
        light: '#0A0A0A',
        dark: '#FAFAFA'
      },
      card: {
        light: '#FCFCFC',
        dark: '#1A1A1A'
      },
      border: {
        light: '#E2E8F0',
        dark: '#262626'
      },
      muted: {
        light: '#F2F2F2',
        dark: '#262626'
      }
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace']
    },
    spacing: {
      '18': '4.5rem',
      '88': '22rem',
      '128': '32rem'
    },
    borderRadius: {
      '4xl': '2rem'
    },
    boxShadow: {
      'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
      'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      'strong': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 4px 25px -5px rgba(0, 0, 0, 0.1)'
    }
  },
  shortcuts: {
    'btn-primary': 'bg-primary text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary/90 transition-all duration-300 cursor-pointer shadow-soft hover:shadow-medium transform hover:-translate-y-0.5',
    'btn-secondary': 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 cursor-pointer shadow-soft hover:shadow-medium transform hover:-translate-y-0.5',
    'btn-outline': 'border-2 border-primary text-primary px-8 py-4 rounded-xl font-semibold hover:bg-primary hover:text-white transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5',
    'card-papra': 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-soft hover:shadow-medium transition-all duration-300',
    'nav-item-papra': 'text-gray-700 dark:text-gray-300 hover:text-primary transition-colors duration-200 cursor-pointer font-medium',
    'transition-papra': 'transition-all duration-300 ease-out',
    'text-balance': 'text-wrap-balance',
    'text-pretty': 'text-wrap-pretty'
  }
})
