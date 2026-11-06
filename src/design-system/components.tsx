import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface DSButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export function DSButton({ variant = 'secondary', loading = false, disabled, className = '', children, ...props }: DSButtonProps) {
  return (
    <button
      {...props}
      className={['ds-button', `ds-button--${variant}`, className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {children}
    </button>
  );
}

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export interface DSBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}
export function DSBadge({ variant = 'neutral', className = '', children, ...props }: DSBadgeProps) {
  return <span {...props} className={['ds-badge', `ds-badge--${variant}`, className].filter(Boolean).join(' ')}>{children}</span>;
}

export interface DSInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export function DSInput({ className = '', ...props }: DSInputProps) {
  return <input {...props} className={['ds-field', className].filter(Boolean).join(' ')} />;
}

export interface DSSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}
export function DSSelect({ className = '', children, ...props }: DSSelectProps) {
  return <select {...props} className={['ds-select', className].filter(Boolean).join(' ')}>{children}</select>;
}

export interface DSTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export function DSTextarea({ className = '', ...props }: DSTextareaProps) {
  return <textarea {...props} className={['ds-textarea', className].filter(Boolean).join(' ')} />;
}

export interface DSPageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}
export function DSPageHeader({ title, eyebrow, description, actions, className = '' }: DSPageHeaderProps) {
  return (
    <header className={['ds-page-header', className].filter(Boolean).join(' ')}>
      <div className="ds-page-header__copy">
        {eyebrow && <p className="ds-page-header__eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ds-page-header__actions">{actions}</div>}
    </header>
  );
}
