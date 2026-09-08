import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppV2 } from './AppV2';
import './styles.css';
import './ux-v09.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AppV2 /></React.StrictMode>,
);
