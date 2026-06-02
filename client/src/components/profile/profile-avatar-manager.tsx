'use client';

import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Check, Loader2, Trash2, Upload, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguageStore } from '@/store/language-store';
import { userAvatarApi, UserAvatarGallery } from '@/services/user-avatar';

interface ProfileAvatarManagerProps {
  compact?: boolean;
  requireSelection?: boolean;
  onAvatarChange?: (url: string | null) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function ProfileAvatarManager({
  compact = false,
  requireSelection = false,
  onAvatarChange,
}: ProfileAvatarManagerProps) {
  const { toast } = useToast();
  const { language } = useLanguageStore();
  const tr = useCallback((vi: string, en: string) => (language === 'vi' ? vi : en), [language]);
  const [gallery, setGallery] = useState<UserAvatarGallery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const loadGallery = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await userAvatarApi.list();
      setGallery(data);
      onAvatarChange?.(data.activeAvatarUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : tr('Không thể tải avatar', 'Unable to load avatars');
      toast({ title: tr('Lỗi', 'Error'), description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [onAvatarChange, toast, tr]);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  async function runAction(action: () => Promise<string | null | undefined>) {
    try {
      setIsBusy(true);
      const activeAvatarUrl = await action();
      const data = await userAvatarApi.list();
      setGallery(data);
      onAvatarChange?.(activeAvatarUrl ?? data.activeAvatarUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : tr('Không thể cập nhật avatar', 'Unable to update avatar');
      toast({ title: tr('Lỗi', 'Error'), description: message, variant: 'destructive' });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      toast({ title: tr('File không hợp lệ', 'Invalid file'), description: tr('Chỉ hỗ trợ PNG, JPEG, WebP.', 'Only PNG, JPEG, and WebP are supported.'), variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: tr('File quá lớn', 'File too large'), description: tr('Dung lượng tối đa là 5 MB.', 'Maximum file size is 5 MB.'), variant: 'destructive' });
      return;
    }

    await runAction(async () => (await userAvatarApi.upload(file)).url);
  }

  const activeUrl = gallery?.activeAvatarUrl || null;
  const quota = gallery?.limits;
  const quotaText = quota
    ? quota.isUnlimited
      ? tr(`${quota.used} đã upload / không giới hạn`, `${quota.used} uploaded / unlimited`)
      : tr(`${quota.used}/${quota.max} avatar đã upload`, `${quota.used}/${quota.max} avatars uploaded`)
    : '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-[#ba9cab]">
        <Loader2 className="w-5 h-5 animate-spin" />
        {tr('Đang tải avatar...', 'Loading avatars...')}
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-full bg-[#181114] border border-[#392830]">
          {activeUrl ? (
            <Image src={activeUrl} alt="Profile avatar" fill unoptimized className="object-cover" sizes="80px" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <User className="w-9 h-9 text-[#725462]" />
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold">{tr('Avatar hồ sơ', 'Profile avatar')}</p>
          <p className="text-sm text-[#ba9cab]">{quotaText}</p>
          {requireSelection && !activeUrl && (
            <p className="mt-1 text-sm text-love">{tr('Chọn một avatar để tiếp tục.', 'Choose an avatar to continue.')}</p>
          )}
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#f4e7ee]">{tr('Avatar mặc định', 'Default avatars')}</h3>
          <label className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            quota?.canUpload ? 'bg-love hover:bg-love/90 cursor-pointer' : 'bg-[#392830] text-[#ba9cab] cursor-not-allowed'
          }`}>
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {tr('Upload', 'Upload')}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={isBusy || !quota?.canUpload}
              onChange={handleUpload}
            />
          </label>
        </div>
        {!quota?.canUpload && (
          <p className="mb-3 text-xs text-love">
            {tr('Đã chạm giới hạn upload của gói hiện tại.', 'Current tier upload limit reached.')}
          </p>
        )}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {gallery?.defaultAvatars.map((avatar) => (
            <button
              key={avatar.id}
              disabled={isBusy}
              onClick={() => runAction(async () => (await userAvatarApi.selectDefault(avatar.url)).activeAvatarUrl)}
              className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-[#181114] transition-all ${
                activeUrl === avatar.url ? 'border-love' : 'border-[#392830] hover:border-[#725462]'
              }`}
            >
              <Image src={avatar.url} alt={avatar.label} fill unoptimized className="object-cover" sizes="96px" />
              {activeUrl === avatar.url && <SelectedBadge />}
            </button>
          ))}
        </div>
      </section>

      {!!gallery?.uploadedAvatars.length && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-[#f4e7ee]">{tr('Avatar đã upload', 'Uploaded avatars')}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {gallery.uploadedAvatars.map((avatar) => (
              <div key={avatar.id} className="group relative aspect-square overflow-hidden rounded-xl border border-[#392830] bg-[#181114]">
                <button
                  disabled={isBusy}
                  onClick={() => runAction(async () => (await userAvatarApi.selectUploaded(avatar.id)).activeAvatarUrl)}
                  className="absolute inset-0"
                >
                  <Image src={avatar.url} alt="Uploaded avatar" fill unoptimized className="object-cover" sizes="96px" />
                  {activeUrl === avatar.url && <SelectedBadge />}
                </button>
                <button
                  disabled={isBusy}
                  onClick={() => runAction(async () => (await userAvatarApi.deleteUploaded(avatar.id)).activeAvatarUrl)}
                  className="absolute bottom-1 right-1 rounded-lg bg-black/70 p-1.5 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SelectedBadge() {
  return <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-love text-white"><Check className="h-4 w-4" /></span>;
}
