'use client';

import { RefreshCw, Database, Clock, HardDrive } from 'lucide-react';
import type { SystemInfo } from '../admin-types';

interface SystemTabProps {
  systemInfo: SystemInfo;
  systemWindowMinutes: number;
  setSystemWindowMinutes: React.Dispatch<React.SetStateAction<number>>;
  systemTableLimit: number;
  setSystemTableLimit: React.Dispatch<React.SetStateAction<number>>;
  fetchSystemInfo: () => void;
  handleCleanup: (action: string) => void;
  handleCleanupDuplicates: () => void;
  actionLoading: boolean;
  language: 'vi' | 'en';
}

export function SystemTab({
  systemInfo, systemWindowMinutes, setSystemWindowMinutes, systemTableLimit, setSystemTableLimit,
  fetchSystemInfo, handleCleanup, handleCleanupDuplicates, actionLoading, language,
}: SystemTabProps) {
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{tr('Thông tin hệ thống', 'System Information')}</h2>
        <button onClick={fetchSystemInfo} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <select
          value={systemWindowMinutes}
          onChange={(e) => setSystemWindowMinutes(Number(e.target.value))}
          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm"
        >
          <option value={15}>{tr('15 phút', '15 minutes')}</option>
          <option value={30}>{tr('30 phút', '30 minutes')}</option>
          <option value={60}>{tr('60 phút', '60 minutes')}</option>
          <option value={360}>{tr('6 giờ', '6 hours')}</option>
          <option value={1440}>{tr('24 giờ', '24 hours')}</option>
        </select>
        <input
          type="number"
          min={5}
          max={100}
          value={systemTableLimit}
          onChange={(e) => setSystemTableLimit(Math.min(100, Math.max(5, Number(e.target.value) || 20)))}
          className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-xl text-white text-sm"
          placeholder={tr('Số bảng', 'Table limit')}
        />
        <button
          onClick={fetchSystemInfo}
          className="px-3 py-2 bg-purple-500 rounded-xl text-white text-sm hover:bg-purple-600"
        >
          {tr('Cập nhật monitor', 'Refresh monitor')}
        </button>
        <div className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-xs text-gray-300 flex items-center">
          {tr('Window', 'Window')}: {systemInfo.filtersApplied?.windowMinutes || systemWindowMinutes}m
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-blue-400" />
            <span className="text-gray-400">{tr('Dung lượng cơ sở dữ liệu', 'Database Size')}</span>
          </div>
          <p className="text-2xl font-bold">{systemInfo.databaseSize}</p>
        </div>
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-green-400" />
            <span className="text-gray-400">{tr('Thời gian hoạt động', 'Uptime')}</span>
          </div>
          <p className="text-2xl font-bold">{Math.floor(systemInfo.uptime / 3600)}h {Math.floor((systemInfo.uptime % 3600) / 60)}m</p>
        </div>
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-5 h-5 text-purple-400" />
            <span className="text-gray-400">{tr('Bộ nhớ', 'Memory')}</span>
          </div>
          <p className="text-2xl font-bold">{Math.round(systemInfo.memoryUsage.heapUsed / 1024 / 1024)} MB</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
          <p className="text-xs text-gray-400 mb-1">{tr('Kết nối DB (active/total)', 'DB connections (active/total)')}</p>
          <p className="text-lg font-bold text-cyan-400">{systemInfo.connections?.active || 0}/{systemInfo.connections?.total || 0}</p>
        </div>
        <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
          <p className="text-xs text-gray-400 mb-1">{tr('Cache hit rate', 'Cache hit rate')}</p>
          <p className="text-lg font-bold text-emerald-400">{systemInfo.dbPerformance?.cacheHitRate || 0}%</p>
        </div>
        <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
          <p className="text-xs text-gray-400 mb-1">{tr('Messages trong window', 'Messages in window')}</p>
          <p className="text-lg font-bold text-green-400">{(systemInfo.realtimeActivity?.messages || 0).toLocaleString()}</p>
        </div>
        <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
          <p className="text-xs text-gray-400 mb-1">{tr('Error events trong window', 'Error events in window')}</p>
          <p className="text-lg font-bold text-red-400">{(systemInfo.errorStats || []).reduce((sum, item) => sum + item.count, 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="font-semibold mb-4">{tr('Thống kê bảng dữ liệu', 'Table Statistics')}</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {systemInfo.tables.map((table) => (
              <div key={table.name} className="flex justify-between p-2 bg-gray-700/30 rounded">
                <div>
                  <p className="text-gray-300">{table.name}</p>
                  <p className="text-xs text-gray-500">seq:{table.seqScan || 0} idx:{table.idxScan || 0} dead:{table.deadRows || 0}</p>
                </div>
                <span className="text-gray-400">{table.rows.toLocaleString()} {tr('dòng', 'rows')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="font-semibold mb-4">{tr('Tác vụ dọn dẹp', 'Cleanup Actions')}</h3>
          <div className="space-y-3">
            <button onClick={() => handleCleanup('expired_tokens')} disabled={actionLoading} className="w-full p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 text-left">
              <p className="font-medium">{tr('Dọn token hết hạn', 'Clean Expired Tokens')}</p>
              <p className="text-sm text-gray-400">{tr('Xóa refresh token đã hết hạn hoặc bị thu hồi', 'Remove expired and revoked refresh tokens')}</p>
            </button>
            <button onClick={() => handleCleanup('old_messages')} disabled={actionLoading} className="w-full p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 text-left">
              <p className="font-medium">{tr('Dọn tin nhắn cũ', 'Clean Old Messages')}</p>
              <p className="text-sm text-gray-400">{tr('Xóa tin nhắn cũ hơn 6 tháng (chỉ người dùng miễn phí)', 'Delete messages older than 6 months (free users only)')}</p>
            </button>
            <button onClick={() => handleCleanup('inactive_users')} disabled={actionLoading} className="w-full p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 text-left">
              <p className="font-medium">{tr('Tìm người dùng không hoạt động', 'Find Inactive Users')}</p>
              <p className="text-sm text-gray-400">{tr('Liệt kê người dùng không hoạt động trên 90 ngày', 'List users inactive for 90+ days')}</p>
            </button>
            <button onClick={handleCleanupDuplicates} disabled={actionLoading} className="w-full p-4 bg-red-700/50 rounded-xl hover:bg-red-700 text-left">
              <p className="font-medium">{tr('Dọn mẫu trùng lặp', 'Clean Duplicate Templates')}</p>
              <p className="text-sm text-gray-400">{tr('Xóa mẫu nhân vật trùng và chuyển nhân vật sang mẫu còn lại', 'Remove duplicate character templates and migrate characters')}</p>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="font-semibold mb-4">{tr('Top request routes', 'Top request routes')}</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {(systemInfo.requestStats || []).map((item, idx) => (
              <div key={`${item.path}-${item.method}-${idx}`} className="p-3 bg-gray-700/30 rounded-xl">
                <p className="text-sm text-white">{item.method} {item.path}</p>
                <p className="text-xs text-gray-400">
                  {tr('Requests', 'Requests')}: {item.requests.toLocaleString()} | AVG: {item.avgDurationMs}ms | P95: {item.p95DurationMs}ms
                </p>
              </div>
            ))}
            {(systemInfo.requestStats || []).length === 0 && (
              <p className="text-sm text-gray-500">{tr('Chưa có dữ liệu request monitor', 'No request monitoring data yet')}</p>
            )}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="font-semibold mb-4">{tr('Error severity phân bố', 'Error severity distribution')}</h3>
          <div className="space-y-2">
            {(systemInfo.errorStats || []).map((item) => (
              <div key={item.severity} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <span className="text-sm text-gray-200 uppercase">{item.severity}</span>
                <span className="text-sm font-semibold text-red-400">{item.count.toLocaleString()}</span>
              </div>
            ))}
            {(systemInfo.errorStats || []).length === 0 && (
              <p className="text-sm text-gray-500">{tr('Không có lỗi trong window', 'No errors in current window')}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
