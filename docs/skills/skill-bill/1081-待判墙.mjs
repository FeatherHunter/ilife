#!/usr/bin/env node
/** #1081 待判墙：从 canonical 验收墙里**只保留「还没满意」的格**，另出一份复判墙。
 *
 * 为什么要它：负责人复判时**不该再看已经打过 ok 的格**（重复劳动，也稀释注意力）。
 *  本器只做一件事——按 verdicts/<wall>.json 的判定列，把 verdict==='ok' 的格从墙上撤下，
 *  其余原样（同一份 CSS／同一段打勾 JS／同一批 iframe 相对路径），输出**写回同一个目录**
 *  （iframe 相对路径必须落得到）。
 *
 * 用法：
 *   node docs/skills/skill-bill/1081-待判墙.mjs --dir <墙目录> --src <源墙名> --out <输出名> --verdict <verdicts.json>
 *   node docs/skills/skill-bill/1081-待判墙.mjs --merge <墙导出的清单.json> <verdicts/目标.json>
 *
 * 自检（任一不过即 exit 1 并点名）：待判格 0 → 红；某待判格在源墙上找不到 → 红；
 *  撤下后**已满意的格一个都不许留在输出里** → 违则红；输出里每个 src 的件在盘上不存在 → 红。
 * 红线：只读源墙与 verdicts；只写输出墙（--merge 时只写目标 verdicts 件）；不改源墙、不改产物、不改原型。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const RED = [];
const red = (s) => RED.push(s);

function loadVerdict(p) {
  const j = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(j.items)) throw new Error('verdicts 形状不对（缺 items）：' + p);
  return j;
}

/* ── 模式二：把「复判墙」导出的清单并回 verdicts 件（已满意的格保持原判，不动） ── */
const mergeIdx = argv.indexOf('--merge');
if (mergeIdx >= 0) {
  const srcPath = resolve(argv[mergeIdx + 1]);
  const dstPath = resolve(argv[mergeIdx + 2]);
  const incoming = loadVerdict(srcPath);
  const target = loadVerdict(dstPath);
  const byProd = new Map(target.items.map((it) => [it.prod, it]));
  let replaced = 0; const unknown = [];
  for (const it of incoming.items) {
    const cur = byProd.get(it.prod);
    if (!cur) { unknown.push(String(it.prod)); continue; }
    if (it.verdict === 'ok' || it.verdict === 'no') { cur.verdict = it.verdict; cur.reason = it.reason ?? ''; replaced++; }
  }
  const ok = target.items.filter((x) => x.verdict === 'ok').length;
  const no = target.items.filter((x) => x.verdict === 'no').length;
  target.ok = ok; target.no = no; target.unjudged = target.items.length - ok - no;
  if (unknown.length) red('导出里有目标件里没有的格：' + unknown.join('、'));
  if (replaced === 0) red('没有任何一格被并进去（导出件与目标件的 prod 对不上）');
  if (RED.length === 0) {
    writeFileSync(dstPath, JSON.stringify(target, null, 2) + String.fromCharCode(10), 'utf8');
    console.log('MERGED ' + dstPath + '：并入 ' + replaced + ' 格 → ok ' + ok + '／不ok ' + no + '／未判 ' + target.unjudged + '（总数 ' + target.items.length + '）');
    process.exit(0);
  }
  console.log('RED ' + RED.join('；'));
  process.exit(1);
}

/* ── 模式一：出待判墙 ── */
const DIR = resolve(argOf('--dir') ?? '');
const SRC = argOf('--src');
const OUT = argOf('--out');
const VER = resolve(argOf('--verdict') ?? '');
for (const [k, v] of [['--dir', DIR], ['--src', SRC], ['--out', OUT], ['--verdict', VER]]) {
  if (!v) { console.log('用法：node docs/skills/skill-bill/1081-待判墙.mjs --dir <墙目录> --src <源墙名> --out <输出名> --verdict <verdicts.json>'); process.exit(1); }
}
const srcPath = join(DIR, SRC);
for (const p of [srcPath, VER]) if (!existsSync(p)) red('缺件：' + p);
if (RED.length) { console.log('RED ' + RED.join('；')); process.exit(1); }

const vj = loadVerdict(VER);
const pending = vj.items.filter((it) => it.verdict !== 'ok');
const done = vj.items.filter((it) => it.verdict === 'ok');
if (pending.length === 0) red('这一面没有待判格（全部已满意）——不必出复判墙');

const html = readFileSync(srcPath, 'utf8');
const lines = html.split(String.fromCharCode(10));
const isCellLine = (l) => /^\s*<(figure|section)\b[^>]*\bdata-seq="/.test(l);
const cellLines = lines.filter(isCellLine);
const kept = [];
const notFound = [];
for (const it of pending) {
  const hit = cellLines.filter((l) => l.includes(it.prod));
  if (hit.length === 0) { notFound.push(it.prod); continue; }
  kept.push(hit[0]);
}
if (notFound.length) red('待判格在源墙上找不到：' + notFound.join('、'));
if (kept.length !== pending.length) red('保留格数 ' + kept.length + ' != 待判格数 ' + pending.length);

/* 硬要求：已满意的格一个都不许留在输出里。 */
const leaked = done.filter((it) => kept.some((l) => l.includes(it.prod))).map((it) => it.prod);
if (leaked.length) red('已满意的格仍在输出里（不许出现）：' + leaked.join('、'));

/* 输出里每个 src 的件必须在盘上（否则格子空白）。 */
const dead = [];
for (const l of kept) for (const m of l.matchAll(/src="([^"]+)"/g)) {
  const f = decodeURIComponent(m[1]);
  if (!existsSync(join(DIR, f))) dead.push(f);
}
if (dead.length) red('输出引用的件不在盘上：' + [...new Set(dead)].join('、'));
if (RED.length) { console.log('RED ' + RED.join('；')); process.exit(1); }

const N = pending.length;
const note = '本墙只列<b>待判 ' + N + ' 格</b>——你已满意的 ' + done.length + ' 格已撤下（不再请你重看）。判据不变：左＝真跑产物，右＝冻结原型。';
const out = [];
let inserted = false;
for (const l of lines) {
  if (isCellLine(l)) { if (kept.includes(l)) out.push(l); continue; }
  if (/<h1>/.test(l)) {
    out.push(l.replace('</h1>', ' · 待判 ' + N + ' 格</h1>'));
    out.push('<div class="banner">' + note + '</div>');
    inserted = true;
    continue;
  }
  if (/<title>/.test(l)) { out.push(l.replace('</title>', ' · 待判 ' + N + ' 格</title>')); continue; }
  if (/满意 \d+ \/ 不满意 \d+ \/ 未判 \d+ \/ 总数 \d+/.test(l)) {
    out.push(l.replace(/满意 \d+ \/ 不满意 \d+ \/ 未判 \d+ \/ 总数 \d+/, '满意 0 / 不满意 0 / 未判 ' + N + ' / 总数 ' + N));
    continue;
  }
  out.push(l);
}
if (!inserted) red('源墙里找不到 <h1>，没能插待判说明');
if (RED.length) { console.log('RED ' + RED.join('；')); process.exit(1); }

const outPath = join(DIR, OUT);
writeFileSync(outPath, out.join(String.fromCharCode(10)), 'utf8');
const back = readFileSync(outPath, 'utf8');
const backCells = back.split(String.fromCharCode(10)).filter(isCellLine).length;
const leakedBack = done.filter((it) => back.includes(it.prod)).map((it) => it.prod);
const okAll = backCells === N && leakedBack.length === 0;
console.log('待判墙 ' + OUT + '：' + backCells + '/' + N + ' 格；撤下已满意 ' + done.length + ' 格；'
  + (okAll ? '已满意格 0 残留 -> 可发' : 'RED 回读不符（残留 ' + leakedBack.join('、') + '）'));
process.exit(okAll ? 0 : 1);
