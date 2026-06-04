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
  if (state === 'normal') {
    if (c === '/' && next === '*') {
      state = 'blockcomment';
      i++;
      col++;
      continue;
    }
    if (c === '/' && next === '/') {
      state = 'linecomment';
      i++;
      col++;
      continue;
    }
    if (c === "'") {
      state = 'single';
      continue;
    }
    if (c === '"') {
      state = 'double';
      continue;
    }
    if (c === '`') {
      state = 'backtick';
      continue;
    }
    if (c === '(' || c === '[' || c === '{') stack.push({ c: c, line, col });
    else if (c === ')' || c === ']' || c === '}') {
      if (stack.length === 0) {
        console.log('Unmatched close', c, line, col);
        process.exit(0);
      }
      const top = stack[stack.length - 1];
      const match = (top.c === '(' && c === ')') || (top.c === '[' && c === ']') || (top.c === '{' && c === '}');
      if (!match) {
        console.log('Mismatch', top.c, 'at', top.line, top.col, 'closed by', c, line, col);
        process.exit(0);
      }
      stack.pop();
    }
  } else if (state === 'single') {
    if (c === '\\' && next) {
      i++;
      col++;
      continue;
    }
    if (c === "'") state = 'normal';
  } else if (state === 'double') {
    if (c === '\\' && next) {
      i++;
      col++;
      continue;
    }
    if (c === '"') state = 'normal';
  } else if (state === 'backtick') {
    if (c === '\\' && next) {
      i++;
      col++;
      continue;
    }
    if (c === '$' && next === '{') {
      state = 'expr';
      stack.push({ c: '${', line, col });
      continue;
    }
    if (c === '`') state = 'normal';
  } else if (state === 'expr') {
    if (c === '/' && next === '*') {
      state = 'blockcomment';
      i++;
      col++;
      continue;
    }
    if (c === '/' && next === '/') {
      state = 'linecomment';
      i++;
      col++;
      continue;
    }
    if (c === "'") {
      state = 'single';
      continue;
    }
    if (c === '"') {
      state = 'double';
      continue;
    }
    if (c === '`') {
      state = 'backtick';
      continue;
    }
    if (c === '(' || c === '[' || c === '{') stack.push({ c: c, line, col });
    else if (c === ')' || c === ']' || c === '}') {
      if (stack.length === 0) {
        console.log('Unmatched close', c, line, col);
        process.exit(0);
      }
      const top = stack[stack.length - 1];
      if (top.c === '${' && c === '}') {
        stack.pop();
        continue;
      }
      const match = (top.c === '(' && c === ')') || (top.c === '[' && c === ']') || (top.c === '{' && c === '}');
      if (!match) {
        console.log('Mismatch', top.c, 'at', top.line, top.col, 'closed by', c, line, col);
        process.exit(0);
      }
      stack.pop();
    }
  } else if (state === 'blockcomment') {
    if (c === '*' && next === '/') {
      state = 'normal';
      i++;
      col++;
      continue;
    }
  }
}
console.log('state', state, 'stacklen', stack.length);
stack.forEach(item => console.log(item));
