import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {
  RootErrorBoundary,
  installVitePreloadRecovery,
  markAppBootMounted,
} from './components/common/RootErrorBoundary';
import { registerLinguaVerseServiceWorker } from './utils/pwaRuntime';

installVitePreloadRecovery();

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary appName="LINGUAVERSE AI">
    <App />
  </RootErrorBoundary>
);

markAppBootMounted();
registerLinguaVerseServiceWorker();


