import React, { useEffect, useState } from 'react';
import { Plus, Building2, AlertCircle, CheckCircle, Edit } from 'lucide-react';
import { getAllDepartments, createDepartment, updateDepartment } from '../../services/api';
import type { Department } from '../../types';
import { formatDate, getErrorMessage } from '../../utils';

const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', code: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      const res = await getAllDepartments();
      setDepartments(res.data.departments);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showMsg = (msg: string, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDepartment(form);
      setShowCreate(false);
      setForm({ name: '', code: '' });
      load();
      showMsg('Department created successfully');
    } catch (err) {
      showMsg(getErrorMessage(err), true);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDept) return;
    try {
      await updateDepartment(editDept.id, form);
      setEditDept(null);
      setForm({ name: '', code: '' });
      load();
      showMsg('Department updated successfully');
    } catch (err) {
      showMsg(getErrorMessage(err), true);
    }
  };

  const handleToggle = async (dept: Department) => {
    try {
      await updateDepartment(dept.id, { is_active: !dept.is_active });
      load();
    } catch (err) {
      showMsg(getErrorMessage(err), true);
    }
  };

  const openEdit = (dept: Department) => {
    setEditDept(dept);
    setForm({ name: dept.name, code: dept.code });
  };

  const Modal = ({ title, onSubmit, onClose }: { title: string; onSubmit: (e: React.FormEvent) => void; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department Name <span className="text-red-500">*</span></label>
            <input
              type="text" placeholder="e.g. Computer Science Engineering"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department Code <span className="text-red-500">*</span></label>
            <input
              type="text" placeholder="e.g. CSE"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Used in token generation. Keep it short (3–5 chars).</p>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">Save</button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Departments</h2>
        <button
          onClick={() => { setShowCreate(true); setForm({ name: '', code: '' }); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" />{success}</div>}

      {showCreate && <Modal title="Add Department" onSubmit={handleCreate} onClose={() => setShowCreate(false)} />}
      {editDept && <Modal title="Edit Department" onSubmit={handleUpdate} onClose={() => setEditDept(null)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-gray-400">Loading departments...</div>
        ) : departments.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-gray-400">No departments yet.</div>
        ) : departments.map(dept => (
          <div key={dept.id} className={`bg-white rounded-xl border-2 p-5 ${dept.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEdit(dept)}
                  className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggle(dept)}
                  className={`text-xs px-2 py-1 rounded font-medium ${dept.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {dept.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
            <div className="font-semibold text-gray-900">{dept.name}</div>
            <div className="inline-block mt-2 font-mono text-sm font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              {dept.code}
            </div>
            <div className="text-xs text-gray-400 mt-2">Added {formatDate(dept.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentManagement;
