/** T351-v11 · 生成「手机墙」：把该批 37 份产物各塞进一个 390 宽的 `<iframe>`，四列排开。
 *  两个用处：① 我一眼扫完全部 37 份在手机宽度下的版式（一轮截图代替 37 次）；
 *  ② 负责人验收时一页看全，不必逐个点。
 *  为什么用 iframe 而不是逐个截图：一次渲染就够，且页内交互（页签／勾选）也是活的。
 *  入仓理由：验收要看双端，一页铺开比逐个点 37 次省事得多；且页内交互（页签／勾选）是活的。
 *  已知限制：**截图工具只栅格化靠前的行**，靠后的 iframe 在截图里是空白——那是截图的事，
 *  真实浏览器里滚动就会画出来（本节靠前的行在截图里是正常渲染的，可自证）。
 *  用法：node docs/skills/skill-calorie/t351-v11-mobile-wall.mjs [产物目录=final-v12] [输出名]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2] ?? '.scratch/t351-fix/final-v12';
const OUT = process.argv[3] ?? 'v11-手机墙.html';
const PV = '.scratch/t351-preview';
const detail = JSON.parse(readFileSync(join(SRC, 'detail.json'), 'utf8'));

/** 与 publish-all-37 同名规则（同目录、同批发布），保证墙上每张都能点开成整页。 */
const slug = (s) => 'v11-' + s.order + '-' + s.kind + '-' + s.wake.replace(/[\\/:*?"<>|（）\s]/g, '') + '.html';
const rows = detail.steps.filter((s) => typeof s.file === 'string' && existsSync(join(PV, slug(s))));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cells = rows.map((s) => '  <figure>\n'
  + '    <figcaption><a href="' + esc(slug(s)) + '" target="_blank">' + esc(s.order + ' ' + s.wake) + '</a>'
  + '<span>' + esc(s.kind) + '</span></figcaption>\n'
  + '    <iframe src="' + esc(slug(s)) + '" width="390" height="820" title="' + esc(s.wake) + '"></iframe>\n'
  + '  </figure>').join('\n');

const page = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>场景05 健身计划 · 手机墙（${rows.length} 份 × 390 宽）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:24px 20px 60px}
h1{font-size:22px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}
figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}
figcaption a{color:#007aff;text-decoration:none}
figcaption span{color:#86868b;font-weight:400;font-size:11.5px}
iframe{display:block;width:390px;height:820px;border:0;transform-origin:0 0;background:#fff}
@media(max-width:1700px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:1280px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:880px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
  <h1>手机墙 · ${rows.length} 份 × 390 宽</h1>
  <div class="sub">每格是一份产物在手机宽度下的真实渲染（可交互：页签能点、勾选能勾）。
  点标题在新标签打开整页。这一页是给「双端看一遍」用的，不是交付产物。</div>
  <div class="grid">
${cells}
  </div>
</div>
</body>
</html>
`;
writeFileSync(join(PV, OUT), page);
console.log('手机墙 ' + OUT + '：' + rows.length + ' 格');
