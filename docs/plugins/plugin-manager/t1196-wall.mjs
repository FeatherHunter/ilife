#!/usr/bin/env node
/**
 * 票 #1196 · 双端视觉墙自检（**只读**：不写任何文件）。
 *
 * 规格：docs/agents/视觉验收墙.md（§4 完成判据／§6.2 自检双判据／§7 坑）
 * 用法：node docs/plugins/plugin-manager/t1196-wall.mjs [--root <仓库或工作树根>] [--wall <墙页路径>] [--base <相对路径基准目录>] [--json]
 *
 * 断言（逐条一条机器读数行，末行给结论）：
 *   A1 墙页在场
 *   A2 墙页不带 UTF-8 签名（BOM），内嵌清单可解析
 *   A3 内嵌清单的真值原型在场，且 SHA256 与 #1241 冻结身份一致
 *   A4 段数 = 2，且段 id／标题与本文口径一致
 *   A5 每段格数与格号 = 独立预期（desktop 3 格 D1/D2/D3；mobile 1 格 M1）—— 「格数齐全」
 *   A6 清单条数 = 4，与 A5 的格号集合逐格对得上
 *   A7 墙页 <h2> 段头数 = 2
 *   A8 墙页无 loading="lazy"（§7 坑：后半墙空白）
 *   B* 每格两图（成品／原型）都在场且非空
 *   C* 每格在墙页里恰一个 figure，且两张图的 src 都写进正文，判定与清单同值，有「该确认」句与判读结论文本
 *   D1 墙页引用的全部本地路径（src/href）都在场且非空 —— 「被引用路径全部在场」
 *
 * 反例（§4 必跑）：把墙页复制一份、在清单里点一个不存在的文件名，再跑一次；须 FAIL 且点名那份。
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const WALL_REL = 'docs/plugins/plugin-manager/t1196-双端视觉墙.html';
/** 冻结身份（#1241）：真值原型逐字节哈希。 */
const FROZEN_SHA256 = '2f297c2356a3b3b4c39d22051f30f20a4e9cd4d6aed010aac3fcf31805f34280';
/** 独立预期：段／格号不读墙页，写死在这里，墙页缺格才判得出来。 */
const EXPECT_SEGMENTS = [
  { id: 'desktop', title: '桌面段（1280 主档 ＋ 741 中宽补档）', cells: ['D1', 'D2', 'D3'] },
  { id: 'mobile', title: '手机段（390）', cells: ['M1'] },
];
const EXPECT_CELLS = EXPECT_SEGMENTS.flatMap((s) => s.cells);
const EXPECT_SEGMENT_COUNT = EXPECT_SEGMENTS.length;

const argv = process.argv.slice(2);
const at = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const root = resolve(at('--root') ?? process.cwd());
const wallPath = resolve(root, at('--wall') ?? WALL_REL);
const base = resolve(root, at('--base') ?? dirname(wallPath));
const asJson = argv.includes('--json');

const lines = [];
const fails = [];
const check = (id, ok, readout) => {
  if (!ok) fails.push(id + ' ' + readout);
  lines.push((ok ? 'OK   ' : 'FAIL ') + id + ' ' + readout);
  return ok;
};
const note = (text) => lines.push('     ' + text);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const rel = (p) => p.slice(root.length + 1).split('\\').join('/');

/* ---- A1 墙页在场 ---- */
let html = null;
if (!existsSync(wallPath)) {
  check('A1', false, '墙页不在场：' + rel(wallPath));
} else {
  html = readFileSync(wallPath, 'utf8');
  check('A1', statSync(wallPath).size > 0, '墙页在场 ' + rel(wallPath) + '（' + statSync(wallPath).size + ' 字节）');
}

/* ---- A2 无签名 + 清单可解析 ---- */
let man = null;
if (html !== null) {
  const noBom = html.charCodeAt(0) !== 0xfeff;
  const m = html.match(/<script type="application\/json" id="t1196-manifest">([\s\S]*?)<\/script>/);
  let parsed = null;
  let why = '';
  if (m === null) why = '墙页里找不到 <script type="application/json" id="t1196-manifest">';
  else {
    try { parsed = JSON.parse(m[1]); } catch (e) { why = '清单 JSON 解析失败：' + e.message; }
  }
  man = parsed;
  check('A2', noBom && parsed !== null,
    parsed === null ? why : '无 BOM，内嵌清单可解析（' + m[1].length + ' 字节，' + parsed.rows.length + ' 条）');
}

/* ---- A3 真值原型冻结身份 ---- */
if (man !== null) {
  const protoPath = join(base, man.proto.file);
  if (!existsSync(protoPath)) check('A3', false, '真值原型不在场：' + man.proto.file);
  else {
    const got = sha(readFileSync(protoPath));
    check('A3', got === FROZEN_SHA256,
      '真值原型 sha256=' + got.slice(0, 16) + '…（冻结 ' + FROZEN_SHA256.slice(0, 16) + '…）' + (got === FROZEN_SHA256 ? ' 相符' : ' 不符'));
  }
} else {
  check('A3', false, '清单不可用，无法判真值原型');
}

/* ---- A4/A5/A6 段与格数 ---- */
if (man !== null) {
  const segs = Array.isArray(man.segments) ? man.segments : [];
  const shapeOk = segs.length === EXPECT_SEGMENT_COUNT
    && EXPECT_SEGMENTS.every((e, i) => segs[i] && segs[i].id === e.id && segs[i].title === e.title);
  check('A4', shapeOk, '段 ' + segs.map((s) => s.id + '（' + (s.cells || []).length + ' 格）').join('、')
    + '（预期 ' + EXPECT_SEGMENTS.map((e) => e.id + '（' + e.cells.length + ' 格）').join('、') + '）');

  const missing = [];
  const extra = [];
  const rowsAll = Array.isArray(man.rows) ? man.rows : [];
  for (const e of EXPECT_SEGMENTS) {
    const got = (segs.find((s) => s.id === e.id) || {}).cells || [];
    // 段里声明的格号，与「真落在这一段里的清单条目」两处都要对得上，缺一处就判红。
    const fromRows = rowsAll.filter((r) => r.seg === e.id).map((r) => r.cell);
    for (const c of e.cells) if (!got.includes(c) || !fromRows.includes(c)) missing.push(c);
    for (const c of got) if (!e.cells.includes(c)) extra.push(c);
    for (const c of fromRows) if (!e.cells.includes(c)) extra.push(c);
  }
  check('A5', missing.length === 0 && extra.length === 0,
    '格数齐全 ' + EXPECT_CELLS.length + '/' + EXPECT_CELLS.length + '（' + EXPECT_CELLS.join('、') + '）'
    + (missing.length ? '；缺 ' + missing.join('、') : '') + (extra.length ? '；多出 ' + extra.join('、') : ''));

  const rows = Array.isArray(man.rows) ? man.rows : [];
  const rowCells = rows.map((r) => r.cell);
  const sameSet = rows.length === EXPECT_CELLS.length
    && EXPECT_CELLS.every((c) => rowCells.includes(c))
    && rowCells.every((c) => EXPECT_CELLS.includes(c));
  check('A6', sameSet, '清单 ' + rows.length + ' 条 vs 预期 ' + EXPECT_CELLS.length + ' 格'
    + (sameSet ? '，逐格对得上' : '，对不上：清单=' + rowCells.join('、')));
} else {
  check('A4', false, '清单不可用，无法判段');
  check('A5', false, '清单不可用，无法判格数');
  check('A6', false, '清单不可用，无法判条数');
}

/* ---- A7/A8 墙页形制 ---- */
if (html !== null) {
  const h2 = (html.match(/<h2>/g) || []).length;
  check('A7', h2 === EXPECT_SEGMENT_COUNT, '墙页段头 <h2> ' + h2 + ' 个（预期 ' + EXPECT_SEGMENT_COUNT + '）');
  const lazy = /loading\s*=\s*["']lazy["']/i.test(html);
  check('A8', !lazy, lazy ? '墙页出现 loading="lazy"（§7 坑：靠后的格子会空白）' : '墙页无 loading="lazy"');
} else {
  check('A7', false, '墙页缺席，无法判段头');
  check('A8', false, '墙页缺席，无法判 lazy');
}

/* ---- B/C 逐格 ---- */
const figures = new Map();
if (html !== null) {
  for (const m of html.matchAll(/<figure\b[^>]*data-cell="([^"]+)"[^>]*>([\s\S]*?)<\/figure>/g)) figures.set(m[1], m[2]);
}
const readout = [];
if (man !== null && Array.isArray(man.rows)) {
  for (const r of man.rows) {
    const isExpected = EXPECT_CELLS.includes(r.cell);
    for (const [side, file] of [['成品', r.made], ['原型', r.proto]]) {
      const p = join(base, file);
      if (!existsSync(p)) { check('B-' + r.cell + '-' + side, false, r.cell + ' ' + side + '图不在场：' + file); continue; }
      const size = statSync(p).size;
      check('B-' + r.cell + '-' + side, size > 0 && isExpected,
        r.cell + ' ' + side + '图在场且非空 ' + file + '（' + size + ' 字节）'
        + (isExpected ? '' : '；但该格号不在独立预期里'));
      if (size > 0) readout.push(rel(p) + ' ' + size + ' B sha256=' + sha(readFileSync(p)).slice(0, 16) + '…');
    }
    const block = figures.get(r.cell);
    if (block === undefined) { check('C-' + r.cell, false, r.cell + ' 在墙页里找不到 figure'); continue; }
    const both = block.includes('src="' + r.made + '"') && block.includes('src="' + r.proto + '"');
    const verdict = block.includes('class="verdict ' + (r.verdict === '一致' ? 'same' : 'diff') + '"');
    const ask = block.includes('class="ask"');
    const conclusion = block.includes('class="verdict ') && block.replace(/[\s\S]*?<div class="verdict[^"]*">/, '').length > 60;
    check('C-' + r.cell, both && verdict && ask && conclusion,
      r.cell + ' figure 恰一个；两图 src 都在正文=' + both + '；判定与清单同值（' + r.verdict + '）=' + verdict
      + '；有「该确认」句=' + ask + '；有判读结论=' + conclusion);
  }
  if (figures.size !== man.rows.length) {
    note('墙页 figure 数 ' + figures.size + ' vs 清单条数 ' + man.rows.length + '（多出的 figure 无清单条目）');
  }
} else {
  check('B-清单', false, '清单不可用，无法逐格判图');
}

/* ---- D1 被引用路径全部在场 ---- */
if (html !== null) {
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])
    .filter((u) => !/^(#|https?:|data:|mailto:)/i.test(u));
  const dead = [];
  const empty = [];
  for (const u of refs) {
    const p = join(base, decodeURIComponent(u));
    if (!existsSync(p)) dead.push(u);
    else if (statSync(p).size === 0) empty.push(u);
  }
  check('D1', dead.length === 0 && empty.length === 0,
    '引用 ' + refs.length + ' 条；缺失 ' + dead.length + '；空文件 ' + empty.length
    + (dead.length || empty.length ? ' -> ' + [...dead, ...empty].join('、') : ' -> 全部在场且非空'));
} else {
  check('D1', false, '墙页缺席，无法判引用');
}

/* ---- A9 证据页点名的交付件都在场 ---- */
const EVIDENCE_MD = 't1196-证据.md';
/** 本票交付件（独立预期）：证据页必须逐件点名，且逐件在场非空。 */
const EXPECT_FILES = [
  't1196-双端视觉墙.html', 't1196-wall.mjs', 't1196-缺陷清单.md', 't1196-证据.md',
  't1196-proto-1280-跨页2.png', 't1196-墙-1280-桌面段.png', 't1196-墙-1280-段界与手机段.png',
  't1196-墙-390-顶部.png', 't1196-墙-390-手机段.png',
];
const evPath = join(base, EVIDENCE_MD);
if (!existsSync(evPath)) {
  check('A9', false, '证据页不在场：' + EVIDENCE_MD);
} else {
  const md = readFileSync(evPath, 'utf8');
  const named = [...new Set([...md.matchAll(/t1196-[^\s`）)、，,|"'\]]+\.(?:png|html|mjs|md)/g)].map((m) => m[0]))];
  const gone = named.filter((f) => !existsSync(join(base, f)) || statSync(join(base, f)).size === 0);
  const notListed = EXPECT_FILES.filter((f) => !named.includes(f));
  check('A9', gone.length === 0 && notListed.length === 0,
    '证据页点名 ' + named.length + ' 件；不在场或空 ' + gone.length + '；应点名而未点名 ' + notListed.length
    + (gone.length ? ' -> ' + gone.join('、') : '')
    + (notListed.length ? ' -> ' + notListed.join('、') : ''));
}

/* ---- 结论 ---- */
const total = lines.filter((l) => /^(OK|FAIL) /.test(l)).length;
const pass = total - fails.length;
if (readout.length) { note('图件读数（' + readout.length + ' 张）：'); for (const r of readout) note('  ' + r); }
lines.push('T1196-WALL-RESULT=' + (fails.length === 0 ? 'PASS' : 'FAIL') + ' ' + pass + '/' + total
  + ' root=' + root + ' wall=' + rel(wallPath));
if (asJson) console.log(JSON.stringify({ root, wall: rel(wallPath), pass, total, ok: fails.length === 0, fails, lines }, null, 2));
else for (const line of lines) console.log(line);
process.exit(fails.length === 0 ? 0 : 1);
