import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * Dedicated Vite Production Build for the Separate Admin Application (`dist-admin/`).
 * Deploy independently to Cloudflare Pages (e.g. `linguaverse-admin` / `admin.linguaverse.ai`).
 */
export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'promote-admin-html-to-index',
      apply: 'build',
      closeBundle(error?: Error): void {
        if (error) return;
        const outDir = path.resolve(import.meta.dirname, 'dist-admin');
        const adminHtml = path.join(outDir, 'admin.html');
        const indexHtml = path.join(outDir, 'index.html');
        if (fs.existsSync(adminHtml)) {
          fs.renameSync(adminHtml, indexHtml);
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  build: {
    outDir: 'dist-admin',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(import.meta.dirname, 'admin.html'),
    },
  },
}));
