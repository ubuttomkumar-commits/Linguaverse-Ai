import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AdminApp from './AdminApp';
import './index.css';
import {
  RootErrorBoundary,
  installVitePreloadRecovery,
  markAppBootMounted,
} from './components/common/RootErrorBoundary';

installVitePreloadRecovery();

createRoot(document.getElementById('admin-root')!).render(
  <StrictMode>
    <RootErrorBoundary appName="LINGUAVERSE AI Admin" isAdmin>
      <AdminApp />
    </RootErrorBoundary>
  </StrictMode>
);

markAppBootMounted();

