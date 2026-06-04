const fs = require('fs');
const code = fs.readFileSync('src/pages/admin/AdminDashboard.tsx', 'utf8');
let state = 'normal';
let stack = [];
let line = 1;
let col = 0;
for (let i = 0; i < code.length; i++) {
  const c = code[i];
  const next = code[i + 1];
  if (c === '\n') {
    line++;
    col = 0;
    if (state === 'linecomment') state = 'normal';
    continue;
  }
  col++;
  const prevState = state;
  if (state === 'normal') {
    if (c === '/' && next === '*') {
      state = 'blockcomment';
      i++; col++; continue;
    }
    if (c === '/' && next === '/') {
      state = 'linecomment';
      i++; col++; continue;
    }
    if (c === "'") state = 'single';
    else if (c === '"') state = 'double';
    else if (c === '`') state = 'backtick';
    else if (c === '(' || c === '[' || c === '{') stack.push({ c, line, col });
    else if (c === ')' || c === ']' || c === '}') {
      if (!stack.length) { console.log('Unmatched close', c, line, col); process.exit(1); }
      const top = stack[stack.length - 1];
      const match = (top.c === '(' && c === ')') || (top.c === '[' && c === ']') || (top.c === '{' && c === '}');
      if (!match) { console.log('Mismatch', top, 'closed by', c, line, col); process.exit(1); }
      stack.pop();
    }
  } else if (state === 'single') {
    if (c === '\\' && next) { i++; col++; continue; }
    if (c === "'") state = 'normal';
  } else if (state === 'double') {
    if (c === '\\' && next) { i++; col++; continue; }
    if (c === '"') state = 'normal';
  } else if (state === 'backtick') {
    if (c === '\\' && next) { i++; col++; continue; }
    if (c === '$' && next === '{') { state = 'expr'; stack.push({ c: '${', line, col }); continue; }
    if (c === '`') state = 'normal';
  } else if (state === 'expr') {
    if (c === '/' && next === '*') { state = 'blockcomment'; i++; col++; continue; }
    if (c === '/' && next === '/') { state = 'linecomment'; i++; col++; continue; }
    if (c === "'") state = 'single';
    else if (c === '"') state = 'double';
    else if (c === '`') state = 'backtick';
    else if (c === '(' || c === '[' || c === '{') stack.push({ c, line, col });
    else if (c === ')' || c === ']' || c === '}') {
      if (!stack.length) { console.log('Unmatched close', c, line, col); process.exit(1); }
      const top = stack[stack.length - 1];
      if (top.c === '${' && c === '}') { stack.pop(); continue; }
      const match = (top.c === '(' && c === ')') || (top.c === '[' && c === ']') || (top.c === '{' && c === '}');
      if (!match) { console.log('Mismatch', top, 'closed by', c, line, col); process.exit(1); }
      stack.pop();
    }
  } else if (state === 'blockcomment') {
    if (c === '*' && next === '/') { state = 'normal'; i++; col++; continue; }
  }
  if (prevState !== state) {
    console.log(`state:${prevState}->${state} at ${line}:${col} char='${c}'`);
  }
}
console.log('END state', state, 'line', line, 'col', col, 'stacklen', stack.length);
stack.forEach(item => console.log('stack', item));
