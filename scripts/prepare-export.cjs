const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');

if (!fs.existsSync(outDir)) {
  console.error('out directory does not exist! Run build first.');
  process.exit(1);
}

// 1. استبدال كل إشارات /_next/ بـ /assets/ لتفادي حظر cPanel و Apache للشرطة السفلية
function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      replaceInDir(fullPath);
    } else if (/\.(html|js|css|json|txt)$/i.test(file)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      if (content.includes('/_next/')) {
        content = content.replace(/\/_next\//g, '/assets/');
        changed = true;
      }
      if (content.includes('"/icon.png"')) {
        content = content.replace(/"\/icon\.png"/g, '"/financial-system/icon.png"');
        changed = true;
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

console.log('Replacing /_next/ with /assets/ across static files...');
replaceInDir(outDir);

// 2. إعادة تسمية مجلد _next إلى assets
const oldNext = path.join(outDir, '_next');
const newAssets = path.join(outDir, 'assets');

if (fs.existsSync(oldNext)) {
  if (fs.existsSync(newAssets)) {
    fs.rmSync(newAssets, { recursive: true, force: true });
  }
  fs.renameSync(oldNext, newAssets);
  console.log('Renamed _next to assets successfully!');
}

// 3. التأكد من وجود .htaccess
const htaccessSource = path.join(__dirname, '..', 'public', '.htaccess');
const htaccessDest = path.join(outDir, '.htaccess');
if (fs.existsSync(htaccessSource)) {
  fs.copyFileSync(htaccessSource, htaccessDest);
  console.log('Copied .htaccess to out folder.');
}

console.log('Static export preparation COMPLETE!');
