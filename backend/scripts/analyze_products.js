const fs = require('fs');
const p = 'routes/products.js';
const s = fs.readFileSync(p, 'utf8');
const backticks = (s.match(/`/g) || []).length;
const opensParen = (s.match(/\(/g) || []).length;
const closesParen = (s.match(/\)/g) || []).length;
const opensBrace = (s.match(/{/g) || []).length;
const closesBrace = (s.match(/}/g) || []).length;
console.log('backticks:', backticks);
console.log('paren (', opensParen, ')', closesParen);
console.log('brace {', opensBrace, '}', closesBrace);

const lines = s.split(/\r?\n/);
let balance = 0;
const stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const ch of line) {
    if (ch === '{') stack.push(i+1);
    if (ch === '}') stack.pop();
  }
  if ((i+1) % 50 === 0) {
    console.log('line', i+1, 'balance', stack.length);
  }
}
console.log('final balance', stack.length);
console.log('unmatched opens at lines:', stack.slice(-10));
