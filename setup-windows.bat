@echo off
echo ============================================
echo  College Admission Management System Setup
echo ============================================
echo.

echo [1/4] Setting up Backend...
cd backend
copy .env.example .env
call npm install
echo.

echo [2/4] Running database migrations...
call npm run db:migrate
echo.

echo [3/4] Seeding database...
call npm run db:seed
echo.

echo [4/4] Setting up Frontend...
cd ..\frontend
copy .env.example .env
call npm install
echo.

echo ============================================
echo  Setup Complete!
echo ============================================
echo.
echo To start the app:
echo   Terminal 1 (backend):  cd backend ^&^& npm start
echo   Terminal 2 (frontend): cd frontend ^&^& npm run dev
echo.
echo Then open: http://localhost:5173
echo.
echo Login: admin / Admin@123
echo ============================================
pause
