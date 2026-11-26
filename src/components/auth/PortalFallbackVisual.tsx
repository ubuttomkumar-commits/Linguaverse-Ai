export type PortalVisualState = 'idle' | 'focused' | 'submitting' | 'error' | 'success';

interface PortalFallbackVisualProps {
  portalState: PortalVisualState;
  compact?: boolean;
  ariaLabel?: string;
}

/**
 * Lightweight SVG/CSS Language Portal visual for mobile viewports,
 * prefers-reduced-motion users, and devices without WebGL.
 */
export function PortalFallbackVisual({
  portalState,
  compact = false,
  ariaLabel = 'LINGUAVERSE AI Language Portal',
}: PortalFallbackVisualProps) {
  const isSuccess = portalState === 'success';
  const isFocused = portalState === 'focused' || portalState === 'submitting';
  const isError = portalState === 'error';

  const ringStrokePrimary = isSuccess
    ? '#16E58B'
    : isError
      ? '#FB7185'
      : isFocused
        ? '#00D9FF'
        : '#8B5CF6';

  const ringStrokeSecondary = isSuccess
    ? '#22D3EE'
    : isError
      ? '#F59E0B'
      : '#00D9FF';

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      data-portal-state={portalState}
      className={`relative mx-auto flex items-center justify-center ${
        compact ? 'h-24 w-24' : 'h-[260px] w-[260px] sm:h-[320px] sm:w-[320px]'
      }`}
    >
      {/* Controlled radial halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full transition-all duration-300"
        style={{
          background: isSuccess
            ? 'radial-gradient(circle, rgba(22,229,139,0.24) 0%, rgba(0,217,255,0.12) 48%, transparent 72%)'
            : isError
              ? 'radial-gradient(circle, rgba(244,63,94,0.22) 0%, rgba(124,58,237,0.1) 50%, transparent 72%)'
              : isFocused
                ? 'radial-gradient(circle, rgba(0,217,255,0.24) 0%, rgba(124,58,237,0.16) 48%, transparent 72%)'
                : 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, rgba(0,217,255,0.1) 48%, transparent 72%)',
        }}
      />

      <svg
        viewBox="0 0 240 240"
        className={`relative h-full w-full transition-transform duration-500 ${
          isSuccess ? 'scale-110' : isFocused ? 'scale-[1.03]' : 'scale-100'
        }`}
        fill="none"
      >
        <defs>
          <linearGradient id="portal-ring-grad" x1="20" y1="20" x2="220" y2="220" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={ringStrokeSecondary} />
            <stop offset="55%" stopColor={ringStrokePrimary} />
            <stop offset="100%" stopColor="#E42BFF" />
          </linearGradient>
          <radialGradient id="portal-orb-grad" cx="50%" cy="42%" r="54%">
            <stop offset="0%" stopColor={isSuccess ? '#6EE7B7' : '#7DD3FC'} stopOpacity="0.95" />
            <stop offset="52%" stopColor={isSuccess ? '#059669' : '#6D28D9'} stopOpacity="0.82" />
            <stop offset="100%" stopColor="#091030" stopOpacity="0.95" />
          </radialGradient>
        </defs>

        {/* Outer holographic aperture */}
        <circle
          cx="120"
          cy="120"
          r="98"
          stroke="url(#portal-ring-grad)"
          strokeWidth={compact ? '3.5' : '2.8'}
          strokeOpacity="0.88"
        />
        <circle
          cx="120"
          cy="120"
          r="82"
          stroke={ringStrokeSecondary}
          strokeWidth="1.4"
          strokeDasharray="10 8"
          strokeOpacity="0.7"
        />
        {/* Soundwave harmonic rings */}
        <circle
          cx="120"
          cy="120"
          r={isSuccess ? '72' : '64'}
          stroke={ringStrokePrimary}
          strokeWidth="1.1"
          strokeOpacity="0.45"
        />
        <circle
          cx="120"
          cy="120"
          r="49"
          stroke={ringStrokeSecondary}
          strokeWidth="1"
          strokeOpacity="0.32"
        />

        {/* Neural Communication Orb */}
        <circle
          cx="120"
          cy="120"
          r={isSuccess ? '24' : '32'}
          fill="url(#portal-orb-grad)"
          stroke={ringStrokeSecondary}
          strokeWidth="1.2"
          strokeOpacity="0.7"
        />
        <polygon
          points="120,94 143,107 143,133 120,146 97,133 97,107"
          stroke="#E0F2FE"
          strokeOpacity="0.45"
          strokeWidth="1"
          fill="none"
        />

        {/* Speech glyph accents (non-compact only) */}
        {!compact && (
          <g fill="#E0F2FE" fillOpacity="0.85" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="13">
            <text x="115" y="34">A</text>
            <text x="196" y="124">অ</text>
            <text x="34" y="125">文</text>
            <text x="114" y="216">Ω</text>
          </g>
        )}
      </svg>
    </div>
  );
}
