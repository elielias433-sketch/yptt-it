import { forwardRef } from 'react';

export const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-alien-950 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-gradient-to-r from-alien-500 to-alien-600 text-white shadow-glow-sm hover:from-alien-400 hover:to-alien-500 hover:shadow-glow-md active:scale-[0.98]',
    secondary: 'bg-alien-800/50 backdrop-blur-sm border border-alien-500/30 text-alien-300 hover:bg-alien-700/50 hover:border-alien-400/50 hover:text-alien-100 hover:shadow-glow-sm active:scale-[0.98]',
    ghost: 'text-alien-400 hover:bg-alien-700/30 hover:text-alien-100 active:scale-[0.98]',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_0_8px_rgba(239,68,68,0.2)] hover:from-red-500 hover:to-red-600 hover:shadow-[0_0_16px_rgba(239,68,68,0.3)] active:scale-[0.98]',
    success: 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-[0_0_8px_rgba(16,185,129,0.2)] hover:from-emerald-500 hover:to-emerald-600 hover:shadow-[0_0_16px_rgba(16,185,129,0.3)] active:scale-[0.98]',
    outline: 'bg-transparent border border-alien-500/30 text-alien-300 hover:bg-alien-700/30 hover:border-alien-400/50 hover:text-alien-100 active:scale-[0.98]',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-body-xs gap-1.5',
    md: 'px-5 py-2.5 text-body-md gap-2',
    lg: 'px-6 py-3 text-body-lg gap-2',
    xl: 'px-8 py-4 text-heading-sm gap-2.5',
  };
  
  const width = fullWidth ? 'w-full' : '';
  
  const className_combined = `
    inline-flex items-center justify-center gap-2 font-medium rounded-xl
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-alien-500/50 focus:ring-offset-2 focus:ring-offset-alien-950
    disabled:opacity-50 disabled:cursor-not-allowed
    ${variants[variant]}
    ${sizes[size]}
    ${width}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={className_combined}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="relative w-4 h-4">
            <span className="absolute inset-0 border-2 border-alien-500/20 rounded-full" />
            <span className="absolute inset-0 border-2 border-alien-500 border-t-transparent rounded-full animate-spin" />
          </span>
          <span>{children}</span>
        </span>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;