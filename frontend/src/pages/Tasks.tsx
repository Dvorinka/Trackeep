import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { SkeletonList } from '@/components/ui/LoadingState'
import { SearchFilters } from '@/components/ui/SearchFilters'
import { 
  IconPlus,
  IconCheck,
  IconX,
  IconFlag,
  IconRefresh,
  IconAlertTriangle
} from '@tabler/icons-solidjs'
import { createSignal, For, Show, createMemo } from 'solid-js'
import { tasksApi, type Task } from '@/lib/api-client'

const statusColors = {
  'pending': 'bg-yellow-600',
  'in_progress': 'bg-blue-600',
  'completed': 'bg-green-600'
}

const priorityColors = {
  'low': 'text-gray-400',
  'medium': 'text-yellow-400',
  'high': 'text-red-400'
}

export function Tasks() {
  const [searchQuery, setSearchQuery] = createSignal('')
  const [filters, setFilters] = createSignal<Record<string, any>>({})
  
  const tasksQuery = tasksApi.useGetAll()
  const deleteTaskMutation = tasksApi.useDelete()
  const updateTaskMutation = tasksApi.useUpdate()

  // Get unique values for filter options
  const filterOptions = createMemo(() => {
    const tasks = tasksQuery.data || []
    return {
      statuses: ['pending', 'in_progress', 'completed'],
      priorities: ['low', 'medium', 'high'],
      dateRanges: ['Today', 'This Week', 'This Month', 'This Year'],
      tags: Array.from(new Set(tasks.flatMap(task => task.tags)))
    }
  })

  // Filter tasks based on search and filters
  const filteredTasks = createMemo(() => {
    const tasks = tasksQuery.data || []
    const query = searchQuery().toLowerCase()
    const currentFilters = filters()

    return tasks.filter(task => {
      // Search filter
      if (query && !(
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.tags.some(tag => tag.toLowerCase().includes(query))
      )) {
        return false
      }

      // Status filter
      if (currentFilters.status && task.status !== currentFilters.status) {
        return false
      }

      // Priority filter
      if (currentFilters.priority && task.priority !== currentFilters.priority) {
        return false
      }

      // Tag filter
      if (currentFilters.tag && !task.tags.includes(currentFilters.tag)) {
        return false
      }

      // Date range filter
      if (currentFilters.dateRange) {
        const taskDate = new Date(task.created_at)
        const now = new Date()
        
        switch (currentFilters.dateRange) {
          case 'Today':
            if (taskDate.toDateString() !== now.toDateString()) return false
            break
          case 'This Week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            if (taskDate < weekAgo) return false
            break
          case 'This Month':
            if (taskDate.getMonth() !== now.getMonth() || taskDate.getFullYear() !== now.getFullYear()) return false
            break
          case 'This Year':
            if (taskDate.getFullYear() !== now.getFullYear()) return false
            break
        }
      }

      return true
    })
  })

  const handleStatusToggle = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    try {
      await updateTaskMutation.mutateAsync({
        id: taskId,
        data: { status: newStatus as Task['status'] }
      })
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      await deleteTaskMutation.mutateAsync(taskId)
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  return (
    <ErrorBoundary>
      <div class="space-y-6">
        {/* Page Header */}
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-white">Tasks</h1>
            <p class="text-gray-400 mt-2">Manage your to-do lists and track progress</p>
          </div>
          <Button>
            <IconPlus class="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          onSearchChange={setSearchQuery}
          onFiltersChange={setFilters}
          placeholder="Search tasks..."
          filterOptions={filterOptions()}
        />

        {/* Error Display */}
        <Show when={tasksQuery.error}>
          <div class="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg flex items-center justify-between">
            <div class="flex items-center">
              <IconAlertTriangle class="mr-2 h-5 w-5" />
              <span>Failed to load tasks: {tasksQuery.error?.message}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => tasksQuery.refetch()}
              class="text-red-400 hover:text-red-300"
            >
              <IconRefresh class="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </Show>

        {/* Loading State */}
        <Show when={tasksQuery.isLoading}>
          <SkeletonList count={5} />
        </Show>

        {/* Tasks List */}
        <Show when={!tasksQuery.isLoading && !tasksQuery.error}>
          <div class="space-y-4">
            <For each={filteredTasks()}>
              {(task) => (
                <Card class="hover:shadow-lg transition-shadow">
                  <CardContent class="p-6">
                    <div class="flex items-start justify-between">
                      <div class="flex items-start space-x-4 flex-1">
                        {/* Status Checkbox */}
                        <div class="flex items-center justify-center mt-1">
                          <button
                            onClick={() => handleStatusToggle(task.id, task.status)}
                            class={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              task.status === 'completed' 
                                ? 'bg-green-600 border-green-600' 
                                : 'border-gray-600'
                            }`}
                          >
                            {task.status === 'completed' && (
                              <IconCheck class="h-3 w-3 text-white" />
                            )}
                          </button>
                        </div>

                        {/* Task Content */}
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center space-x-3 mb-2">
                            <h3 class={`text-lg font-semibold ${
                              task.status === 'completed' ? 'text-gray-400 line-through' : 'text-white'
                            }`}>
                              {task.title}
                            </h3>
                            <span class={`inline-flex items-center px-2 py-1 rounded-full text-xs ${statusColors[task.status]} text-white`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            <IconFlag class={`h-4 w-4 ${priorityColors[task.priority]}`} />
                          </div>
                          
                          {task.description && (
                            <p class="text-gray-300 mb-3">
                              {task.description}
                            </p>
                          )}
                          
                          <div class="flex items-center space-x-4 text-sm text-gray-400">
                            <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div class="flex space-x-2 ml-4">
                        <Button variant="ghost" size="sm" class="text-gray-400 hover:text-white">
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          class="text-gray-400 hover:text-red-400"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <IconX class="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </For>
          </div>
          
          {/* Empty State */}
          <Show when={filteredTasks().length === 0}>
            <div class="text-center py-12">
              <IconFlag class="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 class="text-lg font-medium text-white mb-2">No tasks found</h3>
              <p class="text-gray-400 mb-4">
                {searchQuery() || Object.keys(filters()).length > 0 
                  ? 'Try adjusting your search and filters' 
                  : 'Create your first task to get started'
                }
              </p>
              <Button>
                <IconPlus class="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
          </Show>
        </Show>
      </div>
    </ErrorBoundary>
  )
}
