`const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, requireAdmin, canRegisterStudents } = require('../middleware/auth');

const authCtrl    = require('../controllers/authController');
const staffCtrl   = require('../controllers/staffController');
const deptCtrl    = require('../controllers/departmentController');
const dayCtrl     = require('../controllers/admissionDayController');
const studentCtrl = require('../controllers/studentController');
const dashCtrl    = require('../controllers/dashboardController');
const tokenCtrl   = require('../controllers/tokenController');
const preloadCtrl = require('../controllers/preloadController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Auth ──────────────────────────────────────
router.post('/auth/login',           authCtrl.login);
router.get('/auth/profile',          authenticate, authCtrl.getProfile);
router.put('/auth/change-password',  authenticate, authCtrl.changePassword);

// ─── Staff Management ──────────────────────────
router.get('/staff',                     authenticate, requireAdmin, staffCtrl.getAllStaff);
router.post('/staff',                    authenticate, requireAdmin, staffCtrl.createStaff);
router.put('/staff/:id',                 authenticate, requireAdmin, staffCtrl.updateStaff);
router.patch('/staff/:id/toggle-status', authenticate, requireAdmin, staffCtrl.toggleStaffStatus);
router.put('/staff/:id/reset-password',  authenticate, requireAdmin, staffCtrl.resetStaffPassword);

// ─── Departments ───────────────────────────────
router.get('/departments',       authenticate, deptCtrl.getActiveDepartments);
router.get('/departments/all',   authenticate, requireAdmin, deptCtrl.getAllDepartments);
router.post('/departments',      authenticate, requireAdmin, deptCtrl.createDepartment);
router.put('/departments/:id',   authenticate, requireAdmin, deptCtrl.updateDepartment);

// ─── Admission Days ────────────────────────────
router.get('/admission-days',                authenticate, dayCtrl.getAllDays);
router.get('/admission-days/active',         authenticate, dayCtrl.getActiveDay);
router.post('/admission-days',               authenticate, requireAdmin, dayCtrl.createDay);
router.patch('/admission-days/:id/activate', authenticate, requireAdmin, dayCtrl.setActiveDay);

// ─── Students ──────────────────────────────────
router.post('/students',            authenticate, canRegisterStudents, studentCtrl.registerStudent);
router.get('/students/search',      authenticate, studentCtrl.searchStudents);
router.get('/students/export',      authenticate, requireAdmin, studentCtrl.exportStudents);
router.delete('/students/all',      authenticate, requireAdmin, studentCtrl.clearAllStudents);  // ← BEFORE /:id
router.get('/students/:id',         authenticate, studentCtrl.getStudent);

// ─── Queue & Stage Processing ──────────────────
router.get('/queue/:stage',            authenticate, studentCtrl.getStageQueue);
router.post('/students/:id/process',   authenticate, studentCtrl.processStage);
router.post('/students/:id/complete',  authenticate, studentCtrl.completeAdmission);
router.post('/students/:id/fee-paid',  authenticate, studentCtrl.updateFeeStatus);

// ─── Dashboard ─────────────────────────────────
router.get('/dashboard/admin', authenticate, requireAdmin, dashCtrl.getDashboard);
router.get('/dashboard/staff', authenticate, dashCtrl.getStaffDashboard);

// ─── Audit Logs ────────────────────────────────
router.get('/audit-logs', authenticate, requireAdmin, dashCtrl.getAuditLogs);

// ─── Token Generator (standalone Excel) ────────
router.post('/tokens/generate-excel', authenticate, requireAdmin, upload.single('file'), tokenCtrl.generateFromExcel);
router.post('/tokens/reset',          authenticate, requireAdmin, tokenCtrl.resetSequences);

// ─── Student Preload ───────────────────────────
router.post('/preload/upload',           authenticate, requireAdmin, upload.single('file'), preloadCtrl.uploadStudents);
router.get('/preload/list',              authenticate, requireAdmin, preloadCtrl.listPreloaded);
router.delete('/preload/clear',          authenticate, requireAdmin, preloadCtrl.clearPreloaded);
router.get('/preload/lookup/:allotment', authenticate, preloadCtrl.lookupByAllotment);

module.exports = router;
`