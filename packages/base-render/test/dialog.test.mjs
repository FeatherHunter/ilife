/** dialog（对话框 · 形态 A 确认型）· **判据件**（本族四件照抄这份形状）。
 *
 *  断言对象是本件**自己的唯一出口**：`dist/components/dialog/index.js`
 *  （组件层不进冻结面、不从根出口；层出口那一行由接线席统一加）。
 *
 *  四类（契约 §五）＋ 本族三处特有的硬判据：
 *   ① **渲染契约**：骨架（图标＋标题＋副语＋正文＋两条动作）／缺槽不出／转义面／
 *      **全部**非法入参分支走 `BlocksError`；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤（逐处与 `skinVar()` 的兜底链**逐字相同**）／
 *      scope 在 `.ilife-page-ui` 之下／零 `:root`／零 `!important`／零新 token 名／零 `@media` 判宽度／
 *      **零 `box-shadow`**（零阴影皮肤下浮层的第二手段：粗边 ＋ 外圈晕 ＋ 更暗遮罩）／
 *      `dist/components/dialog/**` 零 `document.`／`window.`／`navigator.`；
 *   ③ **加法式**：不挂本件时同页产物逐字节不变；本件的选择器只碰自己的类名；
 *   ④ **真机两档**（headless Chrome ＋ CDP）：390／1280 下**不贴边**（≥16px）、宽 ≤344px、
 *      高过视口时**正文内部滚而动作条可见**、`Esc` 能关、**关掉焦点回到触发键**、动作键 ≥44×44、
 *      `::backdrop` 真的更暗、`box-shadow` 真的是 `none`；
 *   ⑤ **皮肤矩阵**：三套皮肤下**标记逐字节相同**（换的只有样式段）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DIALOG_ACT_ATTR, DIALOG_ATTR, DIALOG_CLASS, DIALOG_FORMS, DIALOG_MAX_WIDTH_PX,
  DIALOG_MIN_HEIGHT_PX, DIALOG_OPEN_ATTR, buildDialogJs, dialogCss, renderDialog, renderDialogOpener,
} from '../dist/components/dialog/index.js';
import {
  SKINS, SKIN_NAMES, SKIN_TOKEN_NAMES, skinClass, skinCss, skinVar,
} from '../dist/components/skin/index.js';
import * as layer from '../dist/components/index.js';
import { renderDocShell } from '../dist/docShell.js';
import * as root from '../dist/index.js';
import { startBrowser } from './overlay-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/** 剥掉 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把「解释」当「规则」）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** 抛错的入参（`BlocksError`：组件层与区块层共用同一个错误名）。 */
const throwsBlocks = (fn) => {
  try { fn(); } catch (e) { return e.name === 'BlocksError'; }
  return false;
};

/** 逐条选择器（`@` 开头的 prelude 不算选择器；嵌在 at-rule 里的照抓）。 */
const selectorsOf = (css) => {
  const out = [];
  for (const m of stripComments(css).matchAll(/([^{}]*)\{/g)) {
    const sel = m[1].split('}').pop().trim();
    if (sel === '' || sel.startsWith('@')) continue;
    out.push(sel);
  }
  return out;
};

/** 一处 `var(--ilife-…)` 的边界：它必须与 `skinVar(名)` **逐字相同**。 */
const skinVarSpans = (css) => {
  const spans = [];
  for (const m of css.matchAll(/var\(\s*--ilife-([a-z0-9-]+)/g)) {
    const expected = skinVar(m[1]);
    assert.ok(css.startsWith(expected, m.index),
      '`' + m[1] + '` 处的 var() 串与 skinVar() 走散：' + css.slice(m.index, m.index + 80));
    spans.push([m.index, m.index + expected.length]);
  }
  return spans;
};

const cutSpans = (text, spans) => {
  let out = '';
  let at = 0;
  for (const [from, to] of spans) { out += text.slice(at, from); at = to; }
  return out + text.slice(at);
};

/** 一页真实形状的确认框（六个技能的覆盖确认都长这样）。 */
const REAL = {
  id: 'dlg-overwrite',
  title: '覆盖今天的记录？',
  sub: '这一步做完不能撤销',
  body: ['今天已经有 2 条记录。', '继续会先把它们删掉，再写入新的 3 条。'],
  tone: 'danger',
  actions: [{ label: '先不写', value: 'cancel' }, { label: '覆盖', value: 'cover' }],
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('dialog ① 渲染契约', () => {
  it('骨架：真 <dialog> ＋ 发现锚 ＋ 标题/正文的可达名 ＋ 两条动作（最后一枚是主动作）', () => {
    const html = renderDialog(REAL);
    assert.match(html, /^<dialog class="ilife-block-dialog is-confirm tone-danger" id="dlg-overwrite"/,
      '根是 dialog 且带形态键与语气档：' + html.slice(0, 90));
    assert.ok(html.includes(DIALOG_ATTR + '="dlg-overwrite"'), '发现锚＝面板 id');
    assert.ok(html.includes('aria-labelledby="dlg-overwrite-title"'), '屏幕上那个标题是可达名');
    assert.ok(html.includes('aria-describedby="dlg-overwrite-body"'), '正文进描述');
    assert.ok(html.includes('><h2 class="ilife-block-dialog-title" id="dlg-overwrite-title">覆盖今天的记录？</h2>'), '标题是 h2');
    assert.ok(html.includes('<p>今天已经有 2 条记录。</p><p>继续会先把它们删掉，再写入新的 3 条。</p>'), '正文逐段一枚 p');
    assert.ok(html.includes(DIALOG_ACT_ATTR + '="cancel"') && html.includes(DIALOG_ACT_ATTR + '="cover"'), '两枚动作各带机器值');
    assert.ok(html.indexOf('>先不写<') < html.indexOf('>覆盖<'), '动作顺序＝入参顺序（最后一枚是主动作）');
    assert.ok(!/<script/i.test(html) && !/\son[a-z]+=/i.test(html), '不产脚本、不产内联事件处理器');
  });

  it('缺槽不出那一槽；`status` 出了就进 aria-describedby', () => {
    const plain = renderDialog({
      id: 'd', title: 't', body: 'b', tone: 'plain', actions: [{ label: '好', value: 'ok' }],
    });
    assert.equal(plain.includes('-sub'), false, '不给副语 ⇒ 不出副语');
    assert.equal(plain.includes('-icon'), false, 'tone=plain ⇒ 不出图标位');
    assert.equal(plain.includes('-note'), false);
    assert.equal(plain.includes('-status'), false);
    assert.equal(plain.includes('-title'), true);
    assert.equal(renderDialog(REAL).includes('-icon'), true, '缺省 tone=danger ⇒ 图标位在');
    assert.equal(renderDialog(REAL).includes(' open'), false, '不开面板时一个 open 都不写');
    const withStatus = renderDialog({
      ...REAL, tone: 'plain', status: { kind: 'error', text: '写入失败：库被锁住了' },
    });
    assert.ok(withStatus.includes('aria-describedby="dlg-overwrite-body dlg-overwrite-status"'), '状态行进描述');
    assert.ok(withStatus.includes('data-ilife-dialog-status="error"'), '状态档上属性（样式按它分色）');
    assert.ok(withStatus.includes('⚠') && withStatus.includes('写入失败'), '状态行有形状符号 ＋ 文字（不只染色）');
  });

  it('转义：标题／副语／正文／动作字／脚注／状态逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderDialog({
      id: 'd1', title: evil, sub: evil, body: [evil], note: evil,
      status: { text: evil }, actions: [{ label: evil, value: 'v' }],
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.equal(/\son[a-z]+=/i.test(html), false, '不得出现内联事件处理器');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
  });

  it('触发键：带 data-ilife-dialog-open（焦点归还回路的另一头）＋ aria-haspopup', () => {
    const html = renderDialogOpener({ dialogId: REAL.id, text: '写入今天' });
    assert.ok(html.startsWith('<button class="ilife-block-dialog-opener" type="button"'), html.slice(0, 70));
    assert.ok(html.includes(DIALOG_OPEN_ATTR + '="dlg-overwrite"'), '带面板 id');
    assert.ok(html.includes('aria-haspopup="dialog"'), '声明它会开一个对话框');
    assert.ok(html.includes('>写入今天<'), '键上的字');
  });

  it('形态／语气／附加类名是闭集：闭集外一律 BlocksError，附加类名逐个过类名正则', () => {
    assert.deepEqual([...DIALOG_FORMS], ['confirm']);
    assert.equal(throwsBlocks(() => renderDialog({ ...REAL, form: 'sheet' })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...REAL, tone: 'danger!' })), true);
    assert.match(renderDialog({ ...REAL, extraClass: 'ok-1 other' }), /ok-1 other" id=/);
    for (const bad of ['a"b', 'x{y}', '.x', 'a b!']) {
      assert.equal(throwsBlocks(() => renderDialog({ ...REAL, extraClass: bad })), true, '拒：' + bad);
    }
  });

  it('非法入参**逐条**走 BlocksError（不静默降级、不「尽量猜」）', () => {
    const ok = { id: 'd', title: 't', body: 'b', actions: [{ label: '好', value: 'ok' }] };
    assert.equal(throwsBlocks(() => renderDialog(undefined)), true);
    assert.equal(throwsBlocks(() => renderDialog(null)), true);
    assert.equal(throwsBlocks(() => renderDialog([])), true);
    assert.equal(throwsBlocks(() => renderDialog('x')), true);
    /* id：必填 ＋ 只许标识符字符（它同时喂 id= 与锚名） */
    assert.equal(throwsBlocks(() => renderDialog({ title: 't', body: 'b', actions: ok.actions })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, id: '' })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, id: 'a b' })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, id: 'a.b' })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, id: 'a#b' })), true);
    /* 标题与正文 */
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, title: '' })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, title: 1 })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, body: undefined })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, body: '' })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, body: [] })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, body: ['a', ''] })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, body: [1] })), true);
    /* 动作：1～2 枚、逐枚必须有 label/value、value 唯一 */
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, actions: [] })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, actions: 'x' })), true);
    assert.equal(throwsBlocks(() => renderDialog({
      ...ok, actions: [{ label: 'a', value: 'v' }, { label: 'b', value: 'v' }],
    })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, actions: [{ label: '', value: 'v' }] })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, actions: [{ label: 'a', value: '' }] })), true);
    assert.equal(throwsBlocks(() => renderDialog({
      ...ok, actions: [{ label: 'a', value: '1' }, { label: 'b', value: '2' }, { label: 'c', value: '3' }],
    })), true);
    /* 状态行与开关 */
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, status: {} })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, status: { kind: 'warn', text: 'x' } })), true);
    assert.equal(throwsBlocks(() => renderDialog({ ...ok, open: 'yes' })), true);
    assert.equal(throwsBlocks(() => renderDialogOpener({ dialogId: '', text: 'x' })), true);
    assert.equal(throwsBlocks(() => renderDialogOpener({ dialogId: 'd', text: '' })), true);
    assert.equal(throwsBlocks(() => renderDialogOpener(undefined)), true);
    /* 合法边界：一枚动作可以；open 给 true 才写 open 属性 */
    assert.doesNotThrow(() => renderDialog({ ...ok, actions: [{ label: '知道了', value: 'ok' }] }));
    assert.match(renderDialog({ ...ok, open: true }), / aria-describedby="[^"]*" open>/);
  });

  it('纯函数：同入参两次逐字节相同', () => {
    assert.equal(renderDialog(REAL), renderDialog(REAL));
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

describe('dialog ② 样式纪律', () => {
  const css = stripComments(dialogCss());

  it('样式段非空，且**全部**规则 scope 在 `.ilife-page-ui` 之下、只挂自己的类名', () => {
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 20, '本件规则数不对：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器没 scope 在 .ilife-page-ui：' + sel);
      assert.ok(sel.includes('ilife-block-dialog'), '选择器必须挂在件根类之下：' + sel);
    }
    assert.equal(
      selectors.some((s) => /ilife-block-(sheet|page-head|drawer-sheet|popover-menu|tooltip)/.test(s)),
      false, '不许碰别的件（加法式）',
    );
  });

  it('零 `:root`／零 `!important`／零新 token 名／零 `@media` 判宽度', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    const decls = css.match(/--[a-z0-9-]+\s*:/g) || [];
    assert.equal(decls.length, 0, '不得定义新 token：' + decls.join(' '));
    const media = [...css.matchAll(/@media\s*\(([^)]*)\)/g)].map((m) => m[1]);
    assert.ok(media.length > 0, '至少要有设备能力那两条媒体查询');
    for (const q of media) {
      assert.ok(/hover:\s*hover/.test(q) || /prefers-reduced-motion/.test(q),
        '媒体查询只许判设备能力（hover／pointer／prefers-reduced-motion）：' + q);
    }
  });

  it('**零 `box-shadow`**：零阴影皮肤下浮面靠「粗边 ＋ 外圈晕 ＋ 更暗遮罩」立起来（第二手段必须在）', () => {
    assert.equal(css.includes('box-shadow'), false, '浮层不许靠投影表示「浮在上面」');
    assert.equal(dialogCss().includes(skinVar('shadow')), false, '不许读常驻投影那条 token');
    assert.equal(dialogCss().includes(skinVar('shadow-pop')), false, '不许读浮层投影那条 token');
    assert.match(css, /border:2px solid color-mix\(/, '第二手段之一：粗边（比发丝线粗一档）');
    assert.match(css, /outline:3px solid color-mix\(/, '第二手段之二：零模糊的外圈晕');
    assert.match(css, /::backdrop\{background:color-mix\(/, '第二手段之三：更暗的遮罩（从 ink 算出来）');
  });

  it('**只经 `skinVar()` 读皮肤**：每处 var() 与 skinVar() 逐字相同，剥掉它后不剩一个 var()', () => {
    const spans = skinVarSpans(dialogCss());
    assert.ok(spans.length >= 12, '读皮肤的处数不对：' + spans.length);
    const rest = cutSpans(dialogCss(), spans);
    assert.equal(rest.includes('var(--'), false, '手写了 var(--…)（兜底链只许住 skin/contract.ts）');
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => '--ilife-' + k));
    for (const n of new Set([...dialogCss().matchAll(/var\(\s*(--ilife-[a-z0-9-]+)/g)].map((m) => m[1]))) {
      assert.ok(known.has(n), '名单外的 token 名（会被静默兜底）：' + n);
    }
  });

  it('对比地板（算出来不靠眼看）：文字色三套皮肤下都对底 ≥4.5:1，实底键上的字也够', () => {
    const luminance = (hex) => {
      const h = hex.replace('#', '');
      const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
      const lin = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    };
    const contrast = (a, b) => {
      const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };
    const TEXT = ['ink', 'ink-2', 'danger'];
    for (const name of SKIN_NAMES) {
      for (const t of TEXT) {
        for (const g of ['ground', 'surface', 'surface-2']) {
          const r = contrast(SKINS[name].values[t], SKINS[name].values[g]);
          assert.ok(r >= 4.5, name + '：' + t + ' 在 ' + g + ' 上只有 ' + r.toFixed(2) + ':1');
        }
      }
      /* 实底键上的字：主动作的底（`accent-text`）与破坏性的底（`danger`）都配 `accent-ink`。
         这里断的就是仓内 #179 那条口径：小字压强调底不许停在 `--blue` 的 4.02:1 上。 */
      for (const fill of ['accent-text', 'danger']) {
        const r = contrast(SKINS[name].values['accent-ink'], SKINS[name].values[fill]);
        assert.ok(r >= 4.5, name + '：accent-ink 在 ' + fill + ' 上只有 ' + r.toFixed(2) + ':1');
      }
    }
  });

  it('焦点地板：`:focus-visible` 有 ≥2px 可见描边；按下有 ≤80ms 的形；有减动效那一档', () => {
    assert.match(css, /:focus-visible\{outline:2px solid /, '必须有 :focus-visible 且描边 ≥2px');
    assert.equal(/outline:\s*(none|0)\b/.test(css), false, '不许只写 outline:none 而不给替代');
    assert.ok(/transform:scale\(\.98\)/.test(css), ':active 要有真按下的形（scale(.98)）');
    assert.ok(/transition:transform 60ms/.test(css), '按下的过渡 ≤80ms');
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{/, '要有减动效那一档');
  });

  it('窄档不贴边与内部滚：几何常量进样式段（判据与真机读同一份数）', () => {
    assert.equal(DIALOG_MAX_WIDTH_PX, 344);
    assert.equal(DIALOG_MIN_HEIGHT_PX, 44);
    assert.ok(css.includes('min(344px, calc(100% - 32px))'), '面板宽上限与两边 16px 边距');
    assert.ok(css.includes('max-height:calc(100dvh - 32px)'), '高过视口由面板封顶');
    assert.match(css, /-body\{flex:1 1 auto;min-height:0;overflow:auto;/, '正文那一格滚');
    assert.match(css, /-foot\{flex:0 0 auto;/, '动作条不滚');
  });

  it('缺省前缀 `ilife-`；换前缀时 scope 与槽类**一起**换', () => {
    assert.match(dialogCss(), /^\.ilife-page-ui dialog\.ilife-block-dialog\{/m);
    const x = stripComments(dialogCss({ prefix: 'x-' }));
    assert.ok(x.includes('.x-page-ui dialog.x-block-dialog{'));
    assert.ok(x.includes('.x-block-dialog-title'));
    assert.equal(x.includes('.ilife-'), false, '换前缀后不许残留旧前缀');
  });

  it('层红线：`dist/components/dialog/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'dialog');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 5, '编译产物不全：' + files.length);
    const strip = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const f of files) {
      const code = strip(readFileSync(f, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f.replace(PKG, '') + ' 的代码里出现 ' + needle);
      }
    }
  });
});

/* ── ③ 加法式 ──────────────────────────────────────────────────────── */

describe('dialog ③ 加法式（opt-in：不挂这件＝零变化）', () => {
  it('不挂本件的页：一个本件字节都没有，两次渲染逐字节相同', () => {
    const shell = () => renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const off = shell();
    assert.equal(off.includes(DIALOG_CLASS), false);
    assert.equal(off.includes('ilife:dialog-close'), false);
    assert.equal(off, shell(), '两次渲染逐字节相同');
  });

  it('出口唯一：本件不从根出口出；层出口若已转出，必须是**同一个**实现', () => {
    assert.equal(typeof renderDialog, 'function');
    assert.equal(root.renderDialog, undefined, '组件层不得从根出口出（冻结面签名不许动）');
    assert.ok(layer.renderDialog === undefined || layer.renderDialog === renderDialog, '层出口不许出现第二份实现');
  });
});

/* ── ⑤ 皮肤矩阵 ────────────────────────────────────────────────────── */

describe('dialog ⑤ 皮肤矩阵（三套皮肤下标记逐字节相同）', () => {
  const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
    + '<div class="ilife-page-ui ' + skinClass(name) + '">' + renderDialog(REAL) + '</div>';
  const withoutSkin = (name) => pageOf(name)
    .replace(skinCss({ skins: [name] }), '').replace(skinClass(name), '');

  it('三套皮肤：差异只落在皮肤样式段与皮肤类上，标记面逐字节相同', () => {
    const bare = withoutSkin(SKIN_NAMES[0]);
    assert.ok(bare.includes(renderDialog(REAL)), '挖掉皮肤后标记必须原样在');
    for (const name of SKIN_NAMES) {
      assert.equal(withoutSkin(name), bare, name + ' 的标记面与 ' + SKIN_NAMES[0] + ' 不同');
    }
    assert.notEqual(pageOf(SKIN_NAMES[0]), pageOf(SKIN_NAMES[1]), '两套皮肤的页产物必须真的不同（否则这条判据空转）');
    assert.equal(renderDialog(REAL).includes('skin-'), false, '标记里不许自带皮肤类（皮肤是页面挂的）');
  });
});

/* ── ④ 真机两档 ────────────────────────────────────────────────────── */

/** 一页：两枚触发键（在正文里）＋ 一个短确认框 ＋ 一个正文很长的确认框。 */
function fixture() {
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>dialog 两档</title>\n<style>\n'
    + 'html,body{margin:0}\n'
    + skinCss() + '\n' + dialogCss() + '\n'
    + '.stage{box-sizing:border-box;padding:16px}\n'
    + '</style></head>\n<body>\n'
    + '<div class="stage ilife-page-ui ' + skinClass('paper') + '">'
    + renderDialogOpener({ dialogId: REAL.id, text: '写入今天' })
    + renderDialog(REAL)
    + renderDialogOpener({ dialogId: 'dlg-tall', text: '长正文' })
    + renderDialog({
      id: 'dlg-tall', title: '这几处要一起改？', sub: '写下去就生效',
      body: new Array(24).fill('这一条说明写得比较长，用来看正文那一格会不会自己滚：高过视口时它必须滚，动作条必须还看得见。'),
      tone: 'warn',
      actions: [{ label: '再想想', value: 'cancel' }, { label: '一起改', value: 'apply' }],
    })
    + '</div>\n<script>' + buildDialogJs() + '</script>\n</body></html>';
}

/** 量一个开着面板的几何（面板／动作条／正文那一格 ＋ 三样「浮着」的读数）。 */
const MEASURE = (id) => '(function(){'
  + 'var d=document.getElementById(' + JSON.stringify(id) + ');'
  + 'var f=d.querySelector(".ilife-block-dialog-foot"), b=d.querySelector(".ilife-block-dialog-body");'
  + 'var cs=getComputedStyle(d), acts=d.querySelectorAll(".ilife-block-dialog-act");'
  + 'var r=d.getBoundingClientRect(), fr=f.getBoundingClientRect();'
  + 'return {open:d.open,modal:!!d.matches(":modal"),'
  + 'box:{l:Math.round(r.left),r:Math.round(r.right),t:Math.round(r.top),b:Math.round(r.bottom),'
  + 'w:Math.round(r.width),h:Math.round(r.height)},'
  + 'foot:{l:Math.round(fr.left),r:Math.round(fr.right),t:Math.round(fr.top),b:Math.round(fr.bottom)},'
  + 'bodyClient:b.clientHeight,bodyScroll:b.scrollHeight,'
  + 'shadow:cs.boxShadow,radius:cs.borderTopLeftRadius,border:cs.borderTopWidth,outline:cs.outlineWidth,'
  + 'scrim:getComputedStyle(d,"::backdrop").backgroundColor,'
  + 'actH:acts.length?Math.round(acts[0].getBoundingClientRect().height):0,'
  + 'actW:acts.length?Math.round(acts[0].getBoundingClientRect().width):0,'
  + 'labels:d.getAttribute("aria-labelledby")};}())';

const OPEN = (i) => 'document.querySelectorAll("[data-ilife-dialog-open]")[' + i + '].click()';

describe('dialog ④ 真机两档（headless Chrome ＋ CDP）', () => {
  it('390／1280：不贴边、宽有上限、高过视口内部滚而动作条可见、Esc 关、焦点归还、命中区 ≥44', async (t) => {
    const p = await startBrowser({ portOffset: 4 });
    if (p === null) return t.skip('本机无 Chrome／Chromium：真机四条退化为 ② 的确定性几何判据');
    try {
      const readings = [];
      for (const [w, h] of [[390, 700], [1280, 900]]) {
        await p.at(fixture(), { width: w, height: h });
        const why = w + '×' + h + '：';
        /* 开短确认框 */
        await p.ev(OPEN(0));
        const a = await p.ev(MEASURE('dlg-overwrite'));
        assert.equal(a.open, true, why + '触发键点下去必须真的开');
        assert.equal(a.modal, true, why + '必须是真模态（:modal）');
        assert.ok(a.box.l >= 16 && a.box.r <= w - 16, why + '面板贴边了：l=' + a.box.l + ' r=' + a.box.r);
        assert.ok(a.box.w <= DIALOG_MAX_WIDTH_PX + 1, why + '面板宽 ' + a.box.w + ' 超过上限');
        assert.ok(Math.abs((a.box.l + a.box.r) / 2 - w / 2) <= 2, why + '面板没居中');
        /* 零阴影 ＋ 第二手段（真机读数，不是读源码） */
        assert.equal(a.shadow, 'none', why + '本件不许有投影：' + a.shadow);
        assert.ok(parseFloat(a.border) >= 2, why + '粗边不见了：' + a.border);
        assert.ok(parseFloat(a.outline) >= 3, why + '外圈晕不见了：' + a.outline);
        assert.notEqual(a.scrim, 'rgba(0, 0, 0, 0)', why + '遮罩没落下：' + a.scrim);
        /* 命中区 */
        assert.ok(a.actH >= DIALOG_MIN_HEIGHT_PX, why + '动作键高 ' + a.actH + ' 小于 44');
        assert.ok(a.actW >= DIALOG_MIN_HEIGHT_PX, why + '动作键宽 ' + a.actW + ' 小于 44');
        assert.equal(a.labels, 'dlg-overwrite-title', why + 'aria-labelledby 丢了');
        /* Esc 关掉 ＋ 焦点归还 */
        await p.key('Escape');
        const closed = await p.ev('(function(){var d=document.getElementById("dlg-overwrite");'
          + 'var ae=document.activeElement;'
          + 'return {open:d.open,active:(ae&&ae.getAttribute("data-ilife-dialog-open"))||ae.tagName};}())');
        assert.equal(closed.open, false, why + 'Esc 必须能关');
        assert.equal(closed.active, 'dlg-overwrite', why + '关掉后焦点必须回到按它的那颗按钮，实际停在 ' + closed.active);
        /* 长的那个：正文内部滚、动作条在视口里 */
        await p.ev(OPEN(1));
        const tall = await p.ev(MEASURE('dlg-tall'));
        assert.ok(tall.box.h <= h - 32 + 1, why + '高 ' + tall.box.h + ' 没有被封在视口内');
        assert.ok(tall.box.t >= 16 && tall.box.b <= h - 16, why + '面板越出视口：t=' + tall.box.t + ' b=' + tall.box.b);
        assert.ok(tall.bodyScroll > tall.bodyClient,
          why + '正文没有内部滚（scroll ' + tall.bodyScroll + ' ≤ client ' + tall.bodyClient + '）');
        assert.ok(tall.foot.b <= h - 16 + 1 && tall.foot.t >= 0, why + '动作条被滚走了：' + JSON.stringify(tall.foot));
        /* 点遮罩关掉（reason=backdrop） */
        await p.mouse(4, 4);
        assert.equal(await p.ev('document.getElementById("dlg-tall").open'), false, why + '点遮罩必须能关');
        const evts = await p.evts();
        assert.ok(evts.some((e) => e.type === 'ilife:dialog-close' && e.detail.reason === 'backdrop'),
          why + '点遮罩那条路要落进事件里');
        assert.ok(evts.some((e) => e.type === 'ilife:dialog-close' && e.detail.reason === 'esc'),
          why + 'Esc 那条路要落进事件里');
        readings.push(w + '：面板 ' + a.box.l + '..' + a.box.r + '（宽 ' + a.box.w + '）｜'
          + '真机 shadow=' + a.shadow + '／border=' + a.border + '／outline=' + a.outline + '／遮罩=' + a.scrim
          + '｜长正文 body ' + tall.bodyScroll + ' > ' + tall.bodyClient + '，动作条 b=' + tall.foot.b + ' ≤ ' + (h - 16)
          + '｜Esc 后焦点=' + closed.active);
      }
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
      console.log('  [真机读数] ' + readings.join('\n  [真机读数] '));
    } finally { p.close(); }
  });
});
