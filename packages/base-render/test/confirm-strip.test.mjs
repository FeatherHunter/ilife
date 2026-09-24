/** confirm-strip（二次确认条 · 形态 A「清单式」）· 判据件。
 *
 *  断言对象是**本件自己的那条出口**：`dist/components/confirm-strip/index.js`
 *  （组件层一件一目录、目录内自足；本件不进冻结面、不从根出口）。六组：
 *   ① **渲染契约**：点名（清单＋条数）／危险按钮写动词与条数／可撤销与不可撤销两档／转义面／
 *      **全部**非法入参分支（每个都断 `BlocksError`）／三态（`rest`／`busy`／`disabled`）；
 *   ② **样式与零 DOM 纪律**：scope 在 `.ilife-page-ui` 之下、零 `:root`／`!important`／新 token、
 *      零手写 `var(--ilife-…)`、**危险档另有手段**（不可撤销＝双线框 ＋ 字重）、触控下限常量在样式里；
 *   ③ **加法式**：不用本件的页产物逐字节不变；样式段只落在自己的类名上；三皮肤下标记逐字节相同；
 *   ④ **真机两档几何**（headless Chrome ＋ CDP）：390／1280 零横向溢出 ＋ 触控目标 ≥44×44 ＋ 三态同高；
 *   ⑤ **真机状态矩阵与三皮肤**：焦点可见（真 Tab）／禁用光标／`prefers-reduced-motion` 停住／
 *      三套皮肤下标记逐字节相同且皮肤确实生效；
 *   ⑥ **真机运行时**：两份运行时只派发一条事件；`busy`／`disabled` 按不动；`Esc` 走退路。
 *
 *  期望值一律从组件自己的常量派生（`CONFIRM_STRIP_*`），不抄字面量：改了名字这里跟着红，不会两处走散。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  CONFIRM_STRIP_BARE_WORDS, CONFIRM_STRIP_CLASS, CONFIRM_STRIP_COUNT_ATTR, CONFIRM_STRIP_EVENT_CANCEL,
  CONFIRM_STRIP_EVENT_COMMIT, CONFIRM_STRIP_FORMS, CONFIRM_STRIP_FORM_ATTR, CONFIRM_STRIP_IRREVERSIBLE_ATTR,
  CONFIRM_STRIP_KEEP_DEFAULT, CONFIRM_STRIP_LOSS_DEFAULT, CONFIRM_STRIP_STATES, CONFIRM_STRIP_STATE_ATTR,
  CONFIRM_STRIP_TOUCH_MIN_PX, CONFIRM_STRIP_UNIT_ATTR, CONFIRM_STRIP_UNIT_DEFAULT, buildConfirmStripJs,
  confirmStripCss, confirmStripSlot, renderConfirmStrip,
} from '../dist/components/confirm-strip/index.js';
import { BROADSHEET_VALUES, NEUTRAL_VALUES, PAPER_VALUES, SKIN_NAMES, SKINS, skinCss } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
/** 取值表**从注册表读**（不写死名单）：皮肤闭集一涨就自动跟上——早先手写三套，闭集扩到六套时
 *  这里取到 `undefined`，`SKIN_VALUES[skin].radius` 当场抛（2026-09-24 实测踩过）。 */
const SKIN_VALUES = Object.fromEntries(SKIN_NAMES.map((s) => [s, SKINS[s].values]));
const DANGER = confirmStripSlot('danger');
const KEEP = confirmStripSlot('keep');
const NOTE = confirmStripSlot('note');
const STATUS = confirmStripSlot('status');

/** 剥掉 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把「解释」当「规则」）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** 抛错的入参（`BlocksError`：组件层与区块层共用同一个错误名）。 */
const throwsBlocks = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.name === 'BlocksError';
  }
  return false;
};

/** 一份合法入参（各用例只改要断的那一格）。 */
const base = (over) => Object.assign({
  dangerVerb: '删掉',
  count: 3,
  items: [
    { name: '茶叶蛋 2 个', meta: '09-25 早餐', value: '-12.00' },
    { name: '牛肉面', meta: '09-25 午餐', value: '-38.00' },
    { name: '地铁 3 号线', meta: '09-25 交通', value: '-6.00' },
  ],
  undoable: true,
  undoHint: '入口在本页顶部的「最近删除」，保留 30 天。',
}, over);

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('confirm-strip ① 渲染契约', () => {
  it('点名 ＋ 条数：清单逐条上屏、条数三处一致（题面／按钮／机器属性）', () => {
    const html = renderConfirmStrip(base());
    assert.ok(html.startsWith('<div class="' + CONFIRM_STRIP_CLASS + ' is-list"'), '根用类名根打头：' + html.slice(0, 80));
    assert.ok(html.includes(CONFIRM_STRIP_FORM_ATTR + '="list"'), '形态落属性');
    assert.ok(html.includes(CONFIRM_STRIP_COUNT_ATTR + '="3"'), '条数落机器属性');
    assert.ok(html.includes(CONFIRM_STRIP_UNIT_ATTR + '="' + CONFIRM_STRIP_UNIT_DEFAULT + '"'), '量词落机器属性');
    assert.ok(html.includes('要删掉这 3 条吗？'), '题面点名条数');
    for (const item of base().items) assert.ok(html.includes('>' + item.name + '<'), '这一条要被点名：' + item.name);
    assert.ok(html.includes('09-25 早餐'), '旁证上屏');
    assert.ok(html.includes('-12.00'), '值上屏');
    assert.equal((html.match(/ilife-block-confirm-strip-item"/g) || []).length, 3, '三条各一枚 li');
  });

  it('危险按钮**写动词 ＋ 条数**（不是「确定」），安全按钮在左、危险在右', () => {
    const html = renderConfirmStrip(base());
    assert.ok(html.includes('>删掉这 3 条<'), '危险按钮＝动词＋条数');
    assert.ok(html.includes('>' + CONFIRM_STRIP_KEEP_DEFAULT + '<'), '安全按钮用缺省字');
    assert.ok(html.indexOf('"' + KEEP + '"') < html.indexOf('"' + DANGER + '"'), '标记顺序：先安全后危险');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
    for (const word of CONFIRM_STRIP_BARE_WORDS) {
      assert.equal(html.includes('>' + word + '<'), false, '按钮上不许出现空词：' + word);
    }
  });

  it('能不能撤销写在标记里（徽标 ＋ 后果话 ＋ 机器属性），两档都对', () => {
    const yes = renderConfirmStrip(base());
    assert.ok(yes.includes('>可撤销<'), '可撤销档的徽标');
    assert.ok(yes.includes('<b>可以撤销</b>'), '后果话前半句写「可以撤销」');
    assert.ok(yes.includes(base().undoHint), '撤销入口与保留期上屏');
    assert.ok(yes.includes(CONFIRM_STRIP_IRREVERSIBLE_ATTR + '="0"'), '机器属性标可撤销');

    const no = renderConfirmStrip(base({ undoable: false, undoHint: undefined }));
    assert.ok(no.includes('>不可撤销<'), '不可撤销档的徽标');
    assert.ok(no.includes('<b>不能撤销</b>'), '后果话前半句写「不能撤销」');
    assert.ok(no.includes(CONFIRM_STRIP_LOSS_DEFAULT), '缺省后果话上屏');
    assert.ok(no.includes(CONFIRM_STRIP_IRREVERSIBLE_ATTR + '="1"'), '机器属性标不可撤销');
    assert.ok(!no.includes('可以撤销'), '不可撤销档不得出现「可以撤销」');
    assert.ok(renderConfirmStrip(base({ undoable: false, undoHint: undefined, loss: '这条删了就没了。' }))
      .includes('这条删了就没了。'), 'loss 可覆盖');
  });

  it('三态：状态行恒在（`rest` 是空元素），`busy`／`disabled` 的字与禁用都落到标记上', () => {
    const rest = renderConfirmStrip(base());
    assert.ok(rest.includes(CONFIRM_STRIP_STATE_ATTR + '="rest"'));
    assert.ok(rest.includes('<p class="' + STATUS + '" role="status"></p>'), 'rest 档状态行占位且为空');
    assert.equal(rest.includes(' disabled'), false, 'rest 档按钮可点');

    const busy = renderConfirmStrip(base({ state: 'busy' }));
    assert.ok(busy.includes('正在删掉这 3 条…'), 'busy 档出「正在…」');
    assert.equal((busy.match(/disabled aria-disabled="true"/g) || []).length, 2, '两个按钮都禁用');
    assert.ok(busy.includes('>删掉这 3 条<'), 'busy 档按钮标签一字不改（宽度因此不变）');

    const off = renderConfirmStrip(base({ state: 'disabled', disabledHint: '这一天已经锁定，先解锁再删。' }));
    assert.ok(off.includes('这一天已经锁定，先解锁再删。'), '禁用要说清为什么');
    assert.equal((off.match(/disabled aria-disabled="true"/g) || []).length, 2);
  });

  it('转义：名称／旁证／值／题面／撤销说明逐位过实体，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderConfirmStrip(base({
      items: [{ name: evil, meta: evil, value: evil }], count: 1, undoHint: evil, title: evil,
    }));
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签：' + html.slice(0, 160));
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
  });

  it('缺省值：题面／量词／安全按钮字／状态行都由本件拼', () => {
    const one = base({ count: 1, items: [{ name: '牛肉面' }] });
    assert.ok(renderConfirmStrip(one).includes('要删掉这 1 条吗？'), '题面缺省拼装');
    assert.ok(renderConfirmStrip(one).includes('>删掉这 1 条<'), '危险按钮缺省拼装');
    assert.ok(renderConfirmStrip(base({ unit: '餐', count: 1, items: [{ name: '早餐' }] })).includes('>删掉这 1 餐<'), '量词可换');
    assert.ok(renderConfirmStrip(base({ keepLabel: '先不删' })).includes('>先不删<'), '安全按钮字可换');
    assert.ok(renderConfirmStrip(base({ backup: true })).includes('删之前先把这几条导出备份'), 'backup: true 出缺省措辞');
    assert.ok(renderConfirmStrip(base({ backup: true, backupLabel: '先存一份' })).includes('>先存一份<'), 'backupLabel 可换');
    assert.equal(renderConfirmStrip(base()).includes(confirmStripSlot('opt')), false, '不给 backup 就不出这一行');
    assert.equal(renderConfirmStrip(base()).includes(confirmStripSlot('opt')), false);
  });

  it('非法入参一律 badInput（每个分支都断）', () => {
    assert.deepEqual([...CONFIRM_STRIP_FORMS], ['list']);
    assert.deepEqual([...CONFIRM_STRIP_STATES], ['rest', 'busy', 'disabled']);
    assert.equal(throwsBlocks(() => renderConfirmStrip(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderConfirmStrip([])), true, '数组');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ form: 'stack' }))), true, '形态闭集外');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ state: 'loading' }))), true, '状态闭集外');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ dangerVerb: '' }))), true, '动词空');
    for (const word of CONFIRM_STRIP_BARE_WORDS) {
      assert.equal(throwsBlocks(() => renderConfirmStrip(base({ dangerVerb: word }))), true, '空词：' + word);
    }
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ dangerVerb: '删 掉' }))), true, '动词带空白');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ count: 0 }))), true, 'count=0');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ count: 1.5 }))), true, 'count 非整数');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ count: '3' }))), true, 'count 是串');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ count: 2 }))), true, 'count 与 items 条数对不上');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ items: [] }))), true, '空清单');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ items: 'x' }))), true, 'items 非数组');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ items: [null, null, null] }))), true, '条目非对象');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ items: [{ name: '' }, {}, {}] }))), true, '条目名称空');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ undoable: undefined }))), true, 'undoable 必填');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ undoable: 'yes' }))), true, 'undoable 非布尔');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ undoHint: undefined }))), true, '可撤销却没给入口');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ undoable: false }))), true, '不可撤销却给了撤销入口');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ loss: '后果' }))), true, '可撤销却给了后果话');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ state: 'disabled' }))), true, '禁用却没说为什么');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ disabledHint: '原因' }))), true, '非禁用却给了原因');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ backupLabel: '备份' }))), true, '措辞却没说要不要这一项');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ backup: 'yes' }))), true, 'backup 非布尔');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ extraClass: 'a"b' }))), true, '类名正则');
    assert.equal(throwsBlocks(() => renderConfirmStrip(base({ extraClass: '' }))), true, '空类名');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

/** 样式段里的选择器行（跳过 at 规则行与 keyframes 的帧行）。 */
function selectors(css) {
  return (stripComments(css).match(/^[^\s@}][^{\n]*\{/gm) || [])
    .map((s) => s.trim())
    .filter((s) => !s.startsWith('@') && !/^(?:\d+%|from|to)\s*[,\s]/.test(s));
}

describe('confirm-strip ② 样式与零 DOM 纪律', () => {
  const css = confirmStripCss();
  const clean = stripComments(css);

  it('样式段非空，每条规则的 scope 都在 `.ilife-page-ui` 之下', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const sels = selectors(css);
    assert.ok(sels.length >= 15, '规则数不对：' + sels.length);
    for (const sel of sels) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + sel);
    }
  });

  it('零 `:root`／`!important`／新 token；皮肤只经 skinVar 读（兜底链）', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(clean.includes('--r-xl'), false);
    assert.equal(clean.includes('--pink'), false);
    const decls = clean.match(/--[a-z0-9-]+\s*:/g) || [];
    assert.equal(decls.length, 0, '不得定义新 token：' + decls.join(' '));
    /* 每一处 `var(--ilife-…` 都必须带兜底链（＝出自 `skinVar()`）；手写的裸 `var(--ilife-x)` 一个都不许有。 */
    const naked = [...clean.matchAll(/var\(--ilife-[a-z0-9-]+\)/g)];
    assert.deepEqual(naked, [], '手写了没有兜底链的 var(--ilife-…)：' + naked.join(' '));
    assert.ok(clean.includes('var(--ilife-'), '要经 skinVar 读皮肤（带兜底链）');
  });

  it('源码级：`style.ts` 里零硬编码颜色（配色一律从 token 读）', () => {
    const src = readFileSync(join(PKG, 'src', 'components', 'confirm-strip', 'style.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '');
    const hex = code.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    assert.deepEqual(hex, [], '样式源码里不许硬编码颜色：' + hex.join(' '));
    assert.equal(/rgba?\(/.test(code), false, '不许写裸色值函数');
  });

  it('危险档另有手段：不可撤销 ＝ 双线框 ＋ 字重（不只靠红）', () => {
    const at = clean.indexOf(CONFIRM_STRIP_IRREVERSIBLE_ATTR);
    assert.ok(at > 0, '不可撤销的档位规则要在样式里');
    assert.ok(/border:\s*3px double/.test(clean), '不可撤销要上双线框（3px double）');
    const weights = [...clean.matchAll(/font-weight:\s*(\d+)/g)].map((m) => Number(m[1]));
    assert.ok(Math.max(...weights) >= 800, '危险档要有字重手段：' + weights.join('/'));
  });

  it('触控下限与窄档阈值取自常量；按压反馈 ≤80ms；状态行恒占位', () => {
    assert.ok(clean.includes('min-height: ' + CONFIRM_STRIP_TOUCH_MIN_PX + 'px'), '按钮命中盒读常量');
    assert.ok(clean.includes('min-width: ' + CONFIRM_STRIP_TOUCH_MIN_PX + 'px'), '按钮命中盒读常量');
    assert.ok(/transition: transform \d+ms/.test(clean), '按下反馈要走 transition');
    const ms = Number(/transition: transform (\d+)ms/.exec(clean)[1]);
    assert.ok(ms <= 80, '按下反馈 ≤80ms，实为 ' + ms);
    assert.ok(clean.includes('transform: scale(0.98)'), '真按下有缩放');
    assert.ok(clean.includes('min-height: 1.5em'), '状态行恒占位（切状态不跳版）');
    assert.ok(/@container \(max-width: \d+px\)/.test(clean), '窄档只用容器查询判宽度');
    assert.ok(/@media \(prefers-reduced-motion:reduce\)/.test(clean), '动效要能被 reduced-motion 停住');
    assert.equal(/@media \(max-width/.test(clean), false, '不许用视口宽判窄档');
    assert.equal(/@media \(min-width/.test(clean), false, '不许用视口宽判窄档');
  });

  it('组合子右边不带 `.ilife-page-ui` 前缀（带上去那条规则会**静默不匹配**）', () => {
    /* 2026-09 真机判据抓到过这一处：`A + .ilife-page-ui .x` 里的 `+` 落在**页面壳**上，
       要求「页面壳」是前一项的兄弟 ⇒ 规则一个元素都命中不了（外观看着「样式没生效」）。 */
    for (const sel of selectors(confirmStripCss())) {
      const m = /[\s>+~]+\.ilife-page-ui/.exec(sel);
      assert.equal(m, null, '组合子右边又带了页面壳前缀：' + sel);
    }
  });

  it('零 DOM：`dist/components/confirm-strip/**` 剥掉字面量与注释后不出现 DOM 名', () => {
    const dir = join(PKG, 'dist', 'components', 'confirm-strip');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
    assert.ok(files.length >= 5, '本件产物应有 5 份以上：' + files.join('、'));
    for (const f of files) {
      const code = readFileSync(join(dir, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/`(?:[^`\\]|\\.)*`/g, '``')
        .replace(/'(?:[^'\\]|\\.)*'/g, "''")
        .replace(/"(?:[^"\\]|\\.)*"/g, '""');
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f + ' 里出现了 ' + needle);
      }
    }
  });

  it('运行时段：DOM 只在产出的文本里（事件名／委派／CustomEvent／按不动就不派发都在）', () => {
    const js = buildConfirmStripJs();
    assert.ok(js.includes(CONFIRM_STRIP_EVENT_COMMIT) && js.includes(CONFIRM_STRIP_EVENT_CANCEL), '两条事件名都在');
    assert.ok(js.includes('addEventListener("click"'), 'click 委派');
    assert.ok(js.includes('addEventListener("keydown"'), 'keydown 委派（Esc 走退路）');
    assert.ok(js.includes('CustomEvent') && js.includes('disabled'), '派发 CustomEvent 且按不动不派发');
    assert.ok(js.includes(CONFIRM_STRIP_COUNT_ATTR) && js.includes(CONFIRM_STRIP_IRREVERSIBLE_ATTR), '机器读数只从属性读');
  });
});

/* ── ③ 加法式 ──────────────────────────────────────────────────────── */

describe('confirm-strip ③ 加法式（不用本件即逐字节相同）', () => {
  it('不带本件的页产物里没有它的类名与事件；两次渲染逐字节相同', () => {
    const one = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const two = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(one, two, '两次渲染逐字节相同');
    assert.equal(one.includes(CONFIRM_STRIP_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(one.includes(CONFIRM_STRIP_EVENT_COMMIT), false, '不带本件时不得出现它的运行时');
  });

  it('样式段里的选择器全部落在本件类名或 `.ilife-page-ui` 上（不碰公共选择器）', () => {
    const clean = stripComments(confirmStripCss());
    for (const sel of selectors(confirmStripCss())) {
      assert.ok(sel.includes('confirm-strip') || sel.includes('page-ui'), '选择器不得碰别人：' + sel);
    }
    assert.equal(/^button\s*\{/m.test(clean), false, '不出现裸元素选择器');
    assert.equal(/^ul\s*\{/m.test(clean), false, '不出现裸元素选择器');
  });

  it('三套皮肤下标记逐字节相同（皮肤只换样式段）', () => {
    const variants = [base(), base({ undoable: false, undoHint: undefined }), base({ state: 'busy' }),
      base({ state: 'disabled', disabledHint: '原因' })];
    for (const input of variants) {
      const html = renderConfirmStrip(input);
      for (const _skin of SKIN_NAMES) assert.equal(renderConfirmStrip(input), html, '同一入参逐字节相同');
    }
    assert.ok(skinCss().includes('.ilife-skin-paper'), '皮肤段本身在（比对用）');
  });
});

/* ── 真机夹具（headless Chrome ＋ CDP）──────────────────────────────── */

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

function findBrowser() {
  return [process.env.DSH_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter((p) => typeof p === 'string' && p !== '' && existsSync(p))[0];
}

function connectCdp(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
    }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', () => rej(new Error('CDP 连接失败')));
  });
  return {
    ready,
    send(method, params, sessionId) {
      const id = nextId; nextId += 1;
      return new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
      });
    },
    close() { ws.close(); },
  };
}

/** 起一页真机夹具：`body` 里是已渲染好的标记，`css` 是样式段（皮肤段 ＋ 本件样式段）。 */
async function startPage(opts) {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"><style>' + opts.css + '</style></head>\n'
    + '<body class="' + (opts.skinClass === undefined ? '' : opts.skinClass) + '">' + opts.body
    + '\n' + new Array(opts.copies === undefined ? 1 : opts.copies).fill('<script>' + (opts.runtime || '') + '</script>').join('\n')
    + '\n</body></html>';
  const dir = mkdtempSync(join(tmpdir(), 't-confirm-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, html, 'utf8');
  const profileDir = mkdtempSync(join(tmpdir(), 't-confirm-chrome-'));
  const port = 9810 + (process.pid % 90);
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profileDir, '--window-size=1200,900', 'about:blank'],
  { stdio: ['ignore', 'pipe', 'pipe'] });
  const cleanup = () => {
    try { chrome.kill(); } catch { /* 已退出 */ }
    for (const d of [profileDir, dir]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 临时目录 */ } }
  };
  try {
    let devUrl = null;
    for (let i = 0; i < 120 && devUrl === null; i += 1) {
      try { const r = await fetch('http://127.0.0.1:' + port + '/json/version'); if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl; } catch { /* 等端口 */ }
      if (devUrl === null) await sleep(250);
    }
    if (devUrl === null) throw new Error('CDP 未就绪（headless Chrome 起不来）');
    const cdp = connectCdp(devUrl); await cdp.ready;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    const ev = async (expr) => {
      const r = await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        const d = r.exceptionDetails;
        throw new Error('页内抛错：' + (d.exception && d.exception.description ? d.exception.description : d.text));
      }
      return r.result === undefined ? undefined : r.result.value;
    };
    const key = async (k, code, vk) => {
      await s('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      await s('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
    };
    await s('Page.enable'); await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: opts.width === undefined ? 390 : opts.width, height: 900, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(150);
    await ev('window.__hits=[];window.__cancels=[];'
      + 'document.addEventListener(' + JSON.stringify(CONFIRM_STRIP_EVENT_COMMIT) + ',function(e){window.__hits.push(e.detail);});'
      + 'document.addEventListener(' + JSON.stringify(CONFIRM_STRIP_EVENT_CANCEL) + ',function(e){window.__cancels.push(e.detail);});'
      + 'window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
      + 'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rejection:"+String(e.reason));});true');
    return {
      ev,
      tab: () => key('Tab', 'Tab', 9),
      setWidth: (w) => s('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: false }),
      setReducedMotion: (reduce) => s('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }],
      }),
      setSkin: (skin) => ev('document.body.className=' + JSON.stringify(skin) + ';true'),
      hits: () => ev('window.__hits'),
      cancels: () => ev('window.__cancels'),
      errs: () => ev('window.__errs'),
      close: () => { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

/** 一页四态（三条同形、只差状态 —— 三态同高就是拿它们比的）。 */
function fixtureBody() {
  return '<div class="ilife-page-ui">'
    + renderConfirmStrip(base({ backup: true }))
    + renderConfirmStrip(base({ undoable: false, undoHint: undefined }))
    + renderConfirmStrip(base({ backup: true, state: 'busy' }))
    + renderConfirmStrip(base({ backup: true, state: 'disabled', disabledHint: '这一天已经锁定，先解锁再删。' }))
    + '</div>';
}

const FIXTURE_CSS = () => skinCss() + '\n' + confirmStripCss() + '\nbody{margin:0;padding:0}.ilife-page-ui{width:100%}';

/** 几何读数：根与文档都不许横向溢出；按钮／备份项的命中盒与间距；三态高度；危险档手段的计算样式。 */
const GEOM_EXPR = '(function(){'
  + 'var roots=[].slice.call(document.querySelectorAll(".' + CONFIRM_STRIP_CLASS + '"));'
  + 'function r(e){var b=e.getBoundingClientRect();return {w:Math.round(b.width),h:Math.round(b.height),'
  + 'left:Math.round(b.left),right:Math.round(b.right),top:Math.round(b.top),bottom:Math.round(b.bottom)};}'
  + 'return {'
  + 'de:[document.documentElement.scrollWidth,document.documentElement.clientWidth],'
  + 'overflow:roots.map(function(x){return x.scrollWidth-x.clientWidth;}),'
  + 'heights:roots.map(function(x){return Math.round(r(x).h);}),'
  + 'statusHeights:roots.map(function(x){return Math.round(r(x.querySelector(".' + STATUS + '")).h);}),'
  + 'targets:roots.map(function(x){return [].slice.call(x.querySelectorAll("button,label")).map(function(e){'
  + 'var b=r(e);return {tag:e.tagName,w:b.w,h:b.h,left:b.left,right:b.right,top:b.top,bottom:b.bottom,'
  + 'txt:(e.textContent||"").slice(0,12)};});}),'
  + 'irrBorder:getComputedStyle(roots[1]).borderStyle,'
  + 'dangerWeight:getComputedStyle(roots[1].querySelector(".' + DANGER + '")).fontWeight,'
  + 'restWeight:getComputedStyle(roots[0].querySelector(".' + DANGER + '")).fontWeight,'
  + 'disabledCursor:getComputedStyle(roots[3].querySelector(".' + DANGER + '")).cursor,'
  + 'disabledWeight:getComputedStyle(roots[3].querySelector(".' + DANGER + '")).fontWeight,'
  + 'bg:roots.map(function(x){return getComputedStyle(x).backgroundColor;}),'
  + 'radius:getComputedStyle(roots[0]).borderTopLeftRadius,'
  + 'markup:roots.map(function(x){return x.outerHTML;})'
  + '};}())';

/* ── ④ 真机两档几何 ────────────────────────────────────────────────── */

describe('confirm-strip ④ 真机两档几何（无头 Chrome）', () => {
  it('390／1280：零横向溢出 ＋ 触控目标 ≥44×44 ＋ 相邻目标间距 ≥8 ＋ 三态同高', async (t) => {
    const p = await startPage({ css: FIXTURE_CSS(), body: fixtureBody(), width: 390 });
    if (p === null) return t.skip('本机无 Chrome／Chromium：两档几何与运行时判据需真浏览器');
    try {
      for (const width of [390, 1280]) {
        await p.setWidth(width);
        await sleep(150);
        const g = await p.ev(GEOM_EXPR);
        assert.ok(g.de[0] <= g.de[1], width + '：文档零横向溢出（' + g.de[0] + ' ≤ ' + g.de[1] + '）');
        for (const over of g.overflow) assert.ok(over <= 0, width + '：本条零横向溢出，实为 ' + over);
        for (const list of g.targets) {
          for (const el of list) {
            assert.ok(el.w >= CONFIRM_STRIP_TOUCH_MIN_PX && el.h >= CONFIRM_STRIP_TOUCH_MIN_PX,
              width + '：触控目标 ' + el.tag + '「' + el.txt + '」只有 ' + el.w + '×' + el.h + '，要 ≥44×44');
          }
          for (let i = 1; i < list.length; i += 1) {
            const a = list[i - 1]; const b = list[i];
            const sameRow = Math.abs(a.top - b.top) < 4;
            const gap = sameRow ? b.left - a.right : b.top - a.bottom;
            assert.ok(gap >= 8, width + '：相邻目标间距 ' + gap + ' < 8（' + a.txt + ' → ' + b.txt + '）');
          }
        }
        assert.equal(g.heights[0], g.heights[2], width + '：rest 与 busy 的高度必须相同（' + g.heights[0] + ' vs ' + g.heights[2] + '）');
        assert.equal(g.heights[0], g.heights[3], width + '：rest 与 disabled 的高度必须相同（' + g.heights[0] + ' vs ' + g.heights[3] + '）');
        for (const h of g.statusHeights) assert.ok(h > 0, width + '：状态行恒占位（高度 > 0）');
        /* 读数原文（回执要的就是这两行）：容器的 scrollWidth/clientWidth 与命中盒的宽×高。 */
        const boxes = g.targets[0].map((e) => e.txt + ' ' + e.w + '×' + e.h).join('、');
        const gaps = g.targets[0].map((e, i) => (i === 0 ? null : e))
          .filter(Boolean).map((e, i, all) => (i === 0 ? null : Math.round(e.top - all[i - 1].bottom))).filter((v) => v !== null);
        console.log('读数 confirm-strip ' + width + '档：文档 scroll/client＝' + g.de[0] + '/' + g.de[1]
          + '，四条 root 的 scrollWidth−clientWidth＝' + g.overflow.join('/')
          + '，三态高度 ' + g.heights[0] + '/' + g.heights[2] + '/' + g.heights[3]
          + '，状态行高 ' + g.statusHeights.join('/') + '，命中盒 ' + boxes + '，纵向间距 ' + gaps.join('/'));
        assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
      }
    } finally { p.close(); }
  });
});

/* ── ⑤ 真机状态矩阵与三皮肤 ───────────────────────────────────────── */

describe('confirm-strip ⑤ 状态矩阵与三皮肤（无头 Chrome）', () => {
  it('危险档另有手段在真机上成立；焦点可见；禁用有 not-allowed；三皮肤下标记逐字节相同', async (t) => {
    const p = await startPage({ css: FIXTURE_CSS(), body: fixtureBody(), width: 390 });
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      const g = await p.ev(GEOM_EXPR);
      assert.equal(g.irrBorder.startsWith('double'), true, '不可撤销的整条是双线框，实为 ' + g.irrBorder);
      assert.ok(Number(g.dangerWeight) > Number(g.restWeight),
        '不可撤销的危险按钮字重要重过可撤销档：' + g.dangerWeight + ' vs ' + g.restWeight);
      assert.ok(Number(g.dangerWeight) >= 800, '不可撤销的危险按钮字重 800，实为 ' + g.dangerWeight);
      assert.ok(Number(g.disabledWeight) <= 600, '禁用档要落回普通字重，实为 ' + g.disabledWeight);
      assert.equal(g.disabledCursor, 'not-allowed', '禁用要说明「点不动」');

      /* 焦点可见：真 Tab 走一遍，焦点圈必须在（不许 outline:none 无替代）。
         第一条 Tab 落在备份复选框上（视觉画在它的兄弟盒子上），第二条落在安全按钮上 —— 两条都断。 */
      const focusInfo = '(function(){var a=document.activeElement;var box=a.nextElementSibling;'
        + 'var s=box?getComputedStyle(box):null;'
        + 'return {tag:a.tagName,inside:!!(a.closest&&a.closest(".' + CONFIRM_STRIP_CLASS + '")),'
        + 'boxStyle:s?s.outlineStyle:"",boxWidth:s?s.outlineWidth:"",'
        + 'ownStyle:getComputedStyle(a).outlineStyle,ownWidth:getComputedStyle(a).outlineWidth};}())';
      await p.tab();
      await sleep(80);
      const onCheckbox = await p.ev(focusInfo);
      assert.equal(onCheckbox.inside, true, 'Tab 落在本条内：' + JSON.stringify(onCheckbox));
      assert.equal(onCheckbox.tag, 'INPUT', '第一条 Tab 落到备份复选框');
      assert.ok(Number.parseFloat(onCheckbox.boxWidth) >= 2 && onCheckbox.boxStyle !== 'none',
        '复选框的焦点圈画在它的视觉盒子上：' + JSON.stringify(onCheckbox));
      await p.tab();
      await sleep(80);
      const onButton = await p.ev(focusInfo);
      assert.equal(onButton.tag, 'BUTTON', '第二条 Tab 落到按钮：' + JSON.stringify(onButton));
      assert.ok(Number.parseFloat(onButton.ownWidth) >= 2 && onButton.ownStyle !== 'none',
        '按钮的焦点圈要看得见：' + JSON.stringify(onButton));

      /* 三套皮肤：标记逐字节相同，样式取值真的不同（圆角档逐档对上取值表 = 皮肤确实挂上了）。 */
      const markup = g.markup[0];
      const colors = new Set();
      for (const skin of SKIN_NAMES) {
        await p.setSkin('ilife-skin-' + skin);
        await sleep(80);
        const gg = await p.ev(GEOM_EXPR);
        assert.equal(gg.markup[0], markup, skin + '：三套皮肤下标记必须逐字节相同');
        assert.equal(gg.irrBorder.startsWith('double'), true, skin + '：双线框在任何皮肤下都在（危险档不许只靠红）');
        assert.equal(Number.parseFloat(gg.radius), Number.parseFloat(SKIN_VALUES[skin].radius),
          skin + '：圆角档要对上皮肤取值表（皮肤生效的证据）；实为 ' + gg.radius + ' vs ' + SKIN_VALUES[skin].radius);
        colors.add(gg.bg[0]);
      }
      /* 危险软底：paper 与 neutral 不同（broadsheet 与 paper 共用同一档软底，故只断「不止一档」）。 */
      assert.ok(colors.size >= 2, '危险软底至少两档不同：' + [...colors].join(' / '));
      console.log('读数 confirm-strip 三皮肤：圆角档对表 paper ' + SKIN_VALUES.paper.radius
        + '／broadsheet ' + SKIN_VALUES.broadsheet.radius + '／neutral ' + SKIN_VALUES.neutral.radius
        + '，不可撤销的 border-style＝' + g.irrBorder + '，危险按钮字重（不可撤销／可撤销／禁用）＝'
        + g.dangerWeight + '/' + g.restWeight + '/' + g.disabledWeight
        + '，危险软底 ' + [...colors].join(' / '));

      /* 悬停只加一条通路：媒体查询里；按下反馈在 reduced-motion 下停住。 */
      await p.setSkin('ilife-skin-paper');
      await p.setReducedMotion(true);
      await sleep(80);
      const still = await p.ev('(function(){var b=document.querySelectorAll(".' + DANGER + '")[0];'
        + 'var s=getComputedStyle(b);return {d:s.transitionDuration,p:s.transitionProperty};}())');
      assert.equal(still.d, '0s', 'prefers-reduced-motion 下按下反馈停住，实为 ' + still.d);
      await p.setReducedMotion(false);
      await sleep(80);
      const moving = await p.ev('(function(){var b=document.querySelectorAll(".' + DANGER + '")[0];'
        + 'return getComputedStyle(b).transitionDuration;}())');
      assert.notEqual(moving, '0s', '不限制动效时按下反馈要在（否则 hover／active 全靠瞬时，反馈读不出来）');
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});

/* ── ⑥ 真机运行时 ─────────────────────────────────────────────────── */

describe('confirm-strip ⑥ 运行时（委派 ＋ 幂等 ＋ 按不动就不派发）', () => {
  it('两份运行时：点危险只派发一条；点安全与 Esc 走退路；busy／disabled 按不动', async (t) => {
    const p = await startPage({
      css: FIXTURE_CSS(), body: fixtureBody(), width: 390, runtime: buildConfirmStripJs(), copies: 2,
    });
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      const click = (i, which) => '(function(){var r=document.querySelectorAll(".' + CONFIRM_STRIP_CLASS + '")['
        + i + '];r.querySelector("[data-ilife-confirm-act=' + which + ']").click();return true;}())';
      await p.ev(click(0, 'danger'));
      await sleep(60);
      assert.equal((await p.hits()).length, 1, '两份运行时也只派发一条（幂等）');
      assert.deepEqual((await p.hits())[0], {
        action: 'danger', count: 3, unit: CONFIRM_STRIP_UNIT_DEFAULT, irreversible: false, backup: true,
      }, '事件载荷（备份项缺省勾上）');
      await p.ev(click(0, 'keep'));
      await sleep(60);
      assert.equal((await p.cancels()).length, 1, '安全动作走退路事件');
      assert.equal((await p.cancels())[0].action, 'keep');

      await p.ev(click(1, 'danger'));
      await sleep(60);
      assert.equal((await p.hits())[1].irreversible, true, '不可撤销落进事件');

      const before = (await p.cancels()).length;
      await p.ev('(function(){var r=document.querySelectorAll(".' + CONFIRM_STRIP_CLASS + '")[0];'
        + 'r.querySelector(".' + DANGER + '").focus();'
        + 'document.activeElement.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));return true;}())');
      await sleep(60);
      assert.equal((await p.cancels()).length, before + 1, 'Esc 走退路');

      const hitsBefore = (await p.hits()).length;
      const cancelsBefore = (await p.cancels()).length;
      for (const i of [2, 3]) {
        await p.ev('(function(){var r=document.querySelectorAll(".' + CONFIRM_STRIP_CLASS + '")[' + i + '];'
          + 'r.querySelector("[data-ilife-confirm-act=danger]").click();'
          + 'r.querySelector("[data-ilife-confirm-act=keep]").click();'
          + 'r.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));return true;}())');
      }
      await sleep(60);
      assert.equal((await p.hits()).length, hitsBefore, 'busy／disabled 不许派发危险事件');
      assert.equal((await p.cancels()).length, cancelsBefore, 'busy／disabled 不许派发退路事件');
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});
