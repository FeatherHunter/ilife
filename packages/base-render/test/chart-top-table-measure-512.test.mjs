// #512（最后一公里 · 公共层）· 机检用例。
//
// 本票公共层两件（`packages/base-render/src/charts.ts` ＋ `blocks.ts`）：
//   ① 折线族：顶端那条刻度**标注**不再探出画布（上沿给刻度文字留 1.04em × 最大那一档字号），
//      且**峰值**离顶端刻度线至少 10% 绘图区高（旧口径两端对称 6% → 只剩 5.36%，顶线读成「标题下划线」）；
//   ② 数据表：宽档给表卡一个宽度上限，日期列与数值列不再「左一角右一角」（窄档窄于上限，逐值不变）。
//      （#567 D1 已改写：680 上限撤掉、表卡吃满内容列；本节 ② 的断言是改后口径。）
//
// 覆盖（node:test；随 root `pnpm test` 与 base-render 单包测试跑）：
//   ①② 由产出几何直接证明（上沿位置、顶端标注基线、峰值点到顶端刻度线的比例）；显式 `yMax` 的反向账；
//   ③ 基座规则恰一条、无宽度上限（`ui-fix-154` 那条守卫的口径）且没推翻 #507／上一票的数值列与行首列；
//   ④ 窄屏段（≤640px，#457 地盘）里没有本票新增的任何表宽手段。
//
// 四档实渲读数（顶刻度 relTop／峰值余量／列宽／中缝：512／820／1000／1440）不做成断言 —— 需无头 Chrome，
// 读数与复跑脚本见 `docs/base/base-render/t512-最后一公里-证据.md`。
// 纪律（同 charts.test.mjs／table-width-512.test.mjs）：断言只读产出，不写死行号、不放宽既有判据。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { STYLE_PREFIX } from '../dist/index.js';
import { blocksCss } from '../dist/blocks.js';
import { charts } from '../dist/charts.js';

const P = STYLE_PREFIX;
const CSS = blocksCss();

/* ── 只读小件（口径同 charts.test.mjs：按 class 取同名标签的**开标签**属性） ───────── */

function tagsOf(html, tag) {
  return [...html.matchAll(new RegExp('<' + tag + '\\s[^>]*>', 'g'))].map((m) => m[0]);
}

function attrsOf(html, tag, cls) {
  const hit = tagsOf(html, tag).filter((t) => new RegExp('class="[^"]*' + cls + '[^"]*"').test(t));
  return hit.map((t) => Object.fromEntries([...t.matchAll(/([a-zA-Z0-9-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]])));
}

function textsOf(html, cls) {
  return [...html.matchAll(new RegExp('<text class="[^"]*' + cls + '[^"]*"[^>]*>([^<]*)</text>', 'g'))].map((m) => m[1]);
}

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

/* ══════════════════════════════════════════════════════════════
 * ① 折线族：顶端刻度标注在框里、峰值不贴顶
 * ══════════════════════════════════════════════════════════════ */

/** 峰值在中点（10），末点更低（5）—— 余量必须认**最大值**，不是「最后一个点」。 */
const PEAK_MID = [{ label: 'A', value: 0 }, { label: 'B', value: 10 }, { label: 'C', value: 5 }];
const AUTO = { width: 580, height: 260, yTicks: 2, labels: 'none', showValues: false };

const autoHtml = charts.line({ items: PEAK_MID, options: AUTO }).html;
const grids = attrsOf(autoHtml, 'line', P + 'charts-grid').map((a) => Number(a.y1));
const y0 = Math.min(...grids);
const y1 = Math.max(...grids);
const dots = attrsOf(autoHtml, 'circle', P + 'charts-dot').map((a) => Number(a.cy));

describe('#512 ① 折线族顶端刻度与峰值余量', () => {
  it('绘图区上沿给刻度标注留出 1.04em（≤720px 档字号 20 用户单位 → ≥ 21）', () => {
    /* 实渲文字盒高 ≈1.33em、基线以上 ≈1.04em（无头 Chrome 四档实测，见证据件）；留白是双端共用的
     * 用户单位，故按**最大那一档**字号算：ceil(1.04 × 20) = 21。旧口径 `showValues:false` 时只有 8
     * —— 顶端那条标注的盒子探出 viewBox 上沿被裁（复审实测 1000／1440 档 relTop = −0.36px、512 档 −7.47px）。 */
    assert.ok(y0 >= 21, '绘图区上沿至少要容下 1.04em 的刻度文字，实为 ' + String(y0));
  });

  it('顶端那条标注压在**它自己**的刻度线上（基线 = 线 + 3，与其它刻度同一条标度）', () => {
    const ys = attrsOf(autoHtml, 'text', P + 'charts-tick').map((a) => Number(a.y));
    assert.equal(ys.length, 2, 'yTicks:2 → 2 条标注');
    assert.equal(ys[ys.length - 1], y0 + 3, '顶端标注的基线在其线上方 3 单位（其余刻度同口径）');
    assert.equal(ys[0], y1 - 1, '最低那条仍在轴线上方 1 单位（#424 口径不动）');
  });

  it('峰值离顶端刻度线 = 绘图区高的 10%（旧口径 6% 外扩只剩 5.36%）', () => {
    const peak = Math.min(...dots);
    const ratio = (peak - y0) / (y1 - y0);
    assert.ok(Math.abs(ratio - 0.1) < 0.002, '峰值余量应为 0.10，实为 ' + String(ratio));
    assert.ok(dots[1] < dots[2], '余量认的是最大值（中点 10）：末点 5 更低');
  });

  it('反向账：显式 `yMax` 不补余量（域边界＝调用方的「画到这儿」）', () => {
    const fixed = charts.line({ items: PEAK_MID, options: { ...AUTO, yMin: 0, yMax: 10 } }).html;
    const fGrids = attrsOf(fixed, 'line', P + 'charts-grid').map((a) => Number(a.y1));
    const fDots = attrsOf(fixed, 'circle', P + 'charts-dot').map((a) => Number(a.cy));
    assert.deepEqual(textsOf(fixed, P + 'charts-tick'), ['0', '10'], '显式域照抄用户给的两端');
    assert.equal(Math.min(...fDots), Math.min(...fGrids), '显式 yMax 时峰值就落在顶端刻度线上（语义如此）');
  });

  it('下端仍是 6% 外扩（本票只动上端）', () => {
    assert.deepEqual(textsOf(autoHtml, P + 'charts-tick'), ['-0.6', '11.18'], '0 的下端 −0.6 不动，上端 10 → 11.18');
  });
});

/* ══════════════════════════════════════════════════════════════
 * ② 数据表：吃满内容列（#567 D1 改写 #512 ②：680 上限撤掉）
 *
 * 改写说明：#512 当时用 `max-width: 680px` 收「左右两角」；#517 样板页实测该上限让表盒
 * 682 vs 内容列 1080（两侧各空 199px）⇒ #567 D1 撤掉上限（列宽分配已由行首列 1%＋nowrap
 * 与数值列下限接管）。本节断言改写为新口径：基座无宽度上限、仍恰一条、窄屏无宽度手段。
 * ══════════════════════════════════════════════════════════════ */

const TABLE_BASE = '.' + P + 'block-data-table';
const NUM_CELL = TABLE_BASE + ' td.' + P + 'block-data-table-cell-right';
const HEAD_CELL = TABLE_BASE + ' td.' + P + 'block-data-table-cell-left:first-child';

describe('#512 ② 数据表吃满内容列（#567 D1：680 上限已撤）', () => {
  it('基座规则恰一条，且无 `max-width` 上限（表卡吃满内容列）', () => {
    const decls = declsOf(CSS, TABLE_BASE);
    assert.ok(!decls.some((d) => d.startsWith('max-width')), '表卡仍带宽度上限：' + JSON.stringify(decls));
    assert.ok(!decls.some((d) => d.startsWith('margin-inline')), '居中边距应随上限一起撤：' + JSON.stringify(decls));
    assert.equal(declValue(decls, 'margin'), '16px 0', '#154 的块级外边距不许被顺手改写');
  });

  it('上限住在基座规则里，不另开第二条同名规则（`ui-fix-154` 的守卫口径）', () => {
    const hits = ruleBlocks(CSS).filter((b) => b.selector === TABLE_BASE).length;
    assert.equal(hits, 1, '基座规则必须恰 1 条，实为 ' + String(hits));
    assert.equal(CSS.split(TABLE_BASE + ' {').length - 1, 1, '全表只此一处基座规则');
  });

  it('数值列与行首列的既有口径没被推翻（#507 主次 ＋ 上一票的 1%＋nowrap）', () => {
    const num = declsOf(CSS, NUM_CELL);
    assert.equal(declValue(num, 'min-width'), '5.5em', '数值列下限仍在');
    assert.equal(declValue(num, 'font-family'), '"SF Mono", monospace', '等宽栈仍在');
    assert.equal(declValue(num, 'font-variant-numeric'), 'tabular-nums', '逐位数对齐仍在');
    const head = declsOf(CSS, HEAD_CELL);
    assert.equal(declValue(head, 'width'), '1%', '行首列仍收在内容宽上');
    assert.equal(declValue(head, 'white-space'), 'nowrap', '行首列仍不折行');
  });

  it('反向账：窄屏段（≤640px）里没有凭空多出宽度手段', () => {
    /* 同一份 CSS 里有好几段 `@media (max-width: 640px)`（口径同 `table-width-512.test.mjs` 的
     * `narrowDataTableSpan`）：本金只挑**含数据表**的那一段。 */
    const spans = [];
    for (let i = 0; i < CSS.length; i += 1) {
      if (CSS.startsWith('@media (max-width: 640px)', i)) spans.push(atRuleSpan(CSS.slice(i), '@media (max-width: 640px)').body);
    }
    const narrow = spans.find((b) => b.includes(P + 'block-data-table-table'));
    assert.ok(narrow !== undefined, '窄屏数据表段仍在');
    for (const bad of ['max-width', 'width: 1%', 'nowrap']) {
      assert.ok(!narrow.includes(bad), '窄屏段不该出现 ' + bad + '（本票一律只在宽档生效）');
    }
  });
});
