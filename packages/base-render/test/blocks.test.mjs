// #104 B1 区块组件整合守卫测试（node:test；随 root `pnpm test` 跑）。
//
// 覆盖（12 区块 × 结构／锚点／状态 ＋ 组合纪律 ＋ CSS 纪律 ＋ 红线）：
//   B-01 页面壳／B-02 KPI／B-03 表格／B-04 图表／B-05 列表／B-06 指令块／
//   B-07 详情区／B-08 折叠区／B-09 表单／B-10 空态／B-11 复制区／B-12 反馈区
//   ＋ BLOCK_STYLE_SECTIONS 闭集／blocksCss 唯一产出者／B7 禁名／AC-7 零 DOM／
//   确定性（同输入同输出，供 108–113 做快照基）
//
// 纪律（与 controls.test.mjs 同口径）：断言只读冻结常量（不硬编码第二份值）。
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  ACTION_ID_ATTR,
  CHART_KINDS,
  COPY_ACTION_IDS,
  CSS_VAR_TOKENS,
  DEFAULT_DATA_ATTR,
  SCENE_STATUS,
  STATUS_DEFAULT_TEXT,
  STATUS_KINDS,
  STYLE_FORBIDDEN_TOKENS,
  TOAST_DEFAULTS,
  buildSharedHelpersJs,
  buildStyleSheet,
  fillTemplate,
  renderActionBar,
  renderEmptyState,
  renderErrorReceipt,
  renderStatusBadge,
  renderToast,
} from '../dist/index.js';
import {
  BLOCK_STYLE_SECTIONS,
  BlocksError,
  blocksCss,
  CHART_BLOCK_VARIANTS,
  DATA_TABLE_VARIANTS,
  KPI_GRID_VARIANTS,
  LIST_ROWS_VARIANTS,
  PARAM_FORM_VARIANTS,
  SKIN_NAMES,
  renderCaliberLine,
  renderChartBlock,
  renderCopyBlock,
  renderDataTable,
  renderDetailSection,
  renderDisclosure,
  renderEmptyBlock,
  renderFeedbackBlock,
  renderKpiCard,
  renderKpiGrid,
  renderListRows,
  renderMiniBar,
  renderPageShell,
  renderParamForm,
  renderPreBlock,
  renderProseBlock,
} from '../dist/blocks.js';
import { openPage } from './blocks-geometry-probe.mjs';

const BLOCKS_DIST_URL = new URL('../dist/blocks.js', import.meta.url);

/** 断言以 BlocksError（code bad-input）抛出。 */
function assertBadInput(fn, label) {
  assert.throws(fn, (err) => err instanceof BlocksError
    && err.name === 'BlocksError'
    && err.code === 'bad-input', label);
}

/** 剥注释＋剥字符串字面量（与签名测试同口径的简化版：只判代码）。 */
function stripCode(src) {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const noLine = noBlock.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  return noLine.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""');
}

describe('DB-1／DB-2：12 区块清单与样式区闭集', () => {
  it('闭集恰 12 区（DB-1 清单逐字落定）、名字唯一', () => {
    assert.deepEqual([...BLOCK_STYLE_SECTIONS], [
      'pageShell', 'kpiCard', 'dataTable', 'chartBlock', 'listRows', 'preBlock',
      'detailSection', 'disclosure', 'paramForm', 'emptyBlock', 'copyBlock', 'feedbackBlock',
    ]);
    assert.equal(new Set(BLOCK_STYLE_SECTIONS).size, 12);
  });

  it('闭集不改写控件闭集（8 区原样，无交集污染判定面）', () => {
    for (const section of ['toast', 'actionBar', 'copyButton', 'statusBadge', 'emptyState', 'errorReceipt', 'charts', 'helpShell']) {
      assert.ok(!BLOCK_STYLE_SECTIONS.includes(section), '区块闭集不得复用控件区名：' + section);
    }
  });

  it('blocksCss 覆盖 12 区（每区注释头＋类名前缀）', () => {
    const css = blocksCss();
    assert.ok(css.length > 0, '产出恒非空');
    for (const section of BLOCK_STYLE_SECTIONS) {
      const slug = section.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
      assert.ok(css.includes('/* block-' + slug + ' */'), '缺区注释头：' + section);
      assert.ok(css.includes('.ilife-block-' + slug), '缺区类名：' + section);
    }
  });

  it('blocksCss 前缀可覆盖', () => {
    const css = blocksCss({ prefix: 'x-' });
    assert.ok(css.includes('.x-block-kpi-card'), '前缀未生效');
    assert.ok(!css.includes('.ilife-block-kpi-card'), '旧前缀残留');
  });

  it('blocksCss 只读冻结 token（全部 var(--x) ∈ CSS_VAR_TOKENS）', () => {
    const css = blocksCss();
    const used = new Set([...css.matchAll(/var\((--[A-Za-z0-9-]+)\)/g)].map((m) => m[1]));
    assert.ok(used.size > 0, '必须真的用到 token，否则断言无鉴别力');
    for (const name of used) {
      assert.ok(Object.hasOwn(CSS_VAR_TOKENS, name), '未冻结的 token：' + name);
    }
  });

  it('blocksCss 无 Q14 禁入项、无 :root 改写、无深色区、无 canvas／script', () => {
    const css = blocksCss();
    for (const forbidden of STYLE_FORBIDDEN_TOKENS) {
      assert.ok(!css.includes(forbidden), '禁入 token：' + forbidden);
    }
    assert.ok(!/:root(?![A-Za-z0-9_-])/i.test(css), '不得改写基座');
    assert.ok(!/\[\s*data-theme/i.test(css), '不得引入深色区');
    assert.ok(!/prefers-color-scheme\s*:\s*dark/i.test(css), '不得引入深色区');
    assert.ok(!css.includes('<canvas'), '不得出现 canvas');
    assert.ok(!css.includes('<script'), '不得出现 script');
  });
});

describe('B-01 页面壳', () => {
  it('标题三件套＋正文透传（正文不转义、标题转义）', () => {
    const html = renderPageShell({
      eyebrow: 'EYE', title: 'T<tle>', subtitle: 'S&b', content: '<div class="x">1</div>',
    });
    assert.ok(html.startsWith('<section class="ilife-block ilife-block-page-shell">'), '根类名：' + html.slice(0, 80));
    assert.ok(html.includes('<h1 class="ilife-block-page-shell-title">T&lt;tle&gt;</h1>'), '标题转义');
    assert.ok(html.includes('<div class="x">1</div>'), '正文透传');
    assert.ok(html.includes('ilife-block-page-shell-eyebrow') && html.includes('EYE'), 'eyebrow');
    assert.ok(html.includes('ilife-block-page-shell-subtitle') && html.includes('S&amp;b'), 'subtitle');
  });

  it('缺 title／content 非串 → bad-input', () => {
    assertBadInput(() => renderPageShell({ content: 'x' }), '缺 title');
    assertBadInput(() => renderPageShell({ title: 't', content: 7 }), 'content 非串');
    assertBadInput(() => renderPageShell({ title: '', content: 'x' }), '空 title');
  });
});

describe('B-02 KPI 卡', () => {
  it('四槽齐备＋value 行锚点', () => {
    const html = renderKpiCard({ label: 'L', value: '12', unit: 'U', detail: 'D' });
    for (const part of ['label', 'value', 'unit', 'detail']) {
      assert.ok(html.includes('ilife-block-kpi-card-' + part), '缺槽：' + part);
    }
    assert.ok(html.includes('ilife-block-kpi-card-value">12<'), 'value');
  });

  it('徽章 kind ∈ STATUS_KINDS；非法降级 empty（冻结语义）', () => {
    const html = renderKpiCard({ label: 'L', value: '1', status: 'ok' });
    assert.ok(html.includes('ilife-status-badge-ok'), 'ok 徽章');
    assert.ok(html.includes(STATUS_DEFAULT_TEXT.ok), '缺省文案取冻结表');
    const degraded = renderKpiCard({ label: 'L', value: '1', status: 'nope' });
    assert.ok(degraded.includes('ilife-status-badge-empty'), '非法降级 empty');
  });

  it('与冻结 renderStatusBadge 同构（组合不重定义）', () => {
    const inner = renderStatusBadge({ status: 'danger' });
    assert.ok(renderKpiCard({ label: 'L', value: '1', status: 'danger' }).includes(inner), '徽章必须逐字含冻结产出');
  });

  it('renderKpiGrid 组合多卡；空数组 → bad-input', () => {
    const html = renderKpiGrid([{ label: 'A', value: '1' }, { label: 'B', value: '2' }]);
    assert.ok(html.includes('ilife-block-kpi-card-grid'), '网格类');
    assert.equal((html.match(/ilife-block-kpi-card"/g) ?? []).length, 2, '两卡');
    assertBadInput(() => renderKpiGrid([]), '空数组');
  });

  it('#513 grid 标题位：不给＝零变（裸 grid 根、无标题类）；给＝标题 h2＋原 grid 串', () => {
    const bare = renderKpiGrid([{ label: 'A', value: '1' }]);
    assert.ok(!bare.includes('kpi-card-title'), '无标题');
    assert.ok(bare.startsWith('<div class="ilife-block-kpi-card-grid">'), '仍是裸 grid 根');
    const titled = renderKpiGrid([{ label: 'A', value: '1' }], { title: '今日速览' });
    assert.ok(titled.includes('<h2 class="ilife-block-kpi-card-title">今日速览</h2>'), '标题 h2');
    assert.ok(titled.endsWith(bare), '标题后即原 grid 串（页面手写形一致）');
    assert.ok(renderKpiGrid([{ label: 'A', value: '1' }], {}).startsWith('<div'), '空 opts 零变');
    assert.ok(!renderKpiGrid([{ label: 'A', value: '1' }], { title: '' }).includes('kpi-card-title'), '空串零渲染');
    assert.ok(renderKpiGrid([{ label: 'A', value: '1' }], { title: 'a&b' }).includes('a&amp;b'), '标题转义');
  });

  it('#513 grid 标题位非法入参 → bad-input（非对象 opts／on* 字段）', () => {
    assertBadInput(() => renderKpiGrid([{ label: 'A', value: '1' }], 't'), 'opts 非对象');
    assertBadInput(() => renderKpiGrid([{ label: 'A', value: '1' }], { title: 't', onclick: 'x' }), 'on* 字段');
  });

  it('缺 label／value → bad-input；五字符转义', () => {
    assertBadInput(() => renderKpiCard({ value: '1' }), '缺 label');
    const html = renderKpiCard({ label: 'a&b', value: '<1>' });
    assert.ok(html.includes('a&amp;b') && html.includes('&lt;1&gt;'), '转义');
  });

  it('#418 不给 bar＝零变；给 bar 产条（detail 后、宽内联、档类）', () => {
    const bare = renderKpiCard({ label: 'L', value: '1' });
    assert.ok(!bare.includes('kpi-card-bar'), '无条');
    const html = renderKpiCard({ label: 'L', value: '1', detail: 'D', bar: { pct: 92 } });
    assert.ok(html.includes('ilife-block-kpi-card-bar'), '条槽');
    assert.ok(html.includes('ilife-block-kpi-card-bar-fill'), '条填充');
    assert.ok(html.includes('ilife-block-kpi-card-bar-high'), '高档类');
    assert.ok(html.includes('style="width:92%"'), '内联宽度');
    assert.ok(html.indexOf('kpi-card-detail') < html.indexOf('kpi-card-bar'), '条在 detail 后');
  });

  it('#418 档位两界＋100/0 封顶；越界／非数 → bad-input', () => {
    const cls = (pct) => renderKpiCard({ label: 'L', value: '1', bar: { pct } });
    assert.ok(cls(90).includes('bar-high') && !cls(89).includes('bar-high'), '90/89 界');
    assert.ok(cls(89).includes('bar-mid') && cls(60).includes('bar-mid') && !cls(59).includes('bar-mid'), '60/59 界');
    assert.ok(cls(59).includes('bar-low'), '低档');
    assert.ok(cls(100).includes('style="width:100%"'), '封顶');
    assert.ok(cls(0).includes('style="width:0%"'), '零位');
    assertBadInput(() => cls(101), '>100');
    assertBadInput(() => cls(-1), '<0');
    assertBadInput(() => cls(NaN), 'NaN');
    assertBadInput(() => renderKpiCard({ label: 'L', value: '1', bar: { pct: 'x' } }), '非数');
    assertBadInput(() => renderKpiCard({ label: 'L', value: '1', bar: {} }), '缺 pct');
  });
});

describe('B-03 表格', () => {
  const columns = [{ key: 'k', label: 'K' }, { key: 'v', label: 'V', align: 'right' }];

  it('语义标签＋th scope＋末行无边框由 CSS 承载', () => {
    const html = renderDataTable({ columns, rows: [{ k: 'a', v: 1 }] });
    assert.ok(html.includes('<table class="ilife-block-data-table-table">'), 'table 类');
    assert.ok(html.includes('<thead>') && html.includes('<th scope="col"'), '语义表头');
    assert.ok(html.includes('<td class="ilife-block-data-table-cell-right" data-label="V">1</td>'), '右对齐+值+标签');
    const css = blocksCss();
    assert.ok(css.includes('tr:last-child td'), '末行无边框规则');
    // #567／#572-S3-3：`th` 不得再抬大写（`模拟体重（kg）` 曾被渲染成 `KG`）。
    // 反向守卫：其它选择器的大写（如眉标）不在此断言范围内，只钉 `th` 这一条。
    assert.ok(!/block-data-table th\s*\{[^}]*text-transform:\s*uppercase/.test(css), 'th 仍带 text-transform:uppercase');
    assert.ok(css.includes('background-color: transparent'), 'th 透明背景规则');
  });

  it('零行 → 空态（不渲染空表），与冻结 renderEmptyState 同构', () => {
    const html = renderDataTable({ columns, rows: [] });
    assert.ok(!html.includes('<table'), '不得渲染空表');
    assert.ok(html.includes(renderEmptyState({ text: '无数据' })), '空态逐字一致');
    assert.ok(renderDataTable({ columns, rows: [], emptyText: 'E' }).includes('>E<'), 'emptyText');
  });

  it('非法列／非法对齐／非法单元格 → bad-input；null 单元格置空', () => {
    assertBadInput(() => renderDataTable({ columns: [], rows: [] }), '空列');
    assertBadInput(() => renderDataTable({ columns: [{ key: 'k', label: 'L', align: 'up' }], rows: [] }), '非法对齐');
    assertBadInput(() => renderDataTable({ columns, rows: [{ k: {}, v: 1 }] }), '对象单元格');
    assert.ok(renderDataTable({ columns, rows: [{ k: null, v: 2 }] }).includes('<td class="ilife-block-data-table-cell-left" data-label="K"></td>'), 'null 置空（标签仍在）');
  });

  it('#513 不给 marker＝零变：无徽标类，首格与基线串逐字一致', () => {
    const html = renderDataTable({ columns, rows: [{ k: 'a', v: 1 }] });
    assert.ok(!html.includes('row-marker'), '无徽标');
    assert.ok(html.includes('<td class="ilife-block-data-table-cell-left" data-label="K">a</td>'), '首格基线逐字');
  });

  it('#513 给 marker：只进首格、转义；次格不动；空串视同缺省；非串 → bad-input', () => {
    const html = renderDataTable({ columns, rows: [{ k: 'a', v: 1, marker: '今日' }] });
    assert.ok(html.includes('<td class="ilife-block-data-table-cell-left" data-label="K"><span class="ilife-block-data-table-row-marker">今日</span>a</td>'), '徽标位');
    assert.ok(html.includes('<td class="ilife-block-data-table-cell-right" data-label="V">1</td>'), '次格不动');
    const xss = renderDataTable({ columns, rows: [{ k: 'a', v: 1, marker: '<b>&' }] });
    assert.ok(xss.includes('&lt;b&gt;&amp;') && !xss.includes('<b>'), '徽标转义');
    assert.ok(!renderDataTable({ columns, rows: [{ k: 'a', v: 1, marker: '' }] }).includes('row-marker'), '空串零渲染');
    assertBadInput(() => renderDataTable({ columns, rows: [{ k: 'a', v: 1, marker: 7 }] }), '数字 marker');
    assertBadInput(() => renderDataTable({ columns, rows: [{ k: 'a', v: 1, marker: {} }] }), '对象 marker');
  });
});

describe('B-04 图表', () => {
  it('8 kind 全部分发（产物含 viewBox 且被区块包裹）', () => {
    const inputs = {
      bar: { items: [{ label: 'a', value: 1 }] },
      line: { items: [{ label: 'a', value: 1 }] },
      donut: { items: [{ label: 'a', value: 1 }] },
      progress: { pct: 0.5 },
      combo: { bars: [{ label: 'a', value: 1 }], lines: [{ label: 'a', value: 1 }] },
      sparkline: { items: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }] },
      gauge: { pct: 0.5 },
      scatter: { items: [{ x: 1, y: 2 }] },
    };
    assert.equal(CHART_KINDS.length, 8, '前置：冻结 8 种');
    for (const kind of CHART_KINDS) {
      const html = renderChartBlock({ kind, input: inputs[kind], title: kind });
      assert.ok(html.includes('ilife-block-chart-block'), kind + ' 区块包裹');
      assert.ok(html.includes('viewBox'), kind + ' 含 viewBox');
    }
  });

  it('空数组走空态（冻结语义）；非法 kind／非法 input → bad-input；结构违规抛错透传', () => {
    const html = renderChartBlock({ kind: 'bar', input: { items: [] } });
    assert.ok(html.includes('ilife-empty'), '空走空态');
    assertBadInput(() => renderChartBlock({ kind: 'pie', input: {} }), '非法 kind');
    assertBadInput(() => renderChartBlock({ kind: 'bar', input: null }), '非法 input');
    assert.throws(() => renderChartBlock({ kind: 'bar', input: { items: [{ label: 'a' }] } }), '结构违规透传');
  });
});

describe('B-05 列表', () => {
  it('三槽＋首行无边框＋完成态删除线（CSS 承载）', () => {
    const html = renderListRows({ items: [{ left: '01', main: 'M', right: 'R', done: true }] });
    assert.ok(html.includes('role="list"'), 'role');
    for (const part of ['left', 'main', 'right']) {
      assert.ok(html.includes('ilife-block-list-rows-' + part), '缺槽：' + part);
    }
    assert.ok(html.includes('ilife-block-list-rows-row-done'), '完成态类');
    const css = blocksCss();
    assert.ok(css.includes(':first-child'), '首行规则');
    assert.ok(css.includes('text-decoration: line-through'), '删除线规则');
  });

  it('零行 → 空态；缺 main → bad-input', () => {
    assert.ok(renderListRows({ items: [] }).includes('ilife-empty'), '零行空态');
    assertBadInput(() => renderListRows({ items: [{}] }), '缺 main');
  });
});

describe('B-06 指令块', () => {
  it('载体恒为 PRE＋等宽三件套（CSS 承载）', () => {
    const html = renderPreBlock({ command: 'cmd --x', label: 'L' });
    assert.ok(html.includes('<pre class="ilife-block-pre-block-code">cmd --x</pre>'), 'PRE 载体');
    const css = blocksCss();
    assert.ok(css.includes('white-space: pre-wrap') && css.includes('overflow-x: auto'), 'pre 规则');
  });

  it('复制按钮走冻结双属性（ACTION_ID_ATTR＋DEFAULT_DATA_ATTR 分工不混用）', () => {
    const html = renderPreBlock({ command: 'c', actionId: 'my-copy' });
    assert.ok(html.includes(ACTION_ID_ATTR + '="my-copy"'), 'id 属性');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="c"'), '文本属性（缺省取 command）');
    const custom = renderPreBlock({ command: 'c', actionId: 'a', copyText: 't', copyLabel: '拷' });
    assert.ok(custom.includes(DEFAULT_DATA_ATTR + '="t"') && custom.includes('>拷<'), '覆盖');
    assert.ok(!renderPreBlock({ command: 'c' }).includes(ACTION_ID_ATTR), '无 actionId 即无按钮');
  });

  it('空命令 → bad-input（不渲染空板）', () => {
    assertBadInput(() => renderPreBlock({ command: '' }), '空命令');
  });
});

describe('B-07 详情区', () => {
  const scene = {
    id: 's1', title: 'T', wake_word: 'wake', status: '', prompt_template: 'P',
  };

  it('必填五字段逐字展示＋types 复数＋cli 行', () => {
    const html = renderDetailSection({ scene, cli: 'calorie-cmd-read s1' });
    assert.ok(html.includes('data-scene-id="s1"'), '场景 id 锚点');
    assert.ok(html.includes('>T<') && html.includes('>wake<'), '标题+唤醒词');
    assert.ok(html.includes('<pre class="ilife-block-pre-block-code ilife-block-detail-section-prompt">P</pre>'), 'prompt 全文逐字');
    assert.ok(html.includes('calorie-cmd-read s1'), 'cli 行');
  });

  it('【待开发】徽章；types 字符串走类、对象走内联配色（与 help.ts 同口径）', () => {
    const html = renderDetailSection({
      scene: { ...scene, status: '【待开发】', types: ['a', { text: 'b', bg: '#111', fg: '#eee' }] },
    });
    assert.ok(html.includes('ilife-block-detail-section-dev'), '待开发徽章');
    assert.ok(html.includes('<span class="ilife-block-detail-section-type">a</span>'), '字符串徽章');
    assert.ok(html.includes('style="background:#111;color:#eee"'), '对象配色内联');
  });

  it('缺必填／status 非法／types 非数组 → bad-input', () => {
    assertBadInput(() => renderDetailSection({ scene: { ...scene, title: '' } }), '空标题');
    assertBadInput(() => renderDetailSection({ scene: { ...scene, status: 'done' } }), '非法 status');
    assertBadInput(() => renderDetailSection({ scene: { ...scene, types: 'a' } }), 'types 非数组');
    assert.ok(SCENE_STATUS.length === 2, '前置：SCENE_STATUS 两值闭集');
  });
});

describe('B-08 折叠区', () => {
  it('原生 details／summary＋open 属性＋箭头旋转 CSS', () => {
    const html = renderDisclosure({ title: 'T', contentHtml: '<p>x</p>', open: true });
    assert.ok(html.startsWith('<details class="ilife-block ilife-block-disclosure" open>'), '原生+open');
    assert.ok(html.includes('<summary class="ilife-block-disclosure-summary">T</summary>'), 'summary');
    assert.ok(html.includes('<p>x</p>'), '内容透传');
    const css = blocksCss();
    assert.ok(css.includes('transform: rotate(90deg)') && css.includes('transition: transform .15s'), '箭头规则');
    assert.ok(!renderDisclosure({ title: 'T', contentHtml: '' }).includes(' open>'), '缺省折叠');
  });

  it('缺 title／contentHtml 非串 → bad-input', () => {
    assertBadInput(() => renderDisclosure({ title: '', contentHtml: 'x' }), '空标题');
    assertBadInput(() => renderDisclosure({ title: 'T', contentHtml: 9 }), 'content 非串');
  });
});

describe('B-09 表单', () => {
  it('label＋input＋placeholder=hint＋required 落 data 约定（零 JS）', () => {
    const html = renderParamForm({
      fields: [{ name: 'n', label: 'L', value: 'v', hint: 'H', required: true }],
      description: 'D',
      previewText: 'P',
    });
    assert.ok(html.includes('<label class="ilife-block-param-form-field">'), 'label 载体');
    assert.ok(html.includes('placeholder="H"'), 'hint 即 placeholder');
    assert.ok(html.includes('data-required="1"'), '宿主拦截约定');
    assert.ok(html.includes('>P</pre>'), '预览初始文本');
    assert.ok(!html.includes('<script'), '零 JS');
    const css = blocksCss();
    assert.ok(css.includes('min-height: 44px'), '触控目标规则');
  });

  it('空 fields／缺 name／缺 label → bad-input', () => {
    assertBadInput(() => renderParamForm({ fields: [] }), '空 fields');
    assertBadInput(() => renderParamForm({ fields: [{ label: 'L' }] }), '缺 name');
    assertBadInput(() => renderParamForm({ fields: [{ name: 'n' }] }), '缺 label');
  });
});

describe('B-09 表单只读与步进约束（#397）', () => {
  it('readonly:true 落 readonly；缺省无 readonly', () => {
    const html = renderParamForm({ fields: [{ name: 'bf', label: '体脂率', readonly: true }] });
    assert.ok(html.includes(' readonly'), '只读落属性');
    const plain = renderParamForm({ fields: [{ name: 'bf', label: '体脂率' }] });
    assert.ok(!plain.includes('readonly'), '缺省无只读');
  });

  it('step／min／max 落数字约束（皮褶口径 0.1／0／100）', () => {
    const html = renderParamForm({
      fields: [{ name: 'chest', label: '胸', step: '0.1', min: '0', max: '100' }],
    });
    assert.ok(html.includes('step="0.1"'), '步长');
    assert.ok(html.includes('min="0"'), '下界');
    assert.ok(html.includes('max="100"'), '上界');
    assert.ok(html.includes('type="number"'), '数字约束带 number 类型');
  });

  it('非法值抛 bad-input：step 非数字串／min 大于 max', () => {
    assertBadInput(() => renderParamForm({ fields: [{ name: 'n', label: 'L', step: 'abc' }] }), 'step 非数字串');
    assertBadInput(() => renderParamForm({ fields: [{ name: 'n', label: 'L', min: '10', max: '5' }] }), 'min>max');
    assertBadInput(() => renderParamForm({ fields: [{ name: 'n', label: 'L', options: [] }] }), 'options 空数组');
  });

  it('options 渲染 select 候选＋命中 selected（零 JS）', () => {
    const html = renderParamForm({
      fields: [{ name: 'source', label: '来源', value: 'gym', options: ['home_caliper', 'gym', 'hospital'] }],
    });
    assert.ok(html.includes('<select'), '下拉');
    assert.ok(html.includes('<option value="gym" selected>gym</option>'), '命中选中');
    assert.ok(html.includes('<option value="home_caliper">home_caliper</option>'), '候选齐全');
    assert.ok(!html.includes('<script'), '零 JS');
  });

  it('旧调用产物不变：不传新字段无新增属性', () => {
    const html = renderParamForm({
      fields: [{ name: 'n', label: 'L', value: 'v', hint: 'H', required: true }],
    });
    assert.ok(!html.includes('readonly'), '无只读');
    assert.ok(!html.includes('step=') && !html.includes('min=') && !html.includes('max='), '无步进约束');
    assert.ok(!html.includes('<select'), '无下拉');
  });
});

describe('B-10 空态／B-11 复制区／B-12 反馈区（组合冻结控件）', () => {
  it('B-10：冻结 emptyState 逐字内嵌＋可选标题', () => {
    const inner = renderEmptyState({ text: '空', hint: 'h' });
    const html = renderEmptyBlock({ text: '空', hint: 'h', title: 'T' });
    assert.ok(html.includes(inner), '逐字组合');
    assert.ok(html.includes('ilife-block-empty-block-title'), '区块标题');
  });

  it('B-11：冻结 actionBar 逐字内嵌＋id 缺省取 COPY_ACTION_IDS', () => {
    const html = renderCopyBlock({ dataText: 'd', logText: 'l' });
    assert.ok(html.includes(COPY_ACTION_IDS.actionBar.copyData), '数据 id 缺省');
    assert.ok(html.includes(COPY_ACTION_IDS.actionBar.copyLog), '日志 id 缺省');
    assert.ok(html.includes(renderActionBar({
      copyData: { actionId: COPY_ACTION_IDS.actionBar.copyData, label: '复制数据', text: 'd' },
      copyLog: { actionId: COPY_ACTION_IDS.actionBar.copyLog, label: '复制日志', text: 'l' },
    })), '逐字组合');
    const custom = renderCopyBlock({ dataText: 'd', dataActionId: 'x-data' });
    assert.ok(custom.includes('data-action-id="x-data"'), 'id 可覆盖');
  });

  it('B-12：toast role／aria 取冻结值＋errorReceipt 缺文本不渲染按钮（冻结语义）', () => {
    const html = renderFeedbackBlock({ toast: { msg: 'm' }, error: { message: 'e' } });
    assert.ok(html.includes(renderToast({ msg: 'm' })), 'toast 逐字组合');
    assert.ok(html.includes(renderErrorReceipt({ message: 'e' })), '回执逐字组合');
    assert.ok(html.includes('role="' + TOAST_DEFAULTS.role + '"'), 'role 取冻结值');
    assert.ok(html.includes('aria-live="' + TOAST_DEFAULTS.ariaLive + '"'), 'aria 取冻结值');
    assert.ok(!renderFeedbackBlock({ error: { message: 'e' } }).includes('data-action-id'), '缺文本无复制按钮');
    assertBadInput(() => renderFeedbackBlock({}), '两者皆无');
  });
});

describe('红线：B7 禁名／AC-7 零 DOM／确定性／转义', () => {
  it('B7 交互控件名不得是 blocks 导出', async () => {
    const mod = await import('../dist/blocks.js');
    for (const banned of ['formPrompt', 'selectList', 'smartSelect', 'confirm', 'foldBox']) {
      assert.ok(!(banned in mod), banned + ' 不得导出');
    }
  });

  it('dist/blocks.js 代码（剥字面量与注释后）零 document.／window.／navigator.', () => {
    const src = readFileSync(BLOCKS_DIST_URL, 'utf8');
    const code = stripCode(src);
    for (const needle of ['document.', 'window.', 'navigator.']) {
      assert.ok(!code.includes(needle), '代码不得出现 ' + needle);
    }
  });

  it('同输入同输出（确定性，供 108–113 快照）', () => {
    const input = { columns: [{ key: 'k', label: 'K' }], rows: [{ k: 'v' }] };
    assert.equal(renderDataTable(input), renderDataTable(input), '表格确定性');
    assert.equal(blocksCss(), blocksCss(), 'CSS 确定性');
  });

  it('五字符转义全覆盖（用户串），已组合 HTML 不二次转义', () => {
    const html = renderKpiCard({ label: '&<>"\'', value: 'v' });
    assert.ok(html.includes('&amp;&lt;&gt;&quot;&#39;'), '五字符');
    const shell = renderPageShell({ title: 't', content: '<b>&amp;</b>' });
    assert.ok(shell.includes('<b>&amp;</b>'), '组合 HTML 不二次转义');
  });

  it('内联事件处理器字段一律拒（零注入面）', () => {
    assertBadInput(() => renderKpiCard({ label: 'L', value: '1', onclick: 'x' }), 'on* 字段');
  });

  it('package.json 暴露 ./blocks 子路径（index 出口面不动）', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(pkg.exports['./blocks'], './dist/blocks.js', '子路径导出');
    assert.equal(pkg.exports['.'], './dist/index.js', '主入口不动');
  });
});

describe('STATUS_KINDS 前置口径（B-02 徽章面）', () => {
  it('冻结 4 种（含 empty 降级位）', () => {
    assert.deepEqual([...STATUS_KINDS], ['ok', 'warn', 'danger', 'empty']);
  });
});

describe('端到端（108–113 的执行前置证明）：12 区块组装内容页走 fillTemplate', () => {
  it('数据→组件→填充器全链路：12 区齐备、零标记残留', () => {
    const content = renderPageShell({
      title: '演示页',
      subtitle: '全部 12 区块一次组装',
      content: [
        renderKpiGrid([{ label: '今日热量', value: '1800', unit: 'kcal', detail: '目标 2000', status: 'ok' }]),
        renderDataTable({ columns: [{ key: 'k', label: '项' }], rows: [{ k: '早餐' }] }),
        renderChartBlock({ kind: 'bar', input: { items: [{ label: 'a', value: 1 }] }, title: '趋势' }),
        renderListRows({ items: [{ left: '01', main: '跑步', right: '30min' }] }),
        renderPreBlock({ command: 'calorie-cmd-read today', actionId: 'demo-copy' }),
        renderDetailSection({
          scene: { id: 's1', title: '场景', wake_word: 'wake', status: '', prompt_template: 'P' },
          cli: 'calorie-cmd-read s1',
        }),
        renderDisclosure({ title: '更多', contentHtml: renderListRows({ items: [{ main: 'x' }] }) }),
        renderParamForm({ fields: [{ name: 'n', label: '参数', hint: '填入数字' }] }),
        renderEmptyBlock({ text: '暂无' }),
        renderCopyBlock({ dataText: 'd', logText: 'l' }),
        renderFeedbackBlock({ toast: { msg: 'ok' } }),
      ].join(''),
    });
    for (const section of BLOCK_STYLE_SECTIONS) {
      const slug = section.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
      assert.ok(content.includes('ilife-block-' + slug), '内容缺区：' + section);
    }
    const template = '<!DOCTYPE html><html><head><meta charset="utf-8"><!--SHARED-CSS--></head>'
      + '<body><!--CONTENT--><!--SHARED-HELPERS--></body></html>';
    const out = fillTemplate({
      template,
      assets: {
        sharedCssText: buildStyleSheet().css + '\n' + blocksCss(),
        sharedHelpersJs: buildSharedHelpersJs(),
      },
      content,
    });
    assert.ok(out.html.includes('<style>') && out.html.includes('<script>'), '资产已包裹注入');
    assert.ok(!out.html.includes('<!--'), '零标记残留');
    assert.ok(out.html.includes('ilife-block-page-shell'), '壳落位');
    assert.ok(out.report.bytes > 0, '产物面 bytes');
  });
});

describe('#434 操作卡头部／结论条（公共层 pageShell 区）', () => {
  it('BLOCK_STYLE_SECTIONS 仍 12 项且不新增区', () => {
    assert.equal(BLOCK_STYLE_SECTIONS.length, 12);
    for (const name of ['opHead', 'op-head', 'conclusion']) {
      assert.ok(!BLOCK_STYLE_SECTIONS.includes(name), '不得新增样式区：' + name);
    }
  });

  it('操作卡头部基规则＋四色档＋子件规则齐备', () => {
    const css = blocksCss();
    assert.ok(css.includes('.ilife-block-op-head {'), '缺基规则');
    for (const tone of ['ok', 'warn', 'danger', 'empty']) {
      assert.ok(css.includes('.ilife-block-op-head-' + tone + ' {'), '缺色档：' + tone);
    }
    for (const part of ['icon', 'title', 'id', 'time']) {
      assert.ok(css.includes('.ilife-block-op-head-' + part + ' {'), '缺子件：' + part);
    }
    assert.ok(css.includes('border-left: 4px solid'), '左色条形态不对（crud_receipt id-card 4px）');
  });

  it('四色档色值口径（冻结 token＋D-5 常量，不碰 H-01 禁色）', () => {
    const css = blocksCss();
    assert.ok(css.includes('border-left-color: var(--ok)'), 'ok 档须走冻结 token --ok');
    assert.ok(css.includes('#a25b00'), 'warn 档须用状态徽章同源 D-5 常量');
    assert.ok(css.includes('#a83228'), 'danger 档须用状态徽章同源 D-5 常量');
    for (const bad of ['#0a84ff', '#af52de', '#ff375f', '#0071e3']) {
      assert.ok(!css.includes(bad), 'H-01 禁色：' + bad);
    }
  });

  it('结论条形态：左 3px 主色强调条仍在（#950 B2 起见：改由 ::before 承载，去月牙）', () => {
    const css = blocksCss();
    assert.ok(css.includes('.ilife-block-conclusion {'), '缺结论条规则');
    const base = css.slice(css.indexOf('.ilife-block-conclusion {'));
    const rule = base.slice(0, base.indexOf('}') + 1);
    assert.ok(rule.includes('position: relative'), '强调条的定位锚点（::before 的前提）');
    // #950 B2（用户 2026-09-24 裁定「去月牙」）：`border-left: 3px` 与 `border-radius: 14px` 同处一盒时，
    // 圆角会把那条 3px 边裁成月牙（窄屏上读成一个游离的「(」）⇒ 承载方式改成伪元素，
    // **形态口径不变**：仍是「左 3px 主色强调条」（下面两条断的就是这件事）。
    assert.ok(!rule.includes('border-left'), '`border-left` 已撤（它才是月牙的来源）');
    const before = css.slice(css.indexOf('.ilife-block-conclusion::before {'));
    const accent = before.slice(0, before.indexOf('}') + 1);
    assert.ok(accent.includes('width: 3px'), '强调条仍是 3px');
    assert.ok(accent.includes('background: var(--blue)'), '强调条仍是主色 var(--blue)');
  });
});

describe('#513 三槽 CSS 落点（既有区内加规则，不新增区、不新增 token）', () => {
  it('卡片纵向 flex 列＋徽章 margin-top:auto（贴底），8px 最小间距保留', () => {
    const css = blocksCss();
    assert.equal(css.split('.ilife-block-kpi-card-badge {').length - 1, 1, '徽章基座规则恰 1 条');
    assert.ok(css.includes('flex-direction: column'), '卡片纵向');
    const badgeBlock = css.slice(css.indexOf('.ilife-block-kpi-card-badge {'));
    const badge = badgeBlock.slice(0, badgeBlock.indexOf('}') + 1);
    assert.ok(badge.includes('margin-top: auto'), '徽章吃余量贴底');
    assert.ok(badge.includes('padding-top: 8px'), '最小间距保留');
    assert.ok(!badge.includes('margin-top: 8px'), '旧顶距已替换');
  });

  it('行徽标规则在 dataTable 区：只走冻结 token', () => {
    const css = blocksCss();
    assert.ok(css.includes('.ilife-block-data-table-row-marker {'), '行徽标规则');
    const markerBlock = css.slice(css.indexOf('.ilife-block-data-table-row-marker {'));
    const rule = markerBlock.slice(0, markerBlock.indexOf('}') + 1);
    assert.ok(rule.includes('var(--soft)') && rule.includes('var(--blue2)'), '只走冻结 token');
    assert.ok(rule.includes('white-space: nowrap'), '徽标不断行');
  });

  it('三族段标题同字号同字重：kpi-card-title 与 chart／copy 的 title 同档', () => {
    const css = blocksCss();
    const sizeOf = (cls) => {
      const m = new RegExp('\\.' + cls + ' \\{[^}]*font-size:\\s*([^;]+);[^}]*font-weight:\\s*([^;]+);').exec(css);
      assert.ok(m, '缺标题规则：' + cls);
      return m[1].trim() + '/' + m[2].trim();
    };
    assert.equal(sizeOf('ilife-block-kpi-card-title'), '15px/700', 'kpi 标题档');
    assert.equal(sizeOf('ilife-block-kpi-card-title'), sizeOf('ilife-block-chart-block-title'), '与图表标题同档');
    assert.equal(sizeOf('ilife-block-kpi-card-title'), sizeOf('ilife-block-copy-block-title'), '与复制区标题同档');
  });
});

describe('#860 正文段落件 renderProseBlock（页面级，不进 12 项闭集）', () => {
  it('闭集仍 12 项且不新增区（prose 只追加页面级件）', () => {
    assert.equal(BLOCK_STYLE_SECTIONS.length, 12);
    for (const name of ['prose', 'proseBlock', 'block-prose']) {
      assert.ok(!BLOCK_STYLE_SECTIONS.includes(name), '不得新增样式区：' + name);
    }
  });

  it('text 纯文本：p 根类＋五字符转义（与区块层同源 esc）', () => {
    const html = renderProseBlock({ text: '先把辣椒切丝 <b>&' });
    assert.ok(html.startsWith('<p class="ilife-block-prose">'), '根类逐字：' + html);
    assert.ok(html.includes('先把辣椒切丝 &lt;b&gt;&amp;'), '未按冻结表转义：' + html);
    assert.ok(!html.includes('<b>'), '原始尖括号不得进产物');
    assert.ok(html.endsWith('</p>'), '须闭合 p：' + html);
  });

  it('html 受信透传：div 根类＋内容逐字（调用方已自行转义）', () => {
    const html = renderProseBlock({ html: 'Roux <strong>roux</strong>' });
    assert.equal(html, '<div class="ilife-block-prose">Roux <strong>roux</strong></div>', '受信位须逐字透传');
  });

  it('空串出空串且不抛（没内容不留空块）', () => {
    assert.equal(renderProseBlock({ text: '' }), '', 'text 空串须出空串');
    assert.equal(renderProseBlock({ html: '' }), '', 'html 空串须出空串');
  });

  it('缺参／非字符串／两位同给 → bad-input 并点名到字段', () => {
    assertBadInput(() => renderProseBlock({}), '两位全缺');
    assertBadInput(() => renderProseBlock(), '缺参');
    assertBadInput(() => renderProseBlock(null), 'null 非对象');
    assertBadInput(() => renderProseBlock({ text: null }), 'text null');
    assertBadInput(() => renderProseBlock({ text: 7 }), 'text 数字');
    assertBadInput(() => renderProseBlock({ html: 7 }), 'html 数字');
    assertBadInput(() => renderProseBlock({ text: 'a', html: 'b' }), '两位同给');
    for (const [input, field] of [
      [{ text: null }, 'input.text'],
      [{ text: 7 }, 'input.text'],
      [{ html: 7 }, 'input.html'],
      [{ text: 'a', html: 'b' }, 'input.text'],
      [{}, 'input.text'],
    ]) {
      assert.throws(() => renderProseBlock(input), (err) => err.code === 'bad-input'
        && typeof err.message === 'string' && err.message.includes(field), '消息须点名 ' + field);
    }
  });

  it('样式随 pageShell 区落盘：15px／1.7／只取冻结 --fg（字面量 #333 即红并点名）', () => {
    const css = blocksCss();
    assert.ok(css.includes('.ilife-block-prose {'), '缺正文段落规则');
    const rule = css.slice(css.indexOf('.ilife-block-prose {'));
    const body = rule.slice(0, rule.indexOf('}') + 1);
    assert.ok(body.includes('font-size: 15px'), '字号须 15px（与正文同档）：' + body);
    assert.ok(body.includes('line-height: 1.7'), '行高须 1.7：' + body);
    assert.ok(body.includes('color: var(--fg)'), '色值只许冻结 token --fg：' + body);
    assert.ok(!body.includes('#'), '色值字面量（如 #333）不得进本条规则：' + body);
    const used = new Set([...body.matchAll(/var\((--[A-Za-z0-9-]+)\)/g)].map((m) => m[1]));
    for (const name of used) {
      assert.ok(Object.hasOwn(CSS_VAR_TOKENS, name), '未冻结的 token：' + name);
    }
  });
});

describe('#870 复制区说明行（`renderCopyBlock({ hint })`，页面级子件）', () => {
  it('闭集仍 12 项且不新增区（copyBlock-hint 只追加页面级子件）', () => {
    assert.equal(BLOCK_STYLE_SECTIONS.length, 12);
    for (const name of ['copyBlockHint', 'copy-block-hint', 'copyHint']) {
      assert.ok(!BLOCK_STYLE_SECTIONS.includes(name), '不得新增样式区：' + name);
    }
  });

  it('不给 hint → 不出那一行（既有调用方产物逐字节不变）', () => {
    const before = renderCopyBlock({ dataText: 'd', logText: 'l' });
    const implied = renderCopyBlock({ dataText: 'd', logText: 'l', hint: undefined });
    assert.equal(before, implied, 'undefined 与不给须同产物');
    assert.ok(!before.includes('ilife-block-copy-block-hint'), '不给 hint 不得出说明行：' + before);
  });

  it('给 hint → h2 之后、动作排之前恰一行 p.ilife-block-copy-block-hint（五字符转义同源 esc）', () => {
    const html = renderCopyBlock({ title: '拿去做什么', hint: '复制数据存笔记 <b>&', dataText: 'd' });
    assert.ok(html.includes('<p class="ilife-block-copy-block-hint">'), '缺说明行：' + html);
    assert.ok(html.includes('复制数据存笔记 &lt;b&gt;&amp;'), '未按冻结表转义：' + html);
    assert.ok(!html.includes('<b>'), '原始尖括号不得进产物');
    const iTitle = html.indexOf('<h2 ');
    const iHint = html.indexOf('<p class="ilife-block-copy-block-hint">');
    const iBar = html.indexOf('<div class="ilife-action-bar">');
    assert.ok(iTitle >= 0 && iTitle < iHint, '说明行须在标题之后');
    assert.ok(iBar >= 0 && iHint < iBar, '说明行须在动作排之前');
    assert.equal(html.split('ilife-block-copy-block-hint').length - 1, 1, '恰一行说明行');
  });

  it('hint 给空串／非字符串 → bad-input 并点名 input.hint（不静默吞）', () => {
    for (const bad of ['', null, 7, {}]) {
      assertBadInput(() => renderCopyBlock({ dataText: 'd', hint: bad }), 'hint = ' + String(bad));
      assert.throws(() => renderCopyBlock({ dataText: 'd', hint: bad }), (err) => err.code === 'bad-input'
        && typeof err.message === 'string' && err.message.includes('input.hint'), '消息须点名 input.hint');
    }
  });

  it('样式随 pageShell 区落盘：12px／1.5／只取冻结 --fg2（字面量色值即红并点名）', () => {
    const css = blocksCss();
    assert.ok(css.includes('.ilife-block-copy-block-hint {'), '缺复制区说明行规则');
    const rule = css.slice(css.indexOf('.ilife-block-copy-block-hint {'));
    const body = rule.slice(0, rule.indexOf('}') + 1);
    assert.ok(body.includes('font-size: 12px'), '字号须 12px（正文类下限，与口径行同档）：' + body);
    assert.ok(body.includes('line-height: 1.5'), '行高须 1.5：' + body);
    assert.ok(body.includes('color: var(--fg2)'), '色值只许冻结 token --fg2：' + body);
    assert.ok(!body.includes('#'), '色值字面量不得进本条规则：' + body);
    const used = new Set([...body.matchAll(/var\((--[A-Za-z0-9-]+)\)/g)].map((m) => m[1]));
    for (const name of used) {
      assert.ok(Object.hasOwn(CSS_VAR_TOKENS, name), '未冻结的 token：' + name);
    }
  });
});

/* ══════════════════════════════════════════════════════════════
 * #950 回灌（六件形态回灌既有函数）：读数格／字段行／图表框／数据表／条目行组
 *   规格＝`docs/base/base-render/回灌既有件-设计.md` §1–§6（本席唯一规格来源）。
 *   判据**只许追加**：本组不动上面任何一条既有断言；「缺省逐字节不变」由每组的①条钉住。
 *   母版（设计 §7）：① 缺省零变化（三种缺省写法 ＋ 写死期望串）；② 两档几何（390／1280 **容器**宽度、
 *   视口恒 1440，零横向溢出；能起 headless Chrome ＋ CDP 就真量，起不来退回确定性几何判据并打印原因）；
 *   ③ 三套皮肤下标记逐字节相同 ＋ 标记不含 `ilife-skin-`。
 * ══════════════════════════════════════════════════════════════ */

/* ── 母版小件 ─────────────────────────────────────────────────────── */

/** 样式段里**选择器逐字相等**的规则清单（口径同 `test/ui-fix-154.test.mjs` 的 `declsOf`）。 */
function rulesOf(css) {
  const out = [];
  for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
    if (selector === '') continue;
    out.push({ selector, body: m[2] });
  }
  return out;
}

/** 某选择器**基座规则**（选择器逐字相等）的规则体：取**首条**（同选择器在多个 at-rule 档里各写一条是既有写法，
 *  例如 `.ilife-block-page-shell .ilife-block-kpi-card-grid` 的 1024／640 两档）；「恰 1 条」由 `ruleCount` 断。 */
function ruleBodyOf(css, selector) {
  const hits = rulesOf(css).filter((r) => r.selector === selector);
  assert.ok(hits.length >= 1, '缺规则：' + selector);
  return hits[0].body;
}

/** 某选择器**基座规则**的条数（≠1 就是「给同一个类又写了一条同名基础规则」的味道）。 */
const ruleCount = (css, selector) => rulesOf(css).filter((r) => r.selector === selector).length;

/** 一个 at-rule 的段内正文（按花括号配平）；`needle` 给了就取**含它**的那一段（同名前缀可能有好几段）。 */
function atRuleBody(css, head, needle) {
  const spans = [];
  for (let i = 0; i < css.length; i += 1) {
    if (!css.startsWith(head, i)) continue;
    const open = css.indexOf('{', i);
    let depth = 0;
    for (let k = open; k < css.length; k += 1) {
      if (css[k] === '{') depth += 1;
      else if (css[k] === '}') {
        depth -= 1;
        if (depth === 0) { spans.push({ at: i, body: css.slice(open + 1, k) }); break; }
      }
    }
  }
  assert.ok(spans.length > 0, '缺 at-rule：' + head);
  if (needle === undefined) return spans[0];
  const hit = spans.find((s) => s.body.includes(needle));
  assert.ok(hit !== undefined, head + ' 里找不到含「' + needle + '」的那一段');
  return hit;
}

/** 一段 at-rule 正文里的「选择器 ｜ 声明」逐条摊平（用来对账两段是不是同一批事实）。 */
function declLines(text) {
  const out = [];
  for (const m of text.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
    if (selector === '') continue;
    const decls = m[2].split(';').map((s) => s.trim()).filter((s) => s !== '');
    out.push(selector + ' ｜ ' + decls.join('; '));
  }
  return out;
}

/** 母版 ③：各套皮肤下标记逐字节相同（这些函数不吃皮肤，标记面必须恒同）＋ 标记里不出现皮肤类名。
 *  前置只断「本该在的那几套还在」——**不是**断"闭集恰是三套"：闭集是会随需要长的，
 *  早先写死 `length === 3`，2026-09-24 皮肤扩到六套（terminal／ink／blueprint）时把六个回灌组一起判红。 */
function assertSkinStable(build, label) {
  for (const s of ['paper', 'broadsheet', 'neutral']) {
    assert.ok(SKIN_NAMES.includes(s), label + '：前置——皮肤闭集少了 ' + s);
  }
  const first = build();
  for (const s of SKIN_NAMES) {
    assert.equal(build(), first, label + '：' + s + ' 皮肤下标记须逐字节相同');
  }
  assert.ok(!first.includes('ilife-skin-'), label + '：标记里不得出现皮肤类名：' + first);
}

/** 非法入参：`bad-input` 且消息点名到字段（不静默吞）。 */
function assertBadInputNaming(fn, field, label) {
  assertBadInput(fn, label);
  assert.throws(fn, (err) => err.code === 'bad-input'
    && typeof err.message === 'string' && err.message.includes(field), label + ' 消息须点名 ' + field);
}

/* ── 母版 ②：两档几何（真机 headless Chrome ＋ CDP；起不来退成确定性几何判据） ── */

const GEOM_WIDTHS = [390, 1280];

/** `[件名, 产物, 量的选择器清单]`——根件在前、件内子件在后，一律量 `[data-piece][data-w] > .host` 之下。 */
const GEOM_PIECES = [
  ['kpi-flat', () => renderKpiGrid([
    { label: '甲', value: '1234', unit: 'kcal', detail: '目标 2000', bar: { pct: 62 } },
    { label: '乙', value: '7:12', detail: '副语一句' },
    { label: '丙', value: '3' },
    { label: '丁', value: '4' },
  ], { variant: 'flat', title: '四格' }),
  '.ilife-block-kpi-card-flat, .ilife-block-kpi-card-grid, .ilife-block-kpi-card'],
  ['param-grid', () => renderParamForm({
    variant: 'grid',
    description: '描述一行',
    fields: [
      { name: 'a', label: '甲', unit: '元', helpText: '一直看得见的一行说明，长到需要折行的那种' },
      { name: 'b', label: '乙', error: '超出上限，改成 0–100 之间的值' },
      { name: 'c', label: '丙', value: 'v', hint: 'H' },
      { name: 'd', label: '丁', options: ['x', 'y'] },
    ],
  }), '.ilife-block-param-form-grid, .ilife-block-param-form-fields, .ilife-block-param-form-control'],
  ['chart-annotated', () => renderChartBlock({
    kind: 'bar',
    input: { items: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }] },
    title: '图表标题',
    variant: 'annotated',
    unit: '单位：卡',
    caliber: '口径一 ｜ 口径二 ｜ 口径三',
  }), '.ilife-block-chart-block-annotated, .ilife-block-chart-block-head, .ilife-block-chart-block-caliber'],
  ['table-carded', () => renderDataTable({
    variant: 'carded',
    caption: '表注一行',
    columns: [{ key: 'k', label: '项' }, { key: 'p', label: '占比', align: 'right', bar: true }],
    rows: [
      { k: '一行挺长的文本，用来试折行的那种', p: 40 },
      { k: 'b', p: 101, marker: '今日' },
    ],
    footnote: '口径：甲 ｜ 乙',
  }), '.ilife-block-data-table-carded, .ilife-block-data-table-table, .ilife-block-data-table-bar, .ilife-block-data-table-footnote'],
  ['list-two-line', () => renderListRows({
    variant: 'two-line',
    items: [
      { left: '07:40', main: '主行文本', right: '360', unit: '卡', note: '副语一行，长到要折行的那种副语' },
      { main: '没有副语的一行' },
    ],
  }), '.ilife-block-list-rows-two-line, .ilife-block-list-rows-row, .ilife-block-list-rows-main'],
];

/** 真机页面：五件 × 两档容器宽度各一格（容器宽 390／1280，视口恒 1440）。 */
function geometryPage() {
  const cells = [];
  for (const [name, build] of GEOM_PIECES) {
    for (const w of GEOM_WIDTHS) {
      cells.push('<div class="stg" data-piece="' + name + '" data-w="' + w + '" style="width:' + w + 'px">'
        + '<div class="host">' + build() + '</div></div>');
    }
  }
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><style>\n'
    + 'html,body{margin:0;padding:0;background:#f5f5f7}\n.stg{margin:0 0 16px;overflow:hidden}\n.host{display:block}\n'
    + blocksCss() + '\n</style></head>\n<body>\n' + cells.join('\n') + '\n</body></html>';
}

let machine = null;
let machineWhy = '';

before(async () => {
  if (process.env.ILIFE_T950_NO_MACHINE === '1') {
    machineWhy = 'ILIFE_T950_NO_MACHINE=1（按静态几何判据跑）';
    return;
  }
  try {
    machine = await openPage(geometryPage(), { port: 9950, viewportWidth: 1440 });
  } catch (e) {
    machine = null;
    machineWhy = String(e && e.message ? e.message : e);
  }
  if (machine === null) {
    console.log('真机未跑：' + machineWhy + ' ⇒ ② 退回确定性几何判据（收缩三件套在场性）');
  } else {
    console.log('真机：headless Chrome ＋ CDP 起来了，五件 × 两档（' + GEOM_WIDTHS.join('／') + '）溢出一律真量');
  }
});

after(() => { if (machine !== null) machine.close(); });

/** 起不来时的确定性几何判据：能让内容在容不下时收缩的那几处声明必须在场（否则「不溢出」无从谈起）。 */
function assertStaticGeometry() {
  const css = blocksCss();
  const need = [
    ['.ilife-block-kpi-card-flat', 'container-type: inline-size'],
    ['.ilife-block-kpi-card-flat .ilife-block-kpi-card-grid', 'minmax(0, 1fr)'],
    ['.ilife-block-kpi-card-flat .ilife-block-kpi-card-value', 'font-size: 30px'],
    ['.ilife-block-kpi-card-value', 'overflow-wrap: anywhere'],
    ['.ilife-block-param-form-grid', 'container-type: inline-size'],
    ['.ilife-block-param-form-grid .ilife-block-param-form-fields', 'minmax(0, 1fr)'],
    ['.ilife-block-param-form-grid .ilife-block-param-form-fields > *', 'min-width: 0'],
    ['.ilife-block-param-form-help', 'overflow-wrap: anywhere'],
    ['.ilife-block-chart-block-head', 'flex-wrap: wrap'],
    ['.ilife-block-chart-block-caliber', 'overflow-wrap: anywhere'],
    ['.ilife-block-data-table', 'overflow-x: auto'],
    ['.ilife-block-list-rows-two-line .ilife-block-list-rows-main', 'white-space: normal'],
    ['.ilife-block-list-rows-note', 'overflow-wrap: anywhere'],
  ];
  for (const [selector, decl] of need) {
    const body = ruleBodyOf(css, selector);
    assert.ok(body !== undefined, '缺规则：' + selector);
    assert.ok(body.includes(decl), selector + ' 缺声明：' + decl);
  }
  assert.ok(atRuleBody(css, '@container (min-width: 461px)', 'block-kpi-card-grid').body
    .includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), '缺两列容器档（读数格）');
  assert.ok(atRuleBody(css, '@container (min-width: 461px)', 'block-param-form-fields').body
    .includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), '缺两列容器档（字段组）');
}

/** 母版 ②：一件 × 两档。真机量 `scrollWidth ≤ clientWidth`；起不来则断收缩三件套。 */
async function assertGeometry(piece) {
  if (machine === null) {
    assertStaticGeometry();
    return;
  }
  const childSel = GEOM_PIECES.find(([name]) => name === piece)[2];
  for (const w of GEOM_WIDTHS) {
    const host = '[data-piece="' + piece + '"][data-w="' + w + '"] > .host';
    const boxes = await machine.ev('window.__t950Box(' + JSON.stringify(host) + ',' + JSON.stringify(childSel) + ')');
    assert.equal(boxes.length, 1, piece + '/' + w + '：定宽容器里的根件须恰一只：' + JSON.stringify(boxes));
    const b = boxes[0];
    assert.ok(b.root.scroll <= b.root.client, piece + '/' + w + ' 根件横溢：' + JSON.stringify(b.root));
    assert.ok(b.kids.length > 0, piece + '/' + w + '：没量到件内子件（选择器写错？）');
    for (const k of b.kids) {
      assert.ok(k.scroll <= k.client, piece + '/' + w + ' 子件横溢：' + JSON.stringify(k));
    }
  }
}

/* ── ① 读数格 `metric-grid` → `renderKpiGrid`（形态 `'flat'`，设计 §1） ── */

describe('#950 回灌 · 读数格（renderKpiGrid flat）', () => {
  const CARDS = [{ label: 'A', value: '1' }];
  /** 改前产物（写死；与三种缺省写法逐字相等是①条的牙）。 */
  const BASE = '<div class="ilife-block-kpi-card-grid">'
    + '<div class="ilife-block ilife-block-kpi-card">'
    + '<div class="ilife-block-kpi-card-label">A</div>'
    + '<div class="ilife-block-kpi-card-value-row"><span class="ilife-block-kpi-card-value">1</span></div>'
    + '</div></div>';

  it('① 缺省零变化：三种缺省写法逐字节相同，且与写死的改前期望串逐字相等', () => {
    assert.equal(renderKpiGrid(CARDS), BASE, '不给 opts 即改前产物');
    assert.equal(renderKpiGrid(CARDS, {}), BASE, '空 opts 即改前产物');
    assert.equal(renderKpiGrid(CARDS, { variant: 'cards' }), BASE, '显式 cards 即改前产物');
    assert.ok(!BASE.includes('kpi-card-flat'), '缺省产物不得出现新类名');
    assert.deepEqual([...KPI_GRID_VARIANTS], ['cards', 'flat'], '形态闭集逐字（设计 §1.3）');
  });

  it('② 新形态产物结构：多一层 -flat 容器、内层仍是裸 -grid 根、标题仍在前', () => {
    const flat = renderKpiGrid(CARDS, { variant: 'flat' });
    assert.ok(flat.startsWith('<div class="ilife-block-kpi-card-flat"><div class="ilife-block-kpi-card-grid">'), flat);
    assert.ok(flat.endsWith('</div></div>'), flat);
    assert.ok(flat.includes(BASE), '换排面不换卡：逐卡与网格产物一字不动：' + flat);
    assert.equal(ruleCount(blocksCss(), '.ilife-block-kpi-card-flat'), 1, '新类名的基座规则恰 1 条');
    assert.equal(renderKpiGrid(CARDS, { title: 'T', variant: 'flat' }),
      '<h2 class="ilife-block-kpi-card-title">T</h2>' + flat, '标题仍排在形态容器之前');
    assert.equal(renderKpiCard(CARDS[0]), renderKpiCard(CARDS[0]), '卡本身与形态无关（渲染纯函数）');
  });

  it('③ variant 非法值逐个 bad-input 并点名 variant', () => {
    for (const bad of ['carpet', '', 7, null, []]) {
      assertBadInputNaming(() => renderKpiGrid(CARDS, { variant: bad }), 'variant', 'variant = ' + JSON.stringify(bad));
    }
  });

  it('④ 样式段增量：-flat 规则在位、发丝线兜底链逐字在场、无 :root／!important／ellipsis', () => {
    const css = blocksCss();
    const flat = '.ilife-block-kpi-card-flat';
    assert.ok(ruleBodyOf(css, flat).includes('container-type: inline-size'), '容器声明');
    const grid = ruleBodyOf(css, flat + ' .ilife-block-kpi-card-grid');
    assert.ok(grid.includes('display: grid') && grid.includes('grid-template-columns: minmax(0, 1fr)')
      && grid.includes('gap: 0'), '窄档单列：' + grid);
    assert.equal(ruleCount(css, flat + ' .ilife-block-kpi-card-grid'), 2, '窄档单列 ＋ 容器两列各一条');
    assert.ok(ruleBodyOf(css, flat + ' .ilife-block-kpi-card-value').includes('font-size: 30px'), '主数字提一档');
    const seg = css.slice(css.indexOf('@container (min-width: 461px)'), css.indexOf('/* block-data-table */'));
    assert.ok(seg.includes('repeat(2, minmax(0, 1fr))'), '两列档');
    assert.ok(seg.includes('border-radius: 0') && seg.includes('background: none') && seg.includes('box-shadow: none'),
      '去框三件套：' + seg);
    assert.equal(seg.split('1px solid var(--ilife-line, var(--line, #d2d2d7))').length - 1, 2,
      '两处发丝线都须走 skinVar(\'line\') 的兜底链');
    assert.ok(!seg.includes('text-overflow'), '新形态不许新增 ellipsis');
    for (const bad of [':root', '!important']) assert.ok(!seg.includes(bad), '禁入：' + bad);
  });

  it('⑤ 源序：新规则排在区内两条媒体规则之后；src/blocks.ts 源码零手写 var(--ilife-', () => {
    const css = blocksCss();
    const sec = css.slice(css.indexOf('/* block-kpi-card */'), css.indexOf('/* block-data-table */'));
    const iNew = sec.indexOf('.ilife-block-kpi-card-flat {');
    const iWide = sec.indexOf('@media (min-width: 1024px)');
    const iNarrow = sec.indexOf('@media (max-width: 640px)');
    assert.ok(iWide >= 0 && iNarrow >= 0, '前置：两条既有媒体规则仍在位');
    assert.ok(iNew > iWide && iNew > iNarrow,
      '设计 §1.7：本节最脆的一处——同特异性下先到者胜，新规则必须排在两条媒体规则之后');
    assert.ok(iNew > sec.indexOf('.ilife-block-kpi-card-title {'), '新规则排在区尾部');
    const src = readFileSync(new URL('../src/blocks.ts', import.meta.url), 'utf8');
    assert.ok(!/var\(\s*--ilife-/.test(src), '源码里不许手写 var(--ilife-…)（色值一律经 skinVar()）');
  });

  it('⑥ 两档几何 390／1280：-flat 与每张卡零横向溢出（真机 CDP；起不来退确定性几何判据）', async () => {
    await assertGeometry('kpi-flat');
  });

  it('⑦ 三套皮肤下标记逐字节相同（渲三次相等 ＋ 标记不含皮肤类名）', () => {
    assertSkinStable(() => renderKpiGrid(CARDS, { variant: 'flat' }), 'kpi-flat');
  });
});

/* ── ② 字段行 `field-row` → `renderParamForm`（形态 `'grid'`，设计 §2） ── */

describe('#950 回灌 · 字段行（renderParamForm grid）', () => {
  const FIELDS = [{ name: 'n', label: 'L', value: 'v', hint: 'H', required: true }];
  /** 改前产物（写死；与 B-09 那条既有写法逐字相等是①条的牙）。 */
  const BASE = '<div class="ilife-block ilife-block-param-form">'
    + '<label class="ilife-block-param-form-field">'
    + '<span class="ilife-block-param-form-label">L<span class="ilife-block-param-form-required" aria-hidden="true"> *</span></span>'
    + '<input class="ilife-block-param-form-input" name="n" value="v" placeholder="H" data-required="1" required />'
    + '</label></div>';

  it('① 缺省零变化：三种缺省写法逐字节相同，且与 B-09 写死的期望串逐字相等', () => {
    assert.equal(renderParamForm({ fields: FIELDS }), BASE, '不给 variant 即改前产物');
    assert.equal(renderParamForm({ fields: FIELDS, variant: 'stack' }), BASE, '显式 stack 即改前产物');
    assert.equal(renderParamForm({ fields: FIELDS, variant: undefined }), BASE, '显式 undefined 即改前产物');
    assert.ok(!BASE.includes('param-form-grid') && !BASE.includes('param-form-fields'), '缺省不得出现新类名');
    assert.ok(!BASE.includes('-unit') && !BASE.includes('-help') && !BASE.includes('-error'), '缺省不得出现新字段槽');
    assert.deepEqual([...PARAM_FORM_VARIANTS], ['stack', 'grid'], '形态闭集逐字（设计 §2.3）');
  });

  it('② grid 结构：根多 -grid、-fields 只包字段、-description 与 -preview 留在它外', () => {
    const html = renderParamForm({ fields: FIELDS, description: 'D', previewText: 'P', variant: 'grid' });
    assert.ok(html.startsWith('<div class="ilife-block ilife-block-param-form ilife-block-param-form-grid">'), html);
    const iDesc = html.indexOf('<p class="ilife-block-param-form-description">D</p>');
    const iFields = html.indexOf('<div class="ilife-block-param-form-fields">');
    const iLabel = html.indexOf('<label class="ilife-block-param-form-field">');
    const iFieldsClose = html.indexOf('</div>', iFields);
    const iPreview = html.indexOf('ilife-block-param-form-preview');
    assert.ok(iDesc >= 0 && iDesc < iFields, '说明行在字段组之外（前）');
    assert.ok(iFields >= 0 && iFields < iLabel && iFieldsClose > iLabel, '字段组包住全部字段');
    assert.ok(iPreview > iFieldsClose, '预览留在字段组之外（后）');
    assert.equal(html.split('ilife-block-param-form-fields').length - 1, 1, '字段组恰一层');
    assert.ok(renderParamForm({ fields: FIELDS, variant: 'grid' }).includes(BASE.slice(BASE.indexOf('<label'), -6)),
      'grid 不改字段本身：既有字段产物逐字在场');
  });

  it('③ 三个字段槽的结构与次序：控件 → -help → -error；unit 在控件右侧；id 逐字', () => {
    const html = renderParamForm({ fields: [{ name: 'n', label: 'L', unit: '元', helpText: 'H2', error: 'E2' }] });
    const iControl = html.indexOf('<span class="ilife-block-param-form-control">');
    const iInput = html.indexOf('<input class="ilife-block-param-form-input"');
    const iUnit = html.indexOf('<span class="ilife-block-param-form-unit">元</span>');
    const iHelp = html.indexOf('<span class="ilife-block-param-form-help" id="ilife-param-form-n-help">H2</span>');
    const iError = html.indexOf('<span class="ilife-block-param-form-error" id="ilife-param-form-n-error">要改：E2</span>');
    assert.ok(iControl >= 0 && iInput > iControl, '-control 包住控件');
    assert.ok(iUnit > iInput, '单位后缀在控件右侧');
    assert.ok(iHelp > iUnit && iError > iHelp, '次序：控件 → -help → -error');
    assert.equal(html.split('ilife-block-param-form-unit').length - 1, 1, '单位后缀恰一枚');
    assert.equal(html.split('ilife-block-param-form-help').length - 1, 1, '说明行恰一行');
    assert.equal(html.split('ilife-block-param-form-error').length - 1, 1, '错误行恰一行');
    const noUnit = renderParamForm({ fields: [{ name: 'n', label: 'L' }] });
    assert.ok(!noUnit.includes('-control'), '不给 unit 即不包 -control（产物与改前逐字节相同）');
    const sel = renderParamForm({ fields: [{ name: 'n', label: 'L', options: ['a'], unit: '元' }] });
    assert.ok(sel.includes('<span class="ilife-block-param-form-unit">元</span>'), '下拉同样支持单位后缀');
  });

  it('④ error 给定时控件落 aria-invalid ＋ aria-describedby（只指向实际存在的那几行）', () => {
    const onlyError = renderParamForm({ fields: [{ name: 'n', label: 'L', error: 'e' }] });
    assert.ok(onlyError.includes(' aria-invalid="true"'), onlyError);
    assert.ok(onlyError.includes(' aria-describedby="ilife-param-form-n-error"'),
      '只给 error 时只指向 -error：' + onlyError);
    const onlyHelp = renderParamForm({ fields: [{ name: 'n', label: 'L', helpText: 'h' }] });
    assert.ok(!onlyHelp.includes('aria-invalid'), '没给 error 不许有 aria-invalid');
    assert.ok(onlyHelp.includes(' aria-describedby="ilife-param-form-n-help"'), onlyHelp);
    const both = renderParamForm({ fields: [{ name: 'n', label: 'L', helpText: 'h', error: 'e' }] });
    assert.ok(both.includes(' aria-describedby="ilife-param-form-n-help ilife-param-form-n-error"'), both);
    const none = renderParamForm({ fields: [{ name: 'n', label: 'L' }] });
    assert.ok(!none.includes('aria-describedby') && !none.includes('aria-invalid'), '三槽全不给＝零 aria：' + none);
    assert.ok(renderParamForm({ fields: [{ name: 'n', label: 'L', options: ['a'], error: 'e' }] })
      .includes(' aria-invalid="true"'), '下拉也落 aria-invalid');
  });

  it('⑤ 非法入参逐条 bad-input 并点名', () => {
    for (const bad of ['carpet', '', 7, null, []]) {
      assertBadInputNaming(() => renderParamForm({ fields: FIELDS, variant: bad }), 'variant', 'variant = ' + JSON.stringify(bad));
    }
    const mk = (extra) => () => renderParamForm({ fields: [{ name: 'n', label: 'L', ...extra }] });
    assertBadInputNaming(mk({ unit: '' }), 'input.fields[0].unit', 'unit 空串');
    assertBadInputNaming(mk({ unit: 7 }), 'input.fields[0].unit', 'unit 非串');
    assertBadInputNaming(mk({ helpText: 7 }), 'input.fields[0].helpText', 'helpText 非串');
    assertBadInputNaming(mk({ error: '' }), 'input.fields[0].error', 'error 空串');
    assertBadInputNaming(mk({ error: {} }), 'input.fields[0].error', 'error 非串');
    assert.equal(renderParamForm({ fields: [{ name: 'n', label: 'L', helpText: '' }] }).includes('-help'), false,
      'helpText 空串＝不给这一行（与 optText 同口径）');
  });

  it('⑥ 样式段增量：新规则在位、三处兜底链逐字在场、无 :root／!important；既有基座规则计数不变', () => {
    const css = blocksCss();
    const sec = css.slice(css.indexOf('/* block-param-form */'));
    const rules = [
      '.ilife-block-param-form-grid',
      '.ilife-block-param-form-grid .ilife-block-param-form-fields',
      '.ilife-block-param-form-grid .ilife-block-param-form-fields > *',
      '.ilife-block-param-form-control',
      '.ilife-block-param-form-control .ilife-block-param-form-input',
      '.ilife-block-param-form-unit',
      '.ilife-block-param-form-help',
      '.ilife-block-param-form-error',
    ];
    for (const sel of rules) assert.ok(ruleBodyOf(sec, sel) !== undefined, '缺规则：' + sel);
    assert.equal(ruleCount(sec, '.ilife-block-param-form-grid .ilife-block-param-form-fields'), 2,
      '窄档单列 ＋ 容器两列各一条（同选择器两档，是既有写法）');
    assert.ok(atRuleBody(sec, '@container (min-width: 461px)').body.includes('repeat(2, minmax(0, 1fr))'), '两列容器档');
    assert.ok(sec.includes('var(--ilife-ink-2, var(--fg2, #6e6e73))'), 'unit 兜底链逐字');
    assert.ok(sec.includes('var(--ilife-ink-3, var(--fg3, #86868b))'), 'help 兜底链逐字');
    assert.ok(sec.includes('var(--ilife-danger, #a83228)'), 'error 兜底链逐字');
    assert.ok(!sec.includes(':root') && !sec.includes('!important'), '禁入项');
    for (const cls of ['-input', '-label', '-field']) {
      assert.equal(ruleCount(css, '.ilife-block-param-form' + cls), 1, cls + ' 的基座规则仍恰 1 条（新规则带祖先前缀）');
    }
  });

  it('⑦ 两档几何 390／1280：字段组／控件零横向溢出（真机 CDP；起不来退确定性几何判据）', async () => {
    await assertGeometry('param-grid');
  });

  it('⑧ 三套皮肤下标记逐字节相同 ＋ 触控目标（-input 的 min-height: 44px 仍在）', () => {
    assertSkinStable(() => renderParamForm({
      variant: 'grid', fields: [{ name: 'n', label: 'L', unit: '元', error: 'e' }],
    }), 'param-grid');
    assert.ok(ruleBodyOf(blocksCss(), '.ilife-block-param-form-input').includes('min-height: 44px'), '触控目标不动');
    assert.ok(ruleBodyOf(blocksCss(), '.ilife-block-param-form-control').includes('gap: 8px'), '相邻间距 ≥8px');
  });
});

/* ── ④ 图表框 `chart-frame` → `renderChartBlock`（形态 `'annotated'`，设计 §4） ── */

describe('#950 回灌 · 图表框（renderChartBlock annotated）', () => {
  const CHART = { items: [{ label: 'a', value: 1 }] };
  const base = () => renderChartBlock({ kind: 'bar', input: CHART, title: 'T' });

  it('① 缺省零变化：三种缺省写法逐字节相同；title 仍是 section 的直接子元素', () => {
    const bare = base();
    assert.ok(bare.startsWith('<section class="ilife-block ilife-block-chart-block"><h2 class="ilife-block-chart-block-title">T</h2>'),
      'plain 形态不许被头栏包住：' + bare.slice(0, 120));
    assert.ok(!bare.includes('-annotated') && !bare.includes('-head') && !bare.includes('-caliber'), '缺省不得出现新类名');
    assert.equal(renderChartBlock({ kind: 'bar', input: CHART, title: 'T', variant: 'plain' }), bare, '显式 plain');
    assert.equal(renderChartBlock({ kind: 'bar', input: CHART, title: 'T', variant: undefined }), bare, '显式 undefined');
    assert.ok(bare.includes('<h2 class="ilife-block-chart-block-title">T</h2>'
      + '<div class="ilife-block-chart-block-canvas">'), 'h2 与画布相邻、仍是 section 的直接子元素');
    assert.deepEqual([...CHART_BLOCK_VARIANTS], ['plain', 'annotated'], '形态闭集逐字（设计 §4.3）');
  });

  it('② annotated 结构：根多 -annotated、头栏含标题与单位、脚注在 -canvas 之后', () => {
    const html = renderChartBlock({
      kind: 'bar', input: CHART, title: 'T', variant: 'annotated', unit: '单位：卡', caliber: '口径',
    });
    assert.ok(html.startsWith('<section class="ilife-block ilife-block-chart-block ilife-block-chart-block-annotated">'), html);
    assert.ok(html.includes('<div class="ilife-block-chart-block-head">'
      + '<h2 class="ilife-block-chart-block-title">T</h2>'
      + '<span class="ilife-block-chart-block-unit">单位：卡</span></div>'), '头栏两件：' + html);
    const iCanvas = html.indexOf('<div class="ilife-block-chart-block-canvas">');
    const iCaliber = html.indexOf('<div class="ilife-block-chart-block-caliber">');
    assert.ok(iCanvas >= 0 && iCaliber > iCanvas, '脚注排在画布之后');
    assert.ok(html.endsWith('</section>'), html);
    const onlyCaliber = renderChartBlock({ kind: 'bar', input: CHART, variant: 'annotated', caliber: 'c' });
    assert.ok(!onlyCaliber.includes('-head'), '只有 caliber 的框不出空头栏');
    const onlyUnit = renderChartBlock({ kind: 'bar', input: CHART, variant: 'annotated', unit: 'U' });
    assert.ok(onlyUnit.includes('-head') && !onlyUnit.includes('-caliber'), '只有 unit 的框出头栏、无脚注');
  });

  it('③ 脚注逐字含 renderCaliberLine 产物（含拆段那条路径）', () => {
    for (const caliber of ['一句话口径', '甲 ｜ 乙 ｜ 丙']) {
      const html = renderChartBlock({ kind: 'bar', input: CHART, variant: 'annotated', caliber });
      assert.ok(html.includes('<div class="ilife-block-chart-block-caliber">' + renderCaliberLine(caliber) + '</div>'),
        '脚注必须走口径行唯一产出器：' + html);
    }
    assert.ok(renderChartBlock({ kind: 'bar', input: CHART, variant: 'annotated', caliber: '甲 ｜ 乙' })
      .includes('<span>甲</span> <span>乙</span>'), '拆段路径照旧（`｜` 由产出器拆）');
  });

  it('④ 非法入参逐条 bad-input 并点名', () => {
    for (const bad of ['carpet', '', 7, null]) {
      assertBadInputNaming(() => renderChartBlock({ kind: 'bar', input: CHART, variant: bad }), 'variant',
        'variant = ' + JSON.stringify(bad));
    }
    assertBadInputNaming(() => renderChartBlock({ kind: 'bar', input: CHART, unit: 'U' }), 'input.unit', 'plain 下给 unit');
    assertBadInputNaming(() => renderChartBlock({ kind: 'bar', input: CHART, caliber: 'c' }), 'input.caliber', 'plain 下给 caliber');
    assertBadInputNaming(() => renderChartBlock({ kind: 'bar', input: CHART, variant: 'annotated' }), 'input.caliber',
      'annotated 下两位全缺');
    assertBadInputNaming(() => renderChartBlock({ kind: 'bar', input: CHART, variant: 'annotated', unit: '' }),
      'input.unit', 'unit 空串');
    assertBadInputNaming(() => renderChartBlock({ kind: 'bar', input: CHART, variant: 'annotated', caliber: 7 }),
      'input.caliber', 'caliber 非串');
  });

  it('⑤ 8 个 kind 在 annotated 下都仍分发到 charts（含空态／非法 kind／结构违规透传）', () => {
    const inputs = {
      bar: { items: [{ label: 'a', value: 1 }] },
      line: { items: [{ label: 'a', value: 1 }] },
      donut: { items: [{ label: 'a', value: 1 }] },
      progress: { pct: 0.5 },
      combo: { bars: [{ label: 'a', value: 1 }], lines: [{ label: 'a', value: 1 }] },
      sparkline: { items: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }] },
      gauge: { pct: 0.5 },
      scatter: { items: [{ x: 1, y: 2 }] },
    };
    for (const kind of CHART_KINDS) {
      const html = renderChartBlock({
        kind, input: inputs[kind], title: kind, variant: 'annotated', unit: 'U', caliber: 'c',
      });
      assert.ok(html.includes('viewBox'), kind + ' 含 viewBox');
      assert.ok(html.includes('ilife-block-chart-block-annotated'), kind + ' 带形态类');
    }
    assertBadInput(() => renderChartBlock({ kind: 'pie', input: {}, variant: 'annotated', unit: 'U' }), '非法 kind');
    assert.throws(() => renderChartBlock({
      kind: 'bar', input: { items: [{ label: 'a' }] }, variant: 'annotated', unit: 'U',
    }), '结构违规仍透传抛错');
    assert.ok(renderChartBlock({ kind: 'bar', input: { items: [] }, variant: 'annotated', unit: 'U' })
      .includes('ilife-empty'), '空数组仍走冻结空态');
  });

  it('⑥ 样式段增量：四条新规则在位、两处兜底链逐字在场、`-head .-title` 是祖先前缀覆盖', () => {
    const css = blocksCss();
    const sec = css.slice(css.indexOf('/* block-chart-block */'), css.indexOf('/* block-list-rows */'));
    const head = ruleBodyOf(sec, '.ilife-block-chart-block-head');
    for (const decl of ['display: flex', 'flex-wrap: wrap', 'align-items: baseline', 'gap: 4px 10px']) {
      assert.ok(head.includes(decl), '-head 缺声明：' + decl + '：' + head);
    }
    assert.ok(ruleBodyOf(sec, '.ilife-block-chart-block-head .ilife-block-chart-block-title').includes('margin: 0'),
      '覆盖既有下边距，必须是祖先前缀写法');
    assert.ok(ruleBodyOf(sec, '.ilife-block-chart-block-unit').includes('var(--ilife-ink-3, var(--fg3, #86868b))'), 'unit 兜底链');
    const cal = ruleBodyOf(sec, '.ilife-block-chart-block-caliber');
    assert.ok(cal.includes('1px solid var(--ilife-line, var(--line, #d2d2d7))'), 'caliber 兜底链');
    assert.ok(cal.includes('overflow-wrap: anywhere'), '脚注整行折行（不横向溢出）');
    assert.ok(ruleBodyOf(sec, '.ilife-block-chart-block-caliber > .ilife-block-caliber').includes('margin: 0'),
      '内层口径行边距归零');
    assert.equal(ruleCount(css, '.ilife-block-chart-block-title'), 1, '既有标题基座规则仍恰 1 条');
    assert.ok(!sec.includes(':root') && !sec.includes('!important'), '禁入项');
  });

  it('⑦ 两档几何 ＋ 三套皮肤标记逐字节相同', async () => {
    await assertGeometry('chart-annotated');
    assertSkinStable(() => renderChartBlock({
      kind: 'bar', input: CHART, title: 'T', variant: 'annotated', unit: 'U', caliber: 'c',
    }), 'chart-annotated');
  });
});

/* ── ⑤ 数据表 `data-table` → `renderDataTable`（形态 `'carded'` ＋ `bar`／`footnote`，设计 §5） ── */

describe('#950 回灌 · 数据表（renderDataTable carded／bar／footnote）', () => {
  const COLUMNS = [{ key: 'k', label: 'K' }];
  const ROWS = [{ k: 'a' }];
  /** 改前产物（写死；四种缺省写法逐字相等是①条的牙）。 */
  const BASE = '<div class="ilife-block ilife-block-data-table"><table class="ilife-block-data-table-table">'
    + '<thead><tr><th scope="col" class="ilife-block-data-table-cell-left">K</th></tr></thead>'
    + '<tbody><tr><td class="ilife-block-data-table-cell-left" data-label="K">a</td></tr></tbody></table></div>';

  it('① 缺省零变化：四种缺省写法逐字节相同；rows: [] 仍走既有空态', () => {
    assert.equal(renderDataTable({ columns: COLUMNS, rows: ROWS }), BASE, '不给 variant 即改前产物');
    assert.equal(renderDataTable({ columns: COLUMNS, rows: ROWS, variant: 'plain' }), BASE, '显式 plain');
    assert.equal(renderDataTable({ columns: COLUMNS, rows: ROWS, footnote: undefined }), BASE, 'footnote 显式 undefined');
    assert.equal(renderDataTable({ columns: [{ key: 'k', label: 'K', bar: false }], rows: ROWS }), BASE, 'bar 显式 false');
    assert.deepEqual([...DATA_TABLE_VARIANTS], ['plain', 'carded'], '形态闭集逐字（设计 §5.3）');
    const empty = renderDataTable({ columns: COLUMNS, rows: [] });
    assert.ok(!empty.includes('<table'), '零行不渲染空表');
    assert.ok(empty.includes(renderEmptyState({ text: '无数据' })), '既有空态逐字');
    assert.ok(!empty.includes('-carded') && !empty.includes('-footnote'), '空态分支不挂新形态类');
  });

  it('② carded 结构：根多 -carded；data-label／row-marker／align 三件套照旧', () => {
    const html = renderDataTable({ columns: COLUMNS, rows: [{ k: 'a', marker: '今日' }], variant: 'carded' });
    assert.ok(html.startsWith('<div class="ilife-block ilife-block-data-table ilife-block-data-table-carded">'), html);
    assert.ok(html.includes(' data-label="K"'), 'data-label 照旧');
    assert.ok(html.includes('<span class="ilife-block-data-table-row-marker">今日</span>a<'), '行徽标照旧');
    assert.ok(html.includes('<th scope="col" class="ilife-block-data-table-cell-left">K</th>'), '列头对齐类照旧');
    assert.ok(!renderDataTable({ columns: COLUMNS, rows: ROWS }).includes('-carded'), '不给 variant 即不带形态类');
  });

  it('③ 既有 ≤640 段逐字节不变（写死基线 sha256）＋ 卡化声明只住在那一段里', () => {
    const css = blocksCss();
    const wide = atRuleBody(css, '@media (max-width: 640px)', 'block-data-table-table');
    const digest = createHash('sha256').update(Buffer.from(wide.body, 'utf8')).digest('hex').slice(0, 16);
    assert.equal(digest, '0b963a7b6d0c4676',
      '既有 ≤640 段文本被改动了（设计 §5.1 不变量 1：这一段改前改后逐字节相同）');
    assert.ok(declLines(wide.body).length >= 12, '前置：这段真的有一批声明，断言才有鉴别力');
    // 卡化标签（`td::before` 的 `data-label`）只许住在那一段里：媒体段之外出现即「桌面档也吃卡化」，
    // 那正是 `table-mobile-t541` ③／`rowcard-caliber-t154r3` ③ 三条既有判据的断点。
    const rest = css.replace(wide.body, '');
    assert.ok(!rest.includes('attr(data-label)'), '卡化标签落到了 ≤640 段之外（桌面档会吃卡化）');
    assert.equal(css.split('@container (max-width: 560px)').length - 1, 0,
      '容器档卡化段本轮不落：它与 #541／#547／t154-r3 三条既有判据真冲突（见设计席交裁记录）');
  });

  it('④ carded 覆盖的写法：新类名基座恰 1 条；既有基座与横滑兜底一字不动', () => {
    const css = blocksCss();
    assert.equal(ruleCount(css, '.ilife-block-data-table-carded'), 1, '新类名的基座规则恰 1 条');
    const carded = ruleBodyOf(css, '.ilife-block-data-table-carded');
    assert.ok(carded.includes('container-type: inline-size'), carded);
    assert.ok(!carded.includes('overflow-x'), '根上的横滑兜底不许撤（卡化未落在容器档，撤了会变成可见溢出）');
    assert.equal(ruleCount(css, '.ilife-block-data-table'), 1, '既有根基座规则仍恰 1 条');
    assert.ok(ruleBodyOf(css, '.ilife-block-data-table').includes('overflow-x: auto'), '既有横滑兜底（141 处调用点的）一字不改');
    assert.equal(ruleCount(css, '.ilife-block-mini-bar'), 1, '迷你条基座规则仍恰 1 条');
    assert.ok(ruleBodyOf(css, '.ilife-block-mini-bar').includes('width: 72px'), '基座 72px 不动');
    assert.ok(ruleBodyOf(css, '.ilife-block-data-table-bar .ilife-block-mini-bar').includes('width: auto'),
      '覆盖写在 -bar 后代选择器里');
    assert.ok(!css.split('.ilife-block-data-table-bar .ilife-block-mini-bar')[1].includes('width: 72px'), '不重复声明基座值');
  });

  it('⑤ bar 列结构：迷你条逐字复用 renderMiniBar 的产物、百分数在右、align 类名照旧', () => {
    const cols = [{ key: 'p', label: 'P', align: 'right', bar: true }];
    const html = renderDataTable({ columns: cols, rows: [{ p: 40 }] });
    assert.ok(html.includes('<td class="ilife-block-data-table-cell-right" data-label="P">'
      + '<span class="ilife-block-data-table-bar">' + renderMiniBar({ pct: 40 })
      + '<span class="ilife-block-data-table-bar-pct">40%</span></span></td>'), '条逐字复用产出器：' + html);
    assert.ok(renderDataTable({ columns: [{ key: 'p', label: 'P', bar: true }], rows: [{ p: 40 }] })
      .includes('ilife-block-data-table-cell-left'), 'bar 列不擅自改 align（缺省仍是 left）');
    assert.ok(ruleBodyOf(blocksCss(), '.ilife-block-data-table-bar-pct').includes('text-align: right'), '百分数贴右');
  });

  it('⑥ bar 列验值：非数点名拒、越界夹取、缺值写 — 且不画条', () => {
    const cols = [{ key: 'p', label: 'P', align: 'right', bar: true }];
    for (const bad of ['x', {}, NaN, Infinity, true]) {
      assertBadInputNaming(() => renderDataTable({ columns: cols, rows: [{ p: bad }] }), 'input.rows[0].p',
        'bar 值 = ' + String(bad));
    }
    const over = renderDataTable({ columns: cols, rows: [{ p: 101 }] });
    assert.ok(over.includes('aria-label="100%"') && over.includes('>100%<'), '越界夹取到 100%');
    assert.ok(renderDataTable({ columns: cols, rows: [{ p: -1 }] }).includes('>0%<'), '下界夹取到 0%');
    const dash = renderDataTable({ columns: cols, rows: [{ p: null }] });
    assert.ok(dash.includes('\u2014'), '缺值写 —：' + dash);
    assert.ok(!dash.includes('ilife-block-data-table-bar'), '缺值不画条');
    assert.ok(!renderDataTable({ columns: cols, rows: [{ p: undefined }] }).includes('ilife-block-data-table-bar'),
      'undefined 同样不画条');
    const trusted = renderDataTable({ columns: cols, rows: [{ p: 40 }], cellHtml: () => '<b>X</b>' });
    assert.ok(trusted.includes('<b>X</b>') && !trusted.includes('ilife-block-data-table-bar'), 'cellHtml 受信透传优先');
  });

  it('⑦ footnote：逐字走 renderCaliberLine；位置在 </table> 之后、根 </div> 之前；空串／非串拒', () => {
    const html = renderDataTable({ columns: COLUMNS, rows: ROWS, footnote: '甲 ｜ 乙' });
    assert.ok(html.includes('<div class="ilife-block-data-table-footnote">' + renderCaliberLine('甲 ｜ 乙') + '</div>'),
      '脚注必须走口径行唯一产出器：' + html);
    const iTable = html.indexOf('</table>');
    const iFoot = html.indexOf('<div class="ilife-block-data-table-footnote">');
    assert.ok(iTable >= 0 && iFoot > iTable, '脚注在表之后');
    assert.ok(html.endsWith('</table><div class="ilife-block-data-table-footnote">'
      + renderCaliberLine('甲 ｜ 乙') + '</div></div>'), '脚注须在根 </div> 之前');
    assert.ok(renderDataTable({ columns: COLUMNS, rows: ROWS }).endsWith('</table></div>'), '不给脚注＝根内只有表');
    assertBadInputNaming(() => renderDataTable({ columns: COLUMNS, rows: ROWS, footnote: '' }), 'input.footnote', '空串');
    assertBadInputNaming(() => renderDataTable({ columns: COLUMNS, rows: ROWS, footnote: 7 }), 'input.footnote', '非串');
  });

  it('⑧ 非法入参逐条 bad-input 并点名', () => {
    for (const bad of ['carpet', '', 7, null]) {
      assertBadInputNaming(() => renderDataTable({ columns: COLUMNS, rows: ROWS, variant: bad }), 'variant',
        'variant = ' + JSON.stringify(bad));
    }
    assertBadInputNaming(() => renderDataTable({ columns: [{ key: 'k', label: 'K', bar: 'yes' }], rows: ROWS }),
      'input.columns[0].bar', 'bar 非布尔');
    assertBadInputNaming(() => renderDataTable({ columns: COLUMNS, rows: ROWS, footnote: {} }), 'input.footnote', 'footnote 对象');
  });

  it('⑨ 两档几何（容器外零横溢；窄档仍走既有横滑兜底）＋ 三套皮肤标记逐字节相同', async () => {
    if (machine === null) {
      assertStaticGeometry();
    } else {
      const childSel = '.ilife-block-data-table-carded, .ilife-block-data-table-table, .ilife-block-data-table-bar,'
        + ' .ilife-block-data-table-footnote';
      for (const w of GEOM_WIDTHS) {
        const host = '[data-piece="table-carded"][data-w="' + w + '"] > .host';
        const boxes = await machine.ev('window.__t950Box(' + JSON.stringify(host) + ',' + JSON.stringify(childSel) + ')');
        assert.equal(boxes.length, 1, w + '：定宽容器里的根件须恰一只');
        assert.ok(boxes[0].root.scroll <= boxes[0].root.client,
          w + ' 件把容器撑开了：' + JSON.stringify(boxes[0].root));
        assert.ok(boxes[0].kids.length > 0, w + '：没量到件内子件');
        if (w === 1280) {
          for (const k of boxes[0].kids) assert.ok(k.scroll <= k.client, w + ' 子件横溢：' + JSON.stringify(k));
        } else {
          // 窄容器（视口恒 1440）：既有视口媒体档不命中 ⇒ 靠根上 `overflow-x: auto` 兜底（容器内部横滑，
          // 件本身不把容器撑开）。这是本轮 `'carded'` 的诚实读数——容器驱动卡化未交付（见③条交裁记录）。
          assert.ok(ruleBodyOf(blocksCss(), '.ilife-block-data-table').includes('overflow-x: auto'), '横滑兜底在场');
        }
      }
    }
    assertSkinStable(() => renderDataTable({
      columns: [{ key: 'p', label: 'P', align: 'right', bar: true }], rows: [{ p: 40 }], variant: 'carded', footnote: 'f',
    }), 'table-carded');
  });
});

/* ── ⑥ 条目行组 `list-rows` → `renderListRows`（形态 `'two-line'`，设计 §6） ── */

describe('#950 回灌 · 条目行组（renderListRows two-line）', () => {
  const ITEMS = [{ left: '01', main: 'M', right: 'R', done: true }];
  /** 改前产物（写死；与两种缺省写法逐字相等是①条的牙）。 */
  const BASE = '<div class="ilife-block ilife-block-list-rows" role="list">'
    + '<div class="ilife-block-list-rows-row ilife-block-list-rows-row-done">'
    + '<span class="ilife-block-list-rows-left">01</span><span class="ilife-block-list-rows-main">M</span>'
    + '<span class="ilife-block-list-rows-right">R</span></div></div>';

  it('① 缺省零变化：两种缺省写法逐字节相同；items: [] 仍走既有空态；缺 main 仍 bad-input', () => {
    assert.equal(renderListRows({ items: ITEMS }), BASE, '不给 variant 即改前产物');
    assert.equal(renderListRows({ items: ITEMS, variant: 'one-line' }), BASE, '显式 one-line');
    assert.ok(!BASE.includes('two-line') && !BASE.includes('-main-line') && !BASE.includes('-note'), '缺省不得出现新类名');
    assert.deepEqual([...LIST_ROWS_VARIANTS], ['one-line', 'two-line'], '形态闭集逐字（设计 §6.3）');
    const empty = renderListRows({ items: [] });
    assert.ok(empty.includes(renderEmptyState({ text: '无数据' })), '既有空态逐字');
    assert.ok(!empty.includes('two-line'), '空态分支不带形态类');
    assertBadInput(() => renderListRows({ items: [{}] }), '缺 main');
  });

  it('② two-line 结构：根多 -two-line；行级类名与次序一字不动；-main 内两件；-right 内 -unit', () => {
    const html = renderListRows({
      variant: 'two-line',
      items: [{ left: '07:40', main: 'M', right: '360', unit: '卡', note: 'N', done: true }, { main: 'M2' }],
    });
    assert.ok(html.startsWith('<div class="ilife-block ilife-block-list-rows ilife-block-list-rows-two-line" role="list">'), html);
    assert.ok(html.includes('<div class="ilife-block-list-rows-row ilife-block-list-rows-row-done">'), '行级修饰类一字不动');
    assert.ok(html.includes('<span class="ilife-block-list-rows-main"><span class="ilife-block-list-rows-main-line">M</span>'
      + '<span class="ilife-block-list-rows-note">N</span></span>'), '中槽两件');
    assert.ok(html.includes('<span class="ilife-block-list-rows-right">360<span class="ilife-block-list-rows-unit">卡</span></span>'),
      '右槽与单位子件');
    assert.ok(html.includes('ilife-block-list-rows-row-no-left'), '缺 left 的行仍走既有判定');
    assert.ok(!/ilife-block-list-rows-row-two-line|list-rows-two-line-row/.test(html), '形态类不加在行上');
  });

  it('③ two-line 且某行无 note：-main-line 仍出、-note 不出（骨架恒在、槽随参）', () => {
    const html = renderListRows({ variant: 'two-line', items: [{ main: 'M2' }] });
    assert.ok(html.includes('<span class="ilife-block-list-rows-main-line">M2</span>'), '骨架恒在：' + html);
    assert.ok(!html.includes('-note'), '没给 note 即不出副语');
    const oneLine = renderListRows({ items: [{ main: 'M2' }] });
    assert.ok(!oneLine.includes('-main-line') && !oneLine.includes('-note'), '既有形态仍是裸文本');
  });

  it('④ 非法入参逐条 bad-input 并点名', () => {
    for (const bad of ['carpet', '', 7, null]) {
      assertBadInputNaming(() => renderListRows({ items: ITEMS, variant: bad }), 'variant', 'variant = ' + JSON.stringify(bad));
    }
    const mk = (extra) => () => renderListRows({ items: [{ main: 'M', ...extra }] });
    assertBadInputNaming(mk({ note: 'N' }), 'input.items[0].note', 'one-line 下给 note');
    assertBadInputNaming(mk({ unit: '卡' }), 'input.items[0].unit', 'one-line 下给 unit');
    assertBadInputNaming(() => renderListRows({ variant: 'two-line', items: [{ main: 'M', note: '' }] }),
      'input.items[0].note', 'note 空串');
    assertBadInputNaming(() => renderListRows({ variant: 'two-line', items: [{ main: 'M', note: 7 }] }),
      'input.items[0].note', 'note 非串');
    assertBadInputNaming(() => renderListRows({ variant: 'two-line', items: [{ main: 'M', unit: 7 }] }),
      'input.items[0].unit', 'unit 非串');
  });

  it('⑤ done 与两行式的组合：-row-done 仍在行上；主行删除线规则在 -two-line 下仍在位', () => {
    const html = renderListRows({ variant: 'two-line', items: [{ main: 'M', done: true }] });
    assert.ok(html.includes('ilife-block-list-rows-row-done'), '完成态类仍在行上：' + html);
    const css = blocksCss();
    const done = ruleBodyOf(css, '.ilife-block-list-rows-two-line .ilife-block-list-rows-row-done .ilife-block-list-rows-main-line');
    assert.ok(done.includes('text-decoration: line-through'), done);
    assert.ok(done.includes('var(--ilife-ok, var(--ok, #34c759))'), '成功色走皮肤兜底链（完成态两个信号照旧）');
    assert.equal(ruleCount(css, '.ilife-block-list-rows-row-done .ilife-block-list-rows-main'), 1, '既有完成态规则仍在');
  });

  it('⑥ 样式段增量：新规则在位、两处兜底链逐字在场、覆盖写法是祖先前缀、基座规则计数不变', () => {
    const css = blocksCss();
    const sec = css.slice(css.indexOf('/* block-list-rows */'), css.indexOf('/* block-pre-block */'));
    const rules = [
      '.ilife-block-list-rows-two-line .ilife-block-list-rows-row',
      '.ilife-block-list-rows-two-line .ilife-block-list-rows-main',
      '.ilife-block-list-rows-two-line .ilife-block-list-rows-right',
      '.ilife-block-list-rows-main-line',
      '.ilife-block-list-rows-note',
      '.ilife-block-list-rows-unit',
    ];
    for (const sel of rules) assert.ok(ruleBodyOf(sec, sel) !== undefined, '缺规则：' + sel);
    const main = ruleBodyOf(sec, '.ilife-block-list-rows-two-line .ilife-block-list-rows-main');
    assert.ok(main.includes('text-overflow: clip') && main.includes('white-space: normal'), '取消 ellipsis 只在新形态：' + main);
    assert.ok(ruleBodyOf(sec, '.ilife-block-list-rows-two-line .ilife-block-list-rows-row').includes('min-height: 56px'));
    assert.ok(sec.includes('var(--ilife-ink-3, var(--fg3, #86868b))'), 'ink-3 兜底链逐字');
    assert.ok(sec.includes('var(--ilife-ok, var(--ok, #34c759))'), 'ok 兜底链逐字');
    for (const cls of ['-row', '-row-no-left', '-left', '-main', '-right']) {
      assert.equal(ruleCount(css, '.ilife-block-list-rows' + cls), 1, cls + ' 的基座规则仍恰 1 条（新规则带祖先前缀）');
    }
    assert.equal(ruleCount(css, '.ilife-block-list-rows-row-done .ilife-block-list-rows-main'), 1,
      '完成态那条既有规则仍恰 1 条（-row-done 从来只有这条）');
    assert.equal(ruleBodyOf(css, '.ilife-block-list-rows-row')
      .includes('grid-template-columns: minmax(44px, auto) minmax(0, 1fr) auto'), true, '#567 D2 的轨定义一字不动');
    assert.ok(!sec.includes(':root') && !sec.includes('!important'), '禁入项');
  });

  it('⑦ 两档几何（-main-line／-note 折行、-right 不折）＋ 三套皮肤标记逐字节相同', async () => {
    await assertGeometry('list-two-line');
    assert.ok(ruleBodyOf(blocksCss(), '.ilife-block-list-rows-two-line .ilife-block-list-rows-right')
      .includes('white-space: nowrap'), '右读数与单位恒 nowrap');
    assertSkinStable(() => renderListRows({
      variant: 'two-line', items: [{ left: '07:40', main: 'M', right: '360', unit: '卡', note: 'N' }],
    }), 'list-two-line');
  });
});
