'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Send, Users, Plus, ArrowLeft, MessageCircle, Circle, X, Loader2, Crown,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuthStore } from '@/store/auth-store'
import { socketService } from '@/services/socket'
import { useToast } from '@/hooks/use-toast'
import api from '@/services/api'

interface UserPreview {
  id: string
  username: string | null
  displayName: string | null
  avatar: string | null
  isPremium: boolean
}

interface ConversationMember {
  id: string
  userId: string
  lastReadAt: string
  user: UserPreview
}

interface Conversation {
  id: string
  isGroup: boolean
  name: string | null
  members: ConversationMember[]
  messages: { content: string; createdAt: string; senderId: string }[]
  unreadCount: number
}

interface DM {
  id: string
  conversationId: string
  content: string
  messageType: string
  createdAt: string
  sender: UserPreview
}

export default function MessagesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, user, accessToken } = useAuthStore()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<DM[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserPreview[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get<{ conversations: Conversation[] }>('/dm/conversations')
      if (res.success) {
        setConversations(res.data.conversations || [])
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await api.get<{ messages: DM[] }>(`/dm/conversations/${conversationId}/messages`)
      if (res.success) {
        setMessages(res.data.messages || [])
      }
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể tải tin nhắn', variant: 'destructive' })
    }
  }, [toast])

  // Initialize
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }
    fetchConversations()
    if (accessToken) {
      socketService.connect(accessToken)
    }
  }, [isAuthenticated, router, fetchConversations, accessToken])

  // DM socket listeners
  useEffect(() => {
    const handleDmReceive = (data: DM & { conversationId: string }) => {
      // Update message list if viewing this convo
      if (activeConvo && data.conversationId === activeConvo.id) {
        setMessages(prev => {
          // Remove optimistic version if exists (same sender + same content within 5s)
          const withoutOptimistic = prev.filter(m => {
            if (!m.id.startsWith('optimistic-')) return true
            return !(m.sender.id === data.sender.id && m.content === data.content)
          })
          if (withoutOptimistic.some(m => m.id === data.id)) return withoutOptimistic
          return [...withoutOptimistic, data]
        })
      }

      // Update conversation list preview
      setConversations(prev =>
        prev.map(c =>
          c.id === data.conversationId
            ? {
                ...c,
                messages: [{ content: data.content, createdAt: data.createdAt, senderId: data.sender.id }],
                unreadCount: (activeConvo?.id === c.id) ? c.unreadCount : c.unreadCount + 1,
              }
            : c
        ).sort((a, b) => {
          const dateA = a.messages[0]?.createdAt || ''
          const dateB = b.messages[0]?.createdAt || ''
          return dateB.localeCompare(dateA)
        })
      )
    }

    const handleDmTyping = (data: { conversationId: string; userId: string }) => {
      if (activeConvo && data.conversationId === activeConvo.id) {
        setTypingUsers(prev => new Set(prev).add(data.userId))
        setTimeout(() => {
          setTypingUsers(prev => {
            const next = new Set(prev)
            next.delete(data.userId)
            return next
          })
        }, 3000)
      }
    }

    socketService.on('dm:receive', handleDmReceive)
    socketService.on('dm:typing', handleDmTyping)

    return () => {
      socketService.off('dm:receive', handleDmReceive)
      socketService.off('dm:typing', handleDmTyping)
    }
  }, [activeConvo])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Open conversation
  const openConversation = async (convo: Conversation) => {
    setActiveConvo(convo)
    await fetchMessages(convo.id)
    socketService.emit('dm:read', { conversationId: convo.id })
    setConversations(prev => prev.map(c => c.id === convo.id ? { ...c, unreadCount: 0 } : c))
  }

  // Send message
  const handleSend = async () => {
    if (!inputMessage.trim() || sendingRef.current || !activeConvo) return
    const content = inputMessage.trim()
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setInputMessage('')
    sendingRef.current = true
    setIsSending(true)

    // Optimistic: immediately show message on right side
    const optimisticMsg: DM = {
      id: `optimistic-${clientId}`,
      conversationId: activeConvo.id,
      content,
      messageType: 'TEXT',
      createdAt: new Date().toISOString(),
      sender: {
        id: user?.id || '',
        username: user?.username || null,
        displayName: user?.displayName || null,
        avatar: user?.avatar || null,
        isPremium: user?.isPremium || false,
      },
    }
    setMessages(prev => [...prev, optimisticMsg])

    socketService.emit('dm:send', {
      conversationId: activeConvo.id,
      content,
      clientId,
    })

    setTimeout(() => {
      sendingRef.current = false
      setIsSending(false)
    }, 500)
  }

  // Search users
  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    setIsSearching(true)
    try {
      const res = await api.get<UserPreview[]>(`/dm/users/search?q=${encodeURIComponent(q)}`)
      if (res.success) {
        // Extra safety: exclude self from results
        const filtered = (res.data || []).filter(u => u.id !== user?.id)
        setSearchResults(filtered)
      }
    } catch {} finally { setIsSearching(false) }
  }

  // Start conversation with user
  const startConversation = async (targetUser: UserPreview) => {
    try {
      const res = await api.post<Conversation>('/dm/conversations', { targetUserId: targetUser.id })
      if (res.success) {
        setShowSearch(false)
        setSearchQuery('')
        setSearchResults([])
        await fetchConversations()
        setActiveConvo(res.data)
        await fetchMessages(res.data.id)
      }
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể bắt đầu cuộc trò chuyện', variant: 'destructive' })
    }
  }

  // Helper: get other user in 1-on-1
  const getOtherUser = (convo: Conversation) => {
    const other = convo.members.find(m => m.userId !== user?.id)
    return other?.user
  }

  if (!isAuthenticated) return null

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)] rounded-2xl overflow-hidden border border-[#392830]">
        {/* Conversation List */}
        <div className={`${activeConvo ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-[#392830] bg-[#1a1016]`}>
          {/* Header */}
          <div className="p-4 border-b border-[#392830] flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-love" />
              Nhắn tin
            </h2>
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-full hover:bg-[#392830] transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Search Modal */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 border-b border-[#392830] bg-[#271b21]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={e => handleSearch(e.target.value)}
                      placeholder="Tìm người dùng..."
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-[#181114] border border-[#392830] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-love/50"
                    />
                  </div>
                  <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }} className="p-2 hover:bg-[#392830] rounded-full">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {isSearching && <div className="text-center py-3"><Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-500" /></div>}
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => startConversation(u)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#181114] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-love to-purple-600 flex items-center justify-center text-sm font-bold">
                      {(u.displayName || u.username || '?')[0].toUpperCase()}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate flex items-center gap-1">
                        {u.displayName || u.username}
                        {u.isPremium && <Crown className="w-3 h-3 text-yellow-500" />}
                      </p>
                      {u.username && <p className="text-xs text-gray-500">@{u.username}</p>}
                    </div>
                  </button>
                ))}
                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <p className="text-center text-xs text-gray-500 py-3">Không tìm thấy</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-love" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <MessageCircle className="w-12 h-12 text-gray-700 mb-4" />
                <p className="text-gray-500 text-sm mb-2">Chưa có cuộc trò chuyện nào</p>
                <button
                  onClick={() => setShowSearch(true)}
                  className="text-love text-sm font-semibold hover:underline"
                >
                  Bắt đầu nhắn tin
                </button>
              </div>
            ) : (
              conversations.map(convo => {
                const other = getOtherUser(convo)
                const lastMsg = convo.messages[0]
                const isActive = activeConvo?.id === convo.id

                return (
                  <button
                    key={convo.id}
                    onClick={() => openConversation(convo)}
                    className={`w-full flex items-center gap-3 p-4 transition-colors border-b border-[#392830]/30 ${
                      isActive ? 'bg-love/10' : 'hover:bg-[#271b21]'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-love to-purple-600 flex items-center justify-center text-lg font-bold">
                        {convo.isGroup
                          ? (convo.name || 'G')[0]
                          : (other?.displayName || other?.username || '?')[0].toUpperCase()}
                      </div>
                      {convo.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-love rounded-full flex items-center justify-center text-[10px] font-bold">
                          {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-sm truncate">
                        {convo.isGroup ? convo.name : (other?.displayName || other?.username || 'Người dùng')}
                      </p>
                      {lastMsg && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {lastMsg.content}
                        </p>
                      )}
                    </div>
                    {lastMsg && (
                      <span className="text-[10px] text-gray-600 flex-shrink-0">
                        {new Date(lastMsg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${activeConvo ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-[#181114]`}>
          {activeConvo ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-[#392830] flex items-center gap-3">
                <button
                  onClick={() => setActiveConvo(null)}
                  className="md:hidden p-1 hover:bg-[#392830] rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-love to-purple-600 flex items-center justify-center font-bold">
                  {activeConvo.isGroup
                    ? (activeConvo.name || 'G')[0]
                    : (getOtherUser(activeConvo)?.displayName || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm">
                    {activeConvo.isGroup
                      ? activeConvo.name
                      : (getOtherUser(activeConvo)?.displayName || getOtherUser(activeConvo)?.username)}
                  </p>
                  {typingUsers.size > 0 && (
                    <p className="text-xs text-love animate-pulse">Đang nhập...</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => {
                  const isOwn = msg.sender.id === user?.id
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
                        {!isOwn && (
                          <p className="text-[10px] text-gray-500 mb-1 ml-1">
                            {msg.sender.displayName || msg.sender.username}
                          </p>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isOwn
                            ? 'bg-love text-white rounded-br-md'
                            : 'bg-[#271b21] text-white rounded-bl-md'
                        }`}>
                          {msg.content}
                        </div>
                        <p className={`text-[10px] text-gray-600 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-[#392830]">
                <div className="flex items-center gap-3">
                  <input
                    value={inputMessage}
                    onChange={e => {
                      setInputMessage(e.target.value)
                      socketService.emit('dm:typing', { conversationId: activeConvo.id })
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 px-4 py-3 rounded-xl bg-[#271b21] border border-[#392830] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-love/50 transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputMessage.trim() || isSending}
                    className="p-3 rounded-xl bg-love text-white hover:bg-love/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-20 h-20 rounded-full bg-[#271b21] flex items-center justify-center mb-6">
                <MessageCircle className="w-10 h-10 text-gray-700" />
              </div>
              <h3 className="text-xl font-bold mb-2">Nhắn tin với mọi người</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-sm">
                Chọn một cuộc trò chuyện bên trái hoặc tìm kiếm người dùng để bắt đầu nhắn tin.
              </p>
              <button
                onClick={() => setShowSearch(true)}
                className="px-6 py-3 rounded-xl bg-love text-white font-semibold text-sm hover:bg-love/80 transition-colors"
              >
                Bắt đầu trò chuyện
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
