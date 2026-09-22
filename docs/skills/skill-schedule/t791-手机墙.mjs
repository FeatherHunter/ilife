#!/usr/bin/env node
/** 作息管家·**手机验证墙**（一面放下）：61 件产物按域票顺序铺成一面 390 宽的墙，格子给全高、可滚。
 *
 *  用法：`node docs/skills/skill-schedule/t791-手机墙.mjs`
 *  产出：`docs/skills/skill-schedule/手机验证墙.html`（自包含：每格把**真产物**用 `srcdoc` 内嵌，
 *        与 `.scratch/t78x/墙/*` 那八面小墙同一种嵌法，故本件零外部文件依赖、拷到哪儿都能开）。
 *
 *  读什么：八张域票的清单件（`.scratch/t783…t790/成品/t78x-清单.json`）——产物名与顺序逐字取它，
 *  本件**不自己算名字、不改名、不做缩略图**（每格就是那一份产物本体）。缺一件即非零退出并点名。
 *
 *  为什么 `srcdoc` 而不是 `src="../成品/x.html"`：小墙那八面里，t783 用相对路径引产物（要靠目录相对关系），
 *  t784–t790 把产物内嵌进 iframe 本体（自包含）。本件取**自包含**那一支：这一面墙会被单独发给人看，
 *  依赖相对路径的话，文件一挪就整面空白。
 *
 *  纪律（照 #792 票面「不许动的东西」）：**不给 iframe 加 `loading="lazy"`**（下半页会永远空白）、
 *  **不用缩略图冒充产物**（每格是真产物本体，媒体查询按格子宽真实生效）、格高一致。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const OUT = join(HERE, '手机验证墙.html');

/** 八张域票的清单件（顺序＝这一面墙的铺格顺序）。 */
const SOURCES = [
  { ticket: 783, label: '写入与同步', file: '.scratch/t783/成品/t783-清单.json' },
  { ticket: 784, label: '查询与浏览·单日族', file: '.scratch/t784/成品/t784-清单.json' },
  { ticket: 785, label: '查询与浏览·范围与跨天', file: '.scratch/t785/成品/t785-清单.json' },
  { ticket: 786, label: '查询与浏览·日程族', file: '.scratch/t786/成品/t786-清单.json' },
  { ticket: 787, label: '日程与计划·写侧', file: '.scratch/t787/成品/t787-清单.json' },
  { ticket: 788, label: '日程与计划·复盘与飞书', file: '.scratch/t788/成品/t788-清单.json' },
  { ticket: 789, label: '分析与洞察', file: '.scratch/t789/成品/t789-清单.json' },
  { ticket: 790, label: '辅助与管理', file: '.scratch/t790/成品/t790-清单.json' },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reds = [];
const red = (m) => reds.push(m);

/* ── 收格：逐份清单读产物的名字与本体 ────────────────────────────── */

const groups = [];
let n = 0;
for (const s of SOURCES) {
  const manifestPath = join(REPO, s.file);
  if (!existsSync(manifestPath)) { red('缺清单件：' + s.file); continue; }
  const rows = JSON.parse(readFileSync(manifestPath, 'utf8')).rows ?? [];
  const cells = [];
  for (const r of rows) {
    const path = join(dirname(manifestPath), r.file);
    if (!existsSync(path)) { red('产物不在盘上：' + r.file + '（' + path + '）'); continue; }
    const html = readFileSync(path, 'utf8');
    if (!html.startsWith('<!doctype html>')) red('不是整页（缺 <!doctype html>）：' + r.file);
    n += 1;
    cells.push({ seq: String(n).padStart(2, '0'), file: r.file, bytes: Buffer.byteLength(html, 'utf8'), html });
  }
  groups.push({ ...s, cells });
}

/* ── 装配：390 宽一格、格高一致、每格可滚 ────────────────────────── */

const CELL_W = 390;
const CELL_H = 720;

const figureOf = (c) => [
  '<figure>',
  '<figcaption><b>' + c.seq + '</b><span class="nm">' + esc(c.file) + '</span>',
  '<span class="mt">' + Math.round(c.bytes / 1024) + ' KB</span></figcaption>',
  '<iframe title="' + esc(c.file) + '" width="' + CELL_W + '" height="' + CELL_H + '" srcdoc="' + esc(c.html) + '"></iframe>',
  '</figure>',
].join('');

const body = groups.map((g) => [
  '<h2>' + esc(g.label) + '<span class="cnt">' + g.cells.length + ' 格 · 域票 ' + g.ticket + '</span></h2>',
  '<div class="grid">',
  g.cells.map(figureOf).join('\n'),
  '</div>',
].join('\n')).join('\n');

const total = groups.reduce((a, g) => a + g.cells.length, 0);
const bytes = groups.reduce((a, g) => a + g.cells.reduce((b, c) => b + c.bytes, 0), 0);

const page = '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
  + '<title>作息管家手机验证墙（' + total + ' 格）</title>\n<style>\n'
  + '*{margin:0;padding:0;box-sizing:border-box}\n'
  + 'body{background:#eef0f3;color:#1d1d1f;'
  + 'font:14px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;padding:22px 18px 60px}\n'
  + 'h1{font-size:20px;margin-bottom:6px}\n'
  + '.lead{color:#5b6672;font-size:13px;margin-bottom:18px}\n'
  + 'h2{font-size:15px;margin:26px 0 10px;padding-left:9px;border-left:4px solid #0b6bcb}\n'
  + '.cnt{color:#86868b;font-weight:400;font-size:12px;margin-left:8px}\n'
  + '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(' + CELL_W + 'px,' + CELL_W + 'px));gap:16px;justify-content:start}\n'  + 'figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden;'
  + 'box-shadow:0 1px 2px rgba(0,0,0,.06)}\n'
  + 'figcaption{display:flex;align-items:baseline;gap:8px;padding:8px 10px;border-bottom:1px solid #e8e8ed;font-size:12px}\n'
  + 'figcaption b{color:#86868b;font-weight:600;font-family:Consolas,Menlo,monospace}\n'
  + '.nm{flex:1;word-break:break-all;font-weight:600}\n'
  + '.mt{color:#86868b;white-space:nowrap;font-family:Consolas,Menlo,monospace;font-size:11px}\n'
  + 'iframe{display:block;border:0;background:#fff}\n'
  + '.foot{color:#5b6672;font-size:12px;margin-top:28px;border-top:1px solid #d2d2d7;padding-top:12px}\n'
  + '@media (min-width:860px){.grid{grid-template-columns:repeat(auto-fill,minmax(' + CELL_W + 'px,1fr))}}\n'
  + '</style>\n</head>\n<body>\n'
  + '<h1>作息管家手机验证墙 · ' + total + ' 格</h1>\n'
  + '<p class="lead">每格是<b>真产物本体</b>（' + CELL_W + ' 宽的 iframe，可滚可交互），按八张域票的顺序铺；'
  + '格子里的媒体查询按 ' + CELL_W + ' 真实生效。产物合计 ' + Math.round(bytes / 1024 / 1024 * 10) / 10 + ' MB，'
  + '本页自包含（产物用 srcdoc 内嵌），拷到哪都能开。</p>\n'
  + body + '\n'
  + '<p class="foot">读数：' + total + ' 格（八份清单件的产物数之和）；格宽 ' + CELL_W + '、格高 ' + CELL_H
  + '；零外部文件依赖。重出本页：<code>node docs/skills/skill-schedule/t791-手机墙.mjs</code>（只读产物）。</p>\n'
  + '</body>\n</html>\n';

/* ── 自检 ＋ 落盘 ─────────────────────────────────────────────── */

const frames = (page.match(/<iframe /g) ?? []).length;
const lazy = page.includes('loading="lazy"');
if (lazy) red('墙上出现 loading="lazy"（票面明令不许：下半页会永远空白）');
if (frames !== total) red('格数与读数对不上：iframe ' + frames + ' ≠ ' + total);
if (total === 0) red('一格都没有（清单件都读不到？）');

console.log('OK   格数 ' + total + '（iframe ' + frames + '）；产物字节合计 ' + bytes);
console.log('OK   零外部文件依赖（产物 srcdoc 内嵌）；无 loading="lazy"');
if (reds.length > 0) {
  console.log('--- 红条 ---');
  for (const r of reds) console.log('RED  ' + r);
  console.log('RESULT: FAIL cells=' + total + ' red=' + reds.length);
  process.exit(1);
}
writeFileSync(OUT, page, 'utf8');
console.log('RESULT: PASS cells=' + total + ' -> 可发');
console.log('WROTE ' + OUT.replace(/\\/g, '/') + '（' + readFileSync(OUT).length + ' 字节）');
