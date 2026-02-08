import { createSignal } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { IconX, IconDownload, IconExternalLink, IconEye, IconFile, IconCode, IconFileText } from '@tabler/icons-solidjs';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: any;
}

export const FilePreviewModal = (props: FilePreviewModalProps) => {
  const [previewError, setPreviewError] = createSignal(false);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <IconEye class="size-8" />;
    if (fileType.startsWith('video/')) return <IconEye class="size-8" />;
    if (fileType.startsWith('audio/')) return <IconEye class="size-8" />;
    if (fileType.includes('pdf')) return <IconFileText class="size-8" />;
    if (fileType.includes('json') || fileType.includes('xml') || fileType.includes('csv')) return <IconCode class="size-8" />;
    if (fileType.startsWith('text/') || fileType === 'txt' || fileType === 'md') return <IconFileText class="size-8" />;
    if (fileType === 'docx' || fileType === 'pptx' || fileType === 'xlsx') return <IconFileText class="size-8" />;
    return <IconFile class="size-8" />;
  };

  const getFilePreview = (file: any) => {
    if (previewError()) {
      return (
        <div class="w-full h-full bg-muted p-8 rounded flex items-center justify-center">
          <div class="text-center">
            <div class="text-6xl mb-4">⚠️</div>
            <p class="text-lg font-medium mb-2">Preview Failed</p>
            <p class="text-muted-foreground mb-4">Unable to load preview for this file</p>
            <Button onClick={() => window.open(file.downloadUrl || '#', '_blank')}>
              Download File
            </Button>
          </div>
        </div>
      );
    }

    if (file.type.startsWith('image/')) {
      return (
        <div class="w-full h-full flex items-center justify-center bg-black/5 rounded">
          <img
            src={file.preview || file.url || `https://picsum.photos/seed/${file.name}/800/600.jpg`}
            alt={file.name}
            class="max-w-full max-h-full object-contain rounded"
            onError={() => setPreviewError(true)}
            onLoad={() => setPreviewError(false)}
          />
        </div>
      );
    } else if (file.type.startsWith('video/')) {
      return (
        <div class="w-full h-full flex items-center justify-center bg-black/5 rounded">
          <video controls class="max-w-full max-h-full rounded" preload="metadata">
            <source src={file.preview || file.url} type={file.type} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    } else if (file.type.startsWith('audio/')) {
      return (
        <div class="w-full h-full flex items-center justify-center p-8 bg-muted rounded">
          <div class="w-full max-w-md">
            <audio controls class="w-full mb-4" preload="metadata">
              <source src={file.preview || file.url} type={file.type} />
              Your browser does not support the audio element.
            </audio>
            <div class="text-center">
              <div class="text-4xl mb-2">🎵</div>
              <p class="font-medium">{file.name}</p>
            </div>
          </div>
        </div>
      );
    } else if (file.type.startsWith('text/') || file.type.includes('json') || file.type.includes('xml') || file.type.includes('csv') || file.type === 'txt' || file.type === 'md') {
      return (
        <div class="w-full h-full bg-muted p-4 rounded overflow-auto">
          <pre class="text-sm text-foreground whitespace-pre-wrap break-words font-mono">
            {file.preview || `# Preview of ${file.name}\n\nFile content would be displayed here...\n\nIn a real implementation, this would show the actual file content.\n\nFor text files, this would display the full text content.\nFor code files, this would show syntax-highlighted code.\nFor markdown files, this would render the formatted content.`}
          </pre>
        </div>
      );
    } else if (file.type.includes('pdf')) {
      return (
        <div class="w-full h-full bg-muted p-8 rounded flex items-center justify-center">
          <div class="text-center max-w-md">
            <div class="text-6xl mb-4">📄</div>
            <p class="text-lg font-medium mb-2">PDF Document</p>
            <p class="text-muted-foreground mb-4 truncate">{file.name}</p>
            <div class="space-y-2">
              <Button onClick={() => window.open(file.viewUrl || '#', '_blank')} class="w-full">
                <IconExternalLink class="size-4 mr-2" />
                Open in New Tab
              </Button>
              <Button variant="outline" onClick={() => window.open(file.downloadUrl || '#', '_blank')} class="w-full">
                <IconDownload class="size-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      );
    } else if (file.type === 'docx' || file.type === 'pptx' || file.type === 'xlsx') {
      return (
        <div class="w-full h-full bg-muted p-8 rounded flex items-center justify-center">
          <div class="text-center max-w-md">
            <div class="text-6xl mb-4">
              {file.type === 'docx' ? '📄' : file.type === 'pptx' ? '📊' : '📈'}
            </div>
            <p class="text-lg font-medium mb-2">
              {file.type === 'docx' ? 'Word Document' : file.type === 'pptx' ? 'PowerPoint Presentation' : 'Excel Spreadsheet'}
            </p>
            <p class="text-muted-foreground mb-4 truncate">{file.name}</p>
            {file.preview && (
              <div class="text-left mb-4 p-4 bg-background rounded max-h-40 overflow-y-auto">
                <pre class="text-xs text-muted-foreground whitespace-pre-wrap">{file.preview.substring(0, 200)}...</pre>
              </div>
            )}
            <div class="space-y-2">
              <Button onClick={() => window.open(file.viewUrl || '#', '_blank')} class="w-full">
                <IconExternalLink class="size-4 mr-2" />
                Open in New Tab
              </Button>
              <Button variant="outline" onClick={() => window.open(file.downloadUrl || '#', '_blank')} class="w-full">
                <IconDownload class="size-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div class="w-full h-full bg-muted p-8 rounded flex items-center justify-center">
          <div class="text-center max-w-md">
            {getFileIcon(file.type)}
            <p class="text-lg font-medium mb-2 mt-4">File Preview</p>
            <p class="text-muted-foreground mb-4 truncate">{file.name}</p>
            <div class="space-y-1 text-sm text-muted-foreground">
              <p>Type: {file.type}</p>
              <p>Size: {formatFileSize(file.size)}</p>
            </div>
            {file.preview && (
              <div class="text-left mt-4 p-4 bg-background rounded max-h-32 overflow-y-auto">
                <pre class="text-xs text-muted-foreground whitespace-pre-wrap">{file.preview.substring(0, 150)}...</pre>
              </div>
            )}
            <div class="mt-4 space-y-2">
              <Button onClick={() => window.open(file.downloadUrl || '#', '_blank')} class="w-full">
                <IconDownload class="size-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    // Check if we're in demo mode
    const isDemoMode = localStorage.getItem('demoMode') === 'true' || 
                     document.title.includes('Demo Mode') ||
                     window.location.search.includes('demo=true');
    
    if (isDemoMode) {
      // Simulate download in demo mode
      alert(`Download simulated for: ${props.file.name}\n\nIn production, this would download the actual file.`);
      return;
    }

    // Create download link
    const link = document.createElement('a');
    link.href = props.file?.downloadUrl || '#';
    link.download = props.file?.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Backdrop */}
      {props.isOpen && (
        <div class="fixed inset-0 bg-black/50 z-40" onClick={props.onClose} />
      )}

      {/* Modal */}
      <div class={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl transition-all duration-300 z-50 ${
        props.isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`} style="width: 900px; max-width: 95vw; max-height: 85vh;">
        {/* Header */}
        <div class="flex items-center justify-between p-6 border-b border-border">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <h3 class="text-lg font-semibold truncate">{props.file?.name}</h3>
            <span class="text-sm text-muted-foreground flex-shrink-0">
              {props.file?.size ? formatFileSize(props.file.size) : 'Unknown size'}
            </span>
          </div>
          <button
            onClick={props.onClose}
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8 flex-shrink-0"
          >
            <IconX class="size-4" />
          </button>
        </div>

        {/* Preview Area */}
        <div class="p-6" style="height: 500px;">
          <div class="w-full h-full bg-muted rounded-lg flex items-center justify-center">
            {props.file && getFilePreview(props.file)}
          </div>
        </div>

        {/* Footer */}
        <div class="flex justify-between items-center p-6 border-t border-border">
          <div class="text-sm text-muted-foreground truncate">
            {props.file?.type || 'Unknown file type'}
          </div>
          <div class="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownload}
            >
              <IconDownload class="size-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={() => {
                const url = props.file?.viewUrl || props.file?.url;
                if (url) {
                  window.open(url, '_blank');
                } else {
                  alert('No preview URL available for this file');
                }
              }}
            >
              <IconExternalLink class="size-4 mr-2" />
              Open
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
