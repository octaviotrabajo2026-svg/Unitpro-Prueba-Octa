'use client';

import { Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveButtonProps {
  status: SaveStatus;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  idleLabel?: string;
  savedLabel?: string;
  errorLabel?: string;
}

const STATUS_CONFIG = {
  idle: {
    icon: Save,
    label: 'Guardar',
    className: 'bg-slate-800 hover:bg-slate-900 text-white',
    iconClass: '',
  },
  saving: {
    icon: Loader2,
    label: 'Guardando...',
    className: 'bg-slate-600 text-white cursor-not-allowed',
    iconClass: 'animate-spin',
  },
  saved: {
    icon: CheckCircle,
    label: 'Guardado',
    className: 'bg-green-600 text-white cursor-default',
    iconClass: '',
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    className: 'bg-red-600 hover:bg-red-700 text-white',
    iconClass: '',
  },
};

export default function SaveButton({
  status,
  onClick,
  disabled,
  className = '',
  idleLabel,
  savedLabel,
  errorLabel,
}: SaveButtonProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const label =
    status === 'idle' && idleLabel ? idleLabel :
    status === 'saved' && savedLabel ? savedLabel :
    status === 'error' && errorLabel ? errorLabel :
    config.label;

  const isDisabled = disabled || status === 'saving' || status === 'saved';

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${config.className} ${isDisabled ? 'opacity-80' : ''} ${className}`}
    >
      <Icon size={15} className={config.iconClass} />
      {label}
    </button>
  );
}
