#!/usr/bin/env node
/** #879 反向账：**两列表不许出现「只对齐数据格、不管表头」的单边对齐规则**。
 *
 * 为什么要有这件：`td:last-child{text-align:right}` 这种单边规则会让同一张表的表头与同列值
 * 落在两条对位线上（#879 实测：备忘录「首次使用」1280 档 Δ=1040.55px、768 档 Δ=528.55px）。
 * 病根不是「右对齐」而是「住错了层」——「这一列是数值列」是**数据层的语义**，由调用方在列上
 * 声明 `align:"right"`（`blocks.ts` 的 `renderDataTable` 一处产出 `cell-<align>`，表头与数据格
 * 共用同一个档类）；按列数替调用方做这个决定，只表达「碰巧两列」、不表达「这一列是数值」。
 * 撤掉那条之后，`pageUiCss()` 里**没有任何落在 641～1000 的断点**（原有那条是为它单开的）。
 *
 * 判据实现上的两条硬话（本件踩过，写下来防复发）：
 *  ① **别拿正则切 CSS 选择器**：`@media` 套规则时正则会把媒体头读成选择器；本件第一版就因此
 *     让反例变成「恒不红」的假门（假门比没有门更坏）。
 *  ② **注释里出现的 `td:last-child` 是记账文字，不是规则**：本件产出的注释里就写着这三个类名
 *     （撤因记账）⇒ 判据只看**去掉注释后的正文**，否则会把注释当规则判红。
 *  正例之外必须有**正控**（在最小样本上判据必须真能红），否则「判据恒不绿」与「判据恒绿」一样看不出来。
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { blocksCss } from '../dist/blocks.js';
import { pageUiCss } from '../dist/pageUi.js';

const P = 'ilife-';
const CSS = pageUiCss();
/** 数值列的对齐档住在区块层（`blocks.ts` 的 `cell-right`）；撤的是页面层那条越权规则 ⇒ 两件都要看。 */
const BLOCKS = blocksCss();
/** 去掉注释后的正文（见文件头 ②）。 */
const CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/** 判据本体：**末格单元格的对齐声明只许出现在窄档（`max-width`）里**。
 *  宽档那条（本票撤掉的）的特征就是「住在 `min-width` 媒体块里、又只点 `td:last-child`」。
 *  收窄到这一条才有意义：≤640 的卡片化本来就该右对齐（那一档表头已收起、值单独成行），
 *  把宽档那条当成「一律禁止 `td:last-child`」会把正确的窄档规则一起判红（第一版实测就红了）。 */
const wideSideAligned = (text) => {
  const hit = [];
  for (let i = text.indexOf('td:last-child'); i >= 0; i = text.indexOf('td:last-child', i + 1)) {
    const closeBrace = text.indexOf('}', i);
    const decls = text.slice(i, closeBrace < 0 ? text.length : closeBrace);
    if (!decls.includes('text-align')) continue;
    const before = text.slice(0, i);
    const ats = [...before.matchAll(/@media[^{]*\{/g)];
    const media = ats.length > 0 ? ats[ats.length - 1][0].replace(/[{(]/g, '').trim() : '(顶层)';
    if (!media.includes('max-width')) hit.push(media + ' :: ' + decls.replace(/\s+/g, ' ').trim().slice(0, 70));
  }
  return hit;
};

describe('#879 两列表：不许单边对齐（表头与同列值必须同档）', () => {
  it('① 641～1000 这一档断点不许存在（它当年只为那条两列表规则单开）', () => {
    const mid = [...CODE.matchAll(/@media[^{]*min-width:\s*(\d+)px/g)].map((m) => Number(m[1])).filter((w) => w > 640 && w <= 1000);
    assert.deepEqual(mid, [], '641～1000 的断点回来了：' + JSON.stringify(mid));
  });

  it('① 反例自证：把这一档断点请回来，判据必须红', () => {
    const mid = (t) => [...t.matchAll(/@media[^{]*min-width:\s*(\d+)px/g)].map((m) => Number(m[1])).filter((w) => w > 640 && w <= 1000);
    assert.deepEqual(mid(CODE + '\n@media (min-width: 641px) { .' + P + 'page-ui { text-align: left; } }'), [641]);
  });

  it('② 末格对齐声明只许住在窄档（宽档那条单边规则不许回来）', () => {
    assert.deepEqual(wideSideAligned(CODE), [], '出现了宽档的单边对齐规则（表头与同列值会落在两条对位线上）');
  });

  it('② 正控：把那条规则按原样注回，判据必须点到它（证明判据不是恒绿假门）', () => {
    const sel = '.' + P + 'page-ui .' + P + 'block-data-table:has(thead tr > th:nth-child(2):last-child) td:last-child';
    const mutated = CODE + '\n@media (min-width: 641px) {\n  ' + sel + ' {\n    text-align: right;\n  }\n}\n';
    const hit = wideSideAligned(mutated);
    assert.equal(hit.length, 1, '注回后判据必须恰点一条，实为 ' + JSON.stringify(hit));
    assert.ok(hit[0].includes('min-width: 641px') && hit[0].includes('text-align: right'), '点到的不是那条规则：' + JSON.stringify(hit));
  });

  it('③ ≤640 的卡片化仍在：表头收起 ＋ 标签回填，判别器仍是「恰两列」', () => {
    assert.match(CODE, /nth-child\(2\):last-child\) thead \{\s*display: none;/, '≤640 的「表头收起」不见了');
    assert.match(CODE, /nth-child\(2\):last-child\) td::before \{\s*content: none;/, '≤640 的「标签回填」被改掉了');
    // 反面：末格对齐那条在窄档仍应在（它不是本票要撤的东东）
    assert.match(CODE, /nth-child\(2\):last-child\) td:last-child \{\s*text-align: right;/, '≤640 那条末格对齐被误撤了');
  });

  it('④ 数值列能力仍在数据层（区块件）：`cell-right` 的右对齐一条不少', () => {
    assert.match(BLOCKS, new RegExp('\\.' + P + 'block-data-table-cell-right \\{\\s*text-align: right;'), '`cell-right` 的右对齐不见了（数值列会跟着丢对齐）');
    assert.match(BLOCKS, new RegExp('td\\.' + P + 'block-data-table-cell-right'), '数值列的 `min-width` 那条不见了');
  });
});
