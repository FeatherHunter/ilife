// #421 页面融合四件（公共层增量）：占比迷你条 `renderMiniBar` ／ 分布条行 `renderDistributionRows` ／
// 徽章 `renderChips` ／ 字段变更行 `renderChangeRows`。
//
// 判据（逐条对票面 #421「验收命令」；#431 按甲法改口径并加硬，见 docs/base/base-render/t431-四件判据补硬.md）：
//   1. 四个渲染函数的产物各含票面类名；`rows`／`items` 空数组 → 空串。
//   2. `renderMiniBar({ pct: 76 })` 的填充内联宽 `76%`；`120` 夹到 `100%`、`-5` 夹到 `0%`；
//      非数（`NaN`）按本文件既有 `badInput` 口径抛 `bad-input`。
//   3. 色值口径（甲法，与 `src/blocks.ts`「色值口径（#431 定稿）」注释同口径）：**缺省调用产物里不含色值
//      字面量**；**缺省填充色走冻结 token**（样式段两条 `-fill` 规则的 `background: var(--blue)` 兜底）。
//      两句不互斥：区块自身不写死色值字面量，缺省色的来源是冻结 token 而不是「没有色」。
//   3a. 入参色值**逐字透传**：`#f00`／`#ff0000`／`rgb()`／`rgba()`／`var(--<冻结 token>)`／CSS 具名色；
//      清单外（`;`／`expression(`／`url(`／未定义 token 名）一律 `bad-input`（S3-6）。
//   4. `arrow: false` 的行含箭头位且带可见性占位（栏位与 `arrow: true` 的行不塌）。
//   5. 公共层零领域词（力量／有氧／柔韧／日常）；11 键 token 闭集与 12 区样式闭集都不动。
//   6. 四件样式鉴别力（S2-3）：13 条规则各「至少 N 条声明」（N＝实测向下留 2）＋关键属性快照
//      （宽高／栏宽／字号／缺省色逐条锚住），删任一条即红。
//   7. a11y（S3-4）：迷你条 `role="img"` ＋ `aria-label="<pct>%"`、变更行箭头 `aria-hidden="true"`
//      逐条断言；分布条行与徽章**不产** `role`／`aria-*`（零读数写死）。
//   8. 空态口径写死（S3-5）：空数组 → 空串；缺失（`undefined`）→ `bad-input`（两者不同口径）。
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

/** 缺省填充色：样式段两条 `-fill` 规则的 `background` 取同一冻结 token（与 `src/blocks.ts` 注释同口径）。 */
const DEFAULT_FILL_VAR = 'var(--blue)';

/** `blocksCss()` 里某类名的规则体（`{` 与 `}` 之间），供声明计数与关键属性快照读。 */
function ruleBody(css, cls) {
  const hit = new RegExp('\\.' + cls + ' \\{([^}]*)\\}').exec(css);
  assert.ok(hit !== null, '缺规则块：.' + cls);
  return hit[1];
}

/** 某类名规则体逐条声明（`color: var(--fg2)` 这样一条一项）。 */
function ruleDecls(css, cls) {
  return ruleBody(css, cls).split(';').map((decl) => decl.trim()).filter((decl) => decl !== '');
}

/** 某类名规则体里某条声明的值（没有则 undefined）。 */
function ruleDecl(css, cls, prop) {
  const hit = ruleDecls(css, cls).find((decl) => decl.startsWith(prop + ':'));
  return hit === undefined ? undefined : hit.slice(prop.length + 1).trim();
}

/** 产物里的 a11y 属性（`role=`／`aria-*=`），零读数＝这件的产物不带 a11y 属性。 */
function a11yAttrs(html) {
  return [...html.matchAll(/\s(?:role|aria-[a-z-]+)="[^"]*"/g)].map((m) => m[0].trim());
}

describe('#421 占比迷你条 renderMiniBar', () => {
  it('根类＋填充类各一；pct 逐字写进填充的内联宽度，入参色落在填充上', () => {
    const html = renderMiniBar({ pct: 76, color: 'var(--ok)' });
    const roots = tagsWithClass(html, MINI_BAR);
    const fills = tagsWithClass(html, MINI_BAR_FILL);
    assert.equal(roots.length, 1, '根类恰一个：' + html);
    assert.equal(fills.length, 1, '填充类恰一个：' + html);
    assert.ok(html.startsWith('<span '), '载体是行内 span（与数字同格并排）：' + html.slice(0, 20));
    assert.equal(declOf(fills[0], 'width'), '76%', '填充宽度必须逐字 76%：' + fills[0]);
    assert.equal(declOf(fills[0], 'background'), 'var(--ok)', '入参色必须落在填充上：' + fills[0]);
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

  it('不给色值 → 填充只有宽度一条声明；产物零色值字面量，缺省填充色走样式段冻结 token', () => {
    const html = renderMiniBar({ pct: 42 });
    const fills = tagsWithClass(html, MINI_BAR_FILL);
    assert.deepEqual(declsOf(fills[0]), ['width:42%'], '不给色值时不得自带内联背景：' + fills[0]);
    assert.deepEqual(colorLiterals(html), [], '缺省产物自带色值字面量：' + html);
    // 缺省填充色的来源就是样式段：冻结 token（不是字面量、也不是「没有色」——与 src/blocks.ts 注释同口径）。
    const css = blocksCss();
    assert.equal(ruleDecl(css, MINI_BAR_FILL, 'background'), DEFAULT_FILL_VAR, '迷你条填充缺省色须是冻结 token');
    assert.equal(ruleDecl(css, DIST_FILL, 'background'), DEFAULT_FILL_VAR, '分布条填充缺省色须是冻结 token');
    assert.ok(Object.hasOwn(CSS_VAR_TOKENS, '--blue'), '--blue 必须在 11 个冻结 token 内');
  });

  it('颜色两种写法都收：token 名（`--ok`）自动包 var()、色值逐字透传；非法色值 → bad-input', () => {
    const bg = (color) => declOf(tagsWithClass(renderMiniBar({ pct: 42, color }), MINI_BAR_FILL)[0], 'background');
    assert.equal(bg('--ok'), 'var(--ok)', '冻结 token 名须包成 var()');
    assert.equal(bg('#ff0000'), '#ff0000', '色值须逐字透传（色只从入参来）');
    assert.equal(bg('var(--soft)'), 'var(--soft)', '整条 var() 原样');
    assertBadInput(() => renderMiniBar({ pct: 42, color: '' }), '空串色值');
    assertBadInput(() => renderMiniBar({ pct: 42, color: 7 }), '非串色值');
  });

  // #431 增补一（逐字透传）：清单内六种写法各一条，值一律逐字进内联 `background`，不加壳不换写。
  it('入参色值逐字透传：#f00／#ff0000／rgb()／rgba()／var(--冻结 token)／CSS 具名色', () => {
    const bg = (color) => declOf(tagsWithClass(renderMiniBar({ pct: 42, color }), MINI_BAR_FILL)[0], 'background');
    assert.equal(bg('#f00'), '#f00', '#rgb 逐字');
    assert.equal(bg('#ff0000'), '#ff0000', '#rrggbb 逐字');
    assert.equal(bg('rgb(1,2,3)'), 'rgb(1,2,3)', 'rgb() 逐字');
    assert.equal(bg('rgba(1,2,3,.5)'), 'rgba(1,2,3,.5)', 'rgba() 逐字');
    assert.equal(bg('var(--blue)'), 'var(--blue)', 'var() 引用冻结 token 逐字');
    assert.equal(bg('tomato'), 'tomato', 'CSS 具名色逐字');
    assert.equal(bg('--blue2'), 'var(--blue2)', '裸冻结 token 名仍按既有口径包成 var()');
    assert.deepEqual(declsOf(tagsWithClass(renderMiniBar({ pct: 42, color: 'tomato' }), MINI_BAR_FILL)[0]),
      ['width:42%', 'background:tomato'], '入参色只多一条声明、不加第三条');
  });

  // #431 增补二（允许清单）：清单外一律 `bad-input`，`;` 不得穿进内联声明列表。
  it('清单外色值一律 bad-input（`;`／`expression(`／`url(`／未定义 token 名）', () => {
    const cases = [
      ['分号注入', 'red;background:url(https://x/a.png)'],
      ['expression(', 'expression(alert(1))'],
      ['url(', 'url(https://x/a.png)'],
      ['未定义 token 名', '--nope'],
      ['未定义 token 名的 var()', 'var(--nope)'],
      ['具名色带尾注', 'tomato/*'],
      ['八位十六进制（清单只收 #rgb／#rrggbb）', '#ff000080'],
      ['数字串', '7'],
    ];
    for (const [label, color] of cases) {
      assertBadInput(() => renderMiniBar({ pct: 42, color }), label + '：' + color);
    }
    // 同一把尺子也守分布条行的逐行色值（字段路径 input.rows[i].color）。
    assertBadInput(() => renderDistributionRows({
      rows: [{ label: '甲', value: '1', pct: 10, color: '--nope' }],
    }), '分布条行的未定义 token 名');
  });
});

describe('#421 分布条行 renderDistributionRows', () => {
  const ROWS = [
    { label: '甲', value: '12.5', pct: 52, color: 'var(--ok)' },
    { label: '乙', value: 3, pct: 8, color: '--blue2', labelClass: 'demo-hot' },
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
    assert.equal(declOf(fills[0], 'background'), 'var(--ok)', '第 1 行色：' + fills[0]);
    assert.equal(declOf(fills[1], 'width'), '8%', '第 2 行宽度：' + fills[1]);
    assert.equal(declOf(fills[1], 'background'), 'var(--blue2)', '第 2 行 token 名包 var()：' + fills[1]);
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

  it('四件缺省产物零色值字面量（缺省色走样式段冻结 token，区块不写死色值）', () => {
    for (const html of samples()) {
      assert.deepEqual(colorLiterals(html), [], '缺省产物自带色值字面量：' + html);
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

  // #431 增补三（S2-3 样式鉴别力）：声明数下限是粗锚，关键属性快照是细锚——删任一条声明即红。
  it('四件样式鉴别力：13 条规则各至少 N 条声明（N＝实测向下留 2）＋关键属性快照', () => {
    const css = blocksCss();
    // [类名, 改前实测声明数, 下限 N]。N＝实测 - 2；`-label`（实测 3）与 `-old`（实测 2）再留 2 会归零、
    // 下限失去意义，故这两条与实测 3 的 `-new` 一并取 1（余量 1-2），细锚由下面的快照承接。
    const counts = [
      [MINI_BAR, 7, 5], [MINI_BAR_FILL, 4, 2],
      [DIST_ROW, 6, 4], [DIST_NAME, 4, 2], [DIST_BAR, 5, 3], [DIST_FILL, 4, 2], [DIST_VAL, 4, 2],
      [CHIP, 10, 8],
      [CHANGE_ROW, 6, 4], [CHANGE_LABEL, 3, 1], [CHANGE_OLD, 2, 1], [CHANGE_ARROW, 4, 2], [CHANGE_NEW, 3, 1],
    ];
    for (const [cls, measured, floor] of counts) {
      const decls = ruleDecls(css, cls);
      assert.ok(decls.length >= floor, '.' + cls + ' 声明数 ' + decls.length + ' < ' + floor
        + '（实测 ' + measured + '）：' + ruleBody(css, cls));
    }
    // 关键属性快照：宽高／栏宽／字号／缺省色逐条锚住。
    const snapshot = [
      [MINI_BAR, 'width', '72px'], [MINI_BAR, 'height', '6px'],
      [MINI_BAR_FILL, 'height', '100%'], [MINI_BAR_FILL, 'background', DEFAULT_FILL_VAR],
      [DIST_ROW, 'grid-template-columns', 'minmax(0, 6em) minmax(0, 1fr) auto'], [DIST_ROW, 'font-size', '13px'],
      [DIST_BAR, 'height', '8px'], [DIST_FILL, 'height', '100%'], [DIST_FILL, 'background', DEFAULT_FILL_VAR],
      [CHIP, 'font-size', '12px'], [CHIP, 'background', 'var(--soft)'],
      [CHANGE_ROW, 'font-size', '14px'], [CHANGE_LABEL, 'flex', '1'],
      [CHANGE_OLD, 'text-decoration', 'line-through'], [CHANGE_OLD, 'color', 'var(--fg2)'],
      [CHANGE_ARROW, 'min-width', '1.2em'], [CHANGE_NEW, 'font-weight', '600'],
    ];
    for (const [cls, prop, want] of snapshot) {
      assert.equal(ruleDecl(css, cls, prop), want, '.' + cls + ' 的 ' + prop + ' 快照不符');
    }
    // 四件 13 条规则体内零色值字面量：缺省色与线色都只走冻结 token（全表零色值见票面遗留出口，不在本票）。
    for (const [cls] of counts) {
      assert.deepEqual(colorLiterals(ruleBody(css, cls)), [], '.' + cls + ' 规则体出现色值字面量：' + ruleBody(css, cls));
    }
  });

  // #431 增补四（S3-4 a11y）：有则逐条断言，没有则写死零读数。
  it('a11y 逐条：迷你条 role="img"＋aria-label＝pct；变更行箭头 aria-hidden；分布行与徽章读数为零', () => {
    const bar = renderMiniBar({ pct: 42 });
    const barRoot = tagsWithClass(bar, MINI_BAR)[0];
    assert.ok(barRoot.includes('role="img"'), '迷你条根须带 role="img"：' + barRoot);
    assert.ok(barRoot.includes('aria-label="42%"'), '迷你条根须带 aria-label＝pct：' + barRoot);
    assert.deepEqual(a11yAttrs(bar), ['role="img"', 'aria-label="42%"'], '迷你条 a11y 属性逐条：' + bar);
    assert.ok(renderMiniBar({ pct: 120 }).includes('aria-label="100%"'), '夹取后 aria-label 同口径（120 → 100%）');
    for (const arrow of [undefined, true, false]) {
      const html = renderChangeRows({ rows: [{ label: '甲', before: '1', after: '2', arrow }] });
      const arrowTag = tagsWithClass(html, CHANGE_ARROW)[0];
      assert.ok(arrowTag.includes('aria-hidden="true"'), '箭位是装饰字形，须 aria-hidden，arrow=' + String(arrow));
      assert.deepEqual(a11yAttrs(html), ['aria-hidden="true"'], '变更行 a11y 属性逐条：' + html);
    }
    assert.deepEqual(a11yAttrs(renderDistributionRows({ rows: [{ label: '甲', value: '1', pct: 42 }] })), [],
      '分布条行不产 role／aria-*（读数：零）');
    assert.deepEqual(a11yAttrs(renderChips({ items: [{ text: '甲' }] })), [],
      '徽章不产 role／aria-*（读数：零）');
  });

  // #431 增补五（S3-5 空态口径）：空数组与缺失是两种口径，都要写死。
  it('空态口径写死：空数组 → 空串；缺失（undefined）→ bad-input', () => {
    assert.equal(renderDistributionRows({ rows: [] }), '', '分布行 [] → 空串');
    assert.equal(renderChips({ items: [] }), '', '徽章 [] → 空串');
    assert.equal(renderChangeRows({ rows: [] }), '', '变更行 [] → 空串');
    assertBadInput(() => renderDistributionRows({ rows: undefined }), '分布行 undefined ≠ []');
    assertBadInput(() => renderChips({ items: undefined }), '徽章 undefined ≠ []');
    assertBadInput(() => renderChangeRows({ rows: undefined }), '变更行 undefined ≠ []');
    assertBadInput(() => renderMiniBar(), '迷你条缺 input（无空态分支）');
  });
});
