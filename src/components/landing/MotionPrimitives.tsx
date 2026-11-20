import React, { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react';

interface MagneticWrapProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

/**
 * Subtle desktop magnetic hover wrapper powered by Framer Motion springs.
 * Never shifts layout or triggers on touch devices or reduced-motion environments.
 */
export function MagneticWrap({
  children,
  className = '',
  strength = 0.16,
}: MagneticWrapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 260, damping: 22, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 260, damping: 22, mass: 0.4 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReduced || e.pointerType !== 'mouse' || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - (rect.left + rect.width / 2);
    const offsetY = e.clientY - (rect.top + rect.height / 2);
    x.set(Math.max(-8, Math.min(8, offsetX * strength)));
    y.set(Math.max(-6, Math.min(6, offsetY * strength)));
  };

  const handlePointerLeave = () => {
    x.set(0);
    y.set(0);
  };

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface TiltCard3DProps {
  children: React.ReactNode;
  className?: string;
  glowAccent?: 'cyan' | 'blue' | 'violet' | 'magenta';
}

const ACCENT_RING_CLASSES: Record<NonNullable<TiltCard3DProps['glowAccent']>, string> = {
  cyan: 'hover:border-[#38bdf8]/55 hover:shadow-[0_22px_48px_rgba(3,8,22,0.72),0_0_28px_rgba(56,189,248,0.18)]',
  blue: 'hover:border-[#4f8bff]/55 hover:shadow-[0_22px_48px_rgba(3,8,22,0.72),0_0_28px_rgba(79,139,255,0.2)]',
  violet: 'hover:border-[#8b6dff]/55 hover:shadow-[0_22px_48px_rgba(3,8,22,0.72),0_0_28px_rgba(139,109,255,0.2)]',
  magenta: 'hover:border-[#d946ef]/50 hover:shadow-[0_22px_48px_rgba(3,8,22,0.72),0_0_28px_rgba(217,70,239,0.18)]',
};

/**
 * Subtle 3D tilt container with controlled luminous hover glow.
 * Keeps clicks rock-steady (tiny 3.5deg max tilt) and disables automatically on touch or reduced motion.
 */
export function TiltCard3D({
  children,
  className = '',
  glowAccent = 'cyan',
}: TiltCard3DProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useReducedMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const smoothRotateX = useSpring(rotateX, { stiffness: 220, damping: 24 });
  const smoothRotateY = useSpring(rotateY, { stiffness: 220, damping: 24 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReduced || e.pointerType !== 'mouse' || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(-relY * 5.5);
    rotateY.set(relX * 5.5);
  };

  const handlePointerLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  if (prefersReduced) {
    return (
      <div className={`${ACCENT_RING_CLASSES[glowAccent]} ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div className="lv-perspective h-full">
      <motion.div
        ref={ref}
        style={{
          rotateX: smoothRotateX,
          rotateY: smoothRotateY,
          transformStyle: 'preserve-3d',
        }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={`h-full transition-colors transition-shadow duration-200 ${ACCENT_RING_CLASSES[glowAccent]} ${className}`}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  label: string;
  color: string;
  size?: number;
}

/**
 * Interactive SVG progress ring animated via Framer Motion.
 * Always paired with explicit sample-preview disclaimers on the landing page.
 */
export function InteractiveProgressRing({
  value,
  label,
  color,
  size = 64,
}: ProgressRingProps) {
  const prefersReduced = useReducedMotion();
  const strokeWidth = 4.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(176, 200, 255, 0.14)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={prefersReduced ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            whileInView={{ strokeDashoffset: offset }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <span className="font-mono tabular-nums absolute text-[12px] font-bold text-[#f3f6ff]">
          {clamped}%
        </span>
      </div>
      <span className="text-[11px] font-medium text-[#a8b8d6]">{label}</span>
    </div>
  );
}
