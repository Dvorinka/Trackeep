import { createSignal, Show } from 'solid-js'
import { IconX, IconSend, IconUser, IconChevronDown } from '@tabler/icons-solidjs'
import longcatIcon from '@/assets/longcat-color.svg'
import { ModalPortal } from '@/components/ui/ModalPortal'

interface FloatingAIProps {
  onToggleChat: () => void
  isChatOpen: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function FloatingAI(props: FloatingAIProps) {
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
  const [showModelSelector, setShowModelSelector] = createSignal(false)

  const aiModels = [
    { id: 'longcat-flash-chat', name: 'LongCat Flash', description: 'Fast and efficient' },
    { id: 'gpt-4', name: 'GPT-4', description: 'Most capable' },
    { id: 'claude-3', name: 'Claude 3', description: 'Balanced performance' }
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
      {/* Floating AI Button */}
      <button
        onClick={props.onToggleChat}
        class="fixed bottom-6 right-8 z-40 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 hover:scale-110 w-14 h-14"
        title="AI Assistant"
      >
        <img src={longcatIcon} alt="AI Assistant" class="size-6" />
      </button>

      {/* AI Chat Modal */}
      <Show when={props.isChatOpen}>
        <ModalPortal>
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-card border border-border rounded-lg shadow-xl max-w-md w-full max-h-[600px] flex flex-col" style="width: 420px;">
            {/* Header */}
            <div class="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
              <div class="flex items-center gap-3">
                <div class="flex items-center justify-center p-3 rounded-lg bg-primary/20">
                  <img src={longcatIcon} alt="AI Assistant" class="size-5" />
                </div>
                <div>
                  <h3 class="font-semibold text-foreground">AI Assistant</h3>
                  <div class="flex items-center gap-2">
                    <p class="text-xs text-muted-foreground">Always here to help</p>
                    <div class="relative">
                      <button
                        onClick={() => setShowModelSelector(!showModelSelector())}
                        class="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        {aiModels.find(m => m.id === selectedModel())?.name || 'LongCat Flash'}
                        <IconChevronDown class="size-3" />
                      </button>
                      
                      {/* Model Selector Dropdown */}
                      <Show when={showModelSelector()}>
                        <div class="absolute bottom-full left-0 mb-2 w-48 bg-popover border border-border rounded-md shadow-lg z-10">
                          {aiModels.map((model) => (
                            <button
                              onClick={() => {
                                setSelectedModel(model.id)
                                setShowModelSelector(false)
                              }}
                              class="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md"
                            >
                              <div class="font-medium">{model.name}</div>
                              <div class="text-xs text-muted-foreground">{model.description}</div>
                            </button>
                          ))}
                        </div>
                      </Show>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={props.onToggleChat}
                class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-shadow focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-inherit hover:bg-accent/50 hover:text-accent-foreground h-8 w-8"
              >
                <IconX class="size-4 text-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/20" style="max-height: 400px;">
              {messages().map((message) => (
                <div class={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-200`}>
                  {message.role === 'assistant' && (
                    <div class="flex items-center justify-center p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <img src={longcatIcon} alt="AI Assistant" class="size-4" />
                    </div>
                  )}
                  <div class={`max-w-[300px] rounded-lg p-3 shadow-sm ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground ml-auto' 
                      : 'bg-muted border border-border'
                  }`}>
                    <p class="text-sm leading-relaxed">{message.content}</p>
                    <p class="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div class="flex items-center justify-center p-2 rounded-lg bg-primary flex-shrink-0">
                      <IconUser class="size-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input */}
            <div class="p-4 border-t border-border bg-muted/30">
              <div class="flex gap-2">
                <input
                  type="text"
                  value={inputValue()}
                  onInput={(e) => setInputValue(e.currentTarget.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  class="flex-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue().trim()}
                  class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:shadow-md h-10 px-4"
                >
                  <IconSend class="size-4" />
                </button>
              </div>
            </div>
            </div>
          </div>
        </ModalPortal>
      </Show>
    </>
  )
}
