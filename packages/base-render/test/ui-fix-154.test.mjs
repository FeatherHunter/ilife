// #154（公共层版式返工）行为测试：三处版式 ＋ 页内静态提示形态。
//
// 覆盖（node:test；随 root `pnpm test` 与 base-render 单包测试跑）：
//   ① 区块间距统一：`kpi-card-grid`／`data-table`／`list-rows` 三个「块级一条 margin 都没有」的块
//      补齐同族值 `margin: 16px 0`（与 chartBlock／detailSection／emptyBlock／copyBlock 同值）；
//   ② KPI 卡：四张等高（`grid-auto-rows: 1fr`）＋ 主数字 28px → 22px（阶梯不掉档）；
//   ③ 页内静态提示：`renderFeedbackBlock({ …, staticNotice: true })` 出浅色静态块（无「知道了」按钮），
//      **缺省路径逐字节不变**（仍逐字走冻结 `renderToast`）。
//
// 纪律（与 blocks.test.mjs 同口径）：断言只读冻结常量与产出物，不自造第二份数值表；
// 版本号／行号一律不写死在本文件里（防漂移）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CSS_VAR_TOKENS,
  STYLE_FORBIDDEN_TOKENS,
  STYLE_PREFIX,
  TOAST_DEFAULTS,
  TOAST_ICONS,
  buildStyleSheet,
  renderToast,
} from '../dist/index.js';
import {
  BLOCK_STYLE_SECTIONS,
  BlocksError,
  blocksCss,
  renderFeedbackBlock,
} from '../dist/blocks.js';

const P = STYLE_PREFIX;

/* ── 只读小件 ────────────────────────────────────────────────────────────── */

/** 解析 CSS 成规则块（选择器 ＋ 声明数组）；口径同 `style.test.mjs` 的 `ruleBlocks`（剥注释、取最内层块）。 */
function ruleBlocks(css) {
  const out = [];
  for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
    if (selector === '') continue;
    out.push({ selector, decls: m[2].split(';').map((s) => s.trim()).filter((s) => s.includes(':')) });
  }
  return out;
}

/** 选择器里是否以某类名作**完整**组件出现（`.ilife-x` 后不接 `[A-Za-z0-9_-]`）。 */
function selectorHasClass(selector, cls) {
  const re = new RegExp('\\.' + cls.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '(?![A-Za-z0-9_-])');
  return selector.split(',').some((s) => re.test(s));
}

/** 某类名的**基座规则**（选择器恰好是该类名的一条规则）声明数组；0 条或多条即抛。 */
function declsOf(css, cls) {
  const blocks = ruleBlocks(css).filter((b) => b.selector === '.' + cls);
  assert.equal(blocks.length, 1, cls + ' 的基座规则必须恰 1 条，实为 ' + blocks.length);
  return blocks[0].decls;
}

/** 取声明值（`font-size: 22px` → `22px`；缺该声明即抛）。 */
function declValue(decls, prop) {
  const hit = decls.find((d) => d.startsWith(prop + ':'));
  assert.ok(hit, '缺声明 ' + prop);
  return hit.slice(prop.length + 1).trim();
}

/** 取声明里的 px 数（`16px 0` → 16）。 */
function px(value) {
  const m = /(-?\d+(?:\.\d+)?)px/.exec(value);
  assert.ok(m, '不是 px 值：' + value);
  return Number(m[1]);
}

/** 产出里全部 class 令牌。 */
function classesOf(html) {
  const out = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c !== '') out.add(c);
  }
  return out;
}

function assertBadInput(fn, label) {
  assert.throws(fn, (err) => err instanceof BlocksError && err.code === 'bad-input', label);
}

const CSS = blocksCss();

/* ══════════════════════════════════════════════════════════════
 * ① 区块间距统一（与同族同值）
 * ══════════════════════════════════════════════════════════════ */

describe('#154 ① 区块间距：三类缺 margin 的块补齐同族值', () => {
  const FIXED = ['block-kpi-card-grid', 'block-data-table', 'block-list-rows'];
  const FAMILY = ['block-chart-block', 'block-detail-section', 'block-empty-block', 'block-copy-block', 'block-feedback-block'];

  it('三个块各自带块级 margin: 16px 0', () => {
    for (const cls of FIXED) {
      const decls = declsOf(CSS, P + cls);
      assert.equal(declValue(decls, 'margin'), '16px 0', cls + ' 的块级外边距必须是 16px 0');
    }
  });

  it('与同族五个已有 margin 的块**同值同向**（不另立一档）', () => {
    const values = new Set(FAMILY.map((cls) => declValue(declsOf(CSS, P + cls), 'margin')));
    assert.deepEqual([...values], ['16px 0'], '同族必须同值：' + JSON.stringify([...values]));
    for (const cls of FIXED) {
      assert.ok(values.has(declValue(declsOf(CSS, P + cls), 'margin')), cls + ' 与同族不同值');
    }
  });

  it('三块此前确实没有块级 margin（防「本来就有、白改」）', () => {
    // 反向判据：这三块的**第一条**规则里，`margin` 之外不得再出现第二个外边距来源，
    // 且它们的 margin 必须写在根规则体上（不是靠子元素内距凑）。
    for (const cls of FIXED) {
      const decls = declsOf(CSS, P + cls);
      assert.ok(decls.some((d) => d === 'margin: 16px 0'), cls + ' 缺 margin: 16px 0');
      assert.ok(!decls.some((d) => d.startsWith('padding')), cls + ' 根规则不该靠内距顶出间距');
    }
  });

  it('#457 的相邻兄弟规则仍在，且与本节互补（不是同一件事被写两遍）', () => {
    const sibs = ruleBlocks(CSS).filter((b) => b.decls.includes('margin-top: 16px'));
    assert.ok(sibs.some((b) => b.selector.includes(P + 'block-page-shell-body') && b.selector.includes('+ .' + P + 'block')),
      '缺 #457 的 `.<prefix>block-page-shell-body > * + .<prefix>block` 规则');
    // 互补点有硬依据：KPI 网格根类是 `<prefix>block-kpi-card-grid`，**不带** `<prefix>block` 类，
    // 故「上一个兄弟之后的 .ilife-block」匹配不到它 —— 它只能靠自己的 margin 站位。
    const gridClass = P + 'block-kpi-card-grid';
    assert.ok(!gridClass.split(/\s+/).includes(P + 'block'), '前置：网格根类不带 block 类');
    assert.ok(!new RegExp('\\+' + '\\s*\\.' + P + 'block-kpi-card-grid(?![A-Za-z0-9_-])').test(CSS),
      '若将来给网格补了相邻兄弟规则，本节判据失效，须重写');
  });
});

/* ══════════════════════════════════════════════════════════════
 * ② KPI 卡等高 ＋ 主数字收号
 * ══════════════════════════════════════════════════════════════ */

describe('#154 ② KPI 卡：全部行等高 ＋ 主数字 22px', () => {
  it('网格 `grid-auto-rows: 1fr`（全部隐式行同高 ⇒ 四张卡一样高）', () => {
    const decls = declsOf(CSS, P + 'block-kpi-card-grid');
    assert.equal(declValue(decls, 'grid-auto-rows'), '1fr');
    assert.equal(declValue(decls, 'display'), 'grid', '前置：仍是网格');
  });

  it('卡内距与卡高不另设（等高靠行轨道，不靠写死高度）', () => {
    const card = declsOf(CSS, P + 'block-kpi-card');
    assert.ok(!card.some((d) => d.startsWith('height')), '卡片不得写死高度（写死会截断长文本）');
  });

  it('主数字 22px：与 17px 标题档差 5px（≥4px）', () => {
    const value = px(declValue(declsOf(CSS, P + 'block-kpi-card-value'), 'font-size'));
    const title = px(declValue(declsOf(CSS, P + 'block-detail-section-title'), 'font-size'));
    assert.equal(value, 22, '主数字字号取 22px');
    assert.ok(value - title >= 4, '相邻级差须 ≥4px，实测 ' + (value - title));
    assert.ok(value < 28, '必须比改前的 28px 小（用户原话「内容太大了」）');
  });

  it('unit 仍 13px、比主数字小 ≥8px；长串折行规则保留', () => {
    const unit = px(declValue(declsOf(CSS, P + 'block-kpi-card-unit'), 'font-size'));
    const value = px(declValue(declsOf(CSS, P + 'block-kpi-card-value'), 'font-size'));
    assert.equal(unit, 13, 'unit 不随主数字一起缩');
    assert.ok(value - unit >= 8, 'unit 须比 value 小 ≥8px，实测 ' + (value - unit));
    assert.equal(declValue(declsOf(CSS, P + 'block-kpi-card-value'), 'overflow-wrap'), 'anywhere',
      '防溢出规则必须保留（长日期区间仍可断行）');
  });
});

/* ══════════════════════════════════════════════════════════════
 * ③ 页内静态提示（浅色形态）
 * ══════════════════════════════════════════════════════════════ */

describe('#154 ③ 页内静态提示：缺省路径逐字节不变', () => {
  const CASES = [
    { msg: '本窗只有 1 条记录（比较变化要 2 条以上）', detail: '单点看不出变化，页照常出。', icon: 'warn' },
    { msg: 'm' },
    { msg: 'm', badge: { text: 'B', type: 'warn' } },
    { msg: 'm', count: '3' },
    { msg: 'm', lines: ['a', 'b'], code: 'c' },
    { msg: 'm', actions: [{ label: 'L', actionId: 'a1' }] },
  ];

  it('不给 staticNotice → 逐字含冻结 renderToast 产出（对比面就是它）', () => {
    for (const toast of CASES) {
      const html = renderFeedbackBlock({ toast });
      assert.ok(html.includes(renderToast(toast)), '必须逐字组合 renderToast：' + JSON.stringify(toast));
      assert.ok(html.includes(P + 'toast"'), '缺省仍是深色 toast 形态');
      assert.ok(!html.includes(P + 'block-feedback-block-note'), '缺省不得出现浅色形态类名');
    }
  });

  it('给 false／非 true 值 → 与不给**逐字节相同**（只有显式 true 才开）', () => {
    for (const toast of CASES) {
      const base = renderFeedbackBlock({ toast });
      for (const flag of [false, undefined, 0, 'yes', null]) {
        assert.equal(renderFeedbackBlock({ toast, staticNotice: flag }), base,
          'staticNotice=' + String(flag) + ' 必须与缺省逐字节相同');
      }
    }
  });

  it('title／error 与开关无关，逐字照旧', () => {
    const toast = { msg: 'm' };
    const withTitle = renderFeedbackBlock({ title: '样本与口径', toast });
    assert.ok(withTitle.includes('<h2 class="' + P + 'block-feedback-block-title">样本与口径</h2>'), '标题');
    const both = renderFeedbackBlock({ toast, error: { message: 'e' }, staticNotice: true });
    assert.ok(both.includes(P + 'error-title'), 'error 部分不受开关影响（仍走冻结回执）');
    assert.ok(both.includes(P + 'block-feedback-block-note'), 'toast 部分走浅色形态');
  });
});

describe('#154 ③ 页内静态提示：形态与语义', () => {
  const input = {
    title: '样本与口径',
    toast: { msg: '本窗只有 1 条记录', detail: '单点无变化：一条记录谈不上趋势', icon: 'warn' },
    staticNotice: true,
  };

  it('浅色静态块：无 toast 类名、无「知道了」、无 role=status／aria-live', () => {
    const html = renderFeedbackBlock(input);
    for (const banned of [P + 'toast"', P + 'toast-icon', P + 'toast-close', P + 'toast-body', '知道了', 'data-action-id']) {
      assert.ok(!html.includes(banned), '不得出现 ' + banned);
    }
    assert.ok(!html.includes('role="status"') && !html.includes('aria-live'), '静态提示不是实时区');
    assert.ok(html.includes(P + 'block-feedback-block-note"'), '缺浅色形态根类');
    assert.ok(html.includes('本窗只有 1 条记录') && html.includes('单点无变化：一条记录谈不上趋势'), '正文与详情');
    assert.strictEqual(renderFeedbackBlock(input), html, '确定性：同输入同输出');
  });

  it('图标与冻结 toast 同源（字形逐字相同，且 aria-hidden）', () => {
    for (const icon of TOAST_ICONS) {
      const glyph = /class="[^"]*toast-icon" aria-hidden="true">([^<]*)</.exec(renderToast({ msg: 'm', icon }))[1];
      const html = renderFeedbackBlock({ toast: { msg: 'm', icon }, staticNotice: true });
      assert.ok(html.includes('aria-hidden="true">' + glyph + '</span>'), icon + ' 字形必须与 toast 同源：' + glyph);
      assert.ok(html.includes(P + 'block-feedback-block-note-icon-' + icon), icon + ' 缺语义色类名');
    }
  });

  it('非法 icon 回落冻结缺省图标（与 renderToast 同口径，不抛错）', () => {
    const html = renderFeedbackBlock({ toast: { msg: 'm', icon: 'nope' }, staticNotice: true });
    assert.ok(html.includes(P + 'block-feedback-block-note-icon-' + TOAST_DEFAULTS.defaultIcon), '回落缺省图标类');
    assert.ok(!html.includes('note-icon-nope'), '不得产出非法类名');
  });

  it('可选件 lines／code 进产物；五字符转义与区块层同源', () => {
    const html = renderFeedbackBlock({
      toast: { msg: 'a&b', detail: '<d>', lines: ['l&1', 'l<2>'], code: 'cmd --x' },
      staticNotice: true,
    });
    assert.ok(html.includes('a&amp;b') && html.includes('&lt;d&gt;'), '五字符转义');
    assert.ok(html.includes('l&amp;1<br>l&lt;2&gt;'), '多行逐行转义后 join');
    assert.ok(html.includes('<' + 'pre class="' + P + 'block-feedback-block-note-code">cmd --x</pre>'), '代码块');
  });

  it('可点控件／徽章／计数**不出**静态形态：给了即抛 bad-input（不静默丢）', () => {
    for (const extra of [
      { actions: [{ label: 'L', actionId: 'a1' }] },
      { badge: { text: 'B', type: 'ok' } },
      { count: '3' },
    ]) {
      assertBadInput(() => renderFeedbackBlock({ toast: { msg: 'm', ...extra }, staticNotice: true }),
        '静默丢字段：' + Object.keys(extra)[0]);
      assert.doesNotThrow(() => renderFeedbackBlock({ toast: { msg: 'm', ...extra } }),
        '缺省形态必须照收：' + Object.keys(extra)[0]);
    }
    assertBadInput(() => renderFeedbackBlock({ toast: { msg: 1 }, staticNotice: true }), 'msg 非串');
    assertBadInput(() => renderFeedbackBlock({ toast: null, staticNotice: true }), 'toast 非对象');
  });
});

describe('#154 ③ 页内静态提示：样式面纪律', () => {
  const NOTE_CLASSES = [
    'block-feedback-block-note',
    'block-feedback-block-note-icon',
    'block-feedback-block-note-body',
    'block-feedback-block-note-title',
    'block-feedback-block-note-detail',
    'block-feedback-block-note-lines',
    'block-feedback-block-note-code',
  ];

  it('产出类名 ↔ CSS 规则双向对齐（无臆造、无漏配）', () => {
    const produced = new Set(classesOf(renderFeedbackBlock({
      toast: { msg: 'm', detail: 'd', lines: ['a'], code: 'c', icon: 'warn' }, staticNotice: true,
    })));
    for (const icon of TOAST_ICONS) {
      for (const c of classesOf(renderFeedbackBlock({ toast: { msg: 'm', icon }, staticNotice: true }))) produced.add(c);
    }
    for (const cls of NOTE_CLASSES) {
      assert.ok(produced.has(P + cls), '渲染器未产出 ' + cls);
      assert.ok(ruleBlocks(CSS).some((b) => selectorHasClass(b.selector, P + cls)), 'CSS 缺规则 ' + cls);
    }
    // 反向：CSS 里 note 命名空间的每个类名都必须有产出者
    const noteSelectors = ruleBlocks(CSS).filter((b) => b.selector.includes(P + 'block-feedback-block-note'));
    assert.ok(noteSelectors.length > 0, '缺 note 规则');
    for (const b of noteSelectors) {
      for (const cls of classesOf('class="' + b.selector.replace(/[^A-Za-z0-9_ -]/g, ' ') + '"')) {
        if (!cls.startsWith(P + 'block-feedback-block-note')) continue;
        assert.ok(produced.has(cls), 'CSS 有规则但无产出者：' + cls);
      }
    }
  });

  it('浅色口径逐条落定：浅底 ＋ 1px --line 描边 ＋ 圆角（闭集内）', () => {
    const note = declsOf(CSS, P + 'block-feedback-block-note');
    assert.equal(declValue(note, 'background'), 'var(--soft)');
    assert.equal(declValue(note, 'border'), '1px solid var(--line)');
    const radius = px(declValue(note, 'border-radius'));
    assert.ok([8, 14, 20, 999].includes(radius), '圆角须在闭集 {8,14,20,999} 内，实测 ' + radius);
    const icon = declsOf(CSS, P + 'block-feedback-block-note-icon');
    assert.ok([8, 14, 20, 999].includes(px(declValue(icon, 'border-radius'))), '图标底盘圆角越出闭集');
  });

  it('只读冻结 token ＋ 无 Q14 禁入项 ＋ 12 区闭集不动', () => {
    const used = new Set([...CSS.matchAll(/var\((--[A-Za-z0-9-]+)\)/g)].map((m) => m[1]));
    for (const name of used) assert.ok(Object.hasOwn(CSS_VAR_TOKENS, name), '未冻结 token：' + name);
    for (const forbidden of STYLE_FORBIDDEN_TOKENS) assert.ok(!CSS.includes(forbidden), '禁入项：' + forbidden);
    assert.equal(BLOCK_STYLE_SECTIONS.length, 12, '12 区块闭集不得增删');
    // 新形态住 feedbackBlock 区（不新增样式区、不改控件闭集）
    assert.equal(buildStyleSheet().css.includes(P + 'block-feedback-block-note'), false,
      '控件样式表不得出现区块类名（区块 CSS 只由 blocksCss 产出）');
  });

  it('运行时瞬时 toast（深色卡面）一字未动：既有断言面仍在', () => {
    const styleCss = buildStyleSheet().css;
    assert.ok(styleCss.includes('.' + P + 'toast {') && styleCss.includes('rgba(28, 28, 30, .94)'),
      '深色毛玻璃卡面（2026-09-12 用户裁定）必须在');
    assert.ok(styleCss.includes('backdrop-filter: blur(20px) saturate(180%)'), '毛玻璃不许动');
  });
});
