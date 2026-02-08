import { createSignal, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '@/lib/utils';

export interface TimePickerProps {
  value?: string;
  onChange?: (time: string) => void;
  placeholder?: string;
  class?: string;
  id?: string;
  disabled?: boolean;
}

export const TimePicker = (props: TimePickerProps) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [selectedTime, setSelectedTime] = createSignal<string>(props.value || '12:00');
  const [position, setPosition] = createSignal({ top: 0, left: 0, width: 0 });

  let triggerRef: HTMLButtonElement | undefined;

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const getCurrentHour = () => selectedTime().split(':')[0];
  const getCurrentMinute = () => selectedTime().split(':')[1];

  const handleTimeSelect = (hour: string, minute: string) => {
    const newTime = `${hour}:${minute}`;
    setSelectedTime(newTime);
    props.onChange?.(newTime);
    setIsOpen(false);
  };

  const handleToggleModal = () => {
    if (props.disabled) return;
    
    if (!isOpen()) {
      if (!triggerRef) return;

      const rect = triggerRef.getBoundingClientRect();
      const estimatedHeight = 280; // approximate dropdown height

      let top = rect.bottom + window.scrollY + 4; // default below
      const viewportBottom = window.scrollY + window.innerHeight;

      // If there isn't enough space below, open above the trigger
      if (top + estimatedHeight > viewportBottom) {
        top = rect.top + window.scrollY - estimatedHeight - 4;
      }

      const width = 200; // fixed width for time picker

      let left = rect.left + window.scrollX;
      const maxLeft = window.scrollX + window.innerWidth - width - 16; // 16px margin to screen edge
      if (left > maxLeft) {
        left = maxLeft;
      }
      if (left < window.scrollX + 16) {
        left = window.scrollX + 16;
      }

      setPosition({ top, left, width });
    }
    
    setIsOpen(!isOpen());
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
  };

  return (
    <div class="relative">
      <button
        type="button"
        onClick={handleToggleModal}
        disabled={props.disabled}
        class={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left",
          props.class
        )}
        id={props.id || 'time-picker-button'}
        ref={triggerRef}
      >
        <Show when={props.value} fallback={<span class="text-muted-foreground">{props.placeholder || "Select time"}</span>}>
          <span>{formatTime(selectedTime())}</span>
        </Show>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-auto h-4 w-4 opacity-50">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </button>

      <Show when={isOpen()}>
        <Portal>
          {/* Close on outside click */}
          <div
            class="fixed inset-0 z-[120]"
            onClick={() => setIsOpen(false)}
          />

          <div
            class={cn(
              "fixed z-[130] p-3 bg-popover text-popover-foreground border rounded-md shadow-md",
              "max-w-[calc(100vw-2rem)]"
            )}
            style={{
              top: `${position().top}px`,
              left: `${position().left}px`,
              width: `${position().width}px`,
            }}
          >
            <div class="grid grid-cols-2 gap-2">
              {/* Hours column */}
              <div>
                <div class="text-xs font-medium text-muted-foreground mb-2 text-center">Hour</div>
                <div class="max-h-48 overflow-y-auto">
                  <For each={hours}>
                    {(hour) => (
                      <button
                        onClick={() => handleTimeSelect(hour, getCurrentMinute())}
                        class={cn(
                          "w-full py-1 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors",
                          getCurrentHour() === hour ? "bg-primary text-primary-foreground" : ""
                        )}
                      >
                        {hour}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              {/* Minutes column */}
              <div>
                <div class="text-xs font-medium text-muted-foreground mb-2 text-center">Minute</div>
                <div class="max-h-48 overflow-y-auto">
                  <For each={minutes}>
                    {(minute) => (
                      <button
                        onClick={() => handleTimeSelect(getCurrentHour(), minute)}
                        class={cn(
                          "w-full py-1 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors",
                          getCurrentMinute() === minute ? "bg-primary text-primary-foreground" : ""
                        )}
                      >
                        {minute}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  );
};
