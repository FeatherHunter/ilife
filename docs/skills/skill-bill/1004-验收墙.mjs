#!/usr/bin/env node
/* 1004 手机验收墙生成器（无依赖）：产物目录 + 清单 -> 390宽3列手机墙，格高820一致，无 loading="lazy"。
 * 清单：<产物目录>/manifest.json，形状 { rows: [{seq,type,title,file,wake,check}] }。
 * 自检双判据（§6.2/§7）：dropped（清单点名、盘上没有）+ dead（墙页引用、盘上没有），任一非空即 exit 1 并点名。
 * 用法：node docs/skills/skill-bill/1004-验收墙.mjs <产物目录> [输出名]
 * 正例：node docs/skills/skill-bill/1004-验收墙.mjs .scratch/1004-baseline 1004-手机墙.html  # exit 0
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2] ?? '.scratch/1004-baseline';
const OUT = process.argv[3] ?? '1004-手机墙.html';
const W = 390, H = 820, COLS = 3;

const raw = JSON.parse(readFileSync(join(SRC, 'manifest.json'), 'utf8'));
const all = raw.rows ?? raw;
const rows = all.filter((r) => r.file && existsSync(join(SRC, r.file)));
const dropped = all.filter((r) => !rows.includes(r));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cells = rows.map((r) => `  <figure>
    <figcaption><a href="${esc(r.file)}" target="_blank" rel="noopener">${esc(String(r.seq).padStart(2, '0') + ' ' + (r.title || r.wake))}</a>
      <span>${esc(r.type || r.kind || '')}</span></figcaption>
    <div class="what">${esc(r.wake ? '唤醒词「' + r.wake + '」· ' : '')}${esc(r.check || '')}</div>
    <iframe src="${esc(r.file)}" width="${W}" height="${H}" title="${esc(r.wake || r.title || r.file)}"></iframe>
  </figure>`).join('\n');

const page = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(OUT)}（${rows.length} 格 × ${W} 宽）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:24px 20px 60px}
h1{font-size:22px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;margin-bottom:20px;line-height:1.7}
.grid{display:grid;grid-template-columns:repeat(${COLS},${W}px);gap:18px;align-items:start;justify-content:start}
figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}
figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}
figcaption a{color:#007aff;text-decoration:none}
figcaption span{color:#86868b;font-weight:400;font-size:11.5px}
.what{padding:6px 10px;font-size:11.5px;color:#515154;border-bottom:1px solid #e8e8ed;line-height:1.6}
iframe{display:block;border:0;background:#fff}
</style></head><body><div class="wrap">
<h1>手机墙 · ${rows.length} 格 × ${W} 宽</h1>
<div class="sub">每格是一份产物在 ${W} 宽下的<b>真实渲染</b>（可交互）。点标题在新标签打开整页。这一页给人看，不是交付产物。</div>
<div class="grid">
${cells}
</div></div></body></html>
`;
writeFileSync(join(SRC, OUT), page, 'utf8');

/* 生成完自己就查一遍：正例 exit 0；反例（清单点名却没有文件）必须 exit 1。 */
const refs = [...page.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1]);
const dead = refs.filter((r) => !existsSync(join(SRC, decodeURIComponent(r))));
const clean = dropped.length === 0 && dead.length === 0;
const bad = [...dropped.map((r) => r.file), ...dead];
console.log('墙 ' + OUT + '：' + rows.length + ' 格；链接 ' + refs.length + ' 条；'
  + (clean ? '缺失 0 -> ' + OUT + ' 可发'
    : '缺 ' + bad.length + ' 件 -> ' + bad.join('、')));
process.exit(clean ? 0 : 1);
