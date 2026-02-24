import { createSignal, For, Show, createMemo } from 'solid-js';
import { cn } from '@/lib/utils';
import './ColorPicker.css';

export interface ColorPickerProps {
  value?: string;
  onChange?: (color: string) => void;
  savedColors?: string[];
  onSavedColorsChange?: (colors: string[]) => void;
  class?: string;
}

const defaultSavedColors = [
  '#FFFFFF', '#F5F5F5', '#EBEBEB', '#D1D1D1', '#A3A3A3', '#7B7B7B', '#5C5C5C', '#333333',
  '#D5E2FF', '#97BAFF', '#335CFF', '#2547D0', '#182F8B'
];

export const ColorPicker = (props: ColorPickerProps) => {
  const [currentColor, setCurrentColor] = createSignal(props.value || '#FF0000');
  const [hue, setHue] = createSignal(0);
  const [alpha, setAlpha] = createSignal(100);
  const [savedColors, setSavedColors] = createSignal(props.savedColors || defaultSavedColors);
  const [isEditing, setIsEditing] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);

  // Parse hex color to get HSL values
  const hexToHSL = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number) => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };

  // Update color based on hue and current saturation/lightness
  const updateColorFromHue = (newHue: number) => {
    const currentHSL = hexToHSL(currentColor());
    const newHex = hslToHex(newHue, currentHSL.s, currentHSL.l);
    setCurrentColor(newHex);
    setHue(newHue);
    props.onChange?.(newHex);
  };

  // Handle hex input change
  const handleHexChange = (value: string) => {
    const hexValue = value.startsWith('#') ? value : `#${value}`;
    if (/^#[0-9A-F]{6}$/i.test(hexValue)) {
      setCurrentColor(hexValue);
      const hsl = hexToHSL(hexValue);
      setHue(hsl.h);
      props.onChange?.(hexValue);
    }
  };

  // Handle alpha input change
  const handleAlphaChange = (value: string) => {
    const numValue = parseInt(value.replace('%', ''));
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setAlpha(numValue);
    }
  };

  // Handle hue slider drag
  const handleSliderMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateHueFromPosition(e);
  };

  const updateHueFromPosition = (e: MouseEvent) => {
    const slider = e.currentTarget as HTMLElement;
    const rect = slider.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newHue = Math.round(percentage * 360);
    updateColorFromHue(newHue);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging()) {
      updateHueFromPosition(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle saved color selection
  const handleSavedColorClick = (color: string) => {
    setCurrentColor(color);
    const hsl = hexToHSL(color);
    setHue(hsl.h);
    props.onChange?.(color);
  };

  // Handle delete color
  const handleDeleteColor = () => {
    // Implementation for delete functionality
    console.log('Delete color');
  };

  // Handle add new color
  const handleAddNewColor = () => {
    const newColors = [...savedColors(), currentColor()];
    setSavedColors(newColors);
    props.onSavedColorsChange?.(newColors);
  };

  // Format hex display
  const hexDisplay = createMemo(() => currentColor());

  // Set up global mouse events for dragging
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  return (
    <div class={cn("w-full max-w-[316px] overflow-hidden rounded-20 bg-bg-white-0 shadow-custom-md", props.class)}>
      {/* Header */}
      <div class="flex w-full items-center justify-between px-5 py-4 pb-2.5">
        <div class="text-label-sm text-text-sub-600">Choose color</div>
        <div class="text-label-sm text-text-soft-400">{hexDisplay()}</div>
      </div>

      {/* Hue Slider */}
      <div class="border-b border-stroke-soft-200 px-5 pb-5">
        <div class="py-1 h-3 !p-0" data-rac="" data-orientation="horizontal">
          <div 
            role="group" 
            class="w-full h-full rounded-full hue-slider"
            aria-label="Hue"
            onMouseDown={handleSliderMouseDown}
          >
            <div class="absolute inset-x-1.5 h-full">
              <div 
                class="z-50 size-3 ring-stroke-white-0 shadow-md top-1/2 h-2 w-2 -translate-y-1/2 rounded-full !bg-bg-white-0 ring-0 hue-slider-thumb"
                style={{ 
                  left: `${(hue() / 360) * 100}%`, 
                  transform: 'translate(-50%, -50%)',
                  'background-color': currentColor() 
                }}
              />
              <input 
                tabindex="0"
                type="range" 
                min="0" 
                max="360" 
                step="1" 
                aria-orientation="horizontal"
                aria-valuetext={`${hue()}°`}
                class="hue-slider-input"
                value={hue()}
                onInput={(e) => updateColorFromHue(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Color and Alpha Inputs */}
      <div class="flex items-center gap-2.5 border-b border-stroke-soft-200 p-5">
        <div class="flex flex-1 -space-x-px">
          {/* Hex Input */}
          <div class="group relative flex w-full overflow-hidden bg-bg-white-0 text-text-strong-950 shadow-regular-xs transition duration-200 ease-out divide-x divide-stroke-soft-200 before:absolute before:inset-0 before:ring-1 before:ring-inset before:ring-stroke-soft-200 before:pointer-events-none before:rounded-[inherit] before:transition before:duration-200 before:ease-out hover:shadow-none has-[input:focus]:shadow-button-important-focus has-[input:focus]:before:ring-stroke-strong-950 has-[input:disabled]:shadow-none has-[input:disabled]:before:ring-transparent rounded-lg hover:[&:not(:has(input:focus)):has(&gt;:only-child)]:before:ring-transparent flex-[2] rounded-l-10 rounded-r-none focus-within:z-10 hover:[&:not(:focus-within)]:before:!ring-stroke-soft-200" data-rac="" data-channel="hex">
            <label class="group/input-wrapper flex w-full cursor-text items-center bg-bg-white-0 transition duration-200 ease-out hover:[&:not(&:has(input:focus))]:bg-bg-weak-50 has-[input:disabled]:pointer-events-none has-[input:disabled]:bg-bg-weak-50 gap-2 px-2.5">
              <div class="flex items-center gap-2">
                <div class="h-3 w-3 shrink-0 rounded-full ring-0" style={{ 'background-color': currentColor() }}></div>
                <input 
                  id="hex-input"
                  type="text" 
                  autocomplete="off" 
                  role="textbox" 
                  autocorrect="off" 
                  spellcheck="false" 
                  class="w-full bg-transparent bg-none text-paragraph-sm text-text-strong-950 outline-none transition duration-200 ease-out placeholder:select-none placeholder:text-text-soft-400 placeholder:transition placeholder:duration-200 placeholder:ease-out group-hover/input-wrapper:placeholder:text-text-sub-600 focus:outline-none group-has-[input:focus]:placeholder:text-text-sub-600 disabled:text-text-disabled-300 disabled:placeholder:text-text-disabled-300 h-5 items-start justify-start text-label-sm text-text-sub-600"
                  data-rac="" 
                  value={hexDisplay()}
                  onInput={(e) => handleHexChange(e.target.value)}
                  title=""
                />
              </div>
            </label>
          </div>

          {/* Alpha Input */}
          <div class="group relative flex w-full overflow-hidden bg-bg-white-0 text-text-strong-950 shadow-regular-xs transition duration-200 ease-out divide-x divide-stroke-soft-200 before:absolute before:inset-0 before:ring-1 before:ring-inset before:ring-stroke-soft-200 before:pointer-events-none before:rounded-[inherit] before:transition before:duration-200 before:ease-out hover:shadow-none has-[input:focus]:shadow-button-important-focus has-[input:focus]:before:ring-stroke-strong-950 has-[input:disabled]:shadow-none has-[input:disabled]:before:ring-transparent rounded-lg hover:[&:not(:has(input:focus)):has(&gt;:only-child)]:before:ring-transparent max-w-[57px] flex-1 rounded-l-none rounded-r-10 focus-within:z-10 hover:[&:not(:focus-within)]:before:!ring-stroke-soft-200" data-rac="" data-channel="alpha">
            <label class="group/input-wrapper flex w-full cursor-text items-center bg-bg-white-0 transition duration-200 ease-out hover:[&:not(&:has(input:focus))]:bg-bg-weak-50 has-[input:disabled]:pointer-events-none has-[input:disabled]:bg-bg-weak-50 gap-2 px-2.5">
              <input 
                aria-label="Alpha" 
                id="alpha-input"
                type="text" 
                autocomplete="off" 
                inputmode="numeric" 
                aria-roledescription="Number field" 
                autocorrect="off" 
                spellcheck="false" 
                class="w-full bg-transparent bg-none text-paragraph-sm text-text-strong-950 outline-none transition duration-200 ease-out placeholder:select-none placeholder:text-text-soft-400 placeholder:transition placeholder:duration-200 placeholder:ease-out group-hover/input-wrapper:placeholder:text-text-sub-600 focus:outline-none group-has-[input:focus]:placeholder:text-text-sub-600 disabled:text-text-disabled-300 disabled:placeholder:text-text-disabled-300 h-9 text-label-sm text-text-sub-600"
                data-rac="" 
                value={`${alpha()}%`}
                onInput={(e) => handleAlphaChange(e.target.value)}
                title=""
              />
            </label>
          </div>
        </div>

        {/* Delete Button */}
        <button 
          class="group relative inline-flex items-center justify-center whitespace-nowrap outline-none transition duration-200 ease-out focus:outline-none disabled:pointer-events-none disabled:bg-bg-weak-50 disabled:text-text-disabled-300 disabled:ring-transparent ring-1 ring-inset h-9 gap-3 rounded-lg px-3 text-label-sm bg-bg-white-0 text-text-sub-600 shadow-regular-xs ring-stroke-soft-200 hover:bg-bg-weak-50 hover:text-text-strong-950 hover:shadow-none hover:ring-transparent focus-visible:text-text-strong-950 focus-visible:shadow-button-important-focus focus-visible:ring-stroke-strong-950 w-9"
          onClick={handleDeleteColor}
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="remixicon size-5 shrink-0">
            <path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z"></path>
          </svg>
        </button>
      </div>

      {/* Saved Colors */}
      <div class="flex flex-col gap-4 border-b border-stroke-soft-200 px-5 pb-5 pt-4">
        <div class="flex items-center justify-between">
          <span class="text-label-sm text-text-sub-600">Saved colors</span>
          <button 
            class="group inline-flex items-center justify-center whitespace-nowrap outline-none transition duration-200 ease-out underline decoration-transparent underline-offset-[3px] hover:decoration-current focus:outline-none focus-visible:underline disabled:pointer-events-none disabled:text-text-disabled-300 disabled:no-underline text-primary-base hover:text-primary-darker h-5 gap-1 text-label-sm"
            onClick={() => setIsEditing(!isEditing())}
          >
            {isEditing() ? 'Done' : 'Edit'}
          </button>
        </div>
        
        <div class="space-y-3">
          <div class="flex gap-3">
            <For each={savedColors().slice(0, 8)}>
              {(color) => (
                <button 
                  class="relative h-6 w-6"
                  onClick={() => handleSavedColorClick(color)}
                >
                  <div 
                    class="absolute inset-0 rounded-full border border-stroke-soft-200"
                    style={{ 'background-color': color }}
                  />
                  <Show when={currentColor() === color}>
                    <div class="absolute -inset-[5px]">
                      <div class="absolute inset-0 rounded-full border-stroke-white-0"></div>
                    </div>
                    <div class="absolute -inset-[5px]">
                      <div class="absolute inset-0 rounded-full border-2 border-[#335CFF1F]"></div>
                    </div>
                  </Show>
                </button>
              )}
            </For>
          </div>
          
          <div class="flex gap-3">
            <For each={savedColors().slice(8)}>
              {(color) => (
                <button 
                  class="relative h-6 w-6"
                  onClick={() => handleSavedColorClick(color)}
                >
                  <div 
                    class="absolute inset-0 rounded-full"
                    style={{ 'background-color': color }}
                  />
                  <Show when={currentColor() === color}>
                    <div class="absolute -inset-[5px]">
                      <div class="absolute inset-0 rounded-full border-stroke-white-0"></div>
                    </div>
                    <div class="absolute -inset-[5px]">
                      <div class="absolute inset-0 rounded-full border-2 border-[#335CFF1F]"></div>
                    </div>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </div>
      </div>

      {/* Add New Color Button */}
      <button 
        class="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-center"
        onClick={handleAddNewColor}
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="remixicon size-5 shrink-0 text-text-soft-400">
          <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z"></path>
        </svg>
        <span class="text-label-sm text-text-sub-600">Add new color</span>
      </button>
    </div>
  );
};
