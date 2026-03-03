import { Router, Route } from '@solidjs/router'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ToastContainer } from '@/components/ui/Toast'
import { Dashboard } from '@/pages/Dashboard'
import { Bookmarks } from '@/pages/Bookmarks'
import { Tasks } from '@/pages/Tasks'
import { Files } from '@/pages/Files'
import { Notes } from '@/pages/Notes'
import { AIChat } from '@/pages/AIChat'
import { Settings } from '@/pages/Settings'
import { Login } from '@/pages/Login'
import { Youtube } from '@/pages/Youtube'
import { Members } from '@/pages/Members'
import { RemovedStuff } from '@/pages/RemovedStuff'
import { AdminSettings } from '@/pages/AdminSettings'
import { ColorSwitcher } from '@/pages/ColorSwitcher'
import { AdminDashboard } from '@/pages/AdminDashboard'
import { Stats } from '@/pages/Stats'
import { Profile } from '@/pages/Profile'
import { LearningPaths } from '@/pages/LearningPaths'
import { GitHub } from '@/pages/GitHub'
import { TimeTracking } from '@/pages/TimeTracking'
import { Calendar } from '@/pages/Calendar'
import { AuthCallback } from '@/pages/AuthCallback'
import { AuthProvider, useAuth } from '@/lib/auth'
import { Search } from '@/pages/Search'
import { Analytics } from '@/pages/Analytics'
import { Messages } from '@/pages/Messages'
import BrowserExtensionSettings from '@/pages/BrowserExtensionSettings'
import { initializeDemoMode, clearDemoMode, isEnvDemoMode } from '@/lib/demo-mode'
import { onMount, createEffect } from 'solid-js'
import { useNavigate } from '@solidjs/router'

// Initialize dark mode immediately before anything else
const initializeDarkMode = () => {
  // Check if user has a saved theme preference
  const savedTheme = localStorage.getItem('theme');
  const user = localStorage.getItem('user') || localStorage.getItem('trackeep_user');
  
  if (user) {
    try {
      const userData = JSON.parse(user);
      // Prefer user's saved theme from profile, fallback to localStorage
      const userTheme = userData.theme || savedTheme;
      if (userTheme === 'dark') {
        document.documentElement.setAttribute('data-kb-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-kb-theme');
      }
    } catch (e) {
      // Fallback to localStorage or dark mode if user data is invalid
      if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-kb-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-kb-theme');
      }
    }
  } else if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-kb-theme', 'dark');
  } else {
    // Default to dark mode
    document.documentElement.setAttribute('data-kb-theme', 'dark');
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
          <Route path="/app" component={() => (
            <ProtectedRoute>
              <Layout title="Dashboard">
                <Dashboard />
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
          <Route path="/app/chat" component={() => (
            <ProtectedRoute>
              <Layout title="AI Chat" fullBleed>
                <AIChat />
              </Layout>
            </ProtectedRoute>
          )} />
          <Route path="/app/messages" component={() => (
            <ProtectedRoute>
              <Layout title="Messages" fullBleed>
                <Messages />
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
