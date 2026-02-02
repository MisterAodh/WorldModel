import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { sendChatMessage, createArticle } from '../lib/api';
import { Send, Loader2, MessageSquare, Plus, ExternalLink, GripHorizontal, CreditCard, AlertTriangle } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  searchResults?: Array<{ title: string; url: string; snippet: string }>;
};

type ChatPanelProps = {
  onOpenArticle: (article: { url: string; title?: string }) => void;
};

export function ChatPanel({ onOpenArticle }: ChatPanelProps) {
  const { selectedCountryId, refreshContext, creditBalance } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredSource, setHoveredSource] = useState<{ url: string; title: string } | null>(null);
  const [addingArticle, setAddingArticle] = useState(false);
  const [showNoCreditsPrompt, setShowNoCreditsPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Resizable panel state
  const [panelHeight, setPanelHeight] = useState(384); // Default h-96 = 24rem = 384px
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);
  
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = panelHeight;
  }, [panelHeight]);
  
  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = resizeStartY.current - e.clientY; // Inverted: drag up = increase
      const newHeight = Math.max(150, Math.min(800, resizeStartHeight.current + delta));
      setPanelHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnterSource = (url: string, title: string) => {
    // Clear any pending close timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredSource({ url, title });
  };

  const handleMouseLeaveSource = () => {
    // Add a delay before closing to allow moving to the popup
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredSource(null);
    }, 150);
  };

  // Parse SOURCE{{URL: descriptor}} format from AI responses
  // Normalize URL to ensure it's valid
  const normalizeUrl = (url: string): string => {
    url = url.trim();
    
    // Remove any whitespace
    url = url.replace(/\s+/g, '');
    
    // If it starts with //, add https:
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    
    // If it already starts with http:// or https://, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Otherwise, add https://
    return 'https://' + url;
  };

  const parseSourceLinks = (text: string) => {
    const sourceRegex = /SOURCE\{\{([^}]+)\}\}/g;
    const parts: Array<{ type: 'text' | 'source'; content: string; url?: string; title?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = sourceRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      
      const raw = match[1];
      const separatorIndex = raw.indexOf(': ');
      if (separatorIndex === -1) {
        parts.push({ type: 'text', content: match[0] });
        lastIndex = match.index + match[0].length;
        continue;
      }

      const rawUrl = raw.slice(0, separatorIndex).trim();
      const rawTitle = raw.slice(separatorIndex + 2).trim();
      const url = normalizeUrl(rawUrl);
      
      // Extract clean title (take the part after " - " if it exists)
      const title = rawTitle.includes(' - ') 
        ? rawTitle.split(' - ').slice(1).join(' - ').trim()
        : rawTitle;
      
      // Add the source link
      parts.push({
        type: 'source',
        content: match[0],
        url: url,
        title: title,
      });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text' as const, content: text }];
  };

  const handleAddArticle = async (url: string, title: string) => {
    if (!selectedCountryId || addingArticle) return;
    
    // Normalize URL before sending
    const normalizedUrl = normalizeUrl(url);
    
    setAddingArticle(true);
    try {
      await createArticle({
        url: normalizedUrl,
        title,
        countryIds: [selectedCountryId],
      });
      await refreshContext();
    } catch (error: any) {
      console.error('Error adding article:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to add article. Please check the URL and try again.';
      alert(errorMessage);
    } finally {
      setAddingArticle(false);
      setHoveredSource(null);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await sendChatMessage({
        message: userMessage,
        contextType: selectedCountryId ? 'country' : undefined,
        contextId: selectedCountryId || undefined,
        conversationHistory: messages.slice(-10), // Last 10 messages for context
      });

      const assistantMessage = response.data.message || 'No response received.';
      const searchResults = response.data.searchResults;
      
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantMessage, searchResults },
      ]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Check for insufficient credits (402 status)
      if (error?.response?.status === 402) {
        setShowNoCreditsPrompt(true);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '⚠️ You\'ve run out of AI credits. Please add more credits to continue using the AI assistant.',
          },
        ]);
      } else {
        const errorMessage = error?.response?.data?.message || error?.message || 'Sorry, I encountered an error. Please try again.';
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: errorMessage,
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="border-t border-orange-500 bg-black flex flex-col"
      style={{ height: panelHeight }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        className={`h-2 flex items-center justify-center cursor-ns-resize hover:bg-orange-500/20 transition-colors ${isResizing ? 'bg-orange-500/30' : ''}`}
      >
        <GripHorizontal className="w-4 h-4 text-orange-500/50" />
      </div>
      
      {/* Header */}
      <div className="px-4 py-2 border-b border-orange-500/30 bg-black">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wide">AI Assistant</h3>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-8">
            <p className="mb-2">Ask me anything about the selected country!</p>
            <p className="text-xs text-gray-500">
              Try: "Analyze the economic situation" or "Suggest sentiment scores"
            </p>
          </div>
        )}
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 text-sm whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-orange-500 text-black'
                  : 'bg-gray-900 text-white border border-orange-500/30'
              }`}
            >
              {message.role === 'assistant' ? (
                // Parse and render source links for assistant messages
                parseSourceLinks(message.content).map((part, partIdx) => (
                  part.type === 'text' ? (
                    <span key={partIdx}>{part.content}</span>
                  ) : (
                    <span key={`${idx}-${partIdx}`} className="relative inline-block">
                      <button
                        onMouseEnter={() => handleMouseEnterSource(part.url!, part.title!)}
                        onMouseLeave={handleMouseLeaveSource}
                        className="text-orange-500 hover:text-orange-400 font-medium underline cursor-pointer"
                      >
                        {part.title}
                      </button>
                      {hoveredSource?.url === part.url && hoveredSource?.title === part.title && (
                        <div 
                          className="absolute z-50 mt-1 left-0 bg-black border border-orange-500 shadow-lg py-1 min-w-[160px]"
                          onMouseEnter={() => handleMouseEnterSource(part.url!, part.title!)}
                          onMouseLeave={handleMouseLeaveSource}
                        >
                          <button
                            onClick={() => handleAddArticle(part.url!, part.title!)}
                            disabled={!selectedCountryId || addingArticle}
                            className="w-full px-3 py-2 text-left text-xs text-white hover:bg-orange-500 hover:text-black transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3 h-3" />
                            Add to Articles
                          </button>
                          <button
                            onClick={() => {
                              window.open(part.url!, '_blank', 'noopener,noreferrer');
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-white hover:bg-orange-500 hover:text-black transition-colors flex items-center gap-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open Article
                          </button>
                        </div>
                      )}
                    </span>
                  )
                ))
              ) : (
                message.content
              )}
            </div>
                {message.searchResults && message.searchResults.length > 0 && (
              <div className="max-w-[85%] mt-2 space-y-1">
                {message.searchResults.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => onOpenArticle({ url: result.url, title: result.title })}
                    className="w-full text-left p-2 bg-black border border-orange-500/30 hover:border-orange-500 transition-colors"
                  >
                    <div className="text-xs font-semibold text-orange-500 line-clamp-1">{result.title}</div>
                    <div className="text-xs text-gray-400 line-clamp-2 mt-1">{result.snippet}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 px-3 py-2 border border-orange-500/30">
              <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Insufficient Credits Prompt */}
      {showNoCreditsPrompt && (
        <div className="p-4 border-t border-red-500/50 bg-red-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-400 font-semibold mb-2">Out of Credits</p>
              <p className="text-xs text-gray-400 mb-3">
                You need to purchase more credits to continue using AI features.
              </p>
              <Link
                to="/billing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-black text-sm font-semibold hover:bg-orange-400 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Add Credits
              </Link>
            </div>
            <button
              onClick={() => setShowNoCreditsPrompt(false)}
              className="text-gray-500 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-orange-500/30">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={creditBalance <= 0 ? "Add credits to use AI features..." : "Type your message... (Shift+Enter for new line)"}
            className="flex-1 px-4 py-3 bg-black border border-orange-500/50 text-white text-sm focus:outline-none focus:border-orange-500 resize-none font-mono"
            disabled={loading || creditBalance <= 0}
            rows={2}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || creditBalance <= 0}
            className="px-5 py-2 bg-orange-500 text-black font-medium hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {creditBalance <= 0 && !showNoCreditsPrompt && (
          <p className="text-xs text-red-400 mt-2">
            <Link to="/billing" className="underline hover:text-red-300">Add credits</Link> to use AI features
          </p>
        )}
      </form>
    </div>
  );
}
