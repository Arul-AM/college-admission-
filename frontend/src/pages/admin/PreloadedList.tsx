import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

interface PreloadedStudent {
  id: string;
  allotment_number: string;
  student_name: string;
  dept_name: string;
  dept_code: string;
  course: string;
  admission_day: string;
  admission_round: string;
  dept_serial: number;
  base_token: string;
  registered: boolean;
  registered_at: string | null;
}

export default function PreloadedList() {
  const [students, setStudents] = useState<PreloadedStudent[]>([]);
  const [filtered, setFiltered] = useState<PreloadedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);

  const token = localStorage.getItem('token');
  const auth = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API_URL}/preload/list`, { headers: auth })
      .then(r => {
        const data = r.data.students || r.data || [];
        setStudents(data);
        setFiltered(data);
        const depts = [...new Set(data.map((s: PreloadedStudent) => s.dept_code))] as string[];
        setDepartments(depts.sort());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = students;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.allotment_number.toLowerCase().includes(q) ||
        s.student_name.toLowerCase().includes(q) ||
        s.base_token.toLowerCase().includes(q)
      );
    }
    if (deptFilter) result = result.filter(s => s.dept_code === deptFilter);
    if (statusFilter === 'registered') result = result.filter(s => s.registered);
    if (statusFilter === 'pending') result = result.filter(s => !s.registered);
    setFiltered(result);
  }, [search, deptFilter, statusFilter, students]);

  const registered = students.filter(s => s.registered).length;
  const pending = students.length - registered;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Preloaded Students</h1>
      <p className="text-gray-500 text-sm mb-6">View all students preloaded for admission day</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-700">{students.length}</div>
          <div className="text-sm text-blue-600 mt-1">Total Preloaded</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{registered}</div>
          <div className="text-sm text-green-600 mt-1">Registered</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-yellow-700">{pending}</div>
          <div className="text-sm text-yellow-600 mt-1">Pending</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search by name, allotment, token..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Status</option>
          <option value="registered">Registered</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-3">Showing {filtered.length} of {students.length} students</p>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Base Token</th>
                <th className="px-4 py-3 text-left">Allotment No</th>
                <th className="px-4 py-3 text-left">Student Name</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Day / Round</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">No students found</td>
                </tr>
              ) : filtered.map((s, i) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-indigo-600 font-medium">{s.base_token}</td>
                  <td className="px-4 py-3 text-gray-700">{s.allotment_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.student_name}</td>
                  <td className="px-4 py-3">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">{s.dept_code}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.admission_day} / {s.admission_round}</td>
                  <td className="px-4 py-3">
                    {s.registered ? (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">✓ Registered</span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
