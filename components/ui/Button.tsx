'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'gradient' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-brand-blue text-white hover:bg-brand-light-blue focus:ring-brand-blue/50 active:scale-95',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400/50 active:scale-95',
    outline: 'border-2 border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white focus:ring-brand-blue/50 active:scale-95',
    gradient: 'relative text-white overflow-hidden group bg-gradient-to-r from-brand-gradient-start via-brand-gradient-middle to-brand-gradient-end bg-[length:200%_200%] hover:bg-[position:100%_100%] transition-all duration-500 focus:ring-brand-blue/50 active:scale-95 animate-gradient',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-400/50 active:scale-95',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      {...props}
    >
      {variant === 'gradient' && (
        <span className="absolute inset-0 bg-gradient-to-r from-brand-gradient-start via-brand-gradient-middle to-brand-gradient-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}