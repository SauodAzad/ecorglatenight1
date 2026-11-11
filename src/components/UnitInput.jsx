import React from 'react';
import { AlertCircle } from 'lucide-react';
import { WEIGHT_UNITS, DIMENSION_UNITS, VOLUME_UNITS, RATE_TYPES } from '../data/logisticsData';

/**
 * UnitInput
 * Numeric input seamlessly combined with a selectable unit dropdown
 * (Kg, Ton, Maund, Quintal, cu ft, liters, meters, PKR/Trip, PKR/Ton, PKR/Km).
 */
export default function UnitInput({
  label,
  value,
  unit,
  selectedUnit,
  onValueChange,
  onChange,
  onUnitChange,
  onBlur,
  unitCategory = 'weight', // 'weight' | 'dimension' | 'volume' | 'rate' | 'custom'
  customUnits = null,
  units = null,
  error,
  touched,
  required = false,
  placeholder = '0.00',
  step = 'any',
  min = '0.01',
  isUrdu = false,
  className = ''
}) {
  const isInvalid = touched !== undefined ? Boolean(touched && error) : Boolean(error);
  const activeUnit = selectedUnit !== undefined ? selectedUnit : unit;

  const handleValueChange = (val) => {
    if (onValueChange) onValueChange(val);
    if (onChange) onChange(val);
  };

  const getUnits = () => {
    if (units) return units;
    if (customUnits) return customUnits;
    switch (unitCategory) {
      case 'weight':
        return WEIGHT_UNITS;
      case 'dimension':
        return DIMENSION_UNITS;
      case 'volume':
        return VOLUME_UNITS;
      case 'rate':
        return RATE_TYPES;
      default:
        return WEIGHT_UNITS;
    }
  };

  const unitsList = getUnits();

  return (
    <div className={`space-y-1 text-left ${className}`}>
      {label && (
        <label className={`block text-[11px] font-extrabold uppercase tracking-wider ${
          isInvalid ? 'text-rose-400' : 'text-slate-200'
        } ${isUrdu ? 'font-urdu text-xs' : ''}`}>
          {label}
          {required && <span className="text-rose-400 ml-1 font-black">*</span>}
        </label>
      )}

      {/* Input + Dropdown Group */}
      <div className={`flex rounded-xl overflow-hidden transition-all duration-200 border ${
        isInvalid
          ? 'bg-rose-500/15 border-2 border-rose-500/80 ring-2 ring-rose-500/25 shadow-xs'
          : 'bg-[#0F1930]/80 border-white/15 hover:border-white/30 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/25 shadow-2xs'
      }`}>
        <input
          type="number"
          step={step}
          min={min}
          value={value ?? ''}
          onChange={(e) => handleValueChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-label={label || 'Numeric value'}
          className={`flex-1 min-w-0 py-2 px-3 border-0 text-xs sm:text-sm font-mono font-bold bg-transparent outline-none focus:ring-0 ${
            isInvalid ? 'text-rose-100 placeholder-rose-300/70' : 'text-white placeholder-slate-400'
          }`}
        />

        <div className="border-l border-white/15 bg-white/[0.06] flex items-center shrink-0">
          <select
            value={activeUnit}
            onChange={(e) => onUnitChange && onUnitChange(e.target.value)}
            aria-label={`${label || 'Measurement'} unit`}
            className="bg-transparent border-0 text-[11px] font-bold text-slate-200 px-2 sm:px-2.5 py-2 outline-none focus:ring-0 cursor-pointer hover:bg-white/10 transition-colors max-w-[115px] sm:max-w-none truncate"
          >
            {unitsList.map((u) => (
              <option key={u.id} value={u.id} className="bg-[#0B1325] text-slate-100 font-medium">
                {u.label || u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isInvalid && (
        <div className="flex items-center gap-1.5 text-rose-400 text-[11px] font-bold animate-fadeIn pl-0.5">
          <AlertCircle size={13} className="shrink-0 text-rose-400" />
          <span className={isUrdu ? 'font-urdu' : ''}>{error}</span>
        </div>
      )}
    </div>
  );
}
