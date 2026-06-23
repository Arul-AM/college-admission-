export const STAGE_NAMES: Record<number, string> = {
  1: 'Document Verification',
  2: 'Certificate Verification',
  3: 'Online Verification',
  4: 'Admission Verification',
  5: 'Admission Completion',
  6: 'Help Desk',
};

export const STAGE_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-purple-100 text-purple-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-orange-100 text-orange-800',
  5: 'bg-green-100 text-green-800',
  6: 'bg-red-100 text-red-800',
};

export const ADMISSION_ROUNDS: Record<string, string> = {
  R1: 'Round 1',
  UP1: 'Upgradation 1',
  R2: 'Round 2',
  UP2: 'Upgradation 2',
};

export const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-green-100 text-green-700',
  'Rejected': 'bg-red-100 text-red-700',
};

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
