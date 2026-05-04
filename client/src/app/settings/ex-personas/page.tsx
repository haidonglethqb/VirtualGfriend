'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, BellOff, BellRing, Heart, Loader2, MessageCircle, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import { useLanguageStore } from '@/store/language-store';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface ExPersonaItem {
  id: string;
  name: string;
  avatarUrl?: string | null;
  affection: number;
  relationshipStage: string;
  endedAt?: string | null;
  exMessagingEnabled: boolean;
  stats: {
    messages: number;
    receivedGifts: number;
    memories: number;
  };
  isExPersona: boolean;
}

export default function ExPersonaSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const { language } = useLanguageStore();
  const tr = useCallback((vi: string, en: string) => (language === 'vi' ? vi : en), [language]);
  const [isLoading, setIsLoading] = useState(true);
  const [toggleId, setToggleId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exPersonas, setExPersonas] = useState<ExPersonaItem[]>([]);

  const fetchExPersonas = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get<ExPersonaItem[]>('/character/relationship/history');
      if (response.success && response.data) {
        setExPersonas(response.data.filter((item) => item.isExPersona));
      }
    } catch (error) {
      console.error('Failed to fetch ex personas:', error);
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Không thể tải danh sách người cũ AI', 'Unable to load AI ex list'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, tr]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    void fetchExPersonas();
  }, [fetchExPersonas, isAuthenticated, router]);

  const handleOpenChat = (characterId: string) => {
    router.push(`/chat?characterId=${encodeURIComponent(characterId)}`);
  };

  const handleToggleMessaging = async (item: ExPersonaItem) => {
    const nextValue = !item.exMessagingEnabled;
    setToggleId(item.id);
    setExPersonas((prev) =>
      prev.map((entry) =>
        entry.id === item.id ? { ...entry, exMessagingEnabled: nextValue } : entry
      )
    );

    try {
      await api.patch(`/character/relationship/ex-personas/${item.id}`, {
        exMessagingEnabled: nextValue,
      });

      toast({
        title: nextValue ? tr('Đã bật comeback', 'Comeback enabled') : tr('Đã tắt comeback', 'Comeback muted'),
        description: nextValue
          ? tr('Người cũ này có thể chủ động nhắn lại.', 'This ex persona can proactively message you again.')
          : tr('Người cũ này sẽ không còn chủ động nhắn nữa.', 'This ex persona will stop sending proactive messages.'),
      });
    } catch (error) {
      console.error('Failed to update ex persona messaging:', error);
      setExPersonas((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, exMessagingEnabled: item.exMessagingEnabled } : entry
        )
      );
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Không thể cập nhật cài đặt người cũ AI', 'Unable to update AI ex settings'),
        variant: 'destructive',
      });
    } finally {
      setToggleId(null);
    }
  };

  const handleDelete = async (item: ExPersonaItem) => {
    const confirmed = window.confirm(
      tr(
        `Xoá ${item.name}? Toàn bộ chat và dữ liệu gắn với người cũ này sẽ bị xoá vĩnh viễn.`,
        `Delete ${item.name}? All chat and data tied to this ex persona will be permanently removed.`
      )
    );

    if (!confirmed) {
      return;
    }

    setDeleteId(item.id);
    try {
      await api.delete(`/character/relationship/ex-personas/${item.id}`);
      localStorage.setItem(
        'vgfriend:deleted-character',
        JSON.stringify({ characterId: item.id, timestamp: Date.now() })
      );
      if (useChatStore.getState().currentCharacterId === item.id) {
        useChatStore.getState().clearMessages();
        useChatStore.getState().setActiveCharacterId(null);
      }
      setExPersonas((prev) => prev.filter((entry) => entry.id !== item.id));
      toast({
        title: tr('Đã xoá', 'Deleted'),
        description: tr('Người cũ AI đã được xoá khỏi danh sách của bạn.', 'The AI ex has been removed from your list.'),
      });
    } catch (error) {
      console.error('Failed to delete ex persona:', error);
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Không thể xoá người cũ AI', 'Unable to delete AI ex'),
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto pb-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <Link href="/settings">
            <button className="p-2 rounded-lg hover:bg-[#392830] transition-colors">
              <ArrowLeft className="w-5 h-5 text-love" />
            </button>
          </Link>
          <Heart className="w-6 h-6 text-love" />
          <div>
            <h1 className="text-2xl font-bold">{tr('Người cũ AI', 'AI exes')}</h1>
            <p className="text-sm text-[#ba9cab]">
              {tr(
                'Tắt comeback riêng từng người, mở lại chat thủ công hoặc xoá hẳn khỏi tài khoản.',
                'Mute comeback messages per ex, reopen chat manually, or delete them from your account.'
              )}
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-love/20 bg-[#271b21] p-5 text-sm text-[#d6c0cc]">
          {tr(
            'Mute ở đây chỉ tắt proactive comeback của từng người cũ. Bạn vẫn có thể tự mở lại cuộc chat bất kỳ lúc nào.',
            'Muting here only stops proactive comeback messages for that ex. You can still reopen the chat manually any time.'
          )}
        </motion.div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#392830] bg-[#271b21] p-10 flex items-center justify-center text-[#ba9cab] gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{tr('Đang tải người cũ AI...', 'Loading AI exes...')}</span>
          </div>
        ) : exPersonas.length === 0 ? (
          <div className="rounded-2xl border border-[#392830] bg-[#271b21] p-10 text-center space-y-3">
            <p className="text-lg font-semibold">{tr('Chưa có người cũ AI nào', 'No AI exes yet')}</p>
            <p className="text-sm text-[#ba9cab]">
              {tr(
                'Sau khi chia tay và đồng ý giữ lại phiên bản người cũ, bạn sẽ quản lý họ tại đây.',
                'After a breakup, any ex persona you keep will appear here for management.'
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {exPersonas.map((item, index) => {
              const isToggling = toggleId === item.id;
              const isDeleting = deleteId === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-2xl border border-[#392830] bg-[#271b21] p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-love to-pink-600 flex items-center justify-center text-white font-bold text-lg">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold truncate">{item.name}</h2>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                          <span className="rounded-full border border-love/30 bg-love/10 px-2 py-1 text-love">
                            {item.relationshipStage}
                          </span>
                          <span className={`rounded-full px-2 py-1 border ${item.exMessagingEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-[#4a3a42] bg-[#33242c] text-[#ba9cab]'}`}>
                            {item.exMessagingEnabled ? tr('Comeback đang bật', 'Comeback enabled') : tr('Comeback đã tắt', 'Comeback muted')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-[#ba9cab] shrink-0">
                      <p>{tr('Affection', 'Affection')}: {item.affection}</p>
                      <p>{tr('Chat', 'Chats')}: {item.stats.messages}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl bg-[#33242c] px-3 py-2">
                      <p className="text-[#ba9cab]">{tr('Tin nhắn', 'Messages')}</p>
                      <p className="font-semibold">{item.stats.messages}</p>
                    </div>
                    <div className="rounded-xl bg-[#33242c] px-3 py-2">
                      <p className="text-[#ba9cab]">{tr('Ký ức', 'Memories')}</p>
                      <p className="font-semibold">{item.stats.memories}</p>
                    </div>
                    <div className="rounded-xl bg-[#33242c] px-3 py-2">
                      <p className="text-[#ba9cab]">{tr('Quà tặng', 'Gifts')}</p>
                      <p className="font-semibold">{item.stats.receivedGifts}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleOpenChat(item.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-love px-4 py-2 text-sm font-semibold text-white hover:bg-love/90 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {tr('Mở lại chat', 'Reopen chat')}
                    </button>
                    <button
                      onClick={() => handleToggleMessaging(item)}
                      disabled={isToggling || isDeleting}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#4a3a42] px-4 py-2 text-sm font-semibold text-[#f6d7e4] hover:bg-[#33242c] transition-colors disabled:opacity-60"
                    >
                      {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : item.exMessagingEnabled ? <BellOff className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
                      {item.exMessagingEnabled ? tr('Tắt comeback', 'Mute comeback') : tr('Bật comeback', 'Enable comeback')}
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={isDeleting || isToggling}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-60"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {tr('Xoá người cũ', 'Delete ex')}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}