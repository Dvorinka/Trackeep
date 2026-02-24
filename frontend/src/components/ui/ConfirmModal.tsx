import { Button } from '@/components/ui/Button';
import { IconX, IconAlertTriangle } from '@tabler/icons-solidjs';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal = (props: ConfirmModalProps) => {
  const {
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning'
  } = props;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <IconAlertTriangle class="size-6 text-red-500" />;
      case 'warning':
        return <IconAlertTriangle class="size-6 text-yellow-500" />;
      default:
        return <IconAlertTriangle class="size-6 text-blue-500" />;
    }
  };

  const getConfirmButtonVariant = () => {
    switch (type) {
      case 'danger':
        return 'destructive' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div class="fixed inset-0 bg-black/50 z-40 mt-0" onClick={onClose} />
      )}

      {/* Modal */}
      <div class={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl transition-all duration-300 z-50 ${
        isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`} style="width: 400px; max-width: 90vw;">
        {/* Header */}
        <div class="flex items-center justify-between p-6 border-b border-border">
          <div class="flex items-center gap-3">
            {getIcon()}
            <h3 class="text-lg font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
          >
            <IconX class="size-4" />
          </button>
        </div>

        {/* Content */}
        <div class="p-6">
          <p class="text-muted-foreground">{message}</p>
        </div>

        {/* Footer */}
        <div class="flex justify-end gap-2 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={getConfirmButtonVariant()} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </>
  );
};
