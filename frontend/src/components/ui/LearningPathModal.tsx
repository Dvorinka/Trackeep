import { createSignal } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { IconX } from '@tabler/icons-solidjs';

interface LearningPathFormData {
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  thumbnail?: string;
  is_featured?: boolean;
}

interface LearningPathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (learningPath: LearningPathFormData) => Promise<void>;
  learningPath?: LearningPathFormData | null;
  isEdit?: boolean;
}

export const LearningPathModal = (props: LearningPathModalProps) => {
  const [learningPathData, setLearningPathData] = createSignal<LearningPathFormData>({
    title: '',
    description: '',
    category: '',
    difficulty: 'beginner',
    duration: '',
    thumbnail: '',
    is_featured: false
  });

  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Reset form when modal opens/closes or learningPath changes
  const resetForm = () => {
    if (props.learningPath && props.isEdit) {
      setLearningPathData({
        title: props.learningPath.title,
        description: props.learningPath.description,
        category: props.learningPath.category,
        difficulty: props.learningPath.difficulty,
        duration: props.learningPath.duration,
        thumbnail: props.learningPath.thumbnail || '',
        is_featured: props.learningPath.is_featured || false
      });
    } else {
      setLearningPathData({
        title: '',
        description: '',
        category: '',
        difficulty: 'beginner',
        duration: '',
        thumbnail: '',
        is_featured: false
      });
    }
  };

  // Reset form when modal opens/closes
  if (props.isOpen) {
    resetForm();
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!learningPathData().title.trim() || !learningPathData().description.trim()) {
      // Display inline error instead of alert
      return;
    }

    setIsSubmitting(true);
    try {
      await props.onSubmit(learningPathData());
      props.onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to save learning path:', error);
      // Let the parent handle the error display
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof LearningPathFormData) => {
    return (e: Event) => {
      const target = e.currentTarget as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (target) {
        setLearningPathData(prev => ({
          ...prev,
          [field]: target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value
        }));
      }
    };
  };

  if (!props.isOpen) return null;

  return (
    <ModalPortal>
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-[#1a1a1a] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 my-4">
        {/* Header */}
        <div class="flex items-center justify-between p-6 border-b border-[#404040]">
          <h2 class="text-xl font-semibold text-[#fafafa]">
            {props.isEdit ? 'Edit Learning Path' : 'Create New Learning Path'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onClose}
            class="text-[#a3a3a3] hover:text-[#fafafa]"
          >
            <IconX class="size-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} class="p-6 space-y-6">
          {/* Title */}
          <div>
            <label class="block text-sm font-medium text-[#fafafa] mb-2">
              Title *
            </label>
            <Input
              type="text"
              value={learningPathData().title}
              onInput={handleInputChange('title')}
              placeholder="Enter learning path title"
              required
              class="w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label class="block text-sm font-medium text-[#fafafa] mb-2">
              Description *
            </label>
            <textarea
              value={learningPathData().description}
              onInput={handleInputChange('description')}
              placeholder="Describe what students will learn in this path"
              rows={4}
              required
              class="w-full px-3 py-2 bg-[#262626] text-[#fafafa] border border-[#404040] rounded-lg focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Category and Difficulty */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-[#fafafa] mb-2">
                Category *
              </label>
              <select
                value={learningPathData().category}
                onChange={handleInputChange('category')}
                required
                class="w-full px-3 py-2 bg-[#262626] text-[#fafafa] border border-[#404040] rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">Select a category</option>
                <option value="programming">Programming</option>
                <option value="web-development">Web Development</option>
                <option value="mobile-development">Mobile Development</option>
                <option value="data-science">Data Science</option>
                <option value="machine-learning">Machine Learning</option>
                <option value="cybersecurity">Cybersecurity</option>
                <option value="design">Design</option>
                <option value="business">Business</option>
                <option value="marketing">Marketing</option>
                <option value="photography">Photography</option>
                <option value="music">Music</option>
                <option value="writing">Writing</option>
                <option value="languages">Languages</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-[#fafafa] mb-2">
                Difficulty *
              </label>
              <select
                value={learningPathData().difficulty}
                onChange={handleInputChange('difficulty')}
                required
                class="w-full px-3 py-2 bg-[#262626] text-[#fafafa] border border-[#404040] rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label class="block text-sm font-medium text-[#fafafa] mb-2">
              Duration *
            </label>
            <Input
              type="text"
              value={learningPathData().duration}
              onInput={handleInputChange('duration')}
              placeholder="e.g., 8 weeks, 3 months"
              required
              class="w-full"
            />
          </div>

          {/* Thumbnail */}
          <div>
            <label class="block text-sm font-medium text-[#fafafa] mb-2">
              Thumbnail URL (optional)
            </label>
            <Input
              type="text"
              value={learningPathData().thumbnail}
              onInput={handleInputChange('thumbnail')}
              placeholder="https://example.com/image.jpg"
              class="w-full"
            />
          </div>

          {/* Featured */}
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={learningPathData().is_featured}
              onChange={handleInputChange('is_featured')}
              class="w-4 h-4 text-blue-600 bg-[#262626] border-[#404040] rounded focus:ring-blue-500"
            />
            <label for="featured" class="text-sm font-medium text-[#fafafa]">
              Featured Learning Path
            </label>
          </div>

          {/* Actions */}
          <div class="flex justify-end gap-3 pt-4 border-t border-[#404040]">
            <Button
              variant="outline"
              onClick={props.onClose}
              disabled={isSubmitting()}
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => handleSubmit(e)}
              disabled={isSubmitting()}
              class="min-w-[100px]"
            >
              {isSubmitting() ? (
                <span class="flex items-center gap-2">
                  <span class="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
                  {props.isEdit ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                props.isEdit ? 'Update Learning Path' : 'Create Learning Path'
              )}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </ModalPortal>
  );
};
