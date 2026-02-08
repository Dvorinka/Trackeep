import { createSignal, For, Show, onMount } from 'solid-js'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { 
  MessageCircle, 
  Brain,
  Cog,
  Send
} from 'lucide-solid'
import { AIProviderIcon } from '@/components/AIProviderIcon'

interface AIProvider {
  id: string
  name: string
  description: string
  icon: string
  models: {
    id: string
    name: string
    type: string
  }[];
}

export const AIChat = () => {
  const [activeView, setActiveView] = createSignal<'chat' | 'settings'>('chat')
  const [isSidebarOpen, setIsSidebarOpen] = createSignal(true)
  
  // Chat state
  const [messages, setMessages] = createSignal<any[]>([
    {
      id: 1,
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      role: 'assistant',
      created_at: new Date().toISOString()
    }
  ])
  const [inputMessage, setInputMessage] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(false)
  
    // AI Provider state
  const [selectedProvider, setSelectedProvider] = createSignal<string>('')
  const [selectedModel, setSelectedModel] = createSignal<string>('standard')
  const [enabledProviders, setEnabledProviders] = createSignal<string[]>([])
  const [providers, setProviders] = createSignal<AIProvider[]>([])

  // Per-user AI settings (mirrors /api/v1/auth/ai/settings)
  const [aiSettings, setAISettings] = createSignal({
    mistral: { enabled: false, api_key: '', model: '', model_thinking: '' },
    grok: { enabled: false, api_key: '', base_url: '', model: '', model_thinking: '' },
    deepseek: { enabled: false, api_key: '', base_url: '', model: '', model_thinking: '' },
    ollama: { enabled: false, base_url: '', model: '', model_thinking: '' },
    longcat: { enabled: false, api_key: '', base_url: '', openai_endpoint: '', anthropic_endpoint: '', model: '', model_thinking: '', model_thinking_upgraded: '', format: 'openai' }
  })
  const [aiSettingsLoading, setAiSettingsLoading] = createSignal(false)
  const [aiSettingsMessage, setAiSettingsMessage] = createSignal('')

  const handleSendMessage = async () => {
    const message = inputMessage().trim()
    if (!message || isLoading()) return

    // Add user message
    const userMessage = {
      id: Date.now(),
      content: message,
      role: 'user',
      created_at: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        content: `I received your message: "${message}". This is a demo response from the AI assistant. In production, I would provide a helpful response based on the selected AI provider and model.`,
        role: 'assistant',
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, 1000)
  }


  // Check mobile on mount
  onMount(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Fetch AI providers
    fetchAIProviders()
    // Load per-user AI provider settings
    loadAISettings()
    
    return () => window.removeEventListener('resize', checkMobile)
  })

  const fetchAIProviders = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080'
      const response = await fetch(`${apiUrl}/api/v1/ai/providers`)
      const data = await response.json()
      setProviders(data.providers || [])
      
      const providerIds = (data.providers || []).map((p: AIProvider) => p.id)
      setEnabledProviders(providerIds)
      
      if (data.providers && data.providers.length > 0) {
        setSelectedProvider(data.providers[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch AI providers:', error)
      // Set mock providers for demo mode
      const mockProviders: AIProvider[] = [
        {
          id: 'longcat',
          name: 'LongCat AI',
          description: 'Fast and efficient AI models',
          icon: '🐱',
          models: [
            { id: 'longcat-flash-chat', name: 'LongCat Flash Chat', type: 'chat' },
            { id: 'longcat-flash-thinking', name: 'LongCat Flash Thinking', type: 'thinking' }
          ]
        },
        {
          id: 'mistral',
          name: 'Mistral AI',
          description: 'Advanced language models',
          icon: '🌊',
          models: [
            { id: 'mistral-small-latest', name: 'Mistral Small', type: 'chat' },
            { id: 'mistral-large-latest', name: 'Mistral Large', type: 'chat' }
          ]
        }
      ]
      setProviders(mockProviders)
      setEnabledProviders(['longcat'])
      setSelectedProvider('longcat')
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
        setAISettings(data)
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error)
    }
  }

  const handleUpdateAISettings = async () => {
    setAiSettingsLoading(true)
    setAiSettingsMessage('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/auth/ai/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(aiSettings())
      })

      if (response.ok) {
        setAiSettingsMessage('AI settings updated successfully!')
        await loadAISettings()
      } else {
        const error = await response.json()
        setAiSettingsMessage(error.error || 'Failed to update AI settings')
      }
    } catch (error) {
      console.error('Failed to update AI settings:', error)
      setAiSettingsMessage('Failed to update AI settings')
    } finally {
      setAiSettingsLoading(false)
    }
  }

  const toggleProvider = (providerId: string) => {
    const enabled = enabledProviders()
    if (enabled.includes(providerId)) {
      if (selectedProvider() === providerId) {
        const remaining = enabled.filter(p => p !== providerId)
        setSelectedProvider(remaining.length > 0 ? remaining[0] : '')
      }
      setEnabledProviders(enabled.filter(p => p !== providerId))
    } else {
      setEnabledProviders([...enabled, providerId])
      if (enabled.length === 0) {
        setSelectedProvider(providerId)
      }
    }
  }

  
  return (
    <div class="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <header class="border-b bg-card/95 backdrop-blur-sm z-10">
        <div class="flex items-center justify-between px-4 py-3">
          <div class="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen())}
              class="md:hidden"
            >
              <MessageCircle class="h-4 w-4" />
            </Button>
            
            {/* AI Logo */}
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain class="w-5 h-5 text-white" />
              </div>
              <div class="flex flex-col">
                <h1 class="font-semibold text-lg">AI Assistant</h1>
                <p class="text-sm text-muted-foreground">Your intelligent workspace companion</p>
              </div>
            </div>
          </div>

          {/* Model Switcher */}
          <div class="flex items-center gap-3">
            <select
              value={selectedModel()}
              onChange={(e) => setSelectedModel(e.target.value)}
              class="px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="standard">Standard Model</option>
              <option value="advanced">Advanced Model</option>
              <option value="fast">Fast Model</option>
              <option value="creative">Creative Model</option>
            </select>
            
            {/* View Switcher */}
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
                onClick={() => setActiveView('settings')}
                class={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView() === 'settings' 
                    ? 'bg-background shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      <div class="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Show when={isSidebarOpen()}>
          <aside class="w-80 border-r bg-card flex flex-col hidden md:flex">
            {/* Sidebar Header */}
            <div class="p-4 border-b">
              <div class="flex items-center justify-between">
                <h2 class="font-semibold">Chat Sessions</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView('settings')}
                >
                  <Cog class="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Sessions List */}
            <div class="flex-1 overflow-y-auto p-4">
              <div class="space-y-3">
                {/* New Chat Button */}
                <Button
                  onClick={() => {
                    setMessages([{
                      id: 1,
                      content: 'Hello! I\'m your AI assistant. How can I help you today?',
                      role: 'assistant',
                      created_at: new Date().toISOString()
                    }])
                    setInputMessage('')
                  }}
                  class="w-full justify-start"
                  variant="outline"
                >
                  <MessageCircle class="h-4 w-4 mr-2" />
                  New Chat
                </Button>
                
                {/* Chat Sessions */}
                <div class="space-y-2">
                  <div class="text-sm text-muted-foreground font-medium px-3 py-2">
                    Recent Chats
                  </div>
                  {[
                    { id: '1', title: 'Getting Started', message_count: 2, last_message: '2 hours ago' },
                    { id: '2', title: 'Project Planning', message_count: 5, last_message: '1 day ago' },
                    { id: '3', title: 'Technical Discussion', message_count: 3, last_message: '2 days ago' }
                  ].map(session => (
                    <button
                      class="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => {
                        setMessages([{
                          id: 1,
                          content: `This is the ${session.title} session. How can I help you?`,
                          role: 'assistant',
                          created_at: new Date().toISOString()
                        }])
                      }}
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex-1 min-w-0">
                          <h4 class="font-medium truncate">{session.title}</h4>
                          <p class="text-sm text-muted-foreground">
                            {session.message_count} messages • {session.last_message}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </Show>

        {/* Main Content */}
        <main class="flex-1 flex flex-col overflow-hidden">
          {/* Chat View */}
          <Show when={activeView() === 'chat'}>
            <div class="flex-1 flex flex-col">
              {/* Messages Area */}
              <div class="flex-1 overflow-y-auto p-6">
                <div class="max-w-4xl mx-auto space-y-6">
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
                                <span class="text-xs">👤</span>
                              ) : (
                                <span class="text-xs">🤖</span>
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
                  
                  {isLoading() && (
                    <div class="flex justify-start">
                      <div class="bg-muted rounded-lg p-4 max-w-[80%]">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span class="text-xs">🤖</span>
                          </div>
                          <div class="flex gap-1">
                            <div class="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                            <div class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                            <div class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Input Area */}
              <div class="border-t bg-card/95 backdrop-blur-sm">
                <div class="p-6">
                  <div class="max-w-4xl mx-auto">
                    <div class="flex gap-4">
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
              </div>
            </div>
          </Show>

          {/* Settings View */}
        <Show when={activeView() === 'settings'}>
          <div class="flex-1 overflow-y-auto p-2">
            <div class="max-w-4xl mx-auto">
              <div class="mb-8">
                <h2 class="text-2xl font-bold mb-2">AI Settings</h2>
                <p class="text-muted-foreground">Configure your AI providers and preferences</p>
              </div>

              <Card class="p-6">
                <h3 class="text-lg font-semibold mb-4">AI Provider Settings</h3>
                <div class="space-y-6">
                  {/* Provider Toggles */}
                  <div>
                    <h4 class="text-md font-medium mb-3">Available Providers</h4>
                    <div class="space-y-3">
                      <For each={providers()}>
                        {(provider) => {
                          const isEnabled = enabledProviders().includes(provider.id)
                          return (
                            <div
                              class={`p-4 border rounded-lg transition-all ${
                                isEnabled
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border'
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
                                    <h5 class="font-medium">{provider.name}</h5>
                                    <p class="text-sm text-muted-foreground">{provider.description}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggleProvider(provider.id)}
                                  class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    isEnabled
                                      ? 'bg-primary'
                                      : 'bg-muted'
                                  }`}
                                >
                                  <span
                                    class={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                                
                              {/* Model selection */}
                                {isEnabled && (
                                  <div class="mt-4 pt-4 border-t border-border">
                                    <div class="flex items-center gap-2 mb-2">
                                      <label class="text-sm font-medium">
                                        Model:
                                      </label>
                                      <select
                                        value={selectedProvider() === provider.id ? selectedModel() : 'standard'}
                                        onChange={(e) => {
                                          setSelectedProvider(provider.id)
                                          setSelectedModel(e.target.value)
                                        }}
                                        class="text-sm px-2 py-1 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                      >
                                        <For each={provider.models}>
                                          {(model) => (
                                            <option value={model.id}>
                                              {model.type} - {model.name}
                                            </option>
                                          )}
                                        </For>
                                      </select>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          }}
                        </For>
                      </div>
                    </div>

                    {/* Response Settings */}
                    <div>
                      <h4 class="text-md font-medium mb-3">Response Settings</h4>
                      <div class="space-y-4">
                        <div class="p-4 border border-border rounded-lg">
                          <label class="block text-sm font-medium mb-2">Response Length</label>
                          <select class="w-full text-sm px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="concise">Concise</option>
                            <option value="balanced" selected>Balanced</option>
                            <option value="detailed">Detailed</option>
                          </select>
                        </div>

                        <div class="p-4 border border-border rounded-lg">
                          <label class="block text-sm font-medium mb-2">Response Style</label>
                          <select class="w-full text-sm px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="professional" selected>Professional</option>
                            <option value="casual">Casual</option>
                            <option value="technical">Technical</option>
                            <option value="creative">Creative</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Account-level provider settings (example: LongCat) */}
                    <div class="pt-4 mt-2 border-t border-border space-y-4">
                      <div class="flex items-center justify-between">
                        <h4 class="text-md font-medium">Account Provider Settings</h4>
                        <span class="text-xs text-muted-foreground">{aiSettingsMessage()}</span>
                      </div>

                      <div class="border rounded-lg p-4 space-y-3">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            <span class="w-2 h-2 bg-purple-500 rounded-full" />
                            <span class="text-sm font-medium">LongCat AI</span>
                          </div>
                          <label class="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={aiSettings().longcat.enabled}
                              onChange={(e) => {
                                const settings = aiSettings()
                                setAISettings({
                                  ...settings,
                                  longcat: { ...settings.longcat, enabled: e.currentTarget.checked }
                                })
                              }}
                              class="rounded border-input"
                            />
                            <span>Enabled</span>
                          </label>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label class="block text-xs font-medium text-muted-foreground mb-1">API Key</label>
                            <input
                              type="password"
                              value={aiSettings().longcat.api_key}
                              onInput={(e) => {
                                const settings = aiSettings()
                                setAISettings({
                                  ...settings,
                                  longcat: { ...settings.longcat, api_key: e.currentTarget.value }
                                })
                              }}
                              placeholder="LongCat API key"
                              class="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                          <div>
                            <label class="block text-xs font-medium text-muted-foreground mb-1">Base URL</label>
                            <input
                              type="text"
                              value={aiSettings().longcat.base_url}
                              onInput={(e) => {
                                const settings = aiSettings()
                                setAISettings({
                                  ...settings,
                                  longcat: { ...settings.longcat, base_url: e.currentTarget.value }
                                })
                              }}
                              class="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label class="block text-xs font-medium text-muted-foreground mb-1">Chat Model</label>
                            <input
                              type="text"
                              value={aiSettings().longcat.model}
                              onInput={(e) => {
                                const settings = aiSettings()
                                setAISettings({
                                  ...settings,
                                  longcat: { ...settings.longcat, model: e.currentTarget.value }
                                })
                              }}
                              class="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                          <div>
                            <label class="block text-xs font-medium text-muted-foreground mb-1">Thinking Model</label>
                            <input
                              type="text"
                              value={aiSettings().longcat.model_thinking}
                              onInput={(e) => {
                                const settings = aiSettings()
                                setAISettings({
                                  ...settings,
                                  longcat: { ...settings.longcat, model_thinking: e.currentTarget.value }
                                })
                              }}
                              class="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                          <div>
                            <label class="block text-xs font-medium text-muted-foreground mb-1">Upgraded Thinking</label>
                            <input
                              type="text"
                              value={aiSettings().longcat.model_thinking_upgraded}
                              onInput={(e) => {
                                const settings = aiSettings()
                                setAISettings({
                                  ...settings,
                                  longcat: { ...settings.longcat, model_thinking_upgraded: e.currentTarget.value }
                                })
                              }}
                              class="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                        </div>

                        <div>
                          <label class="block text-xs font-medium text-muted-foreground mb-1">Format</label>
                          <select
                            value={aiSettings().longcat.format}
                            onChange={(e) => {
                              const settings = aiSettings()
                              setAISettings({
                                ...settings,
                                longcat: { ...settings.longcat, format: e.currentTarget.value as 'openai' | 'anthropic' }
                              })
                            }}
                            class="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="openai">OpenAI Compatible</option>
                            <option value="anthropic">Anthropic Compatible</option>
                          </select>
                        </div>
                      </div>

                      <div class="flex items-center gap-3 pt-2">
                        <Button
                          onClick={handleUpdateAISettings}
                          disabled={aiSettingsLoading()}
                        >
                          {aiSettingsLoading() ? 'Saving...' : 'Save AI Settings'}
                        </Button>
                        <a
                          href="/app/settings"
                          class="ml-auto text-xs text-primary hover:underline"
                        >
                          Open full AI settings
                        </a>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Show>
        </main>
      </div>
    </div>
  )
}

export default AIChat
