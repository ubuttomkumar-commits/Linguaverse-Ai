import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useCms } from '../../context/CmsContext';
import { BrandLogoMark } from './PublicHeader';

export function PublicFooter() {
  const { lang } = useLanguage();
  const { config } = useCms();
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  const footerLinks = useMemo(
    () =>
      [...config.settings.footerLinks]
        .filter((item) => item.enabled)
        .sort((a, b) => a.order - b.order),
    [config.settings.footerLinks]
  );

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === '#privacy-policy') {
      e.preventDefault();
      setLegalModal('privacy');
      return;
    }
    if (href === '#terms-of-service') {
      e.preventDefault();
      setLegalModal('terms');
      return;
    }
    if (href.startsWith('#')) {
      e.preventDefault();
      const id = href.replace('#', '');
      if (id === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <footer className="border-t border-[#60a5fa]/[0.16] bg-[#04081B] py-8 text-[12.5px] text-[#9eb4dc]">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-6 px-4 sm:px-6 lg:flex-row">
          {/* Left: Brand Logo + Tagline */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <BrandLogoMark size="sm" />
            <div>
              <span className="font-display block text-[14.5px] font-extrabold tracking-[0.02em] text-white">
                {config.settings.brandName}
              </span>
              <span className="block text-[10.5px] text-[#8fa7d4]">
                {lang === 'bn' ? config.settings.taglineBn : config.settings.taglineEn}
              </span>
            </div>
          </Link>

          {/* Center: Horizontal CMS Footer Navigation Links */}
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[12.5px] font-medium text-[#c5d6f4]"
          >
            {footerLinks.map((item, idx) => (
              <span key={item.id} className="inline-flex items-center gap-3">
                <a
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className="transition-colors hover:text-[#00D9FF]"
                >
                  {lang === 'bn' ? item.labelBn : item.labelEn}
                </a>
                {idx < footerLinks.length - 1 && (
                  <span aria-hidden="true" className="text-[#4a608a]">
                    |
                  </span>
                )}
              </span>
            ))}
          </nav>

          {/* Right: Social Icons + Copyright */}
          <div className="flex flex-col items-center gap-2 lg:items-end">
            <div className="flex items-center gap-3">
              {config.settings.socialLinks.youtube && (
                <a
                  href={config.settings.socialLinks.youtube}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="text-[#c5d6f4] transition-colors hover:text-[#00D9FF]"
                >
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current" aria-hidden="true">
                    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
                  </svg>
                </a>
              )}
              {config.settings.socialLinks.discord && (
                <a
                  href={config.settings.socialLinks.discord}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Discord"
                  className="text-[#c5d6f4] transition-colors hover:text-[#00D9FF]"
                >
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current" aria-hidden="true">
                    <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.2 18.2 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.6 9.1-.2 13.6.2 18a19.9 19.9 0 0 0 6 3l1.3-2.1a12.8 12.8 0 0 1-2-.9l.5-.4a14 14 0 0 0 12 0l.5.4a12.8 12.8 0 0 1-2 .9l1.3 2.1a19.9 19.9 0 0 0 6-3c.5-5.2-.8-9.7-3.5-13.6zM8.5 15.3c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3zm7 0c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3z" />
                  </svg>
                </a>
              )}
              {config.settings.socialLinks.linkedin && (
                <a
                  href={config.settings.socialLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="text-[#c5d6f4] transition-colors hover:text-[#00D9FF]"
                >
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-current" aria-hidden="true">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                </a>
              )}
              {config.settings.socialLinks.x && (
                <a
                  href={config.settings.socialLinks.x}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="X"
                  className="text-[#c5d6f4] transition-colors hover:text-[#00D9FF]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M18.2 2.25h3.3l-7.2 8.23 8.5 11.27h-6.6l-5.2-6.8-5.9 6.8H1.8l7.7-8.8L1.3 2.25h6.8l4.7 6.2 5.4-6.2zm-1.2 17.5h1.8L7 4.15H5.1l11.9 15.6z" />
                  </svg>
                </a>
              )}
            </div>
            <p className="text-[11px] text-[#7f97c4]">{config.settings.copyrightText}</p>
          </div>
        </div>
      </footer>

      {/* Privacy Policy & Terms of Service Modal */}
      {legalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#030616]/82 px-4 backdrop-blur-md"
          onClick={() => setLegalModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={legalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
            onClick={(e) => e.stopPropagation()}
            className="lv-glass-card w-full max-w-lg rounded-2xl p-6"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#60a5fa]/20 pb-3">
              <h3 className="font-display text-[17px] font-bold text-white">
                {legalModal === 'privacy'
                  ? lang === 'bn'
                    ? 'প্রাইভেসি পলিসি'
                    : 'Privacy Policy'
                  : lang === 'bn'
                    ? 'ব্যবহারের শর্তাবলী'
                    : 'Terms of Service'}
              </h3>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                aria-label="Close legal dialog"
                className="rounded-lg p-1 text-[#9eb4dc] hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-[#c9daf8]">
              {legalModal === 'privacy' ? (
                <>
                  <p>
                    LINGUAVERSE AI respects your communication privacy. Voice recording storage is
                    explicitly opt-in via Settings, and learners can purge stored audio recordings
                    or delete their account at any time.
                  </p>
                  <p>
                    No secret API keys or third-party credentials are ever exposed in the browser.
                    Support contact: <span className="text-[#00D9FF]">{config.settings.supportEmail}</span>
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Free Plan accounts provide foundational lessons and starter AI speaking
                    evaluations. Premium plans (when live billing is enabled) include extended AI
                    practice subject to responsible fair-use rate limits.
                  </p>
                  <p>
                    All platform content, languages, and pricing are governed transparently through
                    LINGUAVERSE AI administrative policies.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
