import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, User, ExternalLink, Loader2, Plus, MessageSquare } from 'lucide-react';
import { getConversations, getMessages, sendMessage, getMyFollowing } from '../lib/api';

type Message = {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  article?: {
    id: string;
    title: string;
    url: string;
    source: string | null;
    keyNotes: string | null;
  };
};

type Conversation = {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  lastMessage: Message | null;
  unreadCount: number;
};

type FollowingUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export function MessagesPage() {
  const navigate = useNavigate();
  const { userId: selectedUserId } = useParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [followingUsers, setFollowingUsers] = useState<FollowingUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<Conversation['user'] | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadConversations(), loadFollowing()]);
    } finally {
      setLoading(false);
    }
  };
  
  const loadFollowing = async () => {
    try {
      const response = await getMyFollowing();
      setFollowingUsers(response.data.following || []);
    } catch (error) {
      console.error('Error loading following:', error);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
      
      // If user isn't in conversations, check following users
      const convUser = conversations.find(c => c.user.id === selectedUserId)?.user;
      const followUser = followingUsers.find(u => u.id === selectedUserId);
      if (!selectedUser && (convUser || followUser)) {
        setSelectedUser(convUser || followUser || null);
      }
    } else {
      setMessages([]);
      setSelectedUser(null);
    }
  }, [selectedUserId, conversations, followingUsers]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const response = await getConversations();
      setConversations(response.data.conversations || []);
      
      // If we have a selectedUserId but no selectedUser yet, find it
      if (selectedUserId && !selectedUser) {
        const conv = response.data.conversations?.find(
          (c: Conversation) => c.user.id === selectedUserId
        );
        if (conv) {
          setSelectedUser(conv.user);
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };
  
  // Get followed users who don't have conversations yet
  const conversationUserIds = new Set(conversations.map(c => c.user.id));
  const newConversationUsers = followingUsers.filter(u => !conversationUserIds.has(u.id));

  const loadMessages = async (userId: string) => {
    try {
      const response = await getMessages(userId, 100);
      setMessages(response.data.messages || []);
      setSelectedUser(response.data.user);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId || sending) return;

    setSending(true);
    try {
      await sendMessage({
        receiverId: selectedUserId,
        content: newMessage.trim(),
      });
      setNewMessage('');
      await loadMessages(selectedUserId);
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-orange-500 p-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold font-mono">Messages</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex max-w-6xl mx-auto w-full">
        {/* Conversations List */}
        <div className="w-80 border-r border-orange-500/30 flex flex-col">
          <div className="p-4 border-b border-orange-500/30 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-500">Conversations</h2>
            {newConversationUsers.length > 0 && (
              <button
                onClick={() => setShowNewConversation(!showNewConversation)}
                className={`p-1.5 transition-colors ${
                  showNewConversation 
                    ? 'bg-orange-500 text-black' 
                    : 'text-orange-500 hover:bg-orange-500/10'
                }`}
                title="Start new conversation"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* New Conversation Section - People you follow but haven't messaged */}
          {showNewConversation && newConversationUsers.length > 0 && (
            <div className="border-b border-orange-500/30">
              <div className="px-4 py-2 bg-gray-900/50">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Start New Conversation
                </span>
              </div>
              {newConversationUsers.map((user) => (
                <Link
                  key={user.id}
                  to={`/messages/${user.id}`}
                  onClick={() => setShowNewConversation(false)}
                  className={`flex items-center gap-3 p-4 border-b border-orange-500/10 hover:bg-gray-900 transition-colors ${
                    selectedUserId === user.id ? 'bg-gray-900' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-gray-800 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-xs text-gray-500">@{user.username}</div>
                  </div>
                  <MessageSquare className="w-4 h-4 text-orange-500" />
                </Link>
              ))}
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && newConversationUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                <p className="mb-4">No conversations yet</p>
                <Link
                  to="/users"
                  className="text-orange-500 hover:text-orange-400"
                >
                  Find users to message
                </Link>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                <p className="mb-2">No conversations yet</p>
                <p className="text-xs">Click <Plus className="w-3 h-3 inline" /> to message someone you follow</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <Link
                  key={conv.user.id}
                  to={`/messages/${conv.user.id}`}
                  className={`flex items-center gap-3 p-4 border-b border-orange-500/10 hover:bg-gray-900 transition-colors ${
                    selectedUserId === conv.user.id ? 'bg-gray-900' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-gray-800 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                    {conv.user.avatarUrl ? (
                      <img src={conv.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold truncate">
                        {conv.user.displayName || conv.user.username}
                      </span>
                      {conv.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-sm text-gray-400 truncate">
                        {conv.lastMessage.article 
                          ? `📎 ${conv.lastMessage.article.title}`
                          : conv.lastMessage.content
                        }
                      </p>
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="px-2 py-1 bg-orange-500 text-black text-xs font-bold">
                      {conv.unreadCount}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-orange-500/30 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-800 border border-orange-500/30 flex items-center justify-center">
                  {selectedUser.avatarUrl ? (
                    <img src={selectedUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div>
                  <div className="font-semibold">{selectedUser.displayName || selectedUser.username}</div>
                  <Link
                    to={`/users/${selectedUser.id}`}
                    className="text-xs text-orange-500 hover:text-orange-400"
                  >
                    @{selectedUser.username}
                  </Link>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isMine = message.sender.id !== selectedUser.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] ${
                          isMine
                            ? 'bg-orange-500 text-black'
                            : 'bg-gray-900 text-white border border-orange-500/30'
                        }`}
                      >
                        {message.article && (
                          <a
                            href={message.article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block p-3 border-b ${
                              isMine ? 'border-orange-600' : 'border-orange-500/30'
                            } hover:opacity-80`}
                          >
                            <div className="flex items-start gap-2">
                              <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="font-semibold text-sm">{message.article.title}</div>
                                {message.article.source && (
                                  <div className="text-xs opacity-70">{message.article.source}</div>
                                )}
                              </div>
                            </div>
                          </a>
                        )}
                        {message.content && (
                          <div className="p-3 text-sm whitespace-pre-wrap">{message.content}</div>
                        )}
                        <div className={`px-3 pb-2 text-xs ${isMine ? 'text-orange-800' : 'text-gray-500'}`}>
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-4 border-t border-orange-500">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 bg-gray-900 border border-orange-500/50 text-white font-mono focus:outline-none focus:border-orange-500"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="px-5 py-2 bg-orange-500 text-black font-semibold hover:bg-orange-400 transition-colors disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="mb-2">Select a conversation or</p>
                <Link
                  to="/users"
                  className="text-orange-500 hover:text-orange-400"
                >
                  find users to message
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
