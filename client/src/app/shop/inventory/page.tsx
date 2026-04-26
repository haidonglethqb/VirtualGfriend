'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Gift, ShoppingBag, Heart, Loader2, Package
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { EmojiSvgIcon } from '@/components/ui/emoji-svg-icon';
import api from '@/services/api';
import { useLanguageStore } from '@/store/language-store';

interface InventoryItem {
  id: string;
  quantity: number;
  gift: {
    id: string;
    name: string;
    description: string;
    emoji: string;
    affectionBonus: number;
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  };
}

const rarityColors = {
  COMMON: 'border-gray-500',
  UNCOMMON: 'border-green-500',
  RARE: 'border-blue-500',
  EPIC: 'border-purple-500',
  LEGENDARY: 'border-yellow-500',
};

export default function InventoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthStore();
  const { language } = useLanguageStore();
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    fetchInventory();
  }, [isAuthenticated, router]);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<InventoryItem[]>('/shop/inventory');
      if (response.success) {
        setItems(response.data);
      }
    } catch {
      toast({
        title: tr('Lỗi', 'Error'),
        description: tr('Không thể tải túi đồ', 'Could not load inventory'),
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
      <div className="space-y-6 pb-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-love" />
              {tr('Túi đồ của bạn', 'Your inventory')}
            </h1>
            <p className="text-sm text-[#ba9cab] mt-1">
              {tr('Vào Chat để tặng quà cho người yêu', 'Open chat to send gifts to your companion')}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/shop">
              <button className="flex items-center gap-2 h-10 px-4 rounded-full bg-[#271b21] border border-[#392830] text-sm font-medium hover:bg-[#392830] transition-colors">
                <ShoppingBag className="w-4 h-4" />
                {tr('Cửa hàng', 'Shop')}
              </button>
            </Link>
            <Link href="/chat">
              <button className="flex items-center gap-2 h-10 px-4 rounded-full bg-love hover:bg-love/90 text-white text-sm font-bold transition-colors">
                <Gift className="w-4 h-4" />
                {tr('Đi tặng quà', 'Send gifts')}
              </button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-love" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-[#ba9cab] opacity-50" />
            <h2 className="text-xl font-semibold mb-2">{tr('Túi đồ trống', 'Empty inventory')}</h2>
            <p className="text-[#ba9cab] mb-6">
              {tr('Bạn chưa có quà nào. Hãy mua quà ở cửa hàng!', 'You do not have any gifts yet. Visit the shop!')}
            </p>
            <Link href="/shop">
              <button className="flex items-center gap-2 mx-auto h-11 px-6 rounded-full bg-love hover:bg-love/90 text-white font-bold transition-colors">
                <ShoppingBag className="w-4 h-4" />
                {tr('Đi mua sắm', 'Go shopping')}
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`bg-[#271b21] border-2 ${rarityColors[item.gift.rarity]}`}>
                  <CardContent className="p-4 text-center relative">
                    {/* Quantity badge */}
                    <div className="absolute top-2 right-2 bg-love text-white text-xs font-bold px-2 py-1 rounded-full">
                      x{item.quantity}
                    </div>
                    
                    <div className="mb-3 flex justify-center">
                      <EmojiSvgIcon emoji={item.gift.emoji} className="w-12 h-12" />
                    </div>
                    <h3 className="font-semibold mb-1">{item.gift.name}</h3>
                    <p className="text-xs text-[#ba9cab] mb-3">{item.gift.description}</p>
                    
                    <div className="flex items-center justify-center gap-1 text-xs text-love">
                      <Heart className="w-3 h-3 fill-love" />
                      <span>{language === 'vi' ? `+${item.gift.affectionBonus} khi tặng` : `+${item.gift.affectionBonus} when sent`}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
