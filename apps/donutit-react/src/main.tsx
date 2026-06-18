import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { bootstrapLocalStorageFromRepo } from '@shared/local-storage-bootstrap';
import App from './App';
import './index.css';

void bootstrapLocalStorageFromRepo().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
