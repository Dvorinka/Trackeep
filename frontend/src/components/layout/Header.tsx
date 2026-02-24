import { 
  IconPlus,
  IconUpload,
  IconMoon,
  IconSettings,
  IconMenu2
} from '@tabler/icons-solidjs'
import { QuickSearch } from '@/components/search/QuickSearch'
import { ColorSwitcherDropdown } from '@/components/ui/ColorSwitcherDropdown'
import { UploadModal } from '@/components/ui/UploadModal'
import { UserProfileDropdown } from '@/components/ui/UserProfileDropdown'
import { createSignal } from 'solid-js'
import { useAuth } from '@/lib/auth'

export interface HeaderProps {
  class?: string
  title?: string
  onMenuClick?: () => void
}

export function Header(props: HeaderProps) {
  const [showUploadModal, setShowUploadModal] = createSignal(false);
  const { authState, updateProfile } = useAuth();

  const handleThemeToggle = async () => {
    const currentTheme = document.documentElement.getAttribute('data-kb-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Apply theme immediately
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-kb-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-kb-theme');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
    
    // Update user profile if authenticated
    if (authState.isAuthenticated && authState.user) {
      try {
        await updateProfile({ theme: newTheme });
      } catch (error) {
        console.error('Failed to update theme in profile:', error);
        // Still keep the local theme change even if profile update fails
      }
    }

    // Reload the page so all Papra CSS and color schemes re-initialize
    // and the theme change is fully applied without manual refresh
    window.location.reload();
  };

  return (
    <>
      <div class="flex justify-between px-6 pt-4 pb-4">
        {/* Left side */}
        <div class="flex items-center">
          {/* Menu button */}
          <button 
            type="button" 
            onClick={props.onMenuClick}
            aria-haspopup="dialog" 
            aria-expanded="false" 
            data-closed="" 
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-9 w-9 mr-2"
          >
            <IconMenu2 class="size-6" />
          </button>
          
          {/* Quick Search */}
          <QuickSearch />
        </div>

        {/* Right side */}
        <div class="flex items-center gap-2">
          {/* Drop zone overlay */}
          <div class="fixed top-0 left-0 w-screen h-screen z-80 bg-background bg-opacity-50 backdrop-blur transition-colors hidden">
            <div class="flex items-center justify-center h-full text-center flex-col">
              <IconPlus class="text-6xl text-muted-foreground mx-auto" />
              <div class="text-xl my-2 font-semibold text-muted-foreground">Drop files here</div>
              <div class="text-base text-muted-foreground">Drag and drop files here to import them</div>
            </div>
          </div>

          {/* Import button */}
          <button 
            type="button" 
            onClick={() => setShowUploadModal(true)}
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 text-base"
          >
            <IconUpload class="size-4 mr-2" />
            Import a document
          </button>

          {/* Color switcher dropdown */}
          <ColorSwitcherDropdown />

          {/* Theme switcher */}
          <button 
            type="button" 
            onClick={handleThemeToggle}
            class="items-center justify-center rounded-md font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 py-1 text-base hidden sm:flex"
          >
            <IconMoon class="size-4" />
          </button>

          {/* Admin link */}
          <a href="/app/admin-settings" class="items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 hidden sm:flex gap-2">
            <IconSettings class="size-4" />
            Admin
          </a>

          {/* User menu */}
          <UserProfileDropdown />
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal()}
        onClose={() => setShowUploadModal(false)}
      />
    </>
  )
}
