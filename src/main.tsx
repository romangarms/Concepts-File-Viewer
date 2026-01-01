import { createRoot } from 'react-dom/client';
import { App } from './App.js';

// Print startup message
console.log(
  '%c🎨 Concepts File Viewer',
  'font-size: 16px; font-weight: bold; color: #FF9500;'
);

// Render the app
const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(<App />);
