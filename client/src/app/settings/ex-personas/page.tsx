'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
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
  canChatEx?: boolean;
  canGiftEx?: boolean;
  lockReason?: string | null;
  stats: {
    messages: number;
    receivedGifts: number;
    memories: number;
  };
  isExPersona: boolean;
  isEnded?: boolean;
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
        setExPersonas(response.data.filter((item) => item.isExPersona || (item.isEnded && !item.isExPersona)));
      }
    } catch (error) {
      console.error('Failed to fetch ex personas:', error);
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Không thể tải danh sách người cũ.', 'Unable to load ex list.'),
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
      prev.map((entry) => (entry.id === item.id ? { ...entry, exMessagingEnabled: nextValue } : entry))
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
        prev.map((entry) => (entry.id === item.id ? { ...entry, exMessagingEnabled: item.exMessagingEnabled } : entry))
      );
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Không thể cập nhật cài đặt người cũ.', 'Unable to update ex settings.'),
        variant: 'destructive',
      });
    } finally {
      setToggleId(null);
    }
  };

  const handleDelete = async (item: ExPersonaItem) => {
    const confirmed = window.confirm(
      tr(
        `Xoá ${item.name}? Toàn bộ chat và dữ liệu gắn với persona này sẽ bị xoá vĩnh viễn.`,
        `Delete ${item.name}? All chat and data tied to this persona will be permanently removed.`
      )
    );

    if (!confirmed) return;

    setDeleteId(item.id);
    try {
      await api.delete(`/character/relationship/ex-personas/${item.id}`);
      localStorage.setItem('vgfriend:deleted-character', JSON.stringify({ characterId: item.id, timestamp: Date.now() }));
      if (useChatStore.getState().currentCharacterId === item.id) {
        useChatStore.getState().clearMessages();
        useChatStore.getState().setActiveCharacterId(null);
      }
      setExPersonas((prev) => prev.filter((entry) => entry.id !== item.id));
      toast({
        title: tr('Đã xoá', 'Deleted'),
        description: tr('Persona người cũ đã được xoá khỏi danh sách.', 'The ex persona has been removed from your list.'),
      });
    } catch (error) {
      console.error('Failed to delete ex persona:', error);
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Không thể xoá người cũ.', 'Unable to delete ex persona.'),
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
            <h1 className="text-2xl font-bold">{tr('Người cũ', 'Exes')}</h1>
            <p className="text-sm text-[#ba9cab]">
              {tr('Quản lý archive, comeback và chat lại với những nhân vật đã chia tay.', 'Manage archives, comeback messages, and chats with ended relationships.')}
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-love/20 bg-[#271b21] p-5 text-sm text-[#d6c0cc]">
          {tr('Nhân vật đã chia tay dùng lại ký ức, facts và lịch sử chat gốc. Tài khoản thường vẫn xem được archive cơ bản; VIP có thể nhắn hoặc tặng quà lại.', 'Ended characters keep their original facts, memories, and chat history. Free users can read the basic archive; VIP users can chat or gift again.')}
        </motion.div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#392830] bg-[#271b21] p-10 flex items-center justify-center text-[#ba9cab] gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{tr('Đang tải người cũ...', 'Loading exes...')}</span>
          </div>
        ) : exPersonas.length === 0 ? (
          <div className="rounded-2xl border border-[#392830] bg-[#271b21] p-10 text-center space-y-3">
            <p className="text-lg font-semibold">{tr('Chưa có người cũ nào', 'No exes yet')}</p>
            <p className="text-sm text-[#ba9cab]">
              {tr('Sau khi chia tay, nhân vật cũ sẽ xuất hiện ở đây để bạn mở archive hoặc chat lại khi đủ quyền.', 'After a breakup, ended characters appear here so you can open the archive or chat again when allowed.')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {exPersonas.map((item, index) => {
              const isToggling = toggleId === item.id;
              const isDeleting = deleteId === item.id;
              const canChat = item.canChatEx || item.isExPersona;

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
                      <div className="relative w-14 h-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-love to-pink-600 flex items-center justify-center text-white font-bold text-lg">
                        {item.avatarUrl ? (
                          <Image src={item.avatarUrl} alt={item.name} fill className="object-cover" sizes="56px" />
                        ) : (
                          item.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold truncate">{item.name}</h2>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                          <span className="rounded-full border border-love/30 bg-love/10 px-2 py-1 text-love">
                            {item.isEnded ? tr('Đã chia tay', 'Broken up') : item.relationshipStage}
                          </span>
                          {item.isExPersona && (
                            <span className={`rounded-full px-2 py-1 border ${item.exMessagingEnabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-[#4a3a42] bg-[#33242c] text-[#ba9cab]'}`}>
                              {item.exMessagingEnabled ? tr('Comeback đang bật', 'Comeback enabled') : tr('Comeback đã tắt', 'Comeback muted')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-[#ba9cab] shrink-0">
                      <p>{tr('Thân mật', 'Affection')}: {item.affection}</p>
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
                      {canChat ? tr('Chat lại', 'Chat again') : tr('Mở archive', 'Open archive')}
                    </button>

                    {item.isExPersona && (
                      <>
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
                          {tr('Xoá persona', 'Delete persona')}
                        </button>
                      </>
                    )}

                    {!canChat && (
                      <Link href="/subscription" className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/10 transition-colors">
                        {tr('Nâng cấp VIP để nhắn lại', 'Upgrade to chat again')}
                      </Link>
                    )}
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
