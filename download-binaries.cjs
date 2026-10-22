const https = require('https');
const fs = require('fs');
const path = require('path');

const ELECTRON_ABI = '128';
const BS3_VERSION = '11.3.0';

const targets = [
  { arch: 'x64', platform: 'win32' },
  { arch: 'ia32', platform: 'win32' }
];

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // التعامل مع إعادة التوجيه (301, 302)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // console.log(`Following redirect to: ${response.headers.location}`);
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  const baseDir = path.join(__dirname, 'binaries');
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

  for (const target of targets) {
    const archDir = path.join(baseDir, target.arch);
    if (!fs.existsSync(archDir)) fs.mkdirSync(archDir);

    const fileName = `better-sqlite3-v${BS3_VERSION}-electron-v${ELECTRON_ABI}-${target.platform}-${target.arch}.tar.gz`;
    const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${BS3_VERSION}/${fileName}`;
    const dest = path.join(archDir, 'node.tar.gz');

    console.log(`--- Downloading Binary for ${target.arch} (ABI ${ELECTRON_ABI}) ---`);
    console.log(`URL: ${url}`);
    
    try {
      await download(url, dest);
      console.log(`SUCCESS: Downloaded ${target.arch} binary.`);
    } catch (err) {
      console.error(`FAILED for ${target.arch}:`, err.message);
    }
  }
}

main();
