import { createSignal, onMount, For, Show } from 'solid-js';

interface DashboardStats {
  total_users: number;
  total_courses: number;
  total_instances: number;
  active_courses: number;
  total_progress: number;
}

interface Course {
  id: number;
  title: string;
  category: string;
  difficulty: string;
  duration: number;
  thumbnail: string;
  created_at: string;
  is_active: boolean;
}

interface Instance {
  id: number;
  name: string;
  url: string;
  version: string;
  is_active: boolean;
  created_at: string;
  last_sync: string;
  api_key: string;
}

export const Dashboard = () => {
  const [stats, setStats] = createSignal<DashboardStats>({
    total_users: 0,
    total_courses: 0,
    total_instances: 0,
    active_courses: 0,
    total_progress: 0
  });
  
  const [courses, setCourses] = createSignal<Course[]>([]);
  const [instances, setInstances] = createSignal<Instance[]>([]);
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    await Promise.all([
      loadStats(),
      loadCourses(),
      loadInstances()
    ]);
    setLoading(false);
  });

  const loadStats = async () => {
    try {
      const response = await fetch('/api/v1/dashboard/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/v1/dashboard/courses');
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error loading courses:', error);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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
        <header class="glass rounded-2xl p-6 mb-8 shadow-xl">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                T
              </div>
              <h1 class="text-2xl font-bold text-gray-900">Trackeep Controller</h1>
            </div>
            <nav class="flex gap-2">
              <a href="/dashboard" class="px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">Dashboard</a>
              <a href="/dashboard/courses" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Courses</a>
              <a href="/dashboard/instances" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Instances</a>
              <a href="/api/v1/user/me" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Profile</a>
            </nav>
          </div>
        </header>

        {/* Stats Grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="glass rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xl mb-4">
              👥
            </div>
            <div class="text-3xl font-bold text-gray-900 mb-2">{stats().total_users}</div>
            <div class="text-gray-600 font-medium">Total Users</div>
          </div>

          <div class="glass rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white text-xl mb-4">
              📚
            </div>
            <div class="text-3xl font-bold text-gray-900 mb-2">{stats().active_courses}</div>
            <div class="text-gray-600 font-medium">Active Courses</div>
          </div>

          <div class="glass rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl mb-4">
              🖥️
            </div>
            <div class="text-3xl font-bold text-gray-900 mb-2">{stats().total_instances}</div>
            <div class="text-gray-600 font-medium">Connected Instances</div>
          </div>

          <div class="glass rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div class="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-xl mb-4">
              📈
            </div>
            <div class="text-3xl font-bold text-gray-900 mb-2">{stats().total_progress}</div>
            <div class="text-gray-600 font-medium">Learning Progress</div>
          </div>
        </div>

        {/* Main Content */}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Courses */}
          <div class="lg:col-span-2">
            <div class="glass rounded-2xl p-6 shadow-xl">
              <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-semibold text-gray-900">Recent Courses</h2>
                <a href="/dashboard/courses" class="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
                  Manage Courses
                </a>
              </div>

              <Show when={loading()} fallback={
                <Show when={courses().length > 0} fallback={
                  <div class="text-center py-12 text-gray-500">
                    <div class="text-5xl mb-4 opacity-50">📚</div>
                    <div class="text-lg font-semibold mb-2">No courses yet</div>
                    <p>Create your first course to get started!</p>
                  </div>
                }>
                  <div class="space-y-4">
                    <For each={courses().slice(0, 5)}>
                      {(course) => (
                        <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div class="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                            {course.title.charAt(0).toUpperCase()}
                          </div>
                          <div class="flex-1">
                            <div class="font-medium text-gray-900">{course.title}</div>
                            <div class="text-sm text-gray-600">{course.category} • {course.difficulty} • {course.duration}h</div>
                          </div>
                          <div class="flex gap-2">
                            <button 
                              class="p-2 text-gray-600 hover:text-indigo-600 transition-colors"
                              onClick={() => window.open(`/api/v1/courses/${course.id}`, '_blank')}
                              title="View"
                            >
                              👁️
                            </button>
                            <button 
                              class="p-2 text-gray-600 hover:text-indigo-600 transition-colors"
                              onClick={() => window.location.href = `/dashboard/courses?edit=${course.id}`}
                              title="Edit"
                            >
                              ✏️
                            </button>
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

          {/* Active Instances */}
          <div>
            <div class="glass rounded-2xl p-6 shadow-xl">
              <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-semibold text-gray-900">Active Instances</h2>
                <a href="/dashboard/instances" class="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  View All
                </a>
              </div>

              <Show when={loading()} fallback={
                <Show when={instances().length > 0} fallback={
                  <div class="text-center py-12 text-gray-500">
                    <div class="text-5xl mb-4 opacity-50">🖥️</div>
                    <div class="text-lg font-semibold mb-2">No instances</div>
                    <p>Register your first instance to get started!</p>
                  </div>
                }>
                  <div class="space-y-3">
                    <For each={instances().slice(0, 3)}>
                      {(instance) => (
                        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div class={`w-2 h-2 rounded-full ${instance.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div class="flex-1">
                            <div class="font-medium text-gray-900">{instance.name}</div>
                            <div class="text-sm text-gray-600">{instance.version}</div>
                          </div>
                          <button 
                            class="p-2 text-gray-600 hover:text-indigo-600 transition-colors"
                            onClick={() => window.open(`/api/v1/instances/${instance.id}`, '_blank')}
                            title="View"
                          >
                            🔗
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              }>
                <div class="text-center py-8 text-gray-500">Loading instances...</div>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
