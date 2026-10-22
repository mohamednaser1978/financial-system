# دليل تحزيم تطبيقات Electron + Python (FastAPI)
## المشاكل الشائعة وحلولها

> مستخلص من تجربة حقيقية في تحزيم نظام مالي متكامل.
> يصلح لأي تطبيق Electron + Python بغض النظر عن قاعدة البيانات المستخدمة.

---

## 🔴 المشكلة 1: `attempted relative import with no known parent package`

### السبب
ملفات Python تستخدم **استيرادات نسبية** مثل:
```python
from . import models, database
from .database import Base
```
هذه الاستيرادات تفترض أن الملف جزء من **حزمة (package)**، وهو صحيح عند التشغيل بـ `python -m backend.main`، لكن **PyInstaller** يشغّل الملف مباشرةً كسكريبت مستقل فتفشل.

### الحل
استخدم `try/except` في **كل ملف** يحتوي على استيرادات نسبية:

```python
# main.py
try:
    from . import models, database      # يعمل مع: python -m backend.main
    from .database import engine, get_db
except ImportError:
    import sys, os
    sys.path.insert(0, os.path.dirname(__file__))
    import models, database             # يعمل مع: PyInstaller exe
    from database import engine, get_db

# models.py
try:
    from .database import Base
except ImportError:
    from database import Base
```

> **⚠️ مهم:** تحقق من **كل** ملفات الحزمة (models.py, database.py, schemas.py...) وليس فقط main.py.

---

## 🔴 المشكلة 2: `Unable to configure formatter 'default'` (NoneType.isatty)

### السبب
عند تشغيل uvicorn داخل exe محزّم بـ PyInstaller مع `windowsHide: true` في Electron، **لا توجد نافذة console** فتكون `sys.stdout = None`. يحاول uvicorn استخدام `stdout.isatty()` للتحقق من دعم الألوان فيفشل.

### الحل
مرّر `log_config` مخصص لـ uvicorn يستخدم `logging.Formatter` العادي بدلاً من formatter الألوان:

```python
if __name__ == "__main__":
    log_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": "logging.Formatter",   # <-- الفارق: logging.Formatter وليس uvicorn's
                "fmt": "%(levelname)s %(message)s",
            },
            "access": {
                "()": "logging.Formatter",
                "fmt": '%(asctime)s - "%(message)s"',
            },
        },
        "handlers": {
            "default": {"formatter": "default", "class": "logging.StreamHandler", "stream": "ext://sys.stderr"},
            "access":  {"formatter": "access",  "class": "logging.StreamHandler", "stream": "ext://sys.stderr"},
        },
        "loggers": {
            "uvicorn":        {"handlers": ["default"], "level": "INFO", "propagate": False},
            "uvicorn.error":  {"level": "INFO"},
            "uvicorn.access": {"handlers": ["access"], "level": "INFO", "propagate": False},
        },
    }
    uvicorn.run(app, host="0.0.0.0", port=8000, log_config=log_config)
```

---

## 🔴 المشكلة 3: `[Errno 10048] port already in use` (المنفذ مشغول)

### السبب
`backend.exe` يظل يعمل في الخلفية بعد إغلاق التطبيق، فعند إعادة التشغيل يفشل الـ exe الجديد لأن المنفذ (8000) محجوز.

### الحل — طرفان:

**أ) في electron.js:** اقتل العملية القديمة قبل إطلاق الجديدة:
```javascript
function killExistingBackend() {
  try {
    execSync('taskkill /F /IM backend.exe /T', { stdio: 'ignore' });
  } catch (e) { /* لا توجد عملية قديمة - طبيعي */ }

  // تأمين إضافي: تحرير المنفذ مباشرة
  try {
    const result = execSync('netstat -ano', { encoding: 'utf8' });
    for (const line of result.split('\n')) {
      if (line.includes(':8000 ') && line.includes('LISTENING')) {
        const pid = line.trim().split(/\s+/).pop();
        if (pid && /^\d+$/.test(pid))
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      }
    }
  } catch (e) {}
}

function startPythonBackend() {
  if (app.isPackaged) killExistingBackend(); // <-- استدعِها قبل spawn
  // ... باقي الكود
}
```

**ب) في main.py:** أضف تنظيف المنفذ داخل Python أيضاً كطبقة دفاع إضافية:
```python
if __name__ == "__main__":
    import subprocess
    try:
        result = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, timeout=5)
        for line in result.stdout.splitlines():
            if ":8000 " in line and "LISTENING" in line:
                pid = line.strip().split()[-1]
                if pid.isdigit():
                    subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True)
    except Exception:
        pass
```

---

## 🔴 المشكلة 4: PyInstaller + uvicorn/multiprocessing = تشغيل مزدوج

### السبب
uvicorn يستخدم `multiprocessing` داخلياً. عندما يُنشئ عمليات فرعية، يُعيد PyInstaller تشغيل `main.py` من أوله مما يسبب:
- تعارض على المنفذ
- نافذتين أو خادمين في نفس الوقت

### الحل
أضف هذا السطر كأول شيء في الملف، **قبل أي import آخر**:

```python
import multiprocessing
multiprocessing.freeze_support()  # CRITICAL للتوافق مع PyInstaller

# باقي الـ imports...
from fastapi import FastAPI
# ...
```

---

## 🔴 المشكلة 5: `mainWindow.loadHTML()` غير موجودة في Electron

### السبب
`BrowserWindow.loadHTML()` ليست دالة حقيقية في Electron API. إذا استُخدمت تحصل على `TypeError: mainWindow.loadHTML is not a function` وتظل النافذة بيضاء فارغة.

### الحل
استخدم `loadURL` مع Data URI بدلاً من `loadHTML`:

```javascript
// ❌ خطأ - لا تعمل
mainWindow.loadHTML('<h1>خطأ في التشغيل</h1>');

// ✅ صحيح
const errorHtml = encodeURIComponent(
  '<html><body style="background:#1a1a2e;color:white;text-align:center;padding:50px;direction:rtl">' +
  '<h1 style="color:#ff6b6b">⚠ فشل تشغيل البرنامج</h1>' +
  '<p>تعذّر الاتصال بمحرك البيانات.</p>' +
  '</body></html>'
);
mainWindow.loadURL(`data:text/html,${errorHtml}`);
```

---

## 🔴 المشكلة 6: checkServer لا يُحمّل الصفحة رغم أن الخادم يعمل

### السبب
الكود كان ينتظر `200 OK` من `/api/...`، لكن إذا كانت قاعدة البيانات تُعيد `500 Internal Error`، يستمر `checkServer` في المحاولة للأبد ولا يُحمّل الصفحة أبداً.

### الحل
**أي استجابة HTTP = الخادم جاهز.** حمّل الصفحة وخلّ التطبيق يعالج الأخطاء بنفسه:

```javascript
const checkServer = setInterval(async () => {
  attempts++;
  try {
    const res = await net.fetch(`http://localhost:${PORT}/api/health`);
    // ✅ أي استجابة (حتى 500) = الخادم يعمل، حمّل الصفحة
    clearInterval(checkServer);
    mainWindow.loadURL(`http://localhost:${PORT}`);
  } catch (e) {
    // فقط connection refused = الخادم لم يبدأ بعد، انتظر
    if (attempts > 40) {
      clearInterval(checkServer);
      mainWindow.loadURL(`data:text/html,${errorHtml}`);
    }
  }
}, 1000);
```

---

## 🔴 المشكلة 7: قاعدة البيانات فارغة عند أول تشغيل

### السبب
`create_all()` تنشئ الجداول فقط ولا تُضيف بيانات أولية. المستخدم يحصل على شاشة دخول لكن لا يمكنه تسجيل الدخول لعدم وجود مستخدم.

### الحل
أضف دالة seed تلقائية تعمل عند كل تشغيل وتتحقق أولاً من وجود البيانات:

```python
models.Base.metadata.create_all(bind=engine)

def seed_initial_data():
    """أضف بيانات أولية عند أول تشغيل فقط."""
    import uuid
    from sqlalchemy.orm import sessionmaker
    db = sessionmaker(bind=engine)()
    try:
        if not db.query(models.User).filter_by(username="admin").first():
            db.add(models.User(
                id=str(uuid.uuid4()),
                username="admin",
                password="admin",   # غيّره بعد أول دخول!
                fullName="مدير النظام",
                role="admin",
                isActive=True
            ))
            db.commit()
            print("[SEED] ✅ Admin user created.")
    except Exception as e:
        print(f"[SEED] Error: {e}")
        db.rollback()
    finally:
        db.close()

seed_initial_data()  # استدعِها مباشرة بعد create_all
```

---

## 📋 قائمة مراجعة قبل التحزيم (Checklist)

```
Backend (Python / PyInstaller):
  □ أضف multiprocessing.freeze_support() كأول سطر في main.py
  □ استبدل كل relative imports بـ try/except في جميع الملفات
  □ مرّر log_config مخصص لـ uvicorn (بدون ألوان)
  □ أضف seed_initial_data() بعد create_all() مباشرة
  □ اختبر: python backend/main.py (يجب أن يعمل بدون أخطاء import)

Frontend (Electron / electron.js):
  □ استخدم killExistingBackend() قبل كل spawn للـ backend
  □ في checkServer: أي HTTP response = الخادم جاهز (لا تنتظر 200 فقط)
  □ استبدل loadHTML() بـ loadURL('data:text/html,...')
  □ تأكد أن app.on('window-all-closed') يقتل serverProcess و pythonProcess

التحزيم النهائي:
  □ npm run build:python  ← يولّد backend.exe
  □ انسخ backend.exe إلى المجلد المناسب في dist_standalone
  □ npm run dist:win32    ← التحزيم النهائي
  □ اختبر على جهاز نظيف لا يحتوي Python أو Node.js
```

---

## 🏗️ البنية المُوصى بها للمشاريع المستقبلية

```
my-app/
├── electron.js              # نقطة دخول Electron (المسؤول عن التنسيق)
├── package.json             # scripts: build:python, dist:win32
├── frontend/                # Next.js / React / أي framework
│   └── src/
├── backend/
│   ├── __init__.py          # ملف فارغ يجعل المجلد حزمة Python
│   ├── main.py              # FastAPI + freeze_support + seed
│   ├── models.py            # try/except relative imports
│   ├── database.py          # لا relative imports هنا
│   └── requirements.txt
└── build/
    └── icon.png
```

---

*تم إعداد هذا الدليل بناءً على تجربة مشروع النظام المالي — أبريل 2026*
