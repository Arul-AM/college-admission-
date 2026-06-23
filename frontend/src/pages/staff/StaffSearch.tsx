import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, RefreshCw } from 'lucide-react';
import { searchStudents } from '../../services/api';
import type { Student } from '../../types';
import { STAGE_NAMES, STAGE_COLORS, STATUS_COLORS, ADMISSION_ROUNDS } from '../../constants';

const StaffSearch: React.FC = () => {
  const [q, setQ] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await searchStudents({ q: q.trim(), limit: 30 });
      setStudents(res.data.students);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Search Students</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by token number, name, allotment number or roll number..."
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoFocus
            />
          </div>
          <button
            onClick={doSearch}
            disabled={!q.trim() || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      </div>

      {!searched && (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Enter a search term to find students</p>
        </div>
      )}

      {searched && students.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
          No students found for "<strong>{q}</strong>"
        </div>
      )}

      {students.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500 font-medium">
            {students.length} result{students.length !== 1 ? 's' : ''}
          </div>
          <div className="divide-y divide-gray-100">
            {students.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-4 hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm font-bold text-blue-700">{s.token_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[s.current_stage]}`}>
                      Stage {s.current_stage}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.admission_status]}`}>
                      {s.admission_status}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900">{s.student_name}</div>
                  <div className="text-sm text-gray-400 flex gap-3 mt-0.5">
                    <span>{s.allotment_number}</span>
                    <span>·</span>
                    <span>{s.department_code}</span>
                    <span>·</span>
                    <span>{ADMISSION_ROUNDS[s.admission_round]}</span>
                    {s.roll_number && <><span>·</span><span className="font-mono">{s.roll_number}</span></>}
                  </div>
                </div>
                <Link
                  to={`/student/${s.id}`}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Eye className="w-4 h-4" /> View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffSearch;
