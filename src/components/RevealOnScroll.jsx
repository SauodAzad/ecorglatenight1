import { useEffect, useRef, useState } from 'react';

const VARIANT_CLASSES = {
  up: 'scroll-reveal',
  left: 'scroll-reveal scroll-reveal-left',
  right: 'scroll-reveal scroll-reveal-right',
  zoom: 'scroll-reveal scroll-reveal-zoom',
  flip: 'scroll-reveal scroll-reveal-flip',
  deck3d: 'scroll-reveal scroll-reveal-deck3d',
  cinematic: 'scroll-reveal-cinematic',
};

export default function RevealOnScroll({
  children,
  className = '',
  delay = 0,
  variant = 'up',
  threshold = 0.12,
  replay = true,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return true;
    }
    return typeof IntersectionObserver === 'undefined';
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const isTall = el.getBoundingClientRect().height > (window.innerHeight || 800) * 0.65;
    const activeThreshold = isTall ? Math.min(threshold, 0.04) : threshold;

    const observer = new IntersectionObserver(
      (entries) => {
        for (let i = 0; i < entries.length; i += 1) {
          const entry = entries[i];
          if (entry.isIntersecting) {
            setVisible(true);
            if (!replay) observer.disconnect();
          } else if (replay && entry.boundingClientRect.top > window.innerHeight * 0.98) {
            setVisible(false);
          }
        }
      },
      {
        threshold: activeThreshold,
        rootMargin: isTall ? '0px 0px -3% 0px' : '0px 0px -7% 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, replay]);

  const baseClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.up;

  return (
    <div
      ref={ref}
      className={`${baseClass} ${visible ? 'is-visible' : ''} ${className}`}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
