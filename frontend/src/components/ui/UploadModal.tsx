import { createSignal } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { IconX, IconUpload } from '@tabler/icons-solidjs';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadModal = (props: UploadModalProps) => {
  const [isDragging, setIsDragging] = createSignal(false);
  const [uploadedFiles, setUploadedFiles] = createSignal<File[]>([]);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer?.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleFileSelect = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleUpload = async () => {
    const files = uploadedFiles();
    if (files.length === 0) return;

    // Check if we're in demo mode
    const isDemoMode = localStorage.getItem('demoMode') === 'true' || 
                      document.title.includes('Demo Mode') ||
                      window.location.search.includes('demo=true');

    try {
      if (isDemoMode) {
        // Simulate upload in demo mode
        console.log('Demo mode: Simulating upload for files:', files.map(f => f.name));
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reset and close
        setUploadedFiles([]);
        props.onClose();
        alert('Files uploaded successfully! (Demo Mode)');
        return;
      }

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/files/upload`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      // Reset and close
      setUploadedFiles([]);
      props.onClose();
      alert('Files uploaded successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload files');
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      {/* Backdrop */}
      {props.isOpen && (
        <div class="fixed inset-0 bg-black/50 z-[60] mt-0" onClick={props.onClose} />
      )}

      {/* Modal */}
      <div class={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl transition-all duration-300 z-[70] ${
        props.isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`} style="width: min(600px, 90vw); max-height: min(80vh, 600px); overflow-y: auto;">
        {/* Header */}
        <div class="flex items-center justify-between p-6 border-b border-border">
          <h3 class="text-lg font-semibold">Import Documents</h3>
          <button
            onClick={props.onClose}
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
          >
            <IconX class="size-4" />
          </button>
        </div>

        {/* Content */}
        <div class="p-4 sm:p-6 space-y-4">
          {/* Drop Zone */}
          <div
            class={`border-2 border-dashed rounded-lg p-4 sm:p-8 text-center transition-colors ${
              isDragging() 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-muted-foreground'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <IconUpload class="size-8 sm:size-12 mx-auto mb-4 text-muted-foreground" />
            <h4 class="text-base sm:text-lg font-medium mb-2">Drop files here</h4>
            <p class="text-muted-foreground mb-4 text-sm sm:text-base">or click to browse</p>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              class="hidden"
              id="file-input"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              Browse Files
            </Button>
          </div>

          {/* File List */}
          {uploadedFiles().length > 0 && (
            <div class="space-y-2">
              <h4 class="font-medium">Selected Files:</h4>
              {uploadedFiles().map((file, index) => (
                <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">{file.name}</p>
                    <p class="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <IconX class="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div class="flex flex-col sm:flex-row justify-end gap-2 p-4 sm:p-6 border-t border-border">
          <Button variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={uploadedFiles().length === 0}
          >
            Upload {uploadedFiles().length} {uploadedFiles().length === 1 ? 'File' : 'Files'}
          </Button>
        </div>
      </div>
    </>
  );
};
