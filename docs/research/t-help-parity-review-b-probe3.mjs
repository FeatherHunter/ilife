// 只读探针 3（审查席 B）：Sheet 字段行是否真有输入框＋实时预览绑定（D6「Sheet 实时预览」行复算）
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, '.scratch/final-db/calorie_html');
const f = fs.readdirSync(DIR).find((x) => /234219\.html$/.test(x));
const H = fs.readFileSync(path.join(DIR, f), 'utf8');
const out = (...a) => console.log(...a);

out('FILE', f, Buffer.byteLength(H, 'utf8'));
out('GLOBAL <input', (H.match(/<input/g) ?? []).length, '| <textarea', (H.match(/<textarea/g) ?? []).length,
  '| <select', (H.match(/<select/g) ?? []).length, '| type="search"', (H.match(/type="search"/g) ?? []).length);

// 所有 <details> 块：是否含 input / field li
const details = H.match(/<details[\s\S]*?<\/details>/g) ?? [];
out('DETAILS blocks', details.length);
let withInput = 0, withField = 0, withPrev = 0;
for (const d of details) {
  if (/<input/.test(d)) withInput++;
  if (/ilife-help-shell-field"/.test(d)) withField++;
  if (/data-prev|data-preview/.test(d)) withPrev++;
}
out('DETAILS with <input>', withInput, '| with field li', withField, '| with data-prev', withPrev);
if (details[0]) out('DETAILS[0] head', details[0].slice(0, 600));

// 一个含字段行的卡：整块结构
const card = (H.match(/<article class="ilife-help-shell-card"[\s\S]*?<\/article>/g) ?? []).find((c) => /ilife-help-shell-field"/.test(c));
if (card) {
  out('CARD-with-field len', card.length, '| inputs', (card.match(/<input/g) ?? []).length, '| details', (card.match(/<details/g) ?? []).length);
  out('CARD-with-field excerpt', card.slice(0, 1400));
}

// 内联脚本里的预览绑定
const js = (H.match(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g) ?? []).join('\n');
out('INLINE JS bytes', Buffer.byteLength(js, 'utf8'));
for (const k of ['refreshPreview', 'renderPreview', 'data-prev', 'buildPrompt', 'getMissing', 'input', 'addEventListener']) {
  out('JS contains', k, ':', js.includes(k));
}
const idx = js.indexOf('refreshPreview');
if (idx >= 0) out('JS around refreshPreview', JSON.stringify(js.slice(Math.max(0, idx - 400), idx + 600)));
