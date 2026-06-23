import React, { useEffect, useState } from 'react';
import { Users, CheckCircle, Clock, AlertCircle, HelpCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { getAdminDashboard } from '../../services/api';
import type { DashboardData } from '../../types';
import { STAGE_NAMES, STAGE_COLORS } from '../../constants';
import { formatDate } from '../../utils';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }> =
  ({ title, value, icon, color, sub }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm font-medium text-gray-600 mt-0.5">{title}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await getAdminDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-red-500">Failed to load dashboard.</div>;

  const { stats, stageCounts, recentActivity, completedToday } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-500 text-sm">Real-time admission overview</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={stats.total_students} icon={<Users className="w-5 h-5 text-blue-600" />} color="bg-blue-50" />
        <StatCard title="Completed" value={stats.completed_count} sub={`${completedToday} today`} icon={<CheckCircle className="w-5 h-5 text-green-600" />} color="bg-green-50" />
        <StatCard title="In Progress" value={stats.in_progress_count} icon={<Clock className="w-5 h-5 text-orange-600" />} color="bg-orange-50" />
        <StatCard title="Help Desk" value={stats.help_desk_count} icon={<HelpCircle className="w-5 h-5 text-red-600" />} color="bg-red-50" />
        <StatCard title="Fee Paid" value={stats.fee_paid_count} icon={<TrendingUp className="w-5 h-5 text-indigo-600" />} color="bg-indigo-50" />
        <StatCard title="Fee Pending" value={stats.fee_pending_count} icon={<AlertCircle className="w-5 h-5 text-yellow-600" />} color="bg-yellow-50" />
        <StatCard title="Rejected" value={stats.rejected_count} icon={<AlertCircle className="w-5 h-5 text-gray-600" />} color="bg-gray-50" />
      </div>

      {/* Stage Queues */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Stage Queue Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(stage => (
            <div key={stage} className="text-center p-4 rounded-lg bg-gray-50 border border-gray-100">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold mb-2 ${STAGE_COLORS[stage]}`}>
                {stage}
              </div>
              <div className="text-2xl font-bold text-gray-900">{stageCounts[stage] || 0}</div>
              <div className="text-xs text-gray-500 mt-1">{STAGE_NAMES[stage]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((log) => (
              <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 truncate">{log.description}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{log.username}</span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full flex-shrink-0">
                  {log.action}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
