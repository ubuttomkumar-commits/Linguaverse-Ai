import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPngDimensions(filePath: string): { width: number; height: number } {
  const buf = fs.readFileSync(filePath);
  assert.ok(buf.length >= 24, `${filePath} must be a valid PNG (>=24 bytes)`);
  assert.equal(
    buf.subarray(0, 8).equals(PNG_SIGNATURE),
    true,
    `${filePath} must start with valid PNG magic bytes`
  );
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

test('PWA manifest.webmanifest satisfies PRD §11 installability and icon contract', () => {
  const manifestPath = path.join(ROOT, 'public/manifest.webmanifest');
  assert.equal(fs.existsSync(manifestPath), true, 'manifest.webmanifest must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    id?: string;
    name?: string;
    short_name?: string;
    description?: string;
    display?: string;
    start_url?: string;
    scope?: string;
    theme_color?: string;
    background_color?: string;
    icons?: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
  };

  assert.equal(manifest.id, '/');
  assert.equal(manifest.name, 'LINGUAVERSE AI');
  assert.ok(manifest.short_name && manifest.short_name.length <= 12, 'short_name must be <= 12 chars');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.ok(manifest.theme_color?.startsWith('#'));
  assert.ok(manifest.background_color?.startsWith('#'));

  const icons = manifest.icons ?? [];
  assert.ok(icons.length >= 3, 'manifest must declare 192px any, 512px any, and 512px maskable icons');
  assert.ok(
    icons.some((i) => i.sizes === '192x192' && i.purpose === 'any'),
    'must include 192x192 any icon'
  );
  assert.ok(
    icons.some((i) => i.sizes === '512x512' && i.purpose === 'any'),
    'must include 512x512 any icon'
  );
  assert.ok(
    icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'),
    'must include separate 512x512 maskable icon (not combined "any maskable")'
  );
  for (const icon of icons) {
    assert.notEqual(icon.purpose, 'any maskable', 'must not combine "any maskable" in one entry');
    const rel = icon.src.replace(/^\//, '');
    const full = path.join(ROOT, 'public', rel);
    assert.equal(fs.existsSync(full), true, `icon file ${icon.src} must exist`);
    const dims = readPngDimensions(full);
    const [expectedW, expectedH] = icon.sizes.split('x').map(Number);
    assert.equal(dims.width, expectedW, `${icon.src} width must match ${expectedW}`);
    assert.equal(dims.height, expectedH, `${icon.src} height must match ${expectedH}`);
  }

  const appleTouchPath = path.join(ROOT, 'public/apple-touch-icon.png');
  assert.equal(fs.existsSync(appleTouchPath), true, 'apple-touch-icon.png must exist');
  const appleDims = readPngDimensions(appleTouchPath);
  assert.ok(appleDims.width >= 180 && appleDims.height >= 180, 'apple-touch-icon must be >=180x180');

  const svgPath = path.join(ROOT, 'public/icon.svg');
  assert.equal(fs.existsSync(svgPath), true, 'icon.svg must exist');
  assert.ok(fs.readFileSync(svgPath, 'utf8').includes('<svg'));
});

test('HTML entry points isolate Learner PWA metadata from Separate Admin Application', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('rel="manifest" href="/manifest.webmanifest"'));
  assert.ok(indexHtml.includes('rel="apple-touch-icon" href="/apple-touch-icon.png"'));
  assert.ok(indexHtml.includes('name="apple-mobile-web-app-capable" content="yes"'));

  const adminHtml = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
  assert.ok(adminHtml.includes('name="robots" content="noindex, nofollow"'));
  assert.ok(!adminHtml.includes('manifest.webmanifest'), 'Admin portal should not expose learner PWA manifest');
});

test('Service Worker enforces strict cache isolation for /api/*, /admin*, Set-Cookie, no-store, and logout cleanup', () => {
  const swPath = path.join(ROOT, 'public/sw.js');
  const swCode = fs.readFileSync(swPath, 'utf8');

  // Verify syntactically valid JavaScript
  assert.doesNotThrow(() => new Function(swCode), 'public/sw.js must be syntactically valid JS');

  // Verify security & isolation guards
  assert.ok(swCode.includes("request.method !== 'GET'"), 'SW must bypass non-GET mutations');
  assert.ok(swCode.includes("request.headers.get('Authorization')"), 'SW must bypass Authorization requests');
  assert.ok(swCode.includes("url.pathname.startsWith('/api/')"), 'SW must never intercept /api/*');
  assert.ok(swCode.includes("url.pathname.startsWith('/admin')"), 'SW must never intercept /admin*');
  assert.ok(swCode.includes("response.headers.has('Set-Cookie')"), 'SW must never cache Set-Cookie responses');
  assert.ok(swCode.includes("cacheControl.includes('no-store')"), 'SW must respect Cache-Control: no-store');
  assert.ok(swCode.includes("cacheControl.includes('private')"), 'SW must respect Cache-Control: private');
  assert.ok(swCode.includes("url.pathname === '/'"), 'SW must only cache static root shell for navigation');
  assert.ok(swCode.includes("data.type === 'CLEAR_USER_CACHES'"), 'SW must clear user runtime caches on logout');
  assert.ok(swCode.includes("data.type === 'PURGE_ALL_CACHES'"), 'SW must support full cache purge on recovery');
  assert.ok(swCode.includes("data.type === 'SKIP_WAITING'"), 'SW must support safe update handoff');
  assert.ok(swCode.includes("X-LV-Chunk-Mismatch"), 'SW must reject HTML fallback served for missing hashed /assets/* chunks');
  assert.ok(
    swCode.indexOf("request.mode === 'navigate'") < swCode.indexOf("PRECACHE_URLS.includes(url.pathname)"),
    'SW must evaluate navigate mode BEFORE PRECACHE_URLS so root HTML is fetched fresh online'
  );

  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const adminHtml = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
  assert.ok(indexHtml.includes('__LV_APP_MOUNTED__'), 'index.html must include zero-JS boot watchdog');
  assert.ok(adminHtml.includes('__LV_APP_MOUNTED__'), 'admin.html must include zero-JS boot watchdog');
});

