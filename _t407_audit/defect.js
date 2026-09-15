const fs = require('fs');
const DIR = 'D:\\ilife\\docs\\skills\\skill-bill\\';
const raw = fs.readFileSync(DIR + 't407-页-拍账单-采集页.html', 'utf8');

function lineOfAt(pos) {
  let n = 0;
  for (let i = 0; i < pos; i++) if (raw[i] === '\n') n++;
  return n + 1;
}

// locate the table caption and its visible cells for 参数名
const capStart = raw.indexOf('图片识别外置：三要素现在到了哪一步');
console.log('caption at pos', capStart, 'line', lineOfAt(capStart));

const reCell = />([^<>]{1,40})<\/td>/g;
let m;
const cells = [];
// limit to the table region
const tblStart = capStart;
const tblEnd = raw.indexOf('</table>', tblStart);
const region = raw.slice(tblStart, tblEnd);
while ((m = reCell.exec(region)) !== null) {
  cells.push({ txt: m[1], line: lineOfAt(tblStart + m.index) });
}
console.log('--- 该表可见单元格 ---');
console.log(cells.map(c => c.txt).join(' | '));
console.log('--- 其中含库列名的格 ---');
for (const c of cells) if (/^(amount|category|time|source_id|who)$/.test(c.txt)) {
  console.log('  L' + c.line + '  「' + c.txt + '」');
}
const abs = raw.indexOf('>amount<');
console.log('abs pos of >amount< =', abs, 'line', lineOfAt(abs));
const abs2 = raw.indexOf('>category<');
console.log('abs pos of >category< =', abs2, 'line', lineOfAt(abs2));
const abs3 = raw.indexOf('>time<');
console.log('abs pos of >time< =', abs3, 'line', lineOfAt(abs3));
const th = raw.indexOf('>参数名<');
console.log('abs pos of >参数名< =', th, 'line', lineOfAt(th));
