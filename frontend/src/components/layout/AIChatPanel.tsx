import { createSignal, For, Show } from 'solid-js'
import { IconSend, IconX, IconBrain, IconUser, IconChevronDown } from '@tabler/icons-solidjs'
import { AIProviderIcon } from '../AIProviderIcon'

interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIModel {
  id: string
  name: string
  description: string
  provider: string
  category: string
  iconId?: string
}

export function AIChatPanel(props: AIChatPanelProps) {
  const [messages, setMessages] = createSignal<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = createSignal('')
  const [selectedModel, setSelectedModel] = createSignal('longcat-flash-chat')
  const [showModelPicker, setShowModelPicker] = createSignal(false)
  
  const aiModels: AIModel[] = [
    { id: 'longcat-flash-chat', name: 'LongCat Flash Chat', description: 'Fast and efficient', provider: 'longcat', category: 'fast', iconId: 'longcat' },
    { id: 'mistral-standard', name: 'Mistral Standard', description: 'Mistral default model', provider: 'mistral', category: 'standard', iconId: 'mistral' },
    { id: 'grok-standard', name: 'Grok Standard', description: 'Grok from X', provider: 'grok', category: 'standard', iconId: 'grok' },
    { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'DeepSeek chat model', provider: 'deepseek', category: 'standard', iconId: 'deepseek' },
    { id: 'ollama-local', name: 'Ollama Local', description: 'Local Ollama model', provider: 'ollama', category: 'local', iconId: 'ollama' },
    { id: 'openrouter-auto', name: 'OpenRouter Auto', description: 'Router over many models', provider: 'openrouter', category: 'standard', iconId: 'openrouter' },
  ]

  const handleSendMessage = () => {
    const value = inputValue().trim()
    if (!value) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: value,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I understand your question. Let me help you with that...',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
    }, 1000)
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Chat Panel */}
      <div class={`fixed right-0 top-0 h-full bg-card border-l border-border shadow-xl transition-transform duration-300 z-50 ${
        props.isOpen ? 'translate-x-0' : 'translate-x-full'
      }`} style="width: min(420px, 100vw); max-width: 100vw;">
        {/* Header */}
        <div class="flex items-center justify-between p-4 border-b border-border">
          <div class="flex items-center gap-2">
            <div class="flex items-center justify-center p-2 rounded-lg bg-primary/10">
              <IconBrain class="size-5 text-primary" />
            </div>
            <div>
              <h3 class="font-semibold">AI Assistant</h3>
              <p class="text-xs text-muted-foreground">Always here to help</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            {/* Close Button */}
            <button
              onClick={props.onClose}
              class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
            >
              <IconX class="size-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div class="flex-1 overflow-y-auto p-4 space-y-4" style="height: calc(100vh - 200px); max-height: calc(100vh - 200px);">
          <For each={messages()}>
            {(message) => (
              <div class={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div class="flex items-center justify-center p-2 rounded-lg bg-muted flex-shrink-0">
                    <IconBrain class="size-4 text-primary" />
                  </div>
                )}
                <div class={`max-w-[280px] rounded-2xl p-3 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-sm' 
                    : 'bg-muted rounded-bl-sm'
                }`}>
                  <p class="text-sm leading-relaxed">{message.content}</p>
                  <p class="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div class="flex items-center justify-center p-2 rounded-lg bg-primary flex-shrink-0">
                    <IconUser class="size-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            )}
          </For>
        </div>

        {/* Input */}
        <div class="p-4 border-t border-border bg-card">
          <div class="flex gap-2">
            <input
              type="text"
              value={inputValue()}
              onInput={(e) => setInputValue(e.currentTarget.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              class="flex-1 h-10 w-full rounded-full border border-input bg-transparent px-4 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue().trim()}
              class="inline-flex items-center justify-center rounded-full text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 w-10"
            >
              <IconSend class="size-4 text-primary-foreground" />
            </button>
          </div>
          
          {/* Model Picker at Bottom */}
          <div class="mt-3 pt-3 border-t border-border">
            <div class="flex items-center justify-between">
              <div class="relative">
                <button
                  onClick={() => setShowModelPicker(!showModelPicker())}
                  class="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-xs transition-colors"
                >
                  <Show when={aiModels.find(m => m.id === selectedModel())?.iconId}>
                    <AIProviderIcon 
                      providerId={aiModels.find(m => m.id === selectedModel())?.iconId || 'longcat'} 
                      size="1rem"
                      class="rounded-full"
                    />
                  </Show>
                  <Show when={!aiModels.find(m => m.id === selectedModel())?.iconId}>
                    <div class="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  </Show>
                  <span class="text-muted-foreground">
                    {aiModels.find(m => m.id === selectedModel())?.name?.split(' ')[0] || 'AI'}
                  </span>
                  <IconChevronDown class={`size-3 transition-transform ${showModelPicker() ? 'rotate-180' : ''}`} />
                </button>
                
                <Show when={showModelPicker()}>
                  <div class="absolute bottom-full left-0 mb-2 w-64 bg-background border rounded-lg shadow-lg z-50 p-1 max-h-48 overflow-y-auto">
                    <For each={aiModels}>
                      {model => (
                        <button
                          onClick={() => {
                            setSelectedModel(model.id)
                            setShowModelPicker(false)
                          }}
                          class={`w-full text-left p-2 rounded text-xs transition-colors ${
                            selectedModel() === model.id 
                              ? 'bg-primary/10 border border-primary/20' 
                              : 'hover:bg-muted'
                          }`}
                        >
                          <div class="flex items-center gap-2">
                            <Show when={model.iconId}>
                              <AIProviderIcon 
                                providerId={model.iconId!} 
                                size="0.75rem"
                                class="rounded-full flex-shrink-0"
                              />
                            </Show>
                            <Show when={!model.iconId}>
                              <div class={`w-3 h-3 rounded-full flex-shrink-0 ${
                                model.provider === 'LongCat' ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                                model.provider === 'OpenAI' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                'bg-gradient-to-r from-purple-500 to-pink-500'
                              }`}></div>
                            </Show>
                            <div class="flex-1 min-w-0">
                              <div class="font-medium truncate">{model.name}</div>
                              <div class="text-muted-foreground text-xs truncate">{model.description}</div>
                            </div>
                          </div>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
              
              <div class="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{aiModels.find(m => m.id === selectedModel())?.provider || 'LongCat'}</span>
                <a href="/app/settings" class="text-primary hover:underline">
                  AI settings
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
