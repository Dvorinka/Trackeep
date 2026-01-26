import { Router, Route } from '@solidjs/router'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Dashboard } from '@/pages/Dashboard'
import { Bookmarks } from '@/pages/Bookmarks'
import { Tasks } from '@/pages/Tasks'
import { Files } from '@/pages/Files'
import { Notes } from '@/pages/Notes'
import { Settings } from '@/pages/Settings'
import { Login } from '@/pages/Login'
import { AuthProvider } from '@/lib/auth'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Route path="/" component={Login} />
          <Route path="/login" component={Login} />
          <ProtectedRoute>
            <Layout>
              <Route path="/app" component={Dashboard} />
              <Route path="/app/bookmarks" component={Bookmarks} />
              <Route path="/app/tasks" component={Tasks} />
              <Route path="/app/files" component={Files} />
              <Route path="/app/notes" component={Notes} />
              <Route path="/app/settings" component={Settings} />
            </Layout>
          </ProtectedRoute>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
