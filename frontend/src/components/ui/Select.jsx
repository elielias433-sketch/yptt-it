import { forwardRef } from 'react';

export const Select = forwardRef(({
  label,
  error,
  helperText,
  options = [],
  placeholder = 'Select...',
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText ? `${selectId}-helper` : undefined;
  
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={selectId} className="block text-body-sm font-medium text-alien-300 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={`
            w-full appearance-none text-body-md text-alien-100
            bg-alien-900/50 backdrop-blur-sm
            border rounded-xl
            focus:outline-none focus:ring-2 focus:ring-alien-500/50 focus:border-alien-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            px-4 py-3 pr-10
            ${error ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500' : 'border-alien-500/20 focus:ring-alien-500/50 focus:border-alien-500'}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-alien-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-body-xs text-red-400 flex items-center gap-1" role="alert">
          <span className="w-3 h-3 flex-shrink-0">⚠</span>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-body-xs text-alien-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;