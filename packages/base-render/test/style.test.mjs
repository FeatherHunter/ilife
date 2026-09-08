/** #75 共享样式资产（契约 §3.2／§6.2）行为测试。
 *
 * 纪律（防「假绿」，契约 doc:1015／C-25）：
 * 1. 期望值**一律从冻结常量派生**（`CSS_VAR_TOKENS`／`CONTROL_STYLE_SECTIONS`／
 *    `STYLE_FORBIDDEN_TOKENS`／`STATUS_KINDS`／`TOAST_ICONS`／`ACTION_BAR_KINDS`／
 *    `TOAST_DEFAULTS`／`ACTION_BAR_DEFAULTS`），**不自造第二份 token 表**（doc:303／C-21）；
 * 2. 类名断言分三向：① 8 个区各有真实规则；② 产出 CSS 的类名**全部**有产出者（无臆造）；
 *    ③ 产出器的类名**全部**被 CSS 覆盖（无漏配）；
 * 3. `charts` 区文本必须与 `charts.ts` 的唯一产出者 `chartsCss()` **逐字节相等**（防重述）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  ACTION_BAR_KINDS,
  ACTION_BAR_DEFAULTS,
  CONTROL_STYLE_SECTIONS,
  CSS_VAR_TOKENS,
  DATA_SCRIPT_TYPE,
  DEFAULT_DATA_SCRIPT_ID,
  STATUS_KINDS,
  STYLE_FORBIDDEN_TOKENS,
  STYLE_PREFIX,
  STYLE_SHEET_ID,
  STYLE_TOKENS,
  STYLE_VERSION,
  TEMPLATE_MARKERS,
  TOAST_DEFAULTS,
  TOAST_ICONS,
  buildSharedHelpersJs,
  buildStyleSheet,
  fillTemplate,
  renderActionBar,
  renderEmptyState,
  renderErrorReceipt,
  renderStatusBadge,
  renderToast,
} from '../dist/index.js';
import { chartsCss } from '../dist/charts.js';
import { TemplateError } from '../dist/template.js';

const LF = String.fromCharCode(10);
const SRC_STYLE = readFileSync(new URL('../src/style.ts', import.meta.url), 'utf8');
const SRC_CHARTS = readFileSync(new URL('../src/charts.ts', import.meta.url), 'utf8');
const SRC_CONTROLS = readFileSync(new URL('../src/controls.ts', import.meta.url), 'utf8');
const SRC_HELP = readFileSync(new URL('../src/help.ts', import.meta.url), 'utf8');
const SELF = readFileSync(fileURLToPath(import.meta.url), 'utf8');

/** 冻结 token 名（顺序即常量声明序）。 */
const TOKEN_NAMES = Object.keys(CSS_VAR_TOKENS);

/** 8 个样式区的**真实类名**（逐条来自产出器实测，见每行 `file:line`）。
 *  `ns` = 命名空间前缀（T9 用）；`required` = 该区必须逐字出现的类名（T8 用）。
 *  区名 kebab **不等于**类名根（`copyButton`→`copy-btn`／`emptyState`→`empty`／
 *  `errorReceipt`→`error`），故本表显式列出，且由下面的「产出者扫描」用例反向钉死。 */
const SECTION_ROOTS = Object.freeze({
  toast: { ns: 'toast', required: ['toast', 'toast-stack', 'toast-title-detail'] },  // controls.ts:176-219／495-593
  actionBar: { ns: 'action', required: ['action-bar', 'action-row', 'action-btn'] }, // controls.ts:649-695
  copyButton: { ns: 'copy-btn', required: ['copy-btn'] },                            // controls.ts:655／747／757
  statusBadge: { ns: 'status-badge', required: ['status-badge'] },                    // controls.ts:707
  emptyState: { ns: 'empty', required: ['empty'] },                                   // controls.ts:719-728
  errorReceipt: { ns: 'error', required: ['error-title', 'error-actions'] },          // controls.ts:763-765
  charts: { ns: 'charts', required: ['charts', 'charts-svg'] },                       // src/charts.ts chartsCss()
  helpShell: { ns: 'help-shell', required: ['help-shell', 'help-shell-card'] },       // src/help.ts:96 HELP_CLASS_ROOT
});

/** 从 HTML 串里取全部 class 令牌。 */
function classesOf(html) {
  const out = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c !== '') out.add(c);
  }
  return out;
}

/** 产出器实测：六个控件区 ＋ toast helpers 运行时类名。 */
function emittedControlClasses() {
  const out = new Set();
  const add = (html) => { for (const c of classesOf(html)) out.add(c); };

  add(renderToast({ msg: 'm' }));
  add(renderToast({
    msg: 'm', detail: 'd', count: '3', lines: ['a', 'b'], code: 'c',
    actions: [{ label: 'L', actionId: 'a1' }], icon: 'warn',
  }));
  for (const icon of TOAST_ICONS) add(renderToast({ msg: 'm', icon }));
  for (const type of ['ok', 'warn', 'danger']) add(renderToast({ msg: 'm', badge: { text: 'B', type } }));
  add(renderToast({ msg: 'm', maxStack: TOAST_DEFAULTS.mobileMaxStack }));

  add(renderActionBar({
    buttons: ACTION_BAR_KINDS.map((kind, i) => ({ actionId: 'btn' + i, label: kind, kind })),
    copyData: { actionId: 'cd' },
    copyLog: { actionId: 'cl' },
  }));
  add(renderActionBar({ buttons: [{ actionId: 'only', label: 'L', kind: 'primary' }] }));
  add(renderActionBar({ copyData: { actionId: 'cd2' } }));

  for (const status of STATUS_KINDS) add(renderStatusBadge({ status }));
  add(renderStatusBadge({ status: 'bogus' }));
  add(renderEmptyState({ text: 't', icon: '📦', hint: 'h', actionHtml: '<b>x</b>' }));
  add(renderEmptyState({ text: 't' }));
  add(renderErrorReceipt({ message: 'm' }));
  add(renderErrorReceipt({ message: 'm', dataText: 'd', logText: 'l', retryPrompt: 'R' }));

  // helpers JS 里的运行时类名（`var STACK_CLASS = "ilife-toast-stack"` 等）。
  const helpers = buildSharedHelpersJs();
  for (const m of helpers.matchAll(new RegExp(STYLE_PREFIX + '[A-Za-z0-9_-]+', 'g'))) out.add(m[0]);
  // helpers JS 里**拼接**出的类名（文本扫描取不到全名）：先证后缀确有产出，再登记全名。
  for (const [head, suffix] of [['toast', '-danger'], ['toast-title', '-detail']]) {
    assert.ok(helpers.includes('"' + suffix + '"') || helpers.includes("'" + suffix + "'"),
      'helpers 必须产出后缀 ' + suffix);
    out.add(STYLE_PREFIX + head + suffix);
  }
  return out;
}

/** `src/help.ts` 的 `cls('...')` 实参字面量（helpShell 类名的唯一来源）。 */
function helpClassLiterals() {
  const out = new Set();
  for (const m of SRC_HELP.matchAll(/cls\('([^']*)'/g)) out.add(m[1]);
  for (const m of SRC_HELP.matchAll(/cls\("([^"]*)"/g)) out.add(m[1]);
  out.add('help-shell'); // 类名根，取 HELP_SHELL_ID（src/spec/help.ts:240）
  return out;
}

describe('#75 共享样式资产：形态与冻结值', () => {
  it('T1 无参可调，返回 {css,tokens,prefix,version} 且冻结', () => {
    const o = buildStyleSheet();
    assert.equal(typeof o.css, 'string');
    assert.ok(o.css.length > 0);
    assert.ok(Array.isArray(o.tokens));
    assert.equal(typeof o.prefix, 'string');
    assert.equal(typeof o.version, 'string');
    assert.ok(Object.isFrozen(o), '产出必须冻结（只读契约）');
    assert.ok(Object.isFrozen(o.tokens), 'tokens 必须冻结');
  });

  it('T2 tokens 逐值等于 CSS_VAR_TOKENS 的键集（11 个、同序）', () => {
    const o = buildStyleSheet();
    assert.equal(TOKEN_NAMES.length, 11, '冻结 token 必须恰 11 个');
    assert.deepEqual([...o.tokens], TOKEN_NAMES);
  });

  it('T3 prefix 缺省 STYLE_PREFIX；显式传入生效并作用于全部类名', () => {
    assert.equal(buildStyleSheet().prefix, STYLE_PREFIX);
    assert.equal(buildStyleSheet({}).prefix, STYLE_PREFIX);
    const o = buildStyleSheet({ prefix: 'x-' });
    assert.equal(o.prefix, 'x-');
    assert.ok(o.css.includes('.x-toast {'), '自定义前缀必须落到类名');
    assert.ok(!o.css.includes('.ilife-toast {'), '自定义前缀下不得残留缺省前缀类名');
  });

  it('T4 :root 块逐 token 逐值（期望值从常量循环取，不写死字面量）', () => {
    const css = buildStyleSheet().css;
    const rootStart = css.indexOf(':root {');
    const rootEnd = css.indexOf('}', rootStart);
    assert.ok(rootStart >= 0 && rootEnd > rootStart, '缺 :root 块');
    const block = css.slice(rootStart, rootEnd);
    for (const name of TOKEN_NAMES) {
      const decl = name + ': ' + CSS_VAR_TOKENS[name];
      assert.ok(block.includes(decl), '基座缺 token 逐值声明：' + decl);
      assert.equal(block.split(decl).length - 1, 1, 'token 重复声明：' + name);
    }
    const declared = [...block.matchAll(/(--[A-Za-z0-9-]+)\s*:/g)].map((m) => m[1]);
    assert.deepEqual(declared, TOKEN_NAMES, ':root 不得新增 token 名（闭集 11 个）');
  });

  it('T5 --blue 逐字、Q14 禁入 0 命中、无深色区、无包裹标签、无 B1 禁色', () => {
    const css = buildStyleSheet().css;
    // 期望值从冻结常量取（不写死字面量）；`--blue` 的**字面值** #007aff 由
    // `test/contract-signatures.test.mjs`（逐值比对契约 doc:276-288）与 `test-d _S03` 双重钉死。
    assert.ok(css.includes('--blue: ' + CSS_VAR_TOKENS['--blue']), '--blue 必须逐字产出（doc:291）');
    assert.ok(css.includes('--blue: #007aff'), '--blue 必须逐字 #007aff（doc:291／Q12 锁定 B1 主色）');
    for (const t of STYLE_FORBIDDEN_TOKENS) {
      assert.equal(css.split(t).length - 1, 0, 'Q14 禁入 token 命中：' + t);
    }
    assert.ok(!css.includes('[data-theme'), '不得引入深色区（doc:292）');
    assert.ok(!/prefers-color-scheme\s*:\s*dark/.test(css), '不得引入 prefers-color-scheme: dark');
    assert.ok(!css.includes('<style'), '资产必须裸文本（不得自带包裹标签，C-19）');
    assert.ok(!css.includes('</style'), '资产必须裸文本（不得自带包裹标签，C-19）');
    // 视觉尺 H-01：单主色，B1 的其它候选主色命中 0。
    for (const hex of ['#0a84ff', '#af52de', '#ff375f', '#0071e3']) {
      assert.equal(css.split(hex).length - 1, 0, 'H-01 禁色命中：' + hex);
    }
  });

  it('T6 版本取 STYLE_VERSION（契约未规定取值 → 本票裁定，doc:268 只冻结类型）', () => {
    assert.equal(buildStyleSheet().version, STYLE_VERSION);
    assert.equal(buildStyleSheet().version, '0.1.0');
  });

  it('T7 与既有 STYLE_TOKENS 并存、不得互相覆盖（doc:293）', () => {
    assert.equal(Object.keys(STYLE_TOKENS).length, 9, 'STYLE_TOKENS 必须仍是 9 个深色 JS token');
    const overlap = Object.keys(STYLE_TOKENS).filter((k) => TOKEN_NAMES.includes(k));
    assert.deepEqual(overlap, [], '两套 token 键集不得重叠（不同物）');
    assert.ok(!buildStyleSheet().css.includes('--radius'), 'CSS 变量面不得混入 STYLE_TOKENS 的名字');
  });
});

describe('#75 共享样式资产：8 个样式区（闭集）', () => {
  it('T8 每个区都有真实规则，必现类名逐字命中', () => {
    const css = buildStyleSheet().css;
    assert.deepEqual([...CONTROL_STYLE_SECTIONS].sort(), Object.keys(SECTION_ROOTS).sort(), '区表与闭集必须同集');
    for (const section of CONTROL_STYLE_SECTIONS) {
      for (const suffix of SECTION_ROOTS[section].required) {
        const cls = STYLE_PREFIX + suffix;
        const hits = [...css.matchAll(new RegExp('\\.' + cls + '(?![A-Za-z0-9_-])', 'g'))].length;
        assert.ok(hits > 0, section + ' 区缺真实规则：.' + cls);
      }
    }
  });

  it('T9 无臆造类名：产出 CSS 的每个 ilife- 类名都归属某个区', () => {
    const css = buildStyleSheet().css;
    const roots = CONTROL_STYLE_SECTIONS.map((s) => STYLE_PREFIX + SECTION_ROOTS[s].ns);
    const classes = [...new Set([...css.matchAll(/\.(ilife-[A-Za-z0-9_-]+)/g)].map((m) => m[1]))];
    assert.ok(classes.length > 100, '类名数量异常偏少：' + classes.length);
    for (const c of classes) {
      assert.ok(roots.some((r) => c === r || c.startsWith(r)), '闭集外类名：' + c);
    }
  });

  it('T10 控件区类名双向对齐：产出器产出的类名 ⊆ CSS，且 CSS 类名全部有产出者', () => {
    const css = buildStyleSheet().css;
    const emitted = emittedControlClasses();
    const controlSections = CONTROL_STYLE_SECTIONS.filter((s) => s !== 'charts' && s !== 'helpShell');
    const controlRoots = controlSections.map((s) => STYLE_PREFIX + SECTION_ROOTS[s].ns);

    // ① 产出器 → CSS：漏配即红。
    for (const c of emitted) {
      if (!controlRoots.some((r) => c === r || c.startsWith(r))) continue;
      assert.ok(css.includes('.' + c), '产出器类名未被 CSS 覆盖：' + c);
    }
    // ② CSS → 产出器：臆造即红（charts／helpShell 另有专测）。
    const cssControlClasses = [...new Set([...css.matchAll(/\.(ilife-[A-Za-z0-9_-]+)/g)].map((m) => m[1]))]
      .filter((c) => controlRoots.some((r) => c === r || c.startsWith(r)));
    assert.ok(cssControlClasses.length >= 20, '控件区类名数量异常偏少：' + cssControlClasses.length);
    for (const c of cssControlClasses) {
      assert.ok(emitted.has(c), 'CSS 里的控件类名无产出者（臆造）：' + c);
    }
  });

  it('T11 helpShell 类名全部有产出者（`cls()` 实参）', () => {
    const css = buildStyleSheet().css;
    const literals = helpClassLiterals();
    const prefix = STYLE_PREFIX + SECTION_ROOTS.helpShell.ns + '-';
    const classes = [...new Set([...css.matchAll(/\.(ilife-help-shell-[A-Za-z0-9_-]+)/g)].map((m) => m[1]))];
    assert.ok(classes.length >= 40, 'helpShell 类名数量异常偏少：' + classes.length);
    for (const c of classes) {
      const suffix = c.slice(prefix.length);
      assert.ok(
        literals.has(suffix) || [...literals].some((lit) => suffix.startsWith(lit)),
        'helpShell 类名无产出者（臆造）：' + c,
      );
    }
  });

  it('T12 charts 区逐字节复用 chartsCss（唯一产出者，重述即 S1）', () => {
    const css = buildStyleSheet().css;
    assert.ok(css.includes(chartsCss(STYLE_PREFIX)), 'charts 区必须逐字节复用 chartsCss()');
    const custom = buildStyleSheet({ prefix: 'x-' }).css;
    assert.ok(custom.includes(chartsCss('x-')), '自定义前缀须经 chartsCss 机械改写（裁定 R5②）');
    assert.ok(!custom.includes(chartsCss(STYLE_PREFIX)), '自定义前缀下不得残留缺省前缀的 charts 文本');
    // 防重述：实现文件不得出现第二份图表 CSS 字面量，且必须从 charts.ts 取值。
    assert.ok(SRC_STYLE.includes("from './charts.js'"), 'style.ts 必须从 charts.ts 取图表 CSS');
    assert.ok(!/['"]\.?\s*charts-/.test(SRC_STYLE), 'style.ts 不得重述图表 CSS 类名文本');
    assert.ok(SRC_CHARTS.includes('export function chartsCss'), 'chartsCss 必须是 charts.ts 的导出（#75 复用点）');
  });

  it('T13 零装饰渐变（唯一例外 = 复用的 charts 虚线图例）', () => {
    const css = buildStyleSheet().css;
    const chartsText = chartsCss(STYLE_PREFIX);
    const withoutCharts = css.split(chartsText).join('');
    assert.equal((withoutCharts.match(/gradient/gi) ?? []).length, 0, '非 charts 段必须零渐变（视觉尺 H-04）');
    const chartHits = (chartsText.match(/gradient/gi) ?? []).length;
    assert.equal(chartHits, 1, 'charts 段渐变数变化：' + chartHits);
    assert.ok(chartsText.includes('repeating-linear-gradient'), '唯一例外应为虚线图例的 repeating-linear-gradient');
  });
});

describe('#75 共享样式资产：同源与 extraCss 接缝', () => {
  it('T14 同源：连调逐字节相等；基座段与 extraCss 无关', () => {
    const a = buildStyleSheet();
    const b = buildStyleSheet();
    assert.equal(a.css, b.css);
    const base = buildStyleSheet({ extraCss: '.ilife-calorie { --blue: #0055ff; }' });
    assert.ok(base.css.startsWith(a.css), 'extraCss 必须**末尾追加**（基座段逐字节不变，doc:299）');
    assert.ok(base.css.length > a.css.length);
  });

  it('T15 extraCss 原样追加、不按技能名分支（doc:299-300）', () => {
    const base = buildStyleSheet();
    const extra = '.ilife-calorie { --blue: #0055ff; }' + LF + '.ilife-bill .ilife-toast { border-radius: 8px; }';
    const o = buildStyleSheet({ extraCss: extra });
    assert.ok(o.css.includes(extra), 'extraCss 必须逐字出现（不加工、不转义）');
    assert.equal(o.css.slice(o.css.length - extra.length), extra, 'extraCss 必须落在末尾');
    // 同源：不同技能名只影响 extraCss 段，基座逐字节一致。
    const other = buildStyleSheet({ extraCss: '.ilife-chef { --blue: #0055ff; }' });
    assert.ok(o.css.startsWith(base.css), '带 extraCss 的产出必须以基座段为前缀');
    assert.ok(other.css.startsWith(base.css), '换技能名后基座段仍须逐字节一致');
    assert.equal(
      o.css.slice(0, base.css.length), other.css.slice(0, base.css.length),
      '共享层不得按技能名分支',
    );
  });

  it('T16 合法技能作用域覆盖块逐字出现在产出中（主题接缝验收，doc:299）', () => {
    const extra = '.ilife-calorie { --blue: #0055ff; }';
    const o = buildStyleSheet({ extraCss: extra });
    assert.ok(o.css.includes(extra));
    assert.equal(buildStyleSheet().css.includes('--blue: #0055ff'), false, '基座不得被覆盖块改写');
  });

  it('T17 产出可作 fillTemplate 的 sharedCssText（不抛 asset-missing，跨票联调）', () => {
    const M = TEMPLATE_MARKERS;
    const template = [
      '<!doctype html><html><head>', M.sharedCss, '</head><body>',
      '<script id="' + DEFAULT_DATA_SCRIPT_ID + '" type="' + DATA_SCRIPT_TYPE + '">' + M.injectData + '</script>',
      M.sharedHelpers,
      '</body></html>',
    ].join(LF);
    const css = buildStyleSheet().css;
    let out;
    assert.doesNotThrow(() => {
      out = fillTemplate({ template, assets: { sharedCssText: css, sharedHelpersJs: buildSharedHelpersJs() }, data: { a: 1 } });
    }, '共享 CSS 资产必须能直接喂 fillTemplate');
    assert.ok(out.html.includes(css), '注入后的 HTML 必须含共享 CSS 逐字文本');
    assert.throws(() => {
      fillTemplate({
        template, data: { a: 1 },
        assets: { sharedCssText: '<style>' + css + '</style>', sharedHelpersJs: buildSharedHelpersJs() },
      });
    }, (err) => err instanceof TemplateError && err.code === 'asset-missing', '预包裹资产必须抛 asset-missing');
  });

  it('T18 不自造第二份 token 表（实现文件与测试文件双向自证）', () => {
    // 实现文件不得出现 token 名 → 值的对象字面量。
    assert.equal((SRC_STYLE.match(/['"]--[A-Za-z0-9-]+['"]\s*:/g) ?? []).length, 0, 'style.ts 不得自造 token 表');
    // 本测试文件不得写死任何 token 逐值（否则实现改了断言跟着改，永远绿）。
    // 唯一豁免：`--blue: #007aff`——契约 doc:973 明令逐字断言该串，且其值由
    // `test/contract-signatures.test.mjs` 逐值比对契约 doc:276-288 ＋ `test-d _S03` 双重钉死。
    const probe = ["'--fg'", "'#1d1d1f'"].join(': ');
    assert.ok(!SELF.includes(probe), '测试不得写死 token 逐值');
    for (const name of TOKEN_NAMES) {
      if (name === '--blue') continue;
      assert.ok(!SELF.includes(name + ': ' + CSS_VAR_TOKENS[name]), '测试不得写死 token 逐值：' + name);
    }
  });

  it('T18b :root 块逐字节等于契约 §3.2 的 CSS 块（doc:276-288，非自造副本）', () => {
    const doc = readFileSync(new URL('../../../docs/base-paint-contract.md', import.meta.url), 'utf8');
    const start = doc.indexOf('```css' + LF + ':root {');
    assert.ok(start >= 0, '契约缺 §3.2 :root CSS 块');
    const from = start + '```css'.length + LF.length;
    const end = doc.indexOf('```', from);
    const docBlock = doc.slice(from, end).replace(new RegExp(LF + '$'), '');
    const css = buildStyleSheet().css;
    const rootEnd = css.indexOf('}' + LF + '/* ');
    assert.ok(rootEnd > 0, '产出缺 :root 块');
    assert.equal(css.slice(css.indexOf(':root {'), rootEnd + 1), docBlock, '产出 :root 块必须与契约逐字节相同');
  });

  it('T19 样式区闭集漂移 fail-fast（缺实现即导入报错）', () => {
    assert.ok(SRC_STYLE.includes('CONTROL_STYLE_SECTIONS 闭集缺样式区实现'), '必须保留闭集 fail-fast 守卫');
    assert.deepEqual(
      [...CONTROL_STYLE_SECTIONS],
      ['toast', 'actionBar', 'copyButton', 'statusBadge', 'emptyState', 'errorReceipt', 'charts', 'helpShell'],
      '闭集 8 区逐字（doc:265）',
    );
  });

  it('T20 冻结常量消费：数值锚点来自 TOAST_DEFAULTS／ACTION_BAR_DEFAULTS（不自造）', () => {
    const css = buildStyleSheet().css;
    assert.ok(css.includes('max-width: ' + TOAST_DEFAULTS.mobileMaxPx + 'px'), 'toast 断点取 TOAST_DEFAULTS.mobileMaxPx');
    assert.ok(css.includes('gap: ' + TOAST_DEFAULTS.gapPx + 'px'), 'toast 间距取 TOAST_DEFAULTS.gapPx');
    assert.ok(css.includes('min-height: ' + ACTION_BAR_DEFAULTS.minHeightPx + 'px'), '按钮高度取 ACTION_BAR_DEFAULTS.minHeightPx');
    assert.ok(css.includes('font-size: ' + ACTION_BAR_DEFAULTS.fontSizePx + 'px'), '按钮字号取 ACTION_BAR_DEFAULTS.fontSizePx');
    assert.ok(css.includes('font-weight: ' + ACTION_BAR_DEFAULTS.fontWeight + ';'), '按钮字重取 ACTION_BAR_DEFAULTS.fontWeight');
    assert.ok(css.includes(String(ACTION_BAR_DEFAULTS.ghostBorderAlpha)), 'ghost 描边透明度取 ACTION_BAR_DEFAULTS.ghostBorderAlpha');
    assert.ok(css.includes('repeat(' + ACTION_BAR_DEFAULTS.evenRowPairs + ', minmax(0, 1fr))'), '行网格列数取 ACTION_BAR_DEFAULTS.evenRowPairs');
    assert.equal(STYLE_SHEET_ID, 'ilife-base');
    assert.ok(css.includes(STYLE_SHEET_ID), '产出应带样式表 id 头（STYLE_SHEET_ID 消费点）');
  });

  it('T21 类名撞车处置：errorReceipt 不得用裸 `.ilife-error` 选择器（裁定 R6）', () => {
    const css = buildStyleSheet().css;
    const bare = [...css.matchAll(/\.ilife-error(?![A-Za-z0-9_-])/g)];
    assert.ok(bare.length > 0, 'errorReceipt 区缺容器规则');
    for (const m of bare) {
      assert.equal(
        css.slice(m.index, m.index + '.ilife-error:has(> .ilife-error-title'.length),
        '.ilife-error:has(> .ilife-error-title',
        'errorReceipt 容器选择器必须限定在自身类组合内（裸 .ilife-error 会污染 calorie 错误页）',
      );
    }
    // 反证：calorie 的错误页节点（只有 class="ilife-error"，无 -title 子元素）不得命中任何规则。
    assert.equal(
      (css.match(/\.ilife-error(?![A-Za-z0-9_:-])/g) ?? []).length, 0,
      'CSS 不得出现裸 .ilife-error 类选择器',
    );
  });

  it('T22 页面壳样式不归本票（裁定 R7）：无 body/html/ilife-page 等壳层规则', () => {
    const css = buildStyleSheet().css;
    assert.ok(!/(^|[},])\s*body\s*\{/.test(css), '不得产 body 规则（归 #104）');
    assert.ok(!/(^|[},])\s*html\s*\{/.test(css), '不得产 html 规则（归 #104）');
    assert.ok(!css.includes('.ilife-page'), '不得产页面壳类名（归 #104）');
    for (const alien of ['ilife-kpi', 'ilife-title', 'ilife-receipt', 'ilife-photo', 'ilife-section', 'ilife-bar']) {
      assert.ok(!css.includes('.' + alien), '闭集外类名（calorie 内容页命名空间，归 #104）：' + alien);
    }
  });
});
