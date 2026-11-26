import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { PortalVisualState } from './PortalFallbackVisual';

export type AuthSceneVariant =
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'verify-email'
  | 'reset-password'
  | 'recovery-success';

interface AuthSceneIllustrationsProps {
  variant: AuthSceneVariant;
  portalState?: PortalVisualState;
  compact?: boolean;
}

function getAccentFilter(portalState: PortalVisualState): string {
  if (portalState === 'error') return 'hue-rotate(130deg) saturate(1.15)';
  if (portalState === 'success') return 'brightness(1.1) saturate(1.15)';
  if (portalState === 'focused') return 'brightness(1.06)';
  return 'none';
}

/** Shared concentric holographic cyber-pedestal & orbital energy base */
function CyberPedestal({ idPrefix }: { idPrefix: string }) {
  return (
    <g>
      <defs>
        <radialGradient id={`${idPrefix}-ped-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.65" />
          <stop offset="52%" stopColor="#4F46E5" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#05091F" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${idPrefix}-ped-rim`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00D9FF" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#E42BFF" />
        </linearGradient>
      </defs>
      <ellipse cx="220" cy="306" rx="145" ry="38" fill={`url(#${idPrefix}-ped-glow)`} />
      <ellipse
        cx="220"
        cy="304"
        rx="126"
        ry="28"
        fill="none"
        stroke={`url(#${idPrefix}-ped-rim)`}
        strokeWidth="2.2"
        strokeOpacity="0.72"
      />
      <ellipse
        cx="220"
        cy="301"
        rx="98"
        ry="21"
        fill="rgba(12, 24, 68, 0.72)"
        stroke="#00D9FF"
        strokeWidth="1.5"
        strokeOpacity="0.82"
      />
      <ellipse
        cx="220"
        cy="296"
        rx="74"
        ry="15"
        fill="rgba(30, 58, 138, 0.52)"
        stroke="#38BDF8"
        strokeWidth="1.6"
      />
      <ellipse
        cx="220"
        cy="294"
        rx="48"
        ry="9.5"
        fill="rgba(0, 217, 255, 0.25)"
        stroke="#7DD3FC"
        strokeWidth="1.2"
      />
    </g>
  );
}

/** Shared glowing ambient star particles */
function HologramParticles() {
  const dots = [
    { cx: 56, cy: 84, r: 2.2, fill: '#38BDF8' },
    { cx: 378, cy: 76, r: 2.5, fill: '#C084FC' },
    { cx: 82, cy: 238, r: 1.8, fill: '#00D9FF' },
    { cx: 356, cy: 224, r: 2.1, fill: '#E879F9' },
    { cx: 122, cy: 48, r: 1.7, fill: '#7DD3FC' },
    { cx: 314, cy: 52, r: 1.9, fill: '#A78BFA' },
    { cx: 392, cy: 158, r: 1.6, fill: '#38BDF8' },
    { cx: 44, cy: 168, r: 1.9, fill: '#C084FC' },
  ];
  return (
    <g className="lv-holo-pulse">
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} opacity="0.88" />
      ))}
    </g>
  );
}

/** SCREEN 01: Large 3D Holographic LV Globe + Orbital Rings + Floating Multilingual Tiles */
function LoginGlobeScene({ reduced, uid }: { reduced: boolean; uid: string }) {
  return (
    <svg
      viewBox="0 0 440 350"
      className="h-full w-full overflow-visible select-none"
      role="img"
      aria-label="3D holographic LINGUAVERSE AI globe with orbital rings and floating language symbols"
    >
      <defs>
        <radialGradient id={`${uid}-lg-sphere`} cx="38%" cy="32%" r="64%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.92" />
          <stop offset="38%" stopColor="#1D4ED8" stopOpacity="0.72" />
          <stop offset="76%" stopColor="#311B92" stopOpacity="0.84" />
          <stop offset="100%" stopColor="#080F2E" stopOpacity="0.96" />
        </radialGradient>
        <radialGradient id={`${uid}-lg-halo`} cx="50%" cy="46%" r="48%">
          <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.38" />
          <stop offset="55%" stopColor="#7C3AED" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#05091F" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-lg-ring-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#E42BFF" />
        </linearGradient>
        <linearGradient id={`${uid}-lg-lv-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38F9FF" />
          <stop offset="50%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#F43F9E" />
        </linearGradient>
        <filter id={`${uid}-lg-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="220" cy="162" r="154" fill={`url(#${uid}-lg-halo)`} />
      <CyberPedestal idPrefix={`${uid}-lg`} />
      <HologramParticles />

      {/* Back tilted orbital arcs */}
      <g transform="translate(220 164) rotate(-24)">
        <ellipse
          cx="0"
          cy="0"
          rx="156"
          ry="44"
          fill="none"
          stroke={`url(#${uid}-lg-ring-a)`}
          strokeWidth="2.4"
          strokeOpacity="0.72"
          strokeDasharray="12 6 60 8"
        />
      </g>
      <g transform="translate(220 164) rotate(21)">
        <ellipse
          cx="0"
          cy="0"
          rx="148"
          ry="38"
          fill="none"
          stroke="#00D9FF"
          strokeWidth="1.6"
          strokeOpacity="0.65"
        />
      </g>

      {/* Main 3D Holographic Globe */}
      <g className={reduced ? '' : 'lv-holo-float'}>
        <circle
          cx="220"
          cy="160"
          r="94"
          fill={`url(#${uid}-lg-sphere)`}
          stroke="#38BDF8"
          strokeWidth="2.4"
          filter={`url(#${uid}-lg-glow)`}
        />
        {/* Meridians & Parallels */}
        <g stroke="#7DD3FC" strokeOpacity="0.34" fill="none" strokeWidth="1.15">
          <ellipse cx="220" cy="160" rx="94" ry="30" />
          <ellipse cx="220" cy="160" rx="94" ry="62" />
          <ellipse cx="220" cy="160" rx="34" ry="94" />
          <ellipse cx="220" cy="160" rx="68" ry="94" />
          <line x1="126" y1="160" x2="314" y2="160" />
          <line x1="220" y1="66" x2="220" y2="254" />
        </g>

        {/* Glowing Neural Network Dots on Globe */}
        <g fill="#00E5FF" opacity="0.85">
          <circle cx="170" cy="120" r="3" />
          <circle cx="272" cy="126" r="2.8" />
          <circle cx="182" cy="202" r="2.6" />
          <circle cx="264" cy="198" r="3.2" />
          <circle cx="220" cy="96" r="2.5" />
        </g>

        {/* Luminous LV Monogram Core */}
        <g filter={`url(#${uid}-lg-glow)`}>
          <text
            x="220"
            y="181"
            textAnchor="middle"
            fontFamily="Space Grotesk, Plus Jakarta Sans, sans-serif"
            fontWeight="800"
            fontSize="66"
            letterSpacing="-2"
            fill={`url(#${uid}-lg-lv-grad)`}
            stroke="#E0F2FE"
            strokeWidth="1.2"
          >
            LV
          </text>
        </g>

        {/* Front sweeping light ribbon */}
        <path
          d="M 88 194 C 145 232, 295 224, 352 132"
          fill="none"
          stroke={`url(#${uid}-lg-ring-a)`}
          strokeWidth="3"
          strokeLinecap="round"
          filter={`url(#${uid}-lg-glow)`}
        />
      </g>

      {/* Floating Multilingual Character Tiles (Aa, あ, অ, 文) */}
      <g className={reduced ? '' : 'lv-float-slow'}>
        <g transform="translate(64 62) rotate(-14)">
          <rect
            width="46"
            height="46"
            rx="12"
            fill="rgba(15, 29, 82, 0.85)"
            stroke="#38BDF8"
            strokeWidth="1.6"
          />
          <text
            x="23"
            y="30"
            textAnchor="middle"
            fill="#E0F2FE"
            fontSize="18"
            fontWeight="700"
            fontFamily="Space Grotesk, sans-serif"
          >
            Aa
          </text>
        </g>

        <g transform="translate(324 52) rotate(12)">
          <rect
            width="46"
            height="46"
            rx="12"
            fill="rgba(45, 20, 96, 0.85)"
            stroke="#C084FC"
            strokeWidth="1.6"
          />
          <text x="23" y="31" textAnchor="middle" fill="#F3E8FF" fontSize="20" fontWeight="700">
            あ
          </text>
        </g>

        <g transform="translate(68 214) rotate(10)">
          <rect
            width="46"
            height="46"
            rx="12"
            fill="rgba(16, 26, 78, 0.86)"
            stroke="#00D9FF"
            strokeWidth="1.6"
          />
          <text
            x="23"
            y="31"
            textAnchor="middle"
            fill="#7DD3FC"
            fontSize="21"
            fontWeight="700"
            fontFamily="Hind Siliguri, sans-serif"
          >
            অ
          </text>
        </g>

        <g transform="translate(326 210) rotate(-11)">
          <rect
            width="46"
            height="46"
            rx="12"
            fill="rgba(34, 22, 88, 0.86)"
            stroke="#A855F7"
            strokeWidth="1.6"
          />
          <text x="23" y="31" textAnchor="middle" fill="#E9D5FF" fontSize="20" fontWeight="700">
            文
          </text>
        </g>
      </g>
    </svg>
  );
}

/** SCREEN 02: Friendly Futuristic 3D AI Learning Robot + Graduation Cap + Holographic LV Book */
function RegisterRobotScene({ reduced, uid }: { reduced: boolean; uid: string }) {
  return (
    <svg
      viewBox="0 0 440 350"
      className="h-full w-full overflow-visible select-none"
      role="img"
      aria-label="Friendly 3D futuristic AI learning robot holding a glowing LV book with graduation cap"
    >
      <defs>
        <linearGradient id={`${uid}-rb-armor`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="55%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <linearGradient id={`${uid}-rb-visor`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#091334" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient id={`${uid}-rb-cap`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="55%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#C026D3" />
        </linearGradient>
        <linearGradient id={`${uid}-rb-book-beam`} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-rb-halo`} cx="50%" cy="48%" r="48%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.34" />
          <stop offset="55%" stopColor="#7C3AED" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#05091F" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-rb-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="220" cy="170" r="154" fill={`url(#${uid}-rb-halo)`} />
      <CyberPedestal idPrefix={`${uid}-rb`} />
      <HologramParticles />

      {/* Floating Stars & Mini Open Book */}
      <g className={reduced ? '' : 'lv-float-slow'}>
        <path
          d="M 102 104 L 106 113 L 116 114 L 109 121 L 111 131 L 102 126 L 93 131 L 95 121 L 88 114 L 98 113 Z"
          fill="#FBBF24"
          filter={`url(#${uid}-rb-glow)`}
        />
        <path
          d="M 332 96 L 336 105 L 346 106 L 339 113 L 341 122 L 332 117 L 323 122 L 325 113 L 318 106 L 328 105 Z"
          fill="#38BDF8"
          filter={`url(#${uid}-rb-glow)`}
        />
        <path
          d="M 352 152 L 355 159 L 363 160 L 357 166 L 359 173 L 352 169 L 345 173 L 347 166 L 341 160 L 349 159 Z"
          fill="#FB923C"
          filter={`url(#${uid}-rb-glow)`}
        />
        <g transform="translate(64 170) rotate(-14)" opacity="0.92">
          <path
            d="M 0 12 Q 16 2 30 12 L 30 38 Q 16 28 0 38 Z"
            fill="rgba(56, 189, 248, 0.25)"
            stroke="#7DD3FC"
            strokeWidth="1.5"
          />
          <path
            d="M 30 12 Q 44 2 60 12 L 60 38 Q 44 28 30 38 Z"
            fill="rgba(139, 92, 246, 0.28)"
            stroke="#C4B5FD"
            strokeWidth="1.5"
          />
        </g>
      </g>

      {/* Main 3D AI Learning Robot */}
      <g className={reduced ? '' : 'lv-holo-float'}>
        <g transform="translate(220 58)" filter={`url(#${uid}-rb-glow)`}>
          <polygon points="0,-24 58,-2 0,18 -58,-2" fill={`url(#${uid}-rb-cap)`} stroke="#E0F2FE" strokeWidth="1.3" />
          <path d="M -28 8 L -28 22 Q 0 34 28 22 L 28 8" fill="rgba(76, 29, 149, 0.9)" stroke="#A78BFA" strokeWidth="1.2" />
          <line x1="48" y1="2" x2="54" y2="28" stroke="#38BDF8" strokeWidth="2.2" />
          <circle cx="54" cy="30" r="3.5" fill="#00E5FF" />
        </g>

        <rect x="148" y="128" width="16" height="44" rx="8" fill="#6366F1" stroke="#7DD3FC" strokeWidth="1.6" />
        <rect x="276" y="128" width="16" height="44" rx="8" fill="#6366F1" stroke="#7DD3FC" strokeWidth="1.6" />
        <path d="M 158 134 C 158 92, 282 92, 282 134" fill="none" stroke="#818CF8" strokeWidth="7" strokeLinecap="round" />

        <rect x="160" y="106" width="120" height="84" rx="34" fill={`url(#${uid}-rb-armor)`} stroke="#E0F2FE" strokeWidth="1.8" />
        <rect x="174" y="122" width="92" height="54" rx="22" fill={`url(#${uid}-rb-visor)`} stroke="#38BDF8" strokeWidth="1.6" />
        <ellipse cx="201" cy="146" rx="10" ry="12" fill="#00E5FF" filter={`url(#${uid}-rb-glow)`} />
        <ellipse cx="239" cy="146" rx="10" ry="12" fill="#00E5FF" filter={`url(#${uid}-rb-glow)`} />
        <circle cx="198" cy="142" r="3.5" fill="#FFFFFF" />
        <circle cx="236" cy="142" r="3.5" fill="#FFFFFF" />
        <path d="M 210 162 Q 220 170 230 162" fill="none" stroke="#38BDF8" strokeWidth="2.6" strokeLinecap="round" />

        <rect x="176" y="196" width="88" height="86" rx="26" fill={`url(#${uid}-rb-armor)`} stroke="#CBD5E1" strokeWidth="1.6" />
        <circle cx="220" cy="222" r="10" fill="#0F172A" stroke="#00D9FF" strokeWidth="2" />
        <circle cx="220" cy="222" r="4.5" fill="#00E5FF" filter={`url(#${uid}-rb-glow)`} />

        <path d="M 178 214 C 148 220, 144 252, 168 258" fill="none" stroke={`url(#${uid}-rb-armor)`} strokeWidth="18" strokeLinecap="round" />
        <path d="M 262 214 C 292 220, 296 252, 272 258" fill="none" stroke={`url(#${uid}-rb-armor)`} strokeWidth="18" strokeLinecap="round" />

        <polygon points="154,230 286,230 318,162 122,162" fill={`url(#${uid}-rb-book-beam)`} opacity="0.55" />

        <g transform="translate(150 222)" filter={`url(#${uid}-rb-glow)`}>
          <path
            d="M 0 12 Q 36 -8 70 16 L 70 68 Q 36 48 0 64 Z"
            fill="rgba(15, 36, 98, 0.94)"
            stroke="#00E5FF"
            strokeWidth="2.2"
          />
          <path
            d="M 70 16 Q 104 -8 140 12 L 140 64 Q 104 48 70 68 Z"
            fill="rgba(30, 27, 94, 0.94)"
            stroke="#38BDF8"
            strokeWidth="2.2"
          />
          <text
            x="104"
            y="45"
            textAnchor="middle"
            fill="#00E5FF"
            fontSize="20"
            fontWeight="800"
            fontFamily="Space Grotesk, sans-serif"
          >
            LV
          </text>
          <line x1="16" y1="26" x2="54" y2="30" stroke="#7DD3FC" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
          <line x1="16" y1="38" x2="52" y2="42" stroke="#7DD3FC" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
          <line x1="16" y1="50" x2="48" y2="53" stroke="#7DD3FC" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
        </g>
      </g>
    </svg>
  );
}

/** SCREEN 03: Large 3D Holographic Security Shield + Glowing Central Lock + Floating Email Envelope */
function ForgotShieldScene({ reduced, uid }: { reduced: boolean; uid: string }) {
  return (
    <svg
      viewBox="0 0 440 350"
      className="h-full w-full overflow-visible select-none"
      role="img"
      aria-label="3D holographic security shield with glowing padlock and floating email envelope"
    >
      <defs>
        <linearGradient id={`${uid}-fs-shield-fill`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.45" />
          <stop offset="48%" stopColor="#3B82F6" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.68" />
        </linearGradient>
        <linearGradient id={`${uid}-fs-shield-rim`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38F9FF" />
          <stop offset="55%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#E42BFF" />
        </linearGradient>
        <linearGradient id={`${uid}-fs-env`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="55%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <radialGradient id={`${uid}-fs-halo`} cx="50%" cy="44%" r="48%">
          <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.34" />
          <stop offset="58%" stopColor="#8B5CF6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#05091F" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-fs-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="220" cy="158" r="154" fill={`url(#${uid}-fs-halo)`} />
      <CyberPedestal idPrefix={`${uid}-fs`} />
      <HologramParticles />

      <g transform="translate(220 202) rotate(-14)">
        <ellipse cx="0" cy="0" rx="146" ry="38" fill="none" stroke={`url(#${uid}-fs-shield-rim)`} strokeWidth="2.4" strokeOpacity="0.72" />
      </g>
      <g transform="translate(220 218) rotate(12)">
        <ellipse cx="0" cy="0" rx="126" ry="30" fill="none" stroke="#00D9FF" strokeWidth="1.6" strokeOpacity="0.6" strokeDasharray="16 8" />
      </g>

      <g className={reduced ? '' : 'lv-holo-float'}>
        <path
          d="M 218 52 L 306 86 L 296 184 C 288 232, 254 264, 218 282 C 182 264, 148 232, 140 184 L 130 86 Z"
          fill={`url(#${uid}-fs-shield-fill)`}
          stroke={`url(#${uid}-fs-shield-rim)`}
          strokeWidth="4"
          filter={`url(#${uid}-fs-glow)`}
        />
        <path
          d="M 218 68 L 290 96 L 281 180 C 275 220, 246 248, 218 263 C 190 248, 161 220, 155 180 L 146 96 Z"
          fill="rgba(15, 23, 68, 0.52)"
          stroke="#7DD3FC"
          strokeWidth="1.6"
          strokeOpacity="0.75"
        />

        <g transform="translate(186 112)" filter={`url(#${uid}-fs-glow)`}>
          <path
            d="M 16 42 V 24 C 16 10, 48 10, 48 24 V 42"
            fill="none"
            stroke="#E0F2FE"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <rect x="6" y="40" width="52" height="46" rx="12" fill={`url(#${uid}-fs-env)`} stroke="#FFFFFF" strokeWidth="1.8" />
          <circle cx="32" cy="59" r="5.5" fill="#1E1B4B" />
          <rect x="29.5" y="62" width="5" height="12" rx="2.5" fill="#1E1B4B" />
        </g>

        <g transform="translate(248 190) rotate(-10)" filter={`url(#${uid}-fs-glow)`}>
          <rect
            x="0"
            y="0"
            width="92"
            height="64"
            rx="11"
            fill={`url(#${uid}-fs-env)`}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <path
            d="M 6 8 L 46 38 L 86 8"
            fill="none"
            stroke="#0369A1"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 8 56 L 34 34 M 84 56 L 58 34"
            fill="none"
            stroke="#0284C7"
            strokeWidth="2"
            strokeOpacity="0.65"
          />
        </g>
      </g>

      <g className={reduced ? '' : 'lv-float-slow'} opacity="0.88">
        <polygon points="88,108 102,94 116,108 102,122" fill="rgba(168,85,247,0.38)" stroke="#C084FC" strokeWidth="1.5" />
        <polygon points="344,126 356,114 368,126 356,138" fill="rgba(0,217,255,0.34)" stroke="#38BDF8" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/** SCREEN 04: Futuristic Holographic Smartphone + Glowing Verification Shield + Flying Paper Planes */
function VerifyPhoneScene({ reduced, uid }: { reduced: boolean; uid: string }) {
  return (
    <svg
      viewBox="0 0 440 350"
      className="h-full w-full overflow-visible select-none"
      role="img"
      aria-label="Futuristic 3D holographic smartphone with glowing verification shield and security particles"
    >
      <defs>
        <linearGradient id={`${uid}-vp-phone`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.92" />
          <stop offset="55%" stopColor="#0F172A" stopOpacity="0.94" />
          <stop offset="100%" stopColor="#3B0764" stopOpacity="0.92" />
        </linearGradient>
        <linearGradient id={`${uid}-vp-rim`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="55%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#E42BFF" />
        </linearGradient>
        <linearGradient id={`${uid}-vp-shield`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.88" />
        </linearGradient>
        <radialGradient id={`${uid}-vp-halo`} cx="50%" cy="46%" r="48%">
          <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.34" />
          <stop offset="58%" stopColor="#A855F7" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#05091F" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-vp-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="220" cy="162" r="154" fill={`url(#${uid}-vp-halo)`} />
      <CyberPedestal idPrefix={`${uid}-vp`} />
      <HologramParticles />

      <ellipse cx="220" cy="252" rx="134" ry="34" fill="none" stroke={`url(#${uid}-vp-rim)`} strokeWidth="2.6" strokeOpacity="0.8" />
      <ellipse cx="220" cy="242" rx="108" ry="26" fill="none" stroke="#00D9FF" strokeWidth="1.5" strokeOpacity="0.65" />

      <g className={reduced ? '' : 'lv-holo-float'}>
        <g transform="translate(148 56) skewX(-6) rotate(-5)">
          <rect
            x="0"
            y="0"
            width="126"
            height="228"
            rx="22"
            fill={`url(#${uid}-vp-phone)`}
            stroke={`url(#${uid}-vp-rim)`}
            strokeWidth="3.2"
            filter={`url(#${uid}-vp-glow)`}
          />
          <rect x="44" y="12" width="38" height="5" rx="2.5" fill="#38BDF8" opacity="0.7" />
          <rect x="18" y="34" width="90" height="36" rx="8" fill="rgba(56, 189, 248, 0.14)" stroke="#38BDF8" strokeOpacity="0.45" />
          <line x1="28" y1="48" x2="76" y2="48" stroke="#7DD3FC" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="28" y1="59" x2="60" y2="59" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={16 + i * 16}
              y="174"
              width="12"
              height="16"
              rx="3"
              fill="rgba(0, 217, 255, 0.22)"
              stroke="#00D9FF"
              strokeWidth="1"
            />
          ))}
        </g>

        <g transform="translate(206 108)" filter={`url(#${uid}-vp-glow)`}>
          <path
            d="M 52 0 L 100 18 L 94 74 C 90 104, 72 124, 52 134 C 32 124, 14 104, 10 74 L 4 18 Z"
            fill={`url(#${uid}-vp-shield)`}
            stroke="#E0F2FE"
            strokeWidth="2.8"
          />
          <path
            d="M 32 66 L 47 81 L 76 48"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>

      <g className={reduced ? '' : 'lv-float-slow'} filter={`url(#${uid}-vp-glow)`}>
        <g transform="translate(68 134) rotate(-14)">
          <polygon points="0,16 54,0 38,34 24,22" fill="rgba(167, 139, 250, 0.72)" stroke="#E0F2FE" strokeWidth="1.5" />
          <line x1="24" y1="22" x2="54" y2="0" stroke="#00E5FF" strokeWidth="1.5" />
        </g>
        <g transform="translate(320 68) rotate(12)">
          <polygon points="0,14 48,0 34,30 21,19" fill="rgba(56, 189, 248, 0.75)" stroke="#FFFFFF" strokeWidth="1.5" />
          <line x1="21" y1="19" x2="48" y2="0" stroke="#E0F2FE" strokeWidth="1.5" />
        </g>
      </g>
    </svg>
  );
}

/** SCREEN 05: Large 3D Holographic Glowing Padlock + Energy Rings + Floating Cubes */
function ResetPadlockScene({ reduced, uid }: { reduced: boolean; uid: string }) {
  return (
    <svg
      viewBox="0 0 440 350"
      className="h-full w-full overflow-visible select-none"
      role="img"
      aria-label="Large 3D holographic glowing padlock floating above purple and cyan energy rings"
    >
      <defs>
        <linearGradient id={`${uid}-rp-body`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.82" />
          <stop offset="45%" stopColor="#3B82F6" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.88" />
        </linearGradient>
        <linearGradient id={`${uid}-rp-shackle`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38F9FF" />
          <stop offset="55%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#E42BFF" />
        </linearGradient>
        <radialGradient id={`${uid}-rp-halo`} cx="50%" cy="45%" r="48%">
          <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.36" />
          <stop offset="55%" stopColor="#8B5CF6" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#05091F" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-rp-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="220" cy="160" r="154" fill={`url(#${uid}-rp-halo)`} />
      <CyberPedestal idPrefix={`${uid}-rp`} />
      <HologramParticles />

      <g transform="translate(220 242) rotate(-10)">
        <ellipse cx="0" cy="0" rx="142" ry="34" fill="none" stroke={`url(#${uid}-rp-shackle)`} strokeWidth="3" strokeOpacity="0.84" />
      </g>
      <g transform="translate(220 228) rotate(8)">
        <ellipse cx="0" cy="0" rx="124" ry="26" fill="none" stroke="#00E5FF" strokeWidth="1.8" strokeOpacity="0.72" />
      </g>

      <g className={reduced ? '' : 'lv-holo-float'} filter={`url(#${uid}-rp-glow)`}>
        <path
          d="M 176 146 V 102 C 176 62, 264 62, 264 102 V 146"
          fill="none"
          stroke={`url(#${uid}-rp-shackle)`}
          strokeWidth="22"
          strokeLinecap="round"
        />
        <path
          d="M 176 146 V 102 C 176 66, 264 66, 264 102 V 146"
          fill="none"
          stroke="#E0F2FE"
          strokeWidth="6"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />

        <rect
          x="148"
          y="138"
          width="144"
          height="122"
          rx="26"
          fill={`url(#${uid}-rp-body)`}
          stroke="#BAE6FD"
          strokeWidth="3"
        />
        <rect
          x="160"
          y="150"
          width="120"
          height="98"
          rx="18"
          fill="rgba(15, 23, 66, 0.34)"
          stroke="#38BDF8"
          strokeWidth="1.4"
          strokeOpacity="0.75"
        />
        <circle cx="220" cy="188" r="14" fill="#0F172A" stroke="#7DD3FC" strokeWidth="2.5" />
        <path d="M 213 196 L 227 196 L 231 224 L 209 224 Z" fill="#0F172A" stroke="#7DD3FC" strokeWidth="2" />
        <circle cx="220" cy="188" r="5" fill="#00E5FF" />
      </g>

      <g className={reduced ? '' : 'lv-float-slow'}>
        <g transform="translate(88 128) rotate(-14)">
          <rect width="26" height="26" rx="5" fill="rgba(56, 189, 248, 0.35)" stroke="#7DD3FC" strokeWidth="1.6" />
        </g>
        <g transform="translate(324 72) rotate(18)">
          <rect width="30" height="30" rx="6" fill="rgba(168, 85, 247, 0.38)" stroke="#D8B4FE" strokeWidth="1.6" />
        </g>
        <g transform="translate(342 178) rotate(-20)">
          <rect width="20" height="20" rx="4" fill="rgba(0, 217, 255, 0.3)" stroke="#38BDF8" strokeWidth="1.4" />
        </g>
      </g>
    </svg>
  );
}

/** SCREEN 06: Large Glowing 3D Email Envelope + Cyan Verification Checkmark + Holographic Platform */
function RecoverySuccessScene({ reduced, uid }: { reduced: boolean; uid: string }) {
  return (
    <svg
      viewBox="0 0 440 350"
      className="h-full w-full overflow-visible select-none"
      role="img"
      aria-label="Large glowing 3D email envelope with cyan verification checkmark above holographic platform"
    >
      <defs>
        <linearGradient id={`${uid}-rs-env-body`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.88" />
          <stop offset="48%" stopColor="#6366F1" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={`${uid}-rs-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="55%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#E42BFF" />
        </linearGradient>
        <radialGradient id={`${uid}-rs-check-bg`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="55%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#0284C7" />
        </radialGradient>
        <radialGradient id={`${uid}-rs-halo`} cx="50%" cy="46%" r="48%">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.4" />
          <stop offset="55%" stopColor="#7C3AED" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#05091F" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-rs-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="220" cy="162" r="154" fill={`url(#${uid}-rs-halo)`} />
      <CyberPedestal idPrefix={`${uid}-rs`} />
      <HologramParticles />

      <g transform="translate(220 202) rotate(-14)">
        <ellipse cx="0" cy="0" rx="148" ry="40" fill="none" stroke={`url(#${uid}-rs-ring)`} strokeWidth="2.8" strokeOpacity="0.82" />
      </g>
      <g transform="translate(220 218) rotate(12)">
        <ellipse cx="0" cy="0" rx="122" ry="30" fill="none" stroke="#00E5FF" strokeWidth="1.8" strokeOpacity="0.74" />
      </g>

      <g className={reduced ? '' : 'lv-holo-float'} filter={`url(#${uid}-rs-glow)`}>
        <g transform="translate(108 106) rotate(-11)">
          <rect
            x="0"
            y="0"
            width="216"
            height="144"
            rx="22"
            fill={`url(#${uid}-rs-env-body)`}
            stroke="#E0F2FE"
            strokeWidth="3.2"
          />
          <path
            d="M 10 12 L 108 86 L 206 12"
            fill="rgba(255, 255, 255, 0.14)"
            stroke="#E0F2FE"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M 12 132 L 78 76 M 204 132 L 138 76"
            fill="none"
            stroke="#BAE6FD"
            strokeWidth="2.2"
            strokeOpacity="0.7"
          />

          <circle cx="108" cy="76" r="34" fill={`url(#${uid}-rs-check-bg)`} stroke="#FFFFFF" strokeWidth="3" />
          <path
            d="M 92 76 L 104 88 L 126 63"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>

      <g className={reduced ? '' : 'lv-float-slow'}>
        <polygon points="154,66 164,54 174,66 164,78" fill="#38BDF8" opacity="0.88" />
        <polygon points="282,58 290,48 298,58 290,68" fill="#FB923C" opacity="0.9" />
        <circle cx="222" cy="48" r="4" fill="#34D399" />
      </g>
    </svg>
  );
}

export function AuthSceneIllustrations({
  variant,
  portalState = 'idle',
  compact = false,
}: AuthSceneIllustrationsProps) {
  const prefersReduced = Boolean(useReducedMotion());
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');

  const scene = (() => {
    switch (variant) {
      case 'login':
        return <LoginGlobeScene reduced={prefersReduced} uid={uid} />;
      case 'register':
        return <RegisterRobotScene reduced={prefersReduced} uid={uid} />;
      case 'forgot-password':
        return <ForgotShieldScene reduced={prefersReduced} uid={uid} />;
      case 'verify-email':
        return <VerifyPhoneScene reduced={prefersReduced} uid={uid} />;
      case 'reset-password':
        return <ResetPadlockScene reduced={prefersReduced} uid={uid} />;
      case 'recovery-success':
        return <RecoverySuccessScene reduced={prefersReduced} uid={uid} />;
    }
  })();

  return (
    <motion.div
      data-testid={`auth-3d-scene-${variant}`}
      data-portal-state={portalState}
      initial={prefersReduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      style={{ filter: getAccentFilter(portalState) }}
      className={
        compact
          ? 'mx-auto h-[168px] w-[215px] transition-[filter] duration-300'
          : 'mx-auto h-[320px] w-full max-w-[430px] transition-[filter] duration-300 lg:h-[380px] lg:max-w-[460px]'
      }
    >
      {scene}
    </motion.div>
  );
}
