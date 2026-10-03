#!/usr/bin/env node
/** #1079 · SAY 采集 16 页「判地 ／ 真跑产物」左右对照墙生成器（入仓，随票走）。
 *
 * 出什么：一张 HTML——16 行，每行左＝判地原型（proto/say-collect/*-v2.3.html）、右＝当刻真跑产物，
 *   同一视口宽度（缺省 390）并排嵌在 iframe 里，供人逐格看「这页好不好用」（这是人眼那一道的活）。
 * 它**不下机器判据**：像素判据只走 vision_html_screenshot ＋ vision_pixel_diff，读数是另外两件。
 *
 * 用法（仓根）：
 *   node docs/skills/skill-bill/1079-say-验收墙.mjs [--out <墙.html>] [--products <产物目录>] [--width 390]
 * 缺省：产物目录 .scratch/1079-say/out、墙写 .scratch/1079-say/wall.html。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SAMPLES = join(ROOT, 'docs/skills/skill-bill/1079-say-样本集.json');

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const OUT = resolve(ROOT, argOf('--out', '.scratch/1079-say/wall.html'));
const PRODUCTS = resolve(ROOT, argOf('--products', '.scratch/1079-say/out'));
const WIDTH = Number(argOf('--width', '390'));

const samples = JSON.parse(readFileSync(SAMPLES, 'utf8'));
const rel = (from, to) => relative(dirname(from), to).split('\\').join('/');
let missing = 0;

const cells = samples.items.map((it) => {
  const product = join(PRODUCTS, it.wake + '.html');
  const ok = existsSync(product);
  if (!ok) missing += 1;
  const proto = join(ROOT, it.proto);
  return '<section class="cell"><h3>' + it.seq + ' ' + it.wake + (ok ? '' : '  <b>（产物缺失）</b>') + '</h3>'
    + '<div class="pair">'
    + '<figure><figcaption>判地原型 v2.3</figcaption><iframe src="' + rel(OUT, proto) + '" width="' + WIDTH + '" height="1180"></iframe></figure>'
    + '<figure><figcaption>真跑产物</figcaption><iframe src="' + rel(OUT, product) + '" width="' + WIDTH + '" height="1180"></iframe></figure>'
    + '</div></section>';
}).join('');

const html = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">'
  + '<title>#1079 · SAY 采集 16 页：判地 ／ 产物 左右对照</title><style>'
  + 'body{margin:0;background:#efe9dd;font:14px/1.5 "Microsoft YaHei",system-ui;color:#2b2620}'
  + 'header{padding:18px 22px;background:#fffdf7;border-bottom:1px solid #e9dfcd;position:sticky;top:0;z-index:9}'
  + 'h1{margin:0 0 6px;font-size:18px}p{margin:0;color:#665f57}'
  + '.cell{padding:16px 22px 6px}h3{margin:0 0 8px;font-size:15px}'
  + '.pair{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}'
  + 'figure{margin:0;background:#fff;border:1px solid #e9dfcd;border-radius:14px;overflow:hidden}'
  + 'figcaption{padding:6px 10px;font-size:12px;color:#665f57;border-bottom:1px solid #e9dfcd}'
  + 'iframe{display:block;border:0;background:#fff}</style></head><body>'
  + '<header><h1>#1079 · SAY 采集 16 页：判地原型 ／ 真跑产物</h1>'
  + '<p>左＝判地原型（proto/say-collect/*-v2.3.html），右＝当刻 CLI 真跑产物，同一视口宽度 ' + WIDTH + '。'
  + '两栏看起来一样＝还原到位；哪一栏不一样就是还没收敛的地方（机器判据另跑，见本票证据件）。</p></header>'
  + cells + '</body></html>';

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, 'utf8');

/** 落盘后自检（**改坏必红**）：墙是负责人唯一的判据界面，`loading="lazy"` 会让下半墙永远空白，
 *  故「墙面 lazy 恒为 0」是一条硬断言——把 lazy 加回模板即当场红、且点名处数。
 *  另核格数与 iframe 数（每格两侧各一个）。 */
const lazyCount = html.split('loading="lazy"').length - 1;
const cellCount = (html.match(/<section class="cell"/g) || []).length;
const iframeCount = (html.match(/<iframe/g) || []).length;
const wantCells = samples.items.length;
const wantIframes = wantCells * 2;
const red = [];
if (lazyCount !== 0) red.push('墙面出现 loading="lazy" ' + String(lazyCount) + ' 处（下半墙会空白；本生成器不产出 lazy）');
if (cellCount !== wantCells) red.push('格数 ' + String(cellCount) + ' != ' + String(wantCells));
if (iframeCount !== wantIframes) red.push('iframe 数 ' + String(iframeCount) + ' != ' + String(wantIframes));
if (missing !== 0) red.push('产物缺失 ' + String(missing) + ' 件');
console.log('WALL: ' + OUT);
console.log('RESULT: ' + (samples.items.length - missing) + '/' + samples.items.length + ' 格产物在位'
  + '；lazy=' + String(lazyCount) + ' 格=' + String(cellCount) + ' iframe=' + String(iframeCount));
if (red.length) {
  console.log('RED ' + OUT + '：' + red.join('；'));
  process.exit(1);
}
process.exit(0);
