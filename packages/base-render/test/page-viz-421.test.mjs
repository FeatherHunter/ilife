// #421 页面融合四件（公共层增量）：占比迷你条 `renderMiniBar` ／ 分布条行 `renderDistributionRows` ／
// 徽章 `renderChips` ／ 字段变更行 `renderChangeRows`。
//
// 判据（逐条对票面 #421「验收命令」）：
//   1. 四个渲染函数的产物各含票面类名；`rows`／`items` 为空 → 空串。
//   2. `renderMiniBar({ pct: 76 })` 的填充内联宽 `76%`；`120` 夹到 `100%`、`-5` 夹到 `0%`；
//      非数（`NaN`）按本文件既有 `badInput` 口径抛 `bad-input`。
//   3. 四件产物里不出现色值字面量（颜色只从入参来）。
//   4. `arrow: false` 的行含箭头位且带可见性占位（栏位与 `arrow: true` 的行不塌）。
//   5. 公共层零领域词（力量／有氧／柔韧／日常）；11 键 token 闭集与 12 区样式闭集都不动。
// 纪律（与 blocks.test.mjs 同口径）：断言只读冻结常量与产物字面量，不硬编码第二份 token 值；
//   类名一律按整词比对（防 `-fill` 之类子串把根类断言误满足）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  BLOCK_STYLE_SECTIONS,
  BlocksError,
  blocksCss,
  renderChangeRows,
  renderChips,
  renderDistributionRows,
  renderMiniBar,
} from '../dist/blocks.js';
import { CSS_VAR_TOKENS } from '../dist/index.js';

/** 票面类名（逐字落定；下面所有断言都从这一组取）。 */
const MINI_BAR = 'ilife-block-mini-bar';
const MINI_BAR_FILL = MINI_BAR + '-fill';
const DIST_ROW = 'ilife-block-dist-row';
const DIST_NAME = DIST_ROW + '-name';
const DIST_BAR = DIST_ROW + '-bar';
const DIST_FILL = DIST_ROW + '-fill';
const DIST_VAL = DIST_ROW + '-val';
const CHIP = 'ilife-block-chip';
const CHANGE_ROW = 'ilife-block-change-row';
const CHANGE_LABEL = CHANGE_ROW + '-label';
const CHANGE_OLD = CHANGE_ROW + '-old';
const CHANGE_NEW = CHANGE_ROW + '-new';
const CHANGE_ARROW = CHANGE_ROW + '-arrow';

/** 断言以 BlocksError（code bad-input）抛出（与 blocks.test.mjs 同口径）。 */
function assertBadInput(fn, label) {
  assert.throws(fn, (err) => err instanceof BlocksError
    && err.name === 'BlocksError'
    && err.code === 'bad-input', label);
}

/** 产物里带 class 的开标签，按类名整词过滤。 */
function tagsWithClass(html, cls) {
  return [...html.matchAll(/<[a-z]+ [^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => ((tag.match(/class="([^"]*)"/) ?? [])[1] ?? '').split(/\s+/).includes(cls));
}

/** 某开标签的内联 style 逐条声明（`width:76%` 这样的一条一项）。 */
function declsOf(tag) {
  return ((tag.match(/style="([^"]*)"/) ?? [])[1] ?? '').split(';')
    .map((decl) => decl.trim()).filter((decl) => decl !== '');
}

/** 一个元素上某条内联声明的值（没有则 undefined）。 */
function declOf(tag, prop) {
  const hit = declsOf(tag).find((decl) => decl.startsWith(prop + ':'));
  return hit === undefined ? undefined : hit.slice(prop.length + 1);
}

/** 产物里的色值字面量（十六进制／`rgb(`／`rgba(`）；空数组＝区块自身没带任何色值。 */
function colorLiterals(html) {
  return [...html.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)].map((m) => m[0]);
}

describe('#421 占比迷你条 renderMiniBar', () => {
  it('根类＋填充类各一；pct 逐字写进填充的内联宽度，入参色落在填充上', () => {
    const html = renderMiniBar({ pct: 76, color: 'var(--accent)' });
    const roots = tagsWithClass(html, MINI_BAR);
    const fills = tagsWithClass(html, MINI_BAR_FILL);
    assert.equal(roots.length, 1, '根类恰一个：' + html);
    assert.equal(fills.length, 1, '填充类恰一个：' + html);
    assert.ok(html.startsWith('<span '), '载体是行内 span（与数字同格并排）：' + html.slice(0, 20));
    assert.equal(declOf(fills[0], 'width'), '76%', '填充宽度必须逐字 76%：' + fills[0]);
    assert.equal(declOf(fills[0], 'background'), 'var(--accent)', '入参色必须落在填充上：' + fills[0]);
    assert.equal(declsOf(fills[0]).length, 2, '填充只许宽度与入参色两条声明：' + fills[0]);
  });

  it('越界夹取：120 → 100%、-5 → 0%；两端与小数不夹坏', () => {
    const widthOf = (pct) => {
      const fills = tagsWithClass(renderMiniBar({ pct }), MINI_BAR_FILL);
      assert.equal(fills.length, 1, 'fill 恰一个：pct=' + pct);
      return declOf(fills[0], 'width');
    };
    assert.equal(widthOf(120), '100%', '上限夹取');
    assert.equal(widthOf(-5), '0%', '下限夹取');
    assert.equal(widthOf(0), '0%', '下界原样');
    assert.equal(widthOf(100), '100%', '上界原样');
    assert.equal(widthOf(76.5), '76.5%', '区间内小数不夹');
  });

  it('非数（NaN／Infinity／字串／缺参）→ bad-input', () => {
    assertBadInput(() => renderMiniBar({ pct: Number.NaN }), 'NaN');
    assertBadInput(() => renderMiniBar({ pct: Number.POSITIVE_INFINITY }), 'Infinity');
    assertBadInput(() => renderMiniBar({ pct: '76' }), '字串');
    assertBadInput(() => renderMiniBar({ pct: undefined }), 'undefined');
    assertBadInput(() => renderMiniBar({}), '缺 pct');
    assertBadInput(() => renderMiniBar(), '缺 input');
  });

  it('不给色值 → 填充只有宽度一条声明；产物零色值字面量（区块不自带色）', () => {
    const html = renderMiniBar({ pct: 42 });
    const fills = tagsWithClass(html, MINI_BAR_FILL);
    assert.deepEqual(declsOf(fills[0]), ['width:42%'], '不给色值时不得自带背景：' + fills[0]);
    assert.deepEqual(colorLiterals(html), [], '产物自带色值字面量：' + html);
  });

  it('颜色两种写法都收：token 名（`--accent`）自动包 var()、色值逐字透传；非法色值 → bad-input', () => {
    const bg = (color) => declOf(tagsWithClass(renderMiniBar({ pct: 42, color }), MINI_BAR_FILL)[0], 'background');
    assert.equal(bg('--accent'), 'var(--accent)', 'token 名须包成 var()');
    assert.equal(bg('#ff0000'), '#ff0000', '色值须逐字透传（色只从入参来）');
    assert.equal(bg('var(--soft)'), 'var(--soft)', '整条 var() 原样');
    assertBadInput(() => renderMiniBar({ pct: 42, color: '' }), '空串色值');
    assertBadInput(() => renderMiniBar({ pct: 42, color: 7 }), '非串色值');
  });
});

describe('#421 分布条行 renderDistributionRows', () => {
  const ROWS = [
    { label: '甲', value: '12.5', pct: 52, color: 'var(--accent)' },
    { label: '乙', value: 3, pct: 8, color: '--accent2', labelClass: 'demo-hot' },
  ];

  it('逐行四栏：行根类＋-name／-bar／-fill／-val；行即件（无外层容器类）', () => {
    const html = renderDistributionRows({ rows: ROWS });
    assert.ok(html.startsWith('<div class="' + DIST_ROW + '">'), '行即件，首个元素就是行根：' + html.slice(0, 60));
    assert.equal(tagsWithClass(html, DIST_ROW).length, 2, '两行：' + html);
    for (const cls of [DIST_NAME, DIST_BAR, DIST_FILL, DIST_VAL]) {
      assert.equal(tagsWithClass(html, cls).length, 2, '每行一个 ' + cls + '：' + html);
    }
    assert.ok(html.includes('>甲<') && html.includes('>乙<'), '名称逐字：' + html);
    assert.ok(html.includes('>12.5<'), '字串值逐字：' + html);
    assert.ok(html.includes('>3<'), '数字值收 String()：' + html);
  });

  it('逐行宽度与入参色对得上（第 1 行 52%、第 2 行 8%）', () => {
    const html = renderDistributionRows({ rows: ROWS });
    const fills = tagsWithClass(html, DIST_FILL);
    assert.equal(declOf(fills[0], 'width'), '52%', '第 1 行宽度：' + fills[0]);
    assert.equal(declOf(fills[0], 'background'), 'var(--accent)', '第 1 行色：' + fills[0]);
    assert.equal(declOf(fills[1], 'width'), '8%', '第 2 行宽度：' + fills[1]);
    assert.equal(declOf(fills[1], 'background'), 'var(--accent2)', '第 2 行 token 名包 var()：' + fills[1]);
  });

  it('越界 pct 同行夹取口径（120 → 100%、-5 → 0%）', () => {
    const widthOf = (pct) => declOf(tagsWithClass(renderDistributionRows({
      rows: [{ label: '甲', value: '1', pct }],
    }), DIST_FILL)[0], 'width');
    assert.equal(widthOf(120), '100%');
    assert.equal(widthOf(-5), '0%');
  });

  it('labelClass 是附加类名（调用方按域标色，区块不认领域）；非法类名 → bad-input', () => {
    const html = renderDistributionRows({ rows: [{ label: '甲', value: '1', pct: 10, labelClass: 'demo-hot x2' }] });
    const nameTag = tagsWithClass(html, DIST_NAME)[0];
    const classes = ((nameTag.match(/class="([^"]*)"/) ?? [])[1] ?? '').split(/\s+/);
    assert.deepEqual(classes, [DIST_NAME, 'demo-hot', 'x2'], '名称栏＝本类＋附加类：' + nameTag);
    assertBadInput(() => renderDistributionRows({
      rows: [{ label: '甲', value: '1', pct: 10, labelClass: 'a"b' }],
    }), '含引号的类名');
    assertBadInput(() => renderDistributionRows({
      rows: [{ label: '甲', value: '1', pct: 10, labelClass: '' }],
    }), '空类名');
  });

  it('rows 为空 → 空串；非数组／行缺 label／pct 非数／内联事件字段 → bad-input', () => {
    assert.equal(renderDistributionRows({ rows: [] }), '', '空 rows＝空串');
    assertBadInput(() => renderDistributionRows({}), '缺 rows');
    assertBadInput(() => renderDistributionRows({ rows: 'x' }), 'rows 非数组');
    assertBadInput(() => renderDistributionRows({ rows: [{ value: '1', pct: 1 }] }), '行缺 label');
    assertBadInput(() => renderDistributionRows({ rows: [{ label: '甲', value: '1' }] }), '行缺 pct');
    assertBadInput(() => renderDistributionRows({ rows: [{ label: '甲', value: '1', pct: Number.NaN }] }), 'pct NaN');
    assertBadInput(() => renderDistributionRows({ rows: [{ label: '甲', value: '1', pct: 1, onClick: 1 }] }), '内联事件字段');
  });

  it('名称与数值走五字符转义（原样尖括号不得进产物）', () => {
    const html = renderDistributionRows({ rows: [{ label: '<b>&', value: '<i>', pct: 5 }] });
    assert.ok(html.includes('&lt;b&gt;&amp;'), '名称未转义：' + html);
    assert.ok(html.includes('&lt;i&gt;'), '数值未转义：' + html);
    assert.ok(!html.includes('<b>') && !html.includes('<i>'), '原始尖括号不得进产物');
  });
});

describe('#421 徽章 renderChips', () => {
  it('逐项一个 ilife-block-chip，文本逐字', () => {
    const html = renderChips({ items: [{ text: '甲' }, { text: '乙' }] });
    assert.equal(tagsWithClass(html, CHIP).length, 2, '两项两枚徽章：' + html);
    assert.ok(html.includes('>甲<') && html.includes('>乙<'), '文本逐字：' + html);
    assert.ok(html.startsWith('<span class="' + CHIP + '">'), '载体是行内 span：' + html.slice(0, 40));
  });

  it('空 items → 空串', () => {
    assert.equal(renderChips({ items: [] }), '');
  });

  it('文本走五字符转义；非法入参 → bad-input', () => {
    const html = renderChips({ items: [{ text: '<b>&' }] });
    assert.ok(html.includes('&lt;b&gt;&amp;'), '未按冻结表转义：' + html);
    assert.ok(!html.includes('<b>'), '原始尖括号不得进产物');
    assertBadInput(() => renderChips({}), '缺 items');
    assertBadInput(() => renderChips({ items: 'x' }), 'items 非数组');
    assertBadInput(() => renderChips({ items: [{ text: '' }] }), 'text 空串');
    assertBadInput(() => renderChips({ items: [{ text: '甲', onClick: 1 }] }), '内联事件字段');
  });
});

describe('#421 字段变更行 renderChangeRows', () => {
  it('一行四栏：-label／-old／-new／-arrow，改前在改后之前', () => {
    const html = renderChangeRows({ rows: [{ label: '字段', before: '60', after: '59' }] });
    for (const cls of [CHANGE_ROW, CHANGE_LABEL, CHANGE_OLD, CHANGE_NEW, CHANGE_ARROW]) {
      assert.equal(tagsWithClass(html, cls).length, 1, '缺 ' + cls + '：' + html);
    }
    assert.ok(html.includes('>字段<') && html.includes('>60<') && html.includes('>59<'), '三栏文本逐字：' + html);
    assert.ok(html.indexOf('>60<') < html.indexOf('>59<'), '改前必须排在改后之前：' + html);
  });

  it('arrow 缺省／给真：箭头可见（不带可见性占位）', () => {
    const dflt = renderChangeRows({ rows: [{ label: '字段', before: '60', after: '59' }] });
    assert.equal(declOf(tagsWithClass(dflt, CHANGE_ARROW)[0], 'visibility'), undefined, '缺省箭头不得隐藏：' + dflt);
    const on = renderChangeRows({ rows: [{ label: '字段', before: '60', after: '59', arrow: true }] });
    assert.equal(declOf(tagsWithClass(on, CHANGE_ARROW)[0], 'visibility'), undefined, 'arrow: true 不得隐藏：' + on);
  });

  it('arrow: false 仍占箭位（元素在、字形在，只加可见性隐藏）', () => {
    const on = tagsWithClass(renderChangeRows({
      rows: [{ label: '字段', before: '60', after: '59', arrow: true }],
    }), CHANGE_ARROW)[0];
    const offHtml = renderChangeRows({ rows: [{ label: '字段', before: '60', after: '59', arrow: false }] });
    const off = tagsWithClass(offHtml, CHANGE_ARROW);
    assert.equal(off.length, 1, 'arrow: false 也必须出箭位：' + offHtml);
    assert.equal(declOf(off[0], 'visibility'), 'hidden', '必须用可见性占位（display:none 会塌栏）：' + off[0]);
    assert.ok(offHtml.includes('\u2192'), '箭头字形仍在：' + offHtml);
    assert.equal(off[0].replace(' style="visibility:hidden"', ''), on, '除可见性外与真箭头逐字同（栏位不塌）');
  });

  it('rows 为空 → 空串；三栏文本转义；缺省槽位仍出行；非法入参 → bad-input', () => {
    assert.equal(renderChangeRows({ rows: [] }), '', '空 rows＝空串');
    const html = renderChangeRows({ rows: [{ label: '<b>', before: '<i>', after: '&' }] });
    assert.ok(html.includes('&lt;b&gt;') && html.includes('&lt;i&gt;') && html.includes('&amp;'), '未转义：' + html);
    assert.ok(!html.includes('<i>'), '原始尖括号不得进产物');
    const blank = renderChangeRows({ rows: [{ label: '甲', before: null, after: 3 }] });
    assert.equal(tagsWithClass(blank, CHANGE_OLD).length, 1, '空槽（null）仍出栏位：' + blank);
    assert.ok(blank.includes('>3<'), '数字改后收 String()：' + blank);
    assertBadInput(() => renderChangeRows({}), '缺 rows');
    assertBadInput(() => renderChangeRows({ rows: 'x' }), 'rows 非数组');
    assertBadInput(() => renderChangeRows({ rows: [{ before: 'a', after: 'b' }] }), '行缺 label');
    assertBadInput(() => renderChangeRows({ rows: [{ label: 'x', before: 'a', after: 'b', onX: 1 }] }), '内联事件字段');
  });
});

describe('#421 公共层纪律（色值／token 闭集／样式落盘／领域词）', () => {
  /** 四件的缺省调用（样例里一个字面色值都不给）。 */
  const samples = () => [
    renderMiniBar({ pct: 42 }),
    renderDistributionRows({ rows: [{ label: '甲', value: '1', pct: 42 }] }),
    renderChips({ items: [{ text: '甲' }] }),
    renderChangeRows({ rows: [{ label: '甲', before: '1', after: '2' }] }),
  ];

  it('四件产物零色值字面量（颜色只从入参来）', () => {
    for (const html of samples()) {
      assert.deepEqual(colorLiterals(html), [], '产物自带色值字面量：' + html);
    }
  });

  it('11 键 token 闭集不动、12 区样式闭集不动、新样式只读冻结 token', () => {
    assert.equal(Object.keys(CSS_VAR_TOKENS).length, 11, '冻结 token 必须仍是 11 个');
    assert.equal(BLOCK_STYLE_SECTIONS.length, 12, '样式区闭集必须仍是 12 区');
    const used = new Set([...blocksCss().matchAll(/var\((--[A-Za-z0-9-]+)\)/g)].map((m) => m[1]));
    for (const name of used) {
      assert.ok(Object.hasOwn(CSS_VAR_TOKENS, name), '未冻结的 token：' + name);
    }
  });

  it('四件样式由 blocksCss() 唯一产出：13 个类名各有规则块', () => {
    const css = blocksCss();
    const classes = [
      MINI_BAR, MINI_BAR_FILL, DIST_ROW, DIST_NAME, DIST_BAR, DIST_FILL, DIST_VAL,
      CHIP, CHANGE_ROW, CHANGE_LABEL, CHANGE_OLD, CHANGE_NEW, CHANGE_ARROW,
    ];
    for (const cls of classes) {
      assert.ok(css.includes('.' + cls + ' {'), '缺规则块：.' + cls);
    }
  });

  it('公共层零领域词（力量／有氧／柔韧／日常）', () => {
    const src = readFileSync(new URL('../src/blocks.ts', import.meta.url), 'utf8');
    for (const word of ['力量', '有氧', '柔韧', '日常']) {
      assert.ok(!src.includes(word), '公共层出现领域词：' + word);
    }
  });
});
