import { createSignal, For, Show, onMount } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VideoPreviewModal } from '@/components/ui/VideoPreviewModal';
import { getMockVideos } from '@/lib/mockData';
import { getAuthHeaders } from '@/lib/auth';
import { 
  IconAlertCircle
} from '@tabler/icons-solidjs';

type TabType = 'search' | 'predefined' | 'bookmarked';

interface YouTubeVideo {
  video_id: string;
  channel_name: string;
  url: string;
  title: string;
  duration?: string;
  published_at?: string;
  view_count?: string;
  category?: string;
}

interface FeaturedChannel {
  id: string;
  name: string;
  channel_id: string;
  description?: string;
}

// VideoCard component
interface VideoCardProps {
  video: YouTubeVideo;
  onPreview: (video: YouTubeVideo) => void;
  onSave?: (video: YouTubeVideo) => void;
}

const VideoCard = (props: VideoCardProps) => (
  <Card class="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
    {/* Thumbnail */}
    <div class="relative aspect-video bg-muted overflow-hidden">
      <img
        src={`https://img.youtube.com/vi/${props.video.video_id}/maxresdefault.jpg`}
        alt={props.video.title}
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        onError={(e) => {
          // Fallback to default thumbnail if maxresdefault fails
          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${props.video.video_id}/hqdefault.jpg`;
        }}
      />
      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200"></div>
      {/* Play button overlay */}
      <div
        class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
        onClick={() => props.onPreview(props.video)}
        role="button"
        aria-label="Play video"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            props.onPreview(props.video);
          }
        }}
      >
        <div class="w-16 h-16 bg-black/70 rounded-full flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
    </div>

    {/* Video Info */}
    <div class="p-4">
      <h3 class="font-semibold text-base mb-2 line-clamp-2 leading-tight">
        {props.video.title}
      </h3>
      <p class="text-sm text-muted-foreground mb-2">
        {props.video.channel_name}
      </p>
      <div class="flex items-center gap-4 text-xs text-muted-foreground mb-2">
        <span>Views: {props.video.view_count}</span>
        <span>Published: {props.video.published_at}</span>
      </div>
      <p class="text-xs text-muted-foreground line-clamp-2">
        Video from {props.video.channel_name}
      </p>
      <div class="mt-3 flex items-center justify-between">
        <span class="text-xs text-muted-foreground">
          YouTube Video
        </span>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => props.onPreview(props.video)}
          >
            Preview
          </Button>
          {props.onSave && (
            <Button
              size="sm"
              onClick={() => props.onSave?.(props.video)}
            >
              Save
            </Button>
          )}
        </div>
      </div>
    </div>
  </Card>
);

export const Youtube = () => {
  const [activeTab, setActiveTab] = createSignal<TabType>('search');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [videos, setVideos] = createSignal<YouTubeVideo[]>([]);
  const [predefinedVideos, setPredefinedVideos] = createSignal<YouTubeVideo[]>([]);
  const [savedVideos, setSavedVideos] = createSignal<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isLoadingPredefined, setIsLoadingPredefined] = createSignal(false);
  const [isLoadingSaved, setIsLoadingSaved] = createSignal(false);
  const [error, setError] = createSignal('');
  const [predefinedError, setPredefinedError] = createSignal('');
  const [showPreviewModal, setShowPreviewModal] = createSignal(false);
  const [selectedVideo, setSelectedVideo] = createSignal<YouTubeVideo | null>(null);
  const [sortBy, setSortBy] = createSignal<'relevance' | 'date' | 'views'>('relevance');
  const [showChannelEditor, setShowChannelEditor] = createSignal(false);
  const [featuredChannels, setFeaturedChannels] = createSignal<FeaturedChannel[]>([
    { id: '1', name: 'NetworkChuck', channel_id: '@NetworkChuck', description: 'Networking and IT tutorials' },
    { id: '2', name: 'Fireship', channel_id: '@Fireship', description: 'High-intensity tech tutorials' },
    { id: '3', name: 'Beyond Fireship', channel_id: '@beyondfireship', description: 'Extended tech content' },
    { id: '4', name: 'Linus Tech Tips', channel_id: '@LinusTechTips', description: 'Technology hardware and reviews' },
    { id: '5', name: 'Mrwhosetheboss', channel_id: '@Mrwhosetheboss', description: 'Tech reviews and comparisons' },
    { id: '6', name: 'JerryRigEverything', channel_id: '@JerryRigEverything', description: 'Durability tests and teardowns' },
    { id: '7', name: 'Jeff Geerling', channel_id: '@JeffGeerling', description: 'Homelab and networking projects' },
    { id: '8', name: 'MKBHD', channel_id: '@mkbhd', description: 'Tech reviews and industry analysis' }
  ]);
  const [newChannelName, setNewChannelName] = createSignal('');
 const [newChannelId, setNewChannelId] = createSignal('');
  const [newChannelDescription, setNewChannelDescription] = createSignal('');
  const [editingChannel, setEditingChannel] = createSignal<FeaturedChannel | null>(null);
  const [successMessage, setSuccessMessage] = createSignal('');
  const [channelFilter, setChannelFilter] = createSignal('');

  // Filter channels based on search query
  const filteredChannels = () => {
    const filter = channelFilter().toLowerCase();
    if (!filter) return featuredChannels();
    
    return featuredChannels().filter(channel =>
      channel.name.toLowerCase().includes(filter) ||
      channel.channel_id.toLowerCase().includes(filter) ||
      (channel.description && channel.description.toLowerCase().includes(filter))
    );
  };

  // Check if we're in demo mode (for display purposes only)
  const isDemoMode = () => {
    const demoMode = localStorage.getItem('demoMode') === 'true' || 
           document.title.includes('Demo Mode') ||
           window.location.search.includes('demo=true');
    console.log('YouTube page - Demo mode check:', {
      localStorage: localStorage.getItem('demoMode'),
      title: document.title,
      search: window.location.search,
      result: demoMode
    });
    return demoMode;
  };

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Get video info from YouTube API using video ID (always use real data)
  const getVideoInfo = async (videoId: string) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      const response = await fetch(`${API_BASE_URL}/youtube/video-details`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ video_id: videoId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`Server error: ${response.status}`);
        }
        throw new Error(errorData?.details || errorData?.error || 'Failed to fetch video info');
      }

      return await response.json();
    } catch (err) {
      console.warn('Failed to get video info from API, using fallback:', err);
      // Return a fallback video object with basic info
      return {
        video_id: videoId,
        channel_name: 'Unknown Channel',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: `Video ${videoId}`,
        duration: 'Unknown',
        published_at: 'Unknown',
        view_count: '0',
        category: 'General'
      };
    }
  };

  // Load predefined channel videos
  const loadPredefinedVideos = async () => {
    setIsLoadingPredefined(true);
    setPredefinedError('');

    try {
      const channels = featuredChannels();
      console.log('Using integrated YouTube service for featured channels');
      
      // Use the integrated backend API
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      
      try {
        // Fetch videos from all featured channels using the integrated API
        const channelPromises = channels.map(async (channel) => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/youtube/channel-videos`,
              {
                method: 'POST',
                headers: {
                  ...getAuthHeaders(),
                },
                body: JSON.stringify({
                  channel_id: channel.channel_id,
                  max_results: 5
                })
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              return data.videos || [];
            } else if (response.status === 401) {
              console.warn(`Authentication required for ${channel.name}`);
              return [];
            } else {
              console.warn(`Failed to fetch videos for ${channel.name}:`, response.status);
              return [];
            }
          } catch (error) {
            console.warn(`Error fetching videos for ${channel.name}:`, error);
            return [];
          }
        });

        const allChannelVideos = await Promise.all(channelPromises);
        const allVideos = allChannelVideos.flat();

        // Convert scraping service format to our YouTubeVideo format
        const videos: YouTubeVideo[] = allVideos.map((video: any) => ({
          video_id: video.video_id,
          channel_name: video.channel || 'Unknown Channel',
          url: `https://www.youtube.com/watch?v=${video.video_id}`,
          title: video.title || 'Untitled Video',
          duration: video.length || 'Unknown',
          published_at: video.published_date || video.published_text || 'Unknown',
          view_count: video.views ? video.views.toLocaleString() : '0',
          category: 'General'
        }));

        // Sort by published date (most recent first) and limit to 20 videos
        const sortedVideos = videos
          .sort((a, b) => {
            const dateA = a.published_at && a.published_at !== 'Unknown' ? new Date(a.published_at).getTime() : 0;
            const dateB = b.published_at && b.published_at !== 'Unknown' ? new Date(b.published_at).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 20);
        
        setPredefinedVideos(sortedVideos);
        setIsLoadingPredefined(false);
        return;
      } catch (scraperError) {
        console.warn('YouTube scraping service failed:', scraperError);
      }
      
      // Fallback to backend API
      const YOUTUBE_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      
      try {
        const response = await fetch(`${YOUTUBE_API_BASE_URL}/youtube/predefined-channels`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Convert the API response to our YouTubeVideo format
          const videos: YouTubeVideo[] = data.videos.map((video: any) => ({
            video_id: video.id,
            channel_name: video.channel_title || 'Unknown Channel',
            url: `https://www.youtube.com/watch?v=${video.id}`,
            title: video.title,
            duration: video.duration || 'Unknown',
            published_at: video.published_at || 'Unknown',
            view_count: video.view_count?.toString() || '0',
            category: 'General'
          }));
          
          // Sort by published date (most recent first) and limit to 20 videos
          const sortedVideos = videos
            .sort((a, b) => {
              const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
              const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
              return dateB - dateA;
            })
            .slice(0, 20);
          
          setPredefinedVideos(sortedVideos);
          setIsLoadingPredefined(false);
          return;
        }
      } catch (backendError) {
        console.warn('Backend API failed for featured channels:', backendError);
      }
      
      // Final fallback to demo mode
      console.log('All API methods failed, using demo mode for featured channels');
      const mockVideos = getMockVideos();
      const videos: YouTubeVideo[] = mockVideos.slice(0, 5).map((video) => ({
        video_id: video.id,
        channel_name: video.channel,
        url: video.url,
        title: video.title,
        duration: video.duration,
        published_at: video.publishedAt,
        view_count: '1000',
        category: video.category || 'General'
      }));
      
      setPredefinedVideos(videos);
    } catch (err) {
      console.error('Error in loadPredefinedVideos:', err);
      setPredefinedError(err instanceof Error ? err.message : 'Failed to load predefined channel videos');
      // Fallback to demo mode
      const mockVideos = getMockVideos();
      const videos: YouTubeVideo[] = mockVideos.slice(0, 5).map((video) => ({
        video_id: video.id,
        channel_name: video.channel,
        url: video.url,
        title: video.title,
        duration: video.duration,
        published_at: video.publishedAt,
        view_count: '1000',
        category: video.category || 'General'
      }));
      
      setPredefinedVideos(videos);
    } finally {
      setIsLoadingPredefined(false);
    }
  };

  // Load saved YouTube videos from bookmarks
  const loadSavedVideos = async () => {
    setIsLoadingSaved(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      const response = await fetch(`${API_BASE_URL}/video-bookmarks`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const bookmarks = data.bookmarks || [];

        const videos: YouTubeVideo[] = bookmarks.map((bookmark: any) => ({
          video_id: bookmark.video_id,
          channel_name: bookmark.channel || 'Unknown Channel',
          url: bookmark.url,
          title: bookmark.title || 'Untitled Video',
          duration: 'Unknown',
          published_at: bookmark.created_at || 'Unknown',
          view_count: '0',
          category: 'General',
        }));

        setSavedVideos(videos);
      } else {
        console.warn('Failed to load video bookmarks:', response.status);
        setSavedVideos([]);
      }
    } catch (err) {
      console.warn('Failed to load saved YouTube videos:', err);
      setSavedVideos([]);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  // Add keyboard event handler for ESC key
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showChannelEditor()) {
      setShowChannelEditor(false);
      setEditingChannel(null);
      setNewChannelName('');
      setNewChannelId('');
      setNewChannelDescription('');
    }
  };

  // Add and remove keyboard event listener
  onMount(() => {
    console.log('YouTube page mounted, demo mode:', isDemoMode());
    loadPredefinedVideos();
    loadSavedVideos();
    document.addEventListener('keydown', handleKeyDown);
    
    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  // Load predefined videos when tab is switched to predefined
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'predefined' && predefinedVideos().length === 0) {
      loadPredefinedVideos();
    }
  };

  const handleSearch = async () => {
    const query = searchQuery().trim();
    if (!query) return;

    setIsLoading(true);
    setError('');

    try {
      // Always use real data, no demo mode check
      console.log('Searching YouTube with real data for:', query);

      // Check if the input is a YouTube URL
      const videoId = extractVideoId(query);
      if (videoId) {
        // It's a YouTube URL, get video info directly
        const data = await getVideoInfo(videoId);
        
        const video: YouTubeVideo = {
          video_id: data.video_id,
          channel_name: data.channel_name,
          url: data.url,
          title: data.title,
          duration: data.duration || 'Unknown',
          published_at: data.published_at || 'Unknown',
          view_count: data.view_count || '0',
          category: 'General'
        };
        
        setVideos([video]);
      } else {
        // It's a regular search query - use backend API
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
          const response = await fetch(`${API_BASE_URL}/youtube/search`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ query: query }),
          });

          if (response.ok) {
            const data = await response.json();
            
            // Convert the API response to our YouTubeVideo format
            const videos: YouTubeVideo[] = data.videos.map((video: any) => ({
              video_id: video.id,
              channel_name: video.channel_title || 'Unknown Channel',
              url: `https://www.youtube.com/watch?v=${video.id}`,
              title: video.title,
              duration: video.duration || 'Unknown',
              published_at: video.published_at || 'Unknown',
              view_count: video.view_count?.toString() || '0',
              category: 'General'
            }));
            
            setVideos(videos);
          } else {
            throw new Error('Search API failed');
          }
        } catch (apiError) {
          console.warn('Backend search API failed:', apiError);
          throw new Error('Failed to search YouTube. Please try again.');
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to search YouTube');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleInput = (e: InputEvent) => {
    const target = e.currentTarget as HTMLInputElement;
    if (target) {
      setSearchQuery(target.value);
    }
  };

  const handlePreviewVideo = (video: YouTubeVideo) => {
    setSelectedVideo(video);
    setShowPreviewModal(true);
  };

  const handleSaveVideo = async (video: YouTubeVideo) => {
    try {
      // Always try to save to backend, no demo mode check
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      const bookmarkData = {
        url: video.url,
        description: `Video from ${video.channel_name}`,
        tags: '',
        is_favorite: false,
      };

      const response = await fetch(`${API_BASE_URL}/video-bookmarks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(bookmarkData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create bookmark');
      }

      const result = await response.json();
      console.log('Video bookmarked successfully:', result);

      // Refresh saved videos
      await loadSavedVideos();

      setSuccessMessage('Video saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.warn('Failed to save video to backend:', err);
      // Fallback: simulate save locally
      setSavedVideos((prev) => {
        if (prev.some((v) => v.video_id === video.video_id)) {
          return prev;
        }
        return [video, ...prev];
      });
      setSuccessMessage('Video saved locally!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  return (
    <div class="min-h-screen bg-background p-6">
      <div class="max-w-7xl mx-auto">
        {/* Header */}
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold tracking-tight mb-2">YouTube Video Storage</h1>
              <p class="text-muted-foreground">Search, discover, and store YouTube videos</p>
              <Show when={isDemoMode()}>
                <div class="flex items-center gap-2 mt-2">
                  <span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                    Demo Mode
                  </span>
                  <span class="text-sm text-muted-foreground">Using sample data</span>
                </div>
              </Show>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Card class="p-6 mb-8">
          <div class="flex space-x-1 mb-6">
            <Button
              variant={activeTab() === 'search' ? 'default' : 'ghost'}
              onClick={() => handleTabChange('search')}
              class="flex items-center gap-2"
            >
              <svg 
                class="w-4 h-4 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search & Save
            </Button>
            <Button
              variant={activeTab() === 'predefined' ? 'default' : 'ghost'}
              onClick={() => handleTabChange('predefined')}
              class="flex items-center gap-2"
            >
              <svg 
                class="w-4 h-4 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Featured Channels
            </Button>
            <Button
              variant={activeTab() === 'bookmarked' ? 'default' : 'ghost'}
              onClick={() => handleTabChange('bookmarked')}
              class="flex items-center gap-2"
            >
              <svg 
                class="w-4 h-4 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Bookmarked Videos
            </Button>
          </div>

          {/* Search Tab Content */}
          <Show when={activeTab() === 'search'}>
            <div class="space-y-4">
              {/* Search Input */}
              <div class="flex gap-4">
                <div class="flex-1">
                  <Input
                    type="text"
                    placeholder="Search for videos, channels, topics, or paste YouTube URLs..."
                    value={searchQuery()}
                    onInput={handleInput}
                    class="text-base"
                    onKeyDown={handleKeyPress}
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={isLoading() || !searchQuery().trim()}
                  size="lg"
                  class="px-8"
                >
                  {isLoading() ? (
                    <span class="flex items-center gap-2">
                      <span class="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
                      Searching...
                    </span>
                  ) : (
                    'Search'
                  )}
                </Button>
              </div>
              
              {/* Filters */}
              <div class="flex flex-wrap gap-4">
                <div class="flex items-center gap-2">
                  <label class="text-sm font-medium">Sort by:</label>
                  <select
                    value={sortBy()}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    class="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date">Date</option>
                    <option value="views">Views</option>
                  </select>
                </div>
              </div>
            </div>
          </Show>

          {/* Predefined Channels Tab Content */}
          <Show when={activeTab() === 'predefined'}>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold">Featured YouTube Channels</h3>
                  <p class="text-sm text-muted-foreground">Latest videos from your selected channels</p>
                </div>
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowChannelEditor(true)}
                  >
                    Edit Channels
                  </Button>
                  <Button
                    variant="outline"
                    onClick={loadPredefinedVideos}
                    disabled={isLoadingPredefined()}
                  >
                    {isLoadingPredefined() ? (
                      <span class="flex items-center gap-2">
                        <span class="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
                        Refreshing...
                      </span>
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Channel Filter */}
              <div class="flex gap-4">
                <div class="flex-1">
                  <Input
                    type="text"
                    placeholder="Filter channels by name, handle, or description..."
                    value={channelFilter()}
                    onInput={(e: InputEvent) => {
                      const target = e.currentTarget as HTMLInputElement;
                      if (target) {
                        setChannelFilter(target.value);
                      }
                    }}
                    class="text-base"
                  />
                </div>
              </div>
            </div>
          </Show>

          {/* Bookmarked Videos Tab Content */}
          <Show when={activeTab() === 'bookmarked'}>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold">Your Bookmarked Videos</h3>
                  <p class="text-sm text-muted-foreground">Videos you have saved for later</p>
                </div>
                <Button
                  variant="outline"
                  onClick={loadSavedVideos}
                  disabled={isLoadingSaved()}
                >
                  {isLoadingSaved() ? (
                    <span class="flex items-center gap-2">
                      <span class="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
                      Refreshing...
                    </span>
                  ) : (
                    'Refresh'
                  )}
                </Button>
              </div>
            </div>
          </Show>
        </Card>

        {/* Error Messages */}
        <Show when={error()}>
          <Card class="p-4 mb-6 border-destructive/20 bg-destructive/5">
            <div class="flex items-center gap-2">
              <IconAlertCircle class="size-4 text-destructive" />
              <p class="text-destructive text-sm">{error()}</p>
            </div>
          </Card>
        </Show>

        <Show when={successMessage()}>
          <Card class="p-4 mb-6 border-primary/20 bg-primary/5">
            <div class="flex items-center gap-2">
              <IconAlertCircle class="size-4 text-primary" />
              <p class="text-primary text-sm">{successMessage()}</p>
            </div>
          </Card>
        </Show>

        <Show when={predefinedError()}>
          <Card class="p-4 mb-6 border-destructive/20 bg-destructive/5">
            <div class="flex items-center gap-2">
              <IconAlertCircle class="size-4 text-destructive" />
              <p class="text-destructive text-sm">{predefinedError()}</p>
            </div>
          </Card>
        </Show>

        {/* Search Results */}
        <Show when={activeTab() === 'search' && videos().length > 0}>
          <div class="mb-6">
            <h2 class="text-xl font-semibold mb-4">Search Results</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <For each={videos()}>
                {(video) => (
                  <VideoCard video={video} onPreview={handlePreviewVideo} onSave={handleSaveVideo} />
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Predefined Channel Videos */}
        <Show when={activeTab() === 'predefined' && predefinedVideos().length > 0}>
          <div class="mb-6">
            <h2 class="text-xl font-semibold mb-4">Latest Videos from Featured Channels</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <For each={predefinedVideos()}>
                {(video) => (
                  <VideoCard video={video} onPreview={handlePreviewVideo} onSave={handleSaveVideo} />
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Bookmarked Videos */}
        <Show when={activeTab() === 'bookmarked' && savedVideos().length > 0}>
          <div class="mb-6">
            <h2 class="text-xl font-semibold mb-4">Your Bookmarked Videos</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <For each={savedVideos()}>
                {(video) => (
                  <VideoCard video={video} onPreview={handlePreviewVideo} />
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Saved Videos */}
        <Show when={savedVideos().length > 0}>
          <div class="mb-6">
            <h2 class="text-xl font-semibold mb-4">Saved Videos</h2>
            {isLoadingSaved() ? (
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <For each={[1, 2, 3]}>
                  {() => (
                    <Card class="h-full p-4 animate-pulse">
                      <div class="aspect-video bg-muted rounded mb-3" />
                      <div class="h-4 bg-muted rounded mb-2" />
                      <div class="h-3 bg-muted rounded w-2/3" />
                    </Card>
                  )}
                </For>
              </div>
            ) : (
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <For each={savedVideos()}>
                  {(video) => (
                    <VideoCard video={video} onPreview={handlePreviewVideo} />
                  )}
                </For>
              </div>
            )}
          </div>
        </Show>

        {/* Bookmarked tab empty state */}
        <Show when={activeTab() === 'bookmarked' && !isLoadingSaved() && savedVideos().length === 0}>
          <Card class="p-12 text-center">
            <div class="max-w-md mx-auto">
              <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold mb-2">No bookmarked videos</h3>
              <p class="text-muted-foreground">
                Start saving videos from the search results to see them here.
              </p>
            </div>
          </Card>
        </Show>

        {/* Bookmarked tab loading state */}
        <Show when={activeTab() === 'bookmarked' && isLoadingSaved()}>
          <Card class="p-12 text-center">
            <div class="max-w-md mx-auto">
              <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></span>
              </div>
              <h3 class="text-lg font-semibold mb-2">Loading Bookmarked Videos</h3>
              <p class="text-muted-foreground">
                Fetching your saved videos...
              </p>
            </div>
          </Card>
        </Show>

        {/* Empty States */}
        {/* Search tab empty state */}
        <Show when={activeTab() === 'search' && !isLoading() && videos().length === 0 && searchQuery()}>
          <Card class="p-12 text-center">
            <div class="max-w-md mx-auto">
              <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold mb-2">No videos found</h3>
              <p class="text-muted-foreground">
                Try searching with different keywords or check your spelling.
              </p>
            </div>
          </Card>
        </Show>

        {/* Search tab initial state */}
        <Show when={activeTab() === 'search' && !searchQuery()}>
          <Card class="p-12 text-center">
            <div class="max-w-md mx-auto">
              <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold mb-2">Search YouTube Videos</h3>
              <p class="text-muted-foreground">
                Enter keywords above to search for videos, channels, or topics. Use filters to narrow down your results.
              </p>
            </div>
          </Card>
        </Show>

        {/* Predefined tab loading state */}
        <Show when={activeTab() === 'predefined' && isLoadingPredefined()}>
          <Card class="p-12 text-center">
            <div class="max-w-md mx-auto">
              <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></span>
              </div>
              <h3 class="text-lg font-semibold mb-2">Loading Featured Videos</h3>
              <p class="text-muted-foreground">
                Fetching latest videos from NetworkChuck, Fireship, and Beyond Fireship...
              </p>
            </div>
          </Card>
        </Show>

        {/* Predefined tab empty state */}
        <Show when={activeTab() === 'predefined' && !isLoadingPredefined() && predefinedVideos().length === 0 && !predefinedError()}>
          <Card class="p-12 text-center">
            <div class="max-w-md mx-auto">
              <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold mb-2">No Videos Available</h3>
              <p class="text-muted-foreground">
                Click the Refresh button to load the latest videos from featured channels.
              </p>
            </div>
          </Card>
        </Show>

        {/* Video Preview Modal */}
        <VideoPreviewModal
          isOpen={showPreviewModal()}
          onClose={() => setShowPreviewModal(false)}
          video={selectedVideo()}
        />

        {/* Channel Editor Modal */}
        <Show when={showChannelEditor()}>
          <div 
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 mt-0"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowChannelEditor(false);
                setEditingChannel(null);
                setNewChannelName('');
                setNewChannelId('');
                setNewChannelDescription('');
              }
            }}
          >
            <div class="bg-background rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                  <h2 class="text-xl font-semibold">Manage Featured Channels</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowChannelEditor(false);
                      setEditingChannel(null);
                      setNewChannelName('');
                      setNewChannelId('');
                      setNewChannelDescription('');
                    }}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>

                {/* Add New Channel Form */}
                <div class="mb-6 p-4 border rounded-lg">
                  <h3 class="font-semibold mb-4">
                    {editingChannel() ? 'Edit Channel' : 'Add New Channel'}
                  </h3>
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium mb-2">Channel Name</label>
                      <Input
                        type="text"
                        placeholder="e.g., Fireship"
                        value={newChannelName()}
                        onInput={(e: InputEvent) => {
                          const target = e.currentTarget as HTMLInputElement;
                          if (target) {
                            setNewChannelName(target.value);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium mb-2">Channel Handle or URL</label>
                      <Input
                        type="text"
                        placeholder="e.g., @Fireship or https://www.youtube.com/@Fireship/videos"
                        value={newChannelId()}
                        onInput={(e: InputEvent) => {
                          const target = e.currentTarget as HTMLInputElement;
                          if (target) {
                            setNewChannelId(target.value);
                          }
                        }}
                      />
                      <p class="text-xs text-muted-foreground mt-1">
                        Use the channel handle or full channel URL as accepted by the YouTube Channel Scraper API.
                      </p>
                    </div>
                    <div>
                      <label class="block text-sm font-medium mb-2">Description (Optional)</label>
                      <Input
                        type="text"
                        placeholder="Brief description of the channel"
                        value={newChannelDescription()}
                        onInput={(e: InputEvent) => {
                          const target = e.currentTarget as HTMLInputElement;
                          if (target) {
                            setNewChannelDescription(target.value);
                          }
                        }}
                      />
                    </div>
                    <div class="flex gap-2">
                      <Button
                        onClick={() => {
                          if (newChannelName() && newChannelId()) {
                            if (editingChannel()) {
                              // Update existing channel
                              setFeaturedChannels(prev => 
                                prev.map(ch => 
                                  ch.id === editingChannel()!.id 
                                    ? { ...ch, name: newChannelName(), channel_id: newChannelId(), description: newChannelDescription() }
                                    : ch
                                )
                              );
                            } else {
                              // Add new channel
                              const newChannel: FeaturedChannel = {
                                id: Date.now().toString(),
                                name: newChannelName(),
                                channel_id: newChannelId(),
                                description: newChannelDescription()
                              };
                              setFeaturedChannels(prev => [...prev, newChannel]);
                            }
                            // Reset form
                            setNewChannelName('');
                            setNewChannelId('');
                            setNewChannelDescription('');
                            setEditingChannel(null);
                          }
                        }}
                        disabled={!newChannelName() || !newChannelId()}
                      >
                        {editingChannel() ? 'Update Channel' : 'Add Channel'}
                      </Button>
                      {editingChannel() && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingChannel(null);
                            setNewChannelName('');
                            setNewChannelId('');
                            setNewChannelDescription('');
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Current Channels List */}
                <div>
                  <h3 class="font-semibold mb-4">Current Channels ({filteredChannels().length})</h3>
                  <div class="space-y-2">
                    <For each={filteredChannels()}>
                      {(channel) => (
                        <div class="flex items-center justify-between p-3 border rounded-lg">
                          <div class="flex-1">
                            <h4 class="font-medium">{channel.name}</h4>
                            <p class="text-sm text-muted-foreground">Handle/URL: {channel.channel_id}</p>
                            {channel.description && (
                              <p class="text-xs text-muted-foreground">{channel.description}</p>
                            )}
                          </div>
                          <div class="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingChannel(channel);
                                setNewChannelName(channel.name);
                                setNewChannelId(channel.channel_id);
                                setNewChannelDescription(channel.description || '');
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setFeaturedChannels(prev => prev.filter(ch => ch.id !== channel.id));
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </For>
                    {filteredChannels().length === 0 && (
                      <div class="text-center py-8 text-muted-foreground">
                        <p>No channels found matching "{channelFilter()}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};
