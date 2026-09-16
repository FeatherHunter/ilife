/** #567 公共层形状清账 · 机检用例（D1／D2／D6／状态列 cellHtml／572-S3-3／图表三开关）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/base-render`，
 * 再 `node --test packages/base-render/test/shape-567.test.mjs`。
 * 纪律：断言只读产出（`blocksCss()`／`charts.*` 真跑），不写死源码行号；
 * 每个开关一正一负（改坏必红）：正＝新能力生效，负＝非法输入回退默认或抛错。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { STYLE_PREFIX } from '../dist/index.js';
import { blocksCss, renderDataTable } from '../dist/blocks.js';
import { charts } from '../dist/charts.js';

const P = STYLE_PREFIX;

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
const textsOf = (html, cls) => [...html.matchAll(new RegExp('<text class="[^"]*' + cls + '[^"]*"[^>]*>([^<]*)</text>', 'g'))].map((m) => m[1]);
const itemsOf = (n) => Array.from({ length: n }, (_, i) => ({ label: 'D' + String(i + 1).padStart(2, '0'), value: 100 + ((i * 37) % 60) }));

const CSS = blocksCss();

describe('#567 D1 表卡吃满内容列', () => {
  it('基座无宽度上限、无居中边距，块级外边距仍 16px 0', () => {
    const decls = declsOf(CSS, '.' + P + 'block-data-table');
    assert.ok(!decls.some((d) => d.startsWith('max-width')), '仍带宽度上限');
    assert.ok(!decls.some((d) => d.startsWith('margin-inline')), '仍带居中边距');
    assert.equal(declValue(decls, 'margin'), '16px 0');
  });
});

describe('#567 D2 列表行首列不折行', () => {
  it('首轨 minmax(44px,auto)：短内容仍 44px，长标签按内容撑开', () => {
    const decls = declsOf(CSS, '.' + P + 'block-list-rows-row');
    assert.equal(declValue(decls, 'grid-template-columns'), 'minmax(44px, auto) minmax(0, 1fr) auto');
  });
});

describe('#567 D6 页内导航触摸目标 44px', () => {
  it('toc-a 纵向 8px 内距＋min-height:44px 纵向居中', () => {
    const decls = declsOf(CSS, '.' + P + 'block-toc a');
    assert.ok(Number((declValue(decls, 'min-height').match(/([\d.]+)px/) ?? [])[1] ?? 0) >= 44, '触摸目标不足 44px');
    assert.equal(declValue(decls, 'padding'), '8px 12px');
    assert.equal(declValue(decls, 'display'), 'inline-flex');
  });
});

describe('#567 状态列 cellHtml', () => {
  const cols = [{ key: 's', label: '状态' }];
  it('给了且返回字符串即透传（缺口页徽章进单元格即走这条）', () => {
    const html = renderDataTable({
      columns: cols,
      rows: [{ s: '✓ 达标' }],
      cellHtml: (key, value) => key === 's'
        ? '<span class="' + P + 'status-badge ' + P + 'status-badge-ok">' + value + '</span>'
        : undefined,
    });
    assert.ok(html.includes('<span class="' + P + 'status-badge ' + P + 'status-badge-ok">✓ 达标</span>'), '徽章未透传');
  });
  it('返回 undefined 即走缺省转义文本（默认行为不变）', () => {
    const html = renderDataTable({ columns: cols, rows: [{ s: 'a&b' }], cellHtml: () => undefined });
    assert.ok(html.includes('>a&amp;b</td>'), '缺省转义丢了');
  });
  it('不给 cellHtml 时产物与改前逐字同（纯文本仍转义）', () => {
    const html = renderDataTable({ columns: cols, rows: [{ s: '<b>x</b>' }] });
    assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'), '缺省转义丢了');
  });
  it('负向：cellHtml 非函数即 bad-input；返回非字符串非 undefined 即 bad-input', () => {
    assert.throws(() => renderDataTable({ columns: cols, rows: [], cellHtml: '<b>' }), '非函数未拦');
    assert.throws(
      () => renderDataTable({ columns: cols, rows: [{ s: 'x' }], cellHtml: () => 7 }),
      '非字符串返回未拦',
    );
  });
});

describe('#567 572-S3-3 表头去大写', () => {
  it('th 无 text-transform:uppercase（kg／ml 不再被抬成 KG／ML）', () => {
    assert.ok(!new RegExp(P + 'block-data-table th\\s*\\{[^}]*text-transform:\\s*uppercase').test(CSS), 'th 仍抬大写');
  });
  it('列头层级仍在（12px＋600＋最浅灰＋字距）', () => {
    // 基座规则（首条；窄屏段另有一条 11px 既有形态，不在此断言）。
    const base = (CSS.match(new RegExp('\\.' + P + 'block-data-table th \\{([^}]*)\\}')) ?? [])[1] ?? '';
    const decls = base.split(';').map((s) => s.trim()).filter((s) => s.includes(':'));
    assert.equal(declValue(decls, 'font-size'), '12px');
    assert.equal(declValue(decls, 'font-weight'), '600');
  });
});

describe('#567 图表开关一：柱状 valueThin 抽稀', () => {
  it('59 柱默认全标（默认行为不变）', () => {
    assert.equal(textsOf(charts.bar({ items: itemsOf(59) }).html, P + 'charts-value').length, 59);
  });
  it('valueThin:30 → 抽稀到 2–58 枚', () => {
    const n = textsOf(charts.bar({ items: itemsOf(59), options: { valueThin: 30 } }).html, P + 'charts-value').length;
    assert.ok(n >= 2 && n < 59, '抽稀后 ' + n + ' 枚');
  });
  it("showValues:'edge' 只标首尾（改前落进全开那支）", () => {
    const vals = textsOf(charts.bar({ items: itemsOf(59), options: { showValues: 'edge' } }).html, P + 'charts-value');
    assert.equal(vals.length, 2, "'edge' 标了 " + vals.length + ' 枚');
  });
  it('负向：非法 valueThin（0／负／非数）即回退全标', () => {
    for (const v of [0, -5, 'x', NaN]) {
      const n = textsOf(
        charts.bar({ items: itemsOf(10), options: { valueThin: v } }).html, P + 'charts-value',
      ).length;
      assert.equal(n, 10, 'valueThin=' + String(v) + ' 未回退全标（' + n + ' 枚）');
    }
  });
});

describe('#567 图表开关二：柱状 yTicks 刻度', () => {
  it('默认 0 条（默认行为不变）', () => {
    assert.equal((charts.bar({ items: itemsOf(5) }).html.match(new RegExp(P + 'charts-tick"', 'g')) ?? []).length, 0);
  });
  it('yTicks:3 → 3 条刻度＋3 条网格线同位置', () => {
    const html = charts.bar({ items: itemsOf(5), options: { yTicks: 3 } }).html;
    const ys = [...html.matchAll(new RegExp('<text class="[^"]*' + P + 'charts-tick"[^>]*y="([^"]*)"', 'g'))].map((m) => Number(m[1]));
    const grids = [...html.matchAll(new RegExp('<line class="[^"]*' + P + 'charts-grid"[^>]*y1="([^"]*)"', 'g'))].map((m) => Number(m[1]));
    assert.equal(ys.length, 3, '刻度 ' + ys.length + ' 条');
    assert.equal(grids.length, 3, '网格线 ' + grids.length + ' 条');
    // 刻度基线口径：首条 ty−1、其余 ty＋3（折线 #424 口径）；网格线须压着刻度线（ty）。
    const tys = [ys[0] + 1, ys[1] - 3, ys[2] - 3];
    for (let i = 0; i < 3; i += 1) {
      assert.ok(Math.abs(grids[i] - tys[i]) < 0.05, '网格线 ' + i + ' 未压刻度线：' + grids[i] + ' vs ' + tys[i]);
    }
  });
  it('负向：yTicks:false／7（越界夹取 2–6）', () => {
    const z = (charts.bar({ items: itemsOf(5), options: { yTicks: false } }).html.match(new RegExp(P + 'charts-tick"', 'g')) ?? []).length;
    assert.equal(z, 0, 'false 应 0 条');
    const c = (charts.bar({ items: itemsOf(5), options: { yTicks: 7 } }).html.match(new RegExp(P + 'charts-tick"', 'g')) ?? []).length;
    assert.equal(c, 6, '7 应夹到 6 条，实 ' + c);
  });
});

describe('#567 图表开关三：折线只标末值', () => {
  const line10 = itemsOf(10);
  it("showValues:'last' → 恰一枚＝末值", () => {
    const vals = textsOf(
      charts.line({ items: line10, options: { showValues: 'last', format: (v) => 'V' + v } }).html, P + 'charts-value',
    );
    assert.deepEqual(vals, ['V' + line10[9].value]);
  });
  it("highlightLast 同开时不双印（圈＋一枚文本）", () => {
    const html = charts.line({
      items: line10, options: { showValues: 'last', highlightLast: true, format: (v) => 'V' + v },
    }).html;
    assert.equal(textsOf(html, P + 'charts-value').length, 1, '末值印了两遍');
    assert.ok(html.includes(P + 'charts-dot-last'), '高亮圈丢了');
  });
  it('负向：非法 showValues 回退默认（false 那支）', () => {
    const n = textsOf(charts.line({ items: line10, options: { showValues: 'x' } }).html, P + 'charts-value').length;
    assert.equal(n, 0, '非法值未回退（' + n + ' 枚）');
  });
});

describe('#567 图表开关四：折线 dots 全＋labels 每 k 标一', () => {
  const line31 = itemsOf(31);
  it('31 点默认：dots 被抽稀、xlabels 全量（默认行为不变）', () => {
    const html = charts.line({ items: line31, options: { labels: 'all' } }).html;
    assert.ok((html.match(new RegExp(P + 'charts-dot"', 'g')) ?? []).length < 31, '默认 dots 未抽稀');
    assert.equal(textsOf(html, P + 'charts-xlabel').length, 31);
  });
  it('showDots:true＋labelEvery:7 → 31 点全画、标签每 7 点一枚且含末点', () => {
    const html = charts.line({ items: line31, options: { labels: 'all', showDots: true, labelEvery: 7 } }).html;
    assert.equal((html.match(new RegExp(P + 'charts-dot"', 'g')) ?? []).length, 31, '点未画满');
    const xl = textsOf(html, P + 'charts-xlabel');
    assert.deepEqual(xl, ['D01', 'D08', 'D15', 'D22', 'D29', 'D31'], '抽稀标签集合不对：' + xl.join('|'));
  });
  it('负向：非法 labelEvery（1／0／非数）即回退全标', () => {
    for (const k of [1, 0, -3, 'x']) {
      const n = textsOf(
        charts.line({ items: line31, options: { labels: 'all', showDots: true, labelEvery: k } }).html,
        P + 'charts-xlabel',
      ).length;
      assert.equal(n, 31, 'labelEvery=' + String(k) + ' 未回退全标（' + n + ' 枚）');
    }
  });
});
