import { createSignal, createEffect, Show, For } from 'solid-js';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { CheckCircle, AlertCircle, Shield, Key, Globe, Clock, Users, Settings } from 'lucide-solid';

interface APIKey {
  id: number;
  name: string;
  permissions: string[];
  is_active: boolean;
  last_used?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

interface BrowserExtension {
  id: number;
  extension_id: string;
  name: string;
  is_active: boolean;
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

interface QuickStartGuide {
  title: string;
  description: string;
  icon: any;
  steps: string[];
}

interface Example {
  title: string;
  description: string;
  code: string;
  language: string;
}

const BrowserExtensionSettings = () => {
  const [apiKeys, setApiKeys] = createSignal<APIKey[]>([]);
  const [extensions, setExtensions] = createSignal<BrowserExtension[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [showCreateKey, setShowCreateKey] = createSignal(false);
  const [newKeyName, setNewKeyName] = createSignal('');
  const [newKeyPermissions, setNewKeyPermissions] = createSignal<string[]>([
    'bookmarks:read',
    'bookmarks:write',
    'files:read',
    'files:write'
  ]);
  const [activeTab, setActiveTab] = createSignal<'overview' | 'api-keys' | 'extensions' | 'examples'>('api-keys');

  const quickStartGuides: QuickStartGuide[] = [
    {
      title: 'Generate API Key',
      description: 'Create a secure API key for your browser extension',
      icon: <Key class="w-5 h-5 text-blue-600" />,
      steps: [
        'Go to Settings → Browser Extension',
        'Click "Generate New Key"',
        'Choose permissions and name',
        'Copy the generated key'
      ]
    },
    {
      title: 'Configure Extension',
      description: 'Set up your browser extension with the API key',
      icon: <Settings class="w-5 h-5 text-green-600" />,
      steps: [
        'Install the Trackeep browser extension',
        'Open extension options',
        'Paste your API key',
        'Test connection',
        'Start saving bookmarks!'
      ]
    },
    {
      title: 'Security Best Practices',
      description: 'Keep your API keys secure and monitor usage',
      icon: <Shield class="w-5 h-5 text-purple-600" />,
      steps: [
        'Use unique names for each key',
        'Set expiration dates for temporary access',
        'Revoke unused keys immediately',
        'Monitor key usage regularly',
        'Never share keys publicly'
      ]
    }
  ];

  const codeExamples: Example[] = [
    {
      title: 'JavaScript Extension',
      description: 'Basic API key validation and bookmark creation',
      code: `// Validate API key
const response = await fetch('/api/v1/browser-extension/validate', {
  headers: {
    'Authorization': 'Bearer tk_your_api_key_here'
  }
});

// Create bookmark
const bookmarkData = {
  title: 'My Awesome Bookmark',
  url: 'https://example.com',
  description: 'A useful website',
  tags: ['development', 'tools']
};

const createResponse = await fetch('/api/v1/bookmarks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tk_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(bookmarkData)
});`,
      language: 'javascript'
    },
    {
      title: 'Python Integration',
      description: 'Server-side API integration example',
      code: `import requests

# Validate API key
response = requests.get(
  'https://your-trackeep.com/api/v1/browser-extension/validate',
  headers={'Authorization': 'Bearer tk_your_api_key_here'}
)

# Create bookmark
bookmark_data = {
  'title': 'My Awesome Bookmark',
  'url': 'https://example.com',
  'description': 'A useful website',
  'tags': ['development', 'tools']
}

response = requests.post(
  'https://your-trackeep.com/api/v1/bookmarks',
  json=bookmark_data,
  headers={
    'Authorization': 'Bearer tk_your_api_key_here',
    'Content-Type': 'application/json'
  }
)`,
      language: 'python'
    },
    {
      title: 'cURL Command',
      description: 'Command line testing for API endpoints',
      code: `# Validate API key
curl -X GET \\\n  -H "Authorization: Bearer tk_your_api_key_here" \\\n  https://your-trackeep.com/api/v1/browser-extension/validate

# Create bookmark
curl -X POST \\\n  -H "Authorization: Bearer tk_your_api_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '{"title":"My Bookmark","url":"https://example.com"}' \\\n  https://your-trackeep.com/api/v1/bookmarks`,
      language: 'bash'
    }
  ];

  const availablePermissions = [
    { id: 'bookmarks:read', label: 'Read Bookmarks', description: 'View and read your bookmarks' },
    { id: 'bookmarks:write', label: 'Write Bookmarks', description: 'Create, edit, and delete bookmarks' },
    { id: 'files:read', label: 'Read Files', description: 'View and download your files' },
    { id: 'files:write', label: 'Write Files', description: 'Upload, edit, and delete files' },
    { id: 'notes:read', label: 'Read Notes', description: 'View your notes' },
    { id: 'notes:write', label: 'Write Notes', description: 'Create, edit, and delete notes' },
    { id: 'tasks:read', label: 'Read Tasks', description: 'View your tasks' },
    { id: 'tasks:write', label: 'Write Tasks', description: 'Create, edit, and delete tasks' }
  ];

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/v1/browser-extension/api-keys', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      } else {
        toast.error('Failed to load API keys');
      }
    } catch (error) {
      toast.error('Error loading API keys');
    }
  };

  const loadExtensions = async () => {
    try {
      const response = await fetch('/api/v1/browser-extension/extensions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExtensions(data);
      } else {
        toast.error('Failed to load extensions');
      }
    } catch (error) {
      toast.error('Error loading extensions');
    }
  };

  const createAPIKey = async () => {
    if (!newKeyName().trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    if (newKeyPermissions().length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/browser-extension/api-keys/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: newKeyName(),
          permissions: newKeyPermissions(),
          expires_in: 365 // 1 year
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`API key "${data.name}" created successfully!`);
        setNewKeyName('');
        setNewKeyPermissions(['bookmarks:read', 'bookmarks:write', 'files:read', 'files:write']);
        setShowCreateKey(false);
        await loadApiKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create API key');
      }
    } catch (error) {
      toast.error('Error creating API key');
    } finally {
      setLoading(false);
    }
  };

  const revokeAPIKey = async (keyId: number) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/browser-extension/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('API key revoked successfully');
        await loadApiKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to revoke API key');
      }
    } catch (error) {
      toast.error('Error revoking API key');
    }
  };

  const revokeExtension = async (extensionId: string) => {
    if (!confirm('Are you sure you want to revoke this extension? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/browser-extension/extensions/${extensionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Extension revoked successfully');
        await loadExtensions();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to revoke extension');
      }
    } catch (error) {
      toast.error('Error revoking extension');
    }
  };

  const togglePermission = (permissionId: string) => {
    const current = newKeyPermissions();
    if (current.includes(permissionId)) {
      setNewKeyPermissions(current.filter(p => p !== permissionId));
    } else {
      setNewKeyPermissions([...current, permissionId]);
    }
  };

  createEffect(() => {
    loadApiKeys();
    loadExtensions();
  }, []);

  return (
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Browser Extension Settings</h1>
        <p class="text-gray-600">Manage API keys and browser extensions for secure access to your Trackeep account.</p>
      </div>

      {/* Tab Navigation */}
      <div class="border-b border-gray-200 mb-6">
        <nav class="flex space-x-8">
          <button
            class={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab() === 'overview' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            <Globe class="w-4 h-4 mr-2" />
            Overview
          </button>
          <button
            class={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab() === 'api-keys' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('api-keys')}
          >
            <Key class="w-4 h-4 mr-2" />
            API Keys
          </button>
          <button
            class={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab() === 'extensions' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('extensions')}
          >
            <Users class="w-4 h-4 mr-2" />
            Extensions
          </button>
          <button
            class={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab() === 'examples' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('examples')}
          >
            <Shield class="w-4 h-4 mr-2" />
            Examples
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      <Show when={activeTab() === 'overview'}>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <For each={quickStartGuides}>
            {guide => (
              <Card class="p-6">
                <div class="text-center mb-4">
                  <div class="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                    {guide.icon}
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900">{guide.title}</h3>
                  <p class="text-gray-600 text-sm mb-4">{guide.description}</p>
                </div>
                <div class="space-y-2">
                  <For each={guide.steps}>
                    {step => (
                      <div class="flex items-center space-x-2">
                        <CheckCircle class="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span class="text-sm text-gray-700">{step}</span>
                      </div>
                    )}
                  </For>
                </div>
              </Card>
            )}
          </For>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card class="p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertCircle class="w-5 h-5 text-orange-500 mr-2" />
              Security Status
            </h3>
            <div class="space-y-3">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <div class="font-medium text-green-700">API Keys Secure</div>
                  <div class="text-sm text-gray-600">All keys using secure API key authentication</div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <div class="font-medium text-green-700">Extensions Registered</div>
                  <div class="text-sm text-gray-600">{extensions().length} active extensions</div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div>
                  <div class="font-medium text-yellow-700">Quick Setup Available</div>
                  <div class="text-sm text-gray-600">Get started in under 5 minutes</div>
                </div>
              </div>
            </div>
          </Card>

          <Card class="p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock class="w-5 h-5 text-blue-500 mr-2" />
              Recent Activity
            </h3>
            <div class="space-y-2">
              <div class="text-sm text-gray-600">
                <div class="font-medium text-gray-900">Last API key created:</div>
                <div>{apiKeys().length > 0 ? new Date(apiKeys()[0].created_at).toLocaleDateString() : 'No keys created yet'}</div>
              </div>
              <div class="text-sm text-gray-600">
                <div class="font-medium text-gray-900">Total API keys:</div>
                <div>{apiKeys().length} active, {apiKeys().filter(k => !k.is_active).length} revoked</div>
              </div>
              <div class="text-sm text-gray-600">
                <div class="font-medium text-gray-900">Extensions active:</div>
                <div>{extensions().length} connected</div>
              </div>
            </div>
          </Card>
        </div>
      </Show>

      {/* API Keys Section */}
      <Show when={activeTab() === 'api-keys'}>
        <Card class="mb-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">API Keys</h2>
            <Button onClick={() => setShowCreateKey(true)} class="btn-primary">
              Generate New Key
            </Button>
          </div>

          <Show when={showCreateKey()}>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 class="text-lg font-medium mb-4">Create New API Key</h3>
              
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Key Name</label>
                <Input
                  value={newKeyName()}
                  onInput={(e) => setNewKeyName((e.target as HTMLInputElement).value)}
                  placeholder="e.g., Chrome Extension, Laptop Backup"
                  class="w-full"
                />
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div class="space-y-2">
                  <For each={availablePermissions}>
                    {permission => (
                      <label class="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newKeyPermissions().includes(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span class="font-medium">{permission.label}</span>
                          <span class="text-sm text-gray-500">{permission.description}</span>
                        </div>
                      </label>
                    )}
                  </For>
                </div>
              </div>

              <div class="flex space-x-2">
                <Button
                  onClick={() => setShowCreateKey(false)}
                  class="btn-secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createAPIKey}
                  disabled={loading()}
                  class="btn-primary"
                >
                  {loading() ? 'Creating...' : 'Create Key'}
                </Button>
              </div>
            </div>
          </Show>

          <div class="space-y-3">
            <For each={apiKeys()}>
              {key => (
                <div class="bg-white border border-gray-200 rounded-lg p-4">
                  <div class="flex justify-between items-start">
                    <div class="flex-1">
                      <h3 class="text-lg font-medium">{key.name}</h3>
                      <div class="text-sm text-gray-500 mb-2">
                        Created: {new Date(key.created_at).toLocaleDateString()}
                      </div>
                      <div class="flex flex-wrap gap-1">
                        <For each={key.permissions}>
                          {permission => (
                            <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {permission}
                            </span>
                          )}
                        </For>
                      </div>
                      {key.expires_at && (
                        <div class="text-sm text-orange-600">
                          Expires: {new Date(key.expires_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div class="flex space-x-2">
                      <span class={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        key.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {key.is_active ? 'Active' : 'Revoked'}
                      </span>
                      <Button
                        onClick={() => revokeAPIKey(key.id)}
                        class="btn-secondary btn-sm"
                        disabled={!key.is_active}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Card>
      </Show>

      {/* Browser Extensions Section */}
      <Card>
        <div class="mb-4">
          <h2 class="text-xl font-semibold">Registered Extensions</h2>
          <p class="text-sm text-gray-600">Manage browser extensions that have access to your account.</p>
        </div>

        <div class="space-y-3">
          <For each={extensions()}>
            {extension => (
              <div class="bg-white border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <h3 class="text-lg font-medium">{extension.name}</h3>
                    <div class="text-sm text-gray-500 mb-2">
                      Extension ID: {extension.extension_id}
                    </div>
                    <div class="text-sm text-gray-500 mb-2">
                      Registered: {new Date(extension.created_at).toLocaleDateString()}
                    </div>
                    {extension.last_seen && (
                      <div class="text-sm text-gray-500">
                        Last seen: {new Date(extension.last_seen).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div class="flex space-x-2">
                    <span class={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      extension.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {extension.is_active ? 'Active' : 'Revoked'}
                    </span>
                    <Button
                      onClick={() => revokeExtension(extension.extension_id)}
                      class="btn-secondary btn-sm"
                      disabled={!extension.is_active}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Card>

      {/* Examples Tab */}
      <Show when={activeTab() === 'examples'}>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <For each={codeExamples}>
            {example => (
              <Card class="p-6">
                <div class="mb-4">
                  <h3 class="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span class="text-blue-600 font-mono text-xs font-bold">{example.language.toUpperCase()}</span>
                    </div>
                    {example.title}
                  </h3>
                  <p class="text-gray-600 text-sm mb-4">{example.description}</p>
                </div>
                
                <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre class="text-green-400 text-sm">
                    <code>{example.code}</code>
                  </pre>
                </div>
                
                <div class="flex justify-between items-center mt-4">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(example.code);
                      toast.success('Code copied to clipboard!');
                    }}
                    class="btn-secondary"
                  >
                    Copy Code
                  </Button>
                  <Button
                    onClick={() => window.open(`https://your-trackeep.com/api/v1/browser-extension/validate`, '_blank')}
                    class="btn-primary"
                  >
                    Test API
                  </Button>
                </div>
              </Card>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default BrowserExtensionSettings;
