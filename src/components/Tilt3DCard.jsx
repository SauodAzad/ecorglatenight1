import { useEffect, useRef } from 'react';

const canHoverDesktop = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useParallaxRef() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canHoverDesktop()) return undefined;

    let rafId = 0;
    let targetX = 0;
    let targetY = 0;
    let clientX = 0;
    let clientY = 0;

    const flush = () => {
      rafId = 0;
      el.style.setProperty('--mx', targetX.toFixed(3));
      el.style.setProperty('--my', targetY.toFixed(3));
      el.style.setProperty('--px', `${clientX.toFixed(1)}px`);
      el.style.setProperty('--py', `${clientY.toFixed(1)}px`);
      el.style.setProperty('--cursor-active', '1');
    };

    const handleMouseMove = (e) => {
      clientX = e.clientX;
      clientY = e.clientY;
      targetX = e.clientX / (window.innerWidth || 1) - 0.5;
      targetY = e.clientY / (window.innerHeight || 1) - 0.5;
      if (!rafId) {
        rafId = window.requestAnimationFrame(flush);
      }
    };

    const handleMouseLeave = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      el.style.setProperty('--mx', '0');
      el.style.setProperty('--my', '0');
      el.style.setProperty('--cursor-active', '0');
      el.style.removeProperty('--px');
      el.style.removeProperty('--py');
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return ref;
}

export default function Tilt3DCard({
  children,
  className = '',
  maxTilt = 5,
  scale = 1.015,
  glareOpacity = 0.22,
  glareRoundedClass = 'rounded-[inherit]',
  style = {},
}) {
  const cardRef = useRef(null);
  const glareRef = useRef(null);
  const rectRef = useRef(null);
  const rafRef = useRef(0);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });

  const isHoveredRef = useRef(false);

  useEffect(() => {
    const invalidateBounds = () => {
      if (isHoveredRef.current) {
        rectRef.current = null;
      }
    };
    window.addEventListener('scroll', invalidateBounds, { passive: true, capture: true });
    window.addEventListener('resize', invalidateBounds, { passive: true });
    return () => {
      window.removeEventListener('scroll', invalidateBounds, { capture: true });
      window.removeEventListener('resize', invalidateBounds);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const applyFrame = () => {
    rafRef.current = 0;
    const el = cardRef.current;
    if (!el) return;
    const { x, y } = pointerRef.current;
    const rotateY = (x - 0.5) * 2 * maxTilt;
    const rotateX = (0.5 - y) * 2 * maxTilt;
    el.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, 1)`;

    const glareEl = glareRef.current;
    if (glareEl && glareOpacity > 0) {
      const tx = ((x - 0.5) * 38).toFixed(1);
      const ty = ((y - 0.5) * 38).toFixed(1);
      glareEl.style.transform = `translate3d(${tx}%, ${ty}%, 0)`;
    }
  };

  const handleMouseEnter = () => {
    if (!canHoverDesktop()) return;
    const el = cardRef.current;
    if (!el) return;
    isHoveredRef.current = true;
    rectRef.current = el.getBoundingClientRect();
    el.style.transition = 'transform 140ms cubic-bezier(0.22, 1, 0.36, 1)';
    if (glareRef.current && glareOpacity > 0) {
      glareRef.current.style.opacity = '1';
    }
  };

  const handleMouseMove = (e) => {
    if (!rectRef.current) {
      if (!canHoverDesktop()) return;
      const el = cardRef.current;
      if (!el) return;
      isHoveredRef.current = true;
      rectRef.current = el.getBoundingClientRect();
    }
    const rect = rectRef.current;
    if (!rect || !rect.width || !rect.height) return;
    pointerRef.current.x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    pointerRef.current.y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    if (!rafRef.current) {
      rafRef.current = window.requestAnimationFrame(applyFrame);
    }
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    rectRef.current = null;
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    const el = cardRef.current;
    if (el) {
      el.style.transition = 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    }
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
      glareRef.current.style.transform = 'translate3d(0, 0, 0)';
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
      style={style}
    >
      {children}
      {glareOpacity > 0 && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 overflow-hidden ${glareRoundedClass}`}
        >
          <div
            ref={glareRef}
            style={{
              position: 'absolute',
              inset: '-25%',
              opacity: 0,
              transition: 'opacity 220ms ease-out',
              background: `radial-gradient(circle at center, rgba(255,255,255,${glareOpacity}) 0%, rgba(249,115,22,${(glareOpacity * 0.32).toFixed(3)}) 30%, transparent 65%)`,
            }}
          />
        </div>
      )}
    </div>
  );
}
