// #739 六家设置页的文字表：字号与字族不许各写各的（跟随宿主，而不是每家一份 px 表）。
//
// 背景（实测读数见 issue 正文）：六家 client.ts 的样式表分成两条血统——
// {记账／卡路里／备忘录} 写死 `font: '12px/1.5 ui-monospace,Consolas,monospace'`，
// {大厨／居家／作息} 写死 `fontSize: 12` 但字族继承；`label`／`hint`／`btn` 同样对不上。
// 宿主侧没有「界面控件」的字号 token（主题包的 token 全是颜色／背景／描边），
// 所以正解是：**不写字族**（交给宿主的继承链）＋ **字号一律相对单位（em）**。
//
// **#909 把六家设置页本体收进共用件 `dsh-life-pack/config-panel` 之后，本文件的判据对象改了指向**
// （#910）：字号表如今只有一份（`packages/plugin-manager/src/config-panel-view.ts` 的 `const S`），
// 六家 `src/client.ts` 里已经没有样式表。走的是票面给的第一条路线——**改成读共用件源码**，
// 因为「字号形态」本来就是样式表里的东西，读源码能把「同一个样式项一个字面」这条也一起守住
// （读产物只能看到算完的 style 对象，看不见样式项名与「谁该继承、谁该写 em」的分档）。
//
// 改指向时顺手把**空判据**填实：改前 `RELATIVE_OPTIONAL`（`version`）与 `INHERIT_FONT_SIZE`
// 里几项是「扫不到就跳过」，六家的样式表搬走之后它们会整条空转（扫不到 = 永远绿）。
// 现在每一项要么非空断言，要么明确登记进 ABSENT_IN_SHARED（「共用件里就没有它」也是一条判据）。
//
// 判据：
//   ① 共用件零 `font:` 简写、零 `fontFamily`（字族交给宿主继承链）；
//   ② 共用件该有的相对字号项，值逐字对上（同一个定义地，故不再有「六家互比」这一层）；
//   ③ `version`（附加块那份字面）在共用件里且是相对字号；
//   ④ 该继承字号的项不许出现 fontSize（共用件里没有的那两项登记在册）；
//   ⑤ 基准字号不许钉在 `card` 上。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

/** 共用件（总管包）的样式表：六家设置页那唯一一份字号表。 */
const SHARED_VIEW = join(REPO, 'packages', 'plugin-manager', 'src', 'config-panel-view.ts');
const SHARED_SRC = readFileSync(SHARED_VIEW, 'utf8');

/** 六家单品插件包目录名（与 #671 那张图的六个页签一一对应）。 */
const PACKAGES = [
  'plugin-bill-ilife',
  'plugin-calorie',
  'plugin-chef',
  'plugin-home-ilife',
  'plugin-memo-ilife',
  'plugin-schedule-ilife',
];

/** 共用件都该有的相对字号项 → 期望值。
 *  `version`（版本行 / 飞书状态行那份附加块的字面）**#909 起也在这张共用表里**：附加块由共用面板传
 *  `styles` 给各家，字面只有一份（改前这一项是「只有部分家有，有则同值」；现在住共用件，故升成必填）。 */
const RELATIVE_REQUIRED = {
  title: '1.08em',
  muted: '0.92em',
  info: '0.92em',
  hint: '0.92em',
  okText: '0.96em',
  error: '1em',
  version: '0.92em',
};

/** **该继承字号的项**且共用件里有：出现这些样式项时，一条都不许写 fontSize（字号跟着宿主走）。 */
const INHERIT_FONT_SIZE_PRESENT = ['card', 'label', 'input', 'btn', 'btnPrimary', 'btnPick', 'summary'];

/** 共用件里**没有**的样式项（登记在册，防「扫不到就跳过」把判据空转掉；多一项少一项都会红）。
 *  `total` 是卡路里／备忘**技能功能页**那一格数字的字面（`const W = { total: { fontSize: 22 … } }`），
 *  与设置页无关，本单不动它，故在这里登记「共用件里没有」。 */
const ABSENT_IN_SHARED = ['total', 'advSummary'];

/** 取共用件源码（每次现读：文件读到一半的读数不算数）。 */
const readShared = () => readFileSync(SHARED_VIEW, 'utf8');

/** 取出某个样式项的条目正文（`name: { … }` 里的 `…`；条目是平铺对象，无嵌套花括号）。 */
function entryBody(source, name) {
  const m = new RegExp('(?:^|\\n)\\s*' + name + ':\\s*\\{([\\s\\S]*?)\\}', 'm').exec(source);
  return m === null ? null : m[1];
}

/** 取该条目里的 fontSize 值（无则 null）。 */
function fontSizeOf(source, name) {
  const body = entryBody(source, name);
  if (body === null) return null;
  const m = /fontSize:\s*([^,}\n]+)/.exec(body);
  return m === null ? null : m[1].trim();
}

/** 整张样式表里的样式项名（`const S = { … }` 里平铺的那一层键，缩进两格才算一层键）。 */
function styleKeysOf(source) {
  const start = source.indexOf('const S = {');
  assert.ok(start >= 0, '共用件源码里找不到样式表 const S = {');
  const end = source.indexOf('\n};', start);
  assert.ok(end > start, '共用件样式表没有收尾的 };');
  const keys = new Set();
  for (const m of source.slice(start, end).matchAll(/^\s{2}([A-Za-z]+):\s*\{/gm)) keys.add(m[1]);
  assert.ok(keys.size > 0, '共用件样式表里一个样式项都没取到');
  return keys;
}

describe('#739 六家设置页文字表：字号相对、字族交给宿主（#910 起读共用件那一份）', () => {
  it('① 共用件里零 `font:` 简写、零 fontFamily（字族一律继承）', () => {
    assert.doesNotMatch(SHARED_SRC, /\bfontFamily\s*:/, '共用件写了 fontFamily（应交给宿主继承链）');
    assert.doesNotMatch(SHARED_SRC, /\bfont\s*:\s*['"]/, '共用件写了 font 简写（会连字族一起钉死）');
    // 反向对照：六家源码里也不再各写一套（样式表已搬走，误留一份就是两份定义地）。
    for (const pkg of PACKAGES) {
      const src = readFileSync(join(REPO, 'packages', pkg, 'src', 'client.ts'), 'utf8');
      assert.doesNotMatch(src, /\bfontFamily\s*:/, pkg + ' 写了 fontFamily');
      assert.doesNotMatch(src, /\bfont\s*:\s*['"]/, pkg + ' 写了 font 简写');
    }
  });

  it('② 共用件该有的相对项：都写成 em，且值逐字对上', () => {
    const source = readShared();
    for (const [name, expected] of Object.entries(RELATIVE_REQUIRED)) {
      const value = fontSizeOf(source, name);
      assert.ok(value !== null, `共用件少了样式项 ${name} 或它的字号`);
      assert.match(value, /^'[\d.]+em'$/, `${name} 字号不是相对单位：${value}`);
      assert.equal(value, `'${expected}'`, `${name} 字号应为 ${expected}`);
    }
  });

  it('③ `version`（版本行／状态行那份字面）在共用件里、且是相对字号', () => {
    const keys = styleKeysOf(readShared());
    assert.equal(keys.has('version'), true, '共用件少了 version 样式项（附加块那份字面也归它一处）');
    assert.equal(fontSizeOf(readShared(), 'version'), "'0.92em'", '共用件的 version 字号应为 0.92em');
    // 只读共用件：六家的**技能功能页**另有自己那张表（`const W = { total: { fontSize: 22 … } }`），
    // 与设置页无关，本单照旧不动它（#909 已如实登记为票外事项）。
  });

  it('④ 该继承字号的项：共用件里出现的每一项都不写 fontSize（字号跟着宿主走）', () => {
    const source = readShared();
    const keys = styleKeysOf(source);
    for (const name of ABSENT_IN_SHARED) {
      assert.equal(keys.has(name), false, '登记表说共用件里没有 ' + name + '，但它在：登记表要跟着改');
    }
    for (const name of INHERIT_FONT_SIZE_PRESENT) {
      assert.equal(keys.has(name), true, '该继承字号那一档少了样式项 ' + name);
      assert.doesNotMatch(entryBody(source, name), /fontSize/, `共用件的 ${name} 写死了字号（应继承宿主）`);
    }
    // 反向对照：共用件里真写着 fontSize 的那些项，值都是相对单位（没有一处 px 绝对量）。
    for (const m of source.matchAll(/fontSize:\s*([^,}\n]+)/g)) {
      assert.match(m[1].trim(), /^'[\d.]+em'$/, '共用件里有不是 em 的字号：' + m[1].trim());
    }
  });

  it('⑤ 基准字号不钉在卡片上（把 13px 那类绝对量拿掉）', () => {
    const card = entryBody(SHARED_SRC, 'card');
    assert.ok(card !== null, '共用件少了样式项 card');
    assert.doesNotMatch(card, /fontSize/, '共用件的 card 仍钉着基准字号：' + card.trim());
  });
});
