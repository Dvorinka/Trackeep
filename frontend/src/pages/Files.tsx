import { createSignal, onMount, For, Show } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchTagFilterBar } from '@/components/ui/SearchTagFilterBar';
import { FileUpload } from '@/components/ui/FileUpload';
import { FilePreviewModal } from '@/components/ui/FilePreviewModal';
import { getFileTypeConfig, formatFileSize, getFileCategoryColor } from '@/utils/fileTypes';
import { getApiV1BaseUrl } from '@/lib/api-url';
import { startGitHubOAuth } from '@/lib/oauth';
import { isDemoMode } from '@/lib/demo-mode';
import { getMockDocuments } from '@/lib/mockData';
import {
  IconUpload,
  IconEye,
  IconTrash,
  IconDownload,
  IconCopy,
  IconShare,
  IconBrandGithub,
  IconRefresh,
  IconGitFork,
  IconFolder,
  IconExternalLink,
  IconCheck,
  IconAlertTriangle,
} from '@tabler/icons-solidjs';
import { useHaptics } from '@/lib/haptics';

const API_BASE_URL = getApiV1BaseUrl();

interface FileItem {
  id: number;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  description?: string;
  tags: string[];
  associations?: Association[];
  url?: string;
  isLink?: boolean;
  preview?: string;
  downloadUrl?: string;
  viewUrl?: string;
  shareUrl?: string;
}

interface Association {
  id: string;
  type: 'task' | 'bookmark' | 'note' | 'project';
  title: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string;
  updated_at: string;
  created_at: string;
  size: number;
  open_issues_count: number;
  default_branch: string;
  private?: boolean;
}

interface GitHubAppInstallation {
  installation_id: number;
  account_login: string;
  account_type: string;
}

interface GitHubAppStatus {
  app_slug: string;
  install_enabled: boolean;
  credentials_configured: boolean;
  installed: boolean;
  installation?: GitHubAppInstallation;
}

interface GitHubBackupRecord {
  id: number;
  repository_full_name: string;
  local_path: string;
  source: string;
  last_backup_status: string;
  last_backup_error?: string;
  last_backup_at?: string;
  last_backup_size: number;
}

interface GitHubBackupResponse {
  backed_up: number;
  failed: number;
}

type FilesTab = 'files' | 'github-backups';

const defaultGitHubAppStatus: GitHubAppStatus = {
  app_slug: '',
  install_enabled: false,
  credentials_configured: false,
  installed: false,
};

export const Files = () => {
  const haptics = useHaptics();

  const [activeTab, setActiveTab] = createSignal<FilesTab>('files');
  const [files, setFiles] = createSignal<FileItem[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
  const [showUploadModal, setShowUploadModal] = createSignal(false);
  const [showPreviewModal, setShowPreviewModal] = createSignal(false);
  const [selectedFile, setSelectedFile] = createSignal<FileItem | null>(null);
  const [copiedLink, setCopiedLink] = createSignal(false);

  const [isGitHubLoading, setIsGitHubLoading] = createSignal(true);
  const [isGitHubActionLoading, setIsGitHubActionLoading] = createSignal(false);
  const [gitHubError, setGitHubError] = createSignal('');
  const [gitHubMessage, setGitHubMessage] = createSignal('');
  const [gitHubOAuthConnected, setGitHubOAuthConnected] = createSignal(false);
  const [gitHubUsername, setGitHubUsername] = createSignal('');
  const [gitHubAppStatus, setGitHubAppStatus] = createSignal<GitHubAppStatus>(defaultGitHubAppStatus);
  const [gitHubBackupRoot, setGitHubBackupRoot] = createSignal('');
  const [gitHubRepos, setGitHubRepos] = createSignal<GitHubRepo[]>([]);
  const [gitHubBackups, setGitHubBackups] = createSignal<GitHubBackupRecord[]>([]);
  const [selectedRepos, setSelectedRepos] = createSignal<string[]>([]);

  onMount(async () => {
    await Promise.all([loadFiles(), loadGitHubBackupWorkspace()]);
  });

  const getAuthToken = () => localStorage.getItem('trackeep_token') || localStorage.getItem('token') || '';

  const parseRepoPayload = (payload: unknown): GitHubRepo[] => {
    if (Array.isArray(payload)) {
      return payload as GitHubRepo[];
    }
    if (payload && typeof payload === 'object' && Array.isArray((payload as { repos?: unknown[] }).repos)) {
      return (payload as { repos: GitHubRepo[] }).repos;
    }
    return [];
  };

  const fetchWithAuth = async (path: string, init?: RequestInit): Promise<Response> => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const headers = new Headers(init?.headers || {});
    headers.set('Authorization', `Bearer ${token}`);

    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  };

  const loadFiles = async () => {
    try {
      setIsLoading(true);

      if (isDemoMode()) {
        const mockDocuments = getMockDocuments();
        const mappedFiles: FileItem[] = mockDocuments.map((doc, index) => ({
          id: index + 1,
          name: doc.name,
          size: parseFloat(doc.size) * 1024,
          type: doc.type,
          uploadedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          description: doc.description,
          tags: doc.tags.map(tag => tag.name),
          url: '#',
          isLink: false,
          preview: doc.content,
          downloadUrl: '#',
          viewUrl: '#',
          shareUrl: '#',
        }));
        setFiles(mappedFiles);
        return;
      }

      const response = await fetchWithAuth('/files');
      if (!response.ok) {
        throw new Error('Failed to load files');
      }

      const filesData = await response.json();
      const mappedFiles: FileItem[] = (Array.isArray(filesData) ? filesData : []).map((file: any, index) => ({
        id: Number(file.id || index + 1),
        name: file.original_name || file.file_name || `File ${index + 1}`,
        size: Number(file.file_size || file.size || 0),
        type: file.mime_type || file.type || 'application/octet-stream',
        uploadedAt: file.created_at || file.uploadedAt || new Date().toISOString(),
        description: file.description,
        tags: Array.isArray(file.tags)
          ? file.tags.map((tag: any) => (typeof tag === 'string' ? tag : tag?.name)).filter(Boolean)
          : [],
        url: file.url,
        isLink: Boolean(file.is_link),
        preview: file.preview,
        downloadUrl: file.download_url,
        viewUrl: file.view_url,
        shareUrl: file.share_url,
      }));
      setFiles(mappedFiles);
    } catch (error) {
      console.error('Failed to load files:', error);
      if (isDemoMode()) {
        const mockDocuments = getMockDocuments();
        const mappedFiles: FileItem[] = mockDocuments.map((doc, index) => ({
          id: index + 1,
          name: doc.name,
          size: parseFloat(doc.size) * 1024,
          type: doc.type,
          uploadedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          description: doc.description,
          tags: doc.tags.map(tag => tag.name),
          url: '#',
          isLink: false,
          preview: doc.content,
          downloadUrl: '#',
          viewUrl: '#',
          shareUrl: '#',
        }));
        setFiles(mappedFiles);
      } else {
        setFiles([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadGitHubBackupWorkspace = async () => {
    setIsGitHubLoading(true);
    setGitHubError('');

    try {
      const token = getAuthToken();
      if (!token) {
        setGitHubOAuthConnected(false);
        setGitHubUsername('');
        setGitHubAppStatus(defaultGitHubAppStatus);
        setGitHubRepos([]);
        setGitHubBackups([]);
        setGitHubBackupRoot('');
        setSelectedRepos([]);
        return;
      }

      let oauthConnected = false;
      const meResponse = await fetchWithAuth('/auth/me');
      if (meResponse.ok) {
        const meData = await meResponse.json();
        oauthConnected = Boolean(meData?.user?.github_id);
        setGitHubOAuthConnected(oauthConnected);
        setGitHubUsername(typeof meData?.user?.username === 'string' ? meData.user.username : '');
      } else {
        setGitHubOAuthConnected(false);
        setGitHubUsername('');
      }

      const appStatusResponse = await fetchWithAuth('/github/app/status');
      if (appStatusResponse.ok) {
        const appStatusData = (await appStatusResponse.json()) as GitHubAppStatus;
        setGitHubAppStatus({
          app_slug: appStatusData.app_slug || '',
          install_enabled: Boolean(appStatusData.install_enabled),
          credentials_configured: Boolean(appStatusData.credentials_configured),
          installed: Boolean(appStatusData.installed),
          installation: appStatusData.installation,
        });
      } else {
        setGitHubAppStatus(defaultGitHubAppStatus);
      }

      const backupsResponse = await fetchWithAuth('/github/backups');
      if (backupsResponse.ok) {
        const backupsData = await backupsResponse.json();
        const backups = Array.isArray(backupsData?.backups) ? (backupsData.backups as GitHubBackupRecord[]) : [];
        setGitHubBackups(backups);
        setGitHubBackupRoot(typeof backupsData?.backup_root === 'string' ? backupsData.backup_root : '');
      } else {
        setGitHubBackups([]);
        setGitHubBackupRoot('');
      }

      let reposResponse: Response | null = null;
      if (oauthConnected) {
        reposResponse = await fetchWithAuth('/github/repos');
      } else if (gitHubAppStatus().installed && gitHubAppStatus().credentials_configured) {
        reposResponse = await fetchWithAuth('/github/app/repos');
      }

      if (reposResponse && reposResponse.ok) {
        const reposData = await reposResponse.json();
        const repos = parseRepoPayload(reposData);
        setGitHubRepos(repos);
        setSelectedRepos(prev => prev.filter(fullName => repos.some(repo => repo.full_name === fullName)));
      } else {
        setGitHubRepos([]);
        setSelectedRepos([]);
      }
    } catch (error) {
      console.error('Failed to load GitHub backup workspace:', error);
      const message = error instanceof Error ? error.message : 'Failed to load GitHub backup data';
      setGitHubError(message);
    } finally {
      setIsGitHubLoading(false);
    }
  };

  const handleInstallGitHubApp = async () => {
    try {
      setIsGitHubActionLoading(true);
      setGitHubError('');

      const response = await fetchWithAuth('/github/app/install-url');
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.install_url) {
        const errorMessage = typeof data?.error === 'string' ? data.error : 'Failed to generate install URL';
        throw new Error(errorMessage);
      }

      window.location.href = data.install_url as string;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start GitHub App installation';
      setGitHubError(message);
      haptics.warning();
    } finally {
      setIsGitHubActionLoading(false);
    }
  };

  const handleBackupSelectedRepos = async () => {
    try {
      if (selectedRepos().length === 0) {
        return;
      }

      setIsGitHubActionLoading(true);
      setGitHubError('');
      setGitHubMessage('');

      const source = gitHubOAuthConnected() ? 'oauth' : 'github_app';
      const response = await fetchWithAuth('/github/backups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositories: selectedRepos(),
          source,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as Partial<GitHubBackupResponse> & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Backup failed');
      }

      const backedUp = Number(data.backed_up ?? 0);
      const failed = Number(data.failed ?? 0);
      setGitHubMessage(`Backup completed: ${backedUp} successful, ${failed} failed.`);

      await loadGitHubBackupWorkspace();
      haptics.success();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to backup selected repositories';
      setGitHubError(message);
      haptics.error();
    } finally {
      setIsGitHubActionLoading(false);
    }
  };

  const filteredFiles = () => {
    const term = searchTerm().toLowerCase();
    const tags = selectedTags();

    return files().filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(term)
        || file.description?.toLowerCase().includes(term)
        || file.tags.some(tag => tag.toLowerCase().includes(term));

      const matchesTags = tags.length === 0 || tags.every(tag => file.tags.includes(tag));
      return matchesSearch && matchesTags;
    });
  };

  const allTags = () => {
    const tagSet = new Set<string>();
    files().forEach(file => file.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  };

  const toggleTag = (tag: string) => {
    const currentTags = selectedTags();
    if (currentTags.includes(tag)) {
      setSelectedTags([]);
    } else {
      setSelectedTags([tag]);
    }
  };

  const handleFileUpload = async (uploadedFiles: any[]) => {
    try {
      const newFiles: FileItem[] = uploadedFiles.map(fileData => ({
        id: Date.now() + Math.random(),
        name: fileData.name || 'Untitled',
        size: fileData.size || 0,
        type: fileData.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        description: '',
        tags: [],
        url: fileData.url,
        isLink: Boolean(fileData.url),
        downloadUrl: fileData.url || `/files/download/${Date.now()}`,
        viewUrl: fileData.url || `/files/view/${Date.now()}`,
        shareUrl: `/files/share/${Date.now()}`,
      }));

      setFiles(prev => [...newFiles, ...prev]);
      setShowUploadModal(false);
      haptics.success();
    } catch (error) {
      console.error('Failed to upload files:', error);
      haptics.error();
    }
  };

  const handlePreviewFile = (file: FileItem) => {
    setSelectedFile(file);
    setShowPreviewModal(true);
  };

  const handleCopyLink = async (file: FileItem) => {
    try {
      const link = file.isLink ? file.url : file.shareUrl || '#';
      if (link) {
        await navigator.clipboard.writeText(link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        haptics.success();
      }
    } catch (error) {
      console.error('Failed to copy link:', error);
      haptics.error();
    }
  };

  const handleShareFile = (file: FileItem) => {
    const shareUrl = file.shareUrl || '#';
    if (navigator.share) {
      navigator.share({
        title: file.name,
        text: file.description,
        url: shareUrl,
      });
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const handleDownloadFile = (file: FileItem) => {
    if (file.isLink && file.url) {
      window.open(file.url, '_blank');
      return;
    }
    if (file.downloadUrl) {
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = file.name;
      link.click();
    }
  };

  const deleteFile = async (fileId: number) => {
    try {
      setFiles(prev => prev.filter(file => file.id !== fileId));
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const isRepoSelected = (fullName: string) => selectedRepos().includes(fullName);

  const toggleRepoSelection = (fullName: string) => {
    setSelectedRepos(prev => (
      prev.includes(fullName)
        ? prev.filter(repo => repo !== fullName)
        : [...prev, fullName]
    ));
  };

  const selectAllRepos = () => setSelectedRepos(gitHubRepos().map(repo => repo.full_name));
  const clearSelectedRepos = () => setSelectedRepos([]);

  const formatSourceLabel = (source: string) => source === 'github_app' ? 'GitHub App' : 'OAuth';

  return (
    <div class="p-6 space-y-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-foreground">Files</h1>
          <p class="text-muted-foreground mt-1">
            Manage uploads and GitHub repository backups in one place.
          </p>
        </div>
        <Show when={activeTab() === 'files'}>
          <Button onClick={() => setShowUploadModal(true)} haptic="impact">
            <IconUpload class="size-4 mr-2" />
            Upload File
          </Button>
        </Show>
      </div>

      <div class="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
        <button
          onClick={() => {
            setActiveTab('files');
            haptics.selection();
          }}
          class={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab() === 'files'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          }`}
        >
          <IconFolder class="size-4" />
          My Files
        </button>
        <button
          onClick={() => {
            setActiveTab('github-backups');
            haptics.selection();
          }}
          class={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab() === 'github-backups'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          }`}
        >
          <IconBrandGithub class="size-4" />
          GitHub Backups
        </button>
      </div>

      <Show when={activeTab() === 'files'}>
        <>
          <SearchTagFilterBar
            searchPlaceholder="Search files..."
            searchValue={searchTerm()}
            onSearchChange={value => setSearchTerm(value)}
            tagOptions={allTags()}
            selectedTag={selectedTags()[0] || ''}
            onTagChange={value => setSelectedTags(value ? [value] : [])}
            onReset={() => {
              setSearchTerm('');
              setSelectedTags([]);
            }}
          />

          <Show when={copiedLink()}>
            <div class="bg-primary/15 text-primary px-3 py-1 rounded-md text-sm">
              Link copied!
            </div>
          </Show>

          <Show when={isLoading()}>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map(() => (
                <Card class="p-6">
                  <div class="animate-pulse">
                    <div class="h-12 bg-[#262626] rounded mb-4"></div>
                    <div class="h-4 bg-[#262626] rounded mb-2"></div>
                    <div class="h-4 bg-[#262626] rounded w-3/4"></div>
                  </div>
                </Card>
              ))}
            </div>
          </Show>

          <Show when={!isLoading()}>
            <>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <For each={filteredFiles()}>
                  {(file) => {
                    const fileTypeConfig = getFileTypeConfig(file.type, file.name);
                    const IconComponent = fileTypeConfig.icon;

                    return (
                      <Card
                        class="p-6 hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => handlePreviewFile(file)}
                      >
                        <div class="flex items-start justify-between mb-4">
                          <div class={`text-3xl ${fileTypeConfig.color}`}>
                            <IconComponent size={32} />
                          </div>
                          <div class="flex gap-1">
                            <Button
                              variant="ghost"
                              onClick={e => {
                                e.stopPropagation();
                                handlePreviewFile(file);
                              }}
                              class="text-foreground hover:text-foreground/80 p-1"
                            >
                              <IconEye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={e => {
                                e.stopPropagation();
                                handleCopyLink(file);
                              }}
                              class="text-foreground hover:text-foreground/80 p-1"
                            >
                              <IconCopy size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={e => {
                                e.stopPropagation();
                                handleShareFile(file);
                              }}
                              class="text-foreground hover:text-foreground/80 p-1"
                            >
                              <IconShare size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={e => {
                                e.stopPropagation();
                                deleteFile(file.id);
                              }}
                              class="text-destructive hover:text-destructive/80 p-1"
                            >
                              <IconTrash size={16} />
                            </Button>
                          </div>
                        </div>

                        <div class="mb-2">
                          <span class={`inline-block px-2 py-1 text-xs rounded-full ${getFileCategoryColor(fileTypeConfig.category)}`}>
                            {fileTypeConfig.displayName}
                          </span>
                          <Show when={file.isLink}>
                            <span class="ml-2 inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Link
                            </span>
                          </Show>
                        </div>

                        <h3 class="text-lg font-semibold text-foreground mb-1 truncate">
                          {file.name}
                        </h3>

                        <p class="text-muted-foreground text-sm mb-2">
                          {formatFileSize(file.size)}
                        </p>

                        <Show when={file.description}>
                          <p class="text-foreground text-sm mb-3 line-clamp-2">
                            {file.description}
                          </p>
                        </Show>

                        <div class="flex flex-wrap gap-1 mb-3">
                          <For each={file.tags}>
                            {(tag) => (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  toggleTag(tag);
                                }}
                                class="px-2 py-1 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs rounded-md transition-colors cursor-pointer"
                              >
                                {tag}
                              </button>
                            )}
                          </For>
                        </div>

                        <Show when={file.associations && file.associations.length > 0}>
                          <div class="mb-3">
                            <p class="text-xs text-muted-foreground mb-1">Linked to:</p>
                            <div class="flex flex-wrap gap-1">
                              <For each={file.associations}>
                                {(assoc) => (
                                  <span class="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">
                                    {assoc.type}: {assoc.title}
                                  </span>
                                )}
                              </For>
                            </div>
                          </div>
                        </Show>

                        <div class="flex justify-between items-center text-xs text-muted-foreground">
                          <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                          <Button
                            variant="ghost"
                            class="text-foreground hover:text-foreground/80 p-1"
                            onClick={e => {
                              e.stopPropagation();
                              handleDownloadFile(file);
                            }}
                          >
                            <IconDownload size={14} />
                          </Button>
                        </div>
                      </Card>
                    );
                  }}
                </For>
              </div>

              <Show when={filteredFiles().length === 0}>
                <Card class="p-12 text-center">
                  <p class="text-muted-foreground">
                    {searchTerm() || selectedTags().length > 0
                      ? 'No files found matching your search or filters.'
                      : 'No files uploaded yet. Upload your first file!'}
                  </p>
                </Card>
              </Show>
            </>
          </Show>
        </>
      </Show>

      <Show when={activeTab() === 'github-backups'}>
        <div class="space-y-6">
          <Card class="relative overflow-hidden p-6 border border-primary/25 bg-gradient-to-r from-primary/12 via-primary/5 to-transparent">
            <div class="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
            <div class="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p class="text-sm uppercase tracking-wide text-primary/80 font-semibold mb-2">Repository Storage</p>
                <h2 class="text-2xl font-bold text-foreground mb-1">GitHub Backups</h2>
                <p class="text-sm text-muted-foreground">
                  Select repositories and store mirrored backups locally for resilient archival.
                </p>
                <Show when={gitHubUsername()}>
                  <p class="text-xs text-muted-foreground mt-2">
                    Active account: <span class="text-foreground font-medium">@{gitHubUsername()}</span>
                  </p>
                </Show>
                <div class="flex flex-wrap gap-2 mt-3 text-xs">
                  <span class={`px-2.5 py-1 rounded-full border ${
                    gitHubOAuthConnected()
                      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-500'
                      : 'border-border bg-muted text-muted-foreground'
                  }`}>
                    OAuth: {gitHubOAuthConnected() ? 'Connected' : 'Disconnected'}
                  </span>
                  <span class={`px-2.5 py-1 rounded-full border ${
                    gitHubAppStatus().installed
                      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-500'
                      : 'border-border bg-muted text-muted-foreground'
                  }`}>
                    App Install: {gitHubAppStatus().installed ? 'Installed' : 'Not installed'}
                  </span>
                  <span class={`px-2.5 py-1 rounded-full border ${
                    gitHubAppStatus().credentials_configured
                      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-500'
                      : 'border-amber-400/30 bg-amber-500/10 text-amber-500'
                  }`}>
                    App Credentials: {gitHubAppStatus().credentials_configured ? 'Ready' : 'Missing'}
                  </span>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => loadGitHubBackupWorkspace()} disabled={isGitHubLoading()}>
                  <IconRefresh class="size-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" onClick={() => startGitHubOAuth()}>
                  <IconBrandGithub class="size-4 mr-2" />
                  Connect OAuth
                </Button>
                <Button onClick={() => handleInstallGitHubApp()} disabled={isGitHubActionLoading()}>
                  <IconGitFork class="size-4 mr-2" />
                  Install GitHub App
                </Button>
              </div>
            </div>
          </Card>

          <Show when={gitHubMessage()}>
            <div class="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
              <IconCheck class="size-4" />
              {gitHubMessage()}
            </div>
          </Show>

          <Show when={gitHubError()}>
            <div class="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <IconAlertTriangle class="size-4" />
              {gitHubError()}
            </div>
          </Show>

          <Show when={isGitHubLoading()}>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map(() => (
                <Card class="p-5">
                  <div class="animate-pulse space-y-2">
                    <div class="h-3 rounded bg-muted"></div>
                    <div class="h-6 rounded bg-muted"></div>
                  </div>
                </Card>
              ))}
            </div>
          </Show>

          <Show when={!isGitHubLoading()}>
            <>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card class="p-5">
                  <p class="text-xs text-muted-foreground uppercase tracking-wide mb-2">Available Repositories</p>
                  <p class="text-2xl font-semibold text-foreground">{gitHubRepos().length}</p>
                </Card>
                <Card class="p-5">
                  <p class="text-xs text-muted-foreground uppercase tracking-wide mb-2">Selected for Backup</p>
                  <p class="text-2xl font-semibold text-foreground">{selectedRepos().length}</p>
                </Card>
                <Card class="p-5">
                  <p class="text-xs text-muted-foreground uppercase tracking-wide mb-2">Stored Backups</p>
                  <p class="text-2xl font-semibold text-foreground">{gitHubBackups().length}</p>
                </Card>
              </div>

              <Card class="p-6">
                <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                  <div>
                    <h3 class="text-lg font-semibold text-foreground">Repository Selection</h3>
                    <p class="text-sm text-muted-foreground">Choose repositories to mirror into local backup storage.</p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => selectAllRepos()} disabled={gitHubRepos().length === 0}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => clearSelectedRepos()} disabled={selectedRepos().length === 0}>
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleBackupSelectedRepos()}
                      disabled={selectedRepos().length === 0 || isGitHubActionLoading()}
                    >
                      <IconDownload class="size-4 mr-2" />
                      Backup Selected ({selectedRepos().length})
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { window.location.href = '/app/github'; }}>
                      <IconExternalLink class="size-4 mr-2" />
                      Open GitHub Page
                    </Button>
                  </div>
                </div>

                <Show when={gitHubRepos().length > 0} fallback={
                  <div class="rounded-xl border border-dashed border-border p-8 text-center">
                    <p class="text-sm text-muted-foreground">
                      No repositories available. Connect OAuth or install/configure GitHub App access first.
                    </p>
                  </div>
                }>
                  <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    <For each={gitHubRepos()}>
                      {(repo) => (
                        <button
                          onClick={() => toggleRepoSelection(repo.full_name)}
                          class={`text-left rounded-xl border p-4 transition-all ${
                            isRepoSelected(repo.full_name)
                              ? 'border-primary/40 bg-primary/8 shadow-sm'
                              : 'border-border hover:border-primary/25 hover:bg-accent/40'
                          }`}
                        >
                          <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                              <p class="font-semibold text-foreground truncate">{repo.full_name}</p>
                              <p class="text-xs text-muted-foreground mt-1">
                                {repo.private ? 'Private' : 'Public'} • {repo.default_branch || 'main'}
                              </p>
                            </div>
                            <span class={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                              isRepoSelected(repo.full_name)
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border text-transparent'
                            }`}>
                              <IconCheck class="size-3.5" />
                            </span>
                          </div>
                          <p class="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {repo.description || 'No description provided.'}
                          </p>
                          <div class="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                            <span class="inline-flex items-center gap-1">
                              <IconGitFork class="size-3.5" />
                              {repo.forks_count}
                            </span>
                            <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                          </div>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </Card>

              <Card class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-semibold text-foreground">Local Backup Inventory</h3>
                  <Show when={gitHubBackupRoot()}>
                    <span class="text-xs text-muted-foreground font-mono break-all">
                      {gitHubBackupRoot()}
                    </span>
                  </Show>
                </div>

                <Show when={gitHubBackups().length > 0} fallback={
                  <div class="rounded-xl border border-dashed border-border p-8 text-center">
                    <p class="text-sm text-muted-foreground">
                      No repository backups yet. Select repositories above and run your first backup.
                    </p>
                  </div>
                }>
                  <div class="space-y-3">
                    <For each={gitHubBackups()}>
                      {(backup) => (
                        <div class="rounded-lg border border-border p-4">
                          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                              <p class="font-medium text-foreground">{backup.repository_full_name}</p>
                              <p class="text-xs text-muted-foreground mt-1">
                                Source: {formatSourceLabel(backup.source)} • Last run:{' '}
                                {backup.last_backup_at ? new Date(backup.last_backup_at).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                            <div class={`text-xs px-2.5 py-1 rounded-full border w-fit ${
                              backup.last_backup_status === 'success'
                                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-500'
                                : 'border-destructive/30 bg-destructive/10 text-destructive'
                            }`}>
                              {backup.last_backup_status}
                            </div>
                          </div>
                          <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <span>Size: {formatFileSize(backup.last_backup_size || 0)}</span>
                            <span class="font-mono break-all">Path: {backup.local_path}</span>
                          </div>
                          <Show when={backup.last_backup_error}>
                            <p class="mt-2 text-xs text-destructive break-words">{backup.last_backup_error}</p>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </Card>
            </>
          </Show>
        </div>
      </Show>

      <FileUpload
        isOpen={showUploadModal()}
        onClose={() => setShowUploadModal(false)}
        onFilesChange={handleFileUpload}
        maxFileSize={50}
        acceptedTypes={['image/jpeg', 'image/png', 'application/pdf', 'video/mp4']}
      />

      <FilePreviewModal
        isOpen={showPreviewModal()}
        onClose={() => setShowPreviewModal(false)}
        file={selectedFile()}
      />
    </div>
  );
};
