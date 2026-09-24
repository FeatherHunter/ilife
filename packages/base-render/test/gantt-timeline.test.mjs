/** gantt-timeline（甘特时间线 · 形态 C「资源泳道（灶位）× 关键路径带」）· 契约测试。
 *
 * 覆盖五组判据：
 *  ① **渲染契约**：骨架逐层对得上（卡头／刻度行／关键路径行／泳道行／里程碑行／图例／口径行）／
 *     **刻度与落位同一份真值**（每根条的 `grid-column` 反算回分钟数，与入参给的段一致）／
 *     图例只列出现过的档／里程碑那枚点压在格线上／转义面／**全部**非法入参分支（每个都断 `BlocksError`）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且**只出现一次**、
 *     零 `:root`／`!important`／`@media`／零手写颜色字面量／零手写 `var(--ilife-…)`／
 *     **零 `overflow:hidden` 与 `text-overflow`**（本件不靠截断）/ `dist/**` 剥字面量后零 DOM 名；
 *  ③ **加法式**：本件只读自己的类名；不启用它的页面零命中、逐字节不变；
 *  ④ **两档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 390 与 1280 下零横向溢出、
 *     条／空档块／里程碑点都落在轨迹内、刻度与图例零截断、窄宽两档换的是结构（标签折上／列到左侧）；
 *     起不来就退确定性几何判据并打印原因；
 *  ⑤ **皮肤纪律**：同一份入参渲染三次逐字节相同、标记不带皮肤类、四套皮肤下标记逐字节相同。
 *
 * 期望值一律从组件自己的常量与入参派生（`GANTT_TIMELINE_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GANTT_TIMELINE_CLASS,
  GANTT_TIMELINE_FORMS,
  GANTT_TIMELINE_IDLE_MIN_CELLS,
  GANTT_TIMELINE_MAX_CELLS,
  GANTT_TIMELINE_MAX_LANES,
  GANTT_TIMELINE_MAX_MILESTONES,
  GANTT_TIMELINE_MIN_CELLS,
  GANTT_TIMELINE_MIN_KEY_STEPS,
  GANTT_TIMELINE_NOW_BAND_PX,
  GANTT_TIMELINE_SLOTS,
  GANTT_TIMELINE_STATES,
  GANTT_TIMELINE_WIDE_MIN_PX,
  ganttTimelineCss,
  ganttTimelineSlot,
  renderGanttTimeline,
} from '../dist/components/gantt-timeline/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { SKINS, SKIN_NAMES, skinClass, skinCss } from '../dist/components/skin/index.js';
import { startShapesPage } from './shapes-probe.mjs';
import { styleSources } from './_style-sources.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'gantt-timeline');

/** 抛错的入参（`BlocksError`：组件层与区块层共用同一个错误名）。 */
const throwsBlocks = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.name === 'BlocksError';
  }
  return false;
};

/** 剥掉 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把"解释"当"规则"）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

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
/** 一根条的 `grid-column: C / span S` → `[C, S]`。 */
const spansIn = (html, slot) => [...html.matchAll(new RegExp('class="[^"]*' + ganttTimelineSlot(slot)
  + '[^"]*" style="grid-column:(\\d+) / span (\\d+)"', 'g'))].map((m) => [Number(m[1]), Number(m[2])]);
/** 无障碍名那一句（`role="img"` 上那枚属性）。 */
function ariaOf(html) {
  const m = /role="img" aria-label="([^"]*)"/.exec(html);
  assert.ok(m !== null, '标记里找不到无障碍名');
  return m[1];
}
/** 产出 CSS 里某条规则的**声明文本**（选择器逐字找；`@container` 块里的也算）。 */
function declsOf(css, selector) {
  const at = css.indexOf(selector + ' {');
  assert.ok(at >= 0, '样式段里找不到这条规则：' + selector);
  return css.slice(at + selector.length + 1, css.indexOf('}', at));
}
/** 一条声明里读出来的皮肤 token 名（`var(--ilife-accent-soft, …)` → `accent-soft`）。 */
function tokenIn(decl) {
  const m = /var\(\s*--ilife-([a-z0-9-]+)/.exec(decl);
  return m === null ? null : m[1];
}
/** WCAG 相对亮度（皮肤取值都是十六进制字面，直接算）。 */
function lum(hex) {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const chan = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}
/** 两色对比度（大比小，1…21）。 */
function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/* ── 三份样例：与原型 C 逐格对得上的那一份／最小的一份／压力那一份 ───────── */

/** 与原型 no.61 形态 C 同一份读数（5 分钟一格、18 格、90 分钟）。 */
const KITCHEN = {
  title: '红烧肉套餐 90 分钟',
  stamp: '4 条灶位',
  tail: '上桌 21:25',
  cellMinutes: 5,
  keyPath: {
    steps: [{ name: '切配', minutes: 15 }, { name: '腌', minutes: 15 },
      { name: '烧', minutes: 45 }, { name: '收汁', minutes: 15 }],
  },
  lanes: [
    { label: '炒锅', segments: [
      { from: 15, minutes: 10, state: 'wait' },
      { from: 30, minutes: 45, state: 'doing' },
      { from: 75, minutes: 10, state: 'plan' },
    ] },
    { label: '电饭煲', segments: [
      { from: 5, minutes: 45, state: 'doing' },
      { from: 50, minutes: 35, state: 'wait' },
    ] },
    { label: '烤箱', segments: [
      { from: 20, minutes: 10, state: 'plan' },
      { from: 30, minutes: 30, state: 'doing' },
      { from: 60, minutes: 30, state: 'idle' },
    ] },
    { label: '备料台', segments: [
      { from: 0, minutes: 15, state: 'done' },
      { from: 15, minutes: 15, state: 'done' },
      { from: 30, minutes: 45, state: 'idle' },
      { from: 75, minutes: 10, state: 'plan' },
    ] },
  ],
  milestones: [{ at: 85, label: '上桌' }],
  cursor: { at: 85, label: '上桌' },
};

/** 最小的一份（README 入参表里那些**必填**字段按声明类型各给一个确定值就是这个形状）。 */
const SPARSE = { title: '示例', lanes: [{ label: '示例', segments: [] }] };

/** 游标那枚字**换行**的那一份（审查席量到的正是它压住第一条行：字底 − 第一条 row 顶 ＝ +17px）。 */
const CURSOR_WRAP = {
  title: '游标那枚字换行',
  cellMinutes: 5,
  spanMinutes: 30,
  lanes: [{ label: '灶 炒锅', segments: [{ from: 0, minutes: 30, state: 'doing' }] }],
  cursor: { at: 15, label: '预计 21:25 出锅上桌' },
};

const LONG = '超长的资源名字'.repeat(4);
/** 压力：24 格（上限）＋ 长名字长读数 ＋ 里程碑落在跨度末端 ＋ 游标靠右。 */
const STRESS = {
  title: '压力样例 24 格'.repeat(3),
  stamp: '压力样例的泳道数',
  tail: '上桌时间还没定下来',
  cellMinutes: 5,
  spanMinutes: 120,
  tickText: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00'],
  note: '长口径：这一句故意写得很长，用来量窄档下它是不是靠换行而不是靠截断。'.repeat(2),
  keyPath: { steps: [{ name: '切配', minutes: 30 }, { name: '烧', minutes: 60 }] },
  lanes: [
    { label: LONG, note: LONG, segments: [
      { from: 0, minutes: 30, state: 'done', label: LONG },
      { from: 30, minutes: 30, state: 'doing' },
      { from: 60, minutes: 30, state: 'idle' },
      { from: 90, minutes: 30, state: 'plan' },
    ] },
    { label: '备料台', segments: [] },
  ],
  milestones: [{ at: 120, label: LONG }],
  cursor: { at: 115, label: LONG },
};

/** 每根条反算回分钟数：`column` ＝ 起点 ÷ 格宽 ＋ 1；`span` ＝ 时长 ÷ 格宽。 */
function minutesOfSpan(html, cellMinutes) {
  return spansIn(html, 'bar').concat(spansIn(html, 'idle'))
    .map(([c, s]) => [(c - 1) * cellMinutes, s * cellMinutes]);
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('gantt-timeline ① 渲染契约 · 形态 C 的骨架', () => {
  const html = renderGanttTimeline(KITCHEN);

  it('骨架：卡头 → 刻度行 → 泳道区（关键路径／泳道／里程碑）→ 图例 → 口径行', () => {
    assert.match(html, new RegExp('^<div class="' + GANTT_TIMELINE_CLASS + ' is-C">'));
    for (const slot of GANTT_TIMELINE_SLOTS) {
      if (slot === 'ms-text') continue;
      assert.ok(html.includes(ganttTimelineSlot(slot)), '缺槽：' + slot);
    }
    assert.ok(!/<script/i.test(html), '不产脚本');
    /* 卡头：标题 ｜ 泳道数 ｜ 右端读数。 */
    assert.match(html, /-title">红烧肉套餐 90 分钟</);
    assert.match(html, /-stamp">4 条灶位</);
    assert.match(html, /-tail">上桌 21:25</);
    /* 行序：关键路径 → 四条泳道 → 里程碑那一条。 */
    const kinds = [...html.matchAll(/-row (is-[a-z]+)"/g)].map((m) => m[1]);
    assert.deepEqual(kinds, ['is-key', 'is-lane', 'is-lane', 'is-lane', 'is-lane', 'is-milestone'],
      '行序＝关键路径、泳道、里程碑：' + JSON.stringify(kinds));
    /* 泳道区是一张图（读屏只有一句）：**逐句对账**，不是"含某个词就算过"——
       原先那条把「整段空着」写进正则（那句话在 `layout.ts` 里根本不存在，真句是「整段空闲」），
       靠同一条正则里的另一支（泳道名）恒真 ⇒ 无障碍名整段掉了也绿。 */
    const aria = ariaOf(html);
    for (const want of [
      '红烧肉套餐 90 分钟。',
      '关键路径：切配 15 分 → 腌 15 分 → 烧 45 分 → 收汁 15 分，共 90 分',
      '炒锅：等待 15 到 25 分，进行中 30 到 75 分，未开始 75 到 85 分',
      '电饭煲：进行中 5 到 50 分，等待 50 到 85 分',
      '烤箱：未开始 20 到 30 分，进行中 30 到 60 分，空闲 60 到 90 分',
      '备料台：已完成 0 到 15 分，已完成 15 到 30 分，空闲 30 到 75 分，未开始 75 到 85 分',
      '上桌 是 85 分的里程碑',
      '游标在 85 分：上桌',
      '横轴 90 分',
    ]) {
      assert.ok(aria.includes(want), '无障碍名缺这一句：' + want + '｜实际：' + aria);
    }
    /* 「整段空闲」这句只长在"一条段都没有"的泳道那条读数上（真句，不是上面那种蒙过的写法）。 */
    assert.ok(ariaOf(renderGanttTimeline(SPARSE)).includes('示例 整段空闲'),
      '一条段都没有的泳道照实写「整段空闲」');
    assert.equal(aria.includes('整段空闲'), false, '有段的泳道不该写「整段空闲」');
  });

  it('**刻度与落位同一份真值**：每根条反算回来的分钟数＝调用方给的那一段', () => {
    const ticks = [...html.matchAll(/-tick-label[^"]*"[^>]*>([^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(ticks, ['0', '15', '30', '45', '60', '75'], '刻度数字由轴域算出来');
    const cells = countOf(html, 'class="' + ganttTimelineSlot('tick') + '( is-num)?"');
    assert.equal(cells, 18, '90 分钟 ÷ 每格 5 分钟 ＝ 18 格');
    /* 逐枚刻度落在第几格：数字写的那一格反算回来就是这个数字（刻度只有一处算）。 */
    const indexes = [...html.matchAll(/-tick( is-num)?">/g)].map((m, i) => (m[1] === undefined ? null : i))
      .filter((v) => v !== null);
    assert.deepEqual(indexes.map((i) => i * KITCHEN.cellMinutes), ticks.map(Number));
    /* 段的落位：反算回分钟数与入参逐条相同（关键路径 15/15/45/15 起于 0；泳道那些按 from）。 */
    const key = minutesOfSpan(html.slice(0, html.indexOf('is-lane')), KITCHEN.cellMinutes);
    assert.deepEqual(key, [[0, 15], [15, 15], [30, 45], [75, 15]], '关键路径段段相接，起点由前段推出来');
    const all = minutesOfSpan(html, KITCHEN.cellMinutes);
    for (const lane of KITCHEN.lanes) {
      for (const seg of lane.segments) {
        assert.ok(all.some(([from, minutes]) => from === seg.from && minutes === seg.minutes),
          '这条段没落到它该在的格上：' + lane.label + ' ' + JSON.stringify(seg));
      }
    }
  });

  it('段按状态给**形**（✓／▶／⋯／▷），空档段给分钟数，关键路径给 1 起的顺序号', () => {
    assert.equal(countOf(html, '-mark">✓<'), 2, '两段已完成');
    assert.equal(countOf(html, '-mark">▶<'), 3, '三段进行中');
    assert.equal(countOf(html, '-mark">⋯<'), 2, '两段等待前置');
    assert.equal(countOf(html, '-mark">▷<'), 3, '三段未开始');
    assert.deepEqual([...html.matchAll(/-mark">([1-9]\d?)</g)].map((m) => m[1]), ['1', '2', '3', '4'],
      '关键路径段上标 1 起的顺序号');
    assert.equal(countOf(html, ganttTimelineSlot('idle')), 2, '两块空档段');
    assert.match(html, /-idle[^>]*>.*?>30′</, '空档块里写分钟数');
    assert.match(html, /-idle[^>]*title="烤箱：60 分起空闲 30 分（到 90 分）"/, '悬停读数把起止分钟数写全');
  });

  it('图例**只列这一段里出现过的档**，逐枚「形 ＋ 字」（里程碑也在里面）', () => {
    const words = [...html.matchAll(/-legend-word">([^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(words, ['关键路径（切配 15 分 → 腌 15 分 → 烧 45 分 → 收汁 15 分 ＝ 90 分）',
      '已完成', '进行中', '等待', '未开始', '空闲（点线块里的数字是分钟）', '里程碑']);
    assert.match(html, /-swatch is-crit">1-4</, '关键路径那枚形写顺序号的区间');
    assert.match(html, /-swatch is-doing">▶</);
    const only = renderGanttTimeline({ title: 'x', lanes: [{ label: 'a', segments: [{ from: 0, minutes: 10, state: 'done' }] }] });
    assert.deepEqual([...only.matchAll(/-legend-word">([^<]+)</g)].map((m) => m[1]), ['已完成'],
      '只出现过的档才进图例');
    const empty = renderGanttTimeline(SPARSE);
    assert.equal(empty.includes(ganttTimelineSlot('legend')), false, '一条段都没有就不出图例');
    assert.match(empty, /-row-note">未占用</, '整段空着的泳道照实写"未占用"而不是 0');
    /* 只给里程碑（不给关键路径）时图例也得出来——那枚 `◆` 在图上不带字面解释就是哑的
       （README 把「◆ 里程碑」列进"形＋字＋色"三样）。 */
    const ms = renderGanttTimeline({ title: 'x', lanes: [{ label: 'a', segments: [] }],
      milestones: [{ at: 10, label: '出报告' }] });
    assert.match(ms, /-swatch is-milestone">◆</, '里程碑那枚形要按 `is-milestone` 着色');
    assert.deepEqual([...ms.matchAll(/-legend-word">([^<]+)</g)].map((m) => m[1]), ['里程碑'],
      '有里程碑就得在图例里给 `◆` 一个解释');
  });

  it('格宽是小数时段的起止照样落在格线上（画出来的格数＝读数，浮点噪声不被误拒）', () => {
    /* 0.1 分钟一格：`0.1 ＋ 0.2` 这种浮点噪声（差 4e-16 格）要收下，不然细格下没人能用；
       而"看着像 0"的时长（1e-9 分）要拒——见下一条非法入参。 */
    const fine = renderGanttTimeline({ title: 'x', cellMinutes: 0.1, spanMinutes: 2, lanes: [{ label: '灶', segments: [
      { from: 0.1 + 0.2, minutes: 0.5, state: 'doing' },
      { from: 1.2, minutes: 0.5, state: 'done' },
    ] }] });
    assert.deepEqual(spansIn(fine, 'bar'), [[4, 5], [13, 5]],
      '0.30000000000000004 ÷ 0.1 ＋ 1 ＝ 第 4 格起、0.5 分占 5 格；1.2 ÷ 0.1 ＋ 1 ＝ 第 13 格起');
    assert.match(fine, /-row-note">占用 1 分</);
  });

  it('里程碑：那枚 `◆` 压在格线上（右半区时从第 1 格铺到落点前、内容右对齐）', () => {
    assert.match(html, /-milestone is-end" style="grid-column:1 \/ span 17"/,
      '85 分 ÷ 5 ＝ 第 17 条格线：元素铺到它、内容右对齐，点的右缘压在格线上');
    assert.match(html, /-ms-mark">◆</);
    assert.match(html, /-ms-text">上桌</);
    assert.match(html, /-row-note">85 分 里程碑</);
    /* 落点在左半区时反过来：从落点铺到轨迹末端（点的左缘压在格线上）。 */
    const left = renderGanttTimeline({ title: 'x', lanes: [{ label: 'a', segments: [] }], milestones: [{ at: 10, label: '出报告' }] });
    assert.match(left, /-milestone" style="grid-column:3 \/ span [0-9]+"/);
    assert.equal(left.includes('-milestone is-end'), false);
  });

  it('「现在」游标：位置交给样式（自定义属性），靠右半区时那枚字挪到线的左侧', () => {
    assert.match(html, new RegExp('style="--' + 'gantt-timeline-at:0\\.9444"'), '85 ÷ 90 ＝ 0.9444');
    assert.match(html, /-now-label is-end">上桌</);
    assert.match(html, /-now" aria-hidden="true"/);
    const mid = renderGanttTimeline({ title: 'x', lanes: [{ label: 'a', segments: [] }], cursor: { at: 15, label: '现在' } });
    assert.equal(mid.includes('-now-label is-end'), false, '左半区那枚字落在线的右侧');
    assert.match(mid, /--gantt-timeline-at:0\.5/);
    const none = renderGanttTimeline(SPARSE);
    assert.equal(none.includes(ganttTimelineSlot('now')) || none.includes('gantt-timeline-at'), false,
      '不给游标就不画，也不写那个自定义属性');
  });

  it('最小的一份也成立：一条泳道、零段、6 格、不出图例', () => {
    const bare = renderGanttTimeline(SPARSE);
    assert.equal(countOf(bare, 'class="[^"]*-tick( is-num)?"'), GANTT_TIMELINE_MIN_CELLS, '跨度太短补到下限格数');
    assert.equal(countOf(bare, 'class="[^"]*-row '), 1);
    assert.match(bare, /口径：一行＝一条泳道/, '不给 note 就用本件的口径句');
    assert.ok(bare.length > 0);
  });

  it('转义面：标题／名字／读数／刻度文字／段里那枚短字逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderGanttTimeline({
      title: evil, stamp: evil, tail: evil, axisName: evil, note: evil, cellMinutes: 5, tickText: [evil, evil, evil, evil, evil, evil],
      lanes: [{ label: evil, note: evil, segments: [{ from: 0, minutes: 30, state: 'done', label: evil }] }],
      keyPath: { label: evil, note: evil, steps: [{ name: evil, minutes: 30 }, { name: evil, minutes: 30 }] },
      milestones: [{ at: 60, label: evil, note: evil }],
      cursor: { at: 60, label: evil },
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.equal(/title="[^"]*<[a-z]/i.test(html), false, '属性里不许出现裸标签');
  });

  it('入参违规一律拒（不静默降级）：骨架／泳道／段／关键路径／里程碑／游标 逐条', () => {
    const ok = SPARSE;
    assert.deepEqual([...GANTT_TIMELINE_FORMS], ['C']);
    assert.deepEqual([...GANTT_TIMELINE_STATES], ['done', 'doing', 'wait', 'plan', 'idle']);
    assert.equal(throwsBlocks(() => renderGanttTimeline(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderGanttTimeline([])), true, '数组不是入参');
    assert.equal(throwsBlocks(() => renderGanttTimeline('x')), true, '串不是入参');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ lanes: ok.lanes })), true, '缺标题');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: '', lanes: ok.lanes })), true, '空标题');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: ok.lanes, form: 'A' })), true, '形态闭集外');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: ok.lanes, form: 'lanes' })), true, '语义名也在闭集外');
    /* 泳道 */
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x' })), true, '缺 lanes');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: [] })), true, '一条泳道都没有');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: 'x' })), true, 'lanes 不是数组');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: [null] })), true, '泳道不是对象');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: [{ segments: [] }] })), true, '泳道缺名字');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: [{ label: 'a' }] })), true, '泳道缺 segments');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: [{ label: 'a', segments: 'x' }] })), true, 'segments 不是数组');
    assert.equal(throwsBlocks(() => renderGanttTimeline({
      title: 'x', lanes: new Array(GANTT_TIMELINE_MAX_LANES + 1).fill({ label: 'a', segments: [] }),
    })), true, '泳道太多');
    /* 段 */
    const seg = (over) => renderGanttTimeline({ title: 'x', lanes: [{ label: 'a', segments: [{ from: 0, minutes: 10, ...over }] }] });
    assert.equal(throwsBlocks(() => seg({ from: -5 })), true, '起点是负数');
    assert.equal(throwsBlocks(() => seg({ from: '0' })), true, '起点不是数');
    assert.equal(throwsBlocks(() => seg({ from: Number.NaN })), true, '起点是 NaN');
    assert.equal(throwsBlocks(() => seg({ from: 7 })), true, '起点不在格线上');
    assert.equal(throwsBlocks(() => seg({ minutes: 0 })), true, '时长不是正数');
    assert.equal(throwsBlocks(() => seg({ minutes: 7 })), true, '时长不是整数格');
    /* 「看着像 0」的量：原先判的是**格号**上的绝对容差 1e-6 ⇒ 1e-9 分 ÷ 5 分 ＝ 2e-10 格 被当整格收下，
       画出来是一整格、读数却写「占用 1e-9 分」（画的宽度与读数不符）；`from: 1e-7` 同理。 */
    assert.equal(throwsBlocks(() => seg({ minutes: 1e-9 })), true, '时长短到 1e-9 分也不是整格');
    assert.equal(throwsBlocks(() => seg({ minutes: 1e-6 })), true, '时长 1e-6 分不是整格');
    assert.equal(throwsBlocks(() => seg({ minutes: 5.0000001 })), true, '比一整格多 1e-7 分也不算整格');
    assert.equal(throwsBlocks(() => seg({ from: 1e-7 })), true, '起点 1e-7 分不是整格');
    assert.equal(throwsBlocks(() => renderGanttTimeline({
      title: 'x', lanes: [{ label: 'a', segments: [{ from: 0, minutes: 5, state: 'idle' },
        { from: 1e-7, minutes: 10 }] }],
    })), true, '细到 1e-7 分的起点也拒（不因它"接近格线"就收下）');
    assert.equal(throwsBlocks(() => seg({ state: 'doing2' })), true, '状态闭集外');
    assert.equal(throwsBlocks(() => seg({ minutes: 5, state: 'idle' })), true,
      '空档段太短（要 ' + String(GANTT_TIMELINE_IDLE_MIN_CELLS) + ' 格以上）');
    assert.equal(throwsBlocks(() => renderGanttTimeline({
      title: 'x', lanes: [{ label: 'a', segments: [{ from: 0, minutes: 20 }, { from: 10, minutes: 20 }] }],
    })), true, '同一条泳道里两段压在一起');
    assert.equal(throwsBlocks(() => renderGanttTimeline({
      title: 'x', lanes: [{ label: 'a', segments: [{ from: 0, minutes: 10 }, { from: 10, minutes: 10 }] }],
    })), false, '首尾相接不算重叠');
    /* 关键路径与里程碑 */
    const key = (over) => ({ title: 'x', lanes: ok.lanes, keyPath: { steps: [{ name: 'a', minutes: 10 }, { name: 'b', minutes: 10 }], ...over } });
    assert.equal(throwsBlocks(() => renderGanttTimeline({ ...key(), keyPath: 'x' })), true, 'keyPath 不是对象');
    assert.equal(throwsBlocks(() => renderGanttTimeline({
      title: 'x', lanes: ok.lanes, keyPath: { steps: [{ name: 'a', minutes: 10 }] },
    })), true, '一段不是路径（要 ' + String(GANTT_TIMELINE_MIN_KEY_STEPS) + ' 段以上）');
    assert.equal(throwsBlocks(() => renderGanttTimeline({
      title: 'x', lanes: ok.lanes, keyPath: { steps: new Array(9).fill({ name: 'a', minutes: 5 }) },
    })), true, '关键路径段太多');
    assert.equal(throwsBlocks(() => renderGanttTimeline({
      title: 'x', lanes: ok.lanes, keyPath: { steps: [{ name: 'a', minutes: 10 }, { minutes: 10 }] },
    })), true, '缺段名');
    assert.equal(throwsBlocks(() => renderGanttTimeline({
      title: 'x', lanes: ok.lanes, keyPath: { steps: [{ name: 'a', minutes: 10 }, { name: 'b', minutes: 7 }] },
    })), true, '段长不在格线上');
    /* 第一步"看着像 0"的时长：原先收下 ⇒ 第 1、2 段都从第 1 格起（两枚顺序号叠在同一格上）。 */
    assert.equal(throwsBlocks(() => renderGanttTimeline({
      title: 'x', lanes: ok.lanes, keyPath: { steps: [{ name: 'a', minutes: 1e-9 }, { name: 'b', minutes: 10 }] },
    })), true, '关键路径第一步短到 1e-9 分：两段会叠在同一格上，读不出是两段');
    const ms = (over) => ({ title: 'x', lanes: ok.lanes, milestones: [{ at: 10, label: 'm', ...over }] });
    assert.equal(throwsBlocks(() => renderGanttTimeline({ ...ms(), milestones: 'x' })), true, 'milestones 不是数组');
    assert.equal(throwsBlocks(() => renderGanttTimeline({
      title: 'x', lanes: ok.lanes, milestones: new Array(GANTT_TIMELINE_MAX_MILESTONES + 1).fill({ at: 10, label: 'm' }),
    })), true, '里程碑太多');
    assert.equal(throwsBlocks(() => renderGanttTimeline(ms({ at: 7 }))), true, '里程碑不在格线上');
    /* 负数：`-10` 是 5 的整数倍（格号 -2），"在格线上"这一步放它过去 ⇒ 画到第 0 分那条格线上、
       读数还写「-10 分 里程碑」；`segments[].from`／`cursor.at` 都有负数检查，独独这里漏过。 */
    assert.equal(throwsBlocks(() => renderGanttTimeline(ms({ at: -10 }))), true, '里程碑是负数');
    assert.equal(throwsBlocks(() => renderGanttTimeline(ms({ at: -5 }))), true, '里程碑是负数（一格）');
    assert.equal(throwsBlocks(() => renderGanttTimeline(ms({ label: '' }))), true, '里程碑缺名字');
    /* 游标与尺 */
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: ok.lanes, cursor: 'x' })), true, 'cursor 不是对象');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: ok.lanes, cursor: { at: -1, label: 'n' } })), true, '游标是负数');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: ok.lanes, cursor: { at: 10 } })), true, '游标缺那枚字');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: ok.lanes, cellMinutes: 0 })), true, '格宽是 0');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: ok.lanes, spanMinutes: -1 })), true, '跨度是负数');
    assert.equal(throwsBlocks(() => renderGanttTimeline({
      title: 'x', lanes: ok.lanes, cellMinutes: 1, spanMinutes: GANTT_TIMELINE_MAX_CELLS + 5,
    })), true, '格数超上限（请把格宽调粗）');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: ok.lanes, tickText: 'x' })), true, 'tickText 不是数组');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: ok.lanes, tickText: ['a'] })), true, '刻度枚数不对');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ title: 'x', lanes: ok.lanes, tickText: ['a', 2, 'c', 'd', 'e', 'f'] })), true, '刻度文字里有非串');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ ...ok, extraClass: 'a"b' })), true, '附加类名带引号');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ ...ok, note: 1 })), true, 'note 不是串');
    assert.equal(throwsBlocks(() => renderGanttTimeline({ ...ok, stamp: 1 })), true, 'stamp 不是串');
  });

  it('纯函数：同样的入参恒产同样的字节（四份样例各一遍）', () => {
    for (const input of [KITCHEN, SPARSE, STRESS, CURSOR_WRAP]) {
      assert.equal(renderGanttTimeline(input), renderGanttTimeline(input));
    }
  });

  it('缺值地板：可选的文本**空串＝未给**（与全层 `optText` 同口径）', () => {
    const blank = renderGanttTimeline({ title: 'x', lanes: [{ label: 'a', segments: [], note: '' }], tail: '', stamp: '' });
    assert.match(blank, /-row-note">未占用</, 'note 给空串＝按本件算');
    assert.match(blank, /-stamp">1 条泳道</, 'stamp 给空串＝用缺省那枚');
    assert.equal(blank.includes('-tail'), false, 'tail 给空串＝不出这一枚');
    assert.equal(blank.includes(ganttTimelineSlot('note')), true, '口径行恒在（不给就用本件那一句）');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('gantt-timeline ② 样式与零 DOM 纪律', () => {
  const css = ganttTimelineCss();
  const clean = stripComments(css);

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且**只出现一次**', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = ruleSelectors(clean);
    assert.ok(selectors.length >= 25, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + one);
        assert.ok(one.includes(GANTT_TIMELINE_CLASS), '选择器必须只碰本件类名根：' + one);
        assert.equal((one.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次（拼两遍＝永不命中的死规则）：' + one);
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零 `@media`；带了 `@container` 就自己声明容器', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(clean.includes('@media'), false, '本件不判视口宽度（视口宽 ≠ 组件宽）');
    assert.ok(clean.includes('@container (max-width: ' + String(GANTT_TIMELINE_WIDE_MIN_PX - 1) + 'px)'),
      '窄档必须由容器判（缺省＝宽档，窄档写成 `max-width` 那一支）');
    assert.ok(clean.includes('container-type: inline-size'), '写了 @container 就必须自己声明容器（否则永不生效）');
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
  });

  it('零手写色值／零手写 `var(--ilife-…)`／不拿 ink 系当面', () => {
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 170), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外的颜色字面量：' + [...new Set(bare)].join('、'));
    for (const one of styleSources('gantt-timeline')) {
      assert.deepEqual([...stripComments(one.src).matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [],
        one.file + ' 里请改走 skinVar()');
    }
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(m[1].trim()), false, '拿文字墨色当了"面"：' + m[1]);
    }
  });

  it('**不靠截断**：样式段与标记里零 `overflow:hidden`／`text-overflow`／省略号', () => {
    for (const needle of ['overflow:hidden', 'overflow: hidden', 'text-overflow', 'ellipsis']) {
      assert.equal(clean.includes(needle), false, '样式段里出现了 ' + needle + '（本件靠换行，不靠截断）');
    }
    const html = [KITCHEN, SPARSE, STRESS].map((i) => renderGanttTimeline(i)).join('');
    for (const needle of ['overflow', '…', 'text-overflow']) {
      assert.equal(html.includes(needle), false, '标记里出现了 ' + needle);
    }
    assert.ok(clean.includes('overflow-wrap: anywhere'), '长了要换行：得给 overflow-wrap');
  });

  it('尺寸事实取常量（条高／轨迹最小高／标签列宽都在本件的名字面上）', () => {
    assert.ok(clean.includes('min-height: 22px'), '条与空档块的高度取常量');
    assert.ok(clean.includes(String(GANTT_TIMELINE_WIDE_MIN_PX - 1) + 'px)'), '窄档阈值取常量');
    assert.ok(clean.includes('96px minmax(0,1fr)'), '宽档=标签列 ＋ 轨迹列');
    assert.equal(clean.includes('overflow-x'), false, '不许出现 overflow-x（不藏横滑）');
    assert.equal(clean.includes('scroll'), false, '不许出现滚动容器');
  });

  it('零键盘语汇、零可点元素（本件是纯静态图：条与游标都只是读数）', () => {
    const words = ['快捷键', '键位', '方向键', '键帽', '键盘', '按 Enter', 'Tab'];
    const html = [KITCHEN, SPARSE, STRESS, CURSOR_WRAP].map((i) => renderGanttTimeline(i)).join('') + css;
    for (const w of words) assert.equal(html.includes(w), false, '出现键盘语汇：' + w);
    const marks = [KITCHEN, SPARSE, STRESS, CURSOR_WRAP].map((i) => renderGanttTimeline(i)).join('');
    for (const needle of ['<button', '<a ', 'tabindex', 'onclick', '<input', '<select', '<script']) {
      assert.equal(marks.includes(needle), false, '本件不带可点元素：' + needle);
    }
    assert.equal(/<[a-z]+[^>]*\son[a-z]+=/.test(marks), false, '标记里不许有内联事件处理器');
  });

  it('`dist/components/gantt-timeline/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'gantt-timeline');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 5, '至少该有 index／attrs／model／scale／render／style 的产物：' + files.join('、'));
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
    assert.equal(files.includes('runtime.js'), false, '本件是纯静态图，不该有运行时段');
  });

  it('槽位闭集与类名一致（判据不另抄一份字面量）', () => {
    assert.equal(ganttTimelineSlot('bar'), GANTT_TIMELINE_CLASS + '-bar');
    assert.equal(ganttTimelineSlot('bar', 'x-'), 'x-block-gantt-timeline-bar');
    for (const slot of GANTT_TIMELINE_SLOTS) assert.ok(ganttTimelineSlot(slot).startsWith(GANTT_TIMELINE_CLASS + '-'));
  });

  it('手写 `var(--ilife-…)` 扫的是该件**全部** `style*.ts`（拆出去那半也在扫）', () => {
    const files = styleSources('gantt-timeline').map((f) => f.file);
    assert.deepEqual(files, ['style-marks.ts', 'style.ts'],
      '本件的样式来源是这两份：按件只读 `style.ts` 的话，拆出去那半（段与图例那几档）逃过判据');
    assert.ok(files.length > 1, '范围只许从 `_style-sources.mjs` 的 `styleSources()` 出');
  });

  it('「现在」那枚字住在流里（自己占一行、带高随字长）——不是压在第一条行上的绝对定位', () => {
    const rule = declsOf(clean, '.' + ganttTimelineSlot('now-label'));
    assert.equal(/position\s*:\s*absolute/.test(rule), false,
      '那枚字不许绝对定位：原写法把它钉在一条固定高度的带里，字一换行就盖住下面第一条行');
    assert.match(rule, new RegExp('min-height:\\s*' + String(GANTT_TIMELINE_NOW_BAND_PX) + 'px'),
      '带高的下限取常量（字短时与原型那一档同高，字长时随字长）');
    assert.match(rule, /width:\s*fit-content/, '贴着字长（不是铺满一行）');
    assert.match(rule, /margin: 0 0 \d+px calc\(/, '在流里 ⇒ 靠外边距定位、下面的行跟着往下让');
    /* 横坐标与那条竖线读**同一个**自定义属性（两处各算一套必然走散）。 */
    const at = /left:\s*calc\((.*?)\);/.exec(declsOf(clean, '.' + ganttTimelineSlot('now')))[1];
    assert.ok(rule.includes('calc(' + at + ' + 4px)'), '那枚字的横坐标＝竖线 ＋ 4px：' + at);
  });

  it('「进行中」的条**带了短字**就走有文字的选中面（面从产出 CSS 读，四套皮肤逐套算文本地板）', () => {
    const html = renderGanttTimeline({ title: 'x', lanes: [{ label: '灶 炒锅', segments: [
      { from: 0, minutes: 10, state: 'doing', label: '红烧肉' },
      { from: 10, minutes: 10, state: 'doing' },
    ] }] });
    assert.match(html, /-bar is-doing is-labelled"[^>]*><i class="[^"]*-mark">▶<\/i><span class="[^"]*-text">红烧肉<\/span>/,
      '带短字的那根条要带 `is-labelled`（它这块面上有正文级的字）');
    assert.equal(countOf(html, ' is-labelled'), 1, '只有带短字的那根带这枚修饰类（不带的那根照旧是实底）');
    /* 面不是"抄一遍法则表"，是拿件自己的那条规则 × 四套皮肤取值实算： */
    const rule = declsOf(clean, '.' + ganttTimelineSlot('bar') + '.is-labelled');
    const bg = tokenIn(/background:\s*([^;]+);/.exec(rule)[1]);
    const fg = tokenIn(/color:\s*([^;]+);/.exec(rule)[1]);
    for (const skin of SKIN_NAMES) {
      const v = SKINS[skin].values;
      const got = contrast(v[fg], v[bg]);
      assert.ok(got >= 4.5, skin + '：' + fg + ' on ' + bg + ' ＝ ' + String(got) + ' < 4.5（正文地板）');
    }
    assert.equal(bg, 'accent-soft', '有文字的选中面走软底：' + String(bg));
    assert.equal(fg, 'accent-text', '有文字的选中面的字走主色的文本档：' + String(fg));
  });
});

/* ── ⑥ 代码形状：零死代码 ＋ 单一来源 ─────────────────────────────── */

describe('gantt-timeline ⑥ 零死代码与单一来源', () => {
  it('导出面没有死名字：件里每个 `export` 至少要被引用两处（只有定义那一处＝死代码）', () => {
    /* 扫**件自己声明的全部导出**（不只是 `index.ts` 转出去的那些）：审查席读到的
       `GANTT_TIMELINE_MISSING` 正是"`index.ts` 不转出、全仓零引用"那一种，只按出口名单扫会漏掉它。
       语料＝件目录 ＋ 层出口 ＋ 名册（**不含本判据**：判据里出现一次不算有人用）。 */
    const own = readdirSync(DIR).filter((n) => n.endsWith('.ts'))
      .map((n) => ({ path: join(DIR, n), src: readFileSync(join(DIR, n), 'utf8') }));
    const outside = ['index.ts', '清单.ts'].map((n) => join(PKG, 'src', 'components', n))
      .map((p) => readFileSync(p, 'utf8'));
    const hay = own.map((f) => f.src).join(String.fromCharCode(10)) + outside.join(String.fromCharCode(10));
    const names = own.flatMap((f) => [...f.src
      .matchAll(/^export\s+(?:declare\s+)?(?:const|function|interface|type|class)\s+([A-Za-z_$][\w$]*)/gm)]
      .map((m) => m[1]));
    assert.ok(names.length >= 20, '导出名字面太小，判据可能在空转：' + names.length);
    for (const name of names) {
      const hits = (hay.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length;
      assert.ok(hits >= 2,
        '死导出：' + name + ' 在件里只有 ' + String(hits) + ' 处（定义一处、没有调用方也没转出 ⇒ 删掉或接上）');
    }
  });

  it('状态类名只有一个来源：条与图例那枚形都调 `ganttTimelineStateClass()`', () => {
    const render = readFileSync(join(DIR, 'render.ts'), 'utf8');
    assert.ok((render.match(/ganttTimelineStateClass\(/g) || []).length >= 2,
      '`is-` 那一段要走 `ganttTimelineStateClass()`（条一处、图例那枚形一处）');
    /* 形态类 `is-C` 不在这条之内（那是形态键，不是状态档）；这里禁的是自己拼状态档。 */
    for (const file of ['render.ts', 'layout.ts']) {
      const src = readFileSync(join(DIR, file), 'utf8');
      const bad = /' is-'\s*\+\s*[A-Za-z_.]*state/.exec(src);
      assert.equal(bad, null, file + ' 里又自己拼状态类名了：' + String(bad));
    }
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('gantt-timeline ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(GANTT_TIMELINE_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const before = renderScaleBar({ value: 860, goal: 1850 });
    renderGanttTimeline(KITCHEN);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), before, '别件的产物逐字节不变');
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(ganttTimelineCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-gantt-timeline'), '前缀必须作用到 scope 与类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });
});

/* ── ④ 两档几何（真机）＋ ⑤ 皮肤纪律 ──────────────────────────────── */

/** 四档压力：与原型对得上的一份／最小的一份／24 格 ＋ 长串那一份／游标那枚字换行那一份。 */
function cases() {
  return [
    { name: 'kitchen', html: renderGanttTimeline(KITCHEN) },
    { name: 'sparse', html: renderGanttTimeline(SPARSE) },
    { name: 'stress', html: renderGanttTimeline(STRESS) },
    { name: 'nowwrap', html: renderGanttTimeline(CURSOR_WRAP) },
  ];
}

/** 静态几何判据（真机起不来时的退路）：标记与样式段里不得有超过窄档的固定宽度。 */
function assertStaticGeometry(css, html) {
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const wide = [...px(html), ...px(css)].filter((v) => v > 390);
  assert.deepEqual(wide, [], '出现过不了窄档（390）的固定宽度：' + wide.join('、'));
  const cols = [...html.matchAll(/grid-column:(\d+) \/ span (\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.ok(cols.length > 0, '条的落位必须是 grid-column（判据会空转）');
  const cells = Number(/-ax[^>]*grid-template-columns:repeat\((\d+),/.exec(html)[1]);
  for (const [c, s] of cols) {
    assert.ok(c >= 1 && s >= 1 && c + s - 1 <= cells, '落位越界：' + c + ' / span ' + s + '（共 ' + cells + ' 格）');
  }
}

describe('gantt-timeline ④⑤ 两档几何与皮肤纪律（真机 headless Chrome ＋ CDP）', () => {
  it('容器 390 与 1280：零横向溢出／条落在轨迹里／零截断／窄宽换的是结构／四套皮肤标记逐字节相同', async (t) => {
    const css = ganttTimelineCss();
    const casesHtml = cases().map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n'),
      css: skinCss() + '\n' + css,
      height: 2400,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：标记与样式段里没有超过 390px 的固定宽度');
      assertStaticGeometry(css, casesHtml);
      return t.skip('本机无 Chrome／Chromium：两档几何判据需真浏览器');
    }
    try {
      const readings = [];
      for (const width of [390, 1280]) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1,
          width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of SKIN_NAMES) {
          for (const c of cases()) {
            const scope = '.' + skinClass(skin) + ' [data-case="' + c.name + '"] ';
            const root = await page.read([scope + '.' + GANTT_TIMELINE_CLASS]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            assert.ok(root[0].maxScrollW <= root[0].maxClientW + 1,
              width + ' 档 ' + skin + ' ' + c.name + '：根横向溢出 ' + root[0].maxScrollW + ' > ' + root[0].maxClientW);
            assert.equal(root[0].scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            /* 刻度／图例／标签／游标那枚字**都不许被截断**（本件不写省略号、不写 overflow:hidden）。 */
            const texts = await page.read([ganttTimelineSlot('tick-label'), ganttTimelineSlot('row-name'),
              ganttTimelineSlot('row-note'), ganttTimelineSlot('legend-item'), ganttTimelineSlot('now-label'),
              ganttTimelineSlot('ms-text'), ganttTimelineSlot('text')].map((slot) => scope + '.' + slot));
            for (const one of texts) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel
                + ' 有 ' + one.clipped + ' 处被截断');
            }
            /* 条／空档块／里程碑点都落在轨迹里；里程碑那枚点的**右缘压在格线上**（读者按刻度数得对）。 */
            const geo = await page.ev('(function(){var root=document.querySelector('
              + JSON.stringify(scope + '.' + GANTT_TIMELINE_CLASS) + ');'
              + 'var out={marks:[],tracks:0,line:null};'
              + 'var sel=' + JSON.stringify(['bar', 'idle', 'milestone'].map((s) => '.' + ganttTimelineSlot(s))) + ';'
              + 'var trackSel=' + JSON.stringify('.' + ganttTimelineSlot('track')) + ';'
              + 'var rows=[].slice.call(root.querySelectorAll(trackSel));out.tracks=rows.length;'
              + 'for(var i=0;i<rows.length;i+=1){var t=rows[i].getBoundingClientRect();'
              + 'var ms=rows[i].querySelectorAll(sel[0]+","+sel[1]+","+sel[2]);'
              + 'for(var j=0;j<ms.length;j+=1){var r=ms[j].getBoundingClientRect();'
              + 'out.marks.push({left:Math.round(r.left),right:Math.round(r.right),'
              + 'trackLeft:Math.round(t.left),trackRight:Math.round(t.right),cls:ms[j].className});}}'
              + 'var now=root.querySelector(' + JSON.stringify('.' + ganttTimelineSlot('now')) + ');'
              + 'if(now!==null){var n=now.getBoundingClientRect();var t0=rows[0].getBoundingClientRect();'
              + 'out.line={x:Math.round(n.left),trackLeft:Math.round(t0.left),trackRight:Math.round(t0.right)};}'
              + 'var row=root.querySelector(' + JSON.stringify('.' + ganttTimelineSlot('row')) + ');'
              + 'var lab=row.querySelector(' + JSON.stringify('.' + ganttTimelineSlot('row-label')) + ');'
              + 'var tk=row.querySelector(trackSel);var lr=lab.getBoundingClientRect();var tr=tk.getBoundingClientRect();'
              + 'out.stacked=(Math.round(lr.bottom)<=Math.round(tr.top)+1);'
              + 'out.sideBySide=(Math.round(lr.right)<=Math.round(tr.left)+1);'
              /* 游标那枚字：量它的底与第一条 row 的顶（原写法它绝对定位在 22px 的带里 ⇒ 换行就压住第一条）。 */
              + 'var nl=root.querySelector(' + JSON.stringify('.' + ganttTimelineSlot('now-label')) + ');'
              + 'var nlr=nl===null?null:nl.getBoundingClientRect();'
              + 'out.labelBottom=nlr===null?null:Math.round(nlr.bottom);'
              + 'out.labelLeft=nlr===null?null:Math.round(nlr.left);'
              + 'out.labelRight=nlr===null?null:Math.round(nlr.right);'
              + 'out.firstRowTop=Math.round(row.getBoundingClientRect().top);'
              + 'var rr=root.getBoundingClientRect();out.rootLeft=Math.round(rr.left);out.rootRight=Math.round(rr.right);'
              + 'return out;}())');
            assert.ok(geo.tracks > 0, width + ' 档 ' + skin + ' ' + c.name + '：一条轨迹都没有');
            for (const m of geo.marks) {
              assert.ok(m.left >= m.trackLeft - 1, width + ' 档 ' + skin + ' ' + c.name + '：' + m.cls
                + ' 跑出轨迹左边 ' + m.left + ' < ' + m.trackLeft);
              assert.ok(m.right <= m.trackRight + 1, width + ' 档 ' + skin + ' ' + c.name + '：' + m.cls
                + ' 跑出轨迹右边 ' + m.right + ' > ' + m.trackRight);
            }
            if (geo.line !== null) {
              assert.ok(geo.line.x >= geo.line.trackLeft - 1 && geo.line.x <= geo.line.trackRight + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：游标跑到轨迹外面：' + JSON.stringify(geo.line));
            }
            /* **游标那枚字的底不越过第一条 row 的顶**（原型与落地第一版都在这里翻车：
               字住在一条固定高度的带里，换行就盖住下面那条关键路径；实测 +17px／+18.5px）。 */
            if (geo.labelBottom !== null) {
              assert.ok(geo.labelBottom <= geo.firstRowTop + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：游标那枚字压住第一条行（字底 ' + geo.labelBottom
                + ' > 第一条 row 顶 ' + geo.firstRowTop + '）');
              assert.ok(geo.labelLeft >= geo.rootLeft - 1 && geo.labelRight <= geo.rootRight + 1,
                width + ' 档 ' + skin + ' ' + c.name + '：那枚字横着跑出本件：' + geo.labelLeft + '…' + geo.labelRight);
            }
            /* **窄宽两档换的是结构**（视口没变，只改了夹具容器宽度 ⇒ 这条只有 `@container` 才做得到）。 */
            if (width === 390) assert.equal(geo.stacked, true, '390 档：标签该折到轨迹之上');
            else assert.equal(geo.sideBySide, true, '1280 档：标签该回到左侧列');
            readings.push({ width, skin, case: c.name, marks: geo.marks.length, tracks: geo.tracks,
              label: geo.labelBottom === null ? null : geo.labelBottom - geo.firstRowTop });
          }
        }
      }
      /* ⑤ 换皮不换结构：四套皮肤容器里的标记逐字节相同。 */
      for (const c of cases()) {
        for (const width of [390, 1280]) {
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify(SKIN_NAMES) + ';'
            + 'for (var i = 0; i < skins.length; i += 1) {'
            + '  var el = document.querySelector("." + "ilife-skin-" + skins[i]'
            + ' + " [data-case=' + c.name + '] .' + GANTT_TIMELINE_CLASS + '");'
            + '  out[skins[i]] = el === null ? "" : el.innerHTML;'
            + '} return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(marks[skin], base, width + ' 档 ' + c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
          }
        }
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      const at = (w) => readings.filter((r) => r.width === w);
      const gap = (w) => at(w).map((r) => r.label).filter((v) => v !== null);
      console.log('READING gantt-timeline container=390 盒子数=' + at(390).reduce((n, r) => n + r.marks, 0)
        + ' 轨迹数=' + at(390).reduce((n, r) => n + r.tracks, 0) + ' 格均摊到 390 宽：标签折上'
        + '｜container=1280 盒子数=' + at(1280).reduce((n, r) => n + r.marks, 0)
        + ' 轨迹数=' + at(1280).reduce((n, r) => n + r.tracks, 0) + ' 标签列在左侧'
        + '｜游标那枚字「底 − 第一条 row 顶」390 档 ' + gap(390).join('／') + '、1280 档 ' + gap(1280).join('／')
        + '（负＝在行的上方，全档不许为正）');
    } finally { page.close(); }
  });
});
