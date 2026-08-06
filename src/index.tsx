import React from 'react';
import ReactDOM from 'react-dom/client';
import './ui/tokens.css';
import './index.css';
import App from './App';
import { reportClientError } from './services/clientErrorApi';

window.addEventListener('unhandledrejection', (e) => {
  const error = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
  reportClientError(error, { route: window.location.pathname });
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <App />
);
