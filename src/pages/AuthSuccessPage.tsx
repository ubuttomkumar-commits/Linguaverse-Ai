import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { AuthPortalLayout } from '../components/auth/AuthPortalLayout';

export function AuthSuccessPage() {
  const { lang } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefersReduced = useReducedMotion();

  const flow = searchParams.get('flow') || 'login';
  const revokedCount = Number(searchParams.get('revoked') || '0');
  const [secondsLeft, setSecondsLeft] = useState(flow === 'password-reset' ? 0 : 4);

  const destination =
    flow === 'password-reset'
      ? '/login'
      : !user
        ? '/login'
        : profile && !profile.onboardingCompleted
          ? '/onboarding'
          : '/app';

  useEffect(() => {
    if (flow === 'password-reset' || secondsLeft <= 0) return;
    const id = window.setTimeout(() => {
      if (secondsLeft === 1) {
        navigate(destination, { replace: true });
      } else {
        setSecondsLeft((prev) => prev - 1);
      }
    }, 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft, flow, destination, navigate]);

  const titleEn =
    flow === 'password-reset'
      ? 'Password Reset Complete!'
      : flow === 'verified'
        ? 'Email Verified!'
        : 'Welcome to LINGUAVERSE AI!';

  const titleBn =
    flow === 'password-reset'
      ? 'পাসওয়ার্ড সফলভাবে আপডেট হয়েছে!'
      : flow === 'verified'
        ? 'ইমেইল যাচাই সম্পন্ন!'
        : 'LINGUAVERSE AI-তে স্বাগতম!';

  const bodyEn =
    flow === 'password-reset'
      ? `Your new password is active and ${
          revokedCount > 0 ? `${revokedCount} prior session(s) have` : 'all prior sessions have'
        } been securely signed out. Sign in with your updated credentials.`
      : flow === 'verified'
        ? 'Your identity is verified and your personal AI communication workspace is ready.'
        : 'Authentication verified. Stepping into your personalized LINGUAVERSE AI workspace.';

  const bodyBn =
    flow === 'password-reset'
      ? 'আপনার নতুন পাসওয়ার্ড সক্রিয় হয়েছে এবং পূর্বের সকল সেশন নিরাপদে সাইন আউট করা হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'
      : flow === 'verified'
        ? 'আপনার ইমেইল যাচাই সফল হয়েছে এবং আপনার ব্যক্তিগত AI স্পিকিং ওয়ার্কস্পেস প্রস্তুত।'
        : 'অথেনটিকেশন সম্পন্ন হয়েছে। এখন আপনার ব্যক্তিগত LINGUAVERSE AI ওয়ার্কস্পেসে প্রবেশ করুন।';

  const ctaLabelEn =
    flow === 'password-reset'
      ? 'Back to Login'
      : destination === '/onboarding'
        ? 'Start Quick Onboarding'
        : 'Enter Workspace';

  const ctaLabelBn =
    flow === 'password-reset'
      ? 'লগইনে ফিরে যান'
      : destination === '/onboarding'
        ? 'অনবোর্ডিং শুরু করুন'
        : 'ওয়ার্কস্পেসে প্রবেশ করুন';

  return (
    <AuthPortalLayout
      sceneVariant={flow === 'password-reset' ? 'reset-password' : 'recovery-success'}
      showCardBrandHeader={false}
      portalState="success"
      portalHeadlineEn={
        flow === 'password-reset' ? 'Security Updated' : 'You Are Ready to Speak'
      }
      portalHeadlineBn={
        flow === 'password-reset' ? 'নিরাপত্তা আপডেট হয়েছে' : 'আপনি এখন শুরু করতে প্রস্তুত'
      }
      portalDescriptionEn="Your session is protected and connected to voice-first AI speaking practice, Mistake Memory, and measurable fluency."
      portalDescriptionBn="আপনার সেশন সুরক্ষিত এবং ভয়েস-ফার্স্ট স্পিকিং অনুশীলন, মিস্টেক মেমোরি ও অগ্রগতি ট্র্যাকিংয়ের জন্য প্রস্তুত।"
    >
      <div className="flex flex-col items-center py-4 text-center">
        <motion.div
          initial={prefersReduced ? false : { scale: 0.78, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex h-18 w-18 items-center justify-center rounded-full border-2 border-[#16E58B] bg-[radial-gradient(circle,rgba(22,229,139,0.24),rgba(0,217,255,0.1))] text-[#16E58B] shadow-[0_0_38px_rgba(22,229,139,0.36)]"
        >
          <Check className="h-9 w-9 stroke-[2.8]" aria-hidden="true" />
        </motion.div>

        <h1 className="font-portal mt-6 text-2xl font-bold tracking-tight text-white">
          {lang === 'bn' ? titleBn : titleEn}
        </h1>
        <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-slate-300">
          {lang === 'bn' ? bodyBn : bodyEn}
        </p>

        {user && flow !== 'password-reset' && (
          <div className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-[#7DD3FC]">
            <ShieldCheck className="h-4 w-4 text-[#16E58B]" aria-hidden="true" />
            <span>
              {user.name} · {user.email}
            </span>
          </div>
        )}

        <Link
          to={destination}
          replace
          className="lv-portal-btn-violet mt-7 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white"
        >
          <span>{lang === 'bn' ? ctaLabelBn : ctaLabelEn}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>

        {flow !== 'password-reset' && secondsLeft > 0 && (
          <p className="mt-3 text-xs text-slate-400 tabular-nums">
            {lang === 'bn'
              ? `${secondsLeft} সেকেন্ডের মধ্যে স্বয়ংক্রিয়ভাবে প্রবেশ করা হবে...`
              : `Entering automatically in ${secondsLeft}s...`}
          </p>
        )}
      </div>
    </AuthPortalLayout>
  );
}
