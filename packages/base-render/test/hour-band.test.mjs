// hour-band（时段带）· 判据件。
//
// 断言对象＝`dist/components/hour-band/index.js`（本件自己的那条出口；层出口那一行由别的席加）。
// 四组同 `calendar-month.test.mjs`。本件多断四条自己的口径：
//   · **机器值是分钟，显示串算出来**（`HH:MM – HH:MM` 与 `6h40m` 由本件算，判据直接读它们）；
//   · **带上的空档显形**：时段没盖到的时间算出来并出最后一行「— ／ 其余时间未记录 ／ 时长」
//     （按**并集**算：重叠的段不重复扣）；
//   · **段内时长字只在段够宽时上屏**（阈值 `HOUR_BAND_TEXT_MIN_FRACTION`）；
//   · **窄档刻度尺只留偶数点**（24 个数字挤在一起就是压字；真机量相邻空隙）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HOUR_BAND_CLASS,
  HOUR_BAND_FORMS,
  HOUR_BAND_HOURS,
  HOUR_BAND_MINUTES_PER_DAY,
  HOUR_BAND_MISSING,
  HOUR_BAND_RULER_FONT_PX,
  HOUR_BAND_RULER_NARROW_PX,
  HOUR_BAND_TEXT_MIN_FRACTION,
  HOUR_BAND_TONES,
  HOUR_BAND_UNRECORDED_LABEL,
  hourBandClock,
  hourBandCss,
  hourBandDuration,
  hourBandSlot,
  renderHourBand,
} from '../dist/components/hour-band/index.js';
import { skinCss } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { CSS_VAR_TOKENS } from '../dist/index.js';
import { openMeasurePage } from './time-group-probe.mjs';
import { styleSource } from './_style-sources.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT = '.' + 'ilife-page-ui';
const S = (slot) => hourBandSlot(slot);

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const throwsBlocks = (fn) => {
  try { fn(); } catch (e) { return e.name === 'BlocksError'; }
  return false;
};
function selectorsOf(css) {
  const out = [];
  for (const m of stripComments(css).matchAll(/([^{}]+)\{/g)) {
    const sel = m[1].trim();
    if (sel === '' || sel.startsWith('@')) continue;
    out.push(sel);
  }
  return out;
}
const classTokens = (sel) => [...sel.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((m) => m[1]);
const isOwnClass = (token, root) => token === 'ilife-page-ui' || token.startsWith(root) || /^is-[a-z0-9-]+$/.test(token);

/* ── 夹具：一天（作息管家口径；跨午夜由调用方拆段） ───────────────────────── */
const DAY = [
  { from: 0, to: 400, label: '睡眠', tone: 3 },
  { from: 490, to: 540, label: '通勤', tone: 1 },
  { from: 540, to: 720, label: '工作 · 上午', tone: 2 },
  { from: 720, to: 810, label: '午休', tone: 1 },
  { from: 810, to: 1110, label: '工作 · 下午', tone: 2 },
  { from: 1140, to: 1210, label: '跑步', tone: 4, meta: '320 kcal' },
  { from: 1260, to: 1350, label: '阅读', tone: 1 },
];

function demoInput() {
  return {
    title: '5 月 14 日 周四',
    use: '作息管家 · 全天概览',
    summary: { label: '已记录', value: '19h40m' },
    intervals: DAY,
    legend: [{ tone: 1, label: '通勤／午休／阅读' }, { tone: 2, label: '工作' }, { tone: 3, label: '睡眠' }, { tone: 4, label: '运动' }],
    note: '空档由本件算出来',
  };
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('hour-band ① 渲染契约', () => {
  it('根：类名根 ＋ `is-<形态>`；带／刻度尺／明细行逐条到位', () => {
    const html = renderHourBand(demoInput());
    assert.match(html, /^<div class="ilife-block-hour-band is-band">/);
    assert.equal((html.match(new RegExp('class="' + S('band') + '"', 'g')) || []).length, 1, '一条带');
    assert.equal((html.match(new RegExp('class="' + S('sg') + ' is-l', 'g')) || []).length, 7, '七段');
    assert.equal((html.match(new RegExp('class="' + S('ruler') + '"', 'g')) || []).length, 1);
    assert.equal((html.match(new RegExp('class="' + S('ruler-hour'), 'g')) || []).length, HOUR_BAND_HOURS, '0..23 共 24 格');
    assert.equal((html.match(new RegExp('class="' + S('r') + '"', 'g')) || []).length, 7, '七条明细行');
    assert.equal((html.match(new RegExp('class="' + S('sw') + ' ', 'g')) || []).length, 4, '图例四档');
  });

  it('**机器值是分钟，显示串算出来**：`HH:MM – HH:MM` 与 `6h40m` 由本件算', () => {
    const html = renderHourBand(demoInput());
    assert.match(html, new RegExp(S('t') + '">00:00 \\u2013 06:40<'));
    assert.match(html, new RegExp(S('t') + '">08:10 \\u2013 09:00<'));
    assert.match(html, new RegExp(S('v') + '">6h40m<'));
    assert.match(html, new RegExp(S('v') + '">50m<'), '不足一小时写 `50m`');
    assert.match(html, new RegExp(S('v') + '">3h00m<'), '整点写 `3h00m`');
    assert.match(html, new RegExp(S('meta') + '">320 kcal<'));
    // 导出的两个换算件（本件对外的名字面）
    assert.equal(hourBandDuration(50), '50m');
    assert.equal(hourBandDuration(400), '6h40m');
    assert.equal(hourBandDuration(1440), '24h00m');
    assert.equal(hourBandClock(0), '00:00');
    assert.equal(hourBandClock(400), '06:40');
    assert.equal(hourBandClock(HOUR_BAND_MINUTES_PER_DAY), '24:00');
  });

  it('段的几何：位置与长度是算出来的轴百分比（24 小时＝100%）', () => {
    const html = renderHourBand(demoInput());
    assert.match(html, /style="left:0%;width:27\.7778%"/, '0–400 分钟');
    assert.match(html, /style="left:56\.25%;width:20\.8333%"/, '810–1110 分钟');
    assert.match(html, /style="left:87\.5%;width:6\.25%"/, '1260–1350 分钟');
  });

  it('**段内时长字只在段够宽时上屏**（阈值 ' + String(HOUR_BAND_TEXT_MIN_FRACTION) + '）', () => {
    assert.equal(HOUR_BAND_TEXT_MIN_FRACTION, 0.2);
    const html = renderHourBand(demoInput());
    // 27.7778%（睡眠）与 20.8333%（工作 · 下午）过线；12.5%（工作 · 上午）不过 ⇒ 不上屏
    assert.equal((html.match(new RegExp(S('sg-text') + '"', 'g')) || []).length, 2);
    assert.match(html, new RegExp(S('sg-text') + '">6h40m<'));
    assert.match(html, new RegExp(S('sg-text') + '">5h00m<'));
    assert.equal(html.includes('>3h00m</u>'), false, '窄段的长时字不许上屏（明细行另有读数）');
  });

  it('**带上的空档显形**：算出来并出最后一行「— ／ 其余时间未记录 ／ 时长」', () => {
    const html = renderHourBand(demoInput());
    // 盖到 1180 分钟 ⇒ 空档 260 分钟 ＝ 4h20m
    assert.match(html, new RegExp(S('r') + ' is-nil">'));
    assert.match(html, new RegExp(S('t') + '">' + HOUR_BAND_MISSING + '<'));
    assert.match(html, new RegExp(S('n') + '">' + HOUR_BAND_UNRECORDED_LABEL + '<'));
    assert.match(html, new RegExp(S('v') + '">4h20m<'));
    assert.equal(HOUR_BAND_UNRECORDED_LABEL, '其余时间未记录');
    // 盖满一整天 ⇒ 不出那一行
    const full = renderHourBand({ title: 'T', intervals: [{ from: 0, to: 1440, label: '一整天' }] });
    assert.equal(full.includes('is-nil'), false);
    // 重叠的段按**并集**算，不重复扣：0–100 ＋ 50–200 ⇒ 盖 200 分钟 ⇒ 空档 1240（20h40m）
    const overlap = renderHourBand({
      title: 'T', intervals: [{ from: 0, to: 100, label: 'a' }, { from: 50, to: 200, label: 'b' }],
    });
    assert.match(overlap, new RegExp(S('v') + '">20h40m<'));
  });

  it('刻度尺与带都是 24 格；奇数点带 `is-odd`（窄档由样式收掉）', () => {
    const html = renderHourBand(demoInput());
    assert.equal((html.match(/is-odd/g) || []).length, 12, '奇数点 12 枚');
    assert.match(html, new RegExp(S('ruler-hour') + '">0<'));
    assert.match(html, new RegExp(S('ruler-hour') + ' is-odd">1<'));
    assert.match(html, new RegExp(S('ruler-hour') + ' is-odd">23<'), '最后一枚是 23（每小时的起点）');
    assert.equal(html.includes('>24<'), false, '刻度尺画的是每小时的起点（0..23）');
  });

  it('缺槽就不出那一槽（无合计／无图例／无脚注时一个字不出）', () => {
    const html = renderHourBand({ title: 'T', intervals: [{ from: 1, to: 2, label: 'x' }] });
    for (const slot of ['sum', 'lgs', 'note', 'use']) assert.equal(html.includes(S(slot)), false, slot + ' 不该出');
    assert.equal(html.includes(S('meta')), false, '不给 meta 就不出那一栏');
  });

  it('0 段＝空串（没内容不留空块）', () => {
    assert.equal(renderHourBand({ title: 'T', intervals: [] }), '');
    assert.equal(renderHourBand({ title: 'T', intervals: [], note: 'x' }), '');
  });

  it('转义：五个字符进实体，不进标记', () => {
    const html = renderHourBand({
      title: '"><script>alert(1)</script>', use: 'a<b&c', note: '"\'',
      summary: { label: '<b>', value: '&' },
      legend: [{ tone: 1, label: '<i>' }],
      intervals: [{ from: 0, to: 720, label: '<u>', meta: '<s>' }],
    });
    assert.equal(/<script/i.test(html), false);
    assert.ok(!html.includes('<b>') && !html.includes('<i>') && !html.includes('<u>') && !html.includes('<s>'));
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&amp;/);
    assert.match(html, /&quot;/);
  });

  it('边界：闭集与**全部**非法入参分支逐个 `BlocksError`', () => {
    assert.deepEqual([...HOUR_BAND_FORMS], ['band']);
    assert.deepEqual([...HOUR_BAND_TONES], [1, 2, 3, 4]);
    assert.equal(HOUR_BAND_MINUTES_PER_DAY, 1440);
    const base = () => ({ title: 'T', intervals: [{ from: 0, to: 60, label: 'a' }] });
    const withIv = (iv) => ({ title: 'T', intervals: [iv] });

    assert.equal(throwsBlocks(() => renderHourBand(undefined)), true);
    assert.equal(throwsBlocks(() => renderHourBand(null)), true);
    assert.equal(throwsBlocks(() => renderHourBand('x')), true);
    assert.equal(throwsBlocks(() => renderHourBand({ ...base(), form: 'dual' })), true);
    assert.equal(throwsBlocks(() => renderHourBand({ ...base(), form: 'A' })), true);
    // title／intervals
    assert.equal(throwsBlocks(() => renderHourBand({ intervals: [] })), true);
    assert.equal(throwsBlocks(() => renderHourBand({ title: '', intervals: [] })), true);
    assert.equal(throwsBlocks(() => renderHourBand({ title: 3, intervals: [] })), true);
    assert.equal(throwsBlocks(() => renderHourBand({ title: 'T' })), true);
    assert.equal(throwsBlocks(() => renderHourBand({ title: 'T', intervals: 'x' })), true);
    assert.equal(throwsBlocks(() => renderHourBand({ title: 'T', intervals: [null] })), true);
    // 端点（0..1440、from < to）
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ to: 60, label: 'a' }))), true);
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ from: 0, label: 'a' }))), true);
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ from: '0', to: 60, label: 'a' }))), true);
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ from: 60, to: 60, label: 'a' }))), true);
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ from: 120, to: 60, label: 'a' }))), true);
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ from: -1, to: 60, label: 'a' }))), true, '出界（左）');
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ from: 0, to: 1441, label: 'a' }))), true, '出界（右）');
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ from: Number.NaN, to: 60, label: 'a' }))), true);
    // 其余字段
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ from: 0, to: 60 }))), true, 'label 必填');
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ from: 0, to: 60, label: '' }))), true);
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ from: 0, to: 60, label: 'a', tone: 0 }))), true);
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ from: 0, to: 60, label: 'a', tone: 5 }))), true);
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ from: 0, to: 60, label: 'a', tone: '2' }))), true);
    assert.equal(throwsBlocks(() => renderHourBand(withIv({ from: 0, to: 60, label: 'a', meta: 7 }))), true);
    assert.equal(throwsBlocks(() => renderHourBand({ ...base(), use: 7 })), true);
    assert.equal(throwsBlocks(() => renderHourBand({ ...base(), summary: { label: 'x' } })), true);
    assert.equal(throwsBlocks(() => renderHourBand({ ...base(), summary: { label: '', value: '1' } })), true);
    assert.equal(throwsBlocks(() => renderHourBand({ ...base(), summary: 7 })), true);
    assert.equal(throwsBlocks(() => renderHourBand({ ...base(), legend: 'x' })), true);
    assert.equal(throwsBlocks(() => renderHourBand({ ...base(), legend: [{ tone: 9, label: 'x' }] })), true);
    assert.equal(throwsBlocks(() => renderHourBand({ ...base(), legend: [{ tone: 1, label: '' }] })), true);
    assert.equal(throwsBlocks(() => renderHourBand({ ...base(), note: 7 })), true);
    for (const bad of ['a"b', '.x', 'a b!']) {
      assert.equal(throwsBlocks(() => renderHourBand({ ...base(), extraClass: bad })), true, '拒：' + bad);
    }
    assert.match(renderHourBand({ ...base(), extraClass: 'ok-class' }), /^<div class="ilife-block-hour-band is-band ok-class">/);
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('hour-band ② 样式与零 DOM 纪律', () => {
  const css = stripComments(hourBandCss());

  it('样式段非空，且**每一条**规则 scope 在 `.ilife-page-ui` 之下', () => {
    assert.ok(css.trim() !== '');
    const sels = selectorsOf(hourBandCss());
    assert.ok(sels.length >= 20, '选择器条数太少：' + String(sels.length));
    for (const sel of sels) {
      assert.ok(sel.includes(ROOT), '选择器不在 scope 之下：' + sel);
      /* 一条规则里的**每一段**（逗号分隔）都要以 scope 打头，且**恰好带一次** scope。 */
      for (const one of sel.split(',')) {
        assert.ok(one.trimStart().startsWith(ROOT), 'scope 必须是这一段选择器的第一个复合选择器：' + one);
        assert.equal((one.match(/\.ilife-page-ui/g) || []).length, 1,
          'scope 在同一段里出现两次（`.ilife-page-ui … .ilife-page-ui …` 的规则永远命中不到）：' + one);
      }
    }
  });

  it('零 `:root`、零 `!important`、不新造 token 名、不重定义那 11 个冻结 token', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.deepEqual(css.match(/--[a-z0-9-]+\s*:/g) || [], []);
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('源码级：`style.ts` 里不手写 `var(--ilife-…)`', () => {
    const src = styleSource('hour-band');
    assert.equal(/var\(\s*--ilife-/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), false);
  });

  it('零 DOM：`dist/components/hour-band/**` 剥掉字面量与注释后不出现 DOM 名', () => {
    const dir = join(PKG, 'dist', 'components', 'hour-band');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
    assert.ok(files.length >= 5);
    const stripLiterals = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const f of files) {
      const code = stripLiterals(readFileSync(join(dir, f), 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f + ' 里出现了 ' + needle);
      }
    }
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('hour-band ③ 加法式（不挂号＝零命中）', () => {
  it('本件只读自己的类名', () => {
    const alien = [];
    for (const sel of selectorsOf(hourBandCss())) {
      for (const token of classTokens(sel)) if (!isOwnClass(token, HOUR_BAND_CLASS)) alien.push(token);
    }
    assert.deepEqual(alien, [], '碰了别人的类名：' + alien.join('、'));
  });

  it('标记里也只有自己的类名', () => {
    const html = renderHourBand(demoInput());
    const alien = [];
    for (const m of html.matchAll(/class="([^"]*)"/g)) {
      for (const token of m[1].split(/\s+/)) {
        if (token === '' || isOwnClass(token, HOUR_BAND_CLASS)) continue;
        alien.push(token);
      }
    }
    assert.deepEqual(alien, [], '标记里混进了别人的类名：' + alien.join('、'));
  });

  it('没挂本件样式的页面：产物逐字节相同，且不含本件一个字', () => {
    const a = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const b = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(a, b);
    assert.equal(a.includes(HOUR_BAND_CLASS), false);
  });
});

/* ── ④ 两档几何（390／1280） ────────────────────────────────────────── */

describe('hour-band ④a 几何契约（静态判据）', () => {
  const css = stripComments(hourBandCss());

  it('带与刻度尺**同一张 24 列模板**（刻度永远落在整点上）', () => {
    assert.match(css, new RegExp(S('ruler') + ' \\{[^}]*grid-template-columns: repeat\\(' + String(HOUR_BAND_HOURS) + ', minmax\\(0, 1fr\\)\\)'));
  });

  it('极窄的刻度字号：' + String(HOUR_BAND_RULER_FONT_PX) + 'px（12 个点之间留得下空隙）', () => {
    assert.ok(HOUR_BAND_RULER_FONT_PX <= 10);
    assert.match(css, new RegExp(S('ruler-hour') + ' \\{[^}]*font-size: ' + String(HOUR_BAND_RULER_FONT_PX) + 'px'));
  });

  it('窄档走**容器**查询并收掉奇数点（24 个数字挤在一起就是压字）', () => {
    assert.ok(css.includes('@container (max-width: ' + String(HOUR_BAND_RULER_NARROW_PX - 1) + 'px)'));
    assert.match(css, new RegExp(S('ruler-hour') + '\\.is-odd \\{\\s*visibility: hidden'),
      '用 `visibility` 收：`display:none` 会让剩下的格子往前挤、刻度整体错位');
    assert.equal(/is-odd \{\s*display: none/.test(css), false, '不许用 display:none 收刻度（会错位）');
    assert.equal(css.includes('@media (max-width'), false, '不许用视口宽判宽度');
  });

  it('关键读数不截断：起止与时长 `nowrap`、名称换行、全段零 `text-overflow`', () => {
    assert.match(css, new RegExp(S('t') + ' \\{[^}]*white-space: nowrap'));
    assert.match(css, new RegExp(S('v') + ' \\{[^}]*white-space: nowrap'));
    assert.match(css, new RegExp(S('n') + ' \\{[^}]*overflow-wrap: anywhere'));
    assert.equal(css.includes('text-overflow'), false);
  });
});

describe('hour-band ④b 真机两档（headless Chrome ＋ CDP）', () => {
  const pageFor = () => '<div class="ilife-page-ui ilife-skin-paper">' + renderHourBand(demoInput()) + '</div>';

  it('390 与 1280：零横向溢出 ＋ 读数不截断 ＋ 刻度不压字', async (t) => {
    const p = await openMeasurePage({
      css: skinCss() + '\n' + hourBandCss(),
      frames: [{ name: 'w390', width: 390, html: pageFor() }, { name: 'w1280', width: 1280, html: pageFor() }],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何判据需真浏览器');
    try {
      for (const name of ['w390', 'w1280']) {
        const g = await p.measure(name, {
          pairSelector: '.' + S('ruler-hour') + ':not(.is-odd)',
          keySelector: '.' + S('t') + ', .' + S('v') + ', .' + S('sg-text'),
        });
        assert.equal(g.frameW, name === 'w390' ? 390 : 1280, name + '：框宽就是判据的那一档');
        assert.ok(g.overflowRightPx <= 0, name + '：右侧越界 ' + String(g.overflowRightPx) + 'px（' + JSON.stringify(g.rightMost) + '）');
        assert.ok(g.overflowLeftPx <= 0, name + '：左侧越界 ' + String(g.overflowLeftPx) + 'px（' + JSON.stringify(g.leftMost) + '）');
        assert.ok(g.targetScroll <= g.targetClient + 1, name + '：本件自己出了横滚');
        assert.ok(g.pageScroll <= g.pageClient, name + '：整页出了横滚');
        assert.deepEqual(g.overflows, [], name + '：有内容被盒子裁掉');
        assert.ok(g.minGapPx > 0, name + '：可见刻度之间的最小空隙 ' + String(g.minGapPx) + 'px ⇒ 压字');
        for (const k of g.keys) {
          assert.ok(k.sw <= k.cw + 1, name + '：读数位被裁 ' + k.cls + '=' + k.text);
          assert.notEqual(k.ellipsis, 'ellipsis', name + '：读数位不许 `…` 截断');
        }
      }
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });

  it('窄档只留偶数点（12 枚可见），宽档 24 枚全在', async (t) => {
    const p = await openMeasurePage({
      css: skinCss() + '\n' + hourBandCss(),
      frames: [{ name: 'w390', width: 390, html: pageFor() }, { name: 'w1280', width: 1280, html: pageFor() }],
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      const visible = (name) => p.ev('(function(){var f=document.querySelector("[data-frame=\\"" + ' + JSON.stringify(name) + ' + "\\"]");'
        + 'return [].slice.call(f.querySelectorAll(".' + S('ruler-hour') + '")).filter(function(h){'
        + 'return getComputedStyle(h).visibility !== "hidden";}).length;}())');
      assert.equal(await visible('w390'), 12, '390 档：每 2 小时一格');
      assert.equal(await visible('w1280'), 24, '1280 档：24 格全在');
    } finally { p.close(); }
  });
});
