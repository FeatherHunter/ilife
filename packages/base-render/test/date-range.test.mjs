/** dateRange（组件 · 日期范围 · 形态 B「日历缩略」）· **判据件**。
 *
 *  断言对象是本件**自己的唯一出口**：`dist/components/date-range/index.js`
 *  （组件层不进冻结面、不从根出口；层出口 `base-paint/blocks` 那一行由接线席统一加）。
 *
 *  四类（契约 §五）＋ 本件特有的三条硬判据：
 *   ① **渲染契约**：起止两格／快捷档（命中的带 ✓ ＋ `aria-pressed` ＋ 实心）／42 格日历
 *      （两端 `is-end`、区间内 `is-in`、相邻月 `is-adj`、今天 `is-today`、**恰一枚** `tabindex="0"`）／
 *      口径句**点名当前那一档**／转义面／**全部**非法入参走 `BlocksError`；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤／scope 在 `.ilife-page-ui` 之下／零 `:root`／
 *      零 `!important`／零自定义属性／宽度只由 `@container` 判／**触控 44 与间距 8 是样式段常量**；
 *   ③ **加法式**：不挂本件时同页产物逐字节不变；
 *   ④ **真机两档**（headless Chrome ＋ CDP）：容器宽 **390 与 1280** 下零横向溢出、每格天与每枚控件
 *      ≥44×44、独立控件间距 ≥8px、口径句不被截，且「点档／点天／翻月／改起止」逐条真跑；
 *   ⑤ **皮肤矩阵**：三套皮肤下**标记逐字节相同**（换的只有样式段）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DATE_RANGE_CELLS,
  DATE_RANGE_CLASS,
  DATE_RANGE_COLUMNS,
  DATE_RANGE_EVENT_CHANGE,
  DATE_RANGE_FORMS,
  DATE_RANGE_GAP_PX,
  DATE_RANGE_HIT_ATTR,
  DATE_RANGE_NAME_ATTR,
  DATE_RANGE_PRESET_ATTR,
  DATE_RANGE_TOUCH_PX,
  buildDateRangeJs,
  dateRangeCalendarCss,
  dateRangeCss,
  isIsoDate,
  monthCells,
  rangeDays,
  renderDateRange,
  sentenceOf,
  shiftMonth,
} from '../dist/components/date-range/index.js';
import { SKINS, SKIN_NAMES, skinClass, skinCss, skinVar } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import * as root from '../dist/index.js';
import { sleep, startControlsPage } from './input-controls-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLS = DATE_RANGE_CLASS;

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const throwsBlocks = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.name === 'BlocksError';
  }
  return false;
};

const selectorsOf = (css) => {
  const out = [];
  for (const m of stripComments(css).matchAll(/([^{}]*)\{/g)) {
    const sel = m[1].split('}').pop().trim();
    if (sel === '' || sel.startsWith('@')) continue;
    out.push(sel);
  }
  return out;
};

const skinVarSpans = (css) => {
  const spans = [];
  for (const m of css.matchAll(/var\(\s*--ilife-([a-z0-9-]+)/g)) {
    const expected = skinVar(m[1]);
    assert.ok(css.startsWith(expected, m.index),
      '`' + m[1] + '` 处的 var() 串与 skinVar() 走散：' + css.slice(m.index, m.index + 80));
    spans.push([m.index, m.index + expected.length]);
  }
  return spans;
};

const cutSpans = (text, spans) => {
  let out = '';
  let at = 0;
  for (const [from, to] of spans) {
    out += text.slice(at, from);
    at = to;
  }
  return out + text.slice(at);
};

const countOf = (html, needle) => (html.match(new RegExp(needle, 'g')) || []).length;

/* ── 夹具入参 ───────────────────────────────────────────────────────── */

/** 作息管家「看哪一段」：原型 B 那一格的真实形状（09-19 到 09-25，四档快捷档）。 */
const WEEK = {
  name: 'window',
  from: '2026-09-19',
  to: '2026-09-25',
  label: '看哪一段',
  today: '2026-09-25',
  presets: [
    { key: 'week', label: '本周', from: '2026-09-19', to: '2026-09-25' },
    { key: 'month', label: '本月', from: '2026-09-01', to: '2026-09-30' },
    { key: 'last30', label: '近 30 天', from: '2026-08-27', to: '2026-09-25' },
    { key: 'prev', label: '上月', from: '2026-08-01', to: '2026-08-31' },
  ],
  caliber: '按发生时间归日，跨零点的睡眠记在入睡那天。',
};

/** 敌意形状：超长档名 ＋ 超长口径 ＋ 跨年区间（零横向溢出与「口径句不被截」都靠它压出来）。 */
const HOSTILE = {
  name: 'ledgerWindow',
  from: '2024-01-01',
  to: '2026-12-31',
  label: '记账的这一段（含分期摊销与跨年结转的口径）',
  today: '2026-09-25',
  presets: [
    { key: 'all', label: '自开户以来的全部记录（含已归档账户）', from: '2024-01-01', to: '2026-12-31' },
    { key: 'y2026', label: '2026 整年', from: '2026-01-01', to: '2026-12-31' },
  ],
  caliber: '预算按月滚动，未花完的不结转；分期按每期应还额落到当月，退款冲抵原分类而不单列一类。',
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('dateRange ① 渲染契约', () => {
  it('根属性：机器键／两端／天数／命中的档／锚月／今天', () => {
    const html = renderDateRange(WEEK);
    assert.match(html, /^<div class="ilife-block-date-range is-calendar/, '根类名与形态键：' + html.slice(0, 70));
    assert.ok(html.includes(DATE_RANGE_NAME_ATTR + '="window"'), '机器键落属性');
    assert.ok(html.includes('data-ilife-range-from="2026-09-19"') && html.includes('data-ilife-range-to="2026-09-25"'));
    assert.ok(html.includes('data-ilife-range-days="7"'), '天数含首尾（09-19…09-25＝7 天）');
    assert.ok(html.includes(DATE_RANGE_PRESET_ATTR + '="week"'), '命中的档是 week');
    assert.ok(html.includes('data-ilife-range-month="2026-09"'), '锚月取起点所在月');
    assert.ok(html.includes('data-ilife-range-today="2026-09-25"'), '今天由调用方给');
  });

  it('「按的是哪一档」三处同时给：✓（形）＋ 状态字（字）＋ 口径句（句）', () => {
    const html = renderDateRange(WEEK);
    assert.match(html, /-state"[^>]*>当前按 本周</, '状态字点名当前那一档');
    assert.match(html, /-sentence"[^>]*>本周：09-19 到 09-25，共 7 天（含首尾）</, '口径句点名当前那一档、两端与天数');
    assert.equal(countOf(html, 'aria-pressed="true"'), 3, '命中的快捷档 ＋ 两枚端点日格＝三处 aria-pressed');
    assert.match(html, /-preset"[^>]*data-ilife-range-key="week"[^>]*aria-pressed="true"[^>]*>.*-mark" aria-hidden="true">✓<\/span><span class="ilife-block-date-range-word">本周<\/span>/,
      '命中的那一枚带 ✓ 与档名');
    assert.equal(countOf(html, '-mark" aria-hidden="true"'), 4, '✓ 在每一枚快捷档里都有（只有按下的那枚由样式显出来）');
  });

  it('起止两格：两个原生日期格，值／读屏名／锚属性齐', () => {
    const html = renderDateRange(WEEK);
    assert.equal(countOf(html, 'type="date"'), 2, '起止两格都是原生日期格');
    assert.match(html, /data-ilife-range-end="from"[^>]*value="2026-09-19"|value="2026-09-19"[^>]*data-ilife-range-end="from"/,
      '起点格带值');
    assert.match(html, /data-ilife-range-end="to"[^>]*value="2026-09-25"|value="2026-09-25"[^>]*data-ilife-range-end="to"/, '终点格带值');
    assert.ok(html.includes('aria-label="看哪一段：起点"') && html.includes('aria-label="看哪一段：终点"'), '读屏名带字段名与端点');
    assert.ok(html.includes('>从<'), '起点那格的名字是「从」');
    assert.ok(html.includes('>到<'), '终点那格的名字是「到」');
  });

  it('日历缩略：42 格（6 行 × 7 列）、周一打头、两端 is-end、区间内 is-in、相邻月 is-adj、今天 is-today', () => {
    const html = renderDateRange(WEEK);
    const cells = monthCells('2026-09');
    assert.equal(cells.length, DATE_RANGE_CELLS, '恒 42 格');
    assert.equal(cells.length, DATE_RANGE_COLUMNS * 6, '6 行 × 7 列');
    assert.equal(cells[0], '2026-08-31', '周一打头（9 月 1 日是周二，首格回补到 8-31）');
    assert.equal(countOf(html, 'data-ilife-range-day='), 42, '42 格全在标记里');
    assert.equal(countOf(html, 'is-end'), 2, '两端各一格实心');
    assert.equal(countOf(html, 'is-in'), 5, '区间内 5 格浅底（7 天 − 两端）');
    assert.ok(countOf(html, 'is-adj') >= 7, '相邻月的格子照样在（弱字）');
    assert.equal(countOf(html, 'is-today'), 1, '今天一圈发丝线');
    assert.ok(html.includes('>2026 年 9 月<'), '月份上屏');
    for (const w of ['一', '二', '三', '四', '五', '六', '日']) {
      assert.ok(html.includes('<span>' + w + '</span>'), '星期表头：' + w);
    }
  });

  it('键盘：整块日历**恰有一枚** `tabindex="0"`（焦点锚＝起点格），其余全是 -1', () => {
    const html = renderDateRange(WEEK);
    assert.equal(countOf(html, 'tabindex="0"'), 1, '恰一枚可 Tab 到的格（否则 42 格会把键盘用户困住）');
    assert.match(html, /data-ilife-range-day="2026-09-19"[^>]*tabindex="0"/, '焦点锚落在起点那一格');
    assert.equal(countOf(html, 'tabindex="-1"'), 41, '其余 41 格走 roving（方向键由运行时段接管）');
  });

  it('未选：两端都没有时写状态字「还未选」与一句「怎么开始」，且**不出日历那一块**（设计过的空态）', () => {
    const html = renderDateRange({ name: 'w', presets: WEEK.presets });
    assert.match(html, /-state"[^>]*>当前按 还未选</);
    assert.match(html, /-sentence"[^>]*>还未选：按一档、填起止两格，或在日历里点两天</);
    assert.ok(html.includes('data-ilife-range-days="0"'));
    assert.equal(html.includes('"' + CLS + '-calendar"'), false, '没有锚月时不出日历（空态，不假装有一屏）');
    assert.equal(html.includes('data-ilife-range-from='), false, '未选时两端属性都不出');
  });

  it('自定义区间：两端不在任何一档上时，状态字写「自定义区间」且没有档是按下态', () => {
    const html = renderDateRange({ ...WEEK, from: '2026-09-10', to: '2026-09-12' });
    assert.match(html, /-state"[^>]*>当前按 自定义区间</);
    assert.match(html, /-sentence"[^>]*>自定义区间：09-10 到 09-12，共 3 天（含首尾）</);
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 2, '只有两枚端点日格是按下态');
  });

  it('日期算术是纯函数：天数含首尾、月格周一打头、翻月跨年进位、非法日期一律 false', () => {
    assert.equal(rangeDays('2026-09-19', '2026-09-25'), 7);
    assert.equal(rangeDays('2026-09-19', '2026-09-19'), 1, '同一天是一天');
    assert.equal(sentenceOf('本周', '2026-09-19', '2026-09-25', 7), '本周：09-19 到 09-25，共 7 天（含首尾）');
    assert.equal(sentenceOf('还未选', undefined, undefined, 0), '还未选：按一档、填起止两格，或在日历里点两天');
    assert.deepEqual([...monthCells('2026-02').slice(0, 3)], ['2026-01-26', '2026-01-27', '2026-01-28']);
    assert.equal(monthCells('2026-02').length, 42);
    assert.equal(shiftMonth('2026-01', -1), '2025-12');
    assert.equal(shiftMonth('2026-12', 1), '2027-01');
    assert.equal(isIsoDate('2026-09-25'), true);
    assert.equal(isIsoDate('2026-02-31'), false, 'Date 会把 02-31 滚成 3-03，回读比对拦得住');
    assert.equal(isIsoDate('20260925'), false);
    assert.equal(isIsoDate(''), false);
    assert.equal(isIsoDate(20260925), false);
  });

  it('转义：五个字符进实体，不进标记（名字／两端／档名／口径／错误逐位转义）', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderDateRange({
      name: evil, from: '2026-09-19', to: '2026-09-25', label: evil, caliber: evil, error: evil,
      presets: [{ key: 'k', label: evil, from: '2026-09-19', to: '2026-09-25' }],
    });
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false);
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
  });

  it('形态键是闭集（闭集外一律 BlocksError），入参本体逐条拒', () => {
    assert.deepEqual([...DATE_RANGE_FORMS], ['calendar']);
    assert.ok(renderDateRange({ ...WEEK, form: 'calendar' }).includes('is-calendar'));
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, form: 'strip' })), true);
    for (const bad of [undefined, null, [], 'x']) {
      assert.equal(throwsBlocks(() => renderDateRange(bad)), true, '拒：' + String(bad));
    }
  });

  it('非法入参**逐条**走 BlocksError（不静默降级）', () => {
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, name: undefined })), true);
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, name: '' })), true);
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, from: '2026-9-19' })), true, '不是 ISO');
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, from: '2026-02-31' })), true, '不存在的日期');
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, to: 'x' })), true);
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, from: '2026-09-26', to: '2026-09-25' })), true, '两端倒置');
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, month: '2026-13' })), true, '月份非法');
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, today: '2026-02-30' })), true);
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, presets: 1 })), true);
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, presets: ['x'] })), true, '档不是对象');
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, presets: [{ key: 'k', label: 'l', from: '2026-09-25', to: '2026-09-19' }] })), true, '档的两端倒置');
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, presets: [{ key: 'k', label: '', from: '2026-09-19', to: '2026-09-25' }] })), true, '档名空');
    assert.equal(throwsBlocks(() => renderDateRange({
      ...WEEK,
      presets: [{ key: 'k', label: 'a', from: '2026-09-19', to: '2026-09-25' },
        { key: 'k', label: 'b', from: '2026-09-01', to: '2026-09-30' }],
    })), true, '档键重复');
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, disabled: true })), true, '禁用必须给原因');
    assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, loading: 1 })), true);
    for (const bad of ['a"b', 'x{y}', '.x', 'a b!']) {
      assert.equal(throwsBlocks(() => renderDateRange({ ...WEEK, extraClass: bad })), true, '拒：' + bad);
    }
    assert.match(renderDateRange({ ...WEEK, extraClass: 'ok-1 other' }), /is-calendar ok-1 other"/);
  });

  it('禁用／更新中：禁用说明原因并被控件引用到；更新中不接输入', () => {
    const dis = renderDateRange({ ...WEEK, disabled: true, disabledReason: '还没选技能，先选技能才能定窗口' });
    assert.ok(dis.includes('data-ilife-range-disabled="1"'));
    assert.ok(dis.includes('还没选技能'));
    assert.ok(dis.includes('aria-describedby="ilife-block-date-range-window-error"'));
    const load = renderDateRange({ ...WEEK, loading: true });
    assert.match(load, /-state"[^>]*>更新中</);
    assert.ok(load.includes('aria-disabled="true"'));
    assert.equal(load.includes(' disabled'), false, '更新中不落原生 disabled（由运行时段拦）');
  });

  it('纯函数：同入参两次逐字节相同', () => {
    assert.equal(renderDateRange(WEEK), renderDateRange(WEEK));
    assert.notEqual(renderDateRange(WEEK), renderDateRange(HOSTILE));
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

describe('dateRange ② 样式纪律', () => {
  const css = stripComments(dateRangeCss());

  it('样式段非空，且**全部**规则 scope 在 `.ilife-page-ui` 与本件根类之下', () => {
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 30, '本件规则数不对：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器没 scope 在 .ilife-page-ui：' + sel);
      assert.ok(sel.includes('.' + CLS), '选择器必须挂在件根类之下：' + sel);
    }
  });

  it('零 `:root`／零 `!important`／零自定义属性／不用禁入 token', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.equal(css.includes('--r-xl'), false);
    assert.equal(css.includes('--pink'), false);
    const decls = css.match(/--[a-z0-9-]+\s*:/g) || [];
    assert.equal(decls.length, 0, '不得定义任何自定义属性：' + decls.join(' '));
  });

  it('**只经 `skinVar()` 读皮肤**：每一处 var() 都与 skinVar() 逐字相同', () => {
    const spans = skinVarSpans(css);
    assert.ok(spans.length >= 12, '读皮肤的处数不对：' + spans.length);
    const rest = cutSpans(css, spans);
    assert.equal(rest.includes('var(--'), false, '手写了 var(--…)：'
      + rest.slice(Math.max(0, rest.indexOf('var(--') - 40), rest.indexOf('var(--') + 60));
  });

  it('**触控目标与间距是样式段里的常量**（真机起不来时的等价判据）', () => {
    assert.equal(DATE_RANGE_TOUCH_PX, 44);
    assert.equal(DATE_RANGE_GAP_PX, 8);
    assert.equal(DATE_RANGE_CELLS, 42);
    assert.ok(css.includes('height: ' + String(DATE_RANGE_TOUCH_PX) + 'px;'), '起止格与翻月键高取常量');
    assert.ok(css.includes('min-height: ' + String(DATE_RANGE_TOUCH_PX) + 'px;'), '日格与快捷档也是 44 高');
    assert.ok(css.includes('min-width: ' + String(DATE_RANGE_TOUCH_PX) + 'px;'), '翻月键宽取常量');
    assert.ok(css.includes('gap: ' + String(DATE_RANGE_GAP_PX) + 'px;'), '独立控件之间留 8px');
    assert.match(css, /-days \{[^}]*grid-template-columns: repeat\(7, minmax\(0, 1fr\)\)/, '日格恒 7 列');
  });

  it('**宽度只许容器判**：本件自己是容器，`@media` 只判设备能力（没有一处判宽度）', () => {
    assert.match(css, /container-type: inline-size;/, '本件必须自己是容器');
    const at = [...dateRangeCss().matchAll(/@container \(([^)]*)\)/g)].map((m) => m[1]);
    assert.equal(at.length, 1, '容器查询数不对：' + at.join('｜'));
    assert.match(at[0], /^max-width: \d+px$/, '容器查询只许判宽度：' + at[0]);
    const medias = [...dateRangeCss().matchAll(/@media ([^{]*)\{/g)].map((m) => m[1].trim());
    assert.ok(medias.length >= 2, '两条设备能力查询应在：' + medias.join('｜'));
    for (const m of medias) {
      assert.equal(/max-width|min-width/.test(m), false, '媒体查询只许判设备能力：' + m);
      assert.ok(/hover|pointer|prefers-reduced-motion/.test(m), '媒体查询判的不是设备能力：' + m);
    }
  });

  it('**不许 `…` 截断**：样式段里没有截断手段', () => {
    for (const bad of ['text-overflow', 'line-clamp', 'overflow: hidden', 'overflow-x: hidden']) {
      assert.equal(css.includes(bad), false, '出现了截断手段：' + bad);
    }
    assert.equal((css.match(/overflow-wrap: anywhere/g) || []).length >= 6, true, '长串折行覆盖不足');
    assert.equal(css.includes('min-width: 0;'), true, 'flex/grid 子件必须 min-width: 0（防压字）');
  });

  it('焦点地板 ＋ 状态矩阵：focus-visible／hover 只包设备能力／active 只动 transform／禁用与更新中光标', () => {
    assert.match(css, /:focus-visible \{/);
    assert.match(css, /outline: 2px solid /);
    assert.equal(/outline:\s*(none|0)/.test(css), false);
    assert.ok(css.includes('@media (hover:hover) and (pointer:fine) {'));
    assert.ok(css.includes(':hover:not([disabled])'), 'hover 不许是唯一通路');
    assert.match(css, /transform: scale\(\.98\)/);
    assert.match(css, /transition: transform 80ms/);
    assert.match(css, /cursor: not-allowed;/);
    assert.match(css, /cursor: progress;/);
    assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
    /* 零阴影立层次：日历块软底 / 区间内纸面 / 两端实心 / 今天一圈发丝线。 */
    assert.match(css, /-calendar \{[^}]*background: var\(--ilife-surface-2/, '日历块走软底');
    assert.match(css, /-day\.is-in \{[^}]*background: var\(--ilife-surface/, '区间内走纸面块');
    assert.match(css, /-day\.is-end \{[^}]*background: var\(--ilife-accent/, '两端走实心强调块');
    assert.match(css, /-day\.is-today \{[^}]*border-color: var\(--ilife-ink-2/, '今天靠发丝线');
  });

  it('文字色过对比地板（算出来不靠眼看）：三套皮肤下都 ≥4.5:1', () => {
    const luminance = (hex) => {
      const h = hex.replace('#', '');
      const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
      const ch = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
      const lin = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    };
    const contrast = (a, b) => {
      const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };
    for (const name of SKIN_NAMES) {
      for (const t of ['ink', 'ink-2', 'ink-3', 'danger']) {
        for (const g of ['ground', 'surface', 'surface-2']) {
          const ratio = contrast(SKINS[name].values[t], SKINS[name].values[g]);
          assert.ok(ratio >= 4.5, name + '：' + t + ' 在 ' + g + ' 上只有 ' + ratio.toFixed(2) + ':1');
        }
      }
    }
    const used = new Set([...css.matchAll(/(?:^|[;\s])color: ([^;]+);/g)].map((m) => m[1].trim()));
    for (const value of used) {
      assert.ok(value === skinVar('accent-ink') || ['ink', 'ink-2', 'ink-3', 'danger'].some((t) => value === skinVar(t)),
        '文字色只许取 ink／ink-2／ink-3／danger／accent-ink：' + value);
    }
  });

  it('层红线：`dist/components/date-range/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'date-range');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 6, '编译产物不全：' + files.length);
    const strip = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const f of files) {
      const code = strip(readFileSync(f, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f.replace(PKG, '') + ' 的代码里出现 ' + needle);
      }
    }
  });

  it('缺省前缀 `ilife-`；换前缀时 scope 与槽类**一起**换', () => {
    assert.match(dateRangeCss(), /^\.ilife-page-ui \.ilife-block-date-range \{/m);
    const x = stripComments(dateRangeCss({ prefix: 'x-' }));
    assert.ok(x.includes('.x-page-ui .x-block-date-range {'));
    assert.ok(x.includes('.x-block-date-range-day'));
    assert.equal(x.includes('.ilife-'), false, '换前缀后不许残留旧前缀');
  });

  it('样式段**分两份住**（`style.ts` ＋ `style-calendar.ts`）：汇总把日历那一半**原样**插进来', () => {
    /* 拆件只许搬代码、不许改样式取值：这一条钉住"汇总＝把那一半原样插进来"这件事
       （拆件前后 `dateRangeCss()` 的产物逐字节相同，另在拆件记录里对过字节数 10320）。 */
    const cal = dateRangeCalendarCss();
    assert.ok(cal.trim() !== '', '日历那一半必须非空');
    assert.ok(dateRangeCss().includes(cal), '汇总里必须**原样**含日历那一半');
    assert.equal(dateRangeCss().indexOf(cal), dateRangeCss().lastIndexOf(cal),
      '日历那一半只许出现一次（不许两头各抄一段）');
    assert.equal(cal.includes(':root') || cal.includes('!important'), false, '那一半同样受样式纪律约束');
    assert.ok(cal.includes('.ilife-page-ui .ilife-block-date-range-day'), '日格规则住在那一半里');
    assert.equal(dateRangeCss({ prefix: 'x-' }).includes(dateRangeCalendarCss({ prefix: 'x-' })), true,
      '换前缀时两半一起换');
    assert.equal(dateRangeCss({ prefix: 'x-' }).includes(dateRangeCalendarCss()), false,
      '换前缀后不许残留默认前缀的那一半');
  });
});

/* ── ③ 加法式（不挂这件＝零变化）＋ ⑤ 皮肤矩阵 ─────────────────────── */

describe('dateRange ③ 加法式（opt-in：不挂这件＝零变化）', () => {
  it('不挂本件的页：产物里一个本件字节都没有，两次渲染逐字节相同', () => {
    const shell = () => renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const off = shell();
    assert.equal(off.includes(CLS), false);
    assert.equal(off.includes(DATE_RANGE_EVENT_CHANGE), false, '运行时也不得随页挂上');
    assert.equal(off, shell());
  });

  it('挂了本件的页＝原页 ＋ 本件那一段（页壳其余部分逐字节不变）', () => {
    const off = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const on = renderDocShell({
      docTitle: 'T', bodyHtml: '<p>x</p>' + renderDateRange(WEEK), extraCss: dateRangeCss() + buildDateRangeJs(),
    });
    assert.ok(on.includes(CLS));
    assert.ok(on.includes('.ilife-page-ui .ilife-block-date-range'));
    assert.ok(on.indexOf(off.slice(0, 200)) === 0, '页壳头部逐字节不变');
  });

  it('出口唯一：本件不从根出口出', () => {
    assert.equal(typeof renderDateRange, 'function');
    assert.equal(root.renderDateRange, undefined, '组件层不得从根出口出');
  });
});

describe('dateRange ⑤ 皮肤矩阵（三套皮肤下标记逐字节相同）', () => {
  const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
    + '<div class="ilife-page-ui ' + skinClass(name) + '">' + renderDateRange(WEEK) + '</div>';
  const withoutSkin = (name) => pageOf(name).replace(skinCss({ skins: [name] }), '').replace(skinClass(name), '');

  it('三套皮肤：差异只落在皮肤样式段与皮肤类上，标记面逐字节相同', () => {
    const bare = withoutSkin(SKIN_NAMES[0]);
    assert.ok(bare.includes(renderDateRange(WEEK)));
    for (const name of SKIN_NAMES) {
      assert.equal(withoutSkin(name), bare, name + ' 的标记面与 ' + SKIN_NAMES[0] + ' 不同');
    }
    assert.notEqual(pageOf(SKIN_NAMES[0]), pageOf(SKIN_NAMES[1]), '两套皮肤的页产物必须真的不同');
    assert.equal(renderDateRange(WEEK).includes('skin-'), false, '标记里不许自带皮肤类');
  });
});

/* ── ④ 真机两档（headless Chrome ＋ CDP）───────────────────────────── */

const WIDTHS = [390, 1280];

function fixture() {
  return renderDateRange(WEEK)
    + renderDateRange(HOSTILE)
    + renderDateRange({ ...WEEK, name: 'locked', disabled: true, disabledReason: '还没选技能，先选技能才能定窗口' })
    + renderDateRange({ ...WEEK, name: 'busy', loading: true })
    + renderDateRange({ name: 'unset', presets: WEEK.presets });
}

const sel = (name) => JSON.stringify('[' + DATE_RANGE_NAME_ATTR + '="' + name + '"]');
const inside = (name, selector) => JSON.stringify('[' + DATE_RANGE_NAME_ATTR + '="' + name + '"] ' + selector);

const MEASURE = '(function(){'
  + 'var stage=document.querySelector(".stage");'
  + 'function box(el){var r=el.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,w:r.width,h:r.height};}'
  + 'var roots=[].slice.call(document.querySelectorAll(' + JSON.stringify('.' + CLS) + '));'
  + 'var out={stageSw:stage.scrollWidth,stageCw:stage.clientWidth,stage:box(stage),'
  + 'docSw:document.documentElement.scrollWidth,docCw:document.documentElement.clientWidth,'
  + 'ellipsis:document.body.innerText.indexOf("\\u2026")>=0,roots:[]};'
  + 'for(var i=0;i<roots.length;i++){var root=roots[i];'
  + 'var cells=[].slice.call(root.querySelectorAll(' + JSON.stringify('[' + DATE_RANGE_HIT_ATTR + '="day"]') + ')).map(box);'
  + 'var others=[].slice.call(root.querySelectorAll(' + JSON.stringify('[' + DATE_RANGE_HIT_ATTR + ']'
    + ':not([' + DATE_RANGE_HIT_ATTR + '="day"])') + ')).map(function(h){return {kind:h.getAttribute('
  + JSON.stringify(DATE_RANGE_HIT_ATTR) + '),box:box(h),disabled:h.hasAttribute("disabled")||h.getAttribute("aria-disabled")==="true"};});'
  + 'var sentence=root.querySelector(' + JSON.stringify('[data-ilife-range-sentence]') + ');'
  + 'var month=root.querySelector(' + JSON.stringify('[data-ilife-range-month-label]') + ');'
  + 'out.roots.push({name:root.getAttribute(' + JSON.stringify(DATE_RANGE_NAME_ATTR) + '),'
  + 'sw:root.scrollWidth,cw:root.clientWidth,box:box(root),'
  + 'from:root.getAttribute("data-ilife-range-from"),to:root.getAttribute("data-ilife-range-to"),'
  + 'days:root.getAttribute("data-ilife-range-days"),preset:root.getAttribute(' + JSON.stringify(DATE_RANGE_PRESET_ATTR) + '),'
  + 'stateText:(root.querySelector(' + JSON.stringify('[data-ilife-range-state]') + ')||{}).textContent||"",'
  + 'sentence:sentence?sentence.textContent:"",sentenceBox:sentence?box(sentence):null,'
  + 'sentenceSw:sentence?sentence.scrollWidth:0,sentenceCw:sentence?sentence.clientWidth:0,'
  + 'month:month?month.textContent:"",cells:cells,others:others,'
  + 'tab0:root.querySelectorAll(' + JSON.stringify('[tabindex="0"]') + ').length});}'
  + 'return out;}())';

describe('dateRange ④ 真机两档（390／1280 容器；视口恒 1440）', () => {
  it('零横向溢出 ＋ 每格天与每枚控件 ≥44×44 ＋ 独立控件间距 ≥8px ＋ 口径句不被截', async (t) => {
    const p = await startControlsPage({
      css: skinCss() + '\n' + dateRangeCss(), runtime: buildDateRangeJs(),
      body: fixture(), events: [DATE_RANGE_EVENT_CHANGE],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium：真机两条退化为 ② 的确定性几何判据');
    try {
      const readings = [];
      for (const width of WIDTHS) {
        const m = await p.at(width, MEASURE);
        const why = width + 'px 容器：';
        assert.ok(m.docSw <= m.docCw, why + '页面横向溢出 doc ' + m.docSw + ' > ' + m.docCw);
        assert.ok(m.stageSw <= m.stageCw, why + '容器横向溢出 ' + m.stageSw + ' > ' + m.stageCw);
        assert.equal(m.ellipsis, false, why + '页面上出现了省略号');
        assert.equal(m.roots.length, 5, why + '夹具应有五件');
        for (const r of m.roots) {
          assert.ok(r.sw <= r.cw, why + r.name + ' 横向溢出 ' + r.sw + ' > ' + r.cw);
          assert.ok(Math.abs(r.box.w - width) <= 1, why + r.name + ' 的边框盒宽不是 ' + width + '：' + r.box.w);
          assert.ok(r.box.r <= m.stage.r + 1, why + r.name + ' 右缘越过容器');
          assert.ok(r.sentenceSw <= r.sentenceCw + 1, why + r.name + ' 的口径句被截（' + r.sentenceSw + ' > ' + r.sentenceCw + '）');
          if (r.cells.length > 0) {
            assert.equal(r.cells.length, 42, why + r.name + ' 的日格不是 42 格');
            for (const c of r.cells) {
              assert.ok(Math.round(c.w) >= 44 && Math.round(c.h) >= 44,
                why + r.name + ' 有一格天只有 ' + c.w + '×' + c.h + '（小于 44×44）');
            }
            assert.equal(r.tab0, 1, why + r.name + ' 的日历里可 Tab 到的格不是恰一枚');
          }
          for (const h of r.others) {
            assert.ok(Math.round(h.box.w) >= 44 && Math.round(h.box.h) >= 44,
              why + r.name + ' 的 ' + h.kind + ' 只有 ' + h.box.w + '×' + h.box.h + '（小于 44×44）');
          }
          /* 独立相邻控件（翻月键之间、快捷档之间、起止两格之间）间距 ≥8px。
             （日历格之间只留 4px：7 列 × 44px 是硬约束，格间的缝是矩阵缝——见 README。） */
          const navs = r.others.filter((h) => h.kind === 'nav');
          const presets = r.others.filter((h) => h.kind === 'preset');
          const inputs = r.others.filter((h) => h.kind === 'from' || h.kind === 'to');
          if (navs.length === 2) {
            assert.ok(navs[1].box.l - navs[0].box.r >= 8 - 0.5,
              why + r.name + '：两枚翻月键挨太近（' + (navs[1].box.l - navs[0].box.r) + 'px）');
          }
          for (let i = 1; i < presets.length; i += 1) {
            const sameRow = Math.abs(presets[i].box.t - presets[i - 1].box.t) < 1;
            if (!sameRow) continue;
            assert.ok(presets[i].box.l - presets[i - 1].box.r >= 8 - 0.5,
              why + r.name + '：同一行上两枚快捷档间距 ' + (presets[i].box.l - presets[i - 1].box.r) + 'px');
          }
          if (inputs.length === 2 && Math.abs(inputs[1].box.t - inputs[0].box.t) < 1) {
            assert.ok(inputs[1].box.l - inputs[0].box.r >= 8 - 0.5,
              why + r.name + '：起止两格挨太近（' + (inputs[1].box.l - inputs[0].box.r) + 'px）');
          }
        }
        const base = m.roots[0];
        readings.push(width + 'px: scrollWidth ' + m.stageSw + ' ≤ clientWidth ' + m.stageCw
          + '｜日格 ' + Math.round(base.cells[0].w) + '×' + Math.round(base.cells[0].h)
          + '（42 格，可 Tab 一枚）｜起止格 ' + Math.round(base.others.filter((h) => h.kind === 'from')[0].box.w) + 'px 宽'
          + '｜口径句「' + base.sentence + '」（宽 ' + Math.round(base.sentenceBox.w) + 'px）');
      }
      console.log('  [真机读数] ' + readings.join('\n  [真机读数] '));
    } finally { p.close(); }
  });

  it('点档／点天／翻月／改起止逐条真跑（含错误拦截与键盘 roving）', async (t) => {
    const p = await startControlsPage({
      css: skinCss() + '\n' + dateRangeCss(), runtime: buildDateRangeJs(),
      body: fixture(), events: [DATE_RANGE_EVENT_CHANGE],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      await p.at(WIDTHS[0], 'true');
      const presetBtn = (name, key) => 'document.querySelector(' + inside(name, '[data-ilife-range-key="' + key + '"]') + ')';
      const dayBtn = (name, iso) => 'document.querySelector(' + inside(name, '[data-ilife-range-day="' + iso + '"]') + ')';
      const attr = (name, a) => 'document.querySelector(' + sel(name) + ').getAttribute("' + a + '")';
      const textOf = (name, sel2) => '(' + 'document.querySelector(' + inside(name, sel2) + ')||{textContent:""}).textContent';

      /* 点一档：两端／天数／命中档／状态字／口径句／月份／选中态六样一起动，并派发一条 */
      assert.equal(await p.ev(attr('window', 'data-ilife-range-from')), '2026-09-19');
      assert.equal(await p.ev(attr('window', 'data-ilife-range-preset')), 'week');
      await p.ev(presetBtn('window', 'month') + '.click()');
      await sleep(80);
      assert.equal(await p.ev(attr('window', 'data-ilife-range-from')), '2026-09-01', '起点跟着换');
      assert.equal(await p.ev(attr('window', 'data-ilife-range-to')), '2026-09-30', '终点跟着换');
      assert.equal(await p.ev(attr('window', 'data-ilife-range-days')), '30', '天数跟着重算（含首尾）');
      assert.equal(await p.ev(attr('window', 'data-ilife-range-preset')), 'month', '命中的档换成 month');
      assert.equal(await p.ev(textOf('window', '[data-ilife-range-state]')), '当前按 本月', '状态字点名新档');
      assert.equal(await p.ev(textOf('window', '[data-ilife-range-sentence]')), '本月：09-01 到 09-30，共 30 天（含首尾）',
        '口径句重写');
      assert.equal(await p.ev(presetBtn('window', 'month') + '.getAttribute("aria-pressed")'), 'true');
      assert.equal(await p.ev(presetBtn('window', 'week') + '.getAttribute("aria-pressed")'), 'false');
      assert.equal(await p.ev('document.querySelectorAll(' + inside('window', '[data-ilife-range-day].is-end') + ').length'), 2,
        '日历两端跟着重标');
      const hits = await p.events(DATE_RANGE_EVENT_CHANGE);
      assert.equal(hits.length, 1, '换段派发一条');
      assert.equal(hits[0].days, 30);
      assert.equal(hits[0].preset, 'month');
      assert.equal(hits[0].prevFrom, '2026-09-19', '事件带改前两端');

      /* 翻月：只换看的月份，不派发 */
      const before = (await p.events(DATE_RANGE_EVENT_CHANGE)).length;
      const monthBefore = await p.ev(textOf('window', '[data-ilife-range-month-label]'));
      await p.ev('document.querySelector(' + inside('window', '[data-ilife-range-act="next"]') + ').click()');
      await sleep(80);
      const monthAfter = await p.ev(textOf('window', '[data-ilife-range-month-label]'));
      assert.notEqual(monthAfter, monthBefore, '翻月换了显示的月份：' + monthBefore + ' → ' + monthAfter);
      assert.equal(await p.ev(attr('window', 'data-ilife-range-from')), '2026-09-01', '翻月不动数据');
      assert.equal((await p.events(DATE_RANGE_EVENT_CHANGE)).length, before, '翻月不派发事件');
      assert.equal(await p.ev('document.querySelectorAll(' + inside('window', '[data-ilife-range-day]') + ').length'), 42,
        '翻月后仍是 42 格（不跳版）');

      /* 点天：区间外的一点把远端接上去 */
      await p.ev('document.querySelector(' + inside('window', '[data-ilife-range-act="prev"]') + ').click()');
      await sleep(60);
      await p.ev(dayBtn('window', '2026-09-15') + '.click()');
      await sleep(80);
      assert.equal(await p.ev(attr('window', 'data-ilife-range-from')), '2026-09-15', '落在起点左边 ⇒ 改起点');
      assert.equal(await p.ev(attr('window', 'data-ilife-range-to')), '2026-09-30', '终点保留');
      assert.equal(await p.ev(attr('window', 'data-ilife-range-preset')), 'custom', '不再命中任何档 ⇒ 自定义区间');
      assert.equal(await p.ev(textOf('window', '[data-ilife-range-state]')), '当前按 自定义区间');
      /* 区间内的一点改更近的那一端 */
      await p.ev(dayBtn('window', '2026-09-20') + '.click()');
      await sleep(80);
      assert.equal(await p.ev(attr('window', 'data-ilife-range-from')), '2026-09-20', '更近起点 ⇒ 改起点');
      assert.equal(await p.ev(attr('window', 'data-ilife-range-to')), '2026-09-30');

      /* 起止两格：倒置被拦（留在输入格 ＋ 错误行 ＋ aria-describedby），合法则改数据 */
      const endInput = 'document.querySelector(' + inside('window', '[data-ilife-range-end="from"]') + ')';
      await p.ev('(function(){var i=' + endInput + ';i.value="2026-10-05";i.dispatchEvent(new Event("change",{bubbles:true}));return true}())');
      await sleep(80);
      assert.equal(await p.ev(attr('window', 'data-ilife-range-from')), '2026-09-20', '倒置不改数据');
      assert.equal(await p.ev(endInput + '.value'), '2026-09-20', '输入格回填原值');
      assert.match(await p.ev(textOf('window', '.' + CLS + '-error')), /起点不能晚于终点/);
      assert.equal(await p.ev(endInput + '.getAttribute("aria-describedby")'), 'ilife-block-date-range-window-error');
      await p.ev('(function(){var i=' + endInput + ';i.value="2026-09-10";i.dispatchEvent(new Event("change",{bubbles:true}));return true}())');
      await sleep(80);
      assert.equal(await p.ev(attr('window', 'data-ilife-range-from')), '2026-09-10', '合法值改数据');
      assert.equal(await p.ev('document.querySelectorAll(' + inside('window', '.' + CLS + '-error') + ').length'), 0,
        '改对了错误行收起来');

      /* 未选：点一天自成一段 */
      assert.equal(await p.ev(attr('unset', 'data-ilife-range-from')), null, '未选时没有 from 属性');
      assert.equal(await p.ev(textOf('unset', '[data-ilife-range-state]')), '当前按 还未选');
      assert.equal(await p.ev('document.querySelectorAll(' + inside('unset', '[data-ilife-range-day]') + ').length'), 0,
        '没有锚月 ⇒ 不出日历（空态）');
      await p.ev(presetBtn('unset', 'week') + '.click()');
      await sleep(80);
      assert.equal(await p.ev(attr('unset', 'data-ilife-range-from')), '2026-09-19', '未选也能点档');
      assert.equal(await p.ev(attr('unset', 'data-ilife-range-days')), '7');

      /* 禁用与更新中：一律不响应 */
      const beforeLocked = (await p.events(DATE_RANGE_EVENT_CHANGE)).length;
      await p.ev(presetBtn('locked', 'month') + '.click()');
      await p.ev(dayBtn('locked', '2026-09-10') + '.click()');
      await p.ev(presetBtn('busy', 'month') + '.click()');
      await sleep(80);
      assert.equal(await p.ev(attr('locked', 'data-ilife-range-from')), '2026-09-19', '禁用件不响应');
      assert.equal(await p.ev(attr('busy', 'data-ilife-range-from')), '2026-09-19', '更新中不响应');
      assert.equal((await p.events(DATE_RANGE_EVENT_CHANGE)).length, beforeLocked, '两者都不派发');
      assert.equal(await p.ev('getComputedStyle(' + presetBtn('locked', 'week') + ').cursor'), 'not-allowed', '禁用光标');

      /* 键盘 roving：整块恰一枚 tabindex=0，方向键移动焦点并搬 tabindex */
      assert.equal(await p.ev('document.querySelectorAll(' + inside('window', '[tabindex="0"]') + ').length'), 1);
      await p.ev('(function(){var d=' + dayBtn('window', '2026-09-20') + ';d.focus();'
        + 'd.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}));return true}())');
      await sleep(60);
      assert.equal(await p.ev('document.activeElement.getAttribute("data-ilife-range-day")'), '2026-09-21', '方向键移到下一格');
      assert.equal(await p.ev('document.querySelectorAll(' + inside('window', '[tabindex="0"]') + ').length'), 1,
        '焦点搬走后仍恰一枚可 Tab 的格');

      /* 焦点地板（真机） */
      const outline = await p.focusOutline('[' + DATE_RANGE_NAME_ATTR + '="window"] [data-ilife-range-day="2026-09-20"]');
      assert.ok(outline.w >= 2 && outline.style !== 'none', '日格焦点描边不可见：' + JSON.stringify(outline));

      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});
