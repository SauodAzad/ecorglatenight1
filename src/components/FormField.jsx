import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * FormField
 * Standardized input wrapper featuring instant schema validation feedback,
 * red highlighting when invalid, leading icons, and bilingual error messages.
 */
export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder,
  required = false,
  icon: Icon,
  rightElement,
  disabled = false,
  className = '',
  inputClassName = '',
  dir = 'ltr',
  step,
  min,
  max,
  isUrdu = false
}) {
  const isInvalid = touched !== undefined ? Boolean(touched && error) : Boolean(error);

  return (
    <div className={`space-y-1 text-left ${className}`}>
      {label && (
        <div className="flex justify-between items-center">
          <label 
            htmlFor={name}
            className={`block text-[11px] font-extrabold uppercase tracking-wider ${
              isInvalid ? 'text-rose-400' : 'text-slate-200'
            } ${isUrdu ? 'font-urdu text-xs' : ''}`}
          >
            {label}
            {required && <span className="text-rose-400 ml-1 font-black">*</span>}
          </label>
        </div>
      )}

      <div className="relative rounded-xl transition-all duration-200">
        {Icon && (
          <div className={`absolute inset-y-0 ${isUrdu && dir === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none ${
            isInvalid ? 'text-rose-400' : 'text-slate-400'
          }`}>
            <Icon size={16} />
          </div>
        )}

        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          step={step}
          min={min}
          max={max}
          dir={dir}
          aria-invalid={isInvalid}
          className={`w-full rounded-xl text-xs sm:text-sm font-medium transition-all outline-none py-2 px-3 ${
            Icon ? (isUrdu && dir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3') : ''
          } ${
            rightElement ? 'pr-10' : ''
          } ${
            isInvalid
              ? 'bg-rose-500/15 border-2 border-rose-500/80 text-rose-100 placeholder-rose-300/70 focus:ring-2 focus:ring-rose-500/30 shadow-xs'
              : 'bg-[#0F1930]/80 border border-white/15 text-white placeholder-slate-400 hover:border-white/30 focus:bg-[#0F1930] focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 shadow-2xs'
          } ${disabled ? 'opacity-60 cursor-not-allowed bg-white/[0.04]' : ''} ${inputClassName}`}
        />

        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
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
