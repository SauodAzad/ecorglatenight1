import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Tilt3DCard from './Tilt3DCard';

/**
 * ChamakRibbon - Removed as requested by user.
 */
export const ChamakRibbon = () => null;

/**
 * TruckMorBadge - Majestic Truck Art Peacock ("مور") badge.
 * Shows only the selected language (either Urdu or English, never both).
 */
export const TruckMorBadge = ({ text, subtext, className = '', light = false }) => {
  const { isUrdu, t } = useLanguage();
  const label = isUrdu ? (text || t('badgePeacock')) : (subtext || t('badgePeacock'));
  const tone = light
    ? 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 shadow-2xs'
    : 'border-white/15 bg-[#0B1325]/92 text-slate-100 hover:border-orange-400/40 shadow-[0_6px_16px_rgba(2,6,23,0.45)]';
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs transition-all select-none ${tone} ${className}`}>
      <span className={light ? 'inline-flex items-center shrink-0' : 'inline-flex items-center shrink-0 rounded-md bg-white px-1 py-0.5 shadow-2xs preserve-light'}>
        <img src="/logo.jpg?v=2" alt="E-CARGO-BILTY" className="w-7 h-5 object-contain select-none shrink-0" />
      </span>
      <span className={isUrdu ? `font-urdu font-black text-xs ${light ? 'text-slate-800' : 'text-slate-100'}` : `font-sans font-bold text-xs tracking-tight ${light ? 'text-slate-700' : 'text-slate-100'}`}>
        {label}
      </span>
    </div>
  );
};

/**
 * NazarBattuBadge - Protective talisman badge.
 * Shows only the selected language (either Urdu or English, never both).
 */
export const NazarBattuBadge = ({ text, className = '', dark = true }) => {
  const { isUrdu, t } = useLanguage();
  const label = isUrdu ? (text || t('badgeNazar')) : t('badgeNazar');
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border text-[11px] sm:text-xs font-bold shadow-2xs transition-all select-none whitespace-nowrap shrink-0 max-w-full ${
        dark
          ? 'border-white/20 bg-[#0B1325]/92 text-slate-100 hover:border-white/35'
          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
      } ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-[#F89020] border border-white/25 shadow-2xs shrink-0"></span>
      <span className={`truncate ${isUrdu ? `font-urdu text-xs sm:text-sm font-bold ${dark ? 'text-white' : 'text-slate-800'}` : `font-sans text-[11px] sm:text-xs font-bold ${dark ? 'text-slate-100' : 'text-slate-700'}`}`}>
        {label}
      </span>
    </div>
  );
};

/**
 * TruckPatternBorder - Removed as requested by user.
 */
export const TruckPatternBorder = () => null;

/**
 * TruckGhungrooTrim - Decorative hanging brass bells & tassels found under truck bumpers.
 */
export const TruckGhungrooTrim = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-2 py-1 ${className}`}>
    {Array.from({ length: 20 }).map((_, i) => (
      <div key={i} className="flex flex-col items-center">
        <div className="w-[1.5px] h-2 bg-gradient-to-b from-slate-300 to-orange-400"></div>
        <div className={`w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-[#F89020] border border-orange-700' : 'bg-slate-600 border border-slate-800'} shadow-xs`}></div>
      </div>
    ))}
  </div>
);

/**
 * TruckLotusArchBadge - Mughal arched jharoka badge with lotus flower rosette & vibrant borders.
 * Shows only the selected language (either Urdu or English, never both).
 */
export const TruckLotusArchBadge = ({ text, subtext = '', className = '', light = false }) => {
  const { isUrdu, t } = useLanguage();
  const label = isUrdu ? (text || t('heritageBadge')) : (subtext || t('heritageBadge'));
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-t-2xl rounded-b-lg border transition-all ${
      light
        ? 'border-slate-200 bg-white shadow-2xs'
        : 'border-white/15 bg-[#0B1325]/92 shadow-[0_6px_16px_rgba(2,6,23,0.45)]'
    } ${className}`}>
      <FloralRosette size={14} />
      <span className={isUrdu
        ? `font-urdu font-bold text-xs ${light ? 'text-slate-800' : 'text-slate-100'}`
        : `font-sans font-bold text-xs ${light ? 'text-slate-700' : 'text-slate-100'}`
      }>
        {label}
      </span>
    </div>
  );
};

/**
 * AjrakRibbon - Removed as requested by user.
 */
export const AjrakRibbon = () => null;

/**
 * TruckBackground - Fixed Viewport Pakistani Decorated Truck Art backdrop.
 * Supports optional frosted glossy blur + GPU-composited mouse parallax depth.
 */
export const TruckBackground = ({
  image = '/images/peacock_truck_art_bg.jpg',
  opacity = 'opacity-100',
  overlay = false,
  glossyBlur = false,
  className = ''
}) => (
  <div className={`fixed inset-0 pointer-events-none overflow-hidden z-0 select-none ${className}`}>
    <img
      src={image}
      alt="Pakistani Decorated Cargo Truck"
      className={`w-full h-full object-cover object-center ${glossyBlur ? 'transition-transform duration-300 ease-out' : ''} ${opacity}`}
      style={{
        filter: glossyBlur ? 'blur(6px) contrast(1.06) saturate(1.22)' : undefined,
        transform: glossyBlur
          ? 'translate3d(calc(var(--mx, 0) * -14px), calc(var(--my, 0) * -10px), 0) scale(1.07)'
          : undefined
      }}
      decoding="async"
      loading="eager"
    />
    {glossyBlur && (
      <>
        {/* Frosted Obsidian Glass & Warm/Cyan Atmospheric Gradient Scrim */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(11, 19, 37, 0.48) 34%, rgba(6, 11, 22, 0.62) 66%, rgba(6, 11, 22, 0.82) 100%), radial-gradient(circle at 22% 20%, rgba(249, 115, 22, 0.18) 0%, transparent 48%), radial-gradient(circle at 80% 78%, rgba(34, 211, 238, 0.15) 0%, transparent 50%)'
          }}
        />
        {/* Dynamic Glossy Specular Sheen Layer driven by Parallax (--mx, --my) */}
        <div
          aria-hidden="true"
          className="absolute -inset-24 pointer-events-none transition-transform duration-300 ease-out"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * 28px), calc(var(--my, 0) * 20px), 0)',
            background:
              'radial-gradient(680px circle at 50% 35%, rgba(255, 255, 255, 0.10) 0%, rgba(249, 115, 22, 0.06) 35%, transparent 70%)'
          }}
        />
      </>
    )}
    {overlay && <div className="absolute inset-0 bg-slate-900/15 pointer-events-none" />}
  </div>
);

// Backward compatibility alias so any remaining imports resolve safely
export const AjrakBackground = TruckBackground;

/**
 * TruckPhotoShowcase - Rich display card featuring authentic Pakistani decorated trucks.
 * Used on the landing page and dashboards to proudly showcase Khyber & Sindh truck art.
 * Shows only the selected language (Urdu or English, never both at once).
 */
export const TruckPhotoShowcase = ({
  image = '/images/peacock_truck_art_bg.jpg',
  caption = 'ای کارگو بلٹی • محفوظ اور بااعتماد ترسیل',
  subcaption = 'Commercial Fleet • Verified Freight Transit Across Pakistan',
  tag = 'محفوظ ترسیل',
  tagEn = 'Safe Transit',
  dark = false,
  className = '',
  onClick,
  ctaLabel
}) => {
  const { isUrdu } = useLanguage();
  const activeTitle = isUrdu ? caption : subcaption;
  const activeTag = isUrdu ? tag : tagEn;
  const isInteractive = typeof onClick === 'function';

  const handleKeyDown = (e) => {
    if (!isInteractive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <Tilt3DCard
      maxTilt={3.5}
      scale={1.012}
      glareOpacity={0.18}
      glareRoundedClass="rounded-2xl"
      className={className}
    >
      <div
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={isInteractive ? onClick : undefined}
        onKeyDown={isInteractive ? handleKeyDown : undefined}
        className={`relative rounded-2xl overflow-hidden border transition-colors duration-200 group ${
          isInteractive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400/70' : ''
        } ${
          dark
            ? 'border-white/15 bg-slate-900 shadow-lg hover:border-orange-400/60'
            : 'border-slate-200/90 shadow-sm hover:shadow-lg bg-white hover:border-slate-300'
        }`}
      >
        <div className="relative h-56 sm:h-64 overflow-hidden bg-slate-900">
          <img
            src={image}
            alt={activeTitle}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-slate-950/20" />
          <div className="absolute inset-0 p-3 sm:p-3.5 flex flex-col justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <UrduMotto text={activeTag} translation={activeTag} dark={dark} />
              <NazarBattuBadge dark={dark} />
            </div>
            <div className="text-white flex flex-col gap-2 min-w-0">
              <div className={`min-w-0 ${isUrdu ? 'border-r-2 border-[#F89020] pr-2.5 text-right' : 'border-l-2 border-[#F89020] pl-2.5 text-left'}`}>
                <p className={isUrdu ? "font-urdu text-base sm:text-xl font-black text-white leading-snug line-clamp-2" : "font-sans text-[13px] sm:text-base font-bold text-white leading-snug line-clamp-2"}>
                  {activeTitle}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                {ctaLabel ? (
                  <span
                    className={`${isUrdu ? 'font-urdu text-xs' : 'font-mono text-[10px] sm:text-[11px]'} inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-orange-500/95 group-hover:bg-orange-400 text-white font-bold shadow-md whitespace-nowrap shrink-0 transition-colors`}
                  >
                    <span>{ctaLabel}</span>
                    <span aria-hidden="true">{isUrdu ? '←' : '→'}</span>
                  </span>
                ) : <span />}
                <TruckTaj size={24} className="shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Tilt3DCard>
  );
};

/**
 * SindhiTruckTexture - Removed as requested by user.
 */
export const SindhiTruckTexture = () => null;

/**
 * TruckTaj - Traditional Khyber Pass & Rawalpindi ornamental crown/taj motif.
 * Crown rendered in golden brass, ruby crimson, and turquoise enamel.
 */
export const TruckTaj = ({ size = 28, className = '', color = '#EA580C' }) => (
  <svg
    width={size}
    height={size * 0.55}
    viewBox="0 0 100 55"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
  >
    {/* Crown Base */}
    <path
      d="M10 50 L90 50 L95 42 L80 40 L88 22 L72 32 L60 8 L50 25 L40 8 L28 32 L12 22 L20 40 L5 42 Z"
      fill="url(#tajGoldOrangeGrad)"
      stroke="#334155"
      strokeWidth="1.5"
    />
    {/* Center Jewels */}
    <circle cx="50" cy="22" r="4.5" fill="#F89020" stroke="#FFF7ED" strokeWidth="1" />
    <circle cx="30" cy="30" r="3.5" fill="#475569" stroke="#FFF7ED" strokeWidth="1" />
    <circle cx="70" cy="30" r="3.5" fill="#475569" stroke="#FFF7ED" strokeWidth="1" />
    <circle cx="50" cy="38" r="5" fill="#EA580C" stroke="#1E293B" strokeWidth="1" />
    <defs>
      <linearGradient id="tajGoldOrangeGrad" x1="0" y1="0" x2="100" y2="55" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#EA580C" />
        <stop offset="35%" stopColor="#F89020" />
        <stop offset="70%" stopColor="#FB923C" />
        <stop offset="100%" stopColor="#C2410C" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * FloralRosette - Sindhi Jandi & Truck Art brass flower medallion
 */
export const FloralRosette = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
  >
    <circle cx="20" cy="20" r="18" stroke="#EA580C" strokeWidth="1.2" fill="#FFF7ED" />
    {/* 8 Petals in Logistics Orange & Charcoal Slate */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
      <ellipse
        key={i}
        cx="20"
        cy="11"
        rx="3.5"
        ry="7"
        fill={i % 2 === 0 ? '#F89020' : '#475569'}
        stroke="#1E293B"
        strokeWidth="0.6"
        transform={`rotate(${angle} 20 20)`}
      />
    ))}
    <circle cx="20" cy="20" r="5" fill="#EA580C" stroke="#FFFFFF" strokeWidth="1" />
  </svg>
);

/**
 * UrduMotto / TruckPoetry - Authentic Pakistani truck poetry & slogans.
 * Shows only the selected language (either Urdu or English, never both).
 */
export const UrduMotto = ({ text, translation, className = '', dark = true }) => {
  const { isUrdu, t } = useLanguage();
  const label = isUrdu ? (text || t('mottoLookLove')) : (translation || t('mottoLookLove'));
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border text-[11px] sm:text-xs shadow-xs hover:shadow-sm transition-all select-none whitespace-nowrap shrink-0 max-w-full ${
        dark
          ? 'border-orange-400/35 bg-slate-950/90 text-orange-200'
          : 'border-orange-200 bg-orange-50 text-orange-900'
      } ${className}`}
      title={label}
    >
      <TruckTaj size={14} className="shrink-0" />
      <span
        className={`truncate ${
          isUrdu
            ? `font-urdu text-[11px] sm:text-[12px] font-bold tracking-wide ${dark ? 'text-orange-200' : 'text-orange-800'}`
            : `font-sans text-[10px] sm:text-[11px] font-bold tracking-wide ${dark ? 'text-orange-200' : 'text-orange-800'}`
        }`}
      >
        {label}
      </span>
    </div>
  );
};

/**
 * TruckPoetryBanner - Traditional decorated poetry ribbon found across truck body panels.
 * Shows only the selected language (either Urdu or English, never both).
 */
export const TruckPoetryBanner = ({
  text,
  subtext,
  className = '',
  light = false
}) => {
  const { isUrdu, t } = useLanguage();
  const mainText = isUrdu ? (text || t('poetryBanner')) : (subtext || t('poetryBanner'));
  const secondaryText = isUrdu ? t('poetrySubtext') : t('poetrySubtext');
  return (
    <div className={`relative px-4 py-2.5 rounded-2xl border text-center overflow-hidden transition-colors duration-200 ${
      light
        ? 'border-slate-200 bg-white shadow-xs hover:shadow-sm'
        : 'border-white/15 bg-[#0B1325]/94 shadow-[0_12px_28px_rgba(2,6,23,0.48)] hover:border-white/25'
    } ${className}`}>
      <div className={light
        ? 'absolute top-0 left-0 right-0 h-1 bg-[#F89020]'
        : 'absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400'
      } />
      <div className="flex items-center justify-center gap-2 sm:gap-3 min-w-0">
        <FloralRosette size={16} className="shrink-0" />
        <span className={isUrdu
          ? `font-urdu text-base sm:text-lg font-black leading-snug ${light ? 'text-slate-900' : 'text-white'}`
          : `font-sans text-xs sm:text-sm font-black leading-snug ${light ? 'text-slate-900' : 'text-white'}`
        }>
          {mainText}
        </span>
        <FloralRosette size={16} className="shrink-0" />
      </div>
      {secondaryText && (
        <p className={`text-[10px] tracking-wider font-bold mt-0.5 ${light ? 'text-slate-600' : 'text-slate-300'} ${isUrdu ? 'font-urdu' : 'font-mono uppercase'}`}>
          {secondaryText}
        </p>
      )}
      <div className={light
        ? 'absolute bottom-0 left-0 right-0 h-1 bg-[#F89020]'
        : 'absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-500 opacity-75'
      } />
    </div>
  );
};

/**
 * WorkshopBadge - Decorative artisan/workshop badge.
 * Shows only the selected language (either Urdu or English, never both).
 */
export const WorkshopBadge = ({ className = '', dark = true }) => {
  const { isUrdu, t } = useLanguage();
  return (
    <div className={`flex items-center gap-2 text-[11px] ${dark ? 'text-slate-300' : 'text-slate-700'} ${isUrdu ? 'font-urdu' : 'font-mono'} ${className}`}>
      <span className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-xs ${dark ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-[#F89020]'}`}></span>
      <span className={`font-bold ${dark ? 'text-slate-100' : 'text-slate-800'}`}>
        {t('badgeWorkshop')}
      </span>
    </div>
  );
};
