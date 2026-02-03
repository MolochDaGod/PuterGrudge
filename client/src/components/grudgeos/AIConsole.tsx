import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Send, 
  Bot, 
  User, 
  Copy, 
  RefreshCw,
  Sparkles,
  Loader2,
  Code,
  Image,
  FileText
} from 'lucide-react';
import { useOperationsBus } from '@/stores/operationsBus';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  timestamp: Date;
}


const AI_MODELS = [
  { id: 'default', name: 'GPT-4o (Default)', provider: 'puter' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openrouter' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'openrouter' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'openrouter' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'openrouter' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'openrouter' },
  { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'openrouter' },
];

export function AIConsole() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to GrudgeOS AI Console! I'm your AI assistant with access to 500+ models through Puter.

**Quick Commands:**
- Ask me to write code in any language
- Request help with debugging
- Generate documentation
- Create project structures
- Deploy to Puter hosting

What would you like to build today?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('default');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addOperation, setProgress, completeOperation, failOperation, appendLog } = useOperationsBus();
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    const model = AI_MODELS.find(m => m.id === selectedModel);
    const opId = addOperation({
      name: 'AI Request',
      description: `Sending message to ${model?.name || 'AI'}`,
      category: 'ai',
    });
    
    try {
      setProgress(opId, 20);
      appendLog(opId, `Using model: ${model?.name || 'default'}`);
      
      let response: string;
      
      const puter = (window as any).puter;
      if (puter) {
        setProgress(opId, 50);
        appendLog(opId, 'Sending to Puter AI...');
        
        const options: any = {};
        if (selectedModel !== 'default' && model?.provider === 'openrouter') {
          options.model = `openrouter:${selectedModel}`;
        }
        
        const conversationHistory = messages
          .filter(m => m.role !== 'system')
          .slice(-10)
          .map(m => ({ role: m.role, content: m.content }));
        
        conversationHistory.push({ role: 'user', content: input.trim() });
        
        const result = await puter.ai.chat(input.trim(), options);
        response = typeof result === 'string' ? result : (result as any)?.message || 'No response';
      } else {
        setProgress(opId, 50);
        appendLog(opId, 'Puter not available - using mock response');
        
        await new Promise(r => setTimeout(r, 1000));
        response = `I understand you're asking about: "${input.substring(0, 50)}..."

To use the full AI capabilities, please ensure Puter.js is loaded and you're signed in. 

In the meantime, here's what I can tell you:
- GrudgeOS supports 500+ AI models via OpenRouter
- Code generation works best with specific examples
- I can help with any programming language

Would you like me to explain how to set up Puter AI access?`;
      }
      
      setProgress(opId, 90);
      appendLog(opId, 'Response received');
      
      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response,
        model: model?.name,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      completeOperation(opId, 'AI response received');
      
    } catch (err: any) {
      failOperation(opId, err.message || 'AI request failed');
      
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, selectedModel, messages, addOperation, setProgress, completeOperation, failOperation, appendLog]);
  
  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);
  
  const clearChat = useCallback(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Chat cleared. How can I help you?',
      timestamp: new Date(),
    }]);
  }, []);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-background" data-testid="ai-console">
      <div className="flex items-center justify-between h-10 px-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Assistant</span>
          <Badge variant="outline" className="text-xs" data-testid="badge-message-count">
            {messages.length - 1} messages
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedModel} onValueChange={setSelectedModel} data-testid="select-ai-model">
            <SelectTrigger className="h-7 w-40 text-xs" data-testid="trigger-select-model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent data-testid="select-content-models">
              {AI_MODELS.map(model => (
                <SelectItem key={model.id} value={model.id} className="text-xs" data-testid={`option-model-${model.id}`}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearChat}
            data-testid="button-clear-chat"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              data-testid={`message-${message.id}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {message.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </div>
              
              <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block max-w-[85%] rounded-lg p-3 ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
                
                <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
                  message.role === 'user' ? 'justify-end' : ''
                }`}>
                  <span>{message.timestamp.toLocaleTimeString()}</span>
                  {message.model && <Badge variant="outline" className="text-xs h-4 px-1">{message.model}</Badge>}
                  <button
                    className="hover:text-foreground"
                    onClick={() => copyMessage(message.content)}
                    data-testid={`button-copy-${message.id}`}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Thinking</span>
                  <span className="animate-pulse">...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t bg-muted/30">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything... (Shift+Enter for new line)"
              className="min-h-[60px] max-h-[200px] resize-none pr-12"
              disabled={isLoading}
              data-testid="input-message"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Generate code"
                data-testid="button-code-mode"
              >
                <Code className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="h-auto"
            data-testid="button-send"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>Powered by Puter AI</span>
          <span>·</span>
          <span>500+ models available</span>
        </div>
      </div>
    </div>
  );
}
