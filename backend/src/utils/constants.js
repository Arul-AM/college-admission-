const STAGE_NAMES = {
  1: 'Document Verification',
  2: 'Certificate Verification',
  3: 'Online Verification',
  4: 'Admission Verification',
  5: 'Admission Completion',
  6: 'Help Desk',
};

const ADMISSION_ROUNDS = {
  R1: 'Round 1',
  UP1: 'Upgradation 1',
  R2: 'Round 2',
  UP2: 'Upgradation 2',
};

const ADMISSION_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

const STAGE_FLOW = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  6: 1,
};

const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
};

// Only admin and stage 1 staff can register students
const STUDENT_REGISTRATION_ALLOWED_STAGES = [1];

module.exports = {
  STAGE_NAMES,
  ADMISSION_ROUNDS,
  ADMISSION_STATUS,
  STAGE_FLOW,
  ROLES,
  STUDENT_REGISTRATION_ALLOWED_STAGES,
};
