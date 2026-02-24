import { Button } from '@/components/ui/Button';
import { IconX, IconExternalLink } from '@tabler/icons-solidjs';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: any;
}

export const VideoPreviewModal = (props: VideoPreviewModalProps) => {
  const getEmbedUrl = (videoId: string) => {
    return `https://www.youtube.com/embed/${videoId}`;
  };

  return (
    <>
      {/* Backdrop */}
      {props.isOpen && (
        <div class="fixed inset-0 bg-black/50 z-40 mt-0" onClick={props.onClose} />
      )}

      {/* Modal */}
      <div class={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl transition-all duration-300 z-50 ${
        props.isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`} style="width: 900px; max-width: 90vw; max-height: 80vh;">
        {/* Header */}
        <div class="flex items-center justify-between p-6 border-b border-border">
          <h3 class="text-lg font-semibold truncate pr-4">{props.video?.title}</h3>
          <button
            onClick={props.onClose}
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
          >
            <IconX class="size-4" />
          </button>
        </div>

        {/* Video Player */}
        <div class="p-6">
          <div class="aspect-video bg-black rounded-lg overflow-hidden">
            {props.video && (
              <iframe
                src={getEmbedUrl(props.video.video_id)}
                title={props.video.title}
                class="w-full h-full"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              />
            )}
          </div>
        </div>

        {/* Video Info */}
        <div class="px-6 pb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="text-lg font-medium mb-1">{props.video?.title}</h4>
              <p class="text-muted-foreground text-sm">
                Channel: {props.video?.channel_name}
              </p>
            </div>
            <Button
              onClick={() => window.open(props.video?.url, '_blank')}
              class="flex items-center gap-2"
            >
              <IconExternalLink class="size-4" />
              Open on YouTube
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
