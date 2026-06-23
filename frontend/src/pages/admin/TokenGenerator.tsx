import { useState, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const ROUNDS = ['R1', 'UP1', 'R2', 'UP2'];

const TokenGenerator = () => {
  const [round, setRound] = useState('R1');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetting, setResetting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('token');
  const authHeader = { Authorization: `Bearer ${token}` };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    setFile(f);
    setError('');
    setSuccess('');
  };

  const handleGenerate = async () => {
    if (!file) { setError('Please select an Excel file first'); return; }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('admission_round', round);

      const response = await axios.post(`${API_URL}/tokens/generate-excel`, formData, {
        headers: { ...authHeader, 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      // Download the returned Excel
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tokens-${round}-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`Tokens generated successfully for Round ${round}! File downloaded.`);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      if (err.response?.data) {
        // Error response is blob, need to parse
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          setError(json.error || 'Failed to generate tokens');
        } catch {
          setError('Failed to generate tokens');
        }
      } else {
        setError(err.message || 'Failed to generate tokens');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Reset all token sequences for Round ${round}? This cannot be undone.`)) return;
    setResetting(true);
    setError('');
    setSuccess('');
    try {
      await axios.post(`${API_URL}/tokens/reset`, { admission_round: round }, { headers: authHeader });
      setSuccess(`Sequences reset for Round ${round}. Next generation will start from 001.`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset sequences');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Token Generator</h1>
      <p className="text-gray-500 mb-8">
        Upload an Excel sheet with student data to auto-generate admission tokens in{' '}
        <span className="font-mono bg-gray-100 px-1 rounded">ADM-YY-DEPT-001</span> format.
      </p>

      {/* Format info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm font-semibold text-blue-700 mb-2">Token Format</p>
        <p className="font-mono text-blue-800 text-lg">ADM-26-CSE-001</p>
        <p className="text-xs text-blue-600 mt-1">
          Tokens are assigned in allotment number order, grouped by department. Sequence resets per round.
        </p>
      </div>

      {/* Excel format guide */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-2">Required Excel Columns</p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-white border rounded p-2 text-center">
            <p className="font-medium">Allotment Number</p>
            <p className="text-gray-400 text-xs">or "Allotment", "App No"</p>
          </div>
          <div className="bg-white border rounded p-2 text-center">
            <p className="font-medium">Student Name</p>
            <p className="text-gray-400 text-xs">or "Name"</p>
          </div>
          <div className="bg-white border rounded p-2 text-center">
            <p className="font-medium">Department</p>
            <p className="text-gray-400 text-xs">or "Dept", "Branch", "Code"</p>
          </div>
        </div>
      </div>

      {/* Round selector */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Admission Round</label>
        <div className="flex gap-3">
          {ROUNDS.map(r => (
            <button
              key={r}
              onClick={() => setRound(r)}
              className={`px-5 py-2 rounded-lg font-medium border transition-all ${
                round === r
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* File upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Excel File</label>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {file ? (
            <div>
              <p className="text-green-600 font-medium">✓ {file.name}</p>
              <p className="text-gray-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB — click to change</p>
            </div>
          ) : (
            <div>
              <p className="text-4xl mb-2">📊</p>
              <p className="text-gray-600">Click to upload Excel file</p>
              <p className="text-gray-400 text-sm">.xlsx or .xls</p>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Error / Success */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✅ {success}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleGenerate}
          disabled={loading || !file}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Generating...' : `Generate Tokens for ${round}`}
        </button>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="px-4 py-3 bg-white text-red-600 border border-red-300 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
          title={`Reset sequence counters for Round ${round}`}
        >
          {resetting ? '...' : 'Reset'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Reset clears the counter so the next upload starts from 001 again for Round {round}.
      </p>
    </div>
  );
};

export default TokenGenerator;
