export const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  dot = false,
  className = '',
  ...props 
}) => {
  const variants = {
    default: 'bg-alien-500/20 text-alien-300 border border-alien-500/30',
    planning: 'bg-alien-500/20 text-alien-300 border border-alien-500/30',
    inprogress: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    in_progress: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    completed: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    onhold: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
    on_hold: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
    cancelled: 'bg-red-500/20 text-red-300 border border-red-500/30',
    pending: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    kal: 'bg-alien-500/20 text-alien-300 border border-alien-500/30',
    sul: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    danger: 'bg-red-500/20 text-red-300 border border-red-500/30',
    info: 'bg-alien-500/20 text-alien-300 border border-alien-500/30',
    neutral: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-caption',
    md: 'px-2.5 py-1 text-caption',
    lg: 'px-3 py-1.5 text-body-xs',
  };
  
  const normalizedVariant = variant.toLowerCase().replace(/-/g, '_');
  
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${variants[normalizedVariant] || variants.default}
        ${sizes[size] || sizes.md}
        ${props.className}
      `}
      {...props}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />}
      {children}
    </span>
  );
};

export default Badge;