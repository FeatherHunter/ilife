#!/usr/bin/env node
/** #792 · **验收墙生成器**（手机墙 390 ／ 桌面墙 1280），照 `docs/agents/视觉验收墙.md` §6.2 的骨架 ＋ §6.3 的四条形制。
 *
 *  用法：`node docs/skills/skill-schedule/t792-墙.mjs [<产物目录>] [<输出名>]`
 *  缺省：产物目录 `.scratch/t792`，输出名按格子宽自动取 `t792-手机墙.html`（W≤500）／`t792-桌面墙.html`。
 *
 *  读 **只有一处**：同目录的清单 `t792-清单.json`（由 `t792-清单.mjs` 出；名字与字节都在里面，
 *  本件**不猜文件名**——两个生成器各自算名字＝全墙集体死链，§6.1 第 2 条）。
 *
 *  四条形制（§6.3）逐条：
 *   ① **每格一件真产物、不塞缩略图**：iframe 里跑真 HTML（媒体查询按格子宽生效、复制按钮能点）；
 *      每格标签写「编号 ＋ 点开整页的标题 ＋ 这一格该确认什么」。
 *   ② **成对出**：手机墙 390（3 列）与桌面墙 1280（1 列）只有格子宽不同。
 *   ③ **宽产物要缩小就整体缩**：`SCALE = W<=500 ? 1 : Math.min(0.5, 600/W)`，外面套定尺寸框、里面 `transform:scale()`；
 *      **视口仍是 W**（所以按 W 截的图与墙上看到的是同一版式）。
 *   ④ **不 lazy**（§7 那条坑：`loading="lazy"` 会让下半页永远空白，票面 #792 明令不许）。
 *
 *  自检（§4 完成判据）：正例打印「N 格；链接 M 条；缺失 0 -> 可发」且 exit 0；
 *  **反例**（清单里写一个盘上没有的文件名）必须 exit 1 且点名那一份——走不出这条红，说明自检永远绿。
 *
 *  ⚠️ §6.4 点名的那个假绿灯：**先按「盘上有没有」过滤、再只查页面引用**，缺件会被静默剔掉、
 *  自检照样报「缺失 0」。本件不这么写：`dropped`（清单点名、盘上没有）与 `dead`（页面引用、盘上没有）
 *  分开算，两条任一非空即红。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const SRC = resolve(process.argv[2] ?? join(REPO, '.scratch', 't792'));
const OUT = process.argv[3] ?? '';
/** **反例口**（§4 必跑那条）：`--missing <文件名>` 把一个盘上没有的名字塞进清单，
 *  生成器必须 exit 1 且点名那一份——走不出这条红，说明自检永远绿。 */
const FAKE = process.argv.includes('--missing') ? process.argv[process.argv.indexOf('--missing') + 1] : '';

/** 两个视口＝两张墙（§6.3 第 2 条）。
 *  `viewport` 一律写 `width=device-width,initial-scale=1`：墙页本身是**响应式**的（列由格子宽决定），
 *  写死 `width=390` 反而会被移动端浏览器按最小宽度放大（实测 390 档被当成 448），
 *  三档量器会判「viewport≠档宽」——那一栏读数就废了。 */
const SPECS = [
  { name: 't792-手机墙.html', W: 390, H: 820, COLS: 3, label: '手机墙' },
  { name: 't792-桌面墙.html', W: 1280, H: 900, COLS: 1, label: '桌面墙' },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const manifestPath = join(SRC, 't792-清单.json');
if (!existsSync(manifestPath)) {
  console.log('RESULT: ABORT 缺清单：' + manifestPath + '（先跑 t792-清单.mjs）');
  process.exit(2);
}
const all = JSON.parse(readFileSync(manifestPath, 'utf8')).rows ?? [];
if (FAKE !== '') all.push({ seq: '99', family: '（反例）', ticket: 0, file: FAKE, bytes: 0, sha256_12: '', check: '反例：清单点名、盘上没有' });

/** 两条判据分开算（§6.4）：清单点名而盘上没有 ≠ 页面引用而盘上没有。 */
const dropped = all.filter((r) => !existsSync(join(SRC, r.file)));
const rows = all.filter((r) => existsSync(join(SRC, r.file)));

const reds = [];
const made = [];

for (const spec of SPECS) {
  if (OUT !== '' && OUT !== spec.name) continue;
  const SCALE = spec.W <= 500 ? 1 : Math.min(0.5, 600 / spec.W);
  const cellW = Math.round(spec.W * SCALE);
  const cellH = Math.round(spec.H * SCALE);

  // 按族分组（清单里每个域一行族名，组序＝域票落地序）。
  const families = [...new Set(rows.map((r) => r.family))];
  const cells = families.map((fam) => {
    const inFam = rows.filter((r) => r.family === fam);
    const figs = inFam.map((r) => {
      const inner = '<iframe src="' + esc(r.file) + '" width="' + spec.W + '" height="' + spec.H + '" title="' + esc(r.seq + ' ' + r.file.replace(/\.html$/, '')) + '"></iframe>';
      return '  <figure>\n'
        + '    <figcaption><a href="' + esc(r.file) + '" target="_blank" rel="noopener">'
        + esc(r.seq + ' ' + r.file.replace(/\.html$/, '')) + '</a>'
        + '<span>' + esc(Math.round(r.bytes / 1024) + ' KB') + '</span></figcaption>\n'
        + '    <div class="vp" style="width:' + cellW + 'px;height:' + cellH + 'px">'
        + (SCALE === 1 ? inner : '<div class="sc" style="transform:scale(' + SCALE + ')">' + inner + '</div>')
        + '</div>\n'
        + '    <p class="chk">' + esc(r.check) + '</p>\n'
        + '  </figure>';
    }).join('\n');
    return '<h2>' + esc(fam) + '<span class="cnt">' + inFam.length + ' 格</span></h2>\n<div class="grid">\n' + figs + '\n</div>';
  }).join('\n');

  const page = '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>' + esc(spec.label) + ' · ' + rows.length + ' 格 × ' + spec.W + ' 宽</title>\n<style>\n'
    + '*{margin:0;padding:0;box-sizing:border-box}\n'
    + 'body{font:14px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;'
    + 'background:#eef0f3;color:#1d1d1f;padding:22px 18px 60px}\n'
    + 'h1{font-size:20px;margin-bottom:6px}\n'
    + '.lead{color:#5b6672;font-size:13px;margin-bottom:6px}\n'
    + 'h2{font-size:15px;margin:26px 0 10px;padding-left:9px;border-left:4px solid #0b6bcb}\n'
    + '.cnt{color:#86868b;font-weight:400;font-size:12px;margin-left:8px}\n'
    + '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(' + (cellW + 40) + 'px,max-content));gap:16px;justify-content:start}\n'
    + 'figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.06)}\n'
    + 'figcaption{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid #e8e8ed;font-size:12px}\n'
    + 'figcaption a{color:#0b6bcb;text-decoration:none;font-weight:600;word-break:break-all}\n'
    + 'figcaption span{color:#86868b;white-space:nowrap;font-family:Consolas,Menlo,monospace;font-size:11px}\n'
    + '.vp{overflow:hidden;background:#fff}\n'
    + '.sc{transform-origin:0 0}\n'
    + '.vp iframe{display:block;border:0;background:#fff}\n'
    + '.chk{margin:0;padding:7px 10px;border-top:1px solid #e8e8ed;background:#fafbfc;color:#5b6672;font-size:11.5px;line-height:1.5}\n'
    + '.foot{color:#5b6672;font-size:12px;margin-top:28px;border-top:1px solid #d2d2d7;padding-top:12px}\n'
    + '</style>\n</head>\n<body>\n'
    + '<h1>' + esc(spec.label) + ' · ' + rows.length + ' 格 × ' + spec.W + ' 宽</h1>\n'
    + '<p class="lead">每格是一份产物在 ' + spec.W + ' 宽下的<b>真实渲染</b>'
    + (SCALE === 1 ? '' : '（按 ' + SCALE.toFixed(3) + ' 整体缩小，视口仍是 ' + spec.W + '）')
    + '，可滚可交互：媒体查询按格子宽生效、复制按钮能点。点格子标题在新标签打开整页。'
    + '每格底下那句是<b>这一格该确认什么</b>。这一页给人看，不是交付产物。</p>\n'
    + cells + '\n'
    + '<p class="foot">产物目录 <code>' + esc(SRC.replace(/\\/g, '/')) + '</code>；清单 <code>t792-清单.json</code>（' + all.length
    + ' 行）；重出：<code>node docs/skills/skill-schedule/t792-清单.mjs &amp;&amp; node docs/skills/skill-schedule/t792-墙.mjs</code>。</p>\n'
    + '</body>\n</html>\n';

  const outPath = join(SRC, spec.name);
  writeFileSync(outPath, page, 'utf8');

  // 链接自检：页面引用（相对路径）逐条探盘（§6.2 的 refs/dead）。
  const refs = [...page.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1]);
  const dead = refs.filter((r) => !existsSync(join(SRC, decodeURIComponent(r))));
  const bad = [...dropped.map((r) => r.file), ...dead];
  const clean = bad.length === 0;
  console.log('墙 ' + spec.name + '：' + rows.length + ' 格；链接 ' + refs.length + ' 条；'
    + (clean ? '缺失 0 -> ' + spec.name + ' 可发' : '缺 ' + bad.length + ' 件 -> ' + bad.join('、')));
  made.push({ spec, outPath, refs: refs.length, clean });
  if (!clean) reds.push(spec.name + '：缺 ' + bad.join('、'));
}

if (made.length === 0) { console.log('RESULT: ABORT 没有匹配的输出名：' + OUT); process.exit(2); }
const total = made.reduce((a, m) => a + m.refs, 0);
console.log('RESULT: ' + (reds.length === 0 ? 'PASS' : 'FAIL')
  + ' walls=' + made.map((m) => m.spec.name).join('／') + ' cells=' + rows.length
  + ' links=' + total + ' dropped=' + dropped.length + ' red=' + reds.length);
for (const r of reds) console.log('RED  ' + r);
process.exit(reds.length === 0 ? 0 : 1);
