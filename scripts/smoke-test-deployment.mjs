#!/usr/bin/env node
/**
 * LINGUAVERSE AI — Post-Deployment & Local Live HTTP Smoke Test
 *
 * Usage:
 *   node scripts/smoke-test-deployment.mjs --api-url=http://localhost:3000 --web-url=http://localhost:3000 --admin-url=http://localhost:3000/admin.html
 */
function parseArg(name, fallback) {
  const eqPrefix = `--${name}=`;
  const eqHit = process.argv.find((a) => a.startsWith(eqPrefix));
  if (eqHit) return eqHit.slice(eqPrefix.length).replace(/\/$/, '');
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1].replace(/\/$/, '');
  }
  return fallback;
}

const apiUrl = parseArg('api-url', 'http://localhost:3000');
const webUrl = parseArg('web-url', apiUrl);
const adminUrl = parseArg('admin-url', `${webUrl}/admin.html`);

const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, status: 'PASS', detail });
  } catch (err) {
    results.push({
      name,
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

await check('API Health (/api/health)', async () => {
  const res = await fetch(`${apiUrl}/api/health`);
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  const data = await res.json();
  if (!data?.ok) throw new Error('Response body missing ok: true');
  const nosniff = res.headers.get('x-content-type-options');
  if (nosniff !== 'nosniff') throw new Error(`Missing X-Content-Type-Options: nosniff (got ${nosniff})`);
  return `200 ok (${data.service || 'api'})`;
});

await check('Public System Status (/api/v1/system/status)', async () => {
  const res = await fetch(`${apiUrl}/api/v1/system/status`);
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  return '200 ok';
});

await check('Public CMS & Curriculum Overlay', async () => {
  const [cmsRes, ovRes] = await Promise.all([
    fetch(`${apiUrl}/api/v1/cms/public`),
    fetch(`${apiUrl}/api/v1/curriculum/overlay`),
  ]);
  if (cmsRes.status !== 200) throw new Error(`CMS status ${cmsRes.status}`);
  if (ovRes.status !== 200) throw new Error(`Overlay status ${ovRes.status}`);
  const cmsJson = await cmsRes.json();
  if (!cmsJson?.config || !Array.isArray(cmsJson.config.sections) || cmsJson.config.sections.length === 0) {
    throw new Error('Public CMS returned null or empty sections array');
  }
  return `200 ok (CMS sections=${cmsJson.config.sections.length} + Overlay)`;
});

await check('Unauthenticated Admin Overview Guard (401)', async () => {
  const res = await fetch(`${apiUrl}/api/v1/admin/overview`, {
    headers: { 'X-Admin-Role': 'super_admin', 'X-Admin-Email': 'spoof@example.com' },
  });
  if (res.status !== 401) throw new Error(`Expected 401 for unauthenticated spoofed admin, got ${res.status}`);
  return '401 blocked as required';
});

await check('Learner App Root & PWA Assets (Manifest + SW)', async () => {
  const [rootRes, manifestRes, swRes] = await Promise.all([
    fetch(`${webUrl}/`),
    fetch(`${webUrl}/manifest.webmanifest`),
    fetch(`${webUrl}/sw.js`),
  ]);
  if (rootRes.status !== 200) throw new Error(`Web root status ${rootRes.status}`);
  if (manifestRes.status !== 200) throw new Error(`Manifest status ${manifestRes.status}`);
  if (swRes.status !== 200) throw new Error(`SW status ${swRes.status}`);
  const manifest = await manifestRes.json();
  if (manifest.display !== 'standalone') throw new Error(`Unexpected manifest display: ${manifest.display}`);
  return `200 ok (manifest=${manifest.short_name}, sw active)`;
});

await check('Separate Admin App Entry & noindex Protection', async () => {
  const res = await fetch(adminUrl);
  if (res.status !== 200) throw new Error(`Admin URL status ${res.status}`);
  const html = await res.text();
  if (!html.toLowerCase().includes('noindex')) {
    throw new Error('Admin HTML missing robots noindex meta tag');
  }
  return '200 ok (noindex verified)';
});

const failed = results.filter((r) => r.status === 'FAIL');
console.log(JSON.stringify({ ok: failed.length === 0, checks: results }, null, 2));
if (failed.length > 0) process.exit(1);
