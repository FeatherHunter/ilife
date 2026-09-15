// #541（公共层：≤640 档数据表的手机端形态）· 机检用例。
//
// 出处：负责人第四轮看图 ——「所有用到这张表的 HTML 都要整改，这个表在手机宽度上效果很差」（并查明是否
// base 组件：**是**，`packages/base-render/src/blocks.ts` 的 `renderDataTable`）。视觉席在场景 04 的 17 页
// 里也实测到同一处（`<caption>` 被压成一字一行）。
//
// 本票只动**窄屏段**（那条既有的 `@media (max-width: 640px)`），桌面档（≥641）逐字不变。判据分三件：
//   ① **表注不竖排**：表在窄屏已是块流，`<caption>` 若留缺省的 `display:table-caption` 会被压成「一个汉字宽」，
//      按任意位置断行 ⇒ 必须显式 `display:block` ＋ 满宽。
//   ② **一格＝一行「值贴右缘」**：`td` 是两端对齐的 flex 行（`space-between`），值被推到容器右缘；窄屏段里
//      **不再有任何栅格轨**（栅格轨左侧对齐正是「右半张卡空着」的来路）。
//   ③ **退化格**：拿不到标签的格不出版面空标签，且值单独占满一格（块级满宽）。
//
// 几何读数（390 档实测：caption 行数、值右缘到容器右缘的距离）不做成断言 —— 需无头 Chrome。
// 读数与可复跑脚本见 `docs/base/base-render/t541-证据.md` 与 `docs/base/base-render/t541-窄屏读数.mjs`
// （口径同 `table-width-512.test.mjs:13-14`）。
// 纪律（同 `blocks.test.mjs`／`rowcard-caliber-t154r3.test.mjs`）：只读产出的 `blocksCss()`，不自造第二份
// 数值表、不写死行号。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { STYLE_PREFIX } from '../dist/index.js';
import { blocksCss, renderDataTable } from '../dist/blocks.js';

const P = STYLE_PREFIX;
const CSS = blocksCss();
const TABLE = '.' + P + 'block-data-table';

/* ── 只读小件（口径同 `table-width-512.test.mjs`：剥注释、取最内层块） ─────────────── */

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

/** 取一个 at-rule 的段内正文（按花括号配平），返回 `{ start, end, body }`。 */
function atRuleSpan(css, head) {
  const at = css.indexOf(head);
  assert.ok(at >= 0, '缺 at-rule：' + head);
  const open = css.indexOf('{', at);
  assert.ok(open > at, head + ' 段缺规则体');
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

/** 含数据表的那一段 ≤640px 媒体查询（同一份 CSS 里另有三段 640px 档）。 */
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

/** 只判**规则**、不判注释。 */
function bare(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/* ══════════════════════════════════════════════════════════════
 * ① 表注（caption）在窄屏不竖排
 * ══════════════════════════════════════════════════════════════ */

describe('#541 ① 窄屏表注不竖排', () => {
  const cap = () => declsOf(narrowDataTable().body, TABLE + '-caption');

  it('表注显式转回块级：`display:block` ＋ `width:100%`（缺省的 `table-caption` 就是竖排的来路）', () => {
    assert.equal(declValue(cap(), 'display'), 'block', '表注必须占满整卡，不许留 table-caption');
    assert.equal(declValue(cap(), 'width'), '100%', '表注宽度必须钉在满卡上');
  });

  it('表注上没有把它按字数断行的声明（`nowrap`／`writing-mode`／`word-break` 一律不许出现）', () => {
    const decls = cap().map((d) => d.replace(/\s+/g, ''));
    for (const banned of ['white-space:nowrap', 'writing-mode', 'word-break']) {
      assert.ok(!decls.some((d) => d.startsWith(banned)), '表注不许带 ' + banned + '：' + JSON.stringify(decls));
    }
  });

  it('表本体在窄屏是块流（表注竖排的另一半病根：表还是 table 布局）', () => {
    assert.equal(declValue(declsOf(narrowDataTable().body, TABLE + '-table'), 'display'), 'block',
      '窄屏的表本体必须是块流，否则 caption 仍被压成 table-caption');
  });
});

/* ══════════════════════════════════════════════════════════════
 * ② 一格＝一行「标签 ＋ 值」，值贴容器右缘
 * ══════════════════════════════════════════════════════════════ */

describe('#541 ② 窄屏行卡：值贴右缘（不再有半张卡空着）', () => {
  const td = () => declsOf(narrowDataTable().body, TABLE + ' td');

  it('`td` 是两端对齐的 flex 行：标签贴左缘、值贴右缘', () => {
    assert.equal(declValue(td(), 'display'), 'flex', '一行两端对齐靠 flex');
    assert.equal(declValue(td(), 'justify-content'), 'space-between', '值必须被推到容器右缘');
  });

  it('窄屏段里**一条栅格轨都没有**（栅格轨的左侧对齐正是「右边空一半」的来路）', () => {
    const hits = [...bare(narrowDataTable().body).matchAll(/grid-template-columns/g)];
    assert.equal(hits.length, 0, '窄屏数据表段不许再出现 grid-template-columns，实为 ' + String(hits.length));
  });

  it('值的折行兜底仍在（长串不溢出、不被挤成一条窄柱）', () => {
    assert.equal(declValue(td(), 'overflow-wrap'), 'anywhere', '长串折行兜底不许拿掉');
    assert.equal(declValue(td(), 'align-items'), 'baseline', '值换行时标签要落在首行基线上');
    assert.equal(declValue(td(), 'gap'), '2px 10px', '标签与值之间要有最小间距，长值时不会贴在一起');
  });

  it('标签轨不许收缩：值很长时标签也不许被压成一字一行（`flex: none`）', () => {
    const before = declsOf(narrowDataTable().body, TABLE + ' td::before');
    assert.equal(declValue(before, 'flex'), 'none',
      '标签轨要 `0 0 auto`：值很长时标签仍保住自己的内容宽（实测：不加这条，390 档「备注」会被压成「备／注」两行）');
  });

  it('数值列的桌面下限（#507 的 `min-width:5.5em`）在卡里收回 0：值不许被这条下限顶开', () => {
    const align = declsOf(narrowDataTable().body,
      TABLE + '-table td.' + P + 'block-data-table-cell-center, .' + P + 'block-data-table-table td.' + P + 'block-data-table-cell-right');
    assert.equal(declValue(align, 'min-width'), '0', '数值列下限在卡形态下必须归零');
  });

  it('产地侧未动：`renderDataTable` 仍给每格写 `data-label`（值的右缘靠标签轨的另一端，不靠改产出器）', () => {
    const html = renderDataTable({
      columns: [{ key: 'k', label: '日期' }, { key: 'v', label: '体重', align: 'right' }],
      rows: [{ k: '2026-09-07', v: 70.4 }],
    });
    assert.ok(html.includes('<td class="ilife-block-data-table-cell-left" data-label="日期">2026-09-07</td>')
      && html.includes('<td class="ilife-block-data-table-cell-right" data-label="体重">70.4</td>'),
      '产出器一行未改：' + html);
  });
});

/* ══════════════════════════════════════════════════════════════
 * ③ 退化格 ＋ 桌面档零变化
 * ══════════════════════════════════════════════════════════════ */

describe('#541 ③ 退化格与桌面档', () => {
  it('拿不到标签的格：不出版面空标签，值单独占满一格（块级满宽，不是残存的两轨）', () => {
    for (const sel of [TABLE + ' td:not([data-label])', TABLE + ' td[data-label=""]']) {
      assert.equal(declValue(declsOf(narrowDataTable().body, sel), 'display'), 'block', sel + ' 要块级满宽');
      assert.equal(declValue(declsOf(narrowDataTable().body, sel + '::before'), 'content'), 'none',
        sel + ' 不许出空标签');
    }
  });

  it('桌面档（≥641）零变化：这两枚窄屏声明不许出现在任何一条数据表规则里', () => {
    const n = narrowDataTable();
    const rest = bare(CSS.slice(0, n.absStart) + CSS.slice(n.absEnd));
    const leaked = ruleBlocks(rest)
      .filter((b) => b.selector.includes('data-table'))
      .filter((b) => b.decls.some((d) => d.startsWith('justify-content: space-between') || d.startsWith('align-items: baseline')))
      .map((b) => b.selector);
    assert.deepEqual(leaked, [], '桌面档的数据表规则里出现了窄屏声明');
  });

  it('桌面档那条行首列钉宽（#512）一字未动', () => {
    const head = TABLE + ' td.' + P + 'block-data-table-cell-left:first-child';
    assert.equal(declValue(declsOf(CSS, head), 'width'), '1%');
    assert.equal(CSS.split(P + 'block-data-table-cell-left:first-child').length - 1, 1,
      '行首列钉宽仍只此一条');
  });
});
