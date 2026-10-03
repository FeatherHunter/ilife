// #427 公共层适配桌面与手机：三处窄屏档判据（只读产出物与冻结常量，不自造数值表）。
//
// 覆盖（票面三缺口＋冻结值对齐；`dataTable` 的 `nowrap` 子项按对抗结论不做）：
//   ① 动作条中档放开（641–820 不再钉 520）：`style.ts` 的 `actionBar` 区放开档由 821 降到 641；
//   ② ghost 行 base 变体（各宽档 flex 左起，单颗保留铺满；旧两列平分已撤）；
//   ③ KPI 网格窄屏单列（≤640 单列，基座 auto-fit 与 ≥1024 三列帽不动）；
//   ④ 冻结值对齐（`ACTION_BAR_DEFAULTS.minHeightPx` 为 44，注释与实现一致）。
// 未覆盖（另有归属）：11 个冻结变量与闭集类名（`style.test.mjs` 钉死，本件只断集合不变的副作用面）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTION_BAR_DEFAULTS,
  STYLE_PREFIX,
  TOAST_DEFAULTS,
  buildStyleSheet,
} from '../dist/index.js';
import { blocksCss } from '../dist/blocks.js';

const P = STYLE_PREFIX;
const CSS = buildStyleSheet().css;
const BCSS = blocksCss();

/** 解析 CSS 成规则块（口径同 `style.test.mjs`：剥注释、取最内层块）。 */
function ruleBlocks(css) {
  const out = [];
  for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
    if (selector === '') continue;
    out.push({ selector, decls: m[2].split(';').map((s) => s.trim()).filter((s) => s.includes(':')) });
  }
  return out;
}

function declValue(block, prop) {
  const hit = block.decls.find((d) => d.startsWith(prop + ':'));
  return hit === undefined ? null : hit.slice(prop.length + 1).trim();
}

function blocksOf(css, selector) {
  return ruleBlocks(css).filter((b) => b.selector === selector);
}

describe('#427 ① 动作条中档放开（641–820 铺满内容列）', () => {
  it('放开档为 641（不是 821）：820 内容 780 时不再钉 520', () => {
    assert.ok(CSS.includes('@media (min-width: 641px)'), '缺 641 放开档（中档真 bug 的放开位）');
    const tail = CSS.slice(CSS.indexOf('@media (min-width: 641px)'));
    assert.ok(tail.includes('.' + P + 'action-bar'), '641 档须含动作条规则');
    assert.ok(tail.includes('max-width: none'), '641 档须放开到内容列宽');
  });

  it('基座仍有 520（与 error-actions 同源，T26 不红）', () => {
    const base = blocksOf(CSS, '.' + P + 'action-bar')[0];
    assert.ok(base !== undefined, '缺动作条基座规则块');
    assert.equal(declValue(base, 'max-width'), '520px');
  });
});

describe('#427 ② ghost 行排布（base 变体：各宽档 flex 左起，单颗保留铺满）', () => {
  it('桌面基座 flex 左起（旧两列平分已撤）', () => {
    const base = blocksOf(CSS, '.' + P + 'action-row-ghost')[0];
    assert.ok(base !== undefined, '缺 ghost 行基座规则块');
    assert.equal(declValue(base, 'display'), 'flex', 'ghost 行改 flex');
    assert.equal(declValue(base, 'justify-content'), 'flex-start', 'ghost 行左起');
    assert.equal(declValue(base, 'align-items'), 'center', 'ghost 行纵向居中');
    assert.equal(declValue(base, 'gap'), '8px', 'ghost 行间距 8px');
    assert.equal(declValue(base, 'grid-template-columns'), null, '不得再写 grid 平分（旧 #247 口径已撤）');
  });

  it('没有任何 grid 平分覆盖；单颗保留铺满', () => {
    const grids = blocksOf(CSS, '.' + P + 'action-row-ghost')
      .filter((b) => declValue(b, 'grid-template-columns') !== null);
    assert.equal(grids.length, 0, 'ghost 行不许再有 grid 平分覆盖（已改 flex 左起）');
    const single = blocksOf(CSS, '.' + P + 'action-row-ghost-single > .' + P + 'copy-btn')[0];
    assert.ok(single !== undefined, '缺单颗铺满规则块（.action-row-ghost-single > .copy-btn）');
    assert.equal(declValue(single, 'flex'), '1 1 auto', '单颗 flex 保铺满');
    assert.equal(declValue(single, 'width'), '100%', '单颗保留铺满');
  });
});

describe('#427 ③ KPI 网格窄屏单列（≤640 单列，桌面帽不动）', () => {
  it('基座 auto-fit 不动（桌面自然档）', () => {
    assert.ok(
      BCSS.includes('grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));'),
      '基座 auto-fit 须保留',
    );
  });

  it('≥1024 三列帽不动（#507 桌面段）', () => {
    assert.ok(BCSS.includes('@media (min-width: 1024px)'), '缺 1024 桌面档');
    assert.ok(
      BCSS.includes('grid-template-columns: repeat(3, minmax(0, 1fr));'),
      '桌面帽须为 repeat(3, minmax(0, 1fr))',
    );
  });

  it('≤640 祖先类单列（390 每张占整行）', () => {
    const sel = '.' + P + 'block-page-shell .' + P + 'block-kpi-card-grid';
    const hits = blocksOf(BCSS, sel).filter((b) => declValue(b, 'grid-template-columns') === 'minmax(0, 1fr)');
    assert.equal(hits.length, 1, '缺 KPI ≤640 单列规则（须恰 1 条）：' + sel);
  });
});

describe('#427 ④ 冻结值对齐（44 全宽档）', () => {
  it('`ACTION_BAR_DEFAULTS.minHeightPx` 为 44（#525-J30 已批，旧值 40）', () => {
    assert.equal(ACTION_BAR_DEFAULTS.minHeightPx, 44);
  });

  it('窄屏两处与桌面同值 44（实现与注释一致）', () => {
    assert.ok(CSS.includes('min-height: 44px'), '缺 44px 触摸目标实现');
    assert.ok(CSS.includes('@media (max-width: ' + TOAST_DEFAULTS.mobileMaxPx + 'px)'), '缺 820 窄屏档');
  });
});
