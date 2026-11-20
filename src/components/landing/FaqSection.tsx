import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export function FaqSection() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="border-t border-slate-800/80 bg-[#0A0F1C] py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold text-[#8B5CF6]">{t.faq.kicker}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl text-balance">
            {t.faq.title}
          </h2>
        </div>

        <div className="mt-10 divide-y divide-slate-800 border-y border-slate-800">
          {t.faq.items.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={item.q} className="py-5">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 text-left cursor-pointer"
                >
                  <span className="text-base font-semibold text-slate-100">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#3B82F6]' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <p className="mt-3 pr-8 text-sm leading-relaxed text-slate-400">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
