// 把 83 条产物的「可见文本」抽成小文件，并出一份体量清单——供后续按页族分派子席。
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/ilife';
const OUT = join(ROOT, '.scratch/t155o/text');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const rows = JSON.parse(readFileSync(join(ROOT, '.scratch/t155o/live-run.json'), 'utf8'));

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|section|li|tr|h1|h2|h3|h4|caption|td|th|nav|footer|header)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENT[m] || m)
    .split('\n').map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim()).filter(Boolean).join('\n');
}

const safe = (s) => s.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
const manifest = [];
rows.forEach((r, i) => {
  if (!r.path) return;
  const txt = visibleText(readFileSync(r.path, 'utf8'));
  const name = String(i + 1).padStart(2, '0') + '_' + safe(r.wake) + '.txt';
  writeFileSync(join(OUT, name), txt, 'utf8');
  manifest.push({ i: i + 1, file: name, wake: r.wake, key: r.key, bytes: r.bytes, chars: txt.length, lines: txt.split('\n').length });
});

writeFileSync(join(OUT, '_manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');
const byKey = new Map();
for (const m of manifest) { if (!byKey.has(m.key)) byKey.set(m.key, []); byKey.get(m.key).push(m); }
console.log('页面数 =', manifest.length, '｜命令数 =', byKey.size);
console.log('文本合计字符 =', manifest.reduce((a, b) => a + b.chars, 0));
console.log('');
console.log('命令'.padEnd(34) + '页数  最大字符  代表文件');
for (const [k, list] of [...byKey.entries()].sort((a, b) => b[1][0].chars - a[1][0].chars)) {
  const max = Math.max(...list.map((x) => x.chars));
  console.log(k.padEnd(34) + String(list.length).padStart(3) + '  ' + String(max).padStart(7) + '  ' + list[0].file
    + (list.length > 1 ? '  …+' + (list.length - 1) : ''));
}
console.log('\n目录 = ' + OUT.replace(/\//g, '\\'));
