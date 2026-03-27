'use client';

import { AnimatePresence } from 'framer-motion';
import { Crown, RefreshCw, Search, Edit2, Key, Gift } from 'lucide-react';
import { PaginationControls } from '../components/admin-pagination-controls';
import { Modal } from '../components/admin-modal';
import type { User, Pagination } from '../admin-types';

interface UsersTabProps {
  users: User[];
  pagination: Pagination;
  setPagination: React.Dispatch<React.SetStateAction<Pagination>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  language: 'vi' | 'en';
  fetchUsers: () => void;
  formData: Record<string, unknown>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  showModal: string | null;
  setShowModal: React.Dispatch<React.SetStateAction<string | null>>;
  selectedItem: User | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<User | null>>;
  handleUpdateUser: () => void;
  handleResetPassword: (userId: string) => void;
  handleGiveRewards: (userId: string) => void;
  actionLoading: boolean;
}

export function UsersTab({
  users, pagination, setPagination, searchQuery, setSearchQuery,
  language, fetchUsers, formData, setFormData, showModal, setShowModal,
  selectedItem, setSelectedItem, handleUpdateUser, handleResetPassword,
  handleGiveRewards, actionLoading,
}: UsersTabProps) {
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{tr('Quản lý người dùng', 'Users Management')}</h2>
        <button onClick={fetchUsers} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
            placeholder={tr('Tìm theo email, tên người dùng...', 'Search by email, username...')}
            className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Người dùng', 'User')}</th>
              <th className="text-left px-6 py-4 text-gray-400 font-medium">Email</th>
              <th className="text-center px-6 py-4 text-gray-400 font-medium">Premium</th>
              <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Xu', 'Coins')}</th>
              <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Ngọc', 'Gems')}</th>
              <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Thao tác', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
                      {(user.displayName || user.username || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{user.displayName || user.username}</p>
                      <p className="text-sm text-gray-400">@{user.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300">{user.email}</td>
                <td className="px-6 py-4 text-center">
                  {user.isPremium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                      <Crown className="w-3 h-3" />
                      {user.premiumTier || 'Premium'}
                    </span>
                  ) : (
                    <span className="text-gray-500">{tr('Miễn phí', 'Free')}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center text-yellow-400">{user.coins}</td>
                <td className="px-6 py-4 text-center text-purple-400">{user.gems}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedItem(user);
                        setFormData({ coins: user.coins, gems: user.gems, isPremium: user.isPremium });
                        setShowModal('editUser');
                      }}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                      title={tr('Sửa', 'Edit')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleResetPassword(user.id)}
                      className="p-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30"
                      title={tr('Đặt lại mật khẩu', 'Reset Password')}
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleGiveRewards(user.id)}
                      className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                      title={tr('Tặng thưởng', 'Give Rewards')}
                    >
                      <Gift className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls pagination={pagination} setPagination={setPagination} language={language} />
      </div>

      <AnimatePresence>
        {showModal === 'editUser' && selectedItem && (
          <Modal title={tr('Chỉnh sửa người dùng', 'Edit User')} onClose={() => setShowModal(null)}>
            <p className="text-gray-400 mb-4">{selectedItem.email}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">{tr('Xu', 'Coins')}</label>
                <input
                  type="number"
                  value={(formData.coins as number) || 0}
                  onChange={(e) => setFormData({ ...formData, coins: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">{tr('Ngọc', 'Gems')}</label>
                <input
                  type="number"
                  value={(formData.gems as number) || 0}
                  onChange={(e) => setFormData({ ...formData, gems: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPremium"
                  checked={(formData.isPremium as boolean) || false}
                  onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600"
                />
                <label htmlFor="isPremium" className="text-gray-300">{tr('Trạng thái Premium', 'Premium Status')}</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(null)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">
                {tr('Hủy', 'Cancel')}
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={actionLoading}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? tr('Đang lưu...', 'Saving...') : tr('Lưu thay đổi', 'Save Changes')}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
