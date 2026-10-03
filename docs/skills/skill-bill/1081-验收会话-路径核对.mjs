#!/usr/bin/env node
/** #1081 验收会话说明书 · 路径逐条在盘核对器。
 *
 * 用法：node docs/skills/skill-bill/1081-验收会话-路径核对.mjs [说明书.md]
 *   （缺省＝同目录的 1081-验收会话.md；仓根＝本件所在目录往上三级）
 *
 * 做什么：把说明书里**每一处** docs/… 与 .scratch/… 路径抽出来（含反引号里的、带 :行号 后缀的），
 *   逐条 existsSync；全在盘 → exit 0 并打 `PATHS: n/n 在盘`；任一缺 → exit 1 并逐条打 MISS。
 * 为什么：说明书是负责人按着点的一条路，路径一旦写错他点到空白——这一行机器读数就是这条路的自检。
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const guide = resolve(process.argv[2] ?? join(HERE, '1081-验收会话.md'));
const text = readFileSync(guide, 'utf8');
const BT = String.fromCharCode(96);
const spans = [...text.matchAll(new RegExp(BT + '([^' + BT + '\\n]+)' + BT, 'g'))].map((m) => m[1]);
const raw = [...text.matchAll(/((?:docs|\.scratch)\/[^\s`"']+)/g)].map((m) => m[1]);
const cand = [...spans, ...raw];
const toks = new Set();
for (const s of cand) {
  for (const m of s.matchAll(/((?:docs|\.scratch)\/[^\s`"']+)/g)) {
    let t = m[1];
    t = t.replace(/[\u3002\uff0c\uff1b\u3001\uff09\uff08\uff1a\uff5c]+$/u, '');
    t = t.replace(/[:\uff1a]\d+$/u, '');

    if (t.length > 4) toks.add(t);
  }
}
const lineOf = (t) => text.split('\n').findIndex((l) => l.includes(t)) + 1;
const list = [...toks].sort();
const miss = list.filter((t) => !existsSync(join(ROOT, t)));
console.log('GUIDE: ' + guide);
console.log('ROOT : ' + ROOT);
for (const t of list) console.log((miss.includes(t) ? 'MISS ' : 'OK   ') + t + (miss.includes(t) ? '   ← 说明书第 ' + String(lineOf(t)) + ' 行' : ''));
console.log('PATHS: ' + String(list.length - miss.length) + '/' + String(list.length) + ' 在盘');
if (miss.length) { console.log('RESULT: 缺 ' + String(miss.length) + ' 条 → 说明书路径与实况不符'); process.exit(1); }
console.log('RESULT: 说明书里 ' + String(list.length) + ' 条路径逐条在盘 → 可照它点');
process.exit(0);
