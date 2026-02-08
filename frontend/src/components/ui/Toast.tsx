import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { IconX, IconCheck, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-solidjs';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem = (props: ToastProps) => {
  const [isVisible, setIsVisible] = createSignal(true);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => props.onClose(props.toast.id), 300);
  };

  const getIcon = () => {
    switch (props.toast.type) {
      case 'success':
        return <IconCheck class="h-5 w-5 text-green-500" />;
      case 'error':
        return <IconAlertTriangle class="h-5 w-5 text-destructive" />;
      case 'warning':
        return <IconAlertTriangle class="h-5 w-5 text-warning" />;
      case 'info':
        return <IconInfoCircle class="h-5 w-5 text-primary" />;
    }
  };

  const getBackgroundColor = () => {
    switch (props.toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'error':
        return 'bg-destructive/10 border-destructive/20';
      case 'warning':
        return 'bg-warning/10 border-warning/20';
      case 'info':
        return 'bg-primary/10 border-primary/20';
    }
  };

  createEffect(() => {
    const duration = props.toast.duration || 5000;
    const timer = setTimeout(handleClose, duration);
    onCleanup(() => clearTimeout(timer));
  });

  return (
    <div
      class={`transform transition-all duration-300 ease-in-out ${
        isVisible() ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div
        class={`max-w-sm w-full ${getBackgroundColor()} border rounded-lg shadow-lg p-4 mb-4`}
        role="alert"
      >
        <div class="flex items-start">
          <div class="flex-shrink-0">
            {getIcon()}
          </div>
          <div class="ml-3 w-0 flex-1">
            <p class="text-sm font-medium text-foreground">
              {props.toast.title}
            </p>
            {props.toast.message && (
              <p class="mt-1 text-sm text-muted-foreground">
                {props.toast.message}
              </p>
            )}
          </div>
          <div class="ml-4 flex-shrink-0 flex">
            <button
              class="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
              onClick={handleClose}
            >
              <span class="sr-only">Close</span>
              <IconX class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

let toastId = 0;
const [toasts, setToasts] = createSignal<Toast[]>([]);

export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    const id = `toast-${++toastId}`;
    setToasts(prev => [...prev, { id, type: 'success', title, message, duration }]);
    return id;
  },
  error: (title: string, message?: string, duration?: number) => {
    const id = `toast-${++toastId}`;
    setToasts(prev => [...prev, { id, type: 'error', title, message, duration }]);
    return id;
  },
  warning: (title: string, message?: string, duration?: number) => {
    const id = `toast-${++toastId}`;
    setToasts(prev => [...prev, { id, type: 'warning', title, message, duration }]);
    return id;
  },
  info: (title: string, message?: string, duration?: number) => {
    const id = `toast-${++toastId}`;
    setToasts(prev => [...prev, { id, type: 'info', title, message, duration }]);
    return id;
  },
  dismiss: (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }
};

export const ToastContainer = () => {
  const handleClose = (id: string) => {
    toast.dismiss(id);
  };

  return (
    <div class="fixed top-4 right-4 z-50 space-y-4">
      {toasts().map(toast => (
        <ToastItem toast={toast} onClose={handleClose} />
      ))}
    </div>
  );
};
