/** undo-timeline（改动时间线 · 形态 `track`「一条轨」／形态 `impact`「一次改动的回滚单」）· 契约测试。
 *
 * 覆盖四类断言：
 *  ① **渲染契约**：两形态各自的骨架（`track` 的卡头／竖轨／三行文字／那一枚动作／就地回滚单／页脚；
 *     `impact` 的整张回滚单）／**三态的三重非颜色标记**（片上的字 ＋ 圆点的形 ＋ 动作句的删除线＋按钮上的字）／
 *     动作按钮的三档（`go` 能撤／`restore` 已撤／`locked` 按不动且写得清为什么）／
 *     `openKey` 与 `aria-controls` 的对应／忙碌态两枚字都在／错态写在按钮旁边／空态／
 *     转义面（每个文本字段都塞一遍注入串）／**闭集里的槽名一个都不许是死声明**／
 *     **非 ASCII 键的 `id` 同页唯一且 `aria-controls` 指着自己那块**／
 *     **全部**非法入参分支（每个都断 `BlocksError`，含**稀疏数组**与三处「标了必填却没给」）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且只出现一次、
 *     零 `:root`／`!important`／零新 token／零 `@media` 宽度查询／`[hidden]` 被显式重写／
 *     零省略号式截断（`text-overflow`／`line-clamp`／`nowrap`／`overflow-x`）／触控地板数字写在一处／
 *     **忙碌那枚字出流（不参与固有宽）且左右外扩＝按钮内距**／**竖轨的一根通的线**（行的竖向内距不住行上）／
 *     窄档阈值只有 `attrs.ts` 一处出处／`:active` 只碰 `transform`／状态矩阵齐（含 `disabled` 光标与
 *     `prefers-reduced-motion`）／零键盘语汇（标记与运行时两处）；
 *     `dist/components/undo-timeline/**` 剥字面量与注释后零 `document.`／`window.`／`navigator.`；
 *  ③ **加法式**：不挂本件时同页产物逐字节不变；换前缀时 scope 与类名一起换；
 *  ④ **两档几何（真机 headless Chrome ＋ CDP）**：**容器**宽 320／390／620／1280 下零横向溢出、
 *     不出现横向滚动容器、关键语义（时刻／条数／个数／读数／按钮字）零截断、命中盒 ≥44×44、
 *     整行命中区 ≥56px、相邻触控目标间距 ≥8px、四套皮肤下标记逐字节相同、
 *     每套皮肤下那几处取值取自本套皮肤；**起不来就退确定性几何判据并打印原因**；
 *  ⑤ **行为（真机）**：一次只开一块／再点同一处收起／点外面关／重复注入只绑一次／
 *     勾选变化三处一起重算（结论句 ＋ 主按钮字 ＋ 按不动）并派发 `ilife:undo-timeline-pick`／
 *     主按钮派发 `ilife:undo-timeline-undo`（带勾上的那几项）且不自动收起／
 *     「恢复这笔」派发 `ilife:undo-timeline-restore`／整段回滚派发 `ilife:undo-timeline-rollback`／
 *     `impact` 形态的「取消」派发 `ilife:undo-timeline-cancel`／「取消」收起后焦点还给那一枚按钮。
 *
 * 期望值一律从组件自己的常量派生（`UNDO_TIMELINE_*` ＋ 四个 `id` 拼法），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  UNDO_TIMELINE_CLASS,
  UNDO_TIMELINE_ENTRY_MAX,
  UNDO_TIMELINE_EVENT_CANCEL,
  UNDO_TIMELINE_EVENT_PICK,
  UNDO_TIMELINE_EVENT_RESTORE,
  UNDO_TIMELINE_EVENT_ROLLBACK,
  UNDO_TIMELINE_EVENT_UNDO,
  UNDO_TIMELINE_FORMS,
  UNDO_TIMELINE_GAP_PX,
  UNDO_TIMELINE_GO_TEXT,
  UNDO_TIMELINE_IMPACT_MAX,
  UNDO_TIMELINE_NARROW_PX,
  UNDO_TIMELINE_READING_MAX,
  UNDO_TIMELINE_ROW_MIN_PX,
  UNDO_TIMELINE_SLOTS,
  UNDO_TIMELINE_STATES,
  UNDO_TIMELINE_STATE_TAG,
  UNDO_TIMELINE_TOUCH_PX,
  buildUndoTimelineJs,
  renderUndoTimeline,
  undoTimelineCss,
  undoTimelineErrorId,
  undoTimelineHintId,
  undoTimelinePickId,
  undoTimelineSlot,
  undoTimelineSumId,
  undoTimelineTagId,
} from '../dist/components/undo-timeline/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKINS, SKIN_NAMES, skinClass, skinCss } from '../dist/components/skin/index.js';
import { styleSource } from './_style-sources.mjs';
import { startShapesPage } from './shapes-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'undo-timeline');

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

/** 逐字符配平花括号抽选择器（`@container`／`@media` 块里的规则也算）。 */
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

/** 一条**带 scope**的完整选择器（判据要按槽名反查某一条规则时用它）。 */
const scoped = (slot) => '.ilife-page-ui .' + undoTimelineSlot(slot);

/** 一段 CSS 里某条规则的声明体（花括号配平）。**按行首锚定**：样式段一条规则一行。 */
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

/** 声明体里的属性名（`a: b;` 逐条）。 */
const propsIn = (body) => [...body.matchAll(/(?:^|;)\s*([-a-z]+)\s*:/g)].map((m) => m[1]);

/** 标记里每个 `id="…"`（判同页唯一用）。 */
const idsIn = (html) => [...html.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);

/* ── 样例（三态各一条：能撤带影响面、已撤、不能撤；另加一条不带影响面的能撤） ───── */

const IMPACT = {
  title: '13:58 的那次改动',
  note: '在「本月分类」页上批量改了 3 条记录',
  sumNote: '撤销后若要重做，得重新走一次批量改',
  rows: [
    { key: 'r1', title: '3 条记录的「分类」', note: '餐饮 → 外卖，09-24 晚餐 88.00', count: '3 条' },
    { key: 'r2', title: '读数：本月餐饮 1,284 → 1,096，外卖 0 → 188', note: '按上面的反向算回去', count: '2 处' },
    { key: 'r3', title: '周报 1 张（本周分类结构）', note: '撤了会重算一遍，别人看过的版本会跟着变', count: '1 张' },
    { key: 'r4', title: '飞书已同步的 3 行', note: '不勾＝线上那 3 行保留不动', count: '3 行', checked: false },
    { key: 'r5', title: '上月的归档快照', count: '1 张', locked: true, lockedReason: '归档只读，撤不了' },
  ],
};

const SAMPLE = {
  name: 'ledger-undo',
  title: '改动记录',
  cap: '只留 30 天，共 12 条',
  hint: '撤销会按反向算回去，不是重新统计',
  rollback: { label: '回到 09-22 18:00', note: '想退回到某一天的样子就整段回滚' },
  openKey: 'k2',
  entries: [
    { key: 'k1', time: '14:20', say: '记了一笔：餐饮 · 午餐 32.00', state: 'undone',
      readings: [{ label: '今日支出', from: '126.00', to: '158.00' }] },
    { key: 'k2', time: '13:58', say: '批量改分类：3 条 餐饮 → 外卖', tag: '会连带重算：周报 1 张，预算 1 条',
      readings: [{ label: '本月餐饮', from: '1,284.00', to: '1,096.00' }],
      impact: IMPACT },
    { key: 'k3', time: '09:12', say: '改了账户：超市 241.50 现金 → 招行储蓄卡', note: '不动任何合计' },
    { key: 'k4', time: '08:02', say: '删了一笔：交通 6.00', state: 'locked',
      lockedReason: '超过 30 天，只留可撤窗口内的改动', error: '上次撤销没成功：网络断了' },
  ],
};

const IMPACT_SAMPLE = { name: 'impact-one', form: 'impact', change: IMPACT, hint: SAMPLE.hint };

/** 一条改动的开标签之前的内容（按机器键定位那一行）。 */
const rowOf = (html, key) => {
  const at = html.indexOf('data-ilife-undo-key="' + key + '"');
  assert.ok(at > 0, '找不到 ' + key + ' 那一行');
  const start = html.lastIndexOf('<div class="' + undoTimelineSlot('row'), at);
  const next = html.indexOf('<div class="' + undoTimelineSlot('row'), at + 1);
  return html.slice(start, next === -1 ? html.length : next);
};

/** 按机器键找出那一枚按钮的开标签：断属性**有没有**，不断属性谁先谁后（换序是同一屏）。 */
const buttonTag = (html, attr, key) => {
  const at = html.indexOf(attr + '="' + key + '"');
  assert.ok(at > 0, '找不到按钮 ' + attr + '=' + key);
  const start = html.lastIndexOf('<button', at);
  return html.slice(start, html.indexOf('>', at) + 1);
};

/** 按行机器键找出回滚单里那一个原生勾选框的标签：同上，只断有无。 */
const inputTag = (pickHtml, key) => {
  const at = pickHtml.indexOf('data-ilife-undo-item="' + key + '"');
  assert.ok(at > 0, '找不到影响面行 ' + key);
  const start = pickHtml.lastIndexOf('<input', at);
  return pickHtml.slice(start, pickHtml.indexOf('>', at) + 1);
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('undo-timeline ① 渲染契约 · 形态 track（一条轨）', () => {
  const html = renderUndoTimeline(SAMPLE);

  it('骨架：根（`is-track` ＋ 机器键 ＋ 形态）→ 卡头 → 那一列改动 → 页脚 → 提示', () => {
    assert.match(html, new RegExp('^<div class="' + UNDO_TIMELINE_CLASS + ' is-track"'
      + ' data-ilife-undo-timeline="ledger-undo" data-ilife-undo-form="track">'));
    for (const slot of ['head', 'title', 'cap', 'list', 'row', 'time', 'rail', 'dot', 'body', 'say', 'eff',
      'rdg', 'rlabel', 'from', 'arrow', 'to', 'note', 'tag', 'act', 'bt', 'label', 'go', 'foot', 'sum', 'roll', 'hint']) {
      assert.ok(html.includes(undoTimelineSlot(slot)), '缺槽：' + slot);
    }
    assert.equal(countOf(html, 'class="[^"]*-row is-'), SAMPLE.entries.length, '一条改动一个行');
    assert.ok(html.includes('<b class="' + undoTimelineSlot('title') + '">改动记录</b>'), '卡头标题');
    assert.ok(html.includes(undoTimelineSlot('cap') + '">只留 30 天，共 12 条</span>'), '卡头右端那句');
    assert.ok(html.includes('<span class="' + undoTimelineSlot('time') + '">14:20</span>'), '时刻照原样上屏');
    assert.ok(html.includes('<span class="' + undoTimelineSlot('rlabel') + '">本月餐饮</span>'), '读数名');
    assert.ok(html.includes('<s class="' + undoTimelineSlot('from') + '">1,284.00</s>'), '改前的值（删除线）');
    assert.ok(html.includes('<b class="' + undoTimelineSlot('to') + '">1,096.00</b>'), '改后的值');
    assert.ok(html.includes(undoTimelineSlot('arrow') + '" aria-hidden="true">→</span>'), '箭头是装饰、读屏不念');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('**三态三重非颜色标记**：行类的三态 ＋ 片上的字 ＋ 动作句的删除线 ＋ 按钮上的字', () => {
    assert.deepEqual([...UNDO_TIMELINE_STATES], ['undoable', 'undone', 'locked']);
    for (const state of UNDO_TIMELINE_STATES) {
      assert.ok(html.includes(undoTimelineSlot('row') + ' is-' + state + '"'), '缺三态之一：' + state);
      assert.ok(html.includes('data-ilife-undo-state="' + state + '"'), '三态照实写进标记：' + state);
    }
    /* 已撤：片上写「已撤销…」（字）；动作句划掉（形）；按钮上的字换成「恢复这笔」（字）。 */
    const undone = rowOf(html, 'k1');
    assert.ok(undone.includes('>' + UNDO_TIMELINE_STATE_TAG.undone + '</span>'), '已撤销那行片上的字');
    assert.ok(undone.includes(UNDO_TIMELINE_GO_TEXT.undone), '已撤销那行的按钮字');
    assert.ok(undone.includes('data-ilife-undo-restore="k1"'), '已撤销那行给的是「恢复」');
    /* 不能撤：片上写「不可撤：＋原因」（字）；按钮按不动且指回那一片（无障碍面）。 */
    const locked = rowOf(html, 'k4');
    assert.ok(locked.includes('>' + UNDO_TIMELINE_STATE_TAG.locked + '：超过 30 天，只留可撤窗口内的改动</span>'),
      '不能撤那行要把「为什么」写出来');
    assert.ok(locked.includes('aria-describedby="' + undoTimelineErrorId(SAMPLE.name, 'k4') + ' '
      + undoTimelineTagId(SAMPLE.name, 'k4') + '"'), '那一枚按不动 ⇒ 错态句与原因片都指到');
    const lockedBtn = buttonTag(locked, 'data-ilife-undo-go', 'k4');
    assert.ok(lockedBtn.includes(' disabled'), '不能撤那枚按不动（只断有没有 disabled，不断它排第几）');
    assert.ok(locked.includes('>' + UNDO_TIMELINE_GO_TEXT.locked), '不能撤那枚的字');
    /* 能撤：片的语气是警告档（`is-warn`），按钮是主动作那一档。 */
    const undoable = rowOf(html, 'k2');
    assert.ok(undoable.includes(undoTimelineSlot('tag') + ' is-warn"'), '影响面那句走警告档的描边');
    assert.ok(undoable.includes(undoTimelineSlot('bt') + ' is-primary ' + undoTimelineSlot('go') + '"'),
      '能撤那枚是主动作档（软底＋强调字＋强调描边）');
  });

  it('就地回滚单：`aria-controls` 指着**自己那块**；`openKey` 决定哪块不 `hidden`；不带影响面的没有它', () => {
    const pickId = undoTimelinePickId(SAMPLE.name, 'k2');
    assert.equal(countOf(html, ' aria-controls="' + pickId.slice(0, -3)), 1, '只有带影响面的那一条指回滚单');
    assert.equal(countOf(html, ' aria-expanded="true"'), 1, 'openKey 只摊开一块');
    const open = html.slice(html.indexOf('id="' + pickId + '"'));
    assert.ok(!open.slice(0, open.indexOf('>')).includes('hidden'), 'openKey 命中的那一块不 hidden');
    assert.ok(open.includes('data-ilife-undo-pick="k2"'), '那块上挂着机器键（运行时按它认这一块）');
    const closed = renderUndoTimeline({ ...SAMPLE, openKey: undefined });
    assert.equal(countOf(closed, ' aria-expanded="true"'), 0, '不给 openKey ⇒ 都收起');
    const shut = closed.slice(closed.indexOf('id="' + pickId + '"'));
    assert.ok(shut.slice(0, shut.indexOf('>')).includes('hidden'), '不给 openKey ⇒ 那块带 hidden');
    assert.ok(!rowOf(html, 'k3').includes('aria-controls='), '不带影响面的那一条没有可摊的块');
  });

  it('回滚单的内容：逐项一句话后果 ＋ 副语 ＋ 行右读数；勾不动的写出为什么', () => {
    const pick = html.slice(html.indexOf('id="' + undoTimelinePickId(SAMPLE.name, 'k2') + '"'));
    assert.equal(countOf(pick, 'class="[^"]*-item( is-off)?"'), IMPACT.rows.length, '影响面一项一行');
    assert.equal(countOf(pick, '<input type="checkbox"'), IMPACT.rows.length, '每项一个原生勾选框');
    assert.equal(countOf(pick, ' checked value='), 3, '三行一开始就勾上（第 4 行显式给 false）');
    assert.equal(countOf(pick, 'data-ilife-undo-on="1"'), 3, '勾上的三行带「渲染时就勾上」的钩子');
    assert.ok(pick.includes('<span class="' + undoTimelineSlot('count') + '">3 条</span>'), '行右读数照原样');
    assert.equal(countOf(pick, '<input type="checkbox" disabled'), 1, '勾不动落在原生框上');
    assert.ok(pick.includes('撤不了：归档只读，撤不了'), '勾不动的原因写出来');
    assert.ok(pick.includes(undoTimelineSlot('pkt') + '">' + IMPACT.title + '</b>'), '回滚单标题');
    assert.ok(pick.includes(undoTimelineSlot('pkn') + '">' + IMPACT.note + '</span>'), '回滚单那句交代');
    /* 结论句与主按钮的字**按勾了几项算**。 */
    assert.ok(pick.includes('id="' + undoTimelineSumId(SAMPLE.name, 'k2') + '"'), '结论句的 id 按（件名，键）拼');
    assert.ok(pick.includes('>勾了 3 项，' + IMPACT.sumNote + '</span>'), '结论句按勾了几项算');
    assert.ok(pick.includes('>撤销这 3 项</span>'), '主按钮的字按勾了几项算');
    assert.ok(pick.includes(' data-ilife-undo-close="k2"'), '就地那一块上的「取消」是**收起**');
  });

  it('回滚单勾的是哪几行：逐行按键点名，不只数个数（r3 的勾挪到 r4 就红）', () => {
    const pick = html.slice(html.indexOf('id="' + undoTimelinePickId(SAMPLE.name, 'k2') + '"'));
    for (const k of ['r1', 'r2', 'r3']) {
      assert.ok(inputTag(pick, k).includes(' checked'), k + ' 出发就勾上');
      assert.ok(inputTag(pick, k).includes('value="' + k + '"'), k + ' 原生框的值与机器键一致');
    }
    assert.ok(!inputTag(pick, 'r4').includes(' checked'), 'r4 显式给了 false ⇒ 出发不勾');
    assert.ok(inputTag(pick, 'r5').includes(' disabled'), 'r5 勾不动落在原生框上');
    assert.ok(!inputTag(pick, 'r5').includes(' checked'), 'r5 再怎么都不勾');
  });

  it('繁忙与错态：忙碌那枚字住在正常那枚字里面（两枚都在）；错态写在按钮旁边并由它指过去', () => {
    const busy = renderUndoTimeline({
      ...SAMPLE, openKey: undefined, entries: [{ key: 'b', time: '10:00', say: '改了一笔', busy: true }],
    });
    const busyBtn = buttonTag(busy, 'data-ilife-undo-go', 'b');
    assert.ok(busyBtn.includes(' disabled'), '忙碌 ⇒ 按不动（只断有没有，不断序列化顺序）');
    assert.ok(busyBtn.includes('aria-busy="true"'), '忙碌 ⇒ 语义面一起给');
    assert.ok(busyBtn.includes('data-ilife-undo-busy="1"'), '忙碌 ⇒ 标记面一起给');
    assert.ok(busy.includes('<span class="' + undoTimelineSlot('label') + '">撤销这次改动'
      + '<span class="' + undoTimelineSlot('busy') + '" aria-hidden="true">正在撤销这次改动</span></span>'),
    '正常那枚字占着按钮的尺寸，忙碌那枚字住在它里面（出流 ⇒ 不参与固有宽）');
    const err = rowOf(html, 'k4');
    assert.ok(err.includes('id="' + undoTimelineErrorId(SAMPLE.name, 'k4') + '" role="alert">删了一笔：交通 6.00：上次撤销没成功：网络断了</p>'),
      '错态那句写在按钮旁边');
    assert.match(err, new RegExp('aria-describedby="' + undoTimelineErrorId(SAMPLE.name, 'k4').replace(/[-]/g, '\\-') + ''),
      '按钮指到那句错');
  });

  it('undone 支的按钮同样指到错态句（错误句出现就要被指，不能只 locked 不 undone）', () => {
    const errId = undoTimelineErrorId('u', 'k');
    const html3 = renderUndoTimeline({ name: 'u', hint: '卡底那句提示',
      entries: [{ key: 'k', time: '10:00', say: '改了一笔', state: 'undone', error: '网络断了' }] });
    assert.ok(html3.includes('id="' + errId + '"'), '错态句在屏上');
    const btn = buttonTag(html3, 'data-ilife-undo-restore', 'k');
    assert.ok(btn.includes('aria-describedby="' + errId + '"'), '「恢复这笔」指到那句错（旧版此处 0 次被指）');
    const html4 = renderUndoTimeline({ name: 'u', hint: '卡底那句提示',
      entries: [{ key: 'k', time: '10:00', say: '改了一笔', state: 'undone' }] });
    assert.ok(buttonTag(html4, 'data-ilife-undo-restore', 'k').includes('aria-describedby="' + undoTimelineHintId('u') + '"'),
      '没错时指回卡底那句提示（与能撤支同口径）');
  });

  it('空态：改动给空数组 ⇒ 出设计过的那句（不是留白），且一条行都没有', () => {
    const empty = renderUndoTimeline({ name: 'n', entries: [], hint: 'hint' });
    assert.ok(empty.includes('<p class="' + undoTimelineSlot('empty') + '" role="status">这一段时间里没有改动</p>'));
    assert.equal(countOf(empty, undoTimelineSlot('row') + ' is-'), 0);
    const custom = renderUndoTimeline({ name: 'n', entries: [], emptyText: '这三天里没有改动' });
    assert.ok(custom.includes('>这三天里没有改动</p>'));
  });

  it('整段回滚那枚：字照原样上屏，旁边那句也在（它派发事件，不就地摊开）', () => {
    assert.ok(html.includes(' data-ilife-undo-roll="回到 09-22 18:00"'));
    assert.ok(html.includes(undoTimelineSlot('roll') + '" data-ilife-undo-roll="回到 09-22 18:00">'
      + '<span class="' + undoTimelineSlot('label') + '">回到 09-22 18:00</span></button>'));
    assert.ok(html.includes(undoTimelineSlot('sum') + '">想退回到某一天的样子就整段回滚</span>'));
    const bare = renderUndoTimeline({ ...SAMPLE, rollback: undefined });
    assert.ok(!bare.includes('data-ilife-undo-roll'), '不给 rollback ⇒ 页脚那枚不出');
  });

  it('转义面：每个文本字段逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html2 = renderUndoTimeline({
      name: evil, title: evil, cap: evil, hint: evil, emptyText: evil,
      rollback: { label: evil, note: evil }, openKey: evil,
      entries: [{
        key: evil, time: evil, say: evil, note: evil, tag: evil, error: evil,
        readings: [{ label: evil, from: evil, to: evil }], impact: { title: evil, note: evil, sumNote: evil, cancelLabel: evil, rows: [{ key: evil, title: evil, note: evil, count: evil }] },
      }, {
        key: evil + '-locked', time: evil, say: evil, state: 'locked', lockedReason: evil,
      }],
    });
    assert.equal(/<script/i.test(html2), false, '不得出现可执行脚本标签');
    assert.ok(html2.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html2.includes('&quot;'), '引号转义');
    assert.equal(/="[^"]*<[^"]*"/.test(html2), false, '属性里不许冒出裸尖括号');
  });

  it('入参违规一律拒（不静默降级）：形态／清单／三态／影响面／展开键逐条', () => {
    assert.deepEqual([...UNDO_TIMELINE_FORMS], ['track', 'impact']);
    const ok = { name: 'n', entries: [{ key: 'k', time: '10:00', say: '改了一笔' }] };
    assert.equal(throwsBlocks(() => renderUndoTimeline(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderUndoTimeline([])), true, '数组不是入参');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, name: '' })), true, '缺机器键');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, name: '   ' })), true, '全空白的机器键');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, form: 'A' })), true, '形态闭集外（A／B 不是键）');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, form: 'timeline' })), true, '形态闭集外（另一种写法）');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ name: 'n' })), true, '形态 track 缺 entries');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, entries: 'x' })), true, 'entries 不是数组');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, entries: [null] })), true, '元素不是对象');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, entries: [{ key: '', time: '10:00', say: 'x' }] })), true, '空键');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, entries: [{ key: 'k', time: '', say: 'x' }] })), true, '空时刻');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, entries: [{ key: 'k', time: '10:00', say: '' }] })), true, '空动作句');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, entries: [{ key: 'k', time: '10:00', say: 'x' }, { key: 'k', time: '11:00', say: 'y' }] })), true, '键重复');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', state: 'ok' }] })), true, '三态闭集外');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', state: 'locked' }] })), true,
      '标了不可撤却没写为什么');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', lockedReason: '太久了' }] })), true,
      '没标不可撤却给了原因');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', busy: 1 }] })), true, 'busy 不是布尔');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', readings: [{}] }] })), true, '读数缺 from／to');
    assert.equal(throwsBlocks(() => renderUndoTimeline({
      ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', readings: [{ from: '1', to: '2' }, { from: '3', to: '4' }] }],
    })), false, '两条读数照收');
    assert.equal(throwsBlocks(() => renderUndoTimeline({
      ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', readings: new Array(UNDO_TIMELINE_READING_MAX + 1).fill({ from: '1', to: '2' }) }],
    })), true, '读数条数超上限');
    assert.equal(throwsBlocks(() => renderUndoTimeline({
      ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', impact: { title: '影响面', rows: [] } }],
    })), true, '影响面一项都没有');
    assert.equal(throwsBlocks(() => renderUndoTimeline({
      ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', impact: { title: '', rows: [{ key: 'r', title: 't' }] } }],
    })), true, '影响面缺标题');
    assert.equal(throwsBlocks(() => renderUndoTimeline({
      ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', impact: { title: '面', rows: [{ key: 'r', title: 't' }, { key: 'r', title: 'u' }] } }],
    })), true, '影响面键重复');
    assert.equal(throwsBlocks(() => renderUndoTimeline({
      ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', impact: { title: '面', rows: [{ key: 'r', title: 't', lockedReason: 'x' }] } }],
    })), true, '勾不动的原因给了却没标勾不动');
    assert.equal(throwsBlocks(() => renderUndoTimeline({
      ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', impact: { title: '面', rows: [{ key: 'r', title: 't', locked: true }] } }],
    })), true, '标了勾不动却没写为什么');
    assert.equal(throwsBlocks(() => renderUndoTimeline({
      ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', impact: { title: '面', rows: [{ key: 'r', title: 't', locked: true, lockedReason: '只读', checked: true }] } }],
    })), true, '勾不动那一行不许标成勾上（页脚那句会数出撤不了的项）');
    assert.equal(throwsBlocks(() => renderUndoTimeline({
      ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', impact: { title: '面', rows: new Array(UNDO_TIMELINE_IMPACT_MAX + 1).fill({ key: 'r', title: 't' }) } }],
    })), true, '影响面项数超上限');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, openKey: 'nope' })), true, 'openKey 没命中');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, openKey: 'k' })), true, 'openKey 命中了一条没有影响面的');
    assert.equal(throwsBlocks(() => renderUndoTimeline({
      ...ok, openKey: 'k', entries: [{ key: 'k', time: '10:00', say: 'x', impact: { title: '面', rows: [{ key: 'r', title: 't' }] } }],
    })), false, '命中一条带影响面的 ⇒ 正常');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, form: 'impact' })), true, '形态 impact 缺 change');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, form: 'impact', change: { title: '面', rows: [] } })), true, 'impact 的影响面一项都没有');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, form: 'impact', change: IMPACT })), false, 'impact 给了完整的 ⇒ 正常');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, rollback: { label: '' } })), true, '回滚那枚缺字');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, rollback: {} })), true, '回滚对象缺 label');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, extraClass: 'a"b' })), true, '附加类名不合规');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, cap: 1 })), true, 'cap 不是串');
    const many = new Array(UNDO_TIMELINE_ENTRY_MAX + 1).fill({ key: 'k', time: '10:00', say: 'x' });
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, entries: many })), true, '改动条数超上限');
  });

  it('openKey 命中 locked／undone／busy 一律拒（摊开的单按得动 ⇒ 这三种不能摊）', () => {
    const impact = { title: '面', rows: [{ key: 'r', title: 't' }] };
    const ok = { name: 'n', openKey: 'k',
      entries: [{ key: 'k', time: '10:00', say: '改了一笔', impact }] };
    assert.equal(throwsBlocks(() => renderUndoTimeline(ok)), false, '能撤＋带影响面 ⇒ 照常摊开');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ name: 'n', openKey: 'k',
      entries: [{ key: 'k', time: '10:00', say: '改了一笔', state: 'locked', lockedReason: '超窗', impact }] })),
    true, '命中 locked ⇒ 拒（否则摊开的单里「撤销这 1 项」按得动）');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ name: 'n', openKey: 'k',
      entries: [{ key: 'k', time: '10:00', say: '改了一笔', state: 'undone', impact }] })),
    true, '命中 undone ⇒ 拒（同理）');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ name: 'n', openKey: 'k',
      entries: [{ key: 'k', time: '10:00', say: '改了一笔', busy: true, impact }] })),
    true, '命中 busy ⇒ 拒（跑完再摊开）');
  });

  it('稀疏数组（`new Array(n)` 的洞）一律拒：三处都在门外，一处都不许漏成 `TypeError`', () => {
    const ok = { name: 'n', entries: [{ key: 'k', time: '10:00', say: 'x' }] };
    const bare = (n) => new Array(n);
    assert.equal(throwsBlocks(() => renderUndoTimeline({ ...ok, entries: bare(3) })), true, 'entries 是稀疏数组');
    assert.equal(throwsBlocks(() => renderUndoTimeline({
      ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', readings: bare(2) }],
    })), true, 'readings 是稀疏数组');
    assert.equal(throwsBlocks(() => renderUndoTimeline({
      ...ok, entries: [{ key: 'k', time: '10:00', say: 'x', impact: { title: '面', rows: bare(2) } }],
    })), true, '影响面是稀疏数组');
    assert.equal(throwsBlocks(() => renderUndoTimeline({
      ...ok, entries: new Array(1).fill({ key: 'k', time: '10:00', say: 'x' }),
    })), false, '填满之后照常渲染（稀疏才拒，不是「用过 new Array 就拒」）');
  });

  it('非 ASCII 机器键：行内 `id` 同页唯一，`aria-controls` 指着**自己那块**回滚单', () => {
    const cn = {
      name: '记账条',
      entries: [
        { key: '改分类', time: '13:58', say: '批量改分类', impact: { title: '批量改分类', rows: [{ key: 'r', title: 't' }] } },
        { key: '改账户', time: '09:12', say: '批量改账户', impact: { title: '批量改账户', rows: [{ key: 'r', title: 't' }] } },
      ],
    };
    const html2 = renderUndoTimeline(cn);
    const ids = idsIn(html2);
    assert.equal(new Set(ids).size, ids.length, '同页 id 必须唯一：' + ids.join('、'));
    assert.notEqual(undoTimelinePickId(cn.name, '改分类'), undoTimelinePickId(cn.name, '改账户'));
    assert.notEqual(undoTimelinePickId(cn.name, '改账户'), undoTimelinePickId(cn.name + ' ', '改账户'));
    for (const e of cn.entries) {
      const at = html2.indexOf('data-ilife-undo-go="' + e.key + '"');
      const tag = html2.slice(at, html2.indexOf('>', at));
      const id = /aria-controls="([^"]*)"/.exec(tag);
      assert.ok(id, e.key + ' 的按钮缺 aria-controls');
      assert.equal(id[1], undoTimelinePickId(cn.name, e.key), e.key + ' 的按钮指的不是自己那块回滚单');
      const block = html2.slice(html2.indexOf('id="' + id[1] + '"'));
      assert.ok(block.slice(0, block.indexOf('>')).includes('role="group" aria-label="' + e.impact.title + '"'),
        e.key + ' 那块回滚单的 id 与名字对不上');
    }
    const withHint = renderUndoTimeline({ ...cn, hint: '撤销会按反向算回去' });
    assert.ok(withHint.includes('id="' + undoTimelineHintId(cn.name) + '"'), '提示那句的 id 按件名拼');
    const withErr = renderUndoTimeline({ name: cn.name, entries: [{ key: '改分类', time: '10:00', say: 'x', error: '网络断了' }] });
    assert.ok(withErr.includes('id="' + undoTimelineErrorId(cn.name, '改分类') + '"'), '错态句的 id 按（件名，键）拼');
  });

  it('闭集里的槽名一个都不许是死声明：每个槽都真的在标记里出现过', () => {
    const screens = [
      html,
      renderUndoTimeline({ ...SAMPLE, openKey: undefined, rollback: undefined }),
      renderUndoTimeline({ name: 'n-empty', entries: [], hint: 'hint' }),
      renderUndoTimeline({
        ...SAMPLE,
        openKey: undefined,
        entries: [{ key: 'b', time: '10:00', say: '改了一笔', busy: true, error: '网络断了',
          impact: { title: '这面', rows: [{ key: 'r', title: 't', note: 'n', count: '1 条', locked: true, lockedReason: '只读' }] } }],
      }),
      renderUndoTimeline(IMPACT_SAMPLE),
    ];
    const onScreen = new Set();
    for (const one of screens) {
      for (const m of one.matchAll(/class="([^"]*)"/g)) for (const cls of m[1].split(' ')) onScreen.add(cls);
    }
    const dead = UNDO_TIMELINE_SLOTS.filter((slot) => !onScreen.has(undoTimelineSlot(slot)));
    assert.deepEqual(dead, [], '这些槽名在闭集里、却一个都上不了屏（死声明）：' + dead.join('、'));
  });

  it('纯函数：同样的入参恒产同样的字节；附加类名照挂', () => {
    assert.equal(renderUndoTimeline(SAMPLE), renderUndoTimeline(SAMPLE));
    const extra = renderUndoTimeline({ ...SAMPLE, extraClass: 'ok-class other' });
    assert.ok(extra.includes('ok-class other'));
    assert.match(extra, new RegExp('^<div class="' + UNDO_TIMELINE_CLASS + ' is-track ok-class other"'));
  });

  it('槽位闭集与类名一致（判据不另抄一份字面量）', () => {
    assert.equal(undoTimelineSlot('row'), UNDO_TIMELINE_CLASS + '-row');
    assert.equal(undoTimelineSlot('row', 'x-'), 'x-block-undo-timeline-row');
    for (const slot of UNDO_TIMELINE_SLOTS) assert.ok(undoTimelineSlot(slot).startsWith(UNDO_TIMELINE_CLASS + '-'), slot);
  });
});

describe('undo-timeline ① 渲染契约 · 形态 impact（一次改动的回滚单）', () => {
  const html = renderUndoTimeline(IMPACT_SAMPLE);

  it('骨架：根（`is-impact`）→ 回滚单的头 ＋ 清单 ＋ 页脚（＋ 提示），整张卡就是那一块', () => {
    assert.match(html, new RegExp('^<div class="' + UNDO_TIMELINE_CLASS + ' is-impact"'
      + ' data-ilife-undo-timeline="impact-one" data-ilife-undo-form="impact">'));
    for (const slot of ['pkh', 'pkt', 'pkn', 'picks', 'item', 'check', 'box', 'ibody', 'ititle', 'inote',
      'count', 'why', 'foot', 'sum', 'cancel', 'submit', 'bt', 'label', 'hint']) {
      assert.ok(html.includes(undoTimelineSlot(slot)), '缺槽：' + slot);
    }
    assert.equal(countOf(html, undoTimelineSlot('item')), IMPACT.rows.length, '一项一行');
    assert.ok(!html.includes(undoTimelineSlot('pick') + '"'), '整张卡就是那一块，不再套一层就地容器');
    assert.ok(html.includes(' data-ilife-undo-submit="change"'), '主按钮的键取 changeKey 的缺省值');
    assert.ok(html.includes(' data-ilife-undo-cancel="1"'), '这张卡的「取消」只派发事件（没有就地可收的块）');
    assert.equal(countOf(html, 'data-ilife-undo-close'), 0);
  });

  it('页脚：结论句与主按钮按勾了几项算；一项都没勾时主按钮按不动', () => {
    assert.ok(html.includes('>勾了 3 项，' + IMPACT.sumNote + '</span>'));
    assert.ok(html.includes('>撤销这 3 项</span>'));
    assert.ok(html.includes(' data-ilife-undo-note="' + IMPACT.sumNote + '"'), '结论句后半段那枚注随标记走');
    const none = renderUndoTimeline({
      name: 'n', form: 'impact',
      change: { title: '这次改动', rows: [{ key: 'r', title: 't', checked: false }] },
    });
    assert.ok(none.includes('>一项都没勾，撤销得先勾一项。</span>'), '0 项时的结论句');
    assert.ok(none.includes(' disabled>'), '0 项 ⇒ 主按钮按不动');
    assert.ok(none.includes('>一项都没勾</span>'), '0 项时主按钮的字');
    const all = renderUndoTimeline({ name: 'n', form: 'impact', change: { title: '这次改动', rows: [{ key: 'r', title: 't' }] } });
    assert.ok(all.includes('>撤销这 1 项</span>'), '缺省勾上 ⇒ 一个字也算得出来');
    assert.ok(!all.includes(' disabled>'));
  });

  it('转义与非法入参：这一形态同办（`change` 逐条校验）', () => {
    const evil = '"><script>alert(1)</script>';
    const bad = renderUndoTimeline({ name: evil, form: 'impact', change: { title: evil, note: evil, rows: [{ key: evil, title: evil, count: evil }] } });
    assert.equal(/<script/i.test(bad), false);
    assert.ok(bad.includes('&lt;script&gt;'));
    assert.equal(throwsBlocks(() => renderUndoTimeline({ name: 'n', form: 'impact', change: 'x' })), true, 'change 不是对象');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ name: 'n', form: 'impact', change: { rows: [{ key: 'r', title: 't' }] } })), true, 'change 缺标题');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ name: 'n', form: 'impact', change: { title: 't', rows: [{ title: 'x' }] } })), true, '影响面缺键');
    assert.equal(throwsBlocks(() => renderUndoTimeline({ name: 'n', form: 'impact', change: { title: 't', rows: 'x' } })), true, '影响面不是数组');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('undo-timeline ② 样式与零 DOM 纪律', () => {
  const css = undoTimelineCss();
  const clean = stripComments(css);

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且**只出现一次**、带点', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = ruleSelectors(clean);
    assert.ok(selectors.length >= 45, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + one);
        assert.ok(one.includes(UNDO_TIMELINE_CLASS), '选择器必须只碰本件类名根：' + one);
        assert.match(one, /\.[A-Za-z0-9_-]*ilife-block-undo-timeline[A-Za-z0-9_-]*/,
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
    assert.ok(clean.includes('@media (hover: hover) and (pointer: fine)'), 'hover 只许是增强');
    assert.ok(clean.includes('@media (prefers-reduced-motion: reduce)'), '减少动态那一档');
    assert.ok(clean.includes('@container ' + 'ilife-undo-timeline'), '窄档必须由**本件自己的**容器判');
    assert.ok(clean.includes('container: ilife-undo-timeline / inline-size'), '写了 @container 就必须自己声明容器');
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
  });

  it('零手写色值（兜底链那一处除外）、源码级零手写 `var(--ilife-…)`、**不拿 ink 系当面**', () => {
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外的颜色字面量：' + [...new Set(bare)].join('、'));
    const src = styleSource('undo-timeline');
    assert.deepEqual([...stripComments(src).matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [],
      '样式源码里请改走 skinVar()');
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了「面」：' + value);
    }
    assert.ok(clean.includes('accent-soft'), '有文字的选中面走强调软底');
    assert.ok(clean.includes('accent-ink'), '勾选框（无文字的点格）走强调实底 ＋ 强调底上的字');
    assert.ok(clean.includes('color-mix(in srgb,'), '警告片的描边是从 token 算出来的');
  });

  it('截断纪律：零 `text-overflow`／`line-clamp`／`nowrap`／`overflow-x`，长串一律折行', () => {
    for (const bad of ['text-overflow', 'line-clamp', 'white-space: nowrap', 'white-space:nowrap', 'overflow-x']) {
      assert.equal(clean.includes(bad), false, '样式段里不许出现 ' + bad);
    }
    assert.ok(clean.includes('overflow-wrap: anywhere'), '长串要能折行');
  });

  it('触控地板与几何事实都写在样式里（数字只有一处出处）', () => {
    assert.ok(clean.includes('min-height: ' + String(UNDO_TIMELINE_TOUCH_PX) + 'px'), '命中盒地板');
    assert.ok(clean.includes('min-width: ' + String(UNDO_TIMELINE_TOUCH_PX) + 'px'));
    assert.ok(clean.includes('min-height: ' + String(UNDO_TIMELINE_ROW_MIN_PX) + 'px'), '整行命中区的高度（回滚单那一行，按常量派生，不抄 56）');
    assert.ok(clean.includes('width: ' + String(UNDO_TIMELINE_TOUCH_PX) + 'px'), '勾选框命中盒的宽');
    assert.ok(clean.includes('gap: ' + String(UNDO_TIMELINE_GAP_PX) + 'px'), '相邻触控目标间距');
    assert.ok(clean.includes('grid-column: 1 / -1'), '就地那块回滚单跨满整行');
  });

  it('**竖轨是一根通的线**：行的竖向内距不住行上（住行上，竖轨够不到内距那一段，线就断成一节一节）', () => {
    const list = ruleBody(clean, scoped('list'));
    assert.match(list, /gap:\s*0/, '行与行之间不留缝，竖轨才连得起来');
    const row = ruleBody(clean, scoped('row'));
    assert.match(row, /padding:\s*0;/, '行上没有竖向内距：' + row.trim());
    for (const slot of ['body', 'act', 'time']) {
      assert.match(ruleBody(clean, scoped(slot)), /padding:/, slot + ' 那一格自己带竖向内距');
    }
  });

  it('三态各有自己的形：能撤＝实心点／已撤＝划掉的动作句／不能撤＝空心点加一道斜杠', () => {
    assert.match(ruleBody(clean, scoped('row') + '.is-undoable ' + '.' + undoTimelineSlot('dot')),
      /background:\s*var\(--ilife-accent/, '能撤：无文字的点走强调实底');
    assert.match(ruleBody(clean, scoped('row') + '.is-undone ' + '.' + undoTimelineSlot('say')),
      /text-decoration:\s*line-through/, '已撤：动作句划掉（形）');
    assert.match(ruleBody(clean, scoped('row') + '.is-locked ' + '.' + undoTimelineSlot('dot') + '::after'),
      /transform:\s*rotate\(-45deg\)/, '不能撤：圆点上一道斜杠（形）');
    assert.match(ruleBody(clean, scoped('item') + ':has(input:checked)'), /box-shadow:\s*inset 3px 0 0 var\(--ilife-accent/,
      '勾上的那一行左端一条强调侧标（形）');
  });

  it('窄档阈值只有一个出处（`attrs.ts`）；产出 CSS 里的 `@container` 逐条取同一个数', () => {
    const declared = [];
    for (const file of readdirSync(DIR).filter((f) => f.endsWith('.ts')).sort()) {
      if (/\b[A-Z_]*NARROW[A-Z_]*\s*=\s*\d/.test(stripComments(readFileSync(join(DIR, file), 'utf8')))) declared.push(file);
    }
    assert.deepEqual(declared, ['attrs.ts'], '窄档阈值只许在 attrs.ts 里声明一次，实有：' + declared.join('、'));
    const limits = [...clean.matchAll(/@container [\w-]+ \(max-width: (\d+(?:\.\d+)?)px\)/g)].map((m) => Number(m[1]));
    assert.ok(limits.length >= 3, '@container 窄档段落数不对：' + limits.length);
    assert.deepEqual([...new Set(limits)], [UNDO_TIMELINE_NARROW_PX],
      '产出 CSS 里的窄档阈值必须都取 UNDO_TIMELINE_NARROW_PX（' + String(UNDO_TIMELINE_NARROW_PX) + '）：' + limits.join('、'));
  });

  it('先关后办：五个分支都先过 closeOutside，toggle 关的是全场（含跨实例）', () => {
    const js = buildUndoTimelineJs();
    assert.equal(js.includes('closePicks'), false, '只关本根的旧 helper 不许再出现');
    const toggleAt = js.indexOf('function togglePick');
    assert.ok(toggleAt > 0 && js.indexOf('closeOutside(btn)', toggleAt) > toggleAt, 'togglePick 关的是全场');
    assert.ok(js.indexOf('closeOutside(null)') > 0, '就地「取消」自己在块里 ⇒ 全关');
    const hits = (js.match(/closeOutside\(/g) || []).length;
    assert.ok(hits >= 6, '五个分支＋开合＋兜底都要经过它，实有 ' + hits + ' 处（旧版只有定义＋兜底 2 处）');
  });

  it('单行不留线头：同时是首行与末行那一格的竖轨直接不出线', () => {
    assert.ok(clean.includes(':first-child:last-child'), '单行那一格要有自己的收口规则');
    const body = ruleBody(clean, scoped('row') + ':first-child:last-child .' + undoTimelineSlot('rail') + '::before');
    assert.match(body, /display:\s*none/, '首行从圆点起、末行到圆点止落在同一个点上 ⇒ 没有线');
  });

  it('单一来源：行高下限只住 attrs.ts；死名字 UNDO_TIMELINE_MISSING 不再出口', async () => {
    const declared = [];
    for (const file of readdirSync(DIR).filter((f) => f.endsWith('.ts')).sort()) {
      if (/\b(?:UNDO_TIMELINE_ROW_MIN_PX|ITEM_MIN_HEIGHT_PX)\s*=\s*\d/.test(stripComments(readFileSync(join(DIR, file), 'utf8')))) declared.push(file);
    }
    assert.deepEqual(declared, ['attrs.ts'], '行高下限只许在 attrs.ts 里声明一次，实有：' + declared.join('、'));
    const mod = await import('../dist/components/undo-timeline/index.js');
    assert.equal('UNDO_TIMELINE_MISSING' in mod, false, '全仓无人读的死导出不许再挂在出口上');
  });

  it('`hidden` 被显式重写（`display:grid` 会压过 UA 那条 `[hidden]{display:none}`）', () => {
    assert.ok(clean.includes(undoTimelineSlot('pick') + '[hidden]'), '就地那块回滚单的 hidden 必须显式兜住');
    assert.ok(/\.ilife-block-undo-timeline-pick\[hidden\]\s*\{\s*display:\s*none;\s*\}/.test(clean));
  });

  it('可见焦点两处都在：勾选框（视觉隐藏）画在视觉盒上、其余可点元素走通用那条', () => {
    assert.ok(clean.includes('input:focus-visible + .ilife-block-undo-timeline-box'), '勾选框的焦点环画在视觉盒上');
    assert.ok(clean.includes(UNDO_TIMELINE_CLASS + ' :focus-visible'), '通用可见焦点地板');
    assert.equal(/outline:\s*none/.test(clean), false, '不许把焦点抹掉');
  });

  it('状态矩阵齐：`:active` 只碰 transform、`disabled` 写得出原因、忙碌那枚字出流（不参与固有宽）', () => {
    const active = ruleBody(clean, scoped('bt') + ':not([disabled]):active');
    assert.deepEqual(propsIn(active), ['transform'], ':active 只许声明 transform（碰布局＝按下即重排）');
    assert.match(active, /transform:\s*scale\(\s*0?\.\d+\s*\)/, '真按下那一刻是一次缩放：' + active.trim());
    const transition = /transition:\s*transform\s+(\d+)ms/.exec(clean);
    assert.ok(transition !== null, '动效走 transform 的过渡');
    assert.ok(Number(transition[1]) <= 80, '动效时长要 ≤80ms，实有 ' + transition[1] + 'ms');
    assert.ok(clean.includes('cursor: not-allowed'), '禁用光标');
    assert.ok(clean.includes('data-ilife-undo-busy="1"]'), '忙碌态靠挂在按钮上的标记');
    const busy = ruleBody(clean, scoped('busy'));
    assert.match(busy, /position:\s*absolute/, '忙碌那枚字必须出流（否则它的固有宽会把按钮与那一行顶变形）');
    assert.match(ruleBody(clean, scoped('bt') + ' > .' + undoTimelineSlot('label')), /position:\s*relative/,
      '正常那枚字是忙碌那枚字的定位基准');
    const padX = /padding:\s*\d+px\s+(\d+)px/.exec(ruleBody(clean, scoped('bt')));
    assert.ok(padX !== null, '按钮的左右内距抽不出来');
    assert.ok(busy.includes('left: -' + padX[1] + 'px') && busy.includes('right: -' + padX[1] + 'px'),
      '忙碌那枚字的左右外扩必须等于按钮的左右内距（' + padX[1] + 'px）：' + busy.trim());
    assert.match(ruleBody(clean, scoped('bt') + '[data-ilife-undo-busy="1"] > .' + undoTimelineSlot('label')),
      /visibility:\s*hidden/, '忙碌时正常那枚字藏起来（但仍占着位置 ⇒ 尺寸不变）');
    assert.equal(clean.includes('transitionend'), false, '状态不许依赖 transitionend');
  });

  it('`dist/components/undo-timeline/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'undo-timeline');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 7, '至少该有 index／attrs／model／render／style／style-track／style-impact／runtime 的产物：'
      + files.join('、'));
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
    const js = buildUndoTimelineJs();
    assert.ok(typeof js === 'string' && js.length > 1000);
    assert.equal((js.match(/\bdocument\b/g) || []).length, 1, '运行时的 DOM 入口只许有一处别名');
    assert.equal(js.includes('document.'), false, '别处不许直接使唤 document.');
    assert.ok(js.includes('doc.addEventListener("click"') && js.includes('doc.addEventListener("change"'),
      '点与勾选两枚委派都在');
    assert.ok(js.includes('hidden'), '就地那块回滚单的显隐在运行时里改');
    for (const ev of [UNDO_TIMELINE_EVENT_UNDO, UNDO_TIMELINE_EVENT_RESTORE, UNDO_TIMELINE_EVENT_ROLLBACK,
      UNDO_TIMELINE_EVENT_PICK, UNDO_TIMELINE_EVENT_CANCEL]) {
      assert.ok(js.includes(ev), '运行时里缺事件：' + ev);
    }
    assert.ok(!js.includes('transitionend'), '不许依赖 transitionend');
    /* 零键盘语汇：键帽／键名／方向键一个都不许出现在**用户看得见**的那两面上。
       源码那一面先剥注释（件头写着「本件不带键盘通路」是纪律句，不是缺陷）。 */
    const visible = [renderUndoTimeline(SAMPLE), renderUndoTimeline(IMPACT_SAMPLE), js,
      ...['attrs.ts', 'render.ts', 'model.ts', 'runtime.ts', 'style.ts'].map(
        (f) => stripComments(readFileSync(join(DIR, f), 'utf8')))];
    for (const text of visible) {
      for (const word of ['键帽', '快捷键', '键位', '方向键', '键盘', '⌘', '⌥', '⇧', 'onkeydown', 'onkeyup']) {
        assert.equal(text.includes(word), false, '不许出现键盘语汇：' + word);
      }
      assert.equal(/\bkeydown\b/.test(text), false, '不许出现 keydown');
      assert.equal(/\bkeyup\b/.test(text), false, '不许出现 keyup');
      assert.equal(/(['"`])Esc(ape)?\1/.test(text), false, '不许出现键名 Esc／Escape');
      assert.equal(/['"`]Tab['"`]/.test(text), false, '不许出现键名 Tab');
    }
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('undo-timeline ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(UNDO_TIMELINE_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const before = renderUndoTimeline(SAMPLE);
    renderUndoTimeline(IMPACT_SAMPLE);
    assert.equal(renderUndoTimeline(SAMPLE), before, '同入参恒产同样的字节');
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(undoTimelineCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-undo-timeline'), '前缀必须作用到 scope 与类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
    assert.ok(css.includes('.x-block-undo-timeline-pick'));
  });
});

/* ── ④⑤ 真机：两档几何 ＋ 皮肤纪律 ＋ 行为 ──────────────────────────── */

/** 静态几何判据（真机起不来时的退路）：**真断几条几何事实**，不是「HTML 里出现过 hidden 这个词」。 */
function assertStaticGeometry(css, html) {
  const clean = stripComments(css);
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const wide = [...px(html), ...px(clean)].filter((v) => v > 320);
  assert.deepEqual(wide, [], '出现过不了窄档（320）的固定宽度：' + wide.join('、'));
  assert.ok(clean.includes('min-height: ' + String(UNDO_TIMELINE_TOUCH_PX) + 'px'), '命中盒地板写在样式里');
  assert.ok(clean.includes('container: ilife-undo-timeline / inline-size'), '窄档只认本件自己的容器');
  const busy = ruleBody(clean, scoped('busy'));
  assert.match(busy, /position:\s*absolute/, '忙碌那枚字必须出流（换字不跳版）');
  const closed = renderUndoTimeline({ ...SAMPLE, openKey: undefined });
  assert.match(closed, new RegExp(undoTimelineSlot('pick') + '" id="[^"]*" role="group"[^>]*hidden'),
    '不给 openKey ⇒ 就地那块移出可点范围（静态面看得出来），不是靠「变透明」');
}

const pageHtml = (cases) => cases.map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');

/** 三种压力样例：常态（三态齐全、一块摊开）、极端长串、空态。 */
function cases() {
  const long = '超级长的一条改动说明'.repeat(8);
  const longRows = Array.from({ length: 3 }, (_, i) => ({
    key: 'r' + String(i), title: '影响面第 ' + String(i + 1) + ' 项：' + '这一句故意写得很长用来量窄档'.repeat(3),
    note: '副语也写长一点：09-24 晚餐 88.00'.repeat(2), count: '12345678901234567890.00 条',
  }));
  return [
    { name: 'normal', html: renderUndoTimeline(SAMPLE) },
    { name: 'impact', html: renderUndoTimeline(IMPACT_SAMPLE) },
    {
      name: 'long',
      html: renderUndoTimeline({
        name: 'long-undo',
        title: '改动记录（超长标题的一次压力测试）'.repeat(2),
        cap: '只留 30 天，共 12 条，这里有一句很长的读数一个字符都不许截断',
        hint: '这句提示故意写得很长，用来量窄档会不会被顶出横向滚动。'.repeat(5),
        rollback: { label: '回到 09-22 18:00（整段回滚）', note: '一句很长的注释写在按钮旁边。'.repeat(3) },
        openKey: 'l2',
        entries: [
          { key: 'l1', time: '23:59', say: long, tag: '会连带重算：' + '很多'.repeat(8),
            readings: Array.from({ length: 4 }, () => ({ label: '读数名称也长', from: '12345678901234567890.00', to: '99999999999999999999.99' })),
            error: '撤销没成功：网络断了请重试'.repeat(2) },
          { key: 'l2', time: '00:01', say: long, impact: { title: '这次改动的影响面（标题也很长）'.repeat(2), note: '交代也很长'.repeat(4), rows: longRows } },
          { key: 'l3', time: '00:00', say: long, state: 'locked', lockedReason: '因为'.repeat(24) },
        ],
      }),
    },
    {
      name: 'longimpact',
      html: renderUndoTimeline({ name: 'impact-long', form: 'impact', hint: '提示'.repeat(24),
        change: { title: '一次改动（长标题）'.repeat(3), note: '交代也很长'.repeat(4), rows: longRows } }),
    },
    { name: 'empty', html: renderUndoTimeline({ name: 'empty-undo', entries: [], hint: 'hint' }) },
  ];
}

describe('undo-timeline ④⑤ 两档几何 · 皮肤纪律 · 行为（真机 headless Chrome ＋ CDP）', () => {
  it('容器 320／390／620／1280：零横溢／命中盒 ≥44／间距 ≥8／零截断／四套皮肤标记逐字节相同／行为逐条', async (t) => {
    const css = undoTimelineCss();
    const js = buildUndoTimelineJs();
    const casesHtml = pageHtml(cases());
    const evName = [UNDO_TIMELINE_EVENT_UNDO, UNDO_TIMELINE_EVENT_RESTORE, UNDO_TIMELINE_EVENT_ROLLBACK,
      UNDO_TIMELINE_EVENT_PICK, UNDO_TIMELINE_EVENT_CANCEL];
    const listener = '<script>window.__ev=[];'
      + '[' + evName.map((e) => JSON.stringify(e)).join(',') + '].forEach(function(name){'
      + 'document.addEventListener(name,function(e){var d=e.detail||{};'
      + 'window.__ev.push([name,(d.items||[]).join(","),d.count,d.key,d.name,d.label]);});});'
      + '</script>';
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n')
        + '<script>' + js + '</script>' + listener,
      css: skinCss() + '\n' + css,
      height: 1600,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：定宽不过窄档／触控地板写在样式里／'
        + '忙碌那枚字出流（换行只由正常那枚字决定）／不给 openKey 时就地那块 hidden');
      assertStaticGeometry(css, casesHtml);
      return t.skip('本机无 Chrome／Chromium：两档几何与行为判据需真浏览器');
    }
    try {
      for (const width of [320, 390, 620, 1280]) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1,
          width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of SKIN_NAMES) {
          for (const c of cases()) {
            const scope = '.' + skinClass(skin) + ' [data-case="' + c.name + '"] ';
            const root = await page.read([scope + '.' + UNDO_TIMELINE_CLASS]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            assert.ok(root[0].maxScrollW <= root[0].maxClientW + 1,
              width + ' 档 ' + skin + ' ' + c.name + '：根横向溢出 ' + root[0].maxScrollW + ' > ' + root[0].maxClientW);
            assert.equal(root[0].scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            /* 关键语义零截断：时刻／动作句／读数／条数／结论句／按钮字。 */
            const texts = await page.read([undoTimelineSlot('time'), undoTimelineSlot('say'), undoTimelineSlot('eff'),
              undoTimelineSlot('count'), undoTimelineSlot('sum'), undoTimelineSlot('tag'), undoTimelineSlot('label'),
              undoTimelineSlot('ititle'), undoTimelineSlot('hint')]
              .map((slot) => scope + '.' + slot));
            for (const one of texts) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel
                + ' 有 ' + one.clipped + ' 处被截断');
            }
            /* 几何：命中盒与间距。 */
            const box = await page.ev('(function(){'
              + 'var root=document.querySelector(' + JSON.stringify(scope + '.' + UNDO_TIMELINE_CLASS) + ');'
              + 'var bts=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + undoTimelineSlot('bt')) + '));'
              + 'var items=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + undoTimelineSlot('item')) + '));'
              + 'var checks=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + undoTimelineSlot('check') + ' input') + '));'
              + 'var o={btMin:1e9,itemMin:1e9,checkMin:1e9,minGap:1e9,vis:[]};'
              + 'for(var i=0;i<bts.length;i+=1){var r=bts[i].getBoundingClientRect();'
              + 'if(r.width<=0||r.height<=0)continue;'
              + 'if(Math.min(r.width,r.height)<o.btMin)o.btMin=Math.round(Math.min(r.width,r.height));'
              + 'o.vis.push([Math.round(r.left),Math.round(r.right),Math.round(r.top),Math.round(r.bottom)]);}'
              + 'for(var j=0;j<items.length;j+=1){var r2=items[j].getBoundingClientRect();'
              + 'if(Math.min(r2.width,r2.height)<o.itemMin)o.itemMin=Math.round(Math.min(r2.width,r2.height));}'
              + 'for(var k=0;k<checks.length;k+=1){var r3=checks[k].getBoundingClientRect();'
              + 'o.checkMin=Math.round(Math.min(Math.min(r3.width,r3.height),o.checkMin));}'
              + 'for(var a=0;a<o.vis.length;a+=1){for(var b=a+1;b<o.vis.length;b+=1){'
              + 'var p=o.vis[a],q=o.vis[b];var sameRow=Math.min(p[3],q[3])-Math.max(p[2],q[2])>0;'
              + 'var sameCol=Math.min(p[1],q[1])-Math.max(p[0],q[0])>0;'
              + 'if(sameRow){var g=q[0]-p[1];if(g>=0&&g<o.minGap)o.minGap=g;}'
              + 'else if(sameCol){var g2=q[2]-p[3];if(g2>=0&&g2<o.minGap)o.minGap=g2;}else{'
              + 'var dx=Math.max(0,Math.max(p[0],q[0])-Math.min(p[1],q[1]));'
              + 'var dy=Math.max(0,Math.max(p[2],q[2])-Math.min(p[3],q[3]));'
              + 'var d=Math.round(Math.sqrt(dx*dx+dy*dy));if(d<o.minGap)o.minGap=d;}}}'
              + 'return o;}())');
            if (box.btMin !== 1e9) assert.ok(box.btMin >= UNDO_TIMELINE_TOUCH_PX,
              width + ' 档 ' + skin + ' ' + c.name + '：按钮命中盒不足 ' + String(UNDO_TIMELINE_TOUCH_PX) + '（' + box.btMin + '）');
            if (box.itemMin !== 1e9) assert.ok(box.itemMin >= UNDO_TIMELINE_ROW_MIN_PX,
              width + ' 档 ' + skin + ' ' + c.name + '：整行命中区不足 ' + String(UNDO_TIMELINE_ROW_MIN_PX) + '（' + box.itemMin + '）');
            if (box.checkMin !== 1e9) assert.ok(box.checkMin >= UNDO_TIMELINE_TOUCH_PX,
              width + ' 档 ' + skin + ' ' + c.name + '：勾选框命中盒不足（' + box.checkMin + '）');
            if (box.btMin !== 1e9 && box.minGap !== 1e9) {
              assert.ok(box.minGap >= UNDO_TIMELINE_GAP_PX,
                width + ' 档 ' + skin + ' ' + c.name + '：相邻触控目标间距不足 ' + String(UNDO_TIMELINE_GAP_PX) + '（' + box.minGap + '）');
            }
          }
        }
      }
      /* 换皮不换结构：四套皮肤容器里的标记逐字节相同。 */
      for (const c of cases()) {
        for (const width of [390, 1280]) {
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify(SKIN_NAMES) + ';'
            + 'for (var i = 0; i < skins.length; i += 1) {'
            + '  var el = document.querySelector(".ilife-skin-" + skins[i]'
            + ' + " [data-case=' + c.name + '] .' + UNDO_TIMELINE_CLASS + '");'
            + '  out[skins[i]] = el === null ? "" : el.innerHTML;'
            + '} return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(marks[skin], base, width + ' 档 ' + c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
          }
        }
      }
      /* 三处取值：能撤那枚圆点是 accent 实底、勾上的方块是 accent 实底、主动作按钮是 accent-soft ＋ accent-text。 */
      for (const skin of SKIN_NAMES) {
        const vals = SKIN_VALUES[skin];
        const colors = await page.ev('(function(){var sc=' + JSON.stringify('.' + skinClass(skin) + ' [data-case=normal] ')
          + ';var dot=document.querySelector(sc+' + JSON.stringify('[data-ilife-undo-key=k2] .' + undoTimelineSlot('dot')) + ');'
          + 'var box=document.querySelector(sc+' + JSON.stringify('.' + undoTimelineSlot('check') + ' input:checked + .' + undoTimelineSlot('box')) + ');'
          + 'var bt=document.querySelector(sc+' + JSON.stringify('.' + undoTimelineSlot('go') + '.is-primary') + ');'
          + 'var row=document.querySelector(sc+' + JSON.stringify('.' + undoTimelineSlot('item') + ':has(input:checked)') + ');'
          + 'return {dot: dot===null?null:getComputedStyle(dot).backgroundColor,'
          + ' box: box===null?null:getComputedStyle(box).backgroundColor,'
          + ' btBg: bt===null?null:getComputedStyle(bt).backgroundColor,'
          + ' btFg: bt===null?null:getComputedStyle(bt).color,'
          + ' rowBg: row===null?null:getComputedStyle(row).backgroundColor};}())');
        assert.equal(colors.dot, toRgb(vals.accent), skin + '：能撤那枚圆点是 accent 实底');
        assert.equal(colors.box, toRgb(vals.accent), skin + '：勾上的方块是 accent 实底');
        assert.equal(colors.btBg, toRgb(vals['accent-soft']), skin + '：主动作按钮走强调软底');
        assert.equal(colors.btFg, toRgb(vals['accent-text']), skin + '：主动作按钮的字走强调文本档');
        assert.equal(colors.rowBg, toRgb(vals['surface-2']), skin + '：勾上的那一行走次要面');
      }
      /* ⑤ 行为：一次只开一块／再点收起／点外面关／勾选三处一起重算／事件逐条。 */
      const scope = '.' + skinClass(SKIN_NAMES[0]) + ' [data-case="normal"] ';
      const goSel = (key) => JSON.stringify(scope + '.' + undoTimelineSlot('go') + '[data-ilife-undo-go="' + key + '"]');
      const picks = () => page.ev('(function(){var root=document.querySelector('
        + JSON.stringify(scope + '.' + UNDO_TIMELINE_CLASS) + ');'
        + 'var ps=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + undoTimelineSlot('pick')) + '));'
        + 'var bs=[].slice.call(root.querySelectorAll(' + JSON.stringify('[' + 'data-ilife-undo-go]') + '));'
        + 'return {hidden:ps.map(function(p){return p.hasAttribute("hidden");}),'
        + ' ids:ps.map(function(p){return p.id;}),'
        + ' exp:bs.map(function(b){return [b.getAttribute("data-ilife-undo-go"),b.getAttribute("aria-expanded")];})};}())');
      await page.setWidth(390);
      const start = await picks();
      assert.deepEqual(start.hidden, [false], '出发时就地那块摊开着（openKey=k2）');
      assert.deepEqual(start.exp.filter((e) => e[0] === 'k2'), [['k2', 'true']], '摊开那一枚的 aria-expanded 是 true');
      await page.ev('document.querySelector(' + goSel('k2') + ').click(); true');
      assert.deepEqual((await picks()).hidden, [true], '再点同一处 ⇒ 收起');
      await page.ev('document.querySelector(' + goSel('k3') + ').click(); true');
      const solo = await picks();
      assert.deepEqual(solo.hidden, [true], 'k3 没有可摊的块 ⇒ 两块都不该冒出来');
      await page.ev('document.querySelector(' + goSel('k2') + ').click(); true');
      const reopened = await picks();
      assert.deepEqual(reopened.hidden, [false], '再点一次 ⇒ 又摊开（一次只开一块：全场只有一块）');
      assert.deepEqual(reopened.exp.filter((e) => e[0] === 'k2'), [['k2', 'true']]);
      /* 点外面关：点卡头那一排（不在那块里）。 */
      await page.ev('document.querySelector(' + JSON.stringify(scope + '.' + undoTimelineSlot('head')) + ').click(); true');
      assert.deepEqual((await picks()).hidden, [true], '点那块之外的任何地方 ⇒ 全部收起');
      await page.ev('document.querySelector(' + goSel('k2') + ').click(); true');
      assert.deepEqual((await picks()).hidden, [false], '再摊开一次，接着量勾选');
      /* 勾选一变：结论句 ＋ 主按钮字 ＋ 按不动，三处一起重算，并派发 pick 事件。 */
      const state = () => page.ev('(function(){var scope=' + JSON.stringify(scope) + ';'
        + 'var pick=document.querySelector(scope+' + JSON.stringify('.' + undoTimelineSlot('pick')) + ');'
        + 'var sum=pick.querySelector(' + JSON.stringify('.' + undoTimelineSlot('sum')) + ');'
        + 'var sub=pick.querySelector(' + JSON.stringify('.' + undoTimelineSlot('submit')) + ');'
        + 'var lb=sub.querySelector(' + JSON.stringify('.' + undoTimelineSlot('label')) + ');'
        + 'return {sum:sum.textContent,label:lb.textContent,disabled:sub.hasAttribute("disabled"),'
        + ' ev:window.__ev.slice()};}())');
      const before = await state();
      assert.equal(before.label, '撤销这 3 项', '出发时主按钮的字按勾着的三项算');
      const checks = await page.ev('document.querySelectorAll('
        + JSON.stringify(scope + '.' + undoTimelineSlot('check') + ' input') + ').length');
      assert.equal(checks, IMPACT.rows.length, '回滚单里的勾选框枚数');
      await page.ev('(function(){var xs=document.querySelectorAll(' + JSON.stringify(scope + '.'
        + undoTimelineSlot('check') + ' input') + ');xs[3].click();return xs.length;}())');
      const more = await state();
      assert.equal(more.sum, '勾了 4 项，' + IMPACT.sumNote, '勾上一项 ⇒ 结论句原地重算');
      assert.equal(more.label, '撤销这 4 项', '主按钮的字一起重算');
      const pickEv = more.ev.filter((e) => e[0] === UNDO_TIMELINE_EVENT_PICK).pop();
      assert.ok(pickEv, '勾选一变就报一次真读数');
      assert.equal(pickEv[2], 4, '事件里带着勾了几项');
      assert.equal(pickEv[1].split(',').length, 4, '事件里带着勾上的那几项');
      assert.equal(pickEv[3], 'k2', '事件里带着这是哪一次改动');
      /* 一项都没勾 ⇒ 主按钮按不动。 */
      await page.ev('(function(){var xs=document.querySelectorAll(' + JSON.stringify(scope + '.'
        + undoTimelineSlot('check') + ' input') + ');'
        + 'for(var i=0;i<4;i+=1) if (xs[i].checked) xs[i].click(); return true;}())');
      const none = await state();
      assert.equal(none.disabled, true, '一项都没勾 ⇒ 主按钮按不动');
      assert.equal(none.sum, '一项都没勾，撤销得先勾一项。');
      assert.equal(none.label, '一项都没勾');
      /* 勾回来，点主按钮：派发撤销事件（带勾上的那几项），且不自动收起。 */
      await page.ev('(function(){var xs=document.querySelectorAll(' + JSON.stringify(scope + '.'
        + undoTimelineSlot('check') + ' input') + ');xs[0].click();xs[1].click();return true;}())');
      const evsBefore = (await state()).ev.length;
      await page.ev('document.querySelector(' + JSON.stringify(scope + '.'
        + undoTimelineSlot('submit')) + ').click(); true');
      const after = await state();
      const undoEv = after.ev.slice(evsBefore).filter((e) => e[0] === UNDO_TIMELINE_EVENT_UNDO)[0];
      assert.ok(undoEv, '点主按钮 ⇒ 派发撤销事件');
      assert.equal(undoEv[3], 'k2', '撤销的是哪一次改动');
      assert.equal(undoEv[1].split(',').length, 2, '事件里带着勾上的那两项');
      assert.equal(after.disabled, false);
      assert.deepEqual((await picks()).hidden, [false], '本件不自动收起：写库成败归页面');
      /* 「取消」收起并把焦点还给那一枚按钮。 */
      await page.ev('document.querySelector(' + JSON.stringify(scope + '.'
        + undoTimelineSlot('cancel')) + ').click(); true');
      const closed = await page.ev('(function(){var scope=' + JSON.stringify(scope) + ';'
        + 'var pick=document.querySelector(scope+' + JSON.stringify('.' + undoTimelineSlot('pick')) + ');'
        + 'var btn=document.querySelector(' + goSel('k2') + ');'
        + 'return {hidden:pick.hasAttribute("hidden"),exp:btn.getAttribute("aria-expanded"),'
        + 'focus:document.activeElement===btn};}())');
      assert.equal(closed.hidden, true, '「取消」收起就地那一块');
      assert.equal(closed.exp, 'false');
      assert.equal(closed.focus, true, '焦点还给那一枚按钮（不掉在 hidden 的元素上）');
      /* 「恢复这笔」与整段回滚各自派发事件。 */
      const evKind = () => page.ev('(function(){var e=window.__ev[window.__ev.length-1];'
        + 'return e===undefined?null:e;}())');
      await page.ev('document.querySelector(' + JSON.stringify(scope + '.'
        + undoTimelineSlot('go') + '[data-ilife-undo-restore="k1"]') + ').click(); true');
      const restored = await evKind();
      assert.deepEqual(restored.slice(0, 1), [UNDO_TIMELINE_EVENT_RESTORE], '「恢复这笔」派发恢复事件');
      assert.equal(restored[3], 'k1', '恢复的是哪一条');
      await page.ev('document.querySelector(' + JSON.stringify(scope + '.'
        + undoTimelineSlot('roll')) + ').click(); true');
      const rolled = await evKind();
      assert.deepEqual(rolled.slice(0, 1), [UNDO_TIMELINE_EVENT_ROLLBACK], '整段回滚派发它自己的事件');
      assert.equal(rolled[5], SAMPLE.rollback.label, '事件里带着那枚按钮上的字');
      /* 不可撤那一枚按不动（按下去不派发任何事件）。 */
      const evCount = (await state()).ev.length;
      await page.ev('document.querySelector(' + goSel('k4') + ').click(); true');
      assert.equal((await state()).ev.length, evCount, '不可撤那枚按不动');
      /* `impact` 形态的「取消」派发取消事件。 */
      const iScope = '.' + skinClass(SKIN_NAMES[0]) + ' [data-case="impact"] ';
      await page.ev('document.querySelector(' + JSON.stringify(iScope + '.'
        + undoTimelineSlot('cancel')) + ').click(); true');
      const cancelled = await evKind();
      assert.deepEqual(cancelled.slice(0, 1), [UNDO_TIMELINE_EVENT_CANCEL], '单独成件那张的「取消」派发取消事件');
      assert.equal(cancelled[4], 'impact-one', '事件里带着这一块的机器键');
      /* ⑤ 重复注入只绑一次（文档根上的幂等键）：再跑一遍同一段运行时，事件不许翻倍。 */
      const n0 = (await state()).ev.length;
      await page.ev(js);
      const runtimeAttr = await page.ev('document.documentElement.getAttribute("data-ilife-undo-runtime")');
      assert.equal(runtimeAttr, '1', '运行时在文档根上留幂等键');
      const bound = await page.ev('document.querySelector(' + JSON.stringify(scope + '.' + UNDO_TIMELINE_CLASS)
        + ').getAttribute("data-ilife-undo-bound")');
      assert.equal(bound, '1', '根上留一枚已接管的读数');
      await page.ev('(function(){var xs=document.querySelectorAll(' + JSON.stringify(scope + '.'
        + undoTimelineSlot('check') + ' input') + ');xs[3].click();return true;}())');
      const n1 = (await state()).ev.length;
      assert.equal(n1 - n0, 1, '重复注入只绑一次：勾一次只许派发一枚事件');
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      /* 读数落盘：四档 × 本件根／那一行／就地那块／回滚单那几行（量之前先把那块摊开）。 */
      await page.ev('document.querySelector(' + goSel('k2') + ').click(); true');
      for (const width of [320, 390, 620, 1280]) {
        await page.setWidth(width);
        const reads = await page.read([UNDO_TIMELINE_CLASS, undoTimelineSlot('row'), undoTimelineSlot('pick'),
          undoTimelineSlot('item'), undoTimelineSlot('bt'), undoTimelineSlot('time')]
          .map((s) => '.' + skinClass(SKIN_NAMES[0]) + ' [data-case="normal"] .' + s));
        console.log('READING undo-timeline container=' + width + ' '
          + reads.map((r) => r.sel.replace(/.*\.ilife-/, '') + ' scroll=' + r.maxScrollW + '/' + r.maxClientW
            + ' clipped=' + r.clipped + ' visible=' + r.visible).join(' ｜ '));
      }
      await page.ev('window.__ev=[]; true');
    } finally { page.close(); }
  });

  it('跨实例与运行期：点别的按钮（含别的实例）都收；disabled 的框不进计数', async (t) => {
    const css = undoTimelineCss();
    const js = buildUndoTimelineJs();
    const aHtml = renderUndoTimeline({ name: 'a-undo', openKey: 'a1', entries: [
      { key: 'a1', time: '10:00', say: '甲改了一笔', impact: { title: '甲的影响面', rows: [{ key: 'r1', title: '一行' }] } },
      { key: 'a2', time: '09:00', say: '甲又改一笔', impact: { title: '甲的另一面', rows: [
        { key: 'r1', title: '能撤的一行' },
        { key: 'r2', title: '撤不了的一行', locked: true, lockedReason: '归档只读' },
      ] } },
    ] });
    const bHtml = renderUndoTimeline({ name: 'b-undo', openKey: 'b1', entries: [
      { key: 'b1', time: '10:00', say: '乙改了一笔', impact: { title: '乙的影响面', rows: [{ key: 'r1', title: '一行' }] } },
    ] });
    const page = await startShapesPage({
      html: '<div class="ilife-page-ui ' + skinClass(SKIN_NAMES[0]) + '">' + aHtml + '</div>'
        + '<div class="ilife-page-ui ' + skinClass(SKIN_NAMES[0]) + '">' + bHtml + '</div>'
        + '<script>' + js + '</script>',
      css: skinCss() + '\n' + css,
      height: 1600,
    });
    if (page === null) return t.skip('本机无 Chrome／Chromium：跨实例行为需真浏览器（静态面由先关后办那条守）');
    try {
      await page.setWidth(390);
      const hidden = () => page.ev('(function(){return [].slice.call(document.querySelectorAll("[data-ilife-undo-pick]"))'
        + '.map(function(p){return p.hasAttribute("hidden");});}())');
      assert.deepEqual(await hidden(), [false, true, false], '出发：a1 与 b1 摊开（openKey），a2 收起');
      await page.ev('document.querySelector("[data-ilife-undo-go=a2]").click(); true');
      assert.deepEqual(await hidden(), [true, false, true], '点 a2 ⇒ a1 收、a2 开、b1（别的实例）也收');
      await page.ev('document.querySelector("[data-ilife-undo-go=b1]").click(); true');
      assert.deepEqual(await hidden(), [true, true, false], '点 b1 ⇒ a2 收、b1 开（跨实例一次只开一块）');
      /* 运行期把勾不动的那一行标上 checked：结论句不许把它算进去。 */
      await page.ev('document.querySelector("[data-ilife-undo-go=a2]").click(); true');
      assert.deepEqual(await hidden(), [true, false, true], '再点 a2 ⇒ 又摊开');
      const sumText = () => page.ev('(function(){var ps=[].slice.call(document.querySelectorAll("[data-ilife-undo-pick]"));'
        + 'return ps[1].querySelector(".' + undoTimelineSlot('sum') + '").textContent;}())');
      const before = await sumText();
      assert.ok(before.indexOf('勾了 1 项') === 0, '出发：a2 那块只勾着能撤的一行（' + before + '）');
      await page.ev('(function(){var ps=[].slice.call(document.querySelectorAll("[data-ilife-undo-pick]"));'
        + 'var box=ps[1].querySelector("input[data-ilife-undo-item=r2]");'
        + 'box.checked=true; box.dispatchEvent(new Event("change",{bubbles:true})); return true;}())');
      assert.equal(await sumText(), before, 'disabled 的框运行期被标 checked ⇒ 结论句不许变（旧版会变成勾了 2 项）');
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
    } finally { page.close(); }
  });
});
