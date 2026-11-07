'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClear?: () => void;
  rounded?: 'full' | 'xl' | '2xl';
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      leftIcon,
      rightIcon,
      onClear,
      rounded = 'xl',
      error,
      value,
      ...props
    },
    ref
  ) => {
    const isPill = rounded === 'full';

    return (
      <div className="w-full relative flex flex-col gap-1.5">
        <div className="relative w-full flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            value={value}
            className={cn(
              isPill ? 'search-pill' : 'saas-input',
              leftIcon && 'pl-10',
              (rightIcon || onClear) && 'pr-10',
              error && 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:shadow-[0_0_0_3px_rgba(240,100,100,0.2)]',
              className
            )}
            {...props}
          />
          {onClear && value && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              aria-label="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!onClear && rightIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <span className="text-xs text-[var(--color-error)] px-1">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'rounded'> {
  placeholder?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ placeholder = 'Search...', className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        rounded="full"
        leftIcon={<Search className="w-4 h-4" />}
        placeholder={placeholder}
        className={cn('search-pill', className)}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

