import sys
import os
import traceback

# 1. إضافة المجلد الحالي إلى مسارات بايثون
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# 2. تثبيت مسار قاعدة البيانات بشكل قاطع ومطلق
os.environ["DATABASE_PATH"] = os.path.join(current_dir, "backend", "dev.db")

try:
    from a2wsgi import ASGIMiddleware
    from backend.main import app as fastapi_app
    application = ASGIMiddleware(fastapi_app)
except Exception as e:
    err_msg = traceback.format_exc()
    print(f"[STARTUP ERROR]: {err_msg}", file=sys.stderr)
    
    # دالة بديلة لعرض الخطأ بوضوح في المتصفح إذا حدثت مشكلة
    def application(environ, start_response):
        status = '500 Internal Server Error'
        html = f"""
        <html dir="rtl" style="font-family:sans-serif;background:#1e1e2f;color:#fff;padding:40px;">
            <h2 style="color:#ff6b6b">⚠️ خطأ أثناء بدء تشغيل خادم البايثون (FastAPI)</h2>
            <p>تفاصيل الخطأ الدقيقة لتشخيصها:</p>
            <pre style="background:#0f0f1a;padding:20px;border-radius:8px;color:#a8ff78;direction:ltr;overflow:auto;">{err_msg}</pre>
        </html>
        """.encode('utf-8')
        response_headers = [('Content-Type', 'text/html; charset=utf-8'),
                            ('Content-Length', str(len(html)))]
        start_response(status, response_headers)
        return [html]
