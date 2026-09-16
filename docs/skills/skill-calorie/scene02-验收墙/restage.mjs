#!/usr/bin/env node
/** 场景02验收墙重出（读清单、真跑 83 条、铺墙、链路总表、自检正反两面）。
 *
 * 前置：`t279-真跑.mjs` 的口径（种子／锚点 2026-09-15／逐条还原快照／真出口落盘）。
 * 本件只做三件事，不重写口径：
 *   ① 83 条逐条真跑，产物按 `manifest.json` 的 `file` 名拷进本目录（发布名唯一）；
 *   ② 出《链路总表.html》：prompt 示例 → 唤醒词 → 命令 → 产物绝对路径（可点直达）；
 *   ③ 调 `gen-wall.mjs` 出两张墙＋总索引，跑自检正例＋反例。
 * 用法：node restage.mjs（目录即本文件所在目录；运行区 `.scratch/restage-83` 原样保留）
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WALL = dirname(fileURLToPath(import.meta.url));
const ROOT = join(WALL, '..', '..', '..', '..');
const RUN = join(ROOT, '.scratch', 'restage-83');
const CHAIN = '链路总表.html';
const die = (msg) => { console.error('RESTAGE-FAIL ' + msg); process.exit(1); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const t = await import(pathToFileURL(join(ROOT, 'docs', 'skills', 'skill-calorie', 't279-真跑.mjs')).href);
const mf = JSON.parse(readFileSync(join(WALL, 'manifest.json'), 'utf8'));
const byWake = new Map(mf.rows.map((r) => [r.wake, r]));

/* ── Q1 覆盖：运行期 83 条逐条在清单里 ── */
const routes = t.scene02Routes();
console.log(`运行期场景02 ${routes.length} 条；清单 ${mf.rows.length} 行`);
const noManifest = routes.filter((r) => !byWake.has(r.wakeWord));
if (noManifest.length > 0) die('清单漏词：' + noManifest.map((r) => r.wakeWord).join('、'));
const noRoute = mf.rows.filter((r) => !routes.some((x) => x.wakeWord === r.wake));
if (noRoute.length > 0) die('清单多出运行期没有的词：' + noRoute.map((r) => r.wake).join('、'));
console.log('覆盖：83/83 对上，0 遗漏');

/* ── ① 真跑＋stage ── */
const snap = t.buildSnapshot(join(RUN, 'snapshot'), openDb);
console.log(`种子快照 ${snap.bytes} B（${snap.rows} 次写）`);
const dir = join(RUN, 'db');
mkdirSync(dir, { recursive: true });
const staged = [];
for (const [i, route] of routes.entries()) {
  const r = t.readOne(dir, snap.file, route);
  const row = byWake.get(route.wakeWord);
  if (r.status !== 0 || r.out === null || !existsSync(r.out)) die(`${route.wakeWord} exit=${r.status} 无产物：${String(r.stderr).slice(-200)}`);
  if (!r.html.startsWith('<!doctype html>')) die(`${route.wakeWord} 产物不是完整文档`);
  copyFileSync(r.out, join(WALL, row.file));
  staged.push({ route, row, bytes: statSync(join(WALL, row.file)).size });
  if ((i + 1) % 20 === 0) console.log(`真跑 ${i + 1}/${routes.length}`);
}
console.log(`stage：${staged.length} 件已按清单名入墙`);

/* ── readings 字节区间随实况更新（其余六项口径不变） ── */
const sizes = staged.map((s) => s.bytes).sort((a, b) => a - b);
const fmt = (n) => n.toLocaleString('en-US');
mf.readings['字节区间'] = `${fmt(sizes[0])} – ${fmt(sizes[sizes.length - 1])} B（中位 ${fmt(sizes[Math.floor(sizes.length / 2)])} B）`;
writeFileSync(join(WALL, 'manifest.json'), JSON.stringify(mf, null, 2), 'utf8');
console.log('readings.字节区间=' + mf.readings['字节区间']);

/* ── ② 链路总表 ── */
const WRITE_KEYS = new Set(['calorie.diet.add', 'calorie.diet.batch', 'calorie.diet.copy', 'calorie.diet.update', 'calorie.diet.update-by-date', 'calorie.diet.remove', 'calorie.diet.remove-by-type', 'calorie.diet.remove-by-date', 'calorie.diet.remove-by-range', 'calorie.product.add', 'calorie.product.update', 'calorie.product.deprecate', 'calorie.product.import', 'calorie.water.log']);
const flowOf = (key) => {
  if (key === 'calorie.view.label-precheck') return '过程型中间页：营养表识别确认页，不写库；确认后跑 calorie.diet.add 写库';
  if (key === 'calorie.view.batch-import-preview') return '过程型中间页：导入预检页，不写库；确认后跑 calorie.product.import 写库';
  if (WRITE_KEYS.has(key)) return '写后回执页：已写库（操作回执／字段变更／今日累计／复制明细）';
  return '结果型：一问一页';
};
const promptOf = (route) => {
  if (route.params === null || route.params === undefined) return `「${route.wakeWord}」`;
  return `「${route.wakeWord}」 ＋ ${JSON.stringify(route.params)}`;
};
const families = [...new Set(mf.rows.map((r) => r.family || '未分组'))];
const groups = families.map((f) => {
  const cards = mf.rows.filter((r) => (r.family || '未分组') === f).map((r) => {
    const route = routes.find((x) => x.wakeWord === r.wake);
    const abs = join(WALL, r.file);
    const params = route.params === null || route.params === undefined ? '—' : JSON.stringify(route.params);
    return `    <tr><td>${r.seq}</td><td class="prompt"><code>${esc(promptOf(route))}</code> <button data-copy=${esc(JSON.stringify(promptOf(route)))}>复制</button></td>`
      + `<td>${esc(r.wake)}</td><td><code>${esc(r.key)}</code></td><td class="params"><code>${esc(params)}</code></td>`
      + `<td>${esc(r.family)} · ${esc(r.kind)}</td><td>${esc(flowOf(r.key))}</td>`
      + `<td class="path"><a href="./${esc(encodeURI(r.file))}">${esc(abs)}</a></td></tr>`;
  }).join('\n');
  return `  <h2>${esc(f)}（${mf.rows.filter((r) => (r.family || '未分组') === f).length} 件）</h2>\n  <table>\n`
    + '    <tr><th>#</th><th>prompt 示例（点复制拿去新 session 发）</th><th>唤醒词</th><th>命令</th><th>参数</th><th>页型</th><th>流程</th><th>产物绝对路径（点直达）</th></tr>\n'
    + `${cards}\n  </table>`;
}).join('\n');
const chain = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>场景02 饮食 链路总表（83 条）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:28px 22px 60px;max-width:1400px}
h1{font-size:24px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;line-height:1.8;margin-bottom:18px}
.sub b{color:#1d1d1f}
h2{font-size:15px;font-weight:600;margin:26px 0 10px}
table{width:100%;border-collapse:collapse;background:#fff;font-size:12.5px;line-height:1.6}
th,td{border:1px solid #e4e7ec;padding:7px 9px;text-align:left;vertical-align:top}
th{background:#f8fafc;white-space:nowrap}
tr:nth-child(even) td{background:#fcfcfd}
code{font-size:11.5px;word-break:break-all}
td.path a{color:#007aff;text-decoration:none;word-break:break-all}
td.prompt button{margin-left:6px;font-size:11.5px;padding:2px 9px;border-radius:6px;border:1px solid #d2d2d7;background:#fff;cursor:pointer;white-space:nowrap}
.demo{background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:14px 16px;margin-bottom:8px}
.demo code{display:block;margin:6px 0;white-space:pre-wrap}
</style></head><body><div class="wrap">
<h1>场景02「饮食」链路总表 · 83 条</h1>
<div class="sub">链路：<b>prompt 示例 → 唤醒词 → 命令 → 产物绝对路径</b>（点绝对路径直达整页；本页双击打开即可，链接走同目录相对路径）。
验收演示只用下面两段 prompt（出自《交付验收包》），其余各行点<b>复制</b>拿去新 session 发。</div>
<div class="demo"><b>演示 1（写）→ 唤醒词「记一餐」→ calorie.diet.add → <a href="./${esc(encodeURI('记一餐.html'))}">${esc(join(WALL, '记一餐.html'))}</a></b>
<code>请你加载技能「卡路里」，执行唤醒词「记一餐」。

我刚吃了午饭：鸡胸 200 克、蛋白质 35 克。请帮我记录。</code></div>
<div class="demo"><b>演示 2（读）→ 唤醒词「看本周饮食」→ calorie.view.diet → <a href="./${esc(encodeURI('看本周饮食.html'))}">${esc(join(WALL, '看本周饮食.html'))}</a></b>
<code>请你加载技能「卡路里」，执行唤醒词「看本周饮食」。</code></div>
${groups}
<script>
document.querySelectorAll('button[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  const s = b.getAttribute('data-copy');
  try { await navigator.clipboard.writeText(s); b.textContent = '已复制'; }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = s; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); document.body.removeChild(ta); b.textContent = '已复制';
  }
  setTimeout(() => { b.textContent = '复制'; }, 1500);
}));
</script>
</div></body></html>
`;
writeFileSync(join(WALL, CHAIN), chain, 'utf8');
console.log('链路总表已出：' + join(WALL, CHAIN));

/* ── ③ 两张墙＋总索引＋自检 ── */
const run = (args) => {
  const r = spawnSync(process.execPath, [join(WALL, 'gen-wall.mjs'), ...args], { cwd: WALL, encoding: 'utf8' });
  process.stdout.write(r.stdout); process.stderr.write(r.stderr);
  return r.status;
};
if (run(['.', '手机墙-390.html', '390', '820']) !== 0) die('手机墙自检红');
if (run(['.', '桌面墙-1280.html', '1280', '860']) !== 0) die('桌面墙自检红');

/* ── 反例：改坏一个 file 名必须 exit 1 点名，改回 exit 0 ── */
const raw = readFileSync(join(WALL, 'manifest.json'), 'utf8');
const broken = JSON.parse(raw);
broken.rows[0].file = '__不存在__.html';
writeFileSync(join(WALL, 'manifest.json'), JSON.stringify(broken, null, 2), 'utf8');
const bad = spawnSync(process.execPath, [join(WALL, 'gen-wall.mjs'), '--check', '.'], { cwd: WALL, encoding: 'utf8' });
writeFileSync(join(WALL, 'manifest.json'), raw, 'utf8');
process.stdout.write(bad.stdout);
if (bad.status !== 1 || !String(bad.stdout + bad.stderr).includes('__不存在__.html')) die('反例没红或没点名');
console.log('反例 exit 1 且点名 ✓');
if (run(['--check', '.']) !== 0) die('改回后自检仍红');
console.log('RESTAGE-OK 83 件 · 两墙 · 总索引 · 链路总表 · 正反自检全过');
