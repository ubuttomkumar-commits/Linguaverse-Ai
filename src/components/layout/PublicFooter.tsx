import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageToggle } from '../common/LanguageToggle';
import {
  PLACEHOLDER_CONTACT_EMAIL,
  SUPPLIED_LANDING_COPY,
} from '../../domain/suppliedLandingCopy';

export function PublicFooter() {
  const { lang } = useLanguage();
  const { footer } = SUPPLIED_LANDING_COPY[lang];
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#b0c8ff]/[0.12] bg-[#060b18] pb-10 pt-14 text-[13px] text-[#9eb0cf]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand Column */}
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4f8bff]"
            >
              <span
                aria-hidden="true"
                className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-[#4f8bff] to-[#8b6dff] text-sm font-black text-[#060b18]"
              >
                L
              </span>
              <span className="font-display text-[15px] font-extrabold tracking-[-0.01em] text-[#f3f6ff]">
                LINGUAVERSE AI
              </span>
            </Link>
            <p className="mt-3.5 max-w-[300px] text-[14px] leading-relaxed text-[#9eb0cf]">
              {footer.tagline}
            </p>
            <div className="mt-5">
              <LanguageToggle />
            </div>
          </div>

          {/* Product */}
          <div>
            <h2 className="text-[13px] font-bold text-[#f3f6ff]">
              {footer.productTitle}
            </h2>
            <ul className="mt-3.5 space-y-2.5">
              <li>
                <a href="#live-demo" className="transition-colors hover:text-white">
                  {footer.links.liveDemo}
                </a>
              </li>
              <li>
                <a href="#intelligence" className="transition-colors hover:text-white">
                  {footer.links.intelligence}
                </a>
              </li>
              <li>
                <a href="#speaking" className="transition-colors hover:text-white">
                  {footer.links.speakingStudio}
                </a>
              </li>
              <li>
                <a href="#scenarios" className="transition-colors hover:text-white">
                  {footer.links.transferLab}
                </a>
              </li>
            </ul>
          </div>

          {/* Learning & Trust */}
          <div>
            <h2 className="text-[13px] font-bold text-[#f3f6ff]">
              {footer.learningTitle}
            </h2>
            <ul className="mt-3.5 space-y-2.5">
              <li>
                <a href="#bangla-first" className="transition-colors hover:text-white">
                  {footer.links.banglaMethod}
                </a>
              </li>
              <li>
                <a href="#how" className="transition-colors hover:text-white">
                  {footer.links.journey}
                </a>
              </li>
              <li>
                <a href="#privacy" className="transition-colors hover:text-white">
                  {footer.links.privacy}
                </a>
              </li>
              <li>
                <a href="#pricing" className="transition-colors hover:text-white">
                  {footer.links.pricing}
                </a>
              </li>
            </ul>
          </div>

          {/* Account & Info */}
          <div>
            <h2 className="text-[13px] font-bold text-[#f3f6ff]">
              {footer.infoTitle}
            </h2>
            <ul className="mt-3.5 space-y-2.5">
              <li>
                <a href="#faq" className="transition-colors hover:text-white">
                  {footer.links.faq}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${PLACEHOLDER_CONTACT_EMAIL}`}
                  className="transition-colors hover:text-white"
                >
                  {footer.links.contactPlaceholder}
                </a>
              </li>
              <li>
                <Link to="/login" className="transition-colors hover:text-white">
                  {footer.links.login}
                </Link>
              </li>
              <li>
                <Link to="/register" className="transition-colors hover:text-white">
                  {footer.links.createAccount}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-2 border-t border-[#b0c8ff]/[0.1] pt-6 text-[12px] text-[#7f93b5] sm:flex-row sm:items-center">
          <span>
            © {currentYear} {footer.copyrightSuffix}
          </span>
          <span>{footer.subline}</span>
        </div>
      </div>
    </footer>
  );
}
