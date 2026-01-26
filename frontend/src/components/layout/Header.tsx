import { 
  IconBell, 
  IconSearch, 
  IconPlus,
  IconMoon,
  IconLogout,
  IconUser
} from '@tabler/icons-solidjs'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

export interface HeaderProps {
  class?: string
  title?: string
}

export function Header(props: HeaderProps) {
  const { authState, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header class={cn('flex h-16 items-center justify-between border-b border-[#262626] bg-[#141415] px-6', props.class)}>
      {/* Page Title */}
      <div class="flex items-center space-x-4">
        <h1 class="text-xl font-semibold text-[#fafafa]">
          {props.title || 'Dashboard'}
        </h1>
      </div>

      {/* Search and Actions */}
      <div class="flex items-center space-x-4">
        {/* Search */}
        <div class="relative">
          <IconSearch class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3a3a3]" />
          <Input
            type="search"
            placeholder="Search bookmarks, tasks, files..."
            class="w-80 pl-10 bg-[#141415] border-[#262626] text-[#fafafa] placeholder-[#a3a3a3]"
          />
        </div>

        {/* Quick Actions */}
        <div class="flex items-center space-x-2">
          <Button variant="ghost" size="icon" class="text-[#a3a3a3] hover:text-[#fafafa]">
            <IconPlus class="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" class="text-[#a3a3a3] hover:text-[#fafafa]">
            <IconBell class="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" class="text-[#a3a3a3] hover:text-[#fafafa]">
            <IconMoon class="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <div class="flex items-center space-x-2 pl-4 border-l border-[#262626]">
            <div class="flex items-center space-x-2">
              <div class="text-right">
                <p class="text-sm font-medium text-[#fafafa]">{authState.user?.full_name || authState.user?.username}</p>
                <p class="text-xs text-[#a3a3a3]">{authState.user?.email}</p>
              </div>
              <Button variant="ghost" size="icon" class="text-[#a3a3a3] hover:text-[#fafafa]">
                <IconUser class="h-5 w-5" />
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              class="text-[#a3a3a3] hover:text-[#fafafa]"
              onClick={handleLogout}
            >
              <IconLogout class="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
