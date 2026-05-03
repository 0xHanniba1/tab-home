const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('extension/index.html', 'utf8');
const footerMatch = html.match(/<footer>[\s\S]*?<\/footer>/);

assert(footerMatch, 'footer should exist');

const footer = footerMatch[0];

assert(footer.includes('tab-home by'), 'footer should keep tab-home credit text');
assert(footer.includes('0xHanniba1'), 'footer should credit the current fork owner');
assert(
  footer.includes('https://github.com/0xHanniba1/tab-home'),
  'footer should link to the current fork',
);
assert(
  footer.includes('WolfyXBT/tab-home'),
  'footer should credit the direct upstream fork',
);
assert(
  footer.includes('https://github.com/wolfyxbt/tab-home'),
  'footer should link to the direct upstream fork',
);
assert(!footer.includes('Zara'), 'footer should not show the original author in the compact footer');
assert(!footer.includes('tab-out'), 'footer should not show the original project in the compact footer');

console.log('footer credit test passed');
