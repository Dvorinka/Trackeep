import { createSignal, onMount } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TaskModal } from '@/components/ui/TaskModal';
import { IconEdit, IconTrash } from '@tabler/icons-solidjs';
import { getApiV1BaseUrl } from '@/lib/api-url';
import { useHaptics } from '@/lib/haptics';

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
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedPriority, setSelectedPriority] = createSignal('');
  const [draggedTaskId, setDraggedTaskId] = createSignal<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = createSignal<string | null>(null);
  const [taskStatuses, setTaskStatuses] = createSignal<Record<number, 'todo' | 'inProgress' | 'done'>>({});

  const haptics = useHaptics();

  const getTaskColumn = (task: Task) => {
    if (task.completed) return 'done';
    return taskStatuses()[task.id] || 'todo';
  };

  const setTaskColumn = async (taskId: number, column: 'todo' | 'inProgress' | 'done') => {
    const task = tasks().find(t => t.id === taskId);
    if (!task) return;

    const shouldBeCompleted = column === 'done';

    if (column === 'done') {
      setTaskStatuses(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    } else {
      setTaskStatuses(prev => ({ ...prev, [taskId]: column }));
    }

    if (task.completed !== shouldBeCompleted) {
      try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('trackeep_token') ? `Bearer ${localStorage.getItem('trackeep_token')}` : '',
          },
          body: JSON.stringify({ ...task, completed: shouldBeCompleted }),
        });
        if (response.ok) {
          const updated = await response.json();
          setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
        }
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: shouldBeCompleted } : t));
    }
  };

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

  const searchedTasks = () => {
    const term = searchTerm().toLowerCase();
    return tasks().filter(task => {
      const matchesSearch = !term ||
        task.title.toLowerCase().includes(term) ||
        (task.description && task.description.toLowerCase().includes(term));
      const matchesPriority = !selectedPriority() || task.priority === selectedPriority();
      return matchesSearch && matchesPriority;
    }).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const columnTasks = (column: 'todo' | 'inProgress' | 'done') =>
    searchedTasks().filter(t => getTaskColumn(t) === column);

  const columnCounts = () => ({
    todo: columnTasks('todo').length,
    inProgress: columnTasks('inProgress').length,
    done: columnTasks('done').length,
  });

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
      haptics.success(); // Success feedback for adding task
    } catch (error) {
      haptics.error(); // Error feedback
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
      haptics.success(); // Success feedback for editing task
    } catch (error) {
      haptics.error(); // Error feedback
      alert(error instanceof Error ? error.message : 'Failed to update task');
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
        haptics.delete(); // Delete feedback
      } catch (error) {
        haptics.error(); // Error feedback
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

  return (
    <div class="p-6 space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-3xl font-bold text-foreground">Tasks</h1>
          <p class="text-muted-foreground text-sm mt-1">{columnCounts().todo} todo · {columnCounts().inProgress} in progress · {columnCounts().done} done</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} haptic="impact">
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

      <div class="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchTerm()}
          onInput={(e) => setSearchTerm(e.currentTarget.value)}
          class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <select
          value={selectedPriority()}
          onChange={(e) => setSelectedPriority(e.currentTarget.value)}
          class="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {isLoading() ? (
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map(() => (
            <Card class="p-4 h-48">
              <div class="animate-pulse space-y-3">
                <div class="h-5 bg-muted rounded w-1/2"></div>
                <div class="h-20 bg-muted rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {([
            { key: 'todo' as const, label: 'To Do', color: 'border-t-4 border-t-muted-foreground' },
            { key: 'inProgress' as const, label: 'In Progress', color: 'border-t-4 border-t-primary' },
            { key: 'done' as const, label: 'Done', color: 'border-t-4 border-t-emerald-500' },
          ]).map((col) => {
            const items = columnTasks(col.key);
            const isDropTarget = dragOverColumn() === col.key;
            return (
              <div
                class={`flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 min-h-[12rem] transition-all ${col.color} ${isDropTarget ? 'ring-2 ring-primary/30 bg-primary/5' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.key); }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => { e.preventDefault(); setDragOverColumn(null); const id = draggedTaskId(); if (id !== null) setTaskColumn(id, col.key); setDraggedTaskId(null); }}
              >
                <div class="flex items-center justify-between">
                  <h2 class="font-semibold text-foreground">{col.label}</h2>
                  <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{items.length}</span>
                </div>
                <div class="flex flex-col gap-2">
                  {items.map((task: Task) => (
                    <div
                      draggable={true}
                      onDragStart={() => { setDraggedTaskId(task.id); haptics.impact(); }}
                      onDragEnd={() => setDraggedTaskId(null)}
                      class={`group bg-background border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/20 transition-all ${draggedTaskId() === task.id ? 'opacity-40' : ''}`}
                    >
                      <div class="flex items-start justify-between gap-2">
                        <h3 class="text-sm font-medium text-foreground leading-snug flex-1">{task.title}</h3>
                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => editTask(task)}
                            class="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <IconEdit class="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            class="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                          >
                            <IconTrash class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {task.description && (
                        <p class="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                      )}
                      <div class="flex items-center gap-2 mt-2">
                        <span class={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span class="text-[10px] text-muted-foreground">
                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div class="text-center py-8 text-xs text-muted-foreground border-2 border-dashed border-border rounded-lg">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
