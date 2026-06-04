const fs = require('fs');
const parser = require('@babel/parser');
const path = 'src/pages/admin/AdminDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');
const replacement = "formatter={(value: any) => Number(value).toFixed(3) + ' TND'}";
code = code.replace(/formatter=\{\(value: any\) => `\$\{Number\(value\)\.toFixed\(3\)\} TND`\}/, replacement);
try {
  parser.parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  console.log('PARSE_OK');
} catch (e) {
  console.error('ERR', e.message);
  if (e.loc) console.error('line', e.loc.line, 'column', e.loc.column);
  process.exit(1);
}
