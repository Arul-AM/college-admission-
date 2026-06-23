import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, CheckCircle, Search, Loader } from 'lucide-react';
import { getDepartments, getActiveDay, registerStudent } from '../../services/api';
import api from '../../services/api';
import type { Department, AdmissionDay } from '../../types';
import { ADMISSION_ROUNDS } from '../../constants';
import { getErrorMessage } from '../../utils';

const RegisterStudent: React.FC = () => {
  const navigate = useNavigate();
  const [departments, setDepartments]     = useState<Department[]>([]);
  const [activeDay, setActiveDay]         = useState<AdmissionDay | null>(null);
  const [loading, setLoading]             = useState(false);
  const [lookingUp, setLookingUp]         = useState(false);
  const [success, setSuccess]             = useState<{ token: string; name: string } | null>(null);
  const [error, setError]                 = useState('');
  const [preloadInfo, setPreloadInfo]     = useState<{ base_token: string; dept_name: string } | null>(null);

  const [form, setForm] = useState({
    allotment_number: '',
    student_name: '',
    department_id: '',
    admission_round: '',
    fee_paid: 'true',
    remarks: '',
  });

  useEffect(() => {
    const load = async () => {
      const [deptRes, dayRes] = await Promise.all([getDepartments(), getActiveDay()]);
      setDepartments(deptRes.data.departments);
      setActiveDay(dayRes.data.activeDay);
    };
    load();
  }, []);

  // Auto-lookup preloaded student when allotment number is entered
  const handleAllotmentLookup = async () => {
    if (!form.allotment_number || !form.admission_round) return;
    setLookingUp(true);
    setPreloadInfo(null);
    try {
      const res = await api.get(`/preload/lookup/${form.allotment_number}?admission_round=${form.admission_round}`);
      const pl = res.data.student;
      // Auto-fill name and find matching dept
      setForm(f => ({ ...f, student_name: pl.student_name }));
      setPreloadInfo({ base_token: pl.base_token, dept_name: pl.dept_name });
      // Try to auto-select department
      const matchDept = departments.find(d =>
        d.code.toUpperCase() === pl.dept_code.toUpperCase() ||
        d.name.toUpperCase().includes(pl.dept_name.toUpperCase().slice(0, 10))
      );
      if (matchDept) setForm(f => ({ ...f, department_id: matchDept.id }));
    } catch {
      // Not preloaded — that's OK, allow manual entry
      setPreloadInfo(null);
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.allotment_number || !form.student_name || !form.department_id || !form.admission_round) {
      setError('Please fill all required fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await registerStudent({ ...form, fee_paid: form.fee_paid === 'true' });
      setSuccess({ token: res.data.tokenNumber, name: form.student_name });
      setForm({ allotment_number: '', student_name: '', department_id: '', admission_round: '', fee_paid: 'true', remarks: '' });
      setPreloadInfo(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Student Registered!</h2>
          <div className="bg-indigo-50 rounded-lg p-4 my-4">
            <p className="text-sm text-indigo-600 mb-1">Token Number</p>
            <p className="text-3xl font-mono font-bold text-indigo-700">{success.token}</p>
          </div>
          <p className="text-gray-600 mb-6">{success.name}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setSuccess(null)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Register Another
            </button>
            <button onClick={() => navigate(-1)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-800">Register Student</h1>
      </div>

      {activeDay && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="text-sm text-indigo-700">Active Day: <strong>{activeDay.name}</strong></span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

        {/* Round first so lookup works */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admission Round *</label>
          <select
            value={form.admission_round}
            onChange={e => setForm(f => ({ ...f, admission_round: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          >
            <option value="">Select round</option>
            {Object.entries(ADMISSION_ROUNDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {/* Allotment with lookup */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allotment Number *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.allotment_number}
              onChange={e => setForm(f => ({ ...f, allotment_number: e.target.value }))}
              placeholder="Enter allotment number"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
            <button
              type="button"
              onClick={handleAllotmentLookup}
              disabled={!form.allotment_number || !form.admission_round || lookingUp}
              className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
            >
              {lookingUp ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Lookup
            </button>
          </div>
          {preloadInfo && (
            <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              ✅ Found in preloaded list — Base token: <strong className="font-mono">{preloadInfo.base_token}</strong>
              <span className="text-green-400">-???</span>
              <span className="text-gray-400 ml-2">(reporting serial assigned on save)</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
          <input
            type="text"
            value={form.student_name}
            onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))}
            placeholder="Full name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
          <select
            value={form.department_id}
            onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          >
            <option value="">Select department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fee Status</label>
          <div className="flex gap-4">
            {[{ val: 'true', label: 'Fee Paid' }, { val: 'false', label: 'Fee Pending' }].map(opt => (
              <label key={opt.val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fee_paid"
                  value={opt.val}
                  checked={form.fee_paid === opt.val}
                  onChange={e => setForm(f => ({ ...f, fee_paid: e.target.value }))}
                  className="text-indigo-600"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
          <textarea
            value={form.remarks}
            onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
            rows={2}
            placeholder="Optional notes"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Registering...' : 'Register Student'}
        </button>
      </form>
    </div>
  );
};

export default RegisterStudent;
