import { createSignal } from 'solid-js';

interface DropdownMenuProps {
  trigger: any;
  children: any;
}

interface DropdownMenuItemProps {
  onClick: () => void;
  icon: any;
  children: any;
  variant?: 'default' | 'destructive';
}

export const DropdownMenu = (props: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = createSignal(false);

  return (
    <div class="relative inline-block text-left">
      <div onClick={() => setIsOpen(!isOpen())}>
        {props.trigger}
      </div>
      
      {isOpen() && (
        <>
          {/* Backdrop */}
          <div 
            class="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div class="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-md shadow-lg z-50">
            <div class="py-1">
              {props.children}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const DropdownMenuItem = (props: DropdownMenuItemProps) => {
  return (
    <button
      onClick={() => {
        props.onClick();
        // Close parent dropdown by triggering a click outside
        document.dispatchEvent(new MouseEvent('click'));
      }}
      class={`w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2 ${
        props.variant === 'destructive' ? 'text-destructive hover:text-destructive' : ''
      }`}
    >
      <props.icon class="size-4" />
      {props.children}
    </button>
  );
};
