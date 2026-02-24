import { createSignal, For, Show, onMount, createEffect } from 'solid-js'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { 
  MessageCircle, 
  Brain,
  Cog,
  Send,
  ChevronDown,
  User,
  Bot
} from 'lucide-solid'
import { AIProviderIcon } from '@/components/AIProviderIcon'

interface AIModel {
  id: string
  name: string
  description: string
  provider: string
  category: string
  iconId?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export const AIChat = () => {
  const [activeView, setActiveView] = createSignal<'chat' | 'settings'>('chat')
  const [isSidebarOpen, setIsSidebarOpen] = createSignal(true)
  
  // Chat state
  const [messages, setMessages] = createSignal<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(false)
  
  // AI Model state
  const [selectedModel, setSelectedModel] = createSignal<string>('longcat-flash-chat')
  const [showModelPicker, setShowModelPicker] = createSignal(false)
  const [aiModels, setAIModels] = createSignal<AIModel[]>([])

  // Initialize AI models
  onMount(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Initialize AI models
    initializeAIModels()
    
    return () => window.removeEventListener('resize', checkMobile)
  })

  const initializeAIModels = () => {
    const models: AIModel[] = [
      { id: 'longcat-flash-chat', name: 'LongCat Flash Chat', description: 'Fast and efficient chat model', provider: 'longcat', category: 'fast', iconId: 'longcat' },
      { id: 'longcat-flash-thinking', name: 'LongCat Flash Thinking', description: 'Advanced reasoning model', provider: 'longcat', category: 'thinking', iconId: 'longcat' },
      { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Lightweight and fast', provider: 'mistral', category: 'standard', iconId: 'mistral' },
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Most capable model', provider: 'mistral', category: 'advanced', iconId: 'mistral' },
      { id: 'grok-standard', name: 'Grok Standard', description: 'Grok from X', provider: 'grok', category: 'standard', iconId: 'grok' },
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'DeepSeek chat model', provider: 'deepseek', category: 'standard', iconId: 'deepseek' },
      { id: 'ollama-local', name: 'Ollama Local', description: 'Local Ollama model', provider: 'ollama', category: 'local', iconId: 'ollama' },
      { id: 'openrouter-auto', name: 'OpenRouter Auto', description: 'Router over many models', provider: 'openrouter', category: 'standard', iconId: 'openrouter' },
    ]
    setAIModels(models)
  }

  const handleSendMessage = async () => {
    const message = inputMessage().trim()
    if (!message || isLoading()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      role: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // Call AI API
      const response = await callAIAPI(message, selectedModel())
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('AI API call failed:', error)
      
      // Fallback response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again later.',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const callAIAPI = async (message: string, modelId: string): Promise<string> => {
    const token = localStorage.getItem('token')
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080'
    
    const response = await fetch(`${apiUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        model: modelId,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`)
    }

    const data = await response.json()
    return data.response || data.content || 'I understand your message. Let me help you with that.'
  }


  // Close model picker when clicking outside
  createEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#model-picker-container')) {
        setShowModelPicker(false)
      }
    }

    if (showModelPicker()) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  })

  
  const startNewChat = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      timestamp: new Date()
    }])
    setInputMessage('')
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
              <div class="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                <Brain class="w-5 h-5 text-primary" />
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
                  onClick={startNewChat}
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
                          id: '1',
                          content: `This is the ${session.title} session. How can I help you?`,
                          role: 'assistant',
                          timestamp: new Date()
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
                                <User class="text-xs" />
                              ) : (
                                <Bot class="text-xs" />
                              )}
                            </div>
                            <div class="flex-1">
                              <p class="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                              <p class="text-xs opacity-70 mt-2">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
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
                            <Bot class="text-xs" />
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
                      {/* AI Model Switcher */}
                      <div id="model-picker-container" class="relative">
                        <button
                          onClick={() => setShowModelPicker(!showModelPicker())}
                          class="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors border border-border/50"
                        >
                          <AIProviderIcon 
                            providerId={aiModels().find(m => m.id === selectedModel())?.iconId || 'longcat'} 
                            size="1rem"
                          />
                          <span class="text-sm font-medium">
                            {aiModels().find(m => m.id === selectedModel())?.name?.split(' ')[0] || 'AI'}
                          </span>
                          <ChevronDown class={`h-4 w-4 transition-transform ${showModelPicker() ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {/* Model Picker Dropdown */}
                        <Show when={showModelPicker()}>
                          <div class="absolute bottom-full left-0 mb-2 w-80 bg-background border rounded-lg shadow-lg z-50 p-2 max-h-96 overflow-y-auto">
                            <div class="p-2 border-b mb-2">
                              <h4 class="text-sm font-semibold text-foreground">Select AI Model</h4>
                              <p class="text-xs text-muted-foreground">Choose the best model for your needs</p>
                            </div>
                            <For each={aiModels()}>
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
                                        providerId={model.iconId!} 
                                        size="1rem"
                                        class="rounded-full flex-shrink-0"
                                      />
                                      <div class="flex-1 min-w-0">
                                        <div class="font-medium text-sm truncate">{model.name}</div>
                                        <div class="text-xs text-muted-foreground mt-1 truncate">{model.description}</div>
                                        <div class="flex items-center gap-2 mt-2">
                                          <span class="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                                            {model.provider}
                                          </span>
                                          <span class={`text-xs px-2 py-1 rounded-full ${
                                            model.category === 'thinking' 
                                              ? 'bg-purple-100 text-purple-800' 
                                              : model.category === 'fast'
                                              ? 'bg-green-100 text-green-800'
                                              : model.category === 'advanced'
                                              ? 'bg-blue-100 text-blue-800'
                                              : 'bg-muted text-muted-foreground'
                                          }`}>
                                            {model.category}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    {selectedModel() === model.id && (
                                      <div class="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
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
              </div>
            </div>
          </Show>

          {/* Settings View */}
        <Show when={activeView() === 'settings'}>
          <div class="flex-1 overflow-y-auto p-6">
            <div class="max-w-4xl mx-auto">
              <div class="mb-8">
                <h2 class="text-2xl font-bold mb-2">AI Settings</h2>
                <p class="text-muted-foreground">Configure your AI models and preferences</p>
              </div>

              <Card class="p-6">
                <h3 class="text-lg font-semibold mb-4">Available AI Models</h3>
                <div class="space-y-4">
                  <For each={aiModels()}>
                    {(model) => (
                      <div
                        class={`p-4 border rounded-lg transition-all ${
                          selectedModel() === model.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
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
                              <h5 class="font-medium">{model.name}</h5>
                              <p class="text-sm text-muted-foreground">{model.description}</p>
                              <div class="flex items-center gap-2 mt-2">
                                <span class="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                                  {model.provider}
                                </span>
                                <span class={`text-xs px-2 py-1 rounded-full ${
                                  model.category === 'thinking' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : model.category === 'fast'
                                    ? 'bg-green-100 text-green-800'
                                    : model.category === 'advanced'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-muted text-muted-foreground'
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
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            {selectedModel() === model.id ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Card>

              <Card class="p-6 mt-6">
                <h3 class="text-lg font-semibold mb-4">Current Selection</h3>
                <div class="p-4 bg-muted/50 rounded-lg">
                  <div class="flex items-center gap-3">
                    <AIProviderIcon 
                      providerId={aiModels().find(m => m.id === selectedModel())?.iconId || 'longcat'} 
                      size="1.5rem"
                      class="text-primary"
                    />
                    <div>
                      <p class="font-medium">
                        {aiModels().find(m => m.id === selectedModel())?.name}
                      </p>
                      <p class="text-sm text-muted-foreground">
                        {aiModels().find(m => m.id === selectedModel())?.description}
                      </p>
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
