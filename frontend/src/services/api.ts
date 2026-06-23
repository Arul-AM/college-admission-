import axios from 'axios';
import { API_URL } from '../constants';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ──────────────────────────────────────
export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password });

export const getProfile = () => api.get('/auth/profile');

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.put('/auth/change-password', { currentPassword, newPassword });

// ─── Staff ─────────────────────────────────────
export const getStaff = () => api.get('/staff');
export const createStaff = (data: object) => api.post('/staff', data);
export const updateStaff = (id: string, data: object) => api.put(`/staff/${id}`, data);
export const toggleStaffStatus = (id: string) => api.patch(`/staff/${id}/toggle-status`);
export const resetStaffPassword = (id: string, new_password: string) =>
  api.put(`/staff/${id}/reset-password`, { new_password });

// ─── Departments ───────────────────────────────
export const getDepartments = () => api.get('/departments');
export const getAllDepartments = () => api.get('/departments/all');
export const createDepartment = (data: object) => api.post('/departments', data);
export const updateDepartment = (id: string, data: object) => api.put(`/departments/${id}`, data);

// ─── Admission Days ────────────────────────────
export const getAdmissionDays = () => api.get('/admission-days');
export const getActiveDay = () => api.get('/admission-days/active');
export const setActiveDay = (id: string) => api.patch(`/admission-days/${id}/activate`);
export const createAdmissionDay = (name: string) => api.post('/admission-days', { name });

// ─── Students ──────────────────────────────────
export const registerStudent = (data: object) => api.post('/students', data);
export const getStudent = (id: string) => api.get(`/students/${id}`);
export const searchStudents = (params: object) => api.get('/students/search', { params });
export const exportStudents = () => api.get('/students/export', { responseType: 'blob' });

// ─── Queue ─────────────────────────────────────
export const getStageQueue = (stage: number) => api.get(`/queue/${stage}`);

// ─── Stage Processing ──────────────────────────
export const processStage = (studentId: string, action: string, remarks?: string) =>
  api.post(`/students/${studentId}/process`, { action, remarks });

export const completeAdmission = (studentId: string, roll_number: string) =>
  api.post(`/students/${studentId}/complete`, { roll_number });

export const updateFeeStatus = (studentId: string, remarks?: string) =>
  api.post(`/students/${studentId}/fee-paid`, { remarks });

// ─── Dashboard ─────────────────────────────────
export const getAdminDashboard = () => api.get('/dashboard/admin');
export const getStaffDashboard = () => api.get('/dashboard/staff');

// ─── Audit Logs ────────────────────────────────
export const getAuditLogs = (params?: object) => api.get('/audit-logs', { params });

export default api;
