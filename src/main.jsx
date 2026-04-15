import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Forzar actualización del Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.update(); // Forzar actualización
      console.log('🔄 Service Worker actualizado');
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
