/** wizard-shell（分步录入壳 · 形态 B「一问一屏（大字问题 ＋ 一条细进度）」）· 契约测试。
 *
 * 覆盖四类判据（与 `docs/base/base-render/公共组件契约.md` §五 同口径）：
 *  ① **渲染契约**：骨架槽位与枚数／进度那 N 格的状态与 `aria-current`／读数行与次段／
 *     回退（第 1 问上「上一问」按不动且把"为什么"指到读数行）／三种答法（选项／填空／确认屏）／
 *     加载态（原地换字 ＋ 三枚键一起按不动）／错态（写在控件旁边 ＋ `aria-describedby`）／
 *     转义面／**全部**非法入参分支（每个都断 `BlocksError`）／纯函数；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且**只出现一次**、
 *     零 `:root`／`!important`／零新 token／零 `@media` 宽度查询／零手写色值（兜底链那一处除外）／
 *     零 `overflow-x`·零省略号·零 `nowrap`／几何事实取常量／零键盘语汇／
 *     `dist/components/wizard-shell/**` 剥掉字面量与注释后零 `document.`／`window.`／`navigator.`；
 *  ③ **加法式**：不启用它的页面零命中、逐字节不变；渲染本件不改动别件的产物；
 *  ④ **两档几何（真机 headless Chrome ＋ CDP）**：容器宽 390 与 1280 下零横向溢出、
 *     触控目标 ≥44×44、相邻触控目标间距 ≥8、关键语义零截断、大字问题 ≥ 正文 1.8 倍、
 *     窄档差异只可能来自容器查询（视口恒 1440）、**换皮不换结构**（四套皮肤标记逐字节相同）、
 *     运行时段真点（选项派发 `ilife:wizard-pick` 且机器值落属性；三枚键派发 `ilife:wizard-go`；
 *     按不动的那一枚点了没反应）＋ 推进中主键**宽度锁住不跳版**；**起不来就退确定性几何判据并打印原因**。
 *
 * 期望值一律从组件自己的常量派生（`WIZARD_SHELL_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  WIZARD_SHELL_ANSWER_ATTR,
  WIZARD_SHELL_CLASS,
  WIZARD_SHELL_EVENT_GO,
  WIZARD_SHELL_EVENT_PICK,
  WIZARD_SHELL_FIELD_ATTR,
  WIZARD_SHELL_FIELD_KINDS,
  WIZARD_SHELL_FORMS,
  WIZARD_SHELL_GO_ATTR,
  WIZARD_SHELL_LOADING_ATTR,
  WIZARD_SHELL_LOADING_TEXT,
  WIZARD_SHELL_MIN_TARGET_PX,
  WIZARD_SHELL_NAME_ATTR,
  WIZARD_SHELL_NARROW_PX,
  WIZARD_SHELL_OPTION_ATTR,
  WIZARD_SHELL_OPTION_MIN_HEIGHT_PX,
  WIZARD_SHELL_ROOT_ATTR,
  WIZARD_SHELL_SEG_NOW_PX,
  WIZARD_SHELL_SEG_PX,
  WIZARD_SHELL_SLOTS,
  WIZARD_SHELL_STEP_ATTR,
  WIZARD_SHELL_TARGET_GAP_PX,
  WIZARD_SHELL_TOTAL_ATTR,
  WIZARD_SHELL_TOTAL_MAX,
  WIZARD_SHELL_TOTAL_MIN,
  WIZARD_SHELL_VALUE_ATTR,
  buildWizardShellJs,
  renderWizardShell,
  wizardShellCss,
  wizardShellSlot,
} from '../dist/components/wizard-shell/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKINS, skinClass, skinCss } from '../dist/components/skin/index.js';
import { SKIN_NAMES } from '../dist/components/skin/contract.js';
import { derive } from '../scripts/gen-components.mjs';
import { startShapesPage } from './shapes-probe.mjs';
import { styleSource } from './_style-sources.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'wizard-shell');

/** 剥掉 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把"解释"当"规则"）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
/** 剥 JS 字面量与注释（层红线说的是「剥掉字面量后不得出现 DOM 名」——运行时是**产出的文本**）。 */
const stripLiterals = (code) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/`(?:[^`\\]|\\.)*`/g, '``')
  .replace(/'(?:[^'\\]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\]|\\.)*"/g, '""');

/** 抛错的入参（`BlocksError`：组件层与区块层共用同一个错误名）。 */
const throwsBlocks = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.name === 'BlocksError';
  }
  return false;
};

/** 逐字符配平花括号抽选择器（`@container` 块里的规则也算；正则式抽取会漏掉它们）。 */
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
/** 脚行里键的枚数（`data-ilife-wizard-go` 一枚键一处，标签那两枚字不算）。 */
const countButtons = (html) => countOf(html, WIZARD_SHELL_GO_ATTR + '="[a-z]+"');
/** 按不动的键的枚数（原生 `disabled` 落在键上；选项里的原生框另算，别混进来）。 */
const countDisabledButtons = (html) => countOf(html, WIZARD_SHELL_GO_ATTR + '="[a-z]+"(?: [a-z-]+="[^"]*")* disabled');

/** 从一段标记里按出现次序取出全部 `id="…"`（同页多实例的 id 重号读数）。 */
const idsOf = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
/** 进度那 N 格的状态序列（**按位置**取：类名断不出"哪一格"，这个断得出）。 */
const segStates = (html) => [...html.matchAll(new RegExp('<i class="[^"]*' + wizardShellSlot('seg') + ' (is-[a-z]+)"', 'g'))]
  .map((m) => m[1]);

/* ── CSS 读数小件：样式段里那几条规则**写了什么**，以及颜色对之间的对比度 ─────────────
 *  为什么要有这一段：判据只断"按不动的键有几枚"断不到"禁用态在屏上看得见吗"
 *  （`cursor` 触屏没有；`line` 对脚行底只有 1.16…1.41:1，远低于图形地板 3:1）。 */

/** CSS → `{ sel, body }`（逐字符配平花括号；`@media`／`@container` 里的规则也算，`@` 那一层只当括号）。 */
function cssRules(css) {
  const out = [];
  const stack = [];
  let buf = '';
  for (const ch of css) {
    if (ch === '{') { stack.push(buf.trim()); buf = ''; continue; }
    if (ch === '}') {
      const sel = stack.pop();
      if (sel !== undefined && !sel.startsWith('@')) out.push({ sel, body: buf });
      buf = '';
      continue;
    }
    buf += ch;
  }
  return out;
}

/** 某条选择器的声明表（选择器逐字比对；找不到＝判据自己写错了选择器，直接抛）。 */
function declsOf(css, sel) {
  const rule = cssRules(css).find((r) => r.sel === sel);
  assert.ok(rule !== undefined, '样式段里找不到这条规则：' + sel);
  const out = new Map();
  for (const part of rule.body.split(';')) {
    const s = part.trim();
    if (s === '') continue;
    const i = s.indexOf(':');
    out.set(s.slice(0, i).trim(), s.slice(i + 1).trim());
  }
  return out;
}

/** 颜色串（`#rrggbb`／`rgb(…)`／`rgba(…)`）→ `[r,g,b]`；认不出返 `null`。 */
function rgbOf(value) {
  const s = String(value).trim();
  const hex = /^#([0-9a-fA-F]{6})$/.exec(s);
  if (hex !== null) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(s);
  return m === null ? null : [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** 相对亮度（WCAG 2.x）。 */
function relLum(rgb) {
  const c = rgb.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** 对比度（认不出的颜色返 `null`，由调用方报红）。 */
function contrastOf(fg, bg) {
  const A = rgbOf(fg);
  const B = rgbOf(bg);
  if (A === null || B === null) return null;
  const l1 = relLum(A);
  const l2 = relLum(B);
  return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
}

/* ── 四份样例：选择问（已答／未答／末问／推进中）／填空问／确认屏 ─────────── */

const CHOICE = {
  name: 'cook', question: '这周想做几次饭？', index: 2, total: 5,
  why: '这一步只影响买菜清单怎么合并。',
  options: [
    { value: 'three_four', title: '3–4 次', desc: '清单按这个数合并。做不到也不扣分' },
    { value: 'one_two', title: '1–2 次', desc: '清单只留耐放的，绿叶菜会少排' },
    { value: 'five_up', title: '5 次以上', desc: '清单按周合并成一张大单' },
  ],
  value: 'one_two',
  hint: '答完这句就能生成买菜清单',
};
const FIRST = { ...CHOICE, index: 0, value: null, aside: undefined };
const ENTRY = {
  name: 'body', question: '现在多重？', index: 0, total: 4,
  why: '每日热量预算按体重算，后面随时能改。',
  fields: [
    { name: 'weight', label: '现在体重（公斤）', value: '68.4', kind: 'number', hint: '填不准也没关系' },
    { name: 'height', label: '身高（厘米）', kind: 'number' },
  ],
  hint: '答完这一步就能算出预算',
};
const CONFIRM = { name: 'confirm', question: '上面这些就是你的建档。', index: 3, total: 4 };
/** 整壳禁用那一份（`disabledReason` 是必填：说不出为什么不许动＝读者只能猜）。 */
const OFF_REASON = '这一趟已经交过了';
const OFF = { ...CHOICE, disabled: true, disabledReason: OFF_REASON };
const LONG = {
  name: 'long',
  question: '这一句问题被写得非常非常长，用来看看窄容器下会不会压字、会不会横着溢出去，长到要换好几行才算完',
  index: 1, total: 2,
  options: [
    { value: 'a', title: '一条长到离谱的标题长到离谱的标题长到离谱的标题长到离谱的标题长到离谱', desc: '说明也长：长到离谱长到离谱长到离谱长到离谱长到离谱长到离谱长到离谱' },
    { value: 'b', title: '短的一条' },
  ],
  hint: '这一句提示也写得很长，长到需要在脚行里换行，看看三枚键会不会被挤出去。',
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('wizard-shell ① 渲染契约 · 骨架与槽位', () => {
  const html = renderWizardShell(CHOICE);

  it('根：类名根 ＋ 形态类 ＋ 五枚机器读数（第几问／一共几问／已答的机器值／机器键／答法）', () => {
    assert.match(html, new RegExp('^<div class="' + WIZARD_SHELL_CLASS + ' is-one"'));
    assert.ok(html.includes(WIZARD_SHELL_ROOT_ATTR + '="1"'), '根锚（运行时的发现锚）');
    assert.ok(html.includes(WIZARD_SHELL_NAME_ATTR + '="cook"'));
    assert.ok(html.includes(WIZARD_SHELL_ANSWER_ATTR + '="options"'), '这一屏出的是哪一种答法');
    assert.ok(html.includes(WIZARD_SHELL_STEP_ATTR + '="2"'), '当前是第几问落属性（页面拿它当草稿坐标）');
    assert.ok(html.includes(WIZARD_SHELL_TOTAL_ATTR + '="5"'));
    assert.ok(html.includes(WIZARD_SHELL_VALUE_ATTR + '="one_two"'), '已答的机器值落属性');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.equal(/\son[a-z]+=/.test(html), false, '零内联事件处理器');
  });

  it('**同页多实例**：实例键（`id`）参与单选组名与件内 id ⇒ 两份拼在一页上单选组分得开、全页 id 不重号', () => {
    const group = (h) => [...new Set([...h.matchAll(/<input type="radio" name="([^"]+)"/g)].map((m) => m[1]))];
    const a = renderWizardShell({ ...CHOICE, id: 'wall-a' });
    const b = renderWizardShell({ ...CHOICE, id: 'wall-b' });
    assert.deepEqual(group(a), ['ilife-wizard-wall-a'], '一份实例里的三枚单选框是同一个组');
    assert.deepEqual(group(b), ['ilife-wizard-wall-b']);
    assert.notDeepEqual(group(a), group(b), '两份实例的组名必须分得开（组名相同＝点一份会踢掉另一份的选中）');
    const pageIds = idsOf(a + b);
    assert.deepEqual(pageIds.filter((x, i) => pageIds.indexOf(x) !== i), [], '同页两份实例的件内 id 重号：' + pageIds.join('、'));
    assert.equal(countOf(a + b, 'id="ilife-wizard-q-'), 2, '两份各自的大字问题 id');
    /* 不给 `id` 时退回 `name`（老行为逐字节不变）。 */
    assert.ok(html.includes('name="ilife-wizard-cook"'), '不给 id 时单选组名仍按 name');
    assert.ok(idsOf(html).includes('ilife-wizard-q-cook'));
  });

  it('答法诊断信号：根属性写出这一屏出的是哪一种答法（`options`／`fields`／`confirm`）', () => {
    assert.ok(html.includes(WIZARD_SHELL_ANSWER_ATTR + '="options"'), '选择问');
    assert.ok(renderWizardShell(ENTRY).includes(WIZARD_SHELL_ANSWER_ATTR + '="fields"'), '填空问');
    assert.ok(renderWizardShell(CONFIRM).includes(WIZARD_SHELL_ANSWER_ATTR + '="confirm"'), '确认屏');
    /* 误传整趟数据（`steps`）：**入参表以外的键一律拒**（写错的键静默吞掉，调用方会以为自己设上了）。
       这一条与「答法读得出来」是一体两面：读不出来就得当场拒，不留一条"看不出传错了"的路。 */
    assert.equal(throwsBlocks(() => renderWizardShell({
      name: 'init', question: '先问这一句。', index: 0, total: 3, steps: [{ q: 'x' }],
    })), true, '误传整趟数据当场拒（`steps` 不在本件入参面里）');
    const readme = readFileSync(join(DIR, 'README.md'), 'utf8');
    assert.ok(readme.includes('整趟数据不由本件持'), '这条口径必须写在说明书上（调用方才有得查）');
    assert.ok(readme.includes(WIZARD_SHELL_ANSWER_ATTR), '诊断信号的名字要在 README 里点名');
  });

  it('骨架：细进度 → 读数行 → 大字问题 → 为什么问 → 答法 → 脚行（顺序固定）', () => {
    const order = ['prog', 'step', 'q', 'why', 'answer', 'foot'].map((s) => html.indexOf(wizardShellSlot(s)));
    for (let i = 0; i < order.length - 1; i += 1) {
      assert.ok(order[i] >= 0 && order[i] < order[i + 1], '槽位顺序不对：' + wizardShellSlot(i));
    }
    for (const slot of ['now', 'prog', 'seg', 'step', 'aside', 'q', 'answer', 'opts', 'opt', 'mk', 'tx',
      'opt-title', 'opt-desc', 'foot', 'hint', 'acts', 'bt', 'bt-label']) {
      assert.ok(html.includes(wizardShellSlot(slot)), '缺槽：' + slot);
    }
    assert.equal(countOf(html, wizardShellSlot('dummy')), 0, '槽位闭集外的类名不该出现');
  });

  it('细进度：N 格恒等于 total；走过／正走／没到三档与 `aria-current` 只有一处', () => {
    assert.equal(countOf(html, 'class="' + wizardShellSlot('seg') + ' is-'), CHOICE.total, '一格一问');
    assert.equal(countOf(html, 'is-done'), CHOICE.index, '走过的那几格');
    assert.equal(countOf(html, 'is-now'), 1, '正走的只有一格');
    assert.equal(countOf(html, 'is-todo'), CHOICE.total - CHOICE.index - 1);
    assert.equal(countOf(html, 'aria-current="step"'), 1, '当前那格靠这个给读屏');
    assert.match(html, new RegExp('aria-hidden="true"><i class="' + wizardShellSlot('seg')), '进度条是纯装饰');
  });

  it('进度三档**按位置**落：一格一格数出来，正走就在第 `index` 格上（换格＝红）', () => {
    /* 上面那四条只数枚数 ⇒ 把两格的类互换也照样绿。这里按**出现次序**取状态。 */
    assert.deepEqual(segStates(html), ['is-done', 'is-done', 'is-now', 'is-todo', 'is-todo'],
      '走过／正走／没到要按次序落（第 ' + String(CHOICE.index) + ' 格正走）');
    const tags = [...html.matchAll(new RegExp('<i class="[^"]*' + wizardShellSlot('seg') + ' [^"]*"([^>]*)>', 'g'))]
      .map((m) => m[1]);
    assert.equal(tags.length, CHOICE.total);
    assert.equal(tags.filter((t) => t.includes('aria-current')).length, 1);
    assert.ok(tags[CHOICE.index].includes('aria-current="step"'),
      '`aria-current="step"` 要落在第 ' + String(CHOICE.index) + ' 格上（现在落在第 '
      + String(tags.findIndex((t) => t.includes('aria-current'))) + ' 格）');
    for (const [i, t] of tags.entries()) {
      if (i !== CHOICE.index) assert.equal(t.includes('aria-current'), false, '第 ' + String(i) + ' 格不该有 aria-current');
    }
    /* 第 1 问与末问两档：三档的次序同样按位置落。 */
    assert.deepEqual(segStates(renderWizardShell(FIRST)), ['is-now', 'is-todo', 'is-todo', 'is-todo', 'is-todo']);
    assert.deepEqual(segStates(renderWizardShell({ ...CHOICE, index: 4, value: 'three_four' })),
      ['is-done', 'is-done', 'is-done', 'is-done', 'is-now']);
  });

  it('读数行：「第 n / N 问」＋次段；段间不写分隔符（缝由列距承担）', () => {
    assert.match(html, />第 3 \/ 5 问</);
    assert.match(html, new RegExp('<' + 'b>第 3 / 5 问</b><span class="' + wizardShellSlot('aside') + '">前面 2 问走过，随时能回</span>'));
    assert.equal(html.includes('·'), false, '产出文本里不许出现 `·`（拿符号顶替版式是设计债）');
    assert.equal(html.includes('；'), false, '产出文本里不许出现 `；`');
  });

  it('大字问题：`<h2>` ＋ 它的 id 被选项组的 `aria-labelledby` 指到（问的是什么读得出来）', () => {
    assert.match(html, new RegExp('<h2 class="' + wizardShellSlot('q') + '" id="ilife-wizard-q-cook">这周想做几次饭？</h2>'));
    assert.match(html, new RegExp('role="radiogroup" aria-labelledby="ilife-wizard-q-cook"'));
    assert.equal(countOf(html, '<h1'), 0, '页标题归 page-head，本件不抢 `<h1>`');
  });

  it('选项：一条一枚 `<label>` ＋ 原生单选；已答的那条 `checked`；说明行不写 `；`', () => {
    assert.equal(countOf(html, '<label class="' + wizardShellSlot('opt') + '" ' + WIZARD_SHELL_OPTION_ATTR), 3);
    assert.equal(countOf(html, 'type="radio"'), 3);
    assert.equal(countOf(html, 'checked'), 1, '已答的那一条');
    assert.match(html, /value="one_two" checked/);
    assert.match(html, new RegExp(wizardShellSlot('mk') + '" aria-hidden="true"'), '标记位是装饰');
  });

  it('脚行三枚键：`上一问`／`跳过`／主键（末问换「完成」）', () => {
    assert.match(html, new RegExp(WIZARD_SHELL_GO_ATTR + '="back"'));
    assert.match(html, new RegExp(WIZARD_SHELL_GO_ATTR + '="skip"'));
    assert.match(html, new RegExp(WIZARD_SHELL_GO_ATTR + '="next"'));
    assert.match(html, />跳过</);
    assert.match(html, /is-primary"[^>]*>.*?继续</, '主键那一枚带 is-primary');
    const last = renderWizardShell({ ...CHOICE, index: 4, value: 'three_four' });
    assert.match(last, />完成</, '最后一问的主键换「完成」');
    assert.match(renderWizardShell({ ...CHOICE, nextLabel: '存下这一趟' }), />存下这一趟</);
  });

  it('**回退**：第 1 问上「上一问」按不动，且把"为什么"指到读数行（不是一句 title 挂着）', () => {
    const first = renderWizardShell(FIRST);
    assert.match(first, new RegExp(WIZARD_SHELL_GO_ATTR + '="back" disabled aria-describedby="ilife-wizard-note-cook"'));
    assert.match(first, /这是第 1 问，前面没有可回的/);
    assert.match(html, new RegExp(WIZARD_SHELL_GO_ATTR + '="back"(?! disabled)'), '其余问上它是可按的');
    assert.equal(/data-ilife-wizard-go="back" disabled[^>]*aria-describedby/.test(html), false,
      '能按的那一枚不该挂"为什么按不动"');
  });

  it('第 1 问 ＋ 错态：按不动那句原因**不丢**（读数行 ＋ 错态行两张 id 都给）', () => {
    /* 「为什么按不动」（读数行）与「这一屏为什么不对」（错态行）是两件事：
       后一句上来就把前一句顶掉的话，契约 #2 在这个状态下就不成立了。 */
    const bad = renderWizardShell({ ...FIRST, error: '这一问必须选一条' });
    assert.match(bad, new RegExp(WIZARD_SHELL_GO_ATTR + '="back" disabled aria-describedby="ilife-wizard-note-cook ilife-wizard-error-cook"'));
    const ids = idsOf(bad);
    assert.ok(ids.includes('ilife-wizard-note-cook'), '读数行的 id 要真的在页上（不是挂个空名）');
    assert.ok(ids.includes('ilife-wizard-error-cook'), '错态行的 id 要真的在页上');
    /* 整壳禁用同理（第 1 问 ＋ 禁用：原因也落在错态行那一枚 id 上）。 */
    const offFirst = renderWizardShell({ ...FIRST, disabled: true, disabledReason: OFF_REASON });
    assert.match(offFirst, new RegExp('aria-describedby="ilife-wizard-note-cook ilife-wizard-error-cook"'));
    /* 其余问上没有"为什么按不动"这回事，那张表就只有错态行一枚。 */
    const badMid = renderWizardShell({ ...CHOICE, error: '这一问必须选一条' });
    assert.match(badMid, new RegExp(WIZARD_SHELL_GO_ATTR + '="back"(?! disabled) aria-describedby="ilife-wizard-error-cook"'));
  });

  it('不能跳过的问**不摆**一枚按不动的「跳过」（中间档不许留）', () => {
    const noSkip = renderWizardShell({ ...CHOICE, skippable: false });
    assert.equal(noSkip.includes(WIZARD_SHELL_GO_ATTR + '="skip"'), false);
    assert.equal(noSkip.includes('跳过'), false);
    assert.equal(countButtons(noSkip), 2, '剩下「上一问」与主键');
  });

  it('另一种答法：填空（标签 `for`／输入框 `id` 关联 ＋ 机器名落属性）', () => {
    const entry = renderWizardShell(ENTRY);
    assert.equal(countOf(entry, WIZARD_SHELL_FIELD_ATTR + '="'), 2);
    assert.match(entry, /<label class="ilife-block-wizard-shell-fld-label" for="ilife-wizard-field-body-weight">现在体重（公斤）<\/label>/);
    assert.match(entry, /id="ilife-wizard-field-body-weight"[^>]*type="number"[^>]*inputmode="decimal"/);
    assert.match(entry, /value="68\.4"/);
    assert.match(entry, /data-ilife-wizard-field="height"/);
    assert.equal(entry.includes(WIZARD_SHELL_OPTION_ATTR), false, '一问只有一种答法');
  });

  it('没有答法的那一问：出**设计过的空态**（写清"这一问不用填"，不是留白）', () => {
    const confirm = renderWizardShell(CONFIRM);
    assert.match(confirm, new RegExp('class="' + wizardShellSlot('confirm') + '">这一问不用填，读完按继续<'));
    assert.match(renderWizardShell({ ...CONFIRM, confirmText: '核一遍，按完成就写库' }), />核一遍，按完成就写库</);
    assert.equal(confirm.includes(wizardShellSlot('opts')), false);
    assert.equal(confirm.includes(wizardShellSlot('fields')), false);
    assert.ok(confirm.includes(wizardShellSlot('foot')), '确认屏也有脚行');
  });

  it('加载态：三枚键一起按不动 ＋ 主键原地换字（两枚字叠在同一格里）＋ `aria-busy`', () => {
    const busy = renderWizardShell({ ...CHOICE, loading: true });
    assert.ok(busy.includes('aria-busy="true"'));
    assert.equal(countDisabledButtons(busy), 3, '推进中三枚键都按不动（不许脏点击串成两次变更）');
    assert.match(busy, new RegExp('>' + WIZARD_SHELL_LOADING_TEXT + '</span>'), '加载态那枚字在标记里');
    assert.match(busy, />继续</, '常态那枚字**不撤**（两枚同格 ⇒ 宽度锁住不跳版）');
    assert.match(renderWizardShell({ ...CHOICE, loading: true, loadingText: '写库中' }), />写库中</);
  });

  it('错态：写在控件旁边 ＋ `aria-describedby` 指它 ＋ `aria-invalid`（不只染色）', () => {
    const bad = renderWizardShell({ ...CHOICE, error: '这一问必须选一条' });
    assert.match(bad, new RegExp('class="' + wizardShellSlot('answer') + '" aria-describedby="ilife-wizard-error-cook" aria-invalid="true"'));
    assert.match(bad, new RegExp('class="' + wizardShellSlot('error') + '" id="ilife-wizard-error-cook" role="alert">这一问必须选一条<'));
  });

  it('整壳禁用：说不出为什么不许动是不许留的中间档（渲染期就拦）', () => {
    const off = renderWizardShell({ ...CHOICE, disabled: true, disabledReason: '这一趟已经交过了' });
    assert.equal(countDisabledButtons(off), 3);
    assert.match(off, new RegExp('class="' + wizardShellSlot('error') + '" id="ilife-wizard-error-cook">这一趟已经交过了<'));
  });

  it('转义面：机器键／问题／次段／标题／说明／标签／值／错态逐位转义', () => {
    const evil = '"><script>alert(1)</script>';
    const html2 = renderWizardShell({
      name: evil, question: evil, index: 1, total: 2, why: evil, aside: evil, hint: evil, error: evil,
      options: [{ value: evil, title: evil, desc: evil }, { value: 'b', title: 'ok' }],
    });
    assert.equal(/<script/i.test(html2), false, '不得出现可执行脚本标签');
    assert.ok(html2.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html2.includes('&quot;'), '引号转义');
    const entry = renderWizardShell({
      name: evil, question: evil, index: 0, total: 2,
      fields: [{ name: evil, label: evil, value: evil, hint: evil }],
    });
    assert.equal(/<script/i.test(entry), false);
  });

  it('纯函数：同样的入参恒产同样的字节', () => {
    for (const input of [CHOICE, FIRST, ENTRY, CONFIRM, LONG]) {
      assert.equal(renderWizardShell(input), renderWizardShell(input));
    }
  });

  it('槽位闭集与类名一致（判据不另抄一份字面量）', () => {
    assert.equal(wizardShellSlot('opt'), WIZARD_SHELL_CLASS + '-opt');
    assert.equal(wizardShellSlot('opt', 'x-'), 'x-block-wizard-shell-opt');
    for (const slot of WIZARD_SHELL_SLOTS) assert.ok(wizardShellSlot(slot).startsWith(WIZARD_SHELL_CLASS + '-'));
  });
});

describe('wizard-shell ① 渲染契约 · 非法入参一律拒（不静默降级）', () => {
  it('闭集与常量：形态只有一格、趟数 2–12', () => {
    assert.deepEqual([...WIZARD_SHELL_FORMS], ['one']);
    assert.deepEqual([...WIZARD_SHELL_FIELD_KINDS], ['text', 'number']);
    assert.equal(WIZARD_SHELL_TOTAL_MIN, 2);
    assert.equal(WIZARD_SHELL_TOTAL_MAX, 12);
  });

  it('整体面：非对象／形态闭集外／缺必填／第几问与一共几问不合规', () => {
    assert.equal(throwsBlocks(() => renderWizardShell(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderWizardShell(null)), true);
    assert.equal(throwsBlocks(() => renderWizardShell([])), true, '数组不是入参');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, form: 'two' })), true, '形态闭集外');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, name: '' })), true, '机器键空');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, question: undefined })), true, '缺问题');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, question: '' })), true, '问题空串');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, index: undefined })), true, '缺第几问');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, index: -1 })), true, '第几问不能为负');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, index: 1.5 })), true, '第几问是整数');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, index: '1' })), true, '第几问是数不是串');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, total: undefined })), true, '缺一共几问');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, total: 2 })), true, '一共几问要落在第几问之后');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, index: 0, total: 1 })), true, '一问不成"分步"');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, total: WIZARD_SHELL_TOTAL_MAX + 1 })), true, '趟数上限');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, index: 0, total: WIZARD_SHELL_TOTAL_MAX })), false, '上限那一档要收');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, extraClass: 'a"b' })), true, '附加类名要过类名正则');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, why: 1 })), true);
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, aside: 1 })), true);
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, hint: 1 })), true);
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, nextLabel: 1 })), true);
  });

  it('**未知键一律拒**：每个对象层各加一个 `zzUnknown: 1` ⇒ `BlocksError`（含不可枚举的自有键与原型链上继承来的键）', () => {
    assert.equal(throwsBlocks(() => renderWizardShell(CHOICE)), false, '正面：入参表里的可选键给全照收');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, zzUnknown: 1 })), true, '顶层多一个键');
    assert.equal(throwsBlocks(() => renderWizardShell({
      ...CHOICE, options: [{ ...CHOICE.options[0], zzUnknown: 1 }, ...CHOICE.options.slice(1)],
    })), true, '一条选项（`options[i]`）里多一个键');
    assert.equal(throwsBlocks(() => renderWizardShell({
      ...ENTRY, fields: [{ ...ENTRY.fields[0], zzUnknown: 1 }, ...ENTRY.fields.slice(1)],
    })), true, '一格填空（`fields[i]`）里多一个键');
    /* 双查：只走 `Object.keys` 会漏掉这两类（先例 `relation-picker/model.ts`／`kanban-columns/model.ts`）。 */
    const hidden = { ...CHOICE };
    Object.defineProperty(hidden, 'zzHidden', { value: 1, enumerable: false });
    assert.equal(throwsBlocks(() => renderWizardShell(hidden)), true, '不可枚举的自有键');
    const inherited = { ...CHOICE, options: [{ ...CHOICE.options[0] }] };
    Object.setPrototypeOf(inherited.options[0], { zzProto: 1 });
    assert.equal(throwsBlocks(() => renderWizardShell(inherited)), true, '原型链上继承来的键');
  });

  it('答题面：两种答法恰好给一种；选项／填空逐字段校验', () => {
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, fields: ENTRY.fields })), true,
      '选择问与填空问同时给（说不出这一问到底怎么答）');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, options: 'x' })), true, 'options 不是数组');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, options: [null] })), true, '元素不是对象');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, options: [{ title: 'a' }] })), true, '缺机器值');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, options: [{ value: 'a' }] })), true, '缺标题');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, options: [{ value: '', title: 'a' }] })), true);
    assert.equal(throwsBlocks(() => renderWizardShell({
      ...CHOICE, options: [{ value: 'a', title: 'a' }, { value: 'a', title: 'b' }],
    })), true, '机器值重复');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...ENTRY, fields: 'x' })), true, 'fields 不是数组');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...ENTRY, fields: [null] })), true);
    assert.equal(throwsBlocks(() => renderWizardShell({ ...ENTRY, fields: [{ label: 'a' }] })), true, '缺字段名');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...ENTRY, fields: [{ name: 'a' }] })), true, '缺标签');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...ENTRY, fields: [{ name: 'a', label: 'b', kind: 'date' }] })), true,
      '输入类型闭集外');
    assert.equal(throwsBlocks(() => renderWizardShell({
      ...ENTRY, fields: [{ name: 'a', label: 'a' }, { name: 'a', label: 'b' }],
    })), true, '字段名重复');
  });

  it('已答的机器值：空串／不给选项／不命中任何一条，一律拒', () => {
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, value: '' })), true, '没答请给 null，不许空串');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, value: 1 })), true, '不是字符串');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, value: 'nope' })), true, '不命中任何一条');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CONFIRM, value: 'a' })), true, '没有答法的那一问不该有已答值');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, value: null })), false, '未答是正常态');
  });

  it('状态开关：加载／禁用的"为什么"必须给全、不许互相盖', () => {
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, loadingText: '写库中' })), true, '不推进就换字');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, disabled: true })), true, '禁用必须给原因');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, disabledReason: '交过了' })), true, '没禁用不该给原因');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, disabled: true, disabledReason: '交过了', error: '选一条' })), true,
      '一行里两个"为什么"会互相盖住');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, skippable: 'yes' })), true, '布尔只收真布尔');
  });

  it('同页实例标识：只收 `[A-Za-z0-9_-]`（含糊的写法会与另一份撞名，撞了就是静默互踢）', () => {
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, id: 'wall a' })), true, '空格');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, id: 'wall.a' })), true, '点');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, id: '墙' })), true, '汉字（会上屏成 id，认不出是哪一份）');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, id: 1 })), true, '不是字符串');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, id: 'wall_1-x' })), false, '合法档要收');
    assert.equal(throwsBlocks(() => renderWizardShell({ ...CHOICE, id: '' })), false, '空串按"未给"处理（与全仓口径一致）');
  });
});

/* ── ①b 说明书与派生面（入参表是契约的一部分，不是散文） ──────────────── */

/** README 第一张「类型 ＋ 缺省／必填」表里的**顶层**字段（`父[].子` 那种元素字段行不算）。 */
function readmeTopFields(readme) {
  const lines = readme.split('\n');
  const cellsOf = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
  const out = [];
  for (let i = 0; i + 1 < lines.length; i += 1) {
    if (!lines[i].trim().startsWith('|') || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    const head = cellsOf(lines[i]);
    const typeCol = head.findIndex((c) => c.includes('类型'));
    const reqCol = head.findIndex((c) => c.includes('缺省') || c.includes('必填'));
    if (typeCol < 0 || reqCol < 0) continue;
    for (let j = i + 2; j < lines.length && lines[j].trim().startsWith('|'); j += 1) {
      const c = cellsOf(lines[j]);
      const field = c[0].replace(/`/g, '').trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(field)) continue;
      out.push([field, c[reqCol].includes('必填')]);
    }
    break;
  }
  return out;
}

describe('wizard-shell ①b 说明书与派生面', () => {
  it('README 入参表的「必填」栏与实现一致：写必填的不给就拒，写「—」的不给照渲染', () => {
    const rows = readmeTopFields(readFileSync(join(DIR, 'README.md'), 'utf8'));
    assert.ok(rows.length >= 15, '入参表抽出来的顶层字段太少（表头或行格式变了？）：' + rows.length);
    for (const [field, required] of rows) {
      /* 底样走**未答**那一档：`value` 给了却没选项是另一种违规（`value` 只在有选项的那一问上给），
         拿它当底会把 `options` 那一行试成"删了也拒"，读不出这条判据要读的事。 */
      const input = { ...CHOICE, value: null };
      delete input[field];
      const threw = throwsBlocks(() => renderWizardShell(input));
      assert.equal(threw, required, (required ? '写了必填却不给也不拒：' : '写了非必填却不给就拒：') + field);
    }
    /* 反面读数：`options` 曾写成「必填」——那与契约 #6（两者都不给＝确认屏）直接冲突。 */
    const optRow = rows.find(([f]) => f === 'options');
    assert.deepEqual(optRow, ['options', false], '`options` 的缺省栏应当是「—」（不给＝这一屏没有答法 ⇒ 确认屏）');
  });

  it('清单派生的示例入参：元素字段是**裸名**（不是把 `options[].value` 当键写字面量）', () => {
    const row = derive(PKG).pieces.find((p) => p.name === 'wizard-shell');
    assert.ok(row !== undefined, '派生器扫不到本件');
    assert.ok(row.sample !== null, 'README 入参表抽不出示例入参：' + JSON.stringify(row.sample));
    for (const key of Object.keys(row.sample)) {
      assert.equal(key.includes('['), false, '样例里出现了字面量数组键：' + JSON.stringify(key));
    }
    /* 选项元素的键：**与 `model.ts` 的 `WizardOption` 同面**——`value`／`title` 必填、`desc` 选填。
       原来这里写死 `['title','value']`，README 的示例块多给一个 `desc`（模型明确收这个字段）就红，
       红的是判据自己过窄，不是样例写坏。口径：**不许出现模型不认的键**，且必填那两个必须在。 */
    const OPTION_KEYS = ['desc', 'title', 'value'];
    const optKeys = Object.keys(row.sample.options[0]).sort();
    assert.ok(optKeys.every((k) => OPTION_KEYS.includes(k)),
      '选项元素出现模型不认的键：' + JSON.stringify(row.sample.options[0]));
    assert.ok(optKeys.includes('title') && optKeys.includes('value'),
      '选项元素必须带 `title` 与 `value`：' + JSON.stringify(row.sample.options[0]));
    /* 采样值能喂进 render：**只**该剩「派生器把 number 一律给 1」那一条通病（22 件同病，不归本件）。 */
    try {
      renderWizardShell(row.sample);
      console.log('READING wizard-shell：清单样例已能直接渲染（派生器的 number→1 通病不再影响本件）');
    } catch (e) {
      assert.match(String(e.message), /total 必须大于 input\.index/,
        '样例仍抛错，但只该剩"派生器把 number 一律给 1"这一条通病；现在报的是：' + String(e.message));
      console.log('READING wizard-shell：清单样例仍抛 ' + String(e.message).slice(0, 44) + '（派生器通病，非本件键名）');
    }
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('wizard-shell ② 样式与零 DOM 纪律', () => {
  const css = wizardShellCss();
  const clean = stripComments(css);

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且**只出现一次**', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = ruleSelectors(clean);
    assert.ok(selectors.length >= 40, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + one);
        assert.ok(one.includes(WIZARD_SHELL_CLASS), '选择器必须只碰本件类名根：' + one);
        assert.equal((one.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次（拼两遍＝永不命中的死规则）：' + one);
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零视口宽度查询／必带 `@container` 且自己声明了容器', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(clean.includes('@media'), true, '本件只用媒体查询判设备能力');
    assert.equal(/@media\s*\((?:max|min)-width/.test(clean), false, '宽度只许容器判（视口宽 ≠ 组件宽）');
    assert.ok(clean.includes('@container (max-width: ' + String(WIZARD_SHELL_NARROW_PX) + 'px)'), '窄档必须由容器判');
    assert.ok(clean.includes('container-type: inline-size'), '写了 @container 就必须自己声明容器（否则永不生效）');
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
  });

  it('零手写色值（兜底链那一处除外）、源码级零手写 `var(--ilife-…)`、不拿 ink 系当面', () => {
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外的颜色字面量：' + [...new Set(bare)].join('、'));
    const src = stripComments(styleSource('wizard-shell'));
    assert.deepEqual([...src.matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [], 'style.ts 里请改走 skinVar()');
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了"面"：' + value);
    }
    assert.ok(clean.includes('accent-soft'), '有文字的选中面走强调软底');
    assert.ok(clean.includes('accent-ink'), '实底那一档的字走强调底上的字色');
  });

  it('零省略号·零 `nowrap`·零 `overflow-x`：长了换行，不截断也不藏横滑', () => {
    for (const bad of ['text-overflow', 'line-clamp', 'white-space: nowrap', 'overflow: hidden', 'overflow-x', 'scroll']) {
      assert.equal(clean.includes(bad), false, '样式段里不许出现 ' + bad);
    }
    assert.ok(clean.includes('overflow-wrap: anywhere'), '长串必须能断');
    assert.equal(clean.includes('transitionend'), false, '状态不许依赖 `transitionend`');
    assert.ok(clean.includes('@media (prefers-reduced-motion: reduce)'), '动效偏好要有关掉的开关');
    assert.ok(clean.includes('@media (hover: hover) and (pointer: fine)'), '悬停只许是增强（包在设备能力里）');
  });

  it('几何事实写在一处：触控地板／选项高／间距／进度两档高都取常量', () => {
    for (const [name, value] of [['MIN_TARGET', WIZARD_SHELL_MIN_TARGET_PX], ['OPTION_MIN_HEIGHT', WIZARD_SHELL_OPTION_MIN_HEIGHT_PX],
      ['SEG', WIZARD_SHELL_SEG_PX], ['SEG_NOW', WIZARD_SHELL_SEG_NOW_PX]]) {
      assert.ok(clean.includes(String(value) + 'px'), name + ' 的尺寸没进样式段：' + String(value));
    }
    assert.ok(clean.includes('gap: ' + String(WIZARD_SHELL_TARGET_GAP_PX) + 'px'), '相邻触控目标的间距要进样式段');
    assert.ok(WIZARD_SHELL_SEG_NOW_PX > WIZARD_SHELL_SEG_PX, '当前那一格要比别格高一档（无文字的条只有一档颜色）');
    assert.ok(WIZARD_SHELL_MIN_TARGET_PX >= 44 && WIZARD_SHELL_TARGET_GAP_PX >= 8, '触控地板：44 与 8');
  });

  it('零键盘语汇（本产品手机与电脑同构：键盘只能当加速路径，不许当唯一通路）', () => {
    const words = ['快捷键', '键位', '方向键', '键帽', '键盘', '按 Enter', 'Tab', 'Esc', '⌘', '⌥'];
    const all = [CHOICE, FIRST, ENTRY, CONFIRM, LONG].map((i) => renderWizardShell(i)).join('') + css
      + Object.entries(SKINS).map(([n, s]) => s.values.ink + n).join('');
    for (const w of words) assert.equal(all.includes(w), false, '出现键盘语汇：' + w);
  });

  it('`dist/components/wizard-shell/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'wizard-shell');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 6, '至少该有 index／attrs／model／render／style／runtime 的产物：' + files.join('、'));
    for (const name of files) {
      const code = stripLiterals(readFileSync(join(dir, name), 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, name + ' 里出现了 ' + needle + '（DOM 只许出现在产出的 JS 文本里）');
      }
    }
  });

  it('运行时段：产出的是一段可跑的 IIFE，幂等键与事件名都在文本里', () => {
    const js = buildWizardShellJs();
    assert.equal(typeof js, 'string');
    assert.ok(js.includes(WIZARD_SHELL_ROOT_ATTR));
    assert.ok(js.includes(WIZARD_SHELL_EVENT_PICK) && js.includes(WIZARD_SHELL_EVENT_GO));
    assert.ok(js.includes(WIZARD_SHELL_STEP_ATTR) && js.includes(WIZARD_SHELL_VALUE_ATTR));
    assert.ok(js.includes('data-ilife-wizard-runtime'), '幂等键');
    assert.equal(/<script/i.test(js), false, '运行时段文本里不夹标签');
  });
});

/* ── ②b 样式读数：禁用态与加载态的形写在取值上（只数枚数断不到这一层） ──── */

/** 皮肤取值写成 CSS 时的样子：`skinVar()` 带兜底链（`var(--ilife-x, var(--fallback, #hex))`）——
 *  判据比的是**取了哪个 token**，不是整串。 */
const tokenIs = (value, token) => {
  const m = new RegExp('^var\\(--ilife-' + token + '\\b').test(String(value));
  assert.ok(m, '取值该取 `' + token + '`，实际是：' + String(value));
  return true;
};

describe('wizard-shell ②b 样式读数：按不动与推进中到底画成了什么样', () => {
  const clean = stripComments(wizardShellCss());
  const scope = '.ilife-page-ui';
  const opt = scope + ' .' + wizardShellSlot('opt');
  const bt = scope + ' .' + wizardShellSlot('bt');
  const busy = scope + ' .' + WIZARD_SHELL_CLASS + '[' + WIZARD_SHELL_LOADING_ATTR + '="1"]';
  const btOff = bt + '[disabled]';
  const primarySel = bt + '.is-primary';
  const busyPrimarySel = busy + ' .' + wizardShellSlot('bt') + '.is-primary';

  it('按不动的键：字（弱文字）＋ 形（虚线框）＋ 框色（够得着图形地板 3:1）三样都在取值上', () => {
    const off = declsOf(clean, btOff);
    assert.equal(off.get('border-style'), 'dashed', '按不动要有"形"那一重（触屏上没有 cursor）');
    assert.equal(off.get('background'), 'transparent', '底露出脚行底色（"软底压软底"那套要躲开）');
    tokenIs(off.get('color'), 'ink-3');
    const border = String(off.get('border-color'));
    const m = /^var\(--ilife-([a-z0-9-]+)\b/.exec(border);
    assert.ok(m !== null, '框色要取皮肤 token（不写字面色）：' + border);
    for (const skin of SKIN_NAMES) {
      const v = SKINS[skin].values;
      const r = contrastOf(v[m[1]], v['surface-2']);
      assert.ok(r !== null && r >= 3,
        skin + '：按不动的键框色（' + m[1] + '）对脚行底只有 ' + String(r) + ':1（图形地板 3:1）');
      assert.ok(contrastOf(v['line'], v['surface-2']) < 3, skin + '：`line` 对脚行底居然够 3:1 —— README 与注释要跟着改');
    }
    console.log('READING wizard-shell 按不动框色 ' + m[1] + ' 对脚行底：'
      + SKIN_NAMES.map((s) => s + '=' + String(contrastOf(SKINS[s].values[m[1]], SKINS[s].values['surface-2']))).join('／')
      + '；同样位置上 `line` 只有 '
      + SKIN_NAMES.map((s) => s + '=' + String(contrastOf(SKINS[s].values.line, SKINS[s].values['surface-2']))).join('／'));
  });

  it('答题区的禁用态：选项框改虚线、标记位虚线、标题走弱文字（`cursor` 触屏上没有，另要有看得见的形）', () => {
    const o = declsOf(clean, opt + ':has(input[disabled])');
    assert.equal(o.get('border-style'), 'dashed', '禁用态选项要有一处看得见的形');
    assert.equal(o.get('cursor'), 'not-allowed', '鼠标那一档仍要保留');
    assert.equal(declsOf(clean, opt + ':has(input[disabled]) > .' + wizardShellSlot('mk')).get('border-style'), 'dashed',
      '标记位也要跟着改形（光染框是一条细线的差别）');
    tokenIs(declsOf(clean, opt + ':has(input[disabled]) .' + wizardShellSlot('opt-title')).get('color'), 'ink-3');
    /* 选中那一重不被禁用的虚线盖掉：选中的那一条**恒实线**（按不动 ≠ 没选）。 */
    assert.equal(declsOf(clean, opt + ':has(input:checked)').get('border-style'), 'solid');
    assert.equal(declsOf(clean, opt + ':has(input:checked) > .' + wizardShellSlot('mk')).get('border-style'), 'solid');
    /* 选中标题的强调字色：**命中得着**（`>` 那条是死规则——`.opt-title` 住在 `.tx` 里）。 */
    tokenIs(declsOf(clean, opt + ':has(input:checked) .' + wizardShellSlot('opt-title')).get('color'), 'accent-text');
    for (const r of cssRules(clean)) {
      if (!r.sel.includes('.' + wizardShellSlot('opt-title'))) continue;
      assert.equal(new RegExp('>\\s*\\.' + wizardShellSlot('opt-title')).test(r.sel), false,
        '`.opt-title` 住在 `.tx` 里，不是 `.opt` 的直接子节点 —— 带 `>` 的组合子永不命中：' + r.sel);
    }
  });

  it('推进中的主键**保住实底**（字已换成"保存中"，就地告诉读者"它在干活"）', () => {
    /* 这一条一旦被抵消，主键 computed 会变 `dashed` ＋ 透明底（红）：这条判据读的就是那几个取值。 */
    const b = declsOf(clean, busyPrimarySel);
    assert.equal(b.get('border-style'), 'solid', '推进中主键不许变虚框（读者会以为取消了）');
    const rest = declsOf(clean, primarySel);
    for (const prop of ['border-color', 'background', 'color']) {
      assert.equal(b.get(prop), rest.get(prop), '推进中主键的 ' + prop + ' 要与常态同一份取值');
    }
    tokenIs(b.get('background'), 'accent-text');
    tokenIs(b.get('color'), 'accent-ink');
    /* 顺序：通用禁用规则先、推进中那条后（反了 ⇒ 一按下去红底变虚框）。 */
    const order = cssRules(clean).map((r) => r.sel);
    assert.ok(order.indexOf(busyPrimarySel) > order.indexOf(btOff),
      '推进中主键那条规则必须压在 `[disabled]` 之后：' + order.indexOf(busyPrimarySel) + ' < ' + order.indexOf(btOff));
  });
});

/* ── ③ 加法式 ──────────────────────────────────────────────────────── */

describe('wizard-shell ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(WIZARD_SHELL_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const before = renderScaleBar({ value: 860, goal: 1850 });
    renderWizardShell(CHOICE);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), before, '别件的产物逐字节不变');
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(wizardShellCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-wizard-shell'), '前缀必须作用到 scope 与类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });
});

/* ── ④ 两档几何（真机）＋ 皮肤纪律 ＋ 交互 ─────────────────────────── */

/** 静态几何判据（真机起不来时的退路）：标记与样式段里不得有超过窄档的固定宽度。 */
function assertStaticGeometry(css, html) {
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const wide = [...px(html), ...px(css)].filter((v) => v > 390);
  assert.deepEqual(wide, [], '出现过不了窄档（390）的固定宽度：' + wide.join('、'));
}

/** 夹具里压力样例：选择问（已答）／第 1 问／填空／确认屏／长串／推进中／整壳禁用。 */
function cases() {
  return [
    ['choice', CHOICE], ['first', FIRST], ['entry', ENTRY], ['confirm', CONFIRM],
    ['long', LONG], ['loading', { ...CHOICE, loading: true }], ['off', OFF],
  ];
}

/** 一份实例的**同页实例键**：四套皮肤 × 七个样例＝28 份同名实例摆在一页上，每份都得有自己的键
 *  （不给就是 S1：单选组同名 ⇒ 点一份把另一份的选中静默取消、件内 id 重号）。 */
const fixtureId = (skin, caseName) => 'wz-' + skin + '-' + caseName;

/** 一片皮肤下的整套样例。 */
function skinCasesHtml(skin) {
  return cases().map(([name, input]) => '<section data-case="' + name + '">'
    + renderWizardShell({ ...input, id: fixtureId(skin, name) }) + '</section>').join('');
}

/** 比"换皮不换结构"之前，把**实例键**抹成同一个占位符：它是"每份实例必须不同"的那一处，
 *  皮肤之间**只有它**允许不同；其余一个字节都要一样。 */
const maskInstanceKey = (html, skin, caseName) => String(html).split(fixtureId(skin, caseName)).join('<KEY>');

const WIDTHS = [390, 1280];

describe('wizard-shell ④ 两档几何与交互（真机 headless Chrome ＋ CDP）', () => {
  it('容器 390／1280：零横向溢出 ＋ 触控 ≥44 ＋ 间距 ≥8 ＋ 零截断 ＋ 换皮不换结构 ＋ 真点交互', async (t) => {
    const css = wizardShellCss();
    const casesHtml = SKIN_NAMES.map(skinCasesHtml).join('');
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '" data-skin="' + skin + '">'
        + skinCasesHtml(skin) + '</div>').join('\n'),
      css: skinCss() + '\n' + css,
      height: 1600,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：标记与样式段里没有超过 390px 的固定宽度');
      assertStaticGeometry(css, casesHtml);
      return t.skip('本机无 Chrome／Chromium：两档几何判据需真浏览器');
    }
    try {
      /* 运行时段注入一次（幂等：再注入一遍不该重复绑定）。事件挂到 document 上收。 */
      await page.ev('window.__hits=[];'
        + 'document.addEventListener(' + JSON.stringify(WIZARD_SHELL_EVENT_PICK) + ',function(e){window.__hits.push({t:"pick",d:e.detail});});'
        + 'document.addEventListener(' + JSON.stringify(WIZARD_SHELL_EVENT_GO) + ',function(e){window.__hits.push({t:"go",d:e.detail});});'
        + 'var s=document.createElement("script");s.textContent=' + JSON.stringify(buildWizardShellJs()) + ';document.body.appendChild(s);'
        + 'var s2=document.createElement("script");s2.textContent=' + JSON.stringify(buildWizardShellJs()) + ';document.body.appendChild(s2);true');
      const seen = [];
      for (const width of WIDTHS) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1,
          width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of SKIN_NAMES) {
          const scope = '.' + skinClass(skin) + ' [data-case="choice"] ';
          const root = await page.read([scope + '.' + WIZARD_SHELL_CLASS]);
          assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
          assert.ok(root[0].maxScrollW <= root[0].maxClientW + 1,
            width + ' 档 ' + skin + '：根横向溢出 ' + root[0].maxScrollW + ' > ' + root[0].maxClientW);
          const texts = await page.read([wizardShellSlot('q'), wizardShellSlot('step'), wizardShellSlot('aside'),
            wizardShellSlot('opt-title'), wizardShellSlot('opt-desc'), wizardShellSlot('hint'), wizardShellSlot('bt-label'),
            wizardShellSlot('error'), wizardShellSlot('fld-label')]
            .map((slot) => '.' + skinClass(skin) + ' .' + slot));
          for (const one of texts) {
            assert.equal(one.clipped, 0, width + ' 档 ' + skin + '：' + one.sel + ' 有 ' + one.clipped + ' 处被压字');
          }
        }
        /* 触控地板与间距、大字问题的尺度：逐皮肤量（皮肤换的是取值，不许把命中盒换小）。 */
        const box = await page.ev('(function(){'
          + 'var skins=' + JSON.stringify([...SKIN_NAMES]) + ';var out={};'
          + 'for (var k=0;k<skins.length;k+=1){'
          + '  var sec=document.querySelector("."+ "ilife-skin-"+skins[k]+" [data-case=choice]");'
          + '  var boxes=[].slice.call(sec.querySelectorAll("."+' + JSON.stringify(wizardShellSlot('opt')) + ')).map(function(o){var r=o.getBoundingClientRect();return {w:r.width,h:r.height,t:r.top,b:r.bottom};});'
          + '  var bs=[].slice.call(sec.querySelectorAll("."+' + JSON.stringify(wizardShellSlot('bt')) + ')).map(function(b){var r=b.getBoundingClientRect();return {w:r.width,h:r.height,l:r.left,rr:r.right};});'
          + '  var q=sec.querySelector("."+' + JSON.stringify(wizardShellSlot('q')) + ');'
          + '  var root=sec.querySelector("."+' + JSON.stringify(WIZARD_SHELL_CLASS) + ');'
          + '  var foot=sec.querySelector("."+' + JSON.stringify(wizardShellSlot('foot')) + ');'
          + '  var segs=[].slice.call(sec.querySelectorAll("."+' + JSON.stringify(wizardShellSlot('seg')) + ')).map(function(s){return Math.round(s.getBoundingClientRect().height);});'
          + '  out[skins[k]]={opts:boxes,btns:bs,fs:parseFloat(getComputedStyle(q).fontSize),body:parseFloat(getComputedStyle(root).fontSize),'
          + '    footH:Math.round(foot.getBoundingClientRect().height),segs:segs,sw:root.scrollWidth,cw:root.clientWidth};}return out;}())');
        for (const skin of SKIN_NAMES) {
          const r = box[skin];
          const gapBtns = r.btns.slice(1).map((b, i) => b.l - r.btns[i].rr);
          for (const o of r.opts) {
            assert.ok(o.w >= WIZARD_SHELL_MIN_TARGET_PX && o.h >= WIZARD_SHELL_OPTION_MIN_HEIGHT_PX,
              width + ' 档 ' + skin + '：选项命中盒 ' + Math.round(o.w) + '×' + Math.round(o.h) + ' 不够');
          }
          for (const b of r.btns) {
            assert.ok(b.w >= WIZARD_SHELL_MIN_TARGET_PX && b.h >= WIZARD_SHELL_MIN_TARGET_PX,
              width + ' 档 ' + skin + '：按钮命中盒 ' + Math.round(b.w) + '×' + Math.round(b.h) + ' 不够');
          }
          for (const g of gapBtns) assert.ok(g >= 8, width + ' 档 ' + skin + '：相邻按钮间距 ' + g + ' < 8');
          for (let i = 1; i < r.opts.length; i += 1) {
            assert.ok(r.opts[i].t - r.opts[i - 1].b >= 8,
              width + ' 档 ' + skin + '：相邻选项间距 ' + Math.round(r.opts[i].t - r.opts[i - 1].b) + ' < 8');
          }
          assert.ok(r.sw <= r.cw + 1, width + ' 档 ' + skin + '：根横向溢出');
          assert.ok(r.fs >= r.body * 1.8, width + ' 档 ' + skin + '：大字问题 ' + r.fs + ' 不够大（正文 ' + r.body + '）');
          assert.equal(r.segs[CHOICE.index], WIZARD_SHELL_SEG_NOW_PX, '正走那一格高一档：' + r.segs.join('、'));
          assert.equal(r.segs.filter((h, i) => i !== CHOICE.index).every((h) => h === WIZARD_SHELL_SEG_PX), true,
            '其余格一个高度：' + r.segs.join('、'));
          seen.push({ width, skin, fs: r.fs, body: r.body, footH: r.footH, hitH: Math.min(...r.btns.map((b) => b.h)), sw: r.sw, cw: r.cw });
        }
      }
      /* **窄档差异只可能来自容器查询**：两档视口都是 1440，脚行在 390 档多占一行（提示句独占一行）。 */
      const narrowFoot = seen.filter((s) => s.width === 390).map((s) => s.footH);
      const wideFoot = seen.filter((s) => s.width === 1280).map((s) => s.footH);
      assert.equal(narrowFoot.every((h) => h > Math.max(...wideFoot)), true,
        '390 档脚行应比 1280 档高（提示句独占一行 ⇒ @container 命中）：390=' + JSON.stringify(narrowFoot)
        + ' 1280=' + JSON.stringify(wideFoot));
      /* 换皮不换结构：四套皮肤容器里的标记逐字节相同（**实例键那一处除外** —— 每份实例必须有自己的键，
         比之前把它抹成同一个占位符；其余一个字节都不许差）。 */
      for (const width of WIDTHS) {
        await page.setWidth(width);
        for (const [caseName] of cases()) {
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify([...SKIN_NAMES]) + ';'
            + 'for (var i=0;i<skins.length;i+=1){var el=document.querySelector(".ilife-skin-"+skins[i]+" [data-case=' + caseName + '] .'
            + WIZARD_SHELL_CLASS + '");out[skins[i]]=el===null?"":el.innerHTML;}return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(maskInstanceKey(marks[skin], skin, caseName),
              maskInstanceKey(base, SKIN_NAMES[0], caseName),
              width + ' 档 ' + caseName + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同（实例键已抹平）');
          }
        }
      }
      /* 交互：点第二条选项 ⇒ 机器值落属性 ＋ 派发一次 `ilife:wizard-pick`；再点一次同一枚 ⇒ 不再派发。 */
      await page.setWidth(1280);
      await page.ev('document.querySelector(".ilife-skin-paper [data-case=choice] input[value=three_four]").click();true');
      await page.ev('document.querySelector(".ilife-skin-paper [data-case=choice] input[value=three_four]").click();true');
      let hits = await page.ev('window.__hits');
      assert.equal(hits.length, 1, '改一次机器值只派发一次（重复注入不许重复绑定）：' + JSON.stringify(hits));
      assert.equal(hits[0].t, 'pick');
      assert.equal(hits[0].d.value, 'three_four');
      assert.equal(hits[0].d.prev, 'one_two', '事件带改前值');
      assert.equal(hits[0].d.title, '3–4 次', '事件带人话标题');
      const attr = await page.ev('document.querySelector(".ilife-skin-paper [data-case=choice] .' + WIZARD_SHELL_CLASS
        + '").getAttribute(' + JSON.stringify(WIZARD_SHELL_VALUE_ATTR) + ')');
      assert.equal(attr, 'three_four', '机器值就地落到根属性上');
      /* **同页多实例互不干扰**（这一页有 4 份同名实例）：点第 1 份的选项，其余各份的选中态一条不动。
         不给实例键时这里会读到"其余各份 checked 从 1 变 0"（静默互踢），且全页 id 重号。 */
      const iso = await page.ev('(function(){var out={per:{},dupIds:[],groupNames:{}};var skins='
        + JSON.stringify([...SKIN_NAMES]) + ';'
        + 'for (var i=0;i<skins.length;i+=1){var sec=document.querySelector(".ilife-skin-"+skins[i]+" [data-case=choice]");'
        + 'var picked=sec.querySelectorAll("input[type=radio]:checked");'
        + 'out.per[skins[i]]={checked:picked.length,value:picked.length>0?picked[0].value:null,'
        + 'rows:sec.querySelectorAll(".' + WIZARD_SHELL_CLASS + '-opt:has(input:checked)").length};'
        + 'out.groupNames[skins[i]]=sec.querySelector("input[type=radio]").getAttribute("name");}'
        + 'var seen={};var all=document.querySelectorAll("[id^=ilife-wizard-]");'
        + 'for (var k=0;k<all.length;k+=1){if(seen[all[k].id])out.dupIds.push(all[k].id);seen[all[k].id]=1;}'
        + 'return out;}())');
      assert.deepEqual(iso.dupIds, [], '全页件内 id 重号：' + JSON.stringify(iso.dupIds));
      assert.equal(new Set(Object.values(iso.groupNames)).size, SKIN_NAMES.length,
        '四份实例的单选组名必须互不相同：' + JSON.stringify(iso.groupNames));
      for (const skin of SKIN_NAMES) {
        const r = iso.per[skin];
        assert.equal(r.checked, 1, skin + '：点了第 1 份之后这一份一条选中的都没有了（被同页另一份踢掉）');
        assert.equal(r.rows, 1, skin + '：选中态那一行丢了');
        assert.equal(r.value, skin === 'paper' ? 'three_four' : 'one_two',
          skin + '：这一份的选中值被别人改了（点一份不许改另一份）');
      }
      console.log('READING wizard-shell 同页 ' + SKIN_NAMES.length + ' 份同名实例：点击后各份 checked ＝ '
        + SKIN_NAMES.map((s) => s + ':' + String(iso.per[s].checked) + '/' + String(iso.per[s].value)).join('、')
        + '；全页 id 重号 ' + String(iso.dupIds.length) + ' 处；组名互不相同 ' + String(new Set(Object.values(iso.groupNames)).size === SKIN_NAMES.length));
      /* **禁用态在屏上看得见**：可用壳与禁用壳的答题区逐属性对照（9 个绘制属性里至少一处要不同），
         以及按不动的键那条框线的对比度（`line` 对脚行底只有 1.16…1.41:1，读不出来）。 */
      const paint = await page.ev('(function(){var KEYS=["backgroundColor","borderColor","borderStyle","boxShadow",'
        + '"opacity","color","visibility","transform","outlineColor"];'
        + 'function props(sel){var n=document.querySelector(sel);var cs=getComputedStyle(n);var o={};'
        + 'for(var i=0;i<KEYS.length;i+=1)o[KEYS[i]]=cs[KEYS[i]];return o;}'
        + 'var P=".ilife-skin-paper ";'
        + 'return {keys:KEYS,'
        + 'onOpt:props(P+"[data-case=choice] .' + wizardShellSlot('opt') + '"),'
        + 'offOpt:props(P+"[data-case=off] .' + wizardShellSlot('opt') + '"),'
        + 'onMk:props(P+"[data-case=choice] .' + wizardShellSlot('mk') + '"),'
        + 'offMk:props(P+"[data-case=off] .' + wizardShellSlot('mk') + '"),'
        + 'onTitle:props(P+"[data-case=choice] .' + wizardShellSlot('opt-title') + '"),'
        + 'offTitle:props(P+"[data-case=off] .' + wizardShellSlot('opt-title') + '"),'
        + 'offBtBorder:props(P+"[data-case=off] .' + wizardShellSlot('bt') + '[disabled]").borderColor,'
        + 'footBg:props(P+"[data-case=off] .' + wizardShellSlot('foot') + '").backgroundColor,'
        + 'cursorOn:getComputedStyle(document.querySelector(P+"[data-case=choice] .' + wizardShellSlot('opt') + '")).cursor,'
        + 'cursorOff:getComputedStyle(document.querySelector(P+"[data-case=off] .' + wizardShellSlot('opt') + '")).cursor,'
        + 'offCheckedRows:document.querySelectorAll(P+"[data-case=off] .' + WIZARD_SHELL_CLASS + '-opt:has(input:checked)").length};}())');
      assert.equal(paint.onOpt.borderStyle, 'solid', '可用态的选项框该是实线');
      assert.equal(paint.offOpt.borderStyle, 'dashed', '禁用态的选项框该是虚线（触屏上唯一看得见的形）');
      assert.equal(paint.offMk.borderStyle, 'dashed', '禁用态的标记位也要改形');
      assert.equal(paint.offTitle.color !== paint.onTitle.color, true,
        '禁用态的标题要走弱文字档：' + paint.onTitle.color + ' → ' + paint.offTitle.color);
      /* 选中标题的强调字色：逐皮肤量 computed，与皮肤表里的 `accent-text` 逐值对齐
         （这条规则用 `>` 组合子时是**死规则**：`.opt-title` 住在 `.tx` 里，屏上字色一字不变）。 */
      const titleColor = await page.ev('(function(){var out={};var skins=' + JSON.stringify([...SKIN_NAMES]) + ';'
        + 'for (var i=0;i<skins.length;i+=1){var p=".ilife-skin-"+skins[i]+" ";'
        + 'out[skins[i]]=getComputedStyle(document.querySelector(p+"[data-case=choice] .' + WIZARD_SHELL_CLASS
        + '-opt:has(input:checked) .' + WIZARD_SHELL_CLASS + '-opt-title")).color;}return out;}())');
      for (const skin of SKIN_NAMES) {
        assert.deepEqual(rgbOf(titleColor[skin]), rgbOf(SKINS[skin].values['accent-text']),
          skin + '：选中那一条的标题字色该是 `accent-text`（' + SKINS[skin].values['accent-text'] + '），实际是 ' + titleColor[skin]);
      }
      console.log('READING wizard-shell 选中标题 computed 字色：'
        + SKIN_NAMES.map((s) => s + '=' + titleColor[s]).join('、')
        + '（皮肤表 accent-text＝' + SKIN_NAMES.map((s) => SKINS[s].values['accent-text']).join('、') + '）');
      const drew = paint.keys.filter((k) => paint.onOpt[k] !== paint.offOpt[k]);
      assert.ok(drew.length >= 1, '禁用态答题区与可用态**逐像素相同**（9 个绘制属性一个都没变）：' + JSON.stringify(paint.onOpt));
      assert.equal(paint.cursorOn, 'pointer');
      assert.equal(paint.cursorOff, 'not-allowed', '鼠标那一档仍要保留（但它不是唯一的一档）');
      assert.equal(paint.offCheckedRows, 1, '禁用壳里已选中的那一条仍要显示选中（按不动 ≠ 没选）');
      const offRatio = contrastOf(paint.offBtBorder, paint.footBg);
      assert.ok(offRatio !== null && offRatio >= 3,
        '按不动的键框色对脚行底只有 ' + String(offRatio) + ':1（图形地板 3:1）：' + paint.offBtBorder + ' on ' + paint.footBg);
      console.log('READING wizard-shell 禁用态 vs 可用态（选项）：差异属性 ' + JSON.stringify(drew)
        + '；按不动键框色 ' + paint.offBtBorder + ' on 脚行底 ' + paint.footBg + ' ＝ ' + String(offRatio) + ':1'
        + '；cursor ' + paint.cursorOn + ' → ' + paint.cursorOff);
      /* **推进中主键保住实底**：真机 computed 与常态主键逐属性同值（抵消那条规则 ⇒ dashed／透明 ⇒ 红）。 */
      const busyPaint = await page.ev('(function(){function props(sel){var cs=getComputedStyle(document.querySelector(sel));'
        + 'return {borderStyle:cs.borderStyle,borderColor:cs.borderColor,backgroundColor:cs.backgroundColor,color:cs.color};}'
        + 'var P=".ilife-skin-paper ";'
        + 'return {rest:props(P+"[data-case=choice] .' + wizardShellSlot('bt') + '.is-primary"),'
        + 'busy:props(P+"[data-case=loading] .' + wizardShellSlot('bt') + '.is-primary")};}())');
      assert.equal(busyPaint.busy.borderStyle, 'solid', '推进中主键变虚框了：' + JSON.stringify(busyPaint.busy));
      assert.equal(busyPaint.busy.backgroundColor, busyPaint.rest.backgroundColor, '推进中主键的实底丢了');
      assert.equal(busyPaint.busy.borderColor, busyPaint.rest.borderColor);
      assert.equal(busyPaint.busy.color, busyPaint.rest.color);
      assert.equal(/^rgba\(0, 0, 0, 0\)$/.test(busyPaint.busy.backgroundColor), false, '推进中主键不许变透明底');
      console.log('READING wizard-shell 推进中主键 computed（常态 → 推进中）：'
        + paint.keys.length + ' 项里 borderStyle=' + busyPaint.rest.borderStyle + '→' + busyPaint.busy.borderStyle
        + '，实底 ' + busyPaint.rest.backgroundColor + '→' + busyPaint.busy.backgroundColor);
      /* 三枚键：主键派发 `go=next`；第 1 问上「上一问」按不动（点了没反应）。 */
      await page.ev('document.querySelector(".ilife-skin-paper [data-case=choice] ['
        + WIZARD_SHELL_GO_ATTR + '=next]").click();true');
      hits = await page.ev('window.__hits');
      assert.equal(hits.length, 2);
      assert.equal(hits[1].t, 'go');
      assert.equal(hits[1].d.go, 'next');
      assert.equal(hits[1].d.index, CHOICE.index);
      assert.equal(hits[1].d.value, 'three_four');
      assert.deepEqual(hits[1].d.fields, {}, '选择问没有填空要收');
      await page.ev('document.querySelector(".ilife-skin-paper [data-case=first] ['
        + WIZARD_SHELL_GO_ATTR + '=back]").click();true');
      assert.equal((await page.ev('window.__hits')).length, 2, '第 1 问上「上一问」按动了（它该是按不动的）');
      /* 填空问：改动输入框的值 ⇒ 推进时收到 `fields`（键＝字段机器名）。 */
      await page.ev('var i=document.querySelector(".ilife-skin-paper [data-case=entry] ['
        + WIZARD_SHELL_FIELD_ATTR + '=height]");i.value="176";'
        + 'document.querySelector(".ilife-skin-paper [data-case=entry] [' + WIZARD_SHELL_GO_ATTR + '=next]").click();true');
      hits = await page.ev('window.__hits');
      assert.equal(hits.length, 3);
      assert.deepEqual(hits[2].d.fields, { weight: '68.4', height: '176' });
      /* 推进中：主键宽度与常态一致（两枚字叠在同一格 ⇒ 不跳版）。 */
      const lock = await page.ev('(function(){'
        + 'function w(sel){return Math.round(document.querySelector(sel).getBoundingClientRect().width);}'
        + 'return {rest:w(".ilife-skin-paper [data-case=choice] [' + WIZARD_SHELL_GO_ATTR + '=next]"),'
        + 'busy:w(".ilife-skin-paper [data-case=loading] [' + WIZARD_SHELL_GO_ATTR + '=next]"),'
        + 'busyDisabled:document.querySelector(".ilife-skin-paper [data-case=loading] [' + WIZARD_SHELL_GO_ATTR + '=next]").disabled};}())');
      assert.equal(lock.busy, lock.rest, '推进中主键宽度应与常态逐像素相同（不跳版）：' + JSON.stringify(lock));
      assert.equal(lock.busyDisabled, true, '推进中三枚键都按不动');
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      for (const w of WIDTHS) {
        const rows = seen.filter((s) => s.width === w);
        console.log('READING wizard-shell container=' + w
          + ' rootScrollW=' + rows[0].sw + ' rootClientW=' + rows[0].cw
          + ' 大字问题=' + rows[0].fs + 'px 正文=' + rows[0].body + 'px'
          + ' 最小按钮高=' + rows.map((s) => s.hitH).join('／')
          + ' 脚行高=' + rows.map((s) => s.skin + ':' + s.footH).join('、'));
      }
      console.log('READING wizard-shell 推进中主键宽=' + lock.busy + 'px ＝ 常态 ' + lock.rest + 'px'
        + '；事件读数 ' + JSON.stringify(hits.map((h) => h.t + ':' + h.d.go)));
    } finally { page.close(); }
  });
});
