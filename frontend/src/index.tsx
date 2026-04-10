/* @refresh reload */
import { render } from 'solid-js/web'
import '@unocss/reset/tailwind.css'
import 'uno.css'
import './index.css'
import App from './App.tsx'

// Clear demo mode data if demo mode is disabled
import { isDemoMode, clearDemoMode } from './lib/demo-mode'

if (!isDemoMode()) {
  clearDemoMode()
}

const root = document.getElementById('root')

render(() => <App />, root!)
