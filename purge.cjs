const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dirsToPurge = [
    'dist_standalone',
    'financial-system-final-build',
    'build_solid',
    'build_ultimate_fix',
    'empty_folder_for_purge'
];

console.log('--- NUCLEAR PURGE START ---');

// إنشاء مجلد فارغ لاستخدامه في عملية المرآة (Mirror)
const emptyDir = path.join(__dirname, 'empty_folder_for_purge');
if (!fs.existsSync(emptyDir)) fs.mkdirSync(emptyDir);

dirsToPurge.forEach(dir => {
    const target = path.join(__dirname, dir);
    if (fs.existsSync(target)) {
        console.log(`Purging: ${dir}...`);
        try {
            // استخدام robocopy /mir لمسح المحتويات بالكامل (يتعامل مع المسارات الطويلة)
            execSync(`robocopy "${emptyDir}" "${target}" /s /mir /njh /njs /ndl /nc /ns`, { stdio: 'ignore' });
            // ثم حذف المجلد نفسه
            fs.rmdirSync(target, { recursive: true });
            console.log(`SUCCESS: ${dir} purged.`);
        } catch (e) {
            console.warn(`Note: ${dir} semi-purged (some files might be locked).`);
        }
    }
});

if (fs.existsSync(emptyDir)) fs.rmdirSync(emptyDir);
console.log('--- NUCLEAR PURGE COMPLETE ---');
