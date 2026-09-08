import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ExportDock } from './export/ExportDock';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <ExportDock />
  </React.StrictMode>,
);
