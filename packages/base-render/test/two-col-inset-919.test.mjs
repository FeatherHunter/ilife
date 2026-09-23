#!/usr/bin/env node
/** #919 反向账：窄档「一行一条事实」的两列表必须留左右内距，且与同断点的另两处同值。
 *
 * 为什么要有这件：#919 实测这一型的行内距是 0（`tr{padding:10px 0}` ＋ `td{padding:0}`）⇒
 *   行文字压在表格卡片的左右边框上，且与同一张表的标题不在同一条竖线（标题有 10px 内距）。
 *   几何读数（真浏览器）由 `scripts/check-two-col-align.mjs` 守（内距下限 8px、标题与首格同竖线）；
 *   本件守**静态口径**：两条内距必须写着、必须与同断点另两处同值、必须只住窄档。
 *
 * 判据实现上的两条硬话（与 `two-col-align-879.test.mjs` 同源，两件都踩过）：
 *  ① 别拿正则切 CSS 选择器：`@media` 套规则时正则会把媒体头读成选择器；本件按「选择器 → 声明段」整段取。
 *  ② 注释里出现的同名声明是记账文字，不是规则 ⇒ 判据只看去掉注释后的正文。
 *  正例之外必须有正控：把内距删掉／塞进宽档／把三处改成不同值，判据都必须真能红。
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { blocksCss } from '../dist/blocks.js';
import { pageUiCss } from '../dist/pageUi.js';

const P = 'ilife-';
/** 去掉注释后的正文（见文件头 ②）。 */
const CODE = pageUiCss().replace(/\/\*[\s\S]*?\*\//g, '');
const BLOCKS = blocksCss();
/** 内距下限（px）：与几何门的 `MIN_INSET_PX` 同值、同一件事。 */
const MIN_INSET_PX = 8;
const TWO_COL = P + 'block-data-table:has(thead tr > th:nth-child(2):last-child) ';
const FIRST = TWO_COL + 'td:first-child';
const LAST = TWO_COL + 'td:last-child';

/** 某条规则的声明段（第一个花括号到闭合），无则 null。 */
function declsOf(text, selector) {
  const at = text.indexOf(selector);
  if (at < 0) return null;
  const open = text.indexOf('{', at);
  const close = text.indexOf('}', open);
  return open < 0 || close < 0 ? null : text.slice(open + 1, close).replace(/\s+/g, ' ').trim();
}

/** 声明段里的左右内距（先读 `padding` 简写，再让 `padding-left／right` 覆盖）；读不出＝null。 */
function insetsOf(decls) {
  if (decls === null) return null;
  const out = { left: null, right: null };
  const sh = /padding:\s*(\d+)px(?:\s+(\d+)px)?/.exec(decls);
  if (sh !== null) { const v = Number(sh[2] === undefined ? sh[1] : sh[2]); out.left = v; out.right = v; }
  const l = /padding-left:\s*(\d+)px/.exec(decls);
  if (l !== null) out.left = Number(l[1]);
  const r = /padding-right:\s*(\d+)px/.exec(decls);
  if (r !== null) out.right = Number(r[1]);
  return out;
}

/** `@media` 块的真区间（按花括号配平，不做「往前找最近一个 @media 头」那种正则切法 ——
 *  块一闭合，那个头就失效了，会把块外的规则误判成块内，本件第一版正是这样误判 640 档表标题）。 */
function mediaRanges(css) {
  const out = [];
  const re = /@media[^{]*\{/g;
  for (let m = re.exec(css); m !== null; m = re.exec(css)) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') depth -= 1;
      i += 1;
    }
    out.push({ head: m[0].replace(/[{(]/g, '').trim(), start: re.lastIndex, end: i - 1 });
    re.lastIndex = i;
  }
  return out;
}

/** 某下标落在哪个媒体块里（`''` ＝ 顶层）。 */
function mediaAt(ranges, index) {
  for (const r of ranges) {
    if (index >= r.start && index < r.end) return r.head;
  }
  return '';
}

/** 选择器**每处**出现时所在的媒体块；返回数组，`null` ＝ 都没出现。 */
function mediasOf(text, selector) {
  const ranges = mediaRanges(text);
  const out = [];
  for (let i = text.indexOf(selector); i >= 0; i = text.indexOf(selector, i + 1)) {
    out.push(mediaAt(ranges, i));
  }
  return out.length === 0 ? null : out;
}

/** 640 档表标题那条规则的**声明段区间**（`blocks.ts`；窄档里与行文字对齐的那一处），无则 null。 */
function captionAt640Range(blocks) {
  const ranges = mediaRanges(blocks);
  const needle = '.' + P + 'block-data-table-caption {';
  for (let i = blocks.indexOf(needle); i >= 0; i = blocks.indexOf(needle, i + 1)) {
    if (!mediaAt(ranges, i).includes('max-width')) continue;
    const open = blocks.indexOf('{', i);
    const close = blocks.indexOf('}', open);
    if (open > 0 && close > open) return [open + 1, close];
  }
  return null;
}

/** 选择器**每处**出现里，第一条「声明段含 padding」的规则（成组选择器时前面会先碰到别的规则：
 *  `…:has(td[data-label]) table, tbody, tr, td { display:block }` 就是这么先撞上的，本件第一版踩过）。 */
function declsWithPadding(text, selector) {
  for (let i = text.indexOf(selector); i >= 0; i = text.indexOf(selector, i + 1)) {
    const open = text.indexOf('{', i);
    const close = text.indexOf('}', open);
    if (open < 0 || close < 0) continue;
    const decls = text.slice(open + 1, close).replace(/\s+/g, ' ').trim();
    if (/padding(-left|-right)?:/.test(decls)) return decls;
  }
  return null;
}

/** 判据本体：两条内距都在、都住窄档、都与同断点的另两处同值且不低于下限。返回判红条目（空＝绿）。 */
function insetReds(text, blocks) {
  const reds = [];
  const first = insetsOf(declsOf(text, FIRST));
  const last = insetsOf(declsOf(text, LAST));
  if (first === null || first.left === null) reds.push('首格缺左右内距（' + FIRST + ' 里读不到 padding）');
  if (last === null || last.right === null) reds.push('末格缺左右内距（' + LAST + ' 里读不到 padding）');
  if (first !== null && first.left !== null && first.left < MIN_INSET_PX) reds.push('首格内距 ' + first.left + 'px < 下限 ' + MIN_INSET_PX + 'px');
  if (last !== null && last.right !== null && last.right < MIN_INSET_PX) reds.push('末格内距 ' + last.right + 'px < 下限 ' + MIN_INSET_PX + 'px');
  for (const sel of [FIRST, LAST]) {
    const medias = mediasOf(text, sel);
    if (medias !== null && medias.some((m) => !m.includes('max-width'))) {
      reds.push(sel + ' 有非窄档的书写位：' + JSON.stringify(medias));
    }
  }
  const generic = insetsOf(declsWithPadding(text, P + 'block-data-table:has(td[data-label]) td'));
  const range = captionAt640Range(blocks);
  const cap = range === null ? null : insetsOf(blocks.slice(range[0], range[1]));
  if (generic === null || generic.left === null || cap === null || cap.left === null) {
    reds.push('找不到同断点的另两处内距（普通窄档形态的单元格／640 档表标题）');
  } else {
    if (first !== null && first.left !== generic.left) reds.push('首格内距 ' + first.left + 'px 与普通窄档形态 ' + generic.left + 'px 不同值');
    if (last !== null && last.right !== generic.left) reds.push('末格内距 ' + last.right + 'px 与普通窄档形态 ' + generic.left + 'px 不同值');
    if (generic.left !== cap.left) reds.push('普通窄档形态 ' + generic.left + 'px 与 640 档表标题 ' + cap.left + 'px 不同值');
  }
  return reds;
}

describe('#919 两列表窄档「一行一条事实」：左右内距必须写着、同值、只住窄档', () => {
  it('① 正例：当前 `pageUiCss()` 判绿', () => {
    assert.deepEqual(insetReds(CODE, BLOCKS), [], '内距口径不成立：' + JSON.stringify(insetReds(CODE, BLOCKS)));
  });

  it('② 正控（反例自证）：把两条内距删掉，判据必须红', () => {
    const mutated = CODE.replace(/padding-left:\s*\d+px;/, '').replace(/padding-right:\s*\d+px;/, '');
    assert.notEqual(mutated, CODE, '夹具没生效：两条内距没找到');
    const reds = insetReds(mutated, BLOCKS);
    assert.ok(reds.length >= 2, '删掉两条内距后判据仍绿（假门）：' + JSON.stringify(reds));
  });

  it('③ 正控：只删首格那一条也必须红', () => {
    const mutated = CODE.replace(/padding-left:\s*\d+px;/, '');
    assert.notEqual(mutated, CODE, '夹具没生效：首格内距没找到');
    assert.ok(insetReds(mutated, BLOCKS).some((r) => r.includes('首格')), '只删首格内距判据没红');
  });

  it('④ 越档守卫：把这条内距塞进宽档（`min-width`）必须红', () => {
    const sel = '.' + P + 'page-ui .' + FIRST;
    const mutated = CODE + '\n@media (min-width: 641px) {\n  ' + sel + ' { padding-left: 10px; }\n}\n';
    assert.ok(insetReds(mutated, BLOCKS).some((r) => r.includes('非窄档')), '宽档那条没被点到');
  });

  it('⑤ 三处同值：把 640 档表标题的内距改小，判据必须红', () => {
    const range = captionAt640Range(BLOCKS);
    assert.notEqual(range, null, '夹具没生效：640 档表标题那条没找到');
    const decls = BLOCKS.slice(range[0], range[1]);
    const mutatedDecls = decls.replace(/padding:\s*8px\s+10px;/, 'padding: 8px 6px;');
    assert.notEqual(mutatedDecls, decls, '夹具没生效：640 档表标题的内距没改写');
    const mutatedBlocks = BLOCKS.slice(0, range[0]) + mutatedDecls + BLOCKS.slice(range[1]);
    assert.ok(insetReds(CODE, mutatedBlocks).some((r) => r.includes('640 档表标题')), '三处不同值时判据没红');
  });
});
