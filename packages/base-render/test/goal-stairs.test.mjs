/** goal-stairs（目标阶梯 · 形态 C「倒推日程：每段最晚何时动手」）· 契约测试。
 *
 *  五组判据（与 `scatter-fit.test.mjs`／`page-head.test.mjs` 同一套四类 ＋ 皮肤纪律）：
 *  ① **渲染契约**：段数与槽位／**三个百分数是同一份真值**（窗口带的两端、今天的竖线、
 *     「最晚」那枚标签落的位置都由它们算）／过期点名（含两条边界）／状态字三样（形 ＋ 字 ＋ 色里的字）／
 *     转义面／**全部**非法入参分支（每个都断 `BlocksError`）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且**只出现一次**
 *     （含 `@container` 里那一条）、零 `:root`／`!important`／零新 token／零手写色值（只有 `skinVar()` 兜底链那一处）／
 *     零把 `ink` 系当面／零 `@media` 宽度查询／零 `transition`·`animation`（减动效下没有东西会卡在半路）／
 *     零可点元素与键盘语汇；
 *  ③ **加法式**：本件只读自己的类名；不启用它的页面零命中、逐字节不变；
 *  ④ **两档几何（真机 headless Chrome ＋ CDP）**：**容器**宽度 390 与 1280 下零横向溢出、
 *     「最晚」那枚标签整枚落在轨道里、窗口带不越轨、日期与状态字零截断、窄宽两档**结构真的换了**
 *     （窄＝行头在轨道上方，宽＝行头在轨道左边）；**起不来就退确定性几何判据并打印原因**；
 *  ⑤ **皮肤纪律**：同一份入参渲染三次逐字节相同、标记不带皮肤类、真机上四套皮肤里的 `innerHTML` 逐字节相同。
 *
 *  期望值一律从组件自己的常量派生（`GOAL_STAIRS_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GOAL_STAIRS_CLASS,
  GOAL_STAIRS_DUE_FLIP_PCT,
  GOAL_STAIRS_FORMS,
  GOAL_STAIRS_HEAD_COLUMN_PX,
  GOAL_STAIRS_LATE_WORD,
  GOAL_STAIRS_MAX_STEPS,
  GOAL_STAIRS_MIN_STEPS,
  GOAL_STAIRS_NARROW_MAX_PX,
  GOAL_STAIRS_SLOTS,
  GOAL_STAIRS_STATES,
  GOAL_STAIRS_STATE_WORDS,
  GOAL_STAIRS_TRACK_PX,
  GOAL_STAIRS_WIDE_PX,
  goalStairsSlot,
  renderGoalStairs,
  goalStairsCss,
} from '../dist/components/goal-stairs/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderProgressList } from '../dist/components/progress-list/index.js';
import { SKINS, skinCss, skinClass } from '../dist/components/skin/index.js';
import { SKIN_NAMES } from '../dist/components/skin/contract.js';
import { auditHtml, exitCodeFor } from './separator-probe.mjs';
import { startShapesPage } from './shapes-probe.mjs';
import { styleSource } from './_style-sources.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'goal-stairs');

/** 四套皮肤的取值表（期望色**从表里读**，判据里不抄色字面量）。 */
const SKIN_VALUES = Object.fromEntries(SKIN_NAMES.map((s) => [s, SKINS[s].values]));

/** 取值表里的 `#rrggbb` → 浏览器 `getComputedStyle` 报出来的 `rgb(r, g, b)` 串。 */
const toRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return 'rgb(' + [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(', ') + ')';
};

/** WCAG 对比度（1..21）：只算**契约列出来的那几档文字色**。 */
const contrast = (a, b) => {
  const lin = (hex) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const ch = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const [x, y] = [lin(a), lin(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/** 剥掉 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把"解释"当"规则"）。 */
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

/* ── 三份样例（照原型墙那一档的读数写；位置都用得上：0／轴中／100） ─────── */

const BASE = {
  title: '倒推到 12-07 还清', today: '09-24', todayPct: 24,
  steps: [
    { from: '12 万', to: '8 万', start: '09-01', startPct: 0, endPct: 18, state: 'done' },
    { from: '8 万', to: '5 万', start: '09-15', startPct: 18, endPct: 42, state: 'done' },
    { from: '5 万', to: '2 万', start: '10-01', startPct: 42, endPct: 70, state: 'now' },
    { from: '2 万', to: '10-21', start: '10-21', startPct: 70, endPct: 100, state: 'plan' },
  ],
};
/** 过期：第 2 段的窗口整段落在今天（62）左边且没达成 ⇒ 点名；第 3 段标记过了轴的一半 ⇒ 标签翻边。 */
const LATE = {
  title: '倒推到 10-31 打卡满 30 天', today: '10-20', todayPct: 62,
  steps: [
    { from: '第 1 周', to: '第 2 周', start: '10-01', startPct: 0, endPct: 30, state: 'done' },
    { from: '第 2 周', to: '第 3 周', start: '10-08', startPct: 30, endPct: 55, state: 'plan' },
    { from: '第 3 周', to: '第 4 周', start: '10-18', startPct: 55, endPct: 92, state: 'now' },
    { from: '第 4 周', to: '满 30 天', start: '10-28', startPct: 92, endPct: 100, state: 'plan' },
  ],
};
/** 端点压力：窗口压在轨道两端、今天的竖线正好在 100、日期串长到要换行。 */
const EDGE = {
  title: '压端点的极端入参', today: '2026 年 12 月 07 日（星期一）当天', todayPct: 100,
  steps: [
    { from: '起点', to: '中点', start: '2026-09-01', startPct: 0, endPct: 50, state: 'now' },
    { from: '中点', to: '终点', start: '2026-12-07（星期一）', startPct: 92, endPct: 100, state: 'plan' },
  ],
};

/** **贴轴 × 长日期**（审查席抓出来的那一档）：
 *   · `startPct` 50／50.01 分居翻边线两侧、92 在最右、99.99 贴轴顶、0／0.01 贴轴底；
 *   · 三行用长日期串（`2026-12-07（星期一）`）——在 ≤620 的容器里它会**换两行**，
 *     而标签是绝对定位＋定高轨道时，两行会上下各顶出 5.8px；
 *   · 0.01% 宽的窗口曾把带子的右端顶出 0.59…0.95px（边框撑盒）。 */
const TIGHT = {
  title: '贴轴与长日期', today: '12-07', todayPct: 100,
  steps: [
    { from: '起点', to: '中点', start: '2026-12-07（星期一）', startPct: 50, endPct: 100, state: 'now' },
    { from: '中点', to: '三点', start: '2026-12-07（星期一）', startPct: 50.01, endPct: 100, state: 'plan' },
    { from: '三点', to: '四点', start: '2026-12-07（星期一）', startPct: 92, endPct: 100, state: 'plan' },
    { from: '四点', to: '五点', start: '09-01', startPct: 99.99, endPct: 100, state: 'plan' },
    { from: '五点', to: '终点', start: '09-01', startPct: 0, endPct: 0.01, state: 'done' },
  ],
};

/** 一份「两段」的最小入参（段数下限那一条用）。 */
const minimal = (extra) => ({
  title: 'T', today: 'D', todayPct: 50,
  steps: [
    { from: 'a', to: 'b', start: 's1', startPct: 0, endPct: 20, state: 'done' },
    { from: 'b', to: 'c', start: 's2', startPct: 20, endPct: 100, state: 'plan' },
  ],
  ...extra,
});

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('goal-stairs ① 渲染契约 · 骨架与段', () => {
  const html = renderGoalStairs(BASE);

  it('骨架：卡头（标题 ＋ 段数 ＋ 竖线＝今天）→ 有序表的逐段行 → 口径行', () => {
    assert.match(html, new RegExp('^<div class="' + GOAL_STAIRS_CLASS + ' is-C">'));
    assert.match(html, /<b class="[^"]*-title">倒推到 12-07 还清<\/b>/);
    assert.match(html, /-count">四段</, '段数是**算出来**的');
    assert.match(html, /-tail-lead">竖线＝今天<[\s\S]{0,80}-tail-day">09-24</, '那句分两枚上屏：前两枚字固定');
    assert.equal(countOf(html, 'class="[^"]*-row"'), BASE.steps.length, '一段一行');
    assert.match(html, /^<div class="[^"]*"><div class="[^"]*-hd">[\s\S]*<ol class="[^"]*-rows">/,
      '逐段那张表是有序表（段的先后是这件事本身）');
    assert.match(html, /<\/ol><p class="[^"]*-note">口径：/);
    for (const slot of ['hd', 'title', 'count', 'tail', 'tail-lead', 'tail-day', 'rows', 'row', 'head',
      'name', 'window', 'state', 'track', 'band', 'today', 'due', 'note']) {
      assert.ok(html.includes(goalStairsSlot(slot)), '缺槽：' + slot);
    }
    assert.equal(html.includes(goalStairsSlot('late')), false, '没有过期的那一段，就不出点名那一枚');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.equal(/ on[a-z]+="/.test(html), false, '不许有内联事件');
  });

  it('逐段的字：段名（序号 ＋ 两端读数）／窗口句／最晚动手日／状态字', () => {
    assert.match(html, /-name">第 1 段 12 万 → 8 万</);
    assert.match(html, /-window">窗口 09-01 起</);
    assert.match(html, /-due">最晚 09-01</);
    assert.match(html, /-name">第 4 段 2 万 → 10-21</);
    assert.match(html, /-due">最晚 10-21</);
    for (const state of GOAL_STAIRS_STATES) {
      assert.ok(html.includes('-state is-' + state + '">' + GOAL_STAIRS_STATE_WORDS[state]),
        '状态字与档名对不上：' + state);
    }
    /* 三枚形各不相同（色盲下也分得出）：✓／▶／○ 各在各自的那一枚里。 */
    const marks = GOAL_STAIRS_STATES.map((s) => GOAL_STAIRS_STATE_WORDS[s].slice(-1));
    assert.equal(new Set(marks).size, GOAL_STAIRS_STATES.length, '三档状态的字尾那枚形不许重样');
  });

  it('**三个百分数是同一份真值**：窗口带的两端与今天那根竖线都写进行内自定义属性', () => {
    const styles = [...html.matchAll(/-track[^"]*" style="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(styles.length, BASE.steps.length, '一条轨道一份几何');
    BASE.steps.forEach((step, i) => {
      assert.equal(styles[i], '--goal-stairs-start: ' + step.startPct.toFixed(2) + '%;'
        + ' --goal-stairs-end: ' + step.endPct.toFixed(2) + '%;'
        + ' --goal-stairs-now: ' + BASE.todayPct.toFixed(2) + '%', '第 ' + (i + 1) + ' 段的几何');
    });
    /* 三个数只在样式段里被用（窗口带两端／今天那根竖线／那枚标签），没有第二处再写一遍坐标。 */
    const css = goalStairsCss();
    assert.ok(css.includes('left: var(--goal-stairs-start)'), '标签落在标记上');
    assert.ok(css.includes('right: calc(100% - var(--goal-stairs-end))'), '窗口带右端');
    assert.ok(css.includes('calc(var(--goal-stairs-now) - 1px)'), '今天那根竖线');
  });

  it('**标签四向都不出轨道**：标记过了翻边线就翻边（`is-right`），靠右缘往左长', () => {
    const flags = [...html.matchAll(/-track( is-right)?" style/g)].map((m) => m[1] === ' is-right');
    assert.deepEqual(flags, BASE.steps.map((s) => s.startPct > GOAL_STAIRS_DUE_FLIP_PCT),
      '翻边只看标记落在轴的哪半边（分界＝`GOAL_STAIRS_DUE_FLIP_PCT`）');
    /* 分界本身逐点断：正好落在线上不翻，过一线就翻。 */
    const at = (startPct) => renderGoalStairs({
      title: 'T', today: 'D', todayPct: 100,
      steps: [
        { from: 'a', to: 'b', start: 's1', startPct, endPct: 100, state: 'plan' },
        { from: 'b', to: 'c', start: 's2', startPct: 0, endPct: 100, state: 'plan' },
      ],
    });
    assert.equal(/-track is-right" style="--goal-stairs-start: 50\.00%/.test(at(GOAL_STAIRS_DUE_FLIP_PCT)), false,
      '正好落在线上不翻边');
    assert.match(at(GOAL_STAIRS_DUE_FLIP_PCT + 0.01), /-track is-right" style="--goal-stairs-start: 50\.01%/,
      '过一线就翻边');
    const edge = renderGoalStairs(EDGE);
    assert.match(edge, /-track is-right" style="--goal-stairs-start: 92\.00%/, '92% 那一段要翻边');
    assert.match(edge, /-track" style="--goal-stairs-start: 0\.00%/, '0% 那一段不许翻边');
  });

  it('过期点名（三条边界）：整段在竖线左边且没达成才点名', () => {
    const late = renderGoalStairs(LATE);
    assert.match(late, /-late">来不及 ✕</);
    assert.equal(countOf(late, 'class="' + goalStairsSlot('late') + '"'), 1, '只有第 2 段该点名');
    assert.equal(countOf(late, 'is-late"'), 1, '过期那一档的窗口带也带 `is-late`（色 ＋ 形 ＋ 字三样）');
    /* 边界一：窗口右端**正好压在**竖线上（55 = todayPct）不算过期。 */
    const touch = renderGoalStairs({
      title: 'T', today: 'D', todayPct: 55,
      steps: [
        { from: 'a', to: 'b', start: 's1', startPct: 0, endPct: 55, state: 'plan' },
        { from: 'b', to: 'c', start: 's2', startPct: 55, endPct: 100, state: 'plan' },
      ],
    });
    assert.equal(touch.includes(goalStairsSlot('late')), false, '压在竖线上不算过期');
    /* 边界二：窗口整段过去了，但这一段**已达成**——不算迟到（那是走完的段）。 */
    const done = renderGoalStairs({
      title: 'T', today: 'D', todayPct: 90,
      steps: [
        { from: 'a', to: 'b', start: 's1', startPct: 0, endPct: 40, state: 'done' },
        { from: 'b', to: 'c', start: 's2', startPct: 40, endPct: 100, state: 'plan' },
      ],
    });
    assert.equal(done.includes(goalStairsSlot('late')), false, '已达成的那段不点名');
  });

  it('段数那枚字：2 段写「二段」、8 段写「八段」（上下限两端）', () => {
    const two = renderGoalStairs(minimal());
    assert.match(two, /-count">二段</);
    const eight = renderGoalStairs({
      title: 'T', today: 'D', todayPct: 50,
      steps: new Array(GOAL_STAIRS_MAX_STEPS).fill(0).map((_, i) => ({
        from: 'f' + String(i), to: 't' + String(i), start: 's' + String(i),
        startPct: (i * 100) / GOAL_STAIRS_MAX_STEPS, endPct: ((i + 1) * 100) / GOAL_STAIRS_MAX_STEPS,
        state: 'plan',
      })),
    });
    assert.match(eight, /-count">八段</);
    assert.equal(countOf(eight, '-row"'), GOAL_STAIRS_MAX_STEPS);
  });

  it('口径行：不给 `note` 就用本形态那句；给了就整句换掉', () => {
    assert.match(renderGoalStairs(minimal()), /-note">口径：从目标日往回倒推每一段的最晚动手日/);
    const noted = renderGoalStairs(minimal({ note: '自定义口径' }));
    assert.ok(noted.includes('-note">自定义口径</p>'));
    assert.equal(noted.includes('从目标日往回倒推'), false, '替换＝整句换掉');
  });

  it('转义面：标题／今天／两端读数／日期／口径逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderGoalStairs({
      title: evil, today: evil, todayPct: 50, note: evil,
      steps: [
        { from: evil, to: evil, start: evil, startPct: 0, endPct: 50, state: 'done' },
        { from: evil, to: evil, start: evil, startPct: 50, endPct: 100, state: 'plan' },
      ],
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    /* 文本位逐一过转义：标题／今天／口径 各一处，每段三处（`start` 进两枚字：窗口句与最晚那句）。 */
    assert.equal(countOf(html, '&quot;&gt;&lt;script'), 3 + 2 * 4, '每个文本位都过转义');
  });

  it('入参违规一律拒（不静默降级）：形态／段数／字段类型／位置越界／窗口两端／状态 逐条', () => {
    assert.deepEqual([...GOAL_STAIRS_FORMS], ['C']);
    assert.deepEqual([...GOAL_STAIRS_STATES], ['done', 'now', 'plan']);
    const ok = minimal();
    assert.equal(throwsBlocks(() => renderGoalStairs(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderGoalStairs([])), true, '数组不是入参');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, title: undefined })), true, '缺标题');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, title: '' })), true, '标题空串');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, today: '' })), true, '缺今天');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, todayPct: undefined })), true, '缺今天的位置');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, todayPct: '50' })), true, '位置不是数');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, todayPct: Number.NaN })), true, '位置是 NaN');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, todayPct: -1 })), true, '位置越界（左）');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, todayPct: 100.5 })), true, '位置越界（右）');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, form: 'A' })), true, '形态闭集外');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, form: 'c' })), true, '形态大小写不许蒙');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, extraClass: 'a"b' })), true, '附加类名过正则');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, note: 1 })), true, 'note 类型');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: undefined })), true, '缺分段');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: 'x' })), true, '分段不是数组');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [] })), true, '一段都没有');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [ok.steps[0]] })), true,
      '少于 ' + GOAL_STAIRS_MIN_STEPS + ' 段（一段读不出先后）');
    assert.equal(throwsBlocks(() => renderGoalStairs({
      ...ok, steps: new Array(GOAL_STAIRS_MAX_STEPS + 1).fill(ok.steps[0]),
    })), true, '多于 ' + GOAL_STAIRS_MAX_STEPS + ' 段');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [null, ok.steps[1]] })), true, '元素不是对象');
    for (const field of ['from', 'to', 'start']) {
      assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [{ ...ok.steps[0], [field]: '' }, ok.steps[1]] })),
        true, '这一段缺 ' + field);
      assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [{ ...ok.steps[0], [field]: 1 }, ok.steps[1]] })),
        true, field + ' 不是字符串');
    }
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [{ ...ok.steps[0], startPct: -0.5 }, ok.steps[1]] })), true);
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [{ ...ok.steps[0], startPct: 101 }, ok.steps[1]] })), true);
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [{ ...ok.steps[0], endPct: Number.POSITIVE_INFINITY }, ok.steps[1]] })), true);
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [{ ...ok.steps[0], endPct: 0 }, ok.steps[1]] })), true,
      '窗口两端一样宽（读不出这一段占了多久）');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [{ ...ok.steps[0], endPct: -5 }, ok.steps[1]] })), true,
      '窗口右端在左端左边');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [{ ...ok.steps[0], state: 'todo' }, ok.steps[1]] })), true,
      '状态闭集外');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [{ ...ok.steps[0], state: undefined }, ok.steps[1]] })), true,
      '状态不给（件里不猜"哪一段算进行中"）');
    assert.equal(throwsBlocks(() => renderGoalStairs({
      ...ok, steps: [{ ...ok.steps[0], endPct: 100 }, { ...ok.steps[1], startPct: 0 }],
    })), false, '两段的窗口可以互相叠着（先后次序由数组给，不由位置推）');
  });

  it('**未知键一律拒**：每个对象层各加一个 `zzUnknown: 1` ⇒ `BlocksError`（含不可枚举的自有键与原型链上继承来的键）', () => {
    const ok = minimal();
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, form: 'C', note: '口径', extraClass: 'x y' })), false,
      '正面：入参表里的可选键给全照收（拒的是表外的键，不是可选键）');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, zzUnknown: 1 })), true, '顶层多一个键');
    assert.equal(throwsBlocks(() => renderGoalStairs({
      ...ok, steps: [{ ...ok.steps[0], zzUnknown: 1 }, ok.steps[1]],
    })), true, '一段（`steps[i]`）里多一个键');
    /* 双查：只走 `Object.keys` 会漏掉这两类（先例 `relation-picker/model.ts`／`kanban-columns/model.ts`）。 */
    const hidden = { ...ok.steps[0] };
    Object.defineProperty(hidden, 'zzHidden', { value: 1, enumerable: false });
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [hidden, ok.steps[1]] })), true, '不可枚举的自有键');
    const inherited = { ...ok.steps[0] };
    Object.setPrototypeOf(inherited, { zzProto: 1 });
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: [inherited, ok.steps[1]] })), true, '原型链上继承来的键');
  });

  it('**稀疏数组一律拒**：`length` 算出来的段数必须与真有的行数对得上', () => {
    /* `new Array(2)` 的洞会被 `map()` 跳过，`length` 却照算 ⇒ 卡头写着「二段」、表里一行都没有。
       `a = new Array(2); a[1] = {…}` 同理：写着「二段」而只有一行。两条都要在归一化期拒。 */
    const ok = minimal();
    const holes = new Array(2);
    assert.equal(holes.length, 2, '前提：稀疏数组的 length 是 2');
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: holes })), true,
      '全空洞的稀疏数组（卡头会说二段、表里 0 行）');
    const tail = new Array(2);
    tail[1] = ok.steps[1];
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: tail })), true,
      '只有第 2 格有值的稀疏数组（卡头会说二段、表里 1 行）');
    const middle = new Array(GOAL_STAIRS_MAX_STEPS);
    middle[0] = ok.steps[0];
    middle[GOAL_STAIRS_MAX_STEPS - 1] = ok.steps[1];
    assert.equal(throwsBlocks(() => renderGoalStairs({ ...ok, steps: middle })), true, '中间挖空的稀疏数组');
    /* 反面对照：**实心的**同样长度照常渲染（拒的是洞，不是长度）。 */
    const solid = [ok.steps[0], ok.steps[1]];
    assert.equal(countOf(renderGoalStairs({ ...ok, steps: solid }), '-row"'), solid.length);
  });

  it('README 的必填／缺省与件里的校验对得上（说明书不是另一份事实）', () => {
    const readme = readFileSync(join(DIR, 'README.md'), 'utf8');
    const lines = readme.split('\n');
    const head = lines.findIndex((l) => /^\|\s*字段\s*\|\s*类型\s*\|\s*缺省\s*\|/.test(l));
    assert.ok(head > 0, 'README 里找不到入参表');
    const rows = [];
    for (let i = head + 2; i < lines.length && lines[i].startsWith('|'); i += 1) {
      const cells = lines[i].split('|').map((s) => s.trim());
      rows.push({ field: cells[1].replace(/`/g, ''), req: cells[3] });
    }
    assert.ok(rows.length >= 5, '入参表抽空了：' + JSON.stringify(rows));
    /* 表里写「必填」的：去掉就必红。写「—」或给了缺省值的：去掉照常渲染。 */
    const required = rows.filter((r) => r.req.includes('必填')).map((r) => r.field);
    const optional = rows.filter((r) => !r.req.includes('必填')).map((r) => r.field);
    assert.deepEqual(required.sort(), ['steps', 'title', 'today', 'todayPct'], '必填那几格变了');
    assert.deepEqual(optional.sort(), ['extraClass', 'form', 'note'], '有缺省的那几格变了');
    const base = minimal();
    for (const field of required) {
      const gone = { ...base };
      delete gone[field];
      assert.equal(throwsBlocks(() => renderGoalStairs(gone)), true, 'README 说必填，去掉却没报错：' + field);
    }
    for (const field of optional) {
      const gone = { ...base };
      delete gone[field];
      assert.equal(throwsBlocks(() => renderGoalStairs(gone)), false, 'README 说有缺省，去掉却报错：' + field);
    }
  });

  it('口径行与卡头那句过**分隔符门**（`·`／`；`／并列三段以上一处都不许有）', () => {
    /* 件生成的字全部过一遍仓库那把尺子（`test/separator-probe.mjs`，与门禁同口径）：
       可见文本里出现 `·`／`；`／≥3 段并列 就是设计债。原型卡头那枚 `·` 正是在这里被抓掉的。 */
    const html = [BASE, LATE, EDGE].map((i) => renderGoalStairs(i)).join('');
    const r = auditHtml('<body>' + html + '</body>');
    assert.deepEqual(r.node.hits.map((h) => h.tags.join('+') + ' @' + h.owner), [],
      '件生成的可见文本踩了分隔符门：' + JSON.stringify(r.node.hits));
    assert.equal(exitCodeFor(r), 0);
    /* 反面自证：同一把尺子对一段带 `·` 的文本必须红（否则这条判据在空转）。 */
    assert.equal(exitCodeFor(auditHtml('<p>目标 · 完成度</p>')), 1);
  });

  it('纯函数：同样的入参恒产同样的字节（三份样例各一遍）', () => {
    for (const input of [BASE, LATE, EDGE]) {
      assert.equal(renderGoalStairs(input), renderGoalStairs(input));
    }
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('goal-stairs ② 样式与零 DOM 纪律', () => {
  const css = goalStairsCss();
  const clean = stripComments(css);

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且**只出现一次**', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = ruleSelectors(clean);
    assert.ok(selectors.length >= 20, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + one);
        assert.ok(one.includes(GOAL_STAIRS_CLASS), '选择器必须只碰本件类名根：' + one);
        assert.equal((one.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次（拼两遍＝永不命中的死规则）：' + one);
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零 `@media`／零动效；必带 `@container` 且自己声明了容器', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(clean.includes('@media'), false, '本件不判视口宽度（视口宽 ≠ 组件宽）');
    assert.equal(clean.includes('transition'), false, '零动效：减动效下没有东西会卡在半路');
    assert.equal(clean.includes('animation'), false, '零动效');
    /* 缺省那一份是**宽档**（完整的一份版式），容器查询只把窄档那一支换上去——
       判据同时钉住「阈值＝`GOAL_STAIRS_NARROW_MAX_PX`」与「写的是 `max-width` 不是 `min-width`」：
       后者是本层既有写法（`scatter-fit`／`cash-waterline`），也让「静态判据把 `min-width: 620px`
       读成一处过不了窄档的固定宽度」这个坑无处可踩（2026-09 实测被 `皮肤矩阵.test.mjs` 第 ④ 组判红过）。 */
    assert.ok(clean.includes('@container (max-width: ' + String(GOAL_STAIRS_NARROW_MAX_PX) + 'px)'),
      '窄档必须由容器判（且用 `max-width`：缺省＝宽档）');
    assert.equal(GOAL_STAIRS_NARROW_MAX_PX, GOAL_STAIRS_WIDE_PX - 1, '窄档上界＝宽档阈值 − 1');
    assert.equal(clean.includes('min-width:'), true, '`min-width: 0` 那几处是防压字的（不是分档）');
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
    const src = stripComments(styleSource('goal-stairs'));
    assert.deepEqual([...src.matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [], 'style.ts 里请改走 skinVar()');
    /* 选中／填充四档：**有文字的位走字色**（不是墨块），无文字的条走实底；
       任何一处的 `background` 都不许整个就是文字墨色。 */
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了"面"：' + value);
    }
    assert.ok(clean.includes(skinFill('accent')), '今天那根竖线是强调色实底');
    assert.ok(clean.includes(skinFill('surface-2')), '还没开始的窗口带走次要面');
    assert.ok(clean.includes('color-mix(in srgb,'), '现在这一段与过期那一段是语义色的淡洗');
    assert.ok(clean.includes('danger'), '过期那一档走 danger，不借强调色');
    assert.ok(clean.includes('ok'), '达标那一档走 ok，不借强调色');
  });

  it('尺寸事实写在一处：轨道高、宽档阈值、行头那一列的宽都取常量', () => {
    assert.ok(clean.includes('height: ' + String(GOAL_STAIRS_TRACK_PX) + 'px'));
    assert.ok(clean.includes(String(GOAL_STAIRS_HEAD_COLUMN_PX) + 'px minmax(0, 1fr)'));
    assert.equal(clean.includes('overflow-x'), false, '不许出现 overflow-x（不藏横滑）');
    assert.equal(clean.includes('scroll'), false, '不许出现滚动容器');
    assert.equal(clean.includes('text-overflow'), false, '不许出现省略号截断手段');
    assert.equal(clean.includes('line-clamp'), false, '不许出现行数截断');
    assert.equal(clean.includes('white-space: nowrap'), true, '件里自己那几枚短词不折行（不是截断手段）');
  });

  it('文字色过对比地板（算出来不靠眼看）：契约列出的那几档对底 ≥4.5:1', () => {
    for (const skin of SKIN_NAMES) {
      const v = SKIN_VALUES[skin];
      const grounds = ['ground', 'surface', 'surface-2'];
      for (const text of ['ink', 'ink-2', 'accent-text', 'danger']) {
        for (const g of grounds) {
          const ratio = contrast(v[text], v[g]);
          assert.ok(ratio >= 4.5, skin + '：' + text + ' 对 ' + g + ' 只有 ' + ratio.toFixed(2));
        }
      }
    }
  });

  it('**语义色当字**的对比地板：`ok` 对 `surface`（卡面）与对 `ok-soft`（自家软底）≥4.5:1', () => {
    /* 三笔账说清楚（审查席点名的那一笔）：
       ① 那条带是**无文字的条**（`aria-hidden`、`textContent` 空）——它只提供「形 ＋ 色」，不冒充文字底；
       ② 字在**行头**（`.state`），它自己不画底（背景透明）⇒ 真正压着的底是**宿主页的底**：
          卡面走 `surface`、裸页走 `ground`；
       ③ 所以这一条断的是 `ok` 对 `surface`（本件最常落的那张卡面）与对 `ok-soft`（自家语义软底，
          与别件放一起时可能叠在它上面）。**页底（`ground`）那一档归皮肤层的地板判据**，件不背——
          这里只**打读数**，不断言（编排者的口径：页底那笔账不在件里）。
       **期望值一律从皮肤取值表算**（`SKINS[skin].values`）：皮肤改值这里自动跟——写死色值会在皮肤席
       压深 `ok` 的那一刻变成假红。失败时点名到皮肤与 token：那是取值表的事，**件内不改**（改走 ink
       就是拿语义档借字色，法条禁止）。 */
    for (const skin of SKIN_NAMES) {
      const v = SKIN_VALUES[skin];
      console.log('READING 状态字对比 ' + skin + '：ok on ground＝' + contrast(v.ok, v.ground).toFixed(2)
        + ':1（读数，页底那档归皮肤层）');
      for (const ground of ['surface', 'ok-soft']) {
        const ratio = contrast(v.ok, v[ground]);
        console.log('READING 状态字对比 ' + skin + '：ok on ' + ground + '＝' + ratio.toFixed(2) + ':1');
        assert.ok(ratio >= 4.5, skin + '：达标那一档的字色 `ok` 对 `' + ground + '` 只有 ' + ratio.toFixed(2)
          + ':1（低于文本地板 4.5）——这是**皮肤取值表**那笔账（`skin.test.mjs` 的「语义色当字」地板同一条），'
          + '件内保持 `ok` 不动');
      }
    }
  });

  it('零键盘语汇、零可点元素（本件是纯静态图）', () => {
    const words = ['快捷键', '键位', '方向键', '键帽', '键盘', '按 Enter', 'Tab', '点击', '长按'];
    const all = [BASE, LATE, EDGE].map((i) => renderGoalStairs(i)).join('') + css;
    for (const w of words) assert.equal(all.includes(w), false, '出现键盘／点按语汇：' + w);
    const interactive = [BASE, LATE, EDGE].map((i) => renderGoalStairs(i)).join('');
    for (const needle of ['<button', '<a ', 'tabindex', 'onclick', '<input', '<select', 'role="button"']) {
      assert.equal(interactive.includes(needle), false, '本件不带可点元素：' + needle);
    }
  });

  it('`dist/components/goal-stairs/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'goal-stairs');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 4, '至少该有 index／attrs／model／render／style 的产物：' + files.join('、'));
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
    /* 纯展示件：**没有运行时段**（README 里写明为什么不需要交互）。 */
    assert.equal(files.includes('runtime.js'), false, '本件不该有运行时段');
  });

  it('槽位闭集与类名一致（判据不另抄一份字面量）', () => {
    assert.equal(goalStairsSlot('track'), GOAL_STAIRS_CLASS + '-track');
    assert.equal(goalStairsSlot('track', 'x-'), 'x-block-goal-stairs-track');
    for (const slot of GOAL_STAIRS_SLOTS) assert.ok(goalStairsSlot(slot).startsWith(GOAL_STAIRS_CLASS + '-'));
  });
});

/** `skinVar()` 兜底链在产出 CSS 里的样子（判据不手写 token 名）。 */
function skinFill(name) {
  const v = SKIN_VALUES[SKIN_NAMES[0]];
  assert.ok(typeof v[name] === 'string', '皮肤取值表里没有这个 token：' + name);
  return '--ilife-' + name;
}

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('goal-stairs ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(GOAL_STAIRS_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const bar = renderScaleBar({ value: 860, goal: 1850 });
    const list = renderProgressList({ rows: [{ label: 'a', current: 1, goal: 2 }] });
    renderGoalStairs(BASE);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), bar, '别件的产物逐字节不变');
    assert.equal(renderProgressList({ rows: [{ label: 'a', current: 1, goal: 2 }] }), list);
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(goalStairsCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-goal-stairs'), '前缀必须作用到 scope 与类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });
});

/* ── ④ 两档几何（真机）＋ ⑤ 皮肤纪律 ──────────────────────────────── */

/** 四份压力样例（每份都进四档 × 四套皮肤）。 */
function cases() {
  return [
    { name: 'base', html: renderGoalStairs(BASE), steps: BASE.steps, todayPct: BASE.todayPct },
    { name: 'late', html: renderGoalStairs(LATE), steps: LATE.steps, todayPct: LATE.todayPct },
    { name: 'edge', html: renderGoalStairs(EDGE), steps: EDGE.steps, todayPct: EDGE.todayPct },
    { name: 'tight', html: renderGoalStairs(TIGHT), steps: TIGHT.steps, todayPct: TIGHT.todayPct },
  ];
}

/** 量哪几个**容器**宽度：320（更窄的手机）／390／带宽档阈值两侧各一档／1280。 */
const WIDTHS = [320, 390, GOAL_STAIRS_NARROW_MAX_PX, GOAL_STAIRS_WIDE_PX, 1280];

/** 静态几何判据（真机起不来时的退路）：标记与样式段里不得有超过最窄档的固定宽度。 */
function assertStaticGeometry(css, html) {
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const wide = [...px(html), ...px(css)].filter((v) => v > 320);
  assert.deepEqual(wide, [], '出现过不了最窄档（320）的固定宽度：' + wide.join('、'));
  const pcts = [...html.matchAll(/--goal-stairs-(?:start|end|now): ([\d.]+)%/g)].map((m) => Number(m[1]));
  assert.ok(pcts.length > 0, '位置必须是百分数（判据会空转）');
  for (const v of pcts) assert.ok(v >= 0 && v <= 100, '百分数越界：' + v);
}

/** 页内量一份逐行几何读数：**每一行**都量（早先只在第 1 行算，第 2 行起从没被断过）。
 *
 *  量的四件事：
 *   · 标签四向越界（正数＝伸出轨道；两行日期曾上下各顶出 5.8px）；
 *   · 窗口带左右越界（贴轴的 0.01% 窗口曾把右端顶出 0.59…0.95px）；
 *   · 今天那根竖线**逐行**在不在轨道里；
 *   · **位置真落在百分数上**：带的两端与竖线中心对 `track.clientWidth` 的百分比 ±1px 内。 */
const ROW_FN = `(function (rootSel, steps, todayPct) {
  var root = document.querySelector(rootSel);
  var rows = [].slice.call(root.querySelectorAll('.ilife-block-goal-stairs-row'));
  var r2 = function (v) { return Math.round(v * 100) / 100; };
  var out = { rows: rows.length, rootW: Math.round(root.getBoundingClientRect().width),
    headAbove: 0, headLeft: 0, trackH: 0, dueH: 0,
    maxDueOver: -1e9, maxBandOver: -1e9, maxRowOver: -1e9, markerOut: 0,
    maxStartErr: 0, maxEndErr: 0, maxNowErr: 0 };
  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    var head = row.querySelector('.ilife-block-goal-stairs-head');
    var track = row.querySelector('.ilife-block-goal-stairs-track');
    var band = row.querySelector('.ilife-block-goal-stairs-band');
    var badge = row.querySelector('.ilife-block-goal-stairs-due');
    var marker = row.querySelector('.ilife-block-goal-stairs-today');
    var h = head.getBoundingClientRect(), t = track.getBoundingClientRect();
    var b = band.getBoundingClientRect(), g = badge.getBoundingClientRect();
    var m = marker.getBoundingClientRect();
    if (h.bottom <= t.top + 0.6) out.headAbove += 1;
    if (h.right <= t.left + 0.6) out.headLeft += 1;
    if (t.height > out.trackH) out.trackH = Math.round(t.height);
    if (g.height > out.dueH) out.dueH = Math.round(g.height);
    out.maxDueOver = Math.max(out.maxDueOver, r2(g.right - t.right), r2(t.left - g.left),
      r2(t.top - g.top), r2(g.bottom - t.bottom));
    out.maxBandOver = Math.max(out.maxBandOver, r2(b.right - t.right), r2(t.left - b.left));
    var rr = row.getBoundingClientRect();
    out.maxRowOver = Math.max(out.maxRowOver, r2(t.right - rr.right), r2(rr.left - t.left));
    if (m.left < t.left - 0.6 || m.right > t.right + 0.6) out.markerOut += 1;
    var inner = track.clientWidth, x0 = t.left + track.clientLeft;
    if (steps[i] !== undefined) {
      out.maxStartErr = Math.max(out.maxStartErr, Math.abs(b.left - (x0 + inner * steps[i].startPct / 100)));
      out.maxEndErr = Math.max(out.maxEndErr, Math.abs(b.right - (x0 + inner * steps[i].endPct / 100)));
    }
    out.maxNowErr = Math.max(out.maxNowErr, Math.abs((m.left + m.right) / 2 - (x0 + inner * todayPct / 100)));
  }
  out.maxStartErr = r2(out.maxStartErr);
  out.maxEndErr = r2(out.maxEndErr);
  out.maxNowErr = r2(out.maxNowErr);
  return out;
})`;

describe('goal-stairs ④⑤ 几何与皮肤纪律（真机 headless Chrome ＋ CDP）', () => {
  it('容器 320／390／619／620／1280：零横向溢出／标签四向不出轨道／零截断／结构真的换了／四套皮肤标记逐字节相同', async (t) => {
    const css = goalStairsCss();
    const casesHtml = cases().map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + casesHtml + '</div>').join('\n'),
      css: skinCss() + '\n' + css,
      height: 1600,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：样式段里没有超过 320px 的固定宽度');
      assertStaticGeometry(css, casesHtml);
      return t.skip('本机无 Chrome／Chromium：几何判据需真浏览器');
    }
    try {
      const seen = [];
      for (const width of WIDTHS) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1,
          width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of SKIN_NAMES) {
          for (const c of cases()) {
            const where = width + ' 档 ' + skin + ' ' + c.name + '：';
            const scope = '.' + skinClass(skin) + ' [data-case="' + c.name + '"] ';
            const root = await page.read([scope + '.' + GOAL_STAIRS_CLASS]);
            assert.equal(root[0].count, 1, where + '找不到本件根');
            assert.ok(root[0].maxScrollW <= root[0].maxClientW + 1,
              where + '根横向溢出 ' + root[0].maxScrollW + ' > ' + root[0].maxClientW);
            assert.equal(root[0].scrollsX, 0, where + '不许出现 overflow-x 滚动容器');
            /* 关键语义**不被截断**：段名／窗口句／状态字／最晚动手日／卡头那句，一处都不许压字。 */
            const texts = await page.read([goalStairsSlot('name'), goalStairsSlot('window'), goalStairsSlot('state'),
              goalStairsSlot('due'), goalStairsSlot('tail'), goalStairsSlot('count')]
              .map((slot) => scope + '.' + slot));
            for (const one of texts) {
              assert.equal(one.clipped, 0, where + one.sel + ' 有 ' + one.clipped + ' 处被截断');
            }
            const geo = await page.ev(ROW_FN + '(' + JSON.stringify(scope + '.' + GOAL_STAIRS_CLASS)
              + ', ' + JSON.stringify(c.steps.map((s) => ({ startPct: s.startPct, endPct: s.endPct })))
              + ', ' + String(c.todayPct) + ')');
            assert.equal(geo.rows, c.steps.length, where + '段数不对');
            /* 严重 2：标签**四向**都不出轨道，且竖向装得下（日期换行时轨道跟着长）。 */
            assert.ok(geo.maxDueOver <= 0.6, where + '「最晚」那枚标签伸出轨道 ' + geo.maxDueOver + 'px');
            assert.ok(geo.dueH <= geo.trackH, where + '标签高 ' + geo.dueH + ' > 轨道高 ' + geo.trackH);
            assert.ok(geo.trackH >= GOAL_STAIRS_TRACK_PX, where + '轨道矮于常量 ' + GOAL_STAIRS_TRACK_PX);
            /* 一般 1：窗口带两端都不出轨道（贴轴的 0.01% 窗口也不行）。 */
            assert.ok(geo.maxBandOver <= 0.6, where + '窗口带越出轨道 ' + geo.maxBandOver + 'px');
            assert.ok(geo.maxRowOver <= 0.6, where + '轨道越出行 ' + geo.maxRowOver + 'px');
            /* 一般 2：今天那根竖线**每一行**都要在轨道里（不是只看第 1 行）。 */
            assert.equal(geo.markerOut, 0, where + '有 ' + geo.markerOut + ' 行今天那根竖线跑出轨道');
            /* 一般 3：位置真落在百分数上——带的两端与竖线中心各对一次账。 */
            assert.ok(geo.maxStartErr <= 1, where + '窗口带左端没落在 startPct 上（差 ' + geo.maxStartErr + 'px）');
            assert.ok(geo.maxEndErr <= 1, where + '窗口带右端没落在 endPct 上（差 ' + geo.maxEndErr + 'px）');
            assert.ok(geo.maxNowErr <= 1.1, where + '今天那根竖线没落在 todayPct 上（差 ' + geo.maxNowErr + 'px）');
            /* 结构：窄档行头在上、宽档行头在左（阈值两侧各断一次）。 */
            const wantWide = width >= GOAL_STAIRS_WIDE_PX;
            const above = geo.headAbove === c.steps.length;
            const left = geo.headLeft === c.steps.length;
            assert.equal(left, wantWide, where + '行头与轨道的并排与否不对（宽档阈值 ' + GOAL_STAIRS_WIDE_PX + 'px）');
            assert.equal(above, !wantWide, where + '行头与轨道的上下与否不对');
            seen.push({ width, skin, name: c.name, above, left, trackH: geo.trackH, dueH: geo.dueH,
              dueOver: geo.maxDueOver, bandOver: geo.maxBandOver, markerOut: geo.markerOut,
              startErr: geo.maxStartErr, nowErr: geo.maxNowErr, rootW: geo.rootW,
              rootScrollW: root[0].maxScrollW, rootClientW: root[0].maxClientW });
          }
        }
      }
      /* ⑤ 换皮不换结构：四套皮肤容器里的标记逐字节相同。 */
      for (const c of cases()) {
        for (const width of WIDTHS) {
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify(SKIN_NAMES) + ';'
            + 'for (var i = 0; i < skins.length; i += 1) {'
            + '  var el = document.querySelector("." + "ilife-skin-" + skins[i]'
            + ' + " [data-case=' + c.name + '] .' + GOAL_STAIRS_CLASS + '");'
            + '  out[skins[i]] = el === null ? "" : el.innerHTML;'
            + '} return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(marks[skin], base, width + ' 档 ' + c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
          }
        }
      }
      /* 状态那三档在四套皮肤里都取到了取值表里的字色（色只是第三样，前两样是字与形）。 */
      for (const skin of SKIN_NAMES) {
        const vals = SKIN_VALUES[skin];
        const colors = await page.ev('(function(){var out={};'
          + 'var pre = ' + JSON.stringify('.ilife-skin-' + skin + ' [data-case=base] .' + GOAL_STAIRS_CLASS + '-state.is-') + ';'
          + 'var states = ' + JSON.stringify([...GOAL_STAIRS_STATES]) + ';'
          + 'for (var i = 0; i < states.length; i += 1) { var el = document.querySelector(pre + states[i]);'
          + 'out[states[i]] = el === null ? null : getComputedStyle(el).color; }'
          + 'return out;}())');
        for (const state of GOAL_STAIRS_STATES) {
          assert.equal(colors[state], toRgb(state === 'done' ? vals.ok : (state === 'now' ? vals['accent-text'] : vals['ink-2'])),
            skin + '：' + state + ' 那一档的字色没取到取值表里的值（实读 ' + String(colors[state]) + '）');
        }
      }
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
      for (const w of WIDTHS) {
        const rows = seen.filter((s) => s.width === w);
        console.log('READING goal-stairs container=' + w
          + ' rootW=' + rows[0].rootW
          + ' maxRootScrollW=' + Math.max(...rows.map((s) => s.rootScrollW))
          + ' maxRootClientW=' + Math.max(...rows.map((s) => s.rootClientW))
          + ' trackH=' + Math.min(...rows.map((s) => s.trackH)) + '…' + Math.max(...rows.map((s) => s.trackH))
          + ' maxDueOver=' + Math.max(...rows.map((s) => s.dueOver))
          + ' maxBandOver=' + Math.max(...rows.map((s) => s.bandOver))
          + ' markerOut=' + rows.reduce((a, s) => a + s.markerOut, 0)
          + ' maxStartErr=' + Math.max(...rows.map((s) => s.startErr))
          + ' maxNowErr=' + Math.max(...rows.map((s) => s.nowErr))
          + ' headAbove=' + rows.filter((s) => s.above).length + '/' + rows.length
          + ' headLeft=' + rows.filter((s) => s.left).length + '/' + rows.length
          + ' cells=' + rows.length);
      }
      /* 严重 2 的读数：最窄档下确实有行**因为日期太长而把轨道撑高**（不是靠压字或溢出混过去）。 */
      const tight = seen.filter((s) => s.name === 'tight' && s.width === 320);
      assert.equal(tight.every((s) => s.trackH > GOAL_STAIRS_TRACK_PX), true,
        '320 档 tight 样例应当有轨道被两行日期撑高（否则这一档没在压）：' + JSON.stringify(tight.map((s) => s.trackH)));
      console.log('READING tight@320 轨道高（标签两行撑高）＝' + tight.map((s) => s.skin + ':' + s.trackH).join(' '));
    } finally { page.close(); }
  });
});
