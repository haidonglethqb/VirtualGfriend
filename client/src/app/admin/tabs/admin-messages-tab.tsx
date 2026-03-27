'use client';

import { RefreshCw } from 'lucide-react';
import { PaginationControls } from '../components/admin-pagination-controls';
import type { Message, Pagination } from '../admin-types';

interface MessagesTabProps {
  messages: Message[];
  pagination: Pagination;
  setPagination: React.Dispatch<React.SetStateAction<Pagination>>;
  language: 'vi' | 'en';
  fetchMessages: () => void;
}

export function MessagesTab({ messages, pagination, setPagination, language, fetchMessages }: MessagesTabProps) {
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          {tr('Tin nhắn', 'Messages')} ({pagination.total.toLocaleString()})
        </h2>
        <button onClick={fetchMessages} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Người dùng', 'User')}</th>
              <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Nhân vật', 'Character')}</th>
              <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Vai trò', 'Role')}</th>
              <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Nội dung', 'Content')}</th>
              <th className="text-left px-6 py-4 text-gray-400 font-medium">{tr('Ngày', 'Date')}</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((msg) => (
              <tr key={msg.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-6 py-4 text-gray-300">{msg.user.email}</td>
                <td className="px-6 py-4 text-gray-300">{msg.character?.name || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {msg.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-300 max-w-md truncate">{msg.content}</td>
                <td className="px-6 py-4 text-gray-400 text-sm">{new Date(msg.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls pagination={pagination} setPagination={setPagination} language={language} />
      </div>
    </>
  );
}
