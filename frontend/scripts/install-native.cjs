const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

try {
  if (os.platform() === 'linux') {
    console.log('Installing lightningcss native binaries for Linux...');
    execSync('npm install --no-save lightningcss-linux-x64-gnu @rollup/rollup-linux-x64-gnu', { stdio: 'inherit' });
    try {
      const cwd = process.cwd();
      const lightningPkgJson = require.resolve('lightningcss/package.json', { paths: [cwd] });
      const lightningRoot = path.dirname(lightningPkgJson);
      const nativePkgJson = require.resolve('lightningcss-linux-x64-gnu/package.json', { paths: [cwd] });
      const nativeRoot = path.dirname(nativePkgJson);
      const nativeFile = path.join(nativeRoot, 'lightningcss.linux-x64-gnu.node');
      const destFile = path.join(lightningRoot, 'lightningcss.linux-x64-gnu.node');
      if (fs.existsSync(nativeFile)) {
        fs.copyFileSync(nativeFile, destFile);
        console.log('Copied native lightningcss binary to', destFile);
      } else {
        console.warn('Native lightningcss binary not found at', nativeFile);
      }
    } catch (err) {
      console.warn('Could not copy native lightningcss binary:', err && err.message ? err.message : err);
    }
  } else {
    console.log('Non-linux platform, skipping native binary install.');
  }
} catch (err) {
  console.error('Failed to install native binaries:', err && err.message ? err.message : err);
  process.exit(0);
}
