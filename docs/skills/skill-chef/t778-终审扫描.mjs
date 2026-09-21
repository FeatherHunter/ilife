#!/usr/bin/env node
/** #778 终审扫描：产物上的**工单黑话／实现语／数据标注**（vision 终审提出、回产物 grep 核实的那一类）。
 *
 * 为什么另出一件：`t768-质量门.mjs` 的六列只判**版式位**与**结构**（分隔符／英文裸词／重复句在
 * 版式位与可见文本上判），判不到「把工单黑话写给用户看」这类**内容措辞**缺陷；`<title>` 里的字样
 * 更是六列都不扫。本件把这类字样钉成可跑可红的判据。
 *
 * 判什么（三类字样，逐条点名到「文件 + 位置 + 原文片段」）：
 *   ① 工单黑话：`本票`／`另立票`／`立票`／`本期的`…（把 issue 黑话写在用户看得见的页上）
 *   ② 实现语：`本地菜谱库`／`副本库`／`真库`（把存储实现讲给用户听）
 *   ③ 数据标注：`AI 补`／`(AI:`（数据源里的机器标注原样上屏）
 * 位置分两档：`可见`＝正文里；`标题`＝`<title>` 里（印在浏览器页签上，六列都不扫）。
 *
 * 用法：node docs/skills/skill-chef/t778-终审扫描.mjs <批目录> [--json <路径>]
 * 退出码：0 三类字样命中 0 处；1 有命中（逐条点名）；2 用法错或目录里没有产物。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const PATTERNS = [
  { kind: '工单黑话', re: /本票|另立票|立票|域 票|票 \d+|本期(?=[不先只另暂])/g },
  { kind: '实现语', re: /本地菜谱库|副本库|真库/g },
  { kind: '数据标注', re: /AI 补|\(AI[:：]/g },
];

const argv = process.argv.slice(2);
const dir = resolve(argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--json') ?? '.scratch/t778');
const jsonAt = argv.indexOf('--json') >= 0 ? argv[argv.indexOf('--json') + 1] : '';
if (!existsSync(dir)) { console.error(`没有这个目录：${dir}`); process.exit(2); }

const files = [];
for (const d of readdirSync(dir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  for (const f of readdirSync(join(dir, d.name)).filter((x) => x.toLowerCase().endsWith('.html')).sort()) {
    files.push({ rel: `${d.name}/${f}`, path: join(dir, d.name, f) });
  }
}
if (files.length === 0) { console.error(`目录里没有产物（子目录下 .html 0 件）：${dir}`); process.exit(2); }

/** 可见文本＝去掉 head（`<title>` 单列一档）、脚本段与样式段。 */
const visible = (html) => html
  .replace(/<head[\s\S]*?<\/head>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ');
const hits = [];
for (const f of files) {
  const html = readFileSync(f.path, 'utf8');
  const title = (html.match(/<title>([^<]*)<\/title>/) ?? [, ''])[1];
  for (const p of PATTERNS) {
    for (const m of title.matchAll(p.re)) hits.push({ file: f.rel, where: '标题', kind: p.kind, text: m[0], ctx: title });
    for (const m of visible(html).matchAll(p.re)) {
      const i = Math.max(0, m.index - 40);
      const ctx = visible(html).slice(i, m.index + m[0].length + 40).replace(/\s+/g, ' ');
      hits.push({ file: f.rel, where: '可见', kind: p.kind, text: m[0], ctx });
    }
  }
}

console.log(`# t778 终审扫描 · ${dir}`);
console.log(`扫 ${files.length} 件产物；三类字样命中 ${hits.length} 处`);
const byKind = new Map();
for (const h of hits) byKind.set(h.kind, [...(byKind.get(h.kind) ?? []), h]);
for (const [kind, list] of byKind) {
  console.log(`\n${kind}：${list.length} 处／${new Set(list.map((x) => x.file)).size} 件`);
  for (const h of list) console.log(`  ✗ ${h.file}［${h.where}］「${h.text}」 ← …${h.ctx}…`);
}
if (jsonAt !== '') {
  mkdirSync(dirname(resolve(jsonAt)), { recursive: true });
  writeFileSync(resolve(jsonAt), JSON.stringify({ at: new Date().toISOString(), dir, scanned: files.length, hits }, null, 2) + '\n', 'utf8');
  console.log(`\nJSON-WROTE ${jsonAt}`);
}
const clean = hits.length === 0;
console.log(`\n共 ${files.length} 件；命中 ${hits.length} -> ${clean ? '干净' : '不可发（逐条点名见上）'}`);
process.exit(clean ? 0 : 1);
