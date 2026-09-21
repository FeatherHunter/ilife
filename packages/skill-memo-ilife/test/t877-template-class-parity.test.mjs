// #877 · 模板 CSS 与公共层产出件类名的一致性回归
//
// 为什么单列一件（不并进 render.test.mjs）：本件守的是**跨图层的一致性**，不是渲染层的形状——
// 它读的是「模板自己 `<style>` 里的选择器指向的类名」与「同一份产物里真的被写出来的类名」这一对关系。
//
// 病（#877 根因）：模板里那条 `#list .hm-empty{grid-column:1/-1}` 的空转。
// `#870` 把页面壳从老公共层的 `hm-*` 类名切到 `base-render` 的 `ilife-*` 类名时，模板漏改，
// 选择器指向的类名在产物里**一个都不出现** ⇒ 规则静默失效、空态卡只占两列栅格的第一列。
// 判据（零溢出／`toc=1`／机审六列）全绿都抓不到它——**只有把选择器的类名与产物真吐的类名放在一起比才看得见**。
//
// 反向证据（改坏必红）：把模板的 `.ilife-empty` 改回 `.hm-empty`，本件即红并点出「hm-empty」这个名字。

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildListPage, loadTemplate, memoPageAssets } from '../dist/render/index.js';

/** 取模板**自己的**那个 `<style>`（模板首个 `<style>`；注入资产的 `<style>` 由 `memoPageAssets()` 另给）。 */
function templateOwnCss(templateText) {
  const m = /<style>([\s\S]*?)<\/style>/.exec(templateText);
  assert.ok(m, '模板里应有一个自己的 <style> 块');
  return m[1];
}

/** 撤掉注释后的 CSS（注释里的示例类名不该被当成活规则来判）。 */
const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** 只取选择器列表里出现的那几个类名（逗号分隔的整串选择器，逐个扫）。 */
const classesInSelector = (selector) => [...selector.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((x) => x[1]);

/** 产物里「真的被写出来」的类名：收**整份产物**（静态标记 ＋ 注入的运行时源码）里所有
 *  `class="…"` 取值上出现过的类名。
 *
 *  为什么不能只看静态 DOM：本族页面的大半 DOM 是运行时经 `innerHTML` 写进去的
 *  （`#list`、空态卡、卡片都只在 JS 里），静态标记只有 1.7KB ⇒ 只扫静态 DOM 会把**全部**
 *  动态类名误判成落空。模板与运行时同住一份产物，故判据取产物全集。
 *
 *  方法的边界（写清楚以免误信）：它按「赋值给 class 属性」判定，认不出把类名拆成几段字符串拼出来的
 *  写法；本仓未用该写法，若将来用了，本判据对该处会失明。 */
function emittedClasses(html) {
  const out = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].trim().split(/\s+/)) if (c !== '') out.add(c);
  }
  return out;
}

/** 判据本体：`#list` 那族栅格规则里出现的类名，必须个个都能在同一份产物里被写出来。
 *  返回落空的类名清单（空数组＝过）。
 *
 *  **为什么把范围钉在 `#list` 这一族**（写清边界，别误信成「全部选择器都查过了」）：
 *  - `#list` 的内容整体由运行时经 `innerHTML` 产出，模板 CSS 与运行时是**同一份关系**的两端
 *    ⇒ 这一族的规则正是本次翻车的那一类（模板以为的类名 ≠ 运行时真吐的类名）；
 *  - 收成全模板范围内查会误报：`.eyebrow`／`.muted`／`.ok`／`.warn`／`.empty` 是本族模板 CSS 里
 *    的**遗留死码或共用装饰类**（本族用不到），它们落空是既有技术债，不属本票。
 *
 *  做法：先撤注释（注释里引用的类名不算规则），再按「选择器 ＋ `{声明}`」逐条取 —— 只取选择器里
 *  的 `.类名`（声明里的 `0.01em` 之类因不在选择器段而天然不进）。 */
function deadSelectorsInListRules(templateText, html) {
  const css = withoutComments(templateOwnCss(templateText));
  const live = emittedClasses(html);
  const dead = new Set();
  for (const m of css.matchAll(/([^{}]*#list[^{}]*)\{[^{}]*\}/g)) {
    for (const cls of classesInSelector(m[1])) {
      if (!live.has(cls)) dead.add(cls);
    }
  }
  return [...dead].sort();
}

describe('#877 模板 CSS 与公共层产出件类名一致', () => {
  const assets = memoPageAssets();
  const built = buildListPage({
    scene: 'memo_completed_reminders',
    title: '查已提醒备忘',
    subtitle: '还没有「已触发并打了卡」的提醒',
    summary: ['结果 0 条', '有排期 0 条', '有附件 0 条', '有提醒 0 条'],
    sections: [],
    copyLog: { thinking: 't', data_structure: 'd', call_chain: 'c', exception: '无' },
    items: [],
  });
  const html = built.html;
  const templateText = loadTemplate('memo_query');

  it('产出的整页里，空态件用的是公共层类名 ilife-empty（不是 hm-empty）', () => {
    assert.ok(html.includes('class="ilife-empty"'), '空态件须由公共层的 emptyState 产出 ilife-empty');
    // 同族模板里不该再有 hm-* 的空态类名残留（#870 迁移后的类名空间是 ilife-*）。
    assert.equal(templateText.includes('hm-empty'), false, '模板里不该再有 hm-empty 类名');
  });

  it('#list 族栅格规则里的类名，个个都在同一份产物里被写出来（规则不空转）', () => {
    const dead = deadSelectorsInListRules(templateText, html);
    assert.deepEqual(
      dead,
      [],
      '#list 族的 CSS 规则指向了产物里根本不出现的类名（规则会静默空转，空态卡又只占半列）：' + dead.join('、'),
    );
  });

  it('栅格里的空态卡拿到了跨满两列的规则（本票的靶点，逐条钉住）', () => {
    // 规则本体在模板段里，且指向公共层那个类名。
    assert.match(withoutComments(templateOwnCss(templateText)), /#list\s+\.ilife-empty\s*\{[^}]*grid-column\s*:\s*1\s*\/\s*-1/);
    // 空态件确实落在 #list 的 DOM 容器内（选择器的作用域对得上）。
    const listAt = html.indexOf('id="list"');
    assert.ok(listAt >= 0, '产物应有 #list 容器');
    assert.ok(html.slice(listAt).indexOf('class="ilife-empty"') >= 0, '#list 之后应出现空态件');
    // 注入资产的样式表里必须有 ilife-empty 的样式（否则规则再对也是空壳）。
    assert.ok(assets.sharedCssText.includes('.ilife-empty'), '公共层样式表应含 .ilife-empty 的样式');
  });

  it('同族第二模板（change_category）：空分支落进栅格的那一层，必须自己带跨列规则', () => {
    // `change_category.html` 的空分支写的是 `list.innerHTML = '<div class="panel">' + emptyState({…}) + '</div>'`
    // —— 落进 `#noteList` 栅格的**分栏项是那层 `.panel`，不是空卡本身**。故跨列必须挂在 `.panel` 上：
    // 只给 `.ilife-empty` 挂 `grid-column` 是空转（空卡是 `.panel` 的子元素，不参与外层栅格定位）。
    // 实测（#877 复核）：撤掉那条 `.panel` 规则，空卡在 1280 档只占 419px（版心 936），桌面档就是半个卡。
    const catText = loadTemplate('change_category');
    const catCss = withoutComments(templateOwnCss(catText));
    // ① 空分支里 first child 那一层是什么类名 —— 从模板源码里读，不手抄。
    const branch = /if\(!items\(\)\.length\)\{list\.innerHTML='([^']*)'/.exec(catText);
    assert.ok(branch, 'change_category 模板里应有空分支（`if(!items().length){list.innerHTML=…}`）');
    const outerCls = /^<div class="([^"]+)"/.exec(branch[1]);
    assert.ok(outerCls, '空分支的第一层应是带 class 的容器：' + branch[1].slice(0, 80));
    // ② 模板 CSS 里必须有一条以「#noteList > 那一层」为主体的规则，且含 grid-column 跨列。
    const sel = new RegExp('#noteList\\s*>\\s*\\.' + outerCls[1] + '\\b[^{}]*\\{[^}]*grid-column\\s*:\\s*1\\s*\\/\\s*-1');
    assert.match(catCss, sel,
      '空分支的分栏项是 `.' + outerCls[1] + '`，模板 CSS 须给它挂 `grid-column:1/-1`（否则桌面档空卡只占半列）');
  });
});
