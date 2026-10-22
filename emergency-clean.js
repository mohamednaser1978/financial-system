import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// البادئة السحرية للتعامل مع المسارات الطويلة جداً في ويندوز
const prefix = "\\\\?\\";

async function nuclearDelete(dirPath) {
    const fullPath = prefix + path.resolve(__dirname, dirPath);
    
    if (!fs.existsSync(fullPath)) {
        console.log(`Directory ${dirPath} does not exist. Skipping.`);
        return;
    }

    console.log(`Starting Nuclear Clean on: ${dirPath}...`);
    
    try {
        // محاولة الحذف العادي أولاً بأسلوب الـ Node.js القوي
        fs.rmSync(fullPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
        console.log(`SUCCESS: ${dirPath} has been deleted.`);
    } catch (err) {
        console.warn(`Standard delete failed for ${dirPath}, trying surgical method...`);
        // إذا فشل الحذف العادي، نقوم بـ "تقشير" المجلدات من الداخل
        surgicalDelete(fullPath);
    }
}

function surgicalDelete(currentPath) {
    try {
        const files = fs.readdirSync(currentPath);
        for (const file of files) {
            const curPath = path.join(currentPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                surgicalDelete(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        }
        fs.rmdirSync(currentPath);
    } catch (e) {
        console.error(`Could not delete ${currentPath}: ${e.message}`);
    }
}

async function run() {
    // تنظيف كل المجلدات التي قد تحتوي على تداخل
    const targets = ['dist_standalone', '.next', 'build_final_solid', 'build_final_fix', 'build_stable', 'build_output', 'dist'];
    
    for (const target of targets) {
        await nuclearDelete(target);
    }
    
    console.log("\n--- CLEANUP FINISHED ---");
    console.log("You can now safely run: npm run build");
}

run();
