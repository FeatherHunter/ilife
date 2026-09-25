/** kanban-columns（看板列）· 契约测试。**两档骨架**：`status`「按状态分列」（原型 A 档，4/4/4 已落地）
 *  与 `grouped`「按位置分列 ＋ 列内二级组」（原型 B 档，优化后 4/4/4 补落）。判据分两段写：
 *  `①②③` 的既有那几段钉的是 `status` 档（**一格不动**），`①B／②B／④B／⑤B` 钉的是新补的 `grouped` 档。
 *
 * 覆盖四类判据（工艺书 §6）＋ 皮肤与分隔符纪律：
 *  ① **渲染契约**（`status`）：骨架（分段切换 ＋ 列区 ＋ 状态句 ＋ 脚注）／每列的列头（名 ＋ 计数 ＋ 用途 ＋ 加键）
 *    与列身（卡或空槽 ＋ 收纳键）／卡上那枚状态（记号 ＋ 列名）／空列是合法态／
 *    选中态（卡站起来 ＋ 其余各列的落点线与可点的收纳键 ＋ 取消键）／转义面／**全部**非法入参分支
 *    （每个都断 `BlocksError`；含**全空白串**（空格类 ＋ **零宽字符类**）、**入参表以外的键**
 *    （含**继承来的**与**不可枚举的**）、稀疏数组）／纯函数／分隔符门；
 *  ①B **新档渲染契约**（`grouped`）：形态闭集两档且**原有那一格在前、逐字节不动**／列头**一行读数**
 *    （没有 `purpose` 那一格）／二级组（组名行 ＋ 组计数）／物件行（名字 ＋ 量，整行一颗按钮）／
 *    拿起那一行（整行选中）／**一屏只留一层话**（原型旁白一句不上屏、行里不重复列名与组名）／
 *    `groups`／`items`／键表按形态分的全部非法分支；
 *  ② **样式与零 DOM 纪律**（`status` 那一段）＋ **②B 新档样式面**：组竖边一道 `KANBAN_COLUMNS_GROUP_EDGE_PX`／
 *    组名行底下一道 1px 发丝线／**物件行不再各有竖边**（那道边是透明槽位）／列壳走 `--shadow`／
 *    新档每一条规则都钉在 `.is-grouped` 上（`status` 档零命中）＋ 新档那一段**真的进了产物**（不是死引用）；
 *  ③ **加法式**：不启用它的页面零命中、逐字节不变；渲染本件不改别件产物；前缀透传；
 *    同一份入参渲染四次逐字节相同，且标记不带皮肤类；
 *  ④ **四档几何（真机 headless Chrome ＋ CDP，容器宽 320／390／620／1280）**（`status`）：
 *    零横向溢出、列名与计数零截断、每枚可点件 ≥44×44、卡 ≥56 高、
 *    卡间缝按常量算的地板（没拿起的 ≥8；拿起的往上挪 `LIFT` ⇒ 它上面那道缝 8−2＝6，只此一处）、
 *    窄档一列一屏（分段切换出来）、宽档几列并排（切换整条不出）、空列的空槽一直在；
 *  ④B **新档真机四档几何**（同一套探针）：零横溢、组竖边量出来＝常量、组名行发丝线 1px、
 *    物件行**量出来没有竖边**（左沿透明、层次不靠边多）、列壳浮起（中性皮肤下 `--shadow` 算得出）、
 *    列名与计数**同一行**（读数一行说完）、行 ≥44 高、行间缝 ≥8、窄档一列一屏 ＋ 分段是真按钮；
 *  ⑤ **行为（真机 · 真指针）**（`status`）＋ **⑤B 新档行为（真机 · 真指针 CDP `Input`）**：
 *    全走 `Input.dispatchMouseEvent`（`p= p.mouse()`：`mousePressed`／`mouseReleased`，浏览器自己合成那枚 `click`）——
 *    拿起（真指针点卡／点行：完整事件序列 ＋ **类名序列**落账，选中那一档的底／描边／位移当场算出来）／
 *    挪动（**窄档真路径**：点卡 → 点分段 → 点该列的收纳键；点之前先断那一列到不了）／
 *    挪空一列／取消与改选／加键与分段切换／列头恒两行；四套皮肤下标记逐字节相同。
 *    **`element.click()` 替不了这一条**：它不经指针、也不看元素到不到得了——390 档是窄档，
 *    藏起来那两列的收纳键量出来零宽零高，合成点击照样点得动（2026-09 审查席读数）。
 *    `⑤B` 那一档还多两条：**卡落进目标列的最后一组**（组是那一档的格子）与**两端组计数一起重写**。
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
  KANBAN_COLUMNS_GROUP_EDGE_PX,
  KANBAN_COLUMNS_HOVER_QUERY,
  KANBAN_COLUMNS_LIFT_PX,
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
  kanbanColumnsFormClass,
  kanbanColumnsSlot,
  kanbanCountText,
  kanbanDropText,
  kanbanReceiveText,
  kanbanRowStatusText,
  kanbanStatusText,
  renderKanbanColumns,
} from '../dist/components/kanban-columns/index.js';
import { renderPageHead } from '../dist/components/page-head/index.js';
/** 新档那一段样式（`style-grouped.ts` 的产物）：拆件与 `style-narrow.ts` 同法，
 *  判据要能单独拿到它——「新档真的进了产物」与「新档只碰 `.is-grouped`」两条都按它扫。 */
import { kanbanColumnsGroupedCss } from '../dist/components/kanban-columns/style-grouped.js';
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

/* ── B 档（形态 `grouped`「按位置分列 ＋ 列内二级组」）的入参：列＝位置，列里再挂一层组 ── */

const GROUPED_COLUMNS = [
  { key: 'hall', name: '玄关', unit: '件', groups: [
    { name: '出门要带', items: [
      { key: 'i-umbrella', label: '雨伞', value: '1 把' },
      { key: 'i-card', label: '门卡', value: '2 张' },
    ] },
    { name: '常备', items: [{ key: 'i-knife', label: '快递刀', value: '1 把' }] },
  ] },
  { key: 'kitchen', name: '厨房', unit: '件', groups: [
    { name: '调料柜', items: [
      { key: 'i-salt', label: '盐', value: '30 g' },
      { key: 'i-pepper', label: '花椒', value: '1 罐' },
    ] },
    { name: '水槽下', items: [{ key: 'i-soap', label: '洗洁精', value: '半瓶' }] },
  ] },
  { key: 'bedroom', name: '卧室', unit: '件', groups: [
    { name: '床头柜', items: [{ key: 'i-cell', label: '电池', value: '4 节' }] },
    { name: '衣柜', items: [] },
  ] },
];
const GPLAIN = { id: 'kanban-home', form: 'grouped', columns: GROUPED_COLUMNS };
const GPICKED = { ...GPLAIN, pickedKey: 'i-salt' };
/** B 档那一档自己的六个槽位（`status` 档一个都不许碰）。 */
const GROUPED_SLOTS = ['group', 'ghead', 'gname', 'gcount', 'row', 'label', 'value'];
/** 每个组的行数／每一列的行数（屏上那些读数就是它们算出来的）。 */
const rowsOf = (col) => col.groups.reduce((n, g) => n + g.items.length, 0);
const itemKeys = (col) => col.groups.flatMap((g) => g.items.map((i) => i.key));

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('kanban-columns ① 渲染契约 · 骨架与列', () => {
  const html = renderKanbanColumns(PLAIN);

  it('根 ＋ 分段切换 ＋ 列区 ＋ 状态句 ＋ 脚注；形态键是英文骨架名（不是格号 A）', () => {
    assert.deepEqual([...KANBAN_COLUMNS_FORMS], ['status', 'grouped'],
      '形态闭集＝两档英文骨架名；**原有那一格 `status` 仍在第 0 格、逐字节不动**（新档是加法，见 ①B）');
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

  it('**全空白串＝拒**（上屏文本五类：空格类 ＋ **零宽字符类**）：收下会在屏上留一块空白', () => {
    const blanks = [
      ['列名（收下 ⇒ 无字列头）', (b) => [{ key: 'a', name: b, cards: [] }, OK.columns[1]]],
      ['用途（收下 ⇒ 空白第二级字）', (b) => [{ key: 'a', name: '甲', purpose: b, cards: [] }, OK.columns[1]]],
      ['单位（收下 ⇒ 计数只剩一个数）', (b) => [{ key: 'a', name: '甲', unit: b, cards: [] }, OK.columns[1]]],
      ['卡标题（收下 ⇒ 空壳卡）', (b) => [{ key: 'a', name: '甲', cards: [{ key: 'k1', title: b }] }, OK.columns[1]]],
      ['卡副语', (b) => [{ key: 'a', name: '甲', cards: [{ key: 'k1', title: 'T', meta: b }] }, OK.columns[1]]],
    ];
    /** 空格类：`String.prototype.trim()` 剥得掉的（Unicode WhiteSpace）。 */
    const SPACES = ['   ', '\t', '　', ' 　 '];
    /** **零宽／不可见类**：`trim()` 剥不掉它们（格式类 Cf）——不先剥掉，「全空白」这条守卫就漏了这半边。 */
    const INVISIBLE = ['\u200b', '\u200b\u200b', '\ufeff', '\u00ad', '\u200e\u200f', '\u2060', '\u200b\u200d'];
    for (const [what, patch] of blanks) {
      for (const blank of SPACES.concat(INVISIBLE)) {
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

  it('**入参表以外的键＝拒**（顶层与列内、卡内三处 ＋ **继承来的与不可枚举的**键）', () => {
    const B = (input) => throwsBlocks(() => renderKanbanColumns(input));
    assert.equal(B({ ...OK, bogus: 1 }), true, '顶层多给一个键');
    assert.equal(B({ ...OK, title: '打错名' }), true, '顶层写错键名');
    assert.equal(B({ ...OK, columns: [{ ...OK.columns[0], bogus: 1 }, OK.columns[1]] }), true, '列内多给一个键');
    assert.equal(B({ ...OK, columns: [{ ...OK.columns[0], cards: [{ ...OK.columns[0].cards[0], bogus: 1 }] }, OK.columns[1]] }), true,
      '卡内多给一个键');
    assert.equal(B({ ...OK, columns: [{ ...OK.columns[0], count: '2 件' }, OK.columns[1]] }), true, '计数是算出来的，入参不许给');
    /* **只走 `Object.keys` 会漏掉的两类**（2026-09 审查席读数：`Object.create({bogus:1})` 被收下）：
       继承来的（`for…in` 走整条原型链）与不可枚举的自有键（`Object.getOwnPropertyNames` 才看得见）。 */
    assert.equal(B(Object.create({ ...OK, bogus: 1 })), true, '顶层：原型链上继承来的未知键');
    assert.equal(B({ ...OK, columns: [Object.create({ ...OK.columns[0], bogus: 1 }), OK.columns[1]] }), true,
      '列内：原型链上继承来的未知键');
    assert.equal(B({
      ...OK,
      columns: [{ ...OK.columns[0], cards: [Object.create({ ...OK.columns[0].cards[0], bogus: 1 })] }, OK.columns[1]],
    }), true, '卡内：原型链上继承来的未知键');
    const hidden = { ...OK };
    Object.defineProperty(hidden, 'bogus', { value: 1, enumerable: false });
    assert.equal(B(hidden), true, '顶层：不可枚举的自有键（`Object.keys` 看不见它）');
    const hiddenCol = { ...OK.columns[0] };
    Object.defineProperty(hiddenCol, 'bogus', { value: 1, enumerable: false });
    assert.equal(B({ ...OK, columns: [hiddenCol, OK.columns[1]] }), true, '列内：不可枚举的自有键');
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
    /* B 档那一份：信息串**不带**那四个字（全仓只许一块带「示例入参」的块），故它不进派生器——
       但「必须直渲成功」这条对两份一视同仁，判据自己把它取出来渲染一遍。 */
    const groupedBlocks = [...readme.matchAll(/```json 形态 grouped 的入参\n([\s\S]*?)```/g)].map((m) => m[1]);
    assert.equal(groupedBlocks.length, 1, 'README 里要有一块 B 档的入参样例（信息串不带「示例入参」四字）');
    const groupedSample = JSON.parse(groupedBlocks[0]);
    const two = renderKanbanColumns(groupedSample);
    assert.equal(groupedSample.form, 'grouped', 'B 档样例自己写着形态键');
    assert.ok(two.includes(KANBAN_COLUMNS_ATTR + '="kanban-home"'), 'B 档样例的 id 上屏');
    assert.ok(two.includes(CLS('group')) && two.includes(CLS('ghead')) && two.includes(CLS('row')), 'B 档样例渲染出二级组与物件行');
    assert.equal(two.includes(CLS('drop')) || two.includes(CLS('slot')), false, 'B 档样例里没有落点线、没有空槽旁白');
  });
});

/* ── ①B B 档（形态 grouped「按位置分列 ＋ 列内二级组」）渲染契约与入参 ─────── */

describe('kanban-columns ①B B 档（形态 grouped）· 渲染契约与入参', () => {
  const html = renderKanbanColumns(GPLAIN);
  const picked = renderKanbanColumns(GPICKED);
  /** 按文档顺序切出某一列的标记（列是兄弟节点：切到下一列为止）。 */
  const colSlice = (text, key) => {
    const at = text.indexOf(KANBAN_COLUMNS_COL_ATTR + '="' + key + '"');
    const next = text.indexOf(KANBAN_COLUMNS_COL_ATTR + '="', at + 1);
    return text.slice(at, next < 0 ? text.length : next);
  };
  /** 切出某一个组的标记（组也是兄弟节点：切到下一个组／本列收纳键为止）。 */
  const groupSlice = (colText, name) => {
    const at = colText.indexOf('>' + name + '<');
    const open = colText.lastIndexOf('class="' + SLOT('group') + '"', at);
    const next = colText.indexOf('class="' + SLOT('group') + '"', at);
    return colText.slice(open, next < 0 ? colText.indexOf(SLOT('receive')) : next);
  };
  /** 切出一行的标记（整行就是那颗按钮）。 */
  const rowSlice = (text, key) => {
    const at = text.indexOf(KANBAN_COLUMNS_CARD_ATTR + '="' + key + '"');
    const open = text.lastIndexOf('<button', at);
    return text.slice(open, text.indexOf('</button>', at) + 9);
  };
  const ROWS = GROUPED_COLUMNS.reduce((n, c) => n + rowsOf(c), 0);

  it('形态闭集两档，**原有那一格不动**：键名是英文骨架名、`status` 仍在第 0 格、缺省仍走它（加法式）', () => {
    assert.deepEqual([...KANBAN_COLUMNS_FORMS], ['status', 'grouped'],
      '闭集＝两档英文骨架名（`status` 在那、新档加在它后面；格号 A／B 不是接口名）');
    assert.equal(KANBAN_COLUMNS_FORMS[0], 'status', '原有那一格仍在第 0 格（旧档的键名与位置都不动）');
    assert.equal(kanbanColumnsFormClass('status'), 'is-status', '形态类名两处共用一个助手：渲染期与运行时段');
    assert.equal(kanbanColumnsFormClass('grouped'), 'is-grouped');
    const status = renderKanbanColumns(OK);
    assert.equal(status, renderKanbanColumns({ ...OK, form: 'status' }), '不给 form 与显式给 `status` 逐字节相同');
    assert.ok(status.startsWith('<div class="' + KANBAN_COLUMNS_CLASS + ' is-status"'), '旧档那一档的类名不动');
    for (const slot of GROUPED_SLOTS) {
      assert.equal(status.includes(SLOT(slot)), false, '旧档的产物里不许出现新档的槽位：' + slot);
    }
  });

  it('B 档骨架：列头一行读数（没有 `purpose` 那一格）＋ 二级组（组名行 ＋ 组计数）＋ 物件行（整行一颗按钮）', () => {
    assert.ok(html.startsWith('<div class="' + KANBAN_COLUMNS_CLASS + ' is-grouped"'), '根上写着这是哪一档');
    assert.ok(html.includes(KANBAN_COLUMNS_ATTR + '="kanban-home"'), '根上要有本件的发现锚');
    assert.ok(html.includes(KANBAN_COLUMNS_SHOW_ATTR + '="1"'), '窄档当前列有读数');
    assert.ok(html.includes(CLS('cols') + ' is-n3'), '列区照实写出列数');
    assert.ok(html.includes(CLS('switch')) && html.includes('role="group"'), '窄档的分段切换照旧在');
    assert.ok(html.includes(CLS('status')) && html.includes('role="status"'), '状态句照旧是活的');
    assert.ok(html.includes(CLS('hint')), '脚注照旧在');
    for (const col of GROUPED_COLUMNS) {
      const one = colSlice(html, col.key);
      const total = rowsOf(col);
      assert.ok(one.includes('>' + col.name + '<'), '列名上屏：' + col.name);
      assert.ok(one.includes('>' + kanbanCountText(total, col.unit) + '<'), '列计数＝全列行数：' + col.name);
      assert.equal(one.includes(SLOT('purpose')), false, 'B 档列头**没有** purpose 那一格（旁白不上屏）：' + col.name);
      assert.ok(one.includes(KANBAN_COLUMNS_ADD_ATTR + '="' + col.key + '"'), '每列一枚加键：' + col.key);
      assert.ok(one.includes(kanbanReceiveText(col.name)), '每列一枚收纳键：' + col.name);
      assert.ok(one.includes('aria-label="' + col.name + ' ' + kanbanCountText(total, col.unit) + '"'),
        '列要报出「叫什么 ＋ 几件」：' + col.name);
      assert.equal(countOf(one, 'class="' + SLOT('ghead') + '"'), col.groups.length,
        '几个组就几行组名行：' + col.name);
      assert.deepEqual([...one.matchAll(new RegExp(KANBAN_COLUMNS_CARD_ATTR + '="([^"]+)"', 'g'))].map((m) => m[1]),
        itemKeys(col), '行按列序 ＋ 组序 ＋ 组内序上屏：' + col.name);
      for (const g of col.groups) {
        const gs = groupSlice(one, g.name);
        assert.ok(gs.includes('>' + g.name + '<'), '组名上屏：' + g.name);
        assert.equal(countOf(gs, '>' + kanbanCountText(g.items.length, col.unit) + '<'), 1,
          '组计数＝这一组的行数，且**只印这一处**：' + g.name);
        assert.equal(countOf(gs, KANBAN_COLUMNS_CARD_ATTR + '="'), g.items.length, '组里的行数＝这一组的 items：' + g.name);
        for (const item of g.items) {
          const row = rowSlice(html, item.key);
          assert.ok(row.includes('>' + item.label + '<'), '物件名上屏：' + item.label);
          assert.ok(row.includes('>' + item.value + '<'), '物件的量上屏：' + item.value);
          assert.equal(countOf(row, '<button'), 1, '一行物件就是一颗按钮（里面没有第二颗）：' + item.key);
          assert.ok(row.includes('aria-pressed="false"'), '没拿起的行是未按下态：' + item.key);
          assert.ok(row.includes(KANBAN_COLUMNS_STATE_ATTR + '="' + col.key + '"'),
            '行上写着它在哪一列（机器读数，不靠列位置猜）：' + item.key);
          assert.equal(row.includes(SLOT('badge')), false,
            '行上不再挂「它在哪一列」那枚字（列头与组头就写着，重复即噪音）：' + item.key);
        }
      }
    }
    assert.equal(countOf(html, '<button'), ROWS + GROUPED_COLUMNS.length * 3,
      '七行物件 ＋ 三枚加键 ＋ 三段切换 ＋ 三枚收纳键，不许再多');
    assert.equal(countOf(html, '<button'), countOf(html, '</button>'), '按钮必须成对');
    assert.equal(/<script|onclick=/i.test(html), false, '标记里不带脚本');
    assert.equal(html.includes(CLS('drop')), false, 'B 档**不画落点线**（plain 态本来就没有）');
    assert.equal(html.includes(CLS('slot')), false, 'B 档**不写空槽那两句旁白**（`items: []` 只留组名与计数）');
    assert.equal(countOf(html, ' disabled>'), GROUPED_COLUMNS.length, '没拿起时三枚收纳键都按不动（还在，别藏）');
  });

  it('B 档拿起那一行：整行选中（`is-picked` ＋ 软底 ＋ 主色侧标 ＋ 站起来）＋ 状态句念物件名 ＋ 其余各列收纳键可点', () => {
    assert.ok(picked.includes(KANBAN_COLUMNS_PICK_ATTR + '="i-salt"'), '根上写清拿起了谁');
    const row = rowSlice(picked, 'i-salt');
    assert.ok(row.includes('is-picked'), '拿起的那一行整行选中');
    assert.ok(row.includes('aria-pressed="true"'), '拿起的那一行是按下态');
    assert.equal(countOf(picked, 'is-picked'), 1, '同一时刻只许一行挂选中形（两份高亮＝两份都像拿起的）');
    assert.ok(picked.includes(kanbanRowStatusText('盐')), '状态句念的是**物件名**（那一档的最小单位）');
    assert.equal(kanbanRowStatusText('盐'), kanbanStatusText('盐'), '选中那一句两档**逐字节同一句**（模板只住一处）');
    assert.notEqual(kanbanRowStatusText(null), kanbanStatusText(null),
      '没拿起那一句照各自的最小单位写（卡片／物件），不许照抄');
    assert.ok(picked.includes(kanbanRowStatusText(null)) === false, '拿起时当然不是没拿起那一句');
    assert.ok(picked.includes(KANBAN_COLUMNS_CANCEL_ATTR + '="kanban-home"'), '取消键带本件的锚');
    assert.ok(picked.includes('>' + KANBAN_COLUMNS_TEXT.cancel + '<'), '取消键写的是那几个字');
    assert.equal(countOf(picked, CLS('drop')), 0,
      'B 档一条落点线都不画：一屏只留一层话（各列那枚收纳键的字就写着收到哪儿）');
    assert.equal(countOf(picked, CLS('slot')), 0, 'B 档不写空槽那两句旁白');
    const receives = [...picked.matchAll(new RegExp('<button type="button" class="' + SLOT('receive')
      + '" ' + KANBAN_COLUMNS_RECEIVE_ATTR + '="([^"]+)"( disabled)?>', 'g'))]
      .map((m) => ({ key: m[1], off: m[2] !== undefined }));
    assert.deepEqual(receives, [
      { key: 'hall', off: false }, { key: 'kitchen', off: true }, { key: 'bedroom', off: false },
    ], '拿起那一行所在列那枚按不动，其余各列可点（看得见、点得到的通路）');
    assert.equal(countOf(picked, 'aria-pressed="false"'), (GROUPED_COLUMNS.length - 1) + (ROWS - 1),
      '没拿起的段切换 ＋ 没拿起的行都是未按下（当前那一段与拿起那一行是 `true`）');
  });

  it('B 档**一屏只留一层话**：原型旁白一句都不上屏，行里不重复列名与组名', () => {
    const NARRATION = ['进门这一块', '做饭这一块', '睡觉这一块', '块地方是干什么的', '列＝位置', '不横滑', '数量写在右边', '缺值写'];
    for (const line of NARRATION) {
      assert.equal(html.includes(line), false, '原型旁白不许搬进屏面：' + line);
      assert.equal(picked.includes(line), false, '原型旁白不许搬进屏面（拿起态也是）：' + line);
    }
    assert.equal(html.includes(KANBAN_COLUMNS_TEXT.hint), false, 'B 档的脚注不许照抄 `status` 那一句（那一句说的是卡）');
    assert.ok(html.includes(KANBAN_COLUMNS_TEXT.rowHint), 'B 档脚注照实写「一行物件」');
    assert.ok(html.includes(kanbanRowStatusText(null)), '没拿起时状态句是这一档自己的读数');
    assert.equal(html.includes(kanbanStatusText(null)), false, '不许串用 `status` 档那一句');
    for (const col of GROUPED_COLUMNS) {
      for (const g of col.groups) {
        for (const item of g.items) {
          const row = rowSlice(html, item.key);
          assert.equal(countOf(row, '<span'), item.value === undefined ? 1 : 2,
            '一行就两格字（名字 ＋ 量），不多印：' + item.key);
          assert.equal(row.includes('>' + col.name + '<'), false, '行里不重复列名：' + item.key);
          assert.equal(row.includes('>' + g.name + '<'), false, '行里不重复组名：' + item.key);
          assert.equal(row.includes(col.count), false, '行里不重复列计数：' + item.key);
        }
      }
    }
  });

  it('B 档入参违规一律拒（不静默降级）：`groups`／`items`／键表按形态分，逐条断 `BlocksError`', () => {
    const B = (input) => throwsBlocks(() => renderKanbanColumns(input));
    const pair = (one) => [one, GROUPED_COLUMNS[1]];
    const withCol = (one) => ({ ...GPLAIN, columns: pair(one) });
    const col = (patch) => ({ ...GROUPED_COLUMNS[0], ...patch });
    const items = (list) => col({ groups: [{ name: '组', items: list }] });
    assert.equal(B({ ...GPLAIN, form: 'lanes' }), true, '形态闭集外（自己起的名字不是键）');
    assert.equal(B({ ...GPLAIN, form: 'B' }), true, '格号不是键');
    assert.equal(B(withCol({ key: 'hall', name: '玄关', groups: [] })), true, '一组都没有的列');
    assert.equal(B(withCol({ key: 'hall', name: '玄关' })), true, '缺 groups');
    assert.equal(B(withCol(col({ groups: 'x' }))), true, 'groups 不是数组');
    assert.equal(B(withCol(col({ groups: [null] }))), true, '组不是对象');
    assert.equal(B(withCol(col({ groups: [{ name: '组' }] }))), true, '缺 items');
    assert.equal(B(withCol(col({ groups: [{ name: '组', items: 'x' }] }))), true, 'items 不是数组');
    assert.equal(B(withCol(col({ groups: [{ name: '组', items: [null] }] }))), true, '物件不是对象');
    assert.equal(B(withCol(col({ groups: [{ items: [] }] }))), true, '缺组名');
    assert.equal(B(withCol(col({ groups: [{ name: '组', items: [], bogus: 1 }] }))), true, '组内多给一个键');
    assert.equal(B(withCol(items([{ key: 'i', label: 'L', bogus: 1 }]))), true, '物件多给一个键');
    assert.equal(B(withCol(col({ purpose: '进门这一块' }))), true, 'B 档列不许给 purpose（旁白不上屏）');
    assert.equal(B(withCol(col({ cards: [] }))), true, 'B 档列不许给 cards');
    assert.equal(B({ ...OK, columns: [{ key: 'a', name: '甲', cards: [], groups: [] }, OK.columns[1]] }), true,
      'status 档列不许给 groups');
    assert.equal(B(withCol(items([{ key: 'i', label: 'L' }, { key: 'i', label: 'M' }]))), true, '物件 key 看板内唯一');
    assert.equal(B(withCol(items([{ key: 'hall', label: 'L' }]))), true, '物件 key 与列 key 也不许撞');
    assert.equal(B({ ...GPLAIN, pickedKey: 'nope' }), true, '拿起态指着没有的那一行');
    assert.equal(B({ ...GPLAIN, pickedKey: 1 }), true, 'pickedKey 不是字符串');
    assert.equal(B({ ...GPLAIN, activeCol: 9 }), true, '窄档当前列不许超出列数');
    assert.equal(B(withCol(items(Array.from({ length: KANBAN_COLUMNS_MAX_CARDS + 1 }, (_, i) => ({ key: 'c' + i, label: 'L' }))))), true,
      '一组超过 ' + KANBAN_COLUMNS_MAX_CARDS + ' 行');
    assert.equal(B(withCol(col({ groups: Array.from({ length: 3 }, (_, i) => ({
      name: '组' + i,
      items: Array.from({ length: KANBAN_COLUMNS_MAX_CARDS / 2 + 1 }, (_, j) => ({ key: 'k' + i + '-' + j, label: 'L' })),
    })) }))), true, '一列合计超过 ' + KANBAN_COLUMNS_MAX_CARDS + ' 行');
    const sparse = [{ name: '组', items: [{ key: 'i', label: 'L' }] }];
    sparse.length = 2;
    assert.equal(B(withCol(col({ groups: sparse }))), true, '组数组有空洞');
    assert.equal(B(withCol(col({ groups: [{ name: '组', items: [] }] }))), false, '`items: []` ＝设计过的空格，照收');
    assert.equal(B({ ...GPLAIN, pickedKey: 'i-salt', activeCol: 2 }), false, '合法的 B 档入参照收');
  });

  it('B 档**全空白串＝拒**（组名／物件名／物件的量：空格类 ＋ 零宽字符类）', () => {
    const patches = [
      ['组名（收下 ⇒ 无字组名行）', (b) => ({ ...GROUPED_COLUMNS[0], groups: [{ name: b, items: [] }] })],
      ['物件名（收下 ⇒ 空壳行）', (b) => ({ ...GROUPED_COLUMNS[0], groups: [{ name: '组', items: [{ key: 'i', label: b }] }] })],
      ['物件的量', (b) => ({ ...GROUPED_COLUMNS[0], groups: [{ name: '组', items: [{ key: 'i', label: 'L', value: b }] }] })],
      ['单位（收下 ⇒ 计数只剩一个数）', (b) => ({ ...GROUPED_COLUMNS[0], unit: b })],
    ];
    const SPACES = ['   ', '\t', '　', ' 　 '];
    const INVISIBLE = ['\u200b', '\u200b\u200b', '\ufeff', '\u00ad', '\u200e\u200f', '\u2060', '\u200b\u200d'];
    for (const [what, patch] of patches) {
      for (const blank of SPACES.concat(INVISIBLE)) {
        assert.equal(throwsBlocks(() => renderKanbanColumns({ ...GPLAIN, columns: [patch(blank), GROUPED_COLUMNS[1]] })), true,
          what + ' 收到全空白串（' + JSON.stringify(blank) + '）必须拒');
      }
    }
    const one = renderKanbanColumns({ id: 'g-blank', form: 'grouped', columns: [
      { key: 'a', name: '甲', unit: '', groups: [{ name: '组', items: [{ key: 'i', label: 'L', value: '' }] }] },
      { key: 'b', name: '乙', groups: [{ name: '组', items: [] }] },
    ] });
    assert.ok(one.includes(kanbanCountText(1, KANBAN_COLUMNS_TEXT.unit)), '单位空串＝未给，走缺省那一枚');
    assert.equal(one.includes(SLOT('value')), false, '量空串＝未给：那一格不画（不留空白）');
  });

  it('B 档转义面：组名／物件名／物件的量／列名逐位转义', () => {
    const evil = '"><script>alert(1)</script>';
    const one = renderKanbanColumns({
      id: 'evil-grouped',
      form: 'grouped',
      columns: [
        { key: 'a', name: evil, groups: [{ name: evil, items: [{ key: 'k', label: evil, value: evil }] }] },
        { key: 'b', name: 'B', groups: [{ name: '组', items: [] }] },
      ],
    });
    assert.equal(/<script/i.test(one), false, '不得出现可执行脚本标签');
    assert.ok(one.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(one.includes('&quot;'), '引号转义');
  });

  it('B 档分隔符门：样例渲染的可见文本零命中（R1 ·／R2 ；／R3 并列顿号）', () => {
    for (const sample of [GPLAIN, GPICKED]) {
      const r = auditHtml('<html><body>' + renderKanbanColumns(sample) + '</body></html>');
      assert.equal(exitCodeFor(r), 0, '分隔符命中：' + JSON.stringify(r.node.hits.slice(0, 2)));
    }
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
    assert.ok(clean.includes('transform: translateY(-' + String(KANBAN_COLUMNS_LIFT_PX) + 'px)'),
      '选中的卡自己站起来（往上挪 ' + String(KANBAN_COLUMNS_LIFT_PX) + 'px，取常量，不写死数字）');
    assert.ok(KANBAN_COLUMNS_LIFT_PX > 0 && KANBAN_COLUMNS_LIFT_PX < KANBAN_COLUMNS_GAP_PX,
      '站起来那一段位移必须落在 (0, 卡间缝) 里：为 0 ＝ 没有这道形，≥ 卡间缝 ＝ 拿起的卡压到下一张身上');
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
    assert.ok(js.includes('is-picked'), '运行时段要自己写选中类：只在渲染期写它 ⇒ 真机上点出来永远没有那一档形');
    assert.ok(js.includes('classList.add("is-picked")') && js.includes('classList.remove("is-picked")'),
      '`paint()` 里按当刻状态**加／撤** `is-picked`（选中／取消／改选／挪动四条路都走它）');
    assert.ok(js.includes(kanbanStatusText(null)), '状态句（没选中那一句）取自渲染期那个函数');
    assert.ok(js.includes(kanbanDropText('\u0001').split('\u0001')[0]), '落点线那句的前半取自渲染期那个函数');
    assert.ok(js.includes(kanbanDropText('\u0001').split('\u0001')[1]), '落点线那句的后半取自渲染期那个函数');
    assert.ok(js.includes(kanbanReceiveText('\u0001').split('\u0001')[0]) === false,
      '收纳键的字不重写（列名不变）：运行时段不必另抄一份');
  });

  it('「不给 `purpose` 时列头几行」全件只有一处口径：attrs 与 README 都写两行，样式段也恒留两行', () => {
    const attrs = readFileSync(join(DIR, 'attrs.ts'), 'utf8');
    const readme = readFileSync(join(DIR, 'README.md'), 'utf8');
    for (const [what, text] of [['attrs.ts', attrs], ['README.md', readme]]) {
      assert.equal(text.includes('列头只有一行'), false,
        what + ' 里写着「列头只有一行」——列头的网格恒有**列名行 ＋ 计数行**两行，`purpose` 只管第三条');
      assert.equal(text.includes('列头只有两行') || text.includes('列头只剩「列名 ＋ 计数」**两行**'), true,
        what + ' 要照实写「不给 purpose ＝ 列头只有两行」');
    }
    /* 样式段的口径与上面两句对得上：三条 areas ⇒ 不给 purpose 只是少画一格，两行恒在。 */
    assert.ok(clean.includes('grid-template-areas: "name add" "count add" "purpose purpose"'),
      '列头网格要照实写出三条 areas（列名行 ＋ 计数行 ＋ 用途行）');
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

/* ── ②B B 档的样式面（二级组减层：层次由「边多」变「边准」） ─────────────── */

describe('kanban-columns ②B B 档样式面（组竖边一道 3px／组名行发丝线／物件行零自带竖边／列壳浮起）', () => {
  const css = kanbanColumnsCss();
  const clean = stripComments(css);
  /** 新档那一段自己的文本（`style-grouped.ts` 的产物）——形态隔离与皮肤纪律都按它扫。 */
  const grouped = stripComments(kanbanColumnsGroupedCss());
  const ROOT = '.ilife-page-ui .' + KANBAN_COLUMNS_CLASS + '.' + kanbanColumnsFormClass('grouped');
  const RULE = (slot) => ROOT + ' ' + SEL(slot);
  /** 取「以这条选择器打头的那条规则」的正文（够用就停：一条规则一个 `}`）。 */
  const ruleOf = (text, selector) => {
    const at = text.indexOf(selector + ' {');
    assert.ok(at >= 0, '样式段里找不到这条规则：' + selector);
    return text.slice(at, text.indexOf('}', at));
  };

  it('**组竖边一道**（`KANBAN_COLUMNS_GROUP_EDGE_PX`）：收成 3px，与列那道 1px 拉开一档（原型是 4px）', () => {
    assert.equal(KANBAN_COLUMNS_GROUP_EDGE_PX, 3, '组竖边收到 3px（原型 4px；判据按常量算，不抄数字）');
    const group = ruleOf(grouped, RULE('group'));
    assert.ok(group.includes('border-left: ' + String(KANBAN_COLUMNS_GROUP_EDGE_PX) + 'px solid ' + skinVar('line')),
      '组的那道 3px 竖边取常量、色走皮肤：' + group.slice(0, 200));
    assert.ok(group.includes('display: grid'), '组自己是一格（组名行 ＋ 行挂在它下面）');
  });

  it('**组名行底下一道发丝线**（1px）把「组名」那一层与「物件行」那一层分开', () => {
    const ghead = ruleOf(grouped, RULE('ghead'));
    assert.ok(ghead.includes('border-bottom: 1px solid ' + skinVar('line')), '组名行底下那道 1px 发丝线：' + ghead);
    assert.ok(ghead.includes('min-height: 32px'), '组名行自己也有高度（不是贴着上面那道线）');
    assert.ok(ruleOf(grouped, RULE('gname')).includes('font-weight: 700'), '组名是这一层的重字');
    assert.ok(ruleOf(grouped, RULE('gcount')).includes('font-variant-numeric: tabular-nums'), '组计数走等宽数字');
  });

  it('**物件行不再各有竖边**：行上那道 2px 是**透明槽位**（拿起时才换主色侧标），行里零实线', () => {
    const row = ruleOf(grouped, RULE('row'));
    assert.ok(row.includes('border: 0'), '行上先清掉四边的边：' + row.slice(0, 160));
    assert.ok(/border-left: 2px solid transparent/.test(row), '左侧那道 2px 是透明槽位（拿起时不横跳）：' + row.slice(0, 200));
    assert.equal(row.includes(skinVar('line')), false, '行上不许有看得见的边（原型那儿一根组边里再嵌五根行边，左沿六条边在读）');
    assert.ok(row.includes('min-height: ' + String(KANBAN_COLUMNS_TOUCH_PX) + 'px'), '整行就是那颗按钮：命中盒 ≥ 触控地板');
    const pickedRow = ruleOf(grouped, RULE('row') + '.is-picked');
    assert.ok(pickedRow.includes('border-left-color: ' + skinVar('accent')), '拿起那一行换成主色侧标（形）：' + pickedRow);
    assert.ok(pickedRow.includes('background: ' + skinVar('surface-2')), '拿起那一行铺一层次要面（色）：' + pickedRow);
    assert.ok(pickedRow.includes('transform: translateY(-' + String(KANBAN_COLUMNS_LIFT_PX) + 'px)'),
      '拿起那一行站起来（与 `status` 档同一道形、同一枚常量）：' + pickedRow);
    assert.ok(ruleOf(grouped, RULE('row') + ' > ' + SEL('value')).includes(skinVar('font-num')), '物件的量走等宽数字');
    assert.ok(ruleOf(grouped, RULE('row') + ' > ' + SEL('label')).includes('font-weight: 600'), '物件的名字是行里的主字');
  });

  it('**列壳浮起走 `--shadow`**（纸族本就是 `none`，这一条只读皮肤）', () => {
    const col = ruleOf(grouped, RULE('col'));
    assert.ok(col.includes('box-shadow: ' + skinVar('shadow')), 'B 档的列是一张立起来的板：' + col);
  });

  it('列头**读数一行说完**：名字与计数同占一行（`status` 档那三条 areas 在这一档收成一条）', () => {
    const head = ruleOf(grouped, RULE('head'));
    assert.ok(head.includes('grid-template-areas: "name count add"'), '列头就一行：列名 ＋ 计数 ＋ 加键：' + head);
    assert.ok(ruleOf(grouped, RULE('count')).includes('justify-self: end'), '计数靠右（读数一行说完）');
    assert.equal(grouped.includes('purpose'), false, '这一档的列头根本没有 purpose 那一格（旁白不上屏）');
  });

  it('组与组之间先靠留白（≥ 卡间缝地板 8px），再靠那两道线', () => {
    const body = ruleOf(grouped, RULE('body'));
    const gap = Number((body.match(/gap: (\d+)px/) || [])[1]);
    assert.ok(Number.isFinite(gap) && gap >= KANBAN_COLUMNS_GAP_PX,
      '组与组之间那道留白 ≥ ' + String(KANBAN_COLUMNS_GAP_PX) + 'px：' + body);
  });

  it('**新档那一段真的进了产物**，且每一条规则都钉在 `.is-grouped` 上（`status` 档零命中）', () => {
    assert.ok(clean.includes(grouped), '`style.ts` 得把这一段落进产物（引用了却没插进去 ＝ 现场是死的）');
    const selectors = selectorsOf(grouped);
    assert.ok(selectors.length >= 10, '新档的选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '新档选择器必须 scope 在 .ilife-page-ui：' + one);
        assert.ok(one.includes(KANBAN_COLUMNS_CLASS), '新档选择器必须只碰本件类名根：' + one);
        assert.ok(one.includes(kanbanColumnsFormClass('grouped')), '新档每一条都要钉在形态类名上（否则会漏进旧档）：' + one);
      }
    }
    const rest = clean.split(grouped).join('');
    assert.equal(rest.includes(kanbanColumnsFormClass('grouped')), false, '摘掉新档那一段后，产物里 `.is-grouped` 零命中');
    assert.ok(selectorsOf(rest).length >= 25, '摘掉之后 `status` 档那一段一条都没少：' + selectorsOf(rest).length);
  });

  it('新档那一段的皮肤与文字纪律：只走 `skinVar()`、零手写色值、零截断、零新 token、零生成内容', () => {
    let n = 0;
    for (const m of grouped.matchAll(/var\(\s*--ilife-([a-z0-9-]+)/g)) {
      assert.ok(grouped.startsWith(skinVar(m[1]), m.index), '`' + m[1] + '` 处的 var() 串与 skinVar() 走散');
      n += 1;
    }
    assert.ok(n >= 8, '新档读皮肤的处数不对：' + n);
    /* 色值只许出现在 `skinVar()` 自己的**兜底链**里（同一条声明里就得写着 `var(--ilife-…)`）：
       兜底链之外的字面量 ＝ 绕开皮肤写死颜色。 */
    const raw = kanbanColumnsGroupedCss();
    for (const m of raw.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)) {
      const head = raw.slice(0, m.index);
      const decl = head.slice(Math.max(head.lastIndexOf(';'), head.lastIndexOf('{')) + 1);
      assert.ok(decl.includes('var(--ilife-'), '兜底链之外的颜色字面量：' + m[0] + ' ｜ ' + decl.trim());
    }
    for (const no of ['nowrap', 'text-overflow', 'line-clamp', '!important', ':root', 'overflow-x']) {
      assert.equal(grouped.includes(no), false, '新档那一段不许出现：' + no);
    }
    assert.deepEqual(grouped.match(/--[a-z0-9-]+\s*:/g) || [], [], '新档不得定义新 token');
    assert.equal(/'@media \((?:max|min)-width/.test(kanbanColumnsGroupedCss()), false, '新档不判视口宽度（宽度只走 @container）');
    assert.equal(/content\s*:/.test(grouped), false, '新档不靠生成内容补字（一屏只留一层话：字都要在标记里）');
    assert.ok(grouped.includes('@media ' + KANBAN_COLUMNS_HOVER_QUERY), '悬停只许是增强，且读的是常量里的能力查询串');
    assert.ok(grouped.includes('@media (prefers-reduced-motion: reduce)'), '减动效那一档要在');
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

  it('加法式（新档）：B 档的入参渲染四次逐字节相同，也不带皮肤类', () => {
    const one = renderKanbanColumns(GPICKED);
    assert.equal(renderKanbanColumns(GPICKED), one);
    assert.equal(renderKanbanColumns(GPICKED), one);
    assert.equal(renderKanbanColumns(GPICKED), one);
    assert.equal(/ilife-skin-/.test(one), false, '换皮不换结构（两档同一口径）');
  });

  it('加法式（形态）：新档只在 `.is-grouped` 之下加规则——旧档的选择器一条不少、`is-grouped` 零命中', () => {
    const all = stripComments(kanbanColumnsCss());
    const grouped = stripComments(kanbanColumnsGroupedCss());
    assert.ok(all.includes(grouped), '新档那一段整体进了产物（顺序在窄容器段之前）');
    const rest = all.split(grouped).join('');
    assert.equal(rest.includes(kanbanColumnsFormClass('grouped')), false, '摘掉新档那一段之后，旧档的产物里 `.is-grouped` 零命中');
    assert.ok(selectorsOf(rest).length >= 25, '摘掉之后旧档那一段还在（选择器数量）：' + selectorsOf(rest).length);
    assert.ok(selectorsOf(rest).length < selectorsOf(all).length, '新档是**加法**：整份产物比旧档那一份多规则');
    for (const slot of GROUPED_SLOTS) {
      assert.equal(renderKanbanColumns(PLAIN).includes(SLOT(slot)), false, '旧档的标记里零命中新档槽位：' + slot);
      assert.equal(rest.includes(SEL(slot)), false, '旧档的样式里零命中新档槽位：' + slot);
    }
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
      /* 卡间缝（**地板口径写在 `KANBAN_COLUMNS_GAP_PX`／`KANBAN_COLUMNS_LIFT_PX` 两枚常量上**）：
         拿起的卡自己往上挪 `LIFT`（形）⇒ 它与上一张之间那一道缝是 `GAP−LIFT`——**全件只此一处**允许
         压掉地板；其余每一道 ≥ `GAP`。判据按这两枚常量算，故把某处位移写死成别的数当场红。 */
      assert.ok(KANBAN_COLUMNS_LIFT_PX > 0 && KANBAN_COLUMNS_LIFT_PX < KANBAN_COLUMNS_GAP_PX,
        '站起来那一段位移必须落在 (0, 卡间缝) 里：' + JSON.stringify({ lift: KANBAN_COLUMNS_LIFT_PX, gap: KANBAN_COLUMNS_GAP_PX }));
      for (const c of cases) {
        for (const g of c.gaps) {
          assert.ok(g >= KANBAN_COLUMNS_GAP_PX - KANBAN_COLUMNS_LIFT_PX,
            width + ' 档卡间缝低于地板（' + String(KANBAN_COLUMNS_GAP_PX) + '−' + String(KANBAN_COLUMNS_LIFT_PX) + '）：'
            + JSON.stringify(c.gaps));
        }
      }
      for (const c of [cases[0], cases[2]]) {
        for (const g of c.gaps) {
          assert.ok(g >= KANBAN_COLUMNS_GAP_PX, width + ' 档没拿起的卡之间缝不足 ' + String(KANBAN_COLUMNS_GAP_PX)
            + 'px：' + JSON.stringify(c.gaps));
        }
      }
      assert.equal(cases[1].gaps[0], KANBAN_COLUMNS_GAP_PX - KANBAN_COLUMNS_LIFT_PX,
        width + ' 档拿起的卡没站起来／位移与常量对不上（往上挪 LIFT ⇒ 它上面那道缝 GAP−LIFT）：'
        + JSON.stringify({ gaps: cases[1].gaps, lift: KANBAN_COLUMNS_LIFT_PX }));
      for (const g of cases[1].gaps.slice(1)) {
        assert.ok(g >= KANBAN_COLUMNS_GAP_PX, width + ' 档卡间缝不足 ' + String(KANBAN_COLUMNS_GAP_PX) + 'px：'
          + JSON.stringify(cases[1].gaps));
      }
      /* 选中那一档的形是**算得出来**的：拿起的卡 `transform` 恰好等于往上挪 `LIFT`，没拿起的卡没有位移。
         （渲染期就挂着选中态的这一格，量的是 CSS 那一头的形；真指针点出来的那一份在 ⑤ 里量。） */
      const lifts = await page.ev('(function(){'
        + 'var root=document.querySelector("[data-case=\\"picked\\"]").querySelector(' + ROOT_S + ');'
        + 'return [].slice.call(root.querySelectorAll(' + CARD_S + ')).map(function(c){'
        + 'return {key:c.getAttribute(' + q(KANBAN_COLUMNS_CARD_ATTR) + '),'
        + 'picked:c.classList.contains("is-picked"),tf:getComputedStyle(c).transform};});}())');
      const wantMatrix = 'matrix(1, 0, 0, 1, 0, -' + String(KANBAN_COLUMNS_LIFT_PX) + ')';
      assert.deepEqual(lifts.filter((c) => c.picked).map((c) => c.key), ['c-soup'],
        width + ' 档恰好一张卡挂选中类：' + JSON.stringify(lifts));
      for (const c of lifts) {
        assert.equal(c.tf, c.picked ? wantMatrix : 'none',
          width + ' 档选中形不对（' + c.key + '）：' + JSON.stringify(c));
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

/* ── ④B B 档真机四档几何（容器 320／390／620／1280） ─────────────────── */

/** B 档那几个槽位与 `data-*` 的选择器（判据侧一律经这些助手，不另抄字面量）。 */
const ROW_S = q(SEL('row'));
const GROUP_S = q(SEL('group'));
const GHEAD_S = q(SEL('ghead'));
const GNAME_S = q(SEL('gname'));
const GCOUNT_S = q(SEL('gcount'));
const LABEL_S = q(SEL('label'));
const VALUE_S = q(SEL('value'));

describe('kanban-columns ④B B 档真机四档几何（headless Chrome ＋ CDP · 容器 320／390／620／1280）', async () => {
  const page = await startShapesPage({
    css: skinCss() + '\n' + kanbanColumnsCss(),
    html: '<div class="ilife-page-ui" data-case="plain">' + renderKanbanColumns(GPLAIN) + '</div>'
      + '<div class="ilife-page-ui" data-case="picked">' + renderKanbanColumns(GPICKED) + '</div>'
      + '<div class="ilife-page-ui" data-case="empty">' + renderKanbanColumns({ ...GPLAIN, activeCol: 3 }) + '</div>',
    portOffset: 47,
  });
  if (page === null) {
    it('真机未跑（本机没有 Chrome）：退确定性几何判据', (t) => {
      console.log('kanban-columns B 档几何：真机未跑（本机没有 Chrome），原因=startShapesPage 返回 null');
      t.skip('本机没有 Chrome');
    });
    return;
  }

  /** 三个 case 在窄档各自露第几列（0 起）：plain 与 picked 是第 1 列、`empty` 是第 3 列。 */
  const NARROW_CASE_COL = [0, 0, 2];

  /** 页内：逐 case 量 B 档的几何（列／组／组名行／物件行／可点件 ＋ 那两道线的**算出来的样子**）。 */
  const BOX_FN = '(function(){'    + 'function box(el){var r=el.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),'
    + 'l:Math.round(r.left),t:Math.round(r.top)};}'
    + 'function shown(el){var cs=getComputedStyle(el),r=el.getBoundingClientRect();'
    + 'return cs.display!=="none"&&cs.visibility!=="hidden"&&r.width>0&&r.height>0;}'
    + 'function all(sel,scope){return [].slice.call((scope||document).querySelectorAll(sel)).filter(shown);}'
    + 'function alpha0(color){return /rgba\\(\\s*0,\\s*0,\\s*0,\\s*0\\s*\\)|transparent/.test(color);}'
    + 'var cases=[].slice.call(document.querySelectorAll("[data-case]"));'
    + 'var out=[];'
    + 'for(var i=0;i<cases.length;i+=1){'
    + ' var root=cases[i].querySelector(' + ROOT_S + ');'
    + ' var cols=all(' + COL_S + ',root), groups=all(' + GROUP_S + ',root), rows=all(' + ROW_S + ',root);'
    + ' var gaps=[];'
    + ' for(var c=0;c<cols.length;c+=1){var list=all(' + ROW_S + ',cols[c]);'
    + '  for(var j=1;j<list.length;j+=1){var a=list[j-1].getBoundingClientRect(),b=list[j].getBoundingClientRect();'
    + '   if(Math.abs(a.left-b.left)<3) gaps.push(Math.round(b.top-a.bottom));}}'
    + ' var sw=root.querySelector(' + SWITCH_S + ');'
    /* 主色的**实际取值**：在同一条皮肤作用域里放一枚探针读出来（判据不抄色值字面量）。 */
    + ' var probe=document.createElement("div");probe.style.borderColor=' + q(skinVar('accent')) + ';'
    + ' cases[i].appendChild(probe);var edgeColor=getComputedStyle(probe).borderTopColor;'
    + ' cases[i].removeChild(probe);'
    + ' out.push({cols:cols.length,segs:all(' + SEG_S + ',root).length,swShown:sw?shown(sw):false,edgeColor:edgeColor,'
    + '  groups:groups.length,groupRows:groups.map(function(g){return all(' + ROW_S + ',g).length;}),'
    + '  groupNames:all(' + GNAME_S + ',root).map(function(n){return n.textContent;}),'
    + '  groupEdge:groups.map(function(g){return getComputedStyle(g).borderLeftWidth;}),'
    + '  groupLine:groups.map(function(g){var cs=getComputedStyle(g.querySelector(' + GHEAD_S + '));'
    + '   return cs.borderBottomWidth+" "+cs.borderBottomStyle;}),'
    + '  rows:rows.map(box),rowBorder:rows.map(function(r){var cs=getComputedStyle(r);'
    + '   return {w:cs.borderLeftWidth,c:cs.borderLeftColor,transparent:alpha0(cs.borderLeftColor),'
    + '   picked:r.classList.contains("is-picked")};}),'
    + '  colShadow:cols.map(function(c){return getComputedStyle(c).boxShadow;}),'
    + '  headSameLine:cols.map(function(c){var n=c.querySelector(' + NAME_S + '),k=c.querySelector(' + COUNT_S + ');'
    + '   if(!n||!k) return null;'
    + '   return Math.abs(Math.round(n.getBoundingClientRect().top)-Math.round(k.getBoundingClientRect().top))<=1;}),'
    + '  add:all(' + ADD_S + ',root).map(box),recv:all(' + RECV_S + ',root).map(box),gaps:gaps,'
    + '  drops:all(' + DROP_S + ',root).length,slots:all(' + SLOT_S + ',root).length,'
    + '  names:all(' + NAME_S + ',root).length,counts:all(' + COUNT_S + ',root).length,'
    + '  gcounts:all(' + GCOUNT_S + ',root).length});'
    + '}return out;}())';

  it('四档零横溢、零截断、行 ≥44 高（整行就是按钮）、行间缝 ≥8、零落点线零旁白', async () => {
    const selectors = [COL_S, ROW_S, GROUP_S, GHEAD_S, GNAME_S, GCOUNT_S, LABEL_S, VALUE_S, NAME_S, COUNT_S, RECV_S, ADD_S, SEG_S, SLOT_S, DROP_S]
      .map((s) => JSON.parse(s));
    for (const width of [320, 390, 620, 1280]) {
      await page.setWidth(width);
      const rows = await page.read(selectors);
      const frame = await page.frame();
      const cases = await page.ev(BOX_FN);
      const narrow = width <= KANBAN_COLUMNS_NARROW_PX;
      console.log('kanban-columns B 档几何读数 ' + JSON.stringify({
        width, frame,
        rows: rows.map((r) => ({ sel: r.sel, visible: r.visible, clipped: r.clipped, scrollsX: r.scrollsX })),
        cases: cases.map((c) => ({ cols: c.cols, segs: c.segs, swShown: c.swShown, groups: c.groups,
          groupRows: c.groupRows, groupNames: c.groupNames,
          groupEdge: c.groupEdge, groupLine: c.groupLine, headSameLine: c.headSameLine, gaps: c.gaps,
          transparent: c.rowBorder.map((b) => b.transparent), drops: c.drops, slots: c.slots })),
      }));
      assert.ok(frame.fxScrollW <= width + 1, width + ' 档夹具容器横溢：' + JSON.stringify(frame));
      assert.ok(frame.docScrollW <= frame.innerW + 1, width + ' 档页面横溢：' + JSON.stringify(frame));
      for (const r of rows) {
        assert.ok(r.maxScrollW <= r.maxClientW + 1, width + ' 档 ' + r.sel + ' 溢出：' + JSON.stringify(r));
        assert.equal(r.clipped, 0, width + ' 档 ' + r.sel + ' 有节点被压字／截断（组名与行永不 `…`）：' + JSON.stringify(r));
        assert.equal(r.scrollsX, 0, width + ' 档 ' + r.sel + ' 藏了横滑：' + JSON.stringify(r));
      }
      for (const [ci, c] of cases.entries()) {
        assert.equal(c.cols, narrow ? 1 : GROUPED_COLUMNS.length, width + ' 档可见列数不对：' + JSON.stringify(c));
        assert.equal(c.names, narrow ? 1 : GROUPED_COLUMNS.length, width + ' 档可见列名数不对（列头一直在）');
        assert.equal(c.counts, narrow ? 1 : GROUPED_COLUMNS.length, width + ' 档可见计数数不对（列计数一行）');
        assert.equal(c.segs, narrow ? GROUPED_COLUMNS.length : 0, width + ' 档分段切换该出／该收不对（判的是本件自己的宽度）');
        assert.equal(c.swShown, narrow, width + ' 档分段切换整条该出／该收不对');
        /* **一节一节都是可见的**：窄档只露当前那一列的那几组（三个 case 各自露第 1／1／3 列），宽档三列六组。 */
        const wantRows = narrow
          ? GROUPED_COLUMNS[NARROW_CASE_COL[ci]].groups.map((g) => g.items.length)
          : GROUPED_COLUMNS.flatMap((col) => col.groups.map((g) => g.items.length));
        assert.equal(c.groupRows.length, wantRows.length, width + ' 档可见组数不对：' + JSON.stringify(c.groupRows));
        assert.deepEqual(c.groupRows, wantRows, width + ' 档各组行数不对：' + JSON.stringify(c.groupRows));
        assert.equal(c.gcounts, wantRows.length, width + ' 档可见组计数数不对（每组一个数）');
        assert.equal(c.drops, 0, width + ' 档 B 档不该有落点线');
        assert.equal(c.slots, 0, width + ' 档 B 档不该有空槽旁白');
        /* 命中盒：整行 ≥44 高；加键／收纳键 ≥44 见方。 */
        for (const b of c.rows) {
          assert.ok(b.w >= KANBAN_COLUMNS_TOUCH_PX, width + ' 档行太窄：' + JSON.stringify(b));
          assert.ok(b.h >= KANBAN_COLUMNS_TOUCH_PX, width + ' 档行太矮（整行就是那颗按钮）：' + JSON.stringify(b));
        }
        for (const b of c.add.concat(c.recv)) {
          assert.ok(b.w >= KANBAN_COLUMNS_TOUCH_PX && b.h >= KANBAN_COLUMNS_TOUCH_PX,
            width + ' 档可点件命中盒不足 44：' + JSON.stringify(b));
        }
        /* 行间缝（地板口径与 `status` 档同一处：拿起的行往上挪 `LIFT` ⇒ 上面那道缝 GAP−LIFT）。 */
        for (const g of c.gaps) {
          assert.ok(g >= KANBAN_COLUMNS_GAP_PX - KANBAN_COLUMNS_LIFT_PX,
            width + ' 档行间缝低于地板：' + JSON.stringify(c.gaps));
        }
        /* **减层的机器读数**：组竖边＝常量、组名行底下一道 1px 发丝线、物件行量出来没有竖边。 */
        for (const w of c.groupEdge) {
          assert.equal(w, String(KANBAN_COLUMNS_GROUP_EDGE_PX) + 'px',
            width + ' 档组竖边不是常量那一道：' + JSON.stringify(c.groupEdge));
        }
        for (const line of c.groupLine) {
          assert.equal(line, '1px solid', width + ' 档组名行底下那道发丝线不对：' + JSON.stringify(c.groupLine));
        }
        /* **减层的机器读数**：物件行平时量出来**没有**看得见的竖边，只有拿起的那一行换成主色侧标
           （而且那道槽位的宽度拿起前后一样 ⇒ 拿起时不横跳）。 */
        const shownEdge = c.rowBorder.filter((b) => !b.transparent);
        const wantEdge = c.rowBorder.filter((b) => b.picked);
        assert.equal(shownEdge.length, wantEdge.length,
          width + ' 档只有拿起的那一行才许有看得见的竖边（层次由「边准」给，不是「边多」）：'
          + JSON.stringify(c.rowBorder));
        for (const b of shownEdge) {
          assert.equal(b.c, c.edgeColor, width + ' 档拿起那一行的侧标要走主色：' + JSON.stringify(c.rowBorder));
        }
        assert.equal(new Set(c.rowBorder.map((b) => b.w)).size, 1,
          width + ' 档拿起前后左侧那道槽位宽度不一致（拿起时会横跳）：' + JSON.stringify(c.rowBorder.map((b) => b.w)));
        /* 列壳浮起：中性皮肤下 `--shadow` 是真投影（纸族本就是 none，那由皮肤取值表管）。 */
        for (const s of c.colShadow) {
          assert.notEqual(s, 'none', width + ' 档列壳没有浮起：' + JSON.stringify(c.colShadow));
        }
        /* 列头**读数一行说完**：列名与计数落在同一行（不是上下两行）。 */
        for (const same of c.headSameLine) {
          assert.equal(same, true, width + ' 档列名与计数不在同一行（原型第二级字那一行不该上屏）：' + JSON.stringify(c.headSameLine));
        }
      }
      assert.equal((await page.errs()).length, 0, '页内零未捕获错误');
    }
  });

  it('窄档的分段切换是真的：当前那一段按下态，列区只留那一列', async () => {
    await page.setWidth(320);
    const before = await page.ev('(function(){'
      + 'var root=document.querySelector("[data-case=\\"empty\\"]").querySelector(' + ROOT_S + ');'
      + 'var cols=[].slice.call(root.querySelectorAll(' + COL_S + '));'
      + 'var groups=[].slice.call(root.querySelectorAll(' + GROUP_S + '));'
      + 'return {show:root.getAttribute(' + q(KANBAN_COLUMNS_SHOW_ATTR) + '),'
      + 'display:cols.map(function(c){return getComputedStyle(c).display;}),'
      + 'groups:[].slice.call(root.querySelectorAll(' + GROUP_S + ')).filter(function(g){'
      + 'return getComputedStyle(g).display!=="none"&&g.getBoundingClientRect().width>0;}).length,'
      + 'segs:[].slice.call(root.querySelectorAll(' + SEG_S + ')).map(function(s){'
      + 'return s.getAttribute("aria-pressed")+(s.className.indexOf("is-on")>=0?"+on":"");})};}())');
    console.log('kanban-columns B 档分段读数 ' + JSON.stringify(before));
    assert.equal(before.show, '3', '入参 activeCol=3 ⇒ 窄档当前列是第 3 列');
    assert.deepEqual(before.display, ['none', 'none', 'flex'], '窄档只留当前那一列');
    assert.deepEqual(before.segs, ['false', 'false', 'true+on'], '当前那一段按下态 ＋ `is-on`');
    assert.equal(before.groups, GROUPED_COLUMNS[2].groups.length, '窄档只量得到当前那一列的那两组');
  });

  it('关页', () => { page.close(); });
});

/* ── ⑤ 行为（真机 · **真指针**）＋ 四套皮肤同构 ───────────────────── */

/** **真指针铁律（本判据自己踩过的坑）**：点卡／点分段／点收纳键／点取消键／点加键这几条**一律**走
 *  CDP 的 `Input.dispatchMouseEvent`（`p.mouse()`：`mousePressed` ＋ `mouseReleased`，浏览器自己
 *  合成那枚 `click`）——**不许**用 `element.click()`。
 *  合成 `click` 不经指针、也不看元素到不到得了：390 档是**窄档**（列区一次只留当前那一列），
 *  藏起来那两列的收纳键量出来是零宽零高，`.click()` 照样点得动 ⇒ 它能在一份「真用户走不通」的
 *  通路上全绿（2026-09 审查席读数：`[data-ilife-kanban-receive="done"]` 的矩形是
 *  `{x:0,y:0,w:0,h:0}`，而那条判据一路绿）。故每条真指针动作之前先量**可达性**：
 *  宽高非零 ＋ 那一点上命中的就是它自己；窄档按「先点分段、再点该列的收纳键」走真路径。
 */
describe('kanban-columns ⑤ 行为（真机 · 真指针 CDP Input）＋ 四套皮肤同构', async () => {
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
  /** 一次页内快照：选中那一档的**类名与算出来的样式**（底／描边／位移）都在这里读。 */
  const SNAP = '(function(){'
    + 'var root=document.querySelector(' + ROOT_S + ');'
    + 'var all=[].slice.call(root.querySelectorAll(' + CARD_S + '));'
    + 'var picked=all.filter(function(c){return c.classList.contains("is-picked");});'
    + 'var plain=all.filter(function(c){return !c.classList.contains("is-picked");})[0];'
    + 'var box=function(c){if(!c)return null;var cs=getComputedStyle(c);'
    + 'return {bg:cs.backgroundColor,border:cs.borderTopColor,transform:cs.transform};};'
    + 'return {pick:root.getAttribute(' + q(KANBAN_COLUMNS_PICK_ATTR) + '),'
    + 'picked:picked.map(function(c){return c.getAttribute(' + q(KANBAN_COLUMNS_CARD_ATTR) + ');}),'
    + 'pickedBox:box(picked[0]),plainBox:box(plain)};})()';
  const STATE = '(function(){'
    + 'var root=document.querySelector(' + ROOT_S + ');'
    /* `accent-soft` 的**实际取值**：在同一个皮肤作用域里放一枚探针读出来（判据不抄色值字面量）。 */
    + 'var probe=document.createElement("div");'
    + 'probe.style.background=' + q(skinVar('accent-soft')) + ';'
    + 'probe.style.borderColor=' + q(skinVar('accent')) + ';'
    + 'root.parentNode.insertBefore(probe,root);'
    + 'var probeStyle=getComputedStyle(probe), soft=probeStyle.backgroundColor, edge=probeStyle.borderTopColor;'
    + 'probe.parentNode.removeChild(probe);'
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
    + 'var snap=' + SNAP + ';'
    + 'return {pick:snap.pick,show:root.getAttribute(' + q(KANBAN_COLUMNS_SHOW_ATTR) + '),'
    + 'bound:root.getAttribute(' + q(KANBAN_COLUMNS_BOUND_ATTR) + '),'
    + 'status:(root.querySelector(' + STATUS_S + ')||{}).textContent,'
    + 'cancel:root.querySelector(' + CANCEL_S + ')!==null,'
    + 'cancelText:(root.querySelector(' + CANCEL_S + ')||{}).textContent,'
    + 'pressed:[].slice.call(root.querySelectorAll(' + CARD_S + ')).map(function(c){return c.getAttribute("aria-pressed");}),'
    + 'clsPicked:snap.picked,pickedBox:snap.pickedBox,plainBox:snap.plainBox,soft:soft,edge:edge,'
    + 'cols:cols,evts:window.__kb};}())';
  /** 事件序列落账：三条浏览器原生事件（捕获期，先于委派）＋ 本件四条事件，每条各带**当刻的类名快照**。
   *  `snap` 是**函数**（每个事件那一刻现算）——存成值的话四条事件会共用同一个开机快照。 */
  const WIRE_TIMELINE = '(function(){window.__tl=[];'
    + 'var snap=function(){return ' + SNAP + ';};'
    + '["pointerdown","pointerup","click"].forEach(function(n){'
    + 'document.addEventListener(n,function(e){window.__tl.push({name:n,state:snap()});},true);});'
    + [KANBAN_COLUMNS_EVENT_PICK, KANBAN_COLUMNS_EVENT_MOVE, KANBAN_COLUMNS_EVENT_CANCEL, KANBAN_COLUMNS_EVENT_ADD]
      .map((n) => 'document.addEventListener(' + q(n) + ',function(e){'
        + 'window.__tl.push({name:' + q(n) + ',detail:e.detail,state:snap()});});').join('')
    + 'return true;}())';
  const seqOf = () => p.ev('window.__tl.map(function(o){return o.name+"|"+(o.state.picked||[]).join("+")+"|"+o.state.pick;})');

  /* ── 真指针小件：坐标 ＋ **可达性**（宽高非零、那一点上命中的就是它自己） ────────── */
  const POINT_AT = (sel) => '(function(){'
    + 'var el=document.querySelector(' + q(sel) + ');'
    + 'if (!el) return {miss:true};'
    + 'var b=el.getBoundingClientRect();'
    + 'var x=Math.round(b.left+b.width/2), y=Math.round(b.top+b.height/2);'
    + 'var cs=getComputedStyle(el), hit=document.elementFromPoint(x,y);'
    + 'var col=el.closest(' + JSON.stringify('[' + KANBAN_COLUMNS_COL_ATTR + ']') + ');'
    + 'return {x:x,y:y,w:Math.round(b.width),h:Math.round(b.height),disp:cs.display,'
    + 'colDisp:col?getComputedStyle(col).display:null,'
    + 'ok:!!hit && (hit===el || el.contains(hit))};}())';
  /** 真指针点一下：先量可达性（量不过就是**判据红**，不是静默跳过），再走 CDP 的鼠标通道。 */
  const tapAt = async (sel) => {
    const g = await p.ev(POINT_AT(sel));
    assert.ok(g.miss !== true, '真指针要点的元素不在页上：' + sel);
    assert.ok(g.w > 0 && g.h > 0,
      '真指针要点的元素量出来是零宽／零高（屏上到不了它——窄档得先点分段把它那一列换出来）：' + sel + ' ' + JSON.stringify(g));
    assert.equal(g.ok, true, '真指针那一点上命中的不是它（被盖住／不在当前那一列）：' + sel + ' ' + JSON.stringify(g));
    await p.mouse(g.x, g.y);
    return g;
  };
  const CARD_SEL = (key) => ATTR(KANBAN_COLUMNS_CARD_ATTR + '="' + key + '"');
  const RECV_SEL = (key) => ATTR(KANBAN_COLUMNS_RECEIVE_ATTR + '="' + key + '"');
  const ADD_SEL = (key) => ATTR(KANBAN_COLUMNS_ADD_ATTR + '="' + key + '"');
  const SEG_SEL = (at) => ATTR(KANBAN_COLUMNS_SEG_ATTR + '="' + at + '"');
  const CANCEL_SEL = ATTR(KANBAN_COLUMNS_CANCEL_ATTR);
  const colOf = (st, key) => st.cols.find((c) => c.key === key);
  /** 选中的卡「站起来」之后 `transform` 的算出来的样子（判据不写死数字）。 */
  const LIFT_MATRIX = 'matrix(1, 0, 0, 1, 0, -' + String(KANBAN_COLUMNS_LIFT_PX) + ')';

  it('拿起：**真指针点卡**（完整事件序列 ＋ 类名序列）→ 选中形（`is-picked` ＋ 算出来的底与位移）＋ 收纳键／落点线／取消键 ＋ pick 事件', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await p.ev(WIRE_TIMELINE);
    await tapAt(CARD_SEL('c-soup'));
    const st = await p.ev(STATE);
    const seq = await seqOf();
    console.log('kanban-columns 真指针拿起时序 ' + JSON.stringify({ seq, pick: st.pick, cls: st.clsPicked,
      box: st.pickedBox, soft: st.soft, edge: st.edge }));
    assert.deepEqual(seq, ['pointerdown||null', 'pointerup||null', 'click||null',
      KANBAN_COLUMNS_EVENT_PICK + '|c-soup|c-soup'],
    '真指针点一下的完整事件序列与类名序列（选发生在 `click` 的委派里，故它在 `click` 之后）：' + JSON.stringify(seq));
    assert.equal(st.pick, 'c-soup', '根上写清选中了谁');
    /* 严重 1 的读数：**运行时段真写了 `is-picked`**，而且那一档形算得出来。 */
    assert.deepEqual(st.clsPicked, ['c-soup'], '全页恰好一张卡挂 `is-picked`（只在渲染期写 ＝ 真机上没有这一档）');
    assert.equal(st.pickedBox.bg, st.soft, '选中的卡换成强调软底（`accent-soft` 的实际取值）：' + JSON.stringify(st.pickedBox));
    assert.equal(st.pickedBox.border, st.edge, '选中那一档的描边走主色：' + JSON.stringify(st.pickedBox));
    assert.equal(st.pickedBox.transform, LIFT_MATRIX,
      '选中的卡自己站起来（位移＝`KANBAN_COLUMNS_LIFT_PX`）：' + JSON.stringify(st.pickedBox));
    assert.equal(st.plainBox.transform, 'none', '没选中的卡没有位移');
    assert.notEqual(st.plainBox.bg, st.soft, '没选中的卡还是原来的面');
    /* 既有的选中态读数（挪动通路与收尾）： */
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

  it('挪动：**窄档真路径**（点卡 → 点第 3 段 → 点该列收纳键）→ 卡真挪过去 ＋ 两端计数与卡上那枚状态重写 ＋ move 事件', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await p.ev(WIRE_TIMELINE);
    /* 窄档的事实：列区一次只留当前那一列 ⇒ 第 3 列此刻**到不了**（这就是「真用户必须先点分段」）。 */
    const off = await p.ev(POINT_AT(RECV_SEL('done')));
    assert.equal(off.colDisp, 'none', '第 3 列此刻整列 `display:none`（`.click()` 会在这条走不通的通路上照样全绿）');
    assert.equal(off.w * off.h, 0, '窄档没点分段之前，第 3 列的收纳键量出来是零宽零高：' + JSON.stringify(off));
    await tapAt(CARD_SEL('c-soup'));
    await tapAt(SEG_SEL('3'));
    assert.equal((await p.ev(STATE)).show, '3', '点第 3 段 ⇒ 当前列换成第 3 列');
    await tapAt(RECV_SEL('done'));
    const st = await p.ev(STATE);
    console.log('kanban-columns 真指针挪动读数 ' + JSON.stringify({ pick: st.pick, done: colOf(st, 'done').cards,
      counts: st.cols.map((c) => c.count), cls: st.clsPicked }));
    assert.equal(st.pick, null, '挪完选中态收掉');
    assert.deepEqual(st.clsPicked, [], '挪完选中形也收掉（卡身上不留 `is-picked`）');
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
    /* **这一挪是真手势打出来的**：三次动作各来一条 `pointerdown`，而挪动那一下紧跟在 `click` 之后。
       `element.click()` 只出一条 `click`——它能在这条通路上全绿，真指针这条替不了。 */
    const names = (await seqOf()).map((s) => s.split('|')[0]);
    console.log('kanban-columns 真指针挪动时序 ' + JSON.stringify(names));
    assert.equal(names.filter((n) => n === 'pointerdown').length, 3,
      '三次真指针动作（点卡／点分段／点收纳键）各来一条 `pointerdown`：' + JSON.stringify(names));
    assert.deepEqual(names.slice(-4), ['pointerdown', 'pointerup', 'click', KANBAN_COLUMNS_EVENT_MOVE],
      '挪动那一下是**真手势**打出来的（合成 `click()` 只出一条 `click`）：' + JSON.stringify(names));
    const move = st.evts[st.evts.length - 1];
    assert.equal(move.type, KANBAN_COLUMNS_EVENT_MOVE);
    assert.deepEqual(move.detail, { id: 'kanban-dinner', key: 'c-soup', from: 'todo', to: 'done' });
  });

  it('挪空一列：真指针走「点第 2 段 → 点 doing 那张 → 点第 1 段 → 点 todo 的收纳键」→ 源列当场补出空槽', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await tapAt(SEG_SEL('2'));
    await tapAt(CARD_SEL('c-braise'));
    await tapAt(SEG_SEL('1'));
    await tapAt(RECV_SEL('todo'));
    const st = await p.ev(STATE);
    console.log('kanban-columns 真指针挪空读数 ' + JSON.stringify({ doing: colOf(st, 'doing').cards,
      todo: colOf(st, 'todo').cards, slot: colOf(st, 'doing').slot }));
    assert.deepEqual(colOf(st, 'doing').cards, [], '源列空了');
    assert.equal(colOf(st, 'doing').slot, KANBAN_COLUMNS_TEXT.emptyTitle + KANBAN_COLUMNS_TEXT.emptyNote,
      '空槽当场补出来（两句话）');
    assert.equal(colOf(st, 'doing').count, kanbanCountText(0, '道'), '空列计数照实写 0');
    assert.deepEqual(colOf(st, 'todo').cards, ['c-dumpling', 'c-soup', 'c-braise'], '收到的卡排在那一列最后');
    assert.equal(st.evts.filter((e) => e.type === KANBAN_COLUMNS_EVENT_MOVE).length, 1, '一条 move 事件（真指针挪了一次）');
  });

  it('取消与改选：**真指针点取消键** → 选中形撤干净（类名空、位移回 `none`、面回原样）；再点另一张＝改选', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await p.ev(WIRE_TIMELINE);
    await tapAt(CARD_SEL('c-dumpling'));
    assert.deepEqual((await p.ev(STATE)).clsPicked, ['c-dumpling'], '先拿起 c-dumpling');
    await tapAt(CANCEL_SEL);
    const st = await p.ev(STATE);
    console.log('kanban-columns 真指针取消读数 ' + JSON.stringify({ cls: st.clsPicked, pick: st.pick,
      plain: st.plainBox, soft: st.soft }));
    assert.deepEqual(colOf(st, 'todo').cards, ['c-dumpling', 'c-soup'], '卡原样不动');
    assert.equal(st.pick, null);
    assert.deepEqual(st.clsPicked, [], '**取消之后一张都不许还挂着 `is-picked`**（屏上不许留一张高亮卡）');
    assert.equal(st.pickedBox, null, '没有卡挂选中形');
    assert.equal(st.plainBox.transform, 'none', '取消之后位移回 `none`（不许留那 2px）');
    assert.notEqual(st.plainBox.bg, st.soft, '取消之后面回原样（不许留软底）');
    assert.equal(st.cancel, false, '取消键收起来');
    assert.equal(colOf(st, 'doing').drop, 0, '落点线撤掉');
    assert.deepEqual(st.cols.map((c) => c.recvOff), [true, true, true], '收纳键回到按不动');
    assert.deepEqual(st.pressed, ['false', 'false', 'false'], '按下态也收掉');
    assert.equal(st.status, kanbanStatusText(null), '状态句回到「还没选中卡片」');
    const last = st.evts[st.evts.length - 1];
    assert.equal(last.type, KANBAN_COLUMNS_EVENT_CANCEL);
    assert.deepEqual(last.detail, { id: 'kanban-dinner', key: 'c-dumpling' });
    /* 再点同一张＝取消；点另一张＝改选（**任何时刻恰好一张挂选中类**：旧那张必须先撤）。 */
    await tapAt(CARD_SEL('c-soup'));
    assert.deepEqual((await p.ev(STATE)).clsPicked, ['c-soup'], '再点同一张＝取消之后又拿起一张');
    await tapAt(CARD_SEL('c-dumpling'));
    const st3 = await p.ev(STATE);
    assert.equal(st3.pick, 'c-dumpling', '点另一张＝改选（同一时刻只有一张被选中）');
    assert.deepEqual(st3.clsPicked, ['c-dumpling'], '**改选之后旧那张的高亮要撤掉**（两张都亮＝两张都像选中）');
    assert.equal(st3.evts[st3.evts.length - 1].type, KANBAN_COLUMNS_EVENT_PICK);
    assert.deepEqual(st3.evts[st3.evts.length - 1].detail, { id: 'kanban-dinner', key: 'c-dumpling', from: 'todo' });
    assert.equal(colOf(st3, 'todo').drop, 0, '改选到同一列：那一列本来就没有落点线');
    assert.equal(colOf(st3, 'doing').drop, 1);
    const seq = await seqOf();
    console.log('kanban-columns 真指针类名序列 ' + JSON.stringify(seq));
    assert.deepEqual(seq.filter((s) => s.startsWith(KANBAN_COLUMNS_EVENT_PICK)),
      [KANBAN_COLUMNS_EVENT_PICK + '|c-dumpling|c-dumpling', KANBAN_COLUMNS_EVENT_PICK + '|c-soup|c-soup',
        KANBAN_COLUMNS_EVENT_PICK + '|c-dumpling|c-dumpling'],
    '`pick` 那一刻的类名快照：每次都只有新那一张挂 `is-picked`：' + JSON.stringify(seq));
    await tapAt(CARD_SEL('c-dumpling'));
    assert.equal((await p.ev(STATE)).pick, null, '再点同一张＝取消');
    assert.equal((await p.ev(STATE)).evts.slice(-1)[0].type, KANBAN_COLUMNS_EVENT_CANCEL);
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('加键与分段切换：真指针点第 2 段 → 点该列加键 → `add` 事件（都不写库、都不派发额外事件）', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await tapAt(SEG_SEL('2'));
    await tapAt(ADD_SEL('doing'));
    const st = await p.ev(STATE);
    const addEvt = st.evts[st.evts.length - 1];
    console.log('kanban-columns 加键读数 ' + JSON.stringify(addEvt));
    assert.equal(addEvt.type, KANBAN_COLUMNS_EVENT_ADD);
    assert.deepEqual(addEvt.detail, { id: 'kanban-dinner', column: 'doing' });
    assert.equal(st.pick, null, '加键不改选中态（本件不写库）');
    await tapAt(SEG_SEL('2'));
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

  it('列头恒两行：不给 `purpose` 的列，列名与计数**各占一行**（同上口径的那条机器读数）', async () => {
    const noPurpose = {
      id: 'kanban-nopurpose',
      columns: [
        { key: 'todo', name: '想做', cards: [{ key: 'c1', title: '葱油饼' }] },
        { key: 'done', name: '做过了', cards: [] },
      ],
    };
    await p.at(fixture('paper', noPurpose, false), { width: 1440, height: 900 });
    const rows = await p.ev('(function(){return [].slice.call(document.querySelectorAll(' + q(SEL('head')) + ')).map(function(h){'
      + 'var r=function(sel){var n=h.querySelector(sel);'
      + 'return n?{t:Math.round(n.getBoundingClientRect().top),text:n.textContent}:null;};'
      + 'return {col:h.parentNode.getAttribute(' + q(KANBAN_COLUMNS_COL_ATTR) + '),'
      + 'purpose:!!h.querySelector(' + q(SEL('purpose')) + '),'
      + 'tracks:getComputedStyle(h).gridTemplateRows.split(" ").filter(function(x){return x!=="";}).length,'
      + 'name:r(' + q(SEL('name')) + '),count:r(' + q(SEL('count')) + ')};});}())');
    console.log('kanban-columns 列头行数读数 ' + JSON.stringify(rows));
    assert.equal(rows.length, noPurpose.columns.length, '两列都要量到（宽档几列并排）');
    for (const r of rows) {
      assert.equal(r.purpose, false, '这一档的列头本来就没有用途那一行：' + JSON.stringify(r));
      assert.ok(r.name !== null && r.count !== null, '列名格与计数格都要在：' + JSON.stringify(r));
      assert.ok(r.name.text.length > 0 && r.count.text.length > 0, '两行里都要有字（不然就是屏上一块空白）：' + JSON.stringify(r));
      assert.notEqual(r.name.t, r.count.t,
        '不给 `purpose` ＝ 列头**两行**（列名行 ＋ 计数行），不是挤成一行：' + JSON.stringify(r));
    }
  });

  it('幂等：同一段运行时段注两次也只绑一次（第二次直接返回）', async () => {
    await p.at(fixture('paper', PLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    const again = await p.ev('(function(){var s=document.createElement("script");'
      + 's.textContent=' + JSON.stringify(buildKanbanColumnsJs()) + ';'
      + 'document.body.appendChild(s);return true;}())');
    assert.equal(again, true);
    await tapAt(CARD_SEL('c-soup'));
    const st = await p.ev(STATE);
    console.log('kanban-columns 幂等读数 ' + JSON.stringify({ pick: st.pick, evts: st.evts.length }));
    assert.equal(st.pick, 'c-soup', '重复注入后照样能拿起');
    assert.deepEqual(st.clsPicked, ['c-soup'], '重复注入后选中形照样挂得上');
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

/* ── ⑤B B 档行为（真机 · **真指针** CDP `Input`）────────────────────── */

/** **真指针铁律**（与 ⑤ 同一条，这一档原样复用）：
 *  点行／点分段／点收纳键**一律**走 CDP 的 `Input.dispatchMouseEvent`（`p.mouse()`：`mousePressed` ＋
 *  `mouseReleased`，浏览器自己合成那枚 `click`）——**不许**用 `element.click()`。
 *  合成 `click` 不经指针、也不看元素到不到得了：390 档是**窄档**（列区一次只留当前那一列），
 *  藏起来那两列的收纳键量出来是零宽零高，`.click()` 照样点得动 ⇒ 它能在一份「真用户走不通」的
 *  通路上全绿（2026-09 审查席读数）。故每条真指针动作之前先量**可达性**：
 *  宽高非零 ＋ 那一点上命中的就是它自己；窄档按「先点分段、再点该列的收纳键」走真路径。
 */
describe('kanban-columns ⑤B B 档行为（真机 · 真指针 CDP Input）', async () => {
  const p = await startBrowser({ portOffset: 48 });
  if (p === null) {
    it('真机未跑（本机没有 Chrome）：行为判据跳过', (t) => {
      console.log('kanban-columns B 档行为：真机未跑（本机没有 Chrome），原因=startBrowser 返回 null');
      t.skip('本机没有 Chrome');
    });
    return;
  }

  /** 页里装四条事件的落账 ＋ **每一步真指针**落在哪个元素上的落账（`pointerdown`，捕获期）。 */
  const WIRE = '(function(){window.__kb=[];window.__pd=[];'
    + 'document.addEventListener("pointerdown",function(e){var t=e.target;'
    + 'function of(attr){var el=t&&t.closest?t.closest("["+attr+"]"):null;return el?el.getAttribute(attr):null;}'
    + 'window.__pd.push({card:of(' + q(KANBAN_COLUMNS_CARD_ATTR) + '),seg:of(' + q(KANBAN_COLUMNS_SEG_ATTR) + '),'
    + 'recv:of(' + q(KANBAN_COLUMNS_RECEIVE_ATTR) + ')});},true);'
    + [KANBAN_COLUMNS_EVENT_PICK, KANBAN_COLUMNS_EVENT_MOVE, KANBAN_COLUMNS_EVENT_CANCEL, KANBAN_COLUMNS_EVENT_ADD]
      .map((n) => 'document.addEventListener(' + q(n) + ',function(e){window.__kb.push({type:e.type,detail:e.detail});});').join('')
    + 'return true;}())';
  /** 一次页内快照（B 档）：拿起的形 ＋ 各列的读数（列计数、**组计数**、行、落点线、空槽、收纳键）。 */
  const STATE = '(function(){'
    + 'var root=document.querySelector(' + ROOT_S + ');'
    + 'var probe=document.createElement("div");'
    + 'probe.style.background=' + q(skinVar('surface-2')) + ';'
    + 'probe.style.borderColor=' + q(skinVar('accent')) + ';'
    + 'root.parentNode.insertBefore(probe,root);'
    + 'var ps=getComputedStyle(probe),soft=ps.backgroundColor,edge=ps.borderTopColor;'
    + 'probe.parentNode.removeChild(probe);'
    + 'var rows=[].slice.call(root.querySelectorAll(' + ROW_S + '));'
    + 'var picked=rows.filter(function(r){return r.classList.contains("is-picked");})[0];'
    + 'var plain=rows.filter(function(r){return !r.classList.contains("is-picked");})[0];'
    + 'function box(el){if(!el)return null;var cs=getComputedStyle(el);'
    + 'return {bg:cs.backgroundColor,sideW:cs.borderLeftWidth,sideColor:cs.borderLeftColor,transform:cs.transform};}'
    + 'var cols=[].slice.call(root.querySelectorAll(' + COL_S + ')).map(function(col){'
    + 'var recv=col.querySelector(' + RECV_S + '), slot=col.querySelector(' + SLOT_S + ');'
    + 'return {key:col.getAttribute(' + q(KANBAN_COLUMNS_COL_ATTR) + '),'
    + 'count:(col.querySelector(' + COUNT_S + ')||{}).textContent,'
    + 'rows:[].slice.call(col.querySelectorAll(' + ROW_S + ')).map(function(r){return r.getAttribute(' + q(KANBAN_COLUMNS_CARD_ATTR) + ');}),'
    + 'state:[].slice.call(col.querySelectorAll(' + ROW_S + ')).map(function(r){return r.getAttribute(' + q(KANBAN_COLUMNS_STATE_ATTR) + ');}),'
    + 'groups:[].slice.call(col.querySelectorAll(' + GROUP_S + ')).map(function(g){'
    + 'var name=g.querySelector(' + GNAME_S + ');'
    + 'return {name:name?name.textContent:null,count:(g.querySelector(' + GCOUNT_S + ')||{}).textContent,'
    + 'rows:[].slice.call(g.querySelectorAll(' + ROW_S + ')).map(function(r){return r.getAttribute(' + q(KANBAN_COLUMNS_CARD_ATTR) + ');})};}),'
    + 'drop:col.querySelectorAll(' + DROP_S + ').length,slot:slot?slot.textContent:null,'
    + 'recvOff:recv?recv.disabled:null};});'
    + 'return {pick:root.getAttribute(' + q(KANBAN_COLUMNS_PICK_ATTR) + '),'
    + 'show:root.getAttribute(' + q(KANBAN_COLUMNS_SHOW_ATTR) + '),'
    + 'bound:root.getAttribute(' + q(KANBAN_COLUMNS_BOUND_ATTR) + '),'
    + 'status:(root.querySelector(' + STATUS_S + ')||{}).textContent,'
    + 'cancel:root.querySelector(' + CANCEL_S + ')!==null,'
    + 'cancelText:(root.querySelector(' + CANCEL_S + ')||{}).textContent,'
    + 'clsPicked:rows.filter(function(r){return r.classList.contains("is-picked");})'
    + '.map(function(r){return r.getAttribute(' + q(KANBAN_COLUMNS_CARD_ATTR) + ');}),'
    + 'pressed:rows.map(function(r){return r.getAttribute("aria-pressed");}),'
    + 'pickedBox:box(picked),plainBox:box(plain),soft:soft,edge:edge,cols:cols,evts:window.__kb};}())';
  /** 坐标 ＋ **可达性**：宽高非零、那一点上命中的就是它自己（窄档没点分段之前量出来是零宽零高）。 */
  const POINT_AT = (sel) => '(function(){'
    + 'var el=document.querySelector(' + q(sel) + ');'
    + 'if (!el) return {miss:true};'
    + 'var b=el.getBoundingClientRect();'
    + 'var x=Math.round(b.left+b.width/2), y=Math.round(b.top+b.height/2);'
    + 'var cs=getComputedStyle(el), hit=document.elementFromPoint(x,y);'
    + 'var col=el.closest(' + JSON.stringify('[' + KANBAN_COLUMNS_COL_ATTR + ']') + ');'
    + 'return {x:x,y:y,w:Math.round(b.width),h:Math.round(b.height),disp:cs.display,'
    + 'colDisp:col?getComputedStyle(col).display:null,'
    + 'ok:!!hit && (hit===el || el.contains(hit))};}())';
  /** 真指针点一下：先量可达性（量不过就是**判据红**，不是静默跳过），再走 CDP 的鼠标通道。 */
  const tapAt = async (sel) => {
    const g = await p.ev(POINT_AT(sel));
    assert.ok(g.miss !== true, '真指针要点的元素不在页上：' + sel);
    assert.ok(g.w > 0 && g.h > 0,
      '真指针要点的元素量出来是零宽／零高（屏上到不了它——窄档得先点分段把它那一列换出来）：' + sel + ' ' + JSON.stringify(g));
    assert.equal(g.ok, true, '真指针那一点上命中的不是它（被盖住／不在当前那一列）：' + sel + ' ' + JSON.stringify(g));
    await p.mouse(g.x, g.y);
    return g;
  };
  const ROW_SEL = (key) => ATTR(KANBAN_COLUMNS_CARD_ATTR + '="' + key + '"');
  const RECV_SEL = (key) => ATTR(KANBAN_COLUMNS_RECEIVE_ATTR + '="' + key + '"');
  const SEG_SEL = (at) => ATTR(KANBAN_COLUMNS_SEG_ATTR + '="' + at + '"');
  const colOf = (st, key) => st.cols.find((c) => c.key === key);
  const groupOf = (st, colKey, groupName) => colOf(st, colKey).groups.find((g) => g.name === groupName);
  /** 选中的行「站起来」之后 `transform` 的算出来的样子（判据不写死数字）。 */
  const LIFT_MATRIX = 'matrix(1, 0, 0, 1, 0, -' + String(KANBAN_COLUMNS_LIFT_PX) + ')';
  /** 这一档的读数一共这些人：没拿起时状态句写那一档自己的话。 */
  const ROW_IDLE = kanbanRowStatusText(null);

  it('拿起：**真指针点一行物件**（完整事件序列 ＋ 类名序列）→ 整行选中（次要面 ＋ 主色侧标 ＋ 站起来，不横跳）', async () => {
    await p.at(fixture('paper', GPLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await tapAt(ROW_SEL('i-umbrella'));
    const st = await p.ev(STATE);
    console.log('kanban-columns B 档真指针拿起读数 ' + JSON.stringify({ pick: st.pick, cls: st.clsPicked,
      box: st.pickedBox, soft: st.soft, edge: st.edge, status: st.status }));
    assert.equal(st.pick, 'i-umbrella', '根上写清拿起了哪一行');
    assert.deepEqual(st.clsPicked, ['i-umbrella'], '全页恰好一行挂 `is-picked`');
    assert.equal(st.pickedBox.bg, st.soft,
      '拿起的那一行铺**次要面**（「整行选中」那一档的底，`surface-2` 的实际取值）：' + JSON.stringify(st.pickedBox));
    assert.equal(st.pickedBox.sideColor, st.edge, '拿起那一行换成主色侧标（形）：' + JSON.stringify(st.pickedBox));
    assert.equal(st.pickedBox.sideW, st.plainBox.sideW,
      '拿起前后左侧那道槽位宽度一样（拿起时不横跳）：' + JSON.stringify([st.pickedBox, st.plainBox]));
    assert.equal(st.pickedBox.transform, LIFT_MATRIX, '拿起那一行站起来（位移＝`KANBAN_COLUMNS_LIFT_PX`）');
    assert.equal(st.plainBox.transform, 'none', '没拿起的行没有位移');
    assert.notEqual(st.plainBox.bg, st.soft, '没拿起的行还是原来的面');
    assert.equal(st.status, kanbanRowStatusText('雨伞'), '状态句念的是**物件名**');
    assert.equal(st.cancel, true, '取消键露出来');
    assert.equal(st.cancelText, KANBAN_COLUMNS_TEXT.cancel);
    /* **一屏只留一层话的实时读数**：拿起之后也不许冒出落点线与空槽那两句旁白。 */
    for (const c of st.cols) {
      assert.equal(c.drop, 0, 'B 档拿起之后也不许冒出落点线：' + c.key);
      assert.equal(c.slot, null, 'B 档不许补空槽旁白：' + c.key);
    }
    assert.deepEqual(st.cols.map((c) => c.recvOff), [true, false, false], '拿起那行所在列那枚按不动，其余各列可点');
    assert.equal(st.pressed.filter((x) => x === 'true').length, 1, '整行就是那颗按钮：只有拿起的那一行是按下态');
    assert.equal(st.evts.length, 1, '只派发一条事件');
    assert.equal(st.evts[0].type, KANBAN_COLUMNS_EVENT_PICK);
    assert.deepEqual(st.evts[0].detail, { id: 'kanban-home', key: 'i-umbrella', from: 'hall' });
    assert.equal(st.bound, '1', '根上记一枚 bound 读数');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('挪动（**窄档真路径**）：点行 → 点第 3 段 → 点卧室的收纳键 → 落进那一列**最后一组** ＋ 两端计数与组计数一起重写', async () => {
    await p.at(fixture('paper', GPLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    /* 窄档的事实：列区一次只留当前那一列 ⇒ 第 3 列此刻**到不了**（真用户必须先点分段）。 */
    const off = await p.ev(POINT_AT(RECV_SEL('bedroom')));
    assert.equal(off.colDisp, 'none', '第 3 列此刻整列 `display:none`（`.click()` 会在这条走不通的通路上照样全绿）');
    assert.equal(off.w * off.h, 0, '窄档没点分段之前，第 3 列的收纳键量出来是零宽零高：' + JSON.stringify(off));
    await tapAt(ROW_SEL('i-umbrella'));
    assert.equal((await p.ev(STATE)).pick, 'i-umbrella', '先拿起玄关那一行');
    await tapAt(SEG_SEL('3'));
    assert.equal((await p.ev(STATE)).show, '3', '点第 3 段 ⇒ 当前列换成第 3 列');
    await tapAt(RECV_SEL('bedroom'));
    const st = await p.ev(STATE);
    console.log('kanban-columns B 档真指针挪动读数 ' + JSON.stringify({
      pick: st.pick, hall: colOf(st, 'hall').rows, bedroom: colOf(st, 'bedroom').rows,
      counts: st.cols.map((c) => c.count), groups: colOf(st, 'bedroom').groups.map((g) => g.name + '／' + g.count),
    }));
    assert.equal(st.pick, null, '挪完拿起态收掉');
    assert.deepEqual(st.clsPicked, [], '挪完选中形也收掉');
    assert.equal(st.cancel, false, '取消键收起来');
    /* **卡落过去、两端计数对**：行落进目标列**最后一组**的末尾（组是这一档的格子）。 */
    assert.deepEqual(colOf(st, 'hall').rows, ['i-card', 'i-knife'], '源列少了一行');
    assert.deepEqual(colOf(st, 'bedroom').rows, ['i-cell', 'i-umbrella'], '目标列多了一行');
    assert.deepEqual(groupOf(st, 'bedroom', '衣柜').rows, ['i-umbrella'], '收进来的行落在**最后一组**里（不是列身上的孤儿行）');
    assert.equal(colOf(st, 'hall').count, kanbanCountText(2, '件'), '源列计数重写');
    assert.equal(colOf(st, 'bedroom').count, kanbanCountText(2, '件'), '目标列计数重写');
    assert.equal(groupOf(st, 'hall', '出门要带').count, kanbanCountText(1, '件'), '源那一组的组计数重写');
    assert.equal(groupOf(st, 'bedroom', '衣柜').count, kanbanCountText(1, '件'), '目标那一组的组计数重写');
    assert.equal(groupOf(st, 'bedroom', '床头柜').count, kanbanCountText(1, '件'), '没动过的组计数照旧');
    assert.deepEqual(colOf(st, 'bedroom').state, ['bedroom', 'bedroom'], '行上写出它现在在哪一列');
    assert.equal(colOf(st, 'bedroom').slot, null, 'B 档不补空槽旁白');
    assert.equal(colOf(st, 'bedroom').drop + colOf(st, 'hall').drop + colOf(st, 'kitchen').drop, 0, '落点线一条都不许冒出来');
    assert.equal(st.status, ROW_IDLE, '状态句回到「还没选中物件」');
    assert.deepEqual(st.cols.map((c) => c.recvOff), [true, true, true], '没拿起时整排收纳键按不动');
    const move = st.evts[st.evts.length - 1];
    assert.equal(move.type, KANBAN_COLUMNS_EVENT_MOVE);
    assert.deepEqual(move.detail, { id: 'kanban-home', key: 'i-umbrella', from: 'hall', to: 'bedroom' });
    /* **这一挪是真手势打出来的**：三次动作各来一条 `pointerdown`，而且每一步**落在谁身上**都记着。
       `element.click()` 只出一条 `click`（一条 `pointerdown` 都没有）——它能在这条通路上全绿，真指针这条替不了。 */
    const pd = await p.ev('window.__pd');
    console.log('kanban-columns B 档真指针时序 ' + JSON.stringify(pd));
    assert.deepEqual(pd, [
      { card: 'i-umbrella', seg: null, recv: null },
      { card: null, seg: '3', recv: null },
      { card: null, seg: null, recv: 'bedroom' },
    ], '三次真指针动作（点行／点分段／点收纳键）各落在自己那件东西上：' + JSON.stringify(pd));
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('挪动（**宽档**）：几列并排时不点分段——点行 → 点目标列收纳键，两步走完', async () => {
    await p.at(fixture('paper', GPLAIN, true), { width: 1280, height: 900 });
    await p.ev(WIRE);
    await tapAt(ROW_SEL('i-card'));
    await tapAt(RECV_SEL('kitchen'));
    const st = await p.ev(STATE);
    console.log('kanban-columns B 档宽档挪动读数 ' + JSON.stringify({
      hall: colOf(st, 'hall').rows, kitchen: colOf(st, 'kitchen').rows,
      groups: colOf(st, 'kitchen').groups.map((g) => g.name + '／' + g.count),
    }));
    assert.deepEqual(colOf(st, 'hall').rows, ['i-umbrella', 'i-knife'], '源列少了一行');
    assert.deepEqual(groupOf(st, 'kitchen', '水槽下').rows, ['i-soap', 'i-card'], '宽档也落进最后一组');
    assert.equal(colOf(st, 'kitchen').count, kanbanCountText(4, '件'), '目标列计数重写（两端都对）');
    assert.equal(colOf(st, 'hall').count, kanbanCountText(2, '件'), '源列计数重写');
    assert.equal(groupOf(st, 'kitchen', '水槽下').count, kanbanCountText(2, '件'), '目标那一组的组计数重写');
    assert.deepEqual((await p.ev('window.__kb')).map((e) => e.type),
      [KANBAN_COLUMNS_EVENT_PICK, KANBAN_COLUMNS_EVENT_MOVE], '两步各派发一条事件');
    assert.deepEqual(await p.ev('window.__pd'), [
      { card: 'i-card', seg: null, recv: null }, { card: null, seg: null, recv: 'kitchen' },
    ], '宽档两步都是真指针（不点分段）');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('挪空一组：源组计数变 0 **但组名行还在**（不写一句旁白，也不补空槽）', async () => {
    await p.at(fixture('paper', GPLAIN, true), { width: 390, height: 900 });
    await p.ev(WIRE);
    await tapAt(SEG_SEL('2'));
    await tapAt(ROW_SEL('i-soap'));
    await tapAt(SEG_SEL('1'));
    await tapAt(RECV_SEL('hall'));
    const st = await p.ev(STATE);
    console.log('kanban-columns B 档挪空一组读数 ' + JSON.stringify({
      kitchen: colOf(st, 'kitchen').groups.map((g) => g.name + '／' + g.count),
      hall: colOf(st, 'hall').rows, slot: colOf(st, 'kitchen').slot,
    }));
    assert.deepEqual(groupOf(st, 'kitchen', '水槽下').rows, [], '那一组空了');
    assert.equal(groupOf(st, 'kitchen', '水槽下').count, kanbanCountText(0, '件'), '空组的计数照实写 0');
    assert.equal(groupOf(st, 'kitchen', '水槽下').name, '水槽下', '**组名行还在**（人得知道这一格是什么）');
    assert.equal(colOf(st, 'kitchen').slot, null, '空组不补空槽那两句旁白');
    assert.equal(colOf(st, 'kitchen').count, kanbanCountText(2, '件'), '厨房整列＝调料柜那两行');
    assert.deepEqual(groupOf(st, 'hall', '常备').rows, ['i-knife', 'i-soap'], '收到的行排在最后一组末尾');
    assert.equal(colOf(st, 'hall').count, kanbanCountText(4, '件'), '目标列计数重写');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('四套皮肤下 B 档标记逐字节相同（换皮不换结构）', async () => {
    const marks = [];
    for (const skin of SKIN_NAMES) {
      await p.at(fixture(skin, GPICKED, false), { width: 390, height: 900 });
      marks.push(await p.ev('(function(){return document.querySelector(' + ROOT_S + ').outerHTML;}())'));
    }
    for (let i = 1; i < marks.length; i += 1) {
      assert.equal(marks[i], marks[0], '皮肤 ' + SKIN_NAMES[i] + ' 的 B 档标记与 ' + SKIN_NAMES[0] + ' 逐字节相同');
    }
    console.log('kanban-columns B 档皮肤同构：' + SKIN_NAMES.join('／') + ' 四套标记逐字节相同');
  });

  it('关页', () => { p.close(); });
});
