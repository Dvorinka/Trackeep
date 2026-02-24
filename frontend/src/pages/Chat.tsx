import { createResource, createSignal, For, Show, onMount } from 'solid-js'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { AIProviderIcon } from '@/components/AIProviderIcon'
import { 
  Send, 
  CheckSquare,
  FileText as FileTextIcon,
  Sparkles,
  ChevronDown,
  Settings,
  Trash,
  User
} from 'lucide-solid'

interface ChatMessage {
  id: number
  content: string
  role: 'user' | 'assistant'
  created_at: string
  token_count?: number
  context_items?: string[]
}

interface ChatSession {
  id: number
  title: string
  message_count: number
  last_message_at?: string
  created_at: string
  include_bookmarks: boolean
  include_tasks: boolean
  include_files: boolean
  include_notes: boolean
}

const Chat = () => {
  const [activeView, setActiveView] = createSignal<'chat' | 'ai-tools'>('chat')
  const [aiTool, setAiTool] = createSignal<'summarizer' | 'tasks' | 'content'>('summarizer')
  const [selectedModel, setSelectedModel] = createSignal('longcat')
  const [showModelPicker, setShowModelPicker] = createSignal(false)
  const [availableProviders, setAvailableProviders] = createSignal<any[]>([])
  const [aiSettingsData, setAISettingsData] = createSignal<any>({})
  
  // Load AI providers and settings on mount
  onMount(async () => {
    await loadAIProviders()
    await loadAISettings()
  })

  const loadAIProviders = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/ai/providers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableProviders(data.providers || [])
      }
    } catch (error) {
      console.error('Failed to load AI providers:', error)
    }
  }

  const loadAISettings = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/ai/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAISettingsData(data)
        
        // Set selected model to first enabled provider
        const enabledProviders = Object.entries(data)
          .filter(([_, config]: [string, any]) => config.enabled)
          .map(([provider]) => provider)
        
        if (enabledProviders.length > 0) {
          setSelectedModel(enabledProviders[0])
        }
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error)
    }
  }

  // Get available AI models from providers and settings
  const getAIModels = () => {
    const settings = aiSettingsData()
    const providers = availableProviders()
    
    const models: any[] = []
    
    // Add models from enabled providers
    if (settings) {
      Object.entries(settings).forEach(([provider, config]: [string, any]) => {
        if (config.enabled) {
          models.push({
            id: provider,
            name: getProviderDisplayName(provider),
            description: getProviderDescription(provider),
            provider: getProviderDisplayName(provider),
            category: 'available'
          })
        }
      })
    }
    
    // Add all available providers (even if disabled) for demo purposes
    if (providers.length > 0) {
      providers.forEach((provider: any) => {
        if (!models.find(m => m.id === provider.id)) {
          models.push({
            id: provider.id,
            name: getProviderDisplayName(provider.id),
            description: getProviderDescription(provider.id),
            provider: getProviderDisplayName(provider.id),
            category: 'disabled'
          })
        }
      })
    }
    
    return models
  }

  const getProviderDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      mistral: 'Mistral AI',
      longcat: 'LongCat AI',
      grok: 'Grok AI',
      deepseek: 'DeepSeek AI',
      ollama: 'Ollama',
      openrouter: 'OpenRouter'
    }
    return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1)
  }

  const getProviderDescription = (provider: string) => {
    const descriptions: Record<string, string> = {
      mistral: 'European AI with multilingual capabilities',
      longcat: 'Fast and efficient AI models',
      grok: 'xAI\'s conversational AI model',
      deepseek: 'Advanced reasoning and coding',
      ollama: 'Local AI models',
      openrouter: 'Access to multiple AI models'
    }
    return descriptions[provider] || 'AI provider'
  }
  
  const [sessions] = createResource(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/chat/sessions`)
      if (!response.ok) throw new Error('Failed to fetch sessions')
      return response.json() as Promise<ChatSession[]>
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      // Return mock sessions for demo mode
      return Promise.resolve([
        {
          id: 1,
          title: 'Getting Started',
          message_count: 2,
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          include_bookmarks: true,
          include_tasks: true,
          include_files: true,
          include_notes: true
        },
        {
          id: 2,
          title: 'Project Planning',
          message_count: 5,
          last_message_at: new Date(Date.now() - 86400000).toISOString(),
          created_at: new Date(Date.now() - 172800000).toISOString(),
          include_bookmarks: true,
          include_tasks: true,
          include_files: false,
          include_notes: true
        }
      ] as ChatSession[])
    }
  })

  const [currentSessionId, setCurrentSessionId] = createSignal<string | null>('1')
  const [messages, setMessages] = createSignal<ChatMessage[]>([
    {
      id: 1,
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      role: 'assistant',
      created_at: new Date().toISOString()
    }
  ])
  const [inputMessage, setInputMessage] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(false)
  const [showSettings, setShowSettings] = createSignal(false)
  const [settingsExpanded, setSettingsExpanded] = createSignal(false)
  const [contextSettings, setContextSettings] = createSignal({
    bookmarks: true,
    tasks: true,
    files: true,
    notes: true
  })
  const [aiSettings, setAiSettings] = createSignal({
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful AI assistant for the Trackeep productivity application. Help users manage their tasks, bookmarks, files, and notes effectively.'
  })

  const aiTools = [
    { id: 'summarizer', label: 'Content Summarizer', icon: FileTextIcon, description: 'Summarize your notes, documents, and content' },
    { id: 'tasks', label: 'Task Suggestions', icon: CheckSquare, description: 'Get AI-powered task suggestions and organization' },
    { id: 'content', label: 'Content Generation', icon: Sparkles, description: 'Generate content using AI assistance' }
  ]

  const handleSendMessage = async () => {
    const message = inputMessage().trim()
    if (!message || isLoading()) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now(),
      content: message,
      role: 'user',
      created_at: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    // Simulate AI response (in production, this would call the AI API)
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: Date.now() + 1,
        content: `I received your message: "${message}". This is a demo response. In production, I would provide a helpful response based on the selected AI model (${selectedModel()}) and your context settings.`,
        role: 'assistant',
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div class="mt-4 pb-32 max-w-7xl mx-auto">
      <div class="bg-background rounded-lg border shadow-sm">
        {/* Header with Model Selection */}
        <div class="p-6 border-b bg-card/95 backdrop-blur-sm">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-6">
              <div class="flex items-center gap-3">
              <div>
                <h2 class="font-semibold text-lg">AI Assistant</h2>
                <p class="text-sm text-muted-foreground">Your intelligent workspace companion</p>
              </div>
              </div>
              
              <div class="flex items-center gap-1 p-1 bg-muted rounded-lg">
                <button
                  onClick={() => setActiveView('chat')}
                  class={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView() === 'chat' 
                      ? 'bg-background shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveView('ai-tools')}
                  class={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView() === 'ai-tools' 
                      ? 'bg-background shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  AI Tools
                </button>
              </div>
            </div>
            
            {/* Settings Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings())}
              class="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg text-sm transition-colors"
            >
              <Settings class="h-4 w-4" />
              Settings
            </Button>
            
            {/* Enhanced AI Model Picker */}
            <div class="relative">
              <button
                onClick={() => setShowModelPicker(!showModelPicker())}
                class="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm transition-colors"
              >
                <span>{getAIModels().find(m => m.id === selectedModel())?.name || 'Select Model'}</span>
                <ChevronDown class={`h-4 w-4 transition-transform ${showModelPicker() ? 'rotate-180' : ''}`} />
              </button>
              
              <Show when={showModelPicker()}>
                <div class="absolute right-0 mt-2 w-80 bg-background border rounded-lg shadow-lg z-50 p-2 max-h-96 overflow-y-auto">
                  <div class="p-2 border-b mb-2">
                    <h4 class="text-sm font-semibold text-foreground">Select AI Model</h4>
                    <p class="text-xs text-muted-foreground">Choose the best model for your needs</p>
                  </div>
                  <For each={getAIModels()}>
                    {model => (
                      <button
                        onClick={() => {
                          setSelectedModel(model.id)
                          setShowModelPicker(false)
                        }}
                        class={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedModel() === model.id 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div class="flex items-center justify-between">
                          <div class="flex-1">
                            <div class="font-medium text-sm">{model.name}</div>
                            <div class="text-xs text-muted-foreground mt-1">{model.description}</div>
                            <div class="flex items-center gap-2 mt-2">
                              <span class="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                                {model.provider}
                              </span>
                              <span class="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                                {model.category}
                              </span>
                            </div>
                          </div>
                          {selectedModel() === model.id && (
                            <div class="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </div>

          <Show when={showSettings()}>
            <div class="p-6 border-b bg-muted/30">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-medium text-foreground">
                  AI Settings
                </h3>
                <div class="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSettingsExpanded(!settingsExpanded())}
                    class="h-6 w-6 p-0"
                  >
                    {settingsExpanded() ? '−' : '+'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowSettings(false)}
                    class="h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </div>
              </div>
              
              {/* Context Settings */}
              <div class="mb-6">
                <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Context Sources</h4>
                <div class="grid grid-cols-2 gap-3">
                  <label class="flex items-center gap-3 text-sm cursor-pointer bg-background/50 hover:bg-background border border-border/50 rounded-lg p-3 transition-all hover:shadow-sm">
                    <input
                      type="checkbox"
                      checked={contextSettings().bookmarks}
                      onChange={(e) => setContextSettings(prev => ({ ...prev, bookmarks: (e.target as HTMLInputElement).checked }))}
                      class="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                    />
                    <div class="flex items-center gap-2 flex-1">
                      <span class="font-medium">Bookmarks</span>
                    </div>
                  </label>
                  <label class="flex items-center gap-3 text-sm cursor-pointer bg-background/50 hover:bg-background border border-border/50 rounded-lg p-3 transition-all hover:shadow-sm">
                    <input
                      type="checkbox"
                      checked={contextSettings().tasks}
                      onChange={(e) => setContextSettings(prev => ({ ...prev, tasks: (e.target as HTMLInputElement).checked }))}
                      class="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                    />
                    <div class="flex items-center gap-2 flex-1">
                      <span class="font-medium">Tasks</span>
                    </div>
                  </label>
                  <label class="flex items-center gap-3 text-sm cursor-pointer bg-background/50 hover:bg-background border border-border/50 rounded-lg p-3 transition-all hover:shadow-sm">
                    <input
                      type="checkbox"
                      checked={contextSettings().files}
                      onChange={(e) => setContextSettings(prev => ({ ...prev, files: (e.target as HTMLInputElement).checked }))}
                      class="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                    />
                    <div class="flex items-center gap-2 flex-1">
                      <span class="font-medium">Files</span>
                    </div>
                  </label>
                  <label class="flex items-center gap-3 text-sm cursor-pointer bg-background/50 hover:bg-background border border-border/50 rounded-lg p-3 transition-all hover:shadow-sm">
                    <input
                      type="checkbox"
                      checked={contextSettings().notes}
                      onChange={(e) => setContextSettings(prev => ({ ...prev, notes: (e.target as HTMLInputElement).checked }))}
                      class="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                    />
                    <div class="flex items-center gap-2 flex-1">
                      <span class="font-medium">Notes</span>
                    </div>
                  </label>
                </div>
                <div class="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p class="text-xs text-muted-foreground">
                    <strong>Tip:</strong> Enable context sources to give the AI access to your data for more personalized responses.
                  </p>
                </div>
              </div>
              
              {/* Expanded AI Settings */}
              <Show when={settingsExpanded()}>
                <div class="space-y-6">
                  {/* Model Selection */}
                  <div>
                    <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Available Models</h4>
                    <div class="space-y-2 max-h-48 overflow-y-auto">
                      <For each={getAIModels()}>
                        {(model) => (
                          <div
                            class={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedModel() === model.id
                                ? 'bg-primary/10 border-primary/30'
                                : 'bg-background/50 hover:bg-background border-border/50'
                            }`}
                            onClick={() => setSelectedModel(model.id)}
                          >
                            <div class="flex items-center justify-between">
                              <div class="flex-1">
                                <div class="font-medium text-sm">{model.name}</div>
                                <div class="text-xs text-muted-foreground mt-1">{model.description}</div>
                                <div class="flex items-center gap-2 mt-2">
                                  <span class="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                            {model.provider}
                          </span>
                          <span class="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                            {model.category}
                          </span>
                        </div>
                      </div>
                      {selectedModel() === model.id && (
                        <div class="ml-2">
                          <div class="w-2 h-2 bg-primary rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
                  
                  {/* AI Parameters */}
                  <div>
                    <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">AI Parameters</h4>
                    <div class="space-y-4">
                      <div>
                        <label class="block text-sm font-medium mb-2">Temperature: {aiSettings().temperature}</label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={aiSettings().temperature}
                          onInput={(e) => setAiSettings(prev => ({ ...prev, temperature: parseFloat((e.target as HTMLInputElement).value) }))}
                          class="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                        <div class="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Precise</span>
                          <span>Creative</span>
                        </div>
                      </div>
                      
                      <div>
                        <label class="block text-sm font-medium mb-2">Max Tokens: {aiSettings().maxTokens}</label>
                        <input
                          type="range"
                          min="256"
                          max="4096"
                          step="256"
                          value={aiSettings().maxTokens}
                          onInput={(e) => setAiSettings(prev => ({ ...prev, maxTokens: parseInt((e.target as HTMLInputElement).value) }))}
                          class="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                        <div class="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>256</span>
                          <span>4096</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* System Prompt */}
                  <div>
                    <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">System Prompt</h4>
                    <textarea
                      value={aiSettings().systemPrompt}
                      onInput={(e) => setAiSettings(prev => ({ ...prev, systemPrompt: (e.target as HTMLTextAreaElement).value }))}
                      class="w-full h-20 p-3 text-sm bg-background/50 border border-border/50 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter system prompt..."
                    />
                  </div>
                </div>
              </Show>
            </div>
          </Show>

            <div class="p-6">
              <Button 
                onClick={() => {
                  // Create new session
                  const newSession = {
                    id: Date.now().toString(),
                    title: 'New Chat',
                    message_count: 0,
                    created_at: new Date().toISOString(),
                    include_bookmarks: true,
                    include_tasks: true,
                    include_files: true,
                    include_notes: true
                  }
                  setCurrentSessionId(newSession.id)
                  setMessages([{
                    id: 1,
                    content: 'Hello! I\'m your AI assistant. How can I help you today?',
                    role: 'assistant',
                    created_at: new Date().toISOString()
                  }])
                }} 
                class="w-full mb-6 h-11"
              >
                New Chat
              </Button>

            <div class="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
              <For each={sessions()}>
                {session => (
                  <div
                    class={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                      currentSessionId() === session.id.toString()
                        ? 'bg-primary/10 border-primary/20 shadow-sm'
                        : 'hover:bg-muted border-transparent hover:shadow-sm'
                    }`}
                    onClick={() => {
                      setCurrentSessionId(session.id.toString())
                      // Load messages for this session (mock for now)
                      setMessages([
                        {
                          id: 1,
                          content: `This is the ${session.title} session. How can I help you?`,
                          role: 'assistant',
                          created_at: new Date().toISOString()
                        }
                      ])
                    }}
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex-1 min-w-0 pr-2">
                        <h4 class="font-medium truncate mb-1">{session.title}</h4>
                        <p class="text-sm text-muted-foreground">
                          {session.message_count} message{session.message_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation()
                      // Delete session logic here
                      console.log('Delete session:', session.id)
                    }}
                    class="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash class="h-4 w-4" />
                  </Button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div class="flex-1 flex flex-col min-w-0 ml-80">
          <div class="hidden md:flex items-center justify-between p-6 border-b bg-card/95 backdrop-blur-sm">
            <div class="flex items-center gap-6">
              <div class="flex items-center gap-3">
              <div>
                <h2 class="font-semibold text-lg">AI Assistant</h2>
                <p class="text-sm text-muted-foreground">Your intelligent workspace companion</p>
              </div>
              </div>
              
              <div class="flex items-center gap-1 p-1 bg-muted rounded-lg">
                <button
                  onClick={() => setActiveView('chat')}
                  class={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView() === 'chat' 
                      ? 'bg-background shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveView('ai-tools')}
                  class={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView() === 'ai-tools' 
                      ? 'bg-background shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  AI Tools
                </button>
              </div>
            </div>
            
            {/* AI Model Picker */}
            <div class="relative">
              <button
                onClick={() => setShowModelPicker(!showModelPicker())}
                class="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
              >
                <span>{getAIModels().find(m => m.id === selectedModel())?.name || 'Select Model'}</span>
                <ChevronDown class="h-4 w-4" />
              </button>
              
              <Show when={showModelPicker()}>
                <div class="absolute right-0 mt-2 w-72 bg-background border rounded-lg shadow-lg z-50 p-2">
                  <For each={getAIModels()}>
                    {model => (
                      <button
                        onClick={() => {
                          setSelectedModel(model.id)
                          setShowModelPicker(false)
                        }}
                        class={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedModel() === model.id 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div class="font-medium text-sm">{model.name}</div>
                        <div class="text-xs text-muted-foreground mt-1">{model.description}</div>
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>

          {/* Main Content Area */}
        <div class="flex flex-col">
          <Show when={activeView() === 'chat'}>
            <div class="flex-1 overflow-y-auto h-[calc(100vh-320px)]">
              <div class="space-y-6 max-w-5xl mx-auto p-6">
                <For each={messages()}>
                  {message => (
                    <div
                      class={`flex gap-4 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        class={`max-w-[80%] rounded-lg p-4 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div class="flex items-start gap-3">
                          <div class={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            message.role === 'user' ? 'bg-primary-foreground/20' : 'bg-primary/10'
                          }`}>
                            {message.role === 'user' ? (
                              <User class="w-4 h-4 text-xs" />
                            ) : (
                              <AIProviderIcon 
                                providerId={selectedModel()} 
                                size="1rem"
                                class="text-primary"
                              />
                            )}
                          </div>
                          <div class="flex-1">
                            <p class="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>

            <div class="border-t bg-card/95 backdrop-blur-sm">
              <div class="p-6">
                <div class="flex gap-4">
                  {/* AI Model Switcher */}
                  <div class="relative">
                    <button
                      onClick={() => setShowModelPicker(!showModelPicker())}
                      class="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors border border-border/50"
                    >
                      <AIProviderIcon 
                        providerId={selectedModel()} 
                        size="1rem"
                      />
                      <span class="text-sm font-medium">
                        {getAIModels().find(m => m.id === selectedModel())?.name || 'Select Model'}
                      </span>
                      <ChevronDown class={`h-4 w-4 transition-transform ${showModelPicker() ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <Show when={showModelPicker()}>
                      <div class="absolute bottom-full left-0 mb-2 w-80 bg-background border rounded-lg shadow-lg z-50 p-2 max-h-96 overflow-y-auto">
                        <div class="p-2 border-b mb-2">
                          <h4 class="text-sm font-semibold text-foreground">Select AI Model</h4>
                          <p class="text-xs text-muted-foreground">Choose the best model for your needs</p>
                        </div>
                        <For each={getAIModels()}>
                          {model => (
                            <button
                              onClick={() => {
                                setSelectedModel(model.id)
                                setShowModelPicker(false)
                              }}
                              class={`w-full text-left p-3 rounded-lg transition-colors ${
                                selectedModel() === model.id 
                                  ? 'bg-primary/10 border border-primary/20' 
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3 flex-1">
                                  <AIProviderIcon 
                                    providerId={model.id} 
                                    size="1rem"
                                  />
                                  <div class="flex-1">
                                    <div class="font-medium text-sm">{model.name}</div>
                                    <div class="text-xs text-muted-foreground mt-1">{model.description}</div>
                                    <div class="flex items-center gap-2 mt-2">
                                      <span class="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                                        {model.provider}
                                      </span>
                                      <span class={`text-xs px-2 py-1 rounded-full ${
                                        model.category === 'available' 
                                          ? 'bg-green-10 text-green-600' 
                                          : 'bg-muted text-muted-foreground'
                                      }`}>
                                        {model.category === 'available' ? 'Available' : 'Disabled'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {selectedModel() === model.id && (
                                  <div class="w-2 h-2 bg-primary rounded-full"></div>
                                )}
                              </div>
                            </button>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                  
                  <Input
                    value={inputMessage()}
                    onInput={(e) => setInputMessage((e.currentTarget as HTMLInputElement).value)}
                    placeholder="Type your message..."
                    class="flex-1"
                    onKeyDown={(e: KeyboardEvent) => {
                      if (e.key === 'Enter' && !e.shiftKey && inputMessage().trim()) {
                        handleSendMessage()
                      }
                    }}
                  />
                  <Button 
                    disabled={isLoading() || !inputMessage().trim()}
                    onClick={handleSendMessage}
                  >
                    <Send class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Show>

          <Show when={activeView() === 'ai-tools'}>
            <div class="flex-1 overflow-y-auto p-6 h-[calc(100vh-320px)]">
              <div class="max-w-5xl mx-auto">
                <div class="mb-8">
                  <h3 class="text-lg font-semibold mb-2">AI Tools</h3>
                  <p class="text-muted-foreground">Enhance your productivity with AI-powered tools</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <For each={aiTools}>
                    {tool => (
                      <Card
                        class={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                          aiTool() === tool.id ? 'ring-2 ring-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setAiTool(tool.id as any)}
                      >
                        <h4 class="font-semibold mb-2">{tool.label}</h4>
                        <p class="text-sm text-muted-foreground">{tool.description}</p>
                      </Card>
                    )}
                  </For>
                </div>

                <Show when={aiTool() === 'summarizer'}>
                  <Card class="p-6">
                    <h4 class="text-lg font-semibold mb-4">Content Summarizer</h4>
                    <p class="text-muted-foreground mb-4">
                      Get AI-powered summaries of your notes, documents, and bookmarks.
                    </p>
                    <div class="space-y-4">
                      <div class="space-y-2">
                        <label class="block text-sm font-medium">Content to summarize:</label>
                        <textarea
                          placeholder="Paste your content or describe what you want summarized..."
                          value={inputMessage()}
                          onInput={(e) => setInputMessage((e.currentTarget as HTMLTextAreaElement).value)}
                          class="w-full min-h-[100px] p-3 border border-input rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div class="flex gap-2">
                        <Button onClick={() => {
                          // Simulate summarization in demo mode
                          const isDemoMode = localStorage.getItem('demoMode') === 'true' || 
                                         document.title.includes('Demo Mode') ||
                                         window.location.search.includes('demo=true');
                          if (isDemoMode) {
                            alert('Summary generated! (Demo Mode)\n\nThis would use the selected AI model to summarize your content.');
                          }
                        }}>
                          Summarize
                        </Button>
                        <Button variant="outline" onClick={() => setInputMessage('')}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Show>

                <Show when={aiTool() === 'tasks'}>
                  <Card class="p-6">
                    <h4 class="text-lg font-semibold mb-4">Task Suggestions</h4>
                    <p class="text-muted-foreground mb-4">
                      Get AI-powered task suggestions based on your current projects and deadlines.
                    </p>
                    <div class="space-y-4">
                      <div class="p-4 bg-muted/30 rounded-lg">
                        <h5 class="font-medium mb-2">Suggested Tasks:</h5>
                        <ul class="space-y-2 text-sm">
                          <li class="flex items-center gap-2">
                            <CheckSquare class="h-4 w-4 text-primary" />
                            <span>Review and update project documentation</span>
                          </li>
                          <li class="flex items-center gap-2">
                            <CheckSquare class="h-4 w-4 text-primary" />
                            <span>Follow up with team members on pending items</span>
                          </li>
                          <li class="flex items-center gap-2">
                            <CheckSquare class="h-4 w-4 text-primary" />
                            <span>Prepare for upcoming meeting</span>
                          </li>
                          <li class="flex items-center gap-2">
                            <CheckSquare class="h-4 w-4 text-primary" />
                            <span>Review code quality and performance</span>
                          </li>
                          <li class="flex items-center gap-2">
                            <CheckSquare class="h-4 w-4 text-primary" />
                            <span>Update dependencies and security patches</span>
                          </li>
                        </ul>
                      </div>
                      <div class="flex gap-2">
                        <Button onClick={() => {
                          // Simulate getting more suggestions
                          const isDemoMode = localStorage.getItem('demoMode') === 'true' || 
                                         document.title.includes('Demo Mode') ||
                                         window.location.search.includes('demo=true');
                          if (isDemoMode) {
                            alert('More tasks generated! (Demo Mode)\n\nThis would use the selected AI model to analyze your current work and suggest relevant tasks.');
                          }
                        }}>
                          Get More Suggestions
                        </Button>
                        <Button variant="outline" onClick={() => {
                          // Add selected tasks to actual task list
                          alert('Tasks would be added to your task list. (Demo Mode)');
                        }}>
                          Add Selected Tasks
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Show>

                <Show when={aiTool() === 'content'}>
                  <Card class="p-6">
                    <h4 class="text-lg font-semibold mb-4">Content Generation</h4>
                    <p class="text-muted-foreground mb-4">
                      Generate content using AI assistance for your projects and documentation.
                    </p>
                    <div class="space-y-4">
                      <div class="space-y-2">
                        <label class="block text-sm font-medium">What to generate:</label>
                        <textarea
                          placeholder="Describe the content you want to generate..."
                          value={inputMessage()}
                          onInput={(e) => setInputMessage((e.currentTarget as HTMLTextAreaElement).value)}
                          class="w-full min-h-[100px] p-3 border border-input rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div class="space-y-2">
                        <label class="block text-sm font-medium">Content Type:</label>
                        <div class="grid grid-cols-2 gap-2">
                          <Button 
                            variant={inputMessage().toLowerCase().includes('blog') ? 'default' : 'outline'} 
                            onClick={() => setInputMessage('Generate a blog post about: ')}
                          >
                            Blog Post
                          </Button>
                          <Button 
                            variant={inputMessage().toLowerCase().includes('email') ? 'default' : 'outline'} 
                            onClick={() => setInputMessage('Generate an email about: ')}
                          >
                            Email
                          </Button>
                          <Button 
                            variant={inputMessage().toLowerCase().includes('documentation') ? 'default' : 'outline'} 
                            onClick={() => setInputMessage('Generate documentation for: ')}
                          >
                            Documentation
                          </Button>
                          <Button 
                            variant={inputMessage().toLowerCase().includes('social') ? 'default' : 'outline'} 
                            onClick={() => setInputMessage('Generate social media content about: ')}
                          >
                            Social Media
                          </Button>
                        </div>
                      </div>
                      <div class="flex gap-2">
                        <Button onClick={() => {
                          // Simulate content generation
                          const isDemoMode = localStorage.getItem('demoMode') === 'true' || 
                                         document.title.includes('Demo Mode') ||
                                         window.location.search.includes('demo=true');
                          if (isDemoMode) {
                            alert('Content generated! (Demo Mode)\n\nThis would use the selected AI model to generate your content.');
                          }
                        }}>
                          Generate Content
                        </Button>
                        <Button variant="outline" onClick={() => setInputMessage('')}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Show>
              </div>
            </div>
          </Show>
        </div>
        <div class="clear-both"></div>
      </div>
    </div>
  )
}

export default Chat
