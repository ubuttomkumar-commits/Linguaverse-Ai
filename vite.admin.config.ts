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
  base: '/',
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
        // Dedicated Cloudflare Pages _headers for Separate Admin Application:
        // immutable hashed JS/CSS assets, NEVER cache Admin HTML or private views, enforce noindex.
        const adminHeaders = [
          '/assets/*',
          '  Cache-Control: public, max-age=31536000, immutable',
          '',
          '/index.html',
          '  Cache-Control: no-store, no-cache, must-revalidate, private',
          '  Pragma: no-cache',
          '',
          '/',
          '  Cache-Control: no-store, no-cache, must-revalidate, private',
          '  Pragma: no-cache',
          '',
          '/*',
          '  X-Robots-Tag: noindex, nofollow',
          '  X-Content-Type-Options: nosniff',
          '  X-Frame-Options: DENY',
          '  Referrer-Policy: no-referrer',
          '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
          '',
        ].join('\n');
        fs.writeFileSync(path.join(outDir, '_headers'), adminHeaders, 'utf8');
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
    target: 'es2022',
    cssCodeSplit: true,
    rolldownOptions: {
      input: path.resolve(import.meta.dirname, 'admin.html'),
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-icons',
              test: /node_modules[\\/]lucide-react[\\/]/,
              priority: 15,
            },
          ],
        },
      },
    },
  },
}));
