import { render } from 'solid-js/web';
import { Router } from '@solidjs/router';
import App from './App';

const root = document.getElementById('root');

if (root) {
  render(() => (
    <Router>
      <App />
    </Router>
  ), root);
} else {
  console.error('Root element not found');
}
