/**
 * #714 搬迁执行器（第三批：计划复盘簇两件 `src/render/` → `src/workout/`）。
 *
 * 做法照 `docs/skills/skill-calorie/t704-move.mjs`：**锚点命中数断言 ＋ 搬完全 `src` 相对引用自检**。
 * 协议 §2.5 第 1 条（失败即不落盘）：先在内存里算出全部新内容 → 跑完全部断言 → 全过才落盘。
 * 协议 §2.5 第 2 条（按当刻内容变更，不按预备记录变更）：每处改动都靠**逐字锚点**定位，命中数不符即停。
 *
 * 两件的相对引用里**有一部分天然不用改**——`src/render/` 与 `src/workout/` 同为 `src/` 下第一层，
 * 故 `../analysis/utils.js`／`../shared/*.js` 这两个 specifier 从新家发出去逐字相同。逐条列在下面
 * `KEEP` 里，搬迁后由第 4 步自检再证一遍它们真的解析得到。
 *
 * 用法：node .scratch/714/move.mjs [--dry]
 */
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, statSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
/** 仓库根：往上找到 `pnpm-workspace.yaml` 为止 —— 本件与当窗副本住不同层级（当窗住 `.scratch/714/`，
 *  入仓副本住 `docs/skills/skill-calorie/`），写死层数就有一边跑不起来。#714 归档时补的。 */
function repoRoot(start) {
  let d = start;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(d, 'pnpm-workspace.yaml'))) return d;
    d = dirname(d);
  }
  throw new Error('找不到仓库根（往上没有 pnpm-workspace.yaml）：' + start);
}
const ROOT = repoRoot(HERE);
const SRC = join(ROOT, 'packages/skill-calorie/src');
const DRY = process.argv.includes('--dry');
const P = (p) => join(SRC, p);

/** ① 两处「搬到新家后相对写法不变」的出向引用（新家与老家同为一层，故逐字保留）。 */
const KEEP = [
  ['render/reviewDocs.ts', 'import { shiftISODate } from \'../analysis/utils.js\';'],
  ['render/reviewDocs.ts', 'import { copyLog } from \'../shared/copyArea.js\';'],
  ['render/reviewDocs.ts', 'import { assembleDocPage, metricsOf } from \'../shared/docPage.js\';'],
  ['render/reviewDocs.ts', 'import { sceneEnvelope } from \'../shared/sceneEnvelope.js\';'],
];

/** ② 要改的锚点：`[文件, 原串, 新串, 期望命中数]`。 */
const EDITS = [
  // 搬走件自身：出向引用改指向 `render/` 的新相对写法
  ['render/reviewDocs.ts', "import type { PlannedSession, ReviewView } from './exercisePort.js';", "import type { PlannedSession, ReviewView } from '../render/exercisePort.js';", 1],
  ['render/reviewDocs.ts', "import { nowStamp } from './receipt.js';", "import { nowStamp } from '../render/receipt.js';", 1],
  // 搬走件自身的件头注释：出处路径跟着挪（`./reviewDocsCss.ts` 那几处是同族同行，不动）
  ['render/reviewDocs.ts', '取数仍住 `./exercisePort.ts` 的 `buildReviewView`', '取数仍住 `../render/exercisePort.ts` 的 `buildReviewView`', 1],
  ['render/reviewDocsCss.ts', "import { pageChromeCss } from './pageChromeCss.js';", "import { pageChromeCss } from '../render/pageChromeCss.js';", 1],
  // ⚠️ 这里**故意不动** `reviewDocsCss.ts` 的 `STATIC_CSS` 里那一句
  //   `'   页壳内距与指标卡那两条页面级规则住共用件 `./pageChromeCss.ts`，本段不再重述 ── */',`
  //   理由（本窗实测踩过一次，记在这里免得下一批再踩）：它**看着像注释，其实是 CSS 文本**——
  //   `STATIC_CSS` 是一串片段，`reviewViewCss()` 把它们拼进页面 `<style>` 里发出去。
  //   改它 = 改**页面字节**（每个分支恰 +8 B），直接撞上票面主判据「搬迁前后逐页逐字节相同」。
  //   故按仓规「就地摆正不顺手扩大范围」的反面同理处置：**留原文、记进未做项**，交给不做逐字节冻结的窗口。
  // 生产调用面一处（票面「调用面」第 1 条：生产 1 行）
  ['workout/review.ts', "import { buildReviewDoc } from '../render/reviewDocs.js';", "import { buildReviewDoc } from './reviewDocs.js';", 1],
  // 同一件的件头注释里点名的旧地址，一并跟着改（该件本就在写集内；这是 TS 文档注释，不进产物）
  ['workout/review.ts', '整页住 `render/reviewDocs.ts`', '整页住同目录 `reviewDocs.ts`', 1],
];

/** ③ 搬运两件：`[老家, 新家]`。 */
const MOVES = [
  ['render/reviewDocs.ts', 'workout/reviewDocs.ts'],
  ['render/reviewDocsCss.ts', 'workout/reviewDocsCss.ts'],
];

/* ── 第 1 步：前置断言（老家在、新家不在） ─────────────────────────────── */
const problems = [];
for (const [from, to] of MOVES) {
  if (!existsSync(P(from))) problems.push(`老家不在：${from}`);
  if (existsSync(P(to))) problems.push(`新家已被占：${to}`);
}
if (problems.length) { console.log('FAIL 前置断言：\n  ' + problems.join('\n  ')); process.exit(1); }

/* ── 第 2 步：在内存里算出全部新内容（先算完，一处都不落盘） ───────────────── */
const staged = new Map(); // 绝对路径 → 新内容
const bump = (abs, text) => staged.set(abs, text);

for (const [file, oldStr, newStr, expect] of EDITS) {
  const abs = P(file);
  const text = staged.get(abs) ?? readFileSync(abs, 'utf8');
  const hits = text.split(oldStr).length - 1;
  if (hits !== expect) { console.log(`FAIL 锚点命中数不符：${file} 期望 ${expect} 实为 ${hits} ← ${JSON.stringify(oldStr.slice(0, 60))}`); process.exit(1); }
  bump(abs, text.split(oldStr).join(newStr));
}
for (const [file, needle] of KEEP) {
  const text = staged.get(P(file)) ?? readFileSync(P(file), 'utf8');
  if (!text.includes(needle)) { console.log(`FAIL 「应原样保留」的出向引用找不到了：${file} ← ${JSON.stringify(needle)}`); process.exit(1); }
}
for (const [from, to] of MOVES) bump(P(to), staged.get(P(from)) ?? readFileSync(P(from), 'utf8'));

/* ── 第 3 步：落盘（断言全过才走这里） ─────────────────────────────────── */
if (DRY) {
  console.log(`DRY 拟改 ${EDITS.length} 处锚点、搬 ${MOVES.length} 件（未落盘）`);
} else {
  for (const [from, to] of MOVES) {
    if (to !== from) rmSync(P(to), { force: true });
  }
  for (const [abs, text] of staged) writeFileSync(abs, text, 'utf8');
  for (const [from, to] of MOVES) if (from !== to) rmSync(P(from), { force: true });
  console.log(`MOVE 改了 ${EDITS.length} 处锚点、搬了 ${MOVES.length} 件（老家已删）`);
}

/* ── 第 4 步：自检 —— 遍历 `src/**\/*.ts`，每条相对 specifier 都要解析到盘上真件 ─────── */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith('.ts')) acc.push(p);
  }
  return acc;
}
const broken = [];
let checked = 0;
for (const f of walk(SRC)) {
  const text = readFileSync(f, 'utf8');
  const re = /(?:from|import)\s+['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    checked += 1;
    const target = resolve(dirname(f), m[1]);
    if (!existsSync(target)) broken.push(`${relative(SRC, f).split(sep).join('/')} → ${m[1]}`);
  }
}
console.log(`SELF-CHECK 相对 specifier ${checked} 条，解析不到真件 ${broken.length} 条`);
if (broken.length) { console.log('FAIL 自检：\n  ' + broken.join('\n  ')); process.exit(1); }
console.log('RESULT: 搬迁完成，自检绿');
