import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canAdminRoleEditCms,
  canAdminRoleReadCms,
  createDefaultCmsConfig,
  getApprovedTestimonials,
  getPublishedFaqs,
  reorderItems,
  sanitizeCmsConfigPatch,
  sanitizeText,
  sanitizeUrl,
  validateMediaUpload,
} from './cmsEngine.ts';

describe('CMS Domain Engine', () => {
  it('defaults strictly to zero fabricated testimonials and honest language statuses', () => {
    const cfg = createDefaultCmsConfig();
    assert.equal(cfg.testimonials.length, 0);
    assert.equal(getApprovedTestimonials(cfg).length, 0);

    const liveLangs = cfg.languages.filter((l) => l.status === 'live').map((l) => l.code);
    assert.deepEqual(liveLangs, ['en', 'bn']);

    const comingSoonLangs = cfg.languages.filter((l) => l.status === 'coming_soon');
    assert.ok(comingSoonLangs.length >= 5);

    assert.equal(cfg.features.length, 6);
    assert.equal(cfg.howItWorks.steps.length, 3);
    assert.equal(cfg.pricingPlans.length, 2);
  });

  it('enforces RBAC role permissions for CMS read and write operations', () => {
    assert.equal(canAdminRoleEditCms('super_admin'), true);
    assert.equal(canAdminRoleEditCms('admin'), true);
    assert.equal(canAdminRoleEditCms('content_manager'), true);
    assert.equal(canAdminRoleEditCms('ai_ops'), false);
    assert.equal(canAdminRoleEditCms('learner'), false);
    assert.equal(canAdminRoleEditCms(undefined), false);

    assert.equal(canAdminRoleReadCms('ai_ops'), true);
    assert.equal(canAdminRoleReadCms('moderator'), true);
    assert.equal(canAdminRoleReadCms('learner'), false);
  });

  it('sanitizes XSS script tags and rejects unsafe javascript: URLs', () => {
    assert.equal(sanitizeText('Hello <script>alert(1)</script> World'), 'Hello  World');
    assert.equal(sanitizeUrl('javascript:alert(1)'), '');
    assert.equal(sanitizeUrl('data:text/html,<h1>x</h1>'), '');
    assert.equal(sanitizeUrl('//evil.example/phish'), '');
    assert.equal(sanitizeUrl('https://linguaverse.ai/docs'), 'https://linguaverse.ai/docs');
    assert.equal(sanitizeUrl('#pricing'), '#pricing');
    assert.equal(sanitizeUrl('/app/speak'), '/app/speak');
  });

  it('filters testimonials strictly to approved status and sorts by order', () => {
    const base = createDefaultCmsConfig();
    const patched = sanitizeCmsConfigPatch(
      base,
      {
        testimonials: [
          {
            id: 't1',
            authorName: 'Pending User',
            authorRole: 'Student',
            quoteEn: 'Still pending review',
            rating: 5,
            status: 'pending',
            order: 1,
            createdAt: '2026-03-01T00:00:00Z',
          },
          {
            id: 't2',
            authorName: 'Second Approved',
            authorRole: 'Engineer',
            quoteEn: 'Helped my interview clarity.',
            rating: 5,
            status: 'approved',
            order: 2,
            createdAt: '2026-03-01T00:00:00Z',
          },
          {
            id: 't3',
            authorName: 'First Approved',
            authorRole: 'University Student',
            quoteEn: 'Mistake Memory fixed my past tense.',
            rating: 5,
            status: 'approved',
            order: 1,
            createdAt: '2026-03-01T00:00:00Z',
          },
        ],
      },
      'admin@linguaverse.ai'
    );

    const approved = getApprovedTestimonials(patched);
    assert.equal(approved.length, 2);
    assert.equal(approved[0].id, 't3');
    assert.equal(approved[1].id, 't2');
  });

  it('reorders items deterministically and validates media uploads', () => {
    const cfg = createDefaultCmsConfig();
    const reordered = reorderItems(cfg.faqs, 'faq_2', 'up');
    assert.equal(reordered[0].id, 'faq_2');
    assert.equal(reordered[0].order, 1);
    assert.equal(reordered[1].id, 'faq_1');
    assert.equal(reordered[1].order, 2);

    const published = getPublishedFaqs({ ...cfg, faqs: reordered });
    assert.equal(published[0].id, 'faq_2');

    assert.equal(
      validateMediaUpload({ filename: 'hero.png', mimeType: 'image/png', sizeBytes: 120_000 }).ok,
      true
    );
    assert.equal(
      validateMediaUpload({ filename: 'malware.exe', mimeType: 'application/x-msdownload', sizeBytes: 100 }).ok,
      false
    );
    assert.equal(
      validateMediaUpload({ filename: 'huge.png', mimeType: 'image/png', sizeBytes: 5 * 1024 * 1024 }).ok,
      false
    );
    assert.equal(
      validateMediaUpload({ filename: 'vector.svg', mimeType: 'image/svg+xml', sizeBytes: 512 }).ok,
      false
    );
    assert.equal(
      validateMediaUpload({ filename: 'xss.svg', mimeType: 'image/png', sizeBytes: 512 }).ok,
      false
    );
  });
});
