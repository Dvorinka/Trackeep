import { For } from 'solid-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  IconBookmark, 
  IconChecklist, 
  IconFolder, 
  IconNotebook,
  IconTrendingUp,
  IconClock
} from '@tabler/icons-solidjs'

const stats = [
  { name: 'Total Bookmarks', value: '248', icon: IconBookmark, change: '+12%', changeType: 'positive' },
  { name: 'Active Tasks', value: '32', icon: IconChecklist, change: '-5%', changeType: 'negative' },
  { name: 'Files Stored', value: '1,429', icon: IconFolder, change: '+18%', changeType: 'positive' },
  { name: 'Notes Created', value: '89', icon: IconNotebook, change: '+7%', changeType: 'positive' },
]

const recentActivity = [
  { id: 1, type: 'bookmark', title: 'SolidJS Documentation', time: '2 hours ago', icon: IconBookmark },
  { id: 2, type: 'task', title: 'Complete project setup', time: '4 hours ago', icon: IconChecklist },
  { id: 3, type: 'file', title: 'Project proposal.pdf', time: '1 day ago', icon: IconFolder },
  { id: 4, type: 'note', title: 'Meeting notes - Q1 planning', time: '2 days ago', icon: IconNotebook },
]

export function Dashboard() {
  return (
    <div class="space-y-6">
      {/* Page Header */}
      <div>
        <h1 class="text-3xl font-bold text-[#fafafa]">Dashboard</h1>
        <p class="text-[#a3a3a3] mt-2">Welcome back! Here's an overview of your productivity hub.</p>
      </div>

      {/* Stats Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <For each={stats}>
          {(stat) => {
            const Icon = stat.icon
            return (
              <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle class="text-sm font-medium text-[#a3a3a3]">
                    {stat.name}
                  </CardTitle>
                  <Icon class="h-4 w-4 text-[#a3a3a3]" />
                </CardHeader>
                <CardContent>
                  <div class="text-2xl font-bold text-[#fafafa]">{stat.value}</div>
                  <p class="text-xs text-[#a3a3a3] mt-1">
                    <span class={stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'}>
                      {stat.change}
                    </span>{' '}
                    from last month
                  </p>
                </CardContent>
              </Card>
            )
          }}
        </For>
      </div>

      {/* Content Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card class="lg:col-span-2">
          <CardHeader>
            <CardTitle class="flex items-center space-x-2">
              <IconClock class="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Your latest bookmarks, tasks, and files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <For each={recentActivity}>
                {(activity) => {
                  const Icon = activity.icon
                  return (
                    <div class="flex items-center space-x-3 p-3 rounded-lg bg-[#262626] hover:bg-[#141415] transition-colors">
                      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                        <Icon class="h-5 w-5 text-white" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-[#fafafa] truncate">
                          {activity.title}
                        </p>
                        <p class="text-xs text-[#a3a3a3]">{activity.time}</p>
                      </div>
                    </div>
                  )
                }}
              </For>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center space-x-2">
              <IconTrendingUp class="h-5 w-5" />
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <Button class="w-full justify-start" variant="outline">
              <IconBookmark class="mr-2 h-4 w-4" />
              Add Bookmark
            </Button>
            <Button class="w-full justify-start" variant="outline">
              <IconChecklist class="mr-2 h-4 w-4" />
              Create Task
            </Button>
            <Button class="w-full justify-start" variant="outline">
              <IconFolder class="mr-2 h-4 w-4" />
              Upload File
            </Button>
            <Button class="w-full justify-start" variant="outline">
              <IconNotebook class="mr-2 h-4 w-4" />
              New Note
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
