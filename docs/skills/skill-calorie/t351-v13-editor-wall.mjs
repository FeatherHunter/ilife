/** T351-v13 · **计划编辑器**的视觉验收墙生成器（照 `docs/agents/视觉验收墙.md` §6.2 的形制）。
 *
 * 三样齐才算验收（§3.7）：**墙 ＋ 逐格缺陷清单 ＋ 自检退出码**。本件出前两样的载体与第三样本身。
 *
 * 用法：node docs/skills/skill-calorie/t351-v13-editor-wall.mjs [产物目录] [清单文件名]
 *   默认 `.scratch/t351-editor/samples` ＋ `manifest.json`。
 * 出两页（§3.3）：手机墙 390 宽（3 列）／桌面墙 1280 宽（缩到 600px、1 列），格高一致。
 * 自检（§4）：正例 exit 0；清单点名而盘上没有 → exit 1 且点名那份（`dropped` 判据，
 *   §6.4 点名的那个「假绿灯」正是漏了它）。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2] ?? '.scratch/t351-editor/samples';
const MANIFEST = process.argv[3] ?? 'manifest.json';

const all = JSON.parse(readFileSync(join(SRC, MANIFEST), 'utf8')).rows;
const rows = all.filter((r) => r.file && existsSync(join(SRC, r.file)));
const dropped = all.filter((r) => !rows.includes(r));   // 清单点名、盘上没有 → 报出来，不静默剔

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** §6.3③：宽产物**整体缩**，不改视口——所以「按 W 截的图」与「墙上看到的」是同一版式。 */
function wall(width, cols, out) {
  const scale = width <= 500 ? 1 : Math.min(0.5, 600 / width);
  const boxW = Math.round(width * scale);
  const cells = rows.map((r) => {
    const inner = '<iframe src="' + esc(r.file) + '" width="' + width + '" height="820" title="' + esc(r.what) + '"></iframe>';
    const shown = scale === 1 ? inner
      : '<div class="sc" style="width:' + boxW + 'px;height:' + Math.round(820 * scale)
        + 'px"><div class="sc-in" style="transform:scale(' + scale + ')">' + inner + '</div></div>';
    return '  <figure>\n'
      + '    <figcaption><a href="' + esc(r.file) + '" target="_blank" rel="noopener">' + esc(r.seq + ' ' + r.title) + '</a>'
      + '<span>' + esc(r.kind) + '</span>'
      + '<em>该确认什么：' + esc(r.what) + '</em></figcaption>\n'
      + '    ' + shown + '\n  </figure>';
  }).join('\n');

  const page = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(out) + '（' + rows.length + ' 格 × ' + width + ' 宽）</title>\n'
    + '<style>\n*{margin:0;padding:0;box-sizing:border-box}\n'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}\n'
    + '.wrap{padding:24px 20px 60px}\nh1{font-size:22px;font-weight:600;margin-bottom:6px}\n'
    + '.sub{color:#6e6e73;font-size:13.5px;margin-bottom:20px;line-height:1.7}\n'
    + '.grid{display:grid;grid-template-columns:repeat(' + cols + ',' + boxW + 'px);gap:18px;align-items:start;justify-content:start}\n'
    + 'figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}\n'
    + 'figcaption{display:block;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}\n'
    + 'figcaption a{color:#007aff;text-decoration:none}\n'
    + 'figcaption span{float:right;color:#86868b;font-weight:400;font-size:11.5px}\n'
    + 'figcaption em{display:block;margin-top:4px;font-style:normal;font-weight:400;font-size:11.5px;color:#6e6e73;line-height:1.5}\n'
    + 'iframe{display:block;border:0;background:#fff}\n.sc{overflow:hidden}.sc-in{transform-origin:0 0}\n'
    + '</style></head><body><div class="wrap">\n'
    + '<h1>' + (width <= 500 ? '手机墙' : '桌面墙') + ' · ' + rows.length + ' 格 × ' + width + ' 宽</h1>\n'
    + '<div class="sub">每格是一份产物在 ' + width + ' 宽下的<b>真实渲染</b>（可交互：能点、能填、能删）。'
    + '点标题在新标签打开整页。这一页给人看，不是交付产物。</div>\n'
    + '<div class="grid">\n' + cells + '\n</div></div></body></html>\n';
  writeFileSync(join(SRC, out), page, 'utf8');
  return page;
}

const mobile = wall(390, 3, 'v13-editor-手机墙.html');
const desktop = wall(1280, 1, 'v13-editor-桌面墙.html');

/* 自检（§4）：两页引用的每一条都要落得到；清单点名而盘上缺的也要点名。 */
const refs = [...new Set([...mobile.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1])
  .concat([...desktop.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1])))];
const dead = refs.filter((r) => !existsSync(join(SRC, decodeURIComponent(r))));
const clean = dropped.length === 0 && dead.length === 0;
const bad = [...dropped.map((r) => r.file), ...dead];
console.log('墙：' + rows.length + ' 格（手机 ' + mobile.length + 'B／桌面 ' + desktop.length + 'B）；链接 ' + refs.length + ' 条；'
  + (clean ? '缺失 0 -> 可发' : '缺 ' + bad.length + ' 件 -> ' + bad.join('、')));
process.exit(clean ? 0 : 1);
