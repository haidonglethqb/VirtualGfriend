'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Gem, Check, ChevronDown } from 'lucide-react';
import { Button } from './button';
import { useSceneStore, Scene } from '@/store/scene-store';
import { cn } from '@/lib/utils';

interface SceneSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSceneSelect?: (scene: Scene) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  indoor: 'Trong nhà',
  outdoor: 'Ngoài trời',
  romantic: 'Lãng mạn',
  adventure: 'Phiêu lưu',
};

const CATEGORY_COLORS: Record<string, string> = {
  indoor: 'from-amber-500/20 to-orange-500/20',
  outdoor: 'from-green-500/20 to-emerald-500/20',
  romantic: 'from-pink-500/20 to-rose-500/20',
  adventure: 'from-blue-500/20 to-cyan-500/20',
};

export function SceneSelector({ isOpen, onClose, onSceneSelect }: SceneSelectorProps) {
  const { scenes, activeSceneId, isLoading, fetchScenes, setActiveScene, unlockScene } = useSceneStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && scenes.length === 0) {
      fetchScenes();
    }
  }, [isOpen, scenes.length, fetchScenes]);

  // Group scenes by category
  const groupedScenes = scenes.reduce((acc, scene) => {
    const category = scene.category || 'indoor';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(scene);
    return acc;
  }, {} as Record<string, Scene[]>);

  const categories = Object.keys(groupedScenes);

  const handleSelectScene = async (scene: Scene) => {
    if (!scene.isUnlocked && !scene.isDefault) {
      // Try to unlock
      setUnlocking(scene.id);
      setError(null);
      
      const result = await unlockScene(scene.id);
      setUnlocking(null);
      
      if (!result.success) {
        setError(result.error || 'Failed to unlock scene');
        return;
      }
    }

    await setActiveScene(scene.id);
    onSceneSelect?.(scene);
    onClose();
  };

  const getUnlockInfo = (scene: Scene): string => {
    if (scene.isDefault || scene.isUnlocked) return '';
    
    switch (scene.unlockMethod) {
      case 'level':
        return `Cần Level ${scene.unlockValue}`;
      case 'purchase':
        return `${scene.priceGems} gems`;
      case 'event':
        return 'Sự kiện đặc biệt';
      default:
        return 'Khóa';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[85vh] bg-gradient-to-b from-gray-900 to-gray-950 
                       rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-b from-gray-900/95 to-gray-900/80 backdrop-blur-md border-b border-white/5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  🎬 Chọn Scene
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all',
                    selectedCategory === null
                      ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  )}
                >
                  Tất cả
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all',
                      selectedCategory === category
                        ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    )}
                  >
                    {CATEGORY_LABELS[category] || category}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-pink-500 border-t-transparent" />
                </div>
              ) : (
                <div className="space-y-6">
                  {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                      {error}
                    </div>
                  )}

                  {(selectedCategory ? [selectedCategory] : categories).map(category => (
                    <div key={category}>
                      <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                        {CATEGORY_LABELS[category] || category}
                        <ChevronDown className="w-4 h-4" />
                      </h3>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {groupedScenes[category]?.map(scene => (
                          <motion.button
                            key={scene.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelectScene(scene)}
                            disabled={unlocking === scene.id}
                            className={cn(
                              'relative aspect-[3/4] rounded-xl overflow-hidden group transition-all',
                              activeSceneId === scene.id && 'ring-2 ring-pink-500 ring-offset-2 ring-offset-gray-900',
                              !scene.isUnlocked && !scene.isDefault && 'opacity-80'
                            )}
                          >
                            {/* Background image or placeholder */}
                            <div className={cn(
                              'absolute inset-0 bg-gradient-to-br',
                              CATEGORY_COLORS[category] || 'from-gray-700 to-gray-800'
                            )}>
                              {scene.imageUrl && (
                                <div className="absolute inset-0">
                                  <Image
                                    src={scene.imageUrl}
                                    alt={scene.name}
                                    fill
                                    className="object-cover"
                                    loading="lazy"
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                            {/* Lock overlay */}
                            {!scene.isUnlocked && !scene.isDefault && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="bg-black/60 rounded-full p-3">
                                  <Lock className="w-6 h-6 text-white/80" />
                                </div>
                              </div>
                            )}

                            {/* Active indicator */}
                            {activeSceneId === scene.id && (
                              <div className="absolute top-2 right-2 bg-pink-500 rounded-full p-1">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}

                            {/* Unlock info */}
                            {!scene.isUnlocked && !scene.isDefault && (
                              <div className="absolute top-2 left-2 bg-black/60 rounded-full px-2 py-1 text-xs text-white/80 flex items-center gap-1">
                                {scene.unlockMethod === 'purchase' && <Gem className="w-3 h-3 text-purple-400" />}
                                {getUnlockInfo(scene)}
                              </div>
                            )}

                            {/* Scene info */}
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <h4 className="font-medium text-white text-sm truncate">
                                {scene.name}
                              </h4>
                              <p className="text-xs text-white/60 truncate mt-0.5">
                                {scene.description}
                              </p>
                            </div>

                            {/* Loading state */}
                            {unlocking === scene.id && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent" />
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SceneSelector;
