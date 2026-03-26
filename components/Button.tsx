import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600/30',
  secondary:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-600/20',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500/30',
  ghost: 'text-secondary hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-200',
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(({ children, className = '', variant = 'primary', type = 'button', onClick, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${variantClass[variant]} ${className}`}
      onClick={props.disabled ? undefined : onClick}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
