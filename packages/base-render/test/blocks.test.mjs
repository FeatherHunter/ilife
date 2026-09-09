// #104 B1 区块组件整合守卫测试（node:test；随 root `pnpm test` 跑）。
//
// 覆盖（12 区块 × 结构／锚点／状态 ＋ 组合纪律 ＋ CSS 纪律 ＋ 红线）：
//   B-01 页面壳／B-02 KPI／B-03 表格／B-04 图表／B-05 列表／B-06 指令块／
//   B-07 详情区／B-08 折叠区／B-09 表单／B-10 空态／B-11 复制区／B-12 反馈区
//   ＋ BLOCK_STYLE_SECTIONS 闭集／blocksCss 唯一产出者／B7 禁名／AC-7 零 DOM／
//   确定性（同输入同输出，供 108–113 做快照基）
//
// 纪律（与 controls.test.mjs 同口径）：断言只读冻结常量（不硬编码第二份值）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
  renderPageShell,
  renderParamForm,
  renderPreBlock,
} from '../dist/blocks.js';

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

  it('缺 label／value → bad-input；五字符转义', () => {
    assertBadInput(() => renderKpiCard({ value: '1' }), '缺 label');
    const html = renderKpiCard({ label: 'a&b', value: '<1>' });
    assert.ok(html.includes('a&amp;b') && html.includes('&lt;1&gt;'), '转义');
  });
});

describe('B-03 表格', () => {
  const columns = [{ key: 'k', label: 'K' }, { key: 'v', label: 'V', align: 'right' }];

  it('语义标签＋th scope＋末行无边框由 CSS 承载', () => {
    const html = renderDataTable({ columns, rows: [{ k: 'a', v: 1 }] });
    assert.ok(html.includes('<table class="ilife-block-data-table-table">'), 'table 类');
    assert.ok(html.includes('<thead>') && html.includes('<th scope="col"'), '语义表头');
    assert.ok(html.includes('<td class="ilife-block-data-table-cell-right">1</td>'), '右对齐+值');
    const css = blocksCss();
    assert.ok(css.includes('tr:last-child td'), '末行无边框规则');
    assert.ok(css.includes('text-transform: uppercase'), 'th 大写规则');
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
    assert.ok(renderDataTable({ columns, rows: [{ k: null, v: 2 }] }).includes('<td class="ilife-block-data-table-cell-left"></td>'), 'null 置空');
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
