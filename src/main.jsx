import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

console.log('🚀 Starting React application...');
console.log('Root element:', rootElement);

if (rootElement) {
  console.log('✅ Root element found, rendering app...');
  createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
  console.log('✅ React app rendered');
} else {
  console.error('❌ Root element not found');
}