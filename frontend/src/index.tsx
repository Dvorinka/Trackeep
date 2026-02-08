/* @refresh reload */
import { render } from 'solid-js/web'
import '@unocss/reset/tailwind.css'
import 'uno.css'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')

render(() => <App />, root!)
