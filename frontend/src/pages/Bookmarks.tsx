import { createSignal, onMount, Show } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BookmarkModal } from '@/components/ui/BookmarkModal';
import { EditBookmarkModal } from '@/components/ui/EditBookmarkModal';
import { VideoUploadModal } from '@/components/ui/VideoUploadModal';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { SearchTagFilterBar } from '@/components/ui/SearchTagFilterBar';
import { IconDotsVertical, IconStar, IconEdit, IconTrash, IconExternalLink, IconVideo, IconBookmark } from '@tabler/icons-solidjs';
import { getApiV1BaseUrl } from '@/lib/api-url';

const API_BASE_URL = getApiV1BaseUrl();

interface BookmarkTag {
  id: number;
  name: string;
  color?: string;
}

interface Bookmark {
  id: number;
  title: string;
  url: string;
  description?: string;
  // Normalized tags: always string[] for easier filtering/rendering
  tags: string[];
  created_at?: string;
  isImportant?: boolean;
  favicon?: string;
  screenshot?: string;
  screenshot_thumbnail?: string;
  screenshot_medium?: string;
  screenshot_large?: string;
  screenshot_original?: string;
}

export const Bookmarks = () => {
  const adaptBookmarkFromApi = (raw: any): Bookmark => {
    const rawTags: BookmarkTag[] | string[] | undefined = raw.tags;
    let tags: string[] = [];

    if (Array.isArray(rawTags)) {
      if (rawTags.length > 0 && typeof rawTags[0] === 'string') {
        tags = rawTags as string[];
      } else {
        tags = (rawTags as BookmarkTag[]).map((t) => t.name).filter(Boolean);
      }
    }

    return {
      id: raw.id,
      title: raw.title || raw.url,
      url: raw.url,
      description: raw.description,
      tags,
      created_at: raw.created_at,
      isImportant: raw.is_favorite ?? raw.isImportant ?? false,
      favicon: raw.favicon,
      screenshot: raw.screenshot,
      screenshot_thumbnail: raw.screenshot_thumbnail,
      screenshot_medium: raw.screenshot_medium,
      screenshot_large: raw.screenshot_large,
      screenshot_original: raw.screenshot_original,
    };
  };

  const getFaviconUrl = (bookmark: Bookmark) => {
    if (bookmark.favicon) return bookmark.favicon;
    try {
      const url = new URL(bookmark.url);
      const baseUrl = `${url.protocol}//${url.hostname}`;
      
      // Try multiple favicon sources
      const faviconSources = [
        `${baseUrl}/favicon.ico`,
        `${baseUrl}/favicon.png`,
        `${baseUrl}/img/favicons/favicon-32x32.png`,
        `${baseUrl}/img/favicons/favicon-16x16.png`,
        `${baseUrl}/logo-without-border.svg`,
        `${baseUrl}/logo.svg`,
        `${baseUrl}/icon.svg`,
        `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`
      ];
      
      return faviconSources[0]; // Return first source, fallback will be handled by error
    } catch {
      return '';
    }
  };

  const getScreenshotUrl = (bookmark: Bookmark) => {
    return (
      bookmark.screenshot_medium ||
      bookmark.screenshot ||
      bookmark.screenshot_large ||
      bookmark.screenshot_thumbnail ||
      bookmark.screenshot_original ||
      ''
    );
  };

  const [bookmarks, setBookmarks] = createSignal<Bookmark[]>([]);
  const [videoBookmarks, setVideoBookmarks] = createSignal<any[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isLoadingVideos, setIsLoadingVideos] = createSignal(true);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedTag, setSelectedTag] = createSignal('');
  const [videoSearchTerm, setVideoSearchTerm] = createSignal('');
  const [videoSelectedTag, setVideoSelectedTag] = createSignal('');
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [showVideoModal, setShowVideoModal] = createSignal(false);
  const [editingBookmark, setEditingBookmark] = createSignal<Bookmark | null>(null);
  const [activeTab, setActiveTab] = createSignal<'bookmarks' | 'videos'>('bookmarks');
  // We no longer show inline HTML content previews, only the bookmark cards themselves

  onMount(async () => {
    try {
      // Load regular bookmarks
      const bookmarksResponse = await fetch(`${API_BASE_URL}/bookmarks`, {
        headers: {
          'Authorization': localStorage.getItem('trackeep_token') ? `Bearer ${localStorage.getItem('trackeep_token')}` : '',
        },
      });
      if (!bookmarksResponse.ok) {
        throw new Error('Failed to load bookmarks');
      }
      const bookmarksData = await bookmarksResponse.json();

      // Normalize API response:
      // - Ensure we always work with an array
      // - Map Tag objects to simple string[]
      const normalized: Bookmark[] = (Array.isArray(bookmarksData) ? bookmarksData : []).map(adaptBookmarkFromApi);

      setBookmarks(normalized);

      // Load video bookmarks
      try {
        const videosResponse = await fetch(`${API_BASE_URL}/youtube/videos`, {
          headers: {
            'Authorization': localStorage.getItem('trackeep_token') ? `Bearer ${localStorage.getItem('trackeep_token')}` : '',
          },
        });
        
        if (videosResponse.ok) {
          const videosData = await videosResponse.json();
          setVideoBookmarks(Array.isArray(videosData) ? videosData : []);
        } else {
          setVideoBookmarks([]);
        }
      } catch (videoError) {
        console.warn('Failed to load video bookmarks:', videoError);
        setVideoBookmarks([]);
      }
      
      setIsLoadingVideos(false);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      setBookmarks([]);
      setVideoBookmarks([]);
      setIsLoadingVideos(false);
    } finally {
      setIsLoading(false);
    }
  });

  // Get all unique tags from bookmarks
  const getAllTags = () => {
    const tags = new Set<string>();
    bookmarks().forEach((bookmark) => {
      (bookmark.tags || []).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  };

  // Get all unique tags from video bookmarks
  const getAllVideoTags = () => {
    const tags = new Set<string>();
    videoBookmarks().forEach((video) => {
      (video.tags || []).forEach((tag: any) => tags.add(tag.name));
    });
    return Array.from(tags).sort();
  };

  const filteredBookmarks = () => {
    const term = searchTerm().toLowerCase();
    const tag = selectedTag();
    
    return bookmarks().filter(bookmark => {
      const matchesSearch = !term || 
        bookmark.title.toLowerCase().includes(term) ||
        bookmark.url.toLowerCase().includes(term) ||
        bookmark.description?.toLowerCase().includes(term) ||
        (bookmark.tags || []).some((t) => t.toLowerCase().includes(term));
      
      const matchesTag = !tag || (bookmark.tags || []).includes(tag);
      
      return matchesSearch && matchesTag;
    });
  };

  const filteredVideoBookmarks = () => {
    const term = videoSearchTerm().toLowerCase();
    const tag = videoSelectedTag();
    
    return videoBookmarks().filter(video => {
      const matchesSearch = !term || 
        video.title.toLowerCase().includes(term) ||
        video.description.toLowerCase().includes(term) ||
        video.channel.toLowerCase().includes(term) ||
        (video.tags || []).some((t: any) => t.name.toLowerCase().includes(term));
      
      const matchesTag = !tag || (video.tags || []).some((t: any) => t.name === tag);
      
      return matchesSearch && matchesTag;
    });
  };

  // We no longer fetch or display full page metadata/content previews here.

  const handleAddBookmark = async (bookmarkData: any) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      const response = await fetch(`${API_BASE_URL}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('trackeep_token') ? `Bearer ${localStorage.getItem('trackeep_token')}` : '',
        },
        body: JSON.stringify(bookmarkData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create bookmark');
      }

      const raw = await response.json();
      const newBookmark = adaptBookmarkFromApi(raw);
      setBookmarks(prev => [newBookmark, ...prev]);
      setShowAddModal(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add bookmark');
    }
  };

  const toggleImportant = (bookmarkId: number) => {
    setBookmarks((prev) =>
      prev.map((bookmark) =>
        bookmark.id === bookmarkId
          ? { ...bookmark, isImportant: !bookmark.isImportant }
          : bookmark
      )
    );
  };

  const deleteBookmark = async (bookmarkId: number) => {
    if (confirm('Are you sure you want to delete this bookmark?')) {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
        const response = await fetch(`${API_BASE_URL}/bookmarks/${bookmarkId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': localStorage.getItem('trackeep_token') ? `Bearer ${localStorage.getItem('trackeep_token')}` : '',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete bookmark');
        }

        setBookmarks(prev => prev.filter(bookmark => bookmark.id !== bookmarkId));
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete bookmark');
      }
    }
  };

  const editBookmark = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setShowEditModal(true);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag((current) => (current === tag ? '' : tag));
    setSearchTerm(''); // Clear search when filtering by tag
  };

  const handleVideoTagClick = (tag: string) => {
    setVideoSelectedTag((current) => (current === tag ? '' : tag));
    setVideoSearchTerm(''); // Clear search when filtering by tag
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedTag('');
  };

  const resetVideoFilters = () => {
    setVideoSearchTerm('');
    setVideoSelectedTag('');
  };

  const handleEditBookmark = async (bookmarkData: Partial<Bookmark>) => {
    if (!editingBookmark()) return;

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
      const response = await fetch(`${API_BASE_URL}/bookmarks/${editingBookmark()!.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('trackeep_token') ? `Bearer ${localStorage.getItem('trackeep_token')}` : '',
        },
        body: JSON.stringify(bookmarkData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update bookmark');
      }

      const raw = await response.json();
      const updatedBookmark = adaptBookmarkFromApi(raw);
      setBookmarks(prev => 
        prev.map(bookmark => 
          bookmark.id === updatedBookmark.id ? updatedBookmark : bookmark
        )
      );
      setShowEditModal(false);
      setEditingBookmark(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update bookmark');
    }
  };

  const handleVideoSubmit = async (video: any) => {
    try {
      // Use the YouTube API to add video
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/youtube/video-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('trackeep_token') || localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ video_id: video.video_id })
      });
      
      if (response.ok) {
        console.log('Video added:', video);
      } else {
        console.warn('Video save endpoint returned non-OK status');
      }
      setShowVideoModal(false);
    } catch (error) {
      console.error('Failed to add video:', error);
      setShowVideoModal(false);
    }
  };

  return (
    <div class="p-6 space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-foreground">Bookmarks</h1>
        </div>
        <Show when={activeTab() === 'bookmarks'}>
          <Button onClick={() => setShowAddModal(true)}>
            <IconBookmark class="size-4 mr-2" />
            Add Bookmark
          </Button>
        </Show>
        <Show when={activeTab() === 'videos'}>
          <Button onClick={() => setShowVideoModal(true)}>
            <IconVideo class="size-4 mr-2" />
            Add Video
          </Button>
        </Show>
      </div>

      {/* Tabs */}
      <div class="border-b border-border">
        <nav class="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('bookmarks')}
            class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab() === 'bookmarks'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            }`}
          >
            <IconBookmark class={`size-4 ${activeTab() === 'bookmarks' ? 'text-primary' : 'text-muted-foreground'}`} />
            Web Bookmarks
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            class={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab() === 'videos'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            }`}
          >
            <IconVideo class={`size-4 ${activeTab() === 'videos' ? 'text-primary' : 'text-muted-foreground'}`} />
            Video Bookmarks
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      <Show when={activeTab() === 'bookmarks'}>
        <SearchTagFilterBar
          searchPlaceholder="Search bookmarks..."
          searchValue={searchTerm()}
          onSearchChange={(value) => setSearchTerm(value)}
          tagOptions={getAllTags()}
          selectedTag={selectedTag()}
          onTagChange={(value) => setSelectedTag(value)}
          onReset={resetFilters}
        />

        <BookmarkModal
          isOpen={showAddModal()}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddBookmark}
          availableTags={getAllTags()}
        />

        <EditBookmarkModal
          isOpen={showEditModal()}
          onClose={() => {
            setShowEditModal(false);
            setEditingBookmark(null);
          }}
          onSubmit={handleEditBookmark}
          bookmark={editingBookmark()}
          availableTags={getAllTags()}
        />

        {isLoading() ? (
          <div class="space-y-4">
            {[...Array(3)].map(() => (
              <Card class="p-6">
                <div class="animate-pulse">
                  <div class="h-6 bg-muted rounded mb-2"></div>
                  <div class="h-4 bg-muted rounded mb-2 w-3/4"></div>
                  <div class="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div class="space-y-4">
            {filteredBookmarks().map((bookmark) => {
              const faviconUrl = getFaviconUrl(bookmark);
              const screenshotUrl = getScreenshotUrl(bookmark);
              return (
                <Card class="p-6 hover:bg-accent transition-colors group">
                  <div class="flex justify-between items-start gap-4">
                    {/* Left side: preview image + favicon + title + URL + tags */}
                    <div class="flex-1 min-w-0">
                      {screenshotUrl && (
                        <div class="mb-3 rounded-md overflow-hidden border border-border bg-muted/40">
                          <img
                            src={screenshotUrl}
                            alt="Website preview"
                            class="w-full h-32 sm:h-40 object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div class="flex items-center gap-3 mb-2">
                        <div class="flex-shrink-0 w-8 h-8 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                          {faviconUrl ? (
                            <img
                              src={faviconUrl}
                              alt=""
                              class="w-6 h-6 object-contain"
                              onError={(e) => {
                                const img = e.currentTarget;
                                const url = new URL(bookmark.url);
                                const baseUrl = `${url.protocol}//${url.hostname}`;
                                
                                // Try next favicon source
                                const faviconSources = [
                                  `${baseUrl}/favicon.ico`,
                                  `${baseUrl}/favicon.png`,
                                  `${baseUrl}/img/favicons/favicon-32x32.png`,
                                  `${baseUrl}/img/favicons/favicon-16x16.png`,
                                  `${baseUrl}/logo-without-border.svg`,
                                  `${baseUrl}/logo.svg`,
                                  `${baseUrl}/icon.svg`,
                                  `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`
                                ];
                                
                                const currentSrc = img.src;
                                const currentIndex = faviconSources.findIndex(src => currentSrc.includes(src));
                                
                                if (currentIndex < faviconSources.length - 1) {
                                  img.src = faviconSources[currentIndex + 1];
                                } else {
                                  img.style.display = 'none';
                                  img.parentElement!.innerHTML = `<span class="text-xs text-muted-foreground font-medium">${bookmark.title.charAt(0).toUpperCase()}</span>`;
                                }
                              }}
                            />
                          ) : (
                            <span class="text-xs text-muted-foreground font-medium">
                              {bookmark.title.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div class="flex-1 min-w-0">
                          <h3 class="text-lg font-semibold text-foreground truncate">
                            <a
                              href={bookmark.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                            >
                              {bookmark.title}
                              <IconExternalLink class="size-5 ml-1.5 flex-shrink-0 text-current group-hover:text-white" />
                            </a>
                          </h3>
                          <p class="text-muted-foreground text-sm truncate">{bookmark.url}</p>
                        </div>
                      </div>

                    {bookmark.description && (
                      <p class="text-foreground text-sm mb-3 line-clamp-2">{bookmark.description}</p>
                    )}

                    <div class="flex flex-wrap gap-2 mt-1">
                      {(bookmark.tags || []).map((tag) => (
                        <button
                          onClick={() => handleTagClick(tag)}
                          class={`px-2 py-1 text-xs rounded-md border transition-colors cursor-pointer
                            ${selectedTag() === tag
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/80 text-muted-foreground border-transparent group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-border'
                            }`}
                          title={`Click to filter by ${tag}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right side: optional date above important star + menu */}
                  <div class="flex flex-col items-end gap-2 ml-2">
                    {bookmark.created_at && !isNaN(new Date(bookmark.created_at).getTime()) && (
                      <div class="text-muted-foreground text-xs">
                        {new Date(bookmark.created_at).toLocaleDateString()}
                      </div>
                    )}
                    <div class="flex items-center gap-2">
                      <button
                        onClick={() => toggleImportant(bookmark.id)}
                        class={`flex-shrink-0 p-1 rounded hover:bg-accent/50 transition-colors ${
                          bookmark.isImportant ? 'order-first' : ''
                        }`}
                        title={bookmark.isImportant ? 'Remove from favorites' : 'Mark as favorite'}
                      >
                        <IconStar
                          class={`size-4 ${
                            bookmark.isImportant
                              ? 'text-primary fill-primary'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        />
                      </button>
                      <DropdownMenu
                        trigger={
                          <button class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8">
                            <IconDotsVertical class="size-4" />
                          </button>
                        }
                      >
                        <DropdownMenuItem onClick={() => editBookmark(bookmark)} icon={IconEdit}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleImportant(bookmark.id)}
                          icon={IconStar}
                        >
                          {bookmark.isImportant ? 'Remove from favorites' : 'Mark as favorite'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteBookmark(bookmark.id)}
                          icon={IconTrash}
                          variant="destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </div>
                  </div>
                  </div>
                </Card>
              );
            })}

            {filteredBookmarks().length === 0 && (
              <Card class="p-12 text-center">
                <p class="text-muted-foreground">
                  {searchTerm() ? 'No bookmarks found matching your search.' : 'No bookmarks yet. Add your first bookmark!'}
                </p>
              </Card>
            )}
          </div>
        )}
      </Show>

      <Show when={activeTab() === 'videos'}>
        <SearchTagFilterBar
          searchPlaceholder="Search video bookmarks..."
          searchValue={videoSearchTerm()}
          onSearchChange={(value) => setVideoSearchTerm(value)}
          tagOptions={getAllVideoTags()}
          selectedTag={videoSelectedTag()}
          onTagChange={(value) => setVideoSelectedTag(value)}
          onReset={resetVideoFilters}
        />

        {isLoadingVideos() ? (
          <div class="space-y-4">
            {[...Array(3)].map(() => (
              <Card class="p-6">
                <div class="animate-pulse">
                  <div class="h-6 bg-muted rounded mb-2"></div>
                  <div class="h-4 bg-muted rounded mb-2 w-3/4"></div>
                  <div class="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div class="space-y-4">
            {filteredVideoBookmarks().map((video) => (
              <Card class="p-6 hover:bg-accent transition-colors group">
                <div class="flex justify-between items-start gap-4">
                  <div class="flex gap-4 flex-1">
                    <div class="flex-shrink-0">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        class="w-32 h-20 object-cover rounded-md"
                      />
                    </div>
                    <div class="flex-1">
                      <h3 class="text-lg font-semibold text-foreground mb-2">
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                        >
                          {video.title}
                          <IconExternalLink class="size-5 ml-1.5 flex-shrink-0 text-current group-hover:text-white" />
                        </a>
                      </h3>
                      <p class="text-muted-foreground text-sm mb-2">{video.description}</p>
                      <div class="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{video.channel}</span>
                        <span>•</span>
                        <span>{video.duration}</span>
                        <span>•</span>
                        <span>{video.publishedAt}</span>
                      </div>
                      <div class="flex flex-wrap gap-2 mt-2">
                        {video.tags.map((tag: any) => (
                          <button
                            onClick={() => handleVideoTagClick(tag.name)}
                            class={`px-2 py-1 text-xs rounded-md border transition-colors cursor-pointer
                              ${videoSelectedTag() === tag.name
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted/80 text-muted-foreground border-transparent group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-border'
                              }`}
                            title={`Click to filter by ${tag.name}`}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 ml-2">
                    <DropdownMenu
                      trigger={
                        <button class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8">
                          <IconDotsVertical class="size-4" />
                        </button>
                      }
                    >
                      <DropdownMenuItem
                        onClick={() => window.open(video.url, '_blank')}
                        icon={IconExternalLink}
                      >
                        Open in New Tab
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(video.url)}
                        icon={IconEdit}
                      >
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this video bookmark?')) {
                            setVideoBookmarks(prev => prev.filter(v => v.id !== video.id));
                          }
                        }}
                        icon={IconTrash}
                        variant="destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}

            {filteredVideoBookmarks().length === 0 && (
              <Card class="p-12 text-center">
                <p class="text-muted-foreground">
                  {videoSearchTerm() || videoSelectedTag() ? 'No video bookmarks found matching your search.' : 'No video bookmarks yet. Save your first YouTube video!'}
                </p>
              </Card>
            )}
          </div>
        )}
      </Show>

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={showVideoModal()}
        onClose={() => setShowVideoModal(false)}
        onSubmit={handleVideoSubmit}
      />
    </div>
  );
};
