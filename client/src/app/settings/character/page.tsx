'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Check, Heart } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { useCharacterStore } from '@/store/character-store';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

export default function CharacterSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const { character } = useCharacterStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    personality: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    if (character) {
      setFormData({
        name: character.name || '',
        bio: character.bio || '',
        personality: character.personality || '',
      });
    }
  }, [isAuthenticated, router, character]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tên nhân vật',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.patch('/character', formData);
      if (response.success) {
        // Refresh character store to avoid stale state
        const { fetchCharacter: refetch } = useCharacterStore.getState();
        refetch();
        toast({
          title: 'Thành công',
          description: 'Thông tin nhân vật đã được cập nhật',
        });
        router.push('/settings');
      }
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật thông tin nhân vật',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Link href="/settings">
            <button className="p-2 rounded-lg hover:bg-[#392830] transition-colors">
              <ArrowLeft className="w-5 h-5 text-love" />
            </button>
          </Link>
          <Heart className="w-6 h-6 text-love" />
          <h1 className="text-2xl font-bold">Người yêu ảo của tôi</h1>
        </motion.div>

        {/* Character Info */}
        {character && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-gradient-to-br from-[#271b21] to-[#392830] border border-love/20 p-6 mb-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-love to-pink-600 flex items-center justify-center text-3xl font-bold text-white border-2 border-love/30">
                {character.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{character.name}</h2>
                <p className="text-[#ba9cab]">Mức độ yêu thích: {character.affection || 0}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-[#271b21] border border-[#392830] p-6 space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-[#ba9cab] mb-2">
              Tên nhân vật
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nhập tên nhân vật..."
              className="w-full bg-[#181114] border border-[#392830] rounded-lg text-white placeholder-[#ba9cab] px-4 py-3 focus:outline-none focus:border-love transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#ba9cab] mb-2">
              Mô tả
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Viết mô tả về nhân vật..."
              className="w-full bg-[#181114] border border-[#392830] rounded-lg text-white placeholder-[#ba9cab] px-4 py-3 focus:outline-none focus:border-love transition-colors resize-none h-24"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#ba9cab] mb-2">
              Tính cách
            </label>
            <textarea
              value={formData.personality}
              onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
              placeholder="Mô tả tính cách của nhân vật..."
              className="w-full bg-[#181114] border border-[#392830] rounded-lg text-white placeholder-[#ba9cab] px-4 py-3 focus:outline-none focus:border-love transition-colors resize-none h-24"
            />
          </div>

          <div className="flex gap-3">
            <Link href="/settings" className="flex-1">
              <button className="w-full h-12 rounded-lg border border-[#392830] text-[#ba9cab] hover:text-white hover:border-white/30 transition-all">
                Hủy
              </button>
            </Link>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 h-12 rounded-lg bg-love hover:bg-love/90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
