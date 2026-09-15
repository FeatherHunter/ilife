// #541 · 窄屏（≤640）数据表读数：真 390 视口下量两件事，可跑红绿。
//
// 用法：
//   node docs/base/base-render/t541-窄屏读数.mjs <产物 html…|含 html 的目录…> [--width 390] [--gap 24] [--caption-lines 3] [--label-slack 4]
//
// 判什么（三件，命中任一条即 exit 1）：
//   ① **表注不竖排**：每个 `<caption>` 的渲染行数（内容盒高 ÷ line-height）≤ `--caption-lines`（缺省 3）。
//      病根是窄屏下表已是块流、表注却留着缺省的 `display:table-caption` ⇒ 被压成「一个汉字宽」并按任意
//      位置断行（负责人截图实拍的那一列）。
//   ② **一格＝一行「值贴右缘」**：每个带 `data-label`、且值**只有一行**的数据格，其值的右缘到该格右缘的距离
//      ≤ `--gap` 像素（缺省 24）。值的盒用 `Range` 取（`::before` 生成的标签**不在** Range 里）；病根是窄屏
//      两轨栅格的值轨左对齐 ⇒ 390 档值时与容器右缘之间空掉半张卡。值换行成多行时**不判这一条**：末行按设计
//      就是左对齐的行内文字（长文本左对齐才好读），那一型由 ③ 兜住。
//   ③ **标签轨不被压成一字一行**：标签轨实宽（值的左缘 － 格的左缘）减去标签**单行**宽度 ≥ `--label-slack`
//      像素（缺省 4）。差值为负＝标签轨连一条标签都放不下、只能按字断行（值很长时最容易出）。标签的单行宽
//      用同字号同字重的 canvas `measureText` 量。
//
// 为什么不用 `--window-size=390` 直接开产物：Windows 无头 Chrome 会把窗口宽钳到约 511px，读数失真
// （口径同 `.scratch/t154/text-review/mobile-frame.mjs`）。这里套一层 390 宽的 iframe 壳，媒体查询按 390 生效。
//
// 退出码：全 PASS→0；任一 FAIL→1；读不到读数（Chrome 缺失／页面报错）→2。
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.CHROME_PATH ?? '',
].filter(Boolean);

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const W = Number(opt('--width', 390));
const GAP_MAX = Number(opt('--gap', 24));
const CAP_LINES_MAX = Number(opt('--caption-lines', 3));
const LABEL_SLACK_MIN = Number(opt('--label-slack', 4));
const OUT = resolve('.scratch/t541/probe');
// H2（#542 修）：选项的值（`--gap -999` 这类负数也不例外）不许被当成文件——按已知选项名逐个跳过其取值，
// 不再靠“长得像不像数字”猜（那个正则认不出负数，曾把 `-999` 当成路径去读文件）。
const OPT_WITH_VALUE = new Set(['--width', '--gap', '--caption-lines', '--label-slack']);
const targets = [];
for (let i = 0; i < argv.length; i += 1) {
  if (OPT_WITH_VALUE.has(argv[i])) { i += 1; continue; }
  if (argv[i].startsWith('--')) continue;
  targets.push(argv[i]);
}

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('读不到读数：找不到 Chrome（可用 CHROME_PATH 指定）');
  process.exit(2);
}

const files = targets.flatMap((p) => {
  const abs = resolve(p);
  try {
    if (statSync(abs).isDirectory()) {
      return readdirSync(abs).filter((f) => f.endsWith('.html')).map((f) => join(abs, f));
    }
  } catch { /* 不存在的路径交给下面报错 */ }
  return [abs];
});
if (files.length === 0) {
  console.error('用法：node docs/base/base-render/t541-窄屏读数.mjs <产物 html|目录…>');
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });

/* 探针：量完把读数写进父页 title（`--dump-dom` 抓得到；postMessage 那一路会被抓到中间帧）。 */
const PROBE = `<script>window.addEventListener('load', function () {
  var vw = document.documentElement.clientWidth;
  var cv = document.createElement('canvas').getContext('2d');
  var caps = [], gaps = [], slacks = [];
  var capLinesMax = 0;
  document.querySelectorAll('caption').forEach(function (c) {
    var cs = getComputedStyle(c);
    var lh = parseFloat(cs.lineHeight);
    if (!(lh > 0)) lh = parseFloat(cs.fontSize) * 1.4;
    /* 行数按**内容盒**算：getBoundingClientRect 含上下内距（caption 有 8px 上下内距），
       直接除会把单行读成 1.9 行。 */
    var box = c.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var lines = Math.round((box / lh) * 10) / 10;
    capLinesMax = Math.max(capLinesMax, lines);
    caps.push(lines);
  });
  document.querySelectorAll('td[data-label]').forEach(function (td) {
    var cell = td.getBoundingClientRect();
    var r = document.createRange();
    r.selectNodeContents(td);            /* ::before 的标签不进 Range ⇒ 这里量的就是「值」 */
    var rects = Array.prototype.slice.call(r.getClientRects());
    if (rects.length === 0) return;
    var valueRight = Math.max.apply(null, rects.map(function (x) { return x.right; }));
    var valueLeft = Math.min.apply(null, rects.map(function (x) { return x.left; }));
    /* 「值贴右缘」只判**单行值**：值换行成多行时，末行按设计就是左对齐的行内文字，右缘天然不到边
       （那是「长文本左对齐才好读」的口径，不是缺陷）。多行值那一型由 ③ 的标签轨判据兜住。 */
    if (rects.length === 1) gaps.push(Math.round(cell.right - valueRight));
    /* 标签轨还放得下整条标签吗？放不下＝标签被压成一字一行（本票要消灭的那类形态）。
       量法：标签轨实宽（值的左缘 － 格左缘，「值」在标签之后）－ 标签的**单行**宽度。 */
    var pcs = getComputedStyle(td, '::before');
    cv.font = pcs.fontWeight + ' ' + pcs.fontSize + ' ' + pcs.fontFamily;
    var want = cv.measureText(td.getAttribute('data-label') || '').width;
    if (want > 0) slacks.push(Math.round((valueLeft - cell.left) - want));
  });
  var gapMax = gaps.length ? Math.max.apply(null, gaps) : 0;
  var slackMin = slacks.length ? Math.min.apply(null, slacks) : 99;
  var bad = [];
  if (caps.length && capLinesMax > ${CAP_LINES_MAX}) bad.push('CAPTION-STACKED(' + capLinesMax + '行)');
  if (gaps.length && gapMax > ${GAP_MAX}) bad.push('VALUE-NOT-RIGHT(gap=' + gapMax + 'px)');
  if (slacks.length && slackMin < ${LABEL_SLACK_MIN}) bad.push('LABEL-SQUEEZED(slack=' + slackMin + 'px)');
  var line = 'T541 ' + (bad.length ? 'FAIL ' + bad.join('+') : 'PASS')
    + ' vw=' + vw + ' caps=' + (caps.join('/') || '-') + ' gaps=' + gaps.length + ' gapMax=' + gapMax
    + ' labels=' + slacks.length + ' labelSlackMin=' + slackMin;
  try { parent.document.title = line; } catch (e) { document.title = line; }
});</script>`;

let failed = 0;
for (const f of files) {
  const name = basename(f);
  const html = readFileSync(f, 'utf8').replace('</body>', PROBE + '</body>');
  const probePath = join(OUT, 'probe-' + name);
  writeFileSync(probePath, html, 'utf8');
  const src = 'file:///' + probePath.replaceAll('\\', '/');
  const wrapPath = join(OUT, 'wrap-' + name);
  writeFileSync(wrapPath, `<!doctype html><meta charset="utf-8"><title>等待探针…</title>
<style>html,body{margin:0;background:#8a8a8e}iframe{display:block;width:${W}px;height:2400px;border:0;background:#fff}</style>
<iframe src="${src}"></iframe>`, 'utf8');
  const r = spawnSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--allow-file-access-from-files', '--virtual-time-budget=6000',
    '--window-size=' + Math.max(W + 20, 520) + ',900',
    '--dump-dom', 'file:///' + wrapPath.replaceAll('\\', '/'),
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const m = /<title>([\s\S]*?)<\/title>/.exec(r.stdout || '');
  const line = m ? m[1] : '(读不到 title)';
  const ok = line.startsWith('T541 PASS');
  if (!ok) failed += 1;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + '  ' + line);
}
console.log('读数：' + files.length + ' 件；不合格 ' + failed + ' 件；判据'
  + ' caps<=' + CAP_LINES_MAX + '行 且 值右缘距格右缘<=' + GAP_MAX + 'px 且 标签轨余量>=' + LABEL_SLACK_MIN + 'px 宽=' + W + ' -> '
  + (failed === 0 ? '可发' : '需整改'));
process.exit(failed === 0 ? 0 : 1);
