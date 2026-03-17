'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gift, Star, Heart, ShoppingBag, 
  Sparkles, Clock, Check, X, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/app-layout';
import { AdBanner } from '@/components/ads/ad-banner';
import { useAuthStore } from '@/store/auth-store';
import { useCharacterStore } from '@/store/character-store';
import { useToast } from '@/hooks/use-toast';
import { formatNumber } from '@/lib/utils';
import api from '@/services/api';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  emoji: string;
  priceCoins: number;
  priceGems: number;
  affectionBonus: number;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  category: 'flower' | 'food' | 'jewelry' | 'toy' | 'special';
}

const rarityColors = {
  COMMON: 'border-gray-500',
  UNCOMMON: 'border-green-500',
  RARE: 'border-blue-500',
  EPIC: 'border-purple-500',
  LEGENDARY: 'border-yellow-500',
};

const rarityLabels = {
  COMMON: 'Thường',
  UNCOMMON: 'Không phổ biến',
  RARE: 'Hiếm',
  EPIC: 'Sử thi',
  LEGENDARY: 'Huyền thoại',
};

export default function ShopPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, user, setUser } = useAuthStore();
  const { character, fetchCharacter } = useCharacterStore();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'coins' | 'gems'>('coins');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    fetchShopItems();
    fetchCharacter();
  }, [isAuthenticated, router, fetchCharacter]);

  const fetchShopItems = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<ShopItem[]>('/shop');
      if (response.success) {
        setItems(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch shop items:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách quà tặng',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = activeTab === 'all' 
    ? items 
    : items.filter((item) => item.category === activeTab);

  const handlePurchase = async () => {
    if (!selectedItem || !user) return;
    
    const price = paymentMethod === 'coins' ? selectedItem.priceCoins : selectedItem.priceGems;
    const balance = paymentMethod === 'coins' ? (user.coins || 0) : (user.gems || 0);
    
    if (balance < price) {
      toast({
        title: paymentMethod === 'coins' ? 'Không đủ xu' : 'Không đủ sao',
        description: `Bạn không đủ ${paymentMethod === 'coins' ? 'xu' : 'sao'} để mua món quà này`,
        variant: 'destructive',
      });
      return;
    }

    setIsPurchasing(true);

    try {
      // Buy the gift - only add to inventory
      const buyResponse = await api.post<{ newBalance: number }>('/shop/buy', {
        giftId: selectedItem.id,
        quantity: 1,
        paymentMethod,
      });

      if (buyResponse.success) {
        // Update user balance
        if (paymentMethod === 'coins') {
          setUser({
            ...user,
            coins: buyResponse.data.newBalance,
          });
        } else {
          setUser({
            ...user,
            gems: buyResponse.data.newBalance,
          });
        }

        setShowSuccess(true);

        setTimeout(() => {
          setShowSuccess(false);
          setSelectedItem(null);
        }, 2000);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Không thể mua quà';
      toast({
        title: 'Lỗi',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-love" />
              Cửa hàng quà tặng
            </h1>
            <p className="text-sm text-[#ba9cab] mt-1">
              Mua quà và tặng trong Chat
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/shop/inventory">
              <button className="flex items-center gap-2 h-10 px-4 rounded-full bg-[#271b21] border border-[#392830] text-sm font-medium hover:bg-[#392830] transition-colors">
                <Gift className="w-4 h-4" />
                Túi đồ
              </button>
            </Link>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#271b21] border border-[#392830]">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-sm">{formatNumber(user?.gems || 0)}</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-love" />
          </div>
        ) : (
        <>
          {/* Category tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full overflow-x-auto flex justify-start">
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="flower">🌸 Hoa</TabsTrigger>
              <TabsTrigger value="food">🍰 Đồ ăn</TabsTrigger>
              <TabsTrigger value="jewelry">💎 Trang sức</TabsTrigger>
              <TabsTrigger value="toy">🧸 Đồ chơi</TabsTrigger>
              <TabsTrigger value="special">✨ Đặc biệt</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <AdBanner placement="shop-between" className="mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className={`glass cursor-pointer hover:shadow-love transition-all border-2 ${
                        rarityColors[item.rarity]
                      } ${selectedItem?.id === item.id ? 'ring-2 ring-love' : ''}`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="text-5xl mb-3">{item.emoji}</div>
                        <h3 className="font-semibold mb-1">{item.name}</h3>
                        <p className="text-xs text-muted-foreground mb-3">{item.description}</p>
                        
                        <div className="flex items-center justify-center gap-3 mb-2">
                          {item.priceCoins > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              <span className="text-sm font-bold">{item.priceCoins}</span>
                            </div>
                          )}
                          {item.priceGems > 0 && (
                            <div className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-purple-500" />
                              <span className="text-sm font-bold">{item.priceGems}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-center gap-1 text-xs text-love">
                          <Heart className="w-3 h-3 fill-love" />
                          <span>+{item.affectionBonus}</span>
                        </div>

                        <div className={`text-xs mt-2 px-2 py-0.5 rounded-full inline-block ${
                          item.rarity === 'LEGENDARY' ? 'bg-yellow-500/20 text-yellow-500' :
                          item.rarity === 'EPIC' ? 'bg-purple-500/20 text-purple-500' :
                          item.rarity === 'RARE' ? 'bg-blue-500/20 text-blue-500' :
                          item.rarity === 'UNCOMMON' ? 'bg-green-500/20 text-green-500' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {rarityLabels[item.rarity]}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-[#ba9cab]">
                  <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Không có quà tặng nào</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          </>
          )}

        {/* Purchase modal */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => !isPurchasing && setSelectedItem(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#271b21] border border-[#392830] rounded-2xl p-6 max-w-sm w-full text-center"
              >
                {showSuccess ? (
                  <div className="py-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-love to-pink-600 flex items-center justify-center mb-4"
                    >
                      <Check className="w-10 h-10 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-bold mb-2">Mua thành công!</h3>
                    <p className="text-[#ba9cab]">
                      {selectedItem.name} đã được thêm vào túi đồ của bạn! 🎁
                    </p>
                    <p className="text-sm text-[#ba9cab] mt-2">
                      Vào Chat để tặng quà cho {character?.name || 'người yêu'}
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#392830] flex items-center justify-center hover:bg-[#392830]/80 transition-colors"
                      onClick={() => setSelectedItem(null)}
                    >
                      <X className="w-5 h-5 text-[#ba9cab]" />
                    </button>

                    <div className="text-7xl mb-4">{selectedItem.emoji}</div>
                    <h3 className="text-xl font-bold mb-2">{selectedItem.name}</h3>
                    <p className="text-[#ba9cab] mb-4">{selectedItem.description}</p>

                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-love">
                          <Heart className="w-5 h-5 fill-love" />
                          <span className="text-xl font-bold">+{selectedItem.affectionBonus}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Thân mật khi tặng</p>
                      </div>
                    </div>

                    {/* Payment method selection */}
                    <div className="flex gap-2 mb-4">
                      {selectedItem.priceCoins > 0 && (
                        <button
                          className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-full font-bold transition-all ${
                            paymentMethod === 'coins' 
                              ? 'bg-yellow-500 text-black' 
                              : 'bg-[#392830] text-white border border-[#392830]'
                          }`}
                          onClick={() => setPaymentMethod('coins')}
                        >
                          <Star className="w-4 h-4 fill-current" />
                          {selectedItem.priceCoins} xu
                        </button>
                      )}
                      {selectedItem.priceGems > 0 && (
                        <button
                          className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-full font-bold transition-all ${
                            paymentMethod === 'gems' 
                              ? 'bg-purple-500 text-white' 
                              : 'bg-[#392830] text-white border border-[#392830]'
                          }`}
                          onClick={() => setPaymentMethod('gems')}
                        >
                          <Sparkles className="w-4 h-4" />
                          {selectedItem.priceGems} sao
                        </button>
                      )}
                    </div>

                    {(() => {
                      const price = paymentMethod === 'coins' ? selectedItem.priceCoins : selectedItem.priceGems;
                      const balance = paymentMethod === 'coins' ? (user?.coins || 0) : (user?.gems || 0);
                      const insufficientFunds = balance < price;
                      
                      return (
                        <>
                          {insufficientFunds && (
                            <p className="text-red-400 text-sm mb-4">
                              Bạn không đủ {paymentMethod === 'coins' ? 'xu' : 'sao'} để mua món quà này
                            </p>
                          )}

                          <button
                            className="w-full h-12 rounded-full bg-love hover:bg-love/90 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handlePurchase}
                            disabled={isPurchasing || insufficientFunds}
                          >
                            {isPurchasing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang mua...
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-4 h-4" />
                                Mua vào túi đồ
                              </>
                            )}
                          </button>
                        </>
                      );
                    })()}
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
