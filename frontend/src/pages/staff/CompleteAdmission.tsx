import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, ArrowLeft, GraduationCap, Lock } from 'lucide-react';
import { getStudent, completeAdmission } from '../../services/api';
import type { Student, StageHistory } from '../../types';
import { STAGE_NAMES, STAGE_COLORS, ADMISSION_ROUNDS } from '../../constants';
import { formatDate, getErrorMessage } from '../../utils';

const CompleteAdmission: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<StageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollNumber, setRollNumber] = useState('');
  const [rollSaved, setRollSaved] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      getStudent(id).then(res => {
        setStudent(res.data.student);
        setHistory(res.data.history);
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleSaveRoll = () => {
    const trimmed = rollNumber.trim().toUpperCase();
    if (!trimmed) { setError('Roll number is required'); return; }
    if (trimmed.length < 5) { setError('Roll number seems too short'); return; }
    setRollNumber(trimmed);
    setRollSaved(true);
    setError('');
  };

  const handleComplete = async () => {
    if (!rollSaved || !rollNumber.trim()) {
      setError('Please save the roll number first');
      return;
    }
    setCompleting(true);
    setError('');
    try {
      await completeAdmission(id!, rollNumber.trim());
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  if (!student) return <div className="text-red-500 p-6">Student not found.</div>;

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admission Completed!</h2>
          <p className="text-gray-500 mb-4">{student.student_name}'s admission has been successfully completed.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-green-600 font-medium">Assigned Roll Number</div>
            <div className="text-2xl font-bold text-green-900 font-mono mt-1">{rollNumber}</div>
          </div>
          <button
            onClick={() => navigate('/staff/queue')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium"
          >
            Back to Queue
          </button>
        </div>
      </div>
    );
  }

  if (student.admission_status === 'Completed') {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700">Record Locked</h2>
          <p className="text-gray-500 mt-2">This student's admission is already completed.</p>
          <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            Roll Number: <strong className="font-mono">{student.roll_number}</strong>
          </div>
          <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 text-sm hover:underline">← Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Queue
      </button>

      <div className="bg-white rounded-xl border-2 border-purple-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <GraduationCap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Stage 5: Complete Admission</h2>
            <p className="text-sm text-gray-500">Assign roll number to finalize admission</p>
          </div>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 mb-5">
          <div><span className="text-xs text-gray-400 block">Token</span><span className="font-mono font-bold text-blue-700">{student.token_number}</span></div>
          <div><span className="text-xs text-gray-400 block">Allotment No.</span><span className="font-medium">{student.allotment_number}</span></div>
          <div><span className="text-xs text-gray-400 block">Student Name</span><span className="font-medium">{student.student_name}</span></div>
          <div><span className="text-xs text-gray-400 block">Department</span><span className="font-medium">{student.department_name || student.department_code}</span></div>
          <div><span className="text-xs text-gray-400 block">Round</span><span className="font-medium">{ADMISSION_ROUNDS[student.admission_round]}</span></div>
          <div><span className="text-xs text-gray-400 block">Fee Status</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${student.fee_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {student.fee_paid ? '✓ Paid' : '⚠ Pending'}
            </span>
          </div>
        </div>

        {/* Stage History */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Stage History</h3>
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className={`flex items-start gap-3 p-3 rounded-lg ${h.action === 'approved' ? 'bg-green-50 border border-green-100' : h.action === 'rejected' ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'}`}>
                <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded ${STAGE_COLORS[h.stage_number]}`}>S{h.stage_number}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700 capitalize">{STAGE_NAMES[h.stage_number]}: <strong>{h.action}</strong></div>
                  {h.remarks && <div className="text-xs text-gray-500 mt-0.5">{h.remarks}</div>}
                  <div className="text-xs text-gray-400 mt-0.5">By {h.processed_by_name} · {formatDate(h.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roll Number Assignment */}
        <div className="border-2 border-dashed border-purple-300 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Assign Roll Number <span className="text-red-500">*</span>
          </h3>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="flex gap-3 mb-3">
            <input
              type="text"
              placeholder="e.g. 24CSE001"
              value={rollNumber}
              onChange={e => { setRollNumber(e.target.value.toUpperCase()); setRollSaved(false); }}
              disabled={rollSaved}
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            />
            {rollSaved ? (
              <button
                onClick={() => setRollSaved(false)}
                className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
              >
                Edit
              </button>
            ) : (
              <button
                onClick={handleSaveRoll}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                Save
              </button>
            )}
          </div>

          {rollSaved && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-4">
              <CheckCircle className="w-4 h-4" />
              Roll number saved: <strong className="font-mono">{rollNumber}</strong>
            </div>
          )}

          <p className="text-xs text-gray-400 mb-4">
            Format: Year + Dept Code + Number (e.g. 24CSE001, 24EEE023). Must be unique.
          </p>

          <button
            onClick={handleComplete}
            disabled={!rollSaved || completing}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold text-sm transition-colors"
          >
            {completing ? 'Completing...' : '🎓 Complete Admission'}
          </button>

          {!rollSaved && (
            <p className="text-xs text-center text-gray-400 mt-2">Save the roll number first to enable completion</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompleteAdmission;
