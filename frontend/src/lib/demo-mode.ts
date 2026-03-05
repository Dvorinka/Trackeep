// Demo mode API interceptor to provide mock data instead of making real API calls

import { hasAnyCredentials, isBackendAvailable, isSearchAvailable } from './credentials';

// Check if demo mode is enabled via environment variable
export const isEnvDemoMode = (): boolean => {
  // First check runtime environment variable (for Docker) - this should take priority
  const runtimeResult = (window as any).ENV?.VITE_DEMO_MODE === 'true';
  
  // Check window.importMetaEnv as well
  const importMetaEnvResult = (window as any).importMetaEnv?.VITE_DEMO_MODE === 'true';
  
  // Then check build-time environment variable as fallback
  const buildTimeResult = import.meta.env.VITE_DEMO_MODE === 'true';
  
  const result = runtimeResult || importMetaEnvResult || buildTimeResult;
  return result;
};

// Check if demo mode is active (environment variable only)
export const isDemoMode = (): boolean => {
  // Only check environment variable - no localStorage persistence
  return isEnvDemoMode();
};

// Check if we should use real APIs even in demo mode
export const shouldUseRealAPIs = (): boolean => {
  const hasCredentials = hasAnyCredentials();
  const hasBackend = shouldUseRealBackend();
  const result = hasCredentials || hasBackend;
  return result;
};

// Check if we should use real backend API
export const shouldUseRealBackend = (): boolean => {
  return isBackendAvailable();
};

// Check if we should use real search APIs
export const shouldUseRealSearch = (): boolean => {
  return isSearchAvailable();
};

// Clear demo mode from localStorage
export const clearDemoMode = (): void => {
  localStorage.removeItem('demoMode');
  // Only clear demo tokens, not legitimate user tokens
  const token = localStorage.getItem('token');
  
  // Only clear if they look like demo tokens (contain 'demo-token')
  if (token && token.includes('demo-token')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('trackeep_token');
    localStorage.removeItem('trackeep_user');
  }
};

// Set demo mode (no-op - environment variable only)
export const setDemoMode = (): void => {
  // Demo mode is controlled by environment variable only
  // No localStorage persistence
};

// Mock data generators
const generateMockStats = () => ({
  total_tasks: 42,
  completed_tasks: 28,
  total_bookmarks: 156,
  total_notes: 89,
  total_files: 234,
  total_time_tracked: 125000, // seconds
  recent_activity: [
    { type: 'task', action: 'completed', title: 'Complete project documentation', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { type: 'bookmark', action: 'added', title: 'SolidJS Documentation', timestamp: new Date(Date.now() - 7200000).toISOString() },
    { type: 'note', action: 'created', title: 'Meeting notes - Q1 planning', timestamp: new Date(Date.now() - 10800000).toISOString() },
    { type: 'file', action: 'uploaded', title: 'project-roadmap.pdf', timestamp: new Date(Date.now() - 14400000).toISOString() },
  ],
  totalTimeTracked: 125000,
  averageProductivity: 78,
  recentProjects: [
    { name: 'Trackeep Frontend', progress: 85, status: 'active' },
    { name: 'API Documentation', progress: 60, status: 'active' },
    { name: 'Mobile App', progress: 30, status: 'planning' }
  ],
  topCategories: [
    { name: 'Development', count: 45, color: '#3b82f6' },
    { name: 'Documentation', count: 32, color: '#10b981' },
    { name: 'Design', count: 28, color: '#f59e0b' },
    { name: 'Research', count: 21, color: '#8b5cf6' },
    { name: 'Testing', count: 18, color: '#ef4444' }
  ],
  weeklyActivity: [12, 8, 15, 6, 9, 14, 3]
});

const generateMockGitHubRepos = () => [
  {
    id: 1,
    name: 'trackeep',
    full_name: 'tdvorak/trackeep',
    description: 'Your Self-Hosted Productivity Hub',
    private: false,
    stargazers_count: 245,
    forks_count: 65,
    watchers_count: 43,
    language: 'Go',
    updated_at: new Date().toISOString(),
    html_url: 'https://github.com/tdvorak/trackeep',
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    size: 1250,
    open_issues_count: 12,
    default_branch: 'main'
  },
  {
    id: 2,
    name: 'solidjs-components',
    full_name: 'tdvorak/solidjs-components',
    description: 'Reusable SolidJS components library',
    private: false,
    stargazers_count: 89,
    forks_count: 12,
    watchers_count: 8,
    language: 'TypeScript',
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    html_url: 'https://github.com/tdvorak/solidjs-components',
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    size: 450,
    open_issues_count: 3,
    default_branch: 'main'
  },
  {
    id: 3,
    name: 'docker-homelab',
    full_name: 'tdvorak/docker-homelab',
    description: 'Complete Docker setup for home lab environment',
    private: false,
    stargazers_count: 156,
    forks_count: 34,
    watchers_count: 21,
    language: 'Dockerfile',
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    html_url: 'https://github.com/tdvorak/docker-homelab',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    size: 890,
    open_issues_count: 7,
    default_branch: 'main'
  },
  {
    id: 4,
    name: 'network-tools',
    full_name: 'tdvorak/network-tools',
    description: 'Collection of networking utilities and scripts',
    private: true,
    stargazers_count: 45,
    forks_count: 8,
    watchers_count: 5,
    language: 'Python',
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    html_url: 'https://github.com/tdvorak/network-tools',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    size: 234,
    open_issues_count: 2,
    default_branch: 'develop'
  }
];

const generateMockTimeEntries = () => [
  {
    id: 1,
    description: 'Working on Trackeep frontend',
    start_time: new Date(Date.now() - 7200000).toISOString(),
    end_time: new Date(Date.now() - 3600000).toISOString(),
    duration: 3600,
    billable: true,
    hourly_rate: 75,
    task_id: 1,
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 2,
    description: 'Meeting with team',
    start_time: new Date(Date.now() - 14400000).toISOString(),
    end_time: new Date(Date.now() - 12600000).toISOString(),
    duration: 1800,
    billable: false,
    hourly_rate: 0,
    task_id: null,
    created_at: new Date(Date.now() - 12600000).toISOString()
  }
];

const generateMockVideoBookmarks = () => [
  {
    id: 1,
    video_id: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    description: 'Classic music video from Rick Astley',
    channel: 'Rick Astley',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    duration: '3:33',
    publishedAt: '2009-10-25',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tags: [
      { id: 1, name: 'music', color: '#ff6b6b' },
      { id: 2, name: 'classic', color: '#4ecdc4' },
      { id: 3, name: '80s', color: '#45b7d1' }
    ],
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    video_id: 'jNQXAC9IVRw',
    title: 'How to Build a REST API with Go',
    description: 'Complete tutorial on building RESTful APIs using Go and Gin framework',
    channel: 'Tech with Tim',
    thumbnail: 'https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
    duration: '45:20',
    publishedAt: '2024-01-15',
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    tags: [
      { id: 4, name: 'programming', color: '#9b59b6' },
      { id: 5, name: 'golang', color: '#3498db' },
      { id: 6, name: 'tutorial', color: '#2ecc71' }
    ],
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    video_id: '8S2UDfJ9R8A',
    title: 'SolidJS vs React: A Comprehensive Comparison',
    description: 'Deep dive into the differences between SolidJS and React frameworks',
    channel: 'Frontend Masters',
    thumbnail: 'https://img.youtube.com/vi/8S2UDfJ9R8A/maxresdefault.jpg',
    duration: '28:15',
    publishedAt: '2024-02-01',
    url: 'https://www.youtube.com/watch?v=8S2UDfJ9R8A',
    tags: [
      { id: 7, name: 'javascript', color: '#f39c12' },
      { id: 8, name: 'frontend', color: '#e74c3c' },
      { id: 9, name: 'framework', color: '#27ae60' }
    ],
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    video_id: '5qap5aO4i9A',
    title: 'Docker Networking Explained',
    description: 'Understanding Docker networking concepts and best practices',
    channel: 'DevOps Toolkit',
    thumbnail: 'https://img.youtube.com/vi/5qap5aO4i9A/maxresdefault.jpg',
    duration: '32:45',
    publishedAt: '2024-01-20',
    url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
    tags: [
      { id: 10, name: 'docker', color: '#0db7ed' },
      { id: 11, name: 'devops', color: '#ff5722' },
      { id: 12, name: 'networking', color: '#4caf50' }
    ],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 5,
    video_id: 'LXb3EKWsInQ',
    title: 'Productivity Tips for Developers',
    description: 'Essential productivity tips and tools for software developers',
    channel: 'Coding Career',
    thumbnail: 'https://img.youtube.com/vi/LXb3EKWsInQ/maxresdefault.jpg',
    duration: '18:30',
    publishedAt: '2024-02-10',
    url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
    tags: [
      { id: 13, name: 'productivity', color: '#ff9800' },
      { id: 14, name: 'development', color: '#607d8b' },
      { id: 15, name: 'tips', color: '#795548' }
    ],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const generateMockTeams = () => [
  {
    id: 1,
    name: 'Trackeep Workspace',
    description: 'Main workspace for Trackeep development',
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

const generateMockMembers = () => [
  {
    user_id: 1,
    user: {
      id: 1,
      username: 'demo',
      email: 'demo@trackeep.com',
      full_name: 'Demo User'
    },
    role: 'owner',
    joined_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    user_id: 2,
    user: {
      id: 2,
      username: 'alice',
      email: 'alice@trackeep.com',
      full_name: 'Alice Johnson'
    },
    role: 'admin',
    joined_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    user_id: 3,
    user: {
      id: 3,
      username: 'bob',
      email: 'bob@trackeep.com',
      full_name: 'Bob Smith'
    },
    role: 'member',
    joined_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    user_id: 4,
    user: {
      id: 4,
      username: 'carol',
      email: 'carol@trackeep.com',
      full_name: 'Carol Davis'
    },
    role: 'member',
    joined_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const generateMockLearningPaths = () => [
  {
    id: 1,
    title: 'SolidJS Mastery',
    description: 'Complete guide to SolidJS framework',
    category: 'frontend',
    difficulty: 'intermediate',
    estimated_hours: 20,
    progress: 65,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Go Backend Development',
    description: 'Build scalable backend with Go',
    category: 'backend',
    difficulty: 'advanced',
    estimated_hours: 40,
    progress: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const generateMockChatSessions = () => [
  {
    id: 1,
    title: 'Project Planning Discussion',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    message_count: 15
  },
  {
    id: 2,
    title: 'Code Review Help',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    message_count: 8
  }
];

const generateMockRemovedItems = () => [
  {
    id: '1',
    name: 'Old Project Documentation.pdf',
    type: 'pdf',
    removedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    removedBy: 'Demo User',
    size: '2.4 MB',
    path: '/documents/projects/',
    daysInTrash: 5
  },
  {
    id: '2',
    name: 'Backup Database.sql',
    type: 'sql',
    removedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    removedBy: 'Demo User',
    size: '15.7 MB',
    path: '/backups/',
    daysInTrash: 12
  },
  {
    id: '3',
    name: 'Draft Presentation.pptx',
    type: 'pptx',
    removedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    removedBy: 'Demo User',
    size: '8.2 MB',
    path: '/presentations/',
    daysInTrash: 3
  },
  {
    id: '4',
    name: 'Old Archive.zip',
    type: 'zip',
    removedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    removedBy: 'Demo User',
    size: '124.5 MB',
    path: '/archives/',
    daysInTrash: 25
  },
  {
    id: '5',
    name: 'Temp Files',
    type: 'folder',
    removedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    removedBy: 'Demo User',
    size: '456 KB',
    path: '/temp/',
    daysInTrash: 1
  }
];

const generateMockAIProviders = () => [
  {
    id: 'longcat',
    name: 'LongCat AI',
    description: 'Fast and efficient AI models',
    models: ['LongCat-Flash-Chat', 'LongCat-Flash-Thinking'],
    enabled: true,
    api_key_configured: true
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'European AI models',
    models: ['mistral-small-latest', 'mistral-large-latest'],
    enabled: false,
    api_key_configured: false
  }
];

const generateMockFiles = () => [
  {
    id: 1,
    original_name: 'product-roadmap-q2.pdf',
    mime_type: 'application/pdf',
    file_size: 2_517_432,
    description: 'Q2 roadmap and milestones',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    original_name: 'meeting-notes.md',
    mime_type: 'text/markdown',
    file_size: 15_384,
    description: 'Weekly sync notes',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    original_name: 'architecture-diagram.png',
    mime_type: 'image/png',
    file_size: 842_112,
    description: 'System architecture overview',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const generateMockAISettings = () => ({
  mistral: {
    enabled: false,
    api_key: '',
    model: 'mistral-small-latest',
    model_thinking: 'mistral-large-latest',
  },
  grok: {
    enabled: false,
    api_key: '',
    base_url: 'https://api.x.ai/v1',
    model: 'grok-4-1-fast-non-reasoning-latest',
    model_thinking: 'grok-4-1-fast-reasoning-latest',
  },
  deepseek: {
    enabled: false,
    api_key: '',
    base_url: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    model_thinking: 'deepseek-reasoner',
  },
  ollama: {
    enabled: false,
    base_url: 'http://localhost:11434',
    model: 'llama3.1',
    model_thinking: 'llama3.1',
  },
  longcat: {
    enabled: true,
    api_key: '********',
    base_url: 'https://api.longcat.chat',
    openai_endpoint: 'https://api.longcat.chat/openai',
    anthropic_endpoint: 'https://api.longcat.chat/anthropic',
    model: 'LongCat-Flash-Chat',
    model_thinking: 'LongCat-Flash-Thinking',
    model_thinking_upgraded: 'LongCat-Flash-Thinking-2601',
    format: 'openai',
  },
  openrouter: {
    enabled: false,
    api_key: '',
    base_url: 'https://openrouter.ai/api',
    model: 'openrouter/auto',
    model_thinking: 'openrouter/auto',
  },
});

const generateMockSearchSettings = () => ({
  brave_api_key: '',
  brave_search_base_url: 'https://api.search.brave.com/res/v1/web/search',
  serper_api_key: '',
  serper_base_url: 'https://google.serper.dev/search',
  search_api_provider: 'brave',
  search_results_limit: 10,
  search_cache_ttl: 300,
  search_rate_limit: 100,
});

const generateMockEmailSettings = () => ({
  smtp_enabled: false,
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  smtp_from_email: '',
  smtp_from_name: 'Trackeep',
  smtp_encryption: 'tls',
  oauth_enabled: false,
  oauth_provider: 'google',
  oauth_client_id: '',
  oauth_client_secret: '',
  oauth_redirect_uri: '',
});

const generateMockMembersDirectory = () =>
  generateMockMembers().map((member) => ({
    id: Number(member.user?.id || member.user_id || 0),
    username: member.user?.username || `user-${member.user_id}`,
    full_name: member.user?.full_name || member.user?.username || 'Member',
    name: member.user?.full_name || member.user?.username || 'Member',
    email: member.user?.email || '',
    role: member.role,
  }));

const generateMockChatSessionsExtended = () =>
  generateMockChatSessions().map((session) => ({
    ...session,
    include_bookmarks: true,
    include_tasks: true,
    include_files: true,
    include_notes: true,
    last_message_at: session.updated_at,
  }));

const generateMockChatMessages = (sessionId: number) => [
  {
    id: sessionId * 100 + 1,
    content: 'Can you summarize my pending tasks for this week?',
    role: 'user',
    created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    token_count: 22,
    context_items: ['tasks'],
  },
  {
    id: sessionId * 100 + 2,
    content: 'You have 6 open tasks. Two are high priority and due in the next 48 hours.',
    role: 'assistant',
    created_at: new Date(Date.now() - 49 * 60 * 1000).toISOString(),
    token_count: 31,
    context_items: ['tasks', 'notes'],
  },
];

const generateMockAnalyticsDashboard = (days: number) => {
  const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 30;
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - safeDays + 1);

  return {
    period: {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      days: safeDays,
    },
    summary: {
      hours_tracked: 62.5,
      tasks_completed: 28,
      bookmarks_added: 19,
      notes_created: 11,
      courses_completed: 2,
      github_commits: 34,
    },
    analytics: [
      {
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        hours_tracked: 5.5,
        tasks_completed: 3,
        bookmarks_added: 2,
        notes_created: 1,
        courses_completed: 0,
        github_commits: 4,
        study_streak: 5,
        productivity_score: 78,
      },
      {
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        hours_tracked: 7.25,
        tasks_completed: 4,
        bookmarks_added: 3,
        notes_created: 2,
        courses_completed: 1,
        github_commits: 6,
        study_streak: 6,
        productivity_score: 84,
      },
      {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        hours_tracked: 6.75,
        tasks_completed: 5,
        bookmarks_added: 1,
        notes_created: 2,
        courses_completed: 0,
        github_commits: 5,
        study_streak: 7,
        productivity_score: 88,
      },
    ],
    productivity_metrics: [
      {
        period: 'current',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        total_hours: 62.5,
        billable_hours: 48,
        non_billable_hours: 14.5,
        tasks_completed: 28,
        average_task_time: 1.7,
        peak_productivity_hour: 10,
        focus_score: 81,
        efficiency_score: 86,
      },
    ],
    learning_analytics: [
      {
        id: 1,
        course: {
          title: 'SolidJS Advanced Patterns',
          description: 'Improve component architecture and performance',
        },
        start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        last_accessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        time_spent: 14.25,
        progress: 72,
        modules_completed: 9,
        total_modules: 12,
        average_score: 91,
        streak_days: 6,
        skills_acquired: ['SolidJS', 'State Management', 'Performance Tuning'],
      },
    ],
    github_analytics: [
      {
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        commits: 5,
        pull_requests: 1,
        issues_opened: 1,
        issues_closed: 2,
        reviews: 2,
        contributions: 11,
        languages: {
          TypeScript: 65,
          Go: 30,
          CSS: 5,
        },
        repositories: ['trackeep', 'solidjs-components'],
      },
    ],
    goals: [
      {
        id: 1,
        title: 'Ship messaging improvements',
        description: 'Complete remaining demo-mode wiring and QA',
        category: 'development',
        target_value: 10,
        current_value: 7,
        unit: 'tasks',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'in_progress',
        priority: 'high',
        progress: 70,
        is_completed: false,
        milestones: [
          {
            id: 1,
            title: 'Implement API handlers',
            target_value: 1,
            current_value: 1,
            deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            status: 'completed',
            is_completed: true,
          },
          {
            id: 2,
            title: 'Regression QA pass',
            target_value: 1,
            current_value: 0,
            deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            is_completed: false,
          },
        ],
      },
    ],
    habit_analytics: [
      {
        habit_name: 'Daily planning',
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_completed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        streak: 7,
        best_streak: 11,
        total_days: 30,
        completion_rate: 83,
        frequency: 'daily',
        category: 'productivity',
        goal_target: 30,
        goal_achieved: false,
      },
    ],
  };
};

const generateMockSavedSearches = () => [
  {
    id: 1,
    name: 'Urgent tasks',
    query: 'priority:high status:open',
    filters: { content_type: 'tasks', priority: ['high', 'urgent'] },
    alert: true,
    last_run: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    run_count: 12,
    is_public: false,
    description: 'Track high-priority open tasks',
    tags: [
      { id: 1, name: 'tasks', color: '#f59e0b' },
      { id: 2, name: 'priority', color: '#ef4444' },
    ],
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    name: 'API docs notes',
    query: 'api documentation',
    filters: { content_type: 'notes', tags: ['docs'] },
    alert: false,
    last_run: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    run_count: 6,
    is_public: true,
    description: 'Notes related to API and docs',
    tags: [{ id: 3, name: 'docs', color: '#3b82f6' }],
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const generateMockMessagesConversations = () => {
  const now = Date.now();
  const mkConversation = (id: number, type: 'global' | 'team' | 'group' | 'dm', name: string, topic: string, teamId?: number) => ({
    id,
    type,
    name,
    topic,
    team_id: teamId ?? null,
    created_by: 1,
    is_default: id === 1,
    is_archived: false,
    last_message_at: new Date(now - id * 12 * 60 * 1000).toISOString(),
    created_at: new Date(now - id * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(now - id * 10 * 60 * 1000).toISOString(),
  });

  const mkMessage = (id: number, conversationId: number, senderId: number, body: string) => ({
    id,
    conversation_id: conversationId,
    sender_id: senderId,
    sender: {
      id: senderId,
      username: senderId === 1 ? 'demo' : senderId === 2 ? 'alice' : 'bob',
      full_name: senderId === 1 ? 'Demo User' : senderId === 2 ? 'Alice Johnson' : 'Bob Smith',
    },
    body,
    is_sensitive: false,
    edited_at: null,
    deleted_at: null,
    metadata_json: '{}',
    created_at: new Date(now - id * 5 * 60 * 1000).toISOString(),
    updated_at: new Date(now - id * 5 * 60 * 1000).toISOString(),
    attachments: [],
    references: [],
    suggestions: [],
    reactions: [],
  });

  const general = mkConversation(1, 'global', 'General', 'Team-wide updates');
  const team = mkConversation(2, 'team', 'Engineering', 'Sprint and release discussion', 1);
  const dm = mkConversation(3, 'dm', 'Direct: Alice', 'One-on-one updates');

  return [
    {
      conversation: general,
      role: 'owner',
      unread_count: 0,
      last_message: mkMessage(101, general.id, 2, 'Deploy finished successfully.'),
    },
    {
      conversation: team,
      role: 'admin',
      unread_count: 2,
      last_message: mkMessage(102, team.id, 3, 'I pushed a fix for message search.'),
    },
    {
      conversation: dm,
      role: 'member',
      unread_count: 1,
      last_message: mkMessage(103, dm.id, 2, 'Can you review the latest PR?'),
    },
  ];
};

const generateMockMessagesForConversation = (conversationId: number) => {
  const now = Date.now();
  const mk = (id: number, senderId: number, minutesAgo: number, body: string) => ({
    id,
    conversation_id: conversationId,
    sender_id: senderId,
    sender: {
      id: senderId,
      username: senderId === 1 ? 'demo' : senderId === 2 ? 'alice' : 'bob',
      full_name: senderId === 1 ? 'Demo User' : senderId === 2 ? 'Alice Johnson' : 'Bob Smith',
    },
    body,
    is_sensitive: false,
    edited_at: null,
    deleted_at: null,
    metadata_json: '{}',
    created_at: new Date(now - minutesAgo * 60 * 1000).toISOString(),
    updated_at: new Date(now - minutesAgo * 60 * 1000).toISOString(),
    attachments: [],
    references: [],
    suggestions: [],
    reactions: [],
  });

  return [
    mk(conversationId * 1000 + 1, 2, 45, 'Morning standup complete.'),
    mk(conversationId * 1000 + 2, 1, 42, 'Great, I will update the board.'),
    mk(conversationId * 1000 + 3, 3, 20, 'Search indexing patch is merged.'),
  ];
};

const generateMockBrowserExtensionApiKeys = () => [
  {
    id: 1,
    name: 'Chrome Extension - Main',
    permissions: ['bookmarks:read', 'bookmarks:write', 'files:read'],
    is_active: true,
    last_used: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

const generateMockBrowserExtensions = () => [
  {
    id: 1,
    extension_id: 'trackeep-chrome-prod',
    name: 'Trackeep Chrome Extension',
    is_active: true,
    last_seen: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
];

// Store original fetch at module level
let originalFetch: typeof fetch | null = null;

// Request cache to prevent duplicate API calls
const requestCache = new Map<string, Promise<Response>>();
const CACHE_TTL = 2000; // 2 seconds

// Generate cache key for requests
const getCacheKey = (url: string, options?: RequestInit): string => {
  const method = options?.method || 'GET';
  const body = options?.body || '';
  return `${method}:${url}:${body}`;
};

const jsonResponse = (payload: unknown, status: number = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const parseBody = (options?: RequestInit): Record<string, any> => {
  if (!options?.body || typeof options.body !== 'string') {
    return {};
  }
  try {
    return JSON.parse(options.body);
  } catch {
    return {};
  }
};

// Demo mode fetch interceptor
export const demoFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const shouldUseReal = shouldUseRealAPIs();

  if (shouldUseReal) {
    if (url.includes('youtube') && Math.random() < 0.02) {
    }

    if (url.includes('youtube')) {
      const cacheKey = getCacheKey(url, options);
      const cachedRequest = requestCache.get(cacheKey);
      if (cachedRequest) {
        return cachedRequest;
      }

      const requestPromise = (originalFetch || window.fetch)(url, options);
      requestCache.set(cacheKey, requestPromise);
      setTimeout(() => {
        requestCache.delete(cacheKey);
      }, CACHE_TTL);
      return requestPromise;
    }

    return (originalFetch || window.fetch)(url, options);
  }

  if (!isDemoMode()) {
    return (originalFetch || window.fetch)(url, options);
  }

  let path = url;
  let searchParams = new URLSearchParams();
  try {
    const parsed = new URL(url, window.location.origin);
    path = parsed.pathname;
    searchParams = parsed.searchParams;
  } catch {
    // keep defaults
  }

  const method = (options?.method || 'GET').toUpperCase();
  const body = parseBody(options);
  await new Promise((resolve) => setTimeout(resolve, 180));

  // Auth endpoints
  if (path.includes('/api/v1/auth/login') || path.includes('/api/v1/auth/login-totp') || path.includes('/api/v1/auth/register')) {
    const user = {
      id: 1,
      email: 'demo@trackeep.com',
      username: 'demo',
      full_name: 'Demo User',
      theme: 'dark',
      github_id: 123456,
      created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    return jsonResponse({
      token: `demo-token-${Date.now()}`,
      user,
    });
  }

  if (path.includes('/api/v1/auth/check-users')) {
    return jsonResponse({ hasUsers: true });
  }

  if (path.includes('/api/v1/auth/logout')) {
    return jsonResponse({ message: 'Logged out (demo mode)' });
  }

  if (path.includes('/api/v1/auth/me')) {
    return jsonResponse({
      user: {
        id: 1,
        email: 'demo@trackeep.com',
        username: 'demo',
        full_name: 'Demo User',
        theme: 'dark',
        github_id: 123456,
      },
    });
  }

  if (path.includes('/api/v1/auth/profile') && method === 'PUT') {
    return jsonResponse({
      user: {
        id: 1,
        email: 'demo@trackeep.com',
        username: 'demo',
        full_name: typeof body.fullName === 'string' && body.fullName.trim() ? body.fullName.trim() : 'Demo User',
        theme: body.theme === 'light' ? 'light' : 'dark',
        updated_at: new Date().toISOString(),
      },
    });
  }

  if (path.includes('/api/v1/auth/password') && method === 'PUT') {
    return jsonResponse({ message: 'Password changed successfully (demo mode)' });
  }

  if (path.includes('/api/v1/auth/password-reset/confirm') && method === 'POST') {
    return jsonResponse({ message: 'Password reset successful (demo mode)' });
  }

  if (path.includes('/api/v1/auth/password-reset') && method === 'POST') {
    return jsonResponse({ message: 'Password reset code sent (demo mode)' });
  }

  if (path.includes('/api/v1/auth/ai/settings')) {
    if (method === 'GET') {
      return jsonResponse(generateMockAISettings());
    }
    if (method === 'PUT') {
      return jsonResponse(body);
    }
  }

  if (path.includes('/api/v1/auth/search/settings')) {
    if (method === 'GET') {
      return jsonResponse(generateMockSearchSettings());
    }
    if (method === 'PUT') {
      return jsonResponse(body);
    }
  }

  if (path.includes('/api/v1/auth/email/settings')) {
    if (method === 'GET') {
      return jsonResponse(generateMockEmailSettings());
    }
    if (method === 'PUT') {
      return jsonResponse({ ...generateMockEmailSettings(), ...body });
    }
  }

  if (path.includes('/api/v1/auth/email/test') && method === 'POST') {
    return jsonResponse({ message: 'Test email sent successfully (demo mode)' });
  }

  // Dashboard and analytics
  if (path.includes('/api/v1/dashboard/stats')) {
    return jsonResponse(generateMockStats());
  }

  if (path.includes('/api/v1/analytics/dashboard')) {
    const days = Number(searchParams.get('days') || '30');
    return jsonResponse(generateMockAnalyticsDashboard(days));
  }

  // AI endpoints
  if (path.includes('/api/v1/ai/providers') || path.includes('/api/ai/providers')) {
    return jsonResponse({ providers: generateMockAIProviders() });
  }

  if (path.includes('/api/v1/ai/chat') && method === 'POST') {
    const prompt = typeof body.message === 'string' ? body.message : '';
    return jsonResponse({
      response: `Demo AI response for: "${prompt || 'your message'}"`,
      content: `Demo AI response for: "${prompt || 'your message'}"`,
      provider: body.provider || 'longcat',
      model: body.model || 'LongCat-Flash-Chat',
    });
  }

  // Files endpoints
  if (path.includes('/api/v1/files/upload') && method === 'POST') {
    return jsonResponse({
      id: Date.now(),
      original_name: 'uploaded-file.txt',
      mime_type: 'text/plain',
      file_size: 2048,
      created_at: new Date().toISOString(),
      description: 'Uploaded from demo mode',
    }, 201);
  }

  if (/^\/api\/v1\/files\/\d+\/download$/.test(path)) {
    return jsonResponse({ url: '#', message: 'Demo download link generated' });
  }

  if (path.includes('/api/v1/files') && method === 'GET') {
    return jsonResponse(generateMockFiles());
  }

  // Team/member endpoints (specific before generic /teams)
  if (/^\/api\/v1\/teams\/\d+\/members\/\d+$/.test(path) && method === 'DELETE') {
    return jsonResponse({ message: 'Member removed successfully (demo mode)' });
  }

  if (/^\/api\/v1\/teams\/\d+\/invite$/.test(path) && method === 'POST') {
    return jsonResponse({ message: 'Invitation sent successfully (demo mode)' });
  }

  if (/^\/api\/v1\/teams\/\d+\/members$/.test(path) && method === 'GET') {
    return jsonResponse({ members: generateMockMembers() });
  }

  if (path.includes('/api/v1/members') && method === 'GET') {
    return jsonResponse({ members: generateMockMembersDirectory() });
  }

  if (path.includes('/api/v1/teams') && method === 'GET') {
    return jsonResponse({ teams: generateMockTeams() });
  }

  // GitHub endpoints
  if (path.includes('/api/v1/github/repos') && method === 'GET') {
    return jsonResponse({ repos: generateMockGitHubRepos() });
  }

  // Time entries
  if (path.includes('/api/v1/time-entries') && method === 'GET') {
    return jsonResponse({ time_entries: generateMockTimeEntries() });
  }

  if (path.includes('/api/v1/time-entries') && method === 'POST') {
    return jsonResponse({ ...body, id: Date.now() }, 201);
  }

  // Bookmarks/tasks/notes GET
  if (path.includes('/api/v1/bookmarks') && method === 'GET') {
    const { getMockBookmarks } = await import('./mockData');
    const mockBookmarks = getMockBookmarks().map((bookmark, index) => ({
      id: index + 1,
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description,
      tags: bookmark.tags,
      created_at: bookmark.createdAt,
      is_favorite: bookmark.tags.some((tag) => tag.name === 'important' || tag.name === 'favorite'),
      favicon: bookmark.favicon,
      screenshot: bookmark.screenshot,
      screenshot_medium: bookmark.screenshot,
    }));
    return jsonResponse(mockBookmarks);
  }

  if (path.includes('/api/v1/tasks') && method === 'GET') {
    const { getMockTasks } = await import('./mockData');
    const mockTasks = getMockTasks().map((task, index) => {
      const status = task.status === 'completed' ? 'completed' : 'pending';
      return {
        id: index + 1,
        title: task.title,
        description: task.description,
        completed: status === 'completed',
        status,
        priority: task.priority,
        createdAt: task.createdAt,
        created_at: task.createdAt,
        dueDate: task.dueDate,
        due_date: task.dueDate,
      };
    });
    return jsonResponse(mockTasks);
  }

  if (path.includes('/api/v1/notes') && method === 'GET') {
    const { getMockNotes } = await import('./mockData');
    const mockNotes = getMockNotes().map((note, index) => ({
      id: index + 1,
      title: note.title,
      content: note.content,
      tags: note.tags,
      created_at: note.createdAt,
      updated_at: note.updatedAt,
      pinned: note.tags.some((tag) => tag.name === 'pinned'),
      is_pinned: note.tags.some((tag) => tag.name === 'pinned'),
      attachments: note.attachments || [],
    }));
    return jsonResponse(mockNotes);
  }

  // Bookmark/task/note mutations
  if (path.includes('/api/v1/bookmarks') && method === 'POST') {
    return jsonResponse({
      id: Date.now(),
      title: body.title || 'Untitled bookmark',
      url: body.url || '',
      description: body.description || '',
      tags: body.tags || [],
      created_at: new Date().toISOString(),
      is_favorite: Boolean(body.is_favorite),
      favicon: body.favicon || '',
      screenshot: body.screenshot || '',
      screenshot_medium: body.screenshot_medium || '',
    }, 201);
  }

  if (path.includes('/api/v1/tasks') && method === 'POST') {
    const completed = Boolean(body.completed);
    return jsonResponse({
      id: Date.now(),
      title: body.title || 'Untitled task',
      description: body.description || '',
      completed,
      status: completed ? 'completed' : 'pending',
      priority: body.priority || 'medium',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      dueDate: body.dueDate || '',
      due_date: body.dueDate || '',
    }, 201);
  }

  if (path.includes('/api/v1/notes') && method === 'POST') {
    return jsonResponse({
      id: Date.now(),
      title: body.title || 'Untitled note',
      content: body.content || '',
      tags: body.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pinned: Boolean(body.pinned),
      is_pinned: Boolean(body.pinned),
      attachments: body.attachments || [],
    }, 201);
  }

  if (path.includes('/api/v1/bookmarks') && method === 'PUT') {
    const pathParts = path.split('/');
    const idFromPath = Number(pathParts[pathParts.length - 1] || 0);
    return jsonResponse({
      id: idFromPath || body.id || Date.now(),
      title: body.title || 'Untitled bookmark',
      url: body.url || '',
      description: body.description || '',
      tags: body.tags || [],
      created_at: body.created_at || new Date().toISOString(),
      is_favorite: Boolean(body.is_favorite),
      favicon: body.favicon || '',
      screenshot: body.screenshot || '',
      screenshot_medium: body.screenshot_medium || '',
    });
  }

  if (path.includes('/api/v1/tasks') && method === 'PUT') {
    const pathParts = path.split('/');
    const idFromPath = Number(pathParts[pathParts.length - 1] || 0);
    const completed = Boolean(body.completed);
    return jsonResponse({
      id: idFromPath || body.id || Date.now(),
      title: body.title || 'Untitled task',
      description: body.description || '',
      completed,
      status: completed ? 'completed' : 'pending',
      priority: body.priority || 'medium',
      createdAt: body.createdAt || new Date().toISOString(),
      dueDate: body.dueDate || '',
      due_date: body.dueDate || '',
    });
  }

  if (path.includes('/api/v1/notes/') && path.endsWith('/pin') && method === 'PUT') {
    const parts = path.split('/');
    const noteId = Number(parts[parts.length - 2] || 0);
    return jsonResponse({
      id: noteId,
      pinned: Boolean(body.pinned),
      is_pinned: Boolean(body.pinned),
      updated_at: new Date().toISOString(),
    });
  }

  if (path.includes('/api/v1/notes') && method === 'PUT') {
    const pathParts = path.split('/');
    const idFromPath = Number(pathParts[pathParts.length - 1] || 0);
    return jsonResponse({
      id: idFromPath || body.id || Date.now(),
      title: body.title || 'Untitled note',
      content: body.content || '',
      tags: body.tags || [],
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pinned: Boolean(body.pinned),
      is_pinned: Boolean(body.pinned),
      attachments: body.attachments || [],
    });
  }

  if (path.includes('/api/v1/bookmarks') && method === 'DELETE') {
    return jsonResponse({ message: 'Bookmark deleted (demo mode)' });
  }
  if (path.includes('/api/v1/tasks') && method === 'DELETE') {
    return jsonResponse({ message: 'Task deleted (demo mode)' });
  }
  if (path.includes('/api/v1/notes') && method === 'DELETE') {
    return jsonResponse({ message: 'Note deleted (demo mode)' });
  }

  // YouTube/video endpoints
  if (path.includes('/api/v1/video-bookmarks')) {
    if (method === 'GET') {
      return jsonResponse({ bookmarks: generateMockVideoBookmarks() });
    }
    if (method === 'POST') {
      return jsonResponse({ id: Date.now(), message: 'Bookmark created successfully (demo mode)' }, 201);
    }
  }

  if (path.includes('/api/v1/youtube/videos') && method === 'GET') {
    return jsonResponse(generateMockVideoBookmarks());
  }

  if (path.includes('/api/v1/youtube/search')) {
    const { getMockVideos } = await import('./mockData');
    const query = String(body.query || '').toLowerCase();
    const mockVideos = getMockVideos()
      .filter((video) =>
        video.title.toLowerCase().includes(query) ||
        video.description.toLowerCase().includes(query) ||
        video.channel.toLowerCase().includes(query)
      )
      .slice(0, 10)
      .map((video) => ({
        id: video.id,
        title: video.title,
        channel_title: video.channel,
        duration: video.duration,
        published_at: video.publishedAt,
        view_count: Math.floor(Math.random() * 100000) + 1000,
      }));
    return jsonResponse({ videos: mockVideos });
  }

  if (path.includes('/api/v1/youtube/channel-videos')) {
    const { getMockVideos } = await import('./mockData');
    const mockVideos = getMockVideos().slice(0, 5).map((video) => ({
      video_id: video.id,
      title: video.title,
      channel: video.channel,
      length: video.duration,
      views: Math.floor(Math.random() * 100000) + 1000,
      published_date: video.publishedAt,
      published_text: new Date(video.publishedAt).toLocaleDateString(),
    }));
    return jsonResponse({ videos: mockVideos });
  }

  if (path.includes('/api/v1/youtube/video-details')) {
    return jsonResponse(generateMockVideoBookmarks()[0]);
  }

  if (path.includes('/api/v1/youtube/predefined-channels')) {
    return jsonResponse(generateMockVideoBookmarks());
  }

  // Learning paths
  if (path.includes('/api/v1/learning-paths/categories')) {
    return jsonResponse(['frontend', 'backend', 'fullstack', 'devops', 'mobile', 'design']);
  }

  if (path.includes('/api/v1/learning-paths')) {
    return jsonResponse(generateMockLearningPaths());
  }

  // Chat endpoints
  const chatMessagesMatch = path.match(/^\/api\/v1\/chat\/sessions\/(\d+)\/messages$/);
  if (chatMessagesMatch && method === 'GET') {
    const sessionId = Number(chatMessagesMatch[1]);
    return jsonResponse(generateMockChatMessages(sessionId));
  }

  const chatSessionDeleteMatch = path.match(/^\/api\/v1\/chat\/sessions\/(\d+)$/);
  if (chatSessionDeleteMatch && method === 'DELETE') {
    return jsonResponse({ message: 'Session deleted (demo mode)' });
  }

  if (path === '/api/v1/chat/sessions' && method === 'GET') {
    return jsonResponse(generateMockChatSessionsExtended());
  }

  if (path === '/api/v1/chat/send' && method === 'POST') {
    const sessionId = Number(body.session_id || generateMockChatSessionsExtended()[0].id);
    return jsonResponse({
      session_id: sessionId,
      message: `Demo assistant reply to: ${body.message || 'your prompt'}`,
      timestamp: new Date().toISOString(),
    });
  }

  // Messages module endpoints
  if (path.startsWith('/api/v1/messages')) {
    const conversations = generateMockMessagesConversations();
    const defaultConversation = conversations[0];

    if (path === '/api/v1/messages/conversations' && method === 'GET') {
      return jsonResponse({ conversations });
    }

    if (path === '/api/v1/messages/conversations' && method === 'POST') {
      const type = typeof body.type === 'string' ? body.type : 'group';
      const conversation = {
        id: Date.now(),
        type,
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'New conversation',
        topic: typeof body.topic === 'string' ? body.topic : '',
        team_id: Number(body.team_id || 0) || null,
        created_by: 1,
        is_default: false,
        is_archived: false,
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return jsonResponse({ conversation }, 201);
    }

    const conversationDetailMatch = path.match(/^\/api\/v1\/messages\/conversations\/(\d+)$/);
    if (conversationDetailMatch && method === 'GET') {
      const conversationId = Number(conversationDetailMatch[1]);
      const found = conversations.find((entry) => entry.conversation.id === conversationId)?.conversation || defaultConversation.conversation;
      const members = generateMockMembers().map((member, index) => ({
        id: index + 1,
        conversation_id: conversationId,
        user_id: Number(member.user?.id || member.user_id || index + 1),
        role: member.role,
        joined_at: member.joined_at,
        last_read_message_id: null,
        last_read_at: null,
        muted_until: null,
        is_hidden: false,
        user: {
          id: Number(member.user?.id || member.user_id || index + 1),
          username: member.user?.username || `member-${index + 1}`,
          full_name: member.user?.full_name || member.user?.username || 'Member',
          avatar_url: '',
        },
      }));
      return jsonResponse({
        conversation: found,
        membership: members.find((member) => member.user_id === 1) || members[0],
        members,
      });
    }

    const conversationMessagesMatch = path.match(/^\/api\/v1\/messages\/conversations\/(\d+)\/messages$/);
    if (conversationMessagesMatch && method === 'GET') {
      const conversationId = Number(conversationMessagesMatch[1]);
      return jsonResponse({
        messages: generateMockMessagesForConversation(conversationId),
        next_cursor: null,
      });
    }

    if (conversationMessagesMatch && method === 'POST') {
      const conversationId = Number(conversationMessagesMatch[1]);
      const newMessage = {
        id: Date.now(),
        conversation_id: conversationId,
        sender_id: 1,
        sender: {
          id: 1,
          username: 'demo',
          full_name: 'Demo User',
          avatar_url: '',
        },
        body: typeof body.body === 'string' ? body.body : '',
        is_sensitive: false,
        edited_at: null,
        deleted_at: null,
        metadata_json: JSON.stringify(body.metadata || {}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attachments: Array.isArray(body.attachments) ? body.attachments : [],
        references: Array.isArray(body.references) ? body.references : [],
        suggestions: [],
        reactions: [],
      };
      return jsonResponse({ message: newMessage }, 201);
    }

    const messageMutationMatch = path.match(/^\/api\/v1\/messages\/messages\/(\d+)$/);
    if (messageMutationMatch && method === 'PATCH') {
      const messageId = Number(messageMutationMatch[1]);
      return jsonResponse({
        message: {
          id: messageId,
          conversation_id: 1,
          sender_id: 1,
          body: typeof body.body === 'string' ? body.body : '',
          is_sensitive: false,
          edited_at: new Date().toISOString(),
          deleted_at: null,
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }

    if (messageMutationMatch && method === 'DELETE') {
      return jsonResponse({ message: 'Message deleted (demo mode)' });
    }

    const reactionAddMatch = path.match(/^\/api\/v1\/messages\/messages\/(\d+)\/reactions$/);
    if (reactionAddMatch && method === 'POST') {
      return jsonResponse({
        reaction: {
          id: Date.now(),
          message_id: Number(reactionAddMatch[1]),
          user_id: 1,
          emoji: body.emoji || ':+1:',
        },
      }, 201);
    }

    const reactionDeleteMatch = path.match(/^\/api\/v1\/messages\/messages\/(\d+)\/reactions\/(.+)$/);
    if (reactionDeleteMatch && method === 'DELETE') {
      return jsonResponse({ message: 'Reaction removed (demo mode)' });
    }

    if (path === '/api/v1/messages/messages/search' && method === 'POST') {
      const query = typeof body.query === 'string' ? body.query : '';
      const results = generateMockMessagesForConversation(1).filter((message) =>
        query ? message.body.toLowerCase().includes(query.toLowerCase()) : true
      );
      return jsonResponse({
        results,
        total: results.length,
        limit: Number(body.limit || 50),
        offset: Number(body.offset || 0),
      });
    }

    const suggestionsMatch = path.match(/^\/api\/v1\/messages\/messages\/(\d+)\/suggestions$/);
    if (suggestionsMatch && method === 'GET') {
      const messageId = Number(suggestionsMatch[1]);
      return jsonResponse({
        suggestions: [
          {
            id: 1,
            message_id: messageId,
            type: 'summarize',
            payload_json: JSON.stringify({ summary: 'Condense this message to key bullets.' }),
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });
    }

    const suggestionActionMatch = path.match(/^\/api\/v1\/messages\/messages\/(\d+)\/suggestions\/(\d+)\/(accept|dismiss)$/);
    if (suggestionActionMatch && method === 'POST') {
      return jsonResponse({ message: 'Suggestion updated (demo mode)' });
    }

    const revealSensitiveMatch = path.match(/^\/api\/v1\/messages\/messages\/(\d+)\/reveal-sensitive$/);
    if (revealSensitiveMatch && method === 'POST') {
      const messageId = Number(revealSensitiveMatch[1]);
      return jsonResponse({
        message_id: messageId,
        plaintext: 'demo-sensitive-content',
      });
    }

    if (path === '/api/v1/messages/password-vault/items' && method === 'GET') {
      return jsonResponse({
        items: [
          {
            id: 1,
            label: 'Demo Database Password',
            owner_user_id: 1,
            source_message_id: 1001,
            last_accessed_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            shared: true,
            allow_reveal: true,
            expires_at: null,
            target_conversation_id: 1,
          },
        ],
      });
    }

    if (path === '/api/v1/messages/password-vault/items' && method === 'POST') {
      return jsonResponse({
        item: {
          id: Date.now(),
          ...body,
          owner_user_id: 1,
          shared: false,
          allow_reveal: true,
        },
      }, 201);
    }

    const vaultRevealMatch = path.match(/^\/api\/v1\/messages\/password-vault\/items\/(\d+)\/reveal$/);
    if (vaultRevealMatch && method === 'POST') {
      return jsonResponse({
        id: Number(vaultRevealMatch[1]),
        label: 'Demo Secret',
        secret: 'demo-secret-value',
        notes: 'Demo reveal payload',
      });
    }

    const vaultShareMatch = path.match(/^\/api\/v1\/messages\/password-vault\/items\/(\d+)\/share$/);
    if (vaultShareMatch && method === 'POST') {
      return jsonResponse({ message: 'Vault item shared (demo mode)' });
    }

    const vaultUnshareMatch = path.match(/^\/api\/v1\/messages\/password-vault\/items\/(\d+)\/unshare$/);
    if (vaultUnshareMatch && method === 'POST') {
      return jsonResponse({ message: 'Vault item unshared (demo mode)' });
    }
  }

  // Browser extension endpoints
  if (path === '/api/v1/browser-extension/validate' && method === 'GET') {
    return jsonResponse({
      valid: true,
      permissions: ['bookmarks:read', 'bookmarks:write', 'files:read'],
      user: { id: 1, username: 'demo' },
    });
  }

  if (path === '/api/v1/browser-extension/api-keys' && method === 'GET') {
    return jsonResponse(generateMockBrowserExtensionApiKeys());
  }

  if (path === '/api/v1/browser-extension/extensions' && method === 'GET') {
    return jsonResponse(generateMockBrowserExtensions());
  }

  if (path === '/api/v1/browser-extension/api-keys/generate' && method === 'POST') {
    return jsonResponse({
      id: Date.now(),
      name: body.name || 'New API Key',
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
      is_active: true,
      key: `tk_demo_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, 201);
  }

  if (/^\/api\/v1\/browser-extension\/api-keys\/\d+$/.test(path) && method === 'DELETE') {
    return jsonResponse({ message: 'API key revoked successfully (demo mode)' });
  }

  if (/^\/api\/v1\/browser-extension\/extensions\/[^/]+$/.test(path) && method === 'DELETE') {
    return jsonResponse({ message: 'Extension revoked successfully (demo mode)' });
  }

  // Search endpoints
  if (path.includes('/api/v1/search/semantic') && method === 'POST') {
    const query = typeof body.query === 'string' ? body.query : '';
    const results = [
      {
        id: 1,
        type: 'note',
        title: `Semantic result for "${query || 'query'}"`,
        description: 'Demo semantic search match from notes',
        content: 'This is a semantic match generated for demo mode.',
        tags: [{ id: 1, name: 'semantic', color: '#3b82f6' }],
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        score: 0.92,
        similarity: 0.92,
      },
      {
        id: 2,
        type: 'bookmark',
        title: `Related bookmark: ${query || 'topic'}`,
        description: 'Demo semantic match from bookmarks',
        content: 'Bookmark content excerpt for semantic demo.',
        tags: [{ id: 2, name: 'bookmark', color: '#10b981' }],
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        url: 'https://example.com',
        score: 0.84,
        similarity: 0.84,
      },
    ];
    return jsonResponse({
      results,
      took: 42,
    });
  }

  if (path.includes('/api/v1/search/enhanced') && method === 'POST') {
    const query = typeof body.query === 'string' ? body.query : '';
    const filters = typeof body === 'object' && body ? body : {};
    const results = [
      {
        id: 101,
        type: 'task',
        title: `Task match for "${query || 'query'}"`,
        description: 'Demo enhanced search task result',
        content: 'Follow up on API integration tests.',
        tags: [{ id: 11, name: 'task', color: '#f59e0b' }],
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        status: 'pending',
        priority: 'high',
        score: 0.88,
      },
      {
        id: 102,
        type: 'note',
        title: `Note match for "${query || 'query'}"`,
        description: 'Demo enhanced search note result',
        content: 'Implementation notes for demo-mode endpoint wiring.',
        tags: [{ id: 12, name: 'notes', color: '#8b5cf6' }],
        created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        score: 0.81,
      },
    ];
    return jsonResponse({
      results,
      total: results.length,
      query,
      filters,
      took: 37,
      suggestions: query ? [`${query} settings`, `${query} notes`] : [],
      aggregations: {
        tasks: 1,
        notes: 1,
      },
    });
  }

  if (path === '/api/v1/search/saved/tags' && method === 'GET') {
    return jsonResponse({
      tags: [
        { id: 1, name: 'tasks', color: '#f59e0b' },
        { id: 2, name: 'docs', color: '#3b82f6' },
      ],
    });
  }

  if (/^\/api\/v1\/search\/saved\/\d+\/run$/.test(path) && method === 'POST') {
    return jsonResponse({
      results: [
        {
          id: 1,
          type: 'task',
          title: 'Demo saved search result',
          description: 'Result returned by demo saved-search run endpoint',
          content: 'Saved search execution result',
          tags: [{ id: 1, name: 'saved', color: '#10b981' }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          score: 0.8,
        },
      ],
      total: 1,
      took: 28,
    });
  }

  if (path === '/api/v1/search/saved' && method === 'GET') {
    return jsonResponse({ saved_searches: generateMockSavedSearches() });
  }

  if (path === '/api/v1/search/saved' && method === 'POST') {
    return jsonResponse({
      saved_search: {
        id: Date.now(),
        ...body,
        run_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }, 201);
  }

  if (/^\/api\/v1\/search\/saved\/\d+$/.test(path) && method === 'PUT') {
    return jsonResponse({
      saved_search: {
        ...body,
        updated_at: new Date().toISOString(),
      },
    });
  }

  if (/^\/api\/v1\/search\/saved\/\d+$/.test(path) && method === 'DELETE') {
    return jsonResponse({ message: 'Saved search deleted (demo mode)' });
  }

  // Search web/news endpoints
  if (path.includes('/api/v1/search/web') || path.includes('/res/v1/web/search')) {
    const queryParam = (searchParams.get('q') || body.query || '').trim();
    if (!queryParam) {
      return jsonResponse({ error: 'Query parameter required' }, 400);
    }
    const mockSearchResults = [
      {
        title: `${queryParam} - Demo Search Result 1`,
        url: `https://demo.example.com/${queryParam.toLowerCase().replace(/\s+/g, '-')}`,
        description: `This is a demo search result for "${queryParam}" showing how the search functionality works in demo mode.`,
        published_date: new Date().toISOString().split('T')[0],
        language: 'English',
        family_friendly: true,
        type: 'web',
        subtype: 'search',
      },
      {
        title: `${queryParam} - Demo Search Result 2`,
        url: `https://demo-search.com/${queryParam.toLowerCase().replace(/\s+/g, '-')}`,
        description: `Another demo search result for "${queryParam}" demonstrating the search interface in demo mode.`,
        published_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        language: 'English',
        family_friendly: true,
        type: 'web',
        subtype: 'search',
      },
      {
        title: `Learn more about ${queryParam}`,
        url: `https://demo-learning.com/${queryParam.toLowerCase().replace(/\s+/g, '-')}`,
        description: `Educational content about ${queryParam} for demo purposes. This shows how search results can include learning resources.`,
        published_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        language: 'English',
        family_friendly: true,
        type: 'web',
        subtype: 'educational',
      },
    ];
    return jsonResponse({
      results: mockSearchResults,
      web: { results: mockSearchResults },
      query: { original: queryParam, display: queryParam },
      mixed: { results: mockSearchResults },
    });
  }

  if (path.includes('/api/v1/search/news') || path.includes('/res/v1/news/search')) {
    const queryParam = (searchParams.get('q') || body.query || '').trim();
    if (!queryParam) {
      return jsonResponse({ error: 'Query parameter required' }, 400);
    }
    const mockNewsResults = [
      {
        title: `Breaking News: ${queryParam} Update`,
        url: `https://demo-news.com/${queryParam.toLowerCase().replace(/\s+/g, '-')}`,
        description: `Latest news about ${queryParam} - this is a demo news search result showing how news search works in demo mode.`,
        published_date: new Date().toISOString().split('T')[0],
        language: 'English',
        family_friendly: true,
        type: 'news',
        subtype: 'article',
      },
      {
        title: `${queryParam} - Industry Report`,
        url: `https://demo-industry.com/${queryParam.toLowerCase().replace(/\s+/g, '-')}`,
        description: `Industry analysis and reports about ${queryParam}. This demo result shows how news search can include industry content.`,
        published_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        language: 'English',
        family_friendly: true,
        type: 'news',
        subtype: 'report',
      },
    ];
    return jsonResponse({
      results: mockNewsResults,
      news: { results: mockNewsResults },
      query: { original: queryParam, display: queryParam },
      mixed: { results: mockNewsResults },
    });
  }

  // Removed items / trash
  if (path.includes('/api/v1/trash') || path.includes('/api/v1/removed-items') || path === '/trash') {
    return jsonResponse(generateMockRemovedItems());
  }

  // Update checking endpoints
  if (path.includes('/api/updates/check')) {
    return jsonResponse({
      updateAvailable: false,
      currentVersion: '1.0.0-demo',
      latestVersion: '1.0.0-demo',
    });
  }

  if (path.includes('/api/updates/progress')) {
    return jsonResponse({
      progress: 0,
      downloading: false,
      installing: false,
      completed: false,
      error: null,
    });
  }

  return jsonResponse(
    {
      error: `No demo handler for ${method} ${path}`,
    },
    404
  );
};

// Override global fetch for demo mode
export const initializeDemoMode = () => {
  if (isDemoMode()) {
    // Store original fetch to use for real API calls and restore later if needed
    originalFetch = window.fetch;
    window.fetch = demoFetch as typeof fetch;
    return originalFetch;
  }
  return null;
};
