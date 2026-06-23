import React, { useEffect, useState } from 'react';
import { Download, FileText, TrendingUp, RefreshCw } from 'lucide-react';
import { getAdminDashboard, exportStudents } from '../../services/api';
import type { DashboardData } from '../../types';
import { STAGE_NAMES } from '../../constants';
import { downloadBlob } from '../../utils';

const Reports: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getAdminDashboard().then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportStudents();
      downloadBlob(res.data, `admission_report_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-48"><RefreshCw className="w-6 h-6 animate-spin text-blue-500" /></div>;

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-500">Admission statistics and export</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export All Students (CSV)'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Registered', value: stats?.total_students || '0', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Completed', value: stats?.completed_count || '0', color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'In Progress', value: stats?.in_progress_count || '0', color: 'bg-orange-50 border-orange-200 text-orange-700' },
          { label: 'Rejected', value: stats?.rejected_count || '0', color: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Fee Paid', value: stats?.fee_paid_count || '0', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
          { label: 'Fee Pending', value: stats?.fee_pending_count || '0', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Help Desk', value: stats?.help_desk_count || '0', color: 'bg-rose-50 border-rose-200 text-rose-700' },
          { label: 'Completed Today', value: String(data?.completedToday || '0'), color: 'bg-teal-50 border-teal-200 text-teal-700' },
        ].map(c => (
          <div key={c.label} className={`border-2 rounded-xl p-4 ${c.color}`}>
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="text-sm font-medium mt-1 opacity-80">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Stage breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Students Per Stage (Currently in Queue)
        </h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(stage => {
            const count = data?.stageCounts[stage] || 0;
            const total = parseInt(stats?.total_students || '1') || 1;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={stage} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {stage}
                </div>
                <div className="text-sm text-gray-700 w-48 flex-shrink-0">{STAGE_NAMES[stage]}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }} />
                </div>
                <div className="text-sm font-semibold text-gray-800 w-10 text-right">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          CSV Export Includes
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
          {['Token Number', 'Allotment Number', 'Student Name', 'Department', 'Dept Code', 'Admission Day',
            'Admission Round', 'Fee Paid Status', 'Current Stage', 'Admission Status', 'Roll Number',
            'Remarks', 'Registered At', 'Completed At'].map(col => (
            <div key={col} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              {col}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reports;
