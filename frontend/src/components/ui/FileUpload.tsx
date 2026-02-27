import { createSignal, For, Show } from 'solid-js';
import { cn } from '@/lib/utils';
import { ModalPortal } from './ModalPortal';
import './FileUpload.css';

export interface FileUploadProps {
  isOpen?: boolean;
  onClose?: () => void;
  onFilesChange?: (files: UploadedFile[]) => void;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  class?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  url?: string;
}

const defaultAcceptedTypes = [
  'image/jpeg',
  'image/png', 
  'application/pdf',
  'video/mp4'
];

const defaultMaxFileSize = 50; // 50MB

export const FileUpload = (props: FileUploadProps) => {
  const [files, setFiles] = createSignal<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = createSignal(false);
  const [urlInput, setUrlInput] = createSignal('');

  // Generate unique ID for files
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file extension
  const getFileExtension = (filename: string) => {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toUpperCase();
  };

  // Get file icon color based on type
  const getFileTypeColor = (type: string) => {
    if (type.startsWith('image/')) return 'bg-success-base';
    if (type.startsWith('video/')) return 'bg-warning-base';
    if (type === 'application/pdf') return 'bg-error-base';
    return 'bg-neutral-base';
  };

  // Validate file
  const validateFile = (file: File) => {
    const maxSize = (props.maxFileSize || defaultMaxFileSize) * 1024 * 1024;
    const acceptedTypes = props.acceptedTypes || defaultAcceptedTypes;
    
    if (file.size > maxSize) {
      alert(`File size exceeds ${props.maxFileSize || defaultMaxFileSize}MB limit`);
      return false;
    }
    
    if (!acceptedTypes.includes(file.type) && !acceptedTypes.some(type => file.type.includes(type))) {
      alert('File type not supported');
      return false;
    }
    
    return true;
  };

  // Handle file selection
  const handleFileSelect = (selectedFiles: FileList | null | undefined) => {
    if (!selectedFiles) return;
    
    const newFiles: UploadedFile[] = [];
    
    Array.from(selectedFiles).forEach(file => {
      if (validateFile(file)) {
        const uploadedFile: UploadedFile = {
          id: generateId(),
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'uploading',
          progress: 0
        };
        newFiles.push(uploadedFile);
      }
    });
    
    if (newFiles.length > 0) {
      const updatedFiles = [...files(), ...newFiles];
      setFiles(updatedFiles);
      props.onFilesChange?.(updatedFiles);
      
      // Simulate upload progress
      newFiles.forEach(file => {
        simulateUpload(file.id);
      });
    }
  };

  // Simulate file upload
  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        setFiles(prev => prev.map(file => 
          file.id === fileId 
            ? { ...file, status: 'completed', progress: 100 }
            : file
        ));
      } else {
        setFiles(prev => prev.map(file => 
          file.id === fileId 
            ? { ...file, progress }
            : file
        ));
      }
    }, 500);
  };

  // Handle drag events
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
    handleFileSelect(e.dataTransfer?.files);
  };

  // Handle URL import
  const handleUrlImport = () => {
    const url = urlInput().trim();
    if (url) {
      // Extract filename from URL or use default
      const filename = url.split('/').pop() || 'imported-file';
      const extension = filename.includes('.') ? getFileExtension(filename) : 'PDF';
      
      const newFile: UploadedFile = {
        id: generateId(),
        name: filename,
        size: 0, // Unknown size for URL imports
        type: extension === 'PDF' ? 'application/pdf' : 'application/octet-stream',
        status: 'uploading',
        progress: 0,
        url
      };
      
      const updatedFiles = [...files(), newFile];
      setFiles(updatedFiles);
      props.onFilesChange?.(updatedFiles);
      
      // Simulate URL import
      simulateUpload(newFile.id);
      setUrlInput('');
    }
  };

  // Remove file
  const removeFile = (fileId: string) => {
    const updatedFiles = files().filter(file => file.id !== fileId);
    setFiles(updatedFiles);
    props.onFilesChange?.(updatedFiles);
  };

  // Close dialog
  const handleClose = () => {
    props.onClose?.();
  };

  if (!props.isOpen) {
    return null;
  }

  return (
    <ModalPortal>
      <>
        <div class="fixed inset-0 z-[80] bg-black/50" onClick={handleClose} />
        <div class="fixed top-1/2 left-1/2 z-[90] w-[min(440px,90vw)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto">
          <div
            class={cn(
              "relative w-full rounded-20 bg-bg-white-0 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-w-[440px] shadow-custom-md",
              props.class
            )}
            role="dialog"
            aria-labelledby="file-upload-title"
            aria-describedby="file-upload-description"
            data-state="open"
            onClick={(event) => event.stopPropagation()}
          >
      {/* Header */}
      <div class="relative flex items-start gap-3.5 py-4 pl-5 pr-14 before:absolute before:inset-x-0 before:bottom-0 before:border-b before:border-stroke-soft-200">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-white-0 ring-1 ring-inset ring-stroke-soft-200">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="remixicon size-5 text-text-sub-600">
            <path d="M12 12.5858L16.2426 16.8284L14.8284 18.2426L13 16.415V22H11V16.413L9.17157 18.2426L7.75736 16.8284L12 12.5858ZM12 2C15.5934 2 18.5544 4.70761 18.9541 8.19395C21.2858 8.83154 23 10.9656 23 13.5C23 16.3688 20.8036 18.7246 18.0006 18.9776L18.0009 16.9644C19.6966 16.7214 21 15.2629 21 13.5C21 11.567 19.433 10 17.5 10C17.2912 10 17.0867 10.0183 16.8887 10.054C16.9616 9.7142 17 9.36158 17 9C17 6.23858 14.7614 4 12 4C9.23858 4 7 6.23858 7 9C7 9.36158 7.03838 9.7142 7.11205 10.0533C6.91331 10.0183 6.70879 10 6.5 10C4.567 10 3 11.567 3 13.5C3 15.2003 4.21241 16.6174 5.81986 16.934L6.00005 16.9646L6.00039 18.9776C3.19696 18.7252 1 16.3692 1 13.5C1 10.9656 2.71424 8.83154 5.04648 8.19411C5.44561 4.70761 8.40661 2 12 2Z"></path>
          </svg>
        </div>
        <div class="flex-1 space-y-1">
          <h2 id="file-upload-title" class="text-label-sm text-text-strong-950">Upload files</h2>
          <p id="file-upload-description" class="text-paragraph-xs text-text-sub-600">Select and upload the files of your choice</p>
        </div>
      </div>

      {/* Close Button */}
      <button 
        class="flex shrink-0 items-center justify-center outline-none transition duration-200 ease-out disabled:pointer-events-none disabled:border-transparent disabled:bg-transparent disabled:text-text-disabled-300 disabled:shadow-none focus:outline-none bg-transparent text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950 focus-visible:bg-bg-strong-950 focus-visible:text-text-white-0 size-6 rounded-md absolute right-4 top-4"
        onClick={handleClose}
        type="button"
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="remixicon size-5">
          <path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"></path>
        </svg>
      </button>

      <div class="p-5">
        <div class="space-y-4">
          {/* Drag & Drop Area */}
          <label 
            class={cn(
              "flex w-full cursor-pointer flex-col items-center gap-5 rounded-xl border border-dashed border-stroke-sub-300 bg-bg-white-0 p-8 text-center transition duration-200 ease-out hover:bg-bg-weak-50",
              isDragging() && "border-primary-base bg-primary-alpha-10"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input 
              multiple 
              tabindex="-1" 
              class="hidden" 
              type="file"
              accept={props.acceptedTypes?.join(',')}
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="remixicon size-6 text-text-sub-600">
              <path d="M12 12.5858L16.2426 16.8284L14.8284 18.2426L13 16.415V22H11V16.413L9.17157 18.2426L7.75736 16.8284L12 12.5858ZM12 2C15.5934 2 18.5544 4.70761 18.9541 8.19395C21.2858 8.83154 23 10.9656 23 13.5C23 16.3688 20.8036 18.7246 18.0006 18.9776L18.0009 16.9644C19.6966 16.7214 21 15.2629 21 13.5C21 11.567 19.433 10 17.5 10C17.2912 10 17.0867 10.0183 16.8887 10.054C16.9616 9.7142 17 9.36158 17 9C17 6.23858 14.7614 4 12 4C9.23858 4 7 6.23858 7 9C7 9.36158 7.03838 9.7142 7.11205 10.0533C6.91331 10.0183 6.70879 10 6.5 10C4.567 10 3 11.567 3 13.5C3 15.2003 4.21241 16.6174 5.81986 16.934L6.00005 16.9646L6.00039 18.9776C3.19696 18.7252 1 16.3692 1 13.5C1 10.9656 2.71424 8.83154 5.04648 8.19411C5.44561 4.70761 8.40661 2 12 2Z"></path>
            </svg>
            <div class="space-y-1.5">
              <div class="text-label-sm text-text-strong-950">Choose a file or drag & drop it here</div>
              <div class="text-paragraph-xs text-text-sub-600">JPEG, PNG, PDF, and MP4 formats, up to 50 MB.</div>
            </div>
            <div class="inline-flex h-8 items-center justify-center gap-2.5 whitespace-nowrap rounded-lg bg-bg-white-0 px-2.5 text-label-sm text-text-sub-600 pointer-events-none ring-1 ring-inset ring-stroke-soft-200">
              Browse File
            </div>
          </label>

          {/* File List */}
          <Show when={files().length > 0}>
            <div class="space-y-4">
              <For each={files()}>
                {(file) => (
                  <div class="flex w-full flex-col gap-4 rounded-2xl border border-stroke-soft-200 p-4 pl-3.5">
                    <div class="flex gap-3">
                      {/* File Icon */}
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="relative shrink-0 size-10">
                        <path d="M30 39.25H10C7.10051 39.25 4.75 36.8995 4.75 34V6C4.75 3.10051 7.10051 0.75 10 0.75H20.5147C21.9071 0.75 23.2425 1.30312 24.227 2.28769L33.7123 11.773C34.6969 12.7575 35.25 14.0929 35.25 15.4853V34C35.25 36.8995 32.8995 39.25 30 39.25Z" class="fill-bg-white-0 stroke-stroke-sub-300" stroke-width="1.5"></path>
                        <path d="M23 1V9C23 11.2091 24.7909 13 27 13H35" class="stroke-stroke-sub-300" stroke-width="1.5"></path>
                        <foreignObject x="0" y="0" width="40" height="40">
                          <div class={cn("absolute bottom-1.5 left-0 flex h-4 items-center rounded px-[3px] py-0.5 text-[11px] font-semibold leading-none text-static-white", getFileTypeColor(file.type))}>
                            {getFileExtension(file.name)}
                          </div>
                        </foreignObject>
                      </svg>

                      {/* File Info */}
                      <div class="flex-1 space-y-1">
                        <div class="text-label-sm text-text-strong-950">{file.name}</div>
                        <div class="flex items-center gap-1">
                          <span class="text-paragraph-xs text-text-sub-600">
                            {file.status === 'uploading' 
                              ? `${formatFileSize(file.size * file.progress / 100)} of ${formatFileSize(file.size)}`
                              : formatFileSize(file.size)
                            }
                          </span>
                          <span class="text-paragraph-xs text-text-sub-600">∙</span>
                          
                          {/* Status Icon */}
                          <Show when={file.status === 'uploading'}>
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="remixicon size-4 shrink-0 animate-spin text-primary-base">
                              <path d="M12 2C12.5523 2 13 2.44772 13 3V6C13 6.55228 12.5523 7 12 7C11.4477 7 11 6.55228 11 6V3C11 2.44772 11.4477 2 12 2ZM12 17C12.5523 17 13 17.4477 13 18V21C13 21.5523 12.5523 22 12 22C11.4477 22 11 21.5523 11 21V18C11 17.4477 11.4477 17 12 17ZM22 12C22 12.5523 21.5523 13 21 13H18C17.4477 13 17 12.5523 17 12C17 11.4477 17.4477 11 18 11H21C21.5523 11 22 11.4477 22 12ZM7 12C7 12.5523 6.55228 13 6 13H3C2.44772 13 2 12.5523 2 12C2 11.4477 2.44772 11 3 11H6C6.55228 11 7 11.4477 7 12ZM19.0711 19.0711C18.6805 19.4616 18.0474 19.4616 17.6569 19.0711L15.5355 16.9497C15.145 16.5592 15.145 15.9261 15.5355 15.5355C15.9261 15.145 16.5592 15.145 16.9497 15.5355L19.0711 17.6569C19.4616 18.0474 19.4616 18.6805 19.0711 19.0711ZM8.46447 8.46447C8.07394 8.85499 7.44078 8.85499 7.05025 8.46447L4.92893 6.34315C4.53841 5.95262 4.53841 5.31946 4.92893 4.92893C5.31946 4.53841 5.95262 4.53841 6.34315 4.92893L8.46447 7.05025C8.85499 7.44078 8.85499 8.07394 8.46447 8.46447ZM4.92893 19.0711C4.53841 18.6805 4.53841 18.0474 4.92893 17.6569L7.05025 15.5355C7.44078 15.145 8.07394 15.145 8.46447 15.5355C8.85499 15.9261 8.85499 16.5592 8.46447 16.9497L6.34315 19.0711C5.95262 19.4616 5.31946 19.4616 4.92893 19.0711ZM15.5355 8.46447C15.145 8.07394 15.145 7.44078 15.5355 7.05025L17.6569 4.92893C18.0474 4.53841 18.6805 4.53841 19.0711 4.92893C19.4616 5.31946 19.4616 5.95262 19.0711 6.34315L16.9497 8.46447C16.5592 8.85499 15.9261 8.85499 15.5355 8.46447Z"></path>
                            </svg>
                            <span class="text-paragraph-xs text-text-strong-950">Uploading...</span>
                          </Show>
                          
                          <Show when={file.status === 'completed'}>
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="remixicon size-4 shrink-0 text-success-base">
                              <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11.0026 16L18.0737 8.92893L16.6595 7.51472L11.0026 13.1716L8.17421 10.3431L6.75999 11.7574L11.0026 16Z"></path>
                            </svg>
                            <span class="text-paragraph-xs text-text-strong-950">Completed</span>
                          </Show>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button 
                        class="relative flex shrink-0 items-center justify-center outline-none transition duration-200 ease-out disabled:pointer-events-none disabled:border-transparent disabled:bg-transparent disabled:text-text-disabled-300 disabled:shadow-none focus:outline-none bg-transparent text-text-sub-600 hover:bg-bg-weak-50 hover:text-text-strong-950 focus-visible:bg-bg-strong-950 focus-visible:text-text-white-0 size-5 rounded-md"
                        onClick={() => removeFile(file.id)}
                      >
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="remixicon size-[18px]">
                          <path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"></path>
                        </svg>
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <Show when={file.status === 'uploading'}>
                      <div class="h-1.5 w-full rounded-full bg-bg-soft-200">
                        <div 
                          class="h-full rounded-full transition-all duration-300 ease-out bg-information-base" 
                          role="progressbar" 
                          aria-valuenow={file.progress} 
                          aria-valuemax="100"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>

          {/* Separator */}
          <div role="separator" class="relative flex w-full items-center gap-2.5 text-subheading-2xs text-text-soft-400 before:h-px before:w-full before:flex-1 before:bg-stroke-soft-200 after:h-px after:w-full after:flex-1 after:bg-stroke-soft-200 my-6">
            OR
          </div>

          {/* URL Import */}
          <div class="flex flex-col gap-1">
            <label class="group cursor-pointer flex items-center gap-px aria-disabled:text-text-disabled-300 text-label-sm text-text-strong-950">
              Import from URL Link
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" class="size-5 text-text-disabled-300">
                <path fill="currentColor" fill-rule="evenodd" d="M10 16.25a6.25 6.25 0 100-12.5 6.25 6.25 0 000 12.5zm1.116-3.041l.1-.408a1.709 1.709 0 01-.25.083 1.176 1.176 0 01-.308.048c-.193 0-.329-.032-.407-.095-.079-.064-.118-.184-.118-.359a3.514 3.514 0 01.118-.672l.373-1.318c.037-.121.062-.255.075-.4a3.73 3.73 0 00.02-.304.866.866 0 00-.292-.678c-.195-.174-.473-.26-.833-.26-.2 0-.412.035-.636.106a9.37 9.37 0 00-.704.256l-.1.409a3.49 3.49 0 01.262-.087c.101-.03.2-.045.297-.045.198 0 .331.034.4.1.07.066.105.185.105.354 0 .093-.01.197-.034.31a6.216 6.216 0 01-.084.36l-.374 1.325c-.033.14-.058.264-.073.374a2.42 2.42 0 00-.022.325c0 .272.1.496.301.673.201.177.483.265.846.265.236 0 .443-.03.621-.092s.417-.152.717-.27zM11.05 7.85a.772.772 0 00.26-.587.78.78 0 00-.26-.59.885.885 0 00-.628-.244.893.893 0 00-.63.244.778.778 0 00-.264.59c0 .23.088.426.263.587a.897.897 0 00.63.243.888.888 0 00.629-.243z" clip-rule="evenodd"></path>
              </svg>
            </label>
            
            <div class="group relative flex overflow-hidden bg-bg-white-0 text-text-strong-950 shadow-regular-xs transition duration-200 ease-out divide-x divide-stroke-soft-200 before:absolute before:inset-0 before:ring-1 before:ring-inset before:ring-stroke-soft-200 before:pointer-events-none before:rounded-[inherit] before:transition before:duration-200 before:ease-out hover:shadow-none has-[input:focus]:shadow-button-important-focus has-[input:focus]:before:ring-stroke-strong-950 has-[input:disabled]:shadow-none has-[input:disabled]:before:ring-transparent rounded-10 hover:[&:not(:has(input:focus)):has(&gt;:only-child)]:before:ring-transparent w-full">
              <label class="group/input-wrapper flex w-full cursor-text items-center bg-bg-white-0 transition duration-200 ease-out hover:[&:not(&:has(input:focus))]:bg-bg-weak-50 has-[input:disabled]:pointer-events-none has-[input:disabled]:bg-bg-weak-50 gap-2 px-3">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="remixicon flex size-5 shrink-0 select-none items-center justify-center transition duration-200 ease-out group-has-[:placeholder-shown]:text-text-soft-400 text-text-sub-600 group-has-[:placeholder-shown]:group-hover/input-wrapper:text-text-sub-600 group-has-[:placeholder-shown]:group-has-[input:focus]/input-wrapper:text-text-sub-600 group-has-[input:disabled]/input-wrapper:text-text-disabled-300">
                  <path d="M13.0607 8.11097L14.4749 9.52518C17.2086 12.2589 17.2086 16.691 14.4749 19.4247L14.1214 19.7782C11.3877 22.5119 6.95555 22.5119 4.22188 19.7782C1.48821 17.0446 1.48821 12.6124 4.22188 9.87874L5.6361 11.293C3.68348 13.2456 3.68348 16.4114 5.6361 18.364C7.58872 20.3166 10.7545 20.3166 12.7072 18.364L13.0607 18.0105C15.0133 16.0578 15.0133 12.892 13.0607 10.9394L11.6465 9.52518L13.0607 8.11097ZM19.7782 14.1214L18.364 12.7072C20.3166 10.7545 20.3166 7.58872 18.364 5.6361C16.4114 3.68348 13.2456 3.68348 11.293 5.6361L10.9394 5.98965C8.98678 7.94227 8.98678 11.1081 10.9394 13.0607L12.3536 14.4749L10.9394 15.8891L9.52518 14.4749C6.79151 11.7413 6.79151 7.30911 9.52518 4.57544L9.87874 4.22188C12.6124 1.48821 17.0446 1.48821 19.7782 4.22188C22.5119 6.95555 22.5119 11.3877 19.7782 14.1214Z"></path>
                </svg>
                <input 
                  class="w-full bg-transparent bg-none text-paragraph-sm text-text-strong-950 outline-none transition duration-200 ease-out placeholder:select-none placeholder:text-text-soft-400 placeholder:transition placeholder:duration-200 placeholder:ease-out group-hover/input-wrapper:placeholder:text-text-sub-600 focus:outline-none group-has-[input:focus]:placeholder:text-text-sub-600 disabled:text-text-disabled-300 disabled:placeholder:text-text-disabled-300 h-10" 
                  placeholder="Paste file URL" 
                  type="text"
                  value={urlInput()}
                  onInput={(e) => setUrlInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUrlImport()}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
          </div>
        </div>
      </>
    </ModalPortal>
  );
};
