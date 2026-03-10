'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Edit2, Trash2, Plus, Save, X, 
  User, Heart, Briefcase, Home, Star, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface Fact {
  id: string;
  key: string;
  value: string;
  category: string;
  importance: number;
  source: string;
  updatedAt: string;
}

interface GroupedFacts {
  [category: string]: Fact[];
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  personal: { label: 'Cá nhân', icon: <User className="w-4 h-4" />, color: 'from-blue-500/20 to-cyan-500/20' },
  preference: { label: 'Sở thích', icon: <Star className="w-4 h-4" />, color: 'from-yellow-500/20 to-amber-500/20' },
  relationship: { label: 'Quan hệ', icon: <Heart className="w-4 h-4" />, color: 'from-pink-500/20 to-rose-500/20' },
  work: { label: 'Công việc', icon: <Briefcase className="w-4 h-4" />, color: 'from-purple-500/20 to-indigo-500/20' },
  life: { label: 'Cuộc sống', icon: <Home className="w-4 h-4" />, color: 'from-green-500/20 to-emerald-500/20' },
  other: { label: 'Khác', icon: <Tag className="w-4 h-4" />, color: 'from-gray-500/20 to-gray-600/20' },
};

interface FactItemProps {
  fact: Fact;
  onEdit: (fact: Fact, newValue: string) => Promise<void>;
  onDelete: (factId: string) => Promise<void>;
}

function FactItem({ fact, onEdit, onDelete }: FactItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(fact.value);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    if (!editValue.trim() || editValue === fact.value) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      await onEdit(fact, editValue);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc muốn xóa thông tin này?')) return;
    
    setIsDeleting(true);
    await onDelete(fact.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/40 mb-1 truncate">{fact.key}</p>
          
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 h-8 text-sm bg-black/30 border-white/20"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditValue(fact.value);
                  }
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/20"
              >
                <Save className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setEditValue(fact.value);
                }}
                className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-white">{fact.value}</p>
          )}
        </div>

        {!isEditing && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded',
          fact.source === 'user_added' ? 'bg-green-500/20 text-green-400' :
          fact.source === 'user_edited' ? 'bg-blue-500/20 text-blue-400' :
          fact.source === 'ai_inline' ? 'bg-amber-500/20 text-amber-400' :
          'bg-purple-500/20 text-purple-400'
        )}>
          {fact.source === 'user_added' ? 'Tự thêm' :
           fact.source === 'user_edited' ? 'Đã sửa' :
           fact.source === 'ai_inline' ? 'AI tự động' : 'AI học'}
        </span>
        <span className="text-xs text-white/30">
          {new Date(fact.updatedAt).toLocaleDateString('vi-VN')}
        </span>
      </div>
    </motion.div>
  );
}

export function FactsManager() {
  const { toast } = useToast();
  const [facts, setFacts] = useState<Fact[]>([]);
  const [grouped, setGrouped] = useState<GroupedFacts>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFact, setNewFact] = useState({ key: '', value: '', category: 'other' });
  const [isAdding, setIsAdding] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const fetchFacts = async () => {
    try {
      const response = await api.get<{ facts: Fact[]; grouped: GroupedFacts }>('/character/facts');
      if (response.success) {
        setFacts(response.data.facts);
        setGrouped(response.data.grouped);
      }
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFacts();
  }, []);

  const handleEdit = async (fact: Fact, newValue: string) => {
    try {
      await api.patch(`/character/facts/${fact.id}`, { value: newValue });
      setFacts(prev => prev.map(f => 
        f.id === fact.id ? { ...f, value: newValue, source: 'user_edited' } : f
      ));
      toast({ title: 'Đã cập nhật', description: 'Thông tin đã được lưu' });
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (factId: string) => {
    try {
      await api.delete(`/character/facts/${factId}`);
      setFacts(prev => prev.filter(f => f.id !== factId));
      toast({ title: 'Đã xóa', description: 'Thông tin đã được xóa' });
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa',
        variant: 'destructive',
      });
    }
  };

  const handleAdd = async () => {
    if (!newFact.key.trim() || !newFact.value.trim()) return;
    
    setIsAdding(true);
    try {
      const response = await api.post<Fact>('/character/facts', newFact);
      if (response.success) {
        await fetchFacts();
        setNewFact({ key: '', value: '', category: 'other' });
        setShowAddForm(false);
        toast({ 
          title: response.data ? 'Đã thêm' : 'Đã cập nhật', 
          description: 'Thông tin đã được lưu' 
        });
      }
    } catch {
      toast({
        title: 'Lỗi',
        description: 'Không thể thêm thông tin',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const filteredCategories = activeCategory 
    ? { [activeCategory]: grouped[activeCategory] || [] }
    : grouped;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20">
            <Brain className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Trí nhớ AI</h2>
            <p className="text-sm text-white/60">{facts.length} thông tin đã học</p>
          </div>
        </div>
        
        <Button
          onClick={() => setShowAddForm(true)}
          size="sm"
          className="bg-gradient-to-r from-pink-500 to-purple-500"
        >
          <Plus className="w-4 h-4 mr-1" />
          Thêm
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all',
            activeCategory === null
              ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          )}
        >
          Tất cả ({facts.length})
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const count = grouped[key]?.length || 0;
          if (count === 0) return null;
          
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all flex items-center gap-1.5',
                activeCategory === key
                  ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              )}
            >
              {config.icon}
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Add Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#271b21] border border-[#392830] rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-pink-400" />
                Thêm thông tin mới
              </h3>
              
              <div className="space-y-3">
                <Input
                  placeholder="Tên thông tin (VD: Màu yêu thích)"
                  value={newFact.key}
                  onChange={(e) => setNewFact(prev => ({ ...prev, key: e.target.value }))}
                  className="bg-black/30 border-white/20"
                />
                <Input
                  placeholder="Giá trị (VD: Màu hồng)"
                  value={newFact.value}
                  onChange={(e) => setNewFact(prev => ({ ...prev, value: e.target.value }))}
                  className="bg-black/30 border-white/20"
                />
                <select
                  value={newFact.category}
                  onChange={(e) => setNewFact(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md bg-black/30 border border-white/20 text-white text-sm"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                  className="text-white/60"
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={isAdding || !newFact.key.trim() || !newFact.value.trim()}
                  className="bg-gradient-to-r from-pink-500 to-purple-500"
                >
                  {isAdding ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Facts List */}
      <div className="space-y-6">
        {Object.entries(filteredCategories).map(([category, categoryFacts]) => {
          if (!categoryFacts || categoryFacts.length === 0) return null;
          
          const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
          
          return (
            <div key={category}>
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r mb-3',
                config.color
              )}>
                {config.icon}
                <span className="text-sm font-medium text-white">{config.label}</span>
                <span className="text-xs text-white/40">({categoryFacts.length})</span>
              </div>
              
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {categoryFacts.map(fact => (
                    <FactItem
                      key={fact.id}
                      fact={fact}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {facts.length === 0 && !isLoading && (
        <div className="text-center py-12 text-white/40">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Chưa có thông tin nào</p>
          <p className="text-sm mt-1">AI sẽ tự học khi bạn trò chuyện</p>
        </div>
      )}
    </div>
  );
}

export default FactsManager;
