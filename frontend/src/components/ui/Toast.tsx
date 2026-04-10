import { createSignal, createEffect, onCleanup } from 'solid-js';
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
        return <IconCheck class="h-4 w-4 text-emerald-500" />;
      case 'error':
        return <IconAlertTriangle class="h-4 w-4 text-destructive" />;
      case 'warning':
        return <IconAlertTriangle class="h-4 w-4 text-amber-500" />;
      case 'info':
        return <IconInfoCircle class="h-4 w-4 text-primary" />;
    }
  };

  const getToneClasses = () => {
    switch (props.toast.type) {
      case 'success':
        return 'border-emerald-500/20 bg-emerald-500/8';
      case 'error':
        return 'border-destructive/25 bg-destructive/8';
      case 'warning':
        return 'border-amber-500/25 bg-amber-500/8';
      case 'info':
        return 'border-primary/25 bg-primary/8';
    }
  };

  const getIconSurface = () => {
    switch (props.toast.type) {
      case 'success':
        return 'bg-emerald-500/12 ring-1 ring-emerald-500/15';
      case 'error':
        return 'bg-destructive/12 ring-1 ring-destructive/15';
      case 'warning':
        return 'bg-amber-500/12 ring-1 ring-amber-500/15';
      case 'info':
        return 'bg-primary/12 ring-1 ring-primary/15';
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
        isVisible() ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
      }`}
    >
      <div
        class={`max-w-sm w-full rounded-2xl border px-4 py-3 shadow-2xl shadow-black/10 backdrop-blur-xl ${getToneClasses()}`}
        role="alert"
      >
        <div class="flex items-start gap-3">
          <div class={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${getIconSurface()}`}>
            {getIcon()}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-foreground">
              {props.toast.title}
            </p>
            {props.toast.message && (
              <p class="mt-1 text-sm leading-5 text-muted-foreground">
                {props.toast.message}
              </p>
            )}
          </div>
          <div class="flex shrink-0">
            <button
              class="inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={handleClose}
            >
              <span class="sr-only">Close</span>
              <IconX class="h-4 w-4" />
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
    <div class="pointer-events-none fixed left-1/2 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-3 sm:left-auto sm:right-4 sm:top-4 sm:w-full sm:translate-x-0">
      {toasts().map(toast => (
        <div class="pointer-events-auto">
          <ToastItem toast={toast} onClose={handleClose} />
        </div>
      ))}
    </div>
  );
};
