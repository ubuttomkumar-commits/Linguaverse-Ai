import { useState } from 'react';
import { ArrowRight, Check, Minus } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SUPPLIED_LANDING_COPY } from '../../domain/suppliedLandingCopy';
import { RevealSection } from './RevealSection';

export function LandingStorySections() {
  const { lang } = useLanguage();
  const { problem, transformation } = SUPPLIED_LANDING_COPY[lang];
  const [selectedId, setSelectedId] = useState(problem.chapters[0].id);

  const activeChapter =
    problem.chapters.find((c) => c.id === selectedId) ?? problem.chapters[0];

  return (
    <>
      {/* SECTION B — THE REAL PROBLEM (Interactive Visual Storytelling Explorer) */}
      <section
        id="problem"
        className="border-t border-[#b0c8ff]/[0.08] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <RevealSection>
            <div className="max-w-2xl">
              <p className="text-[13px] font-semibold text-[#6da5ff]">
                {problem.kicker}
              </p>
              <h2 className="font-display mt-3 text-[30px] font-extrabold leading-[1.14] tracking-[-0.03em] text-[#f3f6ff] sm:text-[42px] text-balance">
                {problem.title}
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-[#a8b6d1]">
                {problem.lead}
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
              {/* Interactive Friction Selector List */}
              <div
                role="tablist"
                aria-label={problem.kicker}
                className="flex flex-col divide-y divide-[#b0c8ff]/[0.1] border-y border-[#b0c8ff]/[0.1] lg:col-span-5"
              >
                {problem.chapters.map((chapter) => {
                  const isActive = chapter.id === activeChapter.id;
                  return (
                    <button
                      key={chapter.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`problem-panel-${chapter.id}`}
                      id={`problem-tab-${chapter.id}`}
                      onClick={() => setSelectedId(chapter.id)}
                      className={`group flex w-full cursor-pointer items-start gap-3.5 px-3 py-4 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f8bff] ${
                        isActive
                          ? 'bg-[#101c36]/90 text-white'
                          : 'text-[#a8b6d1] hover:bg-[#0c1427] hover:text-[#f3f6ff]'
                      }`}
                    >
                      <span
                        className={`font-mono tabular-nums mt-0.5 text-[13px] font-semibold ${
                          isActive ? 'text-[#38bdf8]' : 'text-[#6c7fa3]'
                        }`}
                      >
                        {chapter.index}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold leading-snug text-inherit">
                          {chapter.title}
                        </span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-[#94a6c7]">
                          {chapter.shortDesc}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Storytelling Stage */}
              <div
                role="tabpanel"
                id={`problem-panel-${activeChapter.id}`}
                aria-labelledby={`problem-tab-${activeChapter.id}`}
                className="rounded-[20px] border border-[#b0c8ff]/[0.14] bg-[#0d1528] p-6 sm:p-8 lg:col-span-7"
              >
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#89b5ff]">
                  <span className="font-mono tabular-nums">{activeChapter.index}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeChapter.title}</span>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <h3 className="text-[13px] font-semibold text-[#9fb1d1]">
                      {problem.mindLabel}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[#d7e2f7]">
                      {activeChapter.mindLoop}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-[13px] font-semibold text-[#38bdf8]">
                      {problem.responseLabel}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[#f3f6ff]">
                      {activeChapter.platformResponse}
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4 border-t border-[#b0c8ff]/[0.12] pt-6 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div>
                    <p className="text-[12px] font-semibold text-[#91a3c4]">
                      {problem.stuckLabel}
                    </p>
                    <p className="mt-1.5 text-[14px] font-medium leading-relaxed text-[#cbd6ec]">
                      {activeChapter.exampleThought}
                    </p>
                  </div>

                  <div
                    aria-hidden="true"
                    className="hidden text-[#4f8bff] sm:flex sm:justify-center"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-[12px] font-semibold text-[#34d399]">
                      {problem.shiftLabel}
                    </p>
                    <p className="mt-1.5 text-[14px] font-semibold leading-relaxed text-[#d8faec]">
                      {activeChapter.exampleBreakthrough}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* SECTION C — THE TRANSFORMATION (Before vs. With Consistent Practice) */}
      <section
        id="transformation"
        className="border-t border-[#b0c8ff]/[0.08] bg-[#080f20] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <RevealSection>
            <div className="max-w-2xl">
              <p className="text-[13px] font-semibold text-[#6da5ff]">
                {transformation.kicker}
              </p>
              <h2 className="font-display mt-3 text-[30px] font-extrabold leading-[1.14] tracking-[-0.03em] text-[#f3f6ff] sm:text-[42px] text-balance">
                {transformation.title}
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-[#a8b6d1]">
                {transformation.lead}
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Before Column */}
              <div className="rounded-[20px] border border-[#b0c8ff]/[0.12] bg-[#0c1324] p-7 sm:p-8">
                <p className="text-[13px] font-semibold text-[#94a6c7]">
                  {transformation.beforeTitle}
                </p>
                <h3 className="mt-1.5 text-[20px] font-bold text-[#e2eaf9]">
                  {transformation.beforeSubtitle}
                </h3>
                <ul className="mt-6 space-y-4">
                  {transformation.beforePoints.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-[15px] leading-relaxed text-[#a8b6d1]"
                    >
                      <Minus
                        className="mt-1 h-4 w-4 shrink-0 text-[#6e81a6]"
                        aria-hidden="true"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* After Column */}
              <div className="rounded-[20px] border border-[#4f8bff]/35 bg-gradient-to-br from-[#101e3b] to-[#0b152a] p-7 sm:p-8">
                <p className="text-[13px] font-semibold text-[#38bdf8]">
                  {transformation.afterTitle}
                </p>
                <h3 className="mt-1.5 text-[20px] font-bold text-[#f3f6ff]">
                  {transformation.afterSubtitle}
                </h3>
                <ul className="mt-6 space-y-4">
                  {transformation.afterPoints.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-[15px] leading-relaxed text-[#e6eeff]"
                    >
                      <Check
                        className="mt-1 h-4 w-4 shrink-0 text-[#34d399]"
                        aria-hidden="true"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-5 text-[13px] text-[#8d9fbe]">
              {transformation.honestyDisclaimer}
            </p>
          </RevealSection>
        </div>
      </section>
    </>
  );
}
