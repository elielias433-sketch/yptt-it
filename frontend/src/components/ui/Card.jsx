import { forwardRef } from 'react';

export const Card = forwardRef(({
  children,
  variant = 'default',
  elevated = false,
  hoverable = false,
  className = '',
  ...props
}, ref) => {
  const variants = {
    default: 'bg-alien-800/60 backdrop-blur-sm border border-alien-500/20',
    elevated: 'bg-alien-800/80 backdrop-blur-md border border-alien-500/30 shadow-glow-md',
    glass: 'bg-alien-800/40 backdrop-blur-sm border border-alien-500/10',
    strong: 'bg-alien-800/90 backdrop-blur-md border border-alien-500/40 shadow-glow-md',
  };
  
  const hoverStyles = hoverable 
    ? 'transition-all duration-300 hover:border-alien-400/40 hover:shadow-card-hover' 
    : '';
  
  return (
    <div
      ref={ref}
      className={`
        rounded-card-lg ${variants[variant]} ${hoverStyles}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export const CardHeader = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => (
  <div
    ref={ref}
    className={`px-6 py-4 border-b border-alien-500/20 ${className}`}
    {...props}
  >
    {children}
  </div>
));

CardHeader.displayName = 'CardHeader';

export const CardBody = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => (
  <div
    ref={ref}
    className={`p-6 ${className}`}
    {...props}
  >
    {children}
  </div>
));

CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => (
  <div
    ref={ref}
    className={`px-6 py-4 border-t border-alien-500/20 flex items-center justify-end gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
));

CardFooter.displayName = 'CardFooter';

export default Card;