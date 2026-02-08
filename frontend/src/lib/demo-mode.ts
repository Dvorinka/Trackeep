// Demo mode API interceptor to provide mock data instead of making real API calls

// Check if demo mode is enabled via environment variable
export const isEnvDemoMode = (): boolean => {
  const result = import.meta.env.VITE_DEMO_MODE === 'true';
  console.log('[Demo Mode] isEnvDemoMode:', result, 'VITE_DEMO_MODE:', import.meta.env.VITE_DEMO_MODE);
  return result;
};

// Check if demo mode is active (environment variable only)
export const isDemoMode = (): boolean => {
  // Only check environment variable - no localStorage persistence
  return isEnvDemoMode();
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
  ]
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
    html_url: 'https://github.com/tdvorak/trackeep'
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
    html_url: 'https://github.com/tdvorak/solidjs-components'
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

const generateMockYouTubeVideos = () => [
  {
    id: 1,
    video_id: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    description: 'Classic music video',
    channel_name: 'Rick Astley',
    thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    duration: '3:33',
    published_at: '2009-10-25T06:57:33Z',
    created_at: new Date().toISOString()
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

// Demo mode fetch interceptor
export const demoFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  if (!isDemoMode()) {
    return fetch(url, options);
  }

  // Parse URL to determine which mock data to return
  let path: string;
  try {
    // Handle relative URLs by providing a base URL
    const urlObj = new URL(url, window.location.origin);
    path = urlObj.pathname;
  } catch (error) {
    // If URL construction fails, treat the url as the path directly
    path = url;
    console.warn('[Demo Mode] URL construction failed, using url as path:', url);
  }

  console.log(`[Demo Mode] Intercepting request to: ${path}`);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Return mock data based on the endpoint
  if (path.includes('/api/v1/auth/login') || path.includes('/api/v1/auth/login-totp')) {
    // Handle demo login
    return new Response(JSON.stringify({
      token: 'demo-token-' + Date.now(),
      user: {
        id: 1,
        email: 'demo@trackeep.com',
        username: 'demo',
        full_name: 'Demo User',
        theme: 'dark',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.includes('/api/v1/dashboard/stats')) {
    return new Response(JSON.stringify(generateMockStats()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.includes('/api/v1/tasks') && (!options?.method || options.method === 'GET')) {
    const { getMockTasks } = await import('./mockData');
    const mockTasks = getMockTasks().map((task, index) => ({
      id: index + 1,
      title: task.title,
      description: task.description,
      completed: task.status === 'completed',
      priority: task.priority,
      createdAt: task.createdAt,
      dueDate: task.dueDate,
    }));

    return new Response(JSON.stringify(mockTasks), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.includes('/api/v1/github/repos')) {
    return new Response(JSON.stringify(generateMockGitHubRepos()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.includes('/api/v1/time-entries')) {
    return new Response(JSON.stringify(generateMockTimeEntries()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.includes('/api/v1/video-bookmarks')) {
    if (options?.method === 'GET') {
      // Return empty bookmarks for demo
      return new Response(JSON.stringify({ bookmarks: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (options?.method === 'POST') {
      // Simulate creating a bookmark
      return new Response(JSON.stringify({ 
        id: Date.now(),
        message: 'Bookmark created successfully (demo mode)'
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (path.includes('/api/v1/youtube/search')) {
    const { getMockVideos } = await import('./mockData');
    const body = options?.body && typeof options.body === 'string' ? JSON.parse(options.body) : {};
    const query = body.query || '';
    
    const mockVideos = getMockVideos().filter(video => 
      video.title.toLowerCase().includes(query.toLowerCase()) ||
      video.description.toLowerCase().includes(query.toLowerCase()) ||
      video.channel.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10).map((video) => ({
      id: video.id,
      title: video.title,
      channel_title: video.channel,
      duration: video.duration,
      published_at: video.publishedAt,
      view_count: Math.floor(Math.random() * 100000) + 1000
    }));
    
    return new Response(JSON.stringify({ videos: mockVideos }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
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
      published_text: new Date(video.publishedAt).toLocaleDateString()
    }));
    
    return new Response(JSON.stringify({ videos: mockVideos }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.includes('/api/v1/youtube/video-details')) {
    return new Response(JSON.stringify(generateMockYouTubeVideos()[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.includes('/api/v1/youtube/predefined-channels')) {
    return new Response(JSON.stringify(generateMockYouTubeVideos()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.includes('/api/v1/learning-paths/categories')) {
    return new Response(JSON.stringify(['frontend', 'backend', 'fullstack', 'devops', 'mobile', 'design']), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.includes('/api/v1/learning-paths')) {
    return new Response(JSON.stringify(generateMockLearningPaths()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.includes('/api/v1/chat/sessions')) {
    return new Response(JSON.stringify(generateMockChatSessions()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.includes('/api/ai/providers')) {
    return new Response(JSON.stringify(generateMockAIProviders()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Handle update checking endpoints
  if (path.includes('/api/updates/check')) {
    return new Response(JSON.stringify({
      updateAvailable: false,
      currentVersion: '1.0.0-demo',
      latestVersion: '1.0.0-demo'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.includes('/api/updates/progress')) {
    return new Response(JSON.stringify({
      progress: 0,
      downloading: false,
      installing: false,
      completed: false,
      error: null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // For POST requests that create data
  if (options?.method === 'POST') {
    if (path.includes('/api/v1/time-entries')) {
      const newEntry = { ...JSON.parse(options.body as string), id: Date.now() };
      return new Response(JSON.stringify(newEntry), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path.includes('/api/v1/tasks')) {
      const body = options.body ? JSON.parse(options.body as string) : {};
      const newTask = {
        id: Date.now(),
        title: body.title || 'Untitled task',
        description: body.description || '',
        completed: body.completed ?? false,
        priority: body.priority || 'medium',
        createdAt: body.createdAt || new Date().toISOString(),
        dueDate: body.dueDate || '',
      };

      return new Response(JSON.stringify(newTask), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

   if (options?.method === 'PUT' && path.includes('/api/v1/tasks')) {
    const body = options.body ? JSON.parse(options.body as string) : {};
    const pathParts = path.split('/');
    const idFromPath = parseInt(pathParts[pathParts.length - 1] || '0', 10);
    const updatedTask = {
      id: idFromPath || body.id || Date.now(),
      title: body.title || 'Untitled task',
      description: body.description || '',
      completed: body.completed ?? false,
      priority: body.priority || 'medium',
      createdAt: body.createdAt || new Date().toISOString(),
      dueDate: body.dueDate || '',
    };

    return new Response(JSON.stringify(updatedTask), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (options?.method === 'DELETE' && path.includes('/api/v1/tasks')) {
    return new Response(JSON.stringify({ message: 'Task deleted (demo mode)' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Handle search API endpoints
  if (path.includes('/api/v1/search/web') || path.includes('/res/v1/web/search')) {
    let queryParam: string;
    try {
      const urlObj = new URL(url, window.location.origin);
      queryParam = urlObj.searchParams.get('q') || 
                    (options?.body && typeof options.body === 'string' ? JSON.parse(options.body).query : '');
    } catch {
      queryParam = (options?.body && typeof options.body === 'string' ? JSON.parse(options.body).query : '');
    }
    
    if (!queryParam) {
      return new Response(JSON.stringify({ error: 'Query parameter required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
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
        subtype: 'search'
      },
      {
        title: `${queryParam} - Demo Search Result 2`,
        url: `https://demo-search.com/${queryParam.toLowerCase().replace(/\s+/g, '-')}`,
        description: `Another demo search result for "${queryParam}" demonstrating the search interface in demo mode.`,
        published_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        language: 'English',
        family_friendly: true,
        type: 'web',
        subtype: 'search'
      },
      {
        title: `Learn more about ${queryParam}`,
        url: `https://demo-learning.com/${queryParam.toLowerCase().replace(/\s+/g, '-')}`,
        description: `Educational content about ${queryParam} for demo purposes. This shows how search results can include learning resources.`,
        published_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        language: 'English',
        family_friendly: true,
        type: 'web',
        subtype: 'educational'
      }
    ];

    return new Response(JSON.stringify({
      web: { results: mockSearchResults },
      query: { original: queryParam, display: queryParam },
      mixed: { results: mockSearchResults }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (path.includes('/api/v1/search/news') || path.includes('/res/v1/news/search')) {
    let queryParam: string;
    try {
      const urlObj = new URL(url, window.location.origin);
      queryParam = urlObj.searchParams.get('q') || 
                    (options?.body && typeof options.body === 'string' ? JSON.parse(options.body).query : '');
    } catch {
      queryParam = (options?.body && typeof options.body === 'string' ? JSON.parse(options.body).query : '');
    }
    
    if (!queryParam) {
      return new Response(JSON.stringify({ error: 'Query parameter required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
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
        subtype: 'article'
      },
      {
        title: `${queryParam} - Industry Report`,
        url: `https://demo-industry.com/${queryParam.toLowerCase().replace(/\s+/g, '-')}`,
        description: `Industry analysis and reports about ${queryParam}. This demo result shows how news search can include industry content.`,
        published_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        language: 'English',
        family_friendly: true,
        type: 'news',
        subtype: 'report'
      }
    ];

    return new Response(JSON.stringify({
      news: { results: mockNewsResults },
      query: { original: queryParam, display: queryParam },
      mixed: { results: mockNewsResults }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Default fallback - return a successful empty response
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

// Override global fetch for demo mode
export const initializeDemoMode = () => {
  if (isDemoMode()) {
    // Store original fetch to restore later if needed
    const originalFetch = window.fetch;
    window.fetch = demoFetch as typeof fetch;
    console.log('[Demo Mode] API interceptor initialized');
    return originalFetch;
  }
  return null;
};
