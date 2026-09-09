/** #88 S4（实施 B）——HELP 速查台运行时增强的行为测试。
 *
 *  被验对象：`packages/base-render/src/controls.ts` 的 `buildSharedHelpersJs()`（签名不变，功能面扩展）
 *  ＋ `packages/base-render/src/style.ts` 的 helpShell 区新类（#88 R1-6）。
 *
 *  验收面（`.scratch/orchestrator/t88-acceptance.md` ＋ 返修单 R1-1／R1-6／R1-8 ＋ 蓝队 N-4）：
 *  ① 卡头注入按钮 = 卡数（每卡恰 1 个）；② 其 `data-t` 与该卡 `<pre>` **逐字相等**；
 *  ③ 委派点击复制得到同一文本；④ 二次注入不重复（幂等，含「删 marker 后重注入」更强判据）；
 *  ⑤ 静态 HTML 卡头按钮 **0**（无 JS 降级）；⑥ 注入按钮**真带**新类名且该类名有 CSS 规则（N-4 借道反面）；
 *  ⑦ 搜索（过滤＋`<mark>`＋命中计数＋清空＋跳页）／⑧ Sheet 参数实时预览／⑨ `#backTop`（`scrollY>400` 出现）。
 *
 *  浏览器：与 `test/controls.test.mjs` 同口径——**找不到浏览器即显式失败**（不静默跳过）。
 *  说明：headless `--dump-dom` 不投递**原生** scroll 事件（本机实测），故 ⑨ 在本用例用合成 `scroll` 事件
 *  证**处理器逻辑**；**原生投递**由 `docs/research/t88-browser-evidence-b.mjs`（CDP，真实时间）证。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import {
  ACTION_ID_ATTR,
  CONTROL_STYLE_SECTIONS,
  DEFAULT_DATA_ATTR,
  HELP_COPY_ACTIONS,
  HELP_SHELL_ID,
  STYLE_PREFIX,
  buildSharedHelpersJs,
  buildStyleSheet,
  renderHelpShell,
} from '../dist/index.js';

const execFileAsync = promisify(execFile);
const LF = String.fromCharCode(10);
const SRC_HELP = readFileSync(new URL('../src/help.ts', import.meta.url), 'utf8');

/** 样式区名：**从 `CONTROL_STYLE_SECTIONS` 闭集派生**（kebab 后与 `HELP_SHELL_ID` 同值者），不写字面量。 */
const HELP_SECTION = CONTROL_STYLE_SECTIONS.find(
  (section) => STYLE_PREFIX + section.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase()) === HELP_SHELL_ID,
) ?? '';
const CLS = STYLE_PREFIX + HELP_SECTION.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());

/** S4 新增类名（后缀；全部由 `cls()` 命名空间派生，测试侧不写完整类名字面量）。 */
const NEW_SUFFIXES = [
  'card-copy', 'card-mark', 'card-hidden', 'subgroup-hidden',
  'tab-search', 'tab-search-input', 'tab-search-clear', 'page-hitcount',
  'field-input', 'btn-backtop', 'btn-backtop-show',
];
const cls = (suffix) => CLS + '-' + suffix;

/** `src/help.ts` 的 `cls('...')` 实参字面量（helpShell 类名的唯一来源，同 `style.test.mjs` T11）。 */
function helpClassLiterals() {
  const out = new Set();
  for (const m of SRC_HELP.matchAll(/cls\('([^']*)'/g)) out.add(m[1]);
  for (const m of SRC_HELP.matchAll(/cls\("([^"]*)"/g)) out.add(m[1]);
  return out;
}

/** CSS 里是否**以类名作为组件**出现（`.x` 后不接 `[A-Za-z0-9_-]`）——同 `style.test.mjs:99-102` 的
 *  `selectorHasClass` 口径；`css.includes('.x')` 会被 `.x-input` 之类子串误满足（本用例变异自证踩到过）。 */
function cssHasClass(css, cls) {
  const re = new RegExp('\\.' + cls.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '(?![A-Za-z0-9_-])');
  return re.test(css);
}

/* ── 夹具：436 场景（2 组 × 2 子功能 × 109），部分带 editable_fields ───────────── */

const SCENE_COUNT = 436;
const PER_SUBGROUP = SCENE_COUNT / 4;
/** 只有这两个子功能组带「关键词」标题：保证搜索词**跨 2 个分组页命中**（Enter 跳页可观测）
 *  **且**另有 2 个子功能组零命中（子功能组隐藏可观测）。 */
const HIT_SUBGROUPS = new Set(['g0_0', 'g1_1']);

function sceneData() {
  const groups = [];
  for (let g = 0; g < 2; g += 1) {
    const subgroups = [];
    for (let s = 0; s < 2; s += 1) {
      const from = (g * 2 + s) * PER_SUBGROUP;
      const id = 'g' + g + '_' + s;
      const scenes = [];
      for (let k = 0; k < PER_SUBGROUP; k += 1) {
        const i = from + k;
        const scene = {
          id: 's_' + i,
          title: (HIT_SUBGROUPS.has(id) && i % 7 === 0 ? '关键词 ' : '场景 ') + i,
          wake_word: '唤醒 ' + i,
          status: '',
          prompt_template: '请你执行第 ' + i + ' 项。' + LF + LF + '天数:____',
          types: ['结果'],
        };
        if (i % 5 === 0) {
          scene.editable_fields = [
            { name: 'days', label: '天数', value: '7', hint: '默认 7 天' },
            { name: 'goal', label: '目标值', value: '', hint: '可留空' },
          ];
        }
        scenes.push(scene);
      }
      subgroups.push({ id, label: '子功能 ' + g + '-' + s, scenes });
    }
    groups.push({ id: 'g' + g, label: '分组 ' + g, icon: '📁', subgroups });
  }
  return { skill_name: '夹具技能', title: '速查台夹具', subtitle: 'S4 行为测试', groups };
}

const HELPERS = buildSharedHelpersJs();
const CSS = buildStyleSheet().css;

/* ── 静态面（不需要浏览器） ─────────────────────────────────────────────── */

describe('#88 S4 helpers 产出面（静态）', () => {
  it('S4-1 纯度与冻结面：单 marker／单 boot／零隐式全局／零 classList／零 node:', () => {
    assert.ok(HELPERS.trimStart().startsWith('(function') && HELPERS.trimEnd().endsWith('}());'), '必须是经典 script 可跑的 IIFE');
    assert.equal((HELPERS.match(/var MARKER_ATTR =/g) ?? []).length, 1, '只允许一个幂等 marker 声明');
    assert.equal((HELPERS.match(/setAttribute\(MARKER_ATTR/g) ?? []).length, 1, '只允许一处写 marker');
    assert.equal((HELPERS.match(/function boot\(\)/g) ?? []).length, 1, '不得新增第二个 boot()');
    assert.ok(HELPERS.includes('initHelpShell();'), '新功能必须挂进既有 boot()');
    assert.ok(HELPERS.includes('document.'), '必须走页面侧 DOM');
    assert.ok(/window\.matchMedia\(/.test(HELPERS), '只读 window.matchMedia 是既有用法（R1-11 改述）');
    assert.ok(!/\b(?:window|globalThis)\s*\.\s*[\w$]+\s*=(?!=)/.test(HELPERS), '不得向 window／globalThis 赋值');
    assert.ok(!/(?:from|import\s*\(|require\s*\(|import)\s*['"]node:/.test(HELPERS), '不得引 node:');
    assert.ok(!HELPERS.includes('classList'), '不得操作 classList（style.test.mjs T28）');
    assert.ok(!/["']show["']/.test(HELPERS), '不得出现 "show" 字面量（style.test.mjs T28）');
    assert.ok(!HELPERS.includes('<canvas'), '零 canvas');
    assert.ok(!/onclick\s*=/i.test(HELPERS), '不得产内联 onclick');
  });

  it('S4-2 卡级按钮常量恒读冻结面（不自造 actionId／文案）', () => {
    assert.ok(HELPERS.includes(HELP_COPY_ACTIONS.prompt.actionId), 'actionId 必须取 HELP_COPY_ACTIONS.prompt');
    assert.ok(HELPERS.includes(HELP_COPY_ACTIONS.prompt.label), '文案必须取 HELP_COPY_ACTIONS.prompt');
    assert.ok(HELPERS.includes(ACTION_ID_ATTR) && HELPERS.includes(DEFAULT_DATA_ATTR), '承载属性必须取冻结常量');
    // 产出文本里的 help 复制 actionId 必须**逐个**是冻结常量（prompt ＋ params；不得自造第三个）。
    const frozen = new Set(Object.values(HELP_COPY_ACTIONS).map((a) => a.actionId));
    const emitted = [...new Set([...HELPERS.matchAll(/ilife-help-copy-[A-Za-z]+/g)].map((m) => m[0]))];
    assert.ok(emitted.length > 0, '前置：产出文本必须真的含冻结 actionId');
    for (const id of emitted) assert.ok(frozen.has(id), '自造 actionId 字面量：' + id);
    assert.deepEqual([...emitted].sort(), [HELP_COPY_ACTIONS.params.actionId, HELP_COPY_ACTIONS.prompt.actionId].sort(),
      'helpers 只允许引用 prompt／params 两个冻结 actionId（wakeWord 由静态壳承担）');
  });

  it('S4-3 新类名双向：CSS 有规则 且 helpers 真产（蓝队 N-4：防「CSS 有类名、产出者空转」）', () => {
    for (const suffix of NEW_SUFFIXES) {
      assert.ok(cssHasClass(CSS, cls(suffix)), 'CSS 缺规则（类名作组件级匹配）：.' + cls(suffix));
      assert.ok(HELPERS.includes(cls(suffix)), 'helpers 未产类名：' + cls(suffix));
    }
    // 反向：helpers 里出现的 helpShell 类名必须在 CSS 里有规则（防臆造类名）。
    const emitted = [...new Set([...HELPERS.matchAll(new RegExp(CLS + '-[A-Za-z0-9-]+', 'g'))].map((m) => m[0]))];
    assert.ok(emitted.length >= NEW_SUFFIXES.length, 'helpers 产出的 helpShell 类名数量异常偏少：' + emitted.length);
    for (const c of emitted) assert.ok(cssHasClass(CSS, c), 'helpers 产出类名未被 CSS 覆盖：' + c);
  });

  it('S4-4 类名不臆造：新后缀 ⊆ 既有 cls() 实参前缀（T11 归属）', () => {
    const literals = helpClassLiterals();
    assert.ok(literals.size > 0, '前置：help.ts 必须有 cls() 实参');
    for (const suffix of NEW_SUFFIXES) {
      assert.ok([...literals].some((lit) => suffix.startsWith(lit)), '新类名无 T11 归属：' + suffix);
    }
  });

  it('S4-5 无 JS 降级：静态 HTML 零卡级按钮／零搜索框／零 #backTop ＋ CSS-only Tab 结构在', () => {
    const { html } = renderHelpShell({ sceneData: sceneData(), assets: { sharedHelpersJs: HELPERS, sharedCssText: CSS } });
    assert.equal(html.split('class="' + cls('card-copy') + '"').length - 1, 0, '静态 HTML 不得含卡级按钮（卡级按钮只在运行时注入）');
    assert.equal(html.split('class="' + cls('tab-search') + '"').length - 1, 0, '静态 HTML 不得含搜索框');
    assert.equal(html.split('id="backTop"').length - 1, 0, '静态 HTML 不得含 #backTop');
    assert.equal(html.split('<mark').length - 1, 0, '静态 HTML 不得含 <mark>');
    assert.equal(html.split('class="' + cls('card') + '"').length - 1, SCENE_COUNT, '静态 HTML 必须仍有 436 张卡');
    assert.ok(CSS.includes('.' + cls('tab-input') + ':checked + .' + cls('page-body')), 'CSS-only Tab 规则必须仍在');
    assert.equal(html.split('type="radio"').length - 1, 3, '2 个分组页 ＋ 1 个关于页各带 radio');
  });
});

/* ── 浏览器面（无浏览器即显式失败，与 controls.test.mjs 同口径） ──────────── */

function browserCandidates() {
  const explicit = process.env.DSH_BROWSER_CANDIDATES;
  const defaults = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  const list = typeof explicit === 'string' && explicit !== ''
    ? explicit.split(',').map((s) => s.trim()).filter((s) => s !== '')
    : defaults;
  return [process.env.DSH_BROWSER, ...list];
}

function findBrowser(candidates = browserCandidates()) {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0 && existsSync(candidate)) return candidate;
  }
  return null;
}

function requireBrowser(browser, candidates = browserCandidates()) {
  if (browser !== null) return browser;
  throw new assert.AssertionError({
    message: '未找到 Chrome／Chromium／Edge：S4 的卡级按钮是**运行时注入**，静态 HTML 查不到 → '
      + '可执行证据缺失（不静默跳过）。已探测：' + JSON.stringify(candidates.filter((c) => typeof c === 'string'))
      + '；请安装浏览器或用 DSH_BROWSER=<路径> 指定。',
  });
}

async function dumpDom(browser, target, extraArgs = []) {
  const profile = mkdtempSync(join(tmpdir(), 't88-chrome-'));
  try {
    const { stdout } = await execFileAsync(browser, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-breakpad',
      '--disable-dev-shm-usage',
      '--allow-file-access-from-files',
      '--user-data-dir=' + profile,
      '--virtual-time-budget=4000',
      '--window-size=1280,900',
      ...extraArgs,
      '--dump-dom',
      target,
    ], { encoding: 'utf8', timeout: 120000, maxBuffer: 128 * 1024 * 1024 });
    return stdout;
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

function readResult(dom, label) {
  const match = dom.match(/RESULT:(\{[\s\S]*?\})<\/div>/);
  assert.ok(match !== null, label + '：页面未产出结果（夹具未跑完）：'
    + (dom.match(/PROBE_ERROR:([\s\S]*?)<\/div>/) ?? ['', dom.slice(0, 400)])[1].slice(0, 600));
  return JSON.parse(match[1]);
}

/** 页面探针（经典 script；结果写进 `#result`）。 */
const PROBE = [
  '(async function () {',
  '  try {',
  '    var out = {};',
  '    var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };',
  '    var q1 = function (s, r) { return (r || document).querySelector(s); };',
  '    var cards = qa(".' + cls('card') + '");',
  '    out.cardCount = cards.length;',
  '    var perCard = cards.map(function (c) { return qa(".' + cls('card-copy') + '", c); });',
  '    out.copyTotal = qa(".' + cls('card-copy') + '").length;',
  '    out.oneEach = perCard.filter(function (a) { return a.length === 1; }).length;',
  '    out.inCardTop = perCard.filter(function (a) { return a.length === 1 && a[0].parentNode && a[0].parentNode.className === "' + cls('card-top') + '"; }).length;',
  '    out.dataTEqualsPre = perCard.filter(function (a, i) {',
  '      var p = q1(".' + cls('prompt') + '", cards[i]);',
  '      return a.length === 1 && p !== null && a[0].getAttribute("' + DEFAULT_DATA_ATTR + '") === p.textContent;',
  '    }).length;',
  '    out.actionId = perCard.filter(function (a) { return a.length === 1 && a[0].getAttribute("' + ACTION_ID_ATTR + '") === "' + HELP_COPY_ACTIONS.prompt.actionId + '"; }).length;',
  '    out.label = perCard.filter(function (a) { return a.length === 1 && a[0].textContent === "' + HELP_COPY_ACTIONS.prompt.label + '"; }).length;',
  '    out.classExact = perCard.filter(function (a) { return a.length === 1 && a[0].className === "' + cls('card-copy') + '"; }).length;',
  '    var sample = q1(".' + cls('card-copy') + '");',
  '    var cs = sample ? getComputedStyle(sample) : null;',
  '    out.display = cs ? cs.display : null;',
  '    out.borderRadius = cs ? cs.borderRadius : null;',
  /* ③ 委派点击复制 */
  '    var copied = [];',
  '    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: function (t) { copied.push(t); return Promise.resolve(); } } });',
  '    perCard.forEach(function (a) { if (a.length === 1) a[0].click(); });',
  '    await new Promise(function (r) { setTimeout(r, 80); });',
  '    out.copied = copied.length;',
  '    out.copiedEqualsPre = copied.length === cards.length && copied.every(function (t, i) {',
  '      var p = q1(".' + cls('prompt') + '", cards[i]);',
  '      return p !== null && t === p.textContent;',
  '    });',
  '    out.toastCount = qa(".ilife-toast-stack > .ilife-toast").length;',
  /* ④ 幂等：删 marker 后二次注入同一份 helpers 文本 */
  '    var src = null;',
  '    qa("script").forEach(function (el) {',
  '      if (src === null && el.textContent.indexOf("data-ilife-helpers") > -1 && el.textContent.indexOf("function boot()") > -1) src = el;',
  '    });',
  '    var marker = q1("[data-ilife-helpers=\\"1\\"]");',
  '    if (marker && marker.parentNode) marker.parentNode.removeChild(marker);',
  '    var again = document.createElement("script");',
  '    again.textContent = src ? src.textContent : "";',
  '    document.body.appendChild(again);',
  '    await new Promise(function (r) { setTimeout(r, 80); });',
  '    out.afterReinjectCopy = qa(".' + cls('card-copy') + '").length;',
  '    out.afterReinjectSearch = qa(".' + cls('tab-search') + '").length;',
  '    out.afterReinjectBackTop = qa("#backTop").length;',
  '    out.afterReinjectMarkers = qa("[data-ilife-helpers=\\"1\\"]").length;',
  /* ⑦ 搜索 */
  '    var input = q1(".' + cls('tab-search-input') + '");',
  '    var count = q1(".' + cls('page-hitcount') + '");',
  '    var clear = q1(".' + cls('tab-search-clear') + '");',
  '    out.hasSearch = input !== null && count !== null && clear !== null;',
  '    var term = "关键词";',
  '    var expected = cards.filter(function (c) { return c.textContent.toLowerCase().indexOf(term) > -1; }).length;',
  '    input.value = term;',
  '    input.dispatchEvent(new Event("input", { bubbles: true }));',
  '    await new Promise(function (r) { setTimeout(r, 30); });',
  '    out.expected = expected;',
  '    out.hidden = qa(".' + cls('card-hidden') + '").length;',
  '    out.visible = cards.filter(function (c) { return c.className.indexOf("' + cls('card-hidden') + '") < 0; }).length;',
  '    out.subgroupHidden = qa(".' + cls('subgroup-hidden') + '").length;',
  '    var marks = qa(".' + cls('card-mark') + '");',
  '    out.marks = marks.length;',
  '    out.markTag = marks.length > 0 ? marks[0].tagName : null;',
  '    out.marksAllTerm = marks.length > 0 && marks.every(function (m) { return m.textContent === term; });',
  '    out.hitText = count.textContent;',
  '    out.autoOpenSheets = qa(".' + cls('card') + ' > .' + cls('sheet') + '[open]").length;',
  '    var checked = q1(".' + cls('tab-input') + ':checked");',
  '    var hasCls = function (n, c) { return n && (" " + (n.className || "") + " ").indexOf(" " + c + " ") > -1; };',
  '    var pageOf = function (el) { var p = el; while (p && !hasCls(p, "' + cls('page') + '")) p = p.parentNode; return p; };',
  '    out.checkedPage = checked ? pageOf(checked).getAttribute("data-group-id") : null;',
  '    var beforeId = checked ? checked.id : null;',
  '    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));',
  '    out.enterChanged = beforeId !== q1(".' + cls('tab-input') + ':checked").id;',
  '    clear.click();',
  '    await new Promise(function (r) { setTimeout(r, 30); });',
  '    out.afterClearValue = input.value;',
  '    out.afterClearHidden = qa(".' + cls('card-hidden') + '").length;',
  '    out.afterClearMarks = qa(".' + cls('card-mark') + '").length;',
  '    out.afterClearSheets = qa(".' + cls('card') + ' > .' + cls('sheet') + '[open]").length;',
  '    out.afterClearHitText = count.textContent;',
  /* ⑧ Sheet 参数实时预览 */
  '    var fieldCard = null;',
  '    for (var fi = 0; fi < cards.length; fi++) { if (qa(".' + cls('field-input') + '", cards[fi]).length > 0) { fieldCard = cards[fi]; break; } }',
  '    out.hasFieldInput = fieldCard !== null;',
  '    if (fieldCard) {',
  '      var ins = qa(".' + cls('field-input') + '", fieldCard);',
  '      var pre = q1(".' + cls('prompt') + '", fieldCard);',
  '      var base = pre.getAttribute("data-ilife-help-prompt");',
  '      ins[0].value = "X88";',
  '      ins[0].dispatchEvent(new Event("input", { bubbles: true }));',
  '      var labels = qa(".' + cls('field-label') + '", fieldCard).map(function (el) { return el.textContent; });',
  '      var lines = [];',
  '      ins.forEach(function (el, i) { var v = el.value.replace(/^\\s+|\\s+$/g, ""); if (v !== "") lines.push(labels[i] + ": " + v); });',
  '      out.previewExpected = base + String.fromCharCode(10) + String.fromCharCode(10) + lines.join(String.fromCharCode(10));',
  '      out.previewText = pre.textContent;',
  '      out.previewMatch = pre.textContent === out.previewExpected;',
  '      out.cardCopyTracks = q1(".' + cls('card-copy') + '", fieldCard).getAttribute("' + DEFAULT_DATA_ATTR + '") === pre.textContent;',
  '      out.paramsTracks = q1("[' + ACTION_ID_ATTR + '=\\"" + "' + HELP_COPY_ACTIONS.params.actionId + '" + "\\"]", fieldCard).getAttribute("' + DEFAULT_DATA_ATTR + '") === lines.join(String.fromCharCode(10));',
  '    }',
  /* ⑨ #backTop（合成 scroll 事件证处理器；原生投递见 CDP 证据脚本） */
  '    var bt = q1("#backTop");',
  '    out.hasBackTop = bt !== null;',
  '    out.backTopClass = bt ? bt.className : null;',
  '    out.backTopLabel = bt ? bt.textContent : null;',
  '    out.backTopOpacityAtTop = bt ? getComputedStyle(bt).opacity : null;',
  '    var scroller = document.scrollingElement;',
  '    scroller.scrollTop = 900;',
  '    document.dispatchEvent(new Event("scroll"));',
  '    out.scrolledY = scroller.scrollTop;',
  '    out.backTopShown = bt ? bt.className.indexOf("' + cls('btn-backtop-show') + '") > -1 : null;',
  '    out.backTopPointerShown = bt ? getComputedStyle(bt).pointerEvents : null;',
  '    await new Promise(function (r) { setTimeout(r, 300); });',
  '    out.backTopOpacityShown = bt ? getComputedStyle(bt).opacity : null;',
  '    scroller.scrollTop = 0;',
  '    document.dispatchEvent(new Event("scroll"));',
  '    out.backTopHiddenAgain = bt ? bt.className.indexOf("' + cls('btn-backtop-show') + '") < 0 : null;',
  '    document.getElementById("result").textContent = "RESULT:" + JSON.stringify(out);',
  '  } catch (err) {',
  '    document.getElementById("result").textContent = "PROBE_ERROR:" + (err && err.stack ? err.stack : String(err));',
  '  }',
  '}());',
].join(LF);

function buildFixtureHtml() {
  const { html } = renderHelpShell({
    sceneData: sceneData(),
    assets: { sharedHelpersJs: HELPERS, sharedCssText: CSS },
  });
  const body = '<div id="result">PENDING</div>' + LF + '<script>' + LF + PROBE + LF + '</script>' + LF + '</body>';
  const withResult = html.includes('</body>') ? html.replace('</body>', body) : html + body;
  // helpers 再注入一次（同页两次）→ 幂等判据只落 DOM（既有约定，controls.test.mjs 同口径）。
  return withResult.replace('</body>', '<script>' + LF + HELPERS + LF + '</script>' + LF + '</body>');
}

describe('#88 S4 HELP 速查台运行时（真实浏览器）', () => {
  it('S4-6 卡头按钮／data-t／委派复制／搜索／高亮／计数／跳页／清空／Sheet 预览／backTop／幂等', async (t) => {
    const browser = requireBrowser(findBrowser());
    const dir = mkdtempSync(join(tmpdir(), 't88-s4-'));
    const file = join(dir, 's4.html');
    writeFileSync(file, buildFixtureHtml(), 'utf8');
    try {
      const dom = await dumpDom(browser, pathToFileURL(file).href);
      const out = readResult(dom, 'S4 夹具');
      t.diagnostic('S4 夹具（headless ' + browser + '）产出：' + JSON.stringify(out));

      // ① 卡头恰 1 个按钮 ＋ ② data-t 逐字 ＋ ⑥ 类名
      assert.equal(out.cardCount, SCENE_COUNT, '夹具必须真的渲染 436 张卡');
      assert.equal(out.copyTotal, SCENE_COUNT, '卡级复制按钮数必须等于卡数');
      assert.equal(out.oneEach, SCENE_COUNT, '每张卡头必须恰 1 个卡级复制按钮');
      assert.equal(out.inCardTop, SCENE_COUNT, '注入落点必须是卡头 card-top');
      assert.equal(out.dataTEqualsPre, SCENE_COUNT, 'data-t 必须与该卡 <pre> 逐字相等');
      assert.equal(out.actionId, SCENE_COUNT, 'actionId 必须逐字取 HELP_COPY_ACTIONS.prompt');
      assert.equal(out.label, SCENE_COUNT, '文案必须逐字取 HELP_COPY_ACTIONS.prompt.label');
      assert.equal(out.classExact, SCENE_COUNT, 'N-4：注入按钮必须真带 ' + cls('card-copy') + '（不得借道既有前缀空转）');
      assert.equal(out.display, 'flex', 'N-4：类名必须真的生效（card-top 是 flex 容器，inline-flex 被块化为 flex）');
      assert.equal(out.borderRadius, '999px', 'N-4：CSS 规则必须命中（border-radius 取 999px）');
      // ③ 委派点击复制
      assert.equal(out.copied, SCENE_COUNT, '436 个按钮点击都必须触发复制');
      assert.equal(out.copiedEqualsPre, true, '复制文本必须等于该卡 <pre> 文本');
      assert.ok(out.toastCount > 0 && out.toastCount <= 5, '反馈必须经既有 toast 栈且受容量上限约束，实测 ' + out.toastCount);
      // ④ 幂等（两次注入 ＋ 删 marker 后重注入）
      assert.equal(out.afterReinjectCopy, SCENE_COUNT, '删 marker 后重注入不得重复注入卡级按钮');
      assert.equal(out.afterReinjectSearch, 1, '搜索框必须唯一');
      assert.equal(out.afterReinjectBackTop, 1, '#backTop 必须唯一');
      assert.equal(out.afterReinjectMarkers, 1, '重注入后幂等 marker 必须恰好 1 个');
      // ⑦ 搜索
      assert.equal(out.hasSearch, true, '搜索框／命中计数／清空按钮必须都在');
      assert.ok(out.expected > 0 && out.expected < SCENE_COUNT, '前置：搜索词必须命中一部分卡（否则断言无鉴别力），实测 ' + out.expected);
      assert.equal(out.visible, out.expected, '可见卡数必须等于命中数');
      assert.equal(out.hidden + out.visible, SCENE_COUNT, '隐藏＋可见必须覆盖全部卡');
      assert.ok(out.subgroupHidden > 0, '无命中的子功能组必须隐藏');
      assert.ok(out.marks > 0 && out.marksAllTerm === true && out.markTag === 'MARK', '<mark> 高亮必须命中搜索词，实测 ' + out.marks);
      assert.equal(out.hitText, '匹配 ' + out.expected + ' 个场景', '命中计数文案必须逐字');
      assert.ok(out.autoOpenSheets > 0, '命中卡片的 Sheet 必须自动展开');
      assert.ok(out.checkedPage !== null, '必须自动跳到命中分组页');
      assert.equal(out.enterChanged, true, 'Enter 必须在命中分组页间跳页');
      assert.equal(out.afterClearValue, '', '清空必须清空输入');
      assert.equal(out.afterClearHidden, 0, '清空必须复原隐藏态');
      assert.equal(out.afterClearMarks, 0, '清空必须移除全部 <mark>');
      assert.equal(out.afterClearSheets, 0, '清空必须收起搜索期展开的 Sheet');
      assert.equal(out.afterClearHitText, '', '清空必须清空命中计数');
      // ⑧ Sheet 参数实时预览
      assert.equal(out.hasFieldInput, true, '夹具必须含可编辑字段（前置）');
      assert.equal(out.previewMatch, true, '预览必须 = prompt ＋ 空行 ＋ label: value 行，实测 ' + JSON.stringify(out.previewText).slice(0, 200));
      assert.equal(out.cardCopyTracks, true, '卡级复制按钮的 data-t 必须跟随预览');
      assert.equal(out.paramsTracks, true, 'params 复制按钮的 data-t 必须跟随编辑值');
      // ⑨ #backTop
      assert.equal(out.hasBackTop, true, '#backTop 必须存在（H-19 规格点名 id）');
      assert.equal(out.backTopLabel, '↑', '#backTop 字形必须是 ↑');
      assert.equal(out.backTopOpacityAtTop, '0', '初始必须 opacity:0');
      assert.ok(out.scrolledY > 400, '前置：必须真的滚过 400px，实测 ' + out.scrolledY);
      assert.equal(out.backTopShown, true, 'scrollY>400 必须加 -show');
      assert.equal(out.backTopPointerShown, 'auto', '出现后必须可点击（pointer-events 非动画属性，立即可判）');
      assert.equal(out.backTopHiddenAgain, true, '回到 400px 以下必须再次隐藏');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('S4-7 静态壳（不注入 helpers ＝ 无 JS 时的页面）在真实浏览器里完全可用', async (t) => {
    // 口径：`--dump-dom` 在 `--blink-settings=scriptEnabled=false`／`--disable-javascript` 下**输出为空**
    // （本机实测），故本用例把「无 JS」等价为「页面里唯一脚本（helpers）不存在」——
    // 真实**禁用脚本引擎**的浏览器证据由 `docs/research/t88-browser-evidence-b.mjs`（CDP
    // `Emulation.setScriptExecutionDisabled` ＋ `DOM.getOuterHTML`）承担，两者互为印证。
    const browser = requireBrowser(findBrowser());
    const dir = mkdtempSync(join(tmpdir(), 't88-s4-nojs-'));
    const file = join(dir, 'nojs.html');
    const { html } = renderHelpShell({
      sceneData: sceneData(),
      // 「无 JS」等价物：唯一脚本换成空实现（helpers 不执行）→ 页面 DOM 就是静态壳。
      assets: { sharedHelpersJs: '(function () { return; }());', sharedCssText: CSS },
    });
    writeFileSync(file, html, 'utf8');
    try {
      const dom = await dumpDom(browser, pathToFileURL(file).href);
      const countOf = (re) => (dom.match(re) ?? []).length;
      const stats = {
        cards: countOf(new RegExp('class="' + cls('card') + '"', 'g')),
        prompts: countOf(new RegExp('class="' + cls('prompt') + '"', 'g')),
        cardCopy: countOf(new RegExp('class="' + cls('card-copy') + '"', 'g')),
        search: countOf(new RegExp('class="' + cls('tab-search') + '"', 'g')),
        backTop: countOf(/id="backTop"/g),
        marker: countOf(/data-ilife-helpers="1"/g),
        staticButtons: countOf(new RegExp(ACTION_ID_ATTR + '=', 'g')),
        checkedRadio: countOf(/type="radio"[^>]*checked/g),
        tabLabels: countOf(new RegExp('class="' + cls('tab') + '"', 'g')),
        cssOnlyTabRule: countOf(new RegExp('\\.' + cls('tab-input') + ':checked \\+ \\.' + cls('page-body'), 'g')),
      };
      t.diagnostic('静态壳（浏览器渲染，无 helpers）实测：' + JSON.stringify(stats));
      assert.equal(stats.cards, SCENE_COUNT, '无 JS：436 张卡必须都在');
      assert.equal(stats.prompts, SCENE_COUNT, '无 JS：436 个 prompt <pre> 必须都在');
      assert.equal(stats.staticButtons, SCENE_COUNT * 3, '无 JS：静态三目标复制按钮必须都在（436×3）');
      assert.equal(stats.cardCopy, 0, '无 JS：不得有卡级按钮（运行时注入面不存在）');
      assert.equal(stats.search, 0, '无 JS：不得有搜索框');
      assert.equal(stats.backTop, 0, '无 JS：不得有 #backTop');
      assert.equal(stats.marker, 0, '无 JS：helpers 不得执行');
      assert.equal(stats.tabLabels, 3, '无 JS：2 个分组标签 ＋ 1 个「关于」标签');
      assert.ok(stats.checkedRadio >= 1, '无 JS：必须有默认选中的分组 radio');
      assert.ok(stats.cssOnlyTabRule >= 1, '无 JS：`:checked + page-body` 规则必须落在页内');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
