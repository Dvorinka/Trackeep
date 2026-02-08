import { For } from 'solid-js';
import { Button } from './Button';
import { Input } from './Input';
import { IconX } from '@tabler/icons-solidjs';

interface SearchTagFilterBarProps {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  tagOptions: string[];
  selectedTag: string;
  onTagChange: (value: string) => void;
  onReset: () => void;
}

export const SearchTagFilterBar = (props: SearchTagFilterBarProps) => {
  return (
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="flex flex-1 gap-2">
        <Input
          type="text"
          placeholder={props.searchPlaceholder}
          value={props.searchValue}
          onInput={(e) => {
            const target = e.currentTarget as HTMLInputElement;
            if (target) props.onSearchChange(target.value);
          }}
          class="flex-1"
        />
        <select
          value={props.selectedTag}
          onChange={(e) => props.onTagChange(e.target.value)}
          class="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
        >
          <option value="">All Tags</option>
          <For each={props.tagOptions}>
            {(tag) => <option value={tag}>{tag}</option>}
          </For>
        </select>
      </div>
      {props.selectedTag && (
        <Button
          variant="outline"
          onClick={props.onReset}
          class="justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-papra focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent/50 hover:text-accent-foreground shadow-sm h-10 px-4 py-2 flex items-center gap-2"
        >
          <IconX class="size-4" />
          Reset Filters
        </Button>
      )}
    </div>
  );
};
