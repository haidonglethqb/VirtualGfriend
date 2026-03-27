'use client';

import { RefreshCw, Trash2 } from 'lucide-react';
import { PaginationControls } from '../components/admin-pagination-controls';
import type { Character, Pagination } from '../admin-types';

interface CharactersTabProps {
  characters: Character[];
  pagination: Pagination;
  setPagination: React.Dispatch<React.SetStateAction<Pagination>>;
  language: 'vi' | 'en';
  fetchCharacters: () => void;
  handleDeleteCharacter: (id: string) => void;
}

export function CharactersTab({
  characters, pagination, setPagination, language, fetchCharacters, handleDeleteCharacter,
}: CharactersTabProps) {
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{tr('Quản lý nhân vật', 'Characters Management')}</h2>
        <button onClick={fetchCharacters} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Nhân vật', 'Character')}</th>
              <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Chủ sở hữu', 'Owner')}</th>
              <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Cấp độ', 'Level')}</th>
              <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Độ thân mật', 'Affection')}</th>
              <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Trạng thái', 'Status')}</th>
              <th className="text-center px-6 py-4 text-gray-400 font-medium">{tr('Thao tác', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {characters.map((char) => (
              <tr key={char.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium">{char.name}</p>
                    <p className="text-sm text-gray-400">{char.personality} • {char.gender}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300">{char.user.email}</td>
                <td className="px-6 py-4 text-center">{char.level}</td>
                <td className="px-6 py-4 text-center text-pink-400">{char.affection}%</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-sm ${char.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {char.isActive ? tr('Đang hoạt động', 'Active') : tr('Không hoạt động', 'Inactive')}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleDeleteCharacter(char.id)}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                    title={tr('Xóa', 'Delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls pagination={pagination} setPagination={setPagination} language={language} />
      </div>
    </>
  );
}
