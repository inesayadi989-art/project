const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');
const start = code.indexOf('(orders ?? []).slice(0, 10).map((order) =>');
if (start === -1) { console.error('Start not found'); process.exit(1); }
const end = code.indexOf('))}', start);
if (end === -1) { console.error('End not found'); process.exit(1); }
const expr = code.slice(start, end + 3);
console.log('EXPR:');
console.log(expr);
try {
  parser.parseExpression(expr, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  console.log('EXPR_OK');
} catch (e) {
  console.error('ERR', e.message);
  if (e.loc) console.error('line', e.loc.line, 'column', e.loc.column);
  process.exit(1);
}
