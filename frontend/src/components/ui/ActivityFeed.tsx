import { createSignal, For, onMount, createEffect } from 'solid-js';
import { 
  IconBookmark, 
  IconChecklist, 
  IconNotebook,
  IconFileText,
  IconGitPullRequest,
  IconGitCommit,
  IconStar,
  IconGitFork,
  IconClock,
  IconExternalLink
} from '@tabler/icons-solidjs';

interface ActivityItem {
  id: string;
  type: 'bookmark' | 'task' | 'note' | 'file' | 'github_commit' | 'github_pr' | 'github_star' | 'github_fork';
  title: string;
  description?: string;
  timestamp: string;
  source: 'trackeep' | 'github';
  metadata?: {
    repo?: string;
    url?: string;
    author?: string;
    branch?: string;
    language?: string;
    tags?: string[];
  };
}

interface ActivityFeedProps {
  limit?: number;
  showFilter?: boolean;
  refreshKey?: number;
}

export const ActivityFeed = (props: ActivityFeedProps) => {
  const [activities, setActivities] = createSignal<ActivityItem[]>([]);
  const [filter, setFilter] = createSignal<'all' | 'trackeep' | 'github'>('all');
  const [loading, setLoading] = createSignal(true);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'bookmark': return IconBookmark;
      case 'task': return IconChecklist;
      case 'note': return IconNotebook;
      case 'file': return IconFileText;
      case 'github_commit': return IconGitCommit;
      case 'github_pr': return IconGitPullRequest;
      case 'github_star': return IconStar;
      case 'github_fork': return IconGitFork;
      default: return IconClock;
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      // Import mock data for demo mode
      const { getMockActivities } = await import('@/lib/mockData');
      
      // Combine and format activities
      const combinedActivities: ActivityItem[] = [];
      
      // Add Trackeep activities from mock data
      const mockActivities = getMockActivities();
      const now = new Date();
      
      mockActivities.forEach((activity, index) => {
        // Create realistic timestamps
        const timestamp = new Date(now.getTime() - (index * 3600000)); // Each activity 1 hour apart
        
        combinedActivities.push({
          id: activity.id,
          type: activity.type as any,
          title: activity.title,
          description: `${activity.action} ${activity.type}`,
          timestamp: timestamp.toISOString(),
          source: 'trackeep' as const,
          metadata: {
            tags: activity.details?.tags ? Object.keys(activity.details.tags) : undefined
          }
        });
      });
      
      // Add some GitHub-style activities
      const githubActivities = [
        {
          id: 'github_1',
          type: 'github_commit' as const,
          title: 'Fixed responsive design issues',
          description: 'Resolved mobile layout problems on dashboard',
          timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
          source: 'github' as const,
          metadata: {
            repo: 'tdvorak/trackeep',
            url: 'https://github.com/tdvorak/trackeep/commit/abc123',
            branch: 'main',
            language: 'Go'
          }
        },
        {
          id: 'github_2',
          type: 'github_pr' as const,
          title: 'Add AI chat integration',
          description: 'Implement LongCat AI provider with model switching',
          timestamp: new Date(now.getTime() - 5 * 3600000).toISOString(),
          source: 'github' as const,
          metadata: {
            repo: 'tdvorak/trackeep',
            url: 'https://github.com/tdvorak/trackeep/pull/42',
            branch: 'feature/ai-chat',
            language: 'TypeScript'
          }
        },
        {
          id: 'github_3',
          type: 'github_star' as const,
          title: 'trackeep gained new stars',
          description: 'Repository reached 245 stars',
          timestamp: new Date(now.getTime() - 8 * 3600000).toISOString(),
          source: 'github' as const,
          metadata: {
            repo: 'tdvorak/trackeep',
            url: 'https://github.com/tdvorak/trackeep'
          }
        }
      ];
      
      combinedActivities.push(...githubActivities);

      // Sort by timestamp (most recent first)
      combinedActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Apply filter
      const filteredActivities = filter() === 'all' 
        ? combinedActivities 
        : combinedActivities.filter(a => a.source === filter());

      // Apply limit
      const limitedActivities = props.limit 
        ? filteredActivities.slice(0, props.limit)
        : filteredActivities;

      setActivities(limitedActivities);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    fetchActivities();
    // Refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  });

  // Refetch when refreshKey changes
  createEffect(() => {
    if (props.refreshKey !== undefined) {
      fetchActivities();
    }
  });

  return (
    <div class="flex flex-col h-full space-y-4">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm text-[#a3a3a3]">({activities().length} items)</span>
        </div>
        
        {props.showFilter && (
          <div class="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              class={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter() === 'all' 
                  ? 'bg-[#262626] text-[#fafafa]' 
                  : 'text-[#a3a3a3] hover:text-[#fafafa]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('trackeep')}
              class={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter() === 'trackeep' 
                  ? 'bg-[#262626] text-[#fafafa]' 
                  : 'text-[#a3a3a3] hover:text-[#fafafa]'
              }`}
            >
              Trackeep
            </button>
            <button
              onClick={() => setFilter('github')}
              class={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter() === 'github' 
                  ? 'bg-[#262626] text-[#fafafa]' 
                  : 'text-[#a3a3a3] hover:text-[#fafafa]'
              }`}
            >
              GitHub
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading() && (
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Activity List */}
      <div class="space-y-3 flex-1 min-h-0 overflow-y-auto max-h-96 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <For each={activities()}>
          {(activity) => {
            const Icon = getActivityIcon(activity.type);
            
            return (
              <div class="flex items-center justify-between p-3 bg-card rounded-lg border hover:bg-muted/50 transition-colors">
                <div class="flex items-center gap-3">
                  <div class="bg-primary/10 p-2 rounded-lg">
                    <Icon class="size-4 text-primary" />
                  </div>
                  <div class="flex-1">
                    <p class="text-sm text-foreground font-medium">
                      {activity.title}
                    </p>
                    <div class="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{new Date(activity.timestamp).toISOString().split('T')[0]}</span>
                      <span>•</span>
                      <span class="text-primary">
                        {activity.source === 'github'
                          ? (activity.metadata?.repo?.split('/').pop() || 'GitHub')
                          : 'trackeep'}
                      </span>
                      <span>•</span>
                      <span>
                        {activity.source === 'github'
                          ? activity.type === 'github_commit'
                            ? 'pushed'
                            : activity.type === 'github_pr'
                              ? 'opened PR'
                              : activity.type === 'github_star'
                                ? 'starred'
                                : activity.type === 'github_fork'
                                  ? 'forked'
                                  : 'activity'
                          : activity.description || activity.type}
                      </span>
                    </div>
                  </div>
                </div>
                {activity.metadata?.url && (
                  <a
                    href={activity.metadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8 ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconExternalLink class="size-4 text-primary" />
                  </a>
                )}
              </div>
            );
          }}
        </For>
      </div>

      {/* Empty State */}
      {!loading() && activities().length === 0 && (
        <div class="text-center py-8">
          <IconClock class="size-12 text-[#a3a3a3] mx-auto mb-4" />
          <p class="text-[#a3a3a3]">No recent activity found</p>
          <p class="text-sm text-[#a3a3a3] mt-1">
            {filter() === 'github' ? 'Connect your GitHub account to see activity' : 'Start using Trackeep to see your activity here'}
          </p>
        </div>
      )}
    </div>
  );
};
