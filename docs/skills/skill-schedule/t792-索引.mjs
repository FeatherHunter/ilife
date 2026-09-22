#!/usr/bin/env node
/** #792 · **总索引**（`docs/agents/视觉验收墙.md` §3 第 4 条：按页面族分组，**末尾列清「哪些有意不出产物及其原因」**）。
 *
 *  用法：`node docs/skills/skill-schedule/t792-索引.mjs`
 *  读：`.scratch/t792/t792-清单.json`（由 `t792-清单.mjs` 出）＋ `./t791-数据.mjs` 的 `MANIFESTS`／`ROWS`／`EXCLUDED`
 *      ＋ 生成的权威路由表（`packages/skill-schedule/dist/triggers/routes.generated.js`）
 *  出：`.scratch/t792/t792-总索引.html`（与两张墙同目录，§5「总索引页与墙放一起」）。
 *
 *  索引里三节（§3 第 4 条那一节的落点）：
 *    ① **按页族分组**：每族的每件产物 —— 序号／名字（可点开整页）／字节／这一格该确认什么；
 *    ② **有意不出**：路由表里有、但按定义不另出产物的条，逐条写原因（这一段省掉最多追问）；
 *    ③ **自检与重出口**：正反例命令、重出命令。
 *
 *  退出码：0＝全绿；1＝产物缺件（点名）；2＝前置件缺失。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MANIFESTS, ROWS, EXCLUDED } from './t791-数据.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const DIR = join(REPO, '.scratch', 't792');
const ROUTES_JS = join(REPO, 'packages', 'skill-schedule', 'src', 'triggers', 'routes.generated.ts');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reds = [];
const lines = [];

if (!existsSync(join(DIR, 't792-清单.json'))) {
  console.error('ERR2 缺清单：.scratch/t792/t792-清单.json（先跑 t792-清单.mjs）');
  process.exit(2);
}
if (!existsSync(ROUTES_JS)) {
  console.error('ERR2 缺生成的权威路由表：' + ROUTES_JS);
  process.exit(2);
}
const rows = JSON.parse(readFileSync(join(DIR, 't792-清单.json'), 'utf8')).rows ?? [];
const { SCHEDULE_ROUTES } = await import(pathToFileURL(ROUTES_JS).href);

const missing = rows.filter((r) => !existsSync(join(DIR, r.file)));
if (missing.length > 0) for (const m of missing) reds.push('产物不在盘上：' + m.file);

/* ── ① 按页族分组 ─────────────────────────────────────────────────────────── */

const families = [...new Set(rows.map((r) => r.family))];
const famHtml = families.map((fam) => {
  const inFam = rows.filter((r) => r.family === fam);
  const trs = inFam.map((r) => '<tr>'
    + '<td class="seq">' + esc(r.seq) + '</td>'
    + '<td class="pg"><a href="' + esc(r.file) + '" target="_blank" rel="noopener">' + esc(r.file.replace(/\.html$/, '')) + '</a></td>'
    + '<td class="num">' + Math.round(r.bytes / 1024) + ' KB</td>'
    + '<td class="chk">' + esc(r.check) + '</td>'
    + '</tr>').join('\n');
  return '<h3>' + esc(fam) + '<span class="cnt">' + inFam.length + ' 件 · 域票 ' + inFam[0].ticket + '</span></h3>\n'
    + '<div class="tw"><table><thead><tr><th>序</th><th>产物（点开整页）</th><th>体积</th><th>这一格该确认什么</th></tr></thead>\n'
    + '<tbody>\n' + trs + '\n</tbody></table></div>';
}).join('\n');

/* ── ② 有意不出 ───────────────────────────────────────────────────────────── */

const helpAlias = SCHEDULE_ROUTES.filter((e) => e.key === 'schedule.help.lookup' && e.preset === undefined);
const excludedRows = [
  ...helpAlias.map((e) => ({ phrase: e.phrase, key: e.key, reason: EXCLUDED.helpAlias })),
  ...EXCLUDED.noCommandWakeWords.map((p) => ({ phrase: p, key: '（新仓无此命令）', reason: EXCLUDED.noCommandReason })),
];
const excludedHtml = excludedRows.map((e) => '<tr>'
  + '<td class="wake">' + esc(e.phrase) + '</td>'
  + '<td class="cmd"><code>' + esc(e.key) + '</code></td>'
  + '<td class="why">' + esc(e.reason) + '</td></tr>').join('\n');

/* ── 装配 ─────────────────────────────────────────────────────────────────── */

const pageTitle = '作息管家页面面 · 总索引（' + rows.length + ' 件产物 · ' + families.length + ' 族）';
const page = '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
  + '<title>' + esc(pageTitle) + '</title>\n<style>\n'
  + '*{box-sizing:border-box}\n'
  + 'body{margin:0;padding:26px 20px 70px;background:#f5f5f7;color:#1d1d1f;'
  + 'font:15px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}\n'
  + 'h1{font-size:22px;margin:0 0 8px}\n'
  + 'h2{font-size:17px;margin:30px 0 10px;padding-left:9px;border-left:4px solid #0b6bcb}\n'
  + 'h3{font-size:15px;margin:22px 0 8px}\n'
  + '.cnt{color:#86868b;font-weight:400;font-size:12px;margin-left:8px}\n'
  + '.lead{color:#6e6e73;font-size:13.5px;margin:0 0 12px}\n'
  + '.tw{overflow-x:auto;background:#fff;border:1px solid #d2d2d7;border-radius:10px;margin-bottom:6px}\n'
  + 'table{border-collapse:collapse;table-layout:fixed;width:100%;font-size:13px}\n'
  + 'th,td{border:1px solid #e8e8ed;padding:8px 10px;vertical-align:top;text-align:left;overflow-wrap:anywhere}\n'
  + 'th{background:#eef2f6}\n'
  + 'col.c1{width:44px}col.c3{width:88px}\n'
  + 'td.seq{color:#86868b;text-align:right}\n'
  + 'td.num{color:#86868b;font-family:Consolas,Menlo,monospace;font-size:12px}\n'
  + 'td.pg a{color:#0b6bcb;word-break:break-all}\n'
  + 'td.chk,td.why{color:#3a3a3c;font-size:12.5px}\n'
  + 'td.wake{font-weight:600;white-space:nowrap}\n'
  + 'td.cmd code,code{font-family:Consolas,Menlo,monospace;font-size:12px;background:#eef2f6;border-radius:4px;padding:1px 5px}\n'
  + '.card{background:#fff;border:1px solid #d2d2d7;border-radius:10px;padding:14px 16px;margin:12px 0}\n'
  + '.foot{color:#6e6e73;font-size:12.5px;margin-top:26px;border-top:1px solid #d2d2d7;padding-top:12px}\n'
  + '@media (max-width:640px){body{padding:18px 12px 50px}table{font-size:12px}th,td{padding:6px 7px}}\n'
  + '</style>\n</head>\n<body>\n'
  + '<h1>' + esc(pageTitle) + '</h1>\n'
  + '<p class="lead">这一页是**细看入口**：按页族列清每一件产物（点名字开整页）＋ 末尾「有意不出」一节。'
  + '滚着看的那两张墙在同一个目录：<code>t792-手机墙.html</code>（390 宽）与 <code>t792-桌面墙.html</code>（1280 宽）。</p>\n'
  + '<h2>一、按页族分组（' + rows.length + ' 件）</h2>\n' + famHtml + '\n'
  + '<h2>二、有意不出（' + excludedRows.length + ' 条：路由表里有、但按定义不另出产物）</h2>\n'
  + '<p class="lead">「缺哪条要写明」：路由表 ' + SCHEDULE_ROUTES.length + ' 条 ＝ 出页 ' + ROWS.filter((r) => !excludedRows.some((e) => e.phrase === r.phrase)).length
  + ' ＋ 有意不出 ' + excludedRows.length + '。这一节逐条写原因，不省。</p>\n'
  + '<div class="tw"><table><thead><tr><th>唤醒词</th><th>命令键</th><th>为什么不出产物</th></tr></thead>\n<tbody>\n'
  + excludedHtml + '\n</tbody></table></div>\n'
  + '<h2>三、自检与重出</h2>\n'
  + '<div class="card"><p>清单：<code>node docs/skills/skill-schedule/t792-清单.mjs</code>（八张域票的清单件 → <code>.scratch/t792/t792-清单.json</code>，产物同时拷进同一目录）。</p>'
  + '<p>两张墙：<code>node docs/skills/skill-schedule/t792-墙.mjs</code>（正例 exit 0）。</p>'
  + '<p>反例（必跑）：<code>node docs/skills/skill-schedule/t792-墙.mjs .scratch/t792 t792-桌面墙.html --missing 不存在的页.html</code> → 必须 exit 1 且点名那一份。</p>'
  + '<p>三档横向溢出：<code>node tools/…</code>／<code>node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t792 --widths 390,768,1440</code>。</p></div>\n'
  + '<p class="foot">产物名字逐字取自八张域票的清单件（同一个名字只在一处算出来）；本页与两张墙、与链路页 <code>链路总览.html</code> 三处同一个名字。</p>\n'
  + '</body>\n</html>\n';

const outPath = join(DIR, 't792-总索引.html');
writeFileSync(outPath, page, 'utf8');

const refs = [...page.matchAll(/href="([^"#]+\.html)"/g)].map((m) => m[1]);
const dead = refs.filter((r) => !existsSync(join(DIR, decodeURIComponent(r))));
for (const d of dead) reds.push('索引引用盘上没有的文件：' + d);

lines.push('索引 ' + outPath.replace(/\\/g, '/') + '：' + rows.length + ' 件；链接 ' + refs.length + ' 条；'
  + '族 ' + families.length + '；有意不出 ' + excludedRows.length + ' 条；'
  + (reds.length === 0 ? '缺失 0 -> 可发' : '缺 ' + reds.length + ' 处'));
for (const l of lines) console.log(l);
if (reds.length > 0) { for (const r of reds) console.log('RED  ' + r); }
console.log('RESULT: ' + (reds.length === 0 ? 'PASS' : 'FAIL') + ' rows=' + rows.length + ' links=' + refs.length
  + ' excluded=' + excludedRows.length + ' red=' + reds.length);
process.exit(reds.length === 0 ? 0 : 1);
