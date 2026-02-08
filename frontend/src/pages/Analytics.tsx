import { createSignal, onMount, For, Show } from 'solid-js';
import { 
  IconChartLine, 
  IconBookmarks,
  IconChecklist,
  IconClock,
  IconTarget,
  IconBrain,
  IconGitBranch,
  IconBulb,
  IconAward
} from '@tabler/icons-solidjs';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface AnalyticsData {
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
  summary: {
    hours_tracked: number;
    tasks_completed: number;
    bookmarks_added: number;
    notes_created: number;
    courses_completed: number;
    github_commits: number;
  };
  analytics: Array<{
    date: string;
    hours_tracked: number;
    tasks_completed: number;
    bookmarks_added: number;
    notes_created: number;
    courses_completed: number;
    github_commits: number;
    study_streak: number;
    productivity_score: number;
  }>;
  productivity_metrics: Array<{
    period: string;
    start_date: string;
    end_date: string;
    total_hours: number;
    billable_hours: number;
    non_billable_hours: number;
    tasks_completed: number;
    average_task_time: number;
    peak_productivity_hour: number;
    focus_score: number;
    efficiency_score: number;
  }>;
  learning_analytics: Array<{
    id: number;
    course: {
      title: string;
      description: string;
    };
    start_date: string;
    last_accessed: string;
    time_spent: number;
    progress: number;
    modules_completed: number;
    total_modules: number;
    average_score: number;
    streak_days: number;
    skills_acquired: string[];
  }>;
  github_analytics: Array<{
    date: string;
    commits: number;
    pull_requests: number;
    issues_opened: number;
    issues_closed: number;
    reviews: number;
    contributions: number;
    languages: Record<string, number>;
    repositories: string[];
  }>;
  goals: Array<{
    id: number;
    title: string;
    description: string;
    category: string;
    target_value: number;
    current_value: number;
    unit: string;
    deadline: string;
    status: string;
    priority: string;
    progress: number;
    is_completed: boolean;
    milestones: Array<{
      id: number;
      title: string;
      target_value: number;
      current_value: number;
      deadline: string;
      status: string;
      is_completed: boolean;
    }>;
  }>;
  habit_analytics: Array<{
    habit_name: string;
    start_date: string;
    last_completed: string;
    streak: number;
    best_streak: number;
    total_days: number;
    completion_rate: number;
    frequency: string;
    category: string;
    goal_target: number;
    goal_achieved: boolean;
  }>;
}

export const Analytics = () => {
  const [analytics, setAnalytics] = createSignal<AnalyticsData | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = createSignal('30');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/analytics/dashboard?days=${selectedPeriod()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    fetchAnalytics();
  });

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-destructive';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-muted-foreground';
      default: return 'text-gray-500';
    }
  };

  // Component render

  return (
    <div class="p-6 space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold">Analytics & Insights</h1>
          <p class="text-muted-foreground">Track your productivity and progress</p>
        </div>
        <div class="flex gap-2">
          <select
            value={selectedPeriod()}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            class="px-3 py-2 border rounded-md bg-background"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <Button onClick={fetchAnalytics}>Refresh</Button>
        </div>
      </div>

      <Show when={error()}>
        <div class="bg-destructive/15 border border-destructive/20 rounded-md p-4">
          <p class="text-destructive">{error()}</p>
        </div>
      </Show>

      <Show when={loading()}>
        <div class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p class="mt-2 text-muted-foreground">Loading analytics...</p>
        </div>
      </Show>

      <Show when={analytics()}>
        <div class="space-y-6">
          {/* Summary Cards */}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent class="p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-muted-foreground">Hours Tracked</p>
                    <p class="text-2xl font-bold">{formatHours(analytics()!.summary.hours_tracked)}</p>
                  </div>
                  <IconClock class="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent class="p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-muted-foreground">Tasks Completed</p>
                    <p class="text-2xl font-bold">{analytics()!.summary.tasks_completed}</p>
                  </div>
                  <IconChecklist class="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent class="p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-muted-foreground">Bookmarks Added</p>
                    <p class="text-2xl font-bold">{analytics()!.summary.bookmarks_added}</p>
                  </div>
                  <IconBookmarks class="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent class="p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-muted-foreground">GitHub Commits</p>
                    <p class="text-2xl font-bold">{analytics()!.summary.github_commits}</p>
                  </div>
                  <IconGitBranch class="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals Progress */}
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle class="flex items-center gap-2">
                  <IconTarget class="h-5 w-5" />
                  Active Goals
                </CardTitle>
                <CardDescription>Track your goal progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <For each={analytics()!.goals.filter(g => g.status === 'active').slice(0, 5)}>
                    {(goal) => (
                      <div class="space-y-2">
                        <div class="flex justify-between items-center">
                          <div class="flex-1">
                            <h4 class="font-medium">{goal.title}</h4>
                            <p class="text-sm text-muted-foreground">
                              {goal.current_value} / {goal.target_value} {goal.unit}
                            </p>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class={`text-sm font-medium ${getPriorityColor(goal.priority)}`}>
                              {goal.priority}
                            </span>
                            <span class="text-sm font-medium">{Math.round(goal.progress)}%</span>
                          </div>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                          <div
                            class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={`width: ${goal.progress}%`}
                          ></div>
                        </div>
                        <p class="text-xs text-muted-foreground">
                          Deadline: {formatDate(goal.deadline)}
                        </p>
                      </div>
                    )}
                  </For>
                  <Show when={analytics()!.goals.filter(g => g.status === 'active').length === 0}>
                    <p class="text-muted-foreground text-center py-4">No active goals</p>
                  </Show>
                </div>
              </CardContent>
            </Card>

            {/* Habit Tracking */}
            <Card>
              <CardHeader>
                <CardTitle class="flex items-center gap-2">
                  <IconAward class="h-5 w-5" />
                  Habit Tracking
                </CardTitle>
                <CardDescription>Your daily habits and streaks</CardDescription>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <For each={analytics()!.habit_analytics.slice(0, 5)}>
                    {(habit) => (
                      <div class="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <h4 class="font-medium">{habit.habit_name}</h4>
                          <p class="text-sm text-muted-foreground">
                            {habit.frequency} • {Math.round(habit.completion_rate)}% completion
                          </p>
                        </div>
                        <div class="text-right">
                          <div class="flex items-center gap-1">
                            <IconBulb class="h-4 w-4 text-orange-500" />
                            <span class="font-medium">{habit.streak} day streak</span>
                          </div>
                          <p class="text-xs text-muted-foreground">
                            Best: {habit.best_streak} days
                          </p>
                        </div>
                      </div>
                    )}
                  </For>
                  <Show when={analytics()!.habit_analytics.length === 0}>
                    <p class="text-muted-foreground text-center py-4">No habits tracked</p>
                  </Show>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Learning Progress */}
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <IconBrain class="h-5 w-5" />
                Learning Progress
              </CardTitle>
              <CardDescription>Your course progress and achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <For each={analytics()!.learning_analytics.slice(0, 6)}>
                  {(course) => (
                    <div class="border rounded-lg p-4">
                      <h4 class="font-medium truncate">{course.course.title}</h4>
                      <p class="text-sm text-muted-foreground mb-2">
                        {course.modules_completed}/{course.total_modules} modules
                      </p>
                      <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          class="bg-primary h-2 rounded-full transition-all duration-300"
                          style={`width: ${course.progress}%`}
                        ></div>
                      </div>
                      <div class="flex justify-between text-xs text-muted-foreground">
                        <span>{Math.round(course.progress)}% complete</span>
                        <span>{course.streak_days} day streak</span>
                      </div>
                    </div>
                  )}
                </For>
                <Show when={analytics()!.learning_analytics.length === 0}>
                  <div class="col-span-full text-center py-8">
                    <p class="text-muted-foreground">No courses in progress</p>
                  </div>
                </Show>
              </div>
            </CardContent>
          </Card>

          {/* GitHub Activity */}
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <IconGitBranch class="h-5 w-5" />
                GitHub Activity
              </CardTitle>
              <CardDescription>Your contribution summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="text-center">
                  <p class="text-2xl font-bold">{analytics()!.summary.github_commits}</p>
                  <p class="text-sm text-muted-foreground">Commits</p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold">
                    {analytics()!.github_analytics.reduce((sum, day) => sum + day.pull_requests, 0)}
                  </p>
                  <p class="text-sm text-muted-foreground">Pull Requests</p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold">
                    {analytics()!.github_analytics.reduce((sum, day) => sum + day.issues_opened, 0)}
                  </p>
                  <p class="text-sm text-muted-foreground">Issues Opened</p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold">
                    {analytics()!.github_analytics.reduce((sum, day) => sum + day.reviews, 0)}
                  </p>
                  <p class="text-sm text-muted-foreground">Reviews</p>
                </div>
              </div>
              
              <div class="space-y-2">
                <For each={analytics()!.github_analytics.slice(0, 7)}>
                  {(day) => (
                    <div class="flex justify-between items-center p-2 border rounded">
                      <span class="text-sm">{formatDate(day.date)}</span>
                      <div class="flex gap-4 text-sm">
                        <span>{day.commits} commits</span>
                        <span>{day.pull_requests} PRs</span>
                        <span>{day.issues_opened} issues</span>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </CardContent>
          </Card>

          {/* Productivity Insights */}
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <IconChartLine class="h-5 w-5" />
                Productivity Insights
              </CardTitle>
              <CardDescription>Key insights and patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 class="font-medium mb-3">Daily Activity</h4>
                  <div class="space-y-2">
                    <For each={analytics()!.analytics.slice(0, 7)}>
                      {(day) => (
                        <div class="flex justify-between items-center">
                          <span class="text-sm">{formatDate(day.date)}</span>
                          <div class="flex items-center gap-2">
                            <span class="text-sm">{formatHours(day.hours_tracked)}</span>
                            <span class="text-sm text-muted-foreground">
                              {day.tasks_completed} tasks
                            </span>
                            <Show when={day.productivity_score > 0}>
                              <span class="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                                {Math.round(day.productivity_score)}%
                              </span>
                            </Show>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
                
                <div>
                  <h4 class="font-medium mb-3">Key Metrics</h4>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-sm text-muted-foreground">Average Daily Hours</span>
                      <span class="text-sm font-medium">
                        {formatHours(analytics()!.summary.hours_tracked / analytics()!.period.days)}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-muted-foreground">Tasks per Day</span>
                      <span class="text-sm font-medium">
                        {(analytics()!.summary.tasks_completed / analytics()!.period.days).toFixed(1)}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-muted-foreground">Study Streak</span>
                      <span class="text-sm font-medium">
                        {Math.max(...analytics()!.analytics.map(a => a.study_streak))} days
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-muted-foreground">Average Productivity</span>
                      <span class="text-sm font-medium">
                        {Math.round(
                          analytics()!.analytics.reduce((sum, a) => sum + a.productivity_score, 0) / 
                          analytics()!.analytics.length
                        )}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Show>
    </div>
  );
};
