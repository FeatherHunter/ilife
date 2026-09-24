/** windowPicker（窗口选择器 · 形态 A）· 契约判据。
 *
 * 四类（工艺书第六节）：① 渲染契约 ② 样式与零 DOM 纪律 ③ 加法式 ④ 真机两档几何 ＋ 触控 ＋
 * **真运行时**：天数按两个日期真算、换档按「今天 ＋ N 天」真算起止、手改起止落到「自定义」、
 * 结束日早于起始日写错句且**不派发**。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildWindowPickerJs, isoDayCount, renderWindowPicker, shiftIso, windowPickerCss, windowErrorId,
  WINDOW_CUSTOM, WINDOW_DEFAULTS, WINDOW_FORMS, WINDOW_MAX_WIDTH_PX, WINDOW_TOUCH_MIN_PX,
} from '../dist/components/window-picker/index.js';
import { PAGE_UI_CLASS } from '../dist/components/page-ui/index.js';
import { skinCss } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { buildF6Html, startF6Page } from './_f6-chrome-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const C = 'ilife-block-window-picker';
const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const TODAY = '2026-09-25';

function picker(opts) {
  return renderWindowPicker(Object.assign({ name: 'main', label: '窗口', preset: 'week', today: TODAY },
    opts === undefined ? {} : opts));
}

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('windowPicker ① 渲染契约', () => {
  it('形态 A：一行工具条——段 ＋ 起止 ＋ 天数', () => {
    const html = picker();
    assert.ok(html.startsWith('<div class="' + C), '类名根打头：' + html.slice(0, 90));
    assert.ok(html.includes('data-ilife-window-form="' + WINDOW_FORMS[0] + '"'), '形态键上属性');
    assert.ok(html.includes('data-ilife-window-today="' + TODAY + '"'), '今天上根属性（判据不跟真实日期赛跑）');
    const presets = [...html.matchAll(/<button[^>]*data-ilife-window-preset="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(presets, ['today', 'week', 'month', WINDOW_CUSTOM], '四档（自定义是内置档）');
    assert.ok(html.includes('data-ilife-window-from='), '起始日输入在');
    assert.ok(html.includes('data-ilife-window-to='), '结束日输入在');
    assert.ok(html.includes('type="date"'), '两个都是原生日期输入');
    assert.ok(html.includes('aria-label="' + WINDOW_DEFAULTS.fromLabel + '"'), '起始日有 aria-label');
    assert.ok(html.includes('>' + WINDOW_DEFAULTS.tillText + '<'), '起止之间有连接词');
    assert.ok(html.includes('data-ilife-window-days'), '天数的槽在');
    assert.ok(!/<script/i.test(html), '不产脚本');
  });

  it('给了 today 就在渲染期把窗口算好（无脚本也读得出来）', () => {
    const html = picker({ preset: 'week' });
    assert.ok(html.includes('data-ilife-window-from="" value="2026-09-19"'), '本周 ＝ 今天往回 6 天：' + /data-ilife-window-from="" value="([^"]*)"/.exec(html)[1]);
    assert.ok(html.includes('data-ilife-window-to="" value="' + TODAY + '"'), '结束日＝今天');
    assert.ok(html.includes('data-ilife-window-days="">7<'), '天数＝7（含头含尾）');
    const today = picker({ preset: 'today' });
    assert.ok(today.includes('data-ilife-window-days="">1<'), '今日 1 天');
  });

  it('没给 today 就留空（天数写「—」），交给运行时补', () => {
    const html = renderWindowPicker({ name: 'main', preset: 'week' });
    assert.equal(/data-ilife-window-from="" value="([^"]*)"/.exec(html)[1], '', '起止留空');
    assert.ok(html.includes('data-ilife-window-days="">' + WINDOW_DEFAULTS.unset + '<'), '天数写「—」');
    assert.ok(!/<p[^>]*data-ilife-window-empty[^>]*hidden/.test(html), '空态句顶上来（窗口未定）');
    assert.ok(html.includes(WINDOW_DEFAULTS.emptyText), '空态句在标记里');
  });

  it('给了起止就用它；没给 preset 自动落到「自定义」档', () => {
    const html = renderWindowPicker({ name: 'main', from: '2026-09-19', to: '2026-09-25' });
    assert.ok(html.includes('data-ilife-window-from="" value="2026-09-19"'), '起照给');
    assert.ok(html.includes('data-ilife-window-to="" value="2026-09-25"'), '止照给');
    assert.ok(/data-ilife-window-preset="custom"[^>]*aria-pressed="true"/.test(html), '落到自定义档');
    assert.ok(html.includes('data-ilife-window-days="">7<'), '天数算出来');
  });

  it('固定起止的档（from／to 二选一的那条路）', () => {
    const html = picker({
      preset: 'q3',
      presets: [{ value: 'q3', label: '第三季度', from: '2026-07-01', to: '2026-09-30' }],
    });
    assert.ok(html.includes('value="2026-07-01"') && html.includes('value="2026-09-30"'), '固定起止上屏');
    assert.ok(html.includes('data-ilife-window-days="">92<'), '7-01 到 9-30 ＝ 92 天');
  });

  it('禁用／载入／错态都在标记里可断', () => {
    const dis = picker({ disabled: true });
    assert.equal((dis.match(/ disabled/g) || []).length, 6, '四档 ＋ 两个日期一起禁用');
    const loading = picker({ loading: true });
    assert.ok(loading.includes('data-ilife-window-loading="1"') && loading.includes(WINDOW_DEFAULTS.loadingText), '载入态');
    const err = picker({ error: '窗口取不到' });
    assert.ok(err.includes('data-ilife-window-invalid="1"'), '错态上根属性');
    assert.ok(new RegExp(windowErrorId('main')).test(err) && err.includes('窗口取不到'), '错句上屏且有 id');
  });

  it('转义面：机器键／标签／文案／附加类名逐位转义', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderWindowPicker({
      name: evil, label: evil, loadingText: evil, error: evil, extraClass: 'ok other',
      today: TODAY, preset: 'a', presets: [{ value: 'a', label: evil, days: 3 }],
    });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本：' + html.slice(0, 160));
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('ok other'), '合法附加类名照收');
  });

  it('入参违规一律拒（每个分支都断 BlocksError）', () => {
    const bad = (input, why) => assert.throws(() => renderWindowPicker(input), (e) => {
      assert.equal(e.name, 'BlocksError', why);
      return true;
    }, why);
    bad(null, 'null');
    bad({}, '缺 name');
    bad({ name: '' }, '空 name');
    bad({ name: 'a', form: 'B' }, '形态闭集外');
    bad({ name: 'a', presets: 'x' }, 'presets 不是数组');
    bad({ name: 'a', presets: [], today: TODAY }, 'presets 空数组');
    bad({ name: 'a', presets: [''], today: TODAY }, 'presets 里空串');
    bad({ name: 'a', presets: ['today'], today: TODAY }, '字符串档只许 custom');
    bad({ name: 'a', presets: [{ label: 'x', days: 3 }], today: TODAY }, '缺 value');
    bad({ name: 'a', presets: [{ value: 'x', label: 'x' }], today: TODAY }, 'days 与起止都没给');
    bad({ name: 'a', presets: [{ value: 'x', label: 'x', days: 3, from: '2026-01-01' }], today: TODAY }, 'days 与起止都给了');
    bad({ name: 'a', presets: [{ value: 'x', label: 'x', days: 0 }], today: TODAY }, 'days 小于 1');
    bad({ name: 'a', presets: [{ value: 'x', label: 'x', days: 1.5 }], today: TODAY }, 'days 不是整数');
    bad({ name: 'a', presets: [{ value: 'x', label: 'x', from: '2026-01-01' }], today: TODAY }, '起止没成对');
    bad({ name: 'a', presets: [{ value: 'x', label: 'x', from: '2026-01-01', to: '2025-01-01' }], today: TODAY }, '起晚于止');
    bad({ name: 'a', presets: ['x', 'x'], today: TODAY }, '机器值重复');
    bad({ name: 'a', preset: 'zzz', today: TODAY }, 'preset 不在 presets 里');
    bad({ name: 'a', today: '2026-02-31' }, '不存在的日期');
    bad({ name: 'a', today: '2026/09/25' }, '非 ISO 写法');
    bad({ name: 'a', from: '2026-09-01', to: '2026-09-25', preset: 'q3', presets: ['q4'] }, 'preset 不在自定义档里');
    bad({ name: 'a', today: TODAY, disabled: 1 }, 'disabled 不是布尔');
    bad({ name: 'a', today: TODAY, loading: 'x' }, 'loading 不是布尔');
    bad({ name: 'a', today: TODAY, error: 7 }, 'error 不是字符串');
    bad({ name: 'a', today: TODAY, extraClass: 'a b!' }, '非法附加类名');
  });

  it('两个日期小件：ISO 校验、加天、含头含尾天数', () => {
    assert.equal(shiftIso('2026-09-25', -6), '2026-09-19', '往回 6 天');
    assert.equal(shiftIso('2026-03-01', -1), '2026-02-28', '跨月');
    assert.equal(isoDayCount('2026-09-25', '2026-09-25'), 1, '今天到今天 ＝ 1 天');
    assert.equal(isoDayCount('2026-09-19', '2026-09-25'), 7, '一周 7 天');
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('windowPicker ② 样式与零 DOM 纪律', () => {
  const css = stripCss(windowPickerCss());

  it('样式段非空，选择器全在 .ilife-page-ui 之下，零 :root／!important／@media (max-width)', () => {
    assert.ok(css.length > 0);
    const sels = [];
    for (const block of css.split('}')) {
      const at = block.indexOf('{');
      if (at < 0) continue;
      const head = block.slice(0, at).split('}').pop().trim();
      if (head === '' || head.startsWith('@')) continue;
      for (const one of head.split(',')) sels.push(one.trim());
    }
    assert.ok(sels.length >= 15, '选择器太少：' + sels.length);
    for (const s of sels) assert.ok(s.startsWith('.' + PAGE_UI_CLASS), '不在作用域内：' + s);
    assert.ok(!css.includes(':root') && !css.includes('!important'));
    assert.ok(!/@media\s*\(max-width/.test(css), '宽度不许用视口判');
    const bar = css.split('\n').find((l) => l.includes(C + '-bar{'));
    assert.ok(bar !== undefined && bar.includes('flex-wrap:wrap'), '工具条必须换行：' + bar);
    assert.ok(!css.includes('text-overflow:ellipsis'), '不许硬截断');
    const days = css.split('\n').find((l) => l.includes(C + '-days{'));
    assert.ok(days !== undefined && days.includes('white-space:nowrap'), '天数不折行：' + days);
    assert.ok(css.includes('max-width:' + WINDOW_MAX_WIDTH_PX + 'px'), '宽档上限取常量');
  });

  it('只经 skinVar 读皮肤；不重定义冻结 token；源码零手写 var(--ilife-…)', () => {
    const src = readdirSync(join(PKG, 'src', 'components', 'window-picker'))
      .filter((f) => f.endsWith('.ts')).sort()
      .map((f) => readFileSync(join(PKG, 'src', 'components', 'window-picker', f), 'utf8')).join('\n');
    const srcNoComment = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.equal(/var\(\s*--ilife-/.test(srcNoComment), false, '手写了 var(--ilife-…)');
    assert.ok(css.includes('var(--ilife-ink,'), '样式里应出现兜底链');
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('dist/components/window-picker/** 的代码零 document.／window.／navigator.', () => {
    const dir = join(PKG, 'dist', 'components', 'window-picker');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 5, '编译产物应在：' + files.length);
    for (const f of files) {
      const code = readFileSync(f, 'utf8')
        .replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""')
        .replace(/`(?:[^`\\]|\\.)*`/g, '``').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.ok(!code.includes(needle), f.replace(PKG, '') + ' 出现 ' + needle);
      }
    }
  });

  it('运行时段：可解析、幂等、UTC 算天数', () => {
    const js = buildWindowPickerJs();
    assert.doesNotThrow(() => { void new Function(js); });
    assert.ok(js.includes('data-ilife-window-runtime'), '重复注入只绑一次');
    assert.ok(js.includes('setUTCDate') && js.includes('toISOString'), 'UTC 计算（不受时区与夏令时影响）');
    assert.equal(js.includes('innerHTML'), false, '不靠 innerHTML 拼内容');
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('windowPicker ③ 加法式（不挂这件＝零命中）', () => {
  it('renderDocShell 默认产物里没有本件的类名与运行时段', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.ok(!base.includes(C) && !base.includes('ilife:window-change'));
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
  });

  it('样式只读自己的类名与自己的 data-*', () => {
    const css0 = stripCss(windowPickerCss());
    for (const t of new Set([...css0.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]))) {
      assert.ok(t === PAGE_UI_CLASS || t.startsWith(C), '不属于本件的类名：' + t);
    }
    for (const a of new Set([...css0.matchAll(/\[(data-[a-z-]+)/g)].map((m) => m[1]))) {
      assert.ok(a.startsWith('data-ilife-window'), '不属于本件的属性名：' + a);
    }
  });

  it('渲染是纯函数：同一份入参两次逐字节相同', () => {
    assert.equal(picker(), picker());
  });
});

/* ── ④ 真机 ───────────────────────────────────────────────────────── */

const txt = (p, sel) => p.ev('(function(){var e=document.querySelector("#box ' + sel + '");return e?e.textContent:null}())');
const val = (p, sel) => p.ev('(function(){var e=document.querySelector("#box ' + sel + '");return e?e.value:null}())');
const KEYS = ['.' + C + '-days', '.' + C + '-date'];

describe('windowPicker ④ 真机（headless Chrome）', () => {
  it('两档几何（390／1280）零横向溢出 ＋ 触控 ≥44×44 ＋ 天数真算 ＋ 换档真算起止', async (t) => {
    const html = buildF6Html({
      title: 'window-picker', skin: 'ilife-skin-paper',
      css: skinCss() + windowPickerCss(),
      body: picker({ preset: 'week' }),
      scripts: [buildWindowPickerJs()],
    });
    const p = await startF6Page(html);
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何与真运行时判据需真浏览器');
    try {
      assert.equal(await txt(p, '[data-ilife-window-days]'), '7', '首屏就是算好的 7 天');
      await p.listen('ilife:window-change');

      /* 换到「近 30 天」：起止按今天真算 */
      await p.click('#box [data-ilife-window-preset="month"]');
      assert.equal(await val(p, '[data-ilife-window-from]'), '2026-08-27', '近 30 天＝今天往回 29 天');
      assert.equal(await val(p, '[data-ilife-window-to]'), TODAY, '结束日＝今天');
      assert.equal(await txt(p, '[data-ilife-window-days]'), '30', '天数 30');
      const evs = await p.events('ilife:window-change');
      assert.equal(evs.length, 1, '换档派发一条');
      assert.deepEqual([evs[0].detail.preset, evs[0].detail.from, evs[0].detail.to, evs[0].detail.days],
        ['month', '2026-08-27', TODAY, 30], '事件带真窗口');

      /* 手改起止：落到「自定义」档 ＋ 天数重算 */
      await p.ev('(function(){var e=document.querySelector("#box [data-ilife-window-from]");'
        + 'e.value="2026-09-19";e.dispatchEvent(new Event("input",{bubbles:true}));return true}())');
      assert.equal(await txt(p, '[data-ilife-window-days]'), '7', '手改后重算 7 天');
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-window-preset=\\"custom\\"]").getAttribute("aria-pressed")'), 'true', '落到自定义档');
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-window-preset=\\"month\\"]").getAttribute("aria-pressed")'), 'false', '原档位让出');

      /* 同一个窗口不重复派发（input 与 change 都会来） */
      const before = (await p.events('ilife:window-change')).length;
      await p.ev('(function(){var e=document.querySelector("#box [data-ilife-window-from]");'
        + 'e.dispatchEvent(new Event("change",{bubbles:true}));e.dispatchEvent(new Event("input",{bubbles:true}));return true}())');
      assert.equal((await p.events('ilife:window-change')).length, before, '同一个窗口不重复派发');

      /* 错态：结束日早于起始日 → 写错句 ＋ aria-invalid ＋ 不派发 */
      await p.ev('(function(){var e=document.querySelector("#box [data-ilife-window-to]");'
        + 'e.value="2026-09-01";e.dispatchEvent(new Event("input",{bubbles:true}));return true}())');
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-window]").hasAttribute("data-ilife-window-invalid")'), true, '错态上根属性');
      assert.equal(await txt(p, '[data-ilife-window-error]'), WINDOW_DEFAULTS.badRangeText, '错句是「结束日早于起始日」');
      assert.equal((await p.events('ilife:window-change')).length, before, '错窗口不派发（不静默改用户填的窗口）');
      assert.equal((await p.rectOf('#box [data-ilife-window-error]')).hidden, false, '错句顶上来');

      /* 改回好窗口：自动消错 */
      await p.ev('(function(){var e=document.querySelector("#box [data-ilife-window-to]");'
        + 'e.value="2026-09-25";e.dispatchEvent(new Event("input",{bubbles:true}));return true}())');
      assert.equal(await txt(p, '[data-ilife-window-days]'), '7', '改回后 7 天');
      assert.equal((await p.rectOf('#box [data-ilife-window-error]')).hidden, true, '错句收起');

      /* 载入态：天数一格原地换字 ＋ 三档收起 */
      await p.ev('document.dispatchEvent(new CustomEvent("ilife:window-loading",{detail:{name:"main",on:true}}));true');
      assert.equal(await p.ev('getComputedStyle(document.querySelector("#box .' + C + '-days-text")).display'), 'none', '真天数收起');
      assert.notEqual(await p.ev('getComputedStyle(document.querySelector("#box .' + C + '-loading")).display'), 'none', '载入字顶上来（它是弹性行里的子件，会被块化，故只判「不再隐藏」）');
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-window-preset=\\"today\\"]").disabled'), true, '载入中档位收起');
      await p.ev('document.dispatchEvent(new CustomEvent("ilife:window-loading",{detail:{name:"main",on:false}}));true');
      assert.equal(await txt(p, '[data-ilife-window-days]'), '7', '载入结束后回到真天数');
      assert.equal(await p.ev('document.querySelector("#box [data-ilife-window-preset=\\"today\\"]").disabled'), false, '载入结束后档位回来');

      /* 两档几何 */
      for (const w of [390, 1280]) {
        const m = await p.measure(w, { keys: KEYS, rows: ['.' + C + '-bar'] });
        assert.equal(m.box.sw <= m.box.cw, true, w + ' 档：容器横向溢出 ' + m.box.sw + ' > ' + m.box.cw);
        assert.equal(m.doc.sw <= m.doc.cw, true, w + ' 档：整页横向溢出');
        assert.deepEqual(m.offenders, [], w + ' 档：有后代越出容器右缘');
        for (const row of m.rows) {
          assert.equal(row.flexWrap, 'wrap', w + ' 档：工具条必须换行');
          assert.ok(row.overflowX !== 'auto' && row.overflowX !== 'scroll', w + ' 档：工具条藏了横滑');
        }
        for (const k of m.keys) {
          assert.ok(k.sw <= k.cw + 1, w + ' 档：关键语义位被截断「' + k.text + '」');
          assert.notEqual(k.textOverflow, 'ellipsis', w + ' 档：关键语义位用了省略号：' + k.sel);
        }
        for (const tg of m.targets) {
          assert.ok(tg.w >= WINDOW_TOUCH_MIN_PX && tg.h >= WINDOW_TOUCH_MIN_PX,
            w + ' 档：触控目标 ' + tg.cls + ' 只有 ' + tg.w + '×' + tg.h);
          assert.equal(tg.hit, true, w + ' 档：触控目标中心点命不中它自己：' + tg.cls);
        }
        const gaps = await p.ev('(function(){var box=document.getElementById("box");'
          + 'var ns=[].slice.call(box.querySelectorAll("button,input"));'
          + 'var rs=ns.map(function(e){return e.getBoundingClientRect()});var bad=[];'
          + 'for(var i=0;i<rs.length;i++)for(var j=i+1;j<rs.length;j++){'
          + 'var a=rs[i],b=rs[j]; if(a.width===0||b.width===0)continue;'
          + 'if(a.bottom<=b.top+1||b.bottom<=a.top+1)continue;'
          + 'var gap=Math.max(b.left,a.left)-Math.min(a.right,b.right); if(gap<8)bad.push(Math.round(gap));}'
          + 'return bad;}())');
        assert.deepEqual(gaps, [], w + ' 档：相邻触控目标间距 <8px');
      }
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
    } finally { await p.close(); }
  });

  it('没给 today：运行时按浏览器当天把窗口补上（不编日子、不空着）', async (t) => {
    const html = buildF6Html({
      title: 'window-picker-bootstrap', skin: 'ilife-skin-neutral',
      css: skinCss() + windowPickerCss(),
      body: renderWindowPicker({ name: 'main', preset: 'week' }),
      scripts: [buildWindowPickerJs()],
    });
    const p = await startF6Page(html);
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      const from = await val(p, '[data-ilife-window-from]');
      const to = await val(p, '[data-ilife-window-to]');
      assert.equal(/^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to), true, '起止被补成了真日期：' + from + ' 至 ' + to);
      assert.equal(isoDayCount(from, to), 7, '补出来的窗口是 7 天');
      assert.equal(await txt(p, '[data-ilife-window-days]'), '7', '天数写实');
      assert.equal((await p.rectOf('#box [data-ilife-window-empty]')).hidden, true, '窗口定了，空态收起');
      assert.deepEqual(await p.errs(), []);
    } finally { await p.close(); }
  });

  it('空态：起止都清空 → 天数「—」＋「窗口未定」', async (t) => {
    const html = buildF6Html({
      title: 'window-picker-empty', skin: 'ilife-skin-broadsheet',
      css: skinCss() + windowPickerCss(),
      body: picker({ preset: 'week' }),
      scripts: [buildWindowPickerJs()],
    });
    const p = await startF6Page(html);
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      await p.ev('(function(){var f=document.querySelector("#box [data-ilife-window-from]"),'
        + 't=document.querySelector("#box [data-ilife-window-to]");f.value="";t.value="";'
        + 'f.dispatchEvent(new Event("input",{bubbles:true}));return true}())');
      assert.equal(await txt(p, '[data-ilife-window-days]'), WINDOW_DEFAULTS.unset, '天数写「—」');
      assert.equal((await p.rectOf('#box [data-ilife-window-empty]')).hidden, false, '空态句顶上来');
      assert.deepEqual(await p.errs(), []);
    } finally { await p.close(); }
  });

  it('三套皮肤下标记逐字节相同', () => {
    const cut = (skin) => {
      const h = buildF6Html({ title: 's', skin, css: windowPickerCss(), body: picker() });
      return h.slice(h.indexOf('<div id="box">'), h.indexOf('<script>'));
    };
    assert.equal(cut('ilife-skin-paper'), cut('ilife-skin-broadsheet'));
    assert.equal(cut('ilife-skin-paper'), cut('ilife-skin-neutral'));
  });
});
