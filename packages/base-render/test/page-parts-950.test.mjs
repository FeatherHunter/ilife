// #950 页面级导航与横条件 · 判据件（node:test；随 `node --test "packages/base-render/test/*.test.mjs"` 跑）。
//
// 断言对象是**包对外的门**：`dist/index.js`（根出口）里本批新增的十二个运行时名字。
// 每组各断三件：① 形状（类名与结构）② 边界（空数组／越界值／非法枚举）③ 与旧件的差别（为什么要有它）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CAPTION_TONES,
  CHIP_TONES,
  DAY_STRIP_EMPTY_MARK,
  SEG_NAV_ICONS,
  STATE_TONES,
  pageBarsCss,
  pageNavCss,
  pageShapeCss,
  pageUiCss,
  renderChipRow,
  renderDayStrip,
  renderEquationBar,
  renderSegmentedNav,
  renderStateBanner,
} from '../dist/index.js';
/** 旧件 `renderChips` 走**子路径出口**（`base-paint/blocks` 的 12 区块闭集），不在根出口——
 *  本判据用它当「没有容器的旧样子」的对照物，故从子路径取。 */
import { renderChips } from '../dist/blocks.js';

describe('#950 ① 胶囊行（renderChipRow）', () => {
  it('三枚 → 一个容器 ＋ 逐枚胶囊（容器就是它与 renderChips 的差别）', () => {
    const html = renderChipRow({ chips: [{ label: '主页' }, { label: '有记录 1/7 天' }, { label: '连续记录 1 天' }] });
    assert.equal((html.match(/ilife-block-chip-row/g) || []).length, 1, '必须恰好一个容器');
    assert.equal((html.match(/class="ilife-block-chip /g) || []).length, 3, '三枚胶囊');
    assert.match(html, /^<div class="ilife-block-chip-row" role="list">/);
    assert.equal((html.match(/role="listitem"/g) || []).length, 3);
  });

  it('旧件 renderChips 不带容器（记录「为什么本件存在」这条事实）', () => {
    const old = renderChips({ items: [{ text: '主页' }, { text: '有记录 1/7 天' }] });
    assert.ok(!old.includes('chip-row'), 'renderChips 的产物里没有容器类');
    assert.match(old, /<span class="ilife-block-chip">/);
  });

  it('语气色闭集 ＋ role=none ＋ 空数组', () => {
    const ok = renderChipRow({ chips: [{ label: '达标', tone: 'ok' }], role: 'none' });
    assert.match(ok, /ilife-block-chip-ok/);
    assert.ok(!ok.includes('role='), 'role=none 时不出 list／listitem');
    assert.equal(renderChipRow({ chips: [] }), '');
    assert.deepEqual([...CHIP_TONES], ['neutral', 'ok', 'warn', 'danger']);
  });

  it('非法语气与非数组都点名抛错', () => {
    assert.throws(() => renderChipRow({ chips: [{ label: 'x', tone: 'purple' }] }), /tone 必须是/);
    assert.throws(() => renderChipRow({ chips: 'x' }), /chips 必须是数组/);
  });
});

describe('#950 ② 分段导航（renderSegmentedNav）', () => {
  const items = [
    { id: 'sec-overview', label: '今日速览', icon: 'grid' },
    { id: 'sec-trend', label: '每日摄入', icon: 'line', count: '7 天' },
  ];

  it('当前项实底 ＋ aria-current；缺省吸顶', () => {
    const html = renderSegmentedNav({ items, current: 'sec-trend', ariaLabel: '页内导航' });
    assert.match(html, /class="ilife-block-seg-nav is-sticky"/);
    assert.match(html, /aria-label="页内导航"/);
    assert.equal((html.match(/is-on/g) || []).length, 1);
    assert.match(html, /href="#sec-trend" class="ilife-block-seg-nav-item is-on" aria-current="true"/);
    assert.match(html, /<span class="ilife-block-seg-nav-count">7 天<\/span>/);
    assert.equal((html.match(/<svg /g) || []).length, 2, '两格各有图标位');
  });

  it('sticky:false 不吸顶；不给 current 无选中态', () => {
    const html = renderSegmentedNav({ items, sticky: false });
    assert.ok(!html.includes('is-sticky'));
    assert.ok(!html.includes('is-on'));
  });

  it('空数组＝空串；清单外图标与空 id 点名抛错', () => {
    assert.equal(renderSegmentedNav({ items: [] }), '');
    assert.throws(() => renderSegmentedNav({ items: [{ id: 'a', label: '甲', icon: 'rocket' }] }), /icon 必须是/);
    assert.throws(() => renderSegmentedNav({ items: [{ id: '', label: '甲' }] }), /id 必须是非空字符串/);
    assert.equal(SEG_NAV_ICONS.length, 8);
  });
});

describe('#950 ③ 时间格带（renderDayStrip）', () => {
  const days = [
    { label: '09-17', value: null },
    { label: '09-23 今天', value: '860', today: true },
  ];

  it('缺数格印占位字、有数格带 is-has、今天带 is-today', () => {
    const html = renderDayStrip({ days, caption: [{ text: '本窗 1/7 天有记录' }, { text: '连续 1 天', tone: 'ok' }] });
    assert.equal((html.match(/class="ilife-block-day-strip-cell"/g) || []).length, 1, '缺数格（无附加类）');
    assert.equal((html.match(/class="ilife-block-day-strip-cell is-has is-today"/g) || []).length, 1, '今天那格');
    assert.equal((html.match(/is-has/g) || []).length, 1);
    assert.equal((html.match(/is-today/g) || []).length, 1);
    assert.ok(html.includes('<span class="ilife-block-day-strip-val">' + DAY_STRIP_EMPTY_MARK + '</span>'));
    assert.match(html, /ilife-block-day-strip-cap-item-ok[^>]*>连续 1 天</);
  });

  it('emptyMark 可换；不给 caption 就不出那条；空数组＝空串', () => {
    const html = renderDayStrip({ days, emptyMark: '未记录' });
    assert.ok(html.includes('未记录'));
    assert.ok(!html.includes('day-strip-cap'), '没给 caption 不出事实条');
    assert.equal(renderDayStrip({ days: [] }), '');
  });

  it('非法 density 与 caption 语气点名抛错', () => {
    assert.throws(() => renderDayStrip({ days, density: 'tight' }), /density 必须是/);
    assert.throws(() => renderDayStrip({ days, caption: [{ text: 'x', tone: 'loud' }] }), /tone 必须是/);
    assert.deepEqual([...CAPTION_TONES], ['plain', 'ok', 'warn', 'danger']);
  });
});

describe('#950 ④ 等式条（renderEquationBar）', () => {
  it('两段宽度＝value/total（860 与 2012 对 total 2872 ⇒ 30%／70%）', () => {
    const html = renderEquationBar({
      heading: { label: '今日缺口', value: '2012 卡' },
      segments: [{ label: '摄入', value: 860 }, { label: '缺口', value: 2012 }],
      total: 2872,
      endLabels: true,
    });
    assert.match(html, /class="ilife-block-equation-bar-seg is-a" style="width: 29\.9%"/);
    assert.match(html, /class="ilife-block-equation-bar-seg is-b" style="width: 70\.1%"/);
    assert.match(html, /ilife-block-equation-bar-cap-item">摄入 860</);
    assert.match(html, /is-total">合计 2872</);
    assert.match(html, /ilife-block-equation-bar-value">2012 卡</);
  });

  it('越界值夹到 0–100（不抛）；total<=0 与空段分别抛／空串', () => {
    const html = renderEquationBar({ segments: [{ label: '甲', value: 9999 }], total: 100 });
    assert.match(html, /width: 100%/);
    assert.throws(() => renderEquationBar({ segments: [{ label: '甲', value: 1 }], total: 0 }), /total 必须大于 0/);
    assert.equal(renderEquationBar({ segments: [], total: 10 }), '');
  });
});

describe('#950 ⑤ 态声明条（renderStateBanner）', () => {
  it('三档语气各出对应类；动作位带 data-action-id（交互仍归页面运行时）', () => {
    for (const tone of STATE_TONES) {
      const html = renderStateBanner({ tone, badge: '目标暂停中', text: '按暂停前的目标' });
      assert.match(html, new RegExp('ilife-block-state-banner is-' + tone));
    }
    const withAction = renderStateBanner({
      tone: 'warn', badge: '目标暂停中', action: { label: '重启所有目标', actionId: 'ilife-goal-resume' },
    });
    assert.match(withAction, /<button type="button" class="ilife-block-state-banner-action" data-action-id="ilife-goal-resume">重启所有目标<\/button>/);
  });

  it('清单外语气点名抛错；badge 非空必填', () => {
    assert.throws(() => renderStateBanner({ tone: 'ok', badge: 'x' }), /tone 必须是/);
    assert.throws(() => renderStateBanner({ tone: 'info', badge: '  ' }), /badge 必须是非空字符串/);
  });
});

describe('#950 ⑥ 样式归口与守卫', () => {
  it('两族样式非空且含各自的关键选择器，prefix 透传', () => {
    const nav = pageNavCss({ prefix: 'xx-' });
    assert.ok(nav.includes('.xx-page-ui .xx-block-chip-row'));
    assert.ok(nav.includes('.xx-page-ui .xx-block-seg-nav-item.is-on'));
    const bars = pageBarsCss({ prefix: 'xx-' });
    assert.ok(bars.includes('.xx-page-ui .xx-block-day-strip-cell.is-has'));
    assert.ok(bars.includes('.xx-page-ui .xx-block-equation-bar-track'));
    assert.ok(bars.includes('.xx-page-ui .xx-block-state-banner.is-warn'));
  });

  it('pageShapeCss 把两族汇总进页（调用方不必另接样式函数）', () => {
    const css = pageShapeCss();
    assert.ok(css.includes('block-chip-row'), '导航族在');
    assert.ok(css.includes('block-day-strip'), '横条族在');
    assert.ok(css.includes('① 胶囊行'), '注释也带过来（口径可读）');
  });

  it('C2 守卫：行内级子件不被页壳网格拉伸', () => {
    const css = pageUiCss();
    assert.ok(css.includes('block-page-shell-body > :where('), '既有满铺白名单仍在');
    const guard = css.split('span, a, b, i, em, strong, code, small')[1] ?? '';
    assert.ok(guard.includes('justify-self: start'), '行内级子件的守卫在场');
  });
});
