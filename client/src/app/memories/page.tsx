'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Calendar, MessageCircle, Gift, Star, X, 
  Trash2, Loader2, Search, Flame, Clock, Plus,
  Grid3X3, Flag
} from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { useCharacterStore } from '@/store/character-store';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import api from '@/services/api';

interface Memory {
  id: string;
  type: 'MILESTONE' | 'PHOTO' | 'CONVERSATION' | 'GIFT' | 'EVENT';
  title: string;
  description: string;
  imageUrl?: string;
  milestone?: string;
  isFavorite: boolean;
  createdAt: string;
}

interface Stats {
  totalMemories: number;
  totalDays: number;
  totalMessages: number;
  totalGifts: number;
}

const typeLabels: Record<string, string> = {
  MILESTONE: 'Cột mốc',
  PHOTO: 'Hình ảnh',
  CONVERSATION: 'Trò chuyện',
  GIFT: 'Quà tặng',
  EVENT: 'Sự kiện',
};

const typeIcons: Record<string, React.ReactNode> = {
  MILESTONE: <Flag className="w-4 h-4" />,
  PHOTO: <Grid3X3 className="w-4 h-4" />,
  CONVERSATION: <MessageCircle className="w-4 h-4" />,
  GIFT: <Gift className="w-4 h-4" />,
  EVENT: <Star className="w-4 h-4" />,
};

const typeColors: Record<string, { bg: string; text: string }> = {
  MILESTONE: { bg: 'bg-yellow-500/20', text: 'text-yellow-500' },
  PHOTO: { bg: 'bg-blue-500/20', text: 'text-blue-500' },
  CONVERSATION: { bg: 'bg-green-500/20', text: 'text-green-500' },
  GIFT: { bg: 'bg-love/20', text: 'text-love' },
  EVENT: { bg: 'bg-purple-500/20', text: 'text-purple-500' },
};

export default function MemoriesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const { character } = useCharacterStore();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalMemories: 0,
    totalDays: 0,
    totalMessages: 0,
    totalGifts: 0,
  });
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMemory, setNewMemory] = useState({
    title: '',
    description: '',
    type: 'EVENT' as Memory['type'],
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    fetchMemories();
  }, [isAuthenticated, router]);

  const fetchMemories = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ items: Memory[]; total: number }>('/memories?limit=100');
      if (response.success) {
        const data = response.data;
        const mems = data.items || [];
        setMemories(mems);
        
        const giftCount = mems.filter((m: Memory) => m.type === 'GIFT').length;
        const conversationCount = mems.filter((m: Memory) => m.type === 'CONVERSATION').length;
        
        const dates = mems.map((m: Memory) => new Date(m.createdAt).getTime());
        const daysDiff = dates.length > 0 
          ? Math.ceil((Date.now() - Math.min(...dates)) / (1000 * 60 * 60 * 24))
          : 0;
        
        setStats({
          totalMemories: mems.length,
          totalDays: daysDiff || 1,
          totalMessages: conversationCount * 10,
          totalGifts: giftCount,
        });
      }
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách kỷ niệm',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (memoryId: string) => {
    try {
      const response = await api.patch<Memory>(`/memories/${memoryId}/favorite`);
      if (response.success) {
        setMemories((prev) =>
          prev.map((m) =>
            m.id === memoryId ? { ...m, isFavorite: !m.isFavorite } : m
          )
        );
        if (selectedMemory?.id === memoryId) {
          setSelectedMemory({ ...selectedMemory, isFavorite: !selectedMemory.isFavorite });
        }
      }
    } catch {
      // Handle error silently
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      await api.delete(`/memories/${memoryId}`);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      setSelectedMemory(null);
      toast({
        title: 'Đã xóa',
        description: 'Kỷ niệm đã được xóa',
      });
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa kỷ niệm',
        variant: 'destructive',
      });
    }
  };

  const handleCreateMemory = async () => {
    if (!newMemory.title.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tiêu đề kỷ niệm',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);
      const response = await api.post<Memory>('/memories', {
        title: newMemory.title,
        description: newMemory.description,
        type: newMemory.type,
      });
      
      if (response.success) {
        setMemories((prev) => [response.data, ...prev]);
        setShowCreateModal(false);
        setNewMemory({ title: '', description: '', type: 'EVENT' });
        toast({
          title: 'Thành công',
          description: 'Đã ghi lại kỷ niệm mới!',
        });
      }
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo kỷ niệm',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredMemories = memories.filter((m) => {
    let matchesFilter = activeFilter === 'all' || m.type === activeFilter.toUpperCase();
    if (activeFilter === 'favorite') {
      matchesFilter = m.isFavorite;
    }
    const matchesSearch = searchQuery === '' || 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Group memories by month
  const groupedMemories = filteredMemories.reduce((acc, memory) => {
    const date = new Date(memory.createdAt);
    const monthYear = date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(memory);
    return acc;
  }, {} as Record<string, Memory[]>);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="flex flex-1 relative w-full">
        {/* Sidebar Navigation for Memories */}
        <aside className="hidden lg:flex flex-col w-64 sticky top-0 h-[calc(100vh-5rem)] p-6 overflow-y-auto border-r border-[#392830]/30 shrink-0">
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-white text-lg font-bold mb-1">Dòng thời gian</h1>
              <p className="text-[#ba9cab] text-sm">Nhảy đến kỷ niệm</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setActiveFilter('all')}
                className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all group ${
                  activeFilter === 'all' 
                    ? 'bg-love/10 text-love border border-love/20' 
                    : 'hover:bg-[#392830] text-[#ba9cab] hover:text-white border border-transparent'
                }`}
              >
                <Grid3X3 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold">Tất cả kỷ niệm</span>
              </button>
              <button 
                onClick={() => setActiveFilter('conversation')}
                className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all group ${
                  activeFilter === 'conversation' 
                    ? 'bg-love/10 text-love border border-love/20' 
                    : 'hover:bg-[#392830] text-[#ba9cab] hover:text-white border border-transparent'
                }`}
              >
                <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Trò chuyện</span>
              </button>
              <button 
                onClick={() => setActiveFilter('gift')}
                className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all group ${
                  activeFilter === 'gift' 
                    ? 'bg-love/10 text-love border border-love/20' 
                    : 'hover:bg-[#392830] text-[#ba9cab] hover:text-white border border-transparent'
                }`}
              >
                <Gift className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Quà tặng</span>
              </button>
              <button 
                onClick={() => setActiveFilter('milestone')}
                className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all group ${
                  activeFilter === 'milestone' 
                    ? 'bg-love/10 text-love border border-love/20' 
                    : 'hover:bg-[#392830] text-[#ba9cab] hover:text-white border border-transparent'
                }`}
              >
                <Flag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Cột mốc</span>
              </button>
              <button 
                onClick={() => setActiveFilter('favorite')}
                className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all group ${
                  activeFilter === 'favorite' 
                    ? 'bg-love/10 text-love border border-love/20' 
                    : 'hover:bg-[#392830] text-[#ba9cab] hover:text-white border border-transparent'
                }`}
              >
                <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Yêu thích</span>
              </button>
            </div>

            {/* Archives by month */}
            <div className="mt-4 border-t border-[#392830] pt-6">
              <p className="text-xs font-bold text-[#ba9cab] uppercase tracking-wider mb-4 px-4">Lưu trữ</p>
              <div className="flex flex-col gap-1 pl-4 relative border-l-2 border-[#392830]">
                {Object.keys(groupedMemories).slice(0, 3).map((month, index) => (
                  <span 
                    key={month}
                    className={`relative pl-4 py-2 text-sm ${
                      index === 0 
                        ? 'text-love font-bold before:content-[\'\'] before:absolute before:-left-[19px] before:top-1/2 before:-translate-y-1/2 before:w-2.5 before:h-2.5 before:bg-love before:rounded-full'
                        : 'text-[#ba9cab]'
                    }`}
                  >
                    {month}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Hero Section - Compact */}
          <div className="p-4 md:p-6 lg:p-8">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-love/20 border border-love/30 w-fit">
                  <Flame className="w-4 h-4 text-love" />
                  <span className="text-xs font-bold text-love uppercase tracking-wide">Level {Math.floor((character?.affection || 0) / 100) + 1} Kết nối</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Hành Trình Chung</h1>
                <p className="text-[#ba9cab]">{stats.totalDays} ngày bên nhau • {stats.totalMessages.toLocaleString()} tin nhắn trao đổi</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-4 md:px-6 lg:px-8 pb-4 sticky top-[72px] z-40 bg-[#181114]/95 backdrop-blur-sm transition-all">
            <div className="flex w-full items-center rounded-xl bg-[#271b21] border border-[#392830] focus-within:border-love/50 transition-all">
              <div className="text-[#ba9cab] flex items-center justify-center pl-4">
                <Search className="w-5 h-5" />
              </div>
              <input 
                className="w-full bg-transparent border-none text-white placeholder-[#ba9cab] h-11 px-4 focus:ring-0 text-sm focus:outline-none" 
                placeholder="Tìm kiếm kỷ niệm, trò chuyện, hoặc quà tặng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Mobile Filter Tabs - Only show on small screens */}
          <div className="lg:hidden px-4 md:px-6 pb-4 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              <button 
                onClick={() => setActiveFilter('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeFilter === 'all' 
                    ? 'bg-love text-white' 
                    : 'bg-[#271b21] text-[#ba9cab] hover:text-white border border-[#392830]'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                Tất cả
              </button>
              <button 
                onClick={() => setActiveFilter('conversation')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeFilter === 'conversation' 
                    ? 'bg-love text-white' 
                    : 'bg-[#271b21] text-[#ba9cab] hover:text-white border border-[#392830]'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                Trò chuyện
              </button>
              <button 
                onClick={() => setActiveFilter('gift')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeFilter === 'gift' 
                    ? 'bg-love text-white' 
                    : 'bg-[#271b21] text-[#ba9cab] hover:text-white border border-[#392830]'
                }`}
              >
                <Gift className="w-4 h-4" />
                Quà tặng
              </button>
              <button 
                onClick={() => setActiveFilter('milestone')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeFilter === 'milestone' 
                    ? 'bg-love text-white' 
                    : 'bg-[#271b21] text-[#ba9cab] hover:text-white border border-[#392830]'
                }`}
              >
                <Flag className="w-4 h-4" />
                Cột mốc
              </button>
              <button 
                onClick={() => setActiveFilter('favorite')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeFilter === 'favorite' 
                    ? 'bg-love text-white' 
                    : 'bg-[#271b21] text-[#ba9cab] hover:text-white border border-[#392830]'
                }`}
              >
                <Heart className="w-4 h-4" />
                Yêu thích
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-love" />
            </div>
          ) : (
            /* Masonry Grid */
            <div className="px-4 md:px-6 lg:px-8 pb-20">
              <div className="columns-1 md:columns-2 xl:columns-3 gap-5 space-y-5">
                {/* Stats Card */}
                <div className="break-inside-avoid p-6 rounded-2xl bg-gradient-to-br from-[#271b21] to-[#392830] border border-[#392830]">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-[#ba9cab] uppercase">Cột mốc đạt được</h4>
                    <Clock className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white tracking-tighter">{stats.totalDays}</span>
                    <span className="text-xl font-medium text-white/60">Ngày</span>
                  </div>
                  <p className="mt-2 text-sm text-[#ba9cab]">Bên nhau và trò chuyện mỗi ngày!</p>
                  <div className="w-full bg-[#392830]/50 rounded-full h-2 mt-4 overflow-hidden">
                    <div className="bg-green-400 h-full rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>

                {/* Memory Cards */}
                {filteredMemories.map((memory, index) => (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="break-inside-avoid"
                    onClick={() => setSelectedMemory(memory)}
                  >
                    {memory.type === 'MILESTONE' ? (
                      /* Milestone Card (Highlight) */
                      <div className="relative group cursor-pointer">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-love to-purple-600 rounded-2xl opacity-30 blur group-hover:opacity-60 transition duration-500" />
                        <div className="relative flex flex-col gap-4 p-6 rounded-2xl bg-[#271b21] border border-[#392830]">
                          <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                              <Flame className="w-5 h-5 text-white" />
                            </div>
                            <span className="px-3 py-1 rounded-full bg-[#392830] text-xs font-bold text-[#ba9cab]">
                              {new Date(memory.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1">{memory.title}</h3>
                            <p className="text-[#ba9cab] text-sm leading-relaxed">{memory.description}</p>
                          </div>
                        </div>
                      </div>
                    ) : memory.type === 'CONVERSATION' ? (
                      /* Conversation Card */
                      <div className="flex flex-col gap-3 p-6 rounded-2xl bg-[#271b21] border border-[#392830] hover:border-[#392830]/80 transition-colors shadow-sm cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageCircle className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Trò chuyện sâu</span>
                        </div>
                        <p className="text-white/90 italic font-medium text-lg leading-relaxed">&quot;{memory.description}&quot;</p>
                        <div className="flex items-center justify-between mt-2 pt-4 border-t border-[#392830]/50">
                          <p className="text-[#ba9cab] text-xs">
                            {new Date(memory.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                          <button className="text-love text-xs font-bold hover:underline">Xem chi tiết</button>
                        </div>
                      </div>
                    ) : memory.type === 'GIFT' ? (
                      /* Gift Card */
                      <div className="relative overflow-hidden rounded-2xl bg-[#271b21] border border-[#392830] cursor-pointer group">
                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="bg-love/20 p-1.5 rounded-full text-love">
                              <Gift className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-white/80 bg-black/30 px-2 py-1 rounded-full">Quà đã nhận</span>
                          </div>
                          <h3 className="text-white font-bold text-lg">{memory.title}</h3>
                          <p className="text-white/70 text-sm mt-1">{memory.description}</p>
                          <p className="text-[#ba9cab] text-xs mt-3">
                            {new Date(memory.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Default Card */
                      <div className="flex flex-col gap-3 p-6 rounded-2xl bg-[#271b21] border border-[#392830] hover:border-[#392830]/80 transition-colors shadow-sm cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          {typeIcons[memory.type]}
                          <span className={`text-xs font-bold uppercase tracking-wide ${typeColors[memory.type]?.text || 'text-gray-400'}`}>
                            {typeLabels[memory.type] || memory.type}
                          </span>
                          {memory.isFavorite && <Heart className="w-4 h-4 text-love fill-love ml-auto" />}
                        </div>
                        <h3 className="text-white font-bold">{memory.title}</h3>
                        <p className="text-[#ba9cab] text-sm leading-relaxed">{memory.description}</p>
                        <div className="flex items-center justify-between mt-2 pt-4 border-t border-[#392830]/50">
                          <p className="text-[#ba9cab] text-xs">
                            {new Date(memory.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {filteredMemories.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-[#ba9cab] opacity-50" />
                  <p className="text-[#ba9cab]">Chưa có kỷ niệm nào</p>
                  <p className="text-sm text-[#ba9cab]/70">Trò chuyện nhiều hơn để tạo kỷ niệm!</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating Action Button */}
      <button onClick={() => setShowCreateModal(true)} className="fixed bottom-8 right-8 z-50 flex items-center gap-2 bg-love hover:bg-love/90 text-white rounded-full h-14 pl-5 pr-6 shadow-[0_4px_20px_rgba(244,37,140,0.4)] transition-transform hover:scale-105 active:scale-95">
        <Plus className="w-6 h-6" />
        <span className="font-bold text-base">Ghi kỷ niệm</span>
      </button>

      {/* Create Memory Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#271b21] border border-[#392830] rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Ghi kỷ niệm mới</h2>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-full hover:bg-[#392830] transition-colors"
                >
                  <X className="w-5 h-5 text-[#ba9cab]" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#ba9cab] mb-2">Loại kỷ niệm</label>
                  <select 
                    value={newMemory.type}
                    onChange={(e) => setNewMemory({ ...newMemory, type: e.target.value as Memory['type'] })}
                    className="w-full bg-[#181114] border border-[#392830] rounded-lg text-white px-3 py-2 focus:outline-none focus:border-love"
                  >
                    <option value="EVENT">Sự kiện</option>
                    <option value="CONVERSATION">Trò chuyện</option>
                    <option value="GIFT">Quà tặng</option>
                    <option value="MILESTONE">Cột mốc</option>
                    <option value="PHOTO">Hình ảnh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#ba9cab] mb-2">Tiêu đề *</label>
                  <input 
                    type="text"
                    value={newMemory.title}
                    onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
                    placeholder="Nhập tiêu đề kỷ niệm..."
                    className="w-full bg-[#181114] border border-[#392830] rounded-lg text-white placeholder-[#ba9cab] px-3 py-2 focus:outline-none focus:border-love"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#ba9cab] mb-2">Mô tả</label>
                  <textarea 
                    value={newMemory.description}
                    onChange={(e) => setNewMemory({ ...newMemory, description: e.target.value })}
                    placeholder="Nhập mô tả kỷ niệm..."
                    className="w-full bg-[#181114] border border-[#392830] rounded-lg text-white placeholder-[#ba9cab] px-3 py-2 focus:outline-none focus:border-love resize-none h-24"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 h-12 rounded-full border border-[#392830] text-[#ba9cab] hover:text-white hover:border-white/30 transition-all"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handleCreateMemory}
                    disabled={isCreating}
                    className="flex-1 h-12 rounded-full bg-love hover:bg-love/90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <span>Ghi lưu</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory Detail Modal */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedMemory(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#271b21] border border-[#392830] rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`px-3 py-1 rounded-full ${typeColors[selectedMemory.type]?.bg || 'bg-gray-500/20'} ${typeColors[selectedMemory.type]?.text || 'text-gray-400'} text-xs font-bold flex items-center gap-2`}>
                  {typeIcons[selectedMemory.type]}
                  {typeLabels[selectedMemory.type] || selectedMemory.type}
                </div>
                <button 
                  onClick={() => setSelectedMemory(null)}
                  className="p-2 rounded-full hover:bg-[#392830] transition-colors"
                >
                  <X className="w-5 h-5 text-[#ba9cab]" />
                </button>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">{selectedMemory.title}</h3>
              <p className="text-[#ba9cab] mb-4">{selectedMemory.description}</p>
              
              <p className="text-sm text-[#ba9cab] mb-6 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(selectedMemory.createdAt)}
              </p>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleToggleFavorite(selectedMemory.id)}
                  className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-full border transition-all ${
                    selectedMemory.isFavorite 
                      ? 'bg-love/20 border-love/30 text-love' 
                      : 'border-[#392830] text-[#ba9cab] hover:text-white hover:border-white/30'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${selectedMemory.isFavorite ? 'fill-love' : ''}`} />
                  {selectedMemory.isFavorite ? 'Đã yêu thích' : 'Yêu thích'}
                </button>
                <button 
                  onClick={() => handleDeleteMemory(selectedMemory.id)}
                  className="flex items-center justify-center w-12 h-12 rounded-full border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
