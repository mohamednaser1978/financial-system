const fs = require('fs-extra');
const path = require('path');

async function prepareStandalone() {
  const sourceStandalone = path.join(__dirname, '.next', 'standalone');
  const sourceStatic = path.join(__dirname, '.next', 'static');
  const sourcePublic = path.join(__dirname, 'public');
  const dest = path.join(__dirname, 'dist_standalone');

  console.log('--- ENHANCED GOLD RECIPE START ---');
  
  if (fs.existsSync(dest)) {
    console.log('Cleaning old dist_standalone...');
    fs.removeSync(dest);
  }
  fs.mkdirSync(dest, { recursive: true });

  // 1. نسخ المجلد المستقل (الأساس) - تصفية صارمة جداً
  console.log('Copying Standalone Base...');
  await fs.copy(sourceStandalone, dest, { 
    dereference: false, 
    filter: (src) => {
      const basename = path.basename(src);
      // حظر قاطع لأي مجلدات بناء أو توزيع قديمة لمنع التكرار اللانهائي
      return !['dist_standalone', 'financial-system-final-build', 'build', 'build_solid', 'build_ultimate_fix', 'build_final_solid'].includes(basename);
    }
  });

  // 2. دمج ملفات Static & Public
  console.log('Merging assets...');
  if (fs.existsSync(sourceStatic)) await fs.copy(sourceStatic, path.join(dest, '.next', 'static'));
  if (fs.existsSync(sourcePublic)) await fs.copy(sourcePublic, path.join(dest, 'public'));

  // 3. قاعدة "المجلد المصفّح" (Camouflage)
  const nmPath = path.join(dest, 'node_modules');
  const internalLibsPath = path.join(dest, 'internal_libs');
  if (fs.existsSync(nmPath)) {
    console.log('CAMOUFLAGE: node_modules -> internal_libs');
    fs.renameSync(nmPath, internalLibsPath);
  }

  // 4. حقن ملفات Next.js المفقودة (تصحيح خطأ MODULE_NOT_FOUND)
  console.log('Injecting Missing Next.js Runtime Files...');
  const nextBuildSrc = path.join(__dirname, 'node_modules', 'next', 'dist', 'build');
  const nextBuildDest = path.join(internalLibsPath, 'next', 'dist', 'build');
  if (fs.existsSync(nextBuildSrc)) {
    if (!fs.existsSync(nextBuildDest)) fs.mkdirSync(nextBuildDest, { recursive: true });
    fs.copySync(nextBuildSrc, nextBuildDest);
    console.log('SUCCESS: Next.js internal components injected.');
  }

  // 5. محركات better-sqlite3 (Multi-Arch ia32/x64)
  const bs3Prebuilds = path.join(internalLibsPath, 'better-sqlite3', 'prebuilds');
  if (!fs.existsSync(bs3Prebuilds)) fs.mkdirSync(bs3Prebuilds, { recursive: true });

  ['x64', 'ia32'].forEach(arch => {
    const tarPath = path.join(__dirname, 'binaries', arch, 'node.tar.gz');
    const archDest = path.join(bs3Prebuilds, `win32-${arch}`);
    const tempExtract = path.join(__dirname, 'binaries', arch, 'extracted');
    
    if (fs.existsSync(tarPath)) {
       if (!fs.existsSync(archDest)) fs.mkdirSync(archDest, { recursive: true });
       try {
         if (fs.existsSync(tempExtract)) fs.removeSync(tempExtract);
         fs.mkdirSync(tempExtract);
         require('child_process').execSync(`tar -xzf "${tarPath}" -C "${tempExtract}"`);
         const nodeFile = path.join(tempExtract, 'build', 'Release', 'better_sqlite3.node');
         if (fs.existsSync(nodeFile)) {
           fs.copySync(nodeFile, path.join(archDest, 'node.napi.node'));
           console.log(`SUCCESS: better-sqlite3 ${arch} binary injected.`);
         }
       } catch (e) {
         console.error(`Failed to inject ${arch}:`, e.message);
       }
    }
  });

  // 6. اللمسات النهائية للمجلد المصفّح

  // 7. اللمسات النهائية للمجلد المصفّح
  console.log('Finalizing Isolated build environment...');
  fs.copySync(path.join(__dirname, 'electron.js'), path.join(dest, 'electron.js'));
  fs.copySync(path.join(__dirname, 'preload.js'), path.join(dest, 'preload.js'));
  
  // 7. حقن ملف الخلفية (Python Backend)
  const pythonExe = path.join(__dirname, 'backend.exe');
  if (fs.existsSync(pythonExe)) {
    console.log('Injecting Python Backend...');
    fs.copySync(pythonExe, path.join(dest, 'backend.exe'));
    console.log('SUCCESS: backend.exe injected.');
  } else {
    console.warn('WARNING: backend.exe NOT FOUND at root. Make sure to run package_python.ps1 first.');
  }
  
  // BOOTSTRAP FIX: Generate server-bootstrap.mjs (ESM via .mjs extension)
  // Using .mjs guarantees Node.js treats this as ES Module ALWAYS,
  // even in the packaged app where standalone/ has no package.json.
  // This fixes: "Cannot use import statement outside a module"
  const bootstrapContent = `// server-bootstrap.mjs - ALWAYS treated as ES Module by Node.js
import { join } from 'path';
import { homedir } from 'os';

// Set DATABASE_URL FIRST before any other module is evaluated
const dbPath = process.argv[2] || join(
  homedir(), 'AppData', 'Roaming',
  'financial-system', 'database', 'dev.db'
);
const normalizedUrl = 'file:' + dbPath.replace(/\\\\/g, '/');
process.env.DATABASE_URL = normalizedUrl;
console.log('[BOOTSTRAP] DB URL injected: ' + normalizedUrl);

// Load Next.js server (also ESM)
await import('./server.js');
`;
  fs.writeFileSync(path.join(dest, 'server-bootstrap.mjs'), bootstrapContent, 'utf8');
  // Remove old .cjs version if it exists
  if (fs.existsSync(path.join(dest, 'server-bootstrap.cjs')))
    fs.removeSync(path.join(dest, 'server-bootstrap.cjs'));
  console.log('SUCCESS: server-bootstrap.mjs generated.');

  // Copy mime into dist_standalone/node_modules so electron-builder
  // includes it in app.asar alongside electron.js (which imports it).
  // NOTE: mime is NOT in internal_libs (Next.js excludes it), use root node_modules.
  const mimeElectronDest = path.join(dest, 'node_modules', 'mime');
  const mimeSrc = path.join(__dirname, 'node_modules', 'mime');
  if (fs.existsSync(mimeSrc)) {
    if (!fs.existsSync(path.dirname(mimeElectronDest))) {
      fs.mkdirSync(path.dirname(mimeElectronDest), { recursive: true });
    }
    fs.copySync(mimeSrc, mimeElectronDest);
    console.log('SUCCESS: mime package added to node_modules for electron.js asar bundle.');
  } else {
    console.warn('WARNING: mime not found - electron.js may fail when packaged.');
  }

  const rootPkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const electronVer = (rootPkg.devDependencies.electron || "32.0.0").replace('^', '');

  const minimalPkg = {
    name: rootPkg.name, version: rootPkg.version, main: "electron.js", type: "module",
    dependencies: {
      "better-sqlite3": rootPkg.dependencies["better-sqlite3"],
      "mime": rootPkg.dependencies["mime"]
    },
    devDependencies: { "electron": electronVer },
    build: {
      ...rootPkg.build,
      "electronVersion": electronVer,
      "directories": { "output": "../../financial-system-final-build" },
      "files": ["electron.js", "preload.js", "package.json", "node_modules/mime/**/*"],
      "extraResources": [{
        "from": ".", "to": "standalone",
        "filter": [ "!electron.js", "!preload.js", "!build_*", "!dist_*", "!binaries", "!node_modules" ]
      }]
    }
  };
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify(minimalPkg, null, 2));
  console.log('--- ENHANCED GOLD RECIPE COMPLETE ---');
}

prepareStandalone().catch(err => {
  console.error('Build Preparation Failed:', err);
  process.exit(1);
});
