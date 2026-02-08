import { createSignal, onMount } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GitHubActivity } from '@/components/ui/GitHubActivity';
import { 
  IconBrandGithub, 
  IconTrendingUp, 
  IconFolder,
  IconStar,
  IconGitFork,
  IconEye,
  IconExternalLink,
  IconRefresh,
  IconActivity
} from '@tabler/icons-solidjs';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string;
  updated_at: string;
  created_at: string;
  size: number;
  open_issues_count: number;
  default_branch: string;
}

interface GitHubStats {
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  totalWatchers: number;
  languages: Array<{
    name: string;
    count: number;
    color: string;
  }>;
  recentActivity: Array<{
    type: string;
    repo: string;
    date: string;
    message: string;
  }>;
  repos: GitHubRepo[];
}

export const GitHub = () => {
  const [githubStats, setGithubStats] = createSignal<GitHubStats>({
    totalRepos: 0,
    totalStars: 0,
    totalForks: 0,
    totalWatchers: 0,
    languages: [],
    recentActivity: [],
    repos: []
  });
  
  const [weeklyActivity, setWeeklyActivity] = createSignal([0, 0, 0, 0, 0, 0, 0]);
  
  const [username, setUsername] = createSignal('');
  const [isConnected, setIsConnected] = createSignal(false);

  onMount(() => {
    // Check if user is authenticated and has GitHub connected
    checkGitHubConnection();
  });

  const checkGitHubConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        loadMockData();
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData.user.github_id) {
          setIsConnected(true);
          setUsername(userData.user.username);
          await fetchGitHubStats();
        } else {
          loadMockData();
        }
      } else {
        loadMockData();
      }
    } catch (error) {
      console.error('Failed to check GitHub connection:', error);
      loadMockData();
    }
  };
  const fetchGitHubStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/github/repos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch GitHub stats');
      }

      const data = await response.json();
      const repos = data.repos || [];

      // Process real GitHub data
      const languages = processLanguages(repos);
      const recentActivity = generateRecentActivity(repos);
      
      const totalStars = repos.reduce((sum: number, repo: GitHubRepo) => sum + repo.stargazers_count, 0);
      const totalForks = repos.reduce((sum: number, repo: GitHubRepo) => sum + repo.forks_count, 0);
      const totalWatchers = repos.reduce((sum: number, repo: GitHubRepo) => sum + repo.watchers_count, 0);

      setGithubStats({
        totalRepos: repos.length,
        totalStars,
        totalForks,
        totalWatchers,
        languages,
        recentActivity,
        repos
      });

    } catch (error) {
      console.error('Failed to fetch GitHub stats:', error);
      // Fallback to mock data
      loadMockData();
    }
  };

  const processLanguages = (repos: GitHubRepo[]) => {
    const languageMap = new Map<string, number>();
    
    repos.forEach(repo => {
      if (repo.language) {
        languageMap.set(repo.language, (languageMap.get(repo.language) || 0) + 1);
      }
    });

    return Array.from(languageMap.entries()).map(([name, count]) => ({
      name,
      count,
      color: getLanguageColor()
    }));
  };

  const generateRecentActivity = (repos: GitHubRepo[]) => {
    // Sort repos by updated_at and take recent ones
    const sortedRepos = repos
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);

    return sortedRepos.map(repo => ({
      type: 'push',
      repo: repo.name,
      date: formatDate(repo.updated_at),
      message: `Updated ${repo.name}`
    }));
  };

  const loadMockData = () => {
    // Load mock data for demonstration
    const mockRepos: GitHubRepo[] = [
      {
        id: 1,
        name: 'trackeep',
        full_name: 'demo/trackeep',
        description: 'A comprehensive productivity and bookmark management system',
        html_url: 'https://github.com/demo/trackeep',
        stargazers_count: 156,
        forks_count: 42,
        watchers_count: 28,
        language: 'TypeScript',
        updated_at: '2024-01-28T10:30:00Z',
        created_at: '2023-06-15T14:20:00Z',
        size: 2456,
        open_issues_count: 3,
        default_branch: 'main'
      },
      {
        id: 2,
        name: 'solid-components',
        full_name: 'demo/solid-components',
        description: 'Reusable SolidJS components for modern web applications',
        html_url: 'https://github.com/demo/solid-components',
        stargazers_count: 89,
        forks_count: 23,
        watchers_count: 15,
        language: 'TypeScript',
        updated_at: '2024-01-27T16:45:00Z',
        created_at: '2023-08-22T09:15:00Z',
        size: 1234,
        open_issues_count: 1,
        default_branch: 'main'
      }
    ];

    const languages = [
      { name: 'TypeScript', count: 2, color: '#3178c6' },
      { name: 'Go', count: 1, color: '#00ADD8' }
    ];

    const recentActivity = [
      {
        type: 'push',
        repo: 'trackeep',
        date: '2024-01-28',
        message: 'feat: add GitHub integration'
      }
    ];

    // Generate mock weekly activity data
    const mockWeeklyActivity = [
      Math.floor(Math.random() * 20) + 5,  // Monday
      Math.floor(Math.random() * 25) + 8,  // Tuesday
      Math.floor(Math.random() * 22) + 6,  // Wednesday
      Math.floor(Math.random() * 18) + 4,  // Thursday
      Math.floor(Math.random() * 15) + 3,  // Friday
      Math.floor(Math.random() * 12) + 2,  // Saturday
      Math.floor(Math.random() * 10) + 1   // Sunday
    ];

    setWeeklyActivity(mockWeeklyActivity);

    setGithubStats({
      totalRepos: mockRepos.length,
      totalStars: mockRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
      totalForks: mockRepos.reduce((sum, repo) => sum + repo.forks_count, 0),
      totalWatchers: mockRepos.reduce((sum, repo) => sum + repo.watchers_count, 0),
      languages,
      recentActivity,
      repos: mockRepos
    });
  };

  const connectGitHub = () => {
    // Redirect to centralized OAuth service
    window.location.href = 'https://oauth.tdvorak.dev/auth/github?redirect_uri=' + encodeURIComponent(window.location.origin + '/api/v1/auth/oauth/callback');
  };

  const disconnectGitHub = async () => {
    try {
      // In a real implementation, you might want to disconnect the GitHub account
      // For now, we'll just clear the local state
      setIsConnected(false);
      setUsername('');
      loadMockData();
    } catch (error) {
      console.error('Failed to disconnect GitHub:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getLanguageColor = () => {
    // Use primary color for all languages instead of language-specific colors
    return 'hsl(var(--primary))';
  };

  return (
    <div class="p-6 space-y-6 overflow-x-hidden max-w-full">
      {/* Header */}
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-foreground">GitHub Integration</h1>
          <p class="text-muted-foreground mt-2">Track your GitHub repositories and activity</p>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          {isConnected() ? (
            <>
              <Button variant="outline" size="sm" onClick={() => fetchGitHubStats()}>
                <IconRefresh class="size-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={disconnectGitHub}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button onClick={connectGitHub}>
              <IconBrandGithub class="size-4 mr-2" />
              Connect GitHub
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      {isConnected() && (
        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 flex items-center justify-center p-2 rounded-lg">
              <IconBrandGithub class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-sm font-medium text-foreground">Connected as @{username()}</p>
              <p class="text-xs text-muted-foreground">Syncing data from GitHub API</p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Overview - 2-column layout with larger left column */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Main Stats */}
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card class="p-6">
              <div class="flex items-center gap-3">
                <div class="bg-primary/10 flex items-center justify-center p-3 rounded-lg">
                  <IconFolder class="size-6 text-primary" />
                </div>
                <div>
                  <p class="text-2xl font-bold text-foreground">{githubStats().totalRepos}</p>
                  <p class="text-sm text-muted-foreground">Repositories</p>
                </div>
              </div>
            </Card>

            <Card class="p-6">
              <div class="flex items-center gap-3">
                <div class="bg-primary/10 flex items-center justify-center p-3 rounded-lg">
                  <IconStar class="size-6 text-primary" />
                </div>
                <div>
                  <p class="text-2xl font-bold text-foreground">{githubStats().totalStars}</p>
                  <p class="text-sm text-muted-foreground">Total Stars</p>
                </div>
              </div>
            </Card>

            <Card class="p-6">
              <div class="flex items-center gap-3">
                <div class="bg-primary/10 flex items-center justify-center p-3 rounded-lg">
                  <IconGitFork class="size-6 text-primary" />
                </div>
                <div>
                  <p class="text-2xl font-bold text-foreground">{githubStats().totalForks}</p>
                  <p class="text-sm text-muted-foreground">Total Forks</p>
                </div>
              </div>
            </Card>

            <Card class="p-6">
              <div class="flex items-center gap-3">
                <div class="bg-primary/10 flex items-center justify-center p-3 rounded-lg">
                  <IconEye class="size-6 text-primary" />
                </div>
                <div>
                  <p class="text-2xl font-bold text-foreground">{githubStats().totalWatchers}</p>
                  <p class="text-sm text-muted-foreground">Watchers</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column - Additional Stats */}
        <div class="space-y-4">
          {/* Additional GitHub stats can go here */}
          <Card class="p-6">
            <div class="flex items-center gap-3">
              <div class="bg-primary/10 flex items-center justify-center p-3 rounded-lg">
                <IconActivity class="size-6 text-primary" />
              </div>
              <div>
                <p class="text-2xl font-bold text-foreground">{weeklyActivity().reduce((a, b) => a + b, 0)}</p>
                <p class="text-sm text-muted-foreground">Weekly Activity</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Two-way Grid: Contribution Graph and Languages - Responsive */}
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Contribution Graph - Left Column (2/3 width on large screens) */}
        <div class="xl:w-2/3">
          <GitHubActivity 
            title="Contribution Activity"
            showStats={false}
            showContributionGraph={true}
            showRecentActivity={false}
            compact={true}
            period="year"
            fullWidth={true}
            hideHeader={false}
          />
        </div>

        {/* Languages - Right Column (1/3 width on large screens) */}
        <Card class="p-6 xl:w-1/3">
          <h3 class="text-lg font-semibold text-foreground mb-4">Languages</h3>
          <div class="space-y-3">
            {githubStats().languages.map((language) => (
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div 
                    class="w-3 h-3 rounded-full flex-shrink-0"
                    style={`background-color: ${language.color}`}
                  ></div>
                  <span class="text-sm text-foreground truncate">{language.name}</span>
                </div>
                <span class="text-sm text-muted-foreground flex-shrink-0">{language.count} repos</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Weekly Activity Chart */}
      <Card class="p-6">
        <div class="flex items-center gap-2 mb-4">
          <IconActivity class="size-5 text-primary" />
          <h3 class="text-lg font-semibold text-foreground">Weekly Activity</h3>
        </div>
        <div class="space-y-4">
          <div class="relative h-32 md:h-36 px-6 weekly-activity-chart">
            <div class="absolute inset-x-0 inset-y-2 pointer-events-none flex flex-col justify-between">
              <div class="border-t border-border/60"></div>
              <div class="border-t border-border/40"></div>
              <div class="border-t border-border/30"></div>
              <div class="border-t border-border/20"></div>
            </div>
            <div class="relative flex items-end justify-between h-full gap-3 md:gap-4">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
                const weeklyActivityData = weeklyActivity() || [12, 19, 8, 15, 22, 18, 25]; // Fallback data
                const activity = weeklyActivityData[index];
                const maxActivity = Math.max(...weeklyActivityData);
                // Use dynamic scale based on actual data
                const fixedMax = Math.max(maxActivity, 30); // Ensure minimum scale for better visualization
                const containerHeight = 128; // h-32 = 128px (base), md:h-36 = 144px
                const availableHeight = containerHeight * 0.75; // Use 75% of container height to leave room for labels
                const heightPercent = (activity / fixedMax) * (availableHeight / containerHeight) * 100;
                const minHeightPercent = (8 / containerHeight) * 100; // Minimum 8px height
                const finalHeightPercent = Math.max(heightPercent, minHeightPercent);

                return (
                  <div class="flex flex-col items-center flex-1 gap-2 group min-w-0 max-w-8">
                    <div class="relative w-full max-w-4 md:max-w-5 flex flex-col items-center">
                      <span class="text-xs font-medium text-primary mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap absolute -top-5">
                        {activity}
                      </span>
                      <div 
                        class="w-full max-w-4 md:max-w-5 bg-primary rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer hover:scale-105 weekly-bar"
                        style={`height: ${finalHeightPercent}%; background-color: hsl(199, 89%, 67%); min-height: 8px;`}
                        title={`${day}: ${activity} contributions`}
                      ></div>
                    </div>
                    <span class="text-xs text-muted-foreground font-medium mt-1">{day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div class="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <span>Total: {weeklyActivity().reduce((a, b) => a + b, 0)} contributions</span>
            <span>Avg: {Math.round(weeklyActivity().reduce((a, b) => a + b, 0) / 7)} per day</span>
          </div>
        </div>
      </Card>

      
      {/* Recent Activity */}
      <Card class="p-6">
        <h3 class="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <div class="space-y-3">
          {githubStats().recentActivity.map((activity) => (
            <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div class="flex items-center gap-3">
                <div class="bg-primary/10 p-2 rounded-lg">
                  <IconTrendingUp class="size-4 text-primary" />
                </div>
                <div>
                  <p class="text-sm text-foreground">{activity.message}</p>
                  <p class="text-xs text-muted-foreground">{activity.repo} • {activity.date}</p>
                </div>
              </div>
              <span class="text-xs text-muted-foreground capitalize">{activity.type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Repositories */}
      <Card class="p-6">
        <h3 class="text-lg font-semibold text-foreground mb-4">Repositories</h3>
        <div class="space-y-4">
          {githubStats().repos.map((repo) => (
            <div class="border border-border rounded-lg p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h4 class="text-lg font-medium text-foreground">{repo.name}</h4>
                    {repo.language && (
                      <span 
                        class="text-xs px-2 py-1 rounded-full"
                        style={`background-color: ${getLanguageColor()}20; color: ${getLanguageColor()}`}
                      >
                        {repo.language}
                      </span>
                    )}
                  </div>
                  <p class="text-sm text-muted-foreground mb-3">{repo.description}</p>
                  <div class="flex items-center gap-4 text-xs text-muted-foreground">
                    <div class="flex items-center gap-1">
                      <IconStar class="size-3" />
                      <span>{repo.stargazers_count}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <IconGitFork class="size-3" />
                      <span>{repo.forks_count}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <IconEye class="size-3" />
                      <span>{repo.watchers_count}</span>
                    </div>
                    <span>Updated {formatDate(repo.updated_at)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <IconExternalLink class="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
