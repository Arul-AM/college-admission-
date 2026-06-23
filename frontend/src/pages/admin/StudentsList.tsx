import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Download, RefreshCw, Eye } from 'lucide-react';
import { searchStudents, exportStudents } from '../../services/api';
import type { Student, Pagination } from '../../types';
import { STAGE_NAMES, STAGE_COLORS, STATUS_COLORS, ADMISSION_ROUNDS } from '../../constants';
import { formatDate, downloadBlob } from '../../utils';

const StudentsList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({
    admission_round: '', current_stage: '', admission_status: '', admission_day: ''
  });

  const doSearch = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { q: q || undefined, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), page, limit: 20 };
      const res = await searchStudents(params);
      setStudents(res.data.students);
      setPagination(res.data.pagination);
      setSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [q, filters]);

  const handleExport = async () => {
    try {
      const res = await exportStudents();
      downloadBlob(res.data, `students_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">All Students</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by token, name, allotment number, roll number..."
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => doSearch()}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'admission_round', label: 'Round', options: [['', 'All Rounds'], ['R1', 'Round 1'], ['UP1', 'Upgradation 1'], ['R2', 'Round 2'], ['UP2', 'Upgradation 2']] },
            { key: 'current_stage', label: 'Stage', options: [['', 'All Stages'], ...([1,2,3,4,5,6].map(s => [String(s), `Stage ${s}`]))] },
            { key: 'admission_status', label: 'Status', options: [['', 'All Status'], ['Pending', 'Pending'], ['In Progress', 'In Progress'], ['Completed', 'Completed'], ['Rejected', 'Rejected']] },
            { key: 'admission_day', label: 'Day', options: [['', 'All Days'], ['D1', 'D1'], ['D2', 'D2'], ['D3', 'D3'], ['D4', 'D4']] },
          ].map(f => (
            <select
              key={f.key}
              value={filters[f.key as keyof typeof filters]}
              onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              {f.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* Results */}
      {!searched && (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Search students using the form above</p>
        </div>
      )}

      {searched && (
        <>
          <div className="text-sm text-gray-500 font-medium">
            {pagination?.total || 0} student{pagination?.total !== 1 ? 's' : ''} found
          </div>

          {students.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              No students found matching your search.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Token', 'Student', 'Department', 'Round', 'Fee', 'Stage', 'Status', 'Roll No.', 'Action'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">{s.token_number}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{s.student_name}</div>
                          <div className="text-xs text-gray-400">{s.allotment_number}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-700">{s.department_code}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{ADMISSION_ROUNDS[s.admission_round] || s.admission_round}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.fee_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {s.fee_paid ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[s.current_stage]}`}>
                            S{s.current_stage}: {STAGE_NAMES[s.current_stage]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.admission_status]}`}>
                            {s.admission_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{s.roll_number || '—'}</td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/student/${s.id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={pagination.page <= 1}
                      onClick={() => doSearch(pagination.page - 1)}
                      className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50"
                    >Prev</button>
                    <button
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => doSearch(pagination.page + 1)}
                      className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50"
                    >Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentsList;
