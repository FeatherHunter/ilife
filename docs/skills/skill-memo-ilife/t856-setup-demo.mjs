#!/usr/bin/env node
/** #856 · 演示批搭建（一次性，不入仓）：按清单造 34 件合成占位产物。
 *
 * 本票冻的是形状不是内容（Out of Scope：第 1 条）；34 格真产物归 8 张域票，
 * 全量重跑归收口 #834。本件只为证明生成器正反两面可重跑：
 * 34 件合成产物（结构完整、无惰性加载、无分隔符懒政、无横向溢出），
 * 收口时替换为真产物重跑即可，预演读数不代收口读数。
 *
 * 用法：node docs/skills/skill-memo-ilife/t856-setup-demo.mjs <源目录>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MF = join(HERE, 't856-manifest.json');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const dir = resolve(process.argv[2] || '');
if (!dir) { console.error('用法：node t856-setup-demo.mjs <源目录>'); process.exit(2); }
const mf = JSON.parse(readFileSync(MF, 'utf8'));
mkdirSync(dir, { recursive: true });
for (const r of mf.rows) {
  // 分隔符门要求可见文本零命中：正文只用空格断句，不用间隔号与分号；
  // kind 原字样（含间隔号）只活在清单与墙索引里，不进产物正文。
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>备忘录${esc(r.title)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#fff;color:#1d1d1f;padding:24px;max-width:100%}h1{font-size:20px;margin-bottom:8px}.card{border:1px solid #d2d2d7;border-radius:12px;padding:16px;max-width:100%}p{font-size:14px;line-height:1.8;min-height:44px}</style>
</head><body><div class="card">
<h1>${esc(r.title)}</h1>
<p>第 ${r.seq} 格 念的是${esc(r.wake)}</p>
<p>合成占位产物 形制演示用 非域真产物 收口时替换为真产物重跑</p>
</div></body></html>
`;
  writeFileSync(join(dir, r.file), html, 'utf8');
}
console.log(`演示源已铺：${mf.rows.length} 件 -> ${dir}`);
