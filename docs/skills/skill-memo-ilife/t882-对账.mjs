#!/usr/bin/env node
/** #882 · 两批墙的对账件（受版本控制，随证据一起入仓 —— 协议 §2.3 第 4 条／§5.1）。
 *
 *  两种读法：
 *    - 默认：比**「对象」行**（每页取 `receipt.rows` 里那一行，逐字）—— 锁「本票只动了哪几格」；
 *    - `--payload`：比**整份载荷**（抹掉时间戳后逐字）—— 用来证「改造是行为等价的」。
 *
 *  用法（工作目录＝仓根）：
 *    node docs/skills/skill-memo-ilife/t882-对账.mjs <基线墙目录> <候选墙目录>
 *    node docs/skills/skill-memo-ilife/t882-对账.mjs <基线> <候选> --payload
 *  退出码：0＝差异数不超过 `--max-object-changes`（默认 0）／`--max-payload-changes`（默认 0）；1＝超了或缺目录。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TS = /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/g;
const numOf = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : dflt;
};
// 位置参数＝前两个不以 `--` 开头、且不是某个开关的取值的串
const positional = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !(i > 0 && all[i - 1].startsWith('--')));
const [baseline, candidate] = positional;
if (baseline === undefined || candidate === undefined) {
  console.error('用法：node docs/skills/skill-memo-ilife/t882-对账.mjs <基线墙目录> <候选墙目录> [--payload] [--max-object-changes N] [--max-payload-changes N]');
  process.exit(2);
}
const wantPayload = process.argv.includes('--payload');
const maxObject = numOf('--max-object-changes', 0);
const maxPayload = numOf('--max-payload-changes', 0);

const readPages = (dir) => {
  const out = new Map();
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.html')).sort()) {
    const m = /<script id="payload" type="application\/json">([\s\S]*?)<\/script>/.exec(readFileSync(join(dir, f), 'utf8'));
    out.set(f, m === null ? null : JSON.parse(m[1]));
  }
  return out;
};
const objectRowOf = (p) => (p === null ? null : (p.data?.receipt?.rows ?? []).find((r) => String(r).startsWith('对象：')) ?? null);

const A = readPages(baseline);
const B = readPages(candidate);
const files = [...new Set([...A.keys(), ...B.keys()])].sort();

let objSame = 0;
const objChanged = [];
const payChanged = [];
for (const f of files) {
  const a = objectRowOf(A.get(f));
  const b = objectRowOf(B.get(f));
  if (a === b) objSame += 1; else objChanged.push([f, a, b]);
  const ta = JSON.stringify(A.get(f)).replace(TS, '<时>');
  const tb = JSON.stringify(B.get(f)).replace(TS, '<时>');
  if (ta !== tb) payChanged.push(f);
}

console.log('基线：' + baseline + '（' + A.size + ' 件）');
console.log('候选：' + candidate + '（' + B.size + ' 件）');
console.log('—— 「对象」行 ——');
for (const [f, a, b] of objChanged) console.log('  ★ ' + f + '：' + (a ?? '（无此行）') + '  →  ' + (b ?? '（无此行）'));
if (wantPayload) {
  console.log('—— 整份载荷（抹掉时间戳）——');
  for (const f of payChanged) console.log('  ★ ' + f);
}
console.log('RESULT: 对象行 不变=' + objSame + ' 改=' + objChanged.length
  + (wantPayload ? ' ／ 载荷 不变=' + (files.length - payChanged.length) + ' 页有差异=' + payChanged.length : ''));
const bad = objChanged.length > maxObject || (wantPayload && payChanged.length > maxPayload);
process.exit(bad ? 1 : 0);
