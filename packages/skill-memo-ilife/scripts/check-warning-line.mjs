#!/usr/bin/env node
/** #855 · **行数台账门**（照卡路里 `scripts/check-warning-line.mjs` 的形状，本票落本包这一份）。
 *
 * 守什么：本包 `src/**\/*.ts` 与包内 `scripts/*.mjs` 的 LF 口径读数与 `AGENTS.md` 的台账块逐件一致，
 * 且**超线件只许变短**（棘轮）：某件越线后，它的 LF 不许再超过首次挂号时的读数（挂号值）。
 * 告警线＝350（数字出处：包 `AGENTS.md`）；超线是**报警不是拦路**——台账照样在册，只是"结论"列写明。
 *
 * 两条口径（两条都机器守，别靠记）：
 *   · **挂号值永不回改**：`--sync` 只补新行、只刷新「当场实测」列，已存在行的挂号值原样留着；
 *     越线件回线内也只改结论列（写「已回线内（挂号值 N 留档）」），历史读数不抹。
 *   · **只许变短**：`--check` 里 `实测 > max(350, 挂号值)` 即红，点名该件与两个数。
 * 本门管不住的（如实记着）：hand-删掉台账里的一行再 `--sync`，那件会以当前读数重新挂号——
 * 那是一次**显式改台账**，看 diff 的人该拦；把件搬到别的路径同理（旧行留档，新路径重新挂号）。
 *
 * 扫描面与剔除：
 *   · 只扫源码与一次性脚本；`templates/*.html`（页面模板）、`SKILL.md`（说明面）、`test/*.mjs`（测试）、
 *     `dist/`、`.tsbuildinfo`（构建产物）**不算**（`docs/agents/structure.md` 的「管辖」一节）；
 *   · **生成物不算**，且剔除名单**从生成器自己的输出声明抽**（`scripts/gen-cli.mjs` 的
 *     `join(SRC_DIR, …)` 目标），不手写一份会过期的名单——抽不到一条即红（判据自证）。
 *
 * 用法：`node scripts/check-warning-line.mjs`（比对）／`--sync`（按实测重写台账，仍先自证判据）。
 * 退出码：0 绿；1 红（逐条点名）；2 用法/环境错。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const SRC = join(PKG, 'src');
const AGENTS = join(PKG, 'AGENTS.md');
const BEGIN = '<!-- warning-line-ledger:begin -->';
const END = '<!-- warning-line-ledger:end -->';
const LINE = 350;
const SYNC = process.argv.includes('--sync');

const rel = (p) => relative(PKG, p).replace(/\\/g, '/');
const lf = (text) => (text.match(/\n/g) || []).length;

/** 生成物名单：从生成器源码里的 `join(SRC_DIR, 'a', 'b')` 抽（本包生成器就这一处写法）。 */
function generatedSet() {
  const gen = join(HERE, 'gen-cli.mjs');
  if (!existsSync(gen)) throw new Error('判据自证失败：找不到生成器 scripts/gen-cli.mjs（生成物名单抽不出来）');
  const text = readFileSync(gen, 'utf8');
  const out = new Set();
  for (const m of text.matchAll(/join\(SRC_DIR,\s*'([^']+)',\s*'([^']+)'\)/g)) out.add('src/' + m[1] + '/' + m[2]);
  if (out.size === 0) throw new Error('判据自证失败：生成器的输出声明一条都抽不到（名单会过期，故判红）');
  return out;
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

function readings() {
  const gen = generatedSet();
  const files = walk(SRC).map(rel).filter((r) => !gen.has(r));
  for (const f of readdirSync(HERE)) if (f.endsWith('.mjs')) files.push('scripts/' + f);
  return { gen, rows: files.sort().map((f) => ({ file: f, lf: lf(readFileSync(join(PKG, f), 'utf8')) })) };
}

function parseLedger() {
  if (!existsSync(AGENTS)) throw new Error('缺 AGENTS.md（台账要住那儿）');
  const text = readFileSync(AGENTS, 'utf8');
  const si = text.indexOf(BEGIN), ei = text.indexOf(END);
  if (si < 0 || ei < si) return { text, rows: new Map(), block: null };
  const block = text.slice(si, ei + END.length);
  const rows = new Map();
  for (const line of block.split('\n')) {
    const m = /^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
    if (m) rows.set(m[1], { filed: Number(m[2]), now: Number(m[3]), verdict: m[4] });
  }
  return { text, rows, block };
}

function renderBlock(rows, filed = new Map()) {
  const L = [BEGIN,
    '| 件 | 挂号值（首次挂号时的 LF，永不回改） | 当场实测 | 结论 |',
    '|---|---|---|---|'];
  for (const r of rows) {
    // 挂号值：已挂过的原样留着（`--sync` 不许改写历史）；新件按当前读数挂。
    const f = filed.get(r.file) ?? r.lf;
    const verdict = r.lf > LINE
      ? '超线在册（拆法见 #855 证据件；只许变短）'
      : f > LINE ? '已回线内（挂号值 ' + f + ' 留档，只许变短）' : '未越线，在册备查';
    L.push('| `' + r.file + '` | ' + f + ' | ' + r.lf + ' | ' + verdict + ' |');
  }
  L.push(END);
  return L.join('\n');
}

const { gen, rows } = readings();
const over = rows.filter((r) => r.lf > LINE);
console.log('扫描面：src/**/*.ts ＋ scripts/*.mjs；剔除生成物 ' + gen.size + ' 件（' + [...gen].join('、') + '）');
console.log('读数：件 ' + rows.length + '／超线（>' + LINE + '）' + over.length +
  (over.length ? '：' + over.map((r) => r.file + '=' + r.lf).join('、') : ''));

if (SYNC) {
  const { text, block, rows: led } = parseLedger();
  const filed = new Map([...led].map(([k, v]) => [k, v.filed]));
  const next = text.includes(BEGIN) && block
    ? text.slice(0, text.indexOf(BEGIN)) + renderBlock(over.length ? over.concat(rows.filter((r) => r.lf <= LINE)) : rows, filed) + text.slice(text.indexOf(END) + END.length)
    : text + '\n\n## 行数台账（#855 · 350 ＋ LF 口径）\n\n' + renderBlock(rows, filed) + '\n';
  writeFileSync(AGENTS, next, 'utf8');
  console.log('已同步台账（' + rel(AGENTS) + '）：' + rows.length + ' 行在册（新挂 ' +
    rows.filter((r) => !filed.has(r.file)).length + ' 行，挂号值不动），超线 ' + over.length + ' 件');
  process.exit(0);
}

const { rows: led } = parseLedger();
let bad = 0;
const gone = [];
for (const r of rows) {
  const got = led.get(r.file);
  if (!got) { console.error('台账漏报：' + r.file + '（实测 ' + r.lf + ' LF）'); bad += 1; continue; }
  // 棘轮先判（只看挂号值与实测，不依赖「当场实测」列新不新）：越线件超过挂号值即红。
  const ceiling = Math.max(LINE, got.filed);
  if (r.lf > ceiling) {
    console.error('棘轮：' + r.file + ' 实测 ' + r.lf + ' LF > 挂号值 ' + got.filed + '（超线件只许变短；要加内容就加在它自己域的能力目录里）');
    bad += 1;
  }
  if (got.now !== r.lf) { console.error('台账陈化：' + r.file + ' 台账 ' + got.now + ' ≠ 实测 ' + r.lf + '（跑 --sync 刷新这一列）'); bad += 1; }
}
for (const [file] of led) if (!rows.some((r) => r.file === file)) gone.push(file);
if (bad) { console.error('RESULT: 0/1 FAIL（' + bad + ' 条）——跑 --sync 同步台账'); process.exit(1); }
for (const f of gone) console.log('留档：' + f + ' 已不在扫描面（搬走或删了，挂号值留档；新路径会另挂一行，本行别手删）');
console.log('RESULT: ' + rows.length + '/' + rows.length + ' PASS：行数台账齐全、与实况一致、越线件只许变短（超线 ' + over.length + ' 件在册）');
process.exit(0);
