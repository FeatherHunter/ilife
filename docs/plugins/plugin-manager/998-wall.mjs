/** 998 收口墙生成器（map #994：六面板标题去中点 + 油封印章书签 HELP）。
 *
 * 形制照 docs/agents/视觉验收墙.md §6.2 骨架 + §6.3 四条形制：
 * - 每格一件真产物（iframe 真渲染，媒体查询按格子宽生效，可交互），不塞缩略图；
 * - 成对出：手机墙 390 宽 3 列原样，桌面墙 1280 宽 1 列整体缩（视口仍是 W）；
 * - 每格标签：编号 + 点开整页的标题 + 一句该确认什么；
 * - 未加 loading=lazy（§7 坑：后半墙空白）；
 * - 清单不带签名 UTF-8（§7 坑）；
 * - 自检双判据 dropped + dead（§6.4 t154 假绿灯教训：先过滤再查引用会静默剔缺件）。
 *
 * 入仓件（§5）：docs/plugins/plugin-manager/998-wall.mjs，下一批人只跑一个命令重出双墙。
 * 产物目录：.scratch/998/（墙页与产物同目录，iframe 相对路径才落得到）。
 *
 * 用法：
 *   node docs/plugins/plugin-manager/998-wall.mjs .scratch/998 998-manifest.json 998-手机墙.html 390 820
 *   node docs/plugins/plugin-manager/998-wall.mjs .scratch/998 998-manifest.json 998-桌面墙.html 1280 900
 * 反例（必跑，§4）：故意在清单里写一个不存在的文件名再跑一次，须 exit 1 且点名那份。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2] ?? '.scratch/998';
const MANIFEST = process.argv[3] ?? '998-manifest.json';
const OUT = process.argv[4] ?? '998-手机墙.html';
const W = Number(process.argv[5]) || 390;
const H = Number(process.argv[6]) || 820;
const MODE = W <= 500 ? '手机' : '桌面';
const SCALE = W <= 500 ? 1 : Math.min(0.5, 600 / W);
const CW = Math.round(W * SCALE);
const CH = Math.round(H * SCALE);
const COLS = W <= 500 ? 3 : 1;

const all = JSON.parse(readFileSync(join(SRC, MANIFEST), 'utf8')).rows;
const rows = all.filter((r) => r.file && existsSync(join(SRC, r.file)));
const dropped = all.filter((r) => !rows.includes(r));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ORDER = ['配置头', '体检头'];
const sorted = [...rows].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.seq - b.seq);

const sections = ORDER.filter((k) => sorted.some((r) => r.kind === k)).map((kind) => {
  const cells = sorted.filter((r) => r.kind === kind).map((r) => '    <figure>\n'
    + '      <figcaption><a href="' + esc(r.file) + '" target="_blank" rel="noopener">'
    + esc(String(r.seq).padStart(2, '0') + ' ' + r.wake) + '</a>'
    + '<span>' + esc(r.kind) + '</span></figcaption>\n'
    + '      <div class="confirm">' + esc(r.confirm) + '</div>\n'
    + '      <div class="frame"><iframe src="' + esc(r.file) + '" width="' + W + '" height="' + H + '" title="' + esc(r.wake) + '"></iframe></div>\n'
    + '    </figure>').join('\n');
  const n = sorted.filter((r) => r.kind === kind).length;
  return '  <h2>' + esc(kind) + '<span>' + esc(String(n)) + ' 格</span></h2>\n'
    + '  <div class="grid">\n' + cells + '\n  </div>';
}).join('\n');

const page = '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>998 收口墙 · ' + MODE + '墙（' + rows.length + ' 格 x ' + W + ' 宽）</title>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{background:#f5f5f7;color:#1d1d1f}\n.wrap{padding:24px 20px 60px}\nh1{font-size:22px;font-weight:600;margin-bottom:6px}\n.sub{color:#6e6e73;font-size:13.5px;margin-bottom:8px;line-height:1.7}\nh2{font-size:15px;font-weight:600;margin:26px 0 12px;padding-left:9px;border-left:4px solid #a5281b}\nh2 span{color:#86868b;font-weight:400;font-size:12.5px;margin-left:8px}\n.grid{display:grid;grid-template-columns:repeat(' + COLS + ',' + CW + 'px);gap:18px;align-items:start;justify-content:start}\nfigure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}\nfigcaption{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}\nfigcaption a{color:#007aff;text-decoration:none}\n.confirm{padding:6px 10px;font-size:11.5px;color:#6e6e73;border-bottom:1px solid #e8e8ed;line-height:1.6}\n.frame{width:' + CW + 'px;height:' + CH + 'px;overflow:hidden;background:#fff}\niframe{display:block;width:' + W + 'px;height:' + H + 'px;border:0;background:#fff;transform:scale(' + SCALE + ');transform-origin:0 0}\n</style>\n</head>\n<body>\n<div class="wrap">\n  <h1>998 收口墙 · ' + MODE + '墙 · ' + rows.length + ' 格 x ' + W + ' 宽</h1>\n  <div class="sub">每格是一份产物在 ' + W + ' 宽下的真实渲染（iframe 里跑真 HTML）。点标题在新标签打开整页。这一页给人看，不是交付产物。</div>\n' + sections + '\n</div>\n</body>\n</html>\n';

writeFileSync(join(SRC, OUT), page, 'utf8');

const refs = [...page.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1]);
const dead = refs.filter((r) => !existsSync(join(SRC, decodeURIComponent(r))));
const clean = dropped.length === 0 && dead.length === 0;
const bad = [...dropped.map((r) => r.file), ...dead];
console.log('墙 ' + OUT + '：' + rows.length + ' 格；链接 ' + refs.length + ' 条；'
  + (clean ? '缺失 0 -> ' + OUT + ' 可发'
    : '缺 ' + bad.length + ' 件 -> ' + bad.join('、')));
process.exit(clean ? 0 : 1);
