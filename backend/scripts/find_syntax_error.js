const fs = require('fs');
const s = fs.readFileSync('routes/products.js', 'utf8');
let lo = 0, hi = s.length;
let badIndex = hi;
while (lo <= hi) {
  const mid = Math.floor((lo + hi) / 2);
  try {
    // Try to create a function from prefix
    new Function(s.slice(0, mid));
    // no error in prefix
    lo = mid + 1;
  } catch (e) {
    badIndex = mid;
    hi = mid - 1;
  }
}
console.log('approx bad index:', badIndex);
// Show surrounding text
const context = s.slice(Math.max(0,badIndex-200), Math.min(s.length, badIndex+200));
console.log('---context---');
console.log(context);
