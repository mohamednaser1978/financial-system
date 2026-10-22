const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// تحديد مسار قاعدة البيانات في AppData
const userDataPath = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
const dbDir = path.join(userDataPath, 'financial-system', 'prisma');
const dbPath = path.join(dbDir, 'dev.db');

console.log('--- Database Revive Tool ---');
console.log('Target Path:', dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// 1. فتح قاعدة البيانات
const db = new Database(dbPath);

try {
    // 2. إنشاء الجداول الأساسية (SQL مباشر لضمان النجاح بدون Prisma)
    console.log('Creating tables...');
    db.exec(`
        CREATE TABLE IF NOT EXISTS "SystemSettings" (
            "key" TEXT NOT NULL PRIMARY KEY,
            "value" TEXT NOT NULL
        );
        
        -- إضافة المزيد من الجداول الأساسية إذا لزم الأمر
        CREATE TABLE IF NOT EXISTS "User" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "username" TEXT NOT NULL,
            "password" TEXT NOT NULL,
            "role" TEXT NOT NULL DEFAULT 'USER'
        );
    `);

    // 3. حقن البيانات الأساسية لضمان عمل الواجهة
    console.log('Seeding initial data...');
    const insert = db.prepare('INSERT OR IGNORE INTO SystemSettings (key, value) VALUES (?, ?)');
    insert.run('system_name', 'النظام المالي');
    insert.run('currency', 'USD');
    insert.run('logo', '');
    
    console.log('SUCCESS: Database is now Alive and Seeded!');
} catch (err) {
    console.error('FAILED to revive database:', err.message);
} finally {
    db.close();
}
