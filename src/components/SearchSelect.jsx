import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X, AlertCircle } from 'lucide-react';

/**
 * SearchSelect
 * High-performance autocomplete combobox with React Portal.
 * Renders the popover menu directly into document.body to completely escape
 * parent stacking contexts, backdrop-filters, and overflow:hidden clipping.
 */
export default function SearchSelect({
  label,
  value,
  onChange,
  onBlur,
  options = [], // [{ value/id, label, subtext, icon, badge }]
  placeholder = 'Select or search...',
  quickPills = [], // Quick 1-click select pills
  error,
  touched,
  required = false,
  isUrdu = false,
  className = '',
  icon: LeadingIcon
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({});
  const wrapperRef = useRef(null);
  const triggerBoxRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Calculate dynamic fixed positioning relative to viewport
  const updatePosition = () => {
    if (!triggerBoxRef.current) return;
    const rect = triggerBoxRef.current.getBoundingClientRect();
    const estHeight = 260; // Max dropdown height
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Flip upwards if not enough space below and more space above
    const openUp = spaceBelow < estHeight && spaceAbove > spaceBelow;

    const top = openUp
      ? Math.max(8, rect.top - Math.min(estHeight, spaceAbove - 12) - 4)
      : rect.bottom + 4;

    const maxHeight = openUp
      ? Math.min(estHeight, spaceAbove - 16)
      : Math.min(estHeight, spaceBelow - 16);

    // Keep horizontally within viewport boundaries (guaranteed mobile safety)
    const viewportWidth = window.innerWidth;
    const targetWidth = Math.min(Math.max(rect.width, 220), viewportWidth - 16);
    const left = Math.max(8, Math.min(rect.left, viewportWidth - targetWidth - 8));

    setDropdownStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${targetWidth}px`,
      maxWidth: 'calc(100vw - 16px)',
      maxHeight: `${Math.max(120, maxHeight)}px`,
      zIndex: 99999,
    });
  };

  // Reposition on scroll and resize
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const onScrollOrResize = () => {
        updatePosition();
      };
      // Use capture to catch scrolling inside modals and overflow containers
      window.addEventListener('scroll', onScrollOrResize, true);
      window.addEventListener('resize', onScrollOrResize);
      return () => {
        window.removeEventListener('scroll', onScrollOrResize, true);
        window.removeEventListener('resize', onScrollOrResize);
      };
    }
  }, [isOpen]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        triggerBoxRef.current &&
        !triggerBoxRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerBoxRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onBlur]);

  // Selected option display
  const selectedOption = options.find(
    opt => (opt.value || opt.id || opt.name) === value || opt.label === value
  );

  const filteredOptions = options.filter(opt => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    const labelMatch = (opt.label || opt.name || '').toLowerCase().includes(term);
    const subMatch = (opt.subtext || opt.province || opt.hub || '').toLowerCase().includes(term);
    return labelMatch || subMatch;
  });

  const handleSelect = (opt) => {
    const val = opt.value || opt.id || opt.name || opt.label;
    onChange(val, opt);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', null);
    setSearchQuery('');
  };

  const isInvalid = touched !== undefined ? Boolean(touched && error) : Boolean(error);

  return (
    <div ref={wrapperRef} className={`space-y-1 text-left relative ${isOpen ? 'z-30' : 'z-10'} ${className}`}>
      {label && (
        <label className={`block text-[11px] font-extrabold uppercase tracking-wider ${
          isInvalid ? 'text-rose-400' : 'text-slate-200'
        } ${isUrdu ? 'font-urdu text-xs' : ''}`}>
          {label}
          {required && <span className="text-rose-400 ml-1 font-black">*</span>}
        </label>
      )}

      {/* Main Trigger Box */}
      <div 
        ref={triggerBoxRef}
        role="combobox"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={isInvalid}
        aria-label={label || placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
            updatePosition();
            setTimeout(() => inputRef.current?.focus(), 50);
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState) {
            updatePosition();
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full rounded-xl py-2 px-3 flex items-center justify-between gap-2 text-xs sm:text-sm font-medium transition-all cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
          isInvalid
            ? 'bg-rose-500/15 border-2 border-rose-500/80 text-rose-100 shadow-xs'
            : isOpen
              ? 'bg-[#0F1930] border-2 border-orange-500 ring-2 ring-orange-500/25 shadow-xs'
              : 'bg-[#0F1930]/80 border border-white/15 text-white hover:border-white/30 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1">
          {LeadingIcon && <LeadingIcon size={16} className={isInvalid ? 'text-rose-400' : 'text-slate-400'} />}
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.icon && <span className="text-sm shrink-0">{selectedOption.icon}</span>}
              <span className="font-bold text-white truncate">
                {selectedOption.label || selectedOption.name}
              </span>
              {(selectedOption.subtext || selectedOption.province) && (
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  ({selectedOption.subtext || selectedOption.province})
                </span>
              )}
            </div>
          ) : value ? (
            <span className="font-bold text-white truncate">{value}</span>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(value || selectedOption) && (
            <button 
              type="button"
              onClick={handleClear}
              aria-label="Clear selection"
              className="p-1 hover:bg-white/15 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-orange-400' : ''}`} />
        </div>
      </div>

      {/* Quick Select Pills (e.g. popular cities like Karachi, Lahore, Rawalpindi) */}
      {quickPills.length > 0 && !isOpen && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Quick:</span>
          {quickPills.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => {
                const found = options.find(o => (o.name || o.label || o.value) === pill);
                onChange(pill, found || null);
              }}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                value === pill
                  ? 'bg-orange-500/20 border-orange-400/50 text-orange-200'
                  : 'bg-white/[0.06] hover:bg-white/15 border-white/15 text-slate-300'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      )}

      {/* Floating Dropdown Menu via React Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-[#0B1325]/98 border border-white/15 rounded-xl shadow-[0_20px_52px_rgba(0,0,0,0.85)] overflow-hidden animate-dropdown-fade flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input Box */}
          <div className="p-2.5 border-b border-white/10 bg-[#0F1930]/90 flex items-center gap-2 shrink-0">
            <Search size={14} className="text-orange-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Type to filter..."
              className="w-full bg-transparent border-0 text-xs py-1 text-white placeholder-slate-400 outline-none font-medium"
              onClick={e => e.stopPropagation()}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-52 divide-y divide-white/[0.06] p-1.5 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => {
                const optVal = opt.value || opt.id || opt.name || opt.label;
                const isSelected = value === optVal;

                return (
                  <div
                    key={optVal || i}
                    onClick={() => handleSelect(opt)}
                    className={`px-3 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-orange-500/20 font-bold text-orange-200 border border-orange-400/40' 
                        : 'hover:bg-white/[0.07] text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {opt.icon && <span className="text-base shrink-0">{opt.icon}</span>}
                      <div className="truncate">
                        <p className="font-semibold text-white leading-tight truncate">{opt.label || opt.name}</p>
                        {(opt.subtext || opt.province || opt.hub) && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                            {opt.province ? `${opt.province} • ` : ''}{opt.hub || opt.subtext}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {opt.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-200 border border-white/15 font-bold">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check size={15} className="text-orange-400 font-bold" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                No matching options found.
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Validation Error Message */}
      {isInvalid && (
        <div className="flex items-center gap-1.5 text-rose-400 text-[11px] font-bold animate-fadeIn pl-0.5">
          <AlertCircle size={13} className="shrink-0 text-rose-400" />
          <span className={isUrdu ? 'font-urdu' : ''}>{error}</span>
        </div>
      )}
    </div>
  );
}
