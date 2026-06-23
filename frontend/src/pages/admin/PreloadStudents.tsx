import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const ROUNDS = ['R1', 'UP1', 'R2', 'UP2'];

interface DeptSummary { dept: string; code: string; count: number; range: string; }
interface PreviewRow  { base_token: string; allotment_number: string; student_name: string; dept_code: string; }
interface UploadResult {
  message: string;
  inserted: number;
  skipped: number;
  errors: string[];
  preview: PreviewRow[];
  deptSummary: DeptSummary[];
}
interface AdmissionDay { id: string; name: string; is_active: boolean; }

export default function PreloadStudents() {
  const [round, setRound]     = useState('R1');
  const [day, setDay]         = useState('');
  const [days, setDays]       = useState<AdmissionDay[]>([]);
  const [file, setFile]       = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<UploadResult | null>(null);
  const [error, setError]     = useState('');
  const [clearing, setClearing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('token');
  const auth  = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API_URL}/admission-days`, { headers: auth })
      .then(r => {
        setDays(r.data.days || r.data || []);
        const active = (r.data.days || r.data || []).find((d: AdmissionDay) => d.is_active);
        if (active) setDay(active.name);
      })
      .catch(() => {});
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) { setError('Please upload .xlsx or .xls file'); return; }
    setFile(f); setError(''); setResult(null);
  };

  const handleUpload = async () => {
    if (!file) { setError('Select an Excel file first'); return; }
    if (!day)  { setError('Select an admission day'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('admission_day', day);
      fd.append('admission_round', round);
      const res = await axios.post(`${API_URL}/preload/upload`, fd, {
        headers: { ...auth, 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!day) { setError('Select a day to clear'); return; }
    if (!window.confirm(`Clear all unregistered preloaded students for ${day} / ${round}?`)) return;
    setClearing(true); setError('');
    try {
      const res = await axios.delete(`${API_URL}/preload/clear`, {
        headers: auth, data: { admission_day: day, admission_round: round },
      });
      setResult(null);
      alert(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Clear failed');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Student Preload</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload Excel to pre-assign dept serials. Token format:{' '}
          <span className="font-mono bg-gray-100 px-1 rounded">D2-R1-CSE-012-005</span>
          <span className="text-gray-400 ml-2">(day-round-dept-deptSerial-reportingSerial)</span>
        </p>
      </div>

      {/* Token explained */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm">
        <p className="font-semibold text-indigo-800 mb-2">How tokens are built</p>
        <div className="flex flex-wrap gap-2 font-mono text-sm">
          {[
            { part: 'D2',  label: 'Admission Day',    color: 'bg-blue-100 text-blue-800' },
            { part: 'R1',  label: 'Round',             color: 'bg-purple-100 text-purple-800' },
            { part: 'CSE', label: 'Department',        color: 'bg-green-100 text-green-800' },
            { part: '012', label: 'Dept serial (Excel order)', color: 'bg-yellow-100 text-yellow-800' },
            { part: '005', label: 'Reporting order (on day)',  color: 'bg-red-100 text-red-800' },
          ].map(({ part, label, color }) => (
            <div key={part} className="text-center">
              <div className={`px-3 py-1 rounded font-bold ${color}`}>{part}</div>
              <div className="text-gray-500 text-xs mt-1 max-w-[80px]">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-indigo-600 text-xs mt-3">
          Dept serial (012) is fixed from this Excel upload. Reporting serial (005) is assigned when staff registers the student on the day.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border rounded-lg p-5 space-y-4">
        {/* Day selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admission Day</label>
          {days.length > 0 ? (
            <select
              value={day}
              onChange={e => setDay(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">-- select --</option>
              {days.map(d => (
                <option key={d.id} value={d.name}>{d.name}{d.is_active ? ' (active)' : ''}</option>
              ))}
            </select>
          ) : (
            <input
              type="text" placeholder="e.g. D2"
              value={day} onChange={e => setDay(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          )}
        </div>

        {/* Round selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Admission Round</label>
          <div className="flex gap-2">
            {ROUNDS.map(r => (
              <button key={r} onClick={() => setRound(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  round === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                }`}>{r}</button>
            ))}
          </div>
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Excel File</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
          >
            {file ? (
              <>
                <p className="text-green-600 font-medium">✓ {file.name}</p>
                <p className="text-gray-400 text-xs mt-1">{(file.size/1024).toFixed(1)} KB — click to change</p>
              </>
            ) : (
              <>
                <p className="text-3xl mb-1">📊</p>
                <p className="text-gray-500 text-sm">Click to upload Excel (.xlsx / .xls)</p>
                <p className="text-gray-400 text-xs mt-1">Needs columns: allotment no, name, department</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">⚠️ {error}</div>}

        <div className="flex gap-3">
          <button
            onClick={handleUpload} disabled={loading || !file || !day}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Uploading...' : `Preload Students → ${day || '?'} / ${round}`}
          </button>
          <button
            onClick={handleClear} disabled={clearing || !day}
            className="px-4 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {clearing ? '...' : 'Clear'}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold">✅ {result.message}</p>
            <p className="text-green-600 text-sm mt-1">
              {result.inserted} students preloaded across {result.deptSummary?.length} departments
              {result.skipped > 0 && ` · ${result.skipped} skipped`}
            </p>
          </div>

          {/* Dept summary */}
          {result.deptSummary?.length > 0 && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <p className="font-medium text-gray-700 text-sm">Department Summary</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Department','Code','Students','Token Range'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-gray-600 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.deptSummary.map((d, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800">{d.dept}</td>
                      <td className="px-4 py-2 font-mono font-bold text-indigo-700">{d.code}</td>
                      <td className="px-4 py-2 text-gray-600">{d.count}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">{d.range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Preview */}
          {result.preview?.length > 0 && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <p className="font-medium text-gray-700 text-sm">Sample Tokens (first 10)</p>
                <p className="text-gray-400 text-xs">Reporting serial (-005) will be added when staff registers</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Base Token','Allotment No','Student Name'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-gray-600 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.preview.map((r, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono font-bold text-indigo-700">{r.base_token}-<span className="text-gray-400">???</span></td>
                      <td className="px-4 py-2 text-gray-600">{r.allotment_number}</td>
                      <td className="px-4 py-2 text-gray-800">{r.student_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
