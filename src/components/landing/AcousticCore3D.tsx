import { useEffect, useRef } from 'react';

interface AcousticCore3DProps {
  pulseKey: number;
  isSpeaking?: boolean;
  compact?: boolean;
}

export function AcousticCore3D({
  pulseKey,
  isSpeaking = false,
  compact = false,
}: AcousticCore3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const energyRef = useRef<number>(0.44);
  const targetEnergyRef = useRef<number>(0.44);
  const speakingRef = useRef<boolean>(isSpeaking);
  const tiltRef = useRef<{ rx: number; ry: number; trx: number; try: number }>({
    rx: 0,
    ry: 0,
    trx: 0,
    try: 0,
  });

  const size = compact ? 168 : 220;

  useEffect(() => {
    speakingRef.current = isSpeaking;
    targetEnergyRef.current = isSpeaking ? 1.15 : 0.44;
  }, [isSpeaking]);

  useEffect(() => {
    if (pulseKey > 0) {
      energyRef.current = 1.25;
      targetEnergyRef.current = speakingRef.current ? 1.15 : 0.46;
    }
  }, [pulseKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let rafId = 0;
    let phase = 0;

    const drawFrame = (staticOnly: boolean) => {
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const scale = size / 260;

      energyRef.current += (targetEnergyRef.current - energyRef.current) * 0.06;
      const e = staticOnly ? 0.38 : energyRef.current;

      const t = tiltRef.current;
      t.rx += (t.trx - t.rx) * 0.09;
      t.ry += (t.try - t.ry) * 0.09;
      if (stageRef.current && !staticOnly) {
        stageRef.current.style.transform = `rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg)`;
      }

      const halo = ctx.createRadialGradient(cx, cy, 18 * scale, cx, cy, 118 * scale);
      halo.addColorStop(0, 'rgba(59, 130, 246, 0.28)');
      halo.addColorStop(0.55, 'rgba(124, 58, 237, 0.12)');
      halo.addColorStop(1, 'rgba(5, 9, 20, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, 118 * scale, 0, Math.PI * 2);
      ctx.fill();

      const bars = 48;
      const baseRadius = 64 * scale;
      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2;
        const waveA = Math.sin(angle * 4 + phase * 2.1);
        const waveB = Math.cos(angle * 7 - phase * 1.6);
        const waveC = Math.sin(angle * 2 + phase * 0.9);
        const amp = Math.max(0.14, (waveA * 0.45 + waveB * 0.35 + waveC * 0.2 + 1) * 0.5);
        const barLen = (8 + amp * (24 * e)) * scale;

        const x1 = cx + Math.cos(angle) * baseRadius;
        const y1 = cy + Math.sin(angle) * baseRadius;
        const x2 = cx + Math.cos(angle) * (baseRadius + barLen);
        const y2 = cy + Math.sin(angle) * (baseRadius + barLen);

        const hueMix = i / bars;
        ctx.strokeStyle =
          hueMix < 0.34
            ? `rgba(59, 130, 246, ${(0.5 + amp * 0.48).toFixed(2)})`
            : hueMix < 0.72
              ? `rgba(124, 58, 237, ${(0.45 + amp * 0.48).toFixed(2)})`
              : `rgba(245, 158, 11, ${(0.42 + amp * 0.48).toFixed(2)})`;
        ctx.lineWidth = Math.max(1.6, 2 * scale);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      const ribbonWidth = 92 * scale;
      const startX = cx - ribbonWidth / 2;
      ctx.beginPath();
      for (let x = 0; x <= ribbonWidth; x += 2) {
        const norm = (x / ribbonWidth) * Math.PI;
        const envelope = Math.sin(norm);
        const yOffset =
          Math.sin(x * 0.16 + phase * 3.4) * (12 * e * scale) * envelope +
          Math.cos(x * 0.08 - phase * 2.2) * (5 * e * scale) * envelope;
        const px = startX + x;
        const py = cy + yOffset;
        if (x === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(241, 245, 249, 0.92)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      for (let x = 0; x <= ribbonWidth; x += 2) {
        const norm = (x / ribbonWidth) * Math.PI;
        const envelope = Math.sin(norm);
        const yOffset = Math.cos(x * 0.12 - phase * 2.8) * (10 * e * scale) * envelope;
        const px = startX + x;
        const py = cy + yOffset;
        if (x === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.78)';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      if (!staticOnly) {
        phase += 0.025 + e * 0.015;
        rafId = window.requestAnimationFrame(() => drawFrame(false));
      }
    };

    if (prefersReducedMotion) {
      drawFrame(true);
      return;
    }

    rafId = window.requestAnimationFrame(() => drawFrame(false));

    const handlePointerMove = (e: PointerEvent) => {
      const box = containerRef.current?.getBoundingClientRect();
      if (!box) return;
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 480));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 480));
      tiltRef.current.try = dx * 13;
      tiltRef.current.trx = -dy * 11;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [size]);

  const ring1 = Math.round(size * 0.87);
  const ring2 = Math.round(size * 0.75);
  const ring3 = Math.round(size * 0.64);
  const coreSphere = Math.round(size * 0.48);

  return (
    <div
      ref={containerRef}
      data-testid="acoustic-core-3d"
      className="lv-perspective relative flex shrink-0 items-center justify-center select-none"
    >
      <div
        ref={stageRef}
        style={{ width: size, height: size }}
        className="lv-preserve-3d relative flex items-center justify-center"
      >
        <div
          aria-hidden="true"
          style={{ width: ring1, height: ring1 }}
          className="lv-ring-1 pointer-events-none absolute rounded-full border border-[#3B82F6]/40 shadow-[0_0_24px_rgba(59,130,246,0.16)]"
        />
        <div
          aria-hidden="true"
          style={{ width: ring2, height: ring2 }}
          className="lv-ring-2 pointer-events-none absolute rounded-full border border-dashed border-[#7C3AED]/50"
        />
        <div
          aria-hidden="true"
          style={{ width: ring3, height: ring3 }}
          className="lv-ring-3 pointer-events-none absolute rounded-full border border-[#F59E0B]/35"
        />
        <div
          aria-hidden="true"
          style={{ width: coreSphere, height: coreSphere }}
          className="lv-core-pulse pointer-events-none absolute rounded-full border border-white/15 bg-gradient-to-br from-[#3B82F6]/25 via-[#0E1526]/85 to-[#7C3AED]/30 shadow-[inset_0_1px_16px_rgba(255,255,255,0.18),0_0_40px_rgba(59,130,246,0.22)] backdrop-blur-md"
        />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{ width: size, height: size }}
          className="relative z-10"
        />
      </div>
    </div>
  );
}
