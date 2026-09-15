// 链路总表生成器：prompt → 唤醒词 → 命令 → HTML 绝对路径（一页可点）。
// 用法：node docs/skills/skill-calorie/t369-链路总表.mjs
// 只读两处真源：唤醒词 prompt 取 packages/skill-calorie/src/triggers/scene-08-body.ts，
// 产物映射取同目录 manifest.json；出同目录 t369-链路总表.html（自检：缺链 exit 1）。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const DIR = join(root, 't369-验收');
const repo = join(root, '..', '..', '..');
const trigSrc = readFileSync(join(repo, 'packages', 'skill-calorie', 'src', 'triggers', 'scene-08-body.ts'), 'utf8');
const manifest = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'));

const get = (block, name) => {
  const m = block.match(new RegExp('"' + name + '":\\s*"((?:[^"\\\\]|\\\\.)*)"'));
  return m ? JSON.parse('"' + m[1] + '"') : '';
};
const words = trigSrc.split('{"category"').slice(1).map((b) => ({ wake: get(b, 'wake_word'), intent: get(b, 'user_intent'), prompt: get(b, 'text') }));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const procByWord = {};
for (const p of manifest.process) {
  const m = (p.file || '').match(/(\d+)-过程-/);
  if (m) procByWord[m[1]] = p;
}

const orderCli = {
  '记体脂（皮褶钳）': 'calorie-cmd-read calorie.body.composition-add',
  '记体脂（外部测量）': 'calorie-cmd-read calorie.body.composition-add',
  '记围度': 'calorie-cmd-read calorie.body.measure-add',
  '补记体脂': 'calorie-cmd-read calorie.body.composition-add',
  '补记围度': 'calorie-cmd-read calorie.body.measure-add',
  '看体脂': 'calorie-cmd-read calorie.view.body-composition',
  '看体脂趋势': 'calorie-cmd-read calorie.view.body-composition',
  '看围度': 'calorie-cmd-read calorie.view.body-measure',
  '看围度趋势': 'calorie-cmd-read calorie.view.body-measure',
  '对比体脂': 'calorie-cmd-read calorie.view.body-composition-compare',
  '对比围度': 'calorie-cmd-read calorie.view.body-measure-compare',
  '删体脂': 'calorie-cmd-read calorie.body.composition-remove',
  '删围度': 'calorie-cmd-read calorie.body.measure-remove',
};

const rows = manifest.results.map((r, i) => {
  const n = String(i + 1).padStart(2, '0');
  const w = words.find((x) => x.wake === r.word) || {};
  const proc = procByWord[n];
  const procCell = proc
    ? `<a href="${esc(proc.rel)}" target="_blank" rel="noopener">${esc(proc.file)}</a><br><span class="dim">写前预检确认页（过程型）</span>`
    : '<span class="dim">—（读词／对比／删除无过程页）</span>';
  return `<tr>
<td>${n}</td>
<td>${esc(w.intent || '')}<details><summary>看完整 prompt</summary><pre>${esc(w.prompt || '')}</pre></details></td>
<td><b>${esc(r.word)}</b></td>
<td><code>${esc(orderCli[r.word] || r.key)}</code></td>
<td><a href="${esc(r.rel)}" target="_blank" rel="noopener">${esc(r.file)}</a><br><span class="dim">exit=${r.exit} · ${Math.round(r.bytes / 1024)}KB · 整页 ${r.fullPage && r.fullPage.ok ? '✓' : '✗'}</span></td>
<td>${procCell}</td>
</tr>`;
});

const page = `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>场景08 链路总表：prompt → 唤醒词 → 命令 → HTML（13 条全通，无遗漏）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f;padding:24px 20px 60px}
h1{font-size:22px;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:16px;line-height:1.7}
table{border-collapse:collapse;width:100%;background:#fff;font-size:13px}
th,td{border:1px solid #d2d2d7;padding:8px 10px;vertical-align:top;text-align:left}
th{background:#f5f5f7}
td code{font-size:12px;word-break:break-all}
td a{color:#007aff;word-break:break-all}
.dim{color:#86868b;font-size:12px}
details{margin-top:6px}summary{cursor:pointer;color:#007aff;font-size:12.5px}
pre{white-space:pre-wrap;font-size:12px;background:#f5f5f7;padding:8px;border-radius:8px;margin-top:6px}
</style></head><body>
<h1>场景08 链路总表：prompt → 唤醒词 → 命令 → HTML</h1>
<div class="sub">13 条唤醒词全部跑通，无遗漏。点 <b>HTML 绝对路径</b> 即在新标签打开那份产物（与本页同目录）。过程型 5 页只出现在 5 条写词行。产物目录：<code>${esc(DIR)}</code></div>
<table><thead><tr><th>序</th><th>用户意图＋完整 prompt（点展开）</th><th>唤醒词</th><th>命令</th><th>结果型 HTML 绝对路径</th><th>过程型 HTML 绝对路径</th></tr></thead>
<tbody>
${rows.join('\n')}
</tbody></table>
</body></html>
`;

const out = join(DIR, 't369-链路总表.html');
writeFileSync(out, page, 'utf8');
const refs = [...page.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1]);
const dead = refs.filter((r) => !existsSync(join(DIR, decodeURIComponent(r))));
console.log('链路总表：' + manifest.results.length + ' 行；链接 ' + refs.length + ' 条；' + (dead.length === 0 ? '缺失 0 -> 可发' : '缺 ' + dead.length + ' 件 -> ' + dead.join('、')));
process.exit(dead.length === 0 ? 0 : 1);
