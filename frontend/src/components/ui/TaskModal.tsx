import { createSignal } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { IconX } from '@tabler/icons-solidjs';

interface Task {
  id?: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  dueDate?: string;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id'>) => Promise<void>;
  task?: Task | null;
  isEdit?: boolean;
}

export const TaskModal = (props: TaskModalProps) => {
  const [taskData, setTaskData] = createSignal<Omit<Task, 'id'>>({
    title: '',
    description: '',
    completed: false,
    priority: 'medium',
    createdAt: new Date().toISOString(),
    dueDate: ''
  });

  const [dueDate, setDueDate] = createSignal<Date | undefined>(
    props.task?.dueDate ? new Date(props.task.dueDate) : undefined
  );

  // Reset form when modal opens/closes or task changes
  const resetForm = () => {
    if (props.task && props.isEdit) {
      setTaskData({
        title: props.task.title,
        description: props.task.description || '',
        completed: props.task.completed || false,
        priority: props.task.priority,
        createdAt: props.task.createdAt,
        dueDate: props.task.dueDate || ''
      });
      setDueDate(props.task.dueDate ? new Date(props.task.dueDate) : undefined);
    } else {
      setTaskData({
        title: '',
        description: '',
        completed: false,
        priority: 'medium',
        createdAt: new Date().toISOString(),
        dueDate: ''
      });
      setDueDate(undefined);
    }
  };

  // Call resetForm when task changes
  if (props.isOpen) {
    resetForm();
  }

  const handleSubmit = () => {
    if (!taskData().title.trim()) return;
    
    const submissionData = {
      ...taskData(),
      dueDate: dueDate() ? dueDate()!.toISOString() : ''
    };
    
    props.onSubmit(submissionData);
  };

  return (
    <>
      {/* Backdrop */}
      {props.isOpen && (
        <div class="fixed inset-0 bg-black/50 z-40" onClick={props.onClose} />
      )}

      {/* Modal */}
      <div class={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl transition-all duration-300 z-50 ${
        props.isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`} style="width: 500px; max-width: 90vw;">
        {/* Header */}
        <div class="flex items-center justify-between p-6 border-b border-border">
          <h3 class="text-lg font-semibold">
            {props.isEdit ? 'Edit Task' : 'Add New Task'}
          </h3>
          <button
            onClick={props.onClose}
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
          >
            <IconX class="size-4" />
          </button>
        </div>

        {/* Content */}
        <div class="p-6 space-y-4">
          <Input
            type="text"
            placeholder="Task title *"
            value={taskData().title}
            onInput={(e) => {
              const target = e.currentTarget as HTMLInputElement;
              if (target) setTaskData(prev => ({ ...prev, title: target.value }));
            }}
            required
          />
          <Input
            type="text"
            placeholder="Description (optional)"
            value={taskData().description}
            onInput={(e) => {
              const target = e.currentTarget as HTMLInputElement;
              if (target) setTaskData(prev => ({ ...prev, description: target.value }));
            }}
          />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select
              value={taskData().priority}
              onChange={(e) => setTaskData(prev => ({ ...prev, priority: e.target.value as any }))}
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <DatePicker
              value={dueDate()}
              onChange={(date) => setDueDate(date || undefined)}
              placeholder="Due date (optional)"
              class="w-full"
            />
          </div>
        </div>

        {/* Footer */}
        <div class="flex justify-end gap-2 p-6 border-t border-border">
          <Button variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!taskData().title.trim()}>
            {props.isEdit ? 'Save Changes' : 'Add Task'}
          </Button>
        </div>
      </div>
    </>
  );
};
