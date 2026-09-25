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
 *     **同 `id` 两张互不串**；四套皮肤下标记逐字节相同。
 *
 *  **真指针铁律（本判据自己踩过的坑）**：拿起／放下／取消那几条**必须**走
 *  `Input.dispatchMouseEvent` 的 `mousePressed`／`mouseReleased`（CDP 输入通道，浏览器自己合成
 *  `click`），或走完整的 `dispatchEvent(new PointerEvent(…))` 序列——**不许**只用 `element.click()`。
 *  合成 `click` 只派一个事件、不经指针，于是「`pointerdown` 先拿起 → 同一手势的 `click` 立刻取消」
 *  这条**真机必坏**的错法在它眼皮底下全绿（2026-09 审查席读数：
 *  `pointerdown@2 → pick@3 → pointerup@48 → click@48 → cancel@48`，终态 `lift=null`，永远拿不起来）。
 *  `element.click()` 那几条（合成的点击）留着，但它们只当旁证，替不了真指针这几条。
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
  DRAG_SORT_FORMS,
  DRAG_SORT_GAP_PX,
  DRAG_SORT_HANDLE_ATTR,
  DRAG_SORT_HOVER_QUERY,
  DRAG_SORT_KEY_ATTR,
  DRAG_SORT_LIFT_ATTR,
  DRAG_SORT_LINE_ATTR,
  DRAG_SORT_MAX_ITEMS,
  DRAG_SORT_MIN_ITEMS,
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
const countOf = (html, needle) => (html.match(new RegExp(needle, 'g')) || []).length;

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('drag-sort ① 渲染契约 · 骨架与顺序', () => {
  const html = renderDragSort(PLAIN);

  it('卡头 ＋ 行区 ＋ 状态句 ＋ 取消键；形态键是英文骨架名（不是格号 A）', () => {
    assert.deepEqual([...DRAG_SORT_FORMS], ['lift'], '形态闭集只落地拿起态，键名是骨架名');
    assert.match(html, new RegExp('^<div class="' + DRAG_SORT_CLASS + ' is-lift"'));
    assert.ok(html.includes(DRAG_SORT_ATTR + '="steps-dinner"'), '根上要有本件的发现锚');
    assert.ok(html.includes(SLOT('title')) && html.includes('>做菜步骤<'), '卡头标题上屏');
    assert.ok(html.includes(SLOT('hint')) && html.includes(DRAG_SORT_TEXT.hint), '卡头右端是那句拿法');
    assert.ok(html.includes(SLOT('status')) && html.includes('role="status"'), '状态句是活的');
    assert.ok(html.includes('共 5 步'), 'plain 态的状态句是真读数');
    assert.ok(html.includes(DRAG_SORT_CANCEL_ATTR + '="steps-dinner"'), '取消键带本件的锚');
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

  it('纯函数：同样的入参恒产同样的字节；README 示例入参直渲成功且三样齐', () => {
    assert.equal(renderDragSort(PLAIN), renderDragSort(PLAIN));
    assert.equal(renderDragSort(LIFTED), renderDragSort(LIFTED));
    const readme = readFileSync(join(DIR, 'README.md'), 'utf8');
    const blocks = [...readme.matchAll(/```json 示例入参\n([\s\S]*?)```/g)].map((m) => m[1]);
    assert.equal(blocks.length, 1, 'README 里恰好一块显式示例入参（信息串带「示例入参」四字）');
    const sample = JSON.parse(blocks[0]);
    assert.equal(typeof sample === 'object' && sample !== null && !Array.isArray(sample), true,
      '示例是合法 JSON 对象');
    const html = renderDragSort(sample);
    assert.ok(html.includes(dragSortSlot('row') + ' is-up') && html.includes(SLOT('slot')) && html.includes(SLOT('drop')),
      '示例渲染出拿起态三样（直渲成功且是 A 一档的样子）');
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
    for (const slot of ['hd', 'title', 'hint', 'list', 'row', 'handle', 'index', 'name', 'pos', 'slot', 'drop', 'status', 'cancel']) {
      assert.ok(DRAG_SORT_SLOTS.includes(slot), '槽位闭集里少了 ' + slot);
    }
  });

  it('**同一句只有一个定义地**：写进源码的字面量各只一份，产出的 JS 烘出来与常量逐字相同', () => {
    /* 这条不用真机：它只读产出文本与源码（所以它住在 ② 段，不跟着真机段一起跳过）。
       两面对账：① 源码四个文件里每一句只有一份字面量（住 `DRAG_SORT_TEXT`）；
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
    };
    const want = {
      idleStatus: dragSortText('idleStatus', { n: 123 }),
      liftStatus: dragSortText('liftStatus', { from: 123, label: '标签·A', to: 456 }),
      slotText: dragSortText('slotText', { from: 123, label: '标签·A' }),
      lineText: dragSortText('lineText', { to: 456 }),
      gripPick: dragSortText('gripPick', { p: 123, label: '标签·A' }),
      gripLift: dragSortText('gripLift', { p: 123, label: '标签·A' }),
      gripLock: dragSortText('gripLock', { p: 123, why: '原因·B' }),
    };
    console.log('drag-sort 文案对账 ' + JSON.stringify(got));
    assert.deepEqual(got, want, '运行时段烘的句子与 DRAG_SORT_TEXT 走散（同一句话两个定义地）');
    const files = {
      attrs: readFileSync(join(DIR, 'attrs.ts'), 'utf8'),
      model: readFileSync(join(DIR, 'model.ts'), 'utf8'),
      render: readFileSync(join(DIR, 'render.ts'), 'utf8'),
      runtime: readFileSync(join(DIR, 'runtime.ts'), 'utf8'),
    };
    const src = [files.attrs, files.model, files.render, files.runtime]
      .map((t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')).join('\n');
    /** 源码里那几处句子的**处数**（`hint` 与 `idleStatus` 共用那半句＝两处）与产出文本里该有几处
     *  （`hint` 不在运行时段：文案由调用方给；其余五句各烘一份）。 */
    const CASES = [
      ['点把手拿起一行。放下时点另一行。', 2, 1],
      ['将放到第', 1, 1],
      ['原位空着，被拿起的是', 1, 1],
      ['放这里（第', 1, 1],
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

/** 一页：皮肤取值表 ＋ 本件样式段 ＋ 本件标记 ＋ 运行时段（可选）。 */
function fixture(skin, input, withRuntime) {
  const script = withRuntime ? '<script>' + buildDragSortJs() + '</script>' : '';
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>drag-sort</title>\n<style>\n'
    + 'html,body{margin:0;padding:0}\n' + skinCss() + '\n' + dragSortCss() + '\n'
    + '</style></head>\n<body>\n'
    + '<div class="ilife-page-ui ' + skinClass(skin) + '" style="padding:16px">'
    + renderDragSort(input) + '<p style="height:600px">页面正文</p></div>\n'
    + script + '\n</body></html>';
}

const ROW_SEL = '.' + dragSortSlot('row');
const HANDLE_SEL = '.' + dragSortSlot('handle');

describe('drag-sort ④ 四档几何（真机 headless Chrome ＋ CDP · 容器 320／390／620／1280）', async () => {
  const page = await startShapesPage({
    css: skinCss() + '\n' + dragSortCss(),
    html: '<div class="ilife-page-ui" data-case="plain">' + renderDragSort(PLAIN) + '</div>'
      + '<div class="ilife-page-ui" data-case="lifted">' + renderDragSort(LIFTED) + '</div>',
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

  it('关页', () => { page.close(); });

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
   *  坐标读的是**页面坐标**（`p.at` 把视口设成 390×1000，夹具首屏放得下，`clientY` ≡ 页坐标）。
   *  拿起／放下／取消这几条一律走 CDP 的 `Input.dispatchMouseEvent`（真指针）：
   *  浏览器自己合成那枚 `click`，`pointerdown → pointerup → 合成 click` 的时序才是真机的样子。
   *  `element.click()` 只当旁证——它不经指针，上面那个错法它照不出来。
   */
  const POINT_AT = (sel) => '(function(){var el=document.querySelector(' + JSON.stringify(sel) + ');'
    + 'var b=el.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};}())';
  const HANDLE_SEL = (key) => '[' + DRAG_SORT_HANDLE_ATTR + '="' + key + '"]';
  const NAMES_CELL = (key) => '[' + DRAG_SORT_KEY_ATTR + '="' + key + '"] .' + dragSortSlot('name');
  const SLOT_SEL = '.' + dragSortSlot('slot');
  const LINE_SEL = '.' + dragSortSlot('drop');
  const pointOf = (sel) => p.ev(POINT_AT(sel));

  /** 真指针拖：按下 → 挪（`buttons:1`）→ 松手。CDP 输入通道，浏览器自己派发 pointer 事件。 */
  const realDrag = async (from, to, hops = 6) => {
    await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 });
    for (let i = 1; i <= hops; i += 1) {
      const x = Math.round(from.x + ((to.x - from.x) * i) / hops);
      const y = Math.round(from.y + ((to.y - from.y) * i) / hops);
      await p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
    }
    await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1 });
  };

  /** 真指针点一下（按下 ＋ 松手；浏览器随后自己合成 `click`）。 */
  const tapAt = async (pt, hops = 3) => { await realDrag(pt, pt, hops); };

  /** 事件序列落账：raw 指针／点击事件 ＋ 本件三条事件，各带「那一刻的真实拿起态」。 */
  const WIRE_TIMELINE = (function () {
    const state = '(function(){var out={};var rs=document.querySelectorAll('
      + JSON.stringify('[' + DRAG_SORT_ATTR + ']') + ');'
      + 'for(var i=0;i<rs.length;i+=1){out[rs[i].getAttribute(' + JSON.stringify(DRAG_SORT_ATTR) + ')]='
      + 'rs[i].getAttribute(' + JSON.stringify(DRAG_SORT_LIFT_ATTR) + ');}return out;})()';
    const raw = ['pointerdown', 'pointerup', 'click'].map((n) => 'document.addEventListener(' + JSON.stringify(n)
      + ',function(e){window.__tl.push({name:' + JSON.stringify(n) + ',at:Math.round(e.timeStamp),state:' + state + '});},true);').join('');
    const own = [DRAG_SORT_EVENT_PICK, DRAG_SORT_EVENT_DROP, DRAG_SORT_EVENT_CANCEL].map((n) =>
      'document.addEventListener(' + JSON.stringify(n) + ',function(e){window.__tl.push({name:' + JSON.stringify(n)
      + ',state:' + state + ',detail:e.detail,root:e.target.getAttribute(' + JSON.stringify(DRAG_SORT_ATTR) + ')});});').join('');
    return 'window.__tl=[];' + raw + own + 'true';
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
    await p.at(fixture('paper', PLAIN, true));
    await p.ev(WIRE_TIMELINE);
    await tapAt(await pointOf(HANDLE_SEL('s3')));
    const tl = await p.ev('window.__tl.map(function(o){return o.name;})');
    const st = await p.ev(STATE);
    console.log('drag-sort 真指针拿起时序 ' + JSON.stringify({ tl, state: st }));
    assert.deepEqual(tl, ['pointerdown', 'pointerup', DRAG_SORT_EVENT_PICK, 'click'],
      '真指针点一下的事件序列（浏览器自己合成 click）：' + JSON.stringify(tl));
    assert.equal(st.lift, 's3', '点一下就要拿起（真指针通路坏了这里就是 null）');
    assert.equal(st.slot, true, '空槽要在屏上');
    assert.equal(st.line, true, '落点线要在屏上');
    assert.equal(st.cancelHidden, false, '取消键要露着');
    assert.equal(tl.includes(DRAG_SORT_EVENT_CANCEL), false, '同一手势里不许冒出取消');
  });

  it('**合成指针序列**（dispatchEvent 完整序列）：一样拿得起来——`element.click()` 替不了这一条', async () => {
    await p.at(fixture('paper', PLAIN, true));
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
    await p.at(fixture('paper', PLAIN, true));
    await p.ev(WIRE_TIMELINE);
    await tapAt(await pointOf(HANDLE_SEL('s3')));
    assert.equal((await p.ev(STATE)).lift, 's3', '先拿起 s3');
    await tapAt(await pointOf(NAMES_CELL('s5')));
    const st = await p.ev(STATE);
    const cell = await p.ev('(function(){var b=document.querySelector(' + JSON.stringify(NAMES_CELL('s5'))
      + ').getBoundingClientRect();return {w:Math.round(b.width),h:Math.round(b.height)};})()');
    console.log('drag-sort 真指针放下读数 ' + JSON.stringify({ state: st, evts: st.evts, cell }));
    assert.deepEqual(st.keys, ['s1', 's2', 's4', 's3', 's5'], '点名称格就放下：' + JSON.stringify(st.keys));
    assert.equal(st.lift, null, '拿起态收掉');
    assert.equal(st.slot, false, '空槽撤掉');
    assert.equal(st.line, false, '落点线撤掉');
    assert.equal(st.evts[st.evts.length - 1].type, DRAG_SORT_EVENT_DROP, '最后一条是放下');
    assert.deepEqual(st.evts[st.evts.length - 1].detail,
      { id: 'steps-dinner', keys: ['s1', 's2', 's4', 's3', 's5'], from: 3, to: 4 },
      '放下读数与既有的合成点击那条一致');
  });

  it('**真指针点原位空槽也落**（空槽就是原位：点它＝放回原位）', async () => {
    await p.at(fixture('paper', PLAIN, true));
    await tapAt(await pointOf(HANDLE_SEL('s3')));
    assert.equal((await p.ev(STATE)).lift, 's3', '先拿起 s3');
    await tapAt(await pointOf(SLOT_SEL));
    const st = await p.ev(STATE);
    console.log('drag-sort 点空槽读数 ' + JSON.stringify({ keys: st.keys, lift: st.lift, evts: st.evts }));
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
    await p.at(fixture('paper', two('a') + two('b'), true));
    await p.ev(WIRE_TIMELINE);
    const stateTxt = '(function(){return [].slice.call(document.querySelectorAll('
      + JSON.stringify('[' + DRAG_SORT_ATTR + ']') + ')).map(function(r){return {'
      + 'id:r.getAttribute(' + JSON.stringify(DRAG_SORT_ATTR) + '),'
      + 'lift:r.getAttribute(' + JSON.stringify(DRAG_SORT_LIFT_ATTR) + '),'
      + 'slot:!!r.querySelector(' + JSON.stringify(SLOT_SEL) + '),'
      + 'line:!!r.querySelector(' + JSON.stringify(LINE_SEL) + '),'
      + 'cancelShown:!r.querySelector(' + JSON.stringify('.' + dragSortSlot('cancel'))
      + ').hasAttribute("hidden")};});})()';
    await tapAt(await pointOf('[data-blk="a"] ' + HANDLE_SEL('s2')));
    const one = await p.ev(stateTxt);
    console.log('drag-sort 跨实例读数（A 拿起） ' + JSON.stringify(one));
    assert.deepEqual(one, [{ id: 'list-a', lift: 's2', slot: true, line: true, cancelShown: true },
      { id: 'list-b', lift: null, slot: false, line: false, cancelShown: false }], 'A 拿起后只有 A 挂拿起态');
    await tapAt(await pointOf('[data-blk="b"] ' + HANDLE_SEL('s4')));
    const both = await p.ev(stateTxt);
    console.log('drag-sort 跨实例读数（B 再拿起） ' + JSON.stringify(both));
    assert.equal(both.filter((r) => r.lift !== null).length, 1, '全页只许一块挂拿起态：' + JSON.stringify(both));
    assert.deepEqual(both, [{ id: 'list-a', lift: null, slot: false, line: false, cancelShown: false },
      { id: 'list-b', lift: 's4', slot: true, line: true, cancelShown: true }], 'B 拿起、A 那块被收掉');
  });

  it('**同 id 两张互不串**：从第一张拿起、拖到第二张上面松手，第一张落账、两块都收干净', async () => {
    const once = renderDragSort({ id: 'steps-dup', title: '第一张', items: ITEMS });
    const twice = renderDragSort({ id: 'steps-dup', title: '第二张', items: ITEMS });
    await p.at(fixture('paper', once + twice, true));
    await p.ev('window.__drop=[];document.addEventListener(' + JSON.stringify(DRAG_SORT_EVENT_DROP)
      + ',function(e){window.__drop.push(e.detail.keys);});true');
    const h3 = await p.ev('(function(){var rs=document.querySelectorAll('
      + JSON.stringify('[' + DRAG_SORT_ATTR + ']') + ');'
      + 'var b=rs[0].querySelector(' + JSON.stringify(HANDLE_SEL('s3')) + ').getBoundingClientRect();'
      + 'return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()');
    const other = await p.ev('(function(){var rs=document.querySelectorAll('
      + JSON.stringify('[' + DRAG_SORT_ATTR + ']') + ');'
      + 'var b=rs[1].querySelector(' + JSON.stringify('[' + DRAG_SORT_KEY_ATTR + '="s4"]') + ').getBoundingClientRect();'
      + 'return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()');
    await realDrag(h3, other);
    const st = await p.ev('(function(){var rs=document.querySelectorAll('
      + JSON.stringify('[' + DRAG_SORT_ATTR + ']') + ');return [].slice.call(rs).map(function(r){return {'
      + 'lift:r.getAttribute(' + JSON.stringify(DRAG_SORT_LIFT_ATTR) + '),'
      + 'slot:!!r.querySelector(' + JSON.stringify(SLOT_SEL) + '),'
      + 'keys:[].slice.call(r.querySelectorAll(' + JSON.stringify('[' + DRAG_SORT_KEY_ATTR + ']') + ')).map(function(x){'
      + 'return x.getAttribute(' + JSON.stringify(DRAG_SORT_KEY_ATTR) + ');})};});})()');
    const droppedKeys = await p.ev('window.__drop');
    console.log('drag-sort 同 id 两实例读数 ' + JSON.stringify({ st, droppedKeys }));
    assert.equal(st[0].lift, null, '第一张的拿起态必须收掉（不许挂死在屏上）');
    assert.equal(st[0].slot, false, '第一张的空槽撤掉');
    assert.equal(st[1].lift, null, '第二张不许被拿起');
    assert.deepEqual(st[1].keys, ['s1', 's2', 's3', 's4', 's5'], '第二张的顺序不许动');
    assert.deepEqual(st[0].keys, ['s3', 's1', 's2', 's4', 's5'], '第一张按「拖到那一行前面」落账（拖到 s4 前）');
    assert.equal(droppedKeys.length, 1, '放下这一次只报一条：' + JSON.stringify(droppedKeys));
  });

  it('关页', () => { p.close(); });
});
