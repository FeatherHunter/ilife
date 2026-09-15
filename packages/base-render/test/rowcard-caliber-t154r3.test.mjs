// t154-r3（负责人第三轮要求 1／2）· 机检用例 —— 数据表手机端行卡化 ＋ 口径行分隔形状化。
//
// 本票改的是**公共层 base 组件**（`src/blocks.ts`），故判据全部读**产出物**，不自造第二份数值表：
//   ① 数据表：`renderDataTable` 给每个数据格写 `data-label`（与列头同源）；窄屏段（≤640px）把
//      `thead` 收起、`tr` 变卡、每格一行「标签 ＋ 值」（`td::before{content:attr(data-label)}`）；
//      拿不到标签的格退化成「只有值」（`content:none`，**不许出空标签**）。
//   ② 桌面档（≥641）零变化：本票新增的规则**全部**住在那条既有 `@media (max-width: 640px)` 段里
//      （把该段从 CSS 里切掉，剩下的 CSS 不许再出现 `data-label`／`attr(`）。
//   ③ 口径行：`renderCaliberLine` **签名不变**（全仓 141 处调用点一行不动），内部按 `｜` 拆段出
//      `<span>`，分隔改由 CSS 细竖线（`border-left`）承担 ⇒ 判据＝**产物该行的文本里不再出现 `｜`**；
//      不带 `｜` 的行（多数调用点）逐字节同改前。
//
// 纪律同 `blocks.test.mjs`／`table-width-512.test.mjs`：只读 `blocksCss()` 与产出器、不写死行号。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { STYLE_PREFIX } from '../dist/index.js';
import { blocksCss, renderCaliberLine, renderDataTable } from '../dist/blocks.js';

const P = STYLE_PREFIX;
const CSS = blocksCss();
const TABLE = '.' + P + 'block-data-table';

/* ── 只读小件（口径同 `table-width-512.test.mjs`：剥注释、取最内层块） ────────────── */

function ruleBlocks(css) {
  const out = [];
  for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
    if (selector === '') continue;
    out.push({ selector, decls: m[2].split(';').map((s) => s.trim()).filter((s) => s.includes(':')) });
  }
  return out;
}

function declsOf(css, selector) {
  const hits = ruleBlocks(css).filter((b) => b.selector === selector);
  assert.equal(hits.length, 1, selector + ' 必须恰 1 条，实为 ' + String(hits.length));
  return hits[0].decls;
}

function declValue(decls, prop) {
  const hit = decls.find((d) => d.startsWith(prop + ':'));
  assert.ok(hit, '缺声明 ' + prop + '：' + JSON.stringify(decls));
  return hit.slice(prop.length + 1).trim();
}

/** 取一个 at-rule 的段内正文（按花括号配平）。 */
function atRuleSpan(css, head) {
  const at = css.indexOf(head);
  assert.ok(at >= 0, '缺 at-rule：' + head);
  const open = css.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return { start: open + 1, end: i, body: css.slice(open + 1, i) };
    }
  }
  throw new Error('花括号不配对：' + head);
}

/** 含数据表的那段 ≤640px 媒体查询（同一份 CSS 里另有三段 640px 档）。
 *  返回体力 ＋ **整份 CSS 里的绝对起止**（判「切掉这一段后桌面档还剩什么」要用绝对下标）。 */
function narrowDataTable() {
  const hits = [];
  for (let i = 0; i < CSS.length; i += 1) {
    if (CSS.startsWith('@media (max-width: 640px)', i)) {
      hits.push({ absStart: i, span: atRuleSpan(CSS.slice(i), '@media (max-width: 640px)') });
    }
  }
  const hit = hits.find((h) => h.span.body.includes(P + 'block-data-table-table'));
  assert.ok(hit !== undefined, '缺 ≤640px 的数据表媒体查询段');
  return { body: hit.span.body, absStart: hit.absStart, absEnd: hit.absStart + hit.span.end };
}

/** 只判**规则**、不判注释：注释里的说明文字（含 `data-label` 这类词）不该参与判据。 */
function bare(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** 剥标签取可见文本（口径同 `t401`／`weight-*` 的可见文本读数：只判文本面）。 */
function visibleText(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/* ══════════════════════════════════════════════════════════════
 * ① 数据表：每格带标签（产出器侧）
 * ══════════════════════════════════════════════════════════════ */

describe('t154-r3 ① 数据表 data-label（列头 → 数据格）', () => {
  const columns = [{ key: 'k', label: '日期' }, { key: 'v', label: '体重', align: 'right' }];
  const html = renderDataTable({ columns, rows: [{ k: '2026-09-07', v: 70.4 }, { k: '2026-09-06', v: null }] });

  it('每个数据格带 `data-label`，值取列头文本、逐列对齐', () => {
    assert.ok(html.includes('<td class="ilife-block-data-table-cell-left" data-label="日期">2026-09-07</td>'),
      '行首格缺 data-label：' + html);
    assert.ok(html.includes('<td class="ilife-block-data-table-cell-right" data-label="体重">70.4</td>'),
      '数值格缺 data-label：' + html);
  });

  it('标签与列头同源：`th` 文本序列 === `td` 的 `data-label` 序列（不存在两处文案漂移）', () => {
    const ths = [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
    const firstRow = /<tbody><tr>([\s\S]*?)<\/tr>/.exec(html)[1];
    const labels = [...firstRow.matchAll(/data-label="([^"]*)"/g)].map((m) => m[1]);
    assert.deepEqual(labels, ths, '列头与标签必须逐列相同');
  });

  it('属性数与格数相等（每行每列都有）；空值格也带标签（标签不是「有值才给」）', () => {
    assert.equal((html.match(/data-label=/g) ?? []).length, 4, '2 行 × 2 列');
    assert.ok(html.includes('data-label="体重"></td>'), '空值格的标签必须在（值空、标签不空）：' + html);
  });

  it('标签走同一张五字符转义表（`"` 与 `&` 不会破属性）', () => {
    const one = renderDataTable({ columns: [{ key: 'k', label: 'a"b&c' }], rows: [{ k: 'x' }] });
    assert.ok(one.includes('data-label="a&quot;b&amp;c"'), '属性值未按冻结表转义：' + one);
    assert.ok(!one.includes('data-label="a"b'), '原始引号不得进属性');
  });

  it('零行仍是空态（不渲染空表、不产生 data-label）', () => {
    const empty = renderDataTable({ columns, rows: [] });
    assert.ok(!empty.includes('<table') && !empty.includes('data-label'), '零行不该有表与标签：' + empty);
  });
});

/* ══════════════════════════════════════════════════════════════
 * ② 数据表：窄屏行卡化（CSS 侧）
 * ══════════════════════════════════════════════════════════════ */

describe('t154-r3 ② 窄屏（≤640px）行卡化', () => {
  it('列头收起：`thead` 在窄屏段里 `display: none`', () => {
    assert.equal(declValue(declsOf(narrowDataTable().body, TABLE + ' thead'), 'display'), 'none',
      'thead 必须收起（列名改住每格的标签里）');
  });

  it('表格／表体／行／格走块流；`tr` 是一张卡（内距 ＋ 卡间 hairline，首卡无线）', () => {
    assert.equal(declValue(declsOf(narrowDataTable().body, TABLE + '-table'), 'display'), 'block', 'table 须转块流');
    assert.equal(declValue(declsOf(narrowDataTable().body, TABLE + ' tbody'), 'display'), 'block', 'tbody 须转块流');
    const tr = declsOf(narrowDataTable().body, TABLE + ' tr');
    assert.equal(declValue(tr, 'display'), 'block', '行＝卡');
    assert.equal(declValue(tr, 'padding'), '8px 12px', '卡内距');
    assert.ok(declValue(tr, 'border-top').startsWith('1px solid rgba('), '卡间分隔线：' + JSON.stringify(tr));
    assert.equal(declValue(declsOf(narrowDataTable().body, TABLE + ' tr:first-child'), 'border-top'), '0',
      '首卡不画上线（否则贴着容器上边框成双线）');
  });

  it('每格一行「标签 ＋ 值」：`td` 两端对齐的 flex 行 ＋ 伪元素取 `data-label`', () => {
    const td = declsOf(narrowDataTable().body, TABLE + ' td');
    // #541 收紧：原来是两轨栅格（`5em minmax(0, 1fr)`），值轨的左对齐让 390 档右半张卡空着；
    // 现在值由 `space-between` 推到容器右缘，标签留在左缘。判据于是落在 flex ＋ 两端对齐上。
    assert.equal(declValue(td, 'display'), 'flex', '格内要一行两端对齐（标签左缘／值右缘）');
    assert.equal(declValue(td, 'justify-content'), 'space-between', '值必须被推到容器右缘');
    assert.equal(declValue(td, 'align-items'), 'baseline', '值换行时标签要落在首行基线上');
    assert.ok(!declsOf(narrowDataTable().body, TABLE + ' td').some((d) => d.startsWith('grid-template-columns:')),
      '#541 起窄屏不再用栅格轨（栅格轨左侧对齐会让值轨右侧空掉）');
    assert.equal(declValue(td, 'border-bottom'), '0', '卡形态下格的底线取消（分隔已由卡间线承担）');
    assert.equal(declValue(td, 'color'), 'var(--fg)', '值取正文字色（标签另取 --fg3）');
    assert.equal(declValue(td, 'overflow-wrap'), 'anywhere', '长串不溢出的兜底必须留着（作用在满宽格上）');
    const before = declsOf(narrowDataTable().body, TABLE + ' td::before');
    assert.equal(declValue(before, 'content'), 'attr(data-label)', '标签的**唯一**来源是格上的 data-label');
    assert.equal(declValue(before, 'color'), 'var(--fg3)', '标签取最浅灰（同列头口径）');
  });

  it('没拿到标签的格退化：不出版面的空标签（`content: none` ＋ 值单独占满一格）', () => {
    assert.equal(declValue(declsOf(narrowDataTable().body, TABLE + ' td:not([data-label])::before'), 'content'), 'none',
      '缺 data-label 的格不许出空标签');
    assert.equal(declValue(declsOf(narrowDataTable().body, TABLE + ' td[data-label=""]::before'), 'content'), 'none',
      '空 data-label 同样不许出空标签（`renderDataTable` 不会产，手写表可能）');
    for (const sel of [TABLE + ' td:not([data-label])', TABLE + ' td[data-label=""]']) {
      assert.equal(declValue(declsOf(narrowDataTable().body, sel), 'display'), 'block',
        sel + ' 的值要单独占满一格（#541：不再是两轨栅格，改回块级满宽）');
    }
  });

  it('列对齐在卡形态里收回左对齐、数值列下限收回 0（「标签 ＋ 值」的左轴才齐）', () => {
    const align = declsOf(narrowDataTable().body,
      TABLE + '-table td.' + P + 'block-data-table-cell-center, .' + P + 'block-data-table-table td.' + P + 'block-data-table-cell-right');
    assert.equal(declValue(align, 'text-align'), 'left');
    assert.equal(declValue(align, 'min-width'), '0', '数值列的 5.5em 下限在卡里会把标签顶开');
  });

  it('取值不写死色值：窄屏新增的色一律走冻结 token / 既有 LINE_RGB 档', () => {
    const body = narrowDataTable().body;
    const colors = [...body.matchAll(/(?:^|[\s;{])(?:color|background|border[a-z-]*)\s*:\s*([^;{}]+)/g)].map((m) => m[1].trim());
    assert.ok(colors.length >= 3, '至少要读到新增的三条色声明，实为 ' + JSON.stringify(colors));
    for (const value of colors) {
      const ok = /var\(--[A-Za-z0-9-]+\)/.test(value) || /rgba\(/.test(value) || value === 'none' || value === '0';
      assert.ok(ok, '窄屏段出现非 token 色值：' + value);
    }
  });
});

/* ══════════════════════════════════════════════════════════════
 * ③ 桌面档（≥641）零变化
 * ══════════════════════════════════════════════════════════════ */

describe('t154-r3 ③ 桌面档（≥641）零变化', () => {
  const n = narrowDataTable();
  const rest = bare(CSS.slice(0, n.absStart) + CSS.slice(n.absEnd));

  it('把 ≤640 段切掉后，全表再无 `data-label`／`attr(` 字样（属性在桌面档无任何规则可用）', () => {
    assert.ok(!rest.includes('data-label'), '桌面档 CSS 不该引用 data-label');
    assert.ok(!rest.includes('attr('), '桌面档 CSS 不该出现 attr()');
  });

  it('行卡化的载体（thead 收起／tr 成卡／td 两端对齐行）只在那一段里', () => {
    assert.ok(!rest.includes(TABLE + ' thead'), '桌面档不得出现 thead 规则');
    assert.ok(!new RegExp(TABLE.replace(/[.\\]/g, '\\$&') + '\\s+tr\\s*\\{').test(rest), '桌面档不得出现 tr 卡的规则');
    // #541 收紧：窄屏那两枚「值贴右缘」的声明（`justify-content: space-between` ＋ `align-items: baseline`）
    // 只许住窄屏段 —— 桌面档仍是真表格，列对齐由 `cell-left`／`cell-center`／`cell-right` 三条基座规则管。
    // 判**数据表自己的规则**而不是整份 CSS：同一份 CSS 里别的组件也有这两枚声明（`caliber` 行就用 `baseline`），
    // 按整份文本判会把它们误伤。
    const desktopTableRules = ruleBlocks(rest).filter((b) => b.selector.includes('data-table'));
    const leaked = desktopTableRules
      .filter((b) => b.decls.some((d) => d.startsWith('justify-content: space-between') || d.startsWith('align-items: baseline')))
      .map((b) => b.selector);
    assert.deepEqual(leaked, [], '桌面档的数据表规则里不得出现窄屏那两枚声明');
  });

  it('桌面档那条行首列钉宽（#512）一字未动，且仍只此一条', () => {
    const head = TABLE + ' td.' + P + 'block-data-table-cell-left:first-child';
    assert.equal(declValue(declsOf(CSS, head), 'width'), '1%');
    assert.equal(CSS.split(P + 'block-data-table-cell-left:first-child').length - 1, 1);
  });
});

/* ══════════════════════════════════════════════════════════════
 * ④ 口径行：`｜` 拆段 ＋ 细竖线分隔
 * ══════════════════════════════════════════════════════════════ */

describe('t154-r3 ④ 口径行 renderCaliberLine', () => {
  const FOOTER = '📊 数据来源：体重记录 ｜ 窗口 2026-09-07 ｜ 共 1 条';
  const html = renderCaliberLine(FOOTER);

  it('判据：产物该行的**文本里不再出现 `｜`**（分隔只活在版式里）', () => {
    assert.ok(!html.includes('｜'), '原始 `｜` 字符不得进产物：' + html);
    assert.ok(!visibleText(html).includes('｜'), '可见文本里不得有 `｜`：' + visibleText(html));
  });

  it('根类与既有锚点逐字不变（141 处调用点的页面级契约不破）', () => {
    assert.ok(html.startsWith('<p class="ilife-block-caliber">'), '根类必须逐字仍是单独一个 ilife-block-caliber：' + html);
    assert.ok(html.endsWith('</p>'), '仍是单个段落');
  });

  it('`｜` 拆成若干 span：段文本逐段保留（分隔符本身被吃掉）', () => {
    const segs = [...html.matchAll(/<span>([^<]*)<\/span>/g)].map((m) => m[1]);
    assert.deepEqual(segs, ['📊 数据来源：体重记录', '窗口 2026-09-07', '共 1 条'], '拆段结果：' + html);
    assert.equal((html.match(/<span>/g) ?? []).length, 3, '段数＝span 数');
  });

  it('段内转义仍走同一张五字符表（`<`／`&`）', () => {
    const one = renderCaliberLine('甲 <b>& ｜ 乙');
    assert.ok(one.includes('&lt;b&gt;&amp;'), '未按冻结表转义：' + one);
    assert.ok(!one.includes('<b>'), '原始尖括号不得进产物');
  });

  it('不带 `｜` 的行逐字节同改前（flex 只对真分段的行生效）', () => {
    assert.equal(renderCaliberLine('周目标口径＝每日目标 × 7'),
      '<p class="ilife-block-caliber">周目标口径＝每日目标 × 7</p>');
  });

  it('空段丢弃（首尾 `｜`／`｜｜`）；无实义的全分隔符行退化回原样（不静默吞字符）', () => {
    const tail = renderCaliberLine('甲 ｜ ');
    assert.deepEqual([...tail.matchAll(/<span>([^<]*)<\/span>/g)].map((m) => m[1]), ['甲'], '空段不出版面空位：' + tail);
    assert.equal(renderCaliberLine('｜'), '<p class="ilife-block-caliber">｜</p>', '无实义行退化（没有可分的段）');
  });

  it('空串／非串仍是 bad-input（签名与入参口径不变）', () => {
    assert.throws(() => renderCaliberLine(''), (err) => err.code === 'bad-input');
    assert.throws(() => renderCaliberLine(7), (err) => err.code === 'bad-input');
  });

  it('版式侧：flex 容器（`:has(> span)`）＋ 段间 `border-left` 细竖线，且 CSS 里没有文字竖线', () => {
    const shape = declsOf(CSS, '.' + P + 'block-caliber:has(> span)');
    assert.equal(declValue(shape, 'display'), 'flex');
    assert.equal(declValue(shape, 'flex-wrap'), 'wrap', '窄屏允许换行');
    assert.equal(declValue(shape, 'gap'), '4px 12px');
    assert.equal(declValue(shape, 'align-items'), 'baseline');
    const sep = declsOf(CSS, '.' + P + 'block-caliber > span + span');
    assert.ok(declValue(sep, 'border-left').startsWith('1px solid rgba('), '分隔必须是细竖线：' + JSON.stringify(sep));
    assert.ok(!bare(CSS).includes('｜'), 'CSS 规则里不许出现文字竖线（分隔只在版式里）');
  });
});
