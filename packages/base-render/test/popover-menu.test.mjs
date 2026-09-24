/** popover-menu（浮出菜单 · 形态 A 贴着按钮）· **判据件**。
 *
 *  断言对象是本件自己的唯一出口：`dist/components/popover-menu/index.js`。
 *  四类（契约 §五）＋ 本族三处硬判据 ＋ 本件特有的三条：
 *   **零脚本可开**（触发键带 `popovertarget`）／**贴住且不越界**（贴不下翻边）／**选中后焦点归还**。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MENU_ALIGNS, MENU_ANCHOR_PREFIX, MENU_ANCHOR_QUERY, MENU_AREA_QUERY, MENU_ATTR, MENU_CLASS, MENU_FORMS,
  MENU_GAP_PX, MENU_ITEM_ATTR, MENU_KINDS, MENU_MIN_HEIGHT_PX, MENU_PANEL_ATTR, MENU_TRIGGER_ATTR,
  buildPopoverMenuJs, popoverMenuCss, renderPopoverMenu,
} from '../dist/components/popover-menu/index.js';
import {
  SKINS, SKIN_NAMES, SKIN_TOKEN_NAMES, skinClass, skinCss, skinVar,
} from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import * as root from '../dist/index.js';
import {
  contrast, cutSpans, selectorsOf, skinVarSpans, startBrowser, stripComments, throwsBlocks,
} from './overlay-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/** 一页真实形状的浮出菜单（复制格式）。 */
const REAL = {
  id: 'menu-copy',
  trigger: '复制为',
  align: 'end',
  menuLabel: '复制成哪种格式',
  items: [
    { value: 'text', label: '纯文本', group: '文字', shortcut: '⌘⇧T' },
    { value: 'markdown', label: 'Markdown', note: '带标题与表格', shortcut: '⌘⇧M' },
    { value: 'csv', label: 'CSV', group: '数据', shortcut: '⌘⇧C' },
    { value: 'view-day', label: '按天', kind: 'check', checked: true, group: '排布' },
    { value: 'view-week', label: '按周', kind: 'check' },
    { value: 'remove', label: '删掉这一条', kind: 'danger', sep: true },
  ],
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('popoverMenu ① 渲染契约', () => {
  it('骨架：触发键（popovertarget ＋ 锚名）＋ 面板（popover ＋ role=menu ＋ 位置锚）', () => {
    const html = renderPopoverMenu(REAL);
    assert.match(html, /^<span class="ilife-block-popover-menu is-hug" data-ilife-popover-menu="menu-copy">/, html.slice(0, 100));
    assert.ok(html.includes('popovertarget="menu-copy"'), '触发键用原生 popovertarget（零脚本也开得出来）');
    assert.ok(html.includes('aria-haspopup="true"') && html.includes('aria-expanded="false"'), '展开态可读');
    assert.ok(html.includes('style="anchor-name:' + MENU_ANCHOR_PREFIX + 'menu-copy"'), '触发键带逐实例锚名');
    assert.ok(html.includes('id="menu-copy" popover="auto" role="menu"'), '面板是 popover ＋ menu');
    assert.ok(html.includes('aria-label="复制成哪种格式"'), '菜单有无障碍名');
    assert.ok(html.includes('style="position-anchor:' + MENU_ANCHOR_PREFIX + 'menu-copy"'), '面板写同一个锚名');
    assert.ok(html.includes(MENU_PANEL_ATTR + '="end"'), '贴哪边进标记（降级路按它算）');
    assert.ok(html.includes('>复制为<span aria-hidden="true">▾</span></button>'), '触发键补记号 ▾');
    assert.ok(html.includes('role="menuitemradio"') && html.includes('aria-checked="true"'), '当前项是 menuitemradio ＋ 打勾');
    assert.ok(html.includes('role="menuitem"'), '普通项是 menuitem');
    assert.equal((html.match(/data-ilife-menu-item="/g) || []).length, 6, '六项各带机器值');
    assert.ok(html.includes('-group" role="presentation">文字<'), '分组头');
    assert.ok(html.includes('-sep" role="presentation">'), '发丝线');
    assert.ok(!/<script/i.test(html) && !/\son[a-z]+=/i.test(html), '不产脚本、不产内联事件处理器');
  });

  it('缺槽不出：不给 note／shortcut／group／sep 就不出那几格；打勾位只跟 check 档走', () => {
    const one = renderPopoverMenu({ id: 'm', trigger: 't', items: [{ value: 'v', label: 'l' }] });
    assert.equal(one.includes('-note'), false);
    assert.equal(one.includes('-shortcut'), false);
    assert.equal(one.includes('-group'), false);
    assert.equal(one.includes('-sep'), false);
    assert.equal(one.includes('-tick'), false);
    assert.equal(one.includes('aria-checked'), false);
    const checked = renderPopoverMenu({ id: 'm', trigger: 't', items: [{ value: 'v', label: 'l', kind: 'check' }] });
    assert.ok(checked.includes('aria-checked="false"') && checked.includes('-tick'), 'check 档缺省未选也出打勾位');
    assert.equal(renderPopoverMenu({ ...REAL, align: 'start' }).includes('is-start'), true);
  });

  it('转义：触发键字／菜单名／项文字／次文字／快捷键／分组名逐位转义', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderPopoverMenu({
      id: 'm1', trigger: evil, menuLabel: evil,
      items: [{ value: 'v', label: evil, note: evil, shortcut: evil, group: evil }],
    });
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false);
    assert.ok(html.includes('&lt;script&gt;') && html.includes('&quot;'));
  });

  it('非法入参**逐条**走 BlocksError', () => {
    const ok = { id: 'm', trigger: 't', items: [{ value: 'v', label: 'l' }] };
    assert.equal(throwsBlocks(() => renderPopoverMenu(undefined)), true);
    assert.equal(throwsBlocks(() => renderPopoverMenu([])), true);
    assert.equal(throwsBlocks(() => renderPopoverMenu({ ...ok, id: '' })), true);
    assert.equal(throwsBlocks(() => renderPopoverMenu({ ...ok, id: 'a b' })), true);
    assert.equal(throwsBlocks(() => renderPopoverMenu({ ...ok, trigger: '' })), true);
    assert.equal(throwsBlocks(() => renderPopoverMenu({ ...ok, items: [] })), true, '一枚都没有的菜单不发');
    assert.equal(throwsBlocks(() => renderPopoverMenu({ ...ok, items: [{}] })), true);
    assert.equal(throwsBlocks(() => renderPopoverMenu({ ...ok, items: [{ value: 'v', label: '' }] })), true);
    assert.equal(throwsBlocks(() => renderPopoverMenu({
      ...ok, items: [{ value: 'v', label: 'l' }, { value: 'v', label: 'l2' }],
    })), true, 'value 必须唯一');
    assert.equal(throwsBlocks(() => renderPopoverMenu({ ...ok, items: [{ value: 'v', label: 'l', kind: 'link' }] })), true);
    assert.equal(throwsBlocks(() => renderPopoverMenu({
      ...ok, items: [{ value: 'v', label: 'l', checked: true }],
    })), true, '打勾位只对 kind=check 有效');
    assert.equal(throwsBlocks(() => renderPopoverMenu({ ...ok, align: 'middle' })), true);
    assert.equal(throwsBlocks(() => renderPopoverMenu({ ...ok, form: 'sheet' })), true);
    assert.equal(throwsBlocks(() => renderPopoverMenu({ ...ok, items: [{ value: 'v', label: 'l', sep: 1 }] })), true);
  });

  it('纯函数 ＋ 闭集钉住', () => {
    assert.equal(renderPopoverMenu(REAL), renderPopoverMenu(REAL));
    assert.deepEqual([...MENU_FORMS], ['hug']);
    assert.deepEqual([...MENU_ALIGNS], ['start', 'end']);
    assert.deepEqual([...MENU_KINDS], ['action', 'check', 'danger']);
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

describe('popoverMenu ② 样式纪律', () => {
  const css = stripComments(popoverMenuCss());

  it('全部规则 scope 在 `.ilife-page-ui` 之下、只挂自己的类名', () => {
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 20, '本件规则数不对：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器没 scope 在 .ilife-page-ui：' + sel);
      assert.ok(sel.includes('ilife-block-popover-menu'), '选择器必须挂在件根类之下：' + sel);
    }
    assert.equal(selectors.some((s) => /ilife-block-(sheet|page-head|dialog|drawer-sheet|tooltip)\b/.test(s)), false,
      '不许碰别的件');
  });

  it('零 `:root`／零 `!important`／零新 token 名／`@media` 只判设备能力', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.equal((css.match(/--[a-z0-9-]+\s*:/g) || []).length, 0, '不得定义新 token');
    for (const q of [...css.matchAll(/@media\s*\(([^)]*)\)/g)].map((m) => m[1])) {
      assert.ok(/hover:\s*hover/.test(q) || /prefers-reduced-motion/.test(q), '媒体查询只许判设备能力：' + q);
    }
  });

  it('**零 `box-shadow`** ＋ 锚定定位那道门（`@supports` 里两条能力查询与运行时同源）', () => {
    assert.equal(css.includes('box-shadow'), false, '浮层不许靠投影表示「浮在上面」');
    assert.equal(popoverMenuCss().includes(skinVar('shadow')), false);
    assert.equal(popoverMenuCss().includes(skinVar('shadow-pop')), false);
    assert.match(css, /border:2px solid color-mix\(/, '第二手段之一：粗边');
    assert.match(css, /outline:3px solid color-mix\(/, '第二手段之二：零模糊的外圈晕');
    assert.ok(css.includes('@supports (' + MENU_ANCHOR_QUERY + ')'), '锚定定位在能力查询之内');
    assert.ok(css.includes('@supports (' + MENU_AREA_QUERY + ')'), '第二条能力查询也在');
    assert.ok(css.includes('position-area:bottom span-left'), '贴右档');
    assert.ok(css.includes('position-area:bottom span-right'), '贴左档');
    assert.ok(css.includes('position-try-fallbacks:flip-block,flip-inline'), '贴不下要翻边');
    /* CSS 的能力查询串与运行时读的是同一份常量（两边判据必须说同一件事） */
    const js = buildPopoverMenuJs();
    assert.ok(js.includes(JSON.stringify(MENU_ANCHOR_QUERY)) && js.includes(JSON.stringify(MENU_AREA_QUERY)),
      '运行时读的能力查询串与 CSS 同源');
  });

  it('只经 `skinVar()` 读皮肤', () => {
    const spans = skinVarSpans(assert, popoverMenuCss(), skinVar);
    assert.ok(spans.length >= 20, '读皮肤的处数不对：' + spans.length);
    assert.equal(cutSpans(popoverMenuCss(), spans).includes('var(--'), false, '手写了 var(--…)');
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => '--ilife-' + k));
    for (const n of new Set([...popoverMenuCss().matchAll(/var\(\s*(--ilife-[a-z0-9-]+)/g)].map((m) => m[1]))) {
      assert.ok(known.has(n), '名单外的 token：' + n);
    }
  });

  it('对比地板：文字色三套皮肤下都对底 ≥4.5:1（含危险项那档）', () => {
    for (const name of SKIN_NAMES) {
      for (const t of ['ink', 'ink-2', 'accent-text', 'danger']) {
        for (const g of ['ground', 'surface', 'surface-2', 'danger-soft']) {
          const r = contrast(SKINS[name].values[t], SKINS[name].values[g]);
          assert.ok(r >= 4.5, name + '：' + t + ' 在 ' + g + ' 上只有 ' + r.toFixed(2) + ':1');
        }
      }
    }
  });

  it('几何常量：项高 ≥44、相邻 8px 缝、面板宽上限、焦点与减动效都在', () => {
    assert.equal(MENU_MIN_HEIGHT_PX, 44);
    assert.equal(MENU_GAP_PX, 8);
    assert.ok(css.includes('min-height:44px'), '命中高度');
    assert.ok(css.includes('margin-top:8px'), '相邻命中区间距');
    assert.ok(css.includes('width:min(262px, calc(100% - 12px - 12px))'), '面板宽上限与左右 12px 边距');
    assert.match(css, /:focus-visible\{outline:2px solid /, '焦点地板');
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{/, '减动效那一档');
    assert.match(css, /transform:scale\(\.98\)/, '按下有真形');
  });

  it('缺省前缀 `ilife-`；换前缀时 scope 与槽类一起换', () => {
    assert.match(popoverMenuCss(), /^\.ilife-page-ui \.ilife-block-popover-menu\{/m);
    const x = stripComments(popoverMenuCss({ prefix: 'x-' }));
    assert.ok(x.includes('.x-block-popover-menu-panel') && x.includes('.x-block-popover-menu-trigger'));
    assert.equal(x.includes('.ilife-'), false);
  });

  it('层红线：`dist/components/popover-menu/**` 零 DOM', () => {
    const dir = join(PKG, 'dist', 'components', 'popover-menu');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 5, '编译产物不全：' + files.length);
    const strip = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const f of files) {
      const code = strip(readFileSync(f, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f.replace(PKG, '') + ' 里出现 ' + needle);
      }
    }
  });
});

/* ── ③ 加法式 ＋ ⑤ 皮肤矩阵 ────────────────────────────────────────── */

describe('popoverMenu ③ 加法式', () => {
  it('不挂本件的页：一个本件字节都没有，两次渲染逐字节相同；不从根出口出', () => {
    const shell = () => renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const off = shell();
    assert.equal(off.includes(MENU_CLASS), false);
    assert.equal(off, shell());
    assert.equal(root.renderPopoverMenu, undefined);
    assert.equal(root.popoverMenuCss, undefined);
  });
});

describe('popoverMenu ⑤ 皮肤矩阵（三套皮肤下标记逐字节相同）', () => {
  const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
    + '<div class="ilife-page-ui ' + skinClass(name) + '">' + renderPopoverMenu(REAL) + '</div>';
  const withoutSkin = (name) => pageOf(name)
    .replace(skinCss({ skins: [name] }), '').replace(skinClass(name), '');

  it('差异只落在皮肤样式段与皮肤类上，标记面逐字节相同', () => {
    const bare = withoutSkin(SKIN_NAMES[0]);
    for (const name of SKIN_NAMES) assert.equal(withoutSkin(name), bare, name + ' 的标记面不同');
    assert.notEqual(pageOf(SKIN_NAMES[0]), pageOf(SKIN_NAMES[1]), '两套皮肤的页产物必须真的不同');
    assert.equal(renderPopoverMenu(REAL).includes('skin-'), false);
  });
});

/* ── ④ 真机两档 ────────────────────────────────────────────────────── */

const PAGE_CSS = () => 'html,body{margin:0}\n' + skinCss() + '\n' + popoverMenuCss() + '\n'
  + '.stage{box-sizing:border-box;padding:16px}\n'
  + '.tools{display:flex;flex-wrap:wrap;align-items:center;gap:8px}\n'
  + '.tools .rt{margin-left:auto}\n';

/** 一页：贴右的菜单（工具行右端）＋ 贴左的菜单（工具行左端）＋ 一个没有运行时的副本。 */
function fixture(withRuntime) {
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>popover-menu 两档</title>\n<style>\n'
    + PAGE_CSS() + '</style></head>\n<body>\n'
    + '<div class="stage ilife-page-ui ' + skinClass('paper') + '">'
    + '<div class="tools">'
    + renderPopoverMenu({ ...REAL, id: 'menu-left', trigger: '视图', align: 'start' })
    + '<span class="rt">' + renderPopoverMenu(REAL) + '</span>'
    + '</div>'
    + '<p style="height:600px;margin:0"></p>'
    + '</div>\n'
    + (withRuntime ? '<script>' + buildPopoverMenuJs() + '</script>\n' : '')
    + '</body></html>';
}

const GEOM = '(function(){'
  + 'function box(el){var r=el.getBoundingClientRect();'
  + 'return {l:Math.round(r.left),r:Math.round(r.right),t:Math.round(r.top),b:Math.round(r.bottom),'
  + 'w:Math.round(r.width),h:Math.round(r.height)};}'
  + 'var p=document.getElementById("menu-copy"), t=document.getElementById("menu-copy-btn");'
  + 'var items=p.querySelectorAll(".ilife-block-popover-menu-item");'
  + 'var gaps=[];for(var i=1;i<items.length;i++){'
  + 'gaps.push(Math.round(items[i].getBoundingClientRect().top-items[i-1].getBoundingClientRect().bottom));}'
  + 'var cs=getComputedStyle(p);'
  + 'return {open:p.matches(":popover-open"),panel:box(p),trigger:box(t),'
  + 'anchorAttr:t.getAttribute("style"),expanded:t.getAttribute("aria-expanded"),'
  + 'itemH:items.length?Math.round(items[0].getBoundingClientRect().height):0,'
  + 'gapMin:gaps.length?Math.min.apply(null,gaps):0,'
  + 'shadow:cs.boxShadow,scrim:getComputedStyle(p,"::backdrop").backgroundColor,'
  + 'vw:document.documentElement.clientWidth,vh:document.documentElement.clientHeight,'
  + 'docSw:document.documentElement.scrollWidth,docCw:document.documentElement.clientWidth,'
  + 'firstFocus:(document.activeElement&&document.activeElement.getAttribute("data-ilife-menu-item"))||""};}())';

const TRIGGER_CENTER = '(function(){var t=document.getElementById("menu-copy-btn");'
  + 'var r=t.getBoundingClientRect();return [Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)];}())';

describe('popoverMenu ④ 真机两档（headless Chrome ＋ CDP）', () => {
  it('贴住按钮、不越界、命中区 ≥44、Esc 关、选中后焦点归还；**没有运行时也开得出来**', async (t) => {
    const p = await startBrowser({ portOffset: 8 });
    if (p === null) return t.skip('本机无 Chrome／Chromium：真机四条退化为 ② 的确定性几何判据');
    try {
      const readings = [];
      for (const [w, h] of [[390, 700], [1280, 900]]) {
        await p.at(fixture(true), { width: w, height: h });
        const why = w + '×' + h + '：';
        const [cx, cy] = await p.ev(TRIGGER_CENTER);
        await p.mouse(cx, cy);
        const m = await p.ev(GEOM);
        assert.equal(m.open, true, why + '点触发键必须弹出菜单');
        assert.equal(m.expanded, 'true', why + 'aria-expanded 没同步');
        assert.ok(m.panel.l >= 0 && m.panel.r <= m.vw, why + '面板横向越界：' + JSON.stringify(m.panel));
        assert.ok(m.panel.t >= 0 && m.panel.b <= m.vh, why + '面板纵向越界：' + JSON.stringify(m.panel));
        assert.ok(Math.abs(m.panel.r - m.trigger.r) <= 2, why + 'align=end 时面板右缘要贴触发键右缘');
        assert.equal(m.shadow, 'none', why + '不许有投影：' + m.shadow);
        assert.ok(m.itemH >= MENU_MIN_HEIGHT_PX, why + '项高 ' + m.itemH + ' 小于 44');
        assert.ok(m.gapMin >= MENU_GAP_PX, why + '相邻项间距 ' + m.gapMin + ' 小于 8');
        assert.equal(m.docSw <= m.docCw, true, why + '页面横向溢出');
        assert.ok(String(m.anchorAttr).includes('anchor-name:'), why + '逐实例锚名没写上');
        /* 键盘走位 ＋ 选中 ＋ 焦点归还 */
        await p.key('ArrowDown');
        const moved = await p.ev('(document.activeElement&&document.activeElement.getAttribute("data-ilife-menu-item"))||""');
        assert.notEqual(moved, m.firstFocus, why + '↓ 要把焦点搬到下一项（停在 ' + moved + '）');
        await p.ev('document.querySelectorAll("#menu-copy .ilife-block-popover-menu-item")[1].click()');
        const after = await p.ev('(function(){var p=document.getElementById("menu-copy");var t=document.getElementById("menu-copy-btn");'
          + 'return {open:p.matches(":popover-open"),expanded:t.getAttribute("aria-expanded"),'
          + 'active:(document.activeElement&&document.activeElement.id)||document.activeElement.tagName};}())');
        assert.equal(after.open, false, why + '选中之后要关掉');
        assert.equal(after.expanded, 'false', why + 'aria-expanded 要回落');
        assert.equal(after.active, 'menu-copy-btn', why + '选中之后焦点要还给触发键，实际 ' + after.active);
        const evts = await p.evts();
        const sel = evts.filter((e) => e.type === 'ilife:menu-select');
        assert.equal(sel.length, 1, why + '选中事件恰好一条：' + JSON.stringify(sel));
        assert.equal(sel[0].detail.value, 'markdown', why + '事件带机器值');
        /* Esc 关 ＋ 焦点归还 */
        await p.mouse(cx, cy);
        assert.equal(await p.ev('document.getElementById("menu-copy").matches(":popover-open")'), true, why + '再开一次');
        await p.key('Escape');
        const esc = await p.ev('(function(){var p=document.getElementById("menu-copy");var t=document.getElementById("menu-copy-btn");'
          + 'return {open:p.matches(":popover-open"),expanded:t.getAttribute("aria-expanded"),'
          + 'active:(document.activeElement&&document.activeElement.id)||document.activeElement.tagName};}())');
        assert.equal(esc.open, false, why + 'Esc 必须能关');
        assert.equal(esc.active, 'menu-copy-btn', why + 'Esc 之后焦点要还给触发键，实际 ' + esc.active);
        readings.push(w + '：面板 ' + JSON.stringify(m.panel) + '｜触发键右缘 ' + m.trigger.r + '／面板右缘 ' + m.panel.r
          + '｜项高 ' + m.itemH + '／缝 ' + m.gapMin + '｜shadow=' + m.shadow
          + '｜选中后 focus=' + after.active + '，Esc 后 focus=' + esc.active);
      }
      /* **零脚本可开**：这一页不装运行时，popovertarget 是浏览器给的 */
      await p.at(fixture(false), { width: 1280, height: 900 });
      const [nx, ny] = await p.ev(TRIGGER_CENTER);
      await p.mouse(nx, ny);
      assert.equal(await p.ev('document.getElementById("menu-copy").matches(":popover-open")'), true,
        '没有运行时也必须开得出来（popovertarget）');
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
      console.log('  [真机读数] ' + readings.join('\n  [真机读数] '));
    } finally { p.close(); }
  });
});
