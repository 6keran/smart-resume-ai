import fs from 'fs';

const content = fs.readFileSync('node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js', 'utf8');

let idx = 0;
while ((idx = content.indexOf('case "script":', idx)) !== -1) {
  console.log('=== Found case "script": at', idx, '===');
  console.log(content.slice(Math.max(0, idx - 150), idx + 250));
  idx += 14;
}
