const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '.next', 'standalone', 'package.json');

if (fs.existsSync(pkgPath)) {
  console.log('Fixing standalone package.json...');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  if (pkg.type === 'module') {
    delete pkg.type;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    console.log('Successfully removed "type": "module" from standalone package.json');
  } else {
    console.log('"type": "module" not found in standalone package.json');
  }
} else {
  console.log('standalone package.json not found at:', pkgPath);
}
