import { createSignal } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { IconX } from '@tabler/icons-solidjs';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (video: any) => void;
}

export const VideoUploadModal = (props: VideoUploadModalProps) => {
  const [newVideo, setNewVideo] = createSignal({
    url: '',
    title: '',
    description: '',
    tags: ''
  });

  const extractVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : '';
  };

  const handleSubmit = () => {
    const videoId = extractVideoId(newVideo().url);
    if (!videoId) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    const video = {
      video_id: videoId,
      url: newVideo().url,
      title: newVideo().title || `YouTube Video - ${videoId}`,
      description: newVideo().description,
      tags: newVideo().tags.split(',').map(tag => tag.trim()).filter(Boolean),
      channel_name: 'Unknown',
      duration: 'Unknown',
      view_count: '0',
      published_at: new Date().toISOString()
    };
    
    props.onSubmit(video);
    setNewVideo({ url: '', title: '', description: '', tags: '' });
  };

  return (
    <ModalPortal>
      <>
        {/* Backdrop */}
        {props.isOpen && (
          <div class="fixed inset-0 bg-black/50 z-[60]" onClick={props.onClose} />
        )}

        {/* Modal */}
        <div class={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl transition-all duration-300 z-[70] ${
          props.isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`} style="width: min(500px, 90vw); max-height: min(80vh, 600px); overflow-y: auto;">
          {/* Header */}
          <div class="flex items-center justify-between p-4 sm:p-6 border-b border-border">
            <h3 class="text-lg font-semibold">Add YouTube Video</h3>
            <button
              onClick={props.onClose}
              class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
            >
              <IconX class="size-4" />
            </button>
          </div>

        {/* Content */}
        <div class="p-4 sm:p-6 space-y-4">
          <div>
            <label class="text-sm font-medium">YouTube URL</label>
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={newVideo().url}
              onInput={(e) => setNewVideo({ ...newVideo(), url: (e.target as HTMLInputElement).value })}
            />
          </div>

          <div>
            <label class="text-sm font-medium">Title (optional)</label>
            <Input
              placeholder="Video title"
              value={newVideo().title}
              onInput={(e) => setNewVideo({ ...newVideo(), title: (e.target as HTMLInputElement).value })}
            />
          </div>

          <div>
            <label class="text-sm font-medium">Description (optional)</label>
            <textarea
              class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Video description"
              value={newVideo().description}
              onInput={(e) => setNewVideo({ ...newVideo(), description: (e.target as HTMLTextAreaElement).value })}
            />
          </div>

          <div>
            <label class="text-sm font-medium">Tags (comma-separated)</label>
            <Input
              placeholder="tutorial, learning, tech"
              value={newVideo().tags}
              onInput={(e) => setNewVideo({ ...newVideo(), tags: (e.target as HTMLInputElement).value })}
            />
          </div>
        </div>

        {/* Footer */}
        <div class="flex flex-col sm:flex-row justify-end gap-2 p-4 sm:p-6 border-t border-border">
          <Button variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!newVideo().url}
          >
            Add Video
          </Button>
        </div>
        </div>
      </>
    </ModalPortal>
  );
};
