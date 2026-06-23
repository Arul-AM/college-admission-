import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Eye, CheckCircle, XCircle, Clock, HelpCircle, DollarSign } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { getStageQueue, processStage, updateFeeStatus } from '../../services/api';
import type { Student } from '../../types';
import { STAGE_NAMES, STAGE_COLORS, ADMISSION_ROUNDS } from '../../constants';
import { formatDate, getErrorMessage } from '../../utils';

const ProcessModal: React.FC<{
  student: Student;
  action: 'approved' | 'rejected' | 'fee_paid';
  onConfirm: (remarks: string) => void;
  onClose: () => void;
}> = ({ student, action, onConfirm, onClose }) => {
  const [remarks, setRemarks] = useState('');
  const isApprove = action === 'approved';
  const isFee = action === 'fee_paid';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        <div className={`p-4 rounded-t-xl ${isApprove || isFee ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center gap-3">
            {isApprove || isFee
              ? <CheckCircle className="w-6 h-6 text-green-600" />
              : <XCircle className="w-6 h-6 text-red-600" />}
            <div>
              <h3 className="font-semibold text-gray-900">
                {isFee ? 'Confirm Fee Payment' : isApprove ? 'Approve Student' : 'Reject Student'}
              </h3>
              <p className="text-sm text-gray-500">{student.student_name}</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Token:</span><span className="font-mono font-semibold">{student.token_number}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Allotment:</span><span>{student.allotment_number}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Department:</span><span>{student.department_code}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Round:</span><span>{ADMISSION_ROUNDS[student.admission_round]}</span></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks {!isApprove && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={3}
              placeholder={isApprove ? 'Optional remarks...' : isFee ? 'Fee payment confirmation details...' : 'Reason for rejection (required)'}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onConfirm(remarks)}
              disabled={!isApprove && !isFee && !remarks.trim()}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-white disabled:opacity-40 ${isApprove || isFee ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              Confirm {isFee ? 'Payment' : isApprove ? 'Approval' : 'Rejection'}
            </button>
            <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StaffQueue: React.FC = () => {
  const { user } = useAuthStore();
  const stage = user?.stage_assigned || 1;
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ student: Student; action: 'approved' | 'rejected' | 'fee_paid' } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStageQueue(stage);
      setStudents(res.data.students);
    } finally {
      setLoading(false);
    }
  }, [stage]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const showMsg = (msg: string, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const handleConfirm = async (remarks: string) => {
    if (!modal) return;
    setProcessing(true);
    try {
      if (modal.action === 'fee_paid') {
        await updateFeeStatus(modal.student.id, remarks);
        showMsg(`Fee marked as paid. ${modal.student.student_name} moved to Stage 1.`);
      } else {
        await processStage(modal.student.id, modal.action, remarks);
        const nextStageMap: Record<number, number> = { 1: 2, 2: 3, 3: 4, 4: 5 };
        if (modal.action === 'approved' && nextStageMap[stage]) {
          showMsg(`${modal.student.student_name} approved → Stage ${nextStageMap[stage]}`);
        } else {
          showMsg(`${modal.student.student_name} ${modal.action}`);
        }
      }
      setModal(null);
      loadQueue();
    } catch (err) {
      showMsg(getErrorMessage(err), true);
    } finally {
      setProcessing(false);
    }
  };

  const isHelpDesk = stage === 6;

  return (
    <div className="space-y-4">
      {modal && !processing && (
        <ProcessModal
          student={modal.student}
          action={modal.action}
          onConfirm={handleConfirm}
          onClose={() => setModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Stage {stage}: {STAGE_NAMES[stage]}
          </h2>
          <p className="text-sm text-gray-500">
            {students.length} student{students.length !== 1 ? 's' : ''} in queue
          </p>
        </div>
        <button onClick={loadQueue} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">{success}</div>}

      {/* Stage info banner */}
      <div className={`rounded-xl p-4 border-2 ${STAGE_COLORS[stage]?.replace('bg-', 'bg-').replace('text-', 'border-')}`}>
        <div className="flex items-center gap-2">
          {isHelpDesk ? <HelpCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          <div className="text-sm font-medium">
            {isHelpDesk
              ? 'Help Desk: Handle fee-pending students. Mark fee as paid to move them to Stage 1.'
              : stage === 5
              ? 'Admission Completion: Verify all details and assign roll numbers to complete admissions.'
              : `Process students in FIFO order. Approve to advance to Stage ${stage + 1}.`}
          </div>
        </div>
      </div>

      {/* Queue */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">Queue is Clear!</h3>
          <p className="text-gray-400 text-sm mt-1">No students waiting in Stage {stage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student, idx) => (
            <div key={student.id} className={`bg-white rounded-xl border-2 p-5 transition-all ${idx === 0 ? 'border-blue-300 shadow-md' : 'border-gray-200'}`}>
              {idx === 0 && (
                <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  NEXT IN QUEUE
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                      {student.token_number}
                    </span>
                    <span className="text-xs text-gray-400">#{idx + 1} in queue</span>
                  </div>

                  <div className="font-semibold text-gray-900 text-lg">{student.student_name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{student.allotment_number}</div>

                  <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-400">Department</div>
                      <div className="font-medium">{student.department_name || student.department_code}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Round</div>
                      <div className="font-medium">{ADMISSION_ROUNDS[student.admission_round]}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Fee Status</div>
                      <div className={`inline-flex items-center gap-1 font-medium text-xs px-2 py-0.5 rounded-full ${student.fee_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {student.fee_paid ? '✓ Paid' : '⚠ Pending'}
                      </div>
                    </div>
                  </div>

                  {student.remarks && (
                    <div className="mt-3 text-xs bg-gray-50 text-gray-600 px-3 py-2 rounded-lg border border-gray-100">
                      <span className="font-medium">Remarks:</span> {student.remarks}
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mt-2">Registered: {formatDate(student.created_at)}</div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link
                    to={`/student/${student.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="w-4 h-4" /> Details
                  </Link>

                  {isHelpDesk ? (
                    <button
                      onClick={() => setModal({ student, action: 'fee_paid' })}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <DollarSign className="w-4 h-4" /> Mark Fee Paid
                    </button>
                  ) : stage !== 5 ? (
                    <>
                      <button
                        onClick={() => setModal({ student, action: 'approved' })}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => setModal({ student, action: 'rejected' })}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </>
                  ) : (
                    <Link
                      to={`/staff/complete/${student.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" /> Complete
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffQueue;
