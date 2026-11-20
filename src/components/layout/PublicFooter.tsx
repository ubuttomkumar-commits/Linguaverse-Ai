import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageToggle } from '../common/LanguageToggle';

export function PublicFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-slate-800/80 bg-[#0A0F1C]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-white"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3B82F6] text-xs font-bold text-white"
              >
                LV
              </span>
              <span>{t.brand}</span>
            </Link>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
              {t.footer.tagline}
            </p>
            <div className="mt-5">
              <LanguageToggle />
            </div>
          </div>

          <div className="md:col-span-3">
            <h2 className="text-sm font-semibold text-slate-200">{t.footer.linksTitle}</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  {t.nav.features}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  {t.nav.howItWorks}
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  {t.nav.pricing}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h2 className="text-sm font-semibold text-slate-200">{t.footer.accountTitle}</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  {t.nav.startLearning}
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  {t.nav.login}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800/80 pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
          <p>{t.footer.copyright}</p>
          <p>English &amp; বাংলা · Voice-First Communication Intelligence</p>
        </div>
      </div>
    </footer>
  );
}
