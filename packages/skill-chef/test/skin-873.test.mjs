/** #873 公共层席 · 私家大厨视觉皮肤的三条守门判据（产品侧最终验收面仍是验收墙与冻结尺）。
 *
 * 判什么：
 *  ① **皮肤只对本技能的页生效**：`chefSkinCss()` 的每一条选择器都必须挂在根类 `.ilife-page-ui`
 *     之下——漏一条裸选择器，别的技能页（与本技能 HELP 页）就会跟着变；
 *  ② **三禁**：不出现基础 token 表的改写（那个伪类）、不出现 `--pink`／`--r-xl`、不出现深色区
 *     选择器。公共层 `buildStyleSheet` 的 `assertExtraCss` 命中即抛，本件把它挪到编译后即可跑；
 *  ③ **10 处壳接线**：8 个域装配件 ＋ 2 个驱动器都改调单一入口 `chefSceneCss()`，且旧的两层拼接
 *     一处不剩（只改一行也照样抓得住「漏改一个域」）。
 *
 * 另有一条端到端断言：真装配出来的整页产物里**带皮肤**，且**不含** `loading="lazy"`
 * （验收墙的造册会拒收含该属性的产物）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CHEF_SKIN_CSS, chefSceneCss, chefSkinCss } from '../dist/render/skin.js';
import { pageShapeCss, pageUiCss } from 'base-paint';
import { setupInitPage } from '../dist/setup/pages.js';
import { dataQualityPage } from '../dist/data/pages.js';

const PKG = resolve(import.meta.dirname, '..');
const ROOT = resolve(PKG, '..', '..');
/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);
/** 皮肤根类（缺省前缀下的取值，与公共层 `PAGE_UI_CLASS` 同字面）。 */
const ROOT_CLASS = '.ilife-page-ui';
/** 圆角闭集与断点闭集（出处：本包 `AGENTS.md` 与公共层 `PAGE_LIMITS.breakpointsPx`）。 */
const RADIUS_CLOSED = new Set(['8px', '14px', '20px', '999px']);
const BREAKPOINTS_CLOSED = new Set([400, 640, 820, 1001, 1200]);

/** CSS 块注释剥除（与公共层 `assertExtraCss` 同口径：注释里的字只是说明，不是声明）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');
/** 取选择器表：逐字符记账，`{` 之前那段就是选择器（`@` 开头的 at 规则头不算选择器）。 */
function selectorsOf(css) {
  const out = [];
  let buf = '';
  for (const ch of stripComments(css)) {
    if (ch === '{') {
      const head = buf.trim();
      if (head !== '' && !head.startsWith('@')) {
        for (const sel of head.split(',')) out.push(sel.trim().replace(/\s+/g, ' '));
      }
      buf = '';
    } else if (ch === '}' || ch === ';') {
      buf = '';
    } else {
      buf += ch;
    }
  }
  return out;
}
/** 取某条声明的全部取值（`prop: value;` 的 value，一条规则里同属性可能多条）。 */
function valuesOf(css, prop) {
  const out = [];
  for (const decl of stripComments(css).split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    if (decl.slice(0, i).trim().split(LF).pop().trim() === prop) out.push(decl.slice(i + 1).trim());
  }
  return out;
}

describe('#873 皮肤只对根类生效（①）', () => {
  it('每一条选择器都在 .ilife-page-ui 之下', () => {
    const sels = selectorsOf(chefSkinCss());
    assert.ok(sels.length >= 20, '皮肤里至少 20 条选择器（实测 ' + sels.length + '）');
    const leaked = sels.filter((s) => !s.startsWith(ROOT_CLASS));
    assert.deepEqual(leaked, [], '有选择器没挂在根类之下，会波及别的技能页');
  });
  it('入参前缀换掉时，根类跟着换（不写死 ilife-）', () => {
    const sels = selectorsOf(chefSkinCss({ prefix: 'demo-' }));
    assert.ok(sels.length > 0);
    assert.deepEqual(sels.filter((s) => !s.startsWith('.demo-page-ui')), []);
  });
  it('圆角只用闭集 {8,14,20,999}、断点只用仓内既有集合', () => {
    const css = chefSkinCss();
    for (const v of valuesOf(css, 'border-radius')) {
      for (const one of v.split(/\s+/)) {
        assert.ok(RADIUS_CLOSED.has(one), '圆角 ' + one + ' 不在闭集 {8,14,20,999} 里');
      }
    }
    for (const bp of css.matchAll(/@media\s*\(max-width:\s*(\d+)px\)/g)) {
      assert.ok(BREAKPOINTS_CLOSED.has(Number(bp[1])), '断点 ' + bp[1] + ' 不在仓内既有集合里');
    }
  });
});

describe('#873 三禁（②）', () => {
  const css = chefSkinCss();
  it('不改写基础 token 表', () => {
    assert.ok(!/:root(?![A-Za-z0-9_-])/i.test(stripComments(css)), '命中基础 token 表的选择器');
    assert.ok(!/:root(?![A-Za-z0-9_-])/i.test(css), '连注释里也不留基础 token 表的选择器');
  });
  it('不含 Q14 禁入 token', () => {
    assert.ok(!/(^|[^A-Za-z0-9_-])--pink(?![A-Za-z0-9_-])/.test(css), '命中禁入 token 之一');
    assert.ok(!/(^|[^A-Za-z0-9_-])--r-xl(?![A-Za-z0-9_-])/.test(css), '命中禁入 token 之一');
  });
  it('不含深色区选择器', () => {
    assert.ok(!/\[\s*data-theme/i.test(css), '命中深色区属性选择器');
    assert.ok(!/prefers-color-scheme\s*:\s*dark/i.test(css), '命中深色区媒体查询');
  });
});

describe('#873 样式层的单一入口（②之补）', () => {
  it('chefSceneCss 把公共层两层与皮肤按序合起来', () => {
    const scene = chefSceneCss();
    assert.ok(scene.startsWith(pageUiCss() + LF), '第一段是公共层移动端配方');
    assert.ok(scene.includes(LF + pageShapeCss() + LF), '第二段是公共层页面级形状件');
    assert.ok(scene.endsWith(LF + chefSkinCss()), '最后一段是本技能的皮肤');
    assert.equal(CHEF_SKIN_CSS, chefSkinCss(), '常量形态与函数形态必须同源');
  });
});

describe('#873 十处壳接线（③）', () => {
  const SHELLS = [
    join(PKG, 'src', 'add', 'pages.ts'),
    join(PKG, 'src', 'cook', 'run.ts'),
    join(PKG, 'src', 'data', 'pages.ts'),
    join(PKG, 'src', 'history', 'pages.ts'),
    join(PKG, 'src', 'relation', 'pages.ts'),
    join(PKG, 'src', 'setup', 'pages.ts'),
    join(PKG, 'src', 'shopping', 'pages.ts'),
    join(PKG, 'src', 'view', 'page.ts'),
    join(ROOT, 'docs', 'skills', 'skill-chef', 't771-run-search.mjs'),
    join(ROOT, 'docs', 'skills', 'skill-chef', 't774-run-update.mjs'),
  ];
  for (const file of SHELLS) {
    const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
    it(rel + ' 只调 chefSceneCss()', () => {
      const src = readFileSync(file, 'utf8');
      assert.ok(src.includes('chefSceneCss('), '没有调用单一入口');
      assert.ok(!src.includes('pageUiCss'), '旧的两层拼接还剩一处');
      assert.ok(!src.includes('pageShapeCss'), '旧的两层拼接还剩一处');
    });
  }
});

describe('#873 真产物（④）', () => {
  const pages = [
    ['开始使用·首次使用', () => setupInitPage({ tables: 17, initialized: true })],
    ['数据管理·体检', () => dataQualityPage({ items: [
      { name: '甲菜', score: 60, ingredients_count: 3, steps_count: 2, tips_count: 0, techniques_count: 1, has_background: false, missing: ['贴士'] },
    ] })],
  ];
  for (const [what, build] of pages) {
    it(what + ' 的产物带皮肤、不带 loading=lazy', () => {
      const html = build();
      assert.ok(html.includes('#873 私家大厨视觉皮肤'), '产物里找不到皮肤那一层');
      assert.ok(html.includes('.ilife-page-ui::before'), '产物里找不到品牌带规则');
      assert.ok(/class="[^"]*ilife-page-ui/.test(html), '版面根没挂根类，皮肤一条都命中不到');
      assert.ok(!/loading\s*=\s*["']lazy["']/i.test(html), '验收墙会拒收含 loading=lazy 的产物');
    });
  }
});
