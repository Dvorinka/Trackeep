import { createSignal, onMount } from 'solid-js';
import { Card } from '@/components/ui/Card';
import { IconBrain, IconFileText, IconChecklist, IconSparkles, IconRobot, IconSettings } from '@tabler/icons-solidjs';
import { AIProviderIcon } from '@/components/AIProviderIcon';

interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  category: string;
  iconId?: string;
}

export const AIAssistant = () => {
  const [activeTab, setActiveTab] = createSignal<'dashboard' | 'summarizer' | 'tasks' | 'content' | 'settings'>('dashboard');
  const [selectedModel, setSelectedModel] = createSignal<string>('longcat-flash-chat');
  const [aiModels, setAIModels] = createSignal<AIModel[]>([]);

  const tabs = [
    { id: 'dashboard', label: 'AI Dashboard', icon: IconBrain },
    { id: 'summarizer', label: 'Content Summarizer', icon: IconFileText },
    { id: 'tasks', label: 'Task Suggestions', icon: IconChecklist },
    { id: 'content', label: 'Content Generation', icon: IconSparkles },
    { id: 'settings', label: 'AI Settings', icon: IconSettings },
  ];

  // Initialize AI models on mount
  onMount(() => {
    const models: AIModel[] = [
      { id: 'longcat-flash-chat', name: 'LongCat Flash Chat', description: 'Fast and efficient chat model', provider: 'longcat', category: 'fast', iconId: 'longcat' },
      { id: 'longcat-flash-thinking', name: 'LongCat Flash Thinking', description: 'Advanced reasoning model', provider: 'longcat', category: 'thinking', iconId: 'longcat' },
      { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Lightweight and fast', provider: 'mistral', category: 'standard', iconId: 'mistral' },
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Most capable model', provider: 'mistral', category: 'advanced', iconId: 'mistral' },
      { id: 'grok-standard', name: 'Grok Standard', description: 'Grok from X', provider: 'grok', category: 'standard', iconId: 'grok' },
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'DeepSeek chat model', provider: 'deepseek', category: 'standard', iconId: 'deepseek' },
      { id: 'ollama-local', name: 'Ollama Local', description: 'Local Ollama model', provider: 'ollama', category: 'local', iconId: 'ollama' },
      { id: 'openrouter-auto', name: 'OpenRouter Auto', description: 'Router over many models', provider: 'openrouter', category: 'standard', iconId: 'openrouter' },
    ];
    setAIModels(models);
  });

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
        {aiModels().length > 0 && (
          <div class="flex items-center gap-3 text-sm">
            <span class="text-gray-500">Active:</span>
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <AIProviderIcon 
                  providerId={aiModels().find(m => m.id === selectedModel())?.iconId || 'longcat'} 
                  size="1.25rem"
                  class="text-primary"
                />
                <span class="font-medium text-blue-600 dark:text-blue-400">
                  {aiModels().find(m => m.id === selectedModel())?.name?.split(' ')[0] || 'AI'}
                </span>
              </div>
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
              {/* AI Models */}
              <div>
                <h4 class="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">Available AI Models</h4>
                <div class="space-y-3">
                  {aiModels().map((model) => (
                    <div
                      class={`p-4 border rounded-lg transition-all ${
                        selectedModel() === model.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <AIProviderIcon 
                            providerId={model.iconId!} 
                            size="2rem"
                            class="text-primary"
                          />
                          <div>
                            <h5 class="font-medium text-gray-900 dark:text-white">{model.name}</h5>
                            <p class="text-sm text-gray-600 dark:text-gray-400">{model.description}</p>
                            <div class="flex items-center gap-2 mt-2">
                              <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                {model.provider}
                              </span>
                              <span class={`text-xs px-2 py-1 rounded-full ${
                                model.category === 'thinking' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : model.category === 'fast'
                                  ? 'bg-green-100 text-green-800'
                                  : model.category === 'advanced'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {model.category}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedModel(model.id)}
                          class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedModel() === model.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {selectedModel() === model.id ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Selection */}
              <div>
                <h4 class="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">Current Selection</h4>
                <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div class="flex items-center gap-3">
                    <AIProviderIcon 
                      providerId={aiModels().find(m => m.id === selectedModel())?.iconId || 'longcat'} 
                      size="1.5rem"
                      class="text-primary"
                    />
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {aiModels().find(m => m.id === selectedModel())?.name}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {aiModels().find(m => m.id === selectedModel())?.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
