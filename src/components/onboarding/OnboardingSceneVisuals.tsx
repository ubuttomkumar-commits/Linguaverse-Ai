import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export type OnboardingSceneVariant =
  | 'welcome'
  | 'languages'
  | 'goals'
  | 'microphone'
  | 'assessment';

interface OnboardingSceneVisualsProps {
  variant: OnboardingSceneVariant;
  compact?: boolean;
  micActive?: boolean;
}

function PedestalBase({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-ped`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#7C3AED" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#05091F" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="220" cy="296" rx="138" ry="26" fill={`url(#${uid}-ped)`} />
      <ellipse cx="220" cy="296" rx="112" ry="18" fill="none" stroke="#00D9FF" strokeOpacity="0.55" strokeWidth="1.5" />
      <ellipse cx="220" cy="296" rx="76" ry="11" fill="none" stroke="#A855F7" strokeOpacity="0.65" strokeWidth="1.4" />
      <ellipse cx="220" cy="296" rx="40" ry="5.5" fill="none" stroke="#38BDF8" strokeOpacity="0.8" strokeWidth="1.2" />
    </g>
  );
}

function WelcomeOrbScene({ uid, reduced }: { uid: string; reduced: boolean }) {
  return (
    <svg
      viewBox="0 0 440 340"
      className="h-full w-full overflow-visible select-none"
      role="img"
      aria-label="Animated 3D LINGUAVERSE AI communication orb surrounded by floating multilingual language symbols"
    >
      <defs>
        <radialGradient id={`${uid}-orb-core`} cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#3B82F6" stopOpacity="0.82" />
          <stop offset="78%" stopColor="#6D28D9" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
        </radialGradient>
        <radialGradient id={`${uid}-orb-halo`} cx="50%" cy="46%" r="50%">
          <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.42" />
          <stop offset="52%" stopColor="#7C3AED" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#05091F" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-ring-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="55%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#E42BFF" />
        </linearGradient>
        <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="220" cy="158" r="154" fill={`url(#${uid}-orb-halo)`} />
      <PedestalBase uid={uid} />

      {/* Outer Tilted Orbital Energy Rings */}
      <g transform="translate(220 160) rotate(-18)">
        <ellipse
          cx="0"
          cy="0"
          rx="142"
          ry="44"
          fill="none"
          stroke={`url(#${uid}-ring-grad)`}
          strokeWidth="2.4"
          strokeOpacity="0.82"
        />
      </g>
      <g transform="translate(220 160) rotate(22)">
        <ellipse
          cx="0"
          cy="0"
          rx="126"
          ry="34"
          fill="none"
          stroke="#00E5FF"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          strokeOpacity="0.65"
        />
      </g>

      {/* Main 3D LV Communication Orb */}
      <g className={reduced ? '' : 'lv-holo-float'} filter={`url(#${uid}-glow)`}>
        <circle
          cx="220"
          cy="158"
          r="84"
          fill={`url(#${uid}-orb-core)`}
          stroke="#7DD3FC"
          strokeWidth="2.4"
        />
        {/* Latitude & Longitude Holographic Wireframe */}
        <ellipse cx="220" cy="158" rx="84" ry="28" fill="none" stroke="#E0F2FE" strokeOpacity="0.3" strokeWidth="1.2" />
        <ellipse cx="220" cy="158" rx="44" ry="84" fill="none" stroke="#E0F2FE" strokeOpacity="0.26" strokeWidth="1.2" />
        <line x1="136" y1="158" x2="304" y2="158" stroke="#00E5FF" strokeOpacity="0.35" strokeWidth="1" />
        <circle cx="220" cy="158" r="68" fill="none" stroke="#C4B5FD" strokeOpacity="0.32" strokeWidth="1" />
        {/* Luminous LV Monogram */}
        <text
          x="220"
          y="174"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="48"
          fontWeight="800"
          letterSpacing="2"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          LV
        </text>
      </g>

      {/* Floating Multilingual Script Tiles */}
      <g className={reduced ? '' : 'lv-float-slow'}>
        <g transform="translate(66 64) rotate(-10)">
          <rect width="46" height="46" rx="12" fill="rgba(14, 27, 74, 0.84)" stroke="#38BDF8" strokeWidth="1.6" />
          <text x="23" y="30" textAnchor="middle" fill="#E0F2FE" fontSize="18" fontWeight="700">Aa</text>
        </g>
        <g transform="translate(330 62) rotate(11)">
          <rect width="46" height="46" rx="12" fill="rgba(46, 16, 101, 0.84)" stroke="#C084FC" strokeWidth="1.6" />
          <text x="23" y="30" textAnchor="middle" fill="#F3E8FF" fontSize="20" fontWeight="700">অ</text>
        </g>
        <g transform="translate(54 206) rotate(8)">
          <rect width="44" height="44" rx="11" fill="rgba(14, 27, 74, 0.84)" stroke="#00D9FF" strokeWidth="1.5" />
          <text x="22" y="29" textAnchor="middle" fill="#BAE6FD" fontSize="18" fontWeight="700">あ</text>
        </g>
        <g transform="translate(340 202) rotate(-9)">
          <rect width="44" height="44" rx="11" fill="rgba(46, 16, 101, 0.84)" stroke="#E42BFF" strokeWidth="1.5" />
          <text x="22" y="29" textAnchor="middle" fill="#FAE8FF" fontSize="18" fontWeight="700">Ñ</text>
        </g>
      </g>

      {/* Ambient Particles */}
      <g opacity="0.85">
        <circle cx="122" cy="48" r="3" fill="#00E5FF" />
        <circle cx="318" cy="144" r="2.6" fill="#E42BFF" />
        <circle cx="114" cy="258" r="2.4" fill="#A855F7" />
        <circle cx="310" cy="264" r="3" fill="#38BDF8" />
      </g>
    </svg>
  );
}

function LanguageBridgeScene({ uid, reduced }: { uid: string; reduced: boolean }) {
  return (
    <svg
      viewBox="0 0 440 340"
      className="h-full w-full overflow-visible select-none"
      role="img"
      aria-label="Holographic dual-language neural bridge connecting native language to target English fluency"
    >
      <defs>
        <linearGradient id={`${uid}-bridge-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id={`${uid}-bridge-b`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#E42BFF" />
        </linearGradient>
        <filter id={`${uid}-bridge-glow`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="4.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <PedestalBase uid={uid} />

      {/* Connecting Neural Arcs */}
      <path
        d="M 136 146 C 180 86, 260 86, 304 146"
        fill="none"
        stroke={`url(#${uid}-bridge-a)`}
        strokeWidth="3"
        strokeDasharray="6 5"
      />
      <path
        d="M 136 184 C 180 236, 260 236, 304 184"
        fill="none"
        stroke={`url(#${uid}-bridge-b)`}
        strokeWidth="2.6"
        strokeOpacity="0.8"
      />

      {/* Left Node: Native Script */}
      <g className={reduced ? '' : 'lv-holo-float'} filter={`url(#${uid}-bridge-glow)`}>
        <circle cx="122" cy="164" r="56" fill="rgba(12, 26, 70, 0.9)" stroke={`url(#${uid}-bridge-a)`} strokeWidth="3" />
        <text x="122" y="176" textAnchor="middle" fill="#E0F2FE" fontSize="34" fontWeight="700">অ</text>
      </g>

      {/* Center AI Translator Core */}
      <g filter={`url(#${uid}-bridge-glow)`}>
        <circle cx="220" cy="164" r="28" fill="rgba(16, 24, 64, 0.95)" stroke="#00E5FF" strokeWidth="2.2" />
        <text x="220" y="171" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="800">LV</text>
      </g>

      {/* Right Node: Target Script */}
      <g className={reduced ? '' : 'lv-float-slow'} filter={`url(#${uid}-bridge-glow)`}>
        <circle cx="318" cy="164" r="56" fill="rgba(34, 15, 78, 0.9)" stroke={`url(#${uid}-bridge-b)`} strokeWidth="3" />
        <text x="318" y="175" textAnchor="middle" fill="#FFFFFF" fontSize="30" fontWeight="800">EN</text>
      </g>
    </svg>
  );
}

function GoalsCompassScene({ uid, reduced }: { uid: string; reduced: boolean }) {
  return (
    <svg
      viewBox="0 0 440 340"
      className="h-full w-full overflow-visible select-none"
      role="img"
      aria-label="Holographic 3D learning compass showing personalized communication goals and daily progress rings"
    >
      <defs>
        <linearGradient id={`${uid}-goal-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#E42BFF" />
        </linearGradient>
        <radialGradient id={`${uid}-goal-halo`} cx="50%" cy="46%" r="48%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#05091F" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-goal-glow`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="220" cy="156" r="144" fill={`url(#${uid}-goal-halo)`} />
      <PedestalBase uid={uid} />

      <g className={reduced ? '' : 'lv-holo-float'} filter={`url(#${uid}-goal-glow)`}>
        <circle cx="220" cy="156" r="88" fill="rgba(10, 19, 54, 0.78)" stroke={`url(#${uid}-goal-ring)`} strokeWidth="3" />
        <circle cx="220" cy="156" r="58" fill="none" stroke="#38BDF8" strokeOpacity="0.55" strokeWidth="1.8" strokeDasharray="5 5" />
        <circle cx="220" cy="156" r="26" fill="rgba(0, 217, 255, 0.18)" stroke="#00E5FF" strokeWidth="2.2" />
        {/* Compass Star */}
        <polygon
          points="220,82 232,144 294,156 232,168 220,230 208,168 146,156 208,144"
          fill="rgba(124, 58, 237, 0.35)"
          stroke="#E0F2FE"
          strokeWidth="1.6"
        />
        <circle cx="220" cy="156" r="7" fill="#00E5FF" />
      </g>

      {/* Satellite Target Nodes */}
      <g className={reduced ? '' : 'lv-float-slow'}>
        <circle cx="102" cy="96" r="14" fill="rgba(14, 27, 74, 0.9)" stroke="#00E5FF" strokeWidth="2" />
        <circle cx="340" cy="100" r="16" fill="rgba(46, 16, 101, 0.9)" stroke="#C084FC" strokeWidth="2" />
        <circle cx="332" cy="222" r="12" fill="rgba(14, 27, 74, 0.9)" stroke="#16E58B" strokeWidth="2" />
        <circle cx="108" cy="220" r="12" fill="rgba(46, 16, 101, 0.9)" stroke="#E42BFF" strokeWidth="2" />
      </g>
    </svg>
  );
}

function MicrophoneWaveScene({
  uid,
  reduced,
  micActive,
}: {
  uid: string;
  reduced: boolean;
  micActive?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 440 340"
      className="h-full w-full overflow-visible select-none"
      role="img"
      aria-label="Holographic 3D microphone and soundwave rings for speaking and listening setup"
    >
      <defs>
        <linearGradient id={`${uid}-mic-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={micActive ? '#16E58B' : '#00E5FF'} />
          <stop offset="55%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
        <filter id={`${uid}-mic-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <PedestalBase uid={uid} />

      {/* Concentric Soundwave Rings */}
      <circle
        cx="220"
        cy="148"
        r="118"
        fill="none"
        stroke={micActive ? '#16E58B' : '#00D9FF'}
        strokeOpacity="0.26"
        strokeWidth="1.6"
        strokeDasharray="8 6"
      />
      <circle
        cx="220"
        cy="148"
        r="90"
        fill="none"
        stroke="#8B5CF6"
        strokeOpacity="0.45"
        strokeWidth="2"
      />

      {/* Glowing 3D Capsule Microphone */}
      <g className={reduced ? '' : 'lv-holo-float'} filter={`url(#${uid}-mic-glow)`}>
        <rect
          x="184"
          y="74"
          width="72"
          height="114"
          rx="36"
          fill={`url(#${uid}-mic-grad)`}
          stroke="#E0F2FE"
          strokeWidth="2.8"
        />
        <line x1="202" y1="108" x2="238" y2="108" stroke="#E0F2FE" strokeOpacity="0.65" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="202" y1="126" x2="238" y2="126" stroke="#E0F2FE" strokeOpacity="0.65" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="202" y1="144" x2="238" y2="144" stroke="#E0F2FE" strokeOpacity="0.65" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M 164 156 C 164 196, 189 216, 220 216 C 251 216, 276 196, 276 156"
          fill="none"
          stroke="#7DD3FC"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line x1="220" y1="216" x2="220" y2="250" stroke="#7DD3FC" strokeWidth="4" strokeLinecap="round" />
        <line x1="188" y1="250" x2="252" y2="250" stroke="#00E5FF" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* Left & Right Soundwave Bars */}
      <g stroke={micActive ? '#16E58B' : '#00E5FF'} strokeWidth="4" strokeLinecap="round" opacity="0.85">
        <line x1="92" y1="138" x2="92" y2="162" />
        <line x1="108" y1="122" x2="108" y2="178" />
        <line x1="124" y1="132" x2="124" y2="168" />
        <line x1="316" y1="132" x2="316" y2="168" />
        <line x1="332" y1="122" x2="332" y2="178" />
        <line x1="348" y1="138" x2="348" y2="162" />
      </g>
    </svg>
  );
}

function AssessmentCrystalScene({ uid, reduced }: { uid: string; reduced: boolean }) {
  return (
    <svg
      viewBox="0 0 440 340"
      className="h-full w-full overflow-visible select-none"
      role="img"
      aria-label="Holographic 5-skill AI diagnostic pentagon representing Vocabulary, Grammar, Reading, Listening, and Speaking"
    >
      <defs>
        <linearGradient id={`${uid}-assess-fill`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#6366F1" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#E42BFF" stopOpacity="0.52" />
        </linearGradient>
        <filter id={`${uid}-assess-glow`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <PedestalBase uid={uid} />

      <g className={reduced ? '' : 'lv-holo-float'} filter={`url(#${uid}-assess-glow)`}>
        {/* Outer & Inner 5-Axis Holographic Pentagon */}
        <polygon
          points="220,56 322,130 283,248 157,248 118,130"
          fill="rgba(10, 19, 54, 0.72)"
          stroke="#38BDF8"
          strokeWidth="2.2"
          strokeOpacity="0.7"
        />
        <polygon
          points="220,90 290,141 263,222 177,222 150,141"
          fill={`url(#${uid}-assess-fill)`}
          stroke="#E0F2FE"
          strokeWidth="2"
        />
        <circle cx="220" cy="162" r="24" fill="#0B1437" stroke="#00E5FF" strokeWidth="2.2" />
        <text x="220" y="168" textAnchor="middle" fill="#FFFFFF" fontSize="15" fontWeight="800">5</text>

        {/* Five Skill Vertex Nodes */}
        <circle cx="220" cy="56" r="7" fill="#00E5FF" />
        <circle cx="322" cy="130" r="7" fill="#38BDF8" />
        <circle cx="283" cy="248" r="7" fill="#A855F7" />
        <circle cx="157" cy="248" r="7" fill="#E42BFF" />
        <circle cx="118" cy="130" r="7" fill="#16E58B" />
      </g>
    </svg>
  );
}

export function OnboardingSceneVisuals({
  variant,
  compact = false,
  micActive = false,
}: OnboardingSceneVisualsProps) {
  const prefersReduced = Boolean(useReducedMotion());
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');

  const scene = (() => {
    switch (variant) {
      case 'welcome':
        return <WelcomeOrbScene uid={uid} reduced={prefersReduced} />;
      case 'languages':
        return <LanguageBridgeScene uid={uid} reduced={prefersReduced} />;
      case 'goals':
        return <GoalsCompassScene uid={uid} reduced={prefersReduced} />;
      case 'microphone':
        return <MicrophoneWaveScene uid={uid} reduced={prefersReduced} micActive={micActive} />;
      case 'assessment':
        return <AssessmentCrystalScene uid={uid} reduced={prefersReduced} />;
    }
  })();

  return (
    <motion.div
      data-testid={`onboarding-3d-scene-${variant}`}
      initial={prefersReduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      className={
        compact
          ? 'mx-auto h-[154px] w-[205px]'
          : 'mx-auto h-[300px] w-full max-w-[400px] lg:h-[340px] lg:max-w-[430px]'
      }
    >
      {scene}
    </motion.div>
  );
}
