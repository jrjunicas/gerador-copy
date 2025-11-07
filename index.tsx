import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; // o Vite empacota e injeta no HTML final

const mount = document.getElementById('root') ?? (() => {
  const el = document.createElement('div');
  el.id = 'root';
  document.body.appendChild(el);
  return el;
})();

createRoot(mount).render(<App />);
