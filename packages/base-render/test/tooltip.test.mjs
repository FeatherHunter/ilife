/** tooltip（气泡说明 · 形态 B 宽气泡带「为什么重要」）· **判据件**。
 *
 *  断言对象是本件自己的唯一出口：`dist/components/tooltip/index.js`。
 *  四类（契约 §五）＋ 本族三处硬判据 ＋ 本件特有的三条：
 *   **三条通路**（点击／聚焦／悬停都出得来）／**宽气泡不越界**／**命中盒 ≥44×44**（词在行里不撑行）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TOOLTIP_ATTR, TOOLTIP_BADGES, TOOLTIP_BUBBLE_ATTR, TOOLTIP_CLASS, TOOLTIP_FORMS, TOOLTIP_HINT,
  TOOLTIP_HIT_PX, buildTooltipJs, renderTooltip, tooltipCss,
} from '../dist/components/tooltip/index.js';
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

/** 一条真实形状的气泡说明（均摊那条口径）。 */
const REAL = {
  id: 'tip-share',
  word: '均摊',
  title: '「均摊」是怎么算的',
  text: '一笔年费按 12 个月摊开，每月只进 20 元，不是把 240 元整笔压在买的那一个月。',
  why: '不这么算，月度对比会把「年费那个月」当成失控的月份。',
  badge: 'caliber',
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('tooltip ① 渲染契约', () => {
  it('骨架：词（真按钮 ＋ 描述关系 ＋ 锚名）＋ 气泡（popover ＋ role=tooltip ＋ 位置锚）', () => {
    const html = renderTooltip(REAL);
    assert.match(html, /^<span class="ilife-block-tooltip is-wide" data-ilife-tooltip="tip-share">/, html.slice(0, 90));
    assert.ok(html.includes('popovertarget="tip-share"'), '词用原生 popovertarget（零脚本也点得开）');
    assert.ok(html.includes('aria-describedby="tip-share"'), '屏读器能读到这条说明');
    assert.ok(html.includes('style="anchor-name:--tooltip-tip-share"'), '逐实例锚名在词上（不带 ilife- 前缀）');
    assert.ok(html.includes('id="tip-share" popover="auto" role="tooltip"'), '气泡是 popover ＋ tooltip');
    assert.ok(html.includes('style="position-anchor:--tooltip-tip-share"'), '气泡写同一个锚名');
    assert.ok(html.includes('-badge">口径<'), '眉标取现成话');
    assert.ok(html.includes('-title">「均摊」是怎么算的<'), '小标题');
    assert.ok(html.includes('-text">一笔年费按 12 个月摊开'), '解释那一段');
    assert.ok(html.includes('-why"><b>为什么重要</b>不这么算'), '形态 B 的识别特征：为什么重要那一段');
    assert.ok(html.includes('>均摊<span class="ilife-block-tooltip-mark" aria-hidden="true">?</span></button>'),
      '词后那枚问号是装饰位');
    assert.equal(html.includes('<div'), false, '词在行里 ⇒ 整条只用行内元素');
    assert.ok(!/<script/i.test(html) && !/\son[a-z]+=/i.test(html), '不产脚本、不产内联事件处理器');
  });

  it('缺槽不出：`hint` 给空串就不出那一格；`badgeText` 可换说法', () => {
    const bare = renderTooltip({ ...REAL, hint: '' });
    assert.equal(bare.includes('-hint'), false, 'hint 给空串 ⇒ 不出');
    assert.ok(renderTooltip(REAL).includes(TOOLTIP_HINT), '缺省出「' + TOOLTIP_HINT + '」');
    assert.ok(renderTooltip({ ...REAL, badge: 'field' }).includes('字段说明'), 'field 档取另一种现成话');
    assert.ok(renderTooltip({ ...REAL, badgeText: '这是怎么算的' }).includes('这是怎么算的'), '可换说法');
  });

  it('转义：词／标题／解释／为什么重要／眉标逐位转义', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderTooltip({ id: 't1', word: evil, title: evil, text: evil, why: evil, badgeText: evil });
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false);
    assert.ok(html.includes('&lt;script&gt;') && html.includes('&quot;'));
  });

  it('非法入参**逐条**走 BlocksError（含「`why` 必填」这条形态 B 的特权）', () => {
    const ok = { id: 't', word: 'w', title: 'ti', text: 'x', why: 'y' };
    assert.equal(throwsBlocks(() => renderTooltip(undefined)), true);
    assert.equal(throwsBlocks(() => renderTooltip([])), true);
    assert.equal(throwsBlocks(() => renderTooltip({ ...ok, id: '' })), true);
    assert.equal(throwsBlocks(() => renderTooltip({ ...ok, id: 'a b' })), true);
    assert.equal(throwsBlocks(() => renderTooltip({ ...ok, word: '' })), true);
    assert.equal(throwsBlocks(() => renderTooltip({ ...ok, title: '' })), true);
    assert.equal(throwsBlocks(() => renderTooltip({ ...ok, text: '' })), true);
    assert.equal(throwsBlocks(() => renderTooltip({ ...ok, why: '' })), true, 'why 必填（省掉它就只剩词面意思）');
    assert.equal(throwsBlocks(() => renderTooltip({ ...ok, badge: 'note' })), true);
    assert.equal(throwsBlocks(() => renderTooltip({ ...ok, form: 'arrow' })), true);
    assert.equal(throwsBlocks(() => renderTooltip({ ...ok, hint: 7 })), true);
  });

  it('纯函数 ＋ 闭集钉住', () => {
    assert.equal(renderTooltip(REAL), renderTooltip(REAL));
    assert.deepEqual([...TOOLTIP_FORMS], ['wide']);
    assert.deepEqual([...TOOLTIP_BADGES], ['caliber', 'field']);
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

describe('tooltip ② 样式纪律', () => {
  const css = stripComments(tooltipCss());

  it('全部规则 scope 在 `.ilife-page-ui` 之下、只挂自己的类名', () => {
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 15, '本件规则数不对：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器没 scope 在 .ilife-page-ui：' + sel);
      assert.ok(sel.includes('ilife-block-tooltip'), '选择器必须挂在件根类之下：' + sel);
    }
    assert.equal(selectors.some((s) => /ilife-block-(sheet|page-head|dialog|drawer-sheet|popover-menu)\b/.test(s)), false,
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

  it('**零 `box-shadow`**：零阴影皮肤下靠「粗边 ＋ 外圈晕 ＋ 顶层」立起来；下划线不是投影', () => {
    assert.equal(css.includes('box-shadow'), false, '浮层不许靠投影表示「浮在上面」');
    assert.equal(tooltipCss().includes(skinVar('shadow')), false);
    assert.equal(tooltipCss().includes(skinVar('shadow-pop')), false);
    assert.match(css, /border:2px solid color-mix\(/, '第二手段之一：粗边');
    assert.match(css, /outline:3px solid color-mix\(/, '第二手段之二：零模糊的外圈晕');
    assert.match(css, /text-decoration:underline/, '词上的记号走下划线（不是投影）');
  });

  it('锚定定位那道门：竖轴贴词、横轴夹在容器里、贴不下翻到词上方', () => {
    assert.ok(css.includes('@supports (' + 'anchor-name: --a' + ')'), '锚定定位在能力查询之内');
    assert.ok(css.includes('top:calc(anchor(bottom) + 8px)'), '竖轴贴词');
    assert.ok(css.includes('left:max(12px, calc(50% - 280px))'), '横轴夹在容器里');
    assert.ok(css.includes('width:min(560px, calc(100% - 12px - 12px))'), '宽度上下限');
    assert.ok(css.includes('position-try-fallbacks:--tooltip-up'), '贴不下要翻到词上方');
    assert.ok(css.includes('@position-try --tooltip-up{top:auto;bottom:calc(anchor(top) + 8px)}'), '翻上去那条');
    /* 方位名与锚名是**结构**，不占皮肤 token 的命名空间（`--ilife-*` 只放皮肤取值）。 */
    assert.equal(/--ilife-tooltip/.test(css), false, '样式段里不许出现 --ilife-tooltip-*（那是皮肤命名空间）');
    const js = buildTooltipJs();
    assert.ok(js.includes(JSON.stringify('anchor-name: --a')), '运行时读的能力查询串与 CSS 同源');
  });

  it('只经 `skinVar()` 读皮肤', () => {
    const spans = skinVarSpans(assert, tooltipCss(), skinVar);
    assert.ok(spans.length >= 15, '读皮肤的处数不对：' + spans.length);
    assert.equal(cutSpans(tooltipCss(), spans).includes('var(--'), false, '手写了 var(--…)');
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => '--ilife-' + k));
    for (const n of new Set([...tooltipCss().matchAll(/var\(\s*(--ilife-[a-z0-9-]+)/g)].map((m) => m[1]))) {
      assert.ok(known.has(n), '名单外的 token：' + n);
    }
  });

  it('对比地板：文字色三套皮肤下都对底 ≥4.5:1（含眉标那档）', () => {
    for (const name of SKIN_NAMES) {
      for (const t of ['ink', 'ink-2', 'accent-text']) {
        for (const g of ['ground', 'surface', 'surface-2']) {
          const r = contrast(SKINS[name].values[t], SKINS[name].values[g]);
          assert.ok(r >= 4.5, name + '：' + t + ' 在 ' + g + ' 上只有 ' + r.toFixed(2) + ':1');
        }
      }
    }
  });

  it('几何常量：命中盒靠看不见的一圈撑到 ≥44；焦点与减动效都在', () => {
    assert.equal(TOOLTIP_HIT_PX, 44);
    assert.ok(css.includes('inset:-12px -8px'), '命中扩展那一圈');
    assert.match(css, /:focus-visible\{outline:2px solid /, '焦点地板（键盘通路要看得见焦点）');
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{/, '减动效那一档');
    assert.match(css, /transform:scale\(\.98\)/, '按下有真形');
  });

  it('缺省前缀 `ilife-`；换前缀时 scope 与槽类一起换', () => {
    assert.match(tooltipCss(), /^\.ilife-page-ui \.ilife-block-tooltip\{/m);
    const x = stripComments(tooltipCss({ prefix: 'x-' }));
    assert.ok(x.includes('.x-block-tooltip-bubble') && x.includes('.x-block-tooltip-word'));
    assert.equal(x.includes('.ilife-'), false);
  });

  it('层红线：`dist/components/tooltip/**` 零 DOM', () => {
    const dir = join(PKG, 'dist', 'components', 'tooltip');
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

describe('tooltip ③ 加法式', () => {
  it('不挂本件的页：一个本件字节都没有，两次渲染逐字节相同；不从根出口出', () => {
    const shell = () => renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const off = shell();
    assert.equal(off.includes(TOOLTIP_CLASS), false);
    assert.equal(off.includes('role="tooltip"'), false);
    assert.equal(off, shell());
    assert.equal(root.renderTooltip, undefined);
    assert.equal(root.tooltipCss, undefined);
  });
});

describe('tooltip ⑤ 皮肤矩阵（三套皮肤下标记逐字节相同）', () => {
  const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
    + '<div class="ilife-page-ui ' + skinClass(name) + '">' + renderTooltip(REAL) + '</div>';
  const withoutSkin = (name) => pageOf(name)
    .replace(skinCss({ skins: [name] }), '').replace(skinClass(name), '');

  it('差异只落在皮肤样式段与皮肤类上，标记面逐字节相同', () => {
    const bare = withoutSkin(SKIN_NAMES[0]);
    for (const name of SKIN_NAMES) assert.equal(withoutSkin(name), bare, name + ' 的标记面不同');
    assert.notEqual(pageOf(SKIN_NAMES[0]), pageOf(SKIN_NAMES[2]), '两套皮肤的页产物必须真的不同');
    assert.equal(renderTooltip(REAL).includes('skin-'), false);
  });
});

/* ── ④ 真机两档 ────────────────────────────────────────────────────── */

/** 一页：正文里一个词 ＋ 它的宽气泡（＋ 一个没有运行时的副本，用来量「零脚本点得开」）。 */
function fixture(withRuntime) {
  const second = { ...REAL, id: 'tip-missing', word: '缺值', title: '缺值是怎么写的', text: '没记的那天写成 —，不写 0。', why: '写成 0 会把日均、进度、热量缺口一起算错。', badge: 'field' };
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>tooltip 两档</title>\n<style>\n'
    + 'html,body{margin:0}\n' + skinCss() + '\n' + tooltipCss() + '\n'
    + '.stage{box-sizing:border-box;padding:16px;font:15px/1.75 system-ui}\n'
    + '.line{margin:0 0 24px;color:#333}\n</style></head>\n<body>\n'
    + '<div class="stage ilife-page-ui ' + skinClass('paper') + '">'
    + '<p class="line">09 月的结余里有 ' + renderTooltip(REAL) + ' 的那部分。</p>'
    + '<p class="line">没记的那天写成 ' + renderTooltip(second) + '，不写 0。</p>'
    + '</div>\n'
    + (withRuntime ? '<script>' + buildTooltipJs() + '</script>\n' : '')
    + '</body></html>';
}

const BUBBLE = '(function(){'
  + 'var b=document.getElementById("tip-share"), w=document.getElementById("tip-share-word");'
  + 'var r=b.getBoundingClientRect(), wr=w.getBoundingClientRect();'
  + 'var cs=getComputedStyle(b);'
  + 'return {open:b.matches(":popover-open"),text:(b.textContent||"").indexOf("为什么重要")>=0,'
  + 'box:{l:Math.round(r.left),r:Math.round(r.right),t:Math.round(r.top),b:Math.round(r.bottom),'
  + 'w:Math.round(r.width),h:Math.round(r.height)},'
  + 'word:{l:Math.round(wr.left),r:Math.round(wr.right),t:Math.round(wr.top),b:Math.round(wr.bottom),'
  + 'cx:Math.round(wr.left+wr.width/2),cy:Math.round(wr.top+wr.height/2)},'
  + 'sw:b.scrollWidth,cw:b.clientWidth,sh:b.scrollHeight,ch:b.clientHeight,'
  + 'shadow:cs.boxShadow,border:cs.borderTopWidth,outline:cs.outlineWidth,'
  + 'vw:document.documentElement.clientWidth,vh:document.documentElement.clientHeight,'
  + 'docSw:document.documentElement.scrollWidth,docCw:document.documentElement.clientWidth};}())';

/** 命中盒探针：词中心上下各 21px 处命中的元素还属于这个词吗（≥44 的判据）。 */
const HIT = '(function(){var w=document.getElementById("tip-share-word");'
  + 'var r=w.getBoundingClientRect(), cx=Math.round(r.left+r.width/2), cy=Math.round(r.top+r.height/2);'
  + 'function at(x,y){var el=document.elementFromPoint(x,y);return !!(el&&(el===w||w.contains(el)));}'
  + 'return {up:at(cx,cy-21),down:at(cx,cy+21),farUp:at(cx,cy-26),h:Math.round(r.height)};}())';

describe('tooltip ④ 真机两档（headless Chrome ＋ CDP）', () => {
  it('悬停／聚焦／点击都出得来；宽气泡不越界；命中盒 ≥44；Esc 关；零脚本也点得开', async (t) => {
    const p = await startBrowser({ portOffset: 10 });
    if (p === null) return t.skip('本机无 Chrome／Chromium：真机四条退化为 ② 的确定性几何判据');
    try {
      const readings = [];
      for (const [w, h] of [[390, 700], [1280, 900]]) {
        await p.at(fixture(true), { width: w, height: h });
        const why = w + '×' + h + '：';
        /* ① 悬停通路 */
        const word = await p.ev('(function(){var r=document.getElementById("tip-share-word").getBoundingClientRect();'
          + 'return [Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)];}())');
        await p.move(word[0], word[1]);
        let m = await p.ev(BUBBLE);
        assert.equal(m.open, true, why + '悬停要出得来');
        assert.equal(m.text, true, why + '气泡里必须有「为什么重要」那一段');
        assert.ok(m.box.l >= 0 && m.box.r <= m.vw, why + '气泡横向越界：' + JSON.stringify(m.box));
        assert.ok(m.box.t >= 0 && m.box.b <= m.vh, why + '气泡纵向越界：' + JSON.stringify(m.box));
        assert.ok(m.sw <= m.cw + 1 && m.sh <= m.ch + 1, why + '气泡里的字被裁了');
        assert.equal(m.shadow, 'none', why + '不许有投影：' + m.shadow);
        assert.ok(parseFloat(m.border) >= 2 && parseFloat(m.outline) >= 3, why + '粗边／外圈晕不见了');
        assert.equal(m.docSw <= m.docCw, true, why + '页面横向溢出');
        /* 宽气泡确实宽（形态 B 的识别特征） */
        assert.ok(m.box.w >= Math.min(560, w - 24) - 1, why + '气泡宽 ' + m.box.w + ' 不到上限');
        /* ② 命中盒 ≥44×44 */
        const hit = await p.ev(HIT);
        assert.ok(hit.up && hit.down, why + '词的命中盒上下都没撑到 21px：' + JSON.stringify(hit));
        /* ③ 落点：气泡挂在词下方（竖轴贴词） */
        assert.ok(m.box.t >= m.word.b - 1, why + '气泡没有落在词下方：' + m.box.t + ' < ' + m.word.b);
        /* ④ Esc 关掉 */
        await p.key('Escape');
        assert.equal(await p.ev('document.getElementById("tip-share").matches(":popover-open")'), false, why + 'Esc 关不掉');
        /* ⑤ 聚焦通路（键盘） */
        await p.ev('document.getElementById("tip-share-word").focus()');
        const focused = await p.ev('document.getElementById("tip-share").matches(":popover-open")');
        assert.equal(focused, true, why + '聚焦要出得来');
        await p.key('Escape');
        /* ⑥ 点击通路 */
        await p.mouse(word[0], word[1]);
        m = await p.ev(BUBBLE);
        assert.equal(m.open, true, why + '点击要出得来');
        readings.push(w + '：气泡 ' + JSON.stringify(m.box) + '（词 ' + JSON.stringify(m.word) + '）｜命中盒 h=' + hit.h
          + ' 上下各 21px 命中=' + hit.up + '/' + hit.down + '｜shadow=' + m.shadow
          + '／border=' + m.border + '／outline=' + m.outline);
      }
      /* 零脚本：这一页不装运行时，popovertarget 是浏览器给的 */
      await p.at(fixture(false), { width: 1280, height: 900 });
      const w2 = await p.ev('(function(){var r=document.getElementById("tip-share-word").getBoundingClientRect();'
        + 'return [Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)];}())');
      await p.mouse(w2[0], w2[1]);
      assert.equal(await p.ev('document.getElementById("tip-share").matches(":popover-open")'), true,
        '没有运行时也必须点得开（popovertarget）');
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
      console.log('  [真机读数] ' + readings.join('\n  [真机读数] '));
    } finally { p.close(); }
  });
});
