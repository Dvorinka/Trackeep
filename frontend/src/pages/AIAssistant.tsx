import { createSignal, onMount } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { IconBrain, IconFileText, IconChecklist, IconSparkles, IconRobot, IconSettings } from '@tabler/icons-solidjs';
import { AIProviderIcon } from '@/components/AIProviderIcon';

interface AIProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  models: {
    id: string;
    name: string;
    type: string;
  }[];
}

export const AIAssistant = () => {
  const [activeTab, setActiveTab] = createSignal<'dashboard' | 'summarizer' | 'tasks' | 'content' | 'settings'>('dashboard');
  const [selectedProvider, setSelectedProvider] = createSignal<string>('');
  const [selectedModel, setSelectedModel] = createSignal<string>('standard');
  const [enabledProviders, setEnabledProviders] = createSignal<string[]>([]);
  const [providers, setProviders] = createSignal<AIProvider[]>([]);

  const tabs = [
    { id: 'dashboard', label: 'AI Dashboard', icon: IconBrain },
    { id: 'summarizer', label: 'Content Summarizer', icon: IconFileText },
    { id: 'tasks', label: 'Task Suggestions', icon: IconChecklist },
    { id: 'content', label: 'Content Generation', icon: IconSparkles },
    { id: 'settings', label: 'AI Settings', icon: IconSettings },
  ];

  // Fetch available providers on mount
  onMount(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/v1/ai/providers`);
      const data = await response.json();
      setProviders(data.providers || []);
      
      // Enable all providers by default
      const providerIds = (data.providers || []).map((p: AIProvider) => p.id);
      setEnabledProviders(providerIds);
      
      // Set default provider if available
      if (data.providers && data.providers.length > 0) {
        setSelectedProvider(data.providers[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch AI providers:', error);
    }
  });

  const toggleProvider = (providerId: string) => {
    const enabled = enabledProviders();
    if (enabled.includes(providerId)) {
      // Remove provider if it's currently selected, select another
      if (selectedProvider() === providerId) {
        const remaining = enabled.filter(p => p !== providerId);
        setSelectedProvider(remaining.length > 0 ? remaining[0] : '');
      }
      setEnabledProviders(enabled.filter(p => p !== providerId));
    } else {
      setEnabledProviders([...enabled, providerId]);
      // If this is the first provider, select it
      if (enabled.length === 0) {
        setSelectedProvider(providerId);
      }
    }
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <IconRobot class="size-8 text-primary" />
            AI Assistant
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-2">
            Leverage AI to enhance your productivity and content management
          </p>
        </div>
        {enabledProviders().length > 0 && (
          <div class="flex items-center gap-3 text-sm">
            <span class="text-gray-500">Active:</span>
            <div class="flex items-center gap-2">
              {enabledProviders().map(providerId => {
                const provider = providers().find(p => p.id === providerId);
                return (
                  <div class="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <AIProviderIcon 
                      providerId={providerId} 
                      size="1.25rem"
                      class="text-primary"
                    />
                    <span class="font-medium text-blue-600 dark:text-blue-400">
                      {provider?.name || providerId}
                    </span>
                    {selectedModel() !== 'standard' && selectedProvider() === providerId && (
                      <span class="text-xs text-blue-500">
                        {provider?.models.find(m => m.id === selectedModel())?.name?.split('-')[0]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div class="border-b border-gray-200 dark:border-gray-700">
        <nav class="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              onClick={() => setActiveTab(tab.id as any)}
              class={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab() === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon class="size-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div class="space-y-6">
        {activeTab() === 'settings' && (
          <Card class="p-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">AI Provider Settings</h3>
            <div class="space-y-6">
              {/* Provider Toggles */}
              <div>
                <h4 class="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">Available Providers</h4>
                <div class="space-y-3">
                  {providers().map((provider) => {
                    const isEnabled = enabledProviders().includes(provider.id);
                    return (
                      <div
                        class={`p-4 border rounded-lg transition-all ${
                          isEnabled
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-3">
                            <AIProviderIcon 
                              providerId={provider.id} 
                              size="2rem"
                              class="text-primary"
                            />
                            <div>
                              <h5 class="font-medium text-gray-900 dark:text-white">{provider.name}</h5>
                              <p class="text-sm text-gray-600 dark:text-gray-400">{provider.description}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleProvider(provider.id)}
                            class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              isEnabled
                                ? 'bg-blue-600'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          >
                            <span
                              class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isEnabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        
                        {/* Model selection for enabled providers */}
                        {isEnabled && (
                          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div class="flex items-center gap-2 mb-2">
                              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Model:
                              </label>
                              <select
                                value={selectedProvider() === provider.id ? selectedModel() : 'standard'}
                                onChange={(e) => {
                                  setSelectedProvider(provider.id);
                                  setSelectedModel(e.target.value);
                                }}
                                class="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                              >
                                {provider.models.map((model) => (
                                  <option value={model.id}>
                                    {model.type} - {model.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Model badges */}
                            <div class="flex flex-wrap gap-2">
                              {provider.models.map((model) => (
                                <div
                                  class={`px-2 py-1 text-xs rounded-full border ${
                                    model.id.includes('thinking') || model.id.includes('reasoner')
                                      ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200'
                                      : 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-200'
                                  }`}
                                >
                                  {model.type}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Selection */}
              {enabledProviders().length > 0 && (
                <div>
                  <h4 class="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">Current Selection</h4>
                  <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div class="flex items-center gap-3">
                      <AIProviderIcon 
                        providerId={selectedProvider()} 
                        size="1.5rem"
                        class="text-primary"
                      />
                      <div>
                        <p class="font-medium text-gray-900 dark:text-white">
                          {providers().find(p => p.id === selectedProvider())?.name}
                        </p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                          {providers().find(p => p.id === selectedProvider())?.models.find(m => m.id === selectedModel())?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
        
        {activeTab() === 'dashboard' && (
          <Card class="p-6 text-center">
            <IconBrain class="size-12 text-primary mx-auto" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2 mt-4">
              AI Dashboard
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              AI Dashboard component temporarily disabled.
            </p>
          </Card>
        )}
        {activeTab() === 'summarizer' && (
          <Card class="p-6 text-center">
            <IconFileText class="size-12 text-primary mx-auto" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2 mt-4">
              Content Summarizer
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Content Summarizer component temporarily disabled.
            </p>
          </Card>
        )}
        {activeTab() === 'tasks' && (
          <Card class="p-6 text-center">
            <IconChecklist class="size-12 text-primary mx-auto" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2 mt-4">
              Task Suggestions
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              AI-powered task suggestions based on your calendar, deadlines, and habits.
            </p>
            <p class="text-sm text-gray-500 mt-2">
              View and manage suggestions from the AI Dashboard.
            </p>
          </Card>
        )}
        {activeTab() === 'content' && (
          <Card class="p-6 text-center">
            <IconSparkles class="size-12 text-primary mx-auto" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2 mt-4">
              Content Generation
            </h3>
            <p class="text-gray-600 dark:text-gray-400">
              Generate blog posts, code, emails, and more with AI assistance.
            </p>
            <p class="text-sm text-gray-500 mt-2">
              Coming soon - Advanced AI content generation tools.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
