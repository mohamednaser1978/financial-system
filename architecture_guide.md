# دليل الهندسة البرمجية: دمج Python مع Electron (بديل Prisma)

هذا الدليل يلخص "الوصفة التقنية" التي استخدمناها لبناء نظام مالي مستقر، خفيف الحجم، وسهل التوزيع لمعمارية 32-bit و 64-bit.

## 1. الهيكل العام (Architecture)
تعتمد الفكرة على تقسيم البرنامج إلى ثلاث طبقات منفصلة:
- **الواجهة (Frontend):** Next.js/React (تتعامل فقط مع الـ API).
- **المحرك (Backend):** Python FastAPI (مسؤول عن منطق العمل وقاعدة البيانات).
- **الحاوية (Container):** Electron (يربط الطرفين ويحولهم إلى برنامج سطح مكتب).

---

## 2. المحرك الخلفي (Python Backend)
بدلاً من استخدام Prisma في Node.js، نستخدم **SQLAlchemy** مع **FastAPI**.
- **الميزة:** التحكم الكامل في قاعدة البيانات، سرعة عالية في معالجة البيانات الضخمة، ودعم ممتاز لأنظمة 32-bit.
- **قاعدة البيانات:** يتم استقبال مسار قاعدة البيانات عبر "متغير بيئة" (Environment Variable) لضمان المرونة.

```python
# مثال في database.py
DATABASE_PATH = os.environ.get("DATABASE_PATH", "./dev.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
```

---

## 3. الربط عبر Electron (Process Management)
هذا هو الجزء الأهم؛ حيث يقوم Electron بدور "المدير" الذي يشغل المحركين معاً:

1.  **في مرحلة التطوير (Dev):** يشغل ملف `main.py` مباشرة.
2.  **في الإنتاج (Prod):** يشغل ملف `backend.exe` الذي تم تحويله.
3.  **إدارة دورة الحياة:** عند إغلاق نافذة البرنامج، يقوم Electron بإرسال أمر إغلاق (`kill`) لعملية Python لضمان عدم بقائها تعمل في الخلفية.

```javascript
// في electron.js
pythonProcess = spawn(backendPath, [], { 
  env: { DATABASE_PATH: appDbPath },
  windowsHide: true // لإخفاء الشاشة السوداء
});
```

---

## 4. استراتيجية تخزين البيانات (Persistence)
لضمان عدم ضياع البيانات عند التحديث:
- نستخدم `app.getPath('userData')` في Electron للحصول على مسار مجلد المستخدم.
- نمرر هذا المسار لمحرك Python عند التشغيل.
- تظل قاعدة البيانات في هذا مسار المستقل حتى لو تم حذف البرنامج وتثبيته مرة أخرى.

---

## 5. استراتيجية التحزيم (Packaging Strategy)
تتم العملية على مرحلتين:

### المرحلة أ: تحزيم Python (عبر PyInstaller)
نحول كود Python إلى ملف `.exe` واحد صامت (بدون نافذة سوداء).
```bash
pyinstaller --onefile --noconsole --name backend backend/main.py
```

### المرحلة ب: تحزيم Electron (عبر Electron Builder)
- يتم وضع `backend.exe` داخل مجلد الموارد (`extraResources`).
- يقوم Electron Builder بجمع واجهة الـ Next.js مع محرك الـ Python في ملف تثبيت واحد.

---

## 6. لماذا هذه الطريقة أفضل من Prisma؟
1.  **الحجم:** Prisma تضيف ~100MB من المحركات (Engines)، بينما Python + SQLite لا تضيف إلا القليل.
2.  **التوافق:** Prisma تواجه مشاكل في أنظمة 32-bit القديمة، بينما Python يعمل بثبات تام.
3.  **السرعة:** التعامل مع SQLite عبر Python (SQLAlchemy) أسرع بمراحل في العمليات المعقدة والتقارير المالية.
4.  **الاستقلالية:** يمكنك تطوير واختبار المحرك (Backend) وتجربته عبر المتصفح بشكل منفصل تماماً عن الواجهة.

---

## 7. مشاكل التحزيم وحلولها (Packaging Troubleshooting)

> هذا القسم يوثّق المشاكل الحقيقية التي واجهناها عند تحزيم هذا المشروع، وطريقة حل كل منها.

---

### 🔴 المشكلة 1: `attempted relative import with no known parent package`

**الملف:** `backend/main.py` و `backend/models.py`

**السبب:** PyInstaller يشغّل الملفات كسكريبت مستقل وليس كحزمة، فتفشل الاستيرادات النسبية مثل `from . import models`.

**الحل:** استخدام `try/except` في كل ملف يحتوي على استيرادات نسبية:
```python
# في main.py
try:
    from . import models, database
    from .database import engine, get_db
except ImportError:
    import sys, os
    sys.path.insert(0, os.path.dirname(__file__))
    import models, database
    from database import engine, get_db

# في models.py
try:
    from .database import Base
except ImportError:
    from database import Base
```

---

### 🔴 المشكلة 2: `Unable to configure formatter 'default'` (NoneType.isatty)

**الملف:** `backend/main.py` — عند استدعاء `uvicorn.run()`

**السبب:** عند التشغيل بـ `windowsHide: true`، لا توجد نافذة console فتكون `sys.stdout = None`، ويحاول uvicorn استدعاء `stdout.isatty()` فيفشل.

**الحل:** تمرير `log_config` مخصص يستخدم `logging.Formatter` العادي بدلاً من formatter الألوان:
```python
if __name__ == "__main__":
    log_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {"()": "logging.Formatter", "fmt": "%(levelname)s %(message)s"},
            "access":  {"()": "logging.Formatter", "fmt": '%(asctime)s - "%(message)s"'},
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

### 🔴 المشكلة 3: PyInstaller + uvicorn = تشغيل مزدوج وتعارض على المنفذ

**الملف:** `backend/main.py` — أول سطر في الملف

**السبب:** uvicorn يستخدم `multiprocessing` داخلياً، فيُعيد PyInstaller تشغيل `main.py` كاملاً عند إنشاء أي عملية فرعية، مما يُسبب تعارضاً على المنفذ.

**الحل:** إضافة `freeze_support()` كأول سطر في الملف، قبل أي import آخر:
```python
import multiprocessing
multiprocessing.freeze_support()  # يجب أن يكون أول سطر في main.py

from fastapi import FastAPI
# ... باقي الـ imports
```

---

### 🔴 المشكلة 4: `backend.exe` يظل يعمل في الخلفية بعد الإغلاق

**الملف:** `electron.js` — دالة `startPythonBackend()`

**السبب:** عند إعادة تشغيل التطبيق، يجد المنفذ 8000 مشغولاً من النسخة القديمة.

**الحل:** إضافة دالة `killExistingBackend()` تُستدعى قبل كل `spawn`:
```javascript
function killExistingBackend() {
  try { execSync('taskkill /F /IM backend.exe /T', { stdio: 'ignore' }); } catch (e) {}
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
  if (app.isPackaged) killExistingBackend(); // قبل spawn دائماً
  // ...
}
```

---

### 🔴 المشكلة 5: `mainWindow.loadHTML()` تُسبب شاشة بيضاء فارغة

**الملف:** `electron.js` — كود `checkServer`

**السبب:** `BrowserWindow.loadHTML()` **غير موجودة** في Electron API، فتظل النافذة فارغة بدون أي خطأ ظاهر.

**الحل:** استخدام `loadURL` مع Data URI:
```javascript
// ❌ خطأ
mainWindow.loadHTML('<h1>خطأ</h1>');

// ✅ صحيح
const errorHtml = encodeURIComponent('<html><body>خطأ في التشغيل</body></html>');
mainWindow.loadURL(`data:text/html,${errorHtml}`);
```

---

### 🔴 المشكلة 6: `checkServer` لا يُحمّل الصفحة رغم أن الخادم يعمل

**الملف:** `electron.js` — `setInterval` الخاص بفحص الخادم

**السبب:** الكود كان ينتظر `200 OK` فقط، لكن API قد يُعيد `500` بسبب مشكلة مؤقتة في قاعدة البيانات، فيستمر في الانتظار إلى الأبد.

**الحل:** أي استجابة HTTP (حتى لو 500) تعني أن الخادم جاهز:
```javascript
const checkServer = setInterval(async () => {
  attempts++;
  try {
    await net.fetch(`http://localhost:${PORT}/api/health`);
    // أي استجابة = الخادم يعمل، حمّل الصفحة
    clearInterval(checkServer);
    mainWindow.loadURL(`http://localhost:${PORT}`);
  } catch (e) {
    // connection refused = الخادم لم يبدأ بعد
    if (attempts > 40) {
      clearInterval(checkServer);
      mainWindow.loadURL(`data:text/html,${errorHtml}`);
    }
  }
}, 1000);
```

---

### 🔴 المشكلة 7: قاعدة البيانات فارغة عند أول تشغيل (لا يوجد مستخدم للدخول)

**الملف:** `backend/main.py` — بعد `create_all()` مباشرة

**السبب:** `create_all()` تُنشئ الجداول فقط بدون إدراج بيانات أولية.

**الحل:** دالة seed تعمل تلقائياً عند كل تشغيل وتتحقق أولاً من وجود البيانات:
```python
models.Base.metadata.create_all(bind=engine)

def seed_initial_data():
    import uuid
    from sqlalchemy.orm import sessionmaker
    db = sessionmaker(bind=engine)()
    try:
        if not db.query(models.User).filter_by(username="admin").first():
            db.add(models.User(
                id=str(uuid.uuid4()), username="admin", password="admin",
                fullName="مدير النظام", role="admin", isActive=True
            ))
            db.commit()
            print("[SEED] ✅ Admin user created.")
    except Exception as e:
        print(f"[SEED] Error: {e}")
        db.rollback()
    finally:
        db.close()

seed_initial_data()
```

---

### 🔴 المشكلة 8: مسار قاعدة البيانات يحتوي على حروف عربية فيفشل SQLAlchemy

**الملفات:** `electron.js` و `backend/database.py`

**السبب:** مسار مثل `C:\Users\محمد\AppData\...` يحتوي على حروف عربية تُسبب فشلاً صامتاً في SQLAlchemy داخل PyInstaller، مما يمنع إنشاء البيانات أو قراءتها.

**الحل — طرفان:**

**في `electron.js`:** أرسل المسار المختصر (8.3 format) لـ Python:
```javascript
// المجلد موجود مسبقاً، لذا يمكن أخذ مساره المختصر
const shortDbDir = getShortPath(appDbDir);      // C:\Users\69F8~1\AppData\...
const shortDbPath = path.join(shortDbDir, 'dev.db');

const env = {
    ...process.env,
    DATABASE_PATH: shortDbPath,  // بدون حروف عربية
};
```

**في `backend/database.py`:** حوّل الـ backslashes وتأكد من وجود المجلد:
```python
DATABASE_PATH = os.environ.get("DATABASE_PATH", "./dev.db")
DATABASE_PATH = DATABASE_PATH.replace("\\", "/")  # SQLAlchemy يحتاج forward slashes

_db_dir = os.path.dirname(DATABASE_PATH)
if _db_dir and not os.path.exists(_db_dir):
    os.makedirs(_db_dir, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
print(f"[DATABASE] Connecting to: {SQLALCHEMY_DATABASE_URL}")
```

---

### 🔴 المشكلة 9: مسارا قاعدة البيانات مختلفان بين Python و Next.js

**الملف:** `electron.js`

**السبب:** Python كان يستقبل مساراً (`database/dev.db`) بينما Next.js كان يقرأ من مسار آخر (`prisma/dev.db`)، أي كانا يتحدثان إلى ملفين مختلفين.

**الحل:** تعريف متغير واحد `appDbPath` مشترك في أعلى الملف يُستخدم في كل مكان:
```javascript
// أعلى electron.js — مرة واحدة فقط
const userDataPath = app.getPath('userData');
const appDbDir = path.join(userDataPath, 'data');
if (!fs.existsSync(appDbDir)) fs.mkdirSync(appDbDir, { recursive: true });
const appDbPath = path.join(appDbDir, 'dev.db');

// ثم يُستخدم appDbPath (أو نسخته المختصرة) في كل spawn
```

---

### 📋 قائمة مراجعة التحزيم النهائية

```
Python (backend/main.py):
  ✅ أضف multiprocessing.freeze_support() كأول سطر
  ✅ استبدل كل relative imports بـ try/except
  ✅ مرّر log_config مخصص لـ uvicorn بدون ألوان
  ✅ أضف seed_initial_data() بعد create_all()

Python (backend/database.py):
  ✅ حوّل backslashes: DATABASE_PATH.replace("\\", "/")
  ✅ أنشئ المجلد إن لم يوجد: os.makedirs(...)

Electron (electron.js):
  ✅ عرّف appDbPath مرة واحدة واستخدمه في كل مكان
  ✅ أرسل shortDbPath (مسار 8.3) لـ Python
  ✅ استدعِ killExistingBackend() قبل كل spawn
  ✅ في checkServer: أي HTTP response = الخادم جاهز
  ✅ استخدم loadURL('data:text/html,...') بدلاً من loadHTML()
```
