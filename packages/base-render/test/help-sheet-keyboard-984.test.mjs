/** #984 · HELP 详情弹层手机软键盘遮挡输入框（方案 A＋C＋B）· 契约锁 ＋ 行为锁。
 *
 *  为什么分两组：brief 增补第四条指出「只断言监听存在，会放过一个恒不生效的实现」。
 *  所以 ① 组锁契约（meta／字号／落定判据／scale 守卫／关弹层清样式），
 *  ② 组把键盘纠正块按锚点取出、接一套最小假 DOM 真跑一遍，验「实测几何 → 抬升量」真成立。
 *  ③ 组锁模板全 CRLF：生成器遇孤 LF 直接抛错，是本票最容易踩且最难查的坑。
 *
 *  运行：`node --test packages/base-render/test/help-sheet-keyboard-984.test.mjs`
 *  （本组只读 assets 源，不依赖 dist，无需先编译。）
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const TEMPLATE = readFileSync(new URL('../assets/help-template.html', import.meta.url), 'utf8');

/** 键盘纠正块的锚点（模板里 BEGIN/END 成对，测试按锚取块，不写死行号）。 */
const KB_BEGIN = '/* ===== #984 软键盘遮挡纠正 BEGIN =====';
const KB_END = '/* ===== #984 软键盘遮挡纠正 END ===== */';

const kbBlock = () => {
  const a = TEMPLATE.indexOf(KB_BEGIN);
  const b = TEMPLATE.indexOf(KB_END);
  assert.ok(a >= 0 && b > a, '模板缺 #984 键盘纠正块（或 BEGIN/END 锚不成对）');
  return TEMPLATE.slice(a, b + KB_END.length);
};

/** 取某条 CSS 规则里的一个声明值；`13px` 这类字面量锁用它。 */
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
  assert.equal(declOf(ruleOf('.sheet .pfield input'), 'font-size'), '16px');
  assert.equal(declOf(ruleOf('.sheet .pfield select'), 'font-size'), '16px');
  /* 复制按钮不是输入控件，票面只许动「input／select」——锁住它没被顺手改 */
  assert.equal(declOf(ruleOf('.sheet .s-actions .copy-btn'), 'font-size'), '13px',
    '复制按钮字号不在本票范围，须保持 13px');
});

test('#984 B 帧稳定落定判据存在（禁时间防抖与键盘动画赛跑）', () => {
  const b = kbBlock();
  assert.ok(/requestAnimationFrame/.test(b), '纠正块须用 rAF 节流');
  assert.ok(/same\s*>=\s*\w+/.test(b), '须有「连续 N 帧不变」的落定判据');
  assert.ok(/height\s*===\s*lastH|same\+\+/.test(b), '须逐帧比较可视区高度');
  assert.ok(/MAX_WAIT/.test(b), '须有最大等待兜底（动画不收敛时仍要收敛到一次修正）');
});

test('#984 B 修正是实测焦点框几何，不是硬编码偏移', () => {
  const b = kbBlock();
  assert.ok(/getBoundingClientRect\(\)/.test(b), '须实测元素几何');
  assert.ok(/offsetTop\s*\+\s*vv\.height/.test(b), '须拿可视区下沿（offsetTop+height）与元素底边比');
  assert.ok(/focus/.test(b), '须以当前焦点元素为目标');
});

test('#984 B scale 守卫存在（页面被 iOS 放大时两坐标系不一致）', () => {
  const b = kbBlock();
  assert.ok(/scale\s*!==\s*1/.test(b), '须显式处理 visualViewport.scale !== 1');
});

test('#984 B 关弹层清内联样式（不得留残根）', () => {
  const close = /function closeSheet\(\)\{[\s\S]*?\n\}/.exec(TEMPLATE);
  assert.ok(close, '模板缺 closeSheet');
  assert.ok(/reset\(\)|kbFix/.test(close[0]), 'closeSheet 须触发键盘纠正复位');
  const b = kbBlock();
  assert.ok(/style\.bottom\s*=\s*''/.test(b), '复位须把内联 bottom 清空');
});

test('#984 B 能力缺失即 no-op（无 visualViewport 不抛不写样式）', () => {
  const b = kbBlock();
  assert.ok(/if\s*\(!vv\)\s*return/.test(b), '须在入口对 visualViewport 缺失直接返回');
});

/* ── ② 行为锁：取块接假 DOM 真跑 ──────────────────────────── */

/** 一套最小假 DOM：sheet / 焦点输入框 / 内滚容器 / 可控 rAF / 可控 visualViewport。 */
function fakePage(opts = {}) {
  const state = {
    vvHeight: opts.vvHeight ?? 800,
    vvOffsetTop: opts.vvOffsetTop ?? 0,
    scale: opts.scale ?? 1,
    focusBottom: opts.focusBottom ?? 900,
    scrollRectBottom: opts.scrollRectBottom ?? 700,
    focus: opts.focus !== false,
    computedBottom: opts.computedBottom ?? '12px',
  };
  const handlers = {};
  const on = (bag) => (type, fn) => { (bag[type] ??= []).push(fn); };

  const vv = {
    get height() { return state.vvHeight; },
    get offsetTop() { return state.vvOffsetTop; },
    get scale() { return state.scale; },
    addEventListener: on(handlers),
  };
  const focusEl = {
    getBoundingClientRect: () => ({ bottom: state.focusBottom }),
  };
  const scroller = {
    scrollTop: 0,
    getBoundingClientRect: () => ({ bottom: state.scrollRectBottom }),
  };
  const sheet = {
    style: {},
    querySelector: (sel) => (sel.indexOf('s-scroll') >= 0 ? scroller : (state.focus ? focusEl : null)),
    addEventListener: on(handlers),
  };
  const win = { visualViewport: vv };

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
    Date,
  );

  const fire = (type) => (handlers[type] ?? []).forEach((f) => f());
  return { state, sheet, kbFix, fire, pump, vv, scroller };
}

test('#984 行为：键盘弹起后按实测遮挡量抬升弹层（被盖多少补多少）', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 900, computedBottom: '12px' });
  /* 可视区下沿 = offsetTop+height = 0+400 = 400；焦点框底边 900 → 被盖 500 */
  p.fire('focusin');
  p.pump(6);
  assert.equal(p.sheet.style.bottom, '512px', '底边 12px 基线 + 实测遮挡 500px');
});

test('#984 行为：动画期间不修正，落定后才动手（防抖做不到这一点）', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 900 });
  p.fire('focusin');
  /* 键盘动画中：高度逐帧变化，绝不能在这一帧就按未落定的几何下手 */
  p.state.vvHeight = 380;
  p.pump(1);
  assert.equal(p.sheet.style.bottom, undefined, '动画未落定不得修正');
  p.state.vvHeight = 360;
  p.pump(1);
  assert.equal(p.sheet.style.bottom, undefined, '仍在动画中不得修正');
  /* 高度不再变化 → 连续 N 帧稳定 → 动手 */
  p.pump(4);
  assert.equal(typeof p.sheet.style.bottom, 'string', '落定后必须修正');
});

test('#984 行为：零差值即 no-op，且不写任何内联样式（对方案 A 已生效幂等）', () => {
  const p = fakePage({ vvHeight: 800, focusBottom: 700 });
  p.fire('focusin');
  p.pump(6);
  assert.equal(p.sheet.style.bottom, undefined, '未被遮挡时不得写内联样式');
});

test('#984 行为：scale !== 1 时跳过（缩放下坐标系不一致）', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 900, scale: 2 });
  p.fire('focusin');
  p.pump(6);
  assert.equal(p.sheet.style.bottom, undefined, '页面被放大时须跳过，不得用错坐标');
});

test('#984 行为：键盘收起后归零，版式还原', () => {
  /* 焦点框底边 700：键盘在（可视区 400）时被盖，收起后（可视区 800）本就在可视区内 → 应还回原位 */
  const p = fakePage({ vvHeight: 400, focusBottom: 700 });
  p.fire('focusin');
  p.pump(6);
  assert.equal(p.sheet.style.bottom, '312px', '先抬起来（12px 基线 + 被盖 300px）');
  p.state.vvHeight = 800;
  p.fire('resize');
  p.pump(6);
  assert.equal(p.sheet.style.bottom, '', '收起后须还回原位（清内联样式）');
});

test('#984 行为：关弹层清内联样式，下次打开不残留', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 900 });
  p.fire('focusin');
  p.pump(6);
  assert.equal(typeof p.sheet.style.bottom, 'string');
  p.kbFix.reset();
  assert.equal(p.sheet.style.bottom, '', 'reset 后须清空内联 bottom');
});

test('#984 行为：抬升后焦点框仍在内滚容器之下时，辅以补滚', () => {
  const p = fakePage({ vvHeight: 400, focusBottom: 900, scrollRectBottom: 700 });
  p.fire('focusin');
  p.pump(6);
  assert.equal(p.sheet.style.bottom, '512px', '主杠杆：弹层上移');
  assert.ok(p.scroller.scrollTop > 0, '辅杠杆：内滚容器补滚，焦点框不得仍被切掉');
});

test('#984 行为：无 visualViewport 时整段 no-op 不抛', () => {
  const handlers = {};
  const sheet = { style: {}, querySelector: () => null, addEventListener: (t, f) => { (handlers[t] ??= []).push(f); } };
  const win = {};                       /* 故意不给 visualViewport */
  const factory = new Function(
    'window', 'sheet', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date',
    kbBlock() + '\nreturn kbFix;',
  );
  const kbFix = factory(win, sheet, () => ({ getPropertyValue: () => '' }),
    (cb) => { cb(); return 1; }, () => {}, Date);
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
