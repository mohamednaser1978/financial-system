import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function forceInstallArch(pkgName, destPath) {
    console.log(`--- Forcing Download of ${pkgName} ---`);
    const tempDir = path.join(__dirname, 'temp_download');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    try {
        // 1. تحميل الحزمة كملف مضغوط
        console.log(`Packing ${pkgName}...`);
        execSync(`npm pack ${pkgName}`, { cwd: tempDir, stdio: 'inherit' });

        // 2. إيجاد الملف المحمل
        const files = fs.readdirSync(tempDir);
        const tarball = files.find(f => f.endsWith('.tgz'));
        if (!tarball) throw new Error("Tarball not found!");

        // 3. فك الضغط
        console.log(`Extracting ${tarball}...`);
        const extractDir = path.join(tempDir, 'extracted');
        if (fs.existsSync(extractDir)) fs.removeSync(extractDir);
        fs.mkdirSync(extractDir);
        
        // استخدام tar المدمج في ويندوز
        execSync(`tar -xzf ${path.join(tempDir, tarball)} -C ${extractDir}`, { stdio: 'inherit' });

        // 4. نقل المحتويات (عادة تكون داخل مجلد package)
        const finalSource = path.join(extractDir, 'package');
        if (fs.existsSync(destPath)) fs.removeSync(destPath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        
        fs.moveSync(finalSource, destPath);
        console.log(`SUCCESS: ${pkgName} is now physically present at ${destPath}`);

    } catch (err) {
        console.error(`Failed to force install ${pkgName}:`, err);
    } finally {
        fs.removeSync(tempDir);
    }
}

async function run() {
    await forceInstallArch('@libsql/win32-ia32-msvc@0.17.2', path.join(__dirname, 'node_modules', '@libsql', 'win32-ia32-msvc'));
    await forceInstallArch('@img/sharp-win32-ia32@0.33.5', path.join(__dirname, 'node_modules', '@img', 'sharp-win32-ia32'));
    console.log("\n--- ARCHITECTURE INJECTION COMPLETE ---");
}

run();
