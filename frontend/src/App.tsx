import { Router, Route } from '@solidjs/router'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ToastContainer } from '@/components/ui/Toast'
import { Dashboard } from '@/pages/misc/Dashboard'
import { Bookmarks } from '@/pages/content/Bookmarks'
import { Tasks } from '@/pages/productivity/Tasks'
import { Files } from '@/pages/content/Files'
import { Notes } from '@/pages/content/Notes'
import { Settings } from '@/pages/settings/Settings'
import { Login } from '@/pages/auth/Login'
import { Youtube } from '@/pages/content/Youtube'
import { Members } from '@/pages/admin/Members'
import { RemovedStuff } from '@/pages/misc/RemovedStuff'
import { AdminSettings } from '@/pages/admin/AdminSettings'
import { ColorSwitcher } from '@/pages/settings/ColorSwitcher'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { Stats } from '@/pages/productivity/Stats'
import { Profile } from '@/pages/auth/Profile'
import { LearningPaths } from '@/pages/content/LearningPaths'
import { GitHub } from '@/pages/content/GitHub'
import { TimeTracking } from '@/pages/productivity/TimeTracking'
import { Calendar } from '@/pages/productivity/Calendar'
import { WorkspaceSetup } from '@/pages/auth/WorkspaceSetup'
import { AuthCallback } from '@/pages/auth/AuthCallback'
import { AuthProvider, useAuth } from '@/lib/auth'
import { Search } from '@/pages/content/Search'
import { Analytics } from '@/pages/admin/Analytics'
import { ShareTarget } from '@/pages/misc/ShareTarget'
import BrowserExtensionSettings from '@/pages/settings/BrowserExtensionSettings'
import { initializeDemoMode, clearDemoMode, isEnvDemoMode } from '@/lib/demo-mode'
import { onMount, createEffect } from 'solid-js'
import { useNavigate } from '@solidjs/router'

// Initialize dark mode immediately before anything else
const initializeDarkMode = () => {
  // Check if user has a saved theme preference
  const savedTheme = localStorage.getItem('theme');
  const user = localStorage.getItem('user') || localStorage.getItem('trackeep_user');
  
  const root = document.documentElement;
  
  root.style.removeProperty('--foreground');
  root.style.removeProperty('--colors-foreground');
  root.style.removeProperty('--background');
  root.style.removeProperty('--colors-background');
  root.style.removeProperty('--primary');
  root.style.removeProperty('--colors-primary');
  root.style.removeProperty('--muted');
  root.style.removeProperty('--colors-muted');
  root.style.removeProperty('--border');
  root.style.removeProperty('--colors-border');
  
  if (user) {
    try {
      const userData = JSON.parse(user);
      // Prefer user's saved theme from profile, fallback to localStorage
      const userTheme = userData.theme || savedTheme;
      if (userTheme === 'dark') {
        root.setAttribute('data-kb-theme', 'dark');
      } else {
        root.removeAttribute('data-kb-theme');
      }
    } catch (e) {
      // Fallback to localStorage or dark mode if user data is invalid
      if (savedTheme === 'dark') {
        root.setAttribute('data-kb-theme', 'dark');
      } else {
        root.removeAttribute('data-kb-theme');
      }
    }
  } else if (savedTheme === 'dark') {
    root.setAttribute('data-kb-theme', 'dark');
  } else {
    // Default to dark mode
    root.setAttribute('data-kb-theme', 'dark');
  }
  
  const savedColorScheme = localStorage.getItem('colorScheme');
  if (savedColorScheme && savedColorScheme !== 'default') {
    const schemeColors: Record<string, string> = {
      'ocean': '#0077be',
      'forest': '#228b22',
      'sunset': '#ff6b35',
      'purple': '#8b5cf6',
    };
    const primary = schemeColors[savedColorScheme];
    if (primary) {
      const hexToHsl = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return '0 0% 100%';
        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      };
      const hsl = hexToHsl(primary);
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--colors-primary', hsl);
    }
  }
};

// Initialize dark mode immediately
initializeDarkMode();

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Component to handle root route logic
const RootRoute = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  createEffect(() => {
    // If demo mode is enabled and user is authenticated, navigate to app
    if (isEnvDemoMode() && authState.isAuthenticated && !authState.isLoading) {
      navigate('/app', { replace: true });
      return;
    }
    
    // If not demo mode and user is authenticated, navigate to app
    if (!isEnvDemoMode() && authState.isAuthenticated && !authState.isLoading) {
      navigate('/app', { replace: true });
      return;
    }
    
    // If not authenticated and not loading, show login
    if (!authState.isAuthenticated && !authState.isLoading) {
      navigate('/login', { replace: true });
      return;
    }
  });

  // Show loading spinner while checking auth
  return (
    <div class="min-h-screen bg-[#18181b] flex items-center justify-center px-4">
      <div class="text-center">
        <div class="inline-block w-8 h-8 border-2 border-[#39b9ff] border-r-transparent rounded-full animate-spin mb-3"></div>
        <p class="text-sm text-[#a3a3a3]">Loading...</p>
      </div>
    </div>
  );
};

function App() {
  // Initialize demo mode API interceptor and cleanup old demo data
  onMount(() => {
    // Clear demo mode if it's disabled in environment
    if (!isEnvDemoMode()) {
      clearDemoMode();
    }
    
    initializeDemoMode();
    // Ensure dark mode is set after component mount
    initializeDarkMode();
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Route path="/" component={RootRoute} />
          <Route path="/login" component={Login} />
          <Route path="/auth/callback" component={AuthCallback} />
          <Route path="/share-target" component={ShareTarget} />
          <Route path="/app" component={() => (
            <ProtectedRoute>
              <Layout title="Dashboard">
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/workspace-setup" component={() => (
            <ProtectedRoute>
              <Layout title="Workspace Setup">
                <WorkspaceSetup />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/bookmarks" component={() => (
            <ProtectedRoute>
              <Layout title="Bookmarks">
                <Bookmarks />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/tasks" component={() => (
            <ProtectedRoute>
              <Layout title="Tasks">
                <Tasks />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/time-tracking" component={() => (
            <ProtectedRoute>
              <Layout title="Time Tracking">
                <TimeTracking />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/calendar" component={() => (
            <ProtectedRoute>
              <Layout title="Calendar">
                <Calendar />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/search" component={() => (
            <ProtectedRoute>
              <Layout title="Enhanced Search">
                <Search />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/browser-extension" component={() => (
            <ProtectedRoute>
              <Layout title="Browser Extension Settings">
                <BrowserExtensionSettings />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/files" component={() => (
            <ProtectedRoute>
              <Layout title="Files">
                <Files />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/notes" component={() => (
            <ProtectedRoute>
              <Layout title="Notes">
                <Notes />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/youtube" component={() => (
            <ProtectedRoute>
              <Layout title="YouTube">
                <Youtube />
              </Layout>
            </ProtectedRoute>
          )} />

          <Route path="/app/members" component={() => (
            <ProtectedRoute>
              <Layout title="Members">
                <Members />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/removed-stuff" component={() => (
            <ProtectedRoute>
              <Layout title="Removed Stuff">
                <RemovedStuff />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/admin-settings" component={() => (
            <ProtectedRoute>
              <Layout title="Admin Settings">
                <AdminSettings />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/settings" component={() => (
            <ProtectedRoute>
              <Layout title="Settings">
                <Settings />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/color-switcher" component={() => (
            <ProtectedRoute>
              <Layout title="Color Switcher">
                <ColorSwitcher />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/stats" component={() => (
            <ProtectedRoute>
              <Layout title="Statistics">
                <Stats />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/analytics" component={() => (
            <ProtectedRoute>
              <Layout title="Analytics">
                <Analytics />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/profile" component={() => (
            <ProtectedRoute>
              <Layout title="Profile">
                <Profile />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/learning-paths" component={() => (
            <ProtectedRoute>
              <Layout title="Learning Paths">
                <LearningPaths />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/github" component={() => (
            <ProtectedRoute>
              <Layout title="GitHub">
                <GitHub />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/activity" component={() => {
            // Redirect to stats since we're combining activity and stats
            window.location.href = '/app/stats';
            return null;
          }} />
          <Route path="/admin" component={() => (
            <ProtectedRoute>
              <Layout title="Admin Dashboard">
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          )} />
        </Router>
        <ToastContainer />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
