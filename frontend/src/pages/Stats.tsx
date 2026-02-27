import { createSignal, onMount, Show } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { GitHubActivity } from '@/components/ui/GitHubActivity';
import { 
  IconActivity,
  IconUsers,
  IconBookmarks,
  IconFileText,
  IconChecklist,
  IconNotebook,
  IconSettings,
  IconCalendar,
  IconDownload,
  IconFilter,
  IconRefresh,
  IconChartLine,
  IconFolder,
  IconClock
} from '@tabler/icons-solidjs';
import { ActivityFeed } from '@/components/ui/ActivityFeed';
import { formatDuration } from '@/lib/timeFormat';
import { getApiV1BaseUrl } from '@/lib/api-url';

const API_BASE_URL = getApiV1BaseUrl();

interface ActivityData {
  date: string;
  count: number;
  level: number; // 0-5 intensity level
}

interface StatsData {
  totalBookmarks: number;
  totalDocuments: number;
  totalTasks: number;
  totalNotes: number;
  completedTasks: number;
  activeTasks: number;
  storageUsed: string;
  storageTotal: string;
  weeklyActivity: number[];
  monthlyGrowth: {
    bookmarks: number;
    documents: number;
    tasks: number;
    notes: number;
  };
  topCategories: Array<{
    name: string;
    count: number;
    color: string;
  }>;
  recentActivity: Array<{
    type: string;
    count: number;
    change: number;
  }>;
  contributionGraph: ActivityData[];
  totalTimeTracked?: number;
  averageProductivity?: number;
  recentProjects?: Array<{
    name: string;
    progress: number;
    status: string;
  }>;
}

export const Stats = () => {
  const [stats, setStats] = createSignal<StatsData>({
    totalBookmarks: 0,
    totalDocuments: 0,
    totalTasks: 0,
    totalNotes: 0,
    completedTasks: 0,
    activeTasks: 0,
    storageUsed: '0 MB',
    storageTotal: '50 GB',
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
    monthlyGrowth: {
      bookmarks: 0,
      documents: 0,
      tasks: 0,
      notes: 0
    },
    topCategories: [],
    recentActivity: [],
    contributionGraph: []
  });

  const [timeRange, setTimeRange] = createSignal<'week' | 'month' | 'year'>('week');
  const [refreshKey, setRefreshKey] = createSignal(0);
  const [showFilters, setShowFilters] = createSignal(false);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    void loadStats();
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const [statsRes, filesRes, tasksRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/dashboard/stats`, { headers }),
        fetch(`${API_BASE_URL}/files`, { headers }),
        fetch(`${API_BASE_URL}/tasks`, { headers })
      ]);

      const statsData = statsRes.status === 'fulfilled' && statsRes.value.ok ? await statsRes.value.json() : null;
      const filesData: Array<any> = filesRes.status === 'fulfilled' && filesRes.value.ok ? await filesRes.value.json() : [];
      const tasksData: Array<any> = tasksRes.status === 'fulfilled' && tasksRes.value.ok ? await tasksRes.value.json() : [];

      const completedTasks = tasksData.filter((task) => task.status === 'completed').length;
      const activeTasks = tasksData.filter((task) => task.status !== 'completed').length;
      const totalSizeBytes = filesData.reduce((acc: number, file: any) => acc + Number(file.file_size || 0), 0);
      const storageUsedMb = totalSizeBytes / (1024 * 1024);
      const storageTotalMb = 50 * 1024;

      setStats({
        totalBookmarks: Number(statsData?.totalBookmarks || 0),
        totalDocuments: filesData.length,
        totalTasks: Number(statsData?.totalTasks || tasksData.length || 0),
        totalNotes: Number(statsData?.totalNotes || 0),
        completedTasks,
        activeTasks,
        storageUsed: `${storageUsedMb.toFixed(2)} MB`,
        storageTotal: `${storageTotalMb} MB`,
        weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
        monthlyGrowth: {
          bookmarks: 0,
          documents: 0,
          tasks: 0,
          notes: 0
        },
        topCategories: [],
        recentActivity: [
          { type: 'Bookmarks', count: Number(statsData?.totalBookmarks || 0), change: 0 },
          { type: 'Documents', count: filesData.length, change: 0 },
          { type: 'Tasks', count: Number(statsData?.totalTasks || tasksData.length || 0), change: 0 },
          { type: 'Notes', count: Number(statsData?.totalNotes || 0), change: 0 }
        ],
        contributionGraph: []
      });
    } catch (error) {
      console.error('Failed to load stats data:', error);
      setStats({
        totalBookmarks: 0,
        totalDocuments: 0,
        totalTasks: 0,
        totalNotes: 0,
        completedTasks: 0,
        activeTasks: 0,
        storageUsed: '0 MB',
        storageTotal: '51200 MB',
        weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
        monthlyGrowth: {
          bookmarks: 0,
          documents: 0,
          tasks: 0,
          notes: 0
        },
        topCategories: [],
        recentActivity: [],
        contributionGraph: []
      });
    }
  };

  onMount(() => {
    void loadStats();
  });

  const storagePercentage = () => {
    const used = parseFloat(stats().storageUsed);
    const total = parseFloat(stats().storageTotal);
    if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) {
      return 0;
    }
    return Math.round((used / total) * 100);
  };

  const taskCompletionRate = () => {
    if (stats().totalTasks <= 0) {
      return 0;
    }
    return Math.round((stats().completedTasks / stats().totalTasks) * 100);
  };
  return (
    <div class="p-6 mt-4 pb-32 max-w-5xl mx-auto space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold">Statistics & Activity</h1>
          <p class="text-muted-foreground mt-2">Track your productivity, growth, and activity over time</p>
        </div>
      </div>

      <div class="flex justify-between items-start">
        <div></div>
        <div class="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters())}
          >
            <IconFilter class="size-4 mr-2" />
            Filters
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
          >
            <IconRefresh class="size-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <IconDownload class="size-4 mr-2" />
            Export
          </Button>
          {(['week', 'month', 'year'] as const).map((range) => (
            <Button
              variant={timeRange() === range ? 'default' : 'outline'}
              onClick={() => setTimeRange(range)}
              size="sm"
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Stats Grid - 2-column layout with larger left column */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Main Stats */}
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
              <div class="flex items-center gap-3">
                <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                  <IconBookmarks class="size-5 text-primary" />
                </div>
                <div>
                  <p class="text-2xl font-light text-foreground">{stats().totalBookmarks}</p>
                  <p class="text-sm text-muted-foreground">Bookmarks</p>
                </div>
              </div>
            </div>

            <div class="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
              <div class="flex items-center gap-3">
                <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                  <IconFileText class="size-5 text-primary" />
                </div>
                <div>
                  <p class="text-2xl font-light text-foreground">{stats().totalDocuments}</p>
                  <p class="text-sm text-muted-foreground">Documents</p>
                </div>
              </div>
            </div>

            <div class="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
              <div class="flex items-center gap-3">
                <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                  <IconChecklist class="size-5 text-primary" />
                </div>
                <div>
                  <p class="text-2xl font-light text-foreground">{stats().totalTasks}</p>
                  <p class="text-sm text-muted-foreground">Tasks</p>
                </div>
              </div>
            </div>

            <div class="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
              <div class="flex items-center gap-3">
                <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                  <IconNotebook class="size-5 text-primary" />
                </div>
                <div>
                  <p class="text-2xl font-light text-foreground">{stats().totalNotes}</p>
                  <p class="text-sm text-muted-foreground">Notes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Enhanced Stats */}
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
              <div class="flex flex-col items-center text-center gap-2">
                <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                  <IconClock class="size-5 text-primary" />
                </div>
                <div>
                  <p class="text-xl font-bold text-foreground">{formatDuration(stats().totalTimeTracked || 0)}</p>
                  <p class="text-xs text-muted-foreground font-medium">Total Time</p>
                </div>
              </div>
            </div>
            
            <div class="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
              <div class="flex items-center gap-2">
                <IconUsers class="size-4 text-primary" />
                <div>
                  <p class="text-lg font-semibold text-foreground">0</p>
                  <p class="text-xs text-muted-foreground">Collaborators</p>
                </div>
              </div>
            </div>
            
            <div class="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
              <div class="flex items-center gap-2">
                <IconChartLine class="size-4 text-primary" />
                <div>
                  <p class="text-lg font-semibold text-foreground">{stats().averageProductivity ?? 0}%</p>
                  <p class="text-xs text-muted-foreground">Productivity</p>
                </div>
              </div>
            </div>
            
            <div class="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
              <div class="flex items-center gap-2">
                <IconCalendar class="size-4 text-primary" />
                <div>
                  <p class="text-lg font-semibold text-foreground">0</p>
                  <p class="text-xs text-muted-foreground">Days Active</p>
                </div>
              </div>
            </div>
            
            <div class="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
              <div class="flex items-center gap-2">
                <IconSettings class="size-4 text-primary" />
                <div>
                  <p class="text-lg font-semibold text-foreground">{stats().recentProjects?.length || 0}</p>
                  <p class="text-xs text-muted-foreground">Projects</p>
                </div>
              </div>
            </div>
            
            <div class="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
              <div class="flex items-center gap-2">
                <IconFolder class="size-4 text-primary" />
                <div>
                  <p class="text-lg font-semibold text-foreground">{stats().storageUsed}</p>
                  <p class="text-xs text-muted-foreground">Storage Used</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress and Storage */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="border rounded-lg p-6">
          <div class="flex items-center gap-2 mb-4">
            <IconChartLine class="size-5 text-primary" />
            <h3 class="text-lg font-semibold">Task Completion</h3>
          </div>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="text-muted-foreground">Completed</span>
                <span>{stats().completedTasks}/{stats().totalTasks}</span>
              </div>
              <div class="w-full bg-muted rounded-full h-3">
                <div 
                  class="bg-primary h-3 rounded-full transition-all duration-500"
                  style={`width: ${taskCompletionRate()}%`}
                ></div>
              </div>
              <p class="text-xs text-muted-foreground mt-1">{taskCompletionRate()}% completion rate</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4 pt-2">
              <div class="text-center">
                <p class="text-xl font-semibold">{stats().completedTasks}</p>
                <p class="text-xs text-muted-foreground">Completed</p>
              </div>
              <div class="text-center">
                <p class="text-xl font-semibold">{stats().activeTasks}</p>
                <p class="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
        </div>

        <div class="border rounded-lg p-6">
          <div class="flex items-center gap-2 mb-4">
            <IconFolder class="size-5" />
            <h3 class="text-lg font-semibold">Storage Usage</h3>
          </div>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="text-muted-foreground">Used Space</span>
                <span>{stats().storageUsed} / {stats().storageTotal}</span>
              </div>
              <div class="w-full bg-muted rounded-full h-3">
                <div 
                  class="bg-primary h-3 rounded-full transition-all duration-500"
                  style={`width: ${storagePercentage()}%`}
                ></div>
              </div>
              <p class="text-xs text-muted-foreground mt-1">{storagePercentage()}% of storage used</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4 pt-2">
              <div class="text-center">
                <p class="text-xl font-semibold">{stats().totalDocuments}</p>
                <p class="text-xs text-muted-foreground">Files</p>
              </div>
              <div class="text-center">
                <p class="text-xl font-semibold">{stats().storageUsed}</p>
                <p class="text-xs text-muted-foreground">Used</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub-like Contribution Graph */}
      <GitHubActivity 
        title="Activity Overview"
        showStats={false}
        showContributionGraph={true}
        showRecentActivity={false}
        compact={true}
        period="year"
      />

      {/* Weekly Activity Chart */}
      <div class="border rounded-lg p-4 sm:p-6">
        <div class="flex items-center gap-2 mb-4">
          <IconActivity class="size-5 text-primary" />
          <h3 class="text-lg font-semibold">Weekly Activity</h3>
        </div>
        <div class="space-y-4">
          <Show
            when={stats().weeklyActivity.reduce((a, b) => a + b, 0) > 0}
            fallback={
              <div class="h-32 sm:h-36 md:h-40 lg:h-44 border border-dashed border-border rounded-lg flex items-center justify-center">
                <p class="text-sm text-muted-foreground">No weekly activity yet.</p>
              </div>
            }
          >
            <div class="relative h-32 sm:h-36 md:h-40 lg:h-44 px-4 sm:px-6 weekly-activity-chart">
              <div class="absolute inset-x-0 inset-y-2 pointer-events-none flex flex-col justify-between">
                <div class="border-t border-border/60"></div>
                <div class="border-t border-border/40"></div>
                <div class="border-t border-border/30"></div>
                <div class="border-t border-border/20"></div>
              </div>
              <div class="relative flex items-end justify-between h-full gap-1 sm:gap-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
                  const weeklyActivity = stats().weeklyActivity;
                  const activity = weeklyActivity[index];
                  const maxActivity = Math.max(...weeklyActivity, 1);
                  const heightPercent = (activity / maxActivity) * 85;
                  const finalHeightPercent = activity > 0 ? Math.max(heightPercent, 6) : 0;

                  return (
                    <div class="flex flex-col items-center flex-1 gap-2 group min-w-0 h-full">
                      <div class="relative w-full max-w-2 sm:max-w-3 md:max-w-4 flex flex-col items-center justify-end h-full">
                        <span class="text-xs font-medium text-primary mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap absolute -top-5 z-10 bg-background px-1 rounded shadow-sm">
                          {activity}
                        </span>
                        <div 
                          class="w-full max-w-2 sm:max-w-3 md:max-w-4 bg-primary rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer hover:scale-105 weekly-bar"
                          style={`height: ${finalHeightPercent}%;`}
                          title={`${day}: ${activity} activities`}
                        ></div>
                      </div>
                      <span class="text-xs text-muted-foreground font-medium mt-1 hidden sm:block">{day}</span>
                      <span class="text-xs text-muted-foreground font-medium mt-1 sm:hidden">{day.charAt(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Show>

          <div class="flex flex-col sm:flex-row sm:justify-between text-xs text-muted-foreground pt-2 border-t border-border gap-1 sm:gap-0">
            <span>Total: {stats().weeklyActivity.reduce((a, b) => a + b, 0)} activities</span>
            <span>Avg: {Math.round(stats().weeklyActivity.reduce((a, b) => a + b, 0) / 7)} per day</span>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      <div class="border rounded-lg p-6">
        <div class="flex items-center gap-2 mb-4">
          <IconUsers class="size-5 text-primary" />
          <h3 class="text-lg font-semibold">Top Categories</h3>
        </div>
        <Show
          when={stats().topCategories.length > 0}
          fallback={<p class="text-sm text-muted-foreground">No category activity yet.</p>}
        >
          <div class="space-y-3">
            {stats().topCategories.map((category) => (
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div 
                    class="w-3 h-3 rounded-full"
                    style={`background-color: ${category.color}`}
                  ></div>
                  <span class="text-sm">{category.name}</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-24 bg-muted rounded-full h-2">
                    <div 
                      class="bg-primary h-2 rounded-full transition-all duration-500"
                      style={`width: ${(category.count / Math.max(...stats().topCategories.map(c => c.count))) * 100}%`}
                    ></div>
                  </div>
                  <span class="text-sm text-muted-foreground w-8 text-right">{category.count}</span>
                </div>
              </div>
            ))}
          </div>
        </Show>
      </div>

      {/* Activity Section - Responsive Layout */}
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Main Activity Feed */}
        <div>
          <div class="border rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <IconActivity class="size-5 text-primary" />
                <h3 class="text-lg font-semibold">Recent Activity</h3>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
              >
                <IconRefresh class="size-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div class="space-y-3">
              <ActivityFeed 
                refreshKey={refreshKey()} 
                limit={8} 
                showFilter={showFilters()} 
              />
            </div>
          </div>
        </div>

        {/* Activity Sidebar - Responsive */}
        <div class="space-y-6">
          {/* Activity Breakdown */}
          <div class="border rounded-lg p-4 sm:p-6">
            <h3 class="text-lg font-semibold mb-4">Activity Breakdown</h3>
            <Show
              when={stats().recentActivity.length > 0}
              fallback={<p class="text-sm text-muted-foreground">No activity breakdown yet.</p>}
            >
              <div class="space-y-3">
                {stats().recentActivity.map((activity) => (
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-muted-foreground">{activity.type}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium">{activity.count}</span>
                      <Show when={activity.change !== 0}>
                        <span class={`text-xs text-muted-foreground`}>
                          {activity.change > 0 ? '+' : ''}{activity.change}
                        </span>
                      </Show>
                    </div>
                  </div>
                ))}
              </div>
            </Show>
          </div>

          {/* Active Repositories */}
          <div class="border rounded-lg p-4 sm:p-6">
            <h3 class="text-lg font-semibold mb-4">Active Repositories</h3>
            <p class="text-sm text-muted-foreground">No repository activity yet.</p>
          </div>

          {/* Activity Settings */}
          <div class="border rounded-lg p-4 sm:p-6">
            <h3 class="text-lg font-semibold mb-4">Activity Settings</h3>
            <div class="space-y-3">
              <Button 
                variant="outline" 
                size="sm" 
                class="w-full justify-start"
                onClick={() => setShowFilters(!showFilters())}
              >
                <IconSettings class="size-4 mr-2" />
                Configure Filters
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                class="w-full justify-start"
                onClick={() => {
                  // Export functionality
                  const data = {
                    stats: stats(),
                    exportDate: new Date().toISOString()
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `trackeep-activity-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <IconDownload class="size-4 mr-2" />
                Export Activity Data
              </Button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
