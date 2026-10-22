@echo off
chcp 65001 > nul
title بناء ونشر الموقع المالي إلى الإنترنت
echo ===================================================
echo     جاري بناء ونشر الموقع المالي إلى السيرفر...
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] جاري تصدير واجهة الموقع (Next.js Export)...
set NEXT_PUBLIC_BASE_PATH=/financial-system
set NEXT_PUBLIC_API_URL=https://api.top1.ly
call npx next build

if %ERRORLEVEL% NEQ 0 (
    echo [خطأ] فشل بناء الواجهة. يرجى مراجعة رسائل الخطأ أعلاه.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/3] جاري تهيئة التنسيقات والأصول (Assets Fix)...
call node scripts/prepare-export.cjs

echo [3/3] جاري رفع التحديثات إلى GitHub و cPanel...
git add .
git commit -m "Auto-deploy: Update website build"
git push origin main

echo.
echo ===================================================
echo   تم إرسال التحديثات بنجاح!
echo   يقوم GitHub الآن برفع الملفات إلى الموقع عبر FTP.
echo   سيكون الموقع محدثاً خلال لحظات على الرابط:
echo   https://top1.ly/financial-system/
echo ===================================================
echo.
pause
