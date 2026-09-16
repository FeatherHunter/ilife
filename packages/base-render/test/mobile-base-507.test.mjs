// #507 移动端底座余量：五处最小增量的判据（只读产出物与母版文本，不自造数值表）。
//
// 覆盖：#507 ③减动效归零（母版＋区块）／④phone 高 dvh（vh 兜底在前）／⑤等宽栈同文件统一／
//   ⑥表格斑马纹（数值等宽已落地，本件只断斑马纹＋不断数值栈）／⑦KPI 桌面列数上限；
//   #642 HELP 小触摸目标（外壳第一段命中区 ≥44×44；视觉尺寸与第二段逐字节双冻——见文末 #642 组）。
// 未覆盖（另有归属）：viewport（#525 按需启用口径）、数值列等宽栈（table-width-512.test.mjs 已钉）、
//   blocks 等宽第三栈（H-06 已钉 4 处）。原「触摸目标分级（等用户裁定档位）」条目已由 #642 收口：
//   口径＝命中区 ≥44×44、视觉尺寸一字不动（#525 裁定：触摸区 ≥44 是全宽口径）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { blocksCss } from '../dist/blocks.js';

const TEMPLATE = readFileSync(
  fileURLToPath(new URL('../assets/help-template.html', import.meta.url)),
  'utf8',
);
const CSS = blocksCss();

function occurrences(haystack, needle) {
  let count = 0;
  let from = 0;
  for (;;) {
    const hit = haystack.indexOf(needle, from);
    if (hit < 0) return count;
    count += 1;
    from = hit + needle.length;
  }
}

describe('#507 ③ 减动效归零档', () => {
  it('母版含 prefers-reduced-motion 归零段（transition 与 animation 双归零）', () => {
    assert.ok(
      TEMPLATE.includes('@media (prefers-reduced-motion: reduce)'),
      '母版缺 reduced-motion 归零段',
    );
    const tail = TEMPLATE.slice(TEMPLATE.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.ok(tail.includes('transition:none'), '归零段须含 transition:none');
    assert.ok(tail.includes('animation:none'), '归零段须含 animation:none（hmFade／hmPop）');
  });

  it('母版归零段覆盖 toast 入场（JS 注入样式后出现，须高权重才盖得住）', () => {
    const tail = TEMPLATE.slice(TEMPLATE.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.ok(tail.includes('.hm-toast-stack .hm-toast'), 'toast 归零须挂祖先类提权重');
  });

  it('区块折叠头小三角过渡进归零段（blocks 唯一 transition）', () => {
    assert.ok(CSS.includes('@media (prefers-reduced-motion: reduce)'), '区块缺归零段');
  });
});

describe('#507 ④ phone 高用 dvh（vh 兜底在前）', () => {
  it('≤500px 档 .phone 先 100vh 再 100dvh', () => {
    assert.ok(
      TEMPLATE.includes('.phone{width:100%;height:100vh;height:100dvh;'),
      'phone 高须双声明且 vh 在前（老浏览器整行丢弃 dvh 即回落）',
    );
  });
});

describe('#507 ⑤ 等宽栈同文件统一', () => {
  it('短栈清零、长栈恰 5 处（141／152／toast-code／1273／1442）', () => {
    assert.equal(
      occurrences(TEMPLATE, 'font-family:ui-monospace,Menlo,monospace'),
      0,
      '短栈 `ui-monospace,Menlo,monospace` 须清零',
    );
    assert.equal(
      occurrences(TEMPLATE, 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'),
      5,
      '长栈须恰 5 处（注：1273／1442 两处冒号后带空格，只数栈体本身）',
    );
  });
});

describe('#507 ⑥ 表格斑马纹', () => {
  it('偶数数据行 td 吃既有 --bg（不新增语义 token，不新类名）', () => {
    assert.ok(
      CSS.includes('block-data-table tbody tr:nth-child(even) td'),
      '缺偶行斑马纹规则',
    );
    assert.ok(
      CSS.includes('background-color: var(--bg);'),
      '斑马纹须引用既有 token var(--bg)',
    );
  });
});

describe('#507 ⑦ KPI 桌面列数上限', () => {
  it('≥1024 一档 repeat(3,…)，基座 auto-fit 一字不动', () => {
    assert.ok(CSS.includes('@media (min-width: 1024px)'), '缺 1024 桌面档');
    assert.ok(
      CSS.includes('block-page-shell .ilife-block-kpi-card-grid'),
      '桌面帽须挂祖先类（与窄屏档同法，不碰基座计数）',
    );
    assert.ok(
      CSS.includes('grid-template-columns: repeat(3, minmax(0, 1fr));'),
      '桌面帽须为 repeat(3, minmax(0, 1fr))',
    );
    assert.ok(
      CSS.includes('grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));'),
      '基座 auto-fit 须保留（只加帽，不改基座）',
    );
  });
});

/* ===== #642 HELP 小触摸目标：命中区扩到 ≥44×44（视觉尺寸一字不动、第二段逐字节冻结）=====
   口径三条：
   ① 超线＝0 < min-height < 44px（`min-height:0` 是 flex 折叠复位，不是命中尺寸声明，不入扫描面）；
   ② 第一段（壳自有段）超线条＝三条真控件（横幅复制／关于行复制／卡片复制）＋两条钉住的非命中项
      （`.mini .m-top` 是 chip 视觉容器、本身不可点；`.copy-btn` 基类在 HELP 全部实例上都被更具体规则
      遮蔽——卡片 26／横幅 30／关于行 28 三条改小，`.sheet .s-actions .copy-btn` 那条是 48px）；
      命中目标六条＝这三条＋三处图标键（`.ib-close`／`.s-clear`／`.sheet .s-close`，尺寸走 width/height）；
   ③ 第二段（页面侧控件库烘焙段）是结果页 SoT，本票不碰：以第二个 `<style>` 块 sha256 冻结。 */
const SEG2_STYLE_SHA256 = '01aeb17f5890ecbd063f55d6da468d4fd52412206d1856abc8bc6da7c0894629';
const STYLE_BLOCKS = [...TEMPLATE.matchAll(/<style>[\s\S]*?<\/style>/g)].map((m) => m[0]);
const SHELL_CSS = STYLE_BLOCKS[0];
const PAGE_CSS = STYLE_BLOCKS[1];
/** 命中目标六条：覆盖层选择器 → 说明（选择器集合即契约，多一条少一条都红）。 */
const HIT_TARGETS = [
  ['.init-banner .copy-btn::after', '首屏横幅复制（视觉 min-height:30px）'],
  ['.copy-btn.a-copy::after', '关于行复制（视觉 min-height:28px）'],
  ['.mini .copy-btn::after', '场景卡复制（视觉 min-height:26px）'],
  ['.ib-close::after', '横幅关闭键（视觉 22×22）'],
  ['.s-clear::after', '搜索清空键（视觉 20×20）'],
  ['.sheet .s-close::after', '弹层关闭键（视觉 30×30）'],
];
/** 第一段 min-height 超线白名单＝三条真控件（另三条命中目标走 width/height，不在 min-height 扫描面内）。 */
const SHELL_SMALL_WHITELIST = ['.init-banner .copy-btn', '.about-row .a-copy', '.mini .copy-btn'];
/** 第一段两条钉住的非命中超线项（值一并钉死：多一条、改一值即红）。 */
const SHELL_SMALL_EXEMPT = ['.copy-btn=36', '.mini .m-top=18'];
/** relative 只给三个 copy 类——三处图标键本已 position:absolute，重复给即红。 */
const SHELL_RELATIVE_SELECTORS = ['.mini .copy-btn', '.init-banner .copy-btn', '.copy-btn.a-copy'];
/** 第一段超线条全量（源序）：三条真控件＋两条非命中项。 */
const SHELL_SMALL_ALL = [
  '.init-banner .copy-btn=30',
  '.about-row .a-copy=28',
  '.copy-btn=36',
  '.mini .m-top=18',
  '.mini .copy-btn=26',
];
/** 第二段超线条全量（源序）：页面侧控件库（formPrompt／selectList／smartSelect 在 HELP 里零调用，不渲染）。 */
const PAGE_SMALL_ALL = [
  'button.copy.ghost=40',
  '.sl-widget-input=40',
  '.ss-search=40',
  '.ss-more=36',
  '.ss-new input=40',
  '.ss-new button=40',
  '.ss-empty=36',
  '.ss-chip=38',
];

/** 逐条拆规则（剥块注释；@media 内层规则同样拆出——本件只吃单层花括号）。 */
function cssRules(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].trim().replace(/\s+/g, ' '),
    body: m[2],
  }));
}

/** 超线条清单（`选择器=值`，源序）：只收 0 < min-height < 44px。 */
function smallMinHeights(css) {
  const out = [];
  for (const rule of cssRules(css)) {
    for (const m of rule.body.matchAll(/min-height\s*:\s*([0-9.]+)px/g)) {
      const px = Number(m[1]);
      if (px > 0 && px < 44) out.push(rule.selector + '=' + px);
    }
  }
  return out;
}

/** 取规则体（选择器列表逐项精确比对；找不到即红）。 */
function ruleBody(css, selector) {
  const hit = cssRules(css).find((r) => r.selector.split(',').map((s) => s.trim()).includes(selector));
  assert.ok(hit, '源里找不到规则：' + selector);
  return hit.body;
}

describe('#642 HELP 小触摸目标：命中区 ≥44×44', () => {
  it('① 第一段最小高：超线条恰为既知 5 条，除两条钉住的非命中项外全落三条控件白名单', () => {
    const small = smallMinHeights(SHELL_CSS);
    assert.deepEqual(small, SHELL_SMALL_ALL, '第一段超线条清单变了（新增／改值／删除都须回本表判定）');
    const controls = small.filter((x) => !SHELL_SMALL_EXEMPT.includes(x));
    assert.deepEqual(
      controls,
      ['.init-banner .copy-btn=30', '.about-row .a-copy=28', '.mini .copy-btn=26'],
      '三条真控件的视觉最小高（改动前读数）须原样，且不得新增未判定的超线项',
    );
    for (const item of controls) {
      assert.ok(SHELL_SMALL_WHITELIST.includes(item.split('=')[0]), '超线项不在命中白名单：' + item);
    }
  });

  it('② 命中区 ::after 恰六条，宽高双向 ≥44px（绝对定位覆盖层，不改本体尺寸）', () => {
    const afterSels = cssRules(SHELL_CSS)
      .filter((r) => r.selector.includes('::after'))
      .flatMap((r) => r.selector.split(',').map((s) => s.trim()));
    assert.deepEqual(
      [...afterSels].sort(),
      HIT_TARGETS.map(([sel]) => sel).sort(),
      '第一段 ::after 选择器集合须恰为六条命中目标',
    );
    for (const sel of afterSels) {
      const body = ruleBody(SHELL_CSS, sel);
      const w = /(?:^|;)\s*width\s*:\s*max\(\s*100%\s*,\s*([0-9.]+)px\s*\)/.exec(body);
      const h = /(?:^|;)\s*height\s*:\s*max\(\s*100%\s*,\s*([0-9.]+)px\s*\)/.exec(body);
      assert.ok(w, sel + ' 缺 width:max(100%,…) 命中区声明');
      assert.ok(h, sel + ' 缺 height:max(100%,…) 命中区声明');
      assert.ok(Number(w[1]) >= 44, sel + ' 命中区宽 ' + w[1] + 'px < 44px（#525 裁定：触摸区 ≥44）');
      assert.ok(Number(h[1]) >= 44, sel + ' 命中区高 ' + h[1] + 'px < 44px（#525 裁定：触摸区 ≥44）');
      assert.ok(!/min-height/.test(body), sel + ' 命中层禁改本体尺寸（视觉一字不动）');
      assert.ok(body.includes('position:absolute'), sel + ' 覆盖层须绝对定位（不吃布局、不改视觉）');
    }
  });

  it('③ 视觉尺寸锁：三个 copy 类 relative＋本体尺寸不动，三处图标键 width/height 不动', () => {
    const relSels = cssRules(SHELL_CSS)
      .filter((r) => /(?:^|;)\s*position\s*:\s*relative/.test(r.body))
      .filter((r) => r.selector.includes('.copy-btn'))
      .flatMap((r) => r.selector.split(',').map((s) => s.trim()));
    assert.deepEqual(relSels.sort(), [...SHELL_RELATIVE_SELECTORS].sort(), 'relative 只给三个 copy 类');
    for (const [sel, decl] of [
      ['.init-banner .ib-close', 'width:22px;height:22px'],
      ['.s-clear', 'width:20px;height:20px'],
      ['.sheet .s-close', 'width:30px;height:30px'],
    ]) {
      const body = ruleBody(SHELL_CSS, sel);
      assert.ok(body.includes(decl), sel + ' 视觉尺寸须原样 ' + decl + '（命中层只加 ::after）');
      assert.ok(body.includes('position:absolute'), sel + ' 须保持 position:absolute（不再叠 relative）');
    }
  });

  it('④ 第二段逐字节冻结：第二个 <style> 块 sha256＝改动前取值，超线条仍是页面侧 8 条', () => {
    assert.equal(
      createHash('sha256').update(PAGE_CSS, 'utf8').digest('hex'),
      SEG2_STYLE_SHA256,
      '第二段（页面侧控件库烘焙段）是结果页 SoT，本票禁改',
    );
    assert.deepEqual(smallMinHeights(PAGE_CSS), PAGE_SMALL_ALL, '第二段超线条清单变了');
  });

  it('⑤ 13 条口径对账：第一段 5 ＋ 第二段 8 ＝ 13（全母版超线条不多不少）', () => {
    const shell = smallMinHeights(SHELL_CSS);
    const page = smallMinHeights(PAGE_CSS);
    assert.equal(shell.length, 5, '第一段 0<min-height<44 应恰 5 条');
    assert.equal(page.length, 8, '第二段 0<min-height<44 应恰 8 条');
    assert.equal(shell.length + page.length, 13, '#642 判定的 13 条口径');
  });
});
