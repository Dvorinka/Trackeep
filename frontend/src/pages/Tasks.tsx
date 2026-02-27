import { createSignal, onMount } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchTagFilterBar } from '@/components/ui/SearchTagFilterBar';
import { TaskModal } from '@/components/ui/TaskModal';
import { IconEdit, IconTrash } from '@tabler/icons-solidjs';
import { getApiV1BaseUrl } from '@/lib/api-url';

const API_BASE_URL = getApiV1BaseUrl();

interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  dueDate?: string;
}

export const Tasks = () => {
  const [tasks, setTasks] = createSignal<Task[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [editingTask, setEditingTask] = createSignal<Task | null>(null);
  const [filter, setFilter] = createSignal<'all' | 'active' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedPriority, setSelectedPriority] = createSignal('');

  onMount(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        headers: {
          'Authorization': localStorage.getItem('trackeep_token') ? `Bearer ${localStorage.getItem('trackeep_token')}` : '',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to load tasks');
      }
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  });

  const filteredTasks = () => {
    const term = searchTerm().toLowerCase();
    const filtered = tasks().filter(task => {
      const matchesSearch = !term || 
        task.title.toLowerCase().includes(term) ||
        (task.description && task.description.toLowerCase().includes(term));

      const matchesPriority = !selectedPriority() || task.priority === selectedPriority();
      
      const matchesFilter = 
        (filter() === 'active' && !task.completed) ||
        (filter() === 'completed' && task.completed) ||
        filter() === 'all';
      
      return matchesSearch && matchesFilter && matchesPriority;
    });
    
    return filtered.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const handleAddTask = async (task: Omit<Task, 'id'>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('trackeep_token') ? `Bearer ${localStorage.getItem('trackeep_token')}` : '',
        },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task');
      }

      const newTask = await response.json();
      setTasks(prev => [newTask, ...prev]);
      setShowAddModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add task');
    }
  };

  const handleEditTask = async (task: Omit<Task, 'id'>) => {
    if (!editingTask()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${editingTask()!.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('trackeep_token') ? `Bearer ${localStorage.getItem('trackeep_token')}` : '',
        },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task');
      }

      const updatedTask = await response.json();
      setTasks(prev => 
        prev.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        )
      );
      setShowEditModal(false);
      setEditingTask(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update task');
    }
  };

  const toggleTaskComplete = async (taskId: number) => {
    try {
      // TODO: Replace with actual API call
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
      ));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const deleteTask = async (taskId: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': localStorage.getItem('trackeep_token') ? `Bearer ${localStorage.getItem('trackeep_token')}` : '',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete task');
        }

        setTasks(prev => prev.filter(task => task.id !== taskId));
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete task');
      }
    }
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive bg-destructive/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'low': return 'text-muted-foreground bg-muted/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const taskStats = () => {
    const total = tasks().length;
    const completed = tasks().filter(t => t.completed).length;
    const active = total - completed;
    return { total, completed, active };
  };

  const hasSearchOrPriorityFilters = () =>
    Boolean(searchTerm().trim()) || Boolean(selectedPriority());

  return (
    <div class="p-6 space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-[#fafafa]">Tasks</h1>
        <Button onClick={() => setShowAddModal(true)}>
          Add Task
        </Button>
      </div>

      <TaskModal
        isOpen={showAddModal()}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddTask}
      />

      <TaskModal
        isOpen={showEditModal()}
        onClose={() => {
          setShowEditModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleEditTask}
        task={editingTask()}
        isEdit={true}
      />

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card class="p-4 text-center">
          <p class="text-2xl font-bold text-[#fafafa]">{taskStats().total}</p>
          <p class="text-[#a3a3a3] text-sm">Total Tasks</p>
        </Card>
        <Card class="p-4 text-center">
          <p class="text-2xl font-bold text-[#fafafa]">{taskStats().active}</p>
          <p class="text-[#a3a3a3] text-sm">Active</p>
        </Card>
        <Card class="p-4 text-center">
          <p class="text-2xl font-bold text-blue-400">{taskStats().completed}</p>
          <p class="text-[#a3a3a3] text-sm">Completed</p>
        </Card>
      </div>

      <SearchTagFilterBar
        searchPlaceholder="Search tasks..."
        searchValue={searchTerm()}
        onSearchChange={(value) => setSearchTerm(value)}
        tagOptions={['high', 'medium', 'low']}
        selectedTag={selectedPriority()}
        onTagChange={(value) => setSelectedPriority(value)}
        onReset={() => {
          setSearchTerm('');
          setSelectedPriority('');
        }}
        allOptionLabel="All Priorities"
      />

      <div class="flex flex-wrap gap-2 -mt-3 mb-6">
        {(['all', 'active', 'completed'] as const).map((filterOption) => (
          <Button
            variant={filter() === filterOption ? 'default' : 'outline'}
            onClick={() => setFilter(filterOption)}
            class="capitalize"
          >
            {filterOption}
          </Button>
        ))}
      </div>

      {isLoading() ? (
        <div class="space-y-4">
          {[...Array(3)].map(() => (
            <Card class="p-6">
              <div class="animate-pulse">
                <div class="h-6 bg-[#262626] rounded mb-2"></div>
                <div class="h-4 bg-[#262626] rounded w-3/4"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div class="space-y-4">
          {filteredTasks().map((task) => (
            <div 
              class={`cursor-pointer transition-all ${task.completed ? 'opacity-60' : ''}`}
              onClick={() => toggleTaskComplete(task.id)}
            >
              <Card class={`p-6 hover:bg-[#141415]`}>
                <div class="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleTaskComplete(task.id);
                    }}
                    class="mt-1 w-4 h-4 text-[#39b9ff] bg-[#141415] border-[#262626] rounded focus:ring-[#39b9ff]"
                  />
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <h3 class={`text-lg font-semibold text-[#fafafa] ${task.completed ? 'line-through' : ''}`}>
                        {task.title}
                      </h3>
                      <div class="flex items-center space-x-2">
                        <span class={`px-2 py-1 text-xs rounded-md ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            editTask(task);
                          }}
                          class="text-blue-400 hover:text-blue-300"
                        >
                          <IconEdit class="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                          }}
                          class="text-red-400 hover:text-red-300"
                        >
                          <IconTrash class="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {task.description && (
                      <p class="text-[#a3a3a3] text-sm mt-1">{task.description}</p>
                    )}
                    {task.dueDate && (
                      <p class="text-[#a3a3a3] text-xs mt-2">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          ))}
          
          {filteredTasks().length === 0 && (
            <Card class="p-12 text-center">
              <p class="text-[#a3a3a3]">
                {hasSearchOrPriorityFilters()
                  ? 'No tasks found matching your search or filters.'
                  : filter() === 'completed' ? 'No completed tasks yet.' : 
                 filter() === 'active' ? 'No active tasks. Great job!' : 
                 'No tasks yet. Add your first task!'}
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
