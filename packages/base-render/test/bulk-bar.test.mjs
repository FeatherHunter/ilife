/** bulk-bar（批量操作条 · 形态 A「选中后浮出来的操作条（底部）」）· 契约测试。
 *
 * 覆盖五组判据：
 *  ① **渲染契约**：宿主／条目列／操作条／就地确认面的槽位与枚数／**选中 0 条整条 `hidden`**／
 *     逐条预演的「会改 `✓`・跳过 `⊘`」与右端那两个字／主按钮按「会改几条」算字与可按性／
 *     空态／转义面（每个文本字段都塞一遍注入串）／**闭集里的槽名一个都不许是死声明**／
 *     **非 ASCII 件名与动作键的 `id` 同页唯一且 `aria-controls` 指着自己那块**／
 *     **全部**非法入参分支（每个都断 `BlocksError`，含**稀疏数组**与「动作 `disabled` 没给 `hint`」）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且只出现一次、
 *     零 `:root`／`!important`／零新 token／零 `@media` 宽度查询／`[hidden]` 被显式重写／
 *     零省略号式截断（`text-overflow`／`line-clamp`／`nowrap`）／触控地板数字写在一处／
 *     **忙碌那枚字出流（不参与固有宽）**／**窄档阈值只有 `style-sizes.ts` 一处出处**／
 *     **README 不变量 4 与条上边线的实际取值对齐**／`:active` 只碰 `transform`；
 *     `dist/components/bulk-bar/**` 剥字面量与注释后零 `document.`／`window.`／`navigator.`；
 *  ③ **加法式**：渲染本件不改动同页别的件的产出；换前缀时 scope 与类名一起换；
 *  ④ **两档几何（真机 headless Chrome ＋ CDP）**：**容器**宽 390／366／1280 下零横向溢出、
 *     条目与操作条**不重叠**、命中盒 ≥44×44、相邻触控目标间距 ≥8px、关键语义零截断、
 *     **390／366 档四枚动作仍在一行**（静息态不许被忙碌字顶成两行）、**忙碌态不改变按钮尺寸**、
 *     四套皮肤下标记逐字节相同、每套皮肤下条的上边线／投影档取的是本套皮肤的取值；
 *     **起不来就退确定性几何判据并打印原因**；
 *  ⑤ **行为（真机）**：勾选变化 → 已选数原地改写 ＋ 条按 0 条 `hidden` ＋ 尾段读数换 `—`（勾回原样则复原）
 *     ＋ 派发 `ilife:bulk-change`；点带预演的动作 → 就地展开确认面（**同时只开一块／再点同一枚＝收起**）／
 *     点不带预演的动作 → 直接派发；**非 ASCII 动作键点第二枚开的是第二块**；「最近用过」填值；
 *     「取消」收起并把焦点还给按钮；「改这 N 条」派发 `ilife:bulk-action`（带 keys 与 value）；
 *     **重复注入只绑一次**；**中段滚动时条粘在视口底部、不透明地盖住正滚过的几行**。
 *
 * 期望值一律从组件自己的常量派生（`BULK_BAR_*` ＋ 四个 `id` 拼法），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BULK_BAR_CLASS,
  BULK_BAR_EMPTY_TEXT,
  BULK_BAR_EVENT_ACTION,
  BULK_BAR_EVENT_CHANGE,
  BULK_BAR_FORMS,
  BULK_BAR_ITEM_MAX,
  BULK_BAR_MISSING,
  BULK_BAR_NARROW_PX,
  BULK_BAR_PREVIEW_MAX,
  BULK_BAR_RECENT_MAX,
  BULK_BAR_SLOTS,
  BULK_BAR_TONES,
  buildBulkBarJs,
  bulkBarConfirmId,
  bulkBarCountId,
  bulkBarCss,
  bulkBarErrorId,
  bulkBarHintId,
  bulkBarSlot,
  renderBulkBar,
} from '../dist/components/bulk-bar/index.js';
import { renderMultiChecks } from '../dist/components/multi-checks/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKINS, SKIN_NAMES, skinClass, skinCss } from '../dist/components/skin/index.js';
import { styleSources } from './_style-sources.mjs';
import { startShapesPage } from './shapes-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'bulk-bar');

/** 四套皮肤的取值表（期望色**从表里读**，判据里不抄色字面量）。 */
const SKIN_VALUES = Object.fromEntries(SKIN_NAMES.map((s) => [s, SKINS[s].values]));

/** 取值表里的 `#rrggbb` → 浏览器 `getComputedStyle` 报出来的 `rgb(r, g, b)` 串。 */
const toRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return 'rgb(' + [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(', ') + ')';
};

/** 剥掉 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把「解释」当「规则」）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** 抛错的入参（`BlocksError`：组件层与区块层共用同一个错误名）。 */
const throwsBlocks = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.name === 'BlocksError';
  }
  return false;
};

/** 逐字符配平花括号抽选择器（`@container`／`@media` 块里的规则也算；正则式抽取会漏掉它们）。 */
function ruleSelectors(css) {
  const out = [];
  let buf = '';
  for (const ch of css) {
    if (ch === '{') {
      const sel = buf.trim();
      buf = '';
      if (sel !== '' && !sel.startsWith('@')) out.push(sel);
    } else if (ch === '}') {
      buf = '';
    } else {
      buf += ch;
    }
  }
  return out;
}

/** 剥掉 `var(...)`（含嵌套与带括号的兜底）后的剩余 CSS：兜底链里的颜色字面量是允许的。 */
function stripVarFns(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    if (css.startsWith('var(', i)) {
      let depth = 0;
      let j = i + 3;
      for (; j < css.length; j += 1) {
        if (css[j] === '(') depth += 1;
        else if (css[j] === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      i = j + 1;
      continue;
    }
    out += css[i];
    i += 1;
  }
  return out;
}

const countOf = (html, needle) => (html.match(new RegExp(needle, 'g')) || []).length;

/* ── 样例（一行一条：勾中的、没勾的、勾不动的；四枚动作：两枚带预演、一枚危险、一枚素） ─── */

const PREVIEW_CAT = {
  title: '批量改分类',
  cap: '已选 3 条 · 改完能整批撤回',
  valueLabel: '改成',
  value: '外卖',
  recent: ['外卖', '零食', '请客'],
  rows: [
    { keep: true, from: '餐饮', to: '外卖', note: '午餐 32.00（09-25）' },
    { keep: true, from: '餐饮', to: '外卖', note: '晚餐 88.00（09-24）' },
    { keep: false, to: '不改', note: '借出收回 200.00：这条是收入，没有「分类」这一格' },
  ],
};
const PREVIEW_TAG = {
  title: '批量加标签',
  rows: [{ keep: true, to: '报销' }, { keep: true, to: '报销', from: '待报销' }],
  recent: ['报销', '家务'],
};

const SAMPLE = {
  name: 'ledger-bulk',
  items: [
    { key: 'a1', title: '餐饮 · 午餐', note: '09-25 · 现金', reading: '32.00', selected: true },
    { key: 'a2', title: '交通 · 地铁', note: '09-25 · 招行储蓄卡', reading: '6.00' },
    { key: 'a3', title: '餐饮 · 晚餐', note: '09-24 · 微信', reading: '88.00', selected: true },
    { key: 'a4', title: '借出收回', note: '09-23 · 现金', reading: '200.00', disabled: true, disabledReason: '这条是收入，没有「分类」这一格' },
    { key: 'a5', title: '日用 · 超市', note: '09-23 · 招行储蓄卡', reading: '241.50', selected: true },
  ],
  actions: [
    { key: 'cat', label: '改分类', preview: PREVIEW_CAT },
    { key: 'acct', label: '改账户' },
    { key: 'tag', label: '加标签', preview: PREVIEW_TAG },
    { key: 'del', label: '删除', tone: 'danger' },
  ],
  tail: '合计 361.50',
  hint: '共 5 条 · 删除这种不可逆的会先出二次确认条',
};

/** 一枚动作的确认面（`preview` 那份）：从它的开标签起、到下一块确认面之前。
 *  **`id` 从组件自己的拼法派生**（`bulkBarConfirmId`），判据里不抄 id 字面量。 */
const confirmOf = (html, key, name = SAMPLE.name) => {
  const head = bulkBarSlot('confirm') + '" id="' + bulkBarConfirmId(name, key);
  const start = html.indexOf(head);
  assert.ok(start > 0, '找不到动作 ' + key + ' 的确认面');
  const next = html.indexOf(bulkBarSlot('confirm') + '" id="', start + 1);
  return html.slice(start, next === -1 ? html.length : next);
};

/** 标记里每个 `id="…"`（判同页唯一用）。 */
const idsIn = (html) => [...html.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);

/** 一条**带 scope**的完整选择器（判据要按槽名反查某一条规则时用它）。 */
const scoped = (slot) => '.ilife-page-ui .' + bulkBarSlot(slot);

/** 一段 CSS 里某条规则的声明体（花括号配平）。**按行首锚定**：样式段一条规则一行，
 *  行首对上才算那条规则——不然 `.…-act > .…-busy {` 这种「别的规则的后半截」会先被命中。 */
function ruleBody(css, selector) {
  const line = css.split('\n').find((l) => l.startsWith(selector + ' {'));
  if (line === undefined) return '';
  const open = css.indexOf(line);
  let depth = 0;
  for (let i = open + line.length - 1; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + line.length, i);
    }
  }
  return '';
}

/** 声明体里的属性名（`a: b;` 逐条；忽略注释已经由调用方剥掉）。 */
const propsIn = (body) => [...body.matchAll(/(?:^|;)\s*([-a-z]+)\s*:/g)].map((m) => m[1]);

/** 条的上边线取的那枚 token：**从产出 CSS 的兜底链里读出来**（`var(--ilife-<token>, …)`；
 *  README 对账与真机读色两处都用它，判据不另抄一份 token 名）。 */
function barTopToken() {
  const m = /border-top-color:\s*var\(--ilife-([a-z0-9-]+)\s*,/.exec(stripComments(bulkBarCss()));
  assert.ok(m, '产出 CSS 里找不到那条「条的上边线」的取值（`border-top-color: var(--ilife-…)`）');
  return m[1];
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('bulk-bar ① 渲染契约 · 形态 A 骨架', () => {
  const html = renderBulkBar(SAMPLE);

  it('骨架：根（`is-A` ＋ 机器键）→ 宿主（条目列 ＋ 操作条）→ 逐条一行的勾选框／字／读数', () => {
    assert.match(html, new RegExp('^<div class="' + BULK_BAR_CLASS + ' is-A"'
      + ' data-ilife-bulk-name="ledger-bulk" data-ilife-bulk-form="A">'));
    for (const slot of ['host', 'list', 'bar', 'count', 'num', 'unit', 'acts', 'hint']) {
      assert.ok(html.includes(bulkBarSlot(slot)), '缺槽：' + slot);
    }
    assert.equal(countOf(html, 'class="[^"]*-row( is-on| is-off)?"'), SAMPLE.items.length, '一条一个行');
    assert.equal(countOf(html, '<input type="checkbox"'), SAMPLE.items.length, '一条一个原生勾选框');
    assert.equal(countOf(html, 'class="[^"]*-act is-'), SAMPLE.actions.length + 4, '动作按钮枚数（四枚动作 ＋ 两块确认面各两枚）');
    assert.ok(html.includes('class="' + bulkBarSlot('reading') + '">241.50</span>'), '行右端读数照原样上屏');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('**选中态两重非颜色标记**：`is-on` ＋ 原生 `checked` ＋ 钩子属性；勾不动的那行写出原因', () => {
    assert.equal(countOf(html, 'class="[^"]*-row is-on"'), 3, '三行选中');
    assert.equal(countOf(html, ' checked value='), 3, '选中的三行原生框真是勾上的');
    assert.equal(countOf(html, 'data-ilife-bulk-on="1"'), 3, '选中的三行带「一开始就选中」的钩子');
    assert.equal(countOf(html, 'class="[^"]*-row is-off"'), 1, '一行勾不动');
    assert.equal(countOf(html, '<input type="checkbox" disabled'), 1, '勾不动落在原生框上');
    assert.ok(html.includes('class="' + bulkBarSlot('why') + '">这条是收入，没有「分类」这一格</i>'), '原因写出来');
  });

  it('操作条：已选数 ＋ 单位 ＋ 尾段读数；条与提示都在；带预演的动作有 `aria-controls`', () => {
    assert.ok(html.includes('<b class="' + bulkBarSlot('num') + '">3</b>'), '已选数');
    assert.ok(html.includes('class="' + bulkBarSlot('unit') + '">条已选</span>'), '计数单位那句');
    assert.ok(html.includes('class="' + bulkBarSlot('tail') + '">合计 361.50</span>'), '尾段读数照原样上屏');
    assert.ok(html.includes(bulkBarSlot('hint') + '" id="' + bulkBarHintId(SAMPLE.name) + '">共 5 条'), '提示那句');
    assert.equal(countOf(html, ' aria-controls="' + bulkBarConfirmId(SAMPLE.name, 'cat').slice(0, -3)), 2,
      '只有带预演的两枚动作指确认面');
    assert.equal(countOf(html, ' aria-expanded="true"'), 0, '不给 `openAction` ⇒ 都收起');
  });

  it('缺省形态：不选中 ⇒ **整条 `hidden`**（移出可点范围，不只是变透明）', () => {
    const idle = renderBulkBar({ name: 'n', items: [{ key: 'k', title: 't' }], actions: [{ key: 'a', label: '改' }] });
    assert.ok(idle.includes('class="' + bulkBarSlot('bar') + '" hidden'), '选中 0 条时条必须是 hidden');
    const picked = renderBulkBar({ name: 'n', items: [{ key: 'k', title: 't', selected: true }], actions: [{ key: 'a', label: '改' }] });
    assert.ok(!picked.includes('class="' + bulkBarSlot('bar') + '" hidden'), '选中 ≥1 条时条不该 hidden');
    assert.ok(picked.includes('<b class="' + bulkBarSlot('num') + '">1</b>'));
  });

  it('空态：条目给空数组 ⇒ 出设计过的那句（不是留白），且条仍是 hidden', () => {
    const empty = renderBulkBar({ name: 'n', items: [], actions: [{ key: 'a', label: '改' }] });
    assert.ok(empty.includes('class="' + bulkBarSlot('empty') + '" role="status">' + BULK_BAR_EMPTY_TEXT + '</p>'));
    assert.ok(empty.includes(bulkBarSlot('bar') + '" hidden'));
    assert.equal(countOf(empty, '<input type="checkbox"'), 0);
    const custom = renderBulkBar({ name: 'n', items: [], actions: [{ key: 'a', label: '改' }], emptyText: '这批没有可挑的' });
    assert.ok(custom.includes('>这批没有可挑的</p>'));
  });

  it('就地确认面：改哪几条**逐条写着**（`✓` 会改／`⊘` 跳过 ＋ 右端两个字 ＋ 旧值删除线）', () => {
    const panel = confirmOf(html, 'cat');
    assert.ok(panel.includes('aria-label="批量改分类"'), '确认面有可访问名');
    assert.ok(panel.includes(bulkBarSlot('ccap') + '">已选 3 条 · 改完能整批撤回</span>'), '标题右端那句');
    assert.equal(countOf(panel, 'class="[^"]*-prow( is-skip)?"'), PREVIEW_CAT.rows.length, '逐条一行');
    assert.equal(countOf(panel, bulkBarSlot('mark') + '" aria-hidden="true">✓'), 2, '会改的两行一枚 ✓');
    assert.equal(countOf(panel, bulkBarSlot('mark') + '" aria-hidden="true">⊘'), 1, '跳过的那行一枚 ⊘');
    assert.equal(countOf(panel, 'class="[^"]*-pstate">会改</em>'), 2, '会改那两行写着字');
    assert.equal(countOf(panel, 'class="[^"]*-pstate">跳过</em>'), 1, '跳过那行写着字');
    assert.ok(panel.includes('<s class="' + bulkBarSlot('old') + '">餐饮</s>'), '旧值带删除线（形）');
    assert.ok(panel.includes(bulkBarSlot('arrow') + '" aria-hidden="true">→</span>'), '箭头是装饰、读屏不念');
    assert.ok(panel.includes('这条是收入，没有「分类」这一格'), '跳过的那条写清为什么');
  });

  it('确认面：结论句与主按钮的字**按预演算**；一条都改不了时主按钮按不动', () => {
    const panel = confirmOf(html, 'cat');
    assert.ok(panel.includes('class="' + bulkBarSlot('sum') + '">会改 2 条 · 跳过 1 条</span>'), '结论句按预演算');
    assert.ok(panel.includes('>改这 2 条</button>'), '主按钮按「会改几条」算字');
    assert.ok(panel.includes('<span class="' + bulkBarSlot('vlabel') + '">改成</span>'), '「改成」那枚标签');
    assert.ok(panel.includes('<input class="' + bulkBarSlot('input') + '" type="text" value="外卖">'), '输入框带着现值');
    assert.equal(countOf(panel, bulkBarSlot('chip') + '" data-ilife-bulk-recent="'), PREVIEW_CAT.recent.length, '最近用过逐枚一枚');
    const none = renderBulkBar({
      name: 'n', items: [{ key: 'k', title: 't', selected: true }],
      actions: [{ key: 'a', label: '改', preview: { title: '改', rows: [{ keep: false, to: '不改', note: '都不适用' }] } }],
    });
    assert.ok(none.includes('>一条都改不了</button>'), '一条都改不了时主按钮的字');
    assert.ok(none.includes(' disabled>一条都改不了</button>'), '一条都改不了 ⇒ 主按钮 disabled');
    assert.ok(none.includes(bulkBarSlot('sum') + '">一条都改不了</span>'));
  });

  it('`openAction` 决定渲染时展开哪一块；不给就都收起', () => {
    const tag = renderBulkBar({ ...SAMPLE, openAction: 'tag' });
    const tagPanel = confirmOf(tag, 'tag');
    assert.ok(!/hidden/.test(tagPanel.slice(0, tagPanel.indexOf('>'))), 'openAction 命中的那块不 hidden');
    const catPanel = confirmOf(tag, 'cat');
    assert.ok(/hidden/.test(catPanel.slice(0, catPanel.indexOf('>'))), '别的块都收起');
    assert.equal(countOf(tag, ' aria-expanded="true"'), 1);
    const closed = renderBulkBar({ ...SAMPLE, openAction: undefined });
    assert.equal(countOf(closed, ' aria-expanded="true"'), 0, '不给 openAction ⇒ 都收起');
  });

  it('错态与忙碌态：错那句写在按钮旁边（`aria-describedby` 指它）；忙碌时**两枚字都在**（宽度锁住）', () => {
    const err = renderBulkBar({
      ...SAMPLE,
      actions: [{ key: 'cat', label: '改分类', error: '这批里有 1 条没改成（网络断了）' }, { key: 'del', label: '删除', tone: 'danger', busy: true }],
    });
    assert.ok(err.includes('id="' + bulkBarErrorId(SAMPLE.name, 'cat') + '" role="alert">改分类：这批里有 1 条没改成（网络断了）</p>'));
    assert.ok(err.includes(' aria-describedby="' + bulkBarErrorId(SAMPLE.name, 'cat') + '"'), '按钮指到那句错');
    assert.ok(err.includes('data-ilife-bulk-busy="1"'), '忙碌标记');
    assert.ok(err.includes(' aria-busy="true"'), '忙碌的语义面');
    assert.ok(err.includes('<span class="' + bulkBarSlot('label') + '">删除'
      + '<span class="' + bulkBarSlot('busy') + '" aria-hidden="true">正在删除</span></span>'),
    '正常态那枚字占着按钮的尺寸，忙碌那枚字住在它里面（出流 ⇒ 不参与固有宽）');
    assert.ok(err.includes('<span class="' + bulkBarSlot('busy') + '" aria-hidden="true">正在删除</span>'), '忙碌态那枚字');
    assert.ok(err.includes('data-ilife-bulk-action="del" data-ilife-bulk-tone="danger"'), '忙碌那枚还是 del');
    assert.ok(err.includes(' disabled aria-busy="true" data-ilife-bulk-busy="1">'), '忙碌 ⇒ 语义面与标记面一起给、按钮按不动');
  });

  it('转义面：每个文本字段逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html2 = renderBulkBar({
      name: evil, countUnit: evil, tail: evil, hint: evil, emptyText: evil, extraClass: undefined, openAction: 'x',
      items: [{ key: evil, title: evil, note: evil, reading: evil, selected: true, disabled: true, disabledReason: evil }],
      actions: [{
        key: 'x', label: evil, error: evil,
        preview: { title: evil, cap: evil, valueLabel: evil, value: evil, recent: [evil], summary: evil, submitLabel: evil, cancelLabel: evil,
          rows: [{ keep: true, from: evil, to: evil, note: evil }, { keep: false, to: evil, note: evil }] },
      }],
    });
    assert.equal(/<script/i.test(html2), false, '不得出现可执行脚本标签');
    assert.ok(html2.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html2.includes('&quot;'), '引号转义');
    assert.equal(/="[^"]*<[^"]*"/.test(html2), false, '属性里不许冒出裸尖括号');
    assert.ok(html2.includes('data-ilife-bulk-action="' + '&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;' + '"')
      || html2.includes('&quot;&gt;&lt;script&gt;'), '动作键在属性位被转义');
  });

  it('入参违规一律拒（不静默降级）：形态／清单／动作／预演逐条', () => {
    assert.deepEqual([...BULK_BAR_FORMS], ['A']);
    assert.deepEqual([...BULK_BAR_TONES], ['plain', 'danger', 'primary']);
    const ok = { name: 'n', items: [{ key: 'k', title: 't' }], actions: [{ key: 'a', label: '改' }] };
    assert.equal(throwsBlocks(() => renderBulkBar(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderBulkBar([])), true, '数组不是入参');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, name: '' })), true, '缺机器键');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, name: 1 })), true, '机器键不是串');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, form: 'B' })), true, '形态闭集外');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, form: 'bar' })), true, '形态闭集外（另一种写法）');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, items: 'x' })), true, 'items 不是数组');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, items: [null] })), true, '元素不是对象');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, items: [{ key: '', title: 't' }] })), true, '空键');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, items: [{ key: 'k', title: '' }] })), true, '空标题');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, items: [{ key: 'k', title: 't' }, { key: 'k', title: 'u' }] })), true, '键重复');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, items: [{ key: 'k', title: 't', selected: 1 }] })), true, 'selected 不是布尔');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, items: [{ key: 'k', title: 't', disabledReason: 'x' }] })), true,
      'disabledReason 给了却没 disabled');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, actions: [] })), true, '一枚动作都没有');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, actions: [{ key: 'a', label: '改' }, { key: 'a', label: '删' }] })), true, '动作键重复');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, actions: [{ key: 'a', label: '改', tone: 'pink' }] })), true, '色档闭集外');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, openAction: 'nope' })), true, 'openAction 没命中动作');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, openAction: 'a' })), true, 'openAction 命中了一枚没有预演的动作');
    const withPreview = { ...ok, actions: [{ key: 'a', label: '改', preview: { title: '改', rows: [{ keep: true, to: 'x' }] } }] };
    assert.equal(throwsBlocks(() => renderBulkBar({ ...withPreview, openAction: 'a' })), false, '命中带预演的动作 ⇒ 正常');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, actions: [{ key: 'a', label: '改', preview: { title: '改', rows: [] } }] })), true, '预演没有逐条');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, actions: [{ key: 'a', label: '改', preview: { title: '', rows: [{ keep: true, to: 'x' }] } }] })), true, '预演缺标题');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, actions: [{ key: 'a', label: '改', preview: { title: '改', rows: [{ to: 'x' }] } }] })), true, '缺 keep');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, actions: [{ key: 'a', label: '改', preview: { title: '改', rows: [{ keep: 'yes', to: 'x' }] } }] })), true, 'keep 不是布尔');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, actions: [{ key: 'a', label: '改', preview: { title: '改', rows: [{ keep: false, to: 'x' }] } }] })), true,
      '跳过的那条没写为什么');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, actions: [{ key: 'a', label: '改', preview: { title: '改', rows: [{ keep: true, to: '' }] } }] })), true, '新值空串');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, actions: [{ key: 'a', label: '改', preview: { title: '改', rows: [{ keep: true, to: 'x' }], recent: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] } }] })), true,
      '最近用过太多枚');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, extraClass: 'a"b' })), true, '附加类名不合规');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, tail: 1 })), true, '尾段不是串');
    const previewRows = (rows, extra) => ({ ...ok, actions: [{ key: 'a', label: '改', preview: { title: '改', rows, ...extra } }] });
    /* 上限按组件自己的常量派生（`BULK_BAR_*_MAX`），判据不抄 51／201／7 这种字面量：
       常量改小了这里跟着红，改了名字这里编译不过。 */
    assert.equal(throwsBlocks(() => renderBulkBar(previewRows(new Array(BULK_BAR_PREVIEW_MAX + 1).fill({ keep: true, to: 'x' })))), true,
      '预演条数超上限（' + String(BULK_BAR_PREVIEW_MAX) + ' ＋ 1 条）');
    assert.equal(throwsBlocks(() => renderBulkBar(previewRows(new Array(BULK_BAR_PREVIEW_MAX).fill({ keep: true, to: 'x' })))), false,
      '正好到上限（' + String(BULK_BAR_PREVIEW_MAX) + ' 条）⇒ 正常');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, items: new Array(BULK_BAR_ITEM_MAX + 1).fill({ key: 'k', title: 't' }) })), true,
      '条目数超上限');
    const recentFull = Array.from({ length: BULK_BAR_RECENT_MAX + 1 }, (_, i) => 'r' + String(i));
    assert.equal(throwsBlocks(() => renderBulkBar(previewRows([{ keep: true, to: 'x' }], { recent: recentFull }))), true,
      '最近用过超上限（' + String(BULK_BAR_RECENT_MAX) + ' ＋ 1 枚）');
    assert.equal(throwsBlocks(() => renderBulkBar(previewRows([{ keep: true, to: 'x' }], { recent: recentFull.slice(0, BULK_BAR_RECENT_MAX) }))), false,
      '正好到上限 ⇒ 正常');
    /* 动作标了按不动却没给 `hint`：屏上会是一枚**没有任何说明的灰按钮** ⇒ 当场拒。 */
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, actions: [{ key: 'a', label: '改', disabled: true }] })), true,
      '动作 disabled:true 却没给 hint');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, hint: '这条是收入，改不了', actions: [{ key: 'a', label: '改', disabled: true }] })), false,
      '给了 hint ⇒ 按不动的那枚说得清为什么');
  });

  it('稀疏数组（`new Array(n)` 的洞）一律拒：四处在门外，一处都不许漏成 `TypeError`', () => {
    const ok = { name: 'n', items: [{ key: 'k', title: 't' }], actions: [{ key: 'a', label: '改' }] };
    const bare = (n) => { const a = new Array(n); return a; };       // 全是洞
    const holed = (n) => { const a = new Array(n); a[n - 1] = { key: 'k', title: 't' }; return a; }; // 尾项有、前面是洞
    /* 这四处是审查席逐条实测出来的：洞被 `map` 跳过 ⇒ 校验那一趟全过，渲染那一趟在 `undefined`
       上读字段（`selected`／`tone`／`keep`／`replace`）抛 `TypeError`——**不是** `BlocksError`。 */
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, items: bare(3) })), true, 'items 是稀疏数组');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, items: holed(3) })), true, 'items 前面有洞、尾项有');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, actions: bare(1) })), true, 'actions 是稀疏数组');
    assert.equal(throwsBlocks(() => renderBulkBar({
      ...ok, actions: [{ key: 'a', label: '改', preview: { title: '改', rows: bare(2) } }],
    })), true, 'preview.rows 是稀疏数组');
    assert.equal(throwsBlocks(() => renderBulkBar({
      ...ok, actions: [{ key: 'a', label: '改', preview: { title: '改', rows: [{ keep: true, to: 'x' }], recent: bare(1) } }],
    })), true, 'preview.recent 是稀疏数组');
    /* 洞**不等于**「显式给了 undefined」：密数组照旧走各件自己的逐项校验（也是 BlocksError，但报错点更准）。 */
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, items: [undefined] })), true, '显式 undefined 的密数组');
    assert.equal(throwsBlocks(() => renderBulkBar({ ...ok, actions: new Array(1).fill({ key: 'a', label: '改' }) })), false,
      '填满之后照常渲染（稀疏才拒，不是「用过 new Array 就拒」）');
  });

  it('**入参表以外的键一律拒**：顶层／条目／动作／预演／预演行**五层**各加一个未知键都抛 `BlocksError`', () => {
    /* 写错的键名（`titel`／`reding`／`ovewAction`）被静默吞掉时，屏上只是**静静地少一块**——
       少一行字、少一枚动作、少一条预演行，而调用方以为自己设上了。五层逐层加一个未知键，每层都得拒。
       **继承来的与不可枚举的**键同样算（只走 `Object.keys` 会把这两类漏掉）。 */
    const deep = {
      name: 'n', items: [{ key: 'k', title: 't' }],
      actions: [{ key: 'a', label: '改', preview: { title: '改', rows: [{ keep: true, to: 'x' }] } }],
    };
    const withKey = (path, key) => {
      const c = JSON.parse(JSON.stringify(deep));
      let at = c;
      for (const t of path) at = at[t];
      at[key] = 1;
      return c;
    };
    const layers = [
      ['顶层', []],
      ['条目', ['items', 0]],
      ['动作', ['actions', 0]],
      ['预演', ['actions', 0, 'preview']],
      ['预演行', ['actions', 0, 'preview', 'rows', 0]],
    ];
    for (const [label, path] of layers) {
      assert.equal(throwsBlocks(() => renderBulkBar(withKey(path, 'zzUnknown'))), true,
        label + ' 这一层多给一个键（多半是打错名）必须拒，不许静默吞掉');
      /* 去掉那个未知键、其余一字不动 ⇒ 必须照常渲出来（拒的是未知键，不是这些形状）。 */
      const clean = withKey(path, 'zzUnknown');
      let at = clean;
      for (const t of path) at = at[t];
      delete at.zzUnknown;
      assert.equal(throwsBlocks(() => renderBulkBar(clean)), false,
        label + ' 这一层：把未知键去掉之后就得照常渲染（拒的是未知键，不是这一层本身）');
    }
    /* 先例口径的两条路都要走：`Object.create({zzUnknown:1})`（**继承来的**）与
       `Object.defineProperty(…, {enumerable:false})`（**不可枚举的**）——`Object.keys` 两条都看不见。 */
    const inherited = () => Object.assign(Object.create({ zzUnknown: 1 }), {
      name: 'n', items: [{ key: 'k', title: 't' }], actions: [{ key: 'a', label: '改' }],
    });
    assert.equal(throwsBlocks(() => renderBulkBar(inherited())), true, '顶层继承来的未知键');
    const hidden = { name: 'n', items: [{ key: 'k', title: 't' }], actions: [{ key: 'a', label: '改' }] };
    Object.defineProperty(hidden, 'zzUnknown', { value: 1, enumerable: false });
    assert.equal(throwsBlocks(() => renderBulkBar(hidden)), true, '顶层不可枚举的未知键');
    /* 可选键一个都不许被误拒：表里列全了的可选字段照旧收下（误拒合法调用方比吞键更坏）。 */
    assert.equal(throwsBlocks(() => renderBulkBar({
      ...deep, countUnit: '条', tail: '合计 32.00', hint: '共 1 条', emptyText: '空的',
      extraClass: 'a b', form: 'A',
      items: [{ key: 'k', title: 't', note: 'n', reading: '32.00', selected: true }],
      actions: [{ key: 'a', label: '改', tone: 'danger', disabled: false, busy: false, error: '' }],
    })), false, '入参表里的可选键一个都不许误拒');
  });

  it('非 ASCII 件名／动作键：行内 `id` 同页唯一，`aria-controls` 指着**自己那块**确认面', () => {
    const cn = {
      name: '记账条',
      items: [{ key: 'a1', title: '餐饮 · 午餐', selected: true }],
      actions: [
        { key: '改分类', label: '改分类', preview: { title: '批量改分类', rows: [{ keep: true, to: '外卖' }] } },
        { key: '改账户', label: '改账户', preview: { title: '批量改账户', rows: [{ keep: true, to: '招行' }] } },
      ],
      hint: '共 1 条',
    };
    const html = renderBulkBar(cn);
    const ids = idsIn(html);
    assert.equal(new Set(ids).size, ids.length, '同页 id 必须唯一（撞了的话 `aria-controls` 会指错块）：' + ids.join('、'));
    assert.equal(ids.includes(bulkBarConfirmId(cn.name, '改分类')), true);
    assert.equal(ids.includes(bulkBarConfirmId(cn.name, '改账户')), true);
    assert.notEqual(bulkBarConfirmId(cn.name, '改分类'), bulkBarConfirmId(cn.name, '改账户'));
    /* 逐枚对账：按钮 `aria-controls` 指的那块，`aria-label` 必须是**这一枚**的预演标题。 */
    for (const a of cn.actions) {
      const at = html.indexOf('data-ilife-bulk-action="' + a.key + '"');
      assert.ok(at > 0, '找不到动作 ' + a.key + ' 的按钮');
      const tag = html.slice(at, html.indexOf('>', at));
      const id = /aria-controls="([^"]*)"/.exec(tag);
      assert.ok(id, a.key + ' 的按钮缺 aria-controls');
      const panel = html.slice(html.indexOf('id="' + id[1] + '"'));
      assert.ok(panel.startsWith('id="' + id[1] + '" role="group" aria-label="' + a.preview.title + '"'),
        a.key + ' 的按钮指的不是自己那块确认面（' + id[1] + ' 是别的块）');
    }
    /* 中文件名在别处也不许退化成同一个串：计数句与提示句的 id 各按自己的件名拼。 */
    assert.notEqual(bulkBarCountId('记账条'), bulkBarCountId('记账条 '));
    assert.equal(html.includes('id="' + bulkBarCountId(cn.name) + '"'), true, '计数句的 id 按件名拼');
    assert.equal(html.includes('id="' + bulkBarHintId(cn.name) + '"'), true, '提示句的 id 按件名拼');
    const err = renderBulkBar({ ...cn, actions: [{ key: '改分类', label: '改分类', error: '网络断了' }] });
    assert.equal(err.includes('id="' + bulkBarErrorId(cn.name, '改分类') + '"'), true, '错态句的 id 按件名＋动作键拼');
  });

  it('闭集里的槽名一个都不许是死声明：每个槽都真的在标记里出现过', () => {
    /* 三种样例凑齐全部槽：常态（条目／操作条／两块确认面）＋ 空态（`empty`）＋ 错态与忙碌态。 */
    const screens = [
      renderBulkBar({ ...SAMPLE, openAction: 'cat' }),
      renderBulkBar({ name: 'n-empty', items: [], actions: [{ key: 'a', label: '改' }] }),
      renderBulkBar({
        ...SAMPLE,
        actions: [{ key: 'cat', label: '改分类', error: '这批里有 1 条没改成', preview: PREVIEW_CAT }, { key: 'del', label: '删除', tone: 'danger', busy: true }],
      }),
    ];
    const onScreen = new Set();
    for (const html of screens) {
      for (const m of html.matchAll(/class="([^"]*)"/g)) for (const cls of m[1].split(' ')) onScreen.add(cls);
    }
    const dead = BULK_BAR_SLOTS.filter((slot) => !onScreen.has(bulkBarSlot(slot)));
    assert.deepEqual(dead, [], '这些槽名在闭集里、却一个都上不了屏（死声明）：' + dead.join('、'));
  });

  it('纯函数：同样的入参恒产同样的字节；附加类名照挂', () => {
    assert.equal(renderBulkBar(SAMPLE), renderBulkBar(SAMPLE));
    const extra = renderBulkBar({ ...SAMPLE, extraClass: 'ok-class other' });
    assert.ok(extra.includes('ok-class other'));
    assert.match(extra, new RegExp('^<div class="' + BULK_BAR_CLASS + ' is-A ok-class other"'));
  });

  it('槽位闭集与类名一致（判据不另抄一份字面量）', () => {
    assert.equal(bulkBarSlot('bar'), BULK_BAR_CLASS + '-bar');
    assert.equal(bulkBarSlot('bar', 'x-'), 'x-block-bulk-bar-bar');
    for (const slot of BULK_BAR_SLOTS) assert.ok(bulkBarSlot(slot).startsWith(BULK_BAR_CLASS + '-'), slot);
    assert.ok(BULK_BAR_SLOTS.includes('confirm') && BULK_BAR_SLOTS.includes('prow'));
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('bulk-bar ② 样式与零 DOM 纪律', () => {
  const css = bulkBarCss();
  const clean = stripComments(css);

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且**只出现一次**', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = ruleSelectors(clean);
    assert.ok(selectors.length >= 45, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + one);
        assert.ok(one.includes(BULK_BAR_CLASS), '选择器必须只碰本件类名根：' + one);
        /* **点必须在**：漏点的 `s()` 会拼出 `.ilife-page-ui ilife-block-bulk-bar-count`——
           那是「找一个名叫 `ilife-block-bulk-bar-count` 的**元素**」，永远命中不了；语法合法、
           编译不报错、屏幕上「看着也还行」，只有真机上量几何才会露（本件真踩过一次）。 */
        assert.match(one, /\.[A-Za-z0-9_-]*ilife-block-bulk-bar[A-Za-z0-9_-]*/,
          '选择器里的本件类名必须带点（漏点＝永不命中的死规则）：' + one);
        assert.equal((one.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次（拼两遍＝永不命中的死规则）：' + one);
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零视口宽度查询／必带 `@container` 且自己声明了容器', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(/@media[^{]*max-width/.test(clean), false, '媒体查询不许判宽度（视口宽 ≠ 组件宽）');
    assert.equal(/@media[^{]*min-width/.test(clean), false);
    assert.ok(clean.includes('@media (hover:hover) and (pointer:fine)'), 'hover 只许是增强');
    assert.ok(clean.includes('@media (prefers-reduced-motion: reduce)'), '减少动态那一档');
    assert.ok(clean.includes('@container (max-width:'), '窄档必须由容器判');
    assert.ok(clean.includes('container-type: inline-size'), '写了 @container 就必须自己声明容器');
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
  });

  it('零手写色值（兜底链那一处除外）、源码级零手写 `var(--ilife-…)`、**不拿 ink 系当面**', () => {
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外的颜色字面量：' + [...new Set(bare)].join('、'));
    for (const src of styleSources('bulk-bar')) {
      const code = stripComments(src.src);
      assert.deepEqual([...code.matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [], src.file + ' 里请改走 skinVar()');
    }
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了「面」：' + value);
    }
    assert.ok(clean.includes('surface-2'), '整行选中走次要面');
    assert.ok(clean.includes('accent-soft'), '有文字的选中面走强调软底');
    assert.ok(clean.includes('color-mix(in srgb,'), '危险档的描边是从 token 算出来的');
  });

  it('截断纪律：零 `text-overflow`／`line-clamp`／`nowrap`／`overflow-x`，长串一律折行', () => {
    for (const bad of ['text-overflow', 'line-clamp', 'white-space: nowrap', 'white-space:nowrap', 'overflow-x']) {
      assert.equal(clean.includes(bad), false, '样式段里不许出现 ' + bad);
    }
    assert.ok(clean.includes('overflow-wrap: anywhere'), '长串要能折行');
  });

  it('触控地板与「条不盖条目」的几何事实都写在样式里（数字只有一处出处）', () => {
    assert.ok(clean.includes('min-height: 44px'), '命中盒地板');
    assert.ok(clean.includes('min-width: 44px'));
    assert.ok(clean.includes('min-height: 52px'), '整行命中区的高度');
    assert.ok(clean.includes('gap: 8px'), '相邻触控目标间距');
    assert.ok(clean.includes('position: sticky'), '条粘在底部');
    assert.ok(clean.includes('bottom: 0'));
  });

  it('窄档阈值只有一个出处（`style-sizes.ts`）；产出 CSS 里的 `@container` 逐条取同一个数', () => {
    /* 铁律二：概念只有一处。先前 `style-confirm.ts` 自己又写了一份 `560`——两边各改一次必然走散
       （窄档一半按 560、一半按别的数，屏幕上就是「动作排铺满了、页脚却没有」这类半截效果）。 */
    const declared = [];
    for (const src of styleSources('bulk-bar')) {
      if (/\b[A-Z_]*NARROW[A-Z_]*\s*=/.test(stripComments(src.src))) declared.push(src.file);
    }
    assert.deepEqual(declared, ['style-sizes.ts'], '窄档阈值只许在 style-sizes.ts 里声明一次，实有：' + declared.join('、'));
    const limits = [...clean.matchAll(/@container \(max-width: (\d+(?:\.\d+)?)px\)/g)].map((m) => Number(m[1]));
    assert.ok(limits.length >= 2, '@container 窄档段落数不对：' + limits.length);
    assert.deepEqual([...new Set(limits)], [BULK_BAR_NARROW_PX],
      '产出 CSS 里的窄档阈值必须都取 BULK_BAR_NARROW_PX（' + String(BULK_BAR_NARROW_PX) + '）：' + limits.join('、'));
  });

  it('README 不变量 4 与条上边线的**实际取值**对齐（文档与代码不许各说各话）', () => {
    const token = barTopToken();
    const readme = readFileSync(join(DIR, 'README.md'), 'utf8');
    const line = readme.split(/\r?\n/).find((l) => l.includes('上边线'));
    assert.ok(line !== undefined, 'README 里找不到讲那条上边线的那句话');
    assert.ok(line.includes('`' + token + '`'),
      'README 那句「上边线」没写清取的是哪枚 token：样式里是 `' + token + '`，文档里那句话得跟着它（改一边不改另一边＝未报备的偏离）');
  });

  it('`hidden` 被显式重写（`display:flex`／`grid` 会压过 UA 那条 `[hidden]{display:none}`）', () => {
    assert.ok(clean.includes(bulkBarSlot('bar') + '[hidden]'), '操作条的 hidden 必须显式兜住');
    assert.ok(clean.includes(bulkBarSlot('confirm') + '[hidden]'), '确认面的 hidden 必须显式兜住');
    assert.ok(/\.ilife-block-bulk-bar-bar\[hidden\]\s*\{\s*display:\s*none;\s*\}/.test(clean));
  });

  it('可见焦点两处都在：勾选框（视觉隐藏）画在视觉盒上、其余可点元素走通用那条', () => {
    assert.ok(clean.includes('input:focus-visible + .ilife-block-bulk-bar-box'), '勾选框的焦点环画在视觉盒上');
    assert.ok(clean.includes(BULK_BAR_CLASS + ' :focus-visible'), '通用可见焦点地板');
    assert.equal(/outline:\s*none/.test(clean), false, '不许把焦点抹掉');
  });

  it('状态矩阵齐：`:active` 只碰 transform、`disabled` 写得出原因、忙碌那枚字出流（不参与固有宽）', () => {
    /* `:active` 那一档**只许碰 `transform`**：碰布局属性会把按下那一刻变成一次重排
       （手机上就是「按下去，整排跳一下」）。断的是这个语义，不是某一串字节。 */
    const active = ruleBody(clean, scoped('act') + ':not([disabled]):active');
    assert.deepEqual(propsIn(active), ['transform'], ':active 只许声明 transform（碰布局＝按下即重排）');
    assert.match(active, /transform:\s*scale\(\s*0?\.\d+\s*\)/, '真按下那一刻是一次缩放：' + active.trim());
    const transition = /transition:\s*transform\s+(\d+)ms/.exec(clean);
    assert.ok(transition !== null, '动效走 transform 的过渡');
    assert.ok(Number(transition[1]) <= 80, '动效时长要 ≤80ms，实有 ' + transition[1] + 'ms');
    assert.ok(clean.includes('cursor: not-allowed'), '禁用光标');
    assert.ok(clean.includes('aria-busy') === false && clean.includes('data-ilife-bulk-busy="1"]'), '忙碌态靠挂在按钮上的标记');
    /* 忙碌那枚字叠在**同一个格**上、且**出流**：出流 ⇒ 它的固有宽一个像素都不参与按钮尺寸
       （判据 ④ 在真机上另断「四枚仍是一行」「忙碌态不改变按钮尺寸」）。 */
    const busy = ruleBody(clean, scoped('busy'));
    assert.match(busy, /position:\s*absolute/, '忙碌那枚字必须出流（否则它的固有宽会把动作排顶成两行）');
    assert.match(ruleBody(clean, scoped('act') + ' > .' + bulkBarSlot('label')), /position:\s*relative/,
      '正常那枚字是忙碌那枚字的定位基准');
    /* 忙碌那枚字横向按按钮的内距外扩 ⇒ 它这块正好是按钮的可用宽度：忙碌字再长也只在按钮内部消化，
       两侧都不越出按钮（不越出按钮就不会给动作排或页面添出横向溢出）。两处数字必须同源。 */
    const padX = /padding:\s*\d+px\s+(\d+)px/.exec(ruleBody(clean, scoped('act')));
    assert.ok(padX !== null, '动作按钮的左右内距抽不出来');
    assert.ok(busy.includes('left: -' + padX[1] + 'px') && busy.includes('right: -' + padX[1] + 'px'),
      '忙碌那枚字的左右外扩必须等于按钮的左右内距（' + padX[1] + 'px）：' + busy.trim());
    assert.match(ruleBody(clean, scoped('act') + '[' + 'data-ilife-bulk-busy="1"] > .' + bulkBarSlot('label')), /visibility:\s*hidden/,
      '忙碌时正常那枚字藏起来（但仍占着位置 ⇒ 按钮尺寸不变）');
    assert.match(ruleBody(clean, scoped('act') + '[' + 'data-ilife-bulk-busy="1"] .' + bulkBarSlot('busy')), /visibility:\s*visible/,
      '忙碌时忙碌那枚字露出来');
    assert.equal(clean.includes('transitionend'), false, '状态不许依赖 transitionend');
  });

  it('`dist/components/bulk-bar/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'bulk-bar');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 7, '至少该有 index／attrs／model／render／style／style-confirm／runtime 的产物：' + files.join('、'));
    const stripLiterals = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const name of files) {
      const code = stripLiterals(readFileSync(join(dir, name), 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, name + ' 里出现了 ' + needle);
      }
    }
  });

  it('运行时段产出的是 JS 文本：DOM 名只出现在那段文本里，且只经**唯一那处别名**', () => {
    const js = buildBulkBarJs();
    assert.ok(typeof js === 'string' && js.length > 1000);
    /* 「DOM 只经一处别名」的可查形式：整段文本里 `document` 只出现一次（别名那一处），
       `document.` 一次都不出现——别处想用 DOM 都得先过那枚别名。真的行为面由 ⑤ 真机断。 */
    assert.equal((js.match(/\bdocument\b/g) || []).length, 1, '运行时的 DOM 入口只许有一处别名');
    assert.equal(js.includes('document.'), false, '别处不许直接使唤 document.');
    assert.ok(js.includes('doc.addEventListener("change"') && js.includes('doc.addEventListener("click"'),
      '勾选与点击两枚委派都在');
    assert.ok(js.includes('hidden'), '条的显隐在运行时里改');
    assert.ok(js.includes(BULK_BAR_EVENT_CHANGE) && js.includes(BULK_BAR_EVENT_ACTION));
    assert.ok(js.includes('hidden'));
    assert.ok(!js.includes('transitionend'), '不许依赖 transitionend');
    for (const word of ['快捷键', '方向键', '按 Enter', 'Esc', 'Tab', '⌘', '⌥']) {
      assert.equal(js.includes(word), false, '运行时里不许出现键盘语汇：' + word);
      assert.equal(renderBulkBar(SAMPLE).includes(word), false, '标记里不许出现键盘语汇：' + word);
    }
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('bulk-bar ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(BULK_BAR_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const before = renderMultiChecks({ name: 'n', label: '挑几条', rows: [{ id: 'a', title: 'x' }] });
    renderBulkBar(SAMPLE);
    assert.equal(renderMultiChecks({ name: 'n', label: '挑几条', rows: [{ id: 'a', title: 'x' }] }), before,
      '别件的产物逐字节不变');
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(bulkBarCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-bulk-bar'), '前缀必须作用到 scope 与类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
    assert.ok(css.includes('.x-block-bulk-bar-confirm'));
  });
});

/* ── ④⑤ 两档几何（真机）＋ 皮肤纪律 ＋ 行为 ─────────────────────────── */

/** 静态几何判据（真机起不来时的退路）：**真断几条几何事实**，不是「HTML 里出现过 hidden 这个词」。
 *
 *  真机量不了，能钉的就这些：定宽不许过窄档、触控地板写在样式里、忙碌那枚字必须出流
 *  （它的固有宽会顶换行，是 390 档动作排被挤成两行的根）、选中 0 条时条必须 `hidden`。 */
function assertStaticGeometry(css, html) {
  const clean = stripComments(css);
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const wide = [...px(html), ...px(clean)].filter((v) => v > 390);
  assert.deepEqual(wide, [], '出现过不了窄档（390）的固定宽度：' + wide.join('、'));
  assert.ok(clean.includes('min-height: ' + String(BULK_BAR_MIN_TARGET_PX) + 'px'), '命中盒地板写在样式里');
  assert.ok(clean.includes('min-height: ' + String(BULK_BAR_ROW_MIN_HEIGHT_PX) + 'px'), '整行命中区的高度写在样式里');
  assert.ok(clean.includes('position: sticky') && clean.includes('bottom: 0'), '条粘在视口底部');
  const busy = ruleBody(clean, scoped('busy'));
  assert.match(busy, /position:\s*absolute/,
    '忙碌那枚字必须出流：它的固有宽（`正在 ＋ 按钮字`）参与按钮尺寸时，390 档四枚动作会被挤成 3＋1');
  const idle = renderBulkBar({ name: 'n', items: [{ key: 'k', title: 't' }], actions: [{ key: 'a', label: '改' }] });
  assert.match(idle, new RegExp('class="' + bulkBarSlot('bar') + '" hidden'),
    '选中 0 条 ⇒ 整条移出可点范围（静态面看得出来），不是靠「变透明」');
}

const pageHtml = (cases) => cases.map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');

/** 两种压力样例：常态（三行选中、两枚带预演）与**极端长串**（长标题／长读数／长提示／长按钮字）。 */
function cases() {
  const long = '超级长的条目名字'.repeat(12);
  return [
    { name: 'normal', html: renderBulkBar(SAMPLE) },
    {
      name: 'long',
      html: renderBulkBar({
        name: 'long-bulk',
        countUnit: '条',
        tail: '合计 ' + '9'.repeat(48) + '.50',
        hint: '共 ' + '2'.repeat(40) + ' 条 · 这一句故意长到要折三四行，用来量窄档会不会被顶出横向滚动',
        openAction: 'cat',
        items: [
          { key: 'l1', title: long, note: long, reading: '12345678901234567890.00'.repeat(2), selected: true },
          { key: 'l2', title: long, reading: '0.01' },
        ],
        actions: [
          {
            key: 'cat', label: '改分类' + '（含子分类与跨账户）'.repeat(4),
            preview: {
              title: '批量改分类' + '，标题也能很长'.repeat(3),
              cap: '已选 2 条 · 改完能整批撤回',
              value: '外卖'.repeat(20),
              recent: ['外卖', '零食', '请客'].map((x) => x.repeat(6)),
              rows: [
                { keep: true, from: '餐饮'.repeat(8), to: '外卖'.repeat(8), note: '午餐 32.00（09-25）' },
                { keep: false, to: '不改', note: '这条是收入'.repeat(10) + '：没有「分类」这一格' },
              ],
            },
          },
          { key: 'del', label: '删除', tone: 'danger' },
        ],
      }),
    },
    /* 非 ASCII 件名／动作键（本仓的机器键大量是中文）：`id` 与 `aria-controls` 在这一档最容易撞
       ——两个动作键编码成同一个串时，点「改账户」开出来的会是「改分类」那块面板。 */
    {
      name: 'cn',
      html: renderBulkBar({
        name: '记账条',
        hint: '共 2 条',
        items: [
          { key: 'c1', title: '餐饮 · 午餐', reading: '32.00', selected: true },
          { key: 'c2', title: '交通 · 地铁', reading: '6.00' },
        ],
        actions: [
          { key: '改分类', label: '改分类', preview: { title: '批量改分类', rows: [{ keep: true, to: '外卖' }] } },
          { key: '改账户', label: '改账户', preview: { title: '批量改账户', rows: [{ keep: true, to: '招行' }] } },
        ],
      }),
    },
    /* 长清单（70 行）：**中段滚动**那一档要它——宿主比视口高，条才会粘在视口底部并盖住正滚过的几行。 */
    {
      name: 'many',
      html: renderBulkBar({
        name: 'many-bulk',
        hint: '共 70 条 · 一次改这么多先看一眼影响面',
        tail: '合计 1234.50',
        items: Array.from({ length: 70 }, (_, i) => ({
          key: 'm' + String(i + 1),
          title: '第 ' + String(i + 1) + ' 条 · 餐饮',
          note: '09-25 · 现金',
          reading: String(i + 1) + '.00',
          selected: i === 0 || i === 1,
        })),
        actions: [{ key: 'cat', label: '改分类' }, { key: 'del', label: '删除', tone: 'danger' }],
      }),
    },
  ];
}

describe('bulk-bar ④⑤ 两档几何 · 皮肤纪律 · 行为（真机 headless Chrome ＋ CDP）', () => {
  it('容器 390 与 1280：零横溢／条不盖条目／命中盒 ≥44／间距 ≥8／零截断／四套皮肤标记逐字节相同', async (t) => {
    const css = bulkBarCss();
    const js = buildBulkBarJs();
    const casesHtml = pageHtml(cases());
    const listener = '<script>window.__ev=[];'
      + 'document.addEventListener(' + JSON.stringify(BULK_BAR_EVENT_CHANGE) + ',function(e){'
      + 'window.__ev.push(["change",e.detail.count,e.detail.keys.join(",")]);});'
      + 'document.addEventListener(' + JSON.stringify(BULK_BAR_EVENT_ACTION) + ',function(e){'
      + 'window.__ev.push(["action",e.detail.action,e.detail.keys.length,e.detail.value]);});'
      + '</script>';
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n')
        + '<script>' + js + '</script>' + listener,
      css: skinCss() + '\n' + css,
      height: 1800,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：定宽不过窄档／触控地板写在样式里／'
        + '忙碌那枚字出流（换行只由正常那枚字决定）／选中 0 条时整条 hidden');
      assertStaticGeometry(css, casesHtml);
      return t.skip('本机无 Chrome／Chromium：两档几何与行为判据需真浏览器');
    }
    try {
      const seen = [];
      for (const width of [390, 1280]) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1,
          width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of SKIN_NAMES) {
          for (const c of cases()) {
            const scope = '.' + skinClass(skin) + ' [data-case="' + c.name + '"] ';
            /* **量之前先把这一格滚到下沿**：条是 `sticky` 的，长列表滚到中段时它会贴在视口底部
               （那时它盖住的是**正在滚过**的条目，这是「够得着」换来的，样式段里写明走不透明底）；
               滚到本格下沿 ⇒ 粘住的位移归零，量到的就是**在本流位置**上的几何：条与条目不重叠。 */
            await page.ev('document.querySelector(' + JSON.stringify(scope.trim())
              + ').scrollIntoView({block:"end"}); true');
            const root = await page.read([scope + '.' + BULK_BAR_CLASS]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            assert.ok(root[0].maxScrollW <= root[0].maxClientW + 1,
              width + ' 档 ' + skin + ' ' + c.name + '：根横向溢出 ' + root[0].maxScrollW + ' > ' + root[0].maxClientW);
            assert.equal(root[0].scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            /* 关键语义零截断：行主字／副语／读数／已选数／结论句／预演行那两个字。 */
            const texts = await page.read([bulkBarSlot('name'), bulkBarSlot('note'), bulkBarSlot('reading'),
              bulkBarSlot('count'), bulkBarSlot('tail'), bulkBarSlot('sum'), bulkBarSlot('pstate'), bulkBarSlot('hint')]
              .map((slot) => scope + '.' + slot));
            for (const one of texts) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel
                + ' 有 ' + one.clipped + ' 处被截断');
            }
            /* 几何：条与条目**不重叠**、条是 sticky、命中盒与间距、触控地板。 */
            const box = await page.ev('(function(){'
              + 'var root=document.querySelector(' + JSON.stringify(scope + '.' + BULK_BAR_CLASS) + ');'
              + 'var bar=root.querySelector(' + JSON.stringify('.' + bulkBarSlot('bar')) + ');'
              + 'var rows=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + bulkBarSlot('row')) + '));'
              + 'var rowOn=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + bulkBarSlot('row') + '.is-on') + '));'
              + 'var checks=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + bulkBarSlot('check') + ' input') + '));'
              + 'var acts=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + bulkBarSlot('act') + ':not([hidden])') + '));'
              + 'var chips=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + bulkBarSlot('chip')) + '));'
              + 'var cs=getComputedStyle(bar);'
              + 'var o={position:cs.position,bottom:cs.bottom,barTop:Math.round(bar.getBoundingClientRect().top),'
              + 'rowBottom:-1e9,onBottom:-1e9,rowMin:1e9,checkMin:1e9,actMin:1e9,chipMin:1e9,nact:0,minGap:1e9,'
              + 'visActs:[]};'
              + 'for(var i=0;i<rows.length;i+=1){var r=rows[i].getBoundingClientRect();'
              + 'if(r.bottom>o.rowBottom)o.rowBottom=Math.round(r.bottom); if(r.height<o.rowMin)o.rowMin=Math.round(r.height);}'
              + 'for(var j=0;j<rowOn.length;j+=1){var r2=rowOn[j].getBoundingClientRect();'
              + 'if(r2.bottom>o.onBottom)o.onBottom=Math.round(r2.bottom);}'
              + 'for(var k=0;k<checks.length;k+=1){var r3=checks[k].getBoundingClientRect();'
              + 'if(Math.min(r3.width,r3.height)<o.checkMin)o.checkMin=Math.round(Math.min(r3.width,r3.height));}'
              + 'for(var m=0;m<acts.length;m+=1){var r4=acts[m].getBoundingClientRect();'
              + 'if(r4.width<=0||r4.height<=0)continue;'
              + 'if(Math.min(r4.width,r4.height)<o.actMin)o.actMin=Math.round(Math.min(r4.width,r4.height));'
              + 'o.nact+=1; o.visActs.push([Math.round(r4.left),Math.round(r4.right),Math.round(r4.top),Math.round(r4.bottom)]);}'
              + 'for(var n=0;n<chips.length;n+=1){var r5=chips[n].getBoundingClientRect();'
              + 'if(r5.width<=0||r5.height<=0)continue;'
              + 'if(Math.min(r5.width,r5.height)<o.chipMin)o.chipMin=Math.round(Math.min(r5.width,r5.height));}'
              /* 相邻触控目标间距：同一排（纵向重叠）的两枚之间，横向缝 ≥8。 */
              + 'for(var a=0;a<o.visActs.length;a+=1){for(var b=a+1;b<o.visActs.length;b+=1){'
              + 'var p=o.visActs[a],q=o.visActs[b];var vOverlap=(p[1]-q[0]>0&&q[1]-p[0]>0)===false;'
              + 'var sameRow=Math.min(p[3],q[3])-Math.max(p[2],q[2])>0;'
              + 'if(!sameRow)continue; var gap=q[0]-p[1]; if(gap>=0&&gap<o.minGap)o.minGap=gap;}}'
              + 'return o;}())');
            assert.equal(box.position, 'sticky', width + ' 档 ' + skin + '：条要粘在底部');
            assert.ok(box.barTop >= box.rowBottom - 1,
              width + ' 档 ' + skin + ' ' + c.name + '：滚到本格下沿时条仍压着条目（条顶 ' + box.barTop + ' < 条目底 ' + box.rowBottom + '）');
            assert.ok(box.barTop >= box.onBottom - 1,
              width + ' 档 ' + skin + ' ' + c.name + '：条压住了**选中的**条目（' + box.barTop + ' < ' + box.onBottom + '）');
            assert.ok(box.rowMin >= 52, width + ' 档 ' + skin + '：条目命中区不足（最矮 ' + box.rowMin + 'px）');
            assert.ok(box.checkMin >= 44, width + ' 档 ' + skin + '：勾选框命中盒不足 44（' + box.checkMin + '）');
            if (box.nact > 0) {
              assert.ok(box.actMin >= 44, width + ' 档 ' + skin + '：动作按钮命中盒不足 44（' + box.actMin + '）');
              assert.ok(box.minGap >= 8, width + ' 档 ' + skin + '：相邻动作按钮间距不足 8（' + box.minGap + '）');
            }
            if (box.chipMin !== 1e9) assert.ok(box.chipMin >= 44, width + ' 档 ' + skin + '：胶囊命中盒不足 44（' + box.chipMin + '）');
            seen.push({ width, skin, name: c.name, barTop: box.barTop, rowBottom: box.rowBottom, rowMin: box.rowMin, actMin: box.actMin });
          }
        }
      }
      /* ③ **动作排不许换行**（窄档最容易塌的一处）：390／366 档四枚动作必须落在同一行。
         根因是按钮里两枚字叠在同一个格上时，**忙碌那枚字撑大了固有宽**（`正在 ＋ 按钮字` 比静息态长）
         ——量的是静息态，出问题的却是忙碌字，所以这一条要在真机上按 offsetTop 真量。 */
      const caseSel = '.' + skinClass(SKIN_NAMES[0]) + ' [data-case="normal"] ';
      const rowOf = () => page.ev('(function(){'
        + 'var acts=document.querySelector(' + JSON.stringify(caseSel + '.' + bulkBarSlot('acts')) + ');'
        + 'var bs=[].slice.call(acts.children);'
        + 'return {n:bs.length, tops:bs.map(function(b){return Math.round(b.offsetTop);}),'
        + ' ws:bs.map(function(b){return Math.round(b.getBoundingClientRect().width);}),'
        + ' hs:bs.map(function(b){return Math.round(b.getBoundingClientRect().height);})};}())');
      const setBusy = (on) => page.ev('(function(){'
        + 'var acts=document.querySelector(' + JSON.stringify(caseSel + '.' + bulkBarSlot('acts')) + ');'
        + 'var last=acts.children[acts.children.length-1];'
        + (on ? 'last.setAttribute("data-ilife-bulk-busy","1");' : 'last.removeAttribute("data-ilife-bulk-busy");')
        + 'return true;}())');
      for (const width of [390, 366]) {
        await page.setWidth(width);
        const rest = await rowOf();
        assert.equal(rest.n, SAMPLE.actions.length, width + ' 档：动作排里应有 ' + String(SAMPLE.actions.length) + ' 枚动作');
        assert.equal(new Set(rest.tops).size, 1, width + ' 档：四枚动作必须落在同一行（offsetTop 实有 '
          + rest.tops.join('／') + '）——静息态不许被忙碌那枚字顶成两行');
        await setBusy(true);
        const busy = await rowOf();
        assert.deepEqual(busy.ws, rest.ws, width + ' 档：忙碌态不许改变按钮宽度（' + rest.ws.join('／') + ' → ' + busy.ws.join('／') + '）');
        assert.deepEqual(busy.tops, rest.tops, width + ' 档：忙碌态不许把动作排顶成两行');
        assert.deepEqual(busy.hs, rest.hs, width + ' 档：忙碌态不许改变按钮高度');
        const overlay = await page.ev('(function(){'
          + 'var acts=document.querySelector(' + JSON.stringify(caseSel + '.' + bulkBarSlot('acts')) + ');'
          + 'var b=acts.children[acts.children.length-1];'
          + 'var o=b.querySelector(' + JSON.stringify('.' + bulkBarSlot('busy')) + ');'
          + 'var l=b.querySelector(' + JSON.stringify('.' + bulkBarSlot('label')) + ');'
          + 'var rl=l.getBoundingClientRect(), ro=o.getBoundingClientRect();'
          + 'return {dx:(ro.left+ro.width/2)-(rl.left+rl.width/2), dy:(ro.top+ro.height/2)-(rl.top+rl.height/2),'
          + ' w:Math.round(ro.width), lw:Math.round(rl.width), visible:getComputedStyle(o).visibility};}())');
        assert.equal(overlay.visible, 'visible', width + ' 档：忙碌态那枚字要露出来');
        /* 判的是「两枚字叠在一处」：忙碌那枚字要落在**正常那枚字**那块上（不是落在按钮中心——
           按钮有 14px 内距与 44px 地板，字块本来就居中偏一点）。 */
        assert.ok(Math.abs(overlay.dx) <= 1 && Math.abs(overlay.dy) <= 1,
          width + ' 档：忙碌那枚字要覆在正常那枚字上（偏移 ' + overlay.dx + '／' + overlay.dy + '）');
        await setBusy(false);
        console.log('READING bulk-bar 动作排 container=' + width + ' tops=' + rest.tops.join('／')
          + ' 宽=' + rest.ws.join('／') + '（忙碌态同宽同高同排）');
      }
      /* ⑤ 换皮不换结构：四套皮肤容器里的标记逐字节相同。 */
      for (const c of cases()) {
        for (const width of [390, 1280]) {
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify(SKIN_NAMES) + ';'
            + 'for (var i = 0; i < skins.length; i += 1) {'
            + '  var el = document.querySelector(".ilife-skin-" + skins[i]'
            + ' + " [data-case=' + c.name + '] .' + BULK_BAR_CLASS + '");'
            + '  out[skins[i]] = el === null ? "" : el.innerHTML;'
            + '} return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(marks[skin], base, width + ' 档 ' + c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
          }
        }
      }
      /* 选中行那两处取值：底取 `surface-2`、字仍 `ink`；勾选框是 `accent` 实底。
         条本身那两处：上边线取**样式源码里那一枚 token**（README 不变量 4 按同一个 token 对账）、
         投影档取本套皮肤的 `shadow`（纸面那三套是 `none` ⇒ 条不许浮起来，neutral 下才浮）。 */
      const topToken = barTopToken();
      for (const skin of SKIN_NAMES) {
        const vals = SKIN_VALUES[skin];
        const colors = await page.ev('(function(){var sc=' + JSON.stringify('.' + skinClass(skin) + ' [data-case=normal] ')
          + ';var row=document.querySelector(sc+' + JSON.stringify('.' + bulkBarSlot('row') + '.is-on') + ');'
          + 'var nm=row===null?null:row.querySelector(' + JSON.stringify('.' + bulkBarSlot('name')) + ');'
          + 'var box=document.querySelector(sc+' + JSON.stringify('.' + bulkBarSlot('check') + ' input:checked + .' + bulkBarSlot('box')) + ');'
          + 'var bar=document.querySelector(sc+' + JSON.stringify('.' + bulkBarSlot('bar')) + ');'
          + 'var cb=bar===null?null:getComputedStyle(bar);'
          + 'return {row: row===null?null:getComputedStyle(row).backgroundColor,'
          + 'fg: nm===null?null:getComputedStyle(nm).color,'
          + 'box: box===null?null:getComputedStyle(box).backgroundColor,'
          + 'barBg: cb===null?null:cb.backgroundColor, top: cb===null?null:cb.borderTopColor,'
          + 'shadow: cb===null?null:cb.boxShadow, topSide: cb===null?null:cb.borderTopWidth};}())');
        assert.equal(colors.row, toRgb(vals['surface-2']), skin + '：整行选中的底取 surface-2');
        assert.equal(colors.fg, toRgb(vals.ink), skin + '：选中行的主字仍是 ink');
        assert.equal(colors.box, toRgb(vals.accent), skin + '：勾选框是 accent 实底');
        assert.equal(colors.top, toRgb(vals[topToken]), skin + '：条的上边线取 ' + topToken + '（README 不变量 4 按它写）');
        assert.equal(colors.topSide, '1px', skin + '：上边线是一条**发丝线**（1px），不是一圈外框');
        assert.equal(colors.barBg, toRgb(vals.surface), skin + '：粘住的那条是不透明实底（surface）');
        if (vals.shadow === 'none') assert.equal(colors.shadow, 'none', skin + '：这套皮肤的 shadow 本就是 none ⇒ 条不浮');
        else assert.notEqual(colors.shadow, 'none', skin + '：这套皮肤有 shadow（' + vals.shadow + '）⇒ 条要浮起来');
      }
      /* ⑤ 行为：勾选变化 → 已选数／条的显隐／尾段读数／事件，四处同一趟。 */
      const scope = '.' + skinClass(SKIN_NAMES[0]) + ' [data-case="normal"] ';
      const clickCheck = (i) => page.ev('(function(){var r=document.querySelectorAll('
        + JSON.stringify(scope + '.' + bulkBarSlot('check') + ' input') + ');'
        + 'r[' + String(i) + '].click(); return r.length;}())');
      const state = () => page.ev('(function(){var root=document.querySelector(' + JSON.stringify(scope + '.' + BULK_BAR_CLASS) + ');'
        + 'var bar=root.querySelector(' + JSON.stringify('.' + bulkBarSlot('bar')) + ');'
        + 'var num=bar.querySelector(' + JSON.stringify('.' + bulkBarSlot('num')) + ');'
        + 'var tail=bar.querySelector(' + JSON.stringify('.' + bulkBarSlot('tail')) + ');'
        + 'return {num:num.textContent, hidden:bar.hasAttribute("hidden"),'
        + 'tail:tail===null?null:tail.textContent, ev:window.__ev.slice()};}())');
      await page.setWidth(390);
      const start = await state();
      assert.equal(start.num, '3', '出发时三行选中');
      assert.equal(start.hidden, false);
      assert.equal(start.tail, SAMPLE.tail, '尾段读数照原样');
      await clickCheck(1);
      const more = await state();
      assert.equal(more.num, '4', '勾上一行 ⇒ 已选数原地改写');
      assert.equal(more.hidden, false);
      assert.equal(more.tail, BULK_BAR_MISSING, '选择一变 ⇒ 过期的尾段换成缺值符号');
      assert.deepEqual(more.ev[more.ev.length - 1].slice(0, 2), ['change', 4], '派发 ilife:bulk-change（带新的条数）');
      assert.ok(more.ev[more.ev.length - 1][2].includes('a2'), '事件里带着键');
      await clickCheck(1);
      const back = await state();
      assert.equal(back.num, '3', '勾回原样 ⇒ 已选数复原');
      assert.equal(back.tail, SAMPLE.tail, '勾回原样 ⇒ 尾段读数复原（不许把过期的数留成 `—` 就完事）');
      await clickCheck(0);
      await clickCheck(2);
      await clickCheck(4);
      const none = await state();
      assert.equal(none.num, '0');
      assert.equal(none.hidden, true, '选中 0 条 ⇒ 整条移出可点范围');
      /* 再把三行勾回来，接着量确认面的行。 */
      await clickCheck(0);
      await clickCheck(2);
      await clickCheck(4);
      const actSel = (key) => JSON.stringify(scope + '.' + bulkBarSlot('act') + '[data-ilife-bulk-action="' + key + '"]');
      await page.ev('document.querySelector(' + actSel('cat') + ').click(); true');
      const opened = await page.ev('(function(){var p=document.querySelector(' + actSel('cat') + ');'
        + 'var panel=document.querySelector(' + JSON.stringify('[id="' + bulkBarConfirmId(SAMPLE.name, 'cat') + '"]') + ');'
        + 'return {expanded:p.getAttribute("aria-expanded"), hidden:panel.hasAttribute("hidden"),'
        + 'same:window.__ev.length};}())');
      assert.equal(opened.expanded, 'true', '点带预演的动作 ⇒ 展开确认面');
      assert.equal(opened.hidden, false);
      await page.ev('document.querySelector(' + JSON.stringify(scope + '.' + bulkBarSlot('chip')) + ').click(); true');
      const chip = await page.ev('document.querySelector('
        + JSON.stringify(scope + '.' + bulkBarSlot('confirm') + ':not([hidden]) .' + bulkBarSlot('input')) + ').value');
      assert.equal(chip, PREVIEW_CAT.recent[0], '点「最近用过」⇒ 填进输入框');
      await page.ev('document.querySelector(' + JSON.stringify(scope + '[' + 'data-ilife-bulk-submit]') + ').click(); true');
      const fired = await page.ev('(function(){var e=window.__ev[window.__ev.length-1];'
        + 'var btn=document.querySelector(' + JSON.stringify(scope + '.' + bulkBarSlot('confirm') + ':not([hidden]) [' + 'data-ilife-bulk-submit]') + ');'
        + 'return {kind:e[0], action:e[1], keys:e[2], value:e[3], stillOpen:btn!==null};}())');
      assert.deepEqual([fired.kind, fired.action, fired.keys], ['action', 'cat', 3], '「改这 N 条」派发动作事件（带 keys）');
      assert.equal(fired.value, PREVIEW_CAT.recent[0], '事件里带着输入框里的值');
      assert.equal(fired.stillOpen, true, '本件不自动收起：写库成败归页面（页面按事件重渲染）');
      await page.ev('document.querySelector(' + JSON.stringify(scope + '[' + 'data-ilife-bulk-cancel]') + ').click(); true');
      const closed = await page.ev('(function(){var panel=document.querySelector('
        + JSON.stringify('[id="' + bulkBarConfirmId(SAMPLE.name, 'cat') + '"]') + ');'
        + 'var btn=document.querySelector(' + actSel('cat') + ');'
        + 'return {hidden:panel.hasAttribute("hidden"), expanded:btn.getAttribute("aria-expanded"),'
        + 'focus:document.activeElement===btn};}())');
      assert.equal(closed.hidden, true, '「取消」收起确认面');
      assert.equal(closed.expanded, 'false');
      assert.equal(closed.focus, true, '焦点还给按它的那一枚按钮（不掉在 hidden 的元素上）');
      /* ④ 三条行为（先前一条都没断）：**同时只开一块**／**再点同一枚＝收起**／**不带预演的直接派发**。 */
      const panelState = () => page.ev('(function(){var root=document.querySelector('
        + JSON.stringify(scope + '.' + BULK_BAR_CLASS) + ');'
        + 'var ps=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + bulkBarSlot('confirm')) + '));'
        + 'var bs=[].slice.call(root.querySelectorAll(' + JSON.stringify('[' + 'data-ilife-bulk-action]') + '));'
        + 'return {hidden:ps.map(function(p){return p.hasAttribute("hidden");}),'
        + ' labels:ps.map(function(p){return p.getAttribute("aria-label");}),'
        + ' exp:bs.map(function(b){return [b.getAttribute("data-ilife-bulk-action"),b.getAttribute("aria-expanded")];})};}())');
      const evKind = () => page.ev('(function(){var e=window.__ev[window.__ev.length-1];'
        + 'return e===undefined?null:[e[0],e[1],e[2],e[3]];}())');
      await page.ev('document.querySelector(' + actSel('cat') + ').click(); true');
      const hh0 = await panelState();
      assert.deepEqual(hh0.hidden, [false, true], '点第一枚 ⇒ 只开它那一块（其余收起）');
      assert.deepEqual(hh0.exp, [['cat', 'true'], ['acct', 'false'], ['tag', 'false'], ['del', 'false']], 'aria-expanded 跟着改');
      await page.ev('document.querySelector(' + actSel('tag') + ').click(); true');
      const oh = await panelState();
      assert.deepEqual(oh.hidden, [true, false], '点第二枚带预演的动作 ⇒ 同时只开一块（第一块当场收起）');
      await page.ev('document.querySelector(' + actSel('tag') + ').click(); true');
      const hh1 = await panelState();
      assert.deepEqual(hh1.hidden, [true, true], '再点同一枚 ⇒ 收起');
      const before = await evKind();
      await page.ev('document.querySelector(' + actSel('acct') + ').click(); true');
      const direct = await evKind();
      assert.deepEqual(hh1.hidden, [true, true]);
      assert.deepEqual((await panelState()).hidden, [true, true], '不带预演的动作按下去不展开任何确认面');
      assert.deepEqual(direct.slice(0, 2), ['action', 'acct'], '不带预演的动作直接派发 ilife:bulk-action');
      assert.equal(direct[2], 3, '事件里带着当前这份选择的条数');
      assert.equal(direct[3], null, '不带预演的动作没有值可带（value: null）');
      assert.notDeepEqual(direct, before, '这一次真的派发了事件');
      /* ④ 非 ASCII 件名／动作键：点第二枚，开的必须是**第二块**（id 撞了就会开第一块）。 */
      const cnScope = '.' + skinClass(SKIN_NAMES[0]) + ' [data-case="cn"] ';
      const cnPanel = await page.ev('(function(){var root=document.querySelector('
        + JSON.stringify(cnScope + '.' + BULK_BAR_CLASS) + ');'
        + 'var ids=[].slice.call(root.querySelectorAll("[id]")).map(function(e){return e.id;});'
        + 'var btns=[].slice.call(root.querySelectorAll("[' + 'data-ilife-bulk-action]")' + ');'
        + 'btns[1].click();'
        + 'var ps=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + bulkBarSlot('confirm')) + '));'
        + 'return {unique: new Set(ids).size===ids.length, ids:ids,'
        + ' hidden:ps.map(function(p){return p.hasAttribute("hidden");}),'
        + ' labels:ps.map(function(p){return p.getAttribute("aria-label");}),'
        + ' exp:btns.map(function(b){return [b.getAttribute("data-ilife-bulk-action"),b.getAttribute("aria-expanded")];})};}())');
      assert.equal(cnPanel.unique, true, '中文件名／动作键的同页 id 必须唯一：' + cnPanel.ids.join('、'));
      assert.deepEqual(cnPanel.hidden, [true, false], '点第二枚（改账户）⇒ 开的是第二块面板');
      assert.deepEqual(cnPanel.labels, ['批量改分类', '批量改账户'], '两块面板各按自己的动作命名');
      assert.deepEqual(cnPanel.exp, [['改分类', 'false'], ['改账户', 'true']], 'aria-expanded 与真正开着的那一块一致');
      /* ⑤ 重复注入只绑一次（文档根上的幂等键）：再跑一遍同一段运行时，事件不许翻倍。 */
      const evBefore = (await state()).ev.length;
      await page.ev(js);
      const runtimeAttr = await page.ev('document.documentElement.getAttribute("data-ilife-bulk-runtime")');
      assert.equal(runtimeAttr, '1', '运行时在文档根上留幂等键');
      await clickCheck(1);
      const evAfter = (await state()).ev.slice(evBefore);
      assert.equal(evAfter.filter((e) => e[0] === 'change').length, 1, '重复注入只绑一次：勾一次只许派发一枚 change');
      await clickCheck(1);
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      /* ⑦ 中段滚动（README 不变量 4 明写会发生、先前判据一条都不量）：宿主比视口高时，
         条粘在**视口底部**够得着，代价是它盖住正滚过的那几行——量出来，并要求它盖得**不透明**
         （半透明会把底下的读数糊成一层灰，那是「看着消失」，不是「移出可点范围」）。 */
      const manyScope = '.' + skinClass(SKIN_NAMES[0]) + ' [data-case="many"] ';
      await page.setWidth(390);
      await page.ev('(function(){var host=document.querySelector(' + JSON.stringify(manyScope + '.' + bulkBarSlot('host')) + ');'
        + 'var r=host.getBoundingClientRect();'
        + 'window.scrollTo(0, window.scrollY + r.top + Math.round(r.height*0.4)); return true;}())');
      const mid = await page.ev('(function(){'
        + 'var root=document.querySelector(' + JSON.stringify(manyScope + '.' + BULK_BAR_CLASS) + ');'
        + 'var bar=root.querySelector(' + JSON.stringify('.' + bulkBarSlot('bar')) + ');'
        + 'var rb=bar.getBoundingClientRect();'
        + 'var rows=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + bulkBarSlot('row')) + '));'
        + 'var covered=0, px=0;'
        + 'for(var i=0;i<rows.length;i+=1){var r=rows[i].getBoundingClientRect();'
        + 'var ov=Math.min(r.bottom,rb.bottom)-Math.max(r.top,rb.top);'
        + 'if(ov>0){covered+=1; px+=Math.round(ov);}}'
        + 'var cs=getComputedStyle(bar);'
        + 'return {barTop:Math.round(rb.top), barBottom:Math.round(rb.bottom), vh:window.innerHeight,'
        + ' covered:covered, px:Math.round(px), bg:cs.backgroundColor, sticky:cs.position};}())');
      assert.equal(mid.sticky, 'sticky', '条是粘的');
      assert.ok(mid.barBottom <= mid.vh + 1 && mid.barBottom >= mid.vh - 2,
        '中段滚动时条要贴在视口底部（条底 ' + mid.barBottom + '／视口高 ' + mid.vh + '）——够得着是它存在的理由');
      assert.ok(mid.covered >= 1, '粘住时它盖住正滚过的那几行（README 不变量 4 明写会发生；这次量到 ' + mid.covered + ' 行）');
      assert.equal(mid.bg, toRgb(SKIN_VALUES[SKIN_NAMES[0]].surface),
        '盖在条目上就必须是不透明实底（' + mid.bg + '）：半透明＝底下的读数糊成灰');
      console.log('READING bulk-bar 中段滚动 container=390 条顶=' + mid.barTop + ' 条底=' + mid.barBottom
        + ' 视口高=' + mid.vh + ' 盖住=' + mid.covered + ' 行／' + mid.px + 'px 底=' + mid.bg);
      await page.ev('window.scrollTo(0,0); true');
      for (const w of [390, 1280]) {
        const rows = seen.filter((s) => s.width === w);
        console.log('READING bulk-bar container=' + w
          + ' barTop=' + rows[0].barTop + ' rowBottom=' + Math.max(...rows.map((s) => s.rowBottom))
          + ' rowMin=' + Math.min(...rows.map((s) => s.rowMin))
          + ' actMin=' + Math.min(...rows.filter((s) => Number.isFinite(s.actMin)).map((s) => s.actMin))
          + ' cases=' + rows.length);
      }
    } finally { page.close(); }
  });
});
