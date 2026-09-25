/** drag-sort（拖拽排序清单 · 形态 lift「拖拽中：拖起行＋原位空槽＋落点粗线」）· 契约测试。
 *
 * 覆盖四类判据（工艺书 §6）＋ 皮肤纪律：
 *  ① **渲染契约**：骨架（卡头 ＋ 行区 ＋ 状态句 ＋ 取消键）／拿起态三样齐
 *    （`is-up` 行 ＋ 空槽 ＋ 落点线，落点线插在落点位那一行前面）／位置读数逐行／
 *     锁定行（把手 `disabled` ＋ 说清为什么）／转义面／**全部**非法入参分支
 *     （每个都断 `BlocksError`；含**全空白串**与**入参表以外的键**）／纯函数；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且只出现一次、
 *     零 `:root`／`!important`／零新 token／零视口宽度查询／必带 `@container` 且自己声明了容器／
 *     零省略手段（`text-overflow`／`line-clamp`／`nowrap`：序号与名称永不截断）／
 *     几何事实取常量（44／56／8／480）／三样的形（位移／虚线／3px 线）／
 *     零手写色值、源码级零手写 `var(--ilife-…)`、不拿 `ink` 系当面／
 *     零键盘语汇（长按／双击／方向键那一路）／`dist/components/drag-sort/**` 剥字面量后零 DOM／
 *     运行时段是产出的文本（IIFE、幂等、无 `innerHTML`、无 `keydown`、点选＋拖拽两条路）／
 *     **文案只许一处定义**（源码里每一句只有一份字面量，运行时段烘出来的那份与 `DRAG_SORT_TEXT`
 *     逐字相同——这条不用真机，所以住这一段）；
 *  ③ **加法式**：不启用它的页面零命中、逐字节不变；渲染本件不改别件产物；前缀透传；
 *     同一份入参渲染四次逐字节相同，且标记不带皮肤类；
 *  ④ **四档几何（真机 headless Chrome ＋ CDP，容器宽 320／390／620／1280）**：
 *     零横向溢出、序号与名称零截断、每枚把手 ≥44×44、行间缝 ≥8px、拿起态三样可见；
 *     **落点粗线通栏**（杆左沿／右沿＝行沿，右端不短一截；标签压在线上；四档逐档量）；
 *     **起不来就退确定性几何判据并打印原因**；
 *  ⑤ **行为（真机 · 真指针）**：拿起（**CDP 真指针点一下把手**：`mousePressed`／`mouseReleased`
 *     加浏览器自己合成的 `click`，完整事件序列逐条落账）／放下（**真指针点另一行的名称格**：
 *     整行可放，不必点把手）／取消（真指针点被拿起那一行自己）；**同页两块只许一块挂拿起态**、
 *     **同 `id` 两张互不串**（第一张拿起 → 拖到第二张上面松手：第二张一动不动、零 drop；
 *     再在第一张自己的行上落账，只有第一张动）；四套皮肤下标记逐字节相同。
 *
 *  **真指针铁律（本判据自己踩过的坑）**：拿起／放下／取消那几条**必须**走
 *  `Input.dispatchMouseEvent` 的 `mousePressed`／`mouseReleased`（CDP 输入通道，浏览器自己合成
 *  `click`），或走完整的 `dispatchEvent(new PointerEvent(…))` 序列——**不许**只用 `element.click()`。
 *  合成 `click` 只派一个事件、不经指针，于是「`pointerdown` 先拿起 → 同一手势的 `click` 立刻取消」
 *  这条**真机必坏**的错法在它眼皮底下全绿（2026-09 审查席读数：
 *  `pointerdown@2 → pick@3 → pointerup@48 → click@48 → cancel@48`，终态 `lift=null`，永远拿不起来）。
 *  `element.click()` 那几条（合成的点击）留着，但它们只当旁证，替不了真指针这几条。
 *  **踩过的第二个坑**：`overlay-probe` 的页对象**没有** `p.send`（它给 `mouse()`／`key()`／`move()`，
 *  `mouse()` 按下即松手、`move()` 不带按键）——原来那几条写的是 `p.send('Input.dispatchMouseEvent'…)`，
 *  真机上当场 `TypeError: p.send is not a function`。点一下改用 `p.mouse()`（就是同一条 CDP 输入通道），
 *  按住不放的拖拽走铁律允许的完整 `PointerEvent` 序列。
 *
 *  **会过屏的句子只许有一处定义**（`DRAG_SORT_TEXT`；判据住 ② 段：它不碰真机）。
 *
 * 期望值一律从组件自己的常量派生（`DRAG_SORT_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DRAG_SORT_ATTR,
  DRAG_SORT_AT_ATTR,
  DRAG_SORT_CANCEL_ATTR,
  DRAG_SORT_CLASS,
  DRAG_SORT_CONTAINER,
  DRAG_SORT_EVENT_CANCEL,
  DRAG_SORT_EVENT_DROP,
  DRAG_SORT_EVENT_PICK,
  DRAG_SORT_FORM_ATTR,
  DRAG_SORT_FORMS,
  DRAG_SORT_GAP_PX,
  DRAG_SORT_HANDLE_ATTR,
  DRAG_SORT_HOVER_QUERY,
  DRAG_SORT_KEY_ATTR,
  DRAG_SORT_LIFT_ATTR,
  DRAG_SORT_LINE_ATTR,
  DRAG_SORT_MAX_ITEMS,
  DRAG_SORT_MIN_ITEMS,
  DRAG_SORT_MOVE_ATTR,
  DRAG_SORT_MOVE_DOWN,
  DRAG_SORT_MOVE_MIN_PX,
  DRAG_SORT_MOVE_UP,
  DRAG_SORT_NARROW_PX,
  DRAG_SORT_ROW_MIN_PX,
  DRAG_SORT_SLOTS,
  DRAG_SORT_SLOT_ATTR,
  DRAG_SORT_STATUS_ATTR,
  DRAG_SORT_TEXT,
  DRAG_SORT_TOUCH_PX,
  buildDragSortJs,
  dragSortCss,
  dragSortSlot,
  dragSortText,
  renderDragSort,
} from '../dist/components/drag-sort/index.js';
import { renderPageHead } from '../dist/components/page-head/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKINS, skinClass, skinCss, skinVar } from '../dist/components/skin/index.js';
import { SKIN_NAMES } from '../dist/components/skin/contract.js';
import { auditHtml, exitCodeFor } from './separator-probe.mjs';
import { styleSource } from './_style-sources.mjs';
import { selectorsOf, startBrowser, stripComments, throwsBlocks } from './overlay-probe.mjs';
import { startShapesPage } from './shapes-probe.mjs';
import { DRAG_SORT_BUTTONS_DEPS, DRAG_SORT_BUTTONS_FNS } from '../dist/components/drag-sort/runtime-buttons.js';
import { DRAG_SORT_LIFT_DEPS, DRAG_SORT_LIFT_FNS } from '../dist/components/drag-sort/runtime-lift.js';
import { PRELUDE_FNS, PRELUDE_NAMES } from '../dist/components/drag-sort/runtime-prelude.js';
import { DRAG_SORT_SHELL_DEPS, DRAG_SORT_SHELL_FNS } from '../dist/components/drag-sort/runtime.js';
import { TEXT_FN_NAMES } from '../dist/components/drag-sort/runtime-text.js';
import * as root from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'drag-sort');
const SLOT = (s) => dragSortSlot(s);
/** 本件的样式源码：经 `_style-sources.mjs` 取该件全部 `style*.ts`（拆出去的那半也在扫面里）。 */
const STYLE_SRC = styleSource('drag-sort');

/* ── 两份真实形状的入参（做菜五步；一份 plain、一份拿起态） ────── */

const ITEMS = [
  { key: 's1', label: '五花肉切 3 cm 方块', note: '约 5 分钟，主料', meta: '5 分' },
  { key: 's2', label: '冷水下锅焯去浮沫', note: '约 8 分钟', meta: '8 分' },
  { key: 's3', label: '下冰糖炒糖色', note: '约 3 分钟，火候', meta: '3 分' },
  { key: 's4', label: '倒生抽焖 20 分钟', note: '小火加盖', meta: '20 分' },
  { key: 's5', label: '收汁装盘', note: '约 2 分钟', meta: '2 分' },
];
const PLAIN = { id: 'steps-dinner', title: '做菜步骤', items: ITEMS };
const LIFTED = { ...PLAIN, liftedKey: 's3', dropAt: 2 };
/** 形态 `buttons`（第二形态）的真实形状：选中第 3 步（行尾长出两半控件，虚线预告停在会落到的那一位）。 */
const BUTTONS = { id: 'day-planner', title: '今天先做什么', form: 'buttons', items: ITEMS, liftedKey: 's3' };
const countOf = (html, needle) => (html.match(new RegExp(needle, 'g')) || []).length;

/* ── 变异自证的小件（每条新判据配一条**当场做的变异**：把该管的那一处在输入里拆掉，
 *  看这条判据真的红——「能红的判据」不许只靠嘴说）。 ───────────────────────────── */

/** 把一个元素（含它的子树）从标记里剥掉：用栈扫标签配对，返回剥掉后的文本。 */
function stripElement(html, className) {
  const at = html.indexOf('class="' + className + '"');
  if (at < 0) return html;
  const open = html.lastIndexOf('<', at);
  const M = /^<([a-z]+)/.exec(html.slice(open));
  if (M === null) return html;
  const tag = M[1];
  const openRe = new RegExp('<' + tag + '\\b', 'g');
  const closeRe = new RegExp('</' + tag + '>', 'g');
  let depth = 0;
  let i = open;
  while (i < html.length) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const a = openRe.exec(html);
    const b = closeRe.exec(html);
    if (b === null) return html;
    if (a !== null && a.index < b.index) { depth += 1; i = a.index + 1; continue; }
    depth -= 1;
    if (depth === 0) return html.slice(0, open) + html.slice(b.index + b[0].length);
    i = b.index + b[0].length;
  }
  return html;
}

/** 一处「形状」论断：`缺少时`＝那一处被剥掉后，`hit` 由真变假。 */
const SHAPE = (what, hit, missing) => ({ what, hit, missing });

/** 行表（标记原文顺序）：键 ＋ 行片段的起止（用来量两半控件／虚线预告挂在哪一行上）。 */
function rowSpans(html) {
  const marks = [...html.matchAll(new RegExp(DRAG_SORT_KEY_ATTR + '="([^"]+)"', 'g'))];
  return marks.map((m, i) => {
    const open = html.lastIndexOf('<div', m.index);
    return {
      key: m[1],
      at: open,
      end: i + 1 < marks.length ? html.lastIndexOf('<div', marks[i + 1].index) : html.length,
      text: html.slice(open, i + 1 < marks.length ? html.lastIndexOf('<div', marks[i + 1].index) : html.length),
    };
  });
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('drag-sort ① 渲染契约 · 骨架与顺序', () => {
  const html = renderDragSort(PLAIN);

  it('卡头 ＋ 行区 ＋ 状态句 ＋ 取消键；形态键是英文骨架名（不是格号 A／B）', () => {
    assert.deepEqual([...DRAG_SORT_FORMS], ['lift', 'buttons'],
      '形态闭集两格：第一格是已落地那一档（键不许改），新档取骨架名');
    assert.equal(DRAG_SORT_FORMS[0], 'lift', '闭集顺序是契约：旧档住第一格（加法式）');
    assert.match(html, new RegExp('^<div class="' + DRAG_SORT_CLASS + ' is-lift"'));
    assert.ok(html.includes(DRAG_SORT_ATTR + '="steps-dinner"'), '根上要有本件的发现锚');
    assert.ok(html.includes(SLOT('title')) && html.includes('>做菜步骤<'), '卡头标题上屏');
    assert.ok(html.includes(SLOT('hint')) && html.includes(DRAG_SORT_TEXT.hint), '卡头右端是那句拿法');
    assert.ok(html.includes(SLOT('status')) && html.includes('role="status"'), '状态句是活的');
    assert.ok(html.includes('共 5 步'), 'plain 态的状态句是真读数');
    assert.ok(html.includes(DRAG_SORT_CANCEL_ATTR + '="steps-dinner"'), '取消键带本件的锚');
    assert.equal(DRAG_SORT_FORMS.includes('A') || DRAG_SORT_FORMS.includes('B'), false, '格号不是接口名');
  });

  it('每行＝把手 ＋ 序号 ＋ 名称格 ＋ 右端读数 ＋ 位置读数；顺序＝入参顺序', () => {
    assert.equal(countOf(html, DRAG_SORT_KEY_ATTR + '="'), ITEMS.length, '一行一个机器键');
    const keys = [...html.matchAll(new RegExp(DRAG_SORT_KEY_ATTR + '="([^"]+)"', 'g'))].map((m) => m[1]);
    assert.deepEqual(keys, ['s1', 's2', 's3', 's4', 's5'], '屏上顺序＝入参顺序');
    for (const [i, one] of ITEMS.entries()) {
      assert.ok(html.includes(DRAG_SORT_HANDLE_ATTR + '="' + one.key + '"'), '缺把手：' + one.key);
      assert.ok(html.includes('拿起第 ' + (i + 1) + ' 步：' + one.label), '把手名里写清第几步：' + one.key);
      assert.ok(html.includes('>' + one.label + '<'), '名称上屏：' + one.label);
      assert.ok(html.includes('第 ' + (i + 1) + ' 位，共 5 步'), '位置读数逐行：' + one.key);
    }
    assert.equal(countOf(html, '<button'), ITEMS.length + 1, '五枚把手 ＋ 一枚取消键，不许再多');
    assert.equal(countOf(html, '<button'), countOf(html, '</button>'), '按钮必须成对');
    assert.equal(/<script|onclick=/i.test(html), false, '标记里不带脚本');
  });

  it('plain 态：没有拿起三样，取消键 `hidden`（移出可点范围）', () => {
    assert.equal(html.includes(DRAG_SORT_LIFT_ATTR), false, '根上不挂拿起态');
    assert.equal(html.includes(SLOT('slot')), false, '没有空槽');
    assert.equal(html.includes(SLOT('drop')), false, '没有落点线');
    assert.equal(html.includes(dragSortSlot('row') + ' is-up'), false, '没有拿起的行');
    const cancel = html.slice(html.indexOf(SLOT('cancel')));
    assert.ok(cancel.includes('hidden'), '取消键 `hidden`：没拿起时不在可点范围里');
    assert.ok(cancel.includes('>' + DRAG_SORT_TEXT.cancel + '<'), '取消键写的是那两个字');
  });

  it('拿起态三样齐：拿起的行 ＋ 空槽 ＋ 落点线（线插在落点位那一行前面）', () => {
    const html = renderDragSort(LIFTED);
    assert.ok(html.includes(DRAG_SORT_LIFT_ATTR + '="s3"'), '根上写清拿起的是谁');
    assert.ok(html.includes(DRAG_SORT_AT_ATTR + '="2"'), '根上写清落到第几位');
    assert.ok(html.includes(dragSortSlot('row') + ' is-up'), '拿起的那一行站起来');
    assert.ok(html.includes('aria-current="true"'), '拿起的行说清自己是当前');
    assert.ok(html.includes('aria-pressed="true"'), '拿起的把手是按下态');
    assert.ok(html.includes(DRAG_SORT_SLOT_ATTR + '="s3"'), '空槽指着被拿起的那一行');
    assert.ok(html.includes('第 3 步原位空着'), '空槽写出哪一步空着');
    assert.ok(html.includes(DRAG_SORT_LINE_ATTR + '="2"'), '落点线写清第几位');
    assert.ok(html.includes('放这里（第 2 位）'), '落点线把第几位写出来');
    const atLine = html.indexOf(DRAG_SORT_LINE_ATTR);
    const atS2 = html.indexOf(DRAG_SORT_KEY_ATTR + '="s2"');
    const atS3 = html.indexOf(DRAG_SORT_KEY_ATTR + '="s3"');
    const atSlot = html.indexOf(DRAG_SORT_SLOT_ATTR);
    assert.ok(atLine < atS2, '落点线插在落点位（s2）那一行前面');
    assert.ok(atS3 < atSlot, '空槽跟在被拿起（s3）那一行后面');
    assert.ok(html.includes('已拿起第 3 步'), '状态句是真读数');
    const cancel = html.slice(html.indexOf(SLOT('cancel')));
    assert.equal(cancel.includes('hidden'), false, '拿起态取消键露出来');
  });

  it('落点缺省＝被拿起的那一位（拿起还没挪＝落回原位）', () => {
    const html = renderDragSort({ ...PLAIN, liftedKey: 's2' });
    assert.ok(html.includes(DRAG_SORT_AT_ATTR + '="2"'), '缺省落点是原位');
    assert.ok(html.includes('放这里（第 2 位）'));
  });

  it('锁定行：把手 `disabled` ＋ 原因写在名称格那一位；锁定的行拿不起来', () => {
    const html = renderDragSort({
      id: 'steps-lock', title: '做菜步骤',
      items: [
        { key: 'a', label: '备料', locked: true, why: '火候没到，前两步动不了' },
        { key: 'b', label: '下锅' },
      ],
    });
    assert.ok(html.includes('is-locked'), '锁定的行挂那一档');
    assert.ok(html.includes(' disabled'), '锁定的把手点不动');
    assert.ok(html.includes(DRAG_SORT_TEXT.lockedPrefix + '火候没到，前两步动不了'), '原因写出来');
    assert.equal(throwsBlocks(() => renderDragSort({
      id: 'x', title: 'T', items: [{ key: 'a', label: '备料', locked: true, why: 'W' }, { key: 'b', label: '下锅' }],
      liftedKey: 'a',
    })), true, '拿起态不许指着锁定的行');
  });

  it('转义面：标题／拿法／名称／副语／读数逐位转义', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderDragSort({
      id: 'evil-one', title: evil, hint: evil,
      items: [
        { key: 'a', label: evil, note: evil, meta: evil },
        { key: 'b', label: 'B' },
      ],
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
  });

  it('**新档标记面**：形态读数／把手只有字形／选中行 ＋ 两半控件 ＋ 贯穿行宽的虚线预告／一屏只留一层话', () => {
    const h = renderDragSort(BUTTONS);
    const spans = rowSpans(h);
    const lineAt = h.indexOf(DRAG_SORT_LINE_ATTR);
    const previewText = dragSortText('previewText', { to: 2 });
    assert.match(h, new RegExp('^<div class="' + DRAG_SORT_CLASS + ' is-buttons"'), '根上带 `is-buttons`');
    assert.ok(h.includes(DRAG_SORT_FORM_ATTR + '="buttons"'), '新档在根上写形态读数');
    assert.equal(renderDragSort(PLAIN).includes(DRAG_SORT_FORM_ATTR), false,
      '旧档的标记一个字节都不多（形态读数只给新档）');
    for (const [i, one] of ITEMS.entries()) {
      assert.ok(h.includes('选中第 ' + (i + 1) + ' 步：' + one.label), '把手名走「选中」口径：' + one.key);
      assert.equal(countOf(spans[i].text, DRAG_SORT_MOVE_ATTR + '='), one.key === 's3' ? 2 : 0,
        '两半控件只挂被选中那一行（别处零命中）：' + one.key);
    }
    assert.equal(countOf(h, DRAG_SORT_MOVE_ATTR + '="' + DRAG_SORT_MOVE_UP + '"'), 1, '「上移」半边只有一枚');
    assert.equal(countOf(h, DRAG_SORT_MOVE_ATTR + '="' + DRAG_SORT_MOVE_DOWN + '"'), 1, '「下移」半边只有一枚');
    assert.equal(countOf(h, 'class="' + dragSortSlot('move') + '"'), 1,
      '两半控件是一颗（一个外框两半），只挂选中那一行');
    assert.ok(h.includes(SLOT('move-up')) && h.includes(SLOT('move-down')), '两半各是一个真按钮');
    assert.ok(h.includes(DRAG_SORT_MOVE_ATTR + '="up"') && h.includes(DRAG_SORT_MOVE_ATTR + '="down"'),
      '两半各带自己的机器值（运行时按它认点的是哪半边）');
    const mv = spans.find((r) => r.key === 's3').text;
    assert.ok(mv.includes(SLOT('move-up')), '两半控件挂在**被选中**那一行（s3）上');
    for (const r of spans) {
      if (r.key === 's3') continue;
      assert.equal(r.text.includes(SLOT('move-up')), false, '别的行上不长两半控件：' + r.key);
    }
    assert.ok(spans.find((r) => r.key === 's3').text.includes('aria-pressed="true"'), '选中那一行的把手是按下态');
    assert.ok(spans.find((r) => r.key === 's3').text.includes('is-picked'), '选中那一行挂 `is-picked`');
    assert.equal(countOf(h, 'is-up'), 0, '新档不用拿起态那个类（那是旧档的形）');
    /* 虚线预告：停在「下一挪会落到的那一位」（能上移＝第 2 位），贯穿行宽那条线 ＋ 写出会落到第几位。 */
    assert.equal(countOf(h, DRAG_SORT_LINE_ATTR), 1, '虚线预告只有一条');
    assert.ok(h.includes(DRAG_SORT_LINE_ATTR + '="2"'), '预告停在会落到的那一位（第 2 位）');
    assert.ok(h.includes('<b>' + previewText + '</b>'), '预告自己写出会落到第几位');
    assert.ok(h.includes('role="status"'), '那一枚就是这一档要念的活读数');
    assert.ok(lineAt > spans[0].at && lineAt < spans[1].at, '向上挪的预告停在选中行（s3）**前面**那一行的位置上');
    assert.equal(renderDragSort({ ...BUTTONS, liftedKey: 's5' }).includes(DRAG_SORT_LINE_ATTR + '="4"'), true,
      '到头的那一行（末位）改预告下移的落点');
    assert.equal(countOf(h, SLOT('index')), 0, '新档没有序号格：它与位置读数点的是同一个数');
    assert.equal(countOf(h, '第 1 位') + countOf(h, '第 2 位') + countOf(h, '第 3 位')
      + countOf(h, '第 4 位') + countOf(h, '第 5 位'), ITEMS.length + 1,
      '同一个数每行只印一次（＋ 虚线预告那一处）');
    assert.equal(countOf(h, SLOT('status')), 0, '新档不写状态句（一屏只留一层话）');
    assert.equal(countOf(h, SLOT('slot')), 0, '新档不画空槽');
    assert.equal(countOf(h, SLOT('cancel')), 0, '新档不摆取消键（再点选中那一行＝取消）');
    assert.equal(countOf(h, '<button'), ITEMS.length + 2, '五枚把手 ＋ 两半控件半边两枚，不许再多');
    assert.equal(countOf(h, '<button'), countOf(h, '</button>'), '按钮必须成对');
    assert.equal(/<script|onclick=/i.test(h), false, '标记里不带脚本');
    assert.ok(h.includes(DRAG_SORT_TEXT.buttonsHint.replace('{n}', '5')), '卡头那句里总数只说一次');
    assert.ok(h.includes('>' + DRAG_SORT_TEXT.moveUp + '<') && h.includes('>' + DRAG_SORT_TEXT.moveDown + '<'),
      '两半上就是「上移」「下移」两个字（不是 ↑／↓ 箭头）');
    assert.equal(h.includes('↑') || h.includes('↓'), false, '箭头字形一个都不留');
    /* 禁用那一档：第 1 位按不动上移、末位按不动下移。 */
    const first = renderDragSort({ ...BUTTONS, liftedKey: 's1' });
    assert.equal(countOf(first, 'aria-label="' + dragSortText('moveUpName', { label: ITEMS[0].label }) + '"'), 1);
    assert.ok(/aria-label="上移：五花肉切 3 cm 方块"[^>]*disabled/.test(first)
      || /disabled[^>]*aria-label="上移：五花肉切 3 cm 方块"/.test(first), '到头的那一半是 `disabled`');
    const last = renderDragSort({ ...BUTTONS, liftedKey: 's5' });
    assert.ok(/aria-label="下移：收汁装盘"[^>]*disabled/.test(last)
      || /disabled[^>]*aria-label="下移：收汁装盘"/.test(last), '末位的下移半边是 `disabled`');
  });

  it('**新档标记面 · 变异自证**：把该管的那一处在输入里拆掉，上面那条真律当场红', () => {
    const h = renderDragSort(BUTTONS);
    const previewText = dragSortText('previewText', { to: 2 });
    const spans = rowSpans(h);
    const lineAt = h.indexOf(DRAG_SORT_LINE_ATTR);
    assert.equal(typeof lineAt === 'number' && lineAt > 0, true, '虚线预告那一枚要在标记里找得到');
    assert.equal(lineAt > spans[0].at && lineAt < spans[1].at, true,
      '预告停在选中行（s3）前面那一行的位置上：line@' + String(lineAt) + ' s1=[' + String(spans[0].at)
      + ',' + String(spans[0].end) + ') s2@' + String(spans[1].at));
    const probes = [
      SHAPE('选中那一行的两半控件', h.includes(SLOT('move-up')),
        stripElement(h, SLOT('move-up')).includes(SLOT('move-up'))),
      SHAPE('虚线预告那一枚带 role="status"', h.includes('role="status"'),
        stripElement(h, SLOT('drop')).includes('role="status"')),
      SHAPE('两半上那两个字', h.includes('>' + DRAG_SORT_TEXT.moveUp + '<'),
        !h.includes('>' + DRAG_SORT_TEXT.moveUp + '<')),
      SHAPE('预告停在选中行前面', lineAt > spans[0].at && lineAt < spans[1].at,
        !(lineAt > spans[0].at && lineAt < spans[1].at)),
      SHAPE('预告写出会落到第几位', h.includes(previewText), !h.includes(previewText)),
    ];
    for (const p of probes) assert.equal(p.hit, true, '判据该命中：' + p.what);
    for (const p of probes) assert.equal(p.missing, false, '变异后判据没红：' + p.what);
    assert.equal(countOf(renderDragSort({ ...BUTTONS, liftedKey: 's5' }), DRAG_SORT_LINE_ATTR + '="4"'), 1,
      '末位那一行改预告下移的落点（换一行判据跟着变）');
    assert.equal(countOf(renderDragSort({ ...BUTTONS, liftedKey: 's5' }), DRAG_SORT_LINE_ATTR + '="2"'), 0);
  });

  it('分隔符门：样例渲染的可见文本零命中（R1 ·／R2 ；／R3 并列顿号）', () => {
    for (const sample of [renderDragSort(PLAIN), renderDragSort(LIFTED)]) {
      const r = auditHtml('<html><body>' + sample + '</body></html>');
      assert.equal(exitCodeFor(r), 0, '分隔符命中：' + JSON.stringify(r.node.hits.slice(0, 2)));
    }
  });

  it('入参违规一律拒（不静默降级）：逐条断 `BlocksError`', () => {
    const ok = { id: 'ok-list', title: 'T', items: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }] };
    assert.equal(throwsBlocks(() => renderDragSort(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderDragSort(null)), true);
    assert.equal(throwsBlocks(() => renderDragSort([])), true, '数组不是入参');
    assert.equal(throwsBlocks(() => renderDragSort({ items: ok.items, title: 'T' })), true, '缺 id');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, id: '' })), true, '空 id');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, id: 'a b' })), true, 'id 里有空格');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, id: '清单一' })), true, 'id 里有非标识符字符');
    assert.equal(throwsBlocks(() => renderDragSort({ id: 'x', items: ok.items })), true, '缺 title');
    assert.equal(throwsBlocks(() => renderDragSort({ id: 'x' })), true, '缺 items');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, items: 'x' })), true, 'items 不是数组');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, items: [] })), true, '0 条');
    assert.equal(throwsBlocks(() => renderDragSort({
      ...ok, items: [{ key: 'only', label: '只一条' }],
    })), true, '1 条谈不上排序');
    assert.equal(throwsBlocks(() => renderDragSort({
      ...ok, items: Array.from({ length: DRAG_SORT_MAX_ITEMS + 1 }, (_, i) => ({ key: 'k' + i, label: 'L' + i })),
    })), true, '超过 ' + DRAG_SORT_MAX_ITEMS + ' 条');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, items: [null, { key: 'b', label: 'B' }] })), true);
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, items: [{ label: 'A' }, { key: 'b', label: 'B' }] })), true,
      '缺行 key');
    assert.equal(throwsBlocks(() => renderDragSort({
      ...ok, items: [{ key: 'same', label: 'A' }, { key: 'same', label: 'B' }],
    })), true, '行 key 清单内唯一');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, items: [{ key: 'a' }, { key: 'b', label: 'B' }] })), true,
      '缺名称');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, items: [{ key: 'a', label: 'A', note: 1 }, { key: 'b', label: 'B' }] })), true);
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, items: [{ key: 'a', label: 'A', locked: 'yes' }, { key: 'b', label: 'B' }] })), true,
      'locked 不是布尔');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, items: [{ key: 'a', label: 'A', locked: true }, { key: 'b', label: 'B' }] })), true,
      '锁定没给原因');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, items: [{ key: 'a', label: 'A', why: 'W' }, { key: 'b', label: 'B' }] })), true,
      '没锁定的行不许写原因');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, liftedKey: 'nope' })), true, '拿起态指着没有的行');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, dropAt: 2 })), true, '没拿起不许给落点');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, liftedKey: 'a', dropAt: 0 })), true, '落点从 1 起');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, liftedKey: 'a', dropAt: 3 })), true, '落点不许超出行数');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, liftedKey: 'a', dropAt: 1.5 })), true, '落点必须是整数');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, form: 'A' })), true, '形态闭集外（格号不是键）');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, title: 1 })), true);
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, hint: 1 })), true);
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, extraClass: 'a"b' })), true);
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, extraClass: 'ok-class other' })), false, '合法附加类名照收');
    const sparse = [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }];
    sparse.length = 3;
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, items: sparse })), true, '稀疏数组（空洞）');
  });

  it('**全空白串＝拒**（上屏文本六类）：收下会在屏上留一块空白', () => {
    const ok = { id: 'ok-list', title: 'T', items: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }] };
    const blanks = [
      ['卡头标题（收下 ⇒ 无字卡头）', { title: '   ' }],
      ['名称（收下 ⇒ 空壳行）', { items: [{ key: 'a', label: '   ' }, { key: 'b', label: 'B' }] }],
      ['拿法那句', { hint: '   ' }],
      ['副语', { items: [{ key: 'a', label: 'A', note: '   ' }, { key: 'b', label: 'B' }] }],
      ['右端读数', { items: [{ key: 'a', label: 'A', meta: '   ' }, { key: 'b', label: 'B' }] }],
      ['锁定原因（收下 ⇒ 说不清为什么）', { items: [{ key: 'a', label: 'A', locked: true, why: '   ' }, { key: 'b', label: 'B' }] }],
    ];
    for (const [what, patch] of blanks) {
      for (const blank of ['   ', '\t', '　', ' 　 ']) {
        assert.equal(throwsBlocks(() => renderDragSort({ ...ok, ...patch })), true,
          what + ' 收到全空白串（' + JSON.stringify(blank) + '）必须拒');
      }
    }
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, hint: '' })), false, '空串＝未给（用缺省那句）');
    assert.ok(renderDragSort({ ...ok, hint: '' }).includes(DRAG_SORT_TEXT.hint));
  });

  it('**入参表以外的键＝拒**（顶层与行内两处）', () => {
    const ok = { id: 'ok-list', title: 'T', items: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }] };
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, bogus: 1 })), true, '顶层多给一个键');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, titles: '打错名' })), true, '顶层写错键名');
    assert.equal(throwsBlocks(() => renderDragSort({
      ...ok, items: [{ ...ok.items[0], bogus: 1 }, ok.items[1]],
    })), true, '行内多给一个键');
    assert.equal(throwsBlocks(() => renderDragSort({ ...ok, hint: undefined, dropAt: undefined })), false,
      '入参表里的键给 undefined 按未给算');
  });

  it('纯函数：同样的入参恒产同样的字节；README 两块样例直渲成功（派生动样例只认第一块）', () => {
    assert.equal(renderDragSort(PLAIN), renderDragSort(PLAIN));
    assert.equal(renderDragSort(LIFTED), renderDragSort(LIFTED));
    assert.equal(renderDragSort(BUTTONS), renderDragSort(BUTTONS));
    const readme = readFileSync(join(DIR, 'README.md'), 'utf8');
    /* 派生器（`gen-components.mjs`）与皮肤矩阵按信息串里的「示例入参」四字取件，**一件只许一块**：
       两块 ⇒ 派生器当场红 ＋ `组件清单.test.mjs` 在 import 期就抛（整层判据一条都跑不了）。 */
    const derived = [...readme.matchAll(/```json 示例入参\n([\s\S]*?)```/g)].map((m) => m[1]);
    assert.equal(derived.length, 1, '带「示例入参」四字的块恰好一块（派生动样例只认它）');
    const second = [...readme.matchAll(/```json 形态 buttons 的入参\n([\s\S]*?)```/g)].map((m) => m[1]);
    assert.equal(second.length, 1, '第二块（`buttons` 档）的信息串不带「示例入参」四字，免得一件两块');
    const samples = [...derived, ...second].map((t) => JSON.parse(t));
    for (const sample of samples) {
      assert.equal(typeof sample === 'object' && sample !== null && !Array.isArray(sample), true,
        '示例是合法 JSON 对象');
    }
    const lift = renderDragSort(samples[0]);
    assert.ok(lift.includes(dragSortSlot('row') + ' is-up') && lift.includes(SLOT('slot')) && lift.includes(SLOT('drop')),
      '缺省那一档的示例渲染出拿起态三样（直渲成功）');
    const buttons = renderDragSort(samples[1]);
    assert.ok(buttons.includes(dragSortSlot('move-up')) && buttons.includes(dragSortSlot('move-down'))
      && buttons.includes(dragSortSlot('drop')), '`buttons` 档的示例渲染出两半控件与虚线预告（直渲成功）');
    assert.equal(samples[1].form, 'buttons', '第二块显式写着形态键');
    assert.equal(samples[0].form, undefined, '第一块是缺省那一档（派生器与皮肤矩阵吃它）');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('drag-sort ② 样式与零 DOM 纪律', () => {
  const css = dragSortCss();
  const clean = stripComments(css);

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且**只出现一次**', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = selectorsOf(clean);
    assert.ok(selectors.length >= 25, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + one);
        assert.ok(one.includes(DRAG_SORT_CLASS), '选择器必须只碰本件类名根：' + one);
        assert.equal((one.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次（拼两遍＝永不命中的死规则）：' + one);
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零视口宽度查询／必带 `@container` 且自己声明了容器', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(/'@media \((?:max|min)-width/.test(css), false, '本件不判视口宽度（件宽 ≠ 视口宽）');
    assert.ok(clean.includes('@container ' + DRAG_SORT_CONTAINER + ' (max-width:'), '窄档必须由容器判');
    assert.ok(clean.includes('container: ' + DRAG_SORT_CONTAINER + ' / inline-size'),
      '写了 @container 就必须自己声明容器（否则永不生效）');
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    assert.ok(clean.includes('@media ' + DRAG_SORT_HOVER_QUERY), '悬停增强读的是常量里的能力查询串');
    assert.ok(clean.includes('@media (prefers-reduced-motion: reduce)'), '减动效那一档要在');
    assert.equal(clean.includes('transitionend'), false, '状态不许依赖 transitionend');
  });

  it('几何事实写在一处：44／56／8／窄档断点都取常量；序号与名称零省略手段', () => {
    assert.equal(DRAG_SORT_TOUCH_PX, 44);
    assert.ok(DRAG_SORT_ROW_MIN_PX >= DRAG_SORT_TOUCH_PX, '行高不得低于触控地板');
    assert.equal(DRAG_SORT_GAP_PX, 8);
    assert.ok(clean.includes('min-height: ' + String(DRAG_SORT_ROW_MIN_PX) + 'px'), '行高取常量');
    assert.ok(clean.includes('width: ' + String(DRAG_SORT_TOUCH_PX) + 'px'), '把手取常量');
    assert.ok(clean.includes('gap: ' + String(DRAG_SORT_GAP_PX) + 'px'), '行间那道缝取常量');
    assert.ok(clean.includes('max-width: ' + String(DRAG_SORT_NARROW_PX) + 'px'), '窄档断点取常量');
    assert.equal(clean.includes('text-overflow'), false, '不许出现省略截断');
    assert.equal(clean.includes('line-clamp'), false, '不许多行截断');
    assert.equal(clean.includes('nowrap'), false, '序号与名称永不截断：连 `nowrap` 都不许');
    assert.equal(clean.includes('overflow-x'), false, '不许藏横滑');
    assert.equal(clean.includes('cursor: not-allowed'), true, '锁定那一档要说得出点不动');
    assert.ok(clean.includes(':focus-visible'), '`:focus-visible` 必须有（真实键盘用户的地板）');
  });

  it('三样的形：拿起行位移＋2px 侧标、空槽虚线框、落点 3px 线（原型 4px 级按法条收窄）', () => {
    assert.ok(clean.includes('translateY(-2px)'), '拿起的行自己站起来（往上挪 2px）');
    assert.ok(clean.includes('box-shadow: inset 2px 0 0 '), '侧标 2px（整行选中那一档的法条口径）');
    assert.equal(clean.includes('inset 4px 0 0'), false, '4px 是原型写法，落地按法条收成 2px');
    assert.ok(new RegExp(SLOT('slot') + '\\s*\\{[^}]*dashed').test(clean), '空槽是虚线框（形）');
    assert.ok(new RegExp(SLOT('drop') + ' > i\\s*\\{[^}]*height: 3px').test(clean), '落点线 3px 通栏（形）');
  });

  it('零手写色值（兜底链那一处除外）、源码级零手写 `var(--ilife-…)`、不拿 ink 系当面', () => {
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外的颜色字面量：' + [...new Set(bare)].join('、'));
    assert.deepEqual([...stripComments(STYLE_SRC).matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [],
      'style.ts 里请改走 skinVar()（注释里提一句不算手写）');
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了「面」：' + value);
    }
    assert.ok(clean.includes('accent-soft'), '强调那一档走软底（实底上不写正文级小字）');
    assert.equal(clean.includes('color-mix(in srgb,'), false, '本件不需要淡洗：三样都走整 token');
  });

  it('皮肤读法与常量对得上：每一处 `var(--ilife-…)` 都是 `skinVar(名)` 的逐字产物', () => {
    const spans = [];
    for (const m of clean.matchAll(/var\(\s*--ilife-([a-z0-9-]+)/g)) {
      const expected = skinVar(m[1]);
      assert.ok(clean.startsWith(expected, m.index), '`' + m[1] + '` 处的 var() 串与 skinVar() 走散');
      spans.push([m.index, m.index + expected.length]);
    }
    assert.ok(spans.length >= 20, '读皮肤的处数不对：' + spans.length);
  });

  it('零键盘语汇（标记与会过屏的字里没有键位提示，也没有「按住才怎样」）', () => {
    const words = ['⌘', '⌥', '⇧', '⌃', 'Esc', 'Tab', '方向键', '快捷键', '键帽', '键盘', '长按', '双击', '按住'];
    const html = [renderDragSort(PLAIN), renderDragSort(LIFTED)].join('') + stripComments(css)
      + buildDragSortJs();
    for (const w of words) assert.equal(html.includes(w), false, '出现键盘语汇：' + w);
  });

  it('**新档样式面**：把手只有字形／选中行站起来（投影＋强调描边）／两半 58×44 且相邻 ≥8／虚线贯穿行宽', () => {
    /* 第二形态那一段（`style-forms.ts`，整段排在旧档规则后面）：从 `.is-buttons` 那一处起截。 */
    const binsAt = clean.indexOf('.is-buttons');
    assert.ok(binsAt > 0, '第二形态那一段要在样式段里（`.is-buttons` 起头）');
    const bins = clean.slice(binsAt);
    const pick = (slot) => new RegExp('\\.' + dragSortSlot(slot) + '(?![a-z-])[^{]*\\{([^}]*)\\}').exec(bins);
    const handle = pick('handle');
    assert.ok(handle !== null, '新档给把手那一条要在');
    assert.equal(/border\s*:\s*0/.test(handle[1]), true, '把手只有字形：没有边框');
    assert.equal(/background\s*:\s*none/.test(handle[1]), true, '把手只有字形：没有软底');
    const picked = new RegExp('\\.' + dragSortSlot('row') + '\\.is-picked[^{]*\\{([^}]*)\\}').exec(bins);
    assert.ok(picked !== null, '选中那一行那一条要在');
    assert.ok(picked[1].includes('box-shadow: ' + skinVar('shadow')),
      '选中行站起来：投影走皮肤那枚 `shadow`（形，不许只靠颜色）');
    assert.ok(picked[1].includes('border-color: ' + skinVar('accent')), '选中行站起来：强调描边');
    const half = new RegExp('\\.' + dragSortSlot('move-up') + '(?![a-z-])[^{]*\\{([^}]*)\\}').exec(bins);
    assert.ok(half !== null, '两半控件那半边那一条要在');
    assert.ok(half[1].includes('min-width: ' + String(DRAG_SORT_MOVE_MIN_PX) + 'px'), '半边宽取常量 58');
    assert.ok(half[1].includes('min-height: ' + String(DRAG_SORT_TOUCH_PX) + 'px'), '半边高取常量 44');
    const box = pick('move');
    assert.ok(box !== null, '两半控件那颗那一条要在');
    assert.ok(box[1].includes('gap: ' + String(DRAG_SORT_GAP_PX) + 'px'), '两半之间那道缝取常量 8');
    const dropTag = new RegExp('\\.' + dragSortSlot('drop') + '\\s*>\\s*b[^{]*\\{([^}]*)\\}').exec(bins);
    assert.ok(dropTag !== null, '虚线预告那枚标签那一条要在');
    assert.ok(dropTag[1].includes('background: ' + skinVar('surface')), '标签压在线上（底色盖住杆）');
    assert.equal(clean.includes(String.fromCharCode(8593)) || clean.includes(String.fromCharCode(8595)), false,
      '样式里不留箭头字形');
    assert.equal(bins.includes('@container ' + DRAG_SORT_CONTAINER), true, '新档自己也按容器判宽（窄档零横溢）');
  });

  it('**新档样式面 · 变异自证**：投影那一条被换成「只染个色」，这条判据当场红', () => {
    const shadowRule = 'box-shadow: ' + skinVar('shadow') + ';';
    assert.equal(clean.includes(shadowRule), true, '前提：投影那一条真的在样式段里');
    const mutated = clean.replace(shadowRule, 'color: ' + skinVar('accent') + ';');
    assert.notEqual(mutated, clean, '变异要真的改到东西');
    const pickedOf = (css) => new RegExp('\\.' + dragSortSlot('row') + '\\.is-picked[^{]*\\{([^}]*)\\}').exec(css);
    const before = pickedOf(clean);
    const after = pickedOf(mutated);
    assert.equal(mutated.includes('box-shadow: ' + skinVar('shadow')), false, '变异后那一档没了');
    assert.equal(after !== null && after[1].includes('box-shadow: ' + skinVar('shadow')), false,
      '变异后判据必须红（原来它是真的）');
    assert.ok(before[1].includes('border-color: ' + skinVar('accent')), '另一条（强调描边）不受影响：两条一起给才叫站起来');
  });

  it('`dist/components/drag-sort/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'drag-sort');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 5, '产物不全：' + files.join('、'));
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

  it('运行时段是**产出的文本**：它自己跑得起来（IIFE）、幂等、点选与拖拽两条路', () => {
    const js = buildDragSortJs();
    assert.ok(js.startsWith('(function(){'), '是一段可独立注入的 IIFE');
    assert.ok(js.trimEnd().endsWith('}());'));
    assert.ok(js.includes('data-ilife-drag-runtime'), '幂等开关');
    for (const needle of ['document', 'addEventListener', 'createElement', 'textContent', 'pointerdown',
      'pointermove', 'pointerup', 'elementFromPoint']) {
      assert.ok(js.includes(needle), '运行时该用到 ' + needle + '（它在产出的文本里，不在模块代码里）');
    }
    assert.equal(/addEventListener\("keydown"/.test(js), false, '不许把键盘做成通路');
    assert.equal(js.includes('innerHTML'), false, '空槽与落点线用节点拼，不碰 innerHTML');
    assert.equal(js.includes('outerHTML'), false);
    for (const ev of [DRAG_SORT_EVENT_PICK, DRAG_SORT_EVENT_DROP, DRAG_SORT_EVENT_CANCEL]) {
      assert.ok(js.includes(ev), '运行时要派发 ' + ev);
    }
    assert.ok(js.includes('A_BOUND'), '根上要记一枚 bound 读数（幂等的可读痕迹）');
  });

  it('槽位闭集与类名一致（判据不另抄一份字面量）', () => {
    assert.equal(dragSortSlot('row'), DRAG_SORT_CLASS + '-row');
    assert.equal(dragSortSlot('row', 'x-'), 'x-block-drag-sort-row');
    for (const slot of DRAG_SORT_SLOTS) {
      assert.ok(dragSortSlot(slot).startsWith(DRAG_SORT_CLASS + '-'));
    }
    for (const slot of ['hd', 'title', 'hint', 'list', 'row', 'handle', 'index', 'name', 'pos', 'slot', 'drop', 'status', 'cancel', 'move', 'move-up', 'move-down']) {
      assert.ok(DRAG_SORT_SLOTS.includes(slot), '槽位闭集里少了 ' + slot);
    }
  });

  it('**同一句只有一个定义地**：写进源码的字面量各只一份，产出的 JS 烘出来与常量逐字相同', () => {
    /* 这条不用真机：它只读产出文本与源码（所以它住在 ② 段，不跟着真机段一起跳过）。
       两面对账：① 源码各文件里每一句只有一份字面量（住 `DRAG_SORT_TEXT`）；
       ② 运行时段烘出来的函数真跑起来，结果与 `dragSortText()` 的整句逐字相同。 */
    const built = buildDragSortJs();
    /** 把产出文本里那句函数抠出来真调一次（产出的 JS 必须自足：不依赖模块作用域）。 */
    const callText = (name, args) => {
      const m = built.match(new RegExp('var ' + name + '=(function\\(([^)]*)\\)\\{ return ([^;]*); \\});'));
      assert.ok(m !== null, '产出文本里没有 ' + name + ' 的烘法（函数没烘？）');
      const body = m[3].replace(/p(\d)/g, (w, i) => JSON.stringify(args[Number(i)]));
      // eslint-disable-next-line no-new-func
      return String(new Function('return ' + body)());
    };
    const got = {
      idleStatus: callText('idleStatus', [123]),
      liftStatus: callText('liftStatus', [123, '标签·A', 456]),
      slotText: callText('slotText', [123, '标签·A']),
      lineText: callText('lineText', [456]),
      gripPick: callText('gripPick', [123, '标签·A']),
      gripLift: callText('gripLift', [123, '标签·A']),
      gripLock: callText('gripLock', [123, '原因·B']),
      /* 第二形态那几句：同一处定义地（`DRAG_SORT_TEXT`）＋ 产出文本里烘成同名函数。 */
      posOne: callText('posOne', [123]),
      previewText: callText('previewText', [456]),
      gripSelect: callText('gripSelect', [123, '标签·A']),
      gripSelected: callText('gripSelected', [123, '标签·A']),
      moveUp: callText('moveUp', []),
      moveDown: callText('moveDown', []),
      moveUpName: callText('moveUpName', ['标签·A']),
      moveDownName: callText('moveDownName', ['标签·A']),
    };
    const want = {
      idleStatus: dragSortText('idleStatus', { n: 123 }),
      liftStatus: dragSortText('liftStatus', { from: 123, label: '标签·A', to: 456 }),
      slotText: dragSortText('slotText', { from: 123, label: '标签·A' }),
      lineText: dragSortText('lineText', { to: 456 }),
      gripPick: dragSortText('gripPick', { p: 123, label: '标签·A' }),
      gripLift: dragSortText('gripLift', { p: 123, label: '标签·A' }),
      gripLock: dragSortText('gripLock', { p: 123, why: '原因·B' }),
      posOne: dragSortText('posOne', { p: 123 }),
      previewText: dragSortText('previewText', { to: 456 }),
      gripSelect: dragSortText('gripSelect', { p: 123, label: '标签·A' }),
      gripSelected: dragSortText('gripSelected', { p: 123, label: '标签·A' }),
      moveUp: DRAG_SORT_TEXT.moveUp,
      moveDown: DRAG_SORT_TEXT.moveDown,
      moveUpName: dragSortText('moveUpName', { label: '标签·A' }),
      moveDownName: dragSortText('moveDownName', { label: '标签·A' }),
    };
    console.log('drag-sort 文案对账 ' + JSON.stringify(got));
    assert.deepEqual(got, want, '运行时段烘的句子与 DRAG_SORT_TEXT 走散（同一句话两个定义地）');
    /** 本件全部源码件（拆件的每一支都在扫面里：只读 `runtime.ts` 的话，拆出去的那几支就成了盲区）。 */
    const SRC_FILES = ['attrs.ts', 'model.ts', 'render.ts', 'runtime.ts', 'runtime-prelude.ts',
      'runtime-lift.ts', 'runtime-buttons.ts', 'runtime-text.ts'];
    const src = SRC_FILES.map((n) => readFileSync(join(DIR, n), 'utf8'))
      .map((t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')).join('\n');
    /** 源码里那几处句子的**处数**（`hint` 与 `idleStatus` 共用那半句＝两处；`gripSelect` 那句是
     *  `gripSelected` 的前缀＝两处）与产出文本里该有几处（`hint`／`buttonsHint` 不在运行时段：
     *  文案由调用方给或只住渲染期；其余各烘一份）。 */
    const CASES = [
      ['点把手拿起一行。放下时点另一行。', 2, 1],
      ['将放到第', 1, 1],
      ['原位空着，被拿起的是', 1, 1],
      ['放这里（第', 1, 1],
      ['共 {n} 步。点一行选中，再点「上移」或「下移」。', 1, 0],
      ['落到第 ', 1, 1],
      ['第 {p} 位', 1, 0],
      ['上移', 4, 2],
      ['下移', 3, 2],
      ['上移：', 1, 1],
      ['下移：', 1, 1],
      /* `选中第 ` 在产出文本里两处：`buttonsHint` 那句 ＋ 烘出来的 `gripSelect`。 */
      ['选中第 ', 2, 2],
      ['已选中第 ', 1, 1],
    ];
    for (const [phrase, wantSrc, wantBuilt] of CASES) {
      const timesSrc = (src.match(new RegExp(phrase, 'g')) || []).length;
      const timesBuilt = (built.match(new RegExp(phrase, 'g')) || []).length;
      assert.equal(timesSrc, wantSrc, '源码里这一段字面量的处数变了（同一句话两个定义地）：' + phrase
        + ' 源码=' + String(timesSrc) + ' 该是=' + String(wantSrc));
      assert.equal(timesBuilt, wantBuilt, '产出文本里这一段的对不上：' + phrase
        + ' 产出=' + String(timesBuilt) + ' 该是=' + String(wantBuilt));
    }
  });

  it('**产出的 JS 自足**：各支用到的名字都有人声明（漏一个＝注入页面后 `ReferenceError`）', () => {
    const built = buildDragSortJs();
    const declared = new Set([...PRELUDE_NAMES, ...TEXT_FN_NAMES, ...DRAG_SORT_BUTTONS_FNS,
      ...DRAG_SORT_LIFT_FNS, ...DRAG_SORT_SHELL_FNS, 'pick', 'drop']);
    for (const [who, deps] of [['旧档那一支', DRAG_SORT_LIFT_DEPS], ['新档那一支', DRAG_SORT_BUTTONS_DEPS],
      ['外壳', DRAG_SORT_SHELL_DEPS]]) {
      for (const name of deps) {
        assert.equal(declared.has(name), true, who + '用到 ' + name + '，但没人声明它');
      }
      console.log('drag-sort 各支用到的名字 ' + who + '：' + deps.length + ' 个，全部有人声明');
    }
    /* 声明的名字在产出文本里真的要出现（表与文本不许走散）。 */
    for (const name of [...PRELUDE_FNS, ...TEXT_FN_NAMES, ...DRAG_SORT_BUTTONS_FNS, ...DRAG_SORT_LIFT_FNS,
      ...DRAG_SORT_SHELL_FNS]) {
      assert.ok(built.includes('function ' + name + '(') || built.includes('var ' + name + '='),
        '产出文本里找不到声明的名字：' + name);
    }
  });
});

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

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('drag-sort ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同；不从根出口出', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(DRAG_SORT_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
    assert.equal(root.renderDragSort, undefined, '组件层不进根出口');
    assert.equal(root.dragSortCss, undefined);
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const barBefore = renderScaleBar({ value: 860, goal: 1850 });
    const headBefore = renderPageHead({ skill: '卡路里', title: '今日', reading: { value: '860', unit: '卡' } });
    renderDragSort(LIFTED);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), barBefore, '别件的产物逐字节不变');
    assert.equal(renderPageHead({ skill: '卡路里', title: '今日', reading: { value: '860', unit: '卡' } }), headBefore);
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(dragSortCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-drag-sort'), '前缀必须作用到 scope 与类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });

  it('同一份入参渲染四次逐字节相同，且标记不带皮肤类', () => {
    const one = renderDragSort(LIFTED);
    assert.equal(renderDragSort(LIFTED), one);
    assert.equal(renderDragSort(LIFTED), one);
    assert.equal(renderDragSort(LIFTED), one);
    assert.equal(/ilife-skin-/.test(one), false, '皮肤由页面挂，换皮要机械地不换结构');
  });
});

/* ── ④⑤ 四档几何（真机）＋ 行为 ─────────────────────────────────── */

/** 一页：皮肤取值表 ＋ 本件样式段 ＋ **调用方给的标记** ＋ 运行时段（可选）。
 *
 *  一页多实例（同页两块／同 id 两张）那种夹具由 `blocksPage()` 走这里进来：
 *  标记自己拼，不进 `renderDragSort`（那是**入参对象**的入口，塞一段 HTML 进去会当场抛
 *  `BlocksError: renderDragSort: input 必须是对象`）。 */
function shell(skin, inner, withRuntime) {
  const script = withRuntime ? '<script>' + buildDragSortJs() + '</script>' : '';
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>drag-sort</title>\n<style>\n'
    + 'html,body{margin:0;padding:0}\n' + skinCss() + '\n' + dragSortCss() + '\n'
    + '</style></head>\n<body>\n'
    + '<div class="ilife-page-ui ' + skinClass(skin) + '" style="padding:16px">'
    + inner + '<p style="height:600px">页面正文</p></div>\n'
    + script + '\n</body></html>';
}

/** 单块夹具：入参交给 `renderDragSort` 渲（垫一句 600px 正文：页面可滚，
 *  于是"点的坐标是不是按当下几何算的"这件事自己会露出破绽）。 */
function fixture(skin, input, withRuntime) {
  return shell(skin, renderDragSort(input), withRuntime);
}

/** 一页多块夹具（两块／同 id 两张）：标记由调用方拼好（每块自带 `.ilife-page-ui` 作用域）。 */
function blocksPage(skin, blocks) {
  return shell(skin, blocks, true);
}

const ROW_SEL = '.' + dragSortSlot('row');
const HANDLE_SEL = '.' + dragSortSlot('handle');

describe('drag-sort ④ 四档几何（真机 headless Chrome ＋ CDP · 容器 320／390／620／1280）', async () => {
  const page = await startShapesPage({
    css: skinCss() + '\n' + dragSortCss(),
    html: '<div class="ilife-page-ui" data-case="plain">' + renderDragSort(PLAIN) + '</div>'
      + '<div class="ilife-page-ui" data-case="lifted">' + renderDragSort(LIFTED) + '</div>'
      + '<div class="ilife-page-ui" data-case="buttons">' + renderDragSort(BUTTONS) + '</div>',
    portOffset: 41,
  });
  if (page === null) {
    it('真机未跑（本机没有 Chrome）：退确定性几何判据', (t) => {
      console.log('drag-sort 几何：真机未跑（本机没有 Chrome），原因=startShapesPage 返回 null');
      t.skip('本机没有 Chrome');
    });
    return;
  }

  it('四档零横向溢出、序号与名称零截断、把手与行缝取常量', async (t) => {
    const selectors = [ROW_SEL, HANDLE_SEL, '.' + dragSortSlot('index'), '.' + dragSortSlot('name'),
      '.' + dragSortSlot('pos'), '.' + dragSortSlot('slot'), '.' + dragSortSlot('drop')];
    for (const width of [320, 390, 620, 1280]) {
      await page.setWidth(width);
      const rows = await page.read(selectors);
      const frame = await page.frame();
      const line = { width, frame, rows };
      console.log('drag-sort 几何读数 ' + JSON.stringify(line));
      assert.ok(frame.fxScrollW <= width + 1, width + ' 档夹具容器横溢：' + JSON.stringify(frame));
      assert.ok(frame.docScrollW <= frame.innerW + 1, width + ' 档页面横溢：' + JSON.stringify(frame));
      for (const r of rows) {
        assert.ok(r.maxScrollW <= r.maxClientW + 1, width + ' 档 ' + r.sel + ' 溢出：' + JSON.stringify(r));
        assert.equal(r.clipped, 0, width + ' 档 ' + r.sel + ' 有节点被截断：' + JSON.stringify(r));
        assert.equal(r.scrollsX, 0, width + ' 档 ' + r.sel + ' 藏了横滑：' + JSON.stringify(r));
      }
      const boxes = await page.ev('(function(){'
        + 'function box(el){ if(!el) return null; var r=el.getBoundingClientRect();'
        + 'return {l:Math.round(r.left),t:Math.round(r.top),r:Math.round(r.right),b:Math.round(r.bottom),'
        + 'w:Math.round(r.width),h:Math.round(r.height)}; }'
        /* 行缝只在 plain 那一列里量：拿起的行自己往上挪 2px（`translateY(-2px)` 的形），
           它上下那两道缝是拿起态的簇，不是行间的缝（判据另看位移那一条）。 */
        + 'var scope=document.querySelector("[data-case=\\"plain\\"]");'
        + 'var handles=[].slice.call(scope.querySelectorAll(' + JSON.stringify(HANDLE_SEL) + ')).map(box);'
        + 'var rows=[].slice.call(scope.querySelectorAll(' + JSON.stringify(ROW_SEL) + '));'
        + 'var gaps=[]; for(var i=1;i<rows.length;i+=1){'
        + ' var a=rows[i-1].getBoundingClientRect(), b=rows[i].getBoundingClientRect();'
        + ' if (Math.abs(a.left-b.left)<3) gaps.push(Math.round(b.top-a.bottom)); }'
        + 'var up=document.querySelector(' + JSON.stringify(ROW_SEL + '.is-up') + ');'
        + 'var upShift=up ? Math.round(up.getBoundingClientRect().top'
        + ' - up.previousElementSibling.getBoundingClientRect().bottom) : null;'
        + 'var slot=document.querySelector(' + JSON.stringify('.' + dragSortSlot('slot')) + ');'
        + 'var drop=document.querySelector(' + JSON.stringify('.' + dragSortSlot('drop')) + ');'
        + 'var firstRow=document.querySelector(' + JSON.stringify(ROW_SEL) + ');'
        + 'var firstMeta=firstRow ? firstRow.querySelector(' + JSON.stringify('.' + dragSortSlot('meta')) + ') : null;'
        + 'var hb=firstRow ? firstRow.querySelector(' + JSON.stringify(HANDLE_SEL) + ').getBoundingClientRect() : null;'
        + 'var mb=firstMeta ? firstMeta.getBoundingClientRect() : null;'
        + 'return {handles:handles, gaps:gaps, slotBox:box(slot), dropBox:box(drop), upShift:upShift,'
        + ' metaWrap: (hb&&mb) ? Math.round(mb.top) > Math.round(hb.bottom) : null};}())');
      console.log('drag-sort 触控读数 ' + JSON.stringify({ width, boxes }));
      for (const h of boxes.handles) {
        assert.ok(h.w >= DRAG_SORT_TOUCH_PX && h.h >= DRAG_SORT_TOUCH_PX,
          width + ' 档把手命中盒不足 44：' + JSON.stringify(h));
      }
      for (const g of boxes.gaps) {
        assert.ok(g >= DRAG_SORT_GAP_PX, width + ' 档行间缝不足 8px：' + JSON.stringify(g));
      }
      assert.equal(boxes.upShift, DRAG_SORT_GAP_PX - 2,
        width + ' 档拿起的行没站起来（往上挪 2px，行缝 8−2＝6）：' + JSON.stringify(boxes.upShift));
      assert.ok(boxes.slotBox.h >= DRAG_SORT_TOUCH_PX, width + ' 档空槽可见：' + JSON.stringify(boxes.slotBox));
      assert.ok(boxes.dropBox.h >= 30, width + ' 档落点线可见：' + JSON.stringify(boxes.dropBox));
      assert.equal(boxes.metaWrap, width <= DRAG_SORT_NARROW_PX,
        width + ' 档右端读数折行不对（窄档 <=' + DRAG_SORT_NARROW_PX + ' 才折）：' + JSON.stringify(boxes.metaWrap));
    }
  });

  /* 判据 B（④ 段）：新档（`buttons`）四档几何逐档量——零横溢、两半 ≥58×44、相邻 ≥8、虚线贯穿行宽。 */
  it('**新档四档几何**：两半控件与相邻目标的缝 ≥8、半边 ≥58×44、虚线预告贯穿行沿（320／390／620／1280 逐档量）', async () => {
    const moveSel = '.' + dragSortSlot('move');
    const upSel = '.' + dragSortSlot('move-up');
    const downSel = '.' + dragSortSlot('move-down');
    for (const width of [320, 390, 620, 1280]) {
      await page.setWidth(width);
      const frame = await page.frame();
      const g = await page.ev('(function(){'
        + 'var scope=document.querySelector("[data-case=\\"buttons\\"]");'
        + 'var box=function(el){ if(!el) return null; var r=el.getBoundingClientRect();'
        + ' return {l:Math.round(r.left),t:Math.round(r.top),r:Math.round(r.right),b:Math.round(r.bottom),'
        + ' w:Math.round(r.width),h:Math.round(r.height)}; };'
        + 'var listEl=scope.querySelector(' + JSON.stringify('.' + dragSortSlot('list')) + ');'
        + 'var list=box(listEl);'
        + 'var rows=[].slice.call(scope.querySelectorAll(' + JSON.stringify(ROW_SEL) + '));'
        + 'var gaps=[]; for (var i=1;i<rows.length;i+=1){ var a=rows[i-1].getBoundingClientRect(),'
        + ' b=rows[i].getBoundingClientRect(); gaps.push(Math.round(b.top-a.bottom)); }'
        + 'var up=box(listEl.querySelector(' + JSON.stringify(upSel) + '));'
        + 'var down=box(listEl.querySelector(' + JSON.stringify(downSel) + '));'
        + 'var move=box(listEl.querySelector(' + JSON.stringify(moveSel) + '));'
        + 'var sep=0;'
        + 'if (up && down){ var vert=!(Math.abs(up.t-down.t)<3 && Math.abs(up.b-down.b)<3);'
        + ' sep=vert ? Math.min(Math.abs(down.t-up.b),Math.abs(up.t-down.b))'
        + '  : Math.max(down.l-up.r,up.l-down.r); }'
        + 'var bar=box(listEl.querySelector(' + JSON.stringify('.' + dragSortSlot('drop') + ' > i') + '));'
        + 'var tag=box(listEl.querySelector(' + JSON.stringify('.' + dragSortSlot('drop') + ' > b') + '));'
        + 'var over=0;'
        + 'for (var j=0;j<rows.length;j+=1){ var r=rows[j];'
        + ' if (r.scrollWidth>r.clientWidth+1) over+=1; }'
        + 'return {rows:rows.length, gaps:gaps, up:up, down:down, move:move, sep:sep, bar:bar, tag:tag, over:over,'
        + ' list:list, picked:!!listEl.querySelector(' + JSON.stringify(ROW_SEL + '.is-picked') + ')};}())');
      console.log('drag-sort 新档几何读数 ' + JSON.stringify({ width, g, frame }));
      assert.equal(g.rows, ITEMS.length, width + ' 档行数不对');
      assert.ok(frame.fxScrollW <= frame.fxClientW + 1, width + ' 档夹具容器横溢：' + JSON.stringify(frame));
      assert.ok(frame.docScrollW <= frame.innerW + 1, width + ' 档页面横溢：' + JSON.stringify(frame));
      assert.equal(g.over, 0, width + ' 档行内溢出（窄档必须折行，不许横滑）：' + JSON.stringify(g));
      for (const gp of g.gaps) {
        assert.ok(gp >= DRAG_SORT_GAP_PX, width + ' 档行间缝不足 8：' + JSON.stringify(g.gaps));
      }
      assert.equal(g.picked, true, width + ' 档选中那一行要在（这一档的样板就是选中态）');
      for (const [what, half] of [['上移', g.up], ['下移', g.down]]) {
        assert.ok(half !== null, width + ' 档找不到「' + what + '」半边');
        assert.ok(half.w >= DRAG_SORT_MOVE_MIN_PX, width + ' 档「' + what + '」半边宽不足 58：' + JSON.stringify(half));
        assert.ok(half.h >= DRAG_SORT_TOUCH_PX, width + ' 档「' + what + '」半边高不足 44：' + JSON.stringify(half));
      }
      assert.ok(g.sep >= DRAG_SORT_GAP_PX, width + ' 档两半之间的缝不足 8：' + JSON.stringify(g));
      assert.ok(g.bar.w >= g.move.w, width + ' 档虚线预告要贯穿行宽（比那颗控件还宽）：' + JSON.stringify(g));
      assert.equal(g.bar.l, g.list.l, width + ' 档虚线杆左沿没对齐行区左沿：' + JSON.stringify(g));
      assert.equal(g.bar.r, g.list.r, width + ' 档虚线杆右沿没到行区右沿（原型是 left:0;right:0 满宽）：' + JSON.stringify(g));
      assert.equal(g.tag.t <= g.bar.t + 1 && g.tag.b >= g.bar.b - 1, true,
        width + ' 档标签没压在虚线上：' + JSON.stringify(g));
      assert.ok(g.tag.w <= g.list.w, width + ' 档标签比行还宽（会横溢）：' + JSON.stringify(g));
    }
  });

  /* 判据 A（④ 段）：落点粗线通栏 ＋ 标签压在线上（四档逐档量）。 */
  it('**落点粗线通栏**：杆左沿／右沿＝行沿（右端不短一截）且标签压在线上（四档逐档量）', async () => {
    const listSel = '.' + dragSortSlot('list');
    const dropSel = '.' + dragSortSlot('drop');
    for (const width of [320, 390, 620, 1280]) {
      await page.setWidth(width);
      const g = await page.ev('(function(){'
        + 'var list=document.querySelector(' + JSON.stringify(listSel) + ');'
        + 'var bar=document.querySelector(' + JSON.stringify(dropSel + ' > i') + ');'
        + 'var tag=document.querySelector(' + JSON.stringify(dropSel + ' > b') + ');'
        + 'var box=function(el){ var r=el.getBoundingClientRect();'
        + ' return {l:Math.round(r.left),r:Math.round(r.right),w:Math.round(r.width),t:Math.round(r.top),b:Math.round(r.bottom)}; };'
        + 'var inTag=function(x){ var r=tag.getBoundingClientRect(); return x>=r.left && x<=r.right; };'
        + 'var a=0, free=0, n=Math.round(bar.getBoundingClientRect().width);'
        + 'for (var x=5; x<n-5; x+=5){ if (x<=n){ a+=1; if(!inTag(x)) free+=1; } }'
        + 'return {list:box(list), bar:box(bar), tag:box(tag),'
        + ' inTagTop:(tag.getBoundingClientRect().top<=bar.getBoundingClientRect().top'
        + ' && tag.getBoundingClientRect().bottom>=bar.getBoundingClientRect().bottom),'
        + ' tagCoverage:(tag.getBoundingClientRect().width/Math.max(1,list.getBoundingClientRect().width)),'
        + ' freeRatio:(free/Math.max(1,a))};}())');
      console.log('drag-sort 落点线读数 ' + JSON.stringify({ width, g }));
      assert.equal(g.bar.l, g.list.l, width + ' 档落点杆左沿没对齐行左沿：' + JSON.stringify(g));
      assert.equal(g.bar.r, g.list.r, width + ' 档落点杆右沿没到行右沿（原型是 left:0;right:0 满宽）：' + JSON.stringify(g));
      assert.ok(g.freeRatio >= 0.6, width + ' 档落点杆被标签挡住太多（标签只许压在线上）：' + JSON.stringify(g));
      assert.equal(g.inTagTop, true, width + ' 档标签没压在线上（原型：标签骑在杆上）：' + JSON.stringify(g));
      assert.ok(g.tagCoverage <= 0.9, width + ' 档标签几乎盖满整条杆：' + JSON.stringify(g));
    }
  });

  /* 关页**放最后**：`page.close()` 之后再调它的 CDP 就是往已关的连接上发——
   *  原来是挨在落点线那条前面，于是最后那条 15 秒 CDP 看门狗就报超时（不是判据红，是夹具自己没关对时候）。 */
  it('关页', () => { page.close(); });
});

describe('drag-sort ⑤ 行为（真机 · 真指针：拿起／放下／取消）＋ 四套皮肤同构', async () => {
  const p = await startBrowser({ portOffset: 42 });
  if (p === null) {
    it('真机未跑（本机没有 Chrome）：行为判据跳过', (t) => {
      console.log('drag-sort 行为：真机未跑（本机没有 Chrome），原因=startBrowser 返回 null');
      t.skip('本机没有 Chrome');
    });
    return;
  }

  /** 在页里装三条事件的落账（`overlay-probe` 的探针只认浮层族那几个名，本件自己装）。 */
  const WIRE = '(function(){window.__drag=[];'
    + [DRAG_SORT_EVENT_PICK, DRAG_SORT_EVENT_DROP, DRAG_SORT_EVENT_CANCEL].map((n) =>
      'document.addEventListener(' + JSON.stringify(n)
      + ',function(e){window.__drag.push({type:e.type,detail:e.detail});});').join('')
    + 'return true;}())';
  const STATE = '(function(){'
    + 'var root=document.querySelector(' + JSON.stringify('.' + DRAG_SORT_CLASS) + ');'
    + 'var keys=[].slice.call(root.querySelectorAll(' + JSON.stringify('[' + DRAG_SORT_KEY_ATTR + ']') + '))'
    + '.map(function(r){return r.getAttribute(' + JSON.stringify(DRAG_SORT_KEY_ATTR) + ');});'
    + 'var pos=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + dragSortSlot('pos')) + '))'
    + '.map(function(el){return el.textContent;});'
    + 'return {lift:root.getAttribute(' + JSON.stringify(DRAG_SORT_LIFT_ATTR) + '),'
    + 'at:root.getAttribute(' + JSON.stringify(DRAG_SORT_AT_ATTR) + '),'
    + 'slot:root.querySelector(' + JSON.stringify('.' + dragSortSlot('slot')) + ')!==null,'
    + 'line:root.querySelector(' + JSON.stringify('.' + dragSortSlot('drop')) + ')!==null,'
    + 'cancelHidden:root.querySelector(' + JSON.stringify('.' + dragSortSlot('cancel')) + ').hasAttribute("hidden"),'
    + 'status:root.querySelector(' + JSON.stringify('.' + dragSortSlot('status')) + ').textContent,'
    + 'keys:keys,pos:pos,evts:window.__drag};}())';
  const CLICK_HANDLE = (key) => '(function(){document.querySelector('
    + JSON.stringify('[' + DRAG_SORT_HANDLE_ATTR + '="' + key + '"]') + ').click();return true;}())';
  const CLICK_CANCEL = '(function(){document.querySelector('
    + JSON.stringify('[' + DRAG_SORT_CANCEL_ATTR + ']') + ').click();return true;}())';

  it('拿起：点把手 → 三样出来 ＋ 状态句 ＋ pick 事件', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 800 });
    await p.ev(WIRE);
    await p.ev(CLICK_HANDLE('s3'));
    const st = await p.ev(STATE);
    console.log('drag-sort 拿起读数 ' + JSON.stringify(st));
    assert.equal(st.lift, 's3', '根上写清拿起的是谁');
    assert.equal(st.at, '3', '落点缺省＝原位');
    assert.equal(st.slot, true, '空槽出来');
    assert.equal(st.line, true, '落点线出来');
    assert.equal(st.cancelHidden, false, '取消键露出来');
    assert.ok(st.status.includes('已拿起第 3 步'), '状态句是真读数：' + st.status);
    assert.equal(st.evts.length, 1, '只派发一条事件');
    assert.equal(st.evts[0].type, DRAG_SORT_EVENT_PICK);
    assert.deepEqual(st.evts[0].detail, { id: 'steps-dinner', key: 's3', from: 3 });
    assert.equal(await p.ev('window.__errs.length'), 0, '页内零未捕获错误');
  });

  it('放下：点另一行 → 全序真动 ＋ 位置读数整列重写 ＋ drop 事件带新 keys', async () => {
    await p.ev(CLICK_HANDLE('s5'));
    const st = await p.ev(STATE);
    console.log('drag-sort 放下读数 ' + JSON.stringify(st));
    assert.deepEqual(st.keys, ['s1', 's2', 's4', 's3', 's5'], 's3 落到 s5 的位置，s5 顺延');
    assert.deepEqual(st.pos, ['第 1 位，共 5 步', '第 2 位，共 5 步', '第 3 位，共 5 步', '第 4 位，共 5 步', '第 5 位，共 5 步'],
      '位置读数整列重写');
    assert.equal(st.lift, null, '拿起态收掉');
    assert.equal(st.slot, false, '空槽撤掉');
    assert.equal(st.line, false, '落点线撤掉');
    assert.equal(st.cancelHidden, true, '取消键收起来');
    assert.ok(st.status.includes('共 5 步'), '状态句回到 plain');
    const drop = st.evts[st.evts.length - 1];
    assert.equal(drop.type, DRAG_SORT_EVENT_DROP);
    assert.deepEqual(drop.detail, { id: 'steps-dinner', keys: ['s1', 's2', 's4', 's3', 's5'], from: 3, to: 4 });
  });

  it('取消：拿起后点取消键 → 顺序不动 ＋ cancel 事件；再点同一行也是取消', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 800 });
    await p.ev(WIRE);
    await p.ev(CLICK_HANDLE('s1'));
    await p.ev(CLICK_CANCEL);
    const st = await p.ev(STATE);
    console.log('drag-sort 取消读数 ' + JSON.stringify(st));
    assert.deepEqual(st.keys, ['s1', 's2', 's3', 's4', 's5'], '顺序原样不动');
    assert.equal(st.lift, null);
    assert.equal(st.evts[st.evts.length - 1].type, DRAG_SORT_EVENT_CANCEL);
    assert.deepEqual(st.evts[st.evts.length - 1].detail, { id: 'steps-dinner', key: 's1' });
    await p.ev(CLICK_HANDLE('s2'));
    await p.ev(CLICK_HANDLE('s2'));
    const st2 = await p.ev(STATE);
    assert.deepEqual(st2.keys, ['s1', 's2', 's3', 's4', 's5'], '再点同一行＝放回原位');
    assert.equal(st2.evts[st2.evts.length - 1].type, DRAG_SORT_EVENT_CANCEL);
  });

  it('锁定的行点不动：把手 disabled，点它不拿起也不派发', async () => {
    await p.at(fixture('paper', {
      id: 'lock-demo', title: 'T',
      items: [{ key: 'a', label: '备料', locked: true, why: '火候没到' }, { key: 'b', label: '下锅' }],
    }, true), { width: 390, height: 800 });
    await p.ev(WIRE);
    const disabled = await p.ev('(function(){return document.querySelector('
      + JSON.stringify('[' + DRAG_SORT_HANDLE_ATTR + '="a"]') + ').disabled;}())');
    assert.equal(disabled, true, '锁定的把手 disabled');
    await p.ev(CLICK_HANDLE('b'));
    const st = await p.ev(STATE);
    assert.equal(st.lift, 'b', '没锁定的行照常拿起');
  });

  it('四套皮肤下标记逐字节相同（换皮不换结构）', async () => {
    const marks = [];
    for (const skin of SKIN_NAMES) {
      await p.at(fixture(skin, LIFTED, false), { width: 390, height: 800 });
      marks.push(await p.ev('(function(){return document.querySelector('
        + JSON.stringify('.' + DRAG_SORT_CLASS) + ').outerHTML;}())'));
    }
    for (let i = 1; i < marks.length; i += 1) {
      assert.equal(marks[i], marks[0], '皮肤 ' + SKIN_NAMES[i] + ' 的标记与 ' + SKIN_NAMES[0] + ' 逐字节相同');
    }
    console.log('drag-sort 皮肤同构：' + SKIN_NAMES.join('／') + ' 四套标记逐字节相同');
  });

  /* ── 真指针小件 ──────────────────────────────────────────────────────────
   *  **视口自己给**：`p.at(html)` 缺省是 1200×900（不是 390×1000），不给就继承上一条的视口；
   *  两块的夹具一长，要对的那枚就掉到首屏之外——CDP 的鼠标坐标落到视口外，事件根本到不了它身上，
   *  于是"什么都没发生"被当成"判据红"。所以每个点在按下去之前都断两件事：
   *  **这枚整盒在视口里**（`inViewport`）＋ **这个坐标的最上层节点真命中它**（`hits`，命中盒核查席那口径）。
   *
   *  **点一下走 `p.mouse()`**：它就是 CDP 的 `Input.dispatchMouseEvent`（`mousePressed` ＋
   *  `mouseReleased`，浏览器自己合成那枚 `click`）——本文件铁律要的那条通路。
   *  **按住不放的拖拽**走铁律允许的第二条路：完整的 `dispatchEvent(new PointerEvent(…))` 序列
   *  （`pointerdown`→`pointermove`→`pointerup`，三枚都带真坐标，页内 `elementFromPoint` 走真布局）——
   *  `overlay-probe` 只给 `mouse()`（按下即松手）与 `move()`（不带按键），没有"按住挪"那种调用。
   *  两条路都**不是** `element.click()`：合成 `click` 只派一枚事件、不经指针，铁律禁的就是它。
   */
  const HANDLE_SEL = (key) => '[' + DRAG_SORT_HANDLE_ATTR + '="' + key + '"]';
  const ROW_KEY = (key) => '[' + DRAG_SORT_KEY_ATTR + '="' + key + '"]';
  const NAMES_CELL = (key) => ROW_KEY(key) + ' .' + dragSortSlot('name');
  const SLOT_SEL = '.' + dragSortSlot('slot');
  const LINE_SEL = '.' + dragSortSlot('drop');

  /** 一枚节点的**当下**几何（每次调用现量：拿起会插空槽把下面几行下推，上一刻的坐标就失效）。 */
  const POINT_AT = (sel) => '(function(){var el=document.querySelector(' + JSON.stringify(sel) + ');'
    + 'if(!el) return null; var b=el.getBoundingClientRect();'
    + 'var x=Math.round(b.left+b.width/2), y=Math.round(b.top+b.height/2);'
    + 'var hit=document.elementFromPoint(x,y);'
    + 'return {x:x,y:y,w:Math.round(b.width),h:Math.round(b.height),top:Math.round(b.top),bottom:Math.round(b.bottom),'
    + 'inViewport:(b.top>=0&&b.bottom<=innerHeight&&b.left>=0&&b.right<=innerWidth),'
    + 'hits:(!!hit&&(hit===el||el.contains(hit))),scroll:document.scrollingElement.scrollTop,innerH:innerHeight};})()';
  const pointOf = async (sel) => {
    const pt = await p.ev(POINT_AT(sel));
    assert.ok(pt !== null, '夹具里找不到要点的节点：' + sel);
    assert.equal(pt.hits, true, '这个坐标的最上层节点不是它（被别的节点压着）：' + JSON.stringify({ sel, pt }));
    assert.equal(pt.scroll, 0, '页面被滚过（视口坐标 ≠ 页坐标）：' + JSON.stringify(pt));
    return pt;
  };
  /** 真指针点一下：按下 ＋ 松手（CDP 输入通道；浏览器随后自己合成那枚 `click`）。 */
  const tapSel = async (sel) => {
    const pt = await pointOf(sel);
    assert.equal(pt.inViewport, true, '要点的那枚在首屏之外（真指针够不着，点了也白点）：'
      + JSON.stringify({ sel, pt }));
    await p.mouse(pt.x, pt.y);
    return pt;
  };

  /** 某一行**裸区**（内容之外的 padding 带）上的一点：运行时认"命中的是这一行自己"才认它是落点。 */
  const bandOf = async (sel) => {
    const pt = await p.ev('(function(){var row=document.querySelector(' + JSON.stringify(sel) + ');'
      + 'if(!row) return null; var r=row.getBoundingClientRect(); var x=Math.round(r.left+r.width/2);'
      + 'for (var y=Math.round(r.bottom)-1; y>=Math.round(r.top); y-=1){'
      + ' var e=document.elementFromPoint(x,y);'
      + ' if (e && e.getAttribute && e.getAttribute(' + JSON.stringify(DRAG_SORT_KEY_ATTR) + '))'
      + '  return {x:x,y:y,inViewport:(y>=0&&y<=innerHeight&&x>=0&&x<=innerWidth),'
      + '   scroll:document.scrollingElement.scrollTop}; }'
      + 'return null;})()');
    assert.ok(pt !== null, '这一行没有裸区（内容把它铺满了）——判据前提变了：' + sel);
    assert.equal(pt.inViewport, true, '裸区那点在首屏之外：' + JSON.stringify({ sel, pt }));
    assert.equal(pt.scroll, 0, '页面被滚过：' + JSON.stringify(pt));
    return pt;
  };

  /** 完整指针序列的一枚：落在该坐标**最上层**那个节点上（与真指针同一处命中）。 */
  const pointerSeq = (type, pt, buttons) => '(function(){'
    + 'var el=document.elementFromPoint(' + pt.x + ',' + pt.y + ')||document;'
    + 'var o={bubbles:true,cancelable:true,composed:true,pointerId:1,pointerType:"mouse",isPrimary:true,'
    + 'button:0,buttons:' + buttons + ',clientX:' + pt.x + ',clientY:' + pt.y + '};'
    + 'el.dispatchEvent(new PointerEvent(' + JSON.stringify(type) + ',o));'
    + 'return (el.getAttribute&&el.getAttribute(' + JSON.stringify(DRAG_SORT_KEY_ATTR) + '))||String(el.className||el.tagName);}())';

  /** 事件序列落账：raw 指针／点击事件 ＋ 本件三条事件，各带「那一刻的真实拿起态」。
   *  本件三条同时落一份 `{type,detail}` 到 `window.__drag`（`STATE.evts` 读的是它）。 */
  const WIRE_TIMELINE = (function () {
    const state = '(function(){var out={};var rs=document.querySelectorAll('
      + JSON.stringify('[' + DRAG_SORT_ATTR + ']') + ');'
      + 'for(var i=0;i<rs.length;i+=1){out[rs[i].getAttribute(' + JSON.stringify(DRAG_SORT_ATTR) + ')]='
      + 'rs[i].getAttribute(' + JSON.stringify(DRAG_SORT_LIFT_ATTR) + ');}return out;})()';
    const raw = ['pointerdown', 'pointerup', 'click'].map((n) => 'document.addEventListener(' + JSON.stringify(n)
      + ',function(e){window.__tl.push({name:' + JSON.stringify(n) + ',at:Math.round(e.timeStamp),state:' + state + '});},true);').join('');
    const own = [DRAG_SORT_EVENT_PICK, DRAG_SORT_EVENT_DROP, DRAG_SORT_EVENT_CANCEL].map((n) =>
      'document.addEventListener(' + JSON.stringify(n) + ',function(e){'
      + 'window.__drag.push({type:' + JSON.stringify(n) + ',detail:e.detail});'
      + 'window.__tl.push({name:' + JSON.stringify(n)
      + ',state:' + state + ',detail:e.detail,root:e.target.getAttribute(' + JSON.stringify(DRAG_SORT_ATTR) + ')});});').join('');
    return 'window.__tl=[];window.__drag=[];' + raw + own + 'true';
  }());

  /** 合成指针序列（**完整序列**，不是 `element.click()`）：真指针那几条的反证就靠它。 */
  const synthSeq = (from) => '(function(){var el=document.querySelector('
    + JSON.stringify(HANDLE_SEL('s3')) + ');'
    + 'var o={bubbles:true,cancelable:true,composed:true,pointerId:1,pointerType:"mouse",isPrimary:true,'
    + 'button:0,buttons:1,clientX:' + from.x + ',clientY:' + from.y + '};'
    + 'el.dispatchEvent(new PointerEvent("pointerdown",o));'
    + 'el.dispatchEvent(new PointerEvent("pointerup",o));'
    + 'el.dispatchEvent(new MouseEvent("click",o));return true;}())';

  it('**真指针点一下＝拿起**（CDP 输入通道：完整事件序列落账，终态必须挂着拿起态）', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 1200 });
    await p.ev(WIRE_TIMELINE);
    const at = await tapSel(HANDLE_SEL('s3'));
    const tl = await p.ev('window.__tl.map(function(o){return o.name;})');
    const st = await p.ev(STATE);
    console.log('drag-sort 真指针拿起时序 ' + JSON.stringify({ at, tl, state: st }));
    assert.deepEqual(tl, ['pointerdown', 'pointerup', DRAG_SORT_EVENT_PICK, 'click'],
      '真指针点一下的事件序列（浏览器自己合成 click）：' + JSON.stringify(tl));
    assert.equal(st.lift, 's3', '点一下就要拿起（真指针通路坏了这里就是 null）');
    assert.equal(st.slot, true, '空槽要在屏上');
    assert.equal(st.line, true, '落点线要在屏上');
    assert.equal(st.cancelHidden, false, '取消键要露着');
    assert.equal(tl.includes(DRAG_SORT_EVENT_CANCEL), false, '同一手势里不许冒出取消');
    assert.equal(await p.ev('window.__errs.length'), 0, '页内零未捕获错误');
  });

  it('**合成指针序列**（dispatchEvent 完整序列）：一样拿得起来——`element.click()` 替不了这一条', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 1200 });
    await p.ev(WIRE_TIMELINE);
    const before = await p.ev('(function(){return document.querySelector(' + JSON.stringify('.' + DRAG_SORT_CLASS)
      + ').getAttribute(' + JSON.stringify(DRAG_SORT_LIFT_ATTR) + ');})()');
    assert.equal(before, null, '点之前没有拿起态');
    await p.ev(synthSeq({ x: 10, y: 10 }));
    const tl = await p.ev('window.__tl.map(function(o){return o.name;})');
    const st = await p.ev(STATE);
    console.log('drag-sort 合成指针时序 ' + JSON.stringify({ tl, state: st }));
    assert.deepEqual(tl, ['pointerdown', 'pointerup', DRAG_SORT_EVENT_PICK, 'click'],
      '完整序列的落账：' + JSON.stringify(tl));
    assert.equal(st.lift, 's3', '完整指针序列也要拿得起来');
  });

  it('**放下＝整行**：拿起后真指针点另一行的名称格（256×20）就落，不必点把手', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 1200 });
    await p.ev(WIRE_TIMELINE);
    /* 几何漂移就在这条上：拿起会在被拿起那一行后面插一个空槽（拿起态三样之一），
       下面几行整列下推——所以坐标只能按**点之前那一刻**现量（`tapSel` 每次现量并断在视口里）。 */
    const before = await pointOf(NAMES_CELL('s5'));
    await tapSel(HANDLE_SEL('s3'));
    assert.equal((await p.ev(STATE)).lift, 's3', '先拿起 s3');
    const after = await pointOf(NAMES_CELL('s5'));
    const cell = await p.ev('(function(){var b=document.querySelector(' + JSON.stringify(NAMES_CELL('s5'))
      + ').getBoundingClientRect();return {w:Math.round(b.width),h:Math.round(b.height)};})()');
    assert.ok(after.top > before.top, '拿起把下面的行下推了（这一条量的是"按当下几何点"）：'
      + JSON.stringify({ before: [before.top, before.bottom], after: [after.top, after.bottom] }));
    await tapSel(NAMES_CELL('s5'));
    const st = await p.ev(STATE);
    console.log('drag-sort 真指针放下读数 '
      + JSON.stringify({ nameCellBefore: [before.top, before.bottom], nameCellAfter: [after.top, after.bottom], state: st, cell }));
    assert.deepEqual(st.keys, ['s1', 's2', 's4', 's3', 's5'], '点名称格就放下：' + JSON.stringify(st.keys));
    assert.equal(st.lift, null, '拿起态收掉');
    assert.equal(st.slot, false, '空槽撤掉');
    assert.equal(st.line, false, '落点线撤掉');
    assert.equal(st.evts[st.evts.length - 1].type, DRAG_SORT_EVENT_DROP, '最后一条是放下');
    assert.deepEqual(st.evts[st.evts.length - 1].detail,
      { id: 'steps-dinner', keys: ['s1', 's2', 's4', 's3', 's5'], from: 3, to: 4 },
      '放下读数与既有的合成点击那条一致');
    assert.equal(await p.ev('window.__errs.length'), 0, '页内零未捕获错误');
  });

  it('**真指针点原位空槽也落**（空槽就是原位：点它＝放回原位）', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 1200 });
    await p.ev(WIRE_TIMELINE);
    await tapSel(HANDLE_SEL('s3'));
    assert.equal((await p.ev(STATE)).lift, 's3', '先拿起 s3');
    const slotAt = await tapSel(SLOT_SEL);
    const st = await p.ev(STATE);
    console.log('drag-sort 点空槽读数 ' + JSON.stringify({ slotAt, keys: st.keys, lift: st.lift, evts: st.evts }));
    assert.equal(st.lift, null, '点空槽也要落账（不许什么都没发生）');
    assert.equal(st.slot, false, '空槽撤掉');
    assert.equal(st.line, false, '落点线撤掉');
    assert.ok(st.evts.length >= 2, '至少派发 pick 与「放下／取消」各一条：' + JSON.stringify(st.evts));
    assert.ok([DRAG_SORT_EVENT_DROP, DRAG_SORT_EVENT_CANCEL].includes(st.evts[st.evts.length - 1].type),
      '最后一条是放下或取消：' + JSON.stringify(st.evts));
    assert.deepEqual(st.keys, ['s1', 's2', 's3', 's4', 's5'], '空槽＝原位：顺序原样不动');
  });

  it('**同页两块只许一块挂拿起态**：A 拿起后点 B 的把手，B 拿起、A 那块被收掉', async () => {
    const two = (key) => '<div style="width:100%"><div class="ilife-page-ui" data-blk="' + key + '">'
      + renderDragSort({ id: 'list-' + key, title: '清单 ' + key, items: ITEMS }) + '</div></div>';
    /* 一页两块：标记自己拼（`renderDragSort` 吃的是入参对象，塞一段 HTML 进去会当场抛 `BlocksError`）。 */
    await p.at(blocksPage('paper', two('a') + two('b')), { width: 390, height: 1800 });
    await p.ev(WIRE_TIMELINE);
    const stateTxt = '(function(){return [].slice.call(document.querySelectorAll('
      + JSON.stringify('[' + DRAG_SORT_ATTR + ']') + ')).map(function(r){return {'
      + 'id:r.getAttribute(' + JSON.stringify(DRAG_SORT_ATTR) + '),'
      + 'lift:r.getAttribute(' + JSON.stringify(DRAG_SORT_LIFT_ATTR) + '),'
      + 'slot:!!r.querySelector(' + JSON.stringify(SLOT_SEL) + '),'
      + 'line:!!r.querySelector(' + JSON.stringify(LINE_SEL) + '),'
      + 'cancelShown:!r.querySelector(' + JSON.stringify('.' + dragSortSlot('cancel'))
      + ').hasAttribute("hidden")};});})()';
    await tapSel('[data-blk="a"] ' + HANDLE_SEL('s2'));
    const one = await p.ev(stateTxt);
    console.log('drag-sort 跨实例读数（A 拿起） ' + JSON.stringify(one));
    assert.deepEqual(one, [{ id: 'list-a', lift: 's2', slot: true, line: true, cancelShown: true },
      { id: 'list-b', lift: null, slot: false, line: false, cancelShown: false }], 'A 拿起后只有 A 挂拿起态');
    /* B 的坐标按**A 拿起之后**的几何现量：A 那块多了一个空槽，B 整块下推了。 */
    await tapSel('[data-blk="b"] ' + HANDLE_SEL('s4'));
    const both = await p.ev(stateTxt);
    console.log('drag-sort 跨实例读数（B 再拿起） ' + JSON.stringify(both));
    assert.equal(both.filter((r) => r.lift !== null).length, 1, '全页只许一块挂拿起态：' + JSON.stringify(both));
    assert.deepEqual(both, [{ id: 'list-a', lift: null, slot: false, line: false, cancelShown: false },
      { id: 'list-b', lift: 's4', slot: true, line: true, cancelShown: true }], 'B 拿起、A 那块被收掉');
    assert.equal(await p.ev('window.__errs.length'), 0, '页内零未捕获错误');
  });

  it('**同 id 两张互不串**：第一张拿起后拖到第二张上面松手——第二张一动不动、零 drop；再在第一张自己的行上落账，只有第一张动', async () => {
    const once = renderDragSort({ id: 'steps-dup', title: '第一张', items: ITEMS });
    const twice = renderDragSort({ id: 'steps-dup', title: '第二张', items: ITEMS });
    const blk = (k, html) => '<div data-blk="' + k + '">' + html + '</div>';
    await p.at(blocksPage('paper', blk('one', once) + blk('two', twice)), { width: 390, height: 1800 });
    await p.ev(WIRE_TIMELINE);
    await p.ev('window.__drop=[];document.addEventListener(' + JSON.stringify(DRAG_SORT_EVENT_DROP)
      + ',function(e){window.__drop.push(e.detail);});true');
    /* 两张的 `id` 与机器键都相同：只能按 **DOM 顺序**分开读（哪一张动了，看的是各自那份读数）。 */
    const stTxt = '(function(){return [].slice.call(document.querySelectorAll('
      + JSON.stringify('[' + DRAG_SORT_ATTR + ']') + ')).map(function(r){return {'
      + 'id:r.getAttribute(' + JSON.stringify(DRAG_SORT_ATTR) + '),'
      + 'lift:r.getAttribute(' + JSON.stringify(DRAG_SORT_LIFT_ATTR) + '),'
      + 'at:r.getAttribute(' + JSON.stringify(DRAG_SORT_AT_ATTR) + '),'
      + 'slot:!!r.querySelector(' + JSON.stringify(SLOT_SEL) + '),'
      + 'line:!!r.querySelector(' + JSON.stringify(LINE_SEL) + '),'
      + 'keys:[].slice.call(r.querySelectorAll(' + JSON.stringify('[' + DRAG_SORT_KEY_ATTR + ']') + ')).map(function(x){'
      + 'return x.getAttribute(' + JSON.stringify(DRAG_SORT_KEY_ATTR) + ');})};});})()';

    /* ① 真指针点一下第一张的把手 s3：只有第一张挂拿起态。 */
    await tapSel('[data-blk="one"] ' + HANDLE_SEL('s3'));
    const picked = await p.ev(stTxt);
    console.log('drag-sort 同 id 拿起读数 ' + JSON.stringify(picked));
    assert.equal(picked[0].lift, 's3', '第一张拿起 s3');
    assert.equal(picked[1].lift, null, '第二张不许跟着拿起（同 id ≠ 同一张）');
    assert.deepEqual(picked[1].keys, ['s1', 's2', 's3', 's4', 's5'], '第二张的顺序原样');
    assert.equal(picked[1].slot || picked[1].line, false, '第二张没有空槽也没有落点线');

    /* ② 按住第一张的把手拖过第一张自己的一行、再拖到第二张上面松手（完整指针序列）：
     *    手势绑在**按下时那个根**（第一张）上——落点不在第一张里就什么都不落，第二张一动不动。
     *    （拖动那一路会走「按住挪」：`overlay-probe` 没有那种调用，走铁律允许的完整 PointerEvent 序列。） */
    const down = await pointOf('[data-blk="one"] ' + HANDLE_SEL('s3'));
    await p.ev(pointerSeq('pointerdown', down, 1));
    const overSelf = await bandOf('[data-blk="one"] ' + ROW_KEY('s5'));
    const hitSelf = await p.ev(pointerSeq('pointermove', overSelf, 1));
    const tracked = await p.ev(stTxt);
    console.log('drag-sort 同 id 拖过自己一行读数 ' + JSON.stringify({ overSelf, hitSelf, tracked: tracked[0] }));
    assert.equal(hitSelf, 's5', '这一挪命中的是第一张的 s5 那一行：' + hitSelf);
    assert.equal(tracked[0].at, '4', '落点线跟手挪到 s5 前面（at 3 → 4）：' + JSON.stringify(tracked[0]));
    const overOther = await bandOf('[data-blk="two"] ' + ROW_KEY('s4'));
    const hitOther = await p.ev(pointerSeq('pointermove', overOther, 1));
    await p.ev(pointerSeq('pointerup', overOther, 0));
    const after = await p.ev(stTxt);
    const dropped = await p.ev('window.__drop');
    const errs = await p.ev('window.__errs');
    console.log('drag-sort 同 id 拖到第二张松手读数 ' + JSON.stringify({ hitOther, after, dropped, errs }));
    assert.equal(hitOther, 's4', '这一挪命中的是第二张的 s4 那一行（同 id 的兄弟块）：' + hitOther);
    assert.deepEqual(errs, [], '页内零未捕获错误（拖动那一路抛了错这里就是红）');
    assert.equal(after[1].lift, null, '第二张不许被拿起：' + JSON.stringify(after[1]));
    assert.deepEqual(after[1].keys, ['s1', 's2', 's3', 's4', 's5'], '第二张的顺序一动不动');
    assert.equal(after[1].slot || after[1].line, false, '第二张没被插空槽／落点线');
    assert.equal(after[0].lift, 's3', '第一张还挂着拿起态（落点不在第一张里＝没放下）');
    assert.deepEqual(after[0].keys, ['s1', 's2', 's3', 's4', 's5'], '第一张的顺序也还没动');
    assert.deepEqual(dropped, [], '零 drop 事件：松手在第二张上面不算第一张的落点');

    /* ③ 再在第一张自己的行上真指针点一下（拿起之后点哪一行都放）：只有第一张落账。 */
    await tapSel('[data-blk="one"] ' + NAMES_CELL('s5'));
    const done = await p.ev(stTxt);
    const dropEvents = await p.ev('window.__drop');
    console.log('drag-sort 同 id 落账读数 ' + JSON.stringify({ done, dropEvents }));
    assert.deepEqual(done[0].keys, ['s1', 's2', 's4', 's3', 's5'], '第一张按「放到那一行前面」落账（s3 落到 s5 前）');
    assert.equal(done[0].lift, null, '第一张的拿起态收掉');
    assert.equal(done[0].slot || done[0].line, false, '第一张的空槽与落点线一起撤掉');
    assert.deepEqual(done[1].keys, ['s1', 's2', 's3', 's4', 's5'], '第二张的顺序还是没动');
    assert.equal(dropEvents.length, 1, '这一趟只报一条 drop（串了的话两张都会各自报一条）：'
      + JSON.stringify(dropEvents));
    assert.deepEqual(dropEvents[0],
      { id: 'steps-dup', keys: ['s1', 's2', 's4', 's3', 's5'], from: 3, to: 4 }, '放下读数');
    assert.equal(await p.ev('window.__errs.length'), 0, '页内零未捕获错误');
  });

  /* ── 新档（`buttons`）那几条：真指针点两半控件（**不是** `element.click()`） ─────────
   *  两档同页装在一起（旧档一块 ＋ 新档一块）：先按块剥一遍标记（要按块比字节）。
   *  新档自己的选择器都加 `[data-blk="b"] ` 前缀（旧档那块也有同名把手）。 */
  const BUTTONS_BLOCK = '[data-blk="b"]';
  const B_HANDLE = (key) => BUTTONS_BLOCK + ' ' + HANDLE_SEL(key);
  const B_UP = BUTTONS_BLOCK + ' .' + dragSortSlot('move-up');
  const B_DOWN = BUTTONS_BLOCK + ' .' + dragSortSlot('move-down');
  const B_LINE = BUTTONS_BLOCK + ' ' + LINE_SEL;
  const B_PICKED = BUTTONS_BLOCK + ' .' + dragSortSlot('row') + '.is-picked';
  const B_NAMES = [1, 2, 3, 4, 5].map((i) => BUTTONS_BLOCK + ' [data-ilife-drag-key="s' + String(i) + '"] '
    + '.' + dragSortSlot('name'));
  /** 新档那一块要断的读数：顺序、选中行、虚线预告、两半的可用性、两半上那两个字、位置读数。 */
  const BSTATE = '(function(){var r=document.querySelector(' + JSON.stringify(BUTTONS_BLOCK
    + ' [' + DRAG_SORT_ATTR + ']') + ');'
    + 'var rows=[].slice.call(r.querySelectorAll(' + JSON.stringify('[' + DRAG_SORT_KEY_ATTR + ']') + '));'
    + 'var up=r.querySelector(' + JSON.stringify('.' + dragSortSlot('move-up')) + ');'
    + 'var down=r.querySelector(' + JSON.stringify('.' + dragSortSlot('move-down')) + ');'
    + 'var line=r.querySelector(' + JSON.stringify(LINE_SEL) + ');'
    + 'var picked=r.querySelector(' + JSON.stringify(ROW_SEL + '.is-picked') + ');'
    + 'return {keys:rows.map(function(x){return x.getAttribute(' + JSON.stringify(DRAG_SORT_KEY_ATTR) + ');}),'
    + ' lift:r.getAttribute(' + JSON.stringify(DRAG_SORT_LIFT_ATTR) + '),'
    + ' at:r.getAttribute(' + JSON.stringify(DRAG_SORT_AT_ATTR) + '),'
    + ' pickedKey:picked?picked.getAttribute(' + JSON.stringify(DRAG_SORT_KEY_ATTR) + '):null,'
    + ' line:line?line.querySelector("b").textContent:null,'
    + ' lineAt:line?line.getAttribute(' + JSON.stringify(DRAG_SORT_LINE_ATTR) + '):null,'
    + ' upText:(up&&up.textContent)||null, downText:(down&&down.textContent)||null,'
    + ' upDisabled:up?!!up.disabled:null, downDisabled:down?!!down.disabled:null,'
    + ' pos:rows.map(function(x){var p=x.querySelector(' + JSON.stringify('.' + dragSortSlot('pos'))
    + ');return p?p.textContent:null;}),'
    + ' evts:window.__drag};}())';
  const bstate = () => p.ev('JSON.parse(JSON.stringify(' + BSTATE + '))');
  const gotoButtons = () => p.at(blocksPage('paper', '<div data-blk="a">' + renderDragSort(PLAIN) + '</div>'
    + '<div data-blk="b">' + renderDragSort(BUTTONS) + '</div>'), { width: 600, height: 1400 })
    .then(() => p.ev(WIRE_TIMELINE)).then(() => p.ev(BSTATE + '.keys.length'));

  it('**新档 · 真指针点「上移」半边**：顺序真变（s3 挪到第 2 位）＋ 虚线预告跟着挪 ＋ 只有一条 drop', async () => {
    await gotoButtons();
    const before = await bstate();
    console.log('drag-sort 新档点之前 ' + JSON.stringify(before));
    assert.deepEqual(before.keys, ['s1', 's2', 's3', 's4', 's5'], '点之前是初始顺序');
    assert.equal(before.pickedKey, 's3', '点之前选中 s3（样板里给的就是它）');
    assert.equal(before.lineAt, '2', '点之前预告：会落到第 2 位');
    assert.deepEqual(before.pos, ['第 1 位', '第 2 位', '第 3 位', '第 4 位', '第 5 位'], '每行只印自己那一位');
    assert.equal(before.upText, DRAG_SORT_TEXT.moveUp, '「上移」半边上的字取自常量');
    assert.equal(before.downText, DRAG_SORT_TEXT.moveDown, '「下移」半边上的字取自常量');
    await tapSel(B_UP);
    const after = await bstate();
    console.log('drag-sort 新档点上移之后 ' + JSON.stringify(after));
    assert.deepEqual(after.keys, ['s1', 's3', 's2', 's4', 's5'], '上移半边真的把 s3 挪到第 2 位');
    assert.equal(after.pickedKey, 's3', '选中跟着走');
    assert.equal(after.lineAt, '1', '预告跟着挪（下一挪会落到第 1 位）');
    assert.equal(after.line, dragSortText('previewText', { to: 1 }), '预告那句跟着重写：' + String(after.line));
    assert.deepEqual(after.pos, ['第 1 位', '第 2 位', '第 3 位', '第 4 位', '第 5 位'], '位置读数整列重写');
    const evts = after.evts.filter((e) => e.type === DRAG_SORT_EVENT_DROP);
    assert.equal(evts.length, 1, '挪一位只报一条 drop：' + JSON.stringify(after.evts));
    assert.deepEqual(evts[0].detail,
      { id: 'day-planner', keys: ['s1', 's3', 's2', 's4', 's5'], from: 3, to: 2, move: 'up' }, 'drop 的 detail');
    assert.equal(await p.ev('window.__errs.length'), 0, '页内零未捕获错误');
  });

  it('**新档 · 真指针点「下移」半边**：顺序真变（s3 挪到第 4 位）＋ 预告跟着挪', async () => {
    await gotoButtons();
    await tapSel(B_DOWN);
    const after = await bstate();
    console.log('drag-sort 新档点下移之后 ' + JSON.stringify(after));
    assert.deepEqual(after.keys, ['s1', 's2', 's4', 's3', 's5'], '下移半边真的把 s3 挪到第 4 位');
    assert.equal(after.pickedKey, 's3', '选中跟着走');
    /* 预告只报「下一挪会落到的那一位」：挪到第 4 位之后，下一挪（上移）会落到第 3 位。 */
    assert.equal(after.lineAt, '3', '预告跟着挪到第 3 位（下一挪会落到那里）');
    assert.equal(after.upText, DRAG_SORT_TEXT.moveUp, '挪完之后两半上还是那两个字（不许变成函数源码）');
    assert.equal(after.downText, DRAG_SORT_TEXT.moveDown, '「下移」半边同理');
    const evts = after.evts.filter((e) => e.type === DRAG_SORT_EVENT_DROP);
    assert.equal(evts.length, 1, '只报一条 drop');
    assert.equal(evts[0].detail.move, 'down', '那一条带 move:"down"（调用方按同一事件写库）');
    assert.equal(await p.ev('window.__errs.length'), 0, '页内零未捕获错误');
  });

  it('**新档 · 变异自证**（真指针）：真指针与合成 click 两条都留读数，但真指针那条走完整事件序列', async () => {
    await gotoButtons();
    const step = async (fn) => {
      const before = await bstate();
      await fn();
      const after = await bstate();
      return { before, after, n: after.evts.filter((e) => e.type === DRAG_SORT_EVENT_DROP).length };
    };
    const real = await step(() => tapSel(B_UP));
    const realTimeline = await p.ev('window.__tl.map(function(o){return o.name;})');
    const synth = await step(async () => {
      await p.ev('(function(){document.querySelector(' + JSON.stringify(B_UP) + ').click();return true;}())');
    });
    console.log('drag-sort 新档真指针／合成对照 ' + JSON.stringify({
      real: [real.before.keys, real.after.keys],
      synth: [synth.before.keys, synth.after.keys],
      timeline: realTimeline.slice(0, 6),
    }));
    assert.equal(realTimeline.includes('pointerdown') && realTimeline.includes('pointerup'), true,
      '真指针那一条走完整事件序列（`pointerdown` ＋ `pointerup` 都在账上）：' + JSON.stringify(realTimeline));
    assert.deepEqual(real.after.keys, ['s1', 's3', 's2', 's4', 's5'], '真指针点一下「上移」：s3 到第 2 位');
    assert.equal(real.n, 1, '真指针那一下恰好一条 drop（不多不少）');
    assert.deepEqual(synth.after.keys, ['s3', 's1', 's2', 's4', 's5'], '合成 click 是**旁证**：它也挪（所以「点得动」不只靠它）');
    assert.equal(synth.n, 2, '合成那一路又加一条 drop（两条都在账上）');
    assert.equal(await p.ev('window.__errs.length'), 0, '页内零未捕获错误');
  });

  const MOVE_UP_SEL = '.' + dragSortSlot('move-up');
  const MOVE_DOWN_SEL = '.' + dragSortSlot('move-down');

  it('**新档 · 两半的界与锁定**：首行「上移」按不动、末行「下移」按不动、锁定行整条挪不动', async () => {
    const halvesOf = async () => p.ev('(function(){var up=document.querySelector(' + JSON.stringify(MOVE_UP_SEL)
      + '), down=document.querySelector(' + JSON.stringify(MOVE_DOWN_SEL) + ');'
      + 'return {up:up?!!up.disabled:null, down:down?!!down.disabled:null,'
      + ' upText:up?up.textContent:null, downText:down?down.textContent:null};}())');
    await p.at(fixture('paper', { ...BUTTONS, liftedKey: 's1' }, true), { width: 600, height: 1200 });
    const first = await halvesOf();
    console.log('drag-sort 新档首行两半读数 ' + JSON.stringify(first));
    assert.equal(first.up, true, '第 1 位：上移按不动（`disabled`）');
    assert.equal(first.down, false, '第 1 位：下移还能按');
    assert.equal(first.upText, DRAG_SORT_TEXT.moveUp, '按不动的那半边上也写着那两个字');
    await p.at(fixture('paper', { ...BUTTONS, liftedKey: 's5' }, true), { width: 600, height: 1200 });
    const last = await halvesOf();
    console.log('drag-sort 新档末行两半读数 ' + JSON.stringify(last));
    assert.equal(last.down, true, '末位：下移按不动');
    assert.equal(last.up, false, '末位：上移还能按');
    /* 相邻那一行锁定＝那半边也按不动（`model.ts` 的 `canUp`／`canDown` 与运行时段同一口径）。 */
    await p.at(fixture('paper', {
      id: 'day-lock', title: '今天先做什么', form: 'buttons', liftedKey: 'b',
      items: [
        { key: 'a', label: '起床', locked: true, why: '闹钟定死了' },
        { key: 'b', label: '早餐' },
        { key: 'c', label: '通勤', locked: true, why: '班车时间定死' },
      ],
    }, true), { width: 600, height: 900 });
    const stuck = await halvesOf();
    console.log('drag-sort 新档夹在锁定行之间读数 ' + JSON.stringify(stuck));
    assert.equal(stuck.up, true, '上面那一行锁定：上移按不动');
    assert.equal(stuck.down, true, '下面那一行锁定：下移按不动');
    assert.equal(await p.ev('window.__errs.length'), 0, '页内零未捕获错误');
  });

  it('**新档 · 拖拽那条路也在**（拖拽**不是**唯一通路，两半控件也不是）：拖选中那一行到别的行松手＝按那里重排', async () => {
    await gotoButtons();
    await p.ev('window.__drag=[];true');
    const down = await pointOf(B_HANDLE('s3'));
    await p.ev(pointerSeq('pointerdown', down, 1));
    /* 拖到第 1 位那一行的**裸区**上（`bandOf` 找的是行自己那一层：`pointerSeq` 落在该坐标最上层那枚节点上）。 */
    const over = await bandOf(BUTTONS_BLOCK + ' ' + ROW_KEY('s1'));
    const hit = await p.ev(pointerSeq('pointermove', over, 1));
    await p.ev(pointerSeq('pointerup', over, 0));
    const after = await bstate();
    console.log('drag-sort 新档拖拽读数 '
      + JSON.stringify({ hit, keys: after.keys, pickedKey: after.pickedKey, line: after.line }));
    assert.equal(hit, 's1', '这一挪命中的是 s1 那一行：' + hit);
    assert.deepEqual(after.keys, ['s3', 's1', 's2', 's4', 's5'], '拖着放到第 1 位：顺序按那里重排');
    assert.equal(after.pickedKey, null, '拖拽放下之后收起选中');
    assert.equal(after.line, null, '虚线预告一起撤掉');
    assert.equal(await p.ev('window.__errs.length'), 0, '页内零未捕获错误（拖拽那一路抛了错这里就是红）');
  });

  it('**新档 · 同页两块互不串**：旧档那块的标记与读数一个字节都不动', async () => {
    await gotoButtons();
    const before = await p.ev('(function(){var a=document.querySelector("[data-blk=\\"a\\"]");'
      + 'return {html:a.innerHTML,' + 'lift:a.querySelector("[' + DRAG_SORT_ATTR + ']")'
      + '.getAttribute(' + JSON.stringify(DRAG_SORT_LIFT_ATTR) + ')};}())');
    await tapSel(B_UP);
    const after = await p.ev('(function(){var a=document.querySelector("[data-blk=\\"a\\"]");'
      + 'return {html:a.innerHTML,' + 'lift:a.querySelector("[' + DRAG_SORT_ATTR + ']")'
      + '.getAttribute(' + JSON.stringify(DRAG_SORT_LIFT_ATTR) + ')};}())');
    console.log('drag-sort 新档同页两块读数 ' + JSON.stringify({ same: before.html === after.html }));
    assert.equal(before.lift, null, '旧档那块本来就没拿起');
    assert.equal(after.html, before.html, '新档挪位不动旧档那块的标记（两块各管各的）');
    const cross = await p.ev('window.__drag.filter(function(e){return e.detail.id==="steps-dinner";}).length');
    assert.equal(cross, 0, '新档那一下一条事件都不该落在旧档的 id 上');
    assert.equal(await p.ev('window.__errs.length'), 0, '页内零未捕获错误');
  });

  it('关页', () => { p.close(); });
});
