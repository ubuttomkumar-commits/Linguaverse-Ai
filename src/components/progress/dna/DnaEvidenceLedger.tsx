import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FileSearch } from 'lucide-react';
import type {
  DnaEvidenceLedgerRecord,
  DnaObservationPoint,
} from '../../../domain/communicationDnaLabEngine';
import { useLanguage } from '../../../i18n/LanguageContext';

interface DnaEvidenceLedgerProps {
  records: DnaEvidenceLedgerRecord[];
}

type SourceFilter = 'all' | DnaObservationPoint['source'];

export function DnaEvidenceLedger({ records }: DnaEvidenceLedgerProps) {
  const { lang } = useLanguage();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const filtered = useMemo(
    () =>
      sourceFilter === 'all'
        ? records
        : records.filter((rec) => rec.source === sourceFilter),
    [records, sourceFilter]
  );

  const filterTabs: Array<{ id: SourceFilter; en: string; bn: string }> = [
    { id: 'all', en: 'All Sources', bn: 'সব উৎস' },
    { id: 'diagnostic', en: 'Diagnostic', bn: 'ডায়াগনস্টিক' },
    { id: 'academy', en: 'Academy', bn: 'একাডেমি' },
    { id: 'speaking', en: 'Speaking Studio', bn: 'স্পিকিং' },
    { id: 'mistake_drill', en: 'Mistake Drills', bn: 'মিস্টেক ড্রিল' },
    { id: 'transfer_lab', en: 'Transfer Lab', bn: 'ট্রান্সফার ল্যাব' },
  ];

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  return (
    <section
      aria-label={
        lang === 'bn'
          ? 'যাচাইযোগ্য মূল্যায়ন প্রমাণের খতিয়ান'
          : 'Traceable Assessment Evidence Ledger'
      }
      className="rounded-2xl border border-slate-800/90 bg-[#0A1334]/95 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <p className="text-xs font-medium text-cyan-300">
            {lang === 'bn' ? 'স্বচ্ছতা ও অডিটযোগ্যতা' : 'Evidence Traceability'}
          </p>
          <h2 className="font-portal mt-1 text-lg font-bold text-white">
            {lang === 'bn'
              ? 'সাপোর্টিং অ্যাসেসমেন্ট রেকর্ডস লেজার'
              : 'Supporting Assessment Records Ledger'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {lang === 'bn'
              ? 'আপনার Communication DNA-র প্রতিটি স্কোর নিচের বাস্তব সংরক্ষিত সেশনগুলো থেকে গণনা করা হয়েছে।'
              : 'Every Communication DNA score traces directly to these recorded assessments with dates, sample counts, and scope limitations.'}
          </p>
        </div>

        <span className="font-mono text-xs text-slate-400 tabular-nums">
          {filtered.length}{' '}
          {lang === 'bn' ? 'টি রেকর্ড' : filtered.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Interactive Source Filter Controls */}
      <div
        role="group"
        aria-label={lang === 'bn' ? 'উৎস অনুযায়ী ফিল্টার' : 'Filter evidence by source'}
        className="mt-4 flex flex-wrap gap-1.5"
      >
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSourceFilter(tab.id)}
            aria-pressed={sourceFilter === tab.id}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              sourceFilter === tab.id
                ? 'bg-[#2864FF] text-white'
                : 'border border-slate-800 bg-[#060C24] text-slate-400 hover:text-white'
            }`}
          >
            {lang === 'bn' ? tab.bn : tab.en}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-5 rounded-xl border border-slate-800/80 bg-[#060C24] p-6 text-center">
          <FileSearch className="mx-auto h-5 w-5 text-slate-500" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-white">
            {records.length === 0
              ? lang === 'bn'
                ? 'এখনো কোনো মূল্যায়ন রেকর্ড জমা পড়েনি'
                : 'No assessment records recorded yet'
              : lang === 'bn'
                ? 'এই ফিল্টারে কোনো রেকর্ড পাওয়া যায়নি'
                : 'No assessment records match this source filter'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
            {lang === 'bn'
              ? '৫-দক্ষতার প্রাথমিক মূল্যায়ন, একাডেমি লেসন বা স্পিকিং স্টুডিও সেশন সম্পন্ন করলে এখানে প্রতিটি প্রমাণ সংরক্ষিত হবে।'
              : 'Complete the 5-Skill Assessment, an Academy lesson, or a Speaking Studio session to build traceable evidence.'}
          </p>
          {records.length === 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/diagnostic"
                className="lv-portal-btn rounded-xl px-4 py-2 text-xs font-semibold text-white whitespace-nowrap"
              >
                {lang === 'bn' ? 'প্রাথমিক মূল্যায়ন শুরু করুন' : 'Start 5-Skill Assessment'}
              </Link>
              <Link
                to="/app/learn"
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400/50 hover:text-white whitespace-nowrap"
              >
                {lang === 'bn' ? 'একাডেমি খুলুন' : 'Open Academy'}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 pr-4 font-medium">
                  {lang === 'bn' ? 'তারিখ ও উৎস' : 'Date & Source'}
                </th>
                <th className="py-2.5 pr-4 font-medium">
                  {lang === 'bn' ? 'মূল্যায়ন ও পরিমাপকৃত দক্ষতা' : 'Assessment & Skills'}
                </th>
                <th className="py-2.5 pr-4 text-right font-medium">
                  {lang === 'bn' ? 'নমুনা' : 'Samples'}
                </th>
                <th className="py-2.5 pr-4 font-medium">
                  {lang === 'bn' ? 'ফলাফল ও সীমাবদ্ধতা' : 'Outcome & Scope Note'}
                </th>
                <th className="py-2.5 text-right font-medium">
                  {lang === 'bn' ? 'দেখুন' : 'Inspect'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filtered.slice(0, 14).map((rec) => (
                <tr key={rec.id} className="align-top text-slate-200 hover:bg-[#0D173D]/60">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <p className="font-mono text-xs text-slate-200 tabular-nums">
                      {formatDate(rec.assessmentDate)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-cyan-300">
                      {lang === 'bn' ? rec.sourceLabelBn : rec.sourceLabelEn}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-white">
                      {lang === 'bn' ? rec.titleBn : rec.titleEn}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {rec.skillsEvaluated.map((s) => s.replace(/_/g, ' ')).join(' · ')}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono font-semibold text-slate-200 tabular-nums">
                    {rec.sampleCount}
                  </td>
                  <td className="py-3 pr-4 max-w-xs">
                    <p className="font-medium text-slate-200">
                      {lang === 'bn' ? rec.scoreSummaryBn : rec.scoreSummaryEn}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                      {lang === 'bn' ? rec.limitationBn : rec.limitationEn}
                    </p>
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <Link
                      to={rec.routeTo}
                      className="inline-flex items-center gap-1 font-semibold text-[#00D9FF] hover:text-cyan-200"
                    >
                      <span>{lang === 'bn' ? 'খুলুন' : 'Open'}</span>
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
