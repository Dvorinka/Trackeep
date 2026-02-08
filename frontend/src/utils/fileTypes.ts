import { 
  IconPhoto, 
  IconVideo, 
  IconMusic, 
  IconFileText, 
  IconFileDescription, 
  IconChartBar, 
  IconChartLine, 
  IconPackage, 
  IconCode,
  IconDatabase,
  IconDeviceDesktop,
  IconBrandPython,
  IconBrandJavascript,
  IconBrandTypescript,
  IconBrandHtml5,
  IconBrandCss3,
  IconFile
} from '@tabler/icons-solidjs';

export interface FileTypeConfig {
  icon: any;
  color: string;
  category: string;
  displayName: string;
}

const fileTypeMap: Record<string, FileTypeConfig> = {
  // Images
  'image/jpeg': { icon: IconPhoto, color: 'text-pink-500', category: 'Image', displayName: 'JPEG' },
  'image/jpg': { icon: IconPhoto, color: 'text-pink-500', category: 'Image', displayName: 'JPG' },
  'image/png': { icon: IconPhoto, color: 'text-pink-500', category: 'Image', displayName: 'PNG' },
  'image/gif': { icon: IconPhoto, color: 'text-pink-500', category: 'Image', displayName: 'GIF' },
  'image/webp': { icon: IconPhoto, color: 'text-pink-500', category: 'Image', displayName: 'WebP' },
  'image/svg+xml': { icon: IconPhoto, color: 'text-pink-500', category: 'Image', displayName: 'SVG' },
  'image/bmp': { icon: IconPhoto, color: 'text-pink-500', category: 'Image', displayName: 'BMP' },
  'image/tiff': { icon: IconPhoto, color: 'text-pink-500', category: 'Image', displayName: 'TIFF' },
  
  // Videos
  'video/mp4': { icon: IconVideo, color: 'text-indigo-500', category: 'Video', displayName: 'MP4' },
  'video/webm': { icon: IconVideo, color: 'text-indigo-500', category: 'Video', displayName: 'WebM' },
  'video/ogg': { icon: IconVideo, color: 'text-indigo-500', category: 'Video', displayName: 'OGG' },
  'video/quicktime': { icon: IconVideo, color: 'text-indigo-500', category: 'Video', displayName: 'MOV' },
  'video/x-msvideo': { icon: IconVideo, color: 'text-indigo-500', category: 'Video', displayName: 'AVI' },
  'video/x-matroska': { icon: IconVideo, color: 'text-indigo-500', category: 'Video', displayName: 'MKV' },
  
  // Audio
  'audio/mpeg': { icon: IconMusic, color: 'text-purple-500', category: 'Audio', displayName: 'MP3' },
  'audio/wav': { icon: IconMusic, color: 'text-purple-500', category: 'Audio', displayName: 'WAV' },
  'audio/ogg': { icon: IconMusic, color: 'text-purple-500', category: 'Audio', displayName: 'OGG' },
  'audio/flac': { icon: IconMusic, color: 'text-purple-500', category: 'Audio', displayName: 'FLAC' },
  'audio/aac': { icon: IconMusic, color: 'text-purple-500', category: 'Audio', displayName: 'AAC' },
  'audio/m4a': { icon: IconMusic, color: 'text-purple-500', category: 'Audio', displayName: 'M4A' },
  
  // Documents
  'application/pdf': { icon: IconFileText, color: 'text-red-500', category: 'Document', displayName: 'PDF' },
  'application/msword': { icon: IconFileDescription, color: 'text-blue-500', category: 'Document', displayName: 'DOC' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
    icon: IconFileDescription, 
    color: 'text-blue-500', 
    category: 'Document', 
    displayName: 'DOCX' 
  },
  'application/vnd.ms-excel': { icon: IconChartBar, color: 'text-green-500', category: 'Spreadsheet', displayName: 'XLS' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { 
    icon: IconChartBar, 
    color: 'text-green-500', 
    category: 'Spreadsheet', 
    displayName: 'XLSX' 
  },
  'application/vnd.ms-powerpoint': { icon: IconChartLine, color: 'text-orange-500', category: 'Presentation', displayName: 'PPT' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { 
    icon: IconChartLine, 
    color: 'text-orange-500', 
    category: 'Presentation', 
    displayName: 'PPTX' 
  },
  
  // Text files
  'text/plain': { icon: IconFileText, color: 'text-gray-500', category: 'Text', displayName: 'TXT' },
  'text/csv': { icon: IconChartBar, color: 'text-green-500', category: 'Data', displayName: 'CSV' },
  'text/html': { icon: IconBrandHtml5, color: 'text-orange-600', category: 'Code', displayName: 'HTML' },
  'text/css': { icon: IconBrandCss3, color: 'text-blue-600', category: 'Code', displayName: 'CSS' },
  'text/javascript': { icon: IconBrandJavascript, color: 'text-yellow-500', category: 'Code', displayName: 'JS' },
  'text/typescript': { icon: IconBrandTypescript, color: 'text-blue-600', category: 'Code', displayName: 'TS' },
  'application/json': { icon: IconCode, color: 'text-gray-600', category: 'Code', displayName: 'JSON' },
  'application/xml': { icon: IconCode, color: 'text-gray-600', category: 'Code', displayName: 'XML' },
  
  // Code files
  'application/x-python-code': { icon: IconBrandPython, color: 'text-blue-500', category: 'Code', displayName: 'PY' },
  'text/x-python': { icon: IconBrandPython, color: 'text-blue-500', category: 'Code', displayName: 'PY' },
  'text/x-java-source': { icon: IconCode, color: 'text-red-600', category: 'Code', displayName: 'JAVA' },
  'text/x-c++src': { icon: IconCode, color: 'text-blue-700', category: 'Code', displayName: 'CPP' },
  'text/x-csrc': { icon: IconCode, color: 'text-blue-700', category: 'Code', displayName: 'C' },
  'text/x-ruby': { icon: IconCode, color: 'text-red-700', category: 'Code', displayName: 'RB' },
  'text/x-php': { icon: IconCode, color: 'text-purple-600', category: 'Code', displayName: 'PHP' },
  'text/x-go': { icon: IconCode, color: 'text-cyan-600', category: 'Code', displayName: 'GO' },
  'text/x-rust': { icon: IconCode, color: 'text-orange-700', category: 'Code', displayName: 'RS' },
  
  // Archives
  'application/zip': { icon: IconPackage, color: 'text-yellow-600', category: 'Archive', displayName: 'ZIP' },
  'application/x-rar-compressed': { icon: IconPackage, color: 'text-yellow-600', category: 'Archive', displayName: 'RAR' },
  'application/x-7z-compressed': { icon: IconPackage, color: 'text-yellow-600', category: 'Archive', displayName: '7Z' },
  'application/gzip': { icon: IconPackage, color: 'text-yellow-600', category: 'Archive', displayName: 'GZ' },
  'application/x-tar': { icon: IconPackage, color: 'text-yellow-600', category: 'Archive', displayName: 'TAR' },
  
  // Database
  'application/x-sqlite3': { icon: IconDatabase, color: 'text-teal-600', category: 'Database', displayName: 'SQLITE' },
  'application/sql': { icon: IconDatabase, color: 'text-teal-600', category: 'Database', displayName: 'SQL' },
  
  // Executables
  'application/x-executable': { icon: IconDeviceDesktop, color: 'text-gray-700', category: 'Executable', displayName: 'EXE' },
  'application/x-msdownload': { icon: IconDeviceDesktop, color: 'text-gray-700', category: 'Executable', displayName: 'EXE' },
  'application/x-apple-diskimage': { icon: IconDeviceDesktop, color: 'text-gray-700', category: 'Executable', displayName: 'DMG' },
};

export const getFileTypeConfig = (mimeType: string, fileName?: string): FileTypeConfig => {
  // Direct MIME type match
  if (fileTypeMap[mimeType]) {
    return fileTypeMap[mimeType];
  }
  
  // Check by file extension if MIME type is generic
  if (fileName && mimeType === 'application/octet-stream') {
    const extension = fileName.toLowerCase().split('.').pop();
    if (extension) {
      const extensionMap: Record<string, FileTypeConfig> = {
        'js': { icon: IconBrandJavascript, color: 'text-yellow-500', category: 'Code', displayName: 'JS' },
        'ts': { icon: IconBrandTypescript, color: 'text-blue-600', category: 'Code', displayName: 'TS' },
        'py': { icon: IconBrandPython, color: 'text-blue-500', category: 'Code', displayName: 'PY' },
        'java': { icon: IconCode, color: 'text-red-600', category: 'Code', displayName: 'JAVA' },
        'cpp': { icon: IconCode, color: 'text-blue-700', category: 'Code', displayName: 'CPP' },
        'c': { icon: IconCode, color: 'text-blue-700', category: 'Code', displayName: 'C' },
        'rb': { icon: IconCode, color: 'text-red-700', category: 'Code', displayName: 'RB' },
        'php': { icon: IconCode, color: 'text-purple-600', category: 'Code', displayName: 'PHP' },
        'go': { icon: IconCode, color: 'text-cyan-600', category: 'Code', displayName: 'GO' },
        'rs': { icon: IconCode, color: 'text-orange-700', category: 'Code', displayName: 'RS' },
        'html': { icon: IconBrandHtml5, color: 'text-orange-600', category: 'Code', displayName: 'HTML' },
        'css': { icon: IconBrandCss3, color: 'text-blue-600', category: 'Code', displayName: 'CSS' },
        'sql': { icon: IconDatabase, color: 'text-teal-600', category: 'Database', displayName: 'SQL' },
        'db': { icon: IconDatabase, color: 'text-teal-600', category: 'Database', displayName: 'DB' },
        'sqlite': { icon: IconDatabase, color: 'text-teal-600', category: 'Database', displayName: 'SQLITE' },
        'exe': { icon: IconDeviceDesktop, color: 'text-gray-700', category: 'Executable', displayName: 'EXE' },
        'dmg': { icon: IconDeviceDesktop, color: 'text-gray-700', category: 'Executable', displayName: 'DMG' },
        'zip': { icon: IconPackage, color: 'text-yellow-600', category: 'Archive', displayName: 'ZIP' },
        'rar': { icon: IconPackage, color: 'text-yellow-600', category: 'Archive', displayName: 'RAR' },
        '7z': { icon: IconPackage, color: 'text-yellow-600', category: 'Archive', displayName: '7Z' },
        'tar': { icon: IconPackage, color: 'text-yellow-600', category: 'Archive', displayName: 'TAR' },
        'gz': { icon: IconPackage, color: 'text-yellow-600', category: 'Archive', displayName: 'GZ' },
        'pdf': { icon: IconFileText, color: 'text-red-500', category: 'Document', displayName: 'PDF' },
        'doc': { icon: IconFileDescription, color: 'text-blue-500', category: 'Document', displayName: 'DOC' },
        'docx': { icon: IconFileDescription, color: 'text-blue-500', category: 'Document', displayName: 'DOCX' },
        'xls': { icon: IconChartBar, color: 'text-green-500', category: 'Spreadsheet', displayName: 'XLS' },
        'xlsx': { icon: IconChartBar, color: 'text-green-500', category: 'Spreadsheet', displayName: 'XLSX' },
        'ppt': { icon: IconChartLine, color: 'text-orange-500', category: 'Presentation', displayName: 'PPT' },
        'pptx': { icon: IconChartLine, color: 'text-orange-500', category: 'Presentation', displayName: 'PPTX' },
        'txt': { icon: IconFileText, color: 'text-gray-500', category: 'Text', displayName: 'TXT' },
        'csv': { icon: IconChartBar, color: 'text-green-500', category: 'Data', displayName: 'CSV' },
        'json': { icon: IconCode, color: 'text-gray-600', category: 'Code', displayName: 'JSON' },
        'xml': { icon: IconCode, color: 'text-gray-600', category: 'Code', displayName: 'XML' },
      };
      
      if (extensionMap[extension]) {
        return extensionMap[extension];
      }
    }
  }
  
  // Fallback by MIME type pattern
  if (mimeType.startsWith('image/')) {
    return { icon: IconPhoto, color: 'text-pink-500', category: 'Image', displayName: 'IMG' };
  }
  if (mimeType.startsWith('video/')) {
    return { icon: IconVideo, color: 'text-indigo-500', category: 'Video', displayName: 'VID' };
  }
  if (mimeType.startsWith('audio/')) {
    return { icon: IconMusic, color: 'text-purple-500', category: 'Audio', displayName: 'AUD' };
  }
  if (mimeType.startsWith('text/')) {
    return { icon: IconFileText, color: 'text-gray-500', category: 'Text', displayName: 'TXT' };
  }
  if (mimeType.includes('pdf')) {
    return { icon: IconFileText, color: 'text-red-500', category: 'Document', displayName: 'PDF' };
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return { icon: IconFileDescription, color: 'text-blue-500', category: 'Document', displayName: 'DOC' };
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return { icon: IconChartBar, color: 'text-green-500', category: 'Spreadsheet', displayName: 'XLS' };
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return { icon: IconChartLine, color: 'text-orange-500', category: 'Presentation', displayName: 'PPT' };
  }
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) {
    return { icon: IconPackage, color: 'text-yellow-600', category: 'Archive', displayName: 'ARCH' };
  }
  
  // Default fallback
  return { icon: IconFile, color: 'text-foreground', category: 'File', displayName: 'FILE' };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const getFileCategoryColor = (category: string): string => {
  const categoryColors: Record<string, string> = {
    'Image': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    'Video': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    'Audio': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'Document': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    'Spreadsheet': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'Presentation': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    'Text': 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300',
    'Code': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'Archive': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Database': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    'Executable': 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
    'File': 'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground',
    'Data': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  };
  
  return categoryColors[category] || categoryColors['File'];
};
