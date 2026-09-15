// #512（表格列宽按内容给）· 机检用例。
//
// 本票只做一件事：**行首列**（`align` 缺省 left；本页就是日期列）在桌面档收到内容所需宽，
// 余量归数值列；窄屏档（≤640px，#457 地盘）一字不动 —— 512 档「不横滚、不折行」的既有口径不许破。
//
// 覆盖（node:test；随 root `pnpm test` 与 base-render 单包测试跑）：
//   ① 桌面档（`@media (min-width: 641px)`）**恰一条**行首列规则：`width:1%` ＋ `white-space:nowrap`；
//   ② 该规则**只**住在桌面档段内：窄屏段里没有它，且 `.…-cell-left` 基座规则仍只有 `text-align:left`
//      —— ≤640 的解析结果与改前逐字相同（「512 不横滚」由此可证，不靠眼力）；
//   ③ #507 那条数值列主次（`min-width:5.5em` ＋ `--fg` ＋ 等宽栈 ＋ `tabular-nums`）**没被推翻**；
//   ④ 窄屏段 #457 的折行兜底（`td` 的 `overflow-wrap:anywhere`、`th` 的 `white-space:normal`）仍在。
//
// 几何读数（列宽 415.23→152.25、数值列 271.38→402.88、512 档逐值不变）不做成断言 ——
// 需无头 Chrome，读数与复跑脚本见 `docs/base/base-render/t512-表格列宽-证据.md`。
// 纪律（同 blocks.test.mjs）：断言只读产出的 `blocksCss()`，不自造第二份数值表、不写死行号。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { STYLE_PREFIX } from '../dist/index.js';
import { blocksCss } from '../dist/blocks.js';

const P = STYLE_PREFIX;
const CSS = blocksCss();

/** 行首列那条规则的**全选择器**（逐字，含 `td` 与 `:first-child`）。 */
const HEAD_CELL = '.' + P + 'block-data-table td.' + P + 'block-data-table-cell-left:first-child';
/** 数值列那条（#507 已有，本票不动）。 */
const NUM_CELL = '.' + P + 'block-data-table td.' + P + 'block-data-table-cell-right';

/* ── 只读小件（口径同 style.test.mjs 的 `ruleBlocks`：剥注释、取最内层块） ────────── */

function ruleBlocks(css) {
  const out = [];
  for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
    if (selector === '') continue;
    out.push({ selector, decls: m[2].split(';').map((s) => s.trim()).filter((s) => s.includes(':')) });
  }
  return out;
}

/** 取某条规则的声明（选择器逐字相等；0 条或多条即抛）。 */
function declsOf(css, selector) {
  const hits = ruleBlocks(css).filter((b) => b.selector === selector);
  assert.equal(hits.length, 1, selector + ' 必须恰 1 条，实为 ' + String(hits.length));
  return hits[0].decls;
}

/** 取一个 at-rule 的段内正文（按花括号配平），返回 `{ start, end, body }`（下标在整份 CSS 里）。 */
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

/** 取声明值（`width: 1%` → `1%`；缺该声明即抛）。 */
function declValue(decls, prop) {
  const hit = decls.find((d) => d.startsWith(prop + ':'));
  assert.ok(hit, '缺声明 ' + prop + '：' + JSON.stringify(decls));
  return hit.slice(prop.length + 1).trim();
}

/** 窄屏档那段数据表媒体查询（≤640 里含 `data-table-table` 的那一段）。 */
function narrowDataTableSpan(css) {
  const spans = [];
  for (let i = 0; i < css.length; i += 1) {
    if (css.startsWith('@media (max-width: 640px)', i)) { spans.push(atRuleSpan(css.slice(i), '@media (max-width: 640px)')); }
  }
  const hit = spans.find((s) => s.body.includes(P + 'block-data-table-table'));
  assert.ok(hit !== undefined, '缺 ≤640px 的数据表媒体查询段');
  return hit;
}

/* ══════════════════════════════════════════════════════════════
 * ① 行首列在桌面档收在内容宽上
 * ══════════════════════════════════════════════════════════════ */

describe('#512 ① 行首列按内容收窄（桌面档）', () => {
  it('桌面档恰一条行首列规则：`width:1%` ＋ `white-space:nowrap`', () => {
    const decls = declsOf(CSS, HEAD_CELL);
    assert.equal(declValue(decls, 'width'), '1%', '行首列要给一个「要窄」的显式目标宽');
    assert.equal(declValue(decls, 'white-space'), 'nowrap', 'nowrap 让 min-content ＝ max-content ＝ 内容自然宽');
  });

  it('该规则住在 `@media (min-width: 641px)` 段内（640 断点的桌面侧）', () => {
    const span = atRuleSpan(CSS, '@media (min-width: 641px)');
    const at = CSS.indexOf(HEAD_CELL);
    assert.ok(at > span.start && at < span.end, '行首列规则不在桌面档段内');
  });

  it('全表只此一处（没有第二条把行首列钉在别处）', () => {
    const hits = CSS.split(P + 'block-data-table-cell-left:first-child').length - 1;
    assert.equal(hits, 1, '`cell-left:first-child` 命中数必须为 1，实为 ' + String(hits));
  });

  it('反向账（防「本来就有、白改」）：基座 `.…-cell-left` 里没有 width／white-space', () => {
    const decls = declsOf(CSS, '.' + P + 'block-data-table-cell-left');
    assert.deepEqual(decls, ['text-align: left'], '行首列的钉宽只能住桌面档，不许落进基座规则');
  });
});

/* ══════════════════════════════════════════════════════════════
 * ② 窄屏档逐字不动（512 档「不横滚、不折行」的可证形式）
 * ══════════════════════════════════════════════════════════════ */

describe('#512 ② 窄屏档（≤640px）不受影响', () => {
  it('≤640 段里不出现行首列的钉宽选择器（`first-child` 在窄屏只许承担卡间分隔）', () => {
    const narrow = narrowDataTableSpan(CSS);
    assert.ok(!narrow.body.includes(P + 'block-data-table-cell-left'), '窄屏段不该提到行首列');
    assert.ok(!narrow.body.includes(P + 'block-data-table-cell-left:first-child'), '窄屏段不该出现行首列钉宽选择器');
    // t154-r3 起窄屏是**行卡形态**：`tr:first-child` 用来取消首卡的卡间线，与本票的「钉宽」无关。
    // 判据不许放宽成「只要不出现 cell-left 就行」——这里把窄屏段里**所有** `first-child` 用法逐字钉死。
    const uses = [...narrow.body.matchAll(/[^{}]*first-child[^{}]*\{/g)].map((m) => m[0].replace(/\s+/g, ' ').trim());
    assert.deepEqual(uses, ['.' + P + 'block-data-table tr:first-child {'],
      '窄屏段的 first-child 只许有「首卡无线」一条：' + JSON.stringify(uses));
  });

  it('#457 的折行兜底仍在：`td` 的 `overflow-wrap:anywhere` ＋ `th` 的 `white-space:normal`', () => {
    const narrow = narrowDataTableSpan(CSS);
    const td = ruleBlocks(narrow.body).find((b) => b.selector.endsWith('block-data-table td'));
    const th = ruleBlocks(narrow.body).find((b) => b.selector.endsWith('block-data-table th'));
    assert.ok(td !== undefined && th !== undefined, '窄屏段缺 th／td 规则');
    assert.equal(declValue(td.decls, 'overflow-wrap'), 'anywhere', '窄屏的折行兜底被拿掉了');
    assert.equal(declValue(th.decls, 'white-space'), 'normal', '窄屏表头的 nowrap 放开被拿掉了');
  });
});

/* ══════════════════════════════════════════════════════════════
 * ③ #507 的数值列主次没被推翻
 * ══════════════════════════════════════════════════════════════ */

describe('#512 ③ 数值列（#507 成果）不被推翻', () => {
  it('数值列仍带 `min-width:5.5em` ＋ `--fg` ＋ 等宽栈 ＋ `tabular-nums`', () => {
    const decls = declsOf(CSS, NUM_CELL);
    assert.equal(declValue(decls, 'min-width'), '5.5em', '数值列的宽度下限被拿掉了：' + JSON.stringify(decls));
    assert.equal(declValue(decls, 'color'), 'var(--fg)', '数值列数据色被改回次级灰了');
    assert.equal(declValue(decls, 'font-family'), '"SF Mono", monospace', '数值列等宽栈被拿掉了');
    assert.equal(declValue(decls, 'font-variant-numeric'), 'tabular-nums', '数值列位数对齐被拿掉了');
  });

  it('数值列的余量来自「行首列收窄」，不是靠改数值列自己的规则（两件事分开）', () => {
    const decls = declsOf(CSS, NUM_CELL);
    assert.equal(decls.filter((d) => d.startsWith('width')).length, 0,
      '数值列不许改宽（本票只收行首列，余量由 auto 分配自然归它）');
  });
});
