#!/usr/bin/env node
/** #868 · 判分引擎（五维尺的唯一一处算式，住公共层）。
 *
 *  来历：卡路里域那份 `docs/skills/skill-calorie/t524-判分.mjs` 是本仓唯一可复算的一套；
 *  本件把它提取到公共层，口径逐条固化在 `docs/skills/skill-memo-ilife/t849-视觉基准.md` §1。
 *
 *  只留一处算式：权重、每维下限、七条硬扣分、触摸档、两组折算系数全部冻结在本文件里；
 *  按域配置**只许给路径与名单**（包路径／读数目录／实例名单）—— 数字进配置即报错，
 *  因为数字进配置就是第二处定义（两域分差 0 靠结构保证，不靠人盯）。
 *
 *  判据阈值与公共层数值同住：可点控件命中下限（44px）、正文类字号下限（12px）、仓内断点集合
 *  取自 `../dist/pageUi.js` 的 `PAGE_LIMITS`（`src/pageUi.ts` 是定义地），本引擎不另写一份字面量。
 *
 *  输入（四件机器读数；缺件一律点名，不静默取 0）：
 *   · <读数目录>/sep.json    节点级命中 `rows[].node.hits[].tags`（R1–R7）→ H1／H2／H4／D3
 *   · <读数目录>/resp.json   三档溢价格 `rows[].widths[w].ok｜why` → H5／D4
 *   · <读数目录>/fmt.json    三档触摸处数与最小字号 `rows[].widths[w]` → H6／D5
 *   · <读数目录>/facts.json  逐页事实列 `pages[key]`（tables／imgTags／tdDataLabel／tocEl／
 *     aspectRatio／scrollMargin／dupFacts／english／d1／d2，人核可选 d4cut）
 *
 *  用法：
 *    node packages/base-render/scripts/判分.mjs --dir <读数目录> [--config <按域配置.json>] [--json <落点>]
 *    node packages/base-render/scripts/判分.mjs --compare <甲落点.json> <乙落点.json>
 *
 *  退出码：0 ＝ 读数齐 ＋ 一致性自证差 0；1 ＝ 缺件／配置违规／自证不一致；2 ＝ 用法错。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { PAGE_LIMITS } from '../dist/pageUi.js';

// ── 冻结值（唯一口径；改这里就是改全部分账）────────────────────────────────────
/** 逐维权重（合计 100）。出处 `t849-视觉基准.md` §1。 */
export const WEIGHTS = Object.freeze({ d1: 15, d2: 20, d3: 25, d4: 15, d5: 25 });
/** 每维下限＝满权 80%。 */
export const FLOOR = Object.freeze(
  Object.fromEntries(Object.entries(WEIGHTS).map(([k, v]) => [k, v * 0.8])),
);
/** 七条硬扣分条款（H6 只在触摸档问，见 `TOUCH_WIDTHS`）。 */
export const HARD = Object.freeze({ H1: 2, H2: 3, H3: 2, H4: 1, H5: 5, H6: 1, H7: 1 });
/** 触摸档：44px 是触屏要求，只在这两档问（显式打开粗指针时也进这一档）。 */
export const TOUCH_WIDTHS = Object.freeze([390, 768]);
/** 判据档位数（三档；读数器按这三档量）。 */
export const CRITERION_WIDTHS = Object.freeze([390, 768, 1440]);
/** 过线线：逐页 ≥90 且每维 ≥ 满权 80%。 */
export const PASS_SCORE = 90;
/** D3 折算系数（分隔符节点／标识符节点／真冗余处／符号顶替处）。 */
const D3W = Object.freeze({ sep: 1.2, ident: 1.5, dup: 2.0, symbol: 1.0 });
/** D5 折算（字号档／表格横滚或卡片化／页内定位／图片容器）。 */
const D5W = Object.freeze({ font: 5, table: 6, toc: 4, image: 3 });

/** 按域配置允许出现的字段：包路径／读数目录／实例名单。多一个字段即报错。 */
const CONFIG_KEYS = Object.freeze(['packagePath', 'readingsDir', 'instances']);
const CONFIG_RULE = '配置只许路径与名单';
/** 名单条目的字段（对象形态；字符串形态＝文件名本身）。 */
const INSTANCE_KEYS = Object.freeze(['file', 'key']);

const USAGE = [
  '用法：',
  '  node packages/base-render/scripts/判分.mjs --dir <读数目录> [--config <按域配置.json>] [--json <落点>]',
  '  node packages/base-render/scripts/判分.mjs --compare <甲落点.json> <乙落点.json>',
  '退出码：0 读数齐＋自证差 0；1 缺件／配置违规／自证不一致；2 用法错。',
].join(String.fromCharCode(10));

/** 判分件自己的错（`code` 2 ＝ 用法错，1 ＝ 判分中止）。顶层捕获后只打印消息，不吐栈。 */
class JudgeError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.name = 'JudgeError';
    this.code = code;
  }
}

const need = (cond, message) => { if (!cond) throw new JudgeError(message); };
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

// ── 按域配置（只许路径与名单）──────────────────────────────────────────────────
/** 递归查数字：任何一处数字都是第二处定义，报错并点名位置。 */
function assertNoNumbers(value, where) {
  if (typeof value === 'number') {
    throw new JudgeError(`${CONFIG_RULE}：${where} 给了数字 ${value} —— 数字进配置就是第二处定义`);
  }
  if (typeof value === 'boolean') {
    throw new JudgeError(`${CONFIG_RULE}：${where} 给了布尔值 —— 只许路径与名单`);
  }
  if (Array.isArray(value)) value.forEach((v, i) => assertNoNumbers(v, `${where}[${i}]`));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) assertNoNumbers(v, `${where}.${k}`);
  }
}

/** 名单条目 → `{ seq, file, key, given }`：字符串形态＝文件名（`key` 取它自己），对象形态可另给 `key`。
 *  `given` 为真＝名单**显式给了** `key`，此时 facts 只按它逐字配对（写错就报缺件，不再兜底）。 */
function instancesOf(cfg, label) {
  const list = cfg.instances;
  need(Array.isArray(list) && list.length > 0, `${CONFIG_RULE}：${label} 的 instances 必须是非空数组`);
  return list.map((it, i) => {
    const where = `${label}.instances[${i}]`;
    if (typeof it === 'string') {
      need(it !== '', `${CONFIG_RULE}：${where} 是空字符串`);
      return { seq: i + 1, file: it, key: it, given: false };
    }
    need(it !== null && typeof it === 'object' && !Array.isArray(it), `${CONFIG_RULE}：${where} 只许字符串或 { file, key } 对象`);
    for (const k of Object.keys(it)) {
      need(INSTANCE_KEYS.includes(k), `${CONFIG_RULE}：${where} 出现多给的字段 ${k}（只许 file／key）`);
    }
    need(typeof it.file === 'string' && it.file !== '', `${CONFIG_RULE}：${where} 缺 file`);
    need(it.key === undefined || (typeof it.key === 'string' && it.key !== ''), `${CONFIG_RULE}：${where} 的 key 必须是非空字符串`);
    return { seq: i + 1, file: it.file, key: it.key ?? it.file, given: it.key !== undefined };
  });
}

function loadConfig(path) {
  const p = resolve(path);
  need(existsSync(p), `缺件：按域配置读不到 ${p}`);
  let cfg;
  try {
    cfg = readJson(p);
  } catch (e) {
    throw new JudgeError(`形状不符：按域配置 ${p} 不是合法 JSON：${e.message}`);
  }
  need(cfg !== null && typeof cfg === 'object' && !Array.isArray(cfg), `${CONFIG_RULE}：${p} 必须是一个对象`);
  for (const k of Object.keys(cfg)) {
    need(CONFIG_KEYS.includes(k), `${CONFIG_RULE}：${p} 出现多给的字段 ${k}（只许 ${CONFIG_KEYS.join('／')}）`);
  }
  assertNoNumbers(cfg, basename(p));
  for (const k of ['packagePath', 'readingsDir']) {
    need(cfg[k] === undefined || (typeof cfg[k] === 'string' && cfg[k] !== ''), `${CONFIG_RULE}：${p} 的 ${k} 必须是非空字符串`);
  }
  const instances = cfg.instances === undefined ? null : instancesOf(cfg, basename(p));
  return { path: p, value: cfg, instances };
}

/** 读数目录：命令行 `--dir` 优先；没有就用配置里的「相对包路径」解析。没有配置也没有 `--dir` ＝ 用法错。 */
function readingsDirOf(dirArg, config) {
  if (dirArg) return resolve(dirArg);
  if (config && typeof config.value.readingsDir === 'string') {
    const pkg = typeof config.value.packagePath === 'string' ? resolve(config.value.packagePath) : process.cwd();
    const rd = config.value.readingsDir;
    return isAbsolute(rd) ? rd : resolve(pkg, rd);
  }
  throw new JudgeError('缺读数目录：给 --dir <读数目录>，或在按域配置里写 readingsDir', 2);
}

// ── 读数（四件；缺件点名）──────────────────────────────────────────────────────
const READING_FILES = Object.freeze([
  ['sep.json', '分隔符读数'], ['resp.json', '跨宽读数'], ['fmt.json', '版式读数'], ['facts.json', '事实列读数'],
]);

function loadReadings(dir) {
  need(existsSync(dir), `缺件：读数目录读不到 ${dir}`);
  const out = {};
  for (const [file, what] of READING_FILES) {
    const p = join(dir, file);
    need(existsSync(p), `缺件：${what}（${file}）读不到 ${p}`);
    try {
      out[file.slice(0, -5)] = readJson(p);
    } catch (e) {
      throw new JudgeError(`形状不符：${what} ${p} 不是合法 JSON：${e.message}`);
    }
  }
  need(Array.isArray(out.sep.rows) && out.sep.rows.length > 0, '形状不符：sep.json 缺 rows 数组');
  need(Array.isArray(out.resp.rows) && out.resp.rows.length > 0, '形状不符：resp.json 缺 rows 数组');
  need(Array.isArray(out.fmt.rows) && out.fmt.rows.length > 0, '形状不符：fmt.json 缺 rows 数组');
  need(out.facts.pages !== null && typeof out.facts.pages === 'object', '形状不符：facts.json 缺 pages 对象');
  return out;
}

const rowName = (r) => String(r?.name ?? basename(String(r?.file ?? r?.path ?? '')));
const rowPath = (r) => String(r?.file ?? r?.path ?? r?.name ?? '');
const matchRow = (r, file) => rowName(r) === file || basename(rowPath(r)) === file;

/** 判据档位与仓内断点集合对齐：读数最窄一档要落在最窄断点内，最宽一档要越过最宽断点。 */
function assertCriterionWidths(readings) {
  const declared = Array.isArray(readings.resp.widths) ? readings.resp.widths.map(Number).filter(Number.isFinite) : [];
  const fromRows = Array.from(new Set(readings.resp.rows.flatMap((r) => Object.keys(r.widths ?? {}).map(Number))));
  const widths = declared.length > 0 ? declared : fromRows;
  need(widths.length > 0, '形状不符：resp.json 里没有档位（widths 或 rows[].widths）');
  const bp = PAGE_LIMITS.breakpointsPx;
  const narrowest = Math.min(...widths);
  const widest = Math.max(...widths);
  need(narrowest <= bp[0], `判据档位不够窄：读数最窄 ${narrowest}px 没有落在仓内断点集合最窄一档 ${bp[0]}px 及以下`);
  need(widest >= bp[bp.length - 1], `判据档位不够宽：读数最宽 ${widest}px 没到仓内断点集合最宽一档 ${bp[bp.length - 1]}px`);
  return { widths, narrowest, widest };
}

/** facts 键的配对规则（两腿共用一处）：名单显式给了 `key` ⇒ 只按它（含去 `.html` 一次）逐字配对；
 *  没给 ⇒ 按文件名（含与不含 `.html` 两种写法各试一次）。全试完还找不到 ⇒ 缺件点名。 */
function factKeyOf(pages, inst) {
  const strip = (s) => String(s).replace(/\.html$/, '');
  const cands = inst.given ? [inst.key, strip(inst.key)] : [inst.file, strip(inst.file)];
  return Array.from(new Set(cands)).find((c) => c && Object.prototype.hasOwnProperty.call(pages, c));
}

/** 一页的读数行（sep／resp／fmt）＋ facts 行；任一配对不上都点名缺件。 */
function readPage(readings, inst) {
  const pick = (what) => {
    const hit = readings[what].rows.find((r) => matchRow(r, inst.file));
    need(hit !== undefined, `缺件：${what}.json 里没有点名到的产物 ${inst.file}`);
    return hit;
  };
  const pages = readings.facts.pages;
  const factKey = factKeyOf(pages, inst);
  need(factKey !== undefined,
    `缺件：facts.json 的 pages 里没有 ${inst.file}（按 ${inst.given ? '名单给的键 ' + inst.key : '文件名 ' + inst.file} 配对）—— 缺件报警，不静默取 0 分`);
  const factRow = pages[factKey];
  need(factRow !== null && typeof factRow === 'object', `形状不符：facts.json 的 pages.${factKey} 不是对象`);
  return { key: factKey, file: inst.file, sep: pick('sep'), resp: pick('resp'), fmt: pick('fmt'), fact: factRow };
}

/** 名单：配置给就用配置（并核对读数里不缺、不多），没给就用 sep 的读数行（全部参与，不漏页）。 */
function instancesFor(readings, config) {
  const fromReadings = readings.sep.rows.map((r, i) => {
    const file = rowName(r);
    return { seq: i + 1, file, key: file, given: false };
  });
  if (config === null || config.instances === null) return fromReadings;
  const instances = config.instances;
  for (const what of ['sep', 'resp', 'fmt']) {
    const rows = readings[what].rows;
    const matched = new Set();
    for (const inst of instances) {
      const hit = rows.find((r) => matchRow(r, inst.file));
      need(hit !== undefined, `缺件：${what}.json 里没有点名到的产物 ${inst.file}`);
      matched.add(hit);
    }
    const extra = rows.filter((r) => !matched.has(r)).map(rowName);
    need(extra.length === 0,
      `名单外的读数：${what}.json 里有 ${extra.length} 件不在实例名单里（${extra.slice(0, 5).join('、')}）—— 被判的页与名单必须逐字对齐，不许静默丢掉`);
  }
  return instances;
}

// ── 逐页读数 → 命中与逐维分 ────────────────────────────────────────────────────
const hitsOfSep = (sepRow) => {
  const node = sepRow.node?.hits ?? [];
  need(Array.isArray(node), `形状不符：sep.json 的 ${rowName(sepRow)} 缺 node.hits 数组`);
  return {
    nonR7: node.filter((h) => Array.isArray(h.tags) && h.tags.some((t) => t !== 'R7')),
    r7: node.filter((h) => Array.isArray(h.tags) && h.tags.includes('R7')),
    r6: node.filter((h) => Array.isArray(h.tags) && h.tags.includes('R6')),
  };
};

/** H6 的命中处数：只在触摸档数；顺带核明细里每一处都真的小于公共层下限。 */
function touchOf(fmtRow) {
  const widths = fmtRow.widths ?? {};
  const coarse = fmtRow.pointerCoarse === true;
  const per = {};
  let hits = 0;
  let checked = 0;
  for (const w of Object.keys(widths)) {
    const cell = widths[w] ?? {};
    const small = cell.touchSmall ?? 0;
    per[w] = small;
    if (TOUCH_WIDTHS.includes(Number(w)) || coarse) hits += small;
    for (const item of cell.touchSmallList ?? []) {
      const m = /@(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(String(item));
      need(m !== null, `形状不符：fmt.json 的触摸明细读不出尺寸（${item}）`);
      const [w1, h1] = [Number(m[1]), Number(m[2])];
      need(w1 < PAGE_LIMITS.touchMinPx || h1 < PAGE_LIMITS.touchMinPx,
        `读数与公共层下限不符：fmt.json 把 ${item} 记成命中区不足，但公共层下限是 ${PAGE_LIMITS.touchMinPx}px（读数器的阈值与公共层走散了）`);
      checked += 1;
    }
  }
  return { hits, per, coarse, checked };
}

/** 一页的机器侧命中（H1／H2／H4／H5／H6；H3／H7 由人核表给）。 */
function hitsOf(page) {
  const sep = hitsOfSep(page.sep);
  const broken = Object.keys(page.resp.widths ?? {}).map(Number)
    .filter((w) => page.resp.widths[String(w)]?.why !== '' || page.resp.widths[String(w)]?.ok === false);
  const touch = touchOf(page.fmt);
  return {
    h1: sep.nonR7.length, h2: sep.r7.length, h3: page.fact.dupFacts ?? 0, h4: sep.r6.length,
    h5: broken.length, h5Widths: broken, h6: touch.hits, h6Per: touch.per, h6Checked: touch.checked,
    h7: page.fact.english ?? 0,
  };
}

/** 逐维算式（脚本腿；每条都能在 `t849-视觉基准.md` §1 与 §1 的权威出处逐字对上）。 */
function dimsOf(h, fact, fmt) {
  const d3cut = HARD.H1 * h.h1 + HARD.H2 * h.h2 + HARD.H3 * h.h3 + HARD.H4 * h.h4;
  const d4cut = HARD.H5 * h.h5 + (fact.d4cut ?? 0);
  const narrow = fmt.widths?.[String(CRITERION_WIDTHS[0])] ?? {};
  const minFont = narrow.minFontPxNoSvg ?? PAGE_LIMITS.textMinPx;
  const fontCut = minFont >= PAGE_LIMITS.textMinPx ? 0 : D5W.font;
  const tableCut = (fact.tables ?? 0) > 0 && (fact.tdDataLabel ?? 0) === 0 ? D5W.table : 0;
  const tocCut = (fact.tocEl ?? 0) > 0 && (fact.scrollMargin ?? 0) > 0 ? 0 : D5W.toc;
  const imgCut = (fact.imgTags ?? 0) === 0 ? 0 : (fact.aspectRatio ?? 0) > 0 ? 0 : D5W.image;
  const d5cut = fontCut + tableCut + tocCut + imgCut;
  return {
    d1: Math.max(0, WEIGHTS.d1 - (fact.d1 ?? 0)),
    d2: Math.max(0, WEIGHTS.d2 - (fact.d2 ?? 0)),
    d3: Math.max(0, WEIGHTS.d3 - d3cut),
    d4: Math.max(0, WEIGHTS.d4 - d4cut),
    d5: Math.max(0, WEIGHTS.d5 - d5cut),
    detail: {
      d3: { cut: d3cut, coeff: D3W },
      d4: { cut: d4cut, broken: h.h5Widths },
      d5: { cut: d5cut, parts: { font: fontCut, table: tableCut, toc: tocCut, image: imgCut }, minFont },
    },
  };
}

const hardOf = (h) => {
  const parts = [];
  for (const [k, n] of [['H1', h.h1], ['H2', h.h2], ['H3', h.h3], ['H4', h.h4], ['H5', h.h5], ['H6', h.h6], ['H7', h.h7]]) {
    if (n > 0) parts.push({ id: k, hits: n, pts: HARD[k] * n });
  }
  return { total: parts.reduce((a, p) => a + p.pts, 0), parts };
};

const floorOK = (dims) => Object.keys(WEIGHTS).every((k) => dims[k] >= FLOOR[k]);

// ── 主装配 ────────────────────────────────────────────────────────────────────
export function score(dir, config = null) {
  const readings = loadReadings(dir);
  const criterion = assertCriterionWidths(readings);
  const instances = instancesFor(readings, config);
  const rows = instances.map((inst) => {
    const page = readPage(readings, inst);
    const h = hitsOf(page);
    const dims = dimsOf(h, page.fact, page.fmt);
    const hard = hardOf(h);
    const raw = dims.d1 + dims.d2 + dims.d3 + dims.d4 + dims.d5;
    return {
      seq: inst.seq, key: page.key, file: page.file, raw: +raw.toFixed(1),
      dims: { d1: dims.d1, d2: dims.d2, d3: dims.d3, d4: dims.d4, d5: dims.d5 },
      hits: h, hard, total: +Math.max(0, raw - hard.total).toFixed(1),
      floorOK: floorOK(dims), detail: dims.detail, factKeys: Object.keys(page.fact).sort(),
    };
  });
  const avg = (f) => +(rows.reduce((a, r) => a + r[f], 0) / rows.length).toFixed(2);
  const avgDim = (k) => +(rows.reduce((a, r) => a + r.dims[k], 0) / rows.length).toFixed(2);
  return {
    at: new Date().toISOString(),
    engine: 'packages/base-render/scripts/判分.mjs',
    dir,
    config: config === null ? null : { path: config.path, value: config.value },
    frozen: {
      weights: WEIGHTS, floor: FLOOR, hard: HARD, touchWidths: TOUCH_WIDTHS, criterionWidths: CRITERION_WIDTHS,
      passScore: PASS_SCORE, touchMinPx: PAGE_LIMITS.touchMinPx, textMinPx: PAGE_LIMITS.textMinPx,
      breakpointsPx: PAGE_LIMITS.breakpointsPx, coeff: { d3: D3W, d5: D5W },
    },
    criterion,
    rows,
    totals: {
      d1: avgDim('d1'), d2: avgDim('d2'), d3: avgDim('d3'), d4: avgDim('d4'), d5: avgDim('d5'),
      total: avg('total'),
      hard: +(rows.reduce((a, r) => a + r.hard.total, 0) / rows.length).toFixed(2),
      min: Math.min(...rows.map((r) => r.total)), max: Math.max(...rows.map((r) => r.total)),
      floorOKPages: rows.filter((r) => r.floorOK).length,
      passPages: rows.filter((r) => r.total >= PASS_SCORE && r.floorOK).length,
    },
  };
}

/** 一致性自证的字面公式腿：把 §1 的公式逐字重打一遍（**不共享上面任何函数**）。 */
export function literalScore(dir, config = null) {
  const readings = loadReadings(dir);
  const instances = instancesFor(readings, config);
  const W = { d1: 15, d2: 20, d3: 25, d4: 15, d5: 25 };
  const H = { H1: 2, H2: 3, H3: 2, H4: 1, H5: 5, H6: 1, H7: 1 };
  const T = PAGE_LIMITS.touchMinPx;
  const TXT = PAGE_LIMITS.textMinPx;
  return instances.map((inst) => {
    const sepRow = readings.sep.rows.find((r) => matchRow(r, inst.file));
    const respRow = readings.resp.rows.find((r) => matchRow(r, inst.file));
    const fmtRow = readings.fmt.rows.find((r) => matchRow(r, inst.file));
    const factKey = factKeyOf(readings.facts.pages, inst);
    const q = factKey === undefined ? {} : readings.facts.pages[factKey];
    const hits = sepRow.node.hits;
    const nonR7 = hits.filter((x) => x.tags.some((t) => t !== 'R7')).length;
    const r7 = hits.filter((x) => x.tags.includes('R7')).length;
    const r6 = hits.filter((x) => x.tags.includes('R6')).length;
    const dupFacts = q.dupFacts ?? 0;
    const broken = Object.keys(respRow.widths).map(Number)
      .filter((w) => respRow.widths[String(w)].why !== '' || respRow.widths[String(w)].ok === false).length;
    const coarse = fmtRow.pointerCoarse === true;
    const touch = Object.keys(fmtRow.widths).map(Number)
      .filter((w) => TOUCH_WIDTHS.includes(w) || coarse)
      .reduce((a, w) => a + (fmtRow.widths[String(w)].touchSmall ?? 0), 0);
    for (const w of Object.keys(fmtRow.widths)) {
      for (const item of fmtRow.widths[w].touchSmallList ?? []) {
        const m = /@(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(String(item));
        if (!m || !(Number(m[1]) < T || Number(m[2]) < T)) throw new JudgeError(`判据与读数不符：${item}`);
      }
    }
    const minFont = fmtRow.widths[String(CRITERION_WIDTHS[0])].minFontPxNoSvg ?? TXT;
    const d1 = Math.max(0, W.d1 - (q.d1 ?? 0));
    const d2 = Math.max(0, W.d2 - (q.d2 ?? 0));
    const d3 = Math.max(0, W.d3 - (H.H1 * nonR7 + H.H2 * r7 + H.H3 * dupFacts + H.H4 * r6));
    const d4 = Math.max(0, W.d4 - H.H5 * broken - (q.d4cut ?? 0));
    const d5 = Math.max(0, W.d5 - ((minFont >= TXT ? 0 : 5)
      + (((q.tables ?? 0) > 0 && (q.tdDataLabel ?? 0) === 0) ? 6 : 0)
      + (((q.tocEl ?? 0) > 0 && (q.scrollMargin ?? 0) > 0) ? 0 : 4)
      + (((q.imgTags ?? 0) > 0 && (q.aspectRatio ?? 0) === 0) ? 3 : 0)));
    const hard = H.H1 * nonR7 + H.H2 * r7 + H.H3 * dupFacts + H.H4 * r6 + H.H5 * broken + H.H6 * touch + H.H7 * (q.english ?? 0);
    const key = factKey ?? inst.file;
    return { key, dims: { d1, d2, d3, d4, d5 }, hard, total: +Math.max(0, d1 + d2 + d3 + d4 + d5 - hard).toFixed(1) };
  });
}

/** 两腿逐页逐维比差：返回全部条目与最坏一条（`zero` 为真＝逐页逐维差 0）。 */
export function reconcile(dir, config = null) {
  const a = score(dir, config);
  const b = literalScore(dir, config);
  const diffs = [];
  for (const ra of a.rows) {
    const rb = b.find((x) => x.key === ra.key);
    need(rb !== undefined, `自证失败：字面腿里找不到 ${ra.key}`);
    for (const k of ['d1', 'd2', 'd3', 'd4', 'd5']) {
      diffs.push({ key: ra.key, dim: k, script: ra.dims[k], literal: rb.dims[k], diff: +(ra.dims[k] - rb.dims[k]).toFixed(1) });
    }
    diffs.push({ key: ra.key, dim: 'hard', script: ra.hard.total, literal: rb.hard, diff: +(ra.hard.total - rb.hard).toFixed(1) });
    diffs.push({ key: ra.key, dim: 'total', script: ra.total, literal: rb.total, diff: +(ra.total - rb.total).toFixed(1) });
  }
  const worst = diffs.reduce((m, d) => (Math.abs(d.diff) > Math.abs(m.diff) ? d : m),
    { diff: 0, dim: '—', key: '—', script: '—', literal: '—' });
  return { diffs, worst, zero: diffs.every((d) => d.diff === 0) };
}

// ── 命令行 ────────────────────────────────────────────────────────────────────
function argOf(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] ?? null : null;
}

/** 两套按域配置对同一读数目录给出的逐页逐维分差（结构保证：配置里没有数字）。 */
function compare(aPath, bPath) {
  const a = readJson(resolve(aPath));
  const b = readJson(resolve(bPath));
  const diffs = [];
  for (const ra of a.rows ?? []) {
    const rb = (b.rows ?? []).find((x) => x.key === ra.key);
    need(rb !== undefined, `对比失败：乙落点里没有 ${ra.key}`);
    for (const k of ['d1', 'd2', 'd3', 'd4', 'd5']) {
      diffs.push({ key: ra.key, dim: k, a: ra.dims[k], b: rb.dims[k], diff: +(ra.dims[k] - rb.dims[k]).toFixed(1) });
    }
    diffs.push({ key: ra.key, dim: 'hard', a: ra.hard.total, b: rb.hard.total, diff: +(ra.hard.total - rb.hard.total).toFixed(1) });
    diffs.push({ key: ra.key, dim: 'total', a: ra.total, b: rb.total, diff: +(ra.total - rb.total).toFixed(1) });
  }
  const worst = diffs.reduce((m, d) => (Math.abs(d.diff) > Math.abs(m.diff) ? d : m),
    { diff: 0, dim: '—', key: '—', a: '—', b: '—' });
  const zero = diffs.length > 0 && diffs.every((d) => d.diff === 0);
  console.log(`读数目录：甲 ${a.dir} ／ 乙 ${b.dir}${a.dir === b.dir ? '（同一目录）' : '（**不是同一目录**）'}`);
  console.log(`DOMAIN-DIFF 逐页逐维（含硬扣分与总分）最大绝对差 = ${Math.abs(worst.diff)} ⇒ ${zero ? '一致（差 0）' : '**不一致**'}`
    + `（比对 ${diffs.length} 项／页 ${(a.rows ?? []).length} 张；最坏 ${worst.dim}@${worst.key} 甲 ${worst.a} ／ 乙 ${worst.b}）`);
  return zero ? 0 : 1;
}

function report(res, rec, jsonPath = null) {
  console.log(`判分引擎：${res.engine}（读数 ${res.dir}）`);
  console.log(`FROZEN 权重 D1 ${WEIGHTS.d1}／D2 ${WEIGHTS.d2}／D3 ${WEIGHTS.d3}／D4 ${WEIGHTS.d4}／D5 ${WEIGHTS.d5}；`
    + `每维下限 满权 80%（D1≥${FLOOR.d1}／D2≥${FLOOR.d2}／D3≥${FLOOR.d3}／D4≥${FLOOR.d4}／D5≥${FLOOR.d5}）；`
    + `硬扣分 H1 ${HARD.H1}／H2 ${HARD.H2}／H3 ${HARD.H3}／H4 ${HARD.H4}／H5 ${HARD.H5}／H6 ${HARD.H6}／H7 ${HARD.H7}；`
    + `触摸档 ${TOUCH_WIDTHS.join('／')}`);
  console.log(`判据数值（取自公共层 PAGE_LIMITS）：可点控件命中下限 ${PAGE_LIMITS.touchMinPx}px；`
    + `正文类字号下限 ${PAGE_LIMITS.textMinPx}px；仓内断点集合 ${PAGE_LIMITS.breakpointsPx.join('／')}`);
  console.log(`配置：${res.config === null ? '（未给按域配置：名单＝sep 读数里的全部页）' : res.config.path + '（包路径 ' + (res.config.value.packagePath ?? '—') + '）'}`);
  console.log(`判据档位：${res.criterion.widths.join('／')}（最窄 ${res.criterion.narrowest}／最宽 ${res.criterion.widest}）`);
  console.log('| 页 | D1/15 | D2/20 | D3/25 | D4/15 | D5/25 | 逐维合计 | 硬扣分 | 页分 | 每维≥80% |');
  console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|---|');
  for (const r of res.rows) {
    console.log(`| ${r.key} | ${r.dims.d1} | ${r.dims.d2} | ${r.dims.d3} | ${r.dims.d4} | ${r.dims.d5} | ${r.raw} `
      + `| −${r.hard.total} | **${r.total}** | ${r.floorOK ? '是' : '否'} |`);
  }
  console.log(`| **均分** | ${res.totals.d1} | ${res.totals.d2} | ${res.totals.d3} | ${res.totals.d4} | ${res.totals.d5} `
    + `| — | −${res.totals.hard} | **${res.totals.total}** | ${res.totals.floorOKPages}/${res.rows.length} 页 |`);
  console.log(`SCORE 页数=${res.rows.length} 均分=${res.totals.total} 最低=${res.totals.min} 最高=${res.totals.max} `
    + `≥${PASS_SCORE} 且每维≥80% 的页=${res.totals.passPages}/${res.rows.length}`);
  if (jsonPath) console.log('落点 ' + resolve(jsonPath));
  // 下面两行恒为末两行：自证差 0 ＋ 页分／每维≥80%（`--json` 那行印在它们之前）。
  console.log(`RECONCILE 逐页逐维（含硬扣分与总分）最大绝对差 = ${Math.abs(rec.worst.diff)} ⇒ ${rec.zero ? '一致（差 0）' : '**不一致**'}`
    + `（比对 ${rec.diffs.length} 项；最坏 ${rec.worst.dim}@${rec.worst.key} 脚本 ${rec.worst.script} ／ 字面 ${rec.worst.literal}）`);
  console.log(`页分 每维≥80%：${res.rows.map((r) => `${r.key}=${r.total}${r.floorOK ? '' : '（有维不达线）'}`).join(' ／ ')}`
    + `；过线页（≥${PASS_SCORE} 且每维≥80%）= ${res.totals.passPages}/${res.rows.length}`);
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
    console.log(USAGE);
    return argv.length === 0 ? 2 : 0;
  }
  const ci = argv.indexOf('--compare');
  if (ci >= 0) {
    const [a, b] = argv.slice(ci + 1);
    need(a && b, `--compare 要两个落点：--compare <甲.json> <乙.json>`, 2);
    return compare(a, b);
  }
  const configPath = argOf(argv, '--config');
  const config = configPath === null ? null : loadConfig(configPath);
  const dir = readingsDirOf(argOf(argv, '--dir'), config);
  const jsonPath = argOf(argv, '--json');
  const res = score(dir, config);
  const rec = reconcile(dir, config);
  if (jsonPath) {
    writeFileSync(resolve(jsonPath), JSON.stringify({ ...res, reconcile: { zero: rec.zero, worst: rec.worst, items: rec.diffs.length } }, null, 1), 'utf8');
  }
  report(res, rec, jsonPath);
  return rec.zero ? 0 : 1;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (e) {
  const code = e instanceof JudgeError ? e.code : 1;
  console.error(`判分中止（退出码 ${code}）：${e.message}`);
  process.exitCode = code;
}
