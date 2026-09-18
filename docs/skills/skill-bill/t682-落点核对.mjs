#!/usr/bin/env node
// t682 台账落点核对（判据机器化）
//
// 台账 `t682-已否决与已延后的结构决定台账.md` 里每一条的「出处」列都写着锚点：
//   - 票号：`#469`（含 `#681`、`#403` 这类形态）
//   - 文件行号：`docs/skills/skill-bill/t469-护栏补齐-证据.md:66`
//   - 区间：`blocks.ts:1909-1919`
// 本脚本把这些锚点抽出来，逐条核**盘上真的存在**：
//   1. 文件锚点 → 文件在盘上、行数 ≥ 写的行号（行号写超了就是陈化锚点）、区间合法。
//      路径解析：台账里的路径有时省了 `packages/skill-bill/`／`packages/`／`docs/skills/skill-bill/` 前缀，
//      按「原样 → 依次套这四种前缀」的次序找第一个存在的文件，并在报数里标出用的是哪个前缀。
//   2. 票号锚点 → `gh issue view <n>` 读得到（是 issue，不是 PR），并报它的 state。
//
// 用法：
//   node docs/skills/skill-bill/t682-落点核对.mjs                 # 核对默认台账
//   node docs/skills/skill-bill/t682-落点核对.mjs --ledger <路径>
//   node docs/skills/skill-bill/t682-落点核对.mjs --no-gh         # 只核文件锚点（离线）
//
// 退出码：0 ＝ 全部锚点对得上（RESULT: PASS）；1 ＝ 有对不上的（逐条列出）。
// 口径：只读盘上与 GitHub，不改任何文件。行数口径＝LF（只数 `\n`），与包内 AGENTS.md 同。

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const DEFAULT_LEDGER = resolve(HERE, 't682-已否决与已延后的结构决定台账.md');

const argv = process.argv.slice(2);
const li = argv.indexOf('--ledger');
const LEDGER = li === -1 ? DEFAULT_LEDGER : resolve(argv[li + 1]);
const SKIP_GH = argv.includes('--no-gh');

if (!existsSync(LEDGER)) {
  console.error(`[FAIL] 台账不存在：${LEDGER}`);
  process.exit(1);
}
const text = readFileSync(LEDGER, 'utf8');

// ── 锚点抽取 ────────────────────────────────────────────────────────────────
const FILE_ANCHOR =
  /((?:docs|packages|test|tooling|scripts|src)[A-Za-z0-9_./\u4e00-\u9fa5-]*\.(?:md|ts|mjs|json|html|sh|yaml|yml|txt)):(\d+)(?:\s*[-–~]\s*(\d+))?/g;

const fileHits = new Map();
for (const m of text.matchAll(FILE_ANCHOR)) {
  const key = `${m[1]}:${m[2]}${m[3] ? '-' + m[3] : ''}`;
  if (!fileHits.has(key)) {
    fileHits.set(key, { path: m[1], from: Number(m[2]), to: m[3] ? Number(m[3]) : null });
  }
}

// 票号：只在表格行里取（表格列＝ | # | 结论 | 出处 | 为什么 | 下一手 |），出处列索引 3
const issueHits = new Map();
for (const line of text.split('\n')) {
  if (!line.trim().startsWith('|')) continue;
  const cells = line.split('|');
  if (cells.length < 6) continue;
  if (!/^\s*[A-Za-z0-9-]+\s*$/.test(cells[1])) continue; // 第一列是条目号
  const cited = cells[3] ?? '';
  for (const m of cited.matchAll(/#(\d{1,4})\b/g)) {
    const n = Number(m[1]);
    if (!issueHits.has(n)) issueHits.set(n, cells[1].trim());
  }
}
// 头部与正文里的图号也认（Part of / 母图）
for (const m of text.matchAll(/Part of #(\d{1,4})/g)) {
  const n = Number(m[1]);
  if (!issueHits.has(n)) issueHits.set(n, '（正文）');
}

// ── 路径解析：依次套前缀 ───────────────────────────────────────────────────
const PREFIXES = ['', 'packages/skill-bill/', 'packages/base-render/', 'packages/', 'docs/skills/skill-bill/', 'docs/'];
function locate(p) {
  for (const pre of PREFIXES) {
    const abs = resolve(REPO, pre + p);
    if (existsSync(abs) && statSync(abs).isFile()) return { abs, via: pre };
  }
  return null;
}

// ── 核文件锚点 ─────────────────────────────────────────────────────────────
const badFiles = [];
const okFiles = [];
for (const [key, a] of [...fileHits].sort()) {
  const found = locate(a.path);
  if (!found) {
    badFiles.push({ key, why: '文件不存在（原样与前缀四种写法都试过）' });
    continue;
  }
  const lf = readFileSync(found.abs, 'utf8').split('\n').length - 1; // 只数 \n
  if (a.from > lf) {
    badFiles.push({ key, why: `行号超界（${relative(REPO, found.abs)} 盘上 ${lf} 行）` });
    continue;
  }
  if (a.to !== null && (a.to < a.from || a.to > lf)) {
    badFiles.push({ key, why: `区间不合法（盘上 ${lf} 行）` });
    continue;
  }
  okFiles.push({ key, via: found.via, lf });
}

// ── 核票号 ─────────────────────────────────────────────────────────────────
const badIssues = [];
const okIssues = [];
if (!SKIP_GH) {
  for (const [n, where] of [...issueHits].sort((x, y) => x[0] - y[0])) {
    try {
      const raw = execFileSync(
        'gh',
        ['issue', 'view', String(n), '--repo', 'FeatherHunter/ilife', '--json', 'number,state,title'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      const o = JSON.parse(raw);
      okIssues.push({ n, state: o.state, title: o.title, where });
    } catch (e) {
      badIssues.push({ n, where, why: (e.stderr || String(e)).toString().trim().split('\n')[0] });
    }
  }
}

// ── 报数 ───────────────────────────────────────────────────────────────────
console.log(`台账：${relative(REPO, LEDGER)}（${text.split('\n').length - 1} 行 LF）`);
const viaCount = {};
for (const f of okFiles) viaCount[f.via || '(原样)'] = (viaCount[f.via || '(原样)'] ?? 0) + 1;
console.log(
  `文件锚点 ${fileHits.size} 条：对得上 ${okFiles.length}，对不上 ${badFiles.length}` +
    `（路径前缀分布：${Object.entries(viaCount).map(([k, v]) => `${k}${v}`).join('、')}）`,
);
if (!SKIP_GH) {
  const closed = okIssues.filter((i) => i.state === 'CLOSED').length;
  console.log(`票号锚点 ${issueHits.size} 个：读得到 ${okIssues.length}（已关 ${closed}／未关 ${okIssues.length - closed}），读不到 ${badIssues.length}`);
  const openOnes = okIssues.filter((i) => i.state !== 'CLOSED').map((i) => `#${i.n}`);
  if (openOnes.length) console.log(`  未关的：${openOnes.join(' ')}（章条若引它为「已生效裁定」需自带出处说明）`);
} else {
  console.log(`票号锚点 ${issueHits.size} 个：--no-gh，跳过`);
}

if (badFiles.length) {
  console.log('\n对不上的文件锚点：');
  for (const b of badFiles) console.log(`  - ${b.key} —— ${b.why}`);
}
if (badIssues.length) {
  console.log('\n读不到的票号：');
  for (const b of badIssues) console.log(`  - #${b.n}（${b.where}）—— ${b.why}`);
}

const total = fileHits.size + (SKIP_GH ? 0 : issueHits.size);
const good = okFiles.length + (SKIP_GH ? 0 : okIssues.length);
const verdict = badFiles.length === 0 && badIssues.length === 0 ? 'RESULT: PASS' : 'RESULT: FAIL';
console.log(`\n${verdict}（锚点 ${good}/${total}）`);
process.exit(verdict === 'RESULT: PASS' ? 0 : 1);
