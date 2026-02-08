import { createSignal, createEffect, onMount, For, Show } from 'solid-js'
import { DateTimePicker } from '@/components/ui/DatePicker';
import { 
  IconCalendar, 
  IconClock, 
  IconPlus, 
  IconChevronLeft, 
  IconChevronRight,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconFlag
} from '@tabler/icons-solidjs'
import { getMockCalendarEvents } from '@/lib/mockData';

interface CalendarEvent {
  id: number
  title: string
  description?: string
  start_time: string
  end_time: string
  type: 'task' | 'meeting' | 'deadline' | 'reminder' | 'habit'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  location?: string
  is_completed: boolean
  is_all_day: boolean
  task?: {
    id: number
    title: string
  }
  bookmark?: {
    id: number
    title: string
  }
  note?: {
    id: number
    title: string
  }
}

interface NewEvent {
  title: string
  description: string
  start_time: string
  end_time: string
  type: 'task' | 'meeting' | 'deadline' | 'reminder' | 'habit'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  location: string
  is_all_day: boolean
}

export function Calendar() {
  const [upcomingEvents, setUpcomingEvents] = createSignal<CalendarEvent[]>([])
  const [todayEvents, setTodayEvents] = createSignal<CalendarEvent[]>([])
  const [deadlines, setDeadlines] = createSignal<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = createSignal(new Date())
  const [view, setView] = createSignal<'month' | 'week' | 'day'>('month')
  const [showEventModal, setShowEventModal] = createSignal(false)
  const [showTaskDetailModal, setShowTaskDetailModal] = createSignal(false)
  const [selectedTask, setSelectedTask] = createSignal<CalendarEvent | null>(null)
  const [currentTime, setCurrentTime] = createSignal(new Date())
  const [mappedEvents, setMappedEvents] = createSignal<CalendarEvent[]>([])

  const [newEvent, setNewEvent] = createSignal<NewEvent>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    type: 'reminder',
    priority: 'medium',
    location: '',
    is_all_day: false
  })

  // Update current time every second
  createEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  })

  // Check if we're in demo mode
  const isDemoMode = () => {
    return localStorage.getItem('demoMode') === 'true' || 
           document.title.includes('Demo Mode') ||
           window.location.search.includes('demo=true');
  };

  // Fetch calendar data
  const fetchCalendarData = async () => {
    try {
      const token = localStorage.getItem('token');

      if (isDemoMode() || !token) {
        // Use mock data in demo mode or when not authenticated
        const mockEvents = getMockCalendarEvents();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        
        // Map mock events to calendar events and store for calendar grid
        const mappedEvents: CalendarEvent[] = mockEvents.map(event => ({
          id: parseInt(event.id),
          title: event.title,
          description: event.description,
          start_time: event.start,
          end_time: event.end,
          type: event.type === 'personal' ? 'reminder' : event.type as 'task' | 'meeting' | 'deadline' | 'reminder' | 'habit',
          priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
          location: event.location,
          is_completed: false,
          is_all_day: event.allDay
        }));
        
        setMappedEvents(mappedEvents);
        
        const todayEvents = mappedEvents.filter(event => {
          const eventDate = new Date(event.start_time);
          return eventDate.toDateString() === today.toDateString();
        });
        
        const upcomingEvents = mappedEvents.filter(event => {
          const eventDate = new Date(event.start_time);
          return eventDate >= today && eventDate <= weekFromNow;
        });
        
        const deadlines = mappedEvents.filter(event => 
          event.type === 'deadline' && new Date(event.start_time) >= today
        );
        
        setTodayEvents(todayEvents);
        setUpcomingEvents(upcomingEvents);
        setDeadlines(deadlines);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      // Fetch all calendar data in parallel
      const [upcomingRes, todayRes, deadlinesRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/calendar/upcoming`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/calendar/today`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/calendar/deadlines`, { headers })
      ])

      if (upcomingRes.ok) {
        const upcomingData = await upcomingRes.json()
        setUpcomingEvents(upcomingData.events || [])
      }

      if (todayRes.ok) {
        const todayData = await todayRes.json()
        setTodayEvents(todayData.events || [])
      }

      if (deadlinesRes.ok) {
        const deadlinesData = await deadlinesRes.json()
        setDeadlines(deadlinesData.deadlines || [])
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error)
      // Fallback to mock data if API fails
      const mockEvents = getMockCalendarEvents();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      
      // Map mock events to calendar events and store for calendar grid
      const mappedEvents: CalendarEvent[] = mockEvents.map(event => ({
        id: parseInt(event.id),
        title: event.title,
        description: event.description,
        start_time: event.start,
        end_time: event.end,
        type: event.type === 'personal' ? 'reminder' : event.type as 'task' | 'meeting' | 'deadline' | 'reminder' | 'habit',
        priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
        location: event.location,
        is_completed: false,
        is_all_day: event.allDay
      }));
      
      setMappedEvents(mappedEvents);
      
      const todayEvents = mappedEvents.filter(event => {
        const eventDate = new Date(event.start_time);
        return eventDate.toDateString() === today.toDateString();
      });
      
      const upcomingEvents = mappedEvents.filter(event => {
        const eventDate = new Date(event.start_time);
        return eventDate >= today && eventDate <= weekFromNow;
      });
      
      const deadlines = mappedEvents.filter(event => 
        event.type === 'deadline' && new Date(event.start_time) >= today
      );
      
      setTodayEvents(todayEvents);
      setUpcomingEvents(upcomingEvents);
      setDeadlines(deadlines);
    }
  }

  onMount(() => {
    fetchCalendarData()
  })

  const createEvent = async () => {
    try {
      if (isDemoMode()) {
        // Simulate event creation in demo mode
        console.log('Creating event (demo mode):', newEvent());
        setShowEventModal(false);
        setNewEvent({
          title: '',
          description: '',
          start_time: '',
          end_time: '',
          type: 'reminder',
          priority: 'medium',
          location: '',
          is_all_day: false
        });
        fetchCalendarData();
        return;
      }

      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/calendar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newEvent())
      })

      if (response.ok) {
        setShowEventModal(false)
        setNewEvent({
          title: '',
          description: '',
          start_time: '',
          end_time: '',
          type: 'reminder',
          priority: 'medium',
          location: '',
          is_all_day: false
        })
        fetchCalendarData()
      }
    } catch (error) {
      console.error('Failed to create event:', error)
      // Fallback to demo mode behavior
      setShowEventModal(false);
      setNewEvent({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        type: 'reminder',
        priority: 'medium',
        location: '',
        is_all_day: false
      });
      fetchCalendarData();
    }
  }

  const toggleEventCompletion = async (eventId: number) => {
    try {
      if (isDemoMode()) {
        // Simulate event completion toggle in demo mode
        console.log('Toggling event completion (demo mode):', eventId);
        fetchCalendarData();
        return;
      }

      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/calendar/${eventId}/toggle-complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        fetchCalendarData()
      }
    } catch (error) {
      console.error('Failed to toggle event completion:', error)
      // Fallback to demo mode behavior
      fetchCalendarData();
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-primary'
      case 'high': return 'text-primary'
      case 'medium': return 'text-primary'
      case 'low': return 'text-primary'
      default: return 'text-primary'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
      case 'meeting': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
      case 'deadline': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
      case 'reminder': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
      case 'habit': return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
      default: return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const openEventModal = (date: Date) => {
    setNewEvent({
      title: '',
      description: '',
      start_time: date.toISOString().slice(0, 16),
      end_time: new Date(date.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
      type: 'reminder',
      priority: 'medium',
      location: '',
      is_all_day: false
    })
    setShowEventModal(true)
  }

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate())
    newDate.setMonth(newDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  return (
    <div class="space-y-6">
      {/* Header with Current Time */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-foreground mb-2">Calendar</h1>
          <p class="text-muted-foreground">
            {currentTime().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
            <span class="ml-2 font-mono text-lg">
              {currentTime().toLocaleTimeString()}
            </span>
          </p>
        </div>
        <button
          onClick={() => openEventModal(new Date())}
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <IconPlus class="size-4" />
          New Event
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Calendar View */}
        <div class="lg:col-span-2">
          <div class="bg-card rounded-lg border border-border p-4 lg:p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  class="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <IconChevronLeft class="size-4" />
                </button>
                <h2 class="text-xl font-semibold">
                  {currentDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={() => navigateMonth(1)}
                  class="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <IconChevronRight class="size-4" />
                </button>
              </div>
              <div class="flex gap-2">
                <button
                  onClick={() => setView('month')}
                  class={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    view() === 'month' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setView('week')}
                  class={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    view() === 'week' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setView('day')}
                  class={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    view() === 'day' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent'
                  }`}
                >
                  Day
                </button>
              </div>
            </div>

            {/* Enhanced Calendar Grid with Events */}
            <div class="grid grid-cols-7 gap-1 text-sm auto-rows-fr">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div class="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
              {/* Calendar days with events */}
              {Array.from({ length: 35 }, (_, i) => {
                const date = new Date(currentDate().getFullYear(), currentDate().getMonth(), i - 2)
                const isToday = date.toDateString() === new Date().toDateString()
                const isCurrentMonth = date.getMonth() === currentDate().getMonth()
                
                // Get events for this day
                const dayEvents = mappedEvents().filter((event: CalendarEvent) => {
                  const eventDate = new Date(event.start_time);
                  return eventDate.toDateString() === date.toDateString();
                }) || [];
                
                return (
                  <div
                    onClick={() => openEventModal(date)}
                    class={`border border-border rounded-lg p-1 cursor-pointer hover:bg-accent transition-colors relative overflow-hidden ${
                      isToday ? 'bg-primary/10 border-primary' : ''
                    } ${!isCurrentMonth ? 'opacity-40' : ''} ${
                      dayEvents.length > 3 ? 'row-span-2 min-h-[5rem]' : 'min-h-[3.5rem]'
                    }`}
                  >
                    <div class="text-sm font-medium">{date.getDate()}</div>
                    {/* Event indicators */}
                    <div class="space-y-1 mt-1">
                      {dayEvents.slice(0, 3).map((event: CalendarEvent) => (
                        <div 
                          class={`text-xs px-1 py-0.5 rounded truncate w-full cursor-pointer hover:opacity-80 transition-opacity ${
                            event.type === 'deadline' 
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800' 
                              : event.type === 'meeting'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : event.type === 'task'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          }`}
                          style={`font-size: 10px;`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(event);
                            setShowTaskDetailModal(true);
                          }}
                        >
                          {event.title.length > 12 ? event.title.substring(0, 12) + '...' : event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div 
                          class="text-xs text-muted-foreground font-medium cursor-pointer hover:text-primary transition-colors underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Show all events for this day
                            setSelectedTask({
                              id: date.getTime(),
                              title: `${date.toLocaleDateString()} - All Events`,
                              description: `Total events: ${dayEvents.length}`,
                              start_time: date.toISOString(),
                              end_time: date.toISOString(),
                              type: 'reminder' as const,
                              priority: 'medium' as const,
                              is_completed: false,
                              is_all_day: true
                            });
                            setShowTaskDetailModal(true);
                          }}
                        >
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div class="space-y-4 lg:space-y-6">
          {/* Today's Events */}
          <div class="bg-card rounded-lg border border-border p-4 lg:p-6">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
              <IconClock class="size-5" />
              Today's Events
            </h3>
            <div class="space-y-3 max-h-80 overflow-y-auto pr-2">
              <Show 
                when={todayEvents().length > 0} 
                fallback={
                  <p class="text-muted-foreground text-sm">No events today</p>
                }
              >
                <For each={todayEvents().slice(0, 10)}>
                  {(event) => (
                    <div class="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                         onClick={() => {
                           setSelectedTask(event);
                           setShowTaskDetailModal(true);
                         }}>
                      <div class="flex items-start justify-between">
                        <div class="flex-1">
                          <div class="flex items-center gap-2 mb-1">
                            <span class={`text-xs px-2 py-1 rounded-full ${getTypeColor(event.type)}`}>
                              {event.type}
                            </span>
                            <IconFlag class={`size-3 ${getPriorityColor(event.priority)}`} />
                          </div>
                          <h4 class="font-medium text-sm">{event.title}</h4>
                          <p class="text-xs text-muted-foreground mt-1">
                            {formatTime(event.start_time)} - {formatTime(event.end_time)}
                          </p>
                          {event.location && (
                            <p class="text-xs text-muted-foreground">{event.location}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEventCompletion(event.id);
                          }}
                          class={`p-1 rounded hover:bg-accent transition-colors ${
                            event.is_completed ? 'text-green-500' : 'text-muted-foreground'
                          }`}
                        >
                          <IconCheck class="size-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </div>

          {/* Upcoming Events */}
          <div class="bg-card rounded-lg border border-border p-4 lg:p-6">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
              <IconCalendar class="size-5" />
              Upcoming (7 Days)
            </h3>
            <div class="space-y-3 max-h-80 overflow-y-auto pr-2">
              <Show 
                when={upcomingEvents().length > 0} 
                fallback={
                  <p class="text-muted-foreground text-sm">No upcoming events</p>
                }
              >
                <For each={upcomingEvents().slice(0, 10)}>
                  {(event) => (
                    <div class="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                         onClick={() => {
                           setSelectedTask(event);
                           setShowTaskDetailModal(true);
                         }}>
                      <div class="flex items-center gap-2 mb-1">
                        <span class={`text-xs px-2 py-1 rounded-full ${getTypeColor(event.type)}`}>
                          {event.type}
                        </span>
                        <IconFlag class={`size-3 ${getPriorityColor(event.priority)}`} />
                      </div>
                      <h4 class="font-medium text-sm">{event.title}</h4>
                      <p class="text-xs text-muted-foreground">
                        {formatDateTime(event.start_time)}
                      </p>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </div>

          {/* Deadlines */}
          <div class="bg-card rounded-lg border border-border p-4 lg:p-6">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
              <IconAlertTriangle class="size-5" />
              Deadlines
            </h3>
            <div class="space-y-3 max-h-80 overflow-y-auto pr-2">
              <Show 
                when={deadlines().length > 0} 
                fallback={
                  <p class="text-muted-foreground text-sm">No upcoming deadlines</p>
                }
              >
                <For each={deadlines().slice(0, 10)}>
                  {(deadline) => (
                    <div class="p-3 bg-muted/50 border border-red-200 dark:border-red-800 rounded-lg">
                      <div class="flex items-center gap-2 mb-1">
                        <span class={`text-xs px-2 py-1 rounded-full ${getTypeColor(deadline.type)}`}>
                          {deadline.type}
                        </span>
                        <IconFlag class={`size-3 ${getPriorityColor(deadline.priority)}`} />
                      </div>
                      <h4 class="font-medium text-sm">{deadline.title}</h4>
                      <p class="text-xs text-muted-foreground">
                        {formatDateTime(deadline.start_time)}
                      </p>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive layout for mobile */}
      <div class="xl:hidden space-y-6">
        {/* Today's Events - Mobile */}
        <div class="bg-card rounded-lg border border-border p-4">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <IconClock class="size-5" />
            Today's Events
          </h3>
          <div class="space-y-3 max-h-60 overflow-y-auto">
            <Show 
              when={todayEvents().length > 0} 
              fallback={
                <p class="text-muted-foreground text-sm">No events today</p>
              }
            >
              <For each={todayEvents().slice(0, 5)}>
                {(event) => (
                  <div class="p-3 bg-muted/50 rounded-lg">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                          <span class={`text-xs px-2 py-1 rounded-full ${getTypeColor(event.type)}`}>
                            {event.type}
                          </span>
                          <IconFlag class={`size-3 ${getPriorityColor(event.priority)}`} />
                        </div>
                        <h4 class="font-medium text-sm">{event.title}</h4>
                        <p class="text-xs text-muted-foreground mt-1">
                          {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        </p>
                        {event.location && (
                          <p class="text-xs text-muted-foreground">{event.location}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleEventCompletion(event.id)}
                        class={`p-1 rounded hover:bg-accent transition-colors ${
                          event.is_completed ? 'text-green-500' : 'text-muted-foreground'
                        }`}
                      >
                        <IconCheck class="size-4" />
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>

        {/* Upcoming Events - Mobile */}
        <div class="bg-card rounded-lg border border-border p-4">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <IconCalendar class="size-5" />
            Upcoming (7 Days)
          </h3>
          <div class="space-y-3 max-h-60 overflow-y-auto">
            <Show 
              when={upcomingEvents().length > 0} 
              fallback={
                <p class="text-muted-foreground text-sm">No upcoming events</p>
              }
            >
              <For each={upcomingEvents().slice(0, 5)}>
                {(event) => (
                  <div class="p-3 bg-muted/50 rounded-lg">
                    <div class="flex items-center gap-2 mb-1">
                      <span class={`text-xs px-2 py-1 rounded-full ${getTypeColor(event.type)}`}>
                        {event.type}
                      </span>
                      <IconFlag class={`size-3 ${getPriorityColor(event.priority)}`} />
                    </div>
                    <h4 class="font-medium text-sm">{event.title}</h4>
                    <p class="text-xs text-muted-foreground">
                      {formatDateTime(event.start_time)}
                    </p>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>

        {/* Deadlines - Mobile */}
        <div class="bg-card rounded-lg border border-border p-4">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <IconAlertTriangle class="size-5" />
            Deadlines
          </h3>
          <div class="space-y-3 max-h-60 overflow-y-auto">
            <Show 
              when={deadlines().length > 0} 
              fallback={
                <p class="text-muted-foreground text-sm">No upcoming deadlines</p>
              }
            >
              <For each={deadlines().slice(0, 5)}>
                {(deadline) => (
                  <div class="p-3 bg-muted/50 border border-red-200 dark:border-red-800 rounded-lg">
                    <div class="flex items-center gap-2 mb-1">
                      <span class={`text-xs px-2 py-1 rounded-full ${getTypeColor(deadline.type)}`}>
                        {deadline.type}
                      </span>
                      <IconFlag class={`size-3 ${getPriorityColor(deadline.priority)}`} />
                    </div>
                    <h4 class="font-medium text-sm">{deadline.title}</h4>
                    <p class="text-xs text-muted-foreground">
                      {formatDateTime(deadline.start_time)}
                    </p>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>

      {/* Event Creation Modal */}
      <Show when={showEventModal()}>
        <div 
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close modal only when clicking the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              setShowEventModal(false);
            }
          }}
        >
          <div class="bg-card rounded-lg border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold">New Event</h3>
              <button
                onClick={() => setShowEventModal(false)}
                class="p-1 hover:bg-accent rounded-lg transition-colors"
              >
                <IconX class="size-4" />
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={newEvent().title}
                  onInput={(e) => setNewEvent({ ...newEvent(), title: e.currentTarget.value })}
                  class="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newEvent().description}
                  onChange={(e) => setNewEvent({ ...newEvent(), description: e.target.value })}
                  placeholder="Enter event description"
                  rows={3}
                  class="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={newEvent().type}
                    onChange={(e) => setNewEvent({ ...newEvent(), type: e.target.value as any })}
                    class="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  >
                    <option value="task">Task</option>
                    <option value="meeting">Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="reminder">Reminder</option>
                    <option value="habit">Habit</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={newEvent().priority}
                    onChange={(e) => setNewEvent({ ...newEvent(), priority: e.target.value as any })}
                    class="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={newEvent().location}
                  onChange={(e) => setNewEvent({ ...newEvent(), location: e.target.value })}
                  placeholder="Enter location (optional)"
                  class="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                />
              </div>

              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="all-day"
                  checked={newEvent().is_all_day}
                  onChange={(e) => {
                    const isAllDay = e.target.checked;
                    setNewEvent({ 
                      ...newEvent(), 
                      is_all_day: isAllDay,
                      // Reset times when toggling all-day
                      start_time: isAllDay ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString() : new Date().toISOString(),
                      end_time: isAllDay ? new Date(new Date().setHours(23, 59, 59, 999)).toISOString() : ''
                    });
                  }}
                  class="rounded border-border accent-primary"
                />
                <label for="all-day" class="text-sm font-medium cursor-pointer">All day event</label>
              </div>

              <div class="grid grid-cols-1 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-1">
                    {newEvent().is_all_day ? 'Event Date' : 'Start Time'}
                  </label>
                  <DateTimePicker
                    value={newEvent().start_time ? new Date(newEvent().start_time) : undefined}
                    onChange={(date) => {
                      if (date) {
                        if (newEvent().is_all_day) {
                          // For all-day events, set time to beginning of day
                          const startOfDay = new Date(date);
                          startOfDay.setHours(0, 0, 0, 0);
                          setNewEvent({ ...newEvent(), start_time: startOfDay.toISOString() });
                        } else {
                          setNewEvent({ ...newEvent(), start_time: date.toISOString() });
                        }
                      }
                    }}
                    placeholder={newEvent().is_all_day ? "Select event date" : "Select start time"}
                    class="w-full"
                    dateOnly={newEvent().is_all_day}
                  />
                </div>
                {!newEvent().is_all_day && (
                  <div>
                    <label class="block text-sm font-medium mb-1">End Time</label>
                    <DateTimePicker
                      value={newEvent().end_time ? new Date(newEvent().end_time) : undefined}
                      onChange={(date) => {
                        if (date) {
                          setNewEvent({ ...newEvent(), end_time: date.toISOString() });
                        }
                      }}
                      placeholder="Select end time"
                      class="w-full"
                    />
                  </div>
                )}
              </div>

              <div class="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEventModal(false)}
                  class="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createEvent}
                  disabled={!newEvent().title || !newEvent().start_time}
                  class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Event
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Task Detail Modal */}
      <Show when={showTaskDetailModal() && selectedTask()}>
        <div 
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTaskDetailModal(false);
              setSelectedTask(null);
            }
          }}
        >
          <div class="bg-card rounded-lg border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold">Task Details</h3>
              <button
                onClick={() => {
                  setShowTaskDetailModal(false);
                  setSelectedTask(null);
                }}
                class="p-1 hover:bg-accent rounded-lg transition-colors"
              >
                <IconX class="size-4" />
              </button>
            </div>

            <Show when={selectedTask()}>
              {(task) => (
                <div class="space-y-4">
                  {/* Check if this is a "All Events" special task */}
                  {task().title.includes('All Events') ? (
                    <>
                      <div>
                        <h4 class="text-xl font-medium mb-2">{task().title}</h4>
                        <p class="text-sm text-muted-foreground mb-4">{task().description}</p>
                      </div>
                      
                      <div class="space-y-3 max-h-60 overflow-y-auto">
                        {mappedEvents().filter((event: CalendarEvent) => {
                          const eventDate = new Date(event.start_time);
                          const taskDate = new Date(task().start_time);
                          return eventDate.toDateString() === taskDate.toDateString();
                        }).map((event: CalendarEvent) => (
                          <div class="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                               onClick={() => {
                                 setSelectedTask(event);
                               }}>
                            <div class="flex items-start justify-between">
                              <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                  <span class={`text-xs px-2 py-1 rounded-full ${getTypeColor(event.type)}`}>
                                    {event.type}
                                  </span>
                                  <IconFlag class={`size-3 ${getPriorityColor(event.priority)}`} />
                                </div>
                                <h5 class="font-medium text-sm">{event.title}</h5>
                                <p class="text-xs text-muted-foreground mt-1">
                                  {formatTime(event.start_time)} - {formatTime(event.end_time)}
                                </p>
                                {event.location && (
                                  <p class="text-xs text-muted-foreground">{event.location}</p>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleEventCompletion(event.id);
                                }}
                                class={`p-1 rounded hover:bg-accent transition-colors ${
                                  event.is_completed ? 'text-green-500' : 'text-muted-foreground'
                                }`}
                              >
                                <IconCheck class="size-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h4 class="text-xl font-medium mb-2">{task().title}</h4>
                        <div class="flex items-center gap-2 mb-3">
                          <span class={`text-xs px-2 py-1 rounded-full ${getTypeColor(task().type)}`}>
                            {task().type}
                          </span>
                          <IconFlag class={`size-3 ${getPriorityColor(task().priority)}`} />
                          <span class="text-xs text-muted-foreground">
                            {task().priority.charAt(0).toUpperCase() + task().priority.slice(1)} Priority
                          </span>
                        </div>
                      </div>

                      {task().description && (
                        <div>
                          <h5 class="text-sm font-medium mb-1">Description</h5>
                          <p class="text-sm text-muted-foreground">{task().description}</p>
                        </div>
                      )}

                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <h5 class="text-sm font-medium mb-1">Start Time</h5>
                          <p class="text-sm text-muted-foreground">
                            {formatDateTime(task().start_time)}
                          </p>
                        </div>
                        <div>
                          <h5 class="text-sm font-medium mb-1">End Time</h5>
                          <p class="text-sm text-muted-foreground">
                            {formatDateTime(task().end_time)}
                          </p>
                        </div>
                      </div>

                      {task().location && (
                        <div>
                          <h5 class="text-sm font-medium mb-1">Location</h5>
                          <p class="text-sm text-muted-foreground">{task().location}</p>
                        </div>
                      )}

                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium">Status:</span>
                        <span class={`text-sm ${task().is_completed ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {task().is_completed ? 'Completed' : 'Pending'}
                        </span>
                      </div>

                      {task().is_all_day && (
                        <div class="flex items-center gap-2">
                          <IconCalendar class="size-4 text-muted-foreground" />
                          <span class="text-sm text-muted-foreground">All-day event</span>
                        </div>
                      )}

                      <div class="flex gap-3 pt-4">
                        <button
                          onClick={() => {
                            toggleEventCompletion(task().id);
                            setShowTaskDetailModal(false);
                            setSelectedTask(null);
                          }}
                          class={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                            task().is_completed 
                              ? 'bg-orange-500 text-white hover:bg-orange-600' 
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                        >
                          {task().is_completed ? 'Mark as Incomplete' : 'Mark as Complete'}
                        </button>
                        <button
                          onClick={() => {
                            setShowTaskDetailModal(false);
                            setSelectedTask(null);
                          }}
                          class="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}
