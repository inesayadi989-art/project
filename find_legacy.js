const fs = require('fs');
const path = require('path');

const root = path.resolve('c:/xampp/htdocs/project');
const pat = /backup|tmp|test|debug|old|seed|simulate|check|verify|approve|fix|reset|create_|add_|migrate_|setup/i;
const ignore = ['node_modules', 'dist', '.git', 'frontend/dist', 'backend/node_modules'];

function walk(dir) {
  let out = [];
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (ignore.some(i => full.includes(path.sep + i + path.sep))) continue;
    if (name.isDirectory()) out.push(...walk(full));
    else if (pat.test(name.name)) out.push(full);
  }
  return out;
}

const result = walk(root).sort();
result.forEach(f => console.log(f));
console.log('\n=== TOTAL ===', result.length, 'fichiers legacy');
