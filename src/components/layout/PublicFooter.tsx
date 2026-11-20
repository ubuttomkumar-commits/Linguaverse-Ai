import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageToggle } from '../common/LanguageToggle';
import { LANDING_COPY } from '../../domain/landingContent';

export function PublicFooter() {
  const { lang } = useLanguage();
  const copy = LANDING_COPY[lang];

  return (
    <footer className="border-t border-white/[0.07] bg-[#050914]">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 sm:pb-24 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand & Bilingual Toggle */}
          <div className="md:col-span-4">
            <Link
              to="/"
              className="font-display inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-white"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] text-xs font-extrabold text-white"
              >
                LV
              </span>
              <span>LINGUAVERSE AI</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              {copy.footer.tagline}
            </p>
            <div className="mt-5">
              <LanguageToggle />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-slate-200">{copy.footer.navTitle}</h2>
            <ul className="mt-3.5 space-y-2.5 text-sm text-slate-400">
              <li>
                <a href="#why-it-works" className="hover:text-white transition-colors">
                  {copy.nav.whyItWorks}
                </a>
              </li>
              <li>
                <a href="#live-demo" className="hover:text-white transition-colors">
                  {copy.nav.liveDemo}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  {copy.nav.loop}
                </a>
              </li>
              <li>
                <a href="#support" className="hover:text-white transition-colors">
                  {copy.nav.support}
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  {copy.nav.pricing}
                </a>
              </li>
            </ul>
          </div>

          {/* Privacy & Data Sovereignty Summary */}
          <div className="md:col-span-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <ShieldCheck className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
              <span>{copy.footer.privacyTitle}</span>
            </h2>
            <ul className="mt-3.5 space-y-2.5 text-xs leading-relaxed text-slate-400">
              {copy.footer.privacyPoints.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          </div>

          {/* Account Links */}
          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-slate-200">{copy.footer.accountTitle}</h2>
            <ul className="mt-3.5 space-y-2.5 text-sm text-slate-400">
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  {copy.nav.startFree}
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  {copy.nav.login}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/[0.07] pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{copy.footer.copyright}</p>
          <p>{copy.footer.subline}</p>
        </div>
      </div>
    </footer>
  );
}
