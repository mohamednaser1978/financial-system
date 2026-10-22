import { app, BrowserWindow, protocol, net, Menu } from 'electron';
import path from 'path';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import mime from 'mime';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- DB PATH (unified for both Python and Next.js) ---
const userDataPath = app.getPath('userData');
const appDbDir = path.join(userDataPath, 'data');
if (!fs.existsSync(appDbDir)) fs.mkdirSync(appDbDir, { recursive: true });
const appDbPath = path.join(appDbDir, 'dev.db');
// --------------------------------------------------------

const isDev = !app.isPackaged;
const PORT = 3000;
const PYTHON_PORT = 8000;
let serverProcess = null;
let pythonProcess = null;
let mainWindow = null;

// إعداد ملف تسجيل الأخطاء للتشخيص على سطح المكتب
const logPath = path.join(app.getPath('desktop'), 'financial-app-debug.log');
function logToFile(msg) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
  } catch (e) {
    console.error('Failed to log to file:', e);
  }
}

// مسارات المجلدات الثابتة
const STATIC_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'standalone', '.next', 'static')
  : path.join(__dirname, 'dist_standalone', '.next', 'static');

const PUBLIC_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'standalone', 'public')
  : path.join(__dirname, 'dist_standalone', 'public');

// تسجيل البروتوكول المخصص
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
]);

function getShortPath(longPath) {
  try {
    if (process.platform !== 'win32') return longPath;
    // الكود الجديد يتحقق هل المسار لملف أم لمجلد لاستخدام الدالة المناسبة
    const isFile = fs.existsSync(longPath) && fs.lstatSync(longPath).isFile();
    const method = isFile ? 'GetFile' : 'GetFolder';
    const command = `powershell -Command "(New-Object -ComObject Scripting.FileSystemObject).${method}('${longPath}').ShortPath"`;
    const shortPath = execSync(command).toString().trim();
    return shortPath || longPath;
  } catch (err) {
    logToFile(`Error getting short path: ${err.message}`);
    return longPath;
  }
}

function startNextServer() {
  const serverPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'standalone', 'server.js')
    : path.join(__dirname, 'dist_standalone', 'server.js');

  logToFile(`Checking for server at: ${serverPath}`);

  if (!fs.existsSync(serverPath)) {
    logToFile(`ERROR: Next.js server not found at: ${serverPath}`);
    return null;
  }

  const standaloneDir = path.dirname(serverPath);
  
  // استعادة المكتبات المخفية عبر وصلة العبور
  restoreJunction(standaloneDir);

  // التشخيص
  logNodeModules(standaloneDir);
  const shortStandaloneDir = getShortPath(standaloneDir);
  
  // قاعدة البيانات: نفس المسار الذي يستخدمه Python (appDbPath)
  const dbDestPath = appDbPath;
  logToFile(`Database path: ${dbDestPath}`);
  // ضمان وجود المجلد (تم إنشاؤه مسبقاً في أعلى الملف)
  // SQLite/SQLAlchemy ستُنشئ الملف تلقائياً عند أول تشغيل Python

  const env = { 
    ...process.env, 
    NODE_ENV: 'production', 
    PORT: PORT.toString(),
    HOSTNAME: 'localhost',
    DATABASE_URL: `file:${appDbPath.replace(/\\/g, '/')}`,
    NODE_PATH: `${path.join(standaloneDir, 'node_modules')};${path.join(standaloneDir, 'internal_libs')}`,
    ELECTRON_RUN_AS_NODE: '1'
  };

  const shortExecPath = getShortPath(process.execPath);
  // Use .mjs bootstrap to guarantee ES Module treatment (no package.json needed)
  const bootstrapPath = path.join(standaloneDir, 'server-bootstrap.mjs');
  const shortBootstrapPath = fs.existsSync(bootstrapPath)
    ? path.join(shortStandaloneDir, 'server-bootstrap.mjs')
    : path.join(shortStandaloneDir, 'server.js');

  logToFile(`Spawning: ${shortBootstrapPath}`);

  const server = spawn(shortExecPath, [shortBootstrapPath, dbDestPath], { 
    cwd: shortStandaloneDir,
    env,
    stdio: 'pipe',
    windowsHide: true,
    shell: false
  });

  server.on('error', (err) => {
    logToFile(`[Spawn Error]: ${err.message}`);
    console.error(`[Spawn Error]: ${err.message}`);
  });

  server.stdout.on('data', (data) => {
    logToFile(`[Internal Server]: ${data}`);
    console.log(`[Internal Server]: ${data}`);
  });

  server.stderr.on('data', (data) => {
    logToFile(`[Server Error]: ${data}`);
    console.error(`[Server Error]: ${data}`);
  });

  return server;
}

function killExistingBackend() {
  // Kill any lingering backend.exe that may be holding port 8000
  try {
    execSync('taskkill /F /IM backend.exe /T', { stdio: 'ignore' });
    logToFile('Killed existing backend.exe processes.');
  } catch (e) {
    // No existing process - this is fine
  }
  // Also free port 8000 directly
  try {
    const result = execSync('netstat -ano', { encoding: 'utf8' });
    for (const line of result.split('\n')) {
      if (line.includes(':8000 ') && line.includes('LISTENING')) {
        const pid = line.trim().split(/\s+/).pop();
        if (pid && /^\d+$/.test(pid)) {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          logToFile(`Freed port 8000 from PID ${pid}`);
        }
      }
    }
  } catch (e) { /* ignore */ }
}

function startPythonBackend() {
  const pythonExeName = 'backend.exe';
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'standalone', pythonExeName)
    : path.join(__dirname, 'backend', 'main.py'); // In dev, we use main.py

  logToFile(`Checking for Python backend at: ${backendPath}`);

  // Kill any previous instance before starting a new one
  killExistingBackend();

  // استخدم المسار المختصر (8.3) لتجنب مشاكل الحروف العربية مع Python/SQLAlchemy
  const shortDbDir = getShortPath(appDbDir);
  const shortDbPath = path.join(shortDbDir, 'dev.db');
  logToFile(`DB short path for Python: ${shortDbPath}`);

  const env = {
    ...process.env,
    DATABASE_PATH: shortDbPath,
  };

  if (app.isPackaged) {
    if (!fs.existsSync(backendPath)) {
      logToFile(`ERROR: Python backend EXE not found at: ${backendPath}`);
      return null;
    }
    logToFile(`Spawning Packaged Python: ${backendPath}`);
    pythonProcess = spawn(backendPath, [], { env, windowsHide: true });
  } else {
    logToFile(`Spawning Dev Python: python ${backendPath}`);
    pythonProcess = spawn('python', [backendPath], { env });
  }

  pythonProcess.stdout.on('data', (data) => {
    logToFile(`[Python STDOUT]: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    logToFile(`[Python STDERR]: ${data}`);
  });

  pythonProcess.on('error', (err) => {
    logToFile(`[Python Error]: ${err.message}`);
  });

  return pythonProcess;
}

function logNodeModules(standaloneDir) {
  try {
    const nmPath = path.join(standaloneDir, 'node_modules'); 
    if (fs.existsSync(nmPath)) {
      const files = fs.readdirSync(nmPath);
      logToFile(`--- node_modules Inventory (${files.length} items) ---`);
      logToFile(files.slice(0, 50).join(', '));
    } else {
      logToFile('node_modules folder NOT FOUND (Normal if camouflaged).');
    }
  } catch (err) {
    logToFile(`Error logging node_modules: ${err.message}`);
  }
}

function restoreJunction(standaloneDir) {
  const nmPath = path.join(standaloneDir, 'node_modules');
  const internalLibsPath = path.join(standaloneDir, 'internal_libs');

  if (fs.existsSync(internalLibsPath)) {
    try {
      // إزالة أي وصلة قديمة أو مجلد قديم لضمان نظافة العملية
      if (fs.existsSync(nmPath)) {
        logToFile('Stale node_modules found. Removing...');
        execSync(`cmd /c rmdir /s /q "${nmPath}"`);
      }
      
      logToFile('Shadow Junction: Linking node_modules -> internal_libs...');
      const command = `cmd /c mklink /j "${nmPath}" "${internalLibsPath}"`;
      execSync(command);
      logToFile('SUCCESS: Shadow Junction created.');
    } catch (err) {
      logToFile(`ERROR managing junction: ${err.message}`);
    }
  } else {
    logToFile('CRITICAL: internal_libs NOT FOUND. Camouflage failed.');
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, title: 'Financial System',
    autoHideMenuBar: true,
    icon: app.isPackaged 
      ? path.join(process.resourcesPath, 'standalone', 'public', 'icon.png')
      : path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
  });
  Menu.setApplicationMenu(null);

  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    let pathname = url.pathname;
    if (pathname === '/index' || pathname === '/index.html') pathname = '/';

    if (pathname.startsWith('/_next/static/')) {
      const filePath = path.join(STATIC_PATH, pathname.replace('/_next/static/', ''));
      if (fs.existsSync(filePath)) {
        return new Response(fs.readFileSync(filePath), {
          headers: { 'Content-Type': mime.getType(filePath) || 'text/plain' }
        });
      }
    }

    const publicFilePath = path.join(PUBLIC_PATH, pathname === '/' ? 'favicon.ico' : pathname);
    if (fs.existsSync(publicFilePath) && fs.statSync(publicFilePath).isFile()) {
      return new Response(fs.readFileSync(publicFilePath), {
        headers: { 'Content-Type': mime.getType(publicFilePath) || 'text/plain' }
      });
    }

    const targetUrl = `http://localhost:${PORT}${pathname}${url.search}`;
    try {
      return await net.fetch(targetUrl, {
        method: request.method, headers: request.headers,
        body: request.body, duplex: 'half'
      });
    } catch (e) {
      return new Response('Connection Error', { status: 502 });
    }
  });

  serverProcess = startNextServer();
  pythonProcess = startPythonBackend();

  let attempts = 0;
  const checkServer = setInterval(async () => {
    attempts++;
    logToFile(`Checking server attempt ${attempts}...`);
    try {
      // Any HTTP response (even 500) means Next.js is alive and ready to serve pages
      const res = await net.fetch(`http://localhost:${PORT}/api/settings`);
      logToFile(`Server responded with status: ${res.status}`);
      clearInterval(checkServer);
      mainWindow.loadURL(`http://localhost:${PORT}`);
    } catch (e) {
      // Connection refused = server not ready yet, keep waiting
      if (attempts > 40) {
        clearInterval(checkServer);
        logToFile(`FATAL: Server never responded after ${attempts} attempts. Error: ${e.message}`);
        // loadHTML does not exist in Electron - use loadURL with data URI instead
        const errorHtml = encodeURIComponent(
          '<html><body style="background:#1a1a2e;color:white;font-family:sans-serif;text-align:center;padding:50px;direction:rtl">' +
          '<h1 style="color:#ff6b6b">⚠ فشل تشغيل البرنامج</h1>' +
          '<p>تعذّر الاتصال بمحرك البيانات. يرجى مراجعة ملف السجل على سطح المكتب.</p>' +
          '</body></html>'
        );
        mainWindow.loadURL(`data:text/html,${errorHtml}`);
      }
    }
  }, 1000);

}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (pythonProcess) pythonProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});