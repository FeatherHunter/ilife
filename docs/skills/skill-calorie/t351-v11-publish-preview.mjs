/** T351-v11 · 把某一批产物按可读名发到预览台，并生成「全部样张」总索引（负责人肉眼验收的入口）。
 *  入仓理由：验收入口要能重出——产物目录换一版就重跑一次，不手抄链接。
 *
 *  把某一批的 37 份产物按可读名发到预览台，并生成一张「全部样张」总索引
 *  ——负责人肉眼验收的入口：一处点得进全部 37 份，按族分组、带唤醒词。
 *  用法：node .scratch/t351-ux/publish-all-37.mjs [产物目录=final-v11]
 */
import { readFileSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2] ?? '.scratch/t351-fix/final-v11';
const PV = '.scratch/t351-preview';
const detail = JSON.parse(readFileSync(join(SRC, 'detail.json'), 'utf8'));

/** 族：按 order 段与类型分（与页面的装配件同源）。 */
const FAMILY = [
  { key: 'plan', title: '看计划族（176–185）', note: '结果型 · 老 workout_plan_view 观感 · 两级页签零脚本', range: (o) => o >= 176 && o <= 185 && true, kinds: ['结果'] },
  { key: 'wizard', title: '构建向导（186）', note: '过程型 · 五层时间线 ＋ 就地改 ＋ 计数（本轮的工具栏那一页）', range: (o) => o === 186, kinds: ['过程'] },
  { key: 'preview', title: '写前预览（187–195）', note: '过程型 · 改前／改后两张真表格 ＋ 复制指令', range: (o) => o >= 187 && o <= 195, kinds: ['过程'] },
  { key: 'receipt', title: '写后回执（186–195）', note: '回执型 · 写后现值 ＋ 改动对照 ＋ M5 四要素', range: (o) => o >= 186 && o <= 195, kinds: ['回执'] },
  { key: 'review', title: '计划复盘与扫描（201–207）', note: '结果型 · 热力图 ＋ 完成率卡 ＋ 明细表；207 是禁忌扫描', range: (o) => o >= 201 && o <= 207, kinds: ['结果'] },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = (kind) => kind;
const target = (s) => 'v11-' + s.order + '-' + slug(s.kind) + '-' + s.wake.replace(/[\\/:*?"<>|（）\s]/g, '') + '.html';

const have = new Set(readdirSync(SRC).filter((f) => f.endsWith('.html')));
const rows = detail.steps.filter((s) => s.file !== null && s.file !== undefined && have.has(s.file));
let copied = 0;
for (const s of rows) {
  copyFileSync(join(SRC, s.file), join(PV, target(s)));
  copied += 1;
}
const skipped = detail.steps.filter((s) => !rows.includes(s));

const familyHtml = FAMILY.map((f) => {
  const mine = rows.filter((s) => f.range(s.order) && f.kinds.includes(s.kind));
  if (mine.length === 0) return '';
  const cards = mine.map((s) => '<a class="card" href="' + esc(target(s)) + '">'
    + '<div class="t">' + esc(s.wake) + '</div>'
    + '<div class="d">第 ' + s.order + ' 号唤醒词 · ' + esc(s.kind) + '页</div></a>').join('\n');
  return '<h2>' + esc(f.title) + '<span class="n">' + esc(f.note) + '</span></h2>\n'
    + '<div class="grid">\n' + cards + '\n</div>\n';
}).join('\n');

const skipHtml = skipped.map((s) => '<li>' + esc(s.order + ' ' + s.wake + '') + '——'
  + esc(s.kind === '外部' ? '按 Out of scope 不做执行层，只保命中与文案（无产物）' : '撤销后的读验证（应当阻断，无产物）')
  + '</li>').join('');

const page = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>场景05 健身计划 · 全部 ${rows.length} 份样张</title>
<style>
:root{--fg:#1d1d1f;--fg2:#6e6e73;--fg3:#86868b;--bg:#f5f5f7;--card:#fff;--line:#d2d2d7;--blue:#007aff}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--fg);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:980px;margin:0 auto;padding:36px 20px 80px}
h1{font-size:26px;font-weight:600;letter-spacing:-.02em;margin-bottom:6px}
.sub{color:var(--fg2);font-size:14px;margin-bottom:24px}
h2{font-size:15px;font-weight:600;margin:26px 0 10px;padding-bottom:8px;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:8px;align-items:baseline}
h2 .n{color:var(--fg3);font-weight:400;font-size:12.5px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
a.card{display:block;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px;text-decoration:none;color:inherit;transition:border-color .15s}
a.card:hover{border-color:var(--blue)}
a.card .t{font-weight:600;font-size:13.5px}
a.card .d{color:var(--fg2);font-size:12px;margin-top:2px}
.note{margin-top:26px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;font-size:13.5px;color:var(--fg2)}
.note ul{margin:8px 0 0 18px}
.note li{margin:4px 0}
@media(max-width:820px){.wrap{padding:20px 16px 60px}.grid{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<div class="wrap">
  <h1>场景 05 健身计划 · 全部 ${rows.length} 份样张</h1>
  <div class="sub">按族分组，一处点得进每一份。每份都已过六条口径：双端自适应、手机端照 help html、
  零分隔符懒政、零冗余文字、零内联样式／零页面脚本。</div>
${familyHtml}
  <div class="note">
    <b>另外 ${skipped.length} 条没有产物，是有意为之</b>
    <ul>${skipHtml}</ul>
  </div>
</div>
</body>
</html>
`;
writeFileSync(join(PV, 'v11-全部样张.html'), page);
console.log('复制 ' + copied + ' 份；索引 v11-全部样张.html 已出；无产物 ' + skipped.length + ' 条');
