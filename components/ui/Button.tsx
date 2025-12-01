import * as React from 'react';

type Variant = 'gold' | 'outline' | 'ghost';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
};

export default function Button({
  className,
  variant = 'gold',
  size = 'md',
  children,
  ...props
}: Props) {
  const base = 'inline-flex items-center justify-center rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-0';

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }[size];

  const variants: Record<Variant, string> = {
    gold: 'bg-gold text-black hover:bg-gold-dark/90 shadow-soft hover:shadow-lux',
    outline: 'bg-white text-black border border-gold/40 hover:border-gold/60 hover:shadow-soft',
    ghost: 'bg-transparent text-black hover:bg-gold/10',
  };

  const classes = [base, sizes, variants[variant], className].filter(Boolean).join(' ');
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
