@echo off
chcp 65001 > nul
title تشغيل النظام المالي - Financial System
echo ===================================================
echo           جاري تشغيل النظام المالي...
echo ===================================================
echo.

REM الانتقال إلى مجلد المشروع
cd /d "%~dp0"

REM تحرير المنافذ إن كانت محجوزة مسبقاً
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo [1/2] جاري تشغيل المحرك والواجهة...
echo [2/2] سيتم فتح نافذة البرنامج تلقائياً...
echo.
echo ===================================================
echo بيانات الدخول الافتراضية:
echo اسم المستخدم: admin
echo كلمة المرور: admin
echo ===================================================
echo.

call npm run dev:all
pause
