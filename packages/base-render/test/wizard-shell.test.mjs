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
  WIZARD_SHELL_CLASS,
  WIZARD_SHELL_EVENT_GO,
  WIZARD_SHELL_EVENT_PICK,
  WIZARD_SHELL_FIELD_ATTR,
  WIZARD_SHELL_FIELD_KINDS,
  WIZARD_SHELL_FORMS,
  WIZARD_SHELL_GO_ATTR,
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
import { startShapesPage } from './shapes-probe.mjs';

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

  it('根：类名根 ＋ 形态类 ＋ 四枚机器读数（第几问／一共几问／已答的机器值／机器键）', () => {
    assert.match(html, new RegExp('^<div class="' + WIZARD_SHELL_CLASS + ' is-one"'));
    assert.ok(html.includes(WIZARD_SHELL_ROOT_ATTR + '="1"'), '根锚（运行时的发现锚）');
    assert.ok(html.includes(WIZARD_SHELL_NAME_ATTR + '="cook"'));
    assert.ok(html.includes(WIZARD_SHELL_STEP_ATTR + '="2"'), '当前是第几问落属性（页面拿它当草稿坐标）');
    assert.ok(html.includes(WIZARD_SHELL_TOTAL_ATTR + '="5"'));
    assert.ok(html.includes(WIZARD_SHELL_VALUE_ATTR + '="one_two"'), '已答的机器值落属性');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.equal(/\son[a-z]+=/.test(html), false, '零内联事件处理器');
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
    const src = stripComments(readFileSync(join(DIR, 'style.ts'), 'utf8'));
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

/** 夹具里的四份压力样例：选择问（已答）／第 1 问／填空／确认屏／长串。 */
function cases() {
  return [
    { name: 'choice', html: renderWizardShell(CHOICE) },
    { name: 'first', html: renderWizardShell(FIRST) },
    { name: 'entry', html: renderWizardShell(ENTRY) },
    { name: 'confirm', html: renderWizardShell(CONFIRM) },
    { name: 'long', html: renderWizardShell(LONG) },
    { name: 'loading', html: renderWizardShell({ ...CHOICE, loading: true }) },
  ];
}

const WIDTHS = [390, 1280];

describe('wizard-shell ④ 两档几何与交互（真机 headless Chrome ＋ CDP）', () => {
  it('容器 390／1280：零横向溢出 ＋ 触控 ≥44 ＋ 间距 ≥8 ＋ 零截断 ＋ 换皮不换结构 ＋ 真点交互', async (t) => {
    const css = wizardShellCss();
    const casesHtml = cases().map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '" data-skin="' + skin + '">'
        + casesHtml + '</div>').join('\n'),
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
      /* 换皮不换结构：四套皮肤容器里的标记逐字节相同。 */
      for (const width of WIDTHS) {
        await page.setWidth(width);
        for (const c of cases()) {
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify([...SKIN_NAMES]) + ';'
            + 'for (var i=0;i<skins.length;i+=1){var el=document.querySelector(".ilife-skin-"+skins[i]+" [data-case=' + c.name + '] .'
            + WIZARD_SHELL_CLASS + '");out[skins[i]]=el===null?"":el.innerHTML;}return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(marks[skin], base, width + ' 档 ' + c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
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
