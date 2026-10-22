@echo off
chcp 65001 > nul
title تشغيل النظام المالي - وضع الويب (Web Mode)
echo ===================================================
echo       جاري تشغيل النظام المالي كموقع ويب...
echo ===================================================
echo.

REM الانتقال لمجلد المشروع
cd /d "%~dp0"

REM تحرير المنافذ إن كانت محجوزة
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo [1/2] تشغيل المحرك الخلفي (FastAPI على المنفذ 8000)...
echo [2/2] تشغيل واجهة الويب (Next.js على المنفذ 3000)...
echo.
echo ===================================================
echo افتح المتصفح على الرابط التالي:
echo http://localhost:3000
echo.
echo بيانات تسجيل الدخول:
echo اسم المستخدم: admin
echo كلمة المرور: admin
echo ===================================================
echo.

REM فتح المتصفح تلقائياً بعد ثانيتين
start "" cmd /c "timeout /t 3 /nobreak > nul && start http://localhost:3000"

call npm run web
pause
