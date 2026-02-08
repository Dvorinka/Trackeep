import { createSignal } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ActivityFeed } from '@/components/ui/ActivityFeed';
import { 
  IconTrendingUp, 
  IconClock, 
  IconFilter,
  IconRefresh,
  IconDownload,
  IconSettings
} from '@tabler/icons-solidjs';

export const Activity = () => {
  const [refreshKey, setRefreshKey] = createSignal(0);
  const [showFilters, setShowFilters] = createSignal(false);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div class="p-6 space-y-6">
      {/* Header */}
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-3xl font-bold text-[#fafafa]">Activity Dashboard</h1>
          <p class="text-[#a3a3a3] mt-2">
            All your Trackeep activity enriched with GitHub data, unified in one place
          </p>
        </div>
        <div class="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters())}
          >
            <IconFilter class="size-4 mr-2" />
            Filters
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
          >
            <IconRefresh class="size-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <IconDownload class="size-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card class="p-6 border-l-4 border-l-primary">
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 p-3 rounded-lg">
              <IconTrendingUp class="size-6 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-bold text-[#fafafa]">247</p>
              <p class="text-sm text-[#a3a3a3]">Total Activities</p>
            </div>
          </div>
        </Card>

        <Card class="p-6 border-l-4 border-l-primary">
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 p-3 rounded-lg">
              <IconTrendingUp class="size-6 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-bold text-[#fafafa]">89</p>
              <p class="text-sm text-[#a3a3a3]">Trackeep Items</p>
            </div>
          </div>
        </Card>

        <Card class="p-6 border-l-4 border-l-primary">
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 p-3 rounded-lg">
              <IconTrendingUp class="size-6 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-bold text-[#fafafa]">158</p>
              <p class="text-sm text-[#a3a3a3]">GitHub Events</p>
            </div>
          </div>
        </Card>

        <Card class="p-6 border-l-4 border-l-primary">
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 p-3 rounded-lg">
              <IconClock class="size-6 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-bold text-[#fafafa]">2h</p>
              <p class="text-sm text-[#a3a3a3]">Last Activity</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Activity Feed */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div class="lg:col-span-2">
          <Card class="p-6">
            <ActivityFeed 
              refreshKey={refreshKey()} 
              limit={20} 
              showFilter={showFilters()} 
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div class="space-y-6">
          {/* Quick Stats */}
          <Card class="p-6">
            <h3 class="text-lg font-semibold text-[#fafafa] mb-4">Activity Breakdown</h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-[#a3a3a3]">Bookmarks</span>
                <span class="text-sm font-medium text-primary">23</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-[#a3a3a3]">Tasks</span>
                <span class="text-sm font-medium text-primary">31</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-[#a3a3a3]">Notes</span>
                <span class="text-sm font-medium text-primary">18</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-[#a3a3a3]">Files</span>
                <span class="text-sm font-medium text-primary">17</span>
              </div>
              <div class="border-t border-[#262626] pt-3 mt-3">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-[#a3a3a3]">Commits</span>
                  <span class="text-sm font-medium text-primary">89</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-[#a3a3a3]">Pull Requests</span>
                  <span class="text-sm font-medium text-primary">12</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-[#a3a3a3]">Stars</span>
                  <span class="text-sm font-medium text-primary">45</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-[#a3a3a3]">Forks</span>
                  <span class="text-sm font-medium text-primary">12</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Repos */}
          <Card class="p-6">
            <h3 class="text-lg font-semibold text-[#fafafa] mb-4">Active Repositories</h3>
            <div class="space-y-3">
              {[
                { name: 'trackeep', language: 'TypeScript', activity: '2h ago' },
                { name: 'solid-components', language: 'TypeScript', activity: '5h ago' },
                { name: 'go-api', language: 'Go', activity: '1d ago' },
                { name: 'ml-models', language: 'Python', activity: '2d ago' }
              ].map((repo) => (
                <div class="flex items-center justify-between p-3 bg-[#262626] rounded-lg">
                  <div>
                    <p class="text-sm font-medium text-[#fafafa]">{repo.name}</p>
                    <p class="text-xs text-[#a3a3a3]">{repo.language}</p>
                  </div>
                  <span class="text-xs text-[#a3a3a3]">{repo.activity}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Settings */}
          <Card class="p-6">
            <h3 class="text-lg font-semibold text-[#fafafa] mb-4">Activity Settings</h3>
            <div class="space-y-3">
              <Button variant="outline" size="sm" class="w-full justify-start">
                <IconSettings class="size-4 mr-2" />
                Configure Filters
              </Button>
              <Button variant="outline" size="sm" class="w-full justify-start">
                <IconDownload class="size-4 mr-2" />
                Export Activity Data
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
