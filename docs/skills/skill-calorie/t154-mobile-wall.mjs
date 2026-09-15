/** T154 · 生成「手机墙」：把场景 03 体重交付包的 58 页各塞进一个 390 宽的 `<iframe>`，按页族分组铺开。
 *
 * 形制照场景 05 的先例 `t351-v11-mobile-wall.mjs`（负责人点名要学的「视觉验收墙」）：
 *   ① 一眼看全——58 页逐个点开要点 58 次，墙上滚动一遍就看完；
 *   ② 量的是**真页面**不是缩略图——iframe 里跑的是真 HTML，CSS 媒体查询按 390 宽生效、页内可交互；
 *   ③ 顺带成了系统性巡查手段——一轮扫完全部 58 页在手机宽度下的版式。
 *
 * 三个已知坑（照抄先例的教训）：
 *   ① **不要 `loading="lazy"`**——靠后的格子会不加载；本脚本不加。
 *   ② `fullPage` 截图只栅格化靠前的行，靠后的 iframe 在**截图**里是空白；真浏览器里滚动就会画出来。
 *      ⇒ 这一页是**给人看的**，别拿它当自动化扫描的输入（机器读数走 `mobile-frame.mjs probe`）。
 *   ③ 视觉模型可能「看图编页名」——结论要落到自己看过的图上。
 *
 * 用法：node docs/skills/skill-calorie/t154-mobile-wall.mjs [交付目录=.scratch/t154/delivery] [输出名=手机墙.html] [宽=390] [高=820]
 *   手机端：node docs/skills/skill-calorie/t154-mobile-wall.mjs                       （390 × 820）
 *   桌面端：node docs/skills/skill-calorie/t154-mobile-wall.mjs .scratch/t154/delivery 宽屏墙.html 1200 900
 * 出：<交付目录>/<输出名>（与产物同目录，iframe 相对路径才落得到）
 * 写完自带**链接自检**：每个 iframe src 与标题链接都要落得到真实文件，缺一个即非 0 退出。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DELIVERY = process.argv[2] ?? '.scratch/t154/delivery';
const META = '.scratch/t154/delivery-meta/result.json';
const OUT = process.argv[3] ?? '手机墙.html';
const WF = Number(process.argv[4]) || 390;
const HF = Number(process.argv[5]) || 820;
const MODE = WF <= 500 ? '手机' : '桌面';
/** 缩放系数：手机宽（≤500）原样；宽屏墙按比例缩小到能横向摆得下若干格。 */
const SCALE = WF <= 500 ? 1 : Math.min(0.5, 600 / WF);
const CW = Math.round(WF * SCALE);
const CH = Math.round(HF * SCALE);

/** 页族：按命令键归类（与逐页清单同一套口径），墙上分组用。 */
function familyOf(key, cli) {
  const c = String(key || '') + ' ' + String(cli || '');
  if (/batch/.test(c)) return '写后回执 · 批量';
  if (/weight\.log/.test(c)) return '写后回执 · 记体重';
  if (/weight\.(update|remove)/.test(c)) return '写后回执 · 改删';
  if (/volatility/.test(c)) return '读页 · 波动';
  if (/weight-history/.test(c)) return '读页 · 明细与曲线';
  if (/weight-compare/.test(c)) return '读页 · 对比';
  if (/weight-review/.test(c)) return '读页 · 复盘';
  if (/view\.weight\b/.test(c)) return '读页 · 今日盘';
  return '其它';
}
const ORDER = ['读页 · 明细与曲线', '读页 · 对比', '读页 · 复盘', '读页 · 波动', '读页 · 今日盘',
  '写后回执 · 记体重', '写后回执 · 批量', '写后回执 · 改删', '其它'];

const meta = JSON.parse(readFileSync(META, 'utf8'));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rows = meta.rows
  .filter((r) => r.file && existsSync(join(DELIVERY, r.file)))
  .map((r) => ({ ...r, fam: familyOf(r.key, r.cli) }))
  .sort((a, b) => ORDER.indexOf(a.fam) - ORDER.indexOf(b.fam) || a.seq - b.seq);

const sections = ORDER.filter((f) => rows.some((r) => r.fam === f)).map((fam) => {
  const cells = rows.filter((r) => r.fam === fam).map((r) => '    <figure>\n'
    + '      <figcaption><a href="' + esc(r.file) + '" target="_blank" rel="noopener">'
    + esc(String(r.seq).padStart(2, '0') + ' ' + r.wake) + '</a>'
    + '<span>' + esc((r.bytes / 1024).toFixed(0) + ' KB') + '</span></figcaption>\n'
    + '      <iframe src="' + esc(r.file) + '" width="${WF}" height="${HF}" title="' + esc(r.wake) + '"></iframe>\n'
    + '    </figure>').join('\n');
  return '  <h2>' + esc(fam) + '<span>' + esc(String(rows.filter((r) => r.fam === fam).length)) + ' 页</span></h2>\n'
    + '  <div class="grid">\n' + cells + '\n  </div>';
}).join('\n');

const page = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>场景03 体重 · ${MODE}墙（${rows.length} 页 × ${WF} 宽）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:24px 20px 60px}
h1{font-size:22px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:8px;line-height:1.7}
.sub code{background:#e8e8ed;border-radius:4px;padding:1px 5px;font-size:12.5px}
h2{font-size:15px;font-weight:600;margin:26px 0 12px;padding-left:9px;border-left:4px solid #007aff}
h2 span{color:#86868b;font-weight:400;font-size:12.5px;margin-left:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(${CW + 20}px,${CW + 20}px));gap:18px;align-items:start;justify-content:start}
figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}
figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}
figcaption a{color:#007aff;text-decoration:none}
figcaption a:hover{text-decoration:underline}
figcaption span{color:#86868b;font-weight:400;font-size:11.5px;white-space:nowrap}
.frame{width:${CW}px;height:${CH}px;overflow:hidden;background:#fff}
iframe{display:block;width:${WF}px;height:${HF}px;border:0;background:#fff;transform:scale(${SCALE});transform-origin:0 0}
</style>
</head>
<body>
<div class="wrap">
  <h1>${MODE}墙 · 场景 03 体重 · ${rows.length} 页 × ${WF} 宽</h1>
  <div class="sub">每格是一份产物在**手机宽度下**的真实渲染（iframe 里跑真 HTML：媒体查询按 ${WF} 生效、页内可交互）。
  点标题在新标签打开整页。这一页是给「一遍看完 58 页」用的，不是交付产物；<b>别拿它当自动化扫描的输入</b>
  （截图只栅格化靠前的行，机器读数请走 <code>mobile-frame.mjs probe</code>）。</div>
${sections}
</div>
</body>
</html>
`;
writeFileSync(join(DELIVERY, OUT), page, 'utf8');

/* 链接自检：每个 iframe src 与标题链接都要落得到真实文件（先例 §2.4 的教训：死链必须自己抓）。 */
const refs = [...page.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1]);
const missing = refs.filter((r) => !existsSync(join(DELIVERY, r)));
console.log(MODE + '墙 ' + OUT + '：' + rows.length + ' 格；链接 ' + refs.length + ' 条；缺失 ' + missing.length
  + (missing.length ? ' -> ' + missing.join(',') : ''));
process.exit(missing.length === 0 ? 0 : 1);
