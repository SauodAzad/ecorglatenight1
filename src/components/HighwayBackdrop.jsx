/**
 * Compositor-only GPU dark highway backdrop:
 * - Zero SVG stroke-dashoffset CPU repaints
 * - Pure translate3d + opacity GPU layer animations locked to native display FPS (60/120Hz)
 * - Bounded 3D perspective highway grid + converging static laser rails + gliding photon pulses
 */
const ORANGE_CORE =
  'linear-gradient(90deg, transparent 0%, rgba(249, 115, 22, 0.52) 26%, rgba(251, 146, 60, 0.95) 68%, rgba(254, 243, 199, 1) 88%, transparent 100%)';
const AMBER_CORE =
  'linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.48) 26%, rgba(251, 191, 36, 0.92) 68%, rgba(254, 243, 199, 0.98) 88%, transparent 100%)';
const ORANGE_HALO =
  'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(251, 146, 60, 0.55) 0%, rgba(249, 115, 22, 0.2) 55%, transparent 100%)';

const CYAN_CORE =
  'linear-gradient(90deg, transparent 0%, rgba(224, 242, 254, 1) 12%, rgba(34, 211, 238, 0.95) 32%, rgba(14, 165, 233, 0.52) 74%, transparent 100%)';
const SKY_CORE =
  'linear-gradient(90deg, transparent 0%, rgba(224, 242, 254, 0.98) 12%, rgba(56, 189, 248, 0.92) 32%, rgba(6, 182, 212, 0.48) 74%, transparent 100%)';
const CYAN_HALO =
  'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.55) 0%, rgba(14, 165, 233, 0.2) 55%, transparent 100%)';

const LANE_EDGE_MASK = {
  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
  maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
};

const LASER_LANES = [
  // Left incoming lower fiery-orange highway lanes (thicker core + feathered halo, relaxed pace)
  { id: 'ol-1', pos: 'left-[-4%] bottom-[8%] w-[58%] -rotate-[22deg]', dir: 'beam-forward', core: ORANGE_CORE, halo: ORANGE_HALO, duration: '4.4s', delay: '0s', coreHeight: 'h-[4.5px]', haloHeight: 'h-[16px]' },
  { id: 'ol-2', pos: 'left-[-2%] bottom-[16%] w-[56%] -rotate-[16deg]', dir: 'beam-forward', core: ORANGE_CORE, halo: ORANGE_HALO, duration: '5.4s', delay: '-2.1s', coreHeight: 'h-[3.5px]', haloHeight: 'h-[13px]' },
  { id: 'ol-3', pos: 'left-[4%] bottom-[2%] w-[52%] -rotate-[28deg]', dir: 'beam-forward', core: AMBER_CORE, halo: ORANGE_HALO, duration: '3.9s', delay: '-1.1s', coreHeight: 'h-[3px]', haloHeight: 'h-[11px]' },
  // Left upper amber sky lane
  { id: 'al-1', pos: 'left-[2%] top-[14%] w-[52%] rotate-[17deg]', dir: 'beam-forward', core: AMBER_CORE, halo: ORANGE_HALO, duration: '4.9s', delay: '-2.7s', coreHeight: 'h-[3px]', haloHeight: 'h-[11px]' },

  // Right incoming lower electric-cyan highway lanes
  { id: 'cr-1', pos: 'right-[-4%] bottom-[8%] w-[58%] rotate-[22deg]', dir: 'beam-reverse', core: CYAN_CORE, halo: CYAN_HALO, duration: '4.4s', delay: '-0.95s', coreHeight: 'h-[4.5px]', haloHeight: 'h-[16px]' },
  { id: 'cr-2', pos: 'right-[-2%] bottom-[16%] w-[56%] rotate-[16deg]', dir: 'beam-reverse', core: SKY_CORE, halo: CYAN_HALO, duration: '5.4s', delay: '-3.2s', coreHeight: 'h-[3.5px]', haloHeight: 'h-[13px]' },
  { id: 'cr-3', pos: 'right-[4%] bottom-[2%] w-[52%] rotate-[28deg]', dir: 'beam-reverse', core: CYAN_CORE, halo: CYAN_HALO, duration: '3.9s', delay: '-1.9s', coreHeight: 'h-[3px]', haloHeight: 'h-[11px]' },
  // Right upper cyan sky lane
  { id: 'cb-1', pos: 'right-[2%] top-[14%] w-[52%] -rotate-[17deg]', dir: 'beam-reverse', core: SKY_CORE, halo: CYAN_HALO, duration: '4.9s', delay: '-1.5s', coreHeight: 'h-[3px]', haloHeight: 'h-[11px]' },
];

const STATIC_RAILS = [
  { id: 'sl-1', x1: -60, y1: 670, x2: 640, y2: 355, stroke: 'orangeTrailL', width: 5, glowWidth: 12, glowOpacity: 0.26 },
  { id: 'sl-2', x1: -40, y1: 610, x2: 610, y2: 345, stroke: 'orangeTrailL', width: 3, glowWidth: 8, glowOpacity: 0.22 },
  { id: 'sl-3', x1: 70, y1: 760, x2: 660, y2: 380, stroke: 'orangeTrailL', width: 4, glowWidth: 10, glowOpacity: 0.24 },
  { id: 'sl-4', x1: 40, y1: 120, x2: 610, y2: 335, stroke: 'amberBeam', width: 3.2, glowWidth: 8, glowOpacity: 0.2 },
  { id: 'sr-1', x1: 1500, y1: 650, x2: 800, y2: 355, stroke: 'cyanTrailR', width: 5, glowWidth: 12, glowOpacity: 0.26 },
  { id: 'sr-2', x1: 1480, y1: 590, x2: 830, y2: 345, stroke: 'cyanTrailR', width: 3, glowWidth: 8, glowOpacity: 0.22 },
  { id: 'sr-3', x1: 1360, y1: 760, x2: 780, y2: 380, stroke: 'cyanTrailR', width: 4, glowWidth: 10, glowOpacity: 0.24 },
  { id: 'sr-4', x1: 1400, y1: 130, x2: 830, y2: 335, stroke: 'cyanBeamTop', width: 3.2, glowWidth: 8, glowOpacity: 0.2 },
];

const BOKEH_ORBS = [
  { id: 'b1', cls: 'left-[10%] top-[26%] w-3 h-3 bg-orange-400/75 shadow-[0_0_14px_rgba(251,146,60,0.65)]', delay: '0s' },
  { id: 'b2', cls: 'left-[16%] bottom-[26%] w-3.5 h-3.5 bg-orange-500/65 shadow-[0_0_16px_rgba(249,115,22,0.6)]', delay: '1.8s' },
  { id: 'b3', cls: 'right-[10%] top-[28%] w-3 h-3 bg-cyan-400/75 shadow-[0_0_14px_rgba(34,211,238,0.65)]', delay: '1.0s' },
  { id: 'b4', cls: 'right-[17%] bottom-[28%] w-3.5 h-3.5 bg-sky-400/65 shadow-[0_0_16px_rgba(56,189,248,0.6)]', delay: '3.1s' },
];

export default function HighwayBackdrop({ variant = 'hero', fixed = false }) {
  const isHero = variant === 'hero';
  const positionClass = fixed ? 'fixed inset-0 z-0' : 'absolute inset-0';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none ${positionClass} overflow-hidden select-none bg-[#060B16] gpu-backdrop-layer`}
    >
      {/* Deep midnight atmospheric radial base (static GPU texture) */}
      <div
        className="absolute inset-0"
        style={{
          background: isHero
            ? 'radial-gradient(ellipse 95% 75% at 50% 42%, #111D35 0%, #091020 48%, #050912 100%)'
            : 'radial-gradient(ellipse 90% 80% at 50% 50%, #101B33 0%, #070C18 55%, #04070E 100%)',
        }}
      />

      {/* Very subtle background cursor backlight via pure GPU translate3d */}
      {isHero && (
        <div
          className="hidden sm:block absolute left-0 top-0 w-[440px] h-[440px] rounded-full will-change-transform"
          style={{
            opacity: 'calc(0.45 + var(--cursor-active, 0) * 0.35)',
            transform:
              'translate3d(calc(var(--px, 50vw) - 50%), calc(var(--py, 34vh) - 50%), 0)',
            transition:
              'transform 140ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease-out',
            background:
              'radial-gradient(circle, rgba(249, 115, 22, 0.12) 0%, rgba(6, 182, 212, 0.045) 45%, transparent 72%)',
          }}
        />
      )}

      {/* Bounded lower-half 3D perspective road grid (100% GPU translate3d) */}
      <div
        className="hidden sm:block absolute inset-x-0 top-[42%] bottom-0 opacity-35 overflow-hidden"
        style={{
          transform: 'perspective(520px) rotateX(52deg) scale(1.35)',
          transformOrigin: 'center top',
          WebkitMaskImage:
            'radial-gradient(ellipse 82% 72% at 50% 45%, black 15%, transparent 82%)',
          maskImage:
            'radial-gradient(ellipse 82% 72% at 50% 45%, black 15%, transparent 82%)',
        }}
      >
        <div
          className="absolute inset-x-0 -top-[56px] bottom-0 highway-grid-flow"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(56, 189, 248, 0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(249, 115, 22, 0.13) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      {/* Static converging base rails (rasterized ONCE, zero per-frame SVG repaint) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-85"
        viewBox="0 0 1440 760"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`orangeTrailL-${variant}`} x1="0" y1="700" x2="720" y2="340" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FB923C" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#F97316" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`cyanTrailR-${variant}`} x1="1440" y1="680" x2="720" y2="340" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#0EA5E9" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`amberBeam-${variant}`} x1="120" y1="80" x2="720" y2="360" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.52" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`cyanBeamTop-${variant}`} x1="1320" y1="90" x2="720" y2="360" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d="M-120 740 L680 350 L740 375 L120 790 Z" fill={`url(#orangeTrailL-${variant})`} opacity="0.22" />
        <path d="M1560 720 L750 350 L690 375 L1320 790 Z" fill={`url(#cyanTrailR-${variant})`} opacity="0.2" />

        <g className="streak-pulse">
          {STATIC_RAILS.map((rail) => (
            <line
              key={`${rail.id}-glow`}
              x1={rail.x1}
              y1={rail.y1}
              x2={rail.x2}
              y2={rail.y2}
              stroke={`url(#${rail.stroke}-${variant})`}
              strokeWidth={rail.glowWidth}
              strokeLinecap="round"
              opacity={rail.glowOpacity}
            />
          ))}
          {STATIC_RAILS.map((rail) => (
            <line
              key={rail.id}
              x1={rail.x1}
              y1={rail.y1}
              x2={rail.x2}
              y2={rail.y2}
              stroke={`url(#${rail.stroke}-${variant})`}
              strokeWidth={rail.width}
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Central vanish-point horizon core flare */}
        <ellipse
          cx="720"
          cy="355"
          rx="220"
          ry="18"
          fill="rgba(255, 255, 255, 0.06)"
        />
        <line
          x1="460"
          y1="355"
          x2="980"
          y2="355"
          stroke={`url(#orangeTrailL-${variant})`}
          strokeWidth="1.5"
          opacity="0.45"
        />
      </svg>

      {/* Pure GPU compositor gliding photon streaks (thick core + soft radial halo, zero SVG repaints) */}
      <div className="absolute inset-0 overflow-hidden opacity-95">
        {LASER_LANES.map((lane) => (
          <div
            key={lane.id}
            className={`absolute ${lane.pos} h-7 flex items-center overflow-hidden`}
            style={LANE_EDGE_MASK}
          >
            <div
              className={`relative w-[38%] flex items-center ${lane.dir}`}
              style={{ animationDuration: lane.duration, animationDelay: lane.delay }}
            >
              <span
                className={`absolute inset-x-0 top-1/2 -translate-y-1/2 ${lane.haloHeight} rounded-full`}
                style={{ background: lane.halo }}
              />
              <span
                className={`relative w-full ${lane.coreHeight} rounded-full opacity-95`}
                style={{ background: lane.core }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* GPU-composited floating bokeh orbs */}
      {BOKEH_ORBS.map((orb) => (
        <div
          key={orb.id}
          className={`hidden sm:block absolute rounded-full highway-bokeh-float ${orb.cls}`}
          style={{ animationDelay: orb.delay }}
        />
      ))}

      {/* Dual-color atmospheric horizon blooms */}
      <div
        className="absolute -left-24 top-[14%] w-[420px] h-[420px] rounded-full hero-glow-drift"
        style={{
          background:
            'radial-gradient(circle, rgba(249, 115, 22, 0.25) 0%, rgba(249, 115, 22, 0.1) 36%, transparent 72%)',
        }}
      />
      <div
        className="absolute -right-24 bottom-[12%] w-[420px] h-[420px] rounded-full hero-glow-drift"
        style={{
          animationDelay: '2.5s',
          background:
            'radial-gradient(circle, rgba(6, 182, 212, 0.24) 0%, rgba(56, 189, 248, 0.09) 36%, transparent 72%)',
        }}
      />
    </div>
  );
}
