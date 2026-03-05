import { createSignal, onMount } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GitHubActivity } from '@/components/ui/GitHubActivity';
import { getApiV1BaseUrl } from '@/lib/api-url';
import { startGitHubOAuth } from '@/lib/oauth';
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
import { useHaptics } from '@/lib/haptics';

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

interface GitHubAppInstallation {
  installation_id: number;
  account_login: string;
  account_type: string;
}

interface GitHubAppStatus {
  app_slug: string;
  install_enabled: boolean;
  credentials_configured: boolean;
  installed: boolean;
  installation?: GitHubAppInstallation;
}

interface GitHubBackupRecord {
  id: number;
  repository_full_name: string;
  local_path: string;
  source: string;
  last_backup_status: string;
  last_backup_error?: string;
  last_backup_at?: string;
  last_backup_size: number;
}

interface GitHubBackupResult {
  repository: string;
  status: string;
  local_path?: string;
  source: string;
  size_bytes?: number;
  error?: string;
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

const API_BASE_URL = getApiV1BaseUrl();

export const GitHub = () => {
  const haptics = useHaptics();
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
  const [appStatus, setAppStatus] = createSignal<GitHubAppStatus>({
    app_slug: '',
    install_enabled: false,
    credentials_configured: false,
    installed: false
  });
  const [backups, setBackups] = createSignal<GitHubBackupRecord[]>([]);
  const [backupRoot, setBackupRoot] = createSignal('');
  const [selectedRepos, setSelectedRepos] = createSignal<string[]>([]);
  const [isBackingUp, setIsBackingUp] = createSignal(false);
  const [isInstallingApp, setIsInstallingApp] = createSignal(false);
  const [backupMessage, setBackupMessage] = createSignal('');
  const [backupError, setBackupError] = createSignal('');

  const weeklyTotal = () => weeklyActivity().reduce((a, b) => a + b, 0);
  const selectedCount = () => selectedRepos().length;

  const getAuthToken = () => {
    return localStorage.getItem('trackeep_token') || localStorage.getItem('token') || '';
  };

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('github_app_installed') === '1') {
      setBackupMessage('GitHub App installation completed successfully.');
      window.history.replaceState({}, '', window.location.pathname);
    }
    const callbackError = params.get('github_app_error');
    if (callbackError) {
      setBackupError(`GitHub App setup failed: ${callbackError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
    checkGitHubConnection();
  });

  const resetGitHubData = () => {
    setWeeklyActivity([0, 0, 0, 0, 0, 0, 0]);
    setGithubStats({
      totalRepos: 0,
      totalStars: 0,
      totalForks: 0,
      totalWatchers: 0,
      languages: [],
      recentActivity: [],
      repos: []
    });
    setSelectedRepos([]);
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
    const sortedRepos = [...repos]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);

    return sortedRepos.map(repo => ({
      type: 'push',
      repo: repo.name,
      date: formatDate(repo.updated_at),
      message: `Updated ${repo.name}`
    }));
  };

  const updateStatsFromRepos = (repos: GitHubRepo[]) => {
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
    setSelectedRepos(prev => prev.filter(repoName => repos.some(repo => repo.full_name === repoName)));
  };

  const extractRepos = (payload: unknown): GitHubRepo[] => {
    if (Array.isArray(payload)) {
      return payload as GitHubRepo[];
    }
    if (payload && typeof payload === 'object' && Array.isArray((payload as { repos?: unknown[] }).repos)) {
      return (payload as { repos: GitHubRepo[] }).repos;
    }
    return [];
  };

  const fetchGitHubAppStatus = async (): Promise<GitHubAppStatus | null> => {
    try {
      const token = getAuthToken();
      if (!token) {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/github/app/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as GitHubAppStatus;
      setAppStatus({
        app_slug: data.app_slug || '',
        install_enabled: Boolean(data.install_enabled),
        credentials_configured: Boolean(data.credentials_configured),
        installed: Boolean(data.installed),
        installation: data.installation
      });
      return data;
    } catch (error) {
      console.error('Failed to fetch GitHub App status:', error);
      return null;
    }
  };

  const fetchGitHubBackups = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/github/backups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const backupList = Array.isArray(data?.backups) ? (data.backups as GitHubBackupRecord[]) : [];
      setBackups(backupList);
      setBackupRoot(typeof data?.backup_root === 'string' ? data.backup_root : '');
    } catch (error) {
      console.error('Failed to fetch GitHub backups:', error);
    }
  };

  const fetchRepos = async (endpoint: string): Promise<boolean> => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch GitHub repositories');
      }

      const data = await response.json();
      const repos = extractRepos(data);
      updateStatsFromRepos(repos);
      return true;
    } catch (error) {
      console.error('Failed to fetch GitHub repositories:', error);
      return false;
    }
  };

  const fetchGitHubStats = async () => {
    const loaded = await fetchRepos('/github/repos');
    if (!loaded) {
      resetGitHubData();
    }
  };

  const fetchGitHubAppRepos = async () => {
    const loaded = await fetchRepos('/github/app/repos');
    if (!loaded) {
      resetGitHubData();
    }
  };

  const checkGitHubConnection = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setIsConnected(false);
        setUsername('');
        setAppStatus({
          app_slug: '',
          install_enabled: false,
          credentials_configured: false,
          installed: false
        });
        setBackups([]);
        setBackupRoot('');
        setBackupMessage('');
        setBackupError('');
        resetGitHubData();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const appInfo = await fetchGitHubAppStatus();
      await fetchGitHubBackups();
      if (!response.ok) {
        resetGitHubData();
        return;
      }

      const userData = await response.json();
      const hasOAuthConnection = Boolean(userData?.user?.github_id);
      setUsername(typeof userData?.user?.username === 'string' ? userData.user.username : '');
      setIsConnected(hasOAuthConnection);

      if (hasOAuthConnection) {
        await fetchGitHubStats();
        return;
      }

      if (appInfo?.installed && appInfo.credentials_configured) {
        await fetchGitHubAppRepos();
        return;
      }

      resetGitHubData();
    } catch (error) {
      console.error('Failed to check GitHub connection:', error);
      resetGitHubData();
    }
  };

  const connectGitHub = () => {
    startGitHubOAuth();
  };

  const installGitHubApp = async () => {
    try {
      setIsInstallingApp(true);
      setBackupError('');

      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE_URL}/github/app/install-url`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok || !data?.install_url) {
        const message = typeof data?.error === 'string' ? data.error : 'Failed to create install URL';
        throw new Error(message);
      }

      window.location.href = data.install_url as string;
    } catch (error) {
      console.error('Failed to start GitHub App installation:', error);
      setBackupError(error instanceof Error ? error.message : 'Failed to start GitHub App installation');
      haptics.warning();
    } finally {
      setIsInstallingApp(false);
    }
  };

  const toggleRepoSelection = (repoFullName: string) => {
    setSelectedRepos(prev => (
      prev.includes(repoFullName)
        ? prev.filter(name => name !== repoFullName)
        : [...prev, repoFullName]
    ));
  };

  const selectAllRepos = () => {
    setSelectedRepos(githubStats().repos.map(repo => repo.full_name));
  };

  const clearRepoSelection = () => {
    setSelectedRepos([]);
  };

  const backupSelectedRepositories = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token');
      }
      if (selectedRepos().length === 0) {
        return;
      }

      setIsBackingUp(true);
      setBackupMessage('');
      setBackupError('');

      const source = appStatus().installed ? 'github_app' : 'oauth';
      const response = await fetch(`${API_BASE_URL}/github/backups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repositories: selectedRepos(),
          source
        })
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMessage = typeof data?.error === 'string' ? data.error : 'Backup failed';
        throw new Error(errorMessage);
      }

      const results = Array.isArray(data?.results) ? (data.results as GitHubBackupResult[]) : [];
      const failed = Number(data?.failed ?? 0);
      const backedUp = Number(data?.backed_up ?? 0);
      const firstFailure = results.find(result => result.status !== 'success');
      if (failed > 0 && firstFailure?.error) {
        setBackupError(firstFailure.error);
      }

      setBackupMessage(`Backups completed: ${backedUp} succeeded, ${failed} failed.`);
      await fetchGitHubBackups();
      haptics.impact();
    } catch (error) {
      console.error('Failed to backup repositories:', error);
      setBackupError(error instanceof Error ? error.message : 'Failed to backup repositories');
      haptics.warning();
    } finally {
      setIsBackingUp(false);
    }
  };

  const disconnectGitHub = async () => {
    try {
      setIsConnected(false);
      setUsername('');
      resetGitHubData();
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
          <Button variant="outline" size="sm" onClick={() => {
            checkGitHubConnection();
            haptics.selection();
          }}>
            <IconRefresh class="size-4 mr-2" />
            Refresh
          </Button>
          {isConnected() ? (
            <Button variant="outline" size="sm" onClick={() => {
              disconnectGitHub();
              haptics.warning();
            }}>
              Disconnect
            </Button>
          ) : (
            <Button onClick={() => {
              connectGitHub();
              haptics.impact();
            }}>
              <IconBrandGithub class="size-4 mr-2" />
              Connect GitHub
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      {(isConnected() || (appStatus().installed && appStatus().credentials_configured)) && (
        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 flex items-center justify-center p-2 rounded-lg">
              <IconBrandGithub class="size-5 text-primary" />
            </div>
            <div>
              <p class="text-sm font-medium text-foreground">
                {isConnected() ? `Connected via OAuth as @${username()}` : `Connected via GitHub App as @${username()}`}
              </p>
              <p class="text-xs text-muted-foreground">
                {isConnected() ? 'Syncing data from GitHub OAuth API' : 'Syncing data from GitHub App installation'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* GitHub App Status */}
      <Card class="p-4">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p class="text-sm font-medium text-foreground">GitHub App Backup Access</p>
            {appStatus().install_enabled ? (
              <p class="text-xs text-muted-foreground mt-1">
                {appStatus().installed
                  ? `Installed${appStatus().installation?.account_login ? ` for ${appStatus().installation?.account_login}` : ''}`
                  : 'Not installed yet'}
              </p>
            ) : (
              <p class="text-xs text-muted-foreground mt-1">
                GitHub App install is not configured on this server.
              </p>
            )}
            {appStatus().install_enabled && !appStatus().credentials_configured && (
              <p class="text-xs text-amber-500 mt-1">
                App credentials are missing (`GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`).
              </p>
            )}
          </div>
          <div class="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => fetchGitHubAppStatus()}>
              Refresh App Status
            </Button>
            <Button
              size="sm"
              disabled={!appStatus().install_enabled || isInstallingApp()}
              onClick={() => installGitHubApp()}
            >
              {isInstallingApp() ? 'Opening...' : (appStatus().installed ? 'Reinstall GitHub App' : 'Install GitHub App')}
            </Button>
          </div>
        </div>
      </Card>

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
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contribution Graph - Left Column (larger) */}
        <div class="lg:col-span-1">
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

        {/* Languages - Right Column (smaller) */}
        <Card class="p-6 lg:col-span-1">
          <h3 class="text-lg font-semibold text-foreground mb-4">Languages</h3>
          {githubStats().languages.length === 0 ? (
            <p class="text-sm text-muted-foreground">No language data yet.</p>
          ) : (
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
          )}
        </Card>
      </div>

      {/* Weekly Activity Chart */}
      <Card class="p-6">
        <div class="flex items-center gap-2 mb-4">
          <IconActivity class="size-5 text-primary" />
          <h3 class="text-lg font-semibold text-foreground">Weekly Activity</h3>
        </div>
        <div class="space-y-4">
          {weeklyTotal() === 0 ? (
            <div class="h-32 md:h-36 border border-dashed border-border rounded-lg flex items-center justify-center">
              <p class="text-sm text-muted-foreground">No weekly GitHub activity yet.</p>
            </div>
          ) : (
            <div class="relative h-32 md:h-36 px-6 weekly-activity-chart">
              <div class="absolute inset-x-0 inset-y-2 pointer-events-none flex flex-col justify-between">
                <div class="border-t border-border/60"></div>
                <div class="border-t border-border/40"></div>
                <div class="border-t border-border/30"></div>
                <div class="border-t border-border/20"></div>
              </div>
              <div class="relative flex items-end justify-between h-full gap-3 md:gap-4">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
                  const weeklyActivityData = weeklyActivity();
                  const activity = weeklyActivityData[index];
                  const maxActivity = Math.max(...weeklyActivityData, 1);
                  const heightPercent = (activity / maxActivity) * 85;
                  const finalHeightPercent = activity > 0 ? Math.max(heightPercent, 6) : 0;

                  return (
                    <div class="flex flex-col items-center flex-1 gap-2 group min-w-0 max-w-8 h-full">
                      <div class="relative w-full max-w-4 md:max-w-5 flex flex-col items-center justify-end h-full">
                        <span class="text-xs font-medium text-primary mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap absolute -top-5 z-10">
                          {activity}
                        </span>
                        <div 
                          class="w-full max-w-4 md:max-w-5 bg-primary rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer hover:scale-105 weekly-bar"
                          style={`height: ${finalHeightPercent}%; background-color: hsl(199, 89%, 67%);`}
                          title={`${day}: ${activity} contributions`}
                        ></div>
                      </div>
                      <span class="text-xs text-muted-foreground font-medium mt-1">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div class="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <span>Total: {weeklyTotal()} contributions</span>
            <span>Avg: {Math.round(weeklyTotal() / 7)} per day</span>
          </div>
        </div>
      </Card>

      
      {/* Recent Activity */}
      <Card class="p-6">
        <h3 class="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        {githubStats().recentActivity.length === 0 ? (
          <p class="text-sm text-muted-foreground">No recent GitHub events yet.</p>
        ) : (
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
        )}
      </Card>

      {/* Repositories */}
      <Card class="p-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 class="text-lg font-semibold text-foreground">Repositories</h3>
          {githubStats().repos.length > 0 && (
            <div class="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => selectAllRepos()}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={() => clearRepoSelection()} disabled={selectedCount() === 0}>
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => backupSelectedRepositories()}
                disabled={selectedCount() === 0 || isBackingUp()}
              >
                {isBackingUp() ? 'Backing Up...' : `Backup Selected (${selectedCount()})`}
              </Button>
            </div>
          )}
        </div>

        {backupMessage() && (
          <p class="text-sm text-emerald-500 mb-3">{backupMessage()}</p>
        )}
        {backupError() && (
          <p class="text-sm text-red-500 mb-3">{backupError()}</p>
        )}
        {backupRoot() && (
          <p class="text-xs text-muted-foreground mb-3">
            Backup root: <span class="font-mono break-all">{backupRoot()}</span>
          </p>
        )}
        {backups().length > 0 && (
          <div class="mb-4 p-3 border border-border rounded-lg bg-muted/30 space-y-2">
            <p class="text-xs font-medium text-foreground">Recent Local Backups</p>
            {backups().slice(0, 5).map((backup) => (
              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span class="truncate pr-2">{backup.repository_full_name}</span>
                <span class={backup.last_backup_status === 'success' ? 'text-emerald-500' : 'text-red-500'}>
                  {backup.last_backup_status}
                </span>
              </div>
            ))}
          </div>
        )}

        {githubStats().repos.length === 0 ? (
          <p class="text-sm text-muted-foreground">No repositories available yet.</p>
        ) : (
          <div class="space-y-4">
            {githubStats().repos.map((repo) => (
              <div class="border border-border rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <input
                    type="checkbox"
                    class="mt-1 h-4 w-4 rounded border-border accent-primary"
                    checked={selectedRepos().includes(repo.full_name)}
                    onChange={() => toggleRepoSelection(repo.full_name)}
                  />
                  <div class="flex-1 min-w-0">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(repo.html_url, '_blank', 'noopener,noreferrer')}
                    aria-label={`Open ${repo.full_name}`}
                  >
                    <IconExternalLink class="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
