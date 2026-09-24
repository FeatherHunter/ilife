/** timer-card（计时卡）· 契约测试。
 *
 *  四组判据：
 *   ① **渲染契约**：结构与槽位／四态状态字与主按钮字／机器属性（状态、剩余、总时长）／空态（`totalSeconds = 0`）／
 *      时钟口径 `timerClockText`／**全部**非法入参分支；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤／scope 在 `.ilife-page-ui` 下／零 `:root`／`!important`／
 *      **四态标签形状差异**／进度条只动 `transform`／窄档走 `@container`；`dist/**` 的**代码**零 DOM；
 *   ③ **加法式**：只读自己的类名、渲染两次逐字节相同；
 *   ④ **真机**：390／1280 两档零横向溢出 ＋ 大数字不截断 ＋ **真计时**（开始／暂停／继续／重置／到点）
 *      ＋ 状态矩阵（`:focus-visible` 可见、按钮 ≥44×44、`disabled`、`loading` 换字不跳版、`error` 挂
 *      `aria-describedby`、`empty`、`prefers-reduced-motion` 下不卡）＋ 事件（`ilife:timer-state`／`ilife:timer-done`）
 *      ＋ 运行时段与渲染段的时钟口径对得上。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TIMER_CARD_CLASS, TIMER_CARD_EMPTY_LINE, TIMER_CARD_FORMS, TIMER_CARD_MISSING, TIMER_CARD_NARROW_MAX_PX,
  TIMER_CARD_BUTTON_MIN_HEIGHT_PX, TIMER_CARD_BUTTON_MIN_WIDTH_PX, TIMER_CARD_VALUE_PX, TIMER_CARD_TICK_MS,
  TIMER_EVENT_DONE, TIMER_EVENT_STATE, TIMER_KEY_ATTR, TIMER_LOADING_LABEL, TIMER_PRIMARY_LABELS,
  TIMER_REMAIN_ATTR, TIMER_STATE_ATTR, TIMER_STATE_WORDS, TIMER_STATES, TIMER_TOTAL_ATTR,
  buildTimerCardJs, renderTimerCard, timerCardCss, timerCardSlot, timerClockText,
} from '../dist/components/timer-card/index.js';
import { SKIN_TOKEN_NAMES, skinTokenVar } from '../dist/components/skin/index.js';
import { startFamilyPage, sleep } from './_f5-probe.mjs';
import { styleSource } from './_style-sources.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const ROOT_SEL = '.' + TIMER_CARD_CLASS;
const slot = (name) => '.' + timerCardSlot(name);
const cardSel = (key) => '[' + TIMER_KEY_ATTR + '="' + key + '"]';
const actSel = (key, act) => cardSel(key) + ' [' + 'data-ilife-timer-act' + '="' + act + '"]';

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('timer-card ① 渲染契约', () => {
  it('结构：卡头（标题 ＋ 状态字）＋ 大数字 ＋ 进度条 ＋ 读数 ＋ 提示 ＋ 按钮排', () => {
    const html = renderTimerCard({
      key: 'stir', title: '第 3 步 · 煸炒五花肉', totalSeconds: 180, elapsedSeconds: 100,
      hint: '这一步结束后紧接着下豆豉，先把豆豉舀好放在手边。',
    });
    assert.ok(html.startsWith('<div class="' + TIMER_CARD_CLASS + '"'), '根用类名根打头：' + html.slice(0, 90));
    assert.ok(html.includes(TIMER_KEY_ATTR + '="stir"'), '机器键上属性');
    assert.ok(html.includes(TIMER_STATE_ATTR + '="idle"'), '缺省状态＝待开始');
    assert.ok(html.includes(TIMER_TOTAL_ATTR + '="180000"'), '总时长（毫秒）上属性');
    assert.ok(html.includes(TIMER_REMAIN_ATTR + '="80000"'), '剩余（毫秒）上属性');
    assert.ok(html.includes(slot('title').slice(1) + '">第 3 步 · 煸炒五花肉<'), '标题');
    assert.ok(html.includes(slot('tag').slice(1) + ' is-idle" data-ilife-timer-tag="1">' + TIMER_STATE_WORDS.idle + '<'),
      '状态字带状态类与机器锚');
    assert.ok(html.includes(slot('display-value').slice(1) + '" data-ilife-timer-display="1">01:20<'), '大数字是剩余时间');
    assert.ok(html.includes(slot('display-unit').slice(1) + '">还剩<'), '大数字后的说法');
    assert.ok(html.includes('transform:scaleX(0.5556)'), '进度条按已过比例给初值');
    assert.ok(html.includes(slot('readouts').slice(1) + '"><span>已过 <b data-ilife-timer-elapsed="1">01:40</b></span>'
      + '<span>总 <b>03:00</b></span><span>还剩 <b data-ilife-timer-rest="1">01:20</b></span>'), '三枚读数');
    assert.ok(html.includes(slot('hint').slice(1) + '">这一步结束后紧接着下豆豉，先把豆豉舀好放在手边。<'), '提示句');
    assert.ok(html.includes('<button type="button" class="' + timerCardSlot('button') + '" data-ilife-timer-act="toggle"'),
      '主按钮带动作键 toggle');
    assert.ok(html.includes('>' + TIMER_PRIMARY_LABELS.idle + '<') && html.includes('>重置<'), '两枚按钮的字');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
  });

  it('四态闭集与各自的字：主按钮按状态换字', () => {
    assert.deepEqual([...TIMER_STATES], ['idle', 'running', 'paused', 'done']);
    assert.deepEqual([...TIMER_CARD_FORMS], ['card'], '形态闭集只有形态 A「卡式大数字」');
    for (const state of TIMER_STATES) {
      const html = renderTimerCard({ key: 'k', title: 't', totalSeconds: 60, elapsedSeconds: state === 'done' ? 60 : 0, state });
      assert.ok(html.includes(' is-' + state + '" data-ilife-timer-tag="1">' + TIMER_STATE_WORDS[state] + '<'), '状态字：' + state);
      assert.ok(html.includes('>' + TIMER_PRIMARY_LABELS[state] + '<'), '主按钮字：' + state);
    }
  });

  it('空态（还没设时长）：大数字写 `—`、按钮按不动、卡上写明"还没设时长"', () => {
    const html = renderTimerCard({ key: 'k', title: '还没定', totalSeconds: 0 });
    assert.ok(html.includes(slot('display-value').slice(1) + '" data-ilife-timer-display="1">' + TIMER_CARD_MISSING + '<'),
      '缺值写成 —（不写 0、不留空）');
    assert.equal((html.match(/disabled/g) || []).length >= 2, true, '两枚按钮都按不动');
    assert.ok(html.includes(slot('absent').slice(1) + '">' + TIMER_CARD_EMPTY_LINE + '<'), '空态那一句');
    const custom = renderTimerCard({ key: 'k', title: 't', totalSeconds: 0, absentLine: '这锅还没定时间' });
    assert.ok(custom.includes('这锅还没定时间'), '空态那句可覆盖');
  });

  it('loading／error／disabled 三档：原地换字、错态挂 aria-describedby、禁用按不动', () => {
    const html = renderTimerCard({
      key: 'k', title: 't', totalSeconds: 60, loading: true, error: '没连上：再试一次',
    });
    assert.ok(html.includes('data-ilife-timer-busy="1"') && html.includes('aria-busy="true"'), '整卡忙态可读');
    assert.ok(html.includes('>' + TIMER_LOADING_LABEL + '<'), '主按钮原地换字');
    assert.ok(html.includes(slot('error').slice(1) + '" id="ilife-timer-err-k" role="alert">没连上：再试一次<'), '错态写在按钮旁');
    assert.ok(html.includes('aria-describedby="ilife-timer-err-k"'), '错态挂上 aria-describedby');
    const off = renderTimerCard({ key: 'k', title: 't', totalSeconds: 60, disabled: true });
    assert.ok(off.includes('data-ilife-timer-disabled="1"') && off.includes('aria-disabled="true"'), '禁用可读');
  });

  it('时钟口径写在一处（渲染段与运行时段同一份）：`MM:SS`，≥1 小时才出小时位', () => {
    assert.equal(timerClockText(0), '00:00');
    assert.equal(timerClockText(9), '00:09');
    assert.equal(timerClockText(60), '01:00');
    assert.equal(timerClockText(80), '01:20');
    assert.equal(timerClockText(599), '09:59');
    assert.equal(timerClockText(3600), '1:00:00');
    assert.equal(timerClockText(3725), '1:02:05');
    assert.equal(timerClockText(-5), '00:00', '负值夹到 0（不出现 -00:05）');
    const js = buildTimerCardJs();
    assert.ok(js.includes('h>0 ? h+":"+pad2(m)+":"+pad2(s) : pad2(m)+":"+pad2(s)'), '运行时段里是同一条口径');
  });

  it('入参违规一律拒（不静默降级）：逐条断 BlocksError', () => {
    const throws = (fn) => {
      try { fn(); } catch (e) { return e.name === 'BlocksError'; }
      return false;
    };
    assert.equal(throws(() => renderTimerCard(null)), true, '入参不是对象');
    assert.equal(throws(() => renderTimerCard({ title: 't', totalSeconds: 1 })), true, 'key 必填');
    assert.equal(throws(() => renderTimerCard({ key: 'k', totalSeconds: 1 })), true, 'title 必填');
    assert.equal(throws(() => renderTimerCard({ key: 'k', title: 't' })), true, '总时长必填');
    assert.equal(throws(() => renderTimerCard({ key: 'k', title: 't', totalSeconds: -1 })), true, '总时长不许为负');
    assert.equal(throws(() => renderTimerCard({ key: 'k', title: 't', totalSeconds: Number.NaN })), true, '总时长必须是有限数');
    assert.equal(throws(() => renderTimerCard({ key: 'k', title: 't', totalSeconds: 10, elapsedSeconds: 11 })), true, '已过不得大于总时长');
    assert.equal(throws(() => renderTimerCard({ key: 'k', title: 't', totalSeconds: 10, state: 'paused' , elapsedSeconds: 11 })), true, '先报已过越界');
    assert.equal(throws(() => renderTimerCard({ key: 'k', title: 't', totalSeconds: 10, state: 'running' })), false,
      '合法状态照收（对照）');
    assert.equal(throws(() => renderTimerCard({ key: 'k', title: 't', totalSeconds: 10, state: 'flying' })), true, '状态闭集外');
    assert.equal(throws(() => renderTimerCard({ key: 'k', title: 't', totalSeconds: 0, state: 'running' })), true, '空态只许 idle');
    assert.equal(throws(() => renderTimerCard({ key: 'k', title: 't', totalSeconds: 10, loading: '1' })), true, 'loading 必须是布尔');
    assert.equal(throws(() => renderTimerCard({ key: 'k', title: 't', totalSeconds: 10, form: 'ring' })), true, '形态闭集外');
    assert.equal(throws(() => renderTimerCard({ key: 'k', title: 't', totalSeconds: 10, extraClass: 'a b!' })), true, '附加类名不合法');
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('timer-card ② 样式与零 DOM 纪律', () => {
  it('全部规则 scope 在 `.ilife-page-ui` 下、只读自己的类名、窄档走容器查询', () => {
    const css = stripComments(timerCardCss());
    assert.ok(css.trim() !== '', '样式段必须非空');
    const selectors = (css.match(/^[^@\s][^{\n]*\{/gm) || []);
    assert.ok(selectors.length >= 20, '选择器条数太少：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '必须 scope 在 .ilife-page-ui：' + sel.trim());
      assert.ok(sel.includes(TIMER_CARD_CLASS), '只许读自己的类名根：' + sel.trim());
    }
    assert.ok(css.includes('@container'), '窄档必须走容器查询');
    assert.equal(/@media[^{]*max-width/.test(css), false, '媒体查询不许判宽度');
    assert.ok(css.includes(String(TIMER_CARD_NARROW_MAX_PX) + 'px'), '窄档断点取常量');
    assert.ok(css.includes(String(TIMER_CARD_BUTTON_MIN_HEIGHT_PX) + 'px'), '按钮高度下限取常量（44）');
    assert.ok(css.includes(String(TIMER_CARD_BUTTON_MIN_WIDTH_PX) + 'px'), '按钮宽度下限取常量（换字不跳版）');
    assert.ok(css.includes(String(TIMER_CARD_VALUE_PX) + 'px'), '大数字字号取常量');
  });

  it('**四态标签形状差异**：底线／实底块／描边空心／双线框', () => {
    const css = stripComments(timerCardCss());
    assert.ok(/\.is-idle \{[^}]*border-bottom: 2px solid/.test(css), '待开始：只带底线');
    assert.ok(/\.is-running \{[^}]*background: var\(--ilife-accent/.test(css), '计时中：实底块');
    assert.ok(/\.is-paused \{[^}]*border: 1px solid/.test(css), '已暂停：描边空心');
    assert.ok(/\.is-done \{[^}]*border: 3px double/.test(css), '到点了：双线框');
  });

  it('只经 skinVar 读皮肤：零 `:root`／`!important`／新 token／手写 var(--ilife-…)', () => {
    const css = stripComments(timerCardCss());
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.deepEqual(css.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    const src = styleSource('timer-card')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    assert.deepEqual(src.match(/var\(\s*--ilife-/g) || [], [], '手写了 var(--ilife-…)：请走 skinVar()');
    const produced = [...css.matchAll(/var\(--ilife-[a-z0-9-]+([^)]*)/g)].map((m) => m[1]);
    assert.ok(produced.length >= 10, '读的 token 太少：' + produced.length);
    for (const rest of produced) assert.ok(rest.startsWith(', '), 'skinVar 之外的字面 var(--ilife-…)：' + rest);
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => skinTokenVar(k)));
    for (const name of new Set([...css.matchAll(/var\((--ilife-[a-z0-9-]+),/g)].map((m) => m[1]))) {
      assert.ok(known.has(name), '名单外的 token：' + name);
    }
  });

  it('状态矩阵的样式面：设备能力查询、可见焦点环、禁用光标、减动效、只动 transform', () => {
    const css = stripComments(timerCardCss());
    assert.ok(css.includes('@media (hover:hover) and (pointer:fine)'), '悬停必须包在设备能力查询里');
    assert.ok(css.includes(':focus-visible'), '必须有可见焦点');
    assert.ok(css.includes('outline: 2px solid'), '焦点环 ≥2px');
    assert.ok(css.includes('cursor: not-allowed'), '禁用要给禁用光标');
    assert.ok(css.includes('@media (prefers-reduced-motion:reduce)'), '减动效要有交代');
    assert.ok(css.includes(':active { transform: scale(.98); }'), '按下只动 transform（≤80ms）');
    assert.ok(/bar-fill \{[^}]*transform: scaleX\(0\)/.test(css), '进度条填充是 scaleX（不是宽度）');
    assert.equal(/transition\s*:[^;]*(width|height|background)/.test(css), false, '不许过渡宽度／高度／底色');
    assert.equal(/transitionend/.test(css), false, '不许依赖 transitionend');
  });

  it('`dist/components/timer-card/**` 的代码零 document.／window.／navigator.（DOM 只在产出文本里）', () => {
    const dir = join(PKG, 'dist', 'components', 'timer-card');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 5, '至少应扫到本件的编译产物：' + files.length);
    for (const f of files) {
      let code = readFileSync(f, 'utf8');
      code = code.replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/`(?:[^`\\]|\\.)*`/g, '``').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.ok(!code.includes(needle), f.replace(PKG, '') + ' 的代码里出现 ' + needle);
      }
    }
  });

  it('运行时是**产出的 JS 文本**：幂等标记、一个心跳、事件名、不含 `<script>`', () => {
    const js = buildTimerCardJs();
    assert.ok(js.startsWith('(function(){'), '一段 IIFE');
    assert.ok(js.includes('data-ilife-timer-runtime'), '幂等标记');
    assert.ok(js.includes('setInterval(tick, TICK)'), '一个心跳驱动全页');
    assert.ok(js.includes(String(TIMER_CARD_TICK_MS)), '心跳间隔取常量');
    assert.ok(js.includes(TIMER_EVENT_STATE) && js.includes(TIMER_EVENT_DONE), '两个事件名取常量');
    assert.ok(js.includes('Date.now()'), '按到点时刻记账（不是数 tick）');
    assert.ok(!/<script/i.test(js), '不含脚本标签');
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('timer-card ③ 加法式（不碰公共选择器、渲染确定）', () => {
  it('标记只带自己的类名（顶多加四态修饰类 is-<态>／is-quiet 与一个 extraClass）', () => {
    const html = renderTimerCard({ key: 'k', title: 't', totalSeconds: 60, extraClass: 'mine-extra' });
    const modifiers = new Set(['quiet'].concat([...TIMER_STATES]).map((s) => 'is-' + s));
    for (const cls of [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/))) {
      assert.ok(cls.startsWith(TIMER_CARD_CLASS) || modifiers.has(cls) || cls === 'mine-extra',
        '混进了别人的类名：' + cls);
    }
  });

  it('同样的入参渲染两次逐字节相同（纯函数、无全局状态）', () => {
    const input = { key: 'k', title: 't', totalSeconds: 60, elapsedSeconds: 12 };
    assert.equal(renderTimerCard(input), renderTimerCard(input));
  });
});

/* ── ④ 真机：两档几何 ＋ 真计时 ＋ 状态矩阵 ─────────────────────────── */

describe('timer-card ④ 真机（无头 Chrome）', () => {
  it('390／1280 几何 ＋ 开始／暂停／继续／到点／重置 ＋ 状态矩阵逐档', async (t) => {
    const body = renderTimerCard({ key: 'boil', title: '煮面', totalSeconds: 4, hint: '水开后下面。' })
      + renderTimerCard({ key: 'stir', title: '煸炒五花肉', totalSeconds: 3, loading: true, error: '没连上：再试一次' })
      + renderTimerCard({ key: 'none', title: '还没定', totalSeconds: 0 });
    const p = await startFamilyPage({ css: timerCardCss(), bodyHtml: body, runtime: buildTimerCardJs(), copies: 2 });
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何与交互判据需真浏览器');
    try {
      await p.ev('window.__states=[];window.__dones=[];'
        + 'document.addEventListener(' + JSON.stringify(TIMER_EVENT_STATE) + ',function(e){window.__states.push(e.detail);});'
        + 'document.addEventListener(' + JSON.stringify(TIMER_EVENT_DONE) + ',function(e){window.__dones.push(e.detail);});true');
      const read = (key) => p.ev('(function(){var r=document.querySelector(' + JSON.stringify(cardSel(key))
        + '); return {state:r.getAttribute(' + JSON.stringify(TIMER_STATE_ATTR) + '),'
        + 'remain:Number(r.getAttribute(' + JSON.stringify(TIMER_REMAIN_ATTR) + ')),'
        + 'display:r.querySelector(' + JSON.stringify(slot('display-value')) + ').textContent,'
        + 'tag:r.querySelector(' + JSON.stringify(slot('tag')) + ').textContent,'
        + 'main:r.querySelector(' + JSON.stringify('[' + 'data-ilife-timer-act="toggle"]') + ').textContent};}())');

      /* 两档几何：零横向溢出 ＋ 大数字／读数不截断。 */
      const keys = [slot('display-value'), slot('tag'), slot('readouts'), slot('error')];
      for (const w of [390, 1280]) {
        await p.setWidth(w);
        const m = await p.metrics({ roots: [ROOT_SEL], keys });
        assert.equal(m.stage.w, w);
        assert.ok(m.stage.sw <= m.stage.cw + 1, w + ' 档舞台横向溢出');
        assert.ok(m.page.sw <= m.page.cw + 1, w + ' 档页面横向溢出');
        assert.equal(m.roots.length, 3, w + ' 档三张卡都在');
        for (const r of m.roots) assert.ok(r.sw <= r.cw + 1, w + ' 档件根横向溢出：' + r.sw + ' > ' + r.cw);
        for (const k of m.keys) {
          assert.ok(k.n > 0, w + ' 档关键语义没扫到：' + k.selector);
          for (const it of k.items) {
            assert.ok(it.sw <= it.cw + 1, w + ' 档 ' + k.selector + ' 被截断：' + it.text);
            assert.ok(it.right <= it.stageRight + 1, w + ' 档 ' + k.selector + ' 顶出舞台：' + it.right);
          }
        }
      }
      await p.setWidth(1280);

      /* 触控地板 ＋ 换字不跳版：主按钮 ≥44 高、≥112 宽；"开始"与"开始中…"同宽。 */
      const mainBtn = await p.hitRead(actSel('boil', 'toggle'));
      assert.equal(mainBtn.tag, 'button', '主按钮是真按钮');
      assert.ok(mainBtn.w >= TIMER_CARD_BUTTON_MIN_WIDTH_PX && mainBtn.h >= TIMER_CARD_BUTTON_MIN_HEIGHT_PX,
        '按钮命中盒 ' + mainBtn.w + '×' + mainBtn.h + ' 小于 112×44');
      const loadingBtn = await p.hitRead(actSel('stir', 'toggle'));
      assert.equal(await p.ev('document.querySelector(' + JSON.stringify(actSel('stir', 'toggle')) + ').textContent'),
        TIMER_LOADING_LABEL, '处理中：原地换字');
      assert.equal(loadingBtn.w, mainBtn.w, '换字不跳版（同宽）：' + loadingBtn.w + ' vs ' + mainBtn.w);

      /* 空态：大数字写 —、按钮按不动、点了不落账。 */
      const emptyState = await read('none');
      assert.equal(emptyState.display, TIMER_CARD_MISSING, '空态大数字写 —');
      assert.equal(await p.ev('document.querySelector(' + JSON.stringify(actSel('none', 'toggle')) + ').disabled'), true,
        '空态主按钮按不动');
      await p.ev('document.querySelector(' + JSON.stringify(actSel('none', 'toggle')) + ').click();true');
      await sleep(120);
      assert.equal(await p.ev('window.__states.length'), 0, '空态点了不派发');

      /* 开始：状态转 running、大数字开始走。 */
      assert.deepEqual((await read('boil')).state, 'idle', '起手待开始');
      await p.ev('document.querySelector(' + JSON.stringify(actSel('boil', 'toggle')) + ').click();true');
      await sleep(140);
      const started = await read('boil');
      assert.equal(started.state, 'running', '点开始 ⇒ 计时中');
      assert.equal(started.tag, TIMER_STATE_WORDS.running, '状态字跟着换');
      assert.equal(started.main, TIMER_PRIMARY_LABELS.running, '主按钮换成"暂停"');
      assert.ok(await p.ev('window.__states.length') >= 1, '状态变化派发事件');
      await sleep(1200);
      const after = await read('boil');
      assert.ok(after.remain < started.remain - 900, '大数字真的在走：' + started.remain + ' → ' + after.remain);
      assert.ok(await p.ev('document.querySelector(' + JSON.stringify(cardSel('boil') + ' ' + slot('bar-fill'))
        + ').style.transform.indexOf("scaleX(0.") >= 0'), '进度条跟着走');
      assert.ok(after.display !== started.display, '显示的时钟也跟着走：' + after.display);

      /* 暂停：冻住（400ms 内读数不动），再点继续。 */
      await p.ev('document.querySelector(' + JSON.stringify(actSel('boil', 'toggle')) + ').click();true');
      await sleep(140);
      const paused = await read('boil');
      assert.equal(paused.state, 'paused', '再点一次 ⇒ 已暂停');
      assert.equal(paused.tag, TIMER_STATE_WORDS.paused, '状态字换成"已暂停"');
      assert.equal(paused.main, TIMER_PRIMARY_LABELS.paused, '主按钮换成"继续"');
      await sleep(400);
      assert.equal((await read('boil')).remain, paused.remain, '暂停期间读数冻住');
      await p.ev('document.querySelector(' + JSON.stringify(actSel('boil', 'toggle')) + ').click();true');
      await sleep(140);
      assert.equal((await read('boil')).state, 'running', '再点 ⇒ 接着走');

      /* 到点：等它走完（总 4 秒）⇒ done ＋ 00:00 ＋ ilife:timer-done。 */
      for (let i = 0; i < 40 && (await read('boil')).state !== 'done'; i += 1) await sleep(200);
      const done = await read('boil');
      assert.equal(done.state, 'done', '走完 ⇒ 到点了');
      assert.equal(done.display, '00:00', '大数字停在 00:00');
      assert.equal(done.tag, TIMER_STATE_WORDS.done, '状态字换成"到点了"');
      assert.equal(done.main, TIMER_PRIMARY_LABELS.done, '主按钮换成"重新开始"');
      assert.equal(await p.ev('window.__dones.length'), 1, '到点事件恰好一条：' + JSON.stringify(await p.ev('window.__dones')));
      const doneDetail = await p.ev('window.__dones[0]');
      assert.equal(doneDetail.key, 'boil');
      assert.equal(doneDetail.remainingMs, 0);
      /* 到了终态**不许把按钮禁掉**（"成功回执不得禁用"）：到点了还能重新开始、还能重置。 */
      assert.equal(await p.ev('document.querySelector(' + JSON.stringify(actSel('boil', 'toggle')) + ').disabled'), false,
        '到点了主按钮仍可按（重新开始）');
      assert.equal(await p.ev('document.querySelector(' + JSON.stringify(actSel('boil', 'reset')) + ').disabled'), false,
        '到点了重置按钮仍可按');

      /* 重置：回到待开始、剩余＝总时长。 */
      await p.ev('document.querySelector(' + JSON.stringify(actSel('boil', 'reset')) + ').click();true');
      await sleep(140);
      const reset = await read('boil');
      assert.equal(reset.state, 'idle', '重置 ⇒ 待开始');
      assert.equal(reset.display, '00:04', '重置 ⇒ 剩余回到总时长');
      assert.equal(reset.main, TIMER_PRIMARY_LABELS.idle, '主按钮回到"开始"');

      /* 幂等：两份运行时都注入了，事件也不重复（状态事件数按状态变化次数走）。 */
      const dup = await p.ev('window.__states.filter(function(d){return d.state==="done";}).length');
      assert.equal(dup, 1, '状态事件里的 done 也只来一条（重复注入只绑一次）');

      /* :focus-visible：真键盘 Tab 到第一枚按钮，焦点环 ≥2px。 */
      await p.pressTab();
      const focus = await p.focusRead();
      assert.equal(focus.tag, 'button', '第一枚可聚焦是按钮：' + JSON.stringify(focus));
      assert.equal(focus.focusVisible, true, ':focus-visible 必须亮');
      assert.ok(parseFloat(focus.outlineWidth) >= 2, '焦点环 ≥2px：' + focus.outlineWidth);

      /* error：错句挂在 aria-describedby 指到的节点上，且在按钮旁边。 */
      const err = await p.ev('(function(){var b=document.querySelector(' + JSON.stringify(actSel('stir', 'reset'))
        + '); var id=b.getAttribute("aria-describedby"); var node=id?document.getElementById(id):null;'
        + 'if (!node) return null; return {text:node.textContent, near:b.parentNode.contains(node)};}())');
      assert.ok(err !== null, '错态节点必须挂得上 aria-describedby');
      assert.equal(err.text, '没连上：再试一次');
      assert.equal(err.near, true, '错句写在按钮旁边');

      /* 减动效：过渡关掉、读数照走、不许有东西卡在半路。 */
      await p.emulate({ reducedMotion: true });
      assert.equal(await p.ev('getComputedStyle(document.querySelector(' + JSON.stringify(cardSel('boil') + ' ' + slot('bar-fill'))
        + ')).transitionDuration'), '0s', '减动效下进度条不许有过渡');
      await p.ev('document.querySelector(' + JSON.stringify(actSel('boil', 'toggle')) + ').click();true');
      await sleep(900);
      const reduced = await read('boil');
      assert.equal(reduced.state, 'running', '减动效下计时照走');
      assert.ok(reduced.remain < 4000, '读数真的在动：' + reduced.remain);
      assert.equal(await p.runningAnimations(), 0, '不许有东西卡在半路');
      await p.ev('document.querySelector(' + JSON.stringify(actSel('boil', 'reset')) + ').click();true');
      assert.deepEqual(await p.errors(), [], '整场不得留下未捕获错误');
    } finally { p.close(); }
  });
});
