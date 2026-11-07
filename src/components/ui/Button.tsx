'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'ink' | 'destructive' | 'glossy';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-lg';
  rounded?: 'full' | 'xl' | '2xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  href?: string;
  glow?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      rounded = 'full',
      isLoading = false,
      leftIcon,
      rightIcon,
      href,
      disabled,
      glow = false,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      ink: 'btn-ink-pill',
      destructive: 'btn-destructive',
      glossy: 'btn-primary shadow-lg',
    };

    const sizeClasses = {
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
      xl: 'btn-xl',
      icon: 'btn-icon',
      'icon-sm': 'btn-icon btn-icon-sm',
      'icon-lg': 'btn-icon btn-icon-lg',
    };

    const roundedClasses = {
      full: 'rounded-full',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
    };

    const combinedClasses = cn(
      variantClasses[variant],
      sizeClasses[size],
      roundedClasses[rounded],
      glow && 'shadow-[0_0_20px_rgba(79,131,241,0.45)]',
      isLoading && 'opacity-80 pointer-events-none',
      className
    );

    const content = (
      <>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </>
    );

    if (href) {
      return (
        <Link href={href} className={combinedClasses} aria-disabled={disabled || isLoading}>
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={combinedClasses}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

