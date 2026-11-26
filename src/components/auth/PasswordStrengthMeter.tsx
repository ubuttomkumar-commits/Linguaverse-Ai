import { Check, Circle } from 'lucide-react';
import { evaluatePasswordStrength } from '../../domain/authSecurityEngine';
import { useLanguage } from '../../i18n/LanguageContext';

interface PasswordStrengthMeterProps {
  password: string;
  variant?: 'bar-only' | 'full';
}

const SEGMENT_GRADIENTS: Record<number, string> = {
  1: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.45)]',
  2: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]',
  3: 'bg-[#00D9FF] shadow-[0_0_10px_rgba(0,217,255,0.45)]',
  4: 'bg-[#16E58B] shadow-[0_0_12px_rgba(22,229,139,0.5)]',
};

const LABEL_COLORS: Record<number, string> = {
  0: 'text-slate-400',
  1: 'text-rose-300',
  2: 'text-amber-300',
  3: 'text-[#7DD3FC]',
  4: 'text-[#16E58B]',
};

export function PasswordStrengthMeter({
  password,
  variant = 'full',
}: PasswordStrengthMeterProps) {
  const { lang } = useLanguage();
  const report = evaluatePasswordStrength(password);

  return (
    <div className="mt-2.5 space-y-2" aria-live="polite">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-300">
          {lang === 'bn' ? 'পাসওয়ার্ডের শক্তি:' : 'Password Strength:'}
        </span>
        <span className={`font-semibold ${LABEL_COLORS[report.score]}`}>
          {lang === 'bn' ? report.labelBn : report.labelEn}
        </span>
      </div>

      {/* 4-segment glowing strength bar */}
      <div
        className="grid grid-cols-4 gap-1.5"
        role="progressbar"
        aria-valuenow={report.score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-label="Password strength score"
      >
        {[1, 2, 3, 4].map((step) => {
          const active = report.score >= step;
          return (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                active ? SEGMENT_GRADIENTS[report.score] : 'bg-slate-800/90'
              }`}
            />
          );
        })}
      </div>

      {/* Glowing green checkmark requirements list */}
      {variant === 'full' && (
        <ul className="space-y-1.5 pt-1">
          {report.criteria.slice(0, 4).map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-2 text-xs transition-colors ${
                item.met ? 'text-slate-100' : 'text-slate-400'
              }`}
            >
              {item.met ? (
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#16E58B] text-[#04101D] shadow-[0_0_10px_rgba(22,229,139,0.5)]">
                  <Check className="h-2.5 w-2.5 stroke-[3]" aria-hidden="true" />
                </span>
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
              )}
              <span>{lang === 'bn' ? item.labelBn : item.labelEn}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
