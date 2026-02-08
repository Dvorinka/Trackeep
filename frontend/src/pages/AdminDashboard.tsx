import { createSignal, onMount } from 'solid-js';
import { 
  IconUsers, 
  IconFileText, 
  IconBookmark, 
  IconFolder,
  IconTrendingUp,
  IconActivity,
  IconDatabase,
  IconPalette,
  IconSettings,
  IconUpload,
  IconEdit,
  IconGitBranch,
  IconClock,
  IconChecklist
} from '@tabler/icons-solidjs';
import { ColorSwitcher } from './ColorSwitcher';

interface ProjectStats {
  totalUsers: number;
  totalDocuments: number;
  totalBookmarks: number;
  totalTasks: number;
  totalNotes: number;
  totalStorage: string;
  activeUsers: number;
  systemUptime: string;
  apiCallsToday: number;
  databaseSize: string;
  serverLoad: number;
  lastBackup: string;
}

interface SystemActivity {
  id: string;
  type: 'user_login' | 'file_upload' | 'bookmark_created' | 'task_completed' | 'system_backup';
  description: string;
  timestamp: string;
  user?: string;
}

interface GitHubActivity {
  id: string;
  repo: string;
  commit: string;
  author: string;
  message: string;
  timestamp: string;
  type: 'commit' | 'pull_request' | 'merge';
}

export const AdminDashboard = () => {
  const [stats, setStats] = createSignal<ProjectStats>({
    totalUsers: 0,
    totalDocuments: 0,
    totalBookmarks: 0,
    totalTasks: 0,
    totalNotes: 0,
    totalStorage: '0 MB',
    activeUsers: 0,
    systemUptime: '0 days',
    apiCallsToday: 0,
    databaseSize: '0 MB',
    serverLoad: 0,
    lastBackup: 'Never'
  });
  const [systemActivities, setSystemActivities] = createSignal<SystemActivity[]>([]);
  const [githubActivities, setGithubActivities] = createSignal<GitHubActivity[]>([]);
  const [, setIsLoading] = createSignal(true);

  onMount(() => {
    // Mock admin stats data
    setStats({
      totalUsers: 156,
      totalDocuments: 1247,
      totalBookmarks: 892,
      totalTasks: 456,
      totalNotes: 623,
      totalStorage: '2.4 GB',
      activeUsers: 23,
      systemUptime: '45 days',
      apiCallsToday: 12456,
      databaseSize: '847 MB',
      serverLoad: 35,
      lastBackup: '2024-01-15 02:30:00'
    });

    // Mock system activities
    setSystemActivities([
      {
        id: '1',
        type: 'user_login',
        description: 'Admin user logged in',
        timestamp: '2 minutes ago',
        user: 'admin@trackeep.com'
      },
      {
        id: '2',
        type: 'file_upload',
        description: 'User uploaded 3 documents',
        timestamp: '15 minutes ago',
        user: 'john.doe@example.com'
      },
      {
        id: '3',
        type: 'bookmark_created',
        description: 'New bookmark added to collection',
        timestamp: '1 hour ago',
        user: 'jane.smith@example.com'
      },
      {
        id: '4',
        type: 'system_backup',
        description: 'Automated backup completed successfully',
        timestamp: '2 hours ago'
      },
      {
        id: '5',
        type: 'task_completed',
        description: 'Project milestone completed',
        timestamp: '3 hours ago',
        user: 'mike.wilson@example.com'
      }
    ]);

    // Mock GitHub activities
    setGithubActivities([
      {
        id: '1',
        repo: 'trackeep/frontend',
        commit: 'a1b2c3d',
        author: 'John Doe',
        message: 'Add pagination functionality to dashboard',
        timestamp: '30 minutes ago',
        type: 'commit'
      },
      {
        id: '2',
        repo: 'trackeep/backend',
        commit: 'e4f5g6h',
        author: 'Jane Smith',
        message: 'Fix authentication middleware bug',
        timestamp: '2 hours ago',
        type: 'commit'
      },
      {
        id: '3',
        repo: 'trackeep/docs',
        commit: 'i7j8k9l',
        author: 'Mike Wilson',
        message: 'Update API documentation',
        timestamp: '4 hours ago',
        type: 'merge'
      }
    ]);

    setIsLoading(false);
  });

  const handleBackupDatabase = async () => {
    try {
      alert('Database backup initiated successfully!');
      // In real app, this would call the backup API
    } catch (error) {
      alert('Failed to backup database');
    }
  };

  const handleManageUsers = () => {
    window.open('/app/members', '_blank');
  };

  const handleSystemSettings = () => {
    window.open('/app/admin-settings', '_blank');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_login': return IconUsers;
      case 'file_upload': return IconUpload;
      case 'bookmark_created': return IconBookmark;
      case 'task_completed': return IconChecklist;
      case 'system_backup': return IconDatabase;
      default: return IconActivity;
    }
  };

  const getGitHubIcon = (type: string) => {
    switch (type) {
      case 'commit': return IconGitBranch;
      case 'pull_request': return IconEdit;
      case 'merge': return IconGitBranch;
      default: return IconGitBranch;
    }
  };

  return (
    <div class="p-6 mt-4 pb-32 max-w-6xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p class="text-muted-foreground mt-2">System overview and management</p>
        </div>
        <div class="flex items-center gap-2">
          <IconSettings class="size-5 text-muted-foreground" />
          <span class="text-sm text-muted-foreground">Administrator Access</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="border rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
              <IconUsers class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-light">{stats().totalUsers}</p>
              <p class="text-sm text-muted-foreground">Total Users</p>
            </div>
          </div>
        </div>
        
        <div class="border rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
              <IconFileText class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-light">{stats().totalDocuments}</p>
              <p class="text-sm text-muted-foreground">Documents</p>
            </div>
          </div>
        </div>
        
        <div class="border rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
              <IconBookmark class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-light">{stats().totalBookmarks}</p>
              <p class="text-sm text-muted-foreground">Bookmarks</p>
            </div>
          </div>
        </div>
        
        <div class="border rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
              <IconFolder class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-light">{stats().totalStorage}</p>
              <p class="text-sm text-muted-foreground">Storage Used</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats and Activity */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* System Activity */}
        <div class="lg:col-span-2 border rounded-lg p-6">
          <div class="flex items-center gap-2 mb-4">
            <IconActivity class="size-5 text-primary" />
            <h3 class="text-lg font-semibold">System Activity</h3>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Active Users</span>
                <span class="font-medium">{stats().activeUsers}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Tasks Completed</span>
                <span class="font-medium">{stats().totalTasks}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Notes Created</span>
                <span class="font-medium">{stats().totalNotes}</span>
              </div>
            </div>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">System Uptime</span>
                <span class="font-medium">{stats().systemUptime}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Database Size</span>
                <span class="font-medium">847 MB</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">API Calls Today</span>
                <span class="font-medium">12,456</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div class="border rounded-lg p-6">
          <div class="flex items-center gap-2 mb-4">
            <IconTrendingUp class="size-5 text-primary" />
            <h3 class="text-lg font-semibold">Quick Actions</h3>
          </div>
          <div class="space-y-2">
            <button class="w-full text-left inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-9 px-3" onClick={handleBackupDatabase}>
              <IconDatabase class="size-4 mr-2" />
              Backup Database
            </button>
            <button class="w-full text-left inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-9 px-3" onClick={handleManageUsers}>
              <IconUsers class="size-4 mr-2" />
              Manage Users
            </button>
            <button class="w-full text-left inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-9 px-3" onClick={handleSystemSettings}>
              <IconSettings class="size-4 mr-2" />
              System Settings
            </button>
          </div>
        </div>
      </div>

      {/* Timeline and GitHub Activity */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* System Activity Timeline */}
        <div class="border rounded-lg p-6">
          <div class="flex items-center gap-2 mb-4">
            <IconClock class="size-5 text-primary" />
            <h3 class="text-lg font-semibold">System Activity Timeline</h3>
          </div>
          <div class="space-y-4">
            {systemActivities().map((activity, index) => {
              const ActivityIcon = getActivityIcon(activity.type);
              return (
                <div class="flex items-start gap-3">
                  <div class="flex flex-col items-center">
                    <div class="bg-muted flex items-center justify-center p-2 rounded-full">
                      <ActivityIcon class="size-4 text-primary" />
                    </div>
                    {index < systemActivities().length - 1 && (
                      <div class="w-0.5 h-8 bg-muted mt-2"></div>
                    )}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium">{activity.description}</p>
                    <p class="text-xs text-muted-foreground">{activity.timestamp}</p>
                    {activity.user && (
                      <p class="text-xs text-muted-foreground">User: {activity.user}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GitHub Activity */}
        <div class="border rounded-lg p-6">
          <div class="flex items-center gap-2 mb-4">
            <IconGitBranch class="size-5 text-primary" />
            <h3 class="text-lg font-semibold">GitHub Activity</h3>
          </div>
          <div class="space-y-4">
            {githubActivities().map((activity) => {
              const GitHubIcon = getGitHubIcon(activity.type);
              return (
                <div class="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <div class="flex items-start gap-3">
                    <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                      <GitHubIcon class="size-4 text-primary" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-medium">{activity.repo}</span>
                        <span class="text-xs text-muted-foreground">•</span>
                        <span class="text-xs text-muted-foreground">{activity.timestamp}</span>
                      </div>
                      <p class="text-sm text-muted-foreground mb-1">{activity.message}</p>
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-mono bg-muted px-2 py-1 rounded">{activity.commit}</span>
                        <span class="text-xs text-muted-foreground">by {activity.author}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Color Switcher Section */}
      <div class="border rounded-lg p-6">
        <div class="flex items-center gap-2 mb-4">
          <IconPalette class="size-5 text-primary" />
          <h3 class="text-lg font-semibold">Theme Customization</h3>
        </div>
        <ColorSwitcher />
      </div>
    </div>
  );
};
