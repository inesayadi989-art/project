const fs = require('fs');
const parser = require('@babel/parser');
let code = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');
const start = '              <tbody className="divide-y divide-gray-50">';
const end = '              </tbody>';
const startIdx = code.indexOf(start);
const endIdx = code.indexOf(end, startIdx);
if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find tbody block');
  process.exit(1);
}
const replacement = `${start}\n                <tr><td>Test</td></tr>\n              ${end}`;
code = code.slice(0, startIdx) + replacement + code.slice(endIdx + end.length);
try {
  parser.parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  console.log('PARSE_OK');
} catch (e) {
  console.error('ERR', e.message);
  if (e.loc) console.error('line', e.loc.line, 'column', e.loc.column);
  process.exit(1);
}
