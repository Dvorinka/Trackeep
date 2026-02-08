import { Button } from '@/components/ui/Button';
import { GitHubActivity } from '@/components/ui/GitHubActivity';
import { IconSettings } from '@tabler/icons-solidjs';

export const Profile = () => {
  // Custom events for Profile page
  const profileEvents = [
    {
      type: 'commit' as const,
      title: 'feat: Add advanced color scheme management',
      date: '2024-01-28',
      link: '/app/activity',
      repo: 'trackeep',
      action: 'pushed'
    },
    {
      type: 'pull_request' as const,
      title: 'Enhance admin settings with toggle buttons',
      date: '2024-01-27',
      link: '/app/admin',
      repo: 'trackeep',
      action: 'opened'
    },
    {
      type: 'merge' as const,
      title: 'Merge branch: feature/ai-chat-enhancements',
      date: '2024-01-26',
      link: '/app/chat',
      repo: 'trackeep',
      action: 'merged'
    },
    {
      type: 'bookmark' as const,
      title: 'Added bookmark: Advanced React Patterns',
      date: '2024-01-25',
      link: '/app/bookmarks'
    },
    {
      type: 'project' as const,
      title: 'Updated project: Trackeep Dashboard',
      date: '2024-01-24',
      link: '/app/projects'
    },
    {
      type: 'learning' as const,
      title: 'Completed lesson: SolidJS Fundamentals',
      date: '2024-01-23',
      link: '/app/learning'
    },
    {
      type: 'note' as const,
      title: 'Created note: API Architecture Ideas',
      date: '2024-01-22',
      link: '/app/notes'
    },
    {
      type: 'push' as const,
      title: 'Fix navigation icon colors and responsiveness',
      date: '2024-01-21',
      link: '/app/activity',
      repo: 'trackeep',
      action: 'pushed'
    }
  ];

  return (
    <div class="p-6 space-y-6 h-full overflow-hidden">
      {/* Header */}
      <div class="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 class="text-3xl font-bold text-foreground">Profile Activity</h1>
          <p class="text-muted-foreground mt-2">Track your contributions and activity over time</p>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" size="sm">
            <IconSettings class="size-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* GitHub Activity Component */}
      <div class="flex-1 overflow-hidden">
        <GitHubActivity 
          title="Profile Activity"
          customEvents={profileEvents}
          showStats={true}
          showContributionGraph={true}
          showRecentActivity={true}
          compact={false}
          period="year"
          hideHeader={true}
          fullWidth={true}
        />
      </div>
    </div>
  );
};
