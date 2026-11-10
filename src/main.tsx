import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import ProvedorAuth from './hooks/ProvedorAuth';
import './index.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ProvedorAuth>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ProvedorAuth>
  </StrictMode>,
);
