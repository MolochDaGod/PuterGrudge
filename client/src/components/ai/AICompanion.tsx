import React, { useState, useRef, useEffect } from 'react';
import { useAI } from '@/contexts/AIContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  Mic,
  MicOff,
  X,
  Minimize2,
  Maximize2,
  Settings,
  Sparkles,
  Send,
  Trash2,
  Download,
  Upload,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AICompanionProps {
  defaultMinimized?: boolean;
}

export function AICompanion({ defaultMinimized = false }: AICompanionProps) {
  const ai = useAI();
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [input, setInput] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 60 });
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'positive' | 'negative'>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ai.messages]);

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 400, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 600, e.clientY - dragOffset.y)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleSend = async () => {
    if (!input.trim() || ai.isThinking) return;

    await ai.sendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = () => {
    setIsVoiceActive(!isVoiceActive);
    // Voice integration will be added later
  };

  // Send feedback for AI learning
  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    // Find the message and its corresponding user input
    const messageIndex = ai.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const message = ai.messages[messageIndex];
    const userMessage = ai.messages[messageIndex - 1]; // Previous message should be user input

    setFeedbackGiven(prev => ({ ...prev, [messageId]: feedback }));

    // Send feedback to evolution API
    try {
      await fetch('/api/ai/evolution/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: userMessage?.content || '',
          output: message.content,
          feedback,
          context: { route: window.location.pathname },
          modelUsed: message.model || ai.currentModel,
          latency: message.duration || 0,
          tokensUsed: Math.ceil((message.content.length + (userMessage?.content?.length || 0)) / 4),
        }),
      });
    } catch (error) {
      console.error('Failed to send feedback:', error);
    }
  };

  const handleExport = () => {
    const data = ai.exportConversation();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-conversation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const data = JSON.parse(text);
      ai.importConversation(data);
    };
    input.click();
  };

  // Minimized orb view
  if (isMinimized) {
    return (
      <div
        className= "fixed z-50 cursor-move"
    style = {{ left: position.x, top: position.y }
  }
  onMouseDown = { handleMouseDown }
  onClick = {() => setIsMinimized(false)
}
      >
  <div className="relative group" >
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 
                         flex items - center justify - center shadow - lg hover: shadow - 2xl transition - all
hover: scale - 110 cursor - pointer animate - pulse">
  < Sparkles className = "w-8 h-8 text-white" />
    </div>
{
  ai.isThinking && (
    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
          )
}
</div>
  </div>
    );
  }

// Full panel view
return (
  <div
      ref= { panelRef }
className = {
  cn(
        "fixed z-50 w-[400px] bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/30",
        "flex flex-col overflow-hidden",
    isDragging && "cursor-move"
      )}
style = {{
  left: position.x,
    top: position.y,
      height: '600px',
        maxHeight: 'calc(100vh - 100px)'
}}
    >
  {/* Header */ }
  < div
className = "flex items-center justify-between p-4 border-b border-purple-500/20 cursor-move"
onMouseDown = { handleMouseDown }
  >
  <div className="flex items-center gap-2" >
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center" >
      <Sparkles className="w-4 h-4 text-white" />
        </div>
        < div >
        <h3 className="text-sm font-semibold text-white" > AI Companion </h3>
          < p className = "text-xs text-gray-400" >
            { ai.available ? ai.currentModel : 'Offline' }
            </p>
            </div>
            </div>

            < div className = "flex items-center gap-1 no-drag" >
              <Button
            variant="ghost"
size = "sm"
onClick = {() => setShowSettings(!showSettings)}
className = "h-8 w-8 p-0 text-gray-400 hover:text-white"
  >
  <Settings className="w-4 h-4" />
    </Button>
    < Button
variant = "ghost"
size = "sm"
onClick = {() => setIsMinimized(true)}
className = "h-8 w-8 p-0 text-gray-400 hover:text-white"
  >
  <Minimize2 className="w-4 h-4" />
    </Button>
    </div>
    </div>

{/* Settings Panel */ }
{
  showSettings && (
    <div className="p-4 border-b border-purple-500/20 bg-gray-800/50 no-drag" >
      <div className="space-y-3" >
        <div>
        <label className="text-xs text-gray-400 mb-1 block" > AI Model </label>
          < select
  value = { ai.currentModel }
  onChange = {(e) => ai.setModel(e.target.value)
}
className = "w-full bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
  >
  <option value="claude-sonnet-4" > Claude Sonnet 4(Best) </option>
    < option value = "claude-3-5-sonnet" > Claude 3.5 Sonnet </option>
      < option value = "gpt-4o" > GPT - 4o(Vision) </option>
        < option value = "gpt-4o-mini" > GPT - 4o Mini(Fast) </option>
          < option value = "gemini-2.0-flash" > Gemini 2.0 Flash </option>
            < option value = "deepseek-chat" > DeepSeek(Code) </option>
              < option value = "o1" > o1(Reasoning) </option>
                </select>
                </div>

                < div className = "flex gap-2" >
                  <Button
                variant="outline"
size = "sm"
onClick = { handleExport }
className = "flex-1 text-xs"
  >
  <Download className="w-3 h-3 mr-1" />
    Export
    </Button>
    < Button
variant = "outline"
size = "sm"
onClick = { handleImport }
className = "flex-1 text-xs"
  >
  <Upload className="w-3 h-3 mr-1" />
    Import
    </Button>
    < Button
variant = "outline"
size = "sm"
onClick = { ai.clearConversation }
className = "flex-1 text-xs text-red-400 hover:text-red-300"
  >
  <Trash2 className="w-3 h-3 mr-1" />
    Clear
    </Button>
    </div>
    </div>
    </div>
      )}

{/* Messages */ }
<ScrollArea className="flex-1 p-4 no-drag" >
  <div className="space-y-4" >
    {!ai.initialized && (
      <div className="text-center text-gray-400 text-sm py-8" >
        Initializing AI...
</div>
          )}

{
  ai.initialized && !ai.available && (
    <div className="text-center text-red-400 text-sm py-8" >
      AI service unavailable.Make sure Puter.js is loaded.
            </div>
          )
}

{
  ai.initialized && ai.available && ai.messages.length === 0 && (
    <div className="text-center text-gray-400 text-sm py-8" >
      <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-500" />
        <p className="font-semibold mb-1" > Hey! I'm your AI companion.</p>
          < p className = "text-xs" > I'm here to help you code, debug, and create. What are we building today?</p>
            </div>
          )
}

{
  ai.messages.map((message) => (
    <div
              key= { message.id }
              className = {
      cn(
                "flex gap-2",
        message.role === 'user' ? 'justify-end' : 'justify-start'
              )
}
            >
{
  message.role === 'assistant' && (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1">
      <Sparkles className="w-4 h-4 text-white" />
        </div>
              )
}

  < div
className = {
  cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
    message.role === 'user'
      ? 'bg-purple-600 text-white'
      : 'bg-gray-800 text-gray-100 border border-purple-500/20'
                )
}
  >
  <div className="whitespace-pre-wrap break-words" >
    { message.content }
    </div>
{
  message.model && (
    <div className="flex items-center justify-between mt-1" >
      <div className="text-xs text-gray-400" >
        { message.model } • { message.duration } ms
          </div>
  {
    message.role === 'assistant' && (
      <div className="flex gap-1 ml-2" >
        <button
                          onClick={ () => handleFeedback(message.id, 'positive') }
    disabled = {!!feedbackGiven[message.id]
  }
  className = {
    cn(
                            "p-1 rounded hover:bg-gray-700 transition-colors",
      feedbackGiven[message.id] === 'positive' && "text-green-400",
    feedbackGiven[message.id] && feedbackGiven[message.id] !== 'positive' && "opacity-30"
                          )
}
title = "Good response"
  >
  <ThumbsUp className="w-3 h-3" />
    </button>
    < button
onClick = {() => handleFeedback(message.id, 'negative')}
disabled = {!!feedbackGiven[message.id]}
className = {
  cn(
                            "p-1 rounded hover:bg-gray-700 transition-colors",
    feedbackGiven[message.id] === 'negative' && "text-red-400",
  feedbackGiven[message.id] && feedbackGiven[message.id] !== 'negative' && "opacity-30"
                          )}
title = "Poor response"
  >
  <ThumbsDown className="w-3 h-3" />
    </button>
    </div>
                    )}
</div>
                )}
</div>

{
  message.role === 'user' && (
    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1" >
      <MessageSquare className="w-4 h-4 text-white" />
        </div>
              )
}
</div>
          ))}

{
  ai.isThinking && (
    <div className="flex gap-2 justify-start" >
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0" >
        <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          < div className = "bg-gray-800 rounded-2xl px-4 py-2 border border-purple-500/20" >
            <div className="flex gap-1" >
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style = {{ animationDelay: '0ms' }
} />
  < div className = "w-2 h-2 bg-purple-500 rounded-full animate-bounce" style = {{ animationDelay: '150ms' }} />
    < div className = "w-2 h-2 bg-purple-500 rounded-full animate-bounce" style = {{ animationDelay: '300ms' }} />
      </div>
      </div>
      </div>
          )}

{
  ai.error && (
    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-300 text-xs" >
      { ai.error }
      </div>
          )
}

<div ref={ messagesEndRef } />
  </div>
  </ScrollArea>

{/* Input */ }
<div className="p-4 border-t border-purple-500/20 bg-gray-800/30 no-drag" >
{
  ai.context && (
    <div className="mb-2 text-xs text-gray-500">
      { ai.context.currentRoute } • { ai.context.activityCount } actions
        </div>
        )}

<div className="flex gap-2" >
  <Button
            variant="outline"
size = "sm"
onClick = { toggleVoice }
className = {
  cn(
              "h-10 w-10 p-0",
    isVoiceActive && "bg-red-500 hover:bg-red-600 text-white"
            )}
          >
  { isVoiceActive?<Mic className = "w-4 h-4" /> : <MicOff className="w-4 h-4" />}
</Button>

  < Input
value = { input }
onChange = {(e) => setInput(e.target.value)}
onKeyPress = { handleKeyPress }
placeholder = "Ask me anything..."
disabled = {!ai.available || ai.isThinking}
className = "flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
  />

  <Button
            onClick={ handleSend }
disabled = {!input.trim() || !ai.available || ai.isThinking}
className = "h-10 w-10 p-0 bg-purple-600 hover:bg-purple-700"
  >
  <Send className="w-4 h-4" />
    </Button>
    </div>
    </div>
    </div>
  );
}
