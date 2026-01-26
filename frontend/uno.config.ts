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
      primary: {
        DEFAULT: '#39b9ff',
        50: '#e6f7ff',
        100: '#b3e5ff',
        200: '#80d3ff',
        300: '#4dc1ff',
        400: '#1aafff',
        500: '#39b9ff',
        600: '#2e94cc',
        700: '#236f99',
        800: '#184a66',
        900: '#0d2533',
      },
      gray: {
        50: '#fafafa',
        100: '#a3a3a3',
        200: '#262626',
        300: '#141415',
        400: '#18181b',
        500: '#141415',
        600: '#262626',
        700: '#a3a3a3',
        800: '#18181b',
        900: '#141415',
      },
    },
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
    },
  },
  shortcuts: {
    'btn-primary': 'bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors',
    'btn-secondary': 'bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors',
    'card': 'bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg',
    'input': 'bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg focus:border-primary-500 focus:outline-none transition-colors',
  },
})
