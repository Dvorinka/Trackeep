import { createEffect, createMemo, createSignal } from 'solid-js';
import { 
  IconUser, 
  IconSettings, 
  IconLogout, 
  IconChartLine, 
  IconChevronDown
} from '@tabler/icons-solidjs';
import { DropdownMenu, DropdownMenuItem } from './DropdownMenu';
import { useAuth } from '@/lib/auth';
import { getApiV1BaseUrl } from '@/lib/api-url';

interface DashboardStats {
  totalBookmarks: number;
  totalTasks: number;
}

const API_BASE_URL = getApiV1BaseUrl();

export const UserProfileDropdown = () => {
  const { logout, authState } = useAuth();
  const [dashboardStats, setDashboardStats] = createSignal<DashboardStats>({
    totalBookmarks: 0,
    totalTasks: 0,
  });

  const displayName = createMemo(() => {
    const user = authState.user;
    if (!user) return 'User';
    return user.full_name?.trim() || user.username?.trim() || user.email?.split('@')[0] || 'User';
  });

  const displayEmail = createMemo(() => authState.user?.email || 'unknown@trackeep.com');

  const loadDashboardStats = async () => {
    if (!authState.isAuthenticated) {
      setDashboardStats({ totalBookmarks: 0, totalTasks: 0 });
      return;
    }

    const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
    if (!token) {
      setDashboardStats({ totalBookmarks: 0, totalTasks: 0 });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to load dashboard stats: ${response.status}`);
      }

      const data = await response.json();
      setDashboardStats({
        totalBookmarks: Number(data?.totalBookmarks || 0),
        totalTasks: Number(data?.totalTasks || 0),
      });
    } catch (error) {
      console.error('Failed to load user stats:', error);
      setDashboardStats({ totalBookmarks: 0, totalTasks: 0 });
    }
  };

  createEffect(() => {
    if (authState.isAuthenticated) {
      void loadDashboardStats();
      return;
    }
    setDashboardStats({ totalBookmarks: 0, totalTasks: 0 });
  });

  const handleProfileClick = () => {
    window.location.href = '/app/profile';
  };

  const handleSettingsClick = () => {
    window.location.href = '/app/settings';
  };

  const handleStatsClick = () => {
    window.location.href = '/app/stats';
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
      window.location.href = '/login';
    }
  };

  const getInitials = (name: string) => {
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
    return initials || 'U';
  };

  return (
    <DropdownMenu
      trigger={
        <button type="button" class="items-center justify-center rounded-md font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 py-1 text-base flex gap-2">
          <div class="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
            {getInitials(displayName())}
          </div>
          <IconChevronDown class="size-3 opacity-50" />
        </button>
      }
    >
      {/* User Info Header */}
      <div class="px-3 py-2 border-b border-border">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
            {getInitials(displayName())}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{displayName()}</p>
            <p class="text-xs text-muted-foreground truncate">{displayEmail()}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div class="px-3 py-2 border-b border-border">
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="text-center">
            <p class="font-medium text-primary">{dashboardStats().totalBookmarks}</p>
            <p class="text-muted-foreground">Bookmarks</p>
          </div>
          <div class="text-center">
            <p class="font-medium text-primary">{dashboardStats().totalTasks}</p>
            <p class="text-muted-foreground">Tasks</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <DropdownMenuItem onClick={handleProfileClick} icon={IconUser}>
        Profile
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleStatsClick} icon={IconChartLine}>
        Statistics
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleSettingsClick} icon={IconSettings}>
        Settings
      </DropdownMenuItem>
      
      <div class="border-t border-border my-1"></div>
      
      <DropdownMenuItem onClick={handleLogout} icon={IconLogout} variant="destructive">
        Logout
      </DropdownMenuItem>
    </DropdownMenu>
  );
};
