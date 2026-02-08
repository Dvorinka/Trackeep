import { createSignal, For, Show, createEffect } from 'solid-js';
import { IconTag, IconX, IconChevronDown } from '@tabler/icons-solidjs';

interface TagPickerProps {
  availableTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  allowNew?: boolean;
  class?: string;
}

export const TagPicker = (props: TagPickerProps) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [inputValue, setInputValue] = createSignal('');
  const [filteredTags, setFilteredTags] = createSignal<string[]>([]);

  createEffect(() => {
    const input = inputValue().toLowerCase();
    const filtered = props.availableTags.filter(tag => 
      tag.toLowerCase().includes(input) && 
      !props.selectedTags.includes(tag)
    );
    setFilteredTags(filtered);
  });

  const addTag = (tag: string) => {
    if (!props.selectedTags.includes(tag)) {
      props.onTagsChange([...props.selectedTags, tag]);
      setInputValue('');
      setIsOpen(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    props.onTagsChange(props.selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = inputValue().trim();
      if (value) {
        if (props.allowNew && !props.availableTags.includes(value)) {
          addTag(value);
        } else if (filteredTags().length > 0) {
          addTag(filteredTags()[0]);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Backspace' && !inputValue() && props.selectedTags.length > 0) {
      removeTag(props.selectedTags[props.selectedTags.length - 1]);
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (value && !isOpen()) {
      setIsOpen(true);
    }
  };

  return (
    <div class={`relative ${props.class || ''}`}>
      {/* Selected Tags */}
      <div class="flex flex-wrap gap-2 p-2 border border-border rounded-lg bg-background min-h-[42px] cursor-text">
        <For each={props.selectedTags}>
          {(tag) => (
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
              <IconTag class="size-3" />
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                class="ml-1 hover:bg-primary/20 rounded p-0.5"
              >
                <IconX class="size-3" />
              </button>
            </span>
          )}
        </For>
        
        {/* Input */}
        <input
          type="text"
          value={inputValue()}
          onInput={(e: any) => handleInputChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={props.selectedTags.length === 0 ? props.placeholder || 'Add tags...' : ''}
          class="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
        />
      </div>

      {/* Dropdown */}
      <Show when={isOpen() && (filteredTags().length > 0 || (props.allowNew && inputValue().trim()))}>
        <div class="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {/* New tag option */}
          <Show when={props.allowNew && inputValue().trim() && !props.availableTags.includes(inputValue().trim())}>
            <button
              type="button"
              onClick={() => addTag(inputValue().trim())}
              class="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2 text-sm"
            >
              <IconTag class="size-3 text-muted-foreground" />
              Create "{inputValue().trim()}"
            </button>
          </Show>
          
          {/* Filtered tags */}
          <For each={filteredTags()}>
            {(tag) => (
              <button
                type="button"
                onClick={() => addTag(tag)}
                class="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2 text-sm"
              >
                <IconTag class="size-3 text-muted-foreground" />
                {tag}
              </button>
            )}
          </For>
        </div>
      </Show>

      {/* Close dropdown when clicking outside */}
      <Show when={isOpen()}>
        <div
          class="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      </Show>
    </div>
  );
};
