# 🎓 College Admission Management System

A production-ready full-stack web application for managing college admissions with multi-stage workflow, RBAC, and real-time queue management.

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18+ | https://nodejs.org |
| PostgreSQL | v14+ | https://postgresql.org/download |
| npm | v9+ | Comes with Node.js |

---

## 📦 Installation Steps

### Step 1 — Clone / Extract Project

```bash
# If downloaded as zip, extract it first, then:
cd college-admission-system
```

### Step 2 — Setup Database

```bash
# Open PostgreSQL shell (psql)
psql -U postgres

# Run these commands inside psql:
CREATE DATABASE college_admission_db;
CREATE USER admission_user WITH PASSWORD 'admission_pass_2024';
GRANT ALL PRIVILEGES ON DATABASE college_admission_db TO admission_user;
\q
```

### Step 3 — Setup Backend

```bash
cd backend
cp .env.example .env        # Copy environment file
npm install                 # Install dependencies
npm run db:migrate          # Run database migrations (creates all tables)
npm run db:seed             # Seed initial data (admin user + sample data)
npm start                   # Start backend server on port 5000
```

### Step 4 — Setup Frontend (new terminal)

```bash
cd frontend
cp .env.example .env        # Copy environment file
npm install                 # Install dependencies
npm run dev                 # Start frontend on port 5173
```

### Step 5 — Open Browser

```
http://localhost:5173
```

---

## 🔐 Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@123` |
| Staff (Stage 1) | `staff1` | `Staff@123` |
| Staff (Stage 2) | `staff2` | `Staff@123` |
| Staff (Stage 3) | `staff3` | `Staff@123` |
| Staff (Stage 4) | `staff4` | `Staff@123` |
| Staff (Stage 5) | `staff5` | `Staff@123` |
| Staff (Stage 6) | `staff6` | `Staff@123` |

> ⚠️ Change all passwords immediately after first login in production.

---

## 🏗️ Project Structure

```
college-admission-system/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── config/             # DB, JWT config
│   │   ├── controllers/        # Route handlers
│   │   ├── middleware/         # Auth, RBAC, validation
│   │   ├── models/             # Database models
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic
│   │   └── utils/              # Helpers
│   ├── migrations/             # SQL migration files
│   ├── seeds/                  # Seed data
│   └── .env.example
├── frontend/                   # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Route pages
│   │   ├── services/           # API calls
│   │   ├── store/              # State management
│   │   ├── types/              # TypeScript types
│   │   └── constants/          # App constants
│   └── .env.example
└── README.md
```

---

## ⚙️ Environment Variables

### Backend `.env`
```env
DATABASE_URL=postgresql://admission_user:admission_pass_2024@localhost:5432/college_admission_db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=8h
PORT=5000
NODE_ENV=development
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🎯 Features

- ✅ 6-Stage Admission Workflow
- ✅ Role-Based Access Control (Admin + 6 Staff Roles)
- ✅ Token Generation System (D1-R1-CSE-0001 format)
- ✅ Queue Management (FIFO per department/round/day)
- ✅ Fee Routing (Paid → Stage 1, Unpaid → Stage 6)
- ✅ Admin Dashboard with Analytics
- ✅ Audit Logging
- ✅ Student Search & Filters
- ✅ Export Reports (CSV)
- ✅ JWT Authentication
- ✅ Stage Skip Prevention
- ✅ Roll Number Assignment (Stage 5)

---

## 🔧 Troubleshooting

**Database connection failed?**
```bash
# Check PostgreSQL is running
sudo service postgresql start   # Linux
brew services start postgresql  # Mac
# Windows: Open Services and start PostgreSQL
```

**Port already in use?**
```bash
# Change PORT in backend/.env to 5001
# Change VITE_API_URL in frontend/.env to match
```

**npm install fails?**
```bash
# Clear cache and retry
npm cache clean --force
npm install
```
