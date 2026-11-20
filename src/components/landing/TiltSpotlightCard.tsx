import React, { useEffect, useRef, useState } from 'react';

interface TiltSpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'article';
  maxTilt?: number;
}

export function TiltSpotlightCard({
  children,
  className = '',
  as = 'div',
  maxTilt = 4.5,
}: TiltSpotlightCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * (maxTilt * 2);
    const rotateX = (0.5 - py) * (maxTilt * 2);
    el.style.setProperty('--mx', `${Math.round(px * 100)}%`);
    el.style.setProperty('--my', `${Math.round(py * 100)}%`);
    el.style.setProperty('--rx', `${rotateX.toFixed(2)}deg`);
    el.style.setProperty('--ry', `${rotateY.toFixed(2)}deg`);
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  const Tag = as;

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`lv-tilt-card relative overflow-hidden ${className}`}
    >
      {children}
    </Tag>
  );
}

interface RevealBlockProps {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}

export function RevealBlock({ children, delayMs = 0, className = '' }: RevealBlockProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      setVisible(true);
      return;
    }

    const revealIfReachable = () => {
      const rect = el.getBoundingClientRect();
      // Reveal if in viewport OR already scrolled past (above viewport)
      if (rect.top <= window.innerHeight + 120) {
        setVisible(true);
        return true;
      }
      return false;
    };

    if (revealIfReachable()) {
      return;
    }

    setVisible(false);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight + 120) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.01, rootMargin: '120px 0px 120px 0px' }
    );
    observer.observe(el);

    const handleScroll = () => {
      if (revealIfReachable()) {
        observer.disconnect();
        window.removeEventListener('scroll', handleScroll);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: visible ? `${delayMs}ms` : '0ms',
      }}
      className={`transition-[opacity,transform] duration-400 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } ${className}`}
    >
      {children}
    </div>
  );
}
