/** #984 · HELP 详情弹层手机软键盘遮挡输入框（方案 A＋C＋B）· 契约锁 ＋ 行为锁。
 *
 *  为什么测试要长这样：首轮复审抓到「抬升锚点选错对象」——只量焦点输入框，而复制按钮在同一个弹层里
 *  恒比输入框低 14px 以上（输入框底边最多到弹层底往上 74px，按钮顶边在往上 60px），于是「补完输入框」
 *  按钮必然还在键盘下面。故行为锁一律用**双锚点**（输入框 ＋ .s-actions）建模，并直接断言按钮最终位置。
 *  另一条教训：静态断言必须**剥掉注释**再匹配，否则锁到的是注释文字——删掉代码行测试照样绿。
 *
 *  运行：`node --test packages/base-render/test/help-sheet-keyboard-984.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { PAGE_LIMITS } from '../dist/pageUi.js';

const TEMPLATE = readFileSync(new URL('../assets/help-template.html', import.meta.url), 'utf8');

/** 键盘纠正块的锚点（模板里 BEGIN/END 成对成注释，测试按锚取块，不写死行号）。 */
const KB_BEGIN = '/* ===== #984 软键盘遮挡纠正 BEGIN =====';
const KB_END = '/* ===== #984 软键盘遮挡纠正 END ===== */';

const kbBlockRaw = () => {
  const a = TEMPLATE.indexOf(KB_BEGIN);
  const b = TEMPLATE.indexOf(KB_END);
  assert.ok(a >= 0 && b > a, '模板缺 #984 键盘纠正块（或 BEGIN/END 锚不成对）');
  return TEMPLATE.slice(a, b + KB_END.length);
};
const kbBlock = () => kbBlockRaw();
/** 剥掉块注释与行注释后剩下的代码——静态锁只能锁它，锁整块会锁到注释文字。 */
const kbCode = () => kbBlockRaw().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/** 取某条 CSS 规则里的一个声明值。 */
function declOf(rule, prop) {
  /* 属性名先转义再拼：`font-size` 直接进正则没问题，但若写成 /\\+prop/ 会拼出 \f（换页符）而永远匹配不到。 */
  const key = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(key + '\\s*:\\s*([^;}]+)').exec(rule);
  assert.ok(m, `规则 ${rule.slice(0, 60)}… 缺 ${prop}`);
  return m[1].trim();
}
function ruleOf(selector) {
  const at = TEMPLATE.indexOf(selector + '{');
  assert.ok(at >= 0, '模板缺选择器 ' + selector);
  return TEMPLATE.slice(at, TEMPLATE.indexOf('}', at));
}

/* ── ① 静态契约锁 ─────────────────────────────────────────── */

test('#984 A viewport meta：追加 interactive-widget，且不碰 viewport-fit', () => {
  const meta = /<meta name="viewport" content="([^"]*)"/.exec(TEMPLATE);
  assert.ok(meta, '模板缺 viewport meta');
  const content = meta[1];
  assert.ok(content.includes('interactive-widget=resizes-content'),
    'viewport meta 未追加 interactive-widget=resizes-content，实际：' + content);
  assert.ok(content.includes('width=device-width'), '既有 width=device-width 须保留');
  assert.ok(content.includes('initial-scale'), '既有 initial-scale 须保留');
  assert.ok(!content.includes('viewport-fit'),
    'viewport-fit 明令不动，若新引入即越界：' + content);
  assert.ok(!content.includes('maximum-scale'),
    'maximum-scale 会禁缩放（已毙掉的路），不得出现：' + content);
});

test('#984 C 弹层输入字号 13px→16px（杀 iOS 聚焦自动缩放）', () => {
  /* #1001 第 3 期：本票的 16px 与全类同一个判据数（`PAGE_LIMITS.textEntryMinPx`），不再各写一份字面量。 */
  const minPx = PAGE_LIMITS.textEntryMinPx + 'px';
  assert.equal(declOf(ruleOf('.sheet .pfield input'), 'font-size'), minPx);
  assert.equal(declOf(ruleOf('.sheet .pfield select'), 'font-size'), minPx);
  /* 复制按钮不是输入控件，票面只许动「input／select」——锁住它没被顺手改 */
  assert.equal(declOf(ruleOf('.sheet .s-actions .copy-btn'), 'font-size'), '13px',
    '复制按钮字号不在本票范围，须保持 13px');
});

test('#984 B 帧稳定落定判据存在（禁时间防抖与键盘动画赛跑）', () => {
  const c = kbCode();
  assert.ok(/requestAnimationFrame/.test(c), '纠正块须用 rAF 节流');
  assert.ok(/same\s*>=\s*\w+/.test(c), '须有「连续 N 帧不变」的落定判据');
  assert.ok(/\w+\s*===\s*lastH/.test(c), '须逐帧比较可视区高度');
  assert.ok(/same\+\+/.test(c), '须累计连续未变帧数');
  /* 关键：MAX_WAIT 必须出现在**使用处**（与时间比较），不是只有声明 */
  assert.ok(/Date\.now\(\)\s*-\s*t0\s*>=\s*\w+/.test(c),
    'MAX_WAIT 兜底必须真的参与判定，只有声明等于没写');
});

test('#984 B 修正是实测焦点框几何，不是硬编码偏移', () => {
  const c = kbCode();
  assert.ok(/getBoundingClientRect\(\)/.test(c), '须实测元素几何');
  assert.ok(/offsetTop\s*\+\s*\w+\.height/.test(c), '须拿可视区下沿（offsetTop+height）与元素底边比');
  assert.ok(/:focus/.test(c), '须以当前焦点元素为目标');
});

test('#984 B 抬升锚点含复制按钮（复审 D1：只量输入框则按钮必然仍被盖）', () => {
  const c = kbCode();
  assert.ok(/s-actions/.test(c), '须把 .s-actions 纳入锚点');
  assert.ok(/Math\.max\([^)]*getBoundingClientRect/.test(c),
    '须取输入框与 .s-actions 两者的较大底边，单量输入框会让复制按钮留在键盘下');
});

test('#984 B 抬升期限高（顶边不出可视区，否则 ✕ 与头部够不着）', () => {
  const c = kbCode();
  assert.ok(/maxHeight\s*=/.test(c), '抬升期间须同时写 maxHeight');
  const reset = /function reset\(\)\{[\s\S]*?\n  \}/.exec(c);
  assert.ok(reset && /maxHeight\s*=\s*''/.test(reset[0]),
    'reset 须把 maxHeight 一并清掉，否则下次打开带着上次的限高');
});

test('#984 B scale 守卫存在且在代码里（剥注释后仍须命中）', () => {
  const c = kbCode();
  assert.ok(/scale\s*!==\s*1/.test(c), '须显式处理 visualViewport.scale !== 1（剥注释后）');
  assert.ok(/if\s*\(\s*\w+\.scale\s*&&\s*\w+\.scale\s*!==\s*1\s*\)\s*return/.test(c),
    'scale 守卫须是 early-return 形式');
});

test('#984 B 关弹层清内联样式（不得留残根）', () => {
  const close = /function closeSheet\(\)\s*\{[\s\S]*?\n\}/.exec(TEMPLATE);
  assert.ok(close, '模板缺 closeSheet');
  assert.ok(/kbFix\s*\.\s*reset\(\)/.test(close[0]), 'closeSheet 须调用 kbFix.reset()');
  const c = kbCode();
  assert.ok(/style\.bottom\s*=\s*''/.test(c), '复位须把内联 bottom 清空');
});

test('#984 B 关着的弹层不量不写（visibility:hidden 不 blur，:focus 仍会命中）', () => {
  const c = kbCode();
  assert.ok(/classList\.contains\(\s*['"]show['"]\s*\)/.test(c),
    'correct() 须先判弹层是否开着，否则转屏等 resize 会给隐藏弹层写上几百 px 假抬升');
});

test('#984 B 能力缺失即 no-op（无 visualViewport 不抛不写样式）', () => {
  const c = kbCode();
  assert.ok(/if\s*\(!\w+\)\s*return/.test(c), '须在入口对 visualViewport 缺失直接返回');
});

/* ── ② 行为锁：取块接假 DOM 真跑 ──────────────────────────── */

/** 一套最小假 DOM：sheet / 焦点输入框 / 复制按钮行 / 内滚容器 / 可控 rAF 与 visualViewport。
 *  querySelector 严格按真实选择器字符串应答——写错选择器这组测试就该红。 */
function fakePage(opts = {}) {
  const state = {
    vvHeight: opts.vvHeight ?? 800,
    vvOffsetTop: opts.vvOffsetTop ?? 0,
    scale: opts.scale ?? 1,
    focusBottom: opts.focusBottom ?? 900,
    rowBottom: opts.rowBottom ?? 980,
    scrollRectBottom: opts.scrollRectBottom ?? 700,
    scrollerH: opts.scrollerH ?? 600,
    focus: opts.focus !== false,
    show: opts.show !== false,
    computedBottom: opts.computedBottom ?? '12px',
    dateStep: opts.dateStep ?? 0,
  };
  const handlers = {};
  const on = (bag) => (type, fn) => { (bag[type] ??= []).push(fn); };

  const vv = {
    get height() { return state.vvHeight; },
    get offsetTop() { return state.vvOffsetTop; },
    get scale() { return state.scale; },
    addEventListener: on(handlers),
  };
  const focusEl = { getBoundingClientRect: () => ({ bottom: state.focusBottom - curLift() }) };
  const rowEl = { getBoundingClientRect: () => ({ bottom: state.rowBottom - curLift() }) };
  const scroller = {
    scrollTop: 0,
    getBoundingClientRect: () => ({ bottom: state.scrollRectBottom - curLift() }),
  };
  const sheet = {
    style: {},
    classList: { contains: (c) => (c === 'show' ? state.show : false) },
    querySelector: (sel) => {
      if (sel === '.pfield input:focus,.pfield select:focus') return state.focus ? focusEl : null;
      if (sel === '.s-actions') return rowEl;
      if (sel === '.s-scroll') return scroller;
      throw new Error('未建模的选择器：' + sel);
    },
    addEventListener: on(handlers),
  };
  const win = { visualViewport: vv };

  /* 弹层整体随抬升上移，元素矩形必须跟着动——首轮假 DOM 把两个矩形当彼此独立，
   * 那是真实几何里不可能出现的情形，会让「内滚补滚」在假世界里恒真。 */
  function curLift() {
    const v = parseFloat(sheet.style.bottom);
    return Number.isNaN(v) ? 0 : v - parseFloat(state.computedBottom);
  }

  /* 手动泵 rAF：一帧一帧放，观察「动画期间不修正、落定后才修正」 */
  const queue = [];
  let seq = 0;
  const requestAnimationFrame = (cb) => { queue.push(cb); return ++seq; };
  const cancelAnimationFrame = (id) => {
    const i = queue.findIndex((_, k) => k + 1 === id);
    if (i >= 0) queue.splice(i, 1);
  };
  const pump = (frames) => {
    for (let i = 0; i < frames; i += 1) {
      const cb = queue.shift();
      if (!cb) return;
      cb();
    }
  };

  /* 可控时钟：dateStep>0 时每次 Date.now() 前进 dateStep ms，用来打满 MAX_WAIT 兜底 */
  let clock = 0;
  const FakeDate = { now: () => { clock += state.dateStep; return clock; } };

  const code = kbBlock();
  const factory = new Function(
    'window', 'sheet', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date',
    code + '\nreturn kbFix;',
  );
  const kbFix = factory(
    win,
    sheet,
    /* 真实 getComputedStyle 返回 CSSStyleDeclaration：`.bottom` 属性与 getPropertyValue 都可取 */
    (el) => ({ bottom: el === sheet ? state.computedBottom : '', getPropertyValue: () => state.computedBottom }),
    requestAnimationFrame,
    cancelAnimationFrame,
    FakeDate,
  );

  const fire = (type) => (handlers[type] ?? []).forEach((f) => f());
  /** 当前抬升量（从内联 bottom 减去基线还原）。 */
  const liftOf = () => {
    const v = parseFloat(p.sheet.style.bottom);
    return Number.isNaN(v) ? 0 : v - parseFloat(state.computedBottom);
  };
  const p = { state, sheet, kbFix, fire, pump, vv, scroller, liftOf };
  return p;
}

test('#984 行为：抬升量按输入框与复制按钮的较大底边算，按钮最终落在键盘上方', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 900, rowBottom: 980, computedBottom: '12px' });
  p.fire('focusin');
  p.pump(6);
  const edge = 0 + 400;
  assert.ok(p.liftOf() > 0, '应抬升');
  /* 按钮底边抬升后必须落在可视区下沿之上（留余量）——这就是 issue 明写的第二个症状 */
  assert.ok(p.state.rowBottom - p.liftOf() <= edge,
    `复制按钮底边 ${p.state.rowBottom - p.liftOf()} 仍在可视区下沿 ${edge} 之下，没修好`);
  /* 输入框同样在可视区内 */
  assert.ok(p.state.focusBottom - p.liftOf() <= edge, '输入框应可见');
  /* 余量不为零：底边不该恰好压在键盘上沿 */
  assert.ok(p.state.rowBottom - p.liftOf() < edge, '应留一线余量，别让控件底边压在键盘上沿');
});

test('#984 行为：锚点确实跟着复制按钮走（输入框可见但按钮更低时按按钮算）', () => {
  const p = fakePage({ vvHeight: 800, focusBottom: 700, rowBottom: 900 });
  p.fire('focusin');
  p.pump(6);
  assert.ok(p.liftOf() > 0, '输入框虽在可视区内，但按钮更低，仍须抬升');
  assert.ok(900 - p.liftOf() <= 800, '按按钮算才够得着按钮');
});

test('#984 行为：抬升期间限高，顶边不出可视区（✕ 与头部仍够得着）', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 900, rowBottom: 980 });
  p.fire('focusin');
  p.pump(6);
  assert.equal(p.sheet.style.maxHeight, '400px', '抬升期须限高到可视区高度');
  p.kbFix.reset();
  assert.equal(p.sheet.style.maxHeight, '', '复位须清掉限高');
});

test('#984 行为：动画期间不修正，落定后才动手（防抖做不到这一点）', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 900 });
  p.fire('focusin');
  p.state.vvHeight = 380;
  p.pump(1);
  assert.equal(p.sheet.style.bottom, undefined, '动画未落定不得修正');
  p.state.vvHeight = 360;
  p.pump(1);
  assert.equal(p.sheet.style.bottom, undefined, '仍在动画中不得修正');
  p.pump(4);
  assert.equal(typeof p.sheet.style.bottom, 'string', '落定后必须修正');
});

test('#984 行为：MAX_WAIT 兜底真的会触发（动画不收敛也要收敛到一次修正）', () => {
  /* 每帧高度都变（同帧数永不达标）＋ 时钟每帧跳 300ms → 只能靠 MAX_WAIT 收敛 */
  const p = fakePage({ vvHeight: 400, focusBottom: 900, rowBottom: 980, dateStep: 300 });
  p.fire('focusin');
  for (let i = 0; i < 6; i += 1) {
    p.state.vvHeight = 400 - i;
    p.pump(1);
  }
  assert.ok(p.liftOf() > 0, '高度始终在变，只能由 MAX_WAIT 兜底触发修正');
});

test('#984 行为：零差值即 no-op，且不写任何内联样式（对方案 A 已生效幂等）', () => {
  const p = fakePage({ vvHeight: 800, focusBottom: 700, rowBottom: 780 });
  p.fire('focusin');
  p.pump(6);
  assert.equal(p.sheet.style.bottom, undefined, '未被遮挡时不得写内联样式');
  assert.equal(p.sheet.style.maxHeight, undefined, '未被遮挡时不得限高');
});

test('#984 行为：scale !== 1 时跳过（缩放下坐标系不一致）', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 900, rowBottom: 980, scale: 2 });
  p.fire('focusin');
  p.pump(6);
  assert.equal(p.sheet.style.bottom, undefined, '页面被放大时须跳过，不得用错坐标');
});

test('#984 行为：关着的弹层不写任何样式（避免隐藏弹层被 resize 抬起几百 px）', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 900, rowBottom: 980, show: false });
  p.fire('focusin');
  p.pump(6);
  assert.equal(p.sheet.style.bottom, undefined, '弹层关着时不得抬升');
});

test('#984 行为：弹层内无焦点时归零（键盘不是为此弹层而起的）', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 900, rowBottom: 980, focus: false });
  p.fire('focusin');
  p.pump(6);
  assert.equal(p.sheet.style.bottom, undefined, '无焦点时不得抬升');
});

test('#984 行为：键盘收起后归零，版式还原', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 700, rowBottom: 780 });
  p.fire('focusin');
  p.pump(6);
  assert.ok(p.liftOf() > 0, '先抬起来');
  p.state.vvHeight = 800;
  p.fire('resize');
  p.pump(6);
  assert.equal(p.sheet.style.bottom, '', '收起后须还回原位（清内联样式）');
  assert.equal(p.sheet.style.maxHeight, '', '收起后须解除限高');
});

test('#984 行为：关弹层清内联样式，下次打开不残留', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 900, rowBottom: 980 });
  p.fire('focusin');
  p.pump(6);
  assert.ok(p.liftOf() > 0);
  p.kbFix.reset();
  assert.equal(p.sheet.style.bottom, '', 'reset 后须清空内联 bottom');
  assert.equal(p.sheet.style.maxHeight, '', 'reset 后须清空限高');
});

test('#984 行为：抬升后焦点框仍在内滚容器之下时，辅以补滚', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 900, rowBottom: 980, scrollRectBottom: 700 });
  p.fire('focusin');
  p.pump(6);
  assert.ok(p.liftOf() > 0, '主杠杆：弹层上移');
  assert.ok(p.scroller.scrollTop > 0, '辅杠杆：内滚容器补滚，焦点框不得仍被切掉');
});

test('#984 行为：offsetTop 非零时按可视区实际下沿算（页面被浏览器滚过）', () => {
  const p = fakePage({ vvHeight: 400, vvOffsetTop: 100, focusBottom: 700, rowBottom: 780 });
  p.fire('focusin');
  p.pump(6);
  /* edge = offsetTop + height = 500；按钮底边 780 须被抬到 500 之上 */
  assert.ok(780 - p.liftOf() <= 500, '须用 offsetTop+height 作可视区下沿');
});

test('#984 行为：无 visualViewport 时整段 no-op 不抛', () => {
  const handlers = {};
  const sheet = { style: {}, classList: { contains: () => true }, querySelector: () => null, addEventListener: (t, f) => { (handlers[t] ??= []).push(f); } };
  const win = {};                       /* 故意不给 visualViewport */
  const factory = new Function(
    'window', 'sheet', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date',
    kbBlock() + '\nreturn kbFix;',
  );
  const kbFix = factory(win, sheet, () => ({ bottom: '', getPropertyValue: () => '' }),
    (cb) => { cb(); return 1; }, () => {}, { now: () => 0 });
  assert.equal(kbFix, null, '能力缺失须整段返回 null');
  (handlers.focusin ?? []).forEach((f) => f());   /* 不得抛 */
  assert.equal(sheet.style.bottom, undefined);
});

/* ── ③ 模板行尾锁 ─────────────────────────────────────────── */

test('#984 模板源须全 CRLF（生成器遇孤 LF 直接抛错，是本票最大的坑）', () => {
  const lone = TEMPLATE.match(/(?<!\r)\n/g);
  assert.equal(lone, null,
    lone ? `发现 ${lone.length} 处孤 LF——编辑器把行尾规范化了，gen-help-shell.cjs 会整个失败`
         : '全 CRLF');
});

test('#984 槽契约未被破坏（改模板不得动三个 SLOT 与 title 占位）', () => {
  for (const slot of ['SLOT:1/INJECT-DATA', 'SLOT:2/SHARED-HELPERS', 'SLOT:3/SHARED-CSS', '__HELP_TITLE__']) {
    assert.ok(TEMPLATE.includes(slot), '源缺槽契约：' + slot);
  }
  assert.ok(TEMPLATE.startsWith('<!DOCTYPE html>'), '源须起于 <!DOCTYPE html>');
});
