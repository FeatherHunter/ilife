/** drawer-sheet（底部弹层 · 形态 C 多选 ＋ 完成 N 项）· **判据件**。
 *
 *  断言对象是本件自己的唯一出口：`dist/components/drawer-sheet/index.js`。
 *  四类（契约 §五）＋ 本族三处硬判据（零阴影的第二手段／窄档不贴边／关掉焦点归还），
 *  另加本件特有的三条：**清单滚而完成键不动**、**计数与键上的字一起重画**、**一个都没勾就按不动**。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DRAWER_ATTR, DRAWER_CLASS, DRAWER_COUNT_ATTR, DRAWER_DONE_ATTR, DRAWER_DONE_TEMPLATE, DRAWER_EDGES,
  DRAWER_FORMS, DRAWER_GAP_PX, DRAWER_MAX_WIDTH_PX, DRAWER_MIN_HEIGHT_PX, DRAWER_OPEN_ATTR,
  DRAWER_OPT_ATTR, DRAWER_OPTION_MIN_HEIGHT_PX, DRAWER_ZERO_NOTE, buildDrawerSheetJs, drawerSheetCss,
  renderDrawerOpener, renderDrawerSheet,
} from '../dist/components/drawer-sheet/index.js';
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

/** 一页真实形状的底部弹层（记账选账户）。 */
const REAL = {
  id: 'dw-account',
  title: '这笔记到哪个账户',
  sub: '可多选',
  options: [
    { value: 'cmb', label: '招行储蓄卡', note: '常用', meta: '¥12,480.00', checked: true },
    { value: 'alipay', label: '支付宝', meta: '¥860.00' },
    { value: 'cash', label: '现金', meta: null },
    { value: 'old', label: '已注销的卡', note: '卡已注销，记上去也对不上账', disabled: true },
  ],
  hint: '勾几个都行；一条记录可以同时算两个账户。',
  summary: '覆盖 7 条记录',
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('drawerSheet ① 渲染契约', () => {
  it('骨架：真 <dialog> ＋ 抓手 ＋ 标题/副语 ＋ 关闭键 ＋ 候选项清单 ＋ 钉住的脚条', () => {
    const html = renderDrawerSheet(REAL);
    assert.match(html, /^<dialog class="ilife-block-drawer-sheet is-multi edge-bottom" id="dw-account"/, html.slice(0, 100));
    assert.ok(html.includes(DRAWER_ATTR + '="dw-account"'), '发现锚＝面板 id');
    assert.ok(html.includes('aria-labelledby="dw-account-title"') && html.includes('aria-describedby="dw-account-count"'),
      '标题与脚条计数都在可达名里');
    assert.ok(html.includes('-grab" aria-hidden="true"'), '抓手是装饰位');
    assert.ok(html.includes('<h2 class="ilife-block-drawer-sheet-title" id="dw-account-title">这笔记到哪个账户</h2>'));
    assert.ok(html.includes('aria-label="关闭"'), '关闭键有无障碍名');
    assert.equal((html.match(/<label class="ilife-block-drawer-sheet-opt"/g) || []).length, 4, '四项各一行 label');
    assert.equal((html.match(/type="checkbox"/g) || []).length, 4, '每项一枚真勾选框');
    assert.ok(html.includes('<input class="ilife-block-drawer-sheet-box" type="checkbox" checked>'), '默认勾上的那项带 checked');
    assert.ok(html.includes('disabled>') || html.includes(' disabled>'), '禁用项落 disabled');
    assert.ok(html.includes('>—<'), '缺值写成 —');
    assert.ok(html.includes('已选 <b ' + DRAWER_COUNT_ATTR + '="">1</b> 个'), '脚条计数＝初始勾选数');
    assert.ok(html.includes('>完成 1 项<'), '完成键上的数是活的');
    assert.equal(html.includes('aria-disabled="true"'), false, '有一项勾着时完成键可用（不许无差别禁用）');
    assert.ok(!/<script/i.test(html) && !/\son[a-z]+=/i.test(html), '不产脚本、不产内联事件处理器');
  });

  it('空数组＝设计过的空态（出 emptyLine，不留空壳）；不给 emptyLine 用组件那句现成话', () => {
    const empty = renderDrawerSheet({ id: 'd', title: 't', options: [] });
    assert.ok(empty.includes('-empty'), '空态要出那一格');
    assert.ok(empty.includes('这里还没有可选项'), '用现成话');
    assert.equal(empty.includes('-opt'), false, '空态里不许有候选项');
    assert.ok(empty.includes('disabled'), '空的时候完成键按不动');
    assert.ok(renderDrawerSheet({ id: 'd', title: 't', options: [], emptyLine: '这一类还没有可选项' }).includes('这一类还没有可选项'));
  });

  it('side 档＝不出抓手；edge 是形态参数（不是媒体查询）', () => {
    const side = renderDrawerSheet({ ...REAL, edge: 'side' });
    assert.ok(side.includes('edge-side'), '档上类名');
    assert.equal(side.includes('-grab'), false, '贴右档不画抓手');
    assert.deepEqual([...DRAWER_EDGES], ['bottom', 'side']);
  });

  it('转义：标题／副语／选项文字／说明／缺省完成键模板逐位转义', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderDrawerSheet({
      id: 'd1', title: evil, sub: evil, hint: evil, summary: evil, emptyLine: evil,
      options: [{ value: 'v', label: evil, note: evil, meta: evil }],
    });
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false);
    assert.ok(html.includes('&lt;script&gt;') && html.includes('&quot;'));
  });

  it('触发键：带 data-ilife-drawer-open ＋ aria-haspopup', () => {
    const html = renderDrawerOpener({ sheetId: REAL.id, text: '选账户' });
    assert.ok(html.startsWith('<button class="ilife-block-drawer-sheet-opener" type="button"'), html.slice(0, 70));
    assert.ok(html.includes(DRAWER_OPEN_ATTR + '="dw-account"') && html.includes('aria-haspopup="dialog"'));
  });

  it('非法入参**逐条**走 BlocksError（含「禁用项必须说明为什么」这条本件特权）', () => {
    const ok = { id: 'd', title: 't', options: [{ value: 'v', label: 'l' }] };
    assert.equal(throwsBlocks(() => renderDrawerSheet(undefined)), true);
    assert.equal(throwsBlocks(() => renderDrawerSheet([])), true);
    assert.equal(throwsBlocks(() => renderDrawerSheet({ ...ok, id: '' })), true);
    assert.equal(throwsBlocks(() => renderDrawerSheet({ ...ok, id: 'a b' })), true);
    assert.equal(throwsBlocks(() => renderDrawerSheet({ ...ok, title: '' })), true);
    assert.equal(throwsBlocks(() => renderDrawerSheet({ ...ok, options: null })), true);
    assert.equal(throwsBlocks(() => renderDrawerSheet({ ...ok, options: [{}] })), true);
    assert.equal(throwsBlocks(() => renderDrawerSheet({ ...ok, options: [{ value: 'v', label: '' }] })), true);
    assert.equal(throwsBlocks(() => renderDrawerSheet({
      ...ok, options: [{ value: 'v', label: 'l' }, { value: 'v', label: 'l2' }],
    })), true, 'value 必须唯一');
    assert.equal(throwsBlocks(() => renderDrawerSheet({
      ...ok, options: [{ value: 'v', label: 'l', disabled: true }],
    })), true, '禁用项必须给 note 说明为什么按不动');
    assert.doesNotThrow(() => renderDrawerSheet({
      ...ok, options: [{ value: 'v', label: 'l', disabled: true, note: '卡已注销' }],
    }));
    assert.equal(throwsBlocks(() => renderDrawerSheet({ ...ok, options: [{ value: 'v', label: 'l', meta: 7 }] })), true);
    assert.equal(throwsBlocks(() => renderDrawerSheet({ ...ok, edge: 'top' })), true);
    assert.equal(throwsBlocks(() => renderDrawerSheet({ ...ok, form: 'single' })), true);
    assert.equal(throwsBlocks(() => renderDrawerSheet({ ...ok, doneLabel: '完成' })), true, '模板必须含 {n}');
    assert.equal(throwsBlocks(() => renderDrawerSheet({ ...ok, open: 1 })), true);
    assert.equal(throwsBlocks(() => renderDrawerOpener({ sheetId: 'd', text: '' })), true);
    assert.equal(throwsBlocks(() => renderDrawerOpener(undefined)), true);
    assert.equal(renderDrawerSheet(ok).includes('完成 0 项'), true, '一项都没勾时键上写 0 项');
  });

  it('纯函数：同入参两次逐字节相同', () => {
    assert.equal(renderDrawerSheet(REAL), renderDrawerSheet(REAL));
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

describe('drawerSheet ② 样式纪律', () => {
  const css = stripComments(drawerSheetCss());

  it('全部规则 scope 在 `.ilife-page-ui` 之下、只挂自己的类名', () => {
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 25, '本件规则数不对：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器没 scope 在 .ilife-page-ui：' + sel);
      assert.ok(sel.includes('ilife-block-drawer-sheet'), '选择器必须挂在件根类之下：' + sel);
    }
    assert.equal(selectors.some((s) => /ilife-block-(sheet|page-head|dialog|popover-menu|tooltip)\b/.test(s)), false,
      '不许碰别的件（加法式）');
  });

  it('零 `:root`／零 `!important`／零新 token 名／`@media` 只判设备能力', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.equal((css.match(/--[a-z0-9-]+\s*:/g) || []).length, 0, '不得定义新 token');
    for (const q of [...css.matchAll(/@media\s*\(([^)]*)\)/g)].map((m) => m[1])) {
      assert.ok(/hover:\s*hover/.test(q) || /prefers-reduced-motion/.test(q), '媒体查询只许判设备能力：' + q);
    }
  });

  it('**零 `box-shadow`**：零阴影皮肤下靠「粗边 ＋ 外圈晕 ＋ 更暗遮罩」立起来', () => {
    assert.equal(css.includes('box-shadow'), false, '浮层不许靠投影表示「浮在上面」');
    assert.equal(drawerSheetCss().includes(skinVar('shadow')), false);
    assert.equal(drawerSheetCss().includes(skinVar('shadow-pop')), false);
    assert.match(css, /border:2px solid color-mix\(/, '第二手段之一：粗边');
    assert.match(css, /outline:3px solid color-mix\(/, '第二手段之二：零模糊的外圈晕');
    assert.match(css, /::backdrop\{background:color-mix\(/, '第二手段之三：更暗的遮罩');
  });

  it('只经 `skinVar()` 读皮肤（逐处与兜底链逐字相同）', () => {
    const spans = skinVarSpans(assert, drawerSheetCss(), skinVar);
    assert.ok(spans.length >= 20, '读皮肤的处数不对：' + spans.length);
    const rest = cutSpans(drawerSheetCss(), spans);
    assert.equal(rest.includes('var(--'), false, '手写了 var(--…)');
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => '--ilife-' + k));
    for (const n of new Set([...drawerSheetCss().matchAll(/var\(\s*(--ilife-[a-z0-9-]+)/g)].map((m) => m[1]))) {
      assert.ok(known.has(n), '名单外的 token：' + n);
    }
  });

  it('对比地板：文字色三套皮肤下都对底 ≥4.5:1，实底完成键上的字也够', () => {
    for (const name of SKIN_NAMES) {
      for (const t of ['ink', 'ink-2']) {
        for (const g of ['ground', 'surface', 'surface-2', 'accent-soft']) {
          const r = contrast(SKINS[name].values[t], SKINS[name].values[g]);
          assert.ok(r >= 4.5, name + '：' + t + ' 在 ' + g + ' 上只有 ' + r.toFixed(2) + ':1');
        }
      }
      const r = contrast(SKINS[name].values['accent-ink'], SKINS[name].values['accent-text']);
      assert.ok(r >= 4.5, name + '：accent-ink 在 accent-text 上只有 ' + r.toFixed(2) + ':1');
    }
  });

  it('几何常量：清单滚、脚条不滚、行高与缝都在样式段里', () => {
    assert.equal(DRAWER_OPTION_MIN_HEIGHT_PX, 52);
    assert.equal(DRAWER_GAP_PX, 8);
    assert.equal(DRAWER_MAX_WIDTH_PX, 520);
    assert.ok(css.includes('min(520px, calc(100% - 32px))'), '贴底档宽上限与两边 16px 边距');
    assert.ok(css.includes('margin:auto auto 0'), '贴底：底边贴齐');
    assert.match(css, /-body\{flex:1 1 auto;min-height:0;overflow:auto;/, '清单那一格滚');
    assert.match(css, /-foot\{flex:0 0 auto;/, '脚条不滚');
    assert.ok(css.includes('min-height:52px'), '候选项命中高度');
    assert.ok(css.includes('gap:8px'), '相邻命中区间距');
    assert.match(css, /:focus-visible\{outline:2px solid /, '焦点地板');
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{/, '减动效那一档');
  });

  it('缺省前缀 `ilife-`；换前缀时 scope 与槽类一起换', () => {
    assert.match(drawerSheetCss(), /^\.ilife-page-ui dialog\.ilife-block-drawer-sheet\{/m);
    const x = stripComments(drawerSheetCss({ prefix: 'x-' }));
    assert.ok(x.includes('.x-page-ui dialog.x-block-drawer-sheet{') && x.includes('.x-block-drawer-sheet-title'));
    assert.equal(x.includes('.ilife-'), false);
  });

  it('层红线：`dist/components/drawer-sheet/**` 零 DOM', () => {
    const dir = join(PKG, 'dist', 'components', 'drawer-sheet');
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

describe('drawerSheet ③ 加法式', () => {
  it('不挂本件的页：一个本件字节都没有，两次渲染逐字节相同', () => {
    const shell = () => renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const off = shell();
    assert.equal(off.includes(DRAWER_CLASS), false);
    assert.equal(off, shell());
    assert.equal(root.renderDrawerSheet, undefined, '组件层不得从根出口出');
  });
});

describe('drawerSheet ⑤ 皮肤矩阵（三套皮肤下标记逐字节相同）', () => {
  const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
    + '<div class="ilife-page-ui ' + skinClass(name) + '">' + renderDrawerSheet(REAL) + '</div>';
  const withoutSkin = (name) => pageOf(name)
    .replace(skinCss({ skins: [name] }), '').replace(skinClass(name), '');

  it('差异只落在皮肤样式段与皮肤类上，标记面逐字节相同', () => {
    const bare = withoutSkin(SKIN_NAMES[0]);
    for (const name of SKIN_NAMES) assert.equal(withoutSkin(name), bare, name + ' 的标记面不同');
    assert.notEqual(pageOf(SKIN_NAMES[0]), pageOf(SKIN_NAMES[2]), '两套皮肤的页产物必须真的不同');
    assert.equal(renderDrawerSheet(REAL).includes('skin-'), false);
  });
});

/* ── ④ 真机两档 ────────────────────────────────────────────────────── */

/** 一页：一枚触发键 ＋ 一个候选很多的弹层（清单必然高过视口）＋ 一个空态弹层。 */
function fixture() {
  const many = {
    id: 'dw-many', title: '这笔记到哪个账户', sub: '可多选',
    options: new Array(12).fill(0).map((_, i) => ({
      value: 'a' + i, label: '账户 ' + (i + 1), meta: '¥' + (100 + i) + '.00', checked: i === 0,
    })),
    summary: '覆盖 7 条记录',
  };
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>drawer-sheet 两档</title>\n<style>\n'
    + 'html,body{margin:0}\n' + skinCss() + '\n' + drawerSheetCss() + '\n'
    + '.stage{box-sizing:border-box;padding:16px}\n</style></head>\n<body>\n'
    + '<div class="stage ilife-page-ui ' + skinClass('paper') + '">'
    + renderDrawerOpener({ sheetId: 'dw-many', text: '选账户' })
    + renderDrawerSheet(many)
    + renderDrawerOpener({ sheetId: 'dw-empty', text: '空态' })
    + renderDrawerSheet({ id: 'dw-empty', title: '没有可选项时', options: [] })
    + '</div>\n<script>' + buildDrawerSheetJs() + '</script>\n</body></html>';
}

const MEASURE = '(function(){'
  + 'var d=document.getElementById("dw-many");'
  + 'var body=d.querySelector(".ilife-block-drawer-sheet-body"), foot=d.querySelector(".ilife-block-drawer-sheet-foot");'
  + 'var done=d.querySelector(".ilife-block-drawer-sheet-done"), cnt=d.querySelector("[' + DRAWER_COUNT_ATTR + ']");'
  + 'var rows=d.querySelectorAll(".ilife-block-drawer-sheet-opt");'
  + 'var r=d.getBoundingClientRect(), fr=foot.getBoundingClientRect(), dr=done.getBoundingClientRect();'
  + 'var gaps=[];for(var i=1;i<rows.length;i++){'
  + 'gaps.push(Math.round(rows[i].getBoundingClientRect().top-rows[i-1].getBoundingClientRect().bottom));}'
  + 'return {open:d.open,modal:!!d.matches(":modal"),'
  + 'box:{l:Math.round(r.left),r:Math.round(r.right),t:Math.round(r.top),b:Math.round(r.bottom),h:Math.round(r.height)},'
  + 'foot:{t:Math.round(fr.top),b:Math.round(fr.bottom)},done:{w:Math.round(dr.width),h:Math.round(dr.height)},'
  + 'rowH:rows.length?Math.round(rows[0].getBoundingClientRect().height):0,gapMin:gaps.length?Math.min.apply(null,gaps):0,'
  + 'bodyClient:body.clientHeight,bodyScroll:body.scrollHeight,count:cnt.textContent,'
  + 'doneText:done.textContent,disabled:done.disabled,'
  + 'shadow:getComputedStyle(d).boxShadow,scrim:getComputedStyle(d,"::backdrop").backgroundColor,'
  + 'docSw:document.documentElement.scrollWidth,docCw:document.documentElement.clientWidth};}())';

const OPEN = (i) => 'document.querySelectorAll("[data-ilife-drawer-open]")[' + i + '].click()';

describe('drawerSheet ④ 真机两档（headless Chrome ＋ CDP）', () => {
  it('390／1280：清单滚而完成键可见、计数与键上的字一起变、一个都没勾按不动、Esc 关、焦点归还', async (t) => {
    const p = await startBrowser({ portOffset: 6 });
    if (p === null) return t.skip('本机无 Chrome／Chromium：真机四条退化为 ② 的确定性几何判据');
    try {
      const readings = [];
      for (const [w, h] of [[390, 700], [1280, 900]]) {
        await p.at(fixture(), { width: w, height: h });
        const why = w + '×' + h + '：';
        await p.ev(OPEN(0));
        const m = await p.ev(MEASURE);
        assert.equal(m.open, true, why + '触发键点下去必须真的开');
        assert.equal(m.modal, true, why + '真模态');
        assert.ok(m.box.l >= 16 && m.box.r <= w - 16, why + '弹层贴边了：l=' + m.box.l + ' r=' + m.box.r);
        assert.ok(m.box.h <= h - 32 + 1, why + '高 ' + m.box.h + ' 没被封在视口内');
        assert.ok(m.bodyScroll > m.bodyClient, why + '清单没有内部滚');
        /* 贴底档底边贴齐视口底（这是「底部弹层」的形）：脚条整体仍在视口里。 */
        assert.ok(m.foot.b <= h + 1 && m.foot.t >= 0, why + '脚条被滚走了：' + JSON.stringify(m.foot));
        assert.ok(m.done.h >= DRAWER_MIN_HEIGHT_PX && m.done.w >= DRAWER_MIN_HEIGHT_PX,
          why + '完成键 ' + m.done.w + '×' + m.done.h + ' 小于 44×44');
        assert.ok(m.rowH >= DRAWER_OPTION_MIN_HEIGHT_PX, why + '候选项高 ' + m.rowH + ' 小于 52');
        assert.ok(m.gapMin >= DRAWER_GAP_PX, why + '相邻命中区间距 ' + m.gapMin + ' 小于 8');
        assert.equal(m.shadow, 'none', why + '不许有投影：' + m.shadow);
        assert.notEqual(m.scrim, 'rgba(0, 0, 0, 0)', why + '遮罩没落下');
        assert.equal(m.docSw <= m.docCw, true, why + '页面横向溢出');
        /* 勾一个：计数、键上的字、可用档三处一起重画 */
        assert.ok(m.doneText.includes('1'), why + '初始键上的字＝' + m.doneText);
        await p.ev('document.querySelectorAll(".ilife-block-drawer-sheet-opt input")[1].click()');
        const two = await p.ev(MEASURE);
        assert.ok(two.count.includes('2'), why + '计数没跟着变：' + two.count);
        assert.ok(two.doneText.includes('2'), why + '键上的字没跟着变：' + two.doneText);
        assert.equal(two.disabled, false, why + '有勾选时完成键必须可用');
        /* 全取消：一个都没勾 ⇒ 按键不动 ＋ 脚条写出为什么 */
        await p.ev('(function(){var b=document.querySelectorAll(".ilife-block-drawer-sheet-opt input");'
          + 'for(var i=0;i<b.length;i+=1){ if(b[i].checked) b[i].click(); } return true;}())');
        const zero = await p.ev(MEASURE);
        assert.ok(zero.count.includes('0'), why + '计数没归零：' + zero.count);
        assert.equal(zero.disabled, true, why + '一个都没勾时完成键必须按不动');
        const zeroNote = await p.ev('(function(){var z=document.querySelector("[data-ilife-drawer-zero]");'
          + 'return z && !z.hidden ? z.textContent : "";}())');
        assert.equal(zeroNote, DRAWER_ZERO_NOTE, why + '脚条上要写出为什么按不动');
        /* Esc 关掉 ＋ 焦点归还 */
        await p.key('Escape');
        const closed = await p.ev('(function(){var d=document.getElementById("dw-many");var ae=document.activeElement;'
          + 'return {open:d.open,active:(ae&&ae.getAttribute("data-ilife-drawer-open"))||ae.tagName};}())');
        assert.equal(closed.open, false, why + 'Esc 必须能关');
        assert.equal(closed.active, 'dw-many', why + '关掉后焦点要回到触发键，实际停在 ' + closed.active);
        readings.push(w + '：弹层 ' + m.box.l + '..' + m.box.r + '（高 ' + m.box.h + '）｜清单 ' + m.bodyScroll + ' > ' + m.bodyClient
          + '，脚条 b=' + m.foot.b + ' ≤ ' + (h - 16) + '｜行高 ' + m.rowH + '／缝 ' + m.gapMin
          + '｜shadow=' + m.shadow + '｜勾一个后 count=' + JSON.stringify(two.count) + '／done=' + JSON.stringify(two.doneText)
          + '｜Esc 后焦点=' + closed.active);
      }
      /* 空态那一档也过一遍真机（不留空壳） */
      await p.at(fixture(), { width: 390, height: 700 });
      await p.ev(OPEN(1));
      const emptyOpen = await p.ev('document.getElementById("dw-empty").open');
      assert.equal(emptyOpen, true, '空态弹层也要开得出来');
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
      console.log('  [真机读数] ' + readings.join('\n  [真机读数] '));
    } finally { p.close(); }
  });
});
