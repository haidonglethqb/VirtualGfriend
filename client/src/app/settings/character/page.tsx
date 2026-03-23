'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Check, Heart, User, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { useCharacterStore, CharacterTemplate } from '@/store/character-store';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import { useLanguageStore } from '@/store/language-store';

export default function CharacterSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const { character } = useCharacterStore();
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<CharacterTemplate[]>([]);
  const [showTemplateGrid, setShowTemplateGrid] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    personality: '',
    templateId: '',
    avatarUrl: '',
  });

  const personalities = [
    { value: 'caring', label: tr('Quan tâm', 'Caring'), description: tr('Luôn chăm sóc và lo lắng cho bạn', 'Always caring and attentive') },
    { value: 'playful', label: tr('Vui vẻ', 'Playful'), description: tr('Năng động, hay đùa và vui tính', 'Energetic, humorous, and fun') },
    { value: 'shy', label: tr('Nhút nhát', 'Shy'), description: tr('Dễ thương, ngại ngùng và dễ xấu hổ', 'Cute, bashful, and a little shy') },
    { value: 'passionate', label: tr('Nhiệt huyết', 'Passionate'), description: tr('Mạnh mẽ, quyết đoán và đam mê', 'Strong, decisive, and passionate') },
    { value: 'intellectual', label: tr('Trí tuệ', 'Intellectual'), description: tr('Thông minh, sâu sắc và triết lý', 'Smart, thoughtful, and philosophical') },
  ];

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await api.get<CharacterTemplate[]>('/character/templates');
        if (response.success && response.data) {
          setTemplates(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      }
    };

    fetchTemplates();
  }, []);

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
        templateId: character.templateId || '',
        avatarUrl: character.avatarUrl || '',
      });
    }
  }, [isAuthenticated, router, character]);

  const handleSelectTemplate = (template: CharacterTemplate) => {
    setFormData((prev) => ({
      ...prev,
      templateId: template.id,
      avatarUrl: template.avatarUrl,
    }));
    setShowTemplateGrid(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Vui lòng nhập tên nhân vật', 'Please enter a character name'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      const payload: Record<string, string> = {
        name: formData.name,
        bio: formData.bio,
        personality: formData.personality,
      };

      if (formData.templateId) payload.templateId = formData.templateId;
      if (formData.avatarUrl) payload.avatarUrl = formData.avatarUrl;

      const response = await api.patch('/character', payload);
      if (response.success) {
        const { fetchCharacter: refetch } = useCharacterStore.getState();
        refetch();

        toast({
          title: tr('Thành công', 'Success'),
          description: tr('Thông tin nhân vật đã được cập nhật', 'Character information updated'),
        });

        router.push('/settings');
      }
    } catch {
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Không thể cập nhật thông tin nhân vật', 'Unable to update character information'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTemplate = templates.find((item) => item.id === formData.templateId);
  const displayAvatarUrl = formData.avatarUrl || character?.avatarUrl;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-8">
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
          <h1 className="text-2xl font-bold">{tr('Người yêu ảo của tôi', 'My virtual partner')}</h1>
        </motion.div>

        {character && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-gradient-to-br from-[#271b21] to-[#392830] border border-love/20 p-6 mb-6"
          >
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 border-2 border-love/30">
                {displayAvatarUrl ? (
                  <Image src={displayAvatarUrl} alt={character.name} fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-love to-pink-600 flex items-center justify-center text-3xl font-bold text-white">
                    {character.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-bold">{character.name}</h2>
                <p className="text-[#ba9cab] text-sm">
                  {tr('Mức độ yêu thích', 'Affection level')}: {character.affection || 0}
                </p>
                {selectedTemplate && (
                  <p className="text-love text-xs mt-1">
                    {tr('Nhân vật', 'Character')}: {selectedTemplate.name}
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowTemplateGrid((prev) => !prev)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#181114] border border-[#392830] hover:border-love/50 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4 text-love" />
                {tr('Đổi nhân vật', 'Change character')}
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {showTemplateGrid && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="rounded-2xl bg-[#271b21] border border-[#392830] p-6">
                <h3 className="text-lg font-bold mb-4">{tr('Chọn nhân vật mới', 'Choose a new character')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={`relative group rounded-xl border-2 p-3 transition-all text-center ${
                        formData.templateId === template.id
                          ? 'border-love bg-love/10 shadow-[0_0_15px_rgba(244,37,140,0.15)]'
                          : 'border-[#392830] bg-[#392830]/30 hover:border-[#4a3640]'
                      }`}
                    >
                      {formData.templateId === template.id && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-love flex items-center justify-center z-10">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}

                      <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-[#181114] mb-2">
                        {template.avatarUrl ? (
                          <Image
                            src={template.avatarUrl}
                            alt={template.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            sizes="(max-width: 640px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <User className="w-10 h-10 text-[#4a3640]" />
                          </div>
                        )}
                      </div>

                      <div className="font-bold text-xs">{template.name}</div>
                      <div className="text-[10px] text-[#ba9cab] mt-0.5 line-clamp-1">{template.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-[#271b21] border border-[#392830] p-6 space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-[#ba9cab] mb-2">{tr('Tên nhân vật', 'Character name')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={tr('Nhập tên nhân vật...', 'Enter character name...')}
              className="w-full bg-[#181114] border border-[#392830] rounded-lg text-white placeholder-[#ba9cab] px-4 py-3 focus:outline-none focus:border-love transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#ba9cab] mb-2">{tr('Mô tả', 'Description')}</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder={tr('Viết mô tả về nhân vật...', 'Write a character description...')}
              className="w-full bg-[#181114] border border-[#392830] rounded-lg text-white placeholder-[#ba9cab] px-4 py-3 focus:outline-none focus:border-love transition-colors resize-none h-24"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#ba9cab] mb-2">{tr('Tính cách', 'Personality')}</label>
            <div className="grid grid-cols-1 gap-2">
              {personalities.map((pers) => (
                <button
                  key={pers.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, personality: pers.value }))}
                  className={`w-full p-3 rounded-lg border transition-all text-left ${
                    formData.personality === pers.value
                      ? 'border-love bg-love/10'
                      : 'border-[#392830] bg-[#181114] hover:border-[#4a3640]'
                  }`}
                >
                  <div className="font-medium text-sm">{pers.label}</div>
                  <div className="text-xs text-[#ba9cab]">{pers.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/settings" className="flex-1">
              <button className="w-full h-12 rounded-lg border border-[#392830] text-[#ba9cab] hover:text-white hover:border-white/30 transition-all">
                {tr('Hủy', 'Cancel')}
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
                  <span>{tr('Đang lưu...', 'Saving...')}</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>{tr('Lưu thay đổi', 'Save changes')}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
