import { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-body-sm font-medium text-alien-300 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-alien-500">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full text-body-md text-alien-100
            bg-alien-900/50 backdrop-blur-sm
            border rounded-xl
            placeholder:text-alien-500
            focus:outline-none focus:ring-2 focus:ring-alien-500/50 focus:border-alien-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            ${leftIcon ? 'pl-10' : 'px-4'}
            ${rightIcon ? 'pr-10' : 'px-4'}
            py-3
            ${error ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500' : 'border-alien-500/20 focus:ring-alien-500/50 focus:border-alien-500'}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-alien-500">
            {rightIcon}
          </div>
        )}
        {props.type === 'password' && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-alien-500 hover:text-alien-300"
            aria-label="Toggle password visibility"
          >
            {props.showPassword ? '👁' : '🔒'}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-body-xs text-red-400 flex items-center gap-1" role="alert">
          <span className="w-3 h-3 flex-shrink-0">⚠</span>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-body-xs text-alien-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;