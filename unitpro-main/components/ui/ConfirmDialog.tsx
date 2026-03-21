'use client';

import { useEffect } from 'react';
import { AlertTriangle, AlertCircle, HelpCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger: {
    icon: AlertCircle,
    iconClass: 'text-red-500',
    iconBg: 'bg-red-100',
    confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    iconBg: 'bg-amber-100',
    confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  default: {
    icon: HelpCircle,
    iconClass: 'text-slate-500',
    iconBg: 'bg-slate-100',
    confirmClass: 'bg-slate-800 hover:bg-slate-900 text-white',
  },
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const styles = VARIANT_STYLES[variant];
  const Icon = styles.icon;

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4">
        {/* Botón cerrar */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        {/* Icono + Título */}
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${styles.iconBg}`}>
            <Icon size={20} className={styles.iconClass} />
          </div>
          <div>
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-slate-900 leading-tight"
            >
              {title}
            </h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${styles.confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
