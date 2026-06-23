import React, { useEffect, useState } from 'react';
import { Plus, ToggleLeft, ToggleRight, Edit, Key, AlertCircle } from 'lucide-react';
import { getStaff, createStaff, toggleStaffStatus, resetStaffPassword, updateStaff } from '../../services/api';
import type { StaffMember } from '../../types';
import { STAGE_NAMES, STAGE_COLORS } from '../../constants';
import { formatDate, getErrorMessage } from '../../utils';

const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [resetModal, setResetModal] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    username: '', password: '', full_name: '', stage_assigned: ''
  });

  const loadStaff = async () => {
    try {
      const res = await getStaff();
      setStaff(res.data.staff);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, []);

  const showMsg = (msg: string, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStaff({ ...form, stage_assigned: parseInt(form.stage_assigned) });
      setShowCreate(false);
      setForm({ username: '', password: '', full_name: '', stage_assigned: '' });
      loadStaff();
      showMsg('Staff member created successfully');
    } catch (err) {
      showMsg(getErrorMessage(err), true);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleStaffStatus(id);
      loadStaff();
    } catch (err) {
      showMsg(getErrorMessage(err), true);
    }
  };

  const handleReset = async () => {
    if (!resetModal || !newPassword) return;
    try {
      await resetStaffPassword(resetModal.id, newPassword);
      setResetModal(null);
      setNewPassword('');
      showMsg('Password reset successfully');
    } catch (err) {
      showMsg(getErrorMessage(err), true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">{success}</div>}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Add New Staff</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { key: 'full_name', label: 'Full Name', type: 'text', placeholder: 'e.g. John Smith' },
                { key: 'username', label: 'Username', type: 'text', placeholder: 'e.g. john.smith' },
                { key: 'password', label: 'Password', type: 'password', placeholder: 'Min 8 characters' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input
                    type={f.type} placeholder={f.placeholder}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Stage</label>
                <select
                  value={form.stage_assigned}
                  onChange={e => setForm({ ...form, stage_assigned: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  required
                >
                  <option value="">Select stage</option>
                  {[1, 2, 3, 4, 5, 6].map(s => (
                    <option key={s} value={s}>Stage {s} — {STAGE_NAMES[s]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Reset Password</h3>
            <p className="text-sm text-gray-500 mb-4">For: <strong>{resetModal.name}</strong></p>
            <input
              type="password" placeholder="New password (min 8 chars)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium">Reset</button>
              <button onClick={() => { setResetModal(null); setNewPassword(''); }} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading staff...</div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No staff members yet. Add one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Username', 'Stage', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.full_name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.username}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[s.stage_assigned]}`}>
                      Stage {s.stage_assigned}: {STAGE_NAMES[s.stage_assigned]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(s.id)}
                        className={`p-1.5 rounded ${s.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={s.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {s.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => setResetModal({ id: s.id, name: s.full_name })}
                        className="p-1.5 rounded text-blue-500 hover:bg-blue-50"
                        title="Reset password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StaffManagement;
