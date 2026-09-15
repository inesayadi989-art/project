const { execSync } = require('child_process');
const os = require('os');

try {
  if (os.platform() === 'linux') {
    console.log('Installing lightningcss native binaries for Linux...');
    execSync('npm install --no-save lightningcss-linux-x64-gnu @rollup/rollup-linux-x64-gnu', { stdio: 'inherit' });
  } else {
    console.log('Non-linux platform, skipping native binary install.');
  }
} catch (err) {
  console.error('Failed to install native binaries:', err.message);
  process.exit(0);
}
