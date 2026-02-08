import { createSignal, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { IconChevronLeft, IconChevronRight, IconCalendar } from '@tabler/icons-solidjs';
import { cn } from '@/lib/utils';
import { TimePicker } from './TimePicker';

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  class?: string;
  id?: string;
  disabled?: boolean;
}

export const DatePicker = (props: DatePickerProps) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [selectedDate, setSelectedDate] = createSignal<Date | undefined>(props.value);
  const [currentMonth, setCurrentMonth] = createSignal(new Date());
  const [position, setPosition] = createSignal({ top: 0, left: 0, width: 0 });

  let triggerRef: HTMLButtonElement | undefined;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentMonth());
    const firstDay = getFirstDayOfMonth(currentMonth());
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentMonth().getFullYear(), currentMonth().getMonth(), day);
    setSelectedDate(newDate);
    props.onChange?.(newDate);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth().getFullYear(), currentMonth().getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth().getFullYear(), currentMonth().getMonth() + 1));
  };

  const handleToggleModal = () => {
    if (props.disabled) return;
    
    if (!isOpen()) {
      if (!triggerRef) return;

      const rect = triggerRef.getBoundingClientRect();
      const estimatedHeight = 360; // approximate dropdown height

      let top = rect.bottom + window.scrollY + 4; // default below
      const viewportBottom = window.scrollY + window.innerHeight;

      // If there isn't enough space below, open above the trigger
      if (top + estimatedHeight > viewportBottom) {
        top = rect.top + window.scrollY - estimatedHeight - 4;
      }

      const minWidth = 260;
      const width = Math.max(rect.width, minWidth);

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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
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
        id={props.id || 'date-picker-button'}
        ref={triggerRef}
      >
        <Show when={selectedDate()} fallback={<span class="text-muted-foreground">{props.placeholder || "Select date"}</span>}>
          <span>{formatDate(selectedDate()!)}</span>
        </Show>
        <IconCalendar class="ml-auto h-4 w-4 opacity-50" />
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
            {/* Header */}
            <div class="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 w-7"
              >
                <IconChevronLeft class="h-4 w-4" />
              </button>
              <div class="text-sm font-medium">
                {months[currentMonth().getMonth()]} {currentMonth().getFullYear()}
              </div>
              <button
                onClick={handleNextMonth}
                class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 w-7"
              >
                <IconChevronRight class="h-4 w-4" />
              </button>
            </div>

            {/* Week days */}
            <div class="grid grid-cols-7 gap-1 mb-2">
              <For each={weekDays}>
                {(day) => (
                  <div class="h-8 text-xs text-muted-foreground font-normal text-center">
                    {day}
                  </div>
                )}
              </For>
            </div>

            {/* Calendar days */}
            <div class="grid grid-cols-7 gap-1">
              <For each={generateCalendarDays()}>
                {(day) => (
                  <div class="h-8">
                    <Show when={day !== null}>
                      <button
                        onClick={() => handleDateSelect(day!)}
                        class={cn(
                          "block w-full h-8 rounded-md text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          "hover:bg-accent hover:text-accent-foreground",
                          selectedDate() && 
                          selectedDate()!.getDate() === day! &&
                          selectedDate()!.getMonth() === currentMonth().getMonth() &&
                          selectedDate()!.getFullYear() === currentMonth().getFullYear()
                            ? "bg-primary text-primary-foreground"
                            : ""
                        )}
                      >
                        {day}
                      </button>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  );
};

export interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  class?: string;
  id?: string;
  disabled?: boolean;
  dateOnly?: boolean; // New prop for date-only mode
}

export const DateTimePicker = (props: DateTimePickerProps) => {
  const [date, setDate] = createSignal<Date | undefined>(props.value);
  const [time, setTime] = createSignal<string>(
    props.value ? 
      props.value.toTimeString().slice(0, 5) : 
      '12:00'
  );

  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      const [hours, minutes] = time().split(':').map(Number);
      newDate.setHours(hours, minutes);
      setDate(newDate);
      props.onChange?.(newDate);
    } else {
      setDate(undefined);
      props.onChange?.(null);
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (date()) {
      const [hours, minutes] = newTime.split(':').map(Number);
      const newDate = new Date(date()!);
      newDate.setHours(hours, minutes);
      setDate(newDate);
      props.onChange?.(newDate);
    }
  };

  return (
    <Show when={props.dateOnly} fallback={
      <div class="flex flex-col gap-2">
        <DatePicker
          value={date()}
          onChange={handleDateChange}
          placeholder={props.placeholder || "Select date"}
          class="w-full"
          id={props.id ? `${props.id}-date` : undefined}
          disabled={props.disabled}
        />
        <TimePicker
          value={time()}
          onChange={handleTimeChange}
          disabled={props.disabled}
          class="w-full"
          id={props.id ? `${props.id}-time` : undefined}
        />
      </div>
    }>
      <DatePicker
        value={date()}
        onChange={handleDateChange}
        placeholder={props.placeholder || "Select date"}
        class="w-full"
        id={props.id ? `${props.id}-date` : undefined}
        disabled={props.disabled}
      />
    </Show>
  );
};
