import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { clsx } from 'clsx';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const toastConfig: Record<ToastType, {
  icon: typeof CheckCircleIcon;
  bgClass: string;
  borderClass: string;
  iconClass: string;
  progressClass: string;
}> = {
  success: {
    icon: CheckCircleIcon,
    bgClass: 'bg-gradient-to-r from-green-50 to-emerald-50',
    borderClass: 'border-green-200',
    iconClass: 'text-green-500',
    progressClass: 'bg-green-500',
  },
  error: {
    icon: XCircleIcon,
    bgClass: 'bg-gradient-to-r from-red-50 to-pink-50',
    borderClass: 'border-red-200',
    iconClass: 'text-red-500',
    progressClass: 'bg-red-500',
  },
  warning: {
    icon: ExclamationCircleIcon,
    bgClass: 'bg-gradient-to-r from-amber-50 to-yellow-50',
    borderClass: 'border-amber-200',
    iconClass: 'text-amber-500',
    progressClass: 'bg-amber-500',
  },
  info: {
    icon: InformationCircleIcon,
    bgClass: 'bg-gradient-to-r from-blue-50 to-indigo-50',
    borderClass: 'border-blue-200',
    iconClass: 'text-blue-500',
    progressClass: 'bg-blue-500',
  },
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: () => void;
}) {
  const config = toastConfig[toast.type];
  const Icon = config.icon;
  const duration = toast.duration || 5000;

  return (
    <div
      className={clsx(
        'relative flex items-start gap-3 p-4 pr-10 rounded-xl border shadow-lg backdrop-blur-sm',
        'animate-slideInRight',
        config.bgClass,
        config.borderClass
      )}
      style={{ minWidth: '320px', maxWidth: '400px' }}
    >
      {/* Icon */}
      <div className={clsx('flex-shrink-0 mt-0.5', config.iconClass)}>
        <Icon className="w-6 h-6" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-sm text-gray-600 leading-relaxed">{toast.message}</p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/50 rounded-b-xl overflow-hidden">
        <div
          className={clsx('h-full rounded-b-xl', config.progressClass)}
          style={{
            animation: `shrinkWidth ${duration}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Standalone toast component for direct use
export default function Toast({
  type = 'info',
  title,
  message,
  onClose,
  className,
}: {
  type?: ToastType;
  title: string;
  message?: string;
  onClose?: () => void;
  className?: string;
}) {
  const config = toastConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        'relative flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm',
        config.bgClass,
        config.borderClass,
        className
      )}
    >
      <div className={clsx('flex-shrink-0 mt-0.5', config.iconClass)}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{title}</p>
        {message && (
          <p className="mt-1 text-sm text-gray-600 leading-relaxed">{message}</p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
