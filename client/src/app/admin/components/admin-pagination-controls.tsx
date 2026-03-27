'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Pagination } from '../admin-types';

interface PaginationControlsProps {
  pagination: Pagination;
  setPagination: React.Dispatch<React.SetStateAction<Pagination>>;
  language: 'vi' | 'en';
}

export function PaginationControls({ pagination, setPagination, language }: PaginationControlsProps) {
  const isVi = language === 'vi';
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700/50">
      <p className="text-sm text-gray-400">
        {isVi ? 'Hiển thị' : 'Showing'}{' '}
        {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}{' '}
        {isVi ? 'đến' : 'to'}{' '}
        {Math.min(pagination.page * pagination.limit, pagination.total)}{' '}
        {isVi ? 'trong tổng số' : 'of'} {pagination.total}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
          disabled={pagination.page === 1}
          className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="px-4 py-2 bg-gray-700/50 rounded-lg">
          {pagination.page} / {pagination.totalPages || 1}
        </span>
        <button
          onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
          disabled={pagination.page >= pagination.totalPages}
          className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
