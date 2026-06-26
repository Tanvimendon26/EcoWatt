import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ConsumerNotificationProvider, AdminNotificationProvider } from './contexts/NotificationContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConsumerNotificationProvider>
      <AdminNotificationProvider>
        <App />
      </AdminNotificationProvider>
    </ConsumerNotificationProvider>
  </StrictMode>,
);
