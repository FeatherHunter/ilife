// #827 · 分隔符门的变异自证（改坏必红／还原必绿）＋ sep.json 汇总。
//
// 做法：把本域 6 件产物逐个过一遍门（正例），再把其中一件的可见文本塞一处「；」并列（反例），
// 最后逐字还原再跑一次。三行机器读数写进 t827-search-证据.md。
//
// 跑法（仓根）：node .scratch/t827/mutation.mjs
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const ROOT = resolve('.');
const PROBE = join(ROOT, 'packages', 'base-render', 'test', 'separator-probe.mjs');
const PAGES = join(ROOT, '.scratch', 't827', 'pages');
const MUT = join(ROOT, '.scratch', 't827', 'mut');
mkdirSync(MUT, { recursive: true });

const run = (file) => {
  try {
    const out = execFileSync(process.execPath, [PROBE, file, '--json', '--nodes'], { encoding: 'utf8' });
    return { exit: 0, json: JSON.parse(out) };
  } catch (e) {
    const out = String(e.stdout ?? '');
    return { exit: e.status ?? '?', json: out ? JSON.parse(out) : null, stderr: String(e.stderr ?? '').slice(0, 200) };
  }
};

// ── 正例：6 件逐件过门 ＋ 汇总成 sep.json（判分件的输入形状：{pages:[…]}）─────────────
const files = readdirSync(PAGES).filter((f) => f.endsWith('.html')).sort();
const pages = [];
let greenCount = 0;
for (const f of files) {
  const r = run(join(PAGES, f));
  if (r.exit === 0) greenCount += 1;
  if (r.json) pages.push(r.json);
  console.log('POS  ' + f.padEnd(34) + ' exit=' + r.exit + '  节点级命中=' + (r.json ? r.json.node.R1 + r.json.node.R2 + r.json.node.R3 : '?'));
}
writeFileSync(join(ROOT, '.scratch', 't827', 'sep.json'), JSON.stringify({ pages }, null, 2), 'utf8');
console.log('POS-SUM ' + greenCount + '/' + files.length + ' 件 exit 0；sep.json 已汇总 ' + pages.length + ' 页');

// ── 反例：往可见文本塞一处「；」并列（模板里那句标题行）→ 必须红 ─────────────────────
const target = files.find((f) => f.startsWith('搜备忘'));
const mutFile = join(MUT, target);
const src = join(PAGES, target);
const original = readFileSync(src, 'utf8');
copyFileSync(src, mutFile);
const mutated = original.replace('<h1 id="title">', '<h1 id="title">甲；乙；丙 ');
if (mutated === original) throw new Error('变异注入点没命中：' + target);
writeFileSync(mutFile, mutated, 'utf8');
const red = run(mutFile);
console.log('MUT  ' + target.padEnd(34) + ' exit=' + red.exit + '  节点级命中=' + (red.json ? red.json.node.R1 + red.json.node.R2 + red.json.node.R3 : '?'));
// ── 还原：逐字回原文件 → 必须绿 ──────────────────────────────────────────────────
writeFileSync(mutFile, original, 'utf8');
const back = run(mutFile);
console.log('BACK ' + target.padEnd(34) + ' exit=' + back.exit + '  节点级命中=' + (back.json ? back.json.node.R1 + back.json.node.R2 + back.json.node.R3 : '?'));
console.log('RESULT: 正例 ' + greenCount + '/' + files.length + ' 绿；反例 exit=' + red.exit + '（须 1）；还原 exit=' + back.exit + '（须 0）');
