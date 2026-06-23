import React, { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, Search } from 'lucide-react';
import { getAuditLogs } from '../../services/api';
import type { AuditLog, Pagination } from '../../types';
import { formatDate } from '../../utils';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-700',
  STUDENT_REGISTER: 'bg-green-100 text-green-700',
  STAGE_APPROVED: 'bg-emerald-100 text-emerald-700',
  STAGE_REJECTED: 'bg-red-100 text-red-700',
  ADMISSION_COMPLETE: 'bg-purple-100 text-purple-700',
  FEE_UPDATE: 'bg-yellow-100 text-yellow-700',
  STAFF_CREATE: 'bg-indigo-100 text-indigo-700',
  STAFF_ACTIVATE: 'bg-teal-100 text-teal-700',
  STAFF_DEACTIVATE: 'bg-orange-100 text-orange-700',
  STAFF_RESET_PASSWORD: 'bg-pink-100 text-pink-700',
  DEPARTMENT_CREATE: 'bg-cyan-100 text-cyan-700',
  ADMISSION_DAY_SET: 'bg-violet-100 text-violet-700',
  PASSWORD_CHANGE: 'bg-slate-100 text-slate-700',
};

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await getAuditLogs({ page: p, limit: 50, username: username || undefined, action: action || undefined });
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const handleSearch = () => { setPage(1); load(1); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-sm text-gray-500">Track all system activities</p>
        </div>
        <button onClick={() => load(page)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3">
        <input
          type="text" placeholder="Filter by username..."
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <select
          value={action}
          onChange={e => setAction(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
        >
          <option value="">All Actions</option>
          {Object.keys(ACTION_COLORS).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button
          onClick={handleSearch}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Search className="w-4 h-4" /> Filter
        </button>
      </div>

      {/* Stats */}
      {pagination && (
        <div className="text-sm text-gray-500">{pagination.total} log entries total</div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
            <span>Loading logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
            No audit logs found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Time', 'User', 'Action', 'Description', 'IP Address'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{log.username || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-md truncate" title={log.description}>{log.description}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
