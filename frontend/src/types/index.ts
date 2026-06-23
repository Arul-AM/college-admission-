export interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'staff';
  stage_assigned?: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdmissionDay {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Student {
  id: string;
  token_number: string;
  allotment_number: string;
  student_name: string;
  department_id: string;
  department_code: string;
  department_name: string;
  admission_day: string;
  admission_round: 'R1' | 'UP1' | 'R2' | 'UP2';
  fee_paid: boolean;
  current_stage: number;
  admission_status: 'Pending' | 'In Progress' | 'Completed' | 'Rejected';
  roll_number?: string;
  remarks?: string;
  registered_by: string;
  registered_by_name?: string;
  completed_by?: string;
  completed_by_name?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StageHistory {
  id: string;
  student_id: string;
  stage_number: number;
  action: 'approved' | 'rejected' | 'pending' | 'fee_updated';
  remarks?: string;
  processed_by: string;
  processed_by_name: string;
  processed_by_username: string;
  created_at: string;
}

export interface StaffMember {
  id: string;
  username: string;
  full_name: string;
  role: 'staff';
  stage_assigned: number;
  is_active: boolean;
  created_at: string;
  created_by_name?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  username?: string;
  action: string;
  description: string;
  entity_type?: string;
  entity_id?: string;
  ip_address?: string;
  created_at: string;
}

export interface DashboardStats {
  total_students: string;
  fee_paid_count: string;
  fee_pending_count: string;
  help_desk_count: string;
  completed_count: string;
  in_progress_count: string;
  rejected_count: string;
}

export interface DashboardData {
  stats: DashboardStats;
  stageCounts: Record<number, number>;
  recentActivity: AuditLog[];
  completedToday: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface StudentSearchParams {
  q?: string;
  token_number?: string;
  allotment_number?: string;
  student_name?: string;
  roll_number?: string;
  department_code?: string;
  admission_day?: string;
  admission_round?: string;
  current_stage?: string;
  admission_status?: string;
  page?: number;
  limit?: number;
}
