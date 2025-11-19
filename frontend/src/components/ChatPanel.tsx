import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { sendChatMessage, createArticle } from '../lib/api';
import { Send, Loader2, MessageSquare, Plus, ExternalLink } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  searchResults?: Array<{ title: string; url: string; snippet: string }>;
};

type ChatPanelProps = {
  onOpenArticle: (article: { url: string; title?: string }) => void;
};

export function ChatPanel({ onOpenArticle }: ChatPanelProps) {
  const { selectedCountryId, selectedRegionId, refreshContext } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredSource, setHoveredSource] = useState<{ url: string; title: string } | null>(null);
  const [addingArticle, setAddingArticle] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  const parseSourceLinks = (text: string) => {
    const sourceRegex = /SOURCE\{\{([^:}]+):\s*([^}]+)\}\}/g;
    const parts: Array<{ type: 'text' | 'source'; content: string; url?: string; title?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = sourceRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      
      let url = match[1].trim();
      let rawTitle = match[2].trim();
      
      // Fix URL protocol
      if (url.startsWith('//')) {
        // Protocol-relative URL
        url = 'https:' + url;
      } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
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
    
    console.log('Adding article with URL:', url, 'and title:', title);
    setAddingArticle(true);
    try {
      await createArticle({
        url,
        title,
        countryIds: [selectedCountryId],
      });
      await refreshContext();
      alert(`Added "${title}" to articles!`);
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
      console.log('Sending message to API...');
      const response = await sendChatMessage({
        message: userMessage,
        contextType: selectedCountryId ? 'country' : selectedRegionId ? 'region' : undefined,
        contextId: selectedCountryId || selectedRegionId || undefined,
        conversationHistory: messages.slice(-10), // Last 10 messages for context
      });

      console.log('Response received:', response.data);
      
      const assistantMessage = response.data.message || 'No response received.';
      const searchResults = response.data.searchResults;
      
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantMessage, searchResults },
      ]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Sorry, I encountered an error. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errorMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-border bg-card flex flex-col h-96">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-background/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Assistant</h3>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            <p className="mb-2">Ask me anything about the selected country or region!</p>
            <p className="text-xs">
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
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground'
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
                        className="text-blue-400 hover:text-blue-300 font-medium underline cursor-pointer"
                      >
                        {part.title}
                      </button>
                      {hoveredSource?.url === part.url && hoveredSource?.title === part.title && (
                        <div 
                          className="absolute z-50 mt-1 left-0 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
                          onMouseEnter={() => handleMouseEnterSource(part.url!, part.title!)}
                          onMouseLeave={handleMouseLeaveSource}
                        >
                          <button
                            onClick={() => handleAddArticle(part.url!, part.title!)}
                            disabled={!selectedCountryId || addingArticle}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-secondary transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3 h-3" />
                            Add to Articles
                          </button>
                          <button
                            onClick={() => {
                              console.log('Opening URL:', part.url);
                              window.open(part.url, '_blank', 'noopener,noreferrer');
                            }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-secondary transition-colors flex items-center gap-2"
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
                    className="w-full text-left p-2 bg-card border border-border rounded-md hover:bg-card/80 transition-colors"
                  >
                    <div className="text-xs font-semibold text-primary line-clamp-1">{result.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{result.snippet}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary px-3 py-2 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-border">
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
            placeholder="Type your message... (Shift+Enter for new line)"
            className="flex-1 px-4 py-3 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            disabled={loading}
            rows={2}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
