#!/usr/bin/env node
/**
 * t769-schema-audit.mjs —— #769 写侧字段对账表的校验脚本（无依赖，ESM）。
 *
 * 读的是**报告本身**，不硬编码第二份数据：
 *   报告 = `docs/skills/skill-chef/t769-写侧字段对账.md`（与本脚本同目录）。
 *   卡清单 = `packages/skill-chef/src/help/sceneData.ts`（机器生成、禁手改的 48 卡事实源）。
 *
 * 表头解析来自报告真实结构：本脚本先在报告里找**表头那一行**——把该行按 `|` 拆成单元格后，
 * 必须同时含下面 10 个表头标签（顺序不限），且单元格数正好 10；找到后用标签文本去定位列，
 * 不按固定下标取列。表体＝表头之后连续以 `|` 开头的行（遇分隔行跳过），到首个非表格行为止。
 * 报告里另有 §0.3 与 §3.1 两张编号表，它们的表头不含这 10 个标签，不会被当成本表。
 *
 * 校验三条：
 *   1. 卡 —— 本表按「卡 id」去重后恰好 48 个，且与 sceneData.ts 的 48 个 id 集合逐一对应
 *      （缺哪个、多哪个都点名）。
 *   2. 行齐 —— 每一行的「读侧/写侧」「要读或写的表与字段」「结论」三列都填齐（非空）。
 *   3. 未知 —— 「结论」列的取值不在三值集合 `可落／需降级／必须立票` 里的行数；另有行号重复、
 *      「读侧/写侧」取值不在 `读侧／写侧／读侧＋写侧` 里，一并计进未知。
 *
 * 用法：
 *   node docs/skills/skill-chef/t769-schema-audit.mjs --check   # 只校验，不落盘
 *   node docs/skills/skill-chef/t769-schema-audit.mjs           # 校验通过后落一份机器可读结果
 *                                                              # 到 <脚本同目录>/t769-schema-audit.out.json
 * 退出码：三条全过 → 0；任一条不满足 → 1（并把不满足的项逐条点名打到 stdout）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPORT = path.join(HERE, 't769-写侧字段对账.md');
const SCENE_DATA = path.resolve(HERE, '..', '..', '..', 'packages', 'skill-chef', 'src', 'help', 'sceneData.ts');
const OUT_JSON = path.join(HERE, 't769-schema-audit.out.json');

/** 本表的 10 个表头标签（报告 §1 那张表的表头，逐字取自报告）。 */
const HEADER_LABELS = [
  '序号', '域', '卡 id', '卡标题', '唤醒词',
  '读侧/写侧', '要读或写的表与字段', '老库现状', '结论', '证据',
];

/** 结论三值。 */
const VERDICTS = new Set(['可落', '需降级', '必须立票']);
/** 「读侧/写侧」的合法取值。 */
const SIDES = new Set(['读侧', '写侧', '读侧＋写侧']);
/** 必须填齐的三列（表头标签）。 */
const REQUIRED_LABELS = ['读侧/写侧', '要读或写的表与字段', '结论'];

const EXPECTED_CARDS = 48;

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

/** 把一行 markdown 表格行拆成单元格。 */
function cellsOf(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
}

/** 是不是 markdown 表格的分隔行（`|---|---|`）。 */
function isSeparator(line) {
  return /^\|[\s:|-]+\|$/.test(line.trim());
}

/** 在报告里找本表的表头行：按 `|` 拆开后必须同时含 10 个表头标签，且单元格数正好 10。 */
function findHeader(lines) {
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw.startsWith('|')) continue;
    const cells = cellsOf(raw);
    if (cells.length !== HEADER_LABELS.length) continue;
    if (!HEADER_LABELS.every((h) => cells.includes(h))) continue;
    return i;
  }
  return -1;
}

/** 从 sceneData.ts 里抽 48 个卡 id（`{ id: 'xxx', title: '...', wake_word: '...'`）。 */
function cardIdsFromSceneData() {
  const src = readText(SCENE_DATA);
  const re = /\{ id: '([^']+)', title: '/g;
  const ids = [];
  let m;
  while ((m = re.exec(src)) !== null) ids.push(m[1]);
  return ids;
}

/** 卡 id 列里带反引号：`cooking_start_fresh`。取反引号里的内容；没有反引号就整格原样。 */
function bareCardId(cell) {
  const m = cell.match(/`([^`]+)`/);
  return m ? m[1].trim() : cell.trim();
}

function main() {
  const checkOnly = process.argv.slice(2).includes('--check');
  const problems = [];
  const fail = (msg) => problems.push(msg);

  if (!fs.existsSync(REPORT)) {
    console.log(`找不到报告：${REPORT}`);
    process.exit(1);
  }

  const lines = readText(REPORT).split('\n');
  const headerIdx = findHeader(lines);
  if (headerIdx < 0) {
    console.log('报告里找不到本表的表头（需一行含这 10 个标签：' + HEADER_LABELS.join('、') + '）');
    process.exit(1);
  }

  // 列定位：按表头标签文本取下标，不写死列号。
  const headerCells = cellsOf(lines[headerIdx]);
  const col = {};
  for (const label of HEADER_LABELS) col[label] = headerCells.indexOf(label);

  // 表体：表头下一行起，跳过分隔行，收连续以 `|` 开头的行。
  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw.startsWith('|')) break;
    if (isSeparator(raw)) continue;
    rows.push({ line: i + 1, cells: cellsOf(raw) });
  }

  // ── 校验 1：卡 ─────────────────────────────────────────────
  const seen = new Map();
  const dupLine = [];
  for (const r of rows) {
    const id = bareCardId(r.cells[col['卡 id']] ?? '');
    if (!id) continue;
    if (seen.has(id)) dupLine.push(`${id}（第 ${seen.get(id)} 行与第 ${r.line} 行同 id「卡 id」列取值` + '）');
    else seen.set(id, r.line);
  }
  const reportIds = new Set(seen.keys());
  const sceneIds = cardIdsFromSceneData();
  const sceneSet = new Set(sceneIds);

  if (sceneIds.length !== EXPECTED_CARDS || sceneSet.size !== EXPECTED_CARDS) {
    fail(`sceneData.ts 的卡 id 集合不是 ${EXPECTED_CARDS} 个（逐字读出 ${sceneIds.length} 个、去重后 ${sceneSet.size} 个）：${SCENE_DATA}`);
  }
  if (reportIds.size !== EXPECTED_CARDS) {
    const missing = [...sceneSet].filter((id) => !reportIds.has(id));
    const extra = [...reportIds].filter((id) => !sceneSet.has(id));
    fail(`报告卡数不是 ${EXPECTED_CARDS}：去重后 ${reportIds.size} 个`);
    if (missing.length) fail(`  报告里缺这些卡 id（sceneData.ts 有、报告没有）：${missing.join('、')}`);
    if (extra.length) fail(`  报告里多这些卡 id（报告有、sceneData.ts 没有）：${extra.join('、')}`);
  } else {
    const missing = [...sceneSet].filter((id) => !reportIds.has(id));
    const extra = [...reportIds].filter((id) => !sceneSet.has(id));
    if (missing.length) fail(`  报告里缺这些卡 id：${missing.join('、')}`);
    if (extra.length) fail(`  报告里多这些卡 id：${extra.join('、')}`);
  }

  // ── 校验 2：行齐（三列都填齐）──────────────────────────────
  const incomplete = [];
  const unknownSide = [];
  const unknownVerdict = [];
  let filledRows = 0;
  for (const r of rows) {
    if (r.cells.length !== HEADER_LABELS.length) {
      incomplete.push(`第 ${r.line} 行单元格数 ${r.cells.length}（应为 ${HEADER_LABELS.length}）`);
      continue;
    }
    const id = bareCardId(r.cells[col['卡 id']]) || `(第 ${r.line} 行无卡 id)`;
    const empty = REQUIRED_LABELS.filter((label) => (r.cells[col[label]] ?? '').trim() === '');
    if (empty.length) {
      incomplete.push(`${id}（第 ${r.line} 行）空着这些列：${empty.join('、')}`);
      continue;
    }
    filledRows += 1;
    const side = r.cells[col['读侧/写侧']].trim();
    if (!SIDES.has(side)) unknownSide.push(`${id}（第 ${r.line} 行）：${side}`);
    const verdict = r.cells[col['结论']].trim();
    if (!VERDICTS.has(verdict)) unknownVerdict.push(`${id}（第 ${r.line} 行）：${verdict}`);
  }

  if (incomplete.length) {
    fail(`行齐不足 ${EXPECTED_CARDS}：填齐的行 ${filledRows} 行，未填齐点名如下`);
    for (const s of incomplete) fail(`  ${s}`);
  }
  if (dupLine.length) {
    fail('卡 id 有重复');
    for (const s of dupLine) fail(`  ${s}`);
  }

  // ── 校验 3：未知（结论越界 + 读侧/写侧越界）─────────────────
  const unknown = unknownVerdict.length + unknownSide.length;
  if (unknownVerdict.length) {
    fail(`结论列越界的行（三值应为 ${[...VERDICTS].join('／')}）：`);
    for (const s of unknownVerdict) fail(`  ${s}`);
  }
  if (unknownSide.length) {
    fail(`读侧/写侧列越界的行（应取 ${[...SIDES].join('／')}）：`);
    for (const s of unknownSide) fail(`  ${s}`);
  }

  // ── 读数行 + 结论 ─────────────────────────────────────────
  const cards = reportIds.size;
  const ok = problems.length === 0;
  console.log(`卡 ${cards}／行齐 ${filledRows}／未知 ${unknown}`);
  if (!ok) {
    console.log(`报告：${REPORT}`);
    for (const s of problems) console.log(s.startsWith('  ') ? s : `FAIL ${s}`);
    process.exit(1);
  }

  if (checkOnly) {
    console.log('--check：只校验，未落盘');
    process.exit(0);
  }

  const artifact = {
    ticket: 769,
    report: path.relative(process.cwd(), REPORT).replace(/\\/g, '/'),
    sceneData: path.relative(process.cwd(), SCENE_DATA).replace(/\\/g, '/'),
    headerLine: headerIdx + 1,
    headerLabels: headerCells,
    counts: { 卡: cards, 行齐: filledRows, 未知: unknown },
    verdicts: {
      可落: rows.filter((r) => r.cells[col['结论']] === '可落').length,
      需降级: rows.filter((r) => r.cells[col['结论']] === '需降级').length,
      必须立票: rows.filter((r) => r.cells[col['结论']] === '必须立票').length,
    },
    cardIds: [...reportIds],
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(artifact, null, 2), 'utf8');
  console.log(`落盘：${OUT_JSON}`);
  process.exit(0);
}

main();
