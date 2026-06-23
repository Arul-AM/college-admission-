import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { getAdmissionDays, setActiveDay, createAdmissionDay } from '../../services/api';
import type { AdmissionDay } from '../../types';
import { getErrorMessage } from '../../utils';

const AdmissionDayManagement: React.FC = () => {
  const [days, setDays] = useState<AdmissionDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDayName, setNewDayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      const res = await getAdmissionDays();
      setDays(res.data.days);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showMsg = (msg: string, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const handleActivate = async (id: string) => {
    try {
      await setActiveDay(id);
      load();
      showMsg('Admission day activated successfully');
    } catch (err) {
      showMsg(getErrorMessage(err), true);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDayName.trim()) return;
    try {
      await createAdmissionDay(newDayName.trim().toUpperCase());
      setNewDayName('');
      load();
      showMsg('Admission day added');
    } catch (err) {
      showMsg(getErrorMessage(err), true);
    }
  };

  const activeDay = days.find(d => d.is_active);

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Admission Days</h2>
        <p className="text-gray-500 text-sm mt-1">
          Only one day can be active at a time. All new tokens will use the active day.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" />{success}</div>}

      {/* Active day indicator */}
      {activeDay && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
          <div className="text-sm font-medium text-blue-600">Currently Active</div>
          <div className="text-3xl font-bold text-blue-900 mt-1">{activeDay.name}</div>
          <div className="text-xs text-blue-500 mt-1">All new tokens will use this admission day</div>
        </div>
      )}

      {/* Days list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {days.map(day => (
              <div key={day.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${day.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <CalendarDays className={`w-5 h-5 ${day.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{day.name}</div>
                    {day.is_active && (
                      <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Active
                      </div>
                    )}
                  </div>
                </div>
                {!day.is_active && (
                  <button
                    onClick={() => handleActivate(day.id)}
                    className="text-sm px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Set Active
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new day */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Add New Admission Day</h3>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. D5"
            value={newDayName}
            onChange={e => setNewDayName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            maxLength={5}
          />
          <button
            type="submit"
            disabled={!newDayName.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">Use format: D1, D2, D3, etc.</p>
      </div>
    </div>
  );
};

export default AdmissionDayManagement;
