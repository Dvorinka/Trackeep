import { createSignal, onMount, For, Show } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  IconCalendar, 
  IconTrendingUp, 
  IconBook,
  IconFolder,
  IconExternalLink,
  IconGitBranch,
  IconGitMerge,
  IconGitPullRequest,
  IconGitCommit
} from '@tabler/icons-solidjs';

interface ActivityData {
  date: string;
  count: number;
  level: number; // 0-5 intensity level
}

interface ActivityEvent {
  type: 'push' | 'pull_request' | 'merge' | 'issue' | 'bookmark' | 'project' | 'learning' | 'note' | 'commit';
  title: string;
  date: string;
  link?: string;
  repo?: string;
  action?: string;
}

interface GitHubActivityProps {
  title?: string;
  showStats?: boolean;
  showContributionGraph?: boolean;
  showRecentActivity?: boolean;
  compact?: boolean;
  period?: 'year' | 'month' | 'week';
  customEvents?: ActivityEvent[];
  hideHeader?: boolean;
  fullWidth?: boolean;
}

export const GitHubActivity = (props: GitHubActivityProps) => {
  const [activities, setActivities] = createSignal<ActivityData[]>([]);
  const [recentEvents, setRecentEvents] = createSignal<ActivityEvent[]>([]);
  const [selectedPeriod, setSelectedPeriod] = createSignal<'year' | 'month' | 'week'>(props.period || 'year');
  
  const [stats, setStats] = createSignal({
    totalContributions: 0,
    currentStreak: 0,
    longestStreak: 0
  });

  onMount(() => {
    // Always show rich mock data for demonstration
    generateMockData();
    return;
    
    // Original real data loading logic (commented out for demo)
    /*
    if (isDemoMode()) {
      // In demo mode, always show rich mock data
      generateMockData();
      return;
    }

    loadRealData().catch((error) => {
      console.error('Failed to load GitHub activity analytics, falling back to mock data:', error);
      generateMockData();
    });
    */
  });

  const generateMockData = () => {
    const activityData: ActivityData[] = [];
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let totalContributions = 0;

    // Generate more realistic activity patterns
    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const monthsAgo = Math.floor((today.getTime() - d.getTime()) / (30 * 24 * 60 * 60 * 1000));
      
      // More realistic patterns:
      // - Higher activity in recent months
      // - Lower activity on weekends
      // - Some bursts of activity followed by quiet periods
      let baseProbability = 0.3; // 30% chance of some activity
      
      // Increase activity for more recent months
      if (monthsAgo < 3) baseProbability = 0.7; // Last 3 months: 70% chance
      else if (monthsAgo < 6) baseProbability = 0.5; // 3-6 months ago: 50% chance
      else baseProbability = 0.3; // 6+ months ago: 30% chance
      
      // Reduce activity on weekends
      if (isWeekend) baseProbability *= 0.6;
      
      // Add some randomness and bursts
      const hasActivity = Math.random() < baseProbability;
      let count = 0;
      
      if (hasActivity) {
        // Generate contribution count with some bursts
        if (Math.random() < 0.1) {
          // 10% chance of high activity burst
          count = Math.floor(Math.random() * 15) + 10;
        } else {
          // Normal activity
          count = Math.floor(Math.random() * 8) + 1;
        }
      }
      
      const level = count === 0 ? 0 : Math.min(5, Math.ceil(count / 2));
      
      activityData.push({
        date: new Date(d).toISOString().split('T')[0],
        count,
        level
      });

      if (count > 0) {
        tempStreak++;
        if (d.toDateString() === today.toDateString()) {
          currentStreak = tempStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }
      
      totalContributions += count;
    }

    const defaultEvents: ActivityEvent[] = [
      {
        type: 'commit',
        title: 'feat: Add advanced color scheme management',
        date: '2024-01-28',
        link: '/app/activity',
        repo: 'trackeep',
        action: 'pushed'
      },
      {
        type: 'pull_request',
        title: 'Enhance admin settings with toggle buttons',
        date: '2024-01-27',
        link: '/app/admin',
        repo: 'trackeep',
        action: 'opened'
      },
      {
        type: 'merge',
        title: 'Merge branch: feature/ai-chat-enhancements',
        date: '2024-01-26',
        link: '/app/chat',
        repo: 'trackeep',
        action: 'merged'
      },
      {
        type: 'bookmark',
        title: 'Added bookmark: Advanced React Patterns',
        date: '2024-01-25',
        link: '/app/bookmarks'
      },
      {
        type: 'project',
        title: 'Updated project: Trackeep Dashboard',
        date: '2024-01-24',
        link: '/app/projects'
      }
    ];

    setActivities(activityData);
    setRecentEvents(props.customEvents || defaultEvents);
    setStats({
      totalContributions,
      currentStreak,
      longestStreak: Math.max(longestStreak, tempStreak)
    });
  };

  const getMonthLabels = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();
    const labels = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      labels.push(months[date.getMonth()]);
    }
    
    return labels;
  };


  const getActivityColor = (level: number) => {
    // Use project-themed colors instead of Christmas tree colors
    // Based on the primary theme color with varying intensities
    const colors = [
      'hsl(var(--muted) / 0.3)', // Level 0 - no activity (very light muted)
      'hsl(var(--primary) / 0.2)', // Level 1 - very light primary
      'hsl(var(--primary) / 0.4)', // Level 2 - light primary  
      'hsl(var(--primary) / 0.6)', // Level 3 - medium primary
      'hsl(var(--primary) / 0.8)', // Level 4 - strong primary
      'hsl(var(--primary))'  // Level 5 - full primary
    ];
    return colors[level] || colors[0];
  };

  const formatContributionCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'push':
      case 'commit':
        return <IconGitBranch class="size-4 text-primary" />;
      case 'pull_request':
        return <IconGitPullRequest class="size-4 text-primary" />;
      case 'merge':
        return <IconGitMerge class="size-4 text-primary" />;
      case 'issue':
        return <IconBook class="size-4 text-primary" />;
      case 'bookmark':
        return <IconBook class="size-4 text-primary" />;
      case 'project':
        return <IconFolder class="size-4 text-primary" />;
      case 'learning':
        return <IconTrendingUp class="size-4 text-primary" />;
      case 'note':
        return <IconBook class="size-4 text-primary" />;
      default:
        return <IconGitCommit class="size-4 text-primary" />;
    }
  };

  return (
    <div class="space-y-6">
      {/* Header (can be hidden by parent) */}
      {!props.hideHeader && (
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold text-foreground">
              {props.title || 'Activity Overview'}
            </h2>
            <p class="text-muted-foreground mt-1">
              Track your contributions and activity over time
            </p>
          </div>
          <div class="flex gap-2">
            {(['year', 'month', 'week'] as const).map((period) => (
              <Button
                variant={selectedPeriod() === period ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod(period)}
                size="sm"
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <Show when={props.showStats !== false}>
        <div class={`grid ${props.compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-4`}>
          <Card class="p-6">
            <div class="flex items-center gap-3">
              <div class="bg-primary/10 flex items-center justify-center p-3 rounded-lg">
                <IconTrendingUp class="size-6 text-primary" />
              </div>
              <div>
                <p class="text-2xl font-bold text-foreground">
                  {formatContributionCount(stats().totalContributions)}
                </p>
                <p class="text-sm text-muted-foreground">Total contributions</p>
              </div>
            </div>
          </Card>

          <Card class="p-6">
            <div class="flex items-center gap-3">
              <div class="bg-primary/10 flex items-center justify-center p-3 rounded-lg">
                <IconCalendar class="size-6 text-primary" />
              </div>
              <div>
                <p class="text-2xl font-bold text-foreground">{stats().currentStreak}</p>
                <p class="text-sm text-muted-foreground">Current streak</p>
              </div>
            </div>
          </Card>

          <Card class="p-6">
            <div class="flex items-center gap-3">
              <div class="bg-primary/10 flex items-center justify-center p-3 rounded-lg">
                <IconCalendar class="size-6 text-primary" />
              </div>
              <div>
                <p class="text-2xl font-bold text-foreground">{stats().longestStreak}</p>
                <p class="text-sm text-muted-foreground">Longest streak</p>
              </div>
            </div>
          </Card>
        </div>
      </Show>

      {/* Contribution Graph */}
      <Show when={props.showContributionGraph !== false}>
        <Card class="p-6">
          <div class="mb-4">
            <h3 class="text-lg font-semibold text-foreground mb-2">
              {formatContributionCount(stats().totalContributions)} contributions in the last year
            </h3>
          </div>

          {/* Month labels - More visible and responsive */}
          <div class="flex justify-between mb-3 px-8 text-sm font-medium">
            {getMonthLabels().map((month, index) => (
              <span 
                class="text-foreground/80 hover:text-foreground transition-colors cursor-default"
                style={index % 2 === 0 ? "" : "visibility: hidden;"}
              >
                {month}
              </span>
            ))}
          </div>

          {/* Contribution grid - Responsive and prevents overflow */}
          <div class="overflow-hidden w-full">
            <div class="flex gap-1 min-w-0">
              {/* Day labels */}
              <div class="flex flex-col gap-1 pr-2 flex-shrink-0">
                {['Mon', 'Wed', 'Fri'].map((day) => (
                  <div class="h-3 flex items-center justify-end">
                    <span class="text-xs text-foreground/70 hover:text-foreground transition-colors cursor-default font-medium">
                      {day}
                    </span>
                  </div>
                ))}
              </div>

              {/* Weekly columns - Responsive with proper overflow handling */}
              <div class="flex gap-1 overflow-x-auto overflow-y-hidden min-w-0">
                {Array.from({ length: 53 }, (_, weekIndex) => (
                  <div class="flex flex-col gap-1 flex-shrink-0">
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                      const activityIndex = weekIndex * 7 + dayIndex;
                      const activity = activities()[activityIndex];

                      if (!activity) {
                        return (
                          <div
                            class="w-2 h-2 sm:w-3 sm:h-3 rounded-sm flex-shrink-0"
                            style={`background-color: ${getActivityColor(0)}`}
                          ></div>
                        );
                      }

                      return (
                        <div
                          class="w-2 h-2 sm:w-3 sm:h-3 rounded-sm hover:ring-1 hover:ring-primary cursor-pointer transition-all flex-shrink-0"
                          style={`background-color: ${getActivityColor(activity.level)}`}
                          title={`${activity.date}: ${activity.count} contributions`}
                        ></div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div class="flex items-center justify-between mt-4">
            <span class="text-xs text-muted-foreground">Less</span>
            <div class="flex gap-1">
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  class="w-2 h-2 sm:w-3 sm:h-3 rounded-sm"
                  style={`background-color: ${getActivityColor(level)}`}
                ></div>
              ))}
            </div>
            <span class="text-xs text-muted-foreground">More</span>
          </div>
        </Card>
      </Show>

      {/* Recent Activity */}
      <Show when={props.showRecentActivity !== false}>
        <Card class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-foreground">Recent Activity</h3>
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <div class="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Active</span>
            </div>
          </div>
          <div class="space-y-3 max-h-64 overflow-y-auto">
            <For each={recentEvents()}>
              {(event) => (
                <div class="flex items-center justify-between p-3 bg-card rounded-lg border hover:bg-muted/50 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="bg-primary/10 p-2 rounded-lg">
                      {getEventIcon(event.type)}
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
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        // Navigate to the link in the same tab
                        if (event.link) {
                          window.location.href = event.link;
                        }
                      }}
                      class="hover:bg-primary/10 transition-colors"
                    >
                      <IconExternalLink class="size-4" />
                    </Button>
                  )}
                </div>
              )}
            </For>
          </div>
        </Card>
      </Show>
    </div>
  );
};
