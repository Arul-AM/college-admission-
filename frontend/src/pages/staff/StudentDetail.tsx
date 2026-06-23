import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { getStudent } from '../../services/api';
import type { Student, StageHistory } from '../../types';
import { STAGE_NAMES, STAGE_COLORS, STATUS_COLORS, ADMISSION_ROUNDS } from '../../constants';
import { formatDate } from '../../utils';

const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<StageHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getStudent(id).then(res => {
        setStudent(res.data.student);
        setHistory(res.data.history);
      }).finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
    </div>
  );

  if (!student) return <div className="text-red-500 p-6">Student not found.</div>;

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 w-40 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right flex-1">{value}</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg inline-block mb-2">
              {student.token_number}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{student.student_name}</h2>
            <p className="text-gray-500 text-sm">{student.allotment_number}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_COLORS[student.admission_status]}`}>
              {student.admission_status}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${STAGE_COLORS[student.current_stage]}`}>
              Stage {student.current_stage}: {STAGE_NAMES[student.current_stage]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 bg-gray-50 rounded-xl p-4">
          <div className="pr-4 md:border-r border-gray-200">
            <InfoRow label="Department" value={`${student.department_name || ''} (${student.department_code})`} />
            <InfoRow label="Admission Day" value={student.admission_day} />
            <InfoRow label="Admission Round" value={`${ADMISSION_ROUNDS[student.admission_round]} (${student.admission_round})`} />
            <InfoRow label="Fee Status" value={
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${student.fee_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {student.fee_paid ? '✓ Paid' : '⚠ Pending'}
              </span>
            } />
          </div>
          <div className="pl-0 md:pl-4 mt-4 md:mt-0">
            <InfoRow label="Roll Number" value={student.roll_number ? <span className="font-mono font-bold">{student.roll_number}</span> : <span className="text-gray-300">Not assigned</span>} />
            <InfoRow label="Registered By" value={student.registered_by_name || '—'} />
            <InfoRow label="Registered At" value={formatDate(student.created_at)} />
            {student.completed_at && <InfoRow label="Completed At" value={formatDate(student.completed_at)} />}
            {student.completed_by_name && <InfoRow label="Completed By" value={student.completed_by_name} />}
          </div>
        </div>

        {student.remarks && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <span className="text-xs font-semibold text-yellow-700 block mb-1">Remarks</span>
            <p className="text-sm text-yellow-800">{student.remarks}</p>
          </div>
        )}
      </div>

      {/* Stage History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Stage History</h3>
        {history.length === 0 ? (
          <p className="text-gray-400 text-sm">No history yet.</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {history.map((h, idx) => (
                <div key={h.id} className="flex gap-4 relative">
                  {/* Dot */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold ${
                    h.action === 'approved' ? 'bg-green-500 text-white' :
                    h.action === 'rejected' ? 'bg-red-500 text-white' :
                    h.action === 'fee_updated' ? 'bg-yellow-500 text-white' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {h.stage_number}
                  </div>

                  <div className={`flex-1 rounded-xl p-4 border ${
                    h.action === 'approved' ? 'border-green-200 bg-green-50' :
                    h.action === 'rejected' ? 'border-red-200 bg-red-50' :
                    h.action === 'fee_updated' ? 'border-yellow-200 bg-yellow-50' :
                    'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">
                          {STAGE_NAMES[h.stage_number]}
                          <span className={`ml-2 text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
                            h.action === 'approved' ? 'bg-green-100 text-green-700' :
                            h.action === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{h.action}</span>
                        </div>
                        {h.remarks && <p className="text-xs text-gray-600 mt-1">{h.remarks}</p>}
                        <div className="text-xs text-gray-400 mt-1.5">
                          By <span className="font-medium">{h.processed_by_name}</span> · {formatDate(h.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetail;
