'use client';

import { AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, Zap } from 'lucide-react';
import { Modal } from '../components/admin-modal';
import type { Quest } from '../admin-types';

interface QuestsTabProps {
  quests: Quest[];
  language: 'vi' | 'en';
  fetchQuests: () => void;
  handleToggleQuest: (id: string) => void;
  handleCreateQuest: () => void;
  formData: Record<string, unknown>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  showModal: string | null;
  setShowModal: React.Dispatch<React.SetStateAction<string | null>>;
  actionLoading: boolean;
}

export function QuestsTab({
  quests, language, fetchQuests, handleToggleQuest, handleCreateQuest,
  formData, setFormData, showModal, setShowModal, actionLoading,
}: QuestsTabProps) {
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{tr('Quản lý nhiệm vụ', 'Quests Management')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { setFormData({}); setShowModal('createQuest'); }}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {tr('Tạo nhiệm vụ', 'Create Quest')}
          </button>
          <button onClick={fetchQuests} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {['DAILY', 'WEEKLY', 'ACHIEVEMENT'].map((type) => (
          <div key={type} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4 text-purple-400">{type} {tr('Nhiệm vụ', 'Quests')}</h3>
            <div className="grid gap-3">
              {quests.filter((q) => q.type === type).map((quest) => (
                <div key={quest.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
                  <div>
                    <p className="font-medium">{quest.title}</p>
                    <p className="text-sm text-gray-400">{quest.description}</p>
                    <div className="flex gap-2 mt-2">
                      {quest.rewardCoins > 0 && <span className="text-yellow-400 text-sm">{quest.rewardCoins} {tr('xu', 'coins')}</span>}
                      {quest.rewardGems > 0 && <span className="text-purple-400 text-sm">{quest.rewardGems} {tr('ngọc', 'gems')}</span>}
                      {quest.rewardXp > 0 && <span className="text-blue-400 text-sm">{quest.rewardXp} XP</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${quest.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {quest.isActive ? tr('Đang hoạt động', 'Active') : tr('Không hoạt động', 'Inactive')}
                    </span>
                    <button onClick={() => handleToggleQuest(quest.id)} className="p-2 bg-gray-600/50 rounded-lg hover:bg-gray-600">
                      <Zap className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showModal === 'createQuest' && (
          <Modal title={tr('Tạo nhiệm vụ', 'Create Quest')} onClose={() => setShowModal(null)}>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{tr('Tiêu đề', 'Title')} *</label>
                <input
                  type="text"
                  value={(formData.title as string) || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  placeholder={tr('Tiêu đề nhiệm vụ', 'Quest title')}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{tr('Mô tả', 'Description')} *</label>
                <textarea
                  value={(formData.description as string) || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  rows={2}
                  placeholder={tr('Mô tả nhiệm vụ', 'Quest description')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Loại', 'Type')}</label>
                  <select
                    value={(formData.type as string) || 'DAILY'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  >
                    <option value="DAILY">{tr('Hằng ngày', 'Daily')}</option>
                    <option value="WEEKLY">{tr('Hằng tuần', 'Weekly')}</option>
                    <option value="ACHIEVEMENT">{tr('Thành tựu', 'Achievement')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Danh mục', 'Category')}</label>
                  <select
                    value={(formData.category as string) || 'chat'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  >
                    <option value="chat">{tr('Trò chuyện', 'Chat')}</option>
                    <option value="gift">{tr('Quà tặng', 'Gift')}</option>
                    <option value="social">{tr('Xã hội', 'Social')}</option>
                    <option value="explore">{tr('Khám phá', 'Explore')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Xu', 'Coins')}</label>
                  <input
                    type="number"
                    value={(formData.rewardCoins as number) || 0}
                    onChange={(e) => setFormData({ ...formData, rewardCoins: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{tr('Ngọc', 'Gems')}</label>
                  <input
                    type="number"
                    value={(formData.rewardGems as number) || 0}
                    onChange={(e) => setFormData({ ...formData, rewardGems: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">XP</label>
                  <input
                    type="number"
                    value={(formData.rewardXp as number) || 0}
                    onChange={(e) => setFormData({ ...formData, rewardXp: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(null)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">
                {tr('Hủy', 'Cancel')}
              </button>
              <button
                onClick={handleCreateQuest}
                disabled={actionLoading}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? tr('Đang tạo...', 'Creating...') : tr('Tạo nhiệm vụ', 'Create Quest')}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
