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
import { blocksCss, renderChips, renderChipRow as renderChipRowFromBlocks } from '../dist/blocks.js';

/** 剥掉 CSS 注释再断「有没有这条规则」——产出器里的注释会**提到**类名（说明它去哪了），
 *  拿裸串去断会把「解释」当成「规则」。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('#950 ① 胶囊行（renderChipRow，收口后归区块层）', () => {
  it('根出口与 `base-paint/blocks` 拿到的是**同一个函数**（只留一条路的判据）', () => {
    assert.equal(renderChipRow, renderChipRowFromBlocks,
      '根出口必须是区块层那件的同一引用，不是第二个实现');
  });

  it('三枚 → 一个容器 ＋ 逐枚胶囊（容器就是它与 renderChips 的差别）', () => {
    const html = renderChipRow({ items: [{ text: '主页' }, { text: '有记录 1/7 天' }, { text: '连续记录 1 天' }] });
    assert.equal((html.match(/ilife-block-chip-row/g) || []).length, 1, '必须恰好一个容器');
    assert.equal((html.match(/class="ilife-block-chip"/g) || []).length, 3, '三枚胶囊');
    assert.match(html, /^<div class="ilife-block-chip-row">/);
  });

  it('**老调用点逐字节不变**：不给 tone／role／extraClass 时，与收口前那件产出逐字相同', () => {
    const args = { items: [{ text: '主页' }, { text: '有记录 1/7 天' }] };
    assert.equal(renderChipRow(args),
      '<div class="ilife-block-chip-row"><span class="ilife-block-chip">主页</span>'
      + '<span class="ilife-block-chip">有记录 1/7 天</span></div>');
    // 产线 8 处调用点（skill-bill ×4、skill-chef ×3）都是这个形态：零 aria 属性、零语气类。
    assert.ok(!renderChipRow(args).includes('role='), '缺省不给角色');
    assert.ok(!/ilife-block-chip-(?!row)/.test(renderChipRow(args)), '缺省不给语气类');
  });

  it('旧件 renderChips 不带容器（记录「为什么本件存在」这条事实）', () => {
    const old = renderChips({ items: [{ text: '主页' }, { text: '有记录 1/7 天' }] });
    assert.ok(!old.includes('chip-row'), 'renderChips 的产物里没有容器类');
    assert.match(old, /<span class="ilife-block-chip">/);
  });

  it('语气位：给了才出类（`neutral` 也可显式给）；闭集四档', () => {
    const ok = renderChipRow({ items: [{ text: '达标', tone: 'ok' }] });
    assert.match(ok, /class="ilife-block-chip ilife-block-chip-ok"/);
    assert.match(renderChipRow({ items: [{ text: 'x', tone: 'warn' }] }), /ilife-block-chip-warn/);
    assert.match(renderChipRow({ items: [{ text: 'x', tone: 'danger' }] }), /ilife-block-chip-danger/);
    assert.match(renderChipRow({ items: [{ text: 'x', tone: 'neutral' }] }), /ilife-block-chip-neutral/);
    assert.deepEqual([...CHIP_TONES], ['neutral', 'ok', 'warn', 'danger']);
  });

  it('role=list ⇒ 容器 list ＋ 逐枚 listitem；role=none ⇒ 零 aria；空数组 ⇒ 空串', () => {
    const listed = renderChipRow({ items: [{ text: '甲' }, { text: '乙' }], role: 'list' });
    assert.match(listed, /^<div class="ilife-block-chip-row" role="list">/);
    assert.equal((listed.match(/role="listitem"/g) || []).length, 2);
    assert.ok(!renderChipRow({ items: [{ text: '甲' }], role: 'none' }).includes('role='));
    assert.equal(renderChipRow({ items: [] }), '');
  });

  it('extraClass 进容器；非法语气／非法 role／非数组都点名抛错', () => {
    assert.match(renderChipRow({ items: [{ text: '甲' }], extraClass: 'is-tight' }),
      /^<div class="ilife-block-chip-row is-tight">/);
    assert.throws(() => renderChipRow({ items: [{ text: 'x', tone: 'purple' }] }), /tone 必须是/);
    assert.throws(() => renderChipRow({ items: [{ text: 'x' }], role: 'grid' }), /role 必须是/);
    assert.throws(() => renderChipRow({ items: 'x' }), /必须是数组/);
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
    assert.match(html, /href="#sec-trend" class="ilife-block-seg-nav-item is-on" aria-current="page"/);
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
    assert.ok(nav.includes('.xx-page-ui .xx-block-seg-nav-item.is-on'));
    // 收口判据：胶囊行那一段已移籍区块层，页面层**不许**再定义同一个容器类（两层各定义一次会互相盖）。
    assert.ok(!stripComments(nav).includes('chip'), '页面层零 chip 选择器');
    const bars = pageBarsCss({ prefix: 'xx-' });
    assert.ok(bars.includes('.xx-page-ui .xx-block-day-strip-cell.is-has'));
    assert.ok(bars.includes('.xx-page-ui .xx-block-equation-bar-track'));
    assert.ok(bars.includes('.xx-page-ui .xx-block-state-banner.is-warn'));
  });

  it('pageShapeCss 把两族汇总进页（调用方不必另接样式函数）', () => {
    const css = pageShapeCss();
    assert.ok(css.includes('block-seg-nav'), '导航族在');
    assert.ok(css.includes('block-day-strip'), '横条族在');
    assert.ok(css.includes('移籍区块层'), '胶囊行去处的注释也带过来（口径可读）');
  });

  it('胶囊容器与语气色的样式住在区块层（`blocksCss`），页面层零重复定义', () => {
    const blocks = blocksCss();
    assert.ok(blocks.includes('.ilife-block-chip-row'), '区块层有容器');
    assert.ok(blocks.includes('.ilife-block-chip-ok'), '区块层有语气三档');
    assert.ok(!stripComments(pageNavCss()).includes('chip-row'),
      '同一个容器类不许被两层各定义一次（收口前页面层那条会吃掉区块层的 margin）');
  });

  it('C2 守卫：行内级子件不被页壳网格拉伸', () => {
    const css = pageUiCss();
    assert.ok(css.includes('block-page-shell-body > :where('), '既有满铺白名单仍在');
    const guard = css.split('span, a, b, i, em, strong, code, small')[1] ?? '';
    assert.ok(guard.includes('justify-self: start'), '行内级子件的守卫在场');
  });
});
