'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Heart, Send, Mic, Smile,
  Gift, Phone, Video, Sparkles, X, Check, Loader2, ImageIcon
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuthStore } from '@/store/auth-store'
import { useCharacterStore } from '@/store/character-store'
import { useChatStore } from '@/store/chat-store'
import { useNotificationStore } from '@/store/notification-store'
import { socketService } from '@/services/socket'
import { crossTabSync } from '@/services/cross-tab-sync'
import { getMoodEmoji } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import api from '@/services/api'
import { AffectionPopup, LevelUpModal, RelationshipUpgradeModal, ProactiveNotification } from '@/components/ui/notifications'
import { SceneSelector } from '@/components/ui/scene-selector'
import { useSceneStore } from '@/store/scene-store'

interface InventoryItem {
  id: string;
  quantity: number;
  gift: {
    id: string;
    name: string;
    description: string;
    emoji: string;
    affectionBonus: number;
  };
}

export default function ChatPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, accessToken } = useAuthStore();
  const { character, fetchCharacter, updateAffection, isLoading: characterLoading, needsCreation } = useCharacterStore();
  const { 
    messages, 
    isTyping,
    isLoading: messagesLoading,
    addMessage, 
    setTyping,
    fetchMessages 
  } = useChatStore();
  
  // Notification store
  const {
    affectionChange,
    showAffectionPopup,
    showLevelUpModal,
    newLevel,
    levelUpUnlocks,
    levelUpRewards,
    showRelationshipModal,
    previousStage,
    newStage,
    hideLevelUp,
    hideRelationshipUpgrade,
    proactiveNotification,
    hideProactiveNotification,
  } = useNotificationStore();

  // Scene store
  const { activeSceneId, getActiveScene, fetchScenes } = useSceneStore();

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Gift modal state
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showSceneSelector, setShowSceneSelector] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [selectedGift, setSelectedGift] = useState<InventoryItem | null>(null);
  const [isSendingGift, setIsSendingGift] = useState(false)
  const [giftSuccess, setGiftSuccess] = useState(false)

  // Memoize fetchMessages for useCallback
  const handleFetchMessages = useCallback(() => {
    fetchMessages()
  }, [fetchMessages])

  // Initialize cross-tab sync
  useEffect(() => {
    crossTabSync.initialize()
    // Don't destroy on unmount - keep sync active across page navigations
  }, [])

  // Handle tab visibility for sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became active, request sync from other tabs
        crossTabSync.requestStateFromOtherTabs()
        // Also fetch from server to ensure we have latest
        handleFetchMessages()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [handleFetchMessages])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (needsCreation) {
      router.push('/dashboard')
      return
    }

    if (!character && !characterLoading) {
      fetchCharacter()
    }
    
    fetchMessages()
    fetchScenes() // Load scenes for background selector

    if (accessToken) {
      socketService.connect(accessToken)
    }

    // Socket events are handled in socketService.setupEventHandlers()
    // No need to add listeners here - it causes duplicate messages

    return () => {
      // Cleanup not needed - socketService handles its own events
    }
  }, [isAuthenticated, router, fetchMessages, needsCreation, character, characterLoading, fetchCharacter, accessToken])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendingRef = useRef(false)

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || sendingRef.current || isSending || !character) return;

    const content = inputMessage.trim();
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setInputMessage('');
    setIsSending(true);
    sendingRef.current = true;

    // Immediately add optimistic user message so it appears before typing indicator
    const optimisticMessage = {
      id: clientId, // temp ID — will be replaced by real DB ID when server echoes back
      role: 'USER' as const,
      content,
      messageType: 'TEXT',
      createdAt: new Date(),
      isOwn: true,
    };
    useChatStore.getState().addMessage(optimisticMessage);
    // Show typing indicator immediately after user message
    useChatStore.getState().setTyping(true);

    socketService.emit('message:send', { 
      content,
      characterId: character.id,
      clientId,
    });

    // Re-enable after a short delay to prevent rapid double sends
    setTimeout(() => {
      setIsSending(false);
      sendingRef.current = false;
    }, 500);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const openGiftModal = async () => {
    setShowGiftModal(true);
    setIsLoadingInventory(true);
    try {
      const response = await api.get<InventoryItem[]>('/shop/inventory');
      if (response.success) {
        setInventory(response.data);
      }
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải túi đồ',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const handleSendGift = async () => {
    if (!selectedGift || !character) return;
    
    setIsSendingGift(true);
    try {
      const response = await api.post<{ newAffection: number; reaction: string }>('/shop/send', {
        characterId: character.id,
        giftId: selectedGift.gift.id,
      });

      if (response.success) {
        updateAffection(response.data.newAffection - character.affection);
        await fetchMessages();
        setGiftSuccess(true);
        
        setInventory(prev => prev.map(item => 
          item.id === selectedGift.id 
            ? { ...item, quantity: item.quantity - 1 }
            : item
        ).filter(item => item.quantity > 0));

        setTimeout(() => {
          setGiftSuccess(false);
          setSelectedGift(null);
          setShowGiftModal(false);
        }, 1500);
      }
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể tặng quà',
        variant: 'destructive',
      });
    } finally {
      setIsSendingGift(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const affectionLevel = Math.floor((character?.affection || 0) / 100) + 1;
  const activeScene = getActiveScene();

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)]">
        {/* Left Side: Character Card */}
        <div className="hidden lg:flex lg:w-80 flex-col">
          {/* Character Info Card */}
          <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-6 flex flex-col items-center">
            {/* Avatar */}
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-full border-4 border-love/30 shadow-[0_0_40px_rgba(244,37,140,0.3)] overflow-hidden bg-gradient-to-br from-love to-pink-600 flex items-center justify-center">
                {character?.avatarUrl ? (
                  <Image
                    src={character.avatarUrl}
                    alt={character.name || 'Avatar'}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-6xl">{character?.name?.[0]?.toUpperCase() || '💕'}</span>
                )}
              </div>
              <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-3 border-[#271b21] rounded-full" />
            </div>
            
            <h2 className="text-xl font-bold mb-1">{character?.name || 'Người yêu'}</h2>
            <p className="text-sm text-green-400 flex items-center gap-1 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Online • {getMoodEmoji(character?.mood || 'neutral')} Đang vui
            </p>

            {/* Affection Level */}
            <div className="w-full p-4 rounded-xl bg-[#181114] border border-[#392830]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#ba9cab]">Độ thân mật</span>
                <span className="text-xs font-bold text-love">Level {affectionLevel}</span>
              </div>
              <div className="h-2 bg-[#392830] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-love to-pink-500 rounded-full transition-all"
                  style={{ width: `${(character?.affection || 0) % 100 || (character?.affection ? 100 : 0)}%` }}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 mt-4">
              <button onClick={() => toast({ title: 'Sắp ra mắt', description: 'Tính năng gọi thoại sẽ có trong bản cập nhật tới!' })} className="w-12 h-12 rounded-full bg-[#392830] border border-[#392830] flex items-center justify-center hover:bg-[#392830]/80 transition-colors" title="Gọi thoại (Sắp ra mắt)">
                <Phone className="w-5 h-5 text-[#ba9cab]" />
              </button>
              <button onClick={() => toast({ title: 'Sắp ra mắt', description: 'Tính năng gọi video sẽ có trong bản cập nhật tới!' })} className="w-12 h-12 rounded-full bg-[#392830] border border-[#392830] flex items-center justify-center hover:bg-[#392830]/80 transition-colors" title="Gọi video (Sắp ra mắt)">
                <Video className="w-5 h-5 text-[#ba9cab]" />
              </button>
              <button 
                onClick={() => setShowSceneSelector(true)}
                className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center hover:bg-purple-500 hover:text-white text-purple-400 transition-all" 
                title="Đổi background"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={openGiftModal}
                className="w-12 h-12 rounded-full bg-love/20 border border-love/30 flex items-center justify-center hover:bg-love hover:text-white text-love transition-all" 
                title="Tặng quà"
              >
                <Gift className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Chat Interface */}
        <div className="flex-1 flex flex-col rounded-2xl bg-[#271b21] border border-[#392830] overflow-hidden">
          {/* Chat Header - Mobile */}
          <div className="lg:hidden flex items-center justify-between p-3 border-b border-[#392830] bg-gradient-to-r from-[#271b21] to-[#2d1f26]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-love to-pink-600 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(244,37,140,0.3)] overflow-hidden">
                  {character?.avatarUrl ? (
                    <Image
                      src={character.avatarUrl}
                      alt={character.name || 'Avatar'}
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{character?.name?.[0]?.toUpperCase() || '💕'}</span>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#271b21] rounded-full animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-base">{character?.name || 'Người yêu'}</h3>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Đang online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-love/20 to-pink-500/20 border border-love/30">
                <Heart className="w-4 h-4 text-love fill-love" />
                <span className="text-sm font-bold text-love">Lv.{affectionLevel}</span>
              </div>
              <button 
                onClick={() => setShowSceneSelector(true)}
                className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 hover:bg-purple-500 hover:text-white transition-all"
                title="Đổi background"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={openGiftModal}
                className="w-10 h-10 rounded-full bg-love/20 border border-love/30 flex items-center justify-center text-love hover:bg-love hover:text-white transition-all"
              >
                <Gift className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 scrollbar-hide relative"
            style={activeScene?.imageUrl ? {
              backgroundImage: `url(${activeScene.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : undefined}
          >
            {/* Background overlay when scene is active */}
            {activeScene?.imageUrl && (
              <div className="absolute inset-0 bg-black/30 pointer-events-none" />
            )}
          
          {/* Loading state */}
          {messagesLoading && (
            <div className="relative z-10 flex flex-col items-center justify-center h-full">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-love rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-3 h-3 bg-love rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-3 h-3 bg-love rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-white/50 mt-4">Đang tải tin nhắn...</p>
            </div>
          )}

          {/* Welcome message if no messages */}
          {!messagesLoading && messages.length === 0 && (
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 rounded-full gradient-love flex items-center justify-center mb-6 shadow-love-strong">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Bắt đầu cuộc trò chuyện!</h2>
              <p className="text-white/50 max-w-sm">
                Hãy gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện với {character?.name || 'người yêu'} của bạn 💕
              </p>
            </div>
          )}

          {/* Message list */}
          <AnimatePresence>
            {messages.map((message, index) => {
              const isUser = message.role === 'USER' || (message.role === 'SYSTEM' && message.messageType === 'GIFT');
              const showTimestamp = index === 0 || 
                new Date(messages[index - 1].createdAt).toDateString() !== new Date(message.createdAt).toDateString();
              
              return (
                <div key={message.id || index}>
                  {/* Timestamp */}
                  {showTimestamp && (
                    <div className="flex justify-center my-4">
                      <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold bg-black/20 px-3 py-1 rounded-full">
                        {new Date(message.createdAt).toLocaleDateString('vi-VN', { 
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </span>
                    </div>
                  )}
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`relative z-10 flex ${isUser ? 'flex-col items-end self-end' : 'gap-4 items-end'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full gradient-love flex items-center justify-center text-sm shrink-0 mb-1 shadow-lg overflow-hidden">
                        {character?.avatarUrl ? (
                          <Image
                            src={character.avatarUrl}
                            alt={character.name || 'Avatar'}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{character?.name?.[0]?.toUpperCase() || '💕'}</span>
                        )}
                      </div>
                    )}
                    <div className={`flex flex-col gap-1 max-w-[85%] ${isUser ? 'items-end' : ''}`}>
                      <div
                        className={`px-5 py-3 text-sm md:text-base leading-relaxed ${
                          isUser
                            ? 'bg-love text-white rounded-2xl rounded-br-sm shadow-[0_4px_20px_rgba(244,37,140,0.4)]'
                            : 'bg-[#271b21]/90 backdrop-blur-md text-white rounded-2xl rounded-bl-sm border border-white/10 shadow-lg'
                        }`}
                      >
                        {message.content}
                      </div>
                      <span className={`text-[10px] text-white/60 drop-shadow-md ${isUser ? 'pr-1' : 'pl-1'}`}>
                        {new Date(message.createdAt).toLocaleTimeString('vi-VN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 flex gap-4 items-end"
            >
              <div className="w-8 h-8 rounded-full gradient-love flex items-center justify-center text-sm shrink-0 mb-1 shadow-lg overflow-hidden">
                {character?.avatarUrl ? (
                  <Image
                    src={character.avatarUrl}
                    alt={character?.name || 'Avatar'}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{character?.name?.[0]?.toUpperCase() || '💕'}</span>
                )}
              </div>
              <div className="bg-[#271b21]/90 backdrop-blur-md px-4 py-3 rounded-2xl rounded-bl-sm border border-white/10 shadow-lg">
                <div className="flex gap-1.5 items-center h-4">
                  <span className="w-2 h-2 bg-love rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <span className="w-2 h-2 bg-love rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2 h-2 bg-love rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-[#181114] via-[#181114]/95 to-transparent">
          {/* Quick replies - Now above input */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
            {['Xin chào! 👋', 'Anh/Em nhớ em/anh 💕', 'Hôm nay thế nào?', 'Kể chuyện đi', 'Em đang làm gì?', 'Chúc em ngủ ngon 🌙'].map((text) => (
              <button
                key={text}
                onClick={() => setInputMessage(text)}
                className="bg-[#392830]/60 hover:bg-love/20 border border-[#4a3640] hover:border-love/50 px-4 py-2 rounded-full text-xs font-medium text-white/80 hover:text-white whitespace-nowrap transition-all shadow-sm"
              >
                {text}
              </button>
            ))}
          </div>
          
          <div className="relative group">
            <input 
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isSending}
              className="w-full bg-[#392830]/40 hover:bg-[#392830]/60 focus:bg-[#392830]/60 border border-[#4a3640] focus:border-love/50 text-white placeholder-white/40 rounded-full py-4 pl-6 pr-32 outline-none transition-all shadow-lg backdrop-blur-md" 
              placeholder={`Nhắn tin cho ${character?.name || 'người yêu'}...`}
              type="text"
            />
            {/* Input Actions */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button onClick={() => toast({ title: 'Sắp ra mắt', description: 'Bộ chọn emoji sẽ có trong bản cập nhật tới!' })} className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors" title="Emoji (Sắp ra mắt)">
                <Smile className="w-5 h-5" />
              </button>
              <button onClick={() => toast({ title: 'Sắp ra mắt', description: 'Tính năng ghi âm sẽ có trong bản cập nhật tới!' })} className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors" title="Ghi âm (Sắp ra mắt)">
                <Mic className="w-5 h-5" />
              </button>
              <button 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isSending}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-love text-white shadow-[0_0_15px_rgba(244,37,140,0.4)] hover:bg-love/90 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="text-center mt-3">
            <p className="text-[10px] text-white/20">AI tạo phản hồi dựa trên cuộc trò chuyện của bạn.</p>
          </div>
        </div>
      </div>

      {/* Gift Modal */}
      <AnimatePresence>
        {showGiftModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
            onClick={() => !isSendingGift && setShowGiftModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#271b21] border border-[#392830] rounded-t-2xl sm:rounded-2xl p-4 w-full sm:max-w-md max-h-[70vh] overflow-hidden flex flex-col"
            >
              {giftSuccess ? (
                <div className="py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 mx-auto rounded-full gradient-love flex items-center justify-center mb-4"
                  >
                    <Check className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-lg font-bold mb-2">Tặng quà thành công!</h3>
                  <p className="text-[#ba9cab]">
                    {character?.name} rất vui khi nhận được quà! 💕
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Gift className="w-5 h-5 text-love" />
                      Tặng quà cho {character?.name}
                    </h3>
                    <button 
                      onClick={() => setShowGiftModal(false)}
                      className="p-2 rounded-full hover:bg-[#392830] transition-colors"
                    >
                      <X className="w-5 h-5 text-[#ba9cab]" />
                    </button>
                  </div>

                  {isLoadingInventory ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-love" />
                    </div>
                  ) : inventory.length === 0 ? (
                    <div className="text-center py-8">
                      <Gift className="w-12 h-12 mx-auto mb-3 text-[#ba9cab] opacity-50" />
                      <p className="text-[#ba9cab] mb-4">Bạn chưa có quà nào trong túi đồ</p>
                      <button 
                        onClick={() => { setShowGiftModal(false); router.push('/shop'); }}
                        className="px-6 py-3 rounded-full bg-love hover:bg-love/90 text-white font-bold transition-all"
                      >
                        Đi mua quà
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2 mb-4">
                        {inventory.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedGift(item)}
                            className={`p-3 rounded-xl text-center cursor-pointer transition-all ${
                              selectedGift?.id === item.id 
                                ? 'bg-love/20 ring-2 ring-love' 
                                : 'bg-[#392830]/50 hover:bg-[#392830]'
                            }`}
                          >
                            <div className="text-3xl mb-1">{item.gift.emoji}</div>
                            <p className="text-xs font-medium truncate">{item.gift.name}</p>
                            <p className="text-xs text-[#ba9cab]">x{item.quantity}</p>
                          </div>
                        ))}
                      </div>

                      {selectedGift && (
                        <div className="border-t border-[#392830] pt-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="text-4xl">{selectedGift.gift.emoji}</div>
                            <div className="flex-1">
                              <p className="font-semibold">{selectedGift.gift.name}</p>
                              <p className="text-xs text-love flex items-center gap-1">
                                <Heart className="w-3 h-3 fill-love" />
                                +{selectedGift.gift.affectionBonus} độ thân mật
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={handleSendGift}
                            disabled={isSendingGift}
                            className="w-full h-12 rounded-full bg-love hover:bg-love/90 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isSendingGift ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang tặng...
                              </>
                            ) : (
                              <>
                                <Gift className="w-4 h-4" />
                                Tặng cho {character?.name}
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Affection Change Popup */}
      <AffectionPopup 
        change={affectionChange} 
        isVisible={showAffectionPopup} 
      />

      {/* Level Up Modal */}
      <LevelUpModal
        isOpen={showLevelUpModal}
        onClose={hideLevelUp}
        newLevel={newLevel}
        characterName={character?.name || 'Người yêu'}
        unlocks={levelUpUnlocks}
        rewards={levelUpRewards}
      />

      {/* Relationship Upgrade Modal */}
      <RelationshipUpgradeModal
        isOpen={showRelationshipModal}
        onClose={hideRelationshipUpgrade}
        previousStage={previousStage}
        newStage={newStage}
        characterName={character?.name || 'Người yêu'}
      />

      {/* Proactive AI Notification */}
      <ProactiveNotification
        notification={proactiveNotification}
        onDismiss={hideProactiveNotification}
        onReply={() => {
          hideProactiveNotification();
          inputRef.current?.focus();
        }}
      />

      {/* Scene Selector */}
      <SceneSelector
        isOpen={showSceneSelector}
        onClose={() => setShowSceneSelector(false)}
      />
      </div>
    </AppLayout>
  );
}
