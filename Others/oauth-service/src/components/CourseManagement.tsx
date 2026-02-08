import { createSignal, onMount, For, Show } from 'solid-js';

interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  price: number;
  thumbnail: string;
  tags: string[];
  resources: CourseResource[];
  created_at: string;
  updated_at: string;
  created_by: number;
  is_active: boolean;
}

interface CourseResource {
  id: number;
  course_id: number;
  title: string;
  type: 'youtube' | 'ztm' | 'github' | 'fireship' | 'link';
  url: string;
  description: string;
  duration: number;
  order: number;
  is_required: boolean;
}

interface Instance {
  id: number;
  name: string;
  url: string;
  api_key: string;
  is_active: boolean;
  version: string;
  created_at: string;
  last_sync: string;
  admin_user_id: number;
}

export const CourseManagement = () => {
  const [courses, setCourses] = createSignal<Course[]>([]);
  const [instances, setInstances] = createSignal<Instance[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [showModal, setShowModal] = createSignal(false);
  const [editingCourse, setEditingCourse] = createSignal<Course | null>(null);
  const [tags, setTags] = createSignal<string[]>([]);
  const [resources, setResources] = createSignal<CourseResource[]>([]);
  const [tagInput, setTagInput] = createSignal('');

  // Form state
  const [formData, setFormData] = createSignal({
    title: '',
    category: '',
    difficulty: '' as 'beginner' | 'intermediate' | 'advanced' | '',
    duration: '',
    description: '',
  });

  const categories = [
    'programming',
    'design', 
    'business',
    'marketing',
    'data-science',
    'web-development',
    'mobile-development',
    'devops',
    'other'
  ];

  const resourceTypes = [
    { value: 'youtube', label: 'YouTube', color: '#ff0000' },
    { value: 'ztm', label: 'ZTM', color: '#3b82f6' },
    { value: 'github', label: 'GitHub', color: '#333' },
    { value: 'fireship', label: 'Fireship', color: '#f59e0b' },
    { value: 'link', label: 'Link', color: '#6b7280' }
  ];

  onMount(async () => {
    await loadCourses();
    await loadInstances();
  });

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/v1/courses');
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstances = async () => {
    try {
      const response = await fetch('/api/v1/instances');
      const data = await response.json();
      setInstances(data.instances || []);
    } catch (error) {
      console.error('Error loading instances:', error);
    }
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      category: '',
      difficulty: '',
      duration: '',
      description: '',
    });
    setTags([]);
    setResources([]);
    setShowModal(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      category: course.category,
      difficulty: course.difficulty,
      duration: course.duration.toString(),
      description: course.description,
    });
    setTags(course.tags || []);
    setResources(course.resources || []);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    setTags([]);
    setResources([]);
  };

  const addTag = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = tagInput().trim();
      if (value && !tags().includes(value)) {
        setTags([...tags(), value]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags().filter(tag => tag !== tagToRemove));
  };

  const addResource = () => {
    setResources([...resources(), {
      id: Date.now(),
      course_id: editingCourse()?.id || 0,
      title: '',
      type: 'link',
      url: '',
      description: '',
      duration: 0,
      order: resources().length + 1,
      is_required: false
    }]);
  };

  const updateResource = (index: number, field: keyof CourseResource, value: any) => {
    const updatedResources = [...resources()];
    updatedResources[index] = { ...updatedResources[index], [field]: value };
    setResources(updatedResources);
  };

  const removeResource = (index: number) => {
    setResources(resources().filter((_, i) => i !== index));
  };

  const saveCourse = async () => {
    try {
      const courseData = {
        ...formData(),
        duration: parseInt(formData().duration),
        tags: tags(),
        resources: resources()
      };

      const url = editingCourse() ? `/api/v1/courses/${editingCourse()!.id}` : '/api/v1/courses';
      const method = editingCourse() ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(courseData)
      });

      if (response.ok) {
        closeModal();
        await loadCourses();
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to save course'));
      }
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Error: Failed to save course');
    }
  };

  const deleteCourse = async (courseId: number) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      const response = await fetch(`/api/v1/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadCourses();
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to delete course'));
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Error: Failed to delete course');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-orange-100 text-orange-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-6">
      <div class="max-w-7xl mx-auto">
        {/* Header */}
        <header class="bg-white/95 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                T
              </div>
              <h1 class="text-2xl font-bold text-gray-900">Trackeep Controller</h1>
            </div>
            <nav class="flex gap-2">
              <a href="/dashboard" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Dashboard</a>
              <a href="/dashboard/courses" class="px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">Courses</a>
              <a href="/dashboard/instances" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Instances</a>
              <a href="/api/v1/user/me" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Profile</a>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <div class="bg-white/95 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-semibold text-gray-900">Course Management</h2>
            <button 
              onClick={openCreateModal}
              class="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
            >
              <span>+</span> Create New Course
            </button>
          </div>

          <Show when={loading()} fallback={
            <Show when={courses().length > 0} fallback={
              <div class="text-center py-16 text-gray-500">
                <div class="text-6xl mb-4 opacity-50">📚</div>
                <div class="text-xl font-semibold mb-2">No courses yet</div>
                <p>Create your first learning course to get started!</p>
              </div>
            }>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <For each={courses()}>
                  {(course) => (
                    <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                      <div class="h-48 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
                        <div class="absolute inset-0 flex items-center justify-center text-white text-5xl font-bold">
                          {course.title.charAt(0).toUpperCase()}
                        </div>
                        <div class="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-gray-900">
                          FREE
                        </div>
                      </div>
                      <div class="p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                        <p class="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                        <div class="flex justify-between items-center mb-4 text-sm text-gray-500">
                          <span>{course.category}</span>
                          <span class={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(course.difficulty)}`}>
                            {course.difficulty}
                          </span>
                          <span>{course.duration}h</span>
                        </div>
                        <div class="flex gap-2">
                          <button 
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            onClick={() => window.open(`/api/v1/courses/${course.id}`, '_blank')}
                          >
                            👁️ View
                          </button>
                          <button 
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            onClick={() => openEditModal(course)}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            class="flex-1 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                            onClick={() => deleteCourse(course.id)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          }>
            <div class="text-center py-8 text-gray-500">Loading courses...</div>
          </Show>
        </div>
      </div>

      {/* Course Modal */}
      <Show when={showModal()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-semibold text-gray-900">
                {editingCourse() ? 'Edit Course' : 'Create New Course'}
              </h3>
              <button 
                onClick={closeModal}
                class="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
                  <input
                    type="text"
                    value={formData().title}
                    onInput={(e) => setFormData({ ...formData(), title: e.currentTarget.value })}
                    placeholder="Course Title"
                    class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={formData().category}
                    onChange={(e) => setFormData({ ...formData(), category: e.currentTarget.value })}
                    class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Category</option>
                    <For each={categories}>
                      {(category) => <option value={category}>{category}</option>}
                    </For>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Difficulty *</label>
                  <select
                    value={formData().difficulty}
                    onChange={(e) => setFormData({ ...formData(), difficulty: e.currentTarget.value as any })}
                    class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Difficulty</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Duration (hours) *</label>
                  <input
                    type="number"
                    value={formData().duration}
                    onInput={(e) => setFormData({ ...formData(), duration: e.currentTarget.value })}
                    min="1"
                    class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={formData().description}
                  onInput={(e) => setFormData({ ...formData(), description: e.currentTarget.value })}
                  placeholder="Course description"
                  rows={4}
                  class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tags (press Enter to add)</label>
                <div class="flex flex-wrap gap-2 p-3 border-2 border-gray-200 rounded-lg min-h-[50px] cursor-text" onClick={(e: MouseEvent) => {
                  const target = e.currentTarget as HTMLElement;
                  const input = target.querySelector('input') as HTMLInputElement;
                  input?.focus();
                }}>
                  <For each={tags()}>
                    {(tag) => (
                      <span class="bg-indigo-500 text-white px-2 py-1 rounded-md text-sm flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} class="font-bold">&times;</button>
                      </span>
                    )}
                  </For>
                  <input
                    type="text"
                    value={tagInput()}
                    onInput={(e) => setTagInput(e.currentTarget.value)}
                    onKeyDown={addTag}
                    placeholder="Add tags..."
                    class="border-none outline-none flex-1 min-w-[100px] p-1"
                  />
                </div>
              </div>

              <div>
                <div class="flex justify-between items-center mb-4">
                  <h4 class="text-lg font-medium text-gray-900">Course Resources</h4>
                  <button 
                    type="button"
                    onClick={addResource}
                    class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>+</span> Add Resource
                  </button>
                </div>
                <div class="space-y-3">
                  <For each={resources()}>
                    {(resource, index) => (
                      <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div class="flex-1 space-y-2">
                          <input
                            type="text"
                            placeholder="Resource Title"
                            value={resource.title}
                            onInput={(e) => updateResource(index(), 'title', e.currentTarget.value)}
                            class="w-full p-2 border border-gray-200 rounded-md"
                          />
                          <div class="flex gap-2">
                            <select
                              value={resource.type}
                              onChange={(e) => updateResource(index(), 'type', e.currentTarget.value)}
                              class="p-2 border border-gray-200 rounded-md"
                            >
                              <For each={resourceTypes}>
                                {(type) => <option value={type.value}>{type.label}</option>}
                              </For>
                            </select>
                            <input
                              type="url"
                              placeholder="URL"
                              value={resource.url}
                              onInput={(e) => updateResource(index(), 'url', e.currentTarget.value)}
                              class="flex-1 p-2 border border-gray-200 rounded-md"
                            />
                            <input
                              type="number"
                              placeholder="Duration (min)"
                              value={resource.duration}
                              onInput={(e) => updateResource(index(), 'duration', parseInt(e.currentTarget.value) || 0)}
                              class="w-24 p-2 border border-gray-200 rounded-md"
                            />
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeResource(index())}
                          class="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </div>

              <div class="flex gap-3 justify-end">
                <button 
                  type="button"
                  onClick={closeModal}
                  class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={saveCourse}
                  class="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  Save Course
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
