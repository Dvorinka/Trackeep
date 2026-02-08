import { createSignal, onMount, For, Show } from 'solid-js';

interface Instance {
  id: number;
  name: string;
  url: string;
  api_key: string;
  is_active: boolean;
  version: string;
  created_at: string;
  last_sync: string;
  admin_user_id: number;
}

export const InstanceManagement = () => {
  const [instances, setInstances] = createSignal<Instance[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [showModal, setShowModal] = createSignal(false);
  const [editingInstance, setEditingInstance] = createSignal<Instance | null>(null);

  // Form state
  const [formData, setFormData] = createSignal({
    name: '',
    url: '',
    version: ''
  });

  onMount(async () => {
    await loadInstances();
    setLoading(false);
  });

  const loadInstances = async () => {
    try {
      const response = await fetch('/api/v1/instances');
      const data = await response.json();
      setInstances(data.instances || []);
    } catch (error) {
      console.error('Error loading instances:', error);
    }
  };

  const openCreateModal = () => {
    setEditingInstance(null);
    setFormData({
      name: '',
      url: '',
      version: ''
    });
    setShowModal(true);
  };

  const openEditModal = (instance: Instance) => {
    setEditingInstance(instance);
    setFormData({
      name: instance.name,
      url: instance.url,
      version: instance.version || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingInstance(null);
  };

  const saveInstance = async () => {
    try {
      const url = editingInstance() ? `/api/v1/instances/${editingInstance()!.id}` : '/api/v1/instances';
      const method = editingInstance() ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData())
      });

      if (response.ok) {
        closeModal();
        await loadInstances();
        
        if (!editingInstance()) {
          const result = await response.json();
          if (result.api_key) {
            alert(`🎉 Instance registered successfully!\n\nAPI Key: ${result.api_key}\n\nSave this key securely - it will not be shown again.`);
          }
        }
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to save instance'));
      }
    } catch (error) {
      console.error('Error saving instance:', error);
      alert('Error: Failed to save instance');
    }
  };

  const deleteInstance = async (instanceId: number) => {
    if (!confirm('Are you sure you want to delete this instance? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/v1/instances/${instanceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadInstances();
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to delete instance'));
      }
    } catch (error) {
      console.error('Error deleting instance:', error);
      alert('Error: Failed to delete instance');
    }
  };

  const testConnection = async (instance: Instance) => {
    try {
      const response = await fetch(`${instance.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        alert('✅ Connection successful! Instance is responding.');
      } else {
        alert('❌ Connection failed. Instance returned an error.');
      }
    } catch (error) {
      alert('❌ Connection failed. Unable to reach the instance.');
    }
  };

  const copyApiKey = (apiKey: string, event: MouseEvent) => {
    navigator.clipboard.writeText(apiKey).then(() => {
      // Show feedback (you could implement a toast here)
      const btn = event.target as HTMLButtonElement;
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      (btn as HTMLButtonElement).style.background = '#10b981';
      
      setTimeout(() => {
        btn.textContent = originalText;
        (btn as HTMLButtonElement).style.background = '';
      }, 2000);
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-6">
      <div class="max-w-7xl mx-auto">
        {/* Header */}
        <header class="glass rounded-2xl p-6 mb-8 shadow-xl">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                T
              </div>
              <h1 class="text-2xl font-bold text-gray-900">Trackeep Controller</h1>
            </div>
            <nav class="flex gap-2">
              <a href="/dashboard" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Dashboard</a>
              <a href="/dashboard/courses" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Courses</a>
              <a href="/dashboard/instances" class="px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">Instances</a>
              <a href="/api/v1/user/me" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">Profile</a>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <div class="glass rounded-2xl p-6 shadow-xl">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-semibold text-gray-900">Instance Management</h2>
            <button 
              onClick={openCreateModal}
              class="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
            >
              <span>+</span> Register New Instance
            </button>
          </div>

          <Show when={loading()} fallback={
            <Show when={instances().length > 0} fallback={
              <div class="text-center py-16 text-gray-500">
                <div class="text-6xl mb-4 opacity-50">🖥️</div>
                <div class="text-xl font-semibold mb-2">No instances registered</div>
                <p>Register your first Trackeep instance to get started!</p>
              </div>
            }>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <For each={instances()}>
                  {(instance) => (
                    <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                      <div class={`absolute top-4 right-4 w-3 h-3 rounded-full ${instance.is_active ? 'bg-green-500' : 'bg-red-500'} ${instance.is_active ? 'animate-pulse' : ''}`}></div>
                      
                      <div class="p-6">
                        <div class="flex justify-between items-start mb-4">
                          <div class="flex-1">
                            <h3 class="text-lg font-semibold text-gray-900 mb-1">{instance.name}</h3>
                            <a 
                              href={instance.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              class="text-indigo-600 hover:text-indigo-700 text-sm mb-2 block"
                            >
                              {instance.url}
                            </a>
                            <div class="flex items-center gap-2 text-sm text-gray-600">
                              <div class={`w-2 h-2 rounded-full ${instance.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <span>{instance.is_active ? 'Active' : 'Inactive'}</span>
                            </div>
                          </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3 mb-4">
                          <div>
                            <div class="text-xs text-gray-500 uppercase tracking-wide">Version</div>
                            <div class="text-sm font-medium text-gray-900">{instance.version || 'Unknown'}</div>
                          </div>
                          <div>
                            <div class="text-xs text-gray-500 uppercase tracking-wide">Created</div>
                            <div class="text-sm font-medium text-gray-900">{formatDate(instance.created_at)}</div>
                          </div>
                          <div>
                            <div class="text-xs text-gray-500 uppercase tracking-wide">Last Sync</div>
                            <div class="text-sm font-medium text-gray-900">{formatDate(instance.last_sync)}</div>
                          </div>
                          <div>
                            <div class="text-xs text-gray-500 uppercase tracking-wide">Instance ID</div>
                            <div class="text-sm font-medium text-gray-900">#{instance.id}</div>
                          </div>
                        </div>

                        <div class="bg-gray-50 rounded-lg p-3 mb-4">
                          <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">API Key</div>
                          <div class="flex items-center gap-2">
                            <input 
                              type="text" 
                              readonly 
                              value={instance.api_key}
                              class="flex-1 text-xs font-mono bg-transparent border-none outline-none text-gray-600"
                            />
                            <button 
                              onClick={(e: MouseEvent) => copyApiKey(instance.api_key, e)}
                              class="px-2 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600 transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                        </div>

                        <div class="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200">
                          <div class="text-center">
                            <div class="text-lg font-semibold text-indigo-600">{Math.floor(Math.random() * 100)}</div>
                            <div class="text-xs text-gray-500">Users</div>
                          </div>
                          <div class="text-center">
                            <div class="text-lg font-semibold text-indigo-600">{Math.floor(Math.random() * 50)}</div>
                            <div class="text-xs text-gray-500">Courses</div>
                          </div>
                          <div class="text-center">
                            <div class="text-lg font-semibold text-indigo-600">{Math.floor(Math.random() * 1000)}</div>
                            <div class="text-xs text-gray-500">API Calls</div>
                          </div>
                        </div>

                        <div class="flex gap-2 mt-4">
                          <button 
                            class="flex-1 p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors text-sm"
                            onClick={() => testConnection(instance)}
                            title="Test Connection"
                          >
                            🔗
                          </button>
                          <button 
                            class="flex-1 p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors text-sm"
                            onClick={() => openEditModal(instance)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button 
                            class="flex-1 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm"
                            onClick={() => deleteInstance(instance.id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          }>
            <div class="text-center py-8 text-gray-500">Loading instances...</div>
          </Show>
        </div>
      </div>

      {/* Instance Modal */}
      <Show when={showModal()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-2xl p-8 max-w-md w-full">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-semibold text-gray-900">
                {editingInstance() ? 'Edit Instance' : 'Register New Instance'}
              </h3>
              <button 
                onClick={closeModal}
                class="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Instance Name *</label>
                <input
                  type="text"
                  value={formData().name}
                  onInput={(e) => setFormData({ ...formData(), name: e.currentTarget.value })}
                  placeholder="My Trackeep Instance"
                  class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Instance URL *</label>
                <input
                  type="url"
                  value={formData().url}
                  onInput={(e) => setFormData({ ...formData(), url: e.currentTarget.value })}
                  placeholder="https://myapp.trackeep.com"
                  class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Version</label>
                <input
                  type="text"
                  value={formData().version}
                  onInput={(e) => setFormData({ ...formData(), version: e.currentTarget.value })}
                  placeholder="1.0.0"
                  class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div class="flex gap-3 justify-end mt-6">
              <button 
                type="button"
                onClick={closeModal}
                class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={saveInstance}
                class="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                {editingInstance() ? 'Update Instance' : 'Register Instance'}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
