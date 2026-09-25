/** kanban-columns（看板列 · 形态 status「按状态分列」）· 契约测试。
 *
 * 覆盖四类判据（工艺书 §6）＋ 皮肤与分隔符纪律：
 *  ① **渲染契约**：骨架（分段切换 ＋ 列区 ＋ 状态句 ＋ 脚注）／每列的列头（名 ＋ 计数 ＋ 用途 ＋ 加键）
 *    与列身（卡或空槽 ＋ 收纳键）／卡上那枚状态（记号 ＋ 列名）／空列是合法态／
 *    选中态（卡站起来 ＋ 其余各列的落点线与可点的收纳键 ＋ 取消键）／转义面／**全部**非法入参分支
 *    （每个都断 `BlocksError`；含**全空白串**、**入参表以外的键**、稀疏数组）／纯函数／分隔符门；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且只出现一次、
 *    零 `:root`／`!important`／零新 token／零视口宽度查询／容器查询自己声明了容器／
 *    零省略手段（`text-overflow`／`line-clamp`／`nowrap`：列名与计数永不截断）／
 *    几何事实取常量（44／56／8／600）／状态不只靠颜色（形 ＋ 字 ＋ 色）／
 *    零手写色值、源码级零手写 `var(--ilife-…)`、不拿 `ink` 系当面／
 *    零键盘语汇（方向键那一路）／`dist/components/kanban-columns/**` 剥字面量后零 DOM／
 *    运行时段是产出的文本（IIFE、幂等、无 `innerHTML`、点选是唯一通路）；
 *  ③ **加法式**：不启用它的页面零命中、逐字节不变；渲染本件不改别件产物；前缀透传；
 *    同一份入参渲染四次逐字节相同，且标记不带皮肤类；
 *  ④ **四档几何（真机 headless Chrome ＋ CDP，容器宽 320／390／620／1280）**：
 *    零横向溢出、列名与计数零截断、每枚可点件 ≥44×44、卡 ≥56 高、卡间缝 ≥8px、
 *    窄档一列一屏（分段切换出来）、宽档几列并排（切换整条不出）、空列的空槽一直在；
 *    **起不来就退确定性几何判据并打印原因**；
 *  ⑤ **行为（真机）**：拿起（点卡 → 选中态 ＋ 收纳键启用 ＋ `pick` 事件）／
 *    挪动（点目标列的收纳键 → 卡真挪过去 ＋ 两端计数与卡上那枚状态重写 ＋ `move` 事件）／
 *    挪空一列（源列当场补出空槽）／取消（点取消键／再点同一张卡 → 卡原样不动 ＋ `cancel` 事件）；
 *    四套皮肤下标记逐字节相同。
 *
 * 期望值一律从组件自己的常量派生（`KANBAN_COLUMNS_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  KANBAN_COLUMNS_ADD_ATTR,
  KANBAN_COLUMNS_ATTR,
  KANBAN_COLUMNS_BOUND_ATTR,
  KANBAN_COLUMNS_CANCEL_ATTR,
  KANBAN_COLUMNS_CARD_ATTR,
  KANBAN_COLUMNS_CARD_MIN_PX,
  KANBAN_COLUMNS_CLASS,
  KANBAN_COLUMNS_COL_ATTR,
  KANBAN_COLUMNS_CONTAINER,
  KANBAN_COLUMNS_EVENT_ADD,
  KANBAN_COLUMNS_EVENT_CANCEL,
  KANBAN_COLUMNS_EVENT_MOVE,
  KANBAN_COLUMNS_EVENT_PICK,
  KANBAN_COLUMNS_FORMS,
  KANBAN_COLUMNS_GAP_PX,
  KANBAN_COLUMNS_HOVER_QUERY,
  KANBAN_COLUMNS_MARKS,
  KANBAN_COLUMNS_MAX_CARDS,
  KANBAN_COLUMNS_MAX_COLS,
  KANBAN_COLUMNS_MIN_COLS,
  KANBAN_COLUMNS_NARROW_PX,
  KANBAN_COLUMNS_PICK_ATTR,
  KANBAN_COLUMNS_RECEIVE_ATTR,
  KANBAN_COLUMNS_SEG_ATTR,
  KANBAN_COLUMNS_SHOW_ATTR,
  KANBAN_COLUMNS_SLOTS,
  KANBAN_COLUMNS_STATE_ATTR,
  KANBAN_COLUMNS_STATUS_ATTR,
  KANBAN_COLUMNS_TEXT,
  KANBAN_COLUMNS_TOUCH_PX,
  buildKanbanColumnsJs,
  kanbanAddLabel,
  kanbanColumnsCss,
  kanbanColumnsSlot,
  kanbanCountText,
  kanbanDropText,
  kanbanReceiveText,
  kanbanStatusText,
  renderKanbanColumns,
} from '../dist/components/kanban-columns/index.js';
import { renderPageHead } from '../dist/components/page-head/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { skinClass, skinCss, skinVar } from '../dist/components/skin/index.js';
import { SKIN_NAMES } from '../dist/components/skin/contract.js';
import { auditHtml, exitCodeFor } from './separator-probe.mjs';
import { styleSource } from './_style-sources.mjs';
import { selectorsOf, startBrowser, stripComments, throwsBlocks } from './overlay-probe.mjs';
import { startShapesPage } from './shapes-probe.mjs';
import * as root from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'kanban-columns');
const SLOT = (s) => kanbanColumnsSlot(s);
const q = (s) => JSON.stringify(s);
const countOf = (html, needle) => (html.match(new RegExp(needle, 'g')) || []).length;
/** 本件的样式源码：经 `_style-sources.mjs` 取该件全部 `style*.ts`（拆出去的那半也在扫面里）。 */
const STYLE_SRC = styleSource('kanban-columns');
/** 槽位类名（在**标记串**上找它用它：产物里写的是 `class="…-slot"`，**没有那个点**）。 */
const CLS = (slot) => SLOT(slot);
/** 槽位选择器（在**页内查元素**用它；判据侧拼选择器一律经这两个助手，不另抄字面量）。 */
const SEL = (slot) => '.' + SLOT(slot);

/* ── 两份真实形状的入参（这一顿做哪几道；一份 plain、一份选中态） ────── */

const COLUMNS = [
  {
    key: 'todo',
    name: '想做',
    purpose: '待做的菜',
    unit: '道',
    cards: [
      { key: 'c-dumpling', title: '韭菜盒子', meta: '40 分钟，面点' },
      { key: 'c-soup', title: '番茄蛋汤', meta: '10 分钟，汤' },
    ],
  },
  {
    key: 'doing',
    name: '在做',
    purpose: '锅里正热着',
    unit: '道',
    cards: [{ key: 'c-braise', title: '红烧肉', meta: '90 分钟，主菜' }],
  },
  { key: 'done', name: '做过了', purpose: '这一顿出过的', unit: '道', cards: [] },
];
const PLAIN = { id: 'kanban-dinner', columns: COLUMNS };
const PICKED = { ...PLAIN, pickedKey: 'c-soup' };
/** 一份最小的合法入参（非法入参分支都从它改一处）。 */
const OK = {
  id: 'ok-board',
  columns: [
    { key: 'a', name: '列甲', cards: [{ key: 'k1', title: '一' }] },
    { key: 'b', name: '列乙', cards: [] },
  ],
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('kanban-columns ① 渲染契约 · 骨架与列', () => {
  const html = renderKanbanColumns(PLAIN);

  it('根 ＋ 分段切换 ＋ 列区 ＋ 状态句 ＋ 脚注；形态键是英文骨架名（不是格号 A）', () => {
    assert.deepEqual([...KANBAN_COLUMNS_FORMS], ['status'], '形态闭集只落地按状态分列，键名是骨架名');
    assert.match(html, new RegExp('^<div class="' + KANBAN_COLUMNS_CLASS + ' is-status"'));
    assert.ok(html.includes(KANBAN_COLUMNS_ATTR + '="kanban-dinner"'), '根上要有本件的发现锚');
    assert.ok(html.includes(CLS('switch')) && html.includes('role="group"'), '窄档的分段切换要在标记里');
    assert.ok(html.includes(KANBAN_COLUMNS_SHOW_ATTR + '="1"'), '窄档当前列有读数');
    assert.ok(html.includes(CLS('cols') + ' is-n3'), '列区照实写出列数');
    assert.ok(html.includes(CLS('status')) && html.includes('role="status"'), '状态句是活的');
    assert.ok(html.includes(KANBAN_COLUMNS_STATUS_ATTR + '="kanban-dinner"'), '状态句带本件的锚');
    assert.ok(html.includes(kanbanStatusText(null)), 'plain 态的状态句是真读数');
    assert.ok(html.includes(CLS('hint')) && html.includes(KANBAN_COLUMNS_TEXT.hint), '脚注写的是那一句拿法');
  });

  it('每列＝列头（名 ＋ 计数 ＋ 用途 ＋ 加键）＋ 列身（卡或空槽 ＋ 收纳键）；顺序＝入参顺序', () => {
    const keys = [...html.matchAll(new RegExp(KANBAN_COLUMNS_COL_ATTR + '="([^"]+)"', 'g'))].map((m) => m[1]);
    assert.deepEqual(keys, ['todo', 'doing', 'done'], '屏上顺序＝入参顺序');
    COLUMNS.forEach((col, i) => {
      assert.ok(html.includes('>' + col.name + '<'), '列名上屏：' + col.name);
      assert.ok(html.includes(kanbanCountText(col.cards.length, col.unit)), '计数上屏：' + col.name);
      assert.ok(html.includes('>' + col.purpose + '<'), '用途那一句上屏：' + col.name);
      assert.ok(html.includes(KANBAN_COLUMNS_ADD_ATTR + '="' + col.key + '"'), '每列一枚加键：' + col.key);
      assert.ok(html.includes('aria-label="' + kanbanAddLabel(col.name) + '"'), '加键要有无障碍名：' + col.name);
      assert.ok(html.includes(kanbanReceiveText(col.name)), '每列一枚收纳键：' + col.name);
      assert.ok(html.includes('aria-label="' + col.name + ' ' + kanbanCountText(col.cards.length, col.unit) + '"'),
        '列要报出「叫什么 ＋ 几件」：' + col.name);
      /* 每张卡都带着它那一列的记号（形）与列名（字）：空列没有卡，自然就没有记号。 */
      assert.equal(countOf(html, '>' + KANBAN_COLUMNS_MARKS[i % KANBAN_COLUMNS_MARKS.length] + '</i>' + col.name),
        col.cards.length, '每一张卡都要带上它那一列的记号与列名：' + col.name);
    });
    const cardKeys = [...html.matchAll(new RegExp(KANBAN_COLUMNS_CARD_ATTR + '="([^"]+)"', 'g'))].map((m) => m[1]);
    assert.deepEqual(cardKeys, ['c-dumpling', 'c-soup', 'c-braise'], '卡按列序 ＋ 列内序上屏');
    assert.equal(countOf(html, '<button'), 12, '三张卡 ＋ 三枚加键 ＋ 三段切换 ＋ 三枚收纳键，不许再多');
    assert.equal(countOf(html, '<button'), countOf(html, '</button>'), '按钮必须成对');
    assert.equal(/<script|onclick=/i.test(html), false, '标记里不带脚本');
  });

  it('空列是合法态：出空槽两句话（列头与计数一个不少）', () => {
    const done = html.slice(html.indexOf(KANBAN_COLUMNS_COL_ATTR + '="done"'));
    assert.ok(done.includes(CLS('slot')), '空列出空槽');
    assert.ok(done.includes(KANBAN_COLUMNS_TEXT.emptyTitle), '空槽要说清这一列空着');
    assert.ok(done.includes(KANBAN_COLUMNS_TEXT.emptyNote), '空槽要说清空着也保留列头与计数');
    assert.ok(done.includes(kanbanCountText(0, '道')), '空列的计数照实写 0');
    assert.ok(done.includes('>做过了<'), '空列的列名照常在');
  });

  it('卡上那枚状态＝记号（形）＋ 列名（字）：不只靠列位置，也不只靠颜色', () => {
    for (const [i, col] of COLUMNS.entries()) {
      for (const card of col.cards) {
        const at = html.indexOf(KANBAN_COLUMNS_CARD_ATTR + '="' + card.key + '"');
        const open = html.lastIndexOf('<button', at);
        const one = html.slice(open, html.indexOf('</button>', at) + 9);
        assert.ok(one.includes(KANBAN_COLUMNS_STATE_ATTR + '="' + col.key + '"'), '卡上写出它在哪一列：' + card.key);
        assert.ok(one.includes(CLS('badge')), '卡上那枚状态在：' + card.key);
        assert.ok(one.includes('>' + KANBAN_COLUMNS_MARKS[i % KANBAN_COLUMNS_MARKS.length] + '</i>' + col.name),
          '记号 ＋ 列名两样都上屏：' + card.key);
        assert.ok(one.includes('>' + card.title + '<'), '卡标题上屏：' + card.key);
        assert.ok(one.includes('>' + card.meta + '<'), '卡副语上屏：' + card.key);
        assert.equal(countOf(one, '<button'), 1, '一张卡就是一颗按钮，卡里没有第二颗：' + card.key);
      }
    }
  });

  it('plain 态：收纳键整排 `disabled`（不是藏起来）；没有落点线、没有取消键', () => {
    assert.equal(html.includes(KANBAN_COLUMNS_PICK_ATTR), false, '根上不挂选中态');
    assert.equal(html.includes(CLS('drop')), false, '没有落点线');
    assert.equal(html.includes(KANBAN_COLUMNS_CANCEL_ATTR), false, '没选中时没有取消键');
    assert.equal(countOf(html, ' disabled>'), COLUMNS.length, '三枚收纳键都按不动（还在，别藏）');
    assert.equal(countOf(html, 'aria-pressed="false"'), COLUMNS.length - 1 + COLUMNS.length,
      '没选中的那两段切换 ＋ 三张卡都是未选中（当前那一段是 `true`）');
  });

  it('选中态：卡站起来 ＋ 其余各列出落点线与可点的收纳键 ＋ 取消键露出来 ＋ 状态句是真读数', () => {
    const one = renderKanbanColumns(PICKED);
    assert.ok(one.includes(KANBAN_COLUMNS_PICK_ATTR + '="c-soup"'), '根上写清选中了谁');
    const at = one.indexOf(KANBAN_COLUMNS_CARD_ATTR + '="c-soup"');
    const oneCard = one.slice(at - 100, at + 200);
    assert.ok(oneCard.includes('is-picked'), '选中的那张卡站起来');
    assert.ok(oneCard.includes('aria-pressed="true"'), '选中的那张卡是按下态');
    assert.ok(one.includes(KANBAN_COLUMNS_CANCEL_ATTR + '="kanban-dinner"'), '取消键带本件的锚');
    assert.ok(one.includes('>' + KANBAN_COLUMNS_TEXT.cancel + '<'), '取消键写的是那四个字');
    assert.ok(one.includes(kanbanStatusText('番茄蛋汤')), '状态句写出选中了谁、下一步点哪儿');
    assert.equal(countOf(one, CLS('drop')), COLUMNS.length - 1, '选中卡所在列之外，每列一条落点线');
    assert.ok(one.includes(kanbanDropText('在做')), '落点线把列名写出来');
    const todo = one.slice(one.indexOf(KANBAN_COLUMNS_COL_ATTR + '="todo"'), one.indexOf(KANBAN_COLUMNS_COL_ATTR + '="doing"'));
    assert.equal(todo.includes(CLS('drop')), false, '选中卡所在列不画落点线（它就是原位）');
    const receives = [...one.matchAll(new RegExp('<button type="button" class="' + SLOT('receive')
      + '" ' + KANBAN_COLUMNS_RECEIVE_ATTR + '="([^"]+)"( disabled)?>', 'g'))].map((m) => ({ key: m[1], off: m[2] !== undefined }));
    assert.deepEqual(receives, [
      { key: 'todo', off: true }, { key: 'doing', off: false }, { key: 'done', off: false },
    ], '选中卡所在列那一枚按不动，其余各列可点（看得见的备选通路）');
  });

  it('转义面：id／列名／用途／单位／卡标题／卡副语逐位转义', () => {
    const evil = '"><script>alert(1)</script>';
    const one = renderKanbanColumns({
      id: 'evil-one',
      columns: [
        { key: 'a', name: evil, purpose: evil, unit: evil, cards: [{ key: 'k', title: evil, meta: evil }] },
        { key: 'b', name: 'B', cards: [] },
      ],
    });
    assert.equal(/<script/i.test(one), false, '不得出现可执行脚本标签');
    assert.ok(one.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(one.includes('&quot;'), '引号转义');
  });

  it('分隔符门：样例渲染的可见文本零命中（R1 ·／R2 ；／R3 并列顿号）', () => {
    const readme = readFileSync(join(DIR, 'README.md'), 'utf8');
    const blocks = [...readme.matchAll(/```json 示例入参\n([\s\S]*?)```/g)].map((m) => m[1]);
    for (const sample of [PLAIN, PICKED, JSON.parse(blocks[0])]) {
      const r = auditHtml('<html><body>' + renderKanbanColumns(sample) + '</body></html>');
      assert.equal(exitCodeFor(r), 0, '分隔符命中：' + JSON.stringify(r.node.hits.slice(0, 2)));
    }
  });

  it('入参违规一律拒（不静默降级）：逐条断 `BlocksError`', () => {
    const B = (input) => throwsBlocks(() => renderKanbanColumns(input));
    assert.equal(B(undefined), true, '非对象');
    assert.equal(B(null), true);
    assert.equal(B([]), true, '数组不是入参');
    assert.equal(B({ columns: OK.columns }), true, '缺 id');
    assert.equal(B({ ...OK, id: '' }), true, '空 id');
    assert.equal(B({ ...OK, id: 'a b' }), true, 'id 里有空格');
    assert.equal(B({ ...OK, id: '看板一' }), true, 'id 里有非标识符字符');
    assert.equal(B({ id: 'x' }), true, '缺 columns');
    assert.equal(B({ ...OK, columns: 'x' }), true, 'columns 不是数组');
    assert.equal(B({ ...OK, columns: [] }), true, '0 列');
    assert.equal(B({ ...OK, columns: [OK.columns[0]] }), true, KANBAN_COLUMNS_MIN_COLS + ' 列不到（1 列谈不上看板）');
    assert.equal(B({
      ...OK,
      columns: Array.from({ length: KANBAN_COLUMNS_MAX_COLS + 1 }, (_, i) => ({ key: 'k' + i, name: '列' + i, cards: [] })),
    }), true, '超过 ' + KANBAN_COLUMNS_MAX_COLS + ' 列');
    assert.equal(B({ ...OK, columns: [null, OK.columns[1]] }), true, '列不是对象');
    assert.equal(B({ ...OK, columns: [{ name: '列甲', cards: [] }, OK.columns[1]] }), true, '缺列 key');
    assert.equal(B({ ...OK, columns: [{ key: 'same', name: '甲', cards: [] }, { key: 'same', name: '乙', cards: [] }] }), true,
      '列 key 看板内唯一');
    assert.equal(B({ ...OK, columns: [{ key: 'a', cards: [] }, OK.columns[1]] }), true, '缺列名');
    assert.equal(B({ ...OK, columns: [{ key: 'a', name: '甲' }, OK.columns[1]] }), true, '缺 cards（空列请显式给 []）');
    assert.equal(B({ ...OK, columns: [{ key: 'a', name: '甲', cards: 'x' }, OK.columns[1]] }), true, 'cards 不是数组');
    assert.equal(B({
      ...OK,
      columns: [{ key: 'a', name: '甲', cards: Array.from({ length: KANBAN_COLUMNS_MAX_CARDS + 1 }, (_, i) => ({ key: 'c' + i, title: 'T' })) }, OK.columns[1]],
    }), true, '一列超过 ' + KANBAN_COLUMNS_MAX_CARDS + ' 张');
    assert.equal(B({ ...OK, columns: [{ key: 'a', name: '甲', cards: [null] }, OK.columns[1]] }), true, '卡不是对象');
    assert.equal(B({ ...OK, columns: [{ key: 'a', name: '甲', cards: [{ title: 'T' }] }, OK.columns[1]] }), true, '缺卡 key');
    assert.equal(B({
      ...OK,
      columns: [{ key: 'a', name: '甲', cards: [{ key: 'k1', title: 'T' }, { key: 'k1', title: 'U' }] }, OK.columns[1]],
    }), true, '卡 key 看板内唯一');
    assert.equal(B({ ...OK, columns: [{ key: 'a', name: '甲', cards: [{ key: 'a', title: 'T' }] }, OK.columns[1]] }), true,
      '卡 key 与列 key 也不许撞（同一个 data-* 值域）');
    assert.equal(B({ ...OK, columns: [{ key: 'a', name: '甲', cards: [{ key: 'k1' }] }, OK.columns[1]] }), true, '缺卡标题');
    assert.equal(B({ ...OK, columns: [{ key: 'a', name: '甲', cards: [{ key: 'k1', title: 'T', meta: 1 }] }, OK.columns[1]] }), true,
      '卡副语不是字符串');
    assert.equal(B({ ...OK, pickedKey: 'nope' }), true, '选中态指着没有的卡');
    assert.equal(B({ ...OK, pickedKey: 1 }), true, 'pickedKey 不是字符串');
    assert.equal(B({ ...OK, pickedKey: '' }), true, 'pickedKey 是空串');
    assert.equal(B({ ...OK, activeCol: 0 }), true, '窄档当前列从 1 起');
    assert.equal(B({ ...OK, activeCol: 3 }), true, '窄档当前列不许超出列数');
    assert.equal(B({ ...OK, activeCol: 1.5 }), true, '窄档当前列必须是整数');
    assert.equal(B({ ...OK, activeCol: ' 1' }), true, '窄档当前列不是数字');
    assert.equal(B({ ...OK, form: 'A' }), true, '形态闭集外（格号不是键）');
    assert.equal(B({ ...OK, columns: [{ key: 'a', name: '甲', unit: 1, cards: [] }, OK.columns[1]] }), true, '单位不是字符串');
    assert.equal(B({ ...OK, columns: [{ key: 'a', name: '甲', purpose: 1, cards: [] }, OK.columns[1]] }), true, '用途不是字符串');
    assert.equal(B({ ...OK, extraClass: 'a"b' }), true, '附加类名过不了类名正则');
    assert.equal(B({ ...OK, extraClass: 'ok-class other' }), false, '合法附加类名照收');
    assert.equal(B({ ...OK, pickedKey: undefined, activeCol: undefined }), false, '入参表里的键给 undefined 按未给算');
    const sparse = [{ key: 'a', name: '甲', cards: [] }, { key: 'b', name: '乙', cards: [] }];
    sparse.length = 3;
    assert.equal(B({ ...OK, columns: sparse }), true, '稀疏数组（空洞）');
    const sparseCards = [{ key: 'k1', title: 'T' }];
    sparseCards.length = 2;
    assert.equal(B({ ...OK, columns: [{ key: 'a', name: '甲', cards: sparseCards }, OK.columns[1]] }), true, '卡数组有空洞');
  });

  it('**全空白串＝拒**（上屏文本五类）：收下会在屏上留一块空白', () => {
    const blanks = [
      ['列名（收下 ⇒ 无字列头）', (b) => [{ key: 'a', name: b, cards: [] }, OK.columns[1]]],
      ['用途（收下 ⇒ 空白第二级字）', (b) => [{ key: 'a', name: '甲', purpose: b, cards: [] }, OK.columns[1]]],
      ['单位（收下 ⇒ 计数只剩一个数）', (b) => [{ key: 'a', name: '甲', unit: b, cards: [] }, OK.columns[1]]],
      ['卡标题（收下 ⇒ 空壳卡）', (b) => [{ key: 'a', name: '甲', cards: [{ key: 'k1', title: b }] }, OK.columns[1]]],
      ['卡副语', (b) => [{ key: 'a', name: '甲', cards: [{ key: 'k1', title: 'T', meta: b }] }, OK.columns[1]]],
    ];
    for (const [what, patch] of blanks) {
      for (const blank of ['   ', '\t', '　', ' 　 ']) {
        assert.equal(throwsBlocks(() => renderKanbanColumns({ ...OK, columns: patch(blank) })), true,
          what + ' 收到全空白串（' + JSON.stringify(blank) + '）必须拒');
      }
    }
    const empty = { ...OK, columns: [
      { key: 'a', name: '甲', purpose: '', unit: '', cards: [{ key: 'k1', title: 'T', meta: '' }] }, OK.columns[1],
    ] };
    assert.equal(throwsBlocks(() => renderKanbanColumns(empty)), false, '空串＝未给（用途与单位走缺省，副语就不出）');
    const one = renderKanbanColumns(empty);
    assert.ok(one.includes(kanbanCountText(1, KANBAN_COLUMNS_TEXT.unit)), '单位空串时走缺省那一枚');
    assert.equal(one.includes(CLS('purpose')), false, '用途空串时不画那一格（不留空白）');
  });

  it('**入参表以外的键＝拒**（顶层与列内、卡内三处）', () => {
    const B = (input) => throwsBlocks(() => renderKanbanColumns(input));
    assert.equal(B({ ...OK, bogus: 1 }), true, '顶层多给一个键');
    assert.equal(B({ ...OK, title: '打错名' }), true, '顶层写错键名');
    assert.equal(B({ ...OK, columns: [{ ...OK.columns[0], bogus: 1 }, OK.columns[1]] }), true, '列内多给一个键');
    assert.equal(B({ ...OK, columns: [{ ...OK.columns[0], cards: [{ ...OK.columns[0].cards[0], bogus: 1 }] }, OK.columns[1]] }), true,
      '卡内多给一个键');
    assert.equal(B({ ...OK, columns: [{ ...OK.columns[0], count: '2 件' }, OK.columns[1]] }), true, '计数是算出来的，入参不许给');
  });

  it('纯函数：同样的入参恒产同样的字节；README 示例入参直渲成功', () => {
    assert.equal(renderKanbanColumns(PLAIN), renderKanbanColumns(PLAIN));
    assert.equal(renderKanbanColumns(PICKED), renderKanbanColumns(PICKED));
    const readme = readFileSync(join(DIR, 'README.md'), 'utf8');
    const blocks = [...readme.matchAll(/```json 示例入参\n([\s\S]*?)```/g)].map((m) => m[1]);
    assert.equal(blocks.length, 1, 'README 里恰好一块显式示例入参（信息串带「示例入参」四字）');
    const sample = JSON.parse(blocks[0]);
    assert.equal(typeof sample === 'object' && sample !== null && !Array.isArray(sample), true, '示例是合法 JSON 对象');
    const one = renderKanbanColumns(sample);
    assert.ok(one.includes(KANBAN_COLUMNS_ATTR + '="kanban-dinner"'), '示例的 id 上屏');
    assert.ok(one.includes(CLS('drop')) && one.includes(KANBAN_COLUMNS_CANCEL_ATTR), '示例渲染出选中态（落点线与取消键都在）');
    assert.ok(one.includes(CLS('slot')), '示例里那一列空的照常出空槽');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('kanban-columns ② 样式与零 DOM 纪律', () => {
  const css = kanbanColumnsCss();
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
        assert.ok(one.includes(KANBAN_COLUMNS_CLASS), '选择器必须只碰本件类名根：' + one);
        assert.equal((one.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次（拼两遍＝永不命中的死规则）：' + one);
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零视口宽度查询／容器查询自己声明了容器', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(/'@media \((?:max|min)-width/.test(css), false, '本件不判视口宽度（件宽 ≠ 视口宽）');
    assert.ok(clean.includes('@container ' + KANBAN_COLUMNS_CONTAINER + ' (max-width:'), '窄档必须由容器判');
    assert.ok(clean.includes('container-type: inline-size'), '写了 @container 就必须自己声明容器（否则永不生效）');
    assert.ok(clean.includes('container-name: ' + KANBAN_COLUMNS_CONTAINER));
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    assert.ok(clean.includes('@media ' + KANBAN_COLUMNS_HOVER_QUERY), '悬停增强读的是常量里的能力查询串');
    assert.ok(clean.includes('@media (prefers-reduced-motion: reduce)'), '减动效那一档要在');
  });

  it('几何事实写在一处：44／56／8／窄档断点都取常量；列名与计数零省略手段', () => {
    assert.equal(KANBAN_COLUMNS_TOUCH_PX, 44);
    assert.ok(KANBAN_COLUMNS_CARD_MIN_PX >= KANBAN_COLUMNS_TOUCH_PX, '卡高不得低于触控地板');
    assert.equal(KANBAN_COLUMNS_GAP_PX, 8);
    assert.ok(clean.includes('min-height: ' + String(KANBAN_COLUMNS_CARD_MIN_PX) + 'px'), '卡高取常量');
    assert.ok(clean.includes('min-height: ' + String(KANBAN_COLUMNS_TOUCH_PX) + 'px'), '触控地板取常量');
    assert.ok(clean.includes('width: ' + String(KANBAN_COLUMNS_TOUCH_PX) + 'px'), '加键取常量');
    assert.ok(clean.includes('gap: ' + String(KANBAN_COLUMNS_GAP_PX) + 'px'), '卡间那道缝取常量');
    assert.ok(clean.includes('max-width: ' + String(KANBAN_COLUMNS_NARROW_PX) + 'px'), '窄档断点取常量');
    assert.equal(clean.includes('text-overflow'), false, '不许出现省略截断');
    assert.equal(clean.includes('line-clamp'), false, '不许多行截断');
    assert.equal(clean.includes('nowrap'), false, '列名与计数永不截断：连 `nowrap` 都不许');
    assert.equal(clean.includes('overflow-x'), false, '不许藏横滑');
    assert.equal(clean.includes('cursor: not-allowed'), true, '按不动的收纳键要说得出');
    assert.ok(clean.includes(':focus-visible'), '`:focus-visible` 必须有（真实键盘用户的地板）');
  });

  it('状态不只靠颜色：形（位移／虚线／实线／记号）＋ 字（状态句／计数／列名）＋ 色（软底）', () => {
    assert.ok(clean.includes('is-picked'), '选中的卡有一档自己的形');
    assert.ok(clean.includes('translateY(-2px)'), '选中的卡自己站起来（往上挪 2px）');
    assert.ok(new RegExp(SLOT('slot') + '\\s*\\{[^}]*dashed').test(clean), '空槽是虚线框（形）');
    assert.ok(new RegExp(SLOT('drop') + '\\s*\\{[^}]*border-left: 3px solid').test(clean), '落点线 3px 实线（形）');
    assert.ok(clean.includes('accent-soft'), '强调那一档走软底（实底上不写正文级小字）');
    assert.ok(clean.includes('accent-text'), '软底上的字走强调色的文本档');
    assert.ok(KANBAN_COLUMNS_MARKS.length >= 3, '每列一枚记号（形）至少三样才分得开');
    assert.equal(new Set(KANBAN_COLUMNS_MARKS).size, KANBAN_COLUMNS_MARKS.length, '记号不许重样');
    const four = renderKanbanColumns({
      id: 'four-cols',
      columns: KANBAN_COLUMNS_MARKS.map((m, i) => ({ key: 'k' + i, name: '列' + m, cards: [] })),
    });
    for (const mark of KANBAN_COLUMNS_MARKS) assert.ok(four.includes(mark), '记号要真的上屏：' + mark);
  });

  it('零手写色值（兜底链那一处除外）、源码级零手写 `var(--ilife-…)`、不拿 ink 系当面', () => {
    const stripVarFns = (text) => {
      let out = '';
      let i = 0;
      while (i < text.length) {
        if (text.startsWith('var(', i)) {
          let depth = 0;
          let j = i + 3;
          for (; j < text.length; j += 1) {
            if (text[j] === '(') depth += 1;
            else if (text[j] === ')') { depth -= 1; if (depth === 0) break; }
          }
          i = j + 1;
          continue;
        }
        out += text[i];
        i += 1;
      }
      return out;
    };
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 200), m.index);
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
    assert.equal(clean.includes('color-mix(in srgb,'), false, '本件不需要淡洗：三档都走整 token');
  });

  it('皮肤读法与常量对得上：每一处 `var(--ilife-…)` 都是 `skinVar(名)` 的逐字产物', () => {
    let n = 0;
    for (const m of clean.matchAll(/var\(\s*--ilife-([a-z0-9-]+)/g)) {
      assert.ok(clean.startsWith(skinVar(m[1]), m.index), '`' + m[1] + '` 处的 var() 串与 skinVar() 走散');
      n += 1;
    }
    assert.ok(n >= 20, '读皮肤的处数不对：' + n);
  });

  it('零键盘语汇（标记与会过屏的字里没有键位提示），也不走指针拖拽那一路', () => {
    const words = ['⌘', '⌥', '⇧', '⌃', 'Esc', 'Tab', '方向键', '快捷键', '键帽', '键盘', '长按', '双击', '按住'];
    const seen = [renderKanbanColumns(PLAIN), renderKanbanColumns(PICKED), stripComments(css), buildKanbanColumnsJs()].join('');
    for (const w of words) assert.equal(seen.includes(w), false, '出现键盘语汇：' + w);
  });

  it('`dist/components/kanban-columns/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'kanban-columns');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 6, '产物不全：' + files.join('、'));
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

  it('运行时段是**产出的文本**：它自己跑得起来（IIFE）、幂等、点选是唯一通路', () => {
    const js = buildKanbanColumnsJs();
    assert.ok(js.startsWith('(function(){'), '是一段可独立注入的 IIFE');
    assert.ok(js.trimEnd().endsWith('}());'));
    assert.ok(js.includes('data-ilife-kanban-runtime'), '幂等开关');
    for (const needle of ['document', 'addEventListener', 'createElement', 'textContent', 'CustomEvent', 'closest']) {
      assert.ok(js.includes(needle), '运行时该用到 ' + needle + '（它在产出的文本里，不在模块代码里）');
    }
    assert.equal(js.includes('innerHTML'), false, '落点线／空槽／取消键用节点拼，不碰 innerHTML');
    assert.equal(js.includes('outerHTML'), false);
    assert.equal(/addEventListener\("key/.test(js), false, '不许把键盘做成通路');
    assert.equal(js.includes('pointerdown'), false, '本件不是拖拽件：通路只有点选');
    assert.equal(js.includes('draggable'), false);
    for (const ev of [KANBAN_COLUMNS_EVENT_PICK, KANBAN_COLUMNS_EVENT_MOVE, KANBAN_COLUMNS_EVENT_CANCEL, KANBAN_COLUMNS_EVENT_ADD]) {
      assert.ok(js.includes(ev), '运行时要派发 ' + ev);
    }
    assert.ok(js.includes('A_BOUND'), '根上要记一枚 bound 读数（幂等的可读痕迹）');
    assert.ok(js.includes(kanbanStatusText(null)), '状态句（没选中那一句）取自渲染期那个函数');
    assert.ok(js.includes(kanbanDropText('\u0001').split('\u0001')[0]), '落点线那句的前半取自渲染期那个函数');
    assert.ok(js.includes(kanbanDropText('\u0001').split('\u0001')[1]), '落点线那句的后半取自渲染期那个函数');
    assert.ok(js.includes(kanbanReceiveText('\u0001').split('\u0001')[0]) === false,
      '收纳键的字不重写（列名不变）：运行时段不必另抄一份');
  });

  it('槽位闭集与类名一致（判据不另抄一份字面量）', () => {
    assert.equal(kanbanColumnsSlot('card'), KANBAN_COLUMNS_CLASS + '-card');
    assert.equal(kanbanColumnsSlot('card', 'x-'), 'x-block-kanban-columns-card');
    for (const slot of KANBAN_COLUMNS_SLOTS) assert.ok(kanbanColumnsSlot(slot).startsWith(KANBAN_COLUMNS_CLASS + '-'));
    const want = ['host', 'switch', 'seg', 'cols', 'col', 'head', 'name', 'count', 'purpose', 'add',
      'body', 'card', 'title', 'meta', 'badge', 'mark', 'drop', 'receive', 'slot', 'status', 'cancel', 'hint'];
    for (const slot of want) assert.ok(KANBAN_COLUMNS_SLOTS.includes(slot), '槽位闭集里少了 ' + slot);
    const html = renderKanbanColumns(PICKED);
    for (const slot of want) assert.ok(html.includes(kanbanColumnsSlot(slot)), '标记里缺槽位：' + slot);
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('kanban-columns ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同；不从根出口出', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(KANBAN_COLUMNS_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
    assert.equal(root.renderKanbanColumns, undefined, '组件层不进根出口');
    assert.equal(root.kanbanColumnsCss, undefined);
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const barBefore = renderScaleBar({ value: 860, goal: 1850 });
    const headBefore = renderPageHead({ skill: '卡路里', title: '今日', reading: { value: '860', unit: '卡' } });
    renderKanbanColumns(PICKED);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), barBefore, '别件的产物逐字节不变');
    assert.equal(renderPageHead({ skill: '卡路里', title: '今日', reading: { value: '860', unit: '卡' } }), headBefore);
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const one = stripComments(kanbanColumnsCss({ prefix: 'x-' }));
    assert.ok(one.includes('.x-page-ui .x-block-kanban-columns'), '前缀必须作用到 scope 与类名两处');
    assert.equal(one.includes('.ilife-page-ui'), false);
  });

  it('同一份入参渲染四次逐字节相同，且标记不带皮肤类', () => {
    const one = renderKanbanColumns(PICKED);
    assert.equal(renderKanbanColumns(PICKED), one);
    assert.equal(renderKanbanColumns(PICKED), one);
    assert.equal(renderKanbanColumns(PICKED), one);
    assert.equal(/ilife-skin-/.test(one), false, '皮肤由页面挂，换皮要机械地不换结构');
  });
});

/* ── ④⑤ 四档几何（真机）＋ 行为 ─────────────────────────────────── */

/** 一页：皮肤取值表 ＋ 本件样式段 ＋ 本件标记 ＋ 运行时段（可选）。 */
function fixture(skin, input, withRuntime) {
  const script = withRuntime ? '<script>' + buildKanbanColumnsJs() + '</script>' : '';
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>kanban-columns</title>\n<style>\n'
    + 'html,body{margin:0;padding:0}\n' + skinCss() + '\n' + kanbanColumnsCss() + '\n'
    + '</style></head>\n<body>\n'
    + '<div class="ilife-page-ui ' + skinClass(skin) + '" style="padding:16px">'
    + renderKanbanColumns(input)
    + '<p style="height:600px">页面正文</p></div>\n'
    + script + '\n</body></html>';
}

const ROOT_S = q('[' + KANBAN_COLUMNS_ATTR + ']');
const COL_S = q(SEL('col'));
const CARD_S = q(SEL('card'));
const SEG_S = q(SEL('seg'));
const ADD_S = q(SEL('add'));
const RECV_S = q(SEL('receive'));
const DROP_S = q(SEL('drop'));
const SLOT_S = q(SEL('slot'));
const NAME_S = q(SEL('name'));
const COUNT_S = q(SEL('count'));
const BADGE_S = q(SEL('badge'));
const STATUS_S = q(SEL('status'));
const CANCEL_S = q(SEL('cancel'));
const SWITCH_S = q(SEL('switch'));
/** 属性选择器（按 `data-*` 找元素）。 */
const ATTR = (name) => '[' + name + ']';

/** 页内：逐 case 量几何（可见的列／段／加键／收纳键／卡／落点线／空槽 ＋ 卡间缝）。 */
const BOX_FN = '(function(){'
  + 'function box(el){var r=el.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),'
  + 'l:Math.round(r.left),t:Math.round(r.top)};}'
  + 'function shown(el){var cs=getComputedStyle(el),r=el.getBoundingClientRect();'
  + 'return cs.display!=="none"&&cs.visibility!=="hidden"&&r.width>0&&r.height>0;}'
  + 'function all(sel,scope){return [].slice.call((scope||document).querySelectorAll(sel)).filter(shown);}'
  + 'var cases=[].slice.call(document.querySelectorAll("[data-case]"));'
  + 'var out=[];'
  + 'for(var i=0;i<cases.length;i+=1){'
  + ' var root=cases[i].querySelector(' + ROOT_S + ');'
  + ' var cols=all(' + COL_S + ',root);'
  + ' var gaps=[];'
  + ' for(var c=0;c<cols.length;c+=1){var list=all(' + CARD_S + ',cols[c]);'
  + '  for(var j=1;j<list.length;j+=1){var a=list[j-1].getBoundingClientRect(),b=list[j].getBoundingClientRect();'
  + '   if(Math.abs(a.left-b.left)<3) gaps.push(Math.round(b.top-a.bottom));}}'
  + ' var sw=root.querySelector(' + SWITCH_S + ');'
  + ' out.push({cols:cols.length,segs:all(' + SEG_S + ',root).length,swShown:sw?shown(sw):false,'
  + '  cards:all(' + CARD_S + ',root).map(box),add:all(' + ADD_S + ',root).map(box),'
  + '  recv:all(' + RECV_S + ',root).map(box),gaps:gaps,'
  + '  drops:all(' + DROP_S + ',root).length,slots:all(' + SLOT_S + ',root).length,'
  + '  names:all(' + NAME_S + ',root).length,counts:all(' + COUNT_S + ',root).length});'
  + '}return out;}())';

describe('kanban-columns ④ 四档几何（真机 headless Chrome ＋ CDP · 容器 320／390／620／1280）', async () => {
  const page = await startShapesPage({
    css: skinCss() + '\n' + kanbanColumnsCss(),
    html: '<div class="ilife-page-ui" data-case="plain">' + renderKanbanColumns(PLAIN) + '</div>'
      + '<div class="ilife-page-ui" data-case="picked">' + renderKanbanColumns(PICKED) + '</div>'
      + '<div class="ilife-page-ui" data-case="empty">' + renderKanbanColumns({ ...PLAIN, activeCol: 3 }) + '</div>',
    portOffset: 45,
  });
  if (page === null) {
    it('真机未跑（本机没有 Chrome）：退确定性几何判据', (t) => {
      console.log('kanban-columns 几何：真机未跑（本机没有 Chrome），原因=startShapesPage 返回 null');
      t.skip('本机没有 Chrome');
    });
    return;
  }

  it('四档零横向溢出、列名与计数零截断、可点件 ≥44 见方、卡 ≥56 高、卡间缝 ≥8px', async () => {
    const selectors = [COL_S, CARD_S, NAME_S, COUNT_S, BADGE_S, RECV_S, ADD_S, SEG_S, SLOT_S, DROP_S, STATUS_S]
      .map((s) => JSON.parse(s));
    for (const width of [320, 390, 620, 1280]) {
      await page.setWidth(width);
      const rows = await page.read(selectors);
      const frame = await page.frame();
      const cases = await page.ev(BOX_FN);
      const narrow = width <= KANBAN_COLUMNS_NARROW_PX;
      console.log('kanban-columns 几何读数 ' + JSON.stringify({
        width, frame,
        rows: rows.map((r) => ({ sel: r.sel, visible: r.visible, clipped: r.clipped, scrollsX: r.scrollsX,
          overflow: Math.max(0, r.maxScrollW - r.maxClientW) })),
        cases: cases.map((c) => ({ cols: c.cols, segs: c.segs, swShown: c.swShown, cards: c.cards.length,
          add: c.add.length, recv: c.recv.length, drops: c.drops, slots: c.slots, names: c.names,
          counts: c.counts, gaps: c.gaps })),
      }));
      assert.ok(frame.fxScrollW <= width + 1, width + ' 档夹具容器横溢：' + JSON.stringify(frame));
      assert.ok(frame.docScrollW <= frame.innerW + 1, width + ' 档页面横溢：' + JSON.stringify(frame));
      for (const r of rows) {
        assert.ok(r.maxScrollW <= r.maxClientW + 1, width + ' 档 ' + r.sel + ' 溢出：' + JSON.stringify(r));
        assert.equal(r.clipped, 0, width + ' 档 ' + r.sel + ' 有节点被压字／截断（列名与计数永不 `…`）：' + JSON.stringify(r));
        assert.equal(r.scrollsX, 0, width + ' 档 ' + r.sel + ' 藏了横滑：' + JSON.stringify(r));
      }
      /* 窄档一列一屏（分段切换出来）；宽档几列并排（切换整条不出）。 */
      for (const c of cases) {
        assert.equal(c.cols, narrow ? 1 : COLUMNS.length, width + ' 档可见列数不对：' + JSON.stringify(c));
        assert.equal(c.names, narrow ? 1 : COLUMNS.length, width + ' 档可见列名数不对（列头一直在）');
        assert.equal(c.counts, narrow ? 1 : COLUMNS.length, width + ' 档可见计数数不对');
        assert.equal(c.segs, narrow ? COLUMNS.length : 0, width + ' 档分段切换该出／该收不对（判的是本件自己的宽度）');
        assert.equal(c.swShown, narrow, width + ' 档分段切换整条该出／该收不对');
      }
      /* 命中盒：卡 ≥44×56、加键／收纳键 ≥44 见方。 */
      for (const c of cases) {
        for (const b of c.cards) {
          assert.ok(b.w >= KANBAN_COLUMNS_TOUCH_PX, width + ' 档卡太窄：' + JSON.stringify(b));
          assert.ok(b.h >= KANBAN_COLUMNS_CARD_MIN_PX, width + ' 档卡太矮：' + JSON.stringify(b));
        }
        for (const b of c.add.concat(c.recv)) {
          assert.ok(b.w >= KANBAN_COLUMNS_TOUCH_PX && b.h >= KANBAN_COLUMNS_TOUCH_PX,
            width + ' 档可点件命中盒不足 44：' + JSON.stringify(b));
        }
      }
      /* 卡间缝 ≥8px：拿起的卡自己往上挪 2px（形），它上面那道缝按 8−2 量（与样式段同一口径）。 */
      for (const c of [cases[0], cases[2]]) {
        for (const g of c.gaps) {
          assert.ok(g >= KANBAN_COLUMNS_GAP_PX, width + ' 档卡间缝不足 8px：' + JSON.stringify(c.gaps));
        }
      }
      assert.equal(cases[1].gaps[0], KANBAN_COLUMNS_GAP_PX - 2,
        width + ' 档拿起的卡没站起来（往上挪 2px ⇒ 它上面那道缝 8−2＝6）：' + JSON.stringify(cases[1].gaps));
      for (const g of cases[1].gaps.slice(1)) {
        assert.ok(g >= KANBAN_COLUMNS_GAP_PX, width + ' 档卡间缝不足 8px：' + JSON.stringify(cases[1].gaps));
      }
      /* 三档各自的状：空列的空槽一直都在（窄档只随当前列露出来）；选中态其余各列的落点线在（宽档才三列并排）。 */
      assert.equal(cases[0].slots, narrow ? 0 : 1, width + ' 档空列的空槽不见了：' + JSON.stringify(cases[0]));
      assert.equal(cases[1].slots, narrow ? 0 : 1, width + ' 档空列的空槽不见了（选中态也是）：' + JSON.stringify(cases[1]));
      assert.equal(cases[2].slots, 1, width + ' 档空列的空槽不见了（窄档当前列就是空列时）：' + JSON.stringify(cases[2]));
      assert.equal(cases[2].cards.length, narrow ? 0 : COLUMNS[0].cards.length + COLUMNS[1].cards.length,
        width + ' 档空列 case 的可见卡数不对：' + JSON.stringify(cases[2].cards));
      assert.equal(cases[1].drops, narrow ? 0 : COLUMNS.length - 1, width + ' 档选中态的落点线数不对');
      assert.equal(cases[1].recv.length, narrow ? 1 : COLUMNS.length, width + ' 档可见收纳键数不对');
      assert.equal(cases[0].recv.length, narrow ? 1 : COLUMNS.length, width + ' 档可见收纳键数不对（plain）');
      assert.equal((await page.errs()).length, 0, '页内零未捕获错误');
    }
  });

  it('窄档的分段切换是真的：当前那一段按下态，列区只留那一列', async () => {
    await page.setWidth(320);
    const before = await page.ev('(function(){'
      + 'var root=document.querySelector("[data-case=\\"empty\\"]").querySelector(' + ROOT_S + ');'
      + 'var cols=[].slice.call(root.querySelectorAll(' + COL_S + '));'
      + 'return {show:root.getAttribute(' + q(KANBAN_COLUMNS_SHOW_ATTR) + '),'
      + 'display:cols.map(function(c){return getComputedStyle(c).display;}),'
      + 'segs:[].slice.call(root.querySelectorAll(' + SEG_S + ')).map(function(s){'
      + 'return s.getAttribute("aria-pressed")+(s.className.indexOf("is-on")>=0?"+on":"");})};}())');
    console.log('kanban-columns 分段读数 ' + JSON.stringify(before));
    assert.equal(before.show, '3', '入参 activeCol=3 ⇒ 窄档当前列是第 3 列');
    assert.deepEqual(before.display, ['none', 'none', 'flex'], '窄档只留当前那一列');
    assert.deepEqual(before.segs, ['false', 'false', 'true+on'], '当前那一段按下态 ＋ `is-on`');
  });

  it('关页', () => { page.close(); });
});

describe('kanban-columns ⑤ 行为（真机：拿起／挪动／取消）＋ 四套皮肤同构', async () => {
  const p = await startBrowser({ portOffset: 46 });
  if (p === null) {
    it('真机未跑（本机没有 Chrome）：行为判据跳过', (t) => {
      console.log('kanban-columns 行为：真机未跑（本机没有 Chrome），原因=startBrowser 返回 null');
      t.skip('本机没有 Chrome');
    });
    return;
  }

  /** 页里装四条事件的落账（`overlay-probe` 的探针只认浮层族那几个名，本件自己装）。 */
  const WIRE = '(function(){window.__kb=[];'
    + [KANBAN_COLUMNS_EVENT_PICK, KANBAN_COLUMNS_EVENT_MOVE, KANBAN_COLUMNS_EVENT_CANCEL, KANBAN_COLUMNS_EVENT_ADD]
      .map((n) => 'document.addEventListener(' + q(n) + ',function(e){window.__kb.push({type:e.type,detail:e.detail});});').join('')
    + 'return true;}())';
  const STATE = '(function(){'
    + 'var root=document.querySelector(' + ROOT_S + ');'
    + 'var cols=[].slice.call(root.querySelectorAll(' + COL_S + ')).map(function(col){'
    + 'var recv=col.querySelector(' + RECV_S + ');'
    + 'var empty=col.querySelector(' + SLOT_S + ');'
    + 'return {key:col.getAttribute(' + q(KANBAN_COLUMNS_COL_ATTR) + '),'
    + 'count:(col.querySelector(' + COUNT_S + ')||{}).textContent,'
    + 'cards:[].slice.call(col.querySelectorAll(' + CARD_S + ')).map(function(c){return c.getAttribute(' + q(KANBAN_COLUMNS_CARD_ATTR) + ');}),'
    + 'state:[].slice.call(col.querySelectorAll(' + CARD_S + ')).map(function(c){return c.getAttribute(' + q(KANBAN_COLUMNS_STATE_ATTR) + ');}),'
    + 'badge:[].slice.call(col.querySelectorAll(' + BADGE_S + ')).map(function(b){return b.textContent;}),'
    + 'drop:col.querySelectorAll(' + DROP_S + ').length,slot:empty?empty.textContent:null,'
    + 'recvOff:recv?recv.disabled:null,recvText:recv?recv.textContent:null};});'
    + 'return {pick:root.getAttribute(' + q(KANBAN_COLUMNS_PICK_ATTR) + '),'
    + 'show:root.getAttribute(' + q(KANBAN_COLUMNS_SHOW_ATTR) + '),'
    + 'bound:root.getAttribute(' + q(KANBAN_COLUMNS_BOUND_ATTR) + '),'
    + 'status:(root.querySelector(' + STATUS_S + ')||{}).textContent,'
    + 'cancel:root.querySelector(' + CANCEL_S + ')!==null,'
    + 'cancelText:(root.querySelector(' + CANCEL_S + ')||{}).textContent,'
    + 'pressed:[].slice.call(root.querySelectorAll(' + CARD_S + ')).map(function(c){return c.getAttribute("aria-pressed");}),'
    + 'cols:cols,evts:window.__kb};}())';
  const CLICK_CARD = (key) => '(function(){document.querySelector(' + q(ATTR(KANBAN_COLUMNS_CARD_ATTR + '="' + key + '"')) + ').click();return true;}())';
  const CLICK_RECV = (key) => '(function(){document.querySelector(' + q(ATTR(KANBAN_COLUMNS_RECEIVE_ATTR + '="' + key + '"')) + ').click();return true;}())';
  const CLICK_ADD = (key) => '(function(){document.querySelector(' + q(ATTR(KANBAN_COLUMNS_ADD_ATTR + '="' + key + '"')) + ').click();return true;}())';
  const CLICK_CANCEL = '(function(){document.querySelector(' + q(ATTR(KANBAN_COLUMNS_CANCEL_ATTR)) + ').click();return true;}())';
  const CLICK_SEG = (at) => '(function(){document.querySelector(' + q(ATTR(KANBAN_COLUMNS_SEG_ATTR + '="' + at + '"')) + ').click();return true;}())';
  const colOf = (st, key) => st.cols.find((c) => c.key === key);

  it('拿起：点卡 → 选中态（其余各列出落点线与可点的收纳键 ＋ 取消键）＋ pick 事件', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await p.ev(CLICK_CARD('c-soup'));
    const st = await p.ev(STATE);
    console.log('kanban-columns 拿起读数 ' + JSON.stringify(st));
    assert.equal(st.pick, 'c-soup', '根上写清选中了谁');
    assert.equal(colOf(st, 'todo').drop, 0, '选中卡所在列没有落点线');
    assert.equal(colOf(st, 'doing').drop, 1, '其余各列出落点线（写出放这里＝标记为哪一列）');
    assert.equal(colOf(st, 'done').drop, 1);
    assert.deepEqual(st.cols.map((c) => c.recvOff), [true, false, false], '选中卡所在列按不动，其余各列可点');
    assert.equal(colOf(st, 'done').recvText, kanbanReceiveText('做过了'), '收纳键写出收到哪一列');
    assert.equal(st.cancel, true, '取消键露出来');
    assert.equal(st.cancelText, KANBAN_COLUMNS_TEXT.cancel);
    assert.equal(st.status, kanbanStatusText('番茄蛋汤'), '状态句是真读数');
    assert.deepEqual(st.pressed, ['false', 'true', 'false'], '只有选中的那一张是按下态');
    assert.equal(st.evts.length, 1, '只派发一条事件');
    assert.equal(st.evts[0].type, KANBAN_COLUMNS_EVENT_PICK);
    assert.deepEqual(st.evts[0].detail, { id: 'kanban-dinner', key: 'c-soup', from: 'todo' });
    assert.equal(st.bound, '1', '根上记一枚 bound 读数');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('挪动：点目标列的收纳键 → 卡真挪过去 ＋ 两端计数与卡上那枚状态重写 ＋ move 事件', async () => {
    await p.ev(CLICK_RECV('done'));
    const st = await p.ev(STATE);
    console.log('kanban-columns 挪动读数 ' + JSON.stringify(st));
    assert.equal(st.pick, null, '挪完选中态收掉');
    assert.equal(st.cancel, false, '取消键收起来');
    assert.deepEqual(colOf(st, 'done').cards, ['c-soup'], '卡落进目标列');
    assert.deepEqual(colOf(st, 'todo').cards, ['c-dumpling'], '源列少了一张');
    assert.equal(colOf(st, 'todo').count, kanbanCountText(1, '道'), '源列计数重写');
    assert.equal(colOf(st, 'done').count, kanbanCountText(1, '道'), '目标列计数重写');
    assert.equal(colOf(st, 'done').slot, null, '目标列一有卡，空槽撤掉');
    assert.deepEqual(colOf(st, 'done').state, ['done'], '卡上写出它现在在哪一列');
    assert.deepEqual(colOf(st, 'done').badge, [KANBAN_COLUMNS_MARKS[2] + '做过了'], '卡上那枚状态＝记号 ＋ 新列名');
    assert.deepEqual(st.cols.map((c) => c.recvOff), [true, true, true], '没选中时整排收纳键按不动');
    assert.equal(colOf(st, 'todo').drop + colOf(st, 'doing').drop + colOf(st, 'done').drop, 0, '落点线全撤');
    assert.equal(st.status, kanbanStatusText(null), '状态句回到「还没选中卡片」');
    const move = st.evts[st.evts.length - 1];
    assert.equal(move.type, KANBAN_COLUMNS_EVENT_MOVE);
    assert.deepEqual(move.detail, { id: 'kanban-dinner', key: 'c-soup', from: 'todo', to: 'done' });
  });

  it('挪空一列：源列最后一张被收走 → 运行时段当场补出空槽（空列不许消失）', async () => {
    await p.ev(CLICK_CARD('c-braise'));
    await p.ev(CLICK_RECV('todo'));
    const st = await p.ev(STATE);
    console.log('kanban-columns 挪空读数 ' + JSON.stringify(st));
    assert.deepEqual(colOf(st, 'doing').cards, [], '源列空了');
    assert.equal(colOf(st, 'doing').slot, KANBAN_COLUMNS_TEXT.emptyTitle + KANBAN_COLUMNS_TEXT.emptyNote,
      '空槽当场补出来（两句话）');
    assert.equal(colOf(st, 'doing').count, kanbanCountText(0, '道'), '空列计数照实写 0');
    assert.deepEqual(colOf(st, 'todo').cards, ['c-dumpling', 'c-braise'], '收到的卡排在那一列最后');
    assert.equal(st.evts.filter((e) => e.type === KANBAN_COLUMNS_EVENT_MOVE).length, 2, '两条 move 事件（每条一次挪动）');
  });

  it('取消：点取消键／再点同一张卡 → 卡原样不动 ＋ cancel 事件；点另一张＝改选', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await p.ev(CLICK_CARD('c-dumpling'));
    await p.ev(CLICK_CANCEL);
    const st = await p.ev(STATE);
    console.log('kanban-columns 取消读数 ' + JSON.stringify(st));
    assert.deepEqual(colOf(st, 'todo').cards, ['c-dumpling', 'c-soup'], '卡原样不动');
    assert.equal(st.pick, null);
    assert.equal(st.cancel, false, '取消键收起来');
    assert.equal(colOf(st, 'doing').drop, 0, '落点线撤掉');
    assert.deepEqual(st.cols.map((c) => c.recvOff), [true, true, true], '收纳键回到按不动');
    assert.deepEqual(st.pressed, ['false', 'false', 'false'], '按下态也收掉');
    const last = st.evts[st.evts.length - 1];
    assert.equal(last.type, KANBAN_COLUMNS_EVENT_CANCEL);
    assert.deepEqual(last.detail, { id: 'kanban-dinner', key: 'c-dumpling' });
    await p.ev(CLICK_CARD('c-soup'));
    await p.ev(CLICK_CARD('c-soup'));
    const st2 = await p.ev(STATE);
    assert.equal(st2.pick, null, '再点同一张＝取消');
    assert.equal(st2.evts[st2.evts.length - 1].type, KANBAN_COLUMNS_EVENT_CANCEL);
    await p.ev(CLICK_CARD('c-soup'));
    await p.ev(CLICK_CARD('c-dumpling'));
    const st3 = await p.ev(STATE);
    assert.equal(st3.pick, 'c-dumpling', '点另一张＝改选（同一时刻只有一张被选中）');
    assert.equal(st3.evts[st3.evts.length - 1].type, KANBAN_COLUMNS_EVENT_PICK);
    assert.deepEqual(st3.evts[st3.evts.length - 1].detail, { id: 'kanban-dinner', key: 'c-dumpling', from: 'todo' });
    assert.equal(colOf(st3, 'todo').drop, 0, '改选到同一列：那一列本来就没有落点线');
    assert.equal(colOf(st3, 'doing').drop, 1);
  });

  it('加键与分段切换：加键只报「往哪一列加」，分段只换当前列（都不写库、都不派发额外事件）', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await p.ev(CLICK_ADD('doing'));
    const st = await p.ev(STATE);
    const addEvt = st.evts[st.evts.length - 1];
    console.log('kanban-columns 加键读数 ' + JSON.stringify(addEvt));
    assert.equal(addEvt.type, KANBAN_COLUMNS_EVENT_ADD);
    assert.deepEqual(addEvt.detail, { id: 'kanban-dinner', column: 'doing' });
    assert.equal(st.pick, null, '加键不改选中态（本件不写库）');
    await p.ev(CLICK_SEG('2'));
    const after = await p.ev('(function(){var root=document.querySelector(' + ROOT_S + ');'
      + 'return {show:root.getAttribute(' + q(KANBAN_COLUMNS_SHOW_ATTR) + '),'
      + 'disp:[].slice.call(root.querySelectorAll(' + COL_S + ')).map(function(c){return getComputedStyle(c).display;}),'
      + 'segs:[].slice.call(root.querySelectorAll(' + SEG_S + ')).map(function(s){'
      + 'return s.getAttribute("aria-pressed")+(s.className.indexOf("is-on")>=0?"+on":"");})};}())');
    console.log('kanban-columns 分段读数 ' + JSON.stringify(after));
    assert.equal(after.show, '2', '点第 2 段 ⇒ 当前列换成第 2 列');
    assert.deepEqual(after.disp, ['none', 'flex', 'none'], '窄档只留第 2 列');
    assert.deepEqual(after.segs, ['false', 'true+on', 'false'], '当前那一段按下态 ＋ `is-on`');
    const st2 = await p.ev(STATE);
    assert.equal(st2.evts.filter((e) => e.type === KANBAN_COLUMNS_EVENT_ADD).length, 1, '分段切换不派发事件');
    assert.equal(st2.evts.length, 1, '到这一步为止只有加键那一条事件');
  });

  it('幂等：同一段运行时段注两次也只绑一次（第二次直接返回）', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    const again = await p.ev('(function(){var s=document.createElement("script");'
      + 's.textContent=' + JSON.stringify(buildKanbanColumnsJs()) + ';'
      + 'document.body.appendChild(s);return true;}())');
    assert.equal(again, true);
    await p.ev(CLICK_CARD('c-soup'));
    const st = await p.ev(STATE);
    console.log('kanban-columns 幂等读数 ' + JSON.stringify({ pick: st.pick, evts: st.evts.length }));
    assert.equal(st.pick, 'c-soup', '重复注入后照样能拿起');
    assert.equal(st.evts.filter((e) => e.type === KANBAN_COLUMNS_EVENT_PICK).length, 1, '注两次也只派发一条 pick 事件');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('四套皮肤下标记逐字节相同（换皮不换结构）', async () => {
    const marks = [];
    for (const skin of SKIN_NAMES) {
      await p.at(fixture(skin, PICKED, false), { width: 390, height: 900 });
      marks.push(await p.ev('(function(){return document.querySelector(' + ROOT_S + ').outerHTML;}())'));
    }
    for (let i = 1; i < marks.length; i += 1) {
      assert.equal(marks[i], marks[0], '皮肤 ' + SKIN_NAMES[i] + ' 的标记与 ' + SKIN_NAMES[0] + ' 逐字节相同');
    }
    console.log('kanban-columns 皮肤同构：' + SKIN_NAMES.join('／') + ' 四套标记逐字节相同');
  });

  it('关页', () => { p.close(); });
});
