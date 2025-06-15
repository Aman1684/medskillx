import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Your global CSS
import App from './App'; // Main App component
import reportWebVitals from './reportWebVitals';

// Create root and render App inside StrictMode for highlighting potential problems
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Performance measuring - optional, logs metrics to console
reportWebVitals();