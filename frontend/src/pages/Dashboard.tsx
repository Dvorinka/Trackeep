import { createSignal, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { 
  IconUpload, 
  IconFileText, 
  IconFileTypePpt, 
  IconFileTypeDocx,
  IconDotsVertical,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconBookmark,
  IconChecklist,
  IconNotebook,
  IconFolder,
  IconClock,
  IconDownload,
  IconTrash,
  IconEdit,
  IconEye,
  IconRefresh,
  IconTrendingUp,
  IconChartLine,
  IconActivity,
  IconSearch,
  IconChevronDown,
  IconVideo,
  IconSchool,
  IconX
} from '@tabler/icons-solidjs';
import { BrowserSearch } from '@/components/search/BrowserSearch';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { FilePreviewModal } from '@/components/ui/FilePreviewModal';
import { ActivityFeed } from '@/components/ui/ActivityFeed';
import { UploadModal } from '@/components/ui/UploadModal';
import { BookmarkModal } from '@/components/ui/BookmarkModal';
import { VideoUploadModal } from '@/components/ui/VideoUploadModal';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { 
  getMockDocuments, 
  getMockStats, 
  getMockActivities
} from '@/lib/mockData';
import { formatDuration } from '@/lib/timeFormat';
import { 
  isSearchAvailable
} from '@/lib/credentials';
import { isDemoMode } from '@/lib/demo-mode';
import { getApiV1BaseUrl } from '@/lib/api-url';

const API_BASE_URL = getApiV1BaseUrl();

interface Document {
  id: string;
  name: string;
  size: string;
  type: string;
  createdAt: string;
  tags: Array<{ name: string; color: string }>;
  content?: string;
}

interface QuickStats {
  totalDocuments: number;
  totalBookmarks: number;
  totalTasks: number;
  totalNotes: number;
  totalSize: string;
  recentActivity: number;
  completedTasks: number;
  activeTasks: number;
  monthlyGrowth: {
    bookmarks: number;
    documents: number;
    tasks: number;
    notes: number;
  };
  weeklyActivity: number[];
  // Additional stats for enhanced dashboard
  totalVideos: number;
  totalLearningPaths: number;
  totalTimeTracked: number;
  averageProductivity: number;
  storageUsed: number;
  storageTotal: number;
  recentProjects: Array<{
    name: string;
    progress: number;
    status: string;
  }>;
  topTags: Array<{
    name: string;
    count: number;
    color: string;
  }>;
  upcomingDeadlines: Array<{
    title: string;
    date: string;
    priority: string;
  }>;
  recentAchievements: Array<{
    title: string;
    date: string;
    type: string;
  }>;
}

interface RecentActivity {
  id: string;
  type: 'document' | 'bookmark' | 'task' | 'note';
  action: string;
  title: string;
  timestamp: string;
  icon: any;
  details?: any;
}

interface GitHubActivityEvent {
  id: string;
  title: string;
  date: string;
  repo?: string;
  action?: string;
  link?: string;
  type: 'push' | 'commit' | 'bookmark' | 'note';
}

const createEmptyStats = (): QuickStats => ({
  totalDocuments: 0,
  totalBookmarks: 0,
  totalTasks: 0,
  totalNotes: 0,
  totalSize: '0 MB',
  recentActivity: 0,
  completedTasks: 0,
  activeTasks: 0,
  monthlyGrowth: {
    bookmarks: 0,
    documents: 0,
    tasks: 0,
    notes: 0,
  },
  weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
  totalVideos: 0,
  totalLearningPaths: 0,
  totalTimeTracked: 0,
  averageProductivity: 0,
  storageUsed: 0,
  storageTotal: 50,
  recentProjects: [],
  topTags: [],
  upcomingDeadlines: [],
  recentAchievements: [],
});

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 MB';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${Math.round(value * 100) / 100} ${units[exponent]}`;
};

const deriveFileType = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension) {
    return 'other';
  }
  return extension;
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = createSignal<Document[]>([]);
  const [, setRecentActivity] = createSignal<RecentActivity[]>([]);
  const [githubActivityEvents, setGithubActivityEvents] = createSignal<GitHubActivityEvent[]>([]);
  const [showBrowserSearch, setShowBrowserSearch] = createSignal(true);
  const [showFilePreview, setShowFilePreview] = createSignal(false);
  const [selectedFile, setSelectedFile] = createSignal<Document | null>(null);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [rowsPerPage, setRowsPerPage] = createSignal(10);
  const [activityRefreshKey, setActivityRefreshKey] = createSignal(0);
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = createSignal(false);
  const [showBookmarkModal, setShowBookmarkModal] = createSignal(false);
  const [showVideoModal, setShowVideoModal] = createSignal(false);
  
  // Achievement/Deadline modal states
  const [showAchievementModal, setShowAchievementModal] = createSignal(false);
  const [showDeadlineModal, setShowDeadlineModal] = createSignal(false);
  const [selectedAchievement, setSelectedAchievement] = createSignal<any>(null);
  const [selectedDeadline, setSelectedDeadline] = createSignal<any>(null);
  const [dashboardStats, setDashboardStats] = createSignal<QuickStats>(createEmptyStats());

  const stats = (): QuickStats => dashboardStats();

  const taskCompletionRate = () => {
    if (stats().totalTasks === 0) {
      return 0;
    }
    return Math.round((stats().completedTasks / stats().totalTasks) * 100);
  };

  const storagePercentage = () => {
    if (stats().storageTotal <= 0) {
      return 0;
    }
    return Math.round((stats().storageUsed / stats().storageTotal) * 100);
  };

  const weeklyActivityTotal = () => stats().weeklyActivity.reduce((sum, value) => sum + value, 0);

  // Modal handlers
  const handleBookmarkSubmit = async (bookmark: any) => {
    try {
      // Use the API client to create bookmark
      const { bookmarksApi } = await import('@/lib/api');
      const newBookmark = await bookmarksApi.create({
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.description,
        tags: bookmark.tags,
        is_public: false
      });
      console.log('Bookmark added:', newBookmark);
      setShowBookmarkModal(false);
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      // Still close modal even if API fails for demo mode
      setShowBookmarkModal(false);
    }
  };

  const handleVideoSubmit = async (video: any) => {
    try {
      const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/youtube/video-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ video_id: video.video_id })
      });
      
      if (response.ok) {
        console.log('Video added:', video);
      } else {
        console.log('Video added (demo mode):', video);
      }
      setShowVideoModal(false);
    } catch (error) {
      console.error('Failed to add video:', error);
      setShowVideoModal(false);
    }
  };

  onMount(async () => {
    // Load browser search setting from localStorage
    setShowBrowserSearch(localStorage.getItem('showBrowserSearch') !== 'false');

    if (isDemoMode()) {
      setDashboardStats(getMockStats());
      setDocuments(getMockDocuments());
      setGithubActivityEvents([]);

      const mockActivities = getMockActivities();
      const filteredActivities = mockActivities
        .filter(activity => ['document', 'bookmark', 'task', 'note'].includes(activity.type))
        .map(activity => ({
          id: activity.id,
          type: activity.type as 'document' | 'bookmark' | 'task' | 'note',
          action: activity.action,
          title: activity.title,
          timestamp: activity.timestamp,
          icon: activity.type === 'document' ? IconFileText :
                activity.type === 'bookmark' ? IconBookmark :
                activity.type === 'task' ? IconChecklist :
                IconNotebook,
          details: activity.details
        }));
      setRecentActivity(filteredActivities as RecentActivity[]);
      return;
    }

    try {
      const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };

      const [statsRes, filesRes, tasksRes, timeEntriesRes, learningPathsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/dashboard/stats`, { headers }),
        fetch(`${API_BASE_URL}/files`, { headers }),
        fetch(`${API_BASE_URL}/tasks`, { headers }),
        fetch(`${API_BASE_URL}/time-entries`, { headers }),
        fetch(`${API_BASE_URL}/learning-paths`, { headers }),
      ]);

      const statsData = statsRes.status === 'fulfilled' && statsRes.value.ok ? await statsRes.value.json() : null;
      const filesData: Array<any> = filesRes.status === 'fulfilled' && filesRes.value.ok ? await filesRes.value.json() : [];
      const tasksData: Array<any> = tasksRes.status === 'fulfilled' && tasksRes.value.ok ? await tasksRes.value.json() : [];
      const timeEntriesPayload: { time_entries?: Array<{ duration?: number }> } =
        timeEntriesRes.status === 'fulfilled' && timeEntriesRes.value.ok ? await timeEntriesRes.value.json() : {};
      const learningPathsData: Array<any> =
        learningPathsRes.status === 'fulfilled' && learningPathsRes.value.ok ? await learningPathsRes.value.json() : [];

      const mappedDocuments: Document[] = filesData.map((file: any) => ({
        id: String(file.id ?? ''),
        name: file.original_name || file.file_name || `File ${file.id ?? ''}`,
        size: formatBytes(Number(file.file_size || 0)),
        type: deriveFileType(file.original_name || file.file_name || ''),
        createdAt: file.created_at || new Date().toISOString(),
        tags: [],
      }));
      setDocuments(mappedDocuments);

      const recentActivitiesRaw: Array<any> = Array.isArray(statsData?.recentActivity) ? statsData.recentActivity : [];
      const mappedActivities: RecentActivity[] = recentActivitiesRaw
        .filter((activity) => ['bookmark', 'task', 'note', 'file'].includes(activity.type))
        .map((activity) => ({
          id: String(activity.id ?? ''),
          type: activity.type === 'file'
            ? 'document'
            : activity.type as 'document' | 'bookmark' | 'task' | 'note',
          action: activity.type || 'activity',
          title: activity.title || 'Activity',
          timestamp: activity.timestamp || '',
          icon: activity.type === 'bookmark' ? IconBookmark :
                activity.type === 'task' ? IconChecklist :
                activity.type === 'note' ? IconNotebook :
                IconFileText,
          details: undefined,
        }));
      setRecentActivity(mappedActivities);

      const mappedGitHubActivities: GitHubActivityEvent[] = recentActivitiesRaw
        .filter((activity) => typeof activity.type === 'string' && activity.type.startsWith('github'))
        .slice(0, 6)
        .map((activity, index) => ({
          id: String(activity.id ?? `github-${index}`),
          title: activity.title || 'GitHub activity',
          date: activity.timestamp || '',
          repo: activity.repo,
          action: activity.action,
          link: activity.link,
          type: activity.type === 'github_commit'
            ? 'commit'
            : activity.type === 'github_push'
              ? 'push'
              : 'note',
        }));
      setGithubActivityEvents(mappedGitHubActivities);

      const completedTasks = tasksData.filter((task) => task.status === 'completed').length;
      const activeTasks = tasksData.filter((task) => task.status !== 'completed').length;
      const totalSizeBytes = filesData.reduce((acc: number, file: any) => acc + Number(file.file_size || 0), 0);
      const totalTrackedSeconds = (timeEntriesPayload.time_entries || []).reduce((acc: number, entry) => acc + Number(entry.duration || 0), 0);
      const upcomingDeadlines = tasksData
        .filter((task) => Boolean(task.due_date) && task.status !== 'completed')
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 3)
        .map((task) => ({
          title: task.title || 'Task',
          date: String(task.due_date).split('T')[0],
          priority: task.priority || 'medium',
        }));

      const statsPayload = createEmptyStats();
      statsPayload.totalDocuments = mappedDocuments.length;
      statsPayload.totalBookmarks = Number(statsData?.totalBookmarks || 0);
      statsPayload.totalTasks = Number(statsData?.totalTasks || tasksData.length || 0);
      statsPayload.totalNotes = Number(statsData?.totalNotes || 0);
      statsPayload.totalSize = formatBytes(totalSizeBytes);
      statsPayload.recentActivity = mappedActivities.length;
      statsPayload.completedTasks = completedTasks;
      statsPayload.activeTasks = activeTasks;
      statsPayload.totalLearningPaths = learningPathsData.length;
      statsPayload.totalTimeTracked = totalTrackedSeconds / 3600;
      statsPayload.averageProductivity = statsPayload.totalTasks > 0
        ? Math.round((completedTasks / statsPayload.totalTasks) * 100)
        : 0;
      statsPayload.storageUsed = totalSizeBytes / (1024 * 1024 * 1024);
      statsPayload.upcomingDeadlines = upcomingDeadlines;
      statsPayload.recentAchievements = completedTasks > 0
        ? [{ title: `Completed ${completedTasks} task${completedTasks === 1 ? '' : 's'}`, date: 'Recently', type: 'milestone' }]
        : [];
      statsPayload.recentProjects = learningPathsData.slice(0, 4).map((path) => ({
        name: path.title || 'Learning Path',
        progress: Number(path.progress || 0),
        status: path.progress && path.progress >= 100 ? 'completed' : 'active',
      }));

      setDashboardStats(statsPayload);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setDashboardStats(createEmptyStats());
      setDocuments([]);
      setRecentActivity([]);
      setGithubActivityEvents([]);
    }
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'docx':
        return { icon: IconFileTypeDocx, color: 'text-blue-500' };
      case 'pptx':
        return { icon: IconFileTypePpt, color: 'text-orange-500' };
      case 'pdf':
        return { icon: IconFileText, color: 'text-red-500' };
      case 'xlsx':
        return { icon: IconFileText, color: 'text-green-500' };
      case 'txt':
        return { icon: IconFileText, color: 'text-gray-500' };
      case 'md':
        return { icon: IconFileText, color: 'text-purple-500' };
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return { icon: IconFileText, color: 'text-pink-500' };
      case 'mp4':
      case 'avi':
      case 'mov':
        return { icon: IconVideo, color: 'text-indigo-500' };
      case 'zip':
      case 'rar':
      case '7z':
        return { icon: IconFileText, color: 'text-yellow-600' };
      default:
        return { icon: IconFileText, color: 'text-primary' };
    }
  };

  const handleDownloadDocument = (doc: Document) => {
    // Simulate download
    const link = document.createElement('a');
    link.href = '#'; // In real app, this would be the actual file URL
    link.download = doc.name;
    link.click();
  };

  const handlePreviewDocument = (doc: Document) => {
    setSelectedFile({
      ...doc,
      preview: doc.content,
      downloadUrl: `#download-${doc.id}`,
      viewUrl: `#view-${doc.id}`,
      size: doc.size.includes('KB') ? `${parseFloat(doc.size) * 1024}` : 
            doc.size.includes('MB') ? `${parseFloat(doc.size) * 1024 * 1024}` : 
            doc.size.includes('GB') ? `${parseFloat(doc.size) * 1024 * 1024 * 1024}` : '1024'
    });
    setShowFilePreview(true);
  };

  const handleEditDocument = (doc: Document) => {
    // Open edit modal or navigate to edit page
    window.location.href = `/files/edit/${doc.id}`;
  };

  const handleDeleteDocument = (doc: Document) => {
    if (confirm(`Are you sure you want to delete ${doc.name}?`)) {
      // Delete the document
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    }
  };

  const paginatedDocuments = () => {
    const start = (currentPage() - 1) * rowsPerPage();
    const end = start + rowsPerPage();
    return documents().slice(start, end);
  };

  const totalPages = () => Math.max(1, Math.ceil(documents().length / rowsPerPage()));

  const handlePageChange = (page: number) => {
    const clamped = Math.min(Math.max(page, 1), totalPages());
    setCurrentPage(clamped);
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  return (
    <div class="p-6 mt-4 pb-32 max-w-5xl mx-auto">
      {/* Stats Overview */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <IconChecklist class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-light">{stats().totalTasks}</p>
              <p class="text-sm text-muted-foreground">Tasks</p>
            </div>
          </div>
        </div>
        
        <div class="border rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
              <IconNotebook class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-light">{stats().totalNotes}</p>
              <p class="text-sm text-muted-foreground">Notes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Row */}
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div class="border rounded-lg p-4">
          <div class="flex flex-col items-center text-center gap-2">
            <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
              <IconVideo class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-xl font-bold text-foreground">{stats().totalVideos}</p>
              <p class="text-xs text-muted-foreground font-medium">Videos</p>
            </div>
          </div>
        </div>
        
        <div class="border rounded-lg p-4">
          <div class="flex flex-col items-center text-center gap-2">
            <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
              <IconSchool class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-xl font-bold text-foreground">{stats().totalLearningPaths}</p>
              <p class="text-xs text-muted-foreground font-medium">Learning</p>
            </div>
          </div>
        </div>
        
        <div class="border rounded-lg p-4">
          <div class="flex flex-col items-center text-center gap-2">
            <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
              <IconClock class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-xl font-bold text-foreground">{formatDuration(stats().totalTimeTracked)}</p>
              <p class="text-xs text-muted-foreground font-medium">Time</p>
            </div>
          </div>
        </div>
        
        <div class="border rounded-lg p-4">
          <div class="flex flex-col items-center text-center gap-2">
            <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
              <IconTrendingUp class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-xl font-bold text-foreground">{stats().averageProductivity}%</p>
              <p class="text-xs text-muted-foreground font-medium">Productivity</p>
            </div>
          </div>
        </div>
        
        <div class="border rounded-lg p-4">
          <div class="flex flex-col items-center text-center gap-2">
            <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
              <IconFolder class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-xl font-bold text-foreground">{stats().totalDocuments}</p>
              <p class="text-xs text-muted-foreground font-medium">Documents</p>
            </div>
          </div>
        </div>
        
        <div class="border rounded-lg p-4">
          <div class="flex flex-col items-center text-center gap-2">
            <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
              <IconActivity class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-xl font-bold text-foreground">{stats().totalNotes}</p>
              <p class="text-xs text-muted-foreground font-medium">Notes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Achievements and Deadlines */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Recent Achievements */}
        <div class="border rounded-lg p-4">
          <div class="flex items-center gap-2 mb-4">
            <IconTrendingUp class="size-4 text-primary" />
            <h3 class="font-semibold">Recent Achievements</h3>
          </div>
          <Show
            when={stats().recentAchievements.length > 0}
            fallback={<p class="text-sm text-muted-foreground">No achievements yet.</p>}
          >
            <div class="space-y-3">
              {stats().recentAchievements.map((achievement) => (
                <div 
                  class="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedAchievement(achievement);
                    setShowAchievementModal(true);
                  }}
                >
                  <div class={`w-2 h-2 rounded-full ${
                    achievement.type === 'milestone' ? 'bg-primary' :
                    achievement.type === 'deployment' ? 'bg-primary' :
                    'bg-primary'
                  }`}></div>
                  <div class="flex-1">
                    <p class="text-sm font-medium">{achievement.title}</p>
                    <p class="text-xs text-muted-foreground">{achievement.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Show>
        </div>

        {/* Upcoming Deadlines */}
        <div class="border rounded-lg p-4">
          <div class="flex items-center gap-2 mb-4">
            <IconClock class="size-4 text-primary" />
            <h3 class="font-semibold">Upcoming Deadlines</h3>
          </div>
          <Show
            when={stats().upcomingDeadlines.length > 0}
            fallback={<p class="text-sm text-muted-foreground">No upcoming deadlines.</p>}
          >
            <div class="space-y-3">
              {stats().upcomingDeadlines.map((deadline) => (
                <div 
                  class="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedDeadline(deadline);
                    setShowDeadlineModal(true);
                  }}
                >
                  <div class={`w-2 h-2 rounded-full ${
                    deadline.priority === 'high' ? 'bg-primary' :
                    deadline.priority === 'medium' ? 'bg-primary' :
                    'bg-primary'
                  }`}></div>
                  <div class="flex-1">
                    <p class="text-sm font-medium">{deadline.title}</p>
                    <p class="text-xs text-muted-foreground">{deadline.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Show>
        </div>
      </div>

      {/* Progress and Activity Overview */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Task Completion Progress */}
        <div class="border rounded-lg p-4">
          <div class="flex items-center gap-2 mb-3">
            <IconChartLine class="size-4 text-primary" />
            <h3 class="font-semibold">Task Completion</h3>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Progress</span>
              <span>{stats().completedTasks}/{stats().totalTasks}</span>
            </div>
            <div class="w-full bg-muted rounded-full h-2">
              <div 
                class="bg-primary h-2 rounded-full transition-all duration-500"
                style={`width: ${taskCompletionRate()}%`}
              ></div>
            </div>
            <p class="text-xs text-muted-foreground">{taskCompletionRate()}% completion rate</p>
            <div class="grid grid-cols-2 gap-2 pt-1">
              <div class="text-center">
                <p class="text-sm font-medium">{stats().completedTasks}</p>
                <p class="text-xs text-muted-foreground">Completed</p>
              </div>
              <div class="text-center">
                <p class="text-sm font-medium">{stats().activeTasks}</p>
                <p class="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Usage */}
        <div class="border rounded-lg p-4">
          <div class="flex items-center gap-2 mb-3">
            <IconFolder class="size-4 text-primary" />
            <h3 class="font-semibold">Storage Usage</h3>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Used Space</span>
              <span>{stats().totalSize}</span>
            </div>
            <div class="w-full bg-muted rounded-full h-2">
              <div 
                class="bg-primary h-2 rounded-full transition-all duration-500"
                style={`width: ${storagePercentage()}%`}
              ></div>
            </div>
            <p class="text-xs text-muted-foreground">{storagePercentage()}% of 50 GB used</p>
          </div>
        </div>

        {/* Weekly Activity */}
        <div class="border rounded-lg p-4">
          <div class="flex items-center gap-2 mb-3">
            <IconActivity class="size-4 text-primary" />
            <h3 class="font-semibold">Weekly Activity</h3>
          </div>
          <div class="space-y-4">
            <Show
              when={weeklyActivityTotal() > 0}
              fallback={
                <div class="h-32 md:h-36 border border-dashed border-border rounded-lg flex items-center justify-center">
                  <p class="text-sm text-muted-foreground">No activity data yet.</p>
                </div>
              }
            >
              <div class="relative h-32 md:h-36 px-6 weekly-activity-chart">
                <div class="absolute inset-x-0 inset-y-2 pointer-events-none flex flex-col justify-between">
                  <div class="border-t border-border/60"></div>
                  <div class="border-t border-border/40"></div>
                  <div class="border-t border-border/30"></div>
                  <div class="border-t border-border/20"></div>
                </div>
                <div class="relative flex items-end justify-between h-full gap-1 md:gap-2">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
                    const weeklyActivity = stats().weeklyActivity;
                    const activity = weeklyActivity[index];
                    const maxActivity = Math.max(...weeklyActivity, 1);
                    const heightPercent = (activity / maxActivity) * 85;
                    const finalHeightPercent = activity > 0 ? Math.max(heightPercent, 8) : 0;

                    return (
                      <div class="flex flex-col items-center flex-1 gap-2 group min-w-0 max-w-4 h-full">
                        <div class="relative w-full max-w-2 md:max-w-3 flex flex-col items-center justify-end h-full">
                          <span 
                            class="text-xs font-medium text-primary mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap absolute -top-5 z-10"
                          >
                            {activity}
                          </span>
                          <div 
                            class="w-full max-w-2 md:max-w-3 bg-primary rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer hover:scale-105 weekly-bar"
                            style={`height: ${finalHeightPercent}%; background-color: hsl(199, 89%, 67%);`}
                            title={`${day}: ${activity} activities`}
                          ></div>
                        </div>
                        <span class="text-xs text-muted-foreground font-medium mt-1">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Show>
            
            {/* Weekly summary */}
            <div class="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
              <span>Total: {weeklyActivityTotal()} activities</span>
              <span>Avg: {Math.round(weeklyActivityTotal() / 7)} per day</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards and Recent Activity */}
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Upload Card */}
        <div class="lg:col-span-2 space-y-4">
          <button 
            type="button" 
            onClick={() => setShowUploadModal(true)}
            class="w-full h-32 inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 items-start flex-col gap-4 py-6 px-6 text-left"
          >
            <IconUpload class="size-6" />
            <div>
              <div class="font-semibold">Upload documents</div>
              <div class="text-sm opacity-90">Drag and drop or click to browse</div>
            </div>
          </button>
          
          {/* Split buttons for Video and Bookmark */}
          <div class="grid grid-cols-2 gap-4">
            <button 
              type="button" 
              onClick={() => setShowVideoModal(true)}
              class="w-full inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow hover:bg-secondary/90 items-start flex-col gap-4 py-4 px-4 text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-video size-5">
                <path d="M4 4m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z"></path>
                <path d="M15 7l4 4l0 4"></path>
                <path d="M15 11l4 -4"></path>
              </svg>
              <div>
                <div class="font-semibold">Save YouTube Video</div>
                <div class="text-sm opacity-90">Save a YouTube video link</div>
              </div>
            </button>
            
            <button 
              type="button" 
              onClick={() => setShowBookmarkModal(true)}
              class="w-full inline-flex justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow hover:bg-secondary/90 items-start flex-col gap-4 py-4 px-4 text-left"
            >
              <IconBookmark class="size-5" />
              <div>
                <div class="font-semibold">Add Bookmark</div>
                <div class="text-sm opacity-90">Save web links</div>
              </div>
            </button>
          </div>

          {/* GitHub Activity Section */}
          <div class="border rounded-lg p-4">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <IconActivity class="size-4 text-muted-foreground" />
                <h3 class="font-semibold">GitHub Activity</h3>
              </div>
            </div>
            <Show
              when={githubActivityEvents().length > 0}
              fallback={<p class="text-sm text-muted-foreground">No GitHub activity yet.</p>}
            >
              <div class="space-y-3 max-h-64 overflow-y-auto">
                {githubActivityEvents().map((event) => (
                  <div class="flex items-center justify-between p-3 bg-card rounded-lg border hover:bg-muted/50 transition-colors">
                    <div class="flex items-center gap-3">
                      <div class="bg-primary/10 p-2 rounded-lg">
                        {event.type === 'push' || event.type === 'commit' ? (
                          <IconChartLine class="size-4 text-primary" />
                        ) : event.type === 'bookmark' ? (
                          <IconBookmark class="size-4 text-primary" />
                        ) : (
                          <IconNotebook class="size-4 text-primary" />
                        )}
                      </div>
                      <div class="flex-1">
                        <p class="text-sm text-foreground font-medium">{event.title}</p>
                        <div class="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{event.date}</span>
                          {event.repo && (
                            <>
                              <span>•</span>
                              <span class="text-primary">{event.repo}</span>
                            </>
                          )}
                          {event.action && (
                            <>
                              <span>•</span>
                              <span>{event.action}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {event.link && (
                      <button 
                        class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
                        onClick={() => {
                          if (event.link) {
                            window.location.href = event.link;
                          }
                        }}
                      >
                        <IconSearch class="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Show>
          </div>
        </div>
        
        {/* Activity Feed - Enhanced from Activity page */}
        <div class="lg:col-span-2 border rounded-lg p-4 h-full">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <IconClock class="size-4 text-muted-foreground" />
              <h3 class="font-semibold">Activity Feed</h3>
            </div>
            <button 
              onClick={() => setActivityRefreshKey(prev => prev + 1)}
              class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
            >
              <IconRefresh class="size-4" />
            </button>
          </div>
          <ActivityFeed 
            limit={10} 
            refreshKey={activityRefreshKey()} 
            showFilter={false}
          />
        </div>
      </div>

      {/* Browser Search Section - Collapsible - Only show if search credentials are available */}
      <Show when={isSearchAvailable()}>
        <div class="mb-8">
          <div class="border rounded-lg">
            {/* Collapsible Header */}
            <button
              onClick={() => {
                const newState = !showBrowserSearch();
                setShowBrowserSearch(newState);
                localStorage.setItem('showBrowserSearch', newState.toString());
              }}
              class="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors rounded-t-lg"
            >
              <div class="flex items-center gap-2">
                <IconSearch class="size-4 text-primary" />
                <h2 class="text-lg font-semibold">Browser Search</h2>
                <span class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Powered by Brave Search
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-muted-foreground">
                  {showBrowserSearch() ? 'Hide' : 'Show'}
                </span>
                <IconChevronDown 
                  class={`size-4 text-muted-foreground transition-transform duration-200 ${
                    showBrowserSearch() ? 'rotate-180' : ''
                  }`} 
                />
              </div>
            </button>
            
            {/* Collapsible Content */}
            <Show when={showBrowserSearch()}>
              <div class="border-t border-border p-4">
                <BrowserSearch />
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* Popular Tags Section */}
      <div class="mb-8">
        <div class="border rounded-lg p-4">
          <div class="flex items-center gap-2 mb-4">
            <IconSearch class="size-4 text-primary" />
            <h3 class="font-semibold">Popular Tags</h3>
          </div>
          <Show
            when={stats().topTags.length > 0}
            fallback={<p class="text-sm text-muted-foreground">No tags yet.</p>}
          >
            <div class="flex flex-wrap gap-2">
              {stats().topTags.map((tag) => (
                <button
                  class="inline-flex gap-2 px-2.5 py-1 rounded-lg items-center bg-muted group hover:underline text-xs"
                  onClick={() =>
                    navigate(
                      `/app/search?tag=${encodeURIComponent(tag.name)}&query=${encodeURIComponent(tag.name)}`
                    )
                  }
                >
                  <span
                    class="size-1.5 rounded-full"
                    style={`background-color: ${tag.color}`}
                  ></span>
                  <span class="font-medium">{tag.name}</span>
                  <span class="text-[10px] text-muted-foreground">({tag.count})</span>
                </button>
              ))}
            </div>
          </Show>
        </div>
      </div>

      {/* Latest Documents Section */}
      <h2 class="text-lg font-semibold mb-4">Latest imported documents</h2>
      
      <div>
        <div class="w-full overflow-auto">
          <table class="w-full caption-bottom text-sm text-nowrap">
            <thead class="[&_tr]:border-b">
              <tr class="border-b transition-colors data-[state=selected]:bg-muted">
                <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">File name</th>
                <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                  <span class="hidden sm:block">Tags</span>
                </th>
                <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                  <span class="hidden sm:block">Created at</span>
                </th>
                <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                  <span class="block text-right">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody class="[&_tr:last-child]:border-0">
              <Show
                when={paginatedDocuments().length > 0}
                fallback={
                  <tr>
                    <td colSpan={4} class="p-8 text-center text-sm text-muted-foreground">
                      No documents yet.
                    </td>
                  </tr>
                }
              >
                {paginatedDocuments().map((doc) => {
                  const fileIconData = getFileIcon(doc.type);
                  const FileIcon = fileIconData.icon;
                  const iconColor = fileIconData.color;
                  return (
                    <tr class="border-b transition-colors data-[state=selected]:bg-muted" data-state="false">
                      <td class="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        <div class="overflow-hidden flex gap-4 items-center">
                          <div class="bg-muted flex items-center justify-center p-2 rounded-lg">
                            <FileIcon class={`size-6 ${iconColor}`} />
                          </div>
                          <div class="flex-1 flex flex-col gap-1 truncate">
                            <button 
                              onClick={() => handlePreviewDocument(doc)}
                              class="font-bold truncate block hover:underline text-left"
                            >
                              {doc.name}
                            </button>
                            <div class="text-xs text-muted-foreground lh-tight">
                              {doc.size} - {doc.type} - <time>{doc.createdAt}</time>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        <div class="text-muted-foreground hidden sm:flex flex-wrap gap-1">
                          {doc.tags.map((tag) => (
                            <button 
                              onClick={() => navigate(`/app/search?tag=${encodeURIComponent(tag.name)}&query=${encodeURIComponent(tag.name)}`)}
                              class="inline-flex gap-2 px-2.5 py-1 rounded-lg items-center bg-muted group hover:bg-accent/50 hover:text-accent-foreground hover:underline text-xs transition-colors cursor-pointer"
                              title={`Search for "${tag.name}"`}
                            >
                              <span class="size-1.5 rounded-full" style={`background-color: ${tag.color}`}></span>
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td class="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        <time class="text-muted-foreground hidden sm:block">{doc.createdAt}</time>
                      </td>
                      <td class="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                        <div class="flex items-center justify-end">
                          <DropdownMenu
                            trigger={
                              <button type="button" class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-9 w-9">
                                <IconDotsVertical class="size-4" />
                              </button>
                            }
                          >
                            <DropdownMenuItem onClick={() => handlePreviewDocument(doc)} icon={IconEye}>
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadDocument(doc)} icon={IconDownload}>
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditDocument(doc)} icon={IconEdit}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteDocument(doc)} icon={IconTrash} variant="destructive">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </Show>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Show when={documents().length > 0}>
          <div class="flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-end mt-4">
            <div class="flex items-center space-x-2">
              <p class="whitespace-nowrap text-sm font-medium">Rows per page</p>
              <select
                value={rowsPerPage()}
                onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                class="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-shadow h-8 w-[4.5rem] text-foreground bg-card"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div class="flex items-center justify-center whitespace-nowrap text-sm font-medium">
              Page {currentPage()} of {totalPages()}
            </div>
            <div class="flex items-center space-x-2">
              <button 
                type="button" 
                disabled={currentPage() === 1}
                onClick={() => handlePageChange(1)}
                class="items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground flex size-8 p-0 disabled:opacity-50"
              >
                <IconChevronsLeft class="size-4" />
              </button>
              <button 
                type="button" 
                disabled={currentPage() === 1}
                onClick={() => handlePageChange(currentPage() - 1)}
                class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground size-8 disabled:opacity-50"
              >
                <IconChevronLeft class="size-4" />
              </button>
              <button 
                type="button" 
                disabled={currentPage() === totalPages()}
                onClick={() => handlePageChange(currentPage() + 1)}
                class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground size-8 disabled:opacity-50"
              >
                <IconChevronRight class="size-4" />
              </button>
              <button 
                type="button" 
                disabled={currentPage() === totalPages()}
                onClick={() => handlePageChange(totalPages())}
                class="items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground flex size-8 disabled:opacity-50"
              >
                <IconChevronsRight class="size-4" />
              </button>
            </div>
          </div>
        </Show>
      </div>


      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={showFilePreview()}
        onClose={() => setShowFilePreview(false)}
        file={selectedFile()}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal()}
        onClose={() => setShowUploadModal(false)}
      />

      {/* Bookmark Modal */}
      <BookmarkModal
        isOpen={showBookmarkModal()}
        onClose={() => setShowBookmarkModal(false)}
        onSubmit={handleBookmarkSubmit}
      />

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={showVideoModal()}
        onClose={() => setShowVideoModal(false)}
        onSubmit={handleVideoSubmit}
      />

      {/* Achievement Detail Modal */}
      <Show when={showAchievementModal() && selectedAchievement()}>
        <ModalPortal>
          <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold">Achievement Details</h3>
                <button
                  onClick={() => setShowAchievementModal(false)}
                  class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
                >
                  <IconX class="size-4" />
                </button>
              </div>
              <div class="space-y-4">
                <div>
                  <h4 class="font-medium text-foreground">{selectedAchievement().title}</h4>
                  <p class="text-sm text-muted-foreground mt-1">{selectedAchievement().date}</p>
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">
                    Congratulations on this achievement! This represents your hard work and dedication to your goals.
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                    {selectedAchievement().type || 'Achievement'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      </Show>

      {/* Deadline Detail Modal */}
      <Show when={showDeadlineModal() && selectedDeadline()}>
        <ModalPortal>
          <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold">Deadline Details</h3>
                <button
                  onClick={() => setShowDeadlineModal(false)}
                  class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
                >
                  <IconX class="size-4" />
                </button>
              </div>
              <div class="space-y-4">
                <div>
                  <h4 class="font-medium text-foreground">{selectedDeadline().title}</h4>
                  <p class="text-sm text-muted-foreground mt-1">{selectedDeadline().date}</p>
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">
                    This deadline requires your attention. Make sure to allocate sufficient time to complete this task.
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span class={`px-2 py-1 rounded text-xs font-medium ${
                    selectedDeadline().priority === 'high' ? 'bg-destructive/10 text-destructive' :
                    selectedDeadline().priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {selectedDeadline().priority || 'Normal'} Priority
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      </Show>

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={showFilePreview()}
        onClose={() => {
          setShowFilePreview(false);
          setSelectedFile(null);
        }}
        file={selectedFile()}
      />
    </div>
  );
};
