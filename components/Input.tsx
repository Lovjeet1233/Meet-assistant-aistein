import React from 'react';

interface InputProps {
  value: string | undefined | null;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
}

export const Input = (props: InputProps) => {
  return (
    <input
      className={`h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-primary outline-none transition-shadow placeholder:text-tertiary focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 ${props.className || ''}`}
      placeholder={props.placeholder}
      type={props.type ?? 'text'}
      autoComplete={props.autoComplete}
      value={props.value || ''}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
};
