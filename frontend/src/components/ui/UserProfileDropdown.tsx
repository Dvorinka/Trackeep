import { createSignal } from 'solid-js';
import { 
  IconUser, 
  IconSettings, 
  IconLogout, 
  IconChartLine, 
  IconChevronDown
} from '@tabler/icons-solidjs';
import { DropdownMenu, DropdownMenuItem } from './DropdownMenu';

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  role: string;
  joinDate: string;
}

export const UserProfileDropdown = () => {
  const [userProfile] = createSignal<UserProfile>({
    name: 'Admin User',
    email: 'admin@trackeep.com',
    role: 'Administrator',
    joinDate: '2024-01-01'
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

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      // In real app, this would clear auth tokens and redirect to login
      window.location.href = '/login';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu
      trigger={
        <button type="button" class="items-center justify-center rounded-md font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 py-1 text-base flex gap-2">
          <div class="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
            {getInitials(userProfile().name)}
          </div>
          <IconChevronDown class="size-3 opacity-50" />
        </button>
      }
    >
      {/* User Info Header */}
      <div class="px-3 py-2 border-b border-border">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
            {getInitials(userProfile().name)}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{userProfile().name}</p>
            <p class="text-xs text-muted-foreground truncate">{userProfile().email}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div class="px-3 py-2 border-b border-border">
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="text-center">
            <p class="font-medium text-primary">156</p>
            <p class="text-muted-foreground">Bookmarks</p>
          </div>
          <div class="text-center">
            <p class="font-medium text-primary">42</p>
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
