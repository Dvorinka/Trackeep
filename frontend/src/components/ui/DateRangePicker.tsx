import { createSignal, For, Show, createMemo } from 'solid-js';
import { Portal } from 'solid-js/web';
import { IconChevronLeft, IconChevronRight, IconCalendar } from '@tabler/icons-solidjs';
import { cn } from '@/lib/utils';
import './DateRangePicker.css';

export interface DateRange {
  start?: Date;
  end?: Date;
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | null) => void;
  placeholder?: string;
  class?: string;
  id?: string;
  disabled?: boolean;
}

const presetRanges = [
  { label: 'Today', value: { start: new Date(), end: new Date() } },
  { 
    label: 'Last 7 days', 
    value: { 
      start: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), 
      end: new Date() 
    } 
  },
  { 
    label: 'Last 30 days', 
    value: { 
      start: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), 
      end: new Date() 
    } 
  },
  { 
    label: 'Last 3 months', 
    value: { 
      start: new Date(Date.now() - 89 * 24 * 60 * 60 * 1000), 
      end: new Date() 
    } 
  },
  { 
    label: 'Last 12 months', 
    value: { 
      start: new Date(Date.now() - 364 * 24 * 60 * 60 * 1000), 
      end: new Date() 
    } 
  },
  { 
    label: 'Month to date', 
    value: { 
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), 
      end: new Date() 
    } 
  },
  { 
    label: 'Year to date', 
    value: { 
      start: new Date(new Date().getFullYear(), 0, 1), 
      end: new Date() 
    } 
  }
];

export const DateRangePicker = (props: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [selectedRange, setSelectedRange] = createSignal<DateRange>(props.value || {});
  const [currentMonth, setCurrentMonth] = createSignal(new Date());
  const [position, setPosition] = createSignal({ top: 0, left: 0, width: 0 });

  let triggerRef: HTMLButtonElement | undefined;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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

  const isDateInRange = (date: Date) => {
    const range = selectedRange();
    if (!range.start || !range.end) return false;
    return date >= range.start && date <= range.end;
  };

  const isDateStart = (date: Date) => {
    const range = selectedRange();
    return range.start?.toDateString() === date.toDateString();
  };

  const isDateEnd = (date: Date) => {
    const range = selectedRange();
    return range.end?.toDateString() === date.toDateString();
  };

  const getDateClass = (day: number) => {
    const date = new Date(currentMonth().getFullYear(), currentMonth().getMonth(), day);
    const isStart = isDateStart(date);
    const isEnd = isDateEnd(date);
    const inRange = isDateInRange(date);
    
    let classes = "rdp-button_reset rdp-button flex h-10 w-full items-center justify-center rounded-lg text-center text-label-sm text-text-sub-600 outline-none transition duration-200 ease-out hover:bg-bg-weak-50 hover:text-text-strong-950 focus:outline-none focus-visible:bg-bg-weak-50 focus-visible:text-text-strong-950";
    
    if (isStart && isEnd) {
      classes += " aria-[selected]:bg-primary-base aria-[selected]:text-static-white";
    } else if (isStart) {
      classes += " aria-[selected]:bg-primary-base aria-[selected]:text-static-white day-selected day-range-start";
    } else if (isEnd) {
      classes += " aria-[selected]:bg-primary-base aria-[selected]:text-static-white day-selected day-range-end";
    } else if (inRange) {
      classes += " day-selected day-range-middle !text-primary-base !bg-transparent";
    }
    
    return classes;
  };

  const getCellClass = (day: number) => {
    const date = new Date(currentMonth().getFullYear(), currentMonth().getMonth(), day);
    const isStart = isDateStart(date);
    const isEnd = isDateEnd(date);
    const inRange = isDateInRange(date);
    
    let classes = "group/cell relative h-10 w-full select-none p-0";
    
    if (isStart && !isEnd) {
      classes += " [&:has(.day-range-start):not(:has(.day-range-end))]:rounded-l-full [&:has(.day-range-start):not(:has(.day-range-end))]:bg-primary-alpha-10 [&:has(.day-range-start):not(:has(.day-range-end))]:before:block";
    } else if (isEnd && !isStart) {
      classes += " [&:has(.day-range-end):not(:has(.day-range-start))]:rounded-r-full [&:has(.day-range-end):not(:has(.day-range-start))]:bg-primary-alpha-10";
    } else if (inRange) {
      classes += " [&:has(.day-range-middle)]:bg-primary-alpha-10 [&:has(.day-range-middle)]:before:block";
    }
    
    classes += " [&:not(:has(+_*_[type=button]))]:before:hidden before:absolute before:inset-y-0 before:-right-2 before:hidden before:w-2 before:bg-primary-alpha-10 last:[&:has(.day-range-middle)]:before-hidden [&:has(.day-range-end)]:before:left-0 [&:has(.day-range-end)]:before:right-auto";
    
    return classes;
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentMonth().getFullYear(), currentMonth().getMonth(), day);
    const range = selectedRange();
    
    if (!range.start || (range.start && range.end)) {
      // Start new selection
      setSelectedRange({ start: clickedDate, end: undefined });
    } else {
      // Complete the range
      if (clickedDate < range.start) {
        setSelectedRange({ start: clickedDate, end: range.start });
      } else {
        setSelectedRange({ start: range.start, end: clickedDate });
      }
      props.onChange?.(selectedRange());
    }
  };

  const handleDateHover = (day: number) => {
    const date = new Date(currentMonth().getFullYear(), currentMonth().getMonth(), day);
    const range = selectedRange();
    
    if (range.start && !range.end) {
      // Update preview range
      if (date >= range.start) {
        setSelectedRange({ ...range, end: date });
      } else {
        setSelectedRange({ start: date, end: range.start });
      }
    }
  };

  const handlePresetClick = (preset: typeof presetRanges[0]) => {
    setSelectedRange(preset.value);
    props.onChange?.(preset.value);
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
      const estimatedHeight = 400;

      let top = rect.bottom + window.scrollY + 4;
      const viewportBottom = window.scrollY + window.innerHeight;

      if (top + estimatedHeight > viewportBottom) {
        top = rect.top + window.scrollY - estimatedHeight - 4;
      }

      const width = 632; // Fixed width as per design
      let left = rect.left + window.scrollX;
      const maxLeft = window.scrollX + window.innerWidth - width - 16;
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

  const displayRange = createMemo(() => {
    const range = selectedRange();
    if (range.start && range.end) {
      return `${formatDate(range.start)} - ${formatDate(range.end)}`;
    } else if (range.start) {
      return `${formatDate(range.start)} - ...`;
    }
    return '';
  });

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
        id={props.id || 'date-range-picker-button'}
        ref={triggerRef}
      >
        <Show 
          when={selectedRange().start && selectedRange().end} 
          fallback={<span class="text-muted-foreground">{props.placeholder || "Select date range"}</span>}
        >
          <span>{displayRange()}</span>
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
            class="fixed z-[130] m-4 inline-flex w-fit flex-col overflow-hidden rounded-20 bg-bg-white-0 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200 sm:w-[632px]"
            style={{
              top: `${position().top}px`,
              left: `${position().left}px`,
              width: `${position().width}px`,
            }}
          >
            <div class="flex h-full flex-col md:flex-row">
              {/* Left Panel - Preset Ranges */}
              <div class="space-y-2 px-4 py-5 sm:border-r sm:border-stroke-soft-200 w-full border-b md:w-[200px] md:border-b-0 md:border-r">
                <div class="flex flex-row gap-2 overflow-x-auto md:flex-col md:overflow-x-visible">
                  <For each={presetRanges}>
                    {(preset) => (
                      <button
                        type="button"
                        onClick={() => handlePresetClick(preset)}
                        class="h-9 w-full rounded-lg px-3 text-left text-label-sm text-text-sub-600 transition duration-200 ease-out hover:bg-bg-weak-50 whitespace-nowrap md:whitespace-normal"
                      >
                        {preset.label}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              {/* Right Panel - Calendar */}
              <div class="min-w-0 flex-1">
                <div class="flex w-full flex-col">
                  <div class="rdp">
                    <div class="flex w-full">
                      <div class="space-y-2 p-5 w-full">
                        {/* Month Navigation */}
                        <div class="flex justify-center items-center relative rounded-lg bg-bg-weak-50 h-9">
                          <div class="text-label-sm text-text-sub-600 select-none">
                            {months[currentMonth().getMonth()]} {currentMonth().getFullYear()}
                          </div>
                          <div class="flex items-center">
                            <button
                              onClick={handlePrevMonth}
                              class="rdp-button_reset rdp-button flex shrink-0 items-center justify-center outline-none transition duration-200 ease-out disabled:pointer-events-none disabled:border-transparent disabled:bg-transparent disabled:text-text-disabled-300 disabled:shadow-none focus:outline-none bg-bg-white-0 text-text-sub-600 shadow-regular-xs hover:bg-bg-weak-50 hover:text-text-strong-950 focus-visible:bg-bg-strong-950 focus-visible:text-text-white-0 size-6 rounded-md absolute top-1/2 -translate-y-1/2 left-1.5"
                              type="button"
                            >
                              <IconChevronLeft class="size-5" />
                            </button>
                            <button
                              onClick={handleNextMonth}
                              class="rdp-button_reset rdp-button flex shrink-0 items-center justify-center outline-none transition duration-200 ease-out disabled:pointer-events-none disabled:border-transparent disabled:bg-transparent disabled:text-text-disabled-300 disabled:shadow-none focus:outline-none bg-bg-white-0 text-text-sub-600 shadow-regular-xs hover:bg-bg-weak-50 hover:text-text-strong-950 focus-visible:bg-bg-strong-950 focus-visible:text-text-white-0 size-6 rounded-md absolute top-1/2 -translate-y-1/2 right-1.5"
                              type="button"
                            >
                              <IconChevronRight class="size-5" />
                            </button>
                          </div>
                        </div>

                        {/* Calendar Grid */}
                        <table class="w-full border-collapse flex justify-center items-center flex-col !mt-0">
                          <thead class="w-full">
                            <tr class="flex gap-2">
                              <For each={weekDays}>
                                {(day) => (
                                  <th class="text-text-soft-400 text-label-sm uppercase size-10 flex items-center justify-center text-center select-none w-full mt-2">
                                    {day}
                                  </th>
                                )}
                              </For>
                            </tr>
                          </thead>
                          <tbody class="w-full">
                            {(() => {
                              const days = generateCalendarDays();
                              const weeks = [];
                              for (let i = 0; i < days.length; i += 7) {
                                weeks.push(days.slice(i, i + 7));
                              }
                              return weeks.map((weekDays) => (
                                <tr class="grid grid-flow-col auto-cols-fr w-full mt-2 gap-2">
                                  <For each={weekDays}>
                                    {(day) => (
                                      <td class={getCellClass(day!)}>
                                        <Show when={day !== null}>
                                          <button
                                            name="day"
                                            class={getDateClass(day!)}
                                            onClick={() => handleDateClick(day!)}
                                            onMouseEnter={() => handleDateHover(day!)}
                                            type="button"
                                            aria-selected={isDateInRange(new Date(currentMonth().getFullYear(), currentMonth().getMonth(), day!))}
                                          >
                                            {day}
                                          </button>
                                        </Show>
                                      </td>
                                    )}
                                  </For>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Range Display */}
                  <div class="flex items-center justify-between gap-4 border-t border-stroke-soft-200 p-4 pl-6">
                    <div class="text-paragraph-sm text-text-sub-600">
                      Range: <span class="text-label-sm text-text-strong-950">{displayRange()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  );
};
