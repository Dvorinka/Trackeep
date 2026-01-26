import { createSignal, For, Show } from 'solid-js'
import { Button } from './Button'
import { Input } from './Input'
import { IconSearch, IconFilter, IconX, IconCalendar, IconTag, IconFlag } from '@tabler/icons-solidjs'

export interface SearchFiltersProps {
  onSearchChange: (query: string) => void
  onFiltersChange: (filters: Record<string, any>) => void
  placeholder?: string
  showFilters?: boolean
  filterOptions?: {
    tags?: string[]
    statuses?: string[]
    priorities?: string[]
    dateRanges?: string[]
  }
}

export const SearchFilters = (props: SearchFiltersProps) => {
  const [searchQuery, setSearchQuery] = createSignal('')
  const [showAdvancedFilters, setShowAdvancedFilters] = createSignal(props.showFilters || false)
  const [activeFilters, setActiveFilters] = createSignal<Record<string, any>>({})

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    props.onSearchChange(value)
  }

  const handleFilterChange = (filterKey: string, value: any) => {
    const newFilters = { ...activeFilters(), [filterKey]: value }
    if (!value || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[filterKey]
    }
    setActiveFilters(newFilters)
    props.onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    setActiveFilters({})
    setSearchQuery('')
    props.onSearchChange('')
    props.onFiltersChange({})
  }

  const activeFilterCount = () => {
    const filters = activeFilters()
    return Object.keys(filters).length + (searchQuery() ? 1 : 0)
  }

  return (
    <div class="space-y-4">
      {/* Search Bar */}
      <div class="relative">
        <IconSearch class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="search"
          placeholder={props.placeholder || "Search..."}
          value={searchQuery()}
          onInput={(e) => e.target && handleSearchChange((e.target as HTMLInputElement).value)}
          class="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
        />
        
        {/* Filter Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters())}
          class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
        >
          <IconFilter class="h-4 w-4" />
          <Show when={activeFilterCount() > 0}>
            <span class="ml-1 text-xs bg-blue-600 text-white rounded-full px-2 py-0.5">
              {activeFilterCount()}
            </span>
          </Show>
        </Button>
      </div>

      {/* Advanced Filters */}
      <Show when={showAdvancedFilters()}>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
          {/* Filter Header */}
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-white">Advanced Filters</h3>
            <div class="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                class="text-gray-400 hover:text-white"
              >
                <IconX class="mr-1 h-3 w-3" />
                Clear All
              </Button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tags Filter */}
            <Show when={props.filterOptions?.tags && props.filterOptions.tags.length > 0}>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  <IconTag class="inline h-4 w-4 mr-1" />
                  Tags
                </label>
                <select
                  class="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 text-sm"
                  onChange={(e) => handleFilterChange('tag', (e.target as HTMLSelectElement).value)}
                >
                  <option value="">All Tags</option>
                  <For each={props.filterOptions!.tags}>
                    {(tag) => (
                      <option value={tag} selected={activeFilters().tag === tag}>
                        {tag}
                      </option>
                    )}
                  </For>
                </select>
              </div>
            </Show>

            {/* Status Filter */}
            <Show when={props.filterOptions?.statuses && props.filterOptions.statuses.length > 0}>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  class="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 text-sm"
                  onChange={(e) => handleFilterChange('status', (e.target as HTMLSelectElement).value)}
                >
                  <option value="">All Statuses</option>
                  <For each={props.filterOptions!.statuses}>
                    {(status) => (
                      <option value={status} selected={activeFilters().status === status}>
                        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    )}
                  </For>
                </select>
              </div>
            </Show>

            {/* Priority Filter */}
            <Show when={props.filterOptions?.priorities && props.filterOptions.priorities.length > 0}>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  <IconFlag class="inline h-4 w-4 mr-1" />
                  Priority
                </label>
                <select
                  class="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 text-sm"
                  onChange={(e) => handleFilterChange('priority', (e.target as HTMLSelectElement).value)}
                >
                  <option value="">All Priorities</option>
                  <For each={props.filterOptions!.priorities}>
                    {(priority) => (
                      <option value={priority} selected={activeFilters().priority === priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </option>
                    )}
                  </For>
                </select>
              </div>
            </Show>

            {/* Date Range Filter */}
            <Show when={props.filterOptions?.dateRanges && props.filterOptions.dateRanges.length > 0}>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  <IconCalendar class="inline h-4 w-4 mr-1" />
                  Date Range
                </label>
                <select
                  class="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 text-sm"
                  onChange={(e) => handleFilterChange('dateRange', (e.target as HTMLSelectElement).value)}
                >
                  <option value="">Any Time</option>
                  <For each={props.filterOptions!.dateRanges}>
                    {(range) => (
                      <option value={range} selected={activeFilters().dateRange === range}>
                        {range}
                      </option>
                    )}
                  </For>
                </select>
              </div>
            </Show>
          </div>

          {/* Active Filters Display */}
          <Show when={activeFilterCount() > 0}>
            <div class="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
              <For each={Object.entries(activeFilters())}>
                {([key, value]) => (
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-600 text-white">
                    {key}: {value}
                    <button
                      onClick={() => handleFilterChange(key, null)}
                      class="ml-1 hover:text-blue-200"
                    >
                      <IconX class="h-3 w-3" />
                    </button>
                  </span>
                )}
              </For>
              <Show when={searchQuery()}>
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-600 text-white">
                  Search: {searchQuery()}
                  <button
                    onClick={() => handleSearchChange('')}
                    class="ml-1 hover:text-blue-200"
                  >
                    <IconX class="h-3 w-3" />
                  </button>
                </span>
              </Show>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}
