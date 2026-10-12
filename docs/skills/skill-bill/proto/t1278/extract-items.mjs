// t1278 原型工具：从 assets/bill-help-26 的 README + manifest 抽出 26 条原话与原图落点（逐字，不改写）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ASSET = 'D:/ilife/docs/skills/skill-bill/assets/bill-help-26';
const OUT = 'D:/ilife/.scratch/t1278/items.json';

const readme = readFileSync(join(ASSET, 'README.md'), 'utf8').split(/\r?\n/);
const manifest = JSON.parse(readFileSync(join(ASSET, 'manifest.json'), 'utf8'));

function blockAfter(headerRe, lines) {
  let i = lines.findIndex((l) => headerRe.test(l));
  if (i < 0) throw new Error('找不到小节：' + headerRe);
  let s = i + 1;
  while (s < lines.length && !/^```/.test(lines[s])) s++;
  let e = s + 1;
  while (e < lines.length && !/^```/.test(lines[e])) e++;
  return lines.slice(s + 1, e);
}

const quoteLines = blockAfter(/^## 二、/, readme);
const extraLines = blockAfter(/^### 编号外补充/, readme);

const items = [];
for (const raw of quoteLines) {
  const line = raw.replace(/\s+$/, '');
  if (/^-{3,}/.test(line.trim())) continue;
  const m = /^(\d{1,2})\s*[.、]?\s*(.*)$/.exec(line);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 26) {
    items.push({ no: Number(m[1]), text: m[2] });
  } else if (line.trim() && items.length) {
    items[items.length - 1].text += '\n' + line.trim();
  }
}

// 原话 ↔ 原图 对照表
const imgByName = new Map(manifest.图片.map((p) => [p.文件名, p]));
const imgByNo = new Map(manifest.图片.map((p) => [p.图号, p]));
for (const line of readme) {
  const m = /^\|\s*(\d{1,2})\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/.exec(line);
  if (!m) continue;
  const no = Number(m[1]);
  const it = items.find((x) => x.no === no);
  if (!it) continue;
  const imgCell = m[2].trim();
  if (/^图\d+$/.test(imgCell)) {
    const p = imgByNo.get(imgCell);
    it.imgNo = imgCell;
    it.imgFile = p.文件名;
    it.imgAbs = join(ASSET, p.文件名).replace(/\//g, '\\');
    it.sha256 = p.sha256;
    it.bytes = p.字节;
    it.caption = p.画面;
    it.imgItems = imgByName.get(p.文件名).对应条目;
  } else if (/未附图/.test(imgCell)) {
    it.imgNo = null;
    it.imgFile = null;
    it.imgAbs = null;
  }
}

const missing = items.filter((x) => !x.text || !x.text.trim());
if (items.length !== 26) throw new Error('原话条数不是 26：' + items.length);
if (missing.length) throw new Error('空原话：' + missing.map((x) => x.no).join(','));
const noImg = items.filter((x) => !x.imgNo).map((x) => x.no);
if (noImg.length !== 2) throw new Error('未附图条目应为 8 与 24，实为 ' + noImg.join(','));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({ 原话来源: 'https://github.com/FeatherHunter/ilife/issues/1267', 编号外补充: extraLines.filter((l) => l.trim()).join('\n'), 条目: items }, null, 2),
  'utf8'
);
console.log('RESULT: ' + items.length + '/26 条原话，附图 ' + items.filter((x) => x.imgNo).length + '/26，未附图 [' + noImg.join(',') + ']');
console.log('OUT: ' + OUT);
