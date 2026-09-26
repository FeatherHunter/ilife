/** 组件层 · **跨件不变量**（issue #950 · 跨件判据席）：一条文件跑完全部件，断五类「判据全绿而屏上是坏的」。
 *
 *  为什么要有这一条：60 件的单件判据各自很全，但**横切面**上有五类病，任何单件判据都看不见——
 *  它们是这一批实测出来的真读数（不是假想）：`±1e308` 让子进程 OOM、`Infinity` 被分组函数啃成
 *  `In,fin,ity`、`1e+21` 被啃成 `1e,+21`；至少 6 件把未知键静默吞掉；`kanban-columns` 运行时段
 *  **从不写** `is-picked`；`drag-sort` 点一下拿起**整条通路**是坏的而 34 条判据全绿；
 *  `spread-dist`／`gap-band` 的刻度只被首末两枚量过，中间那枚偏到 67px 都全绿。
 *
 *  它吃**机器派生的件清单**（`dist/components/清单.js`，读法与 `test/皮肤矩阵.test.mjs` 同一条），
 *  对清单里**每一件**跑五条跨件不变量；每条的读数都报得出「哪件、哪个读数、最小复现」：
 *
 *   ① **非有限数一律拒**：把样例入参里每个 `number` 字段逐个换成
 *      `Infinity`／`-Infinity`／`NaN`／`1e308`／`-1e308`（含嵌套数组元素与对象字段），渲染函数必须抛
 *      `BlocksError`；并且**不许**渲出含 `NaN`／`Infinity`／`In,`／`e+308` 字样的产物。
 *      这一段跑在**子进程**里（`--非有限数子进程`，`--max-old-space-size=512` ＋ 超时看门狗）：
 *      实测有件会被 `±1e308` 顶爆内存／跑成死循环，主进程直接死在那一件上会让整条门**什么都报不出来**。
 *   ② **用户可见文本零键盘语汇**：样例标记剥掉注释与标签属性后扫键盘词表——**只判用户看得见的那一档**。
 *      词表与匹配口径**不抄第二份**：直接从 `test/组件样式纪律.test.mjs` 第 ⑨ 组的源码里抽出来用
 *      （抽不出来即**拒跑**，不许静默空转——见 `keyboardVocab()`）。
 *   ③ **未知键一律拒**：样例里**每个对象层**各加一个 `zzUnknown: 1`，渲染函数必须抛 `BlocksError`。
 *   ④ **运行时段与渲染期写同一套类名**：静档断「渲染期挂在**可点件**上的选中／拿起／开合类名，
 *      运行时段必须认识这个词」；真机档用**真指针**（CDP `Input.dispatchMouseEvent`，先例
 *      `test/kanban-columns.test.mjs` ⑤ 段）点那枚挂状态类的元素，**先证明状态真的变了**，
 *      再断变化落在该件渲染期用过的那套 `is-*` 词里。
 *   ⑤ **位置／长度由数值算出的逐条对账**：真机逐枚量（**不只首末**）——
 *      A 支：刻度类元素（同一槽位 ≥3 枚、各只声明一支位置、文字以数字开头）中心必须落在
 *      「值 → 位置」这条**由首末两枚定出来**的直线上（容差 1.5px）——首末被钉死、中间那枚漂走的
 *      `space-between` 老写法就是被这一支抓住的（实测偏 2.74／12.33px）；
 *      B 支：凡行内声明了位置／长度的那一枚，**屏上必须真的兑现**（中心或近端边钉在声明的位置上，
 *      长度＝百分比 × 容器，容差 1.5px）。
 *
 *  **跑法**（经 `node tooling/run-locked.mjs --ticket 950 -- …` 排队）：
 *    `node --test packages/base-render/test/跨件不变量.test.mjs`
 *  开关：`ILIFE_CROSS_DIST=<目录>` 换一份编译产物（自证／故障注入用；默认本包 `dist/`）；
 *       `ILIFE_CROSS_NO_MACHINE=1` 不起浏览器（④⑤ 退成「真机未跑」读数）；起不来浏览器时**照实打出来**，
 *       不静默跳过。
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { skinClass, skinCss } from '../dist/components/skin/index.js';
import { startBrowser } from './overlay-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
/** 编译产物根（默认本包 `dist/`；自证时指向一份**临时副本**，不动仓内源码）。 */
const DIST = process.env.ILIFE_CROSS_DIST === undefined || process.env.ILIFE_CROSS_DIST === ''
  ? join(PKG, 'dist') : process.env.ILIFE_CROSS_DIST;
const CHILD_FLAG = '--非有限数子进程';
/** 真机两档宽度（窄档／宽档各一）。 */
const WIDTHS = [390, 900];
/** 逐条对账的容差（px）——用户口径里的那个数，只在这一处出现。 */
const TOL = 1.5;
/** 五个坏数 ＋ 它们在报告里的写法（顺序固定：读数就按这个顺序报）。 */
const BAD_NUMBERS = [Infinity, -Infinity, NaN, 1e308, -1e308];
const BAD_NUMBER_TEXT = ['Infinity', '-Infinity', 'NaN', '1e308', '-1e308'];
/** 「渲出来了、但产物里有这些字样」——这一批实测被啃出来的三种写法。 */
const BAD_PRODUCT = /NaN|Infinity|In,|e\+308/;

/* ── 小工具（①②③ 共用：路径表、读写一处、抛 BlocksError 的判定） ────── */

/** 样例里每个 `number` 叶子的路径（`rows[0].value` 这种），去重。 */
function numberPaths(sample) {
  const out = [];
  const walk = (v, at) => {
    if (typeof v === 'number') { out.push(at); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, at + '[' + i + ']')); return; }
    if (v !== null && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], at + '.' + k);
  };
  if (sample !== null && typeof sample === 'object') walk(sample, '');
  return [...new Set(out)];
}

/** 样例里**每个对象层**的路径（含根；数组元素里的对象也算）。 */
function objectPaths(sample) {
  const out = [];
  const walk = (v, at) => {
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, at + '[' + i + ']')); return; }
    if (v === null || typeof v !== 'object') return;
    out.push(at);
    for (const k of Object.keys(v)) walk(v[k], at + '.' + k);
  };
  if (sample !== null && typeof sample === 'object') walk(sample, '');
  return out;
}

/** 路径串 → token 表（`rows[0].value` ⇒ `['rows',0,'value']`）。 */
const tokenize = (path) => [...path.matchAll(/([A-Za-z_$][\w$]*)|\[(\d+)\]/g)]
  .map((m) => (m[1] === undefined ? Number(m[2]) : m[1]));

/** 按 token 写一处（原样例不改：克隆一份）。 */
function setAtPath(root, tokens, value) {
  const clone = JSON.parse(JSON.stringify(root === undefined || root === null ? {} : root));
  let at = clone;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    if (at[tokens[i]] === undefined || at[tokens[i]] === null) at[tokens[i]] = typeof tokens[i + 1] === 'number' ? [] : {};
    at = at[tokens[i]];
  }
  at[tokens[tokens.length - 1]] = value;
  return clone;
}

/** 往某个对象层加一个未知键（原样例不改）。 */
function withUnknownKey(sample, path) {
  const clone = JSON.parse(JSON.stringify(sample));
  let at = clone;
  for (const t of tokenize(path)) at = at[t];
  at.zzUnknown = 1;
  return clone;
}

/* ── ① 的子进程入口（在主进程装件之前：被 OOM 杀掉时父进程知道死在哪一件上） ── */

const { COMPONENTS } = await import(pathToFileURL(join(DIST, 'components', '清单.js')).href);

if (process.argv.includes(CHILD_FLAG)) {
  /* 逐件、逐路径、逐坏数**边跑边打**一行 JSON：被 OOM／超时杀掉时，父进程从最后一行就知道死在哪一件上。 */
  const out = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');
  for (const row of COMPONENTS) {
    const paths = numberPaths(row.sample);
    if (paths.length === 0) continue;
    let mod = null;
    try {
      mod = await import(pathToFileURL(join(DIST, 'components', row.name, 'index.js')).href);
    } catch (e) {
      out({ piece: row.name, err: '装不上：' + String(e && e.message ? e.message : e) });
      continue;
    }
    const cases = [];
    for (const path of paths) {
      for (let i = 0; i < BAD_NUMBERS.length; i += 1) {
        const probe = { path, value: BAD_NUMBER_TEXT[i], state: '', excerpt: '' };
        try {
          const html = mod[row.render](setAtPath(row.sample, tokenize(path), BAD_NUMBERS[i]));
          probe.state = typeof html === 'string' ? '收下' : '返回值不是字符串（' + typeof html + '）';
          if (typeof html === 'string') {
            const hit = BAD_PRODUCT.exec(html);
            if (hit !== null) probe.excerpt = html.slice(Math.max(0, hit.index - 30), hit.index + 30).replace(/\s+/g, ' ');
          }
        } catch (e) {
          const name = e !== null && typeof e === 'object' && e.name !== undefined ? e.name : '(无名)';
          probe.state = name === 'BlocksError'
            ? 'BlocksError'
            : '抛的是 ' + name + '：' + String(e && e.message ? e.message : e).slice(0, 70);
        }
        cases.push(probe);
      }
    }
    out({ piece: row.name, cases });
  }
  process.exit(0);
}

/* ── 装件：吃的就是机器派生清单（每一件都过，不因「件太少」跳过） ──── */

/** 标记里每一枚元素（配平标签的扫描：不引第三方解析器；`<br>` 这类空元素按自闭合算）。
 *  `clickable` ＝ 自身可点；`buttonInside` ＝ 它里面包着一枚 `<button>`。 */
const VOID_TAGS = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);
function elementsOf(html) {
  const out = [];
  const stack = [];
  for (const m of html.matchAll(/<(\/?)([a-z][a-z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
    const closing = m[1] === '/';
    const tag = m[2];
    const attrs = m[3];
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tag) { const done = stack.splice(i, 1)[0]; done.end = m.index; out.push(done); break; }
      }
      continue;
    }
    const cls = /class="([^"]*)"/.exec(attrs);
    const one = {
      tag,
      cls: cls === null ? '' : cls[1],
      start: m.index,
      end: html.length,
      disabled: /(^|\s)disabled(\s|=|$)/.test(attrs),
      clickable: tag === 'button' || /role="button"/.test(attrs) || (tag === 'a' && /href=/.test(attrs)),
      buttonInside: false,
    };
    if (VOID_TAGS.has(tag) || attrs.trimEnd().endsWith('/')) { one.end = m.index + m[0].length; out.push(one); continue; }
    stack.push(one);
  }
  out.push(...stack.map((s) => ({ ...s, end: html.length })));
  for (const one of out) one.buttonInside = /<button[\s>]/.test(html.slice(one.start, one.end));
  return out.sort((a, b) => a.start - b.start);
}

const PIECES = [];
for (const row of COMPONENTS) {
  const p = {
    row,
    mod: null,
    html: null,
    sample: row.sample,
    css: null,
    runtimeJs: null,
    runtimeName: '',
    numbers: [],
    objects: [],
    loadErr: '',
    renderErr: '',
  };
  try {
    p.numbers = numberPaths(row.sample);
    p.objects = objectPaths(row.sample);
    p.mod = await import(pathToFileURL(join(DIST, 'components', row.name, 'index.js')).href);
    if (row.render === '' || typeof p.mod[row.render] !== 'function') {
      throw new Error('清单里的渲染入口 `' + row.render + '` 在该件的编译产物里不是函数');
    }
    if (row.style === '' || typeof p.mod[row.style] !== 'function') {
      throw new Error('清单里的样式入口 `' + row.style + '` 在该件的编译产物里不是函数');
    }
    p.css = p.mod[row.style]();
    /* 运行时段：清单的 `runtime` 字段写着 `有（runtime.ts：buildXxxJs）`——函数名从那里读，不另立名单。 */
    const m = /：\s*([A-Za-z_$][\w$]*)/.exec(row.runtime);
    if (m !== null && typeof p.mod[m[1]] === 'function') { p.runtimeName = m[1]; p.runtimeJs = p.mod[m[1]](); }
    if (row.sample !== null) {
      const html = p.mod[row.render](row.sample);
      p.html = typeof html === 'string' ? html : null;
    }
    if (p.html === null && row.sample !== null) p.renderErr = '样例入参没渲出字符串（清单约定样例必须直渲成功）';
  } catch (e) {
    p.loadErr = String(e && e.message ? e.message : e);
  }
  PIECES.push(p);
}

const broken = PIECES.filter((p) => p.loadErr !== '');
const RUNTIME_PIECES = PIECES.filter((p) => p.runtimeJs !== null);
console.log('跨件不变量：件数=' + PIECES.length + '（' + PIECES.map((p) => p.row.name).join('、') + '）'
  + '；装载不上 ' + broken.length + ' 件；样例里带 number 的 ' + PIECES.filter((p) => p.numbers.length > 0).length
  + ' 件；有运行时段 ' + RUNTIME_PIECES.length + ' 件');
if (broken.length > 0) console.log('读数：装不上（模块／入口取不到，逐件报原文）：'
  + broken.map((p) => p.row.name + '：' + p.loadErr).join('；'));

/* ── ① 非有限数（子进程：OOM／挂死不许带走整条门） ──────────────────── */

describe('跨件不变量 ①：非有限数一律拒（±1e308／Infinity／NaN 逐个打进每个 number 字段）', () => {
  const child = { status: 'not-run', results: new Map(), why: '', done: [] };

  before(() => {
    const r = spawnSync(process.execPath,
      ['--max-old-space-size=512', fileURLToPath(import.meta.url), CHILD_FLAG],
      { encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024 });
    if (r.error !== undefined && r.error !== null) { child.why = String(r.error.message); child.status = 'failed'; return; }
    for (const line of String(r.stdout === null ? '' : r.stdout).split('\n')) {
      if (line.trim() === '') continue;
      try {
        const one = JSON.parse(line);
        if (one.piece !== undefined) { child.results.set(one.piece, one); child.done.push(one.piece); }
      } catch { /* 半行（被截断的尾巴）不算 */ }
    }
    if (r.status === 0) { child.status = 'ok'; return; }
    /* 非 0：多半是被 OOM／超时杀掉——**死在**最后跑完的那一件之后，报出来。 */
    child.status = 'failed';
    child.why = '子进程退出码 ' + String(r.status) + '（信号 ' + String(r.signal) + '）；'
      + '最后跑完的是 ' + (child.done.length > 0 ? child.done[child.done.length - 1] : '(第一件)')
      + '——它之后那几件的读数缺失（多半就是它被 ±1e308 顶爆了内存或跑成了死循环）';
    console.log('读数 ①：子进程非正常结束——' + child.why);
  });

  it('非有限数扫描跑得完（跑不完＝有件在坏数上 OOM／挂死）', () => {
    if (child.status === 'failed') {
      assert.fail('① 的非有限数扫描跑不完：' + child.why
        + '\n最小复现：从该件样例入参里挑一个 number 字段换成 1e308／-1e308，调它自己的渲染入口');
    }
    assert.notEqual(child.status, 'not-run', '子进程读数没拿到');
  });

  for (const p of PIECES) {
    it(p.row.name + '：' + (p.numbers.length === 0 ? '样例里没有 number 字段（跳过）' : '每个 number 字段 × 五个坏数都拒'), () => {
      if (p.loadErr !== '') assert.fail(p.row.name + ' 装不上：' + p.loadErr);
      if (p.numbers.length === 0) {
        console.log('读数 ①：' + p.row.name + ' 跳过（样例入参里一个 number 字段都没有；'
          + '最小复现：给它一个 number 字段再拿五个坏数打一遍）');
        return;
      }
      const got = child.results.get(p.row.name);
      if (got === undefined) assert.fail(p.row.name + '：非有限数扫描没跑到它（' + child.why + '）');
      if (got.err !== undefined) assert.fail(p.row.name + '：' + got.err);
      const bad = got.cases.filter((c) => c.state !== 'BlocksError');
      const lines = bad.map((c) => p.row.name + '｜' + c.path + ' ← ' + c.value + ' ⇒ ' + c.state
        + (c.excerpt === '' ? '' : '｜产物含坏字样：…' + c.excerpt + '…')
        + '｜最小复现：把该件样例入参的 ' + c.path + ' 换成 ' + c.value + '，调该件的渲染入口');
      for (const line of lines) console.error('① 红 ' + line);
      assert.deepEqual(bad.map((c) => c.path + '←' + c.value), [],
        p.row.name + '：' + bad.length + '／' + got.cases.length + ' 个坏数被收下（入参违规一律拒，必须抛 BlocksError）\n  '
        + lines.join('\n  '));
    });
  }
});

/* ── ② 用户可见文本零键盘语汇（复用 ⑨ 的实现，不抄第二份） ──────────── */

/** 从先例 `组件样式纪律.test.mjs` 第 ⑨ 组的源码里**抽**出词表与匹配口径（`sliceFrom()` 配平括号地切块）。
 *
 *  为什么不 import：那个文件顶层就是一串 `describe()`，import 会把它的判据一起挂到本文件上（同一条跑两遍）。
 *  为什么不抄一份：抄的那份迟早与原份走散。**抽不出来即拒跑**——它的形状一变（改名／挪位），本判据当场红，
 *  而不是静默空转成「零命中」。 */
function keyboardVocab() {
  const src = readFileSync(join(HERE, '组件样式纪律.test.mjs'), 'utf8');
  /** 从 `anchor` 起切一块：**跳过字符串与正则字面量**再配平括号（`RUNTIME_KEYBOARD` 那条正则里
   *  有 `\(` 与 `['"]` 这类转义／字符类，不跳过就会把括号数错、整块切不出来——2026-09 首跑实测）。 */
  const prevNonSpace = (i) => {
    for (let j = i - 1; j >= 0; j -= 1) if (!/\s/.test(src[j])) return src[j];
    return '';
  };
  const sliceFrom = (anchor) => {
    const at = src.indexOf(anchor);
    if (at < 0) return null;
    let depth = 0;
    let body = false;
    for (let i = at; i < src.length; i += 1) {
      const c = src[i];
      if (c === '"' || c === "'" || c === '`') {
        i += 1;
        while (i < src.length && src[i] !== c) i += src[i] === '\\' ? 2 : 1;
        continue;
      }
      if (c === '/' && '(,=:[!&|?{;'.includes(prevNonSpace(i))) {
        i += 1;
        let inClass = false;
        while (i < src.length && (inClass || src[i] !== '/')) {
          if (src[i] === '\\') i += 1;
          else if (src[i] === '[') inClass = true;
          else if (src[i] === ']') inClass = false;
          i += 1;
        }
        continue;
      }
      if (c === '{') { depth += 1; body = true; continue; }
      if (c === '}') { depth -= 1; if (body && depth === 0) return src.slice(at, i + 1); continue; }
      if (c === '(' || c === '[') { depth += 1; continue; }
      if (c === ')' || c === ']') { depth -= 1; continue; }
      if (c === ';' && depth === 0) return src.slice(at, i + 1);
    }
    return null;
  };
  const names = ['codeLines', 'KEYBOARD_WORDS', 'KEYBOARD_NAMES', 'RUNTIME_KEYBOARD', 'isRuntimeBranch',
    'ARROW_GLYPHS', 'blankBlockComments', 'literalsIn', 'keyboardHit', 'keyboardHitsIn'];
  const anchors = ['function codeLines(src) {', 'const KEYBOARD_WORDS = [', 'const KEYBOARD_NAMES = [',
    'const RUNTIME_KEYBOARD = ', 'const isRuntimeBranch = ', 'const ARROW_GLYPHS = [',
    'function blankBlockComments(text) {', 'function literalsIn(line) {', 'function keyboardHit(word, line) {',
    'function keyboardHitsIn(text) {'];
  const blocks = anchors.map(sliceFrom);
  const missing = names.filter((_, i) => blocks[i] === null);
  if (missing.length > 0) {
    throw new Error('② 的键盘词表抽不出来（`组件样式纪律.test.mjs` 第 ⑨ 组的形状变了）：缺 ' + missing.join('、')
      + '。本条判据**拒跑**（不许静默空转成零命中）——修法：保持那一组里这几个名字与形状，或把本判据的抽取锚点跟上。');
  }
  const made = new Function('return (function(){' + blocks.join('\n') + '\n'
    + 'return { KEYBOARD_WORDS: KEYBOARD_WORDS, KEYBOARD_NAMES: KEYBOARD_NAMES, keyboardHit: keyboardHit };})()')();
  if (!Array.isArray(made.KEYBOARD_WORDS) || !made.KEYBOARD_WORDS.includes('⌘') || !made.KEYBOARD_WORDS.includes('键盘')) {
    throw new Error('② 抽出来的词表不像词表（缺 ⌘／键盘）：' + JSON.stringify(made.KEYBOARD_WORDS));
  }
  if (!Array.isArray(made.KEYBOARD_NAMES) || !made.KEYBOARD_NAMES.includes('Esc')) {
    throw new Error('② 抽出来的键名表不像键名表：' + JSON.stringify(made.KEYBOARD_NAMES));
  }
  return made;
}

/** **抽失败＝判据拒跑，不是整个文件装不上**：在顶层接住，逐条 ② 的 `it` 里再报红
 *  （顶层直接抛会让 node:test 在跑到这一行时把后面所有套件一起丢掉——2026-09 首跑实测）。 */
let VOCAB = null;
let VOCAB_ERR = '';
try {
  VOCAB = keyboardVocab();
} catch (e) {
  VOCAB_ERR = String(e && e.message ? e.message : e);
}

/** **用户看得见的那一档**：剥掉注释与标签（属性一并剥掉），只剩文本节点。 */
const visibleText = (html) => html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');

/** 命中处的一小段上下文（报错要说清「哪一条、原文是什么」）。 */
function around(text, needle) {
  const i = text.indexOf(needle);
  return (i < 0 ? text.slice(0, 80) : text.slice(Math.max(0, i - 40), i + 50)).replace(/\s+/g, ' ').trim();
}

describe('跨件不变量 ②：用户可见文本零键盘语汇（口径与词表从 ⑨ 组抽出来用）', () => {
  it('词表抽出来了，且是那份词表（守门人的守门人）', () => {
    if (VOCAB_ERR !== '') assert.fail(VOCAB_ERR);
    console.log('读数 ②：词表 ' + JSON.stringify(VOCAB.KEYBOARD_WORDS) + '；键名表 ' + JSON.stringify(VOCAB.KEYBOARD_NAMES)
      + '（口径与词表从 `组件样式纪律.test.mjs` 第 ⑨ 组现抽，不抄第二份）');
  });

  for (const p of PIECES) {
    it(p.row.name + '：样例标记的可见文本零键盘语汇', () => {
      if (VOCAB_ERR !== '') assert.fail(VOCAB_ERR);
      if (p.loadErr !== '') assert.fail(p.row.name + ' 装不上：' + p.loadErr);
      if (p.html === null) { console.log('读数 ②：' + p.row.name + ' 跳过（' + p.renderErr + '）'); return; }
      const text = visibleText(p.html);
      const bad = [];
      for (const w of VOCAB.KEYBOARD_WORDS) {
        const hit = VOCAB.keyboardHit(w, text);
        if (hit !== null) bad.push({ word: hit, where: '…' + around(text, hit) + '…' });
      }
      for (const w of VOCAB.KEYBOARD_NAMES) {
        const hit = new RegExp('\\b' + w + '\\b').exec(text);
        if (hit !== null) bad.push({ word: hit[0], where: '…' + around(text, hit[0]) + '…' });
      }
      const lines = bad.map((b) => p.row.name + '｜' + b.word + '｜' + b.where
        + '｜最小复现：渲染该件样例入参、剥离注释与标签后搜这个词');
      for (const line of lines) console.error('② 红 ' + line);
      assert.deepEqual(bad.map((b) => b.word), [], p.row.name + ' 的可见文本里有键盘语汇（用户口径：手机与电脑端同时在用，'
        + '不存在方向键等键盘相关的东西）：\n  ' + lines.join('\n  '));
    });
  }
});

/* ── ③ 未知键一律拒 ─────────────────────────────────────────────────── */

describe('跨件不变量 ③：未知键一律拒（样例里每个对象层各加一个 `zzUnknown: 1`）', () => {
  for (const p of PIECES) {
    it(p.row.name + '：每个对象层加未知键都抛 BlocksError', () => {
      if (p.loadErr !== '') assert.fail(p.row.name + ' 装不上：' + p.loadErr);
      if (p.sample === null) { console.log('读数 ③：' + p.row.name + ' 跳过（清单里没有样例入参）'); return; }
      const bad = [];
      for (const path of p.objects) {
        const where = path === '' ? '(根)' : path;
        let state = '';
        try {
          const html = p.mod[p.row.render](withUnknownKey(p.sample, path));
          state = '收下（渲染成功' + (typeof html === 'string' ? '，产物 ' + html.length + ' 字节' : '') + '）';
        } catch (e) {
          const name = e !== null && typeof e === 'object' && e.name !== undefined ? e.name : '(无名)';
          state = name === 'BlocksError' ? 'BlocksError' : '抛的是 ' + name + '：' + String(e && e.message ? e.message : e).slice(0, 60);
        }
        if (state !== 'BlocksError') bad.push({ path: where, state });
      }
      const lines = bad.map((b) => p.row.name + '｜' + b.path + ' 加 zzUnknown:1 ⇒ ' + b.state
        + '｜最小复现：给该件样例入参的 ' + b.path + ' 加一个 zzUnknown: 1，调它的渲染入口（未知键一律拒、不许静默吞掉）');
      for (const line of lines) console.error('③ 红 ' + line);
      assert.deepEqual(bad.map((b) => b.path), [], p.row.name + '：' + bad.length + '／' + p.objects.length
        + ' 个对象层把未知键静默吞掉：\n  ' + lines.join('\n  '));
    });
  }
});

/* ── 真机（一台 Chrome 跑完所有件；起不来照实打出来） ────────────────── */

let MACHINE = null;
let machineWhy = '';

before(async () => {
  if (process.env.ILIFE_CROSS_NO_MACHINE === '1') { machineWhy = 'ILIFE_CROSS_NO_MACHINE=1（按开关不起浏览器）'; return; }
  try {
    MACHINE = await startBrowser();
  } catch (e) {
    MACHINE = null;
    machineWhy = String(e && e.message ? e.message : e);
  }
  if (MACHINE === null) {
    console.log('真机未跑（④ 的真指针档、⑤ 的逐条对账都退成读数）：' + (machineWhy === '' ? '本机没有 Chrome' : machineWhy));
  } else {
    console.log('真机：一台 headless Chrome ＋ CDP 起来了（④⑤ 共用这一台）');
  }
});

after(() => { if (MACHINE !== null) MACHINE.close(); });

/** 真机没起来时，逐件把「真机未跑」打出来（不许静默略过）。 */
const machineSkip = (p, what) => {
  console.log('读数 ' + what + '：' + p.row.name + ' 真机未跑（' + (machineWhy === '' ? '本机没有 Chrome' : machineWhy) + '）');
};

/* ── ④ 运行时段与渲染期写同一套类名 ─────────────────────────────────── */

/** **「选中／拿起／开合」词表**（判的就是这一档：这几个词只要在渲染期出现，运行时段就必须认识）。
 *
 *  为什么是这样一个闭集：`is-*` 这个前缀在本层是**三个语义共用**的——形态键（`is-<形态名>`，住在根上）、
 *  色调（`is-ok`／`is-warn`／`is-up`／`is-l1`…，渲染期由入参算出）与**状态**（点一下就换的那几个）。
 *  前两类运行时段**不重算**，拿它们判红是假阳性（本批实测：`is-quiet`／`is-primary`／`is-added`／`is-n3`
 *  都会被误判成「运行时段不认识」）。故这里只钉状态那一档；色调与形态键另有各自的判据。
 *  写法与 `test/组件样式纪律.test.mjs` 的 `KEYBOARD_WORDS` 同法：闭集写在判据里、附出处，不散落别处。 */
const STATE_WORDS = [
  'is-picked', 'is-lifted', 'is-lift', 'is-up', 'is-down', 'is-on', 'is-off', 'is-open', 'is-closed',
  'is-opened', 'is-checked', 'is-selected', 'is-current', 'is-active', 'is-pressed', 'is-dragging',
  'is-expanded', 'is-collapsed', 'is-folded', 'is-picking',
];

/** 一段运行时段 JS 里有没有这个词（按词边界，防 `is-on` 命中 `is-online`）。 */
const knowsWord = (js, w) => new RegExp('(^|[^a-z0-9-])' + w + '([^a-z0-9-]|$)').test(js);

/** 页内脚本的公共部分：件根 ＋ 可点件判定 ＋ 可见判定 ＋ 状态词。 */
const PAGE_HELPERS = `
  var root=document.querySelector('[data-ilife]')||document.querySelector('.ilife-page-ui > *');
  var clickable=function(el){return !!el&&(el.tagName==='BUTTON'||el.getAttribute('role')==='button'||(el.tagName==='A'&&el.getAttribute('href')!==null));};
  var shown=function(el){var x=el;while(x&&x!==document.documentElement){var cs=getComputedStyle(x);if(cs.display==='none'||cs.visibility==='hidden')return false;x=x.parentElement;}
    var r=el.getBoundingClientRect();return r.width>0&&r.height>0;};
  var stateWords=${JSON.stringify(STATE_WORDS)};
  var stateOn=function(el){return (el.className||'').toString().split(/\\s+/).filter(function(c){return stateWords.indexOf(c)>=0;});};
`;

/** 页内：列出「主要可点元素」的**候选序**——渲染期挂状态词的那一枚（自身可点／内含可点件／最近可点祖先），
 *  紧跟它**同一槽位里的兄弟可点件**（「选中组」里点已选那一枚按设计就是空操作，真用户点的是兄弟——先例
 *  `reminder-setter` 的那排芯片），最后退到第一枚可见可点元素。每条候选都先量可达性（宽高非零＋命中的是它自己）。 */
const TARGET_FN = '(function(){' + PAGE_HELPERS + `
  if(!root) return {miss:'页上找不到件根'};
  var out=[],seen=[];
  var push=function(el,why,state,strong){
    if(!el||seen.indexOf(el)>=0) return; seen.push(el);
    if(!shown(el)) return;
    var r=el.getBoundingClientRect(); if(r.width<=0||r.height<=0) return;
    var x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2),top=document.elementFromPoint(x,y);
    out.push({x:x,y:y,w:Math.round(r.width),h:Math.round(r.height),tag:el.tagName,cls:(el.className||'').toString(),
      why:why,state:state,strong:strong,ok:!!top&&(top===el||el.contains(top))});
  };
  var states=[].slice.call(root.querySelectorAll('*')).filter(function(d){return stateOn(d).length>0;});
  for (var i=0;i<states.length&&out.length<6;i+=1){
    var d=states[i],words=stateOn(d),target=null,why='';
    if (clickable(d)&&!d.disabled){ target=d; why='挂状态词的那一枚元素自身可点'; }
    else {
      var inner=[].slice.call(d.querySelectorAll('button,[role=button]')).filter(function(b){return !b.disabled;});
      if (inner.length>0){ target=inner[0]; why='挂状态词的那一枚元素里的第一枚可点件'; }
      else { var up=d.parentElement; while(up&&up!==root){ if (clickable(up)&&!up.disabled){ target=up; why='挂状态词那一枚最近的可点祖先'; break; } up=up.parentElement; } }
    }
    if(!target) continue;
    push(target,why,words,true);
    var base=(target.className||'').split(/\\s+/).filter(function(c){return c&&stateWords.indexOf(c)<0;});
    var key=base[base.length-1];
    if(key){
      var sibs=[].slice.call(root.querySelectorAll('.'+CSS.escape(key))).filter(function(x){return clickable(x)&&!x.disabled;});
      for (var s=0;s<sibs.length&&out.length<6;s+=1) push(sibs[s],'同一槽位（'+key+'）里的兄弟可点件',words,true);
    }
  }
  if(out.length===0){
    var b=[].slice.call(root.querySelectorAll('button,[role=button]')).filter(function(x){return !x.disabled;});
    for (var j=0;j<b.length&&out.length<3;j+=1) push(b[j],'退档：第一枚可见可点元素（渲染期没有状态词）',[],false);
  }
  if(out.length===0) return {miss:'页上没有可见的可点元素'};
  return {cands:out};})()`;

/** 页内：状态快照（根属性 ＋ 每枚元素的 className ＋ 文本）。 */
const SNAP_FN = '(function(){' + PAGE_HELPERS + `
  if(!root) return {miss:true};
  var cls={},txt={},path=function(el){var p=[],x=el;while(x&&x!==root){p.unshift([].indexOf.call(x.parentNode.children,x));x=x.parentNode;}return p.join('.');};
  [].forEach.call(root.querySelectorAll('*'),function(el){var k=path(el);cls[k]=(el.className||'').toString();txt[k]=(el.textContent||'').replace(/\\s+/g,' ').slice(0,60);});
  return {attrs:root.outerHTML.slice(0,root.outerHTML.indexOf('>')+1),cls:cls,txt:txt};})()`;

/** 一件的真机夹具：皮肤取值表 ＋ 本件样式段 ＋ 本件标记 ＋ 运行时段。 */
const fixture = (p) => '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>' + p.row.name + '</title>\n<style>\n'
  + 'html,body{margin:0;padding:0}\n' + skinCss() + '\n' + p.css + '\n</style></head>\n<body>\n'
  + '<div class="ilife-page-ui ' + skinClass('paper') + '" style="padding:16px">' + p.html
  + '<p style="height:400px">页面正文</p></div>\n'
  + '<script>' + p.runtimeJs + '</script>\n</body></html>';

describe('跨件不变量 ④：运行时段与渲染期写同一套类名（静档：词表对账）', () => {
  /** 渲染期挂在**可点件**上的状态词（可点件＝自身可点，或里面包着一枚 `<button>`；按不动的件不算）。 */
  const stateElemsOf = (html) => elementsOf(html)
    .filter((e, i) => i > 0 /* 根不算：根上的 is-* 是形态键那一档 */)
    .filter((e) => (e.clickable || e.buttonInside) && !e.disabled)
    .map((e) => ({ tag: e.tag, words: e.cls.split(/\s+/).filter((c) => STATE_WORDS.includes(c)) }))
    .filter((x) => x.words.length > 0);

  const withState = [];
  for (const p of RUNTIME_PIECES) {
    if (p.html === null) continue;
    const hits = stateElemsOf(p.html);
    if (hits.length > 0) withState.push({ p, hits });
  }
  console.log('读数 ④：渲染期在可点件上挂了状态词的件 ' + withState.length + '／' + RUNTIME_PIECES.length + '：'
    + withState.map((x) => x.p.row.name + '（' + [...new Set(x.hits.flatMap((h) => h.words))].join('｜') + '）').join('、'));

  for (const p of RUNTIME_PIECES) {
    it(p.row.name + '：渲染期那套状态词运行时段认识', () => {
      if (p.loadErr !== '') assert.fail(p.row.name + ' 装不上：' + p.loadErr);
      const found = withState.find((x) => x.p === p);
      if (p.html === null) { console.log('读数 ④：' + p.row.name + ' 跳过（' + p.renderErr + '）'); return; }
      if (found === undefined) {
        console.log('读数 ④：' + p.row.name + ' 跳过（渲染期没有挂在可点件上的选中／拿起／开合类名；'
          + '最小复现：渲染该件样例入参，在 `class="…"` 里搜 ' + STATE_WORDS.join('／') + ' 之一）');
        return;
      }
      const missing = [...new Set(found.hits.flatMap((h) => h.words))].filter((w) => !knowsWord(p.runtimeJs, w));
      const lines = missing.map((w) => p.row.name + '｜' + w + '（渲染期挂在可点件上）｜运行时段 JS 里没有这个词'
        + '｜最小复现：把 `' + p.runtimeName + '()` 的产物搜 "' + w + '"（该件渲染期用的是这一套词，运行时段却在写别的）');
      for (const line of lines) console.error('④ 红 ' + line);
      assert.deepEqual(missing, [], p.row.name + '：渲染期写得出、运行时段从不写这几个类名（点上去没有这一档形）：\n  ' + lines.join('\n  '));
    });
  }
});

describe('跨件不变量 ④b：真指针点「主要可点元素」，状态真的变了且变的是同一套词', () => {
  for (const p of RUNTIME_PIECES) {
    it(p.row.name + '：真指针点一下', async () => {
      if (p.loadErr !== '') assert.fail(p.row.name + ' 装不上：' + p.loadErr);
      if (MACHINE === null) { machineSkip(p, '④b'); return; }
      if (p.html === null) { console.log('读数 ④b：' + p.row.name + ' 跳过（' + p.renderErr + '）'); return; }
      await MACHINE.at(fixture(p), { width: WIDTHS[1], height: 900 });
      const t = await MACHINE.ev(TARGET_FN);
      if (t.miss !== undefined) { console.log('读数 ④b：' + p.row.name + ' 跳过（' + t.miss + '）'); return; }
      const cands = (t.cands === undefined ? [] : t.cands).filter((c) => c.ok === true).slice(0, 3);
      if (cands.length === 0) {
        const one = t.cands[0];
        console.log('读数 ④b：' + p.row.name + ' 跳过（候选在屏上到不了：' + JSON.stringify({ tag: one.tag, w: one.w, h: one.h, ok: one.ok }) + '）');
        return;
      }
      /** 快照差异：类名／根属性／文本，分开记（判「状态真的变了」与「变的是同一套词」）。 */
      const diffOf = (before, after) => {
        const clsDiff = [];
        for (const k of new Set([...Object.keys(before.cls), ...Object.keys(after.cls)])) {
          if ((before.cls[k] || '') !== (after.cls[k] || '')) {
            clsDiff.push(k + '：' + JSON.stringify((before.cls[k] || '').trim()) + ' ⇒ ' + JSON.stringify((after.cls[k] || '').trim()));
          }
        }
        const attrChanged = before.attrs !== after.attrs;
        const txtChanged = Object.keys(before.txt).some((k) => before.txt[k] !== after.txt[k]);
        return { clsDiff, attrChanged, txtChanged, changed: clsDiff.length > 0 || attrChanged || txtChanged };
      };
      /* 该件渲染期用过的 `is-*` 词（判「变的是不是同一套词」）。 */
      const renderWords = new Set([...p.html.matchAll(/class="([^"]*)"/g)]
        .flatMap((m) => m[1].split(/\s+/)).filter((c) => c.startsWith('is-')));
      const strong = t.cands[0].strong === true;
      const tries = [];
      let hit = null;
      for (const c of cands) {
        const before = await MACHINE.ev(SNAP_FN);
        await MACHINE.mouse(c.x, c.y);
        const after = await MACHINE.ev(SNAP_FN);
        const diff = diffOf(before, after);
        tries.push({ c, diff });
        if (diff.changed) { hit = { c, diff }; break; }
      }
      const lines = tries.map((x) => x.c.tag + '（' + x.c.why + '，' + x.c.w + '×' + x.c.h + '，坐标 ' + x.c.x + ',' + x.c.y
        + '）⇒ 类名变化 ' + JSON.stringify(x.diff.clsDiff.slice(0, 3)) + '｜根属性变=' + x.diff.attrChanged + '｜文本变=' + x.diff.txtChanged);
      console.log('读数 ④b ' + p.row.name + '：渲染期状态词=' + JSON.stringify(t.cands[0].state) + '｜' + lines.join(' ／ '));
      if (!strong) {
        console.log('读数 ④b：' + p.row.name + ' 弱档（渲染期没有状态词，只记「点了一下有没有反应」，不判红）');
        return;
      }
      assert.notEqual(hit, null, p.row.name + '：真指针点了「主要的那一枚可点元素」（连同它同槽位的兄弟，共 '
        + cands.length + ' 枚），点完之后状态**一点没变**——屏上到不了这一档\n  ' + lines.join('\n  ')
        + '\n最小复现：把该件标记＋运行时段放进一台真浏览器，按上面那串坐标逐枚按下再松开，读根属性与各元素 className');
      const changed = [...new Set(hit.diff.clsDiff.flatMap((d) => [...d.matchAll(/(is-[a-z0-9-]+)/g)].map((m) => m[1])))]
        .filter((w) => renderWords.has(w));
      assert.ok(changed.length > 0,
        p.row.name + '：点完之后变动的类名里没有一枚落在该件渲染期用过的 `is-*` 词里（运行时段写的是另一套词）——'
        + '渲染期用过 ' + JSON.stringify([...renderWords]) + '，点后变化 ' + JSON.stringify(hit.diff.clsDiff.slice(0, 4)));
    });
  }
});

/* ── ⑤ 位置／长度由数值算出 ⇒ 逐条对账（真机） ─────────────────────── */

/** 页内：读全部行内几何元素，并算出「声明的位置／长度」与「量到的位置／长度」。
 *
 *  两种口径由**该枚自己的声明形状**定，不靠猜：只声明一支位置＝**记号**（量中心）；
 *  位置 ＋ 长度（或只声明长度）＝**条**（量边与长）。位置一侧允许「中心／近端边／远端边」三者之一兑现——
 *  `translateX(-50%)`（居中）、`translateX(-100%)`（收边）与不位移（贴边）都是本层在用的写法
 *  （先例 `spread-dist/style-box.ts` 的 `.is-last` 收边规则、`radar-profile` 的外侧标签）。 */
const GEOM_FN = '(function(){' + `
  var RE=/(?:^|;)\\s*(bottom|top|left|right|height|width)\\s*:\\s*(-?[\\d.]+)(%|px)/g;
  var NUM=/^-?\\d[\\d,]*(?:\\.\\d+)?/;
  var px=function(v){return parseFloat(v)||0;};
  var out=[];
  var cells=[].slice.call(document.querySelectorAll('[data-piece]'));
  for (var c=0;c<cells.length;c+=1){
    var piece=cells[c].getAttribute('data-piece'), w=Number(cells[c].getAttribute('data-w'));
    var all=[].slice.call(cells[c].querySelectorAll('[style]'));
    for (var i=0;i<all.length;i+=1){
      var el=all[i],raw=el.getAttribute('style'),m,decl=[];
      RE.lastIndex=0;
      while((m=RE.exec(raw))!==null) decl.push({prop:m[1],value:Number(m[2]),unit:m[3]});
      if(decl.length===0) continue;
      var cs=getComputedStyle(el);
      var abs=(cs.position==='absolute'||cs.position==='fixed');
      /* **参照盒**：绝对／固定定位的元素按**最近的定位祖先**的 padding 盒（没有就用初始包含块）；
         在流元素按**父盒的内容盒**（百分比宽高就是照它算的）。 */
      var cont=el.parentElement;
      if (abs){
        var up=el.parentElement,guard=0;
        while(up&&getComputedStyle(up).position==='static'&&guard<30){up=up.parentElement;guard+=1;}
        cont=up||document.documentElement;
      }
      if(!cont) continue;
      var cr=cont.getBoundingClientRect(),ccs=getComputedStyle(cont),r=el.getBoundingClientRect();
      var bx=px(ccs.borderLeftWidth),by=px(ccs.borderTopWidth),bz=px(ccs.borderRightWidth),bw=px(ccs.borderBottomWidth);
      var pl=px(ccs.paddingLeft),pt=px(ccs.paddingTop),pr=px(ccs.paddingRight),pb=px(ccs.paddingBottom);
      var refL=cr.left+bx+(abs?0:pl),refT=cr.top+by+(abs?0:pt);
      var refW=cr.width-bx-bz-(abs?0:pl+pr),refH=cr.height-by-bw-(abs?0:pt+pb);
      var refB=refT+refH,refR=refL+refW;
      var cls=(el.getAttribute('class')||'').split(/\\s+/).filter(function(x){return x;});
      var slot=cls.filter(function(x){return x.indexOf('is-')!==0;}).slice(-1)[0]||'';
      var text=(el.textContent||'').replace(/\\s+/g,' ').trim();
      var nm=NUM.exec(text);
      out.push({piece:piece,w:w,slot:slot,decl:decl,text:text.slice(0,18),
        num:nm===null?null:Number(nm[0].replace(/,/g,'')),
        cssPosition:cs.position,
        pos:decl.filter(function(d){return d.prop==='bottom'||d.prop==='top'||d.prop==='left'||d.prop==='right';}).map(function(d){return d.prop;}),
        cB:Math.round((refB-(r.top+r.height/2))*100)/100,cT:Math.round(((r.top+r.height/2)-refT)*100)/100,
        cL:Math.round(((r.left+r.width/2)-refL)*100)/100,cR:Math.round((refR-(r.left+r.width/2))*100)/100,
        eB:Math.round((refB-r.bottom)*100)/100,eT:Math.round((r.top-refT)*100)/100,
        eL:Math.round((r.left-refL)*100)/100,eR:Math.round((refR-r.right)*100)/100,
        h:Math.round(r.height*100)/100,ww:Math.round(r.width*100)/100,
        contH:Math.round(refH*100)/100,contW:Math.round(refW*100)/100,
        contCls:(cont.getAttribute('class')||cont.tagName.toLowerCase())});
    }
  }
  return out;})()`;

/** 一条行内几何声明的**实测读数**：位置按「中心／近端边／远端边」取最近的那一支，长度按实测尺寸。 */
function measure(e, d) {
  const yAxis = d.prop === 'bottom' || d.prop === 'top' || d.prop === 'height';
  const cont = yAxis ? e.contH : e.contW;
  const want = d.unit === '%' ? d.value * cont / 100 : d.value;
  if (d.prop === 'height' || d.prop === 'width') {
    const got = d.prop === 'height' ? e.h : e.ww;
    return { want, got, diff: got - want, how: d.prop === 'height' ? '高' : '宽', cont };
  }
  const list = [
    { v: d.prop === 'bottom' ? e.cB : d.prop === 'top' ? e.cT : d.prop === 'left' ? e.cL : e.cR, how: '中心' },
    { v: d.prop === 'bottom' ? e.eB : d.prop === 'top' ? e.eT : d.prop === 'left' ? e.eL : e.eR, how: '近端边' },
    { v: d.prop === 'bottom' ? (cont - e.eT) : d.prop === 'top' ? (cont - e.eB)
      : d.prop === 'left' ? (cont - e.eR) : (cont - e.eL), how: '远端边' },
  ];
  const best = list.map((x) => ({ ...x, d: Math.abs(x.v - want) })).sort((a, b) => a.d - b.d)[0];
  return { want, got: best.v, diff: best.v - want, how: best.how, cont };
}

/** ⑤ 的认面：样例标记里带行内几何（位置或长度）的件。 */
const GEOM_FACE = PIECES.filter((p) => p.html !== null
  && /(?:bottom|top|left|right|height|width)\s*:\s*-?[\d.]+(?:%|px)/.test(p.html));
console.log('读数 ⑤：样例标记里带行内几何的件 ' + GEOM_FACE.length + '／' + PIECES.length + '：'
  + GEOM_FACE.map((p) => p.row.name).join('、'));

describe('跨件不变量 ⑤：位置／长度由数值算出的逐条对账（真机，每枚都量）', () => {
  /** 两档各一页：全部带行内几何的件放进去（一台 Chrome 跑完所有件，不一件起一台）。 */
  let READINGS = null;
  const readings = async () => {
    if (READINGS !== null) return READINGS;
    const css = [skinCss(), ...GEOM_FACE.map((p) => p.css)].join('\n');
    const rows = [];
    for (const w of WIDTHS) {
      const cells = GEOM_FACE.map((p) => '<div class="stg ilife-page-ui" data-piece="' + p.row.name + '" data-w="' + w
        + '" style="width:' + w + 'px">' + p.html + '</div>').join('\n');
      await MACHINE.at('<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><style>\n'
        + 'html,body{margin:0;padding:0}\n.stg{margin:0 0 16px}\n' + css + '\n</style></head><body>\n' + cells + '\n</body></html>',
      { width: 1100, height: 800 });
      rows.push(...(await MACHINE.ev(GEOM_FN)));
    }
    READINGS = rows;
    console.log('读数 ⑤：两档（' + WIDTHS.join('／') + '）量到行内几何元素 ' + rows.length + ' 枚');
    return READINGS;
  };

  for (const p of GEOM_FACE) {
    it(p.row.name + '：每枚行内几何都兑现；刻度类逐枚对「值 → 位置」直线', async () => {
      if (p.loadErr !== '') assert.fail(p.row.name + ' 装不上：' + p.loadErr);
      if (MACHINE === null) { machineSkip(p, '⑤'); return; }
      const mine = (await readings()).filter((e) => e.piece === p.row.name);
      if (mine.length === 0) assert.fail(p.row.name + '：真机上量不到行内几何元素（判据会空转）');
      const bad = [];

      /* B 支：逐条兑现（每一枚、每一条声明）。 */
      const skippedDecl = [];
      for (const e of mine) {
        for (const d of e.decl) {
          /* 在流元素上的 `left/top/right/bottom` 按 CSS 规则**不生效**（那是给定位元素用的）：
             这一条不当成「没兑现」判红（它压根不参与排版），只打一行读数。 */
          const positionProp = d.prop === 'bottom' || d.prop === 'top' || d.prop === 'left' || d.prop === 'right';
          if (positionProp && e.cssPosition !== 'absolute' && e.cssPosition !== 'fixed') {
            skippedDecl.push(e.w + '档｜' + e.slot + '｜' + d.prop + '（该枚 position: ' + e.cssPosition + '，这条声明不参与排版）');
            continue;
          }
          const got = measure(e, d);
          if (Math.abs(got.diff) > TOL) {
            bad.push(e.w + '档｜' + e.slot + '（定位容器 ' + got.cont + 'px，' + e.contCls + '）｜声明 ' + d.prop + ': '
              + d.value + d.unit + ' ⇒ 应有 ' + Math.round(got.want * 10) / 10 + 'px，量到 ' + Math.round(got.got * 10) / 10
              + 'px（' + got.how + '，差 ' + Math.round(got.diff * 10) / 10 + 'px）｜文字 ' + JSON.stringify(e.text)
              + '｜最小复现：该件 ' + e.w + ' 档下这一枚 ' + e.slot);
          }
        }
      }

      /* A 支：同一槽位、同容器、≥3 枚、各只声明一支位置、文字以数字开头且互不相同 ⇒ 量中心对「值 → 位置」直线。 */
      const groups = new Map();
      for (const e of mine) {
        if (e.pos.length !== 1 || e.decl.length !== 1 || e.num === null) continue;
        const k = e.w + '｜' + e.slot + '｜' + e.pos[0] + '｜' + e.contCls;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(e);
      }
      const skipped = [];
      let judgeable = 0;
      for (const [k, list] of groups) {
        if (list.length < 3) { skipped.push(k + '：只有 ' + list.length + ' 枚'); continue; }
        if (new Set(list.map((e) => e.num)).size !== list.length) { skipped.push(k + '：文字里的数不互不相同'); continue; }
        judgeable += 1;
        const posOf = (e) => {
          const d = e.decl[0];
          if (d.prop === 'bottom') return e.cB;
          if (d.prop === 'top') return e.contH - e.cB;
          if (d.prop === 'left') return e.cL;
          return e.contW - e.cL;
        };
        const sorted = list.slice().sort((a, b) => a.num - b.num);
        const lo = sorted[0];
        const hi = sorted[sorted.length - 1];
        const slope = (posOf(hi) - posOf(lo)) / (hi.num - lo.num);
        for (const e of sorted) {
          const want = posOf(lo) + slope * (e.num - lo.num);
          const diff = posOf(e) - want;
          if (Math.abs(diff) > TOL) {
            bad.push(e.w + '档｜' + e.slot + '｜值 ' + e.num + ' 的中心 ' + Math.round(posOf(e) * 10) / 10
              + 'px，按首末两枚定出来的「值 → 位置」直线应是 ' + Math.round(want * 10) / 10 + 'px（差 '
              + Math.round(diff * 10) / 10 + 'px）｜最小复现：该件 ' + e.w + ' 档下把每一枚刻度的中心量与首末两枚的直线对账（' + k + '）');
          }
        }
      }
      console.log('读数 ⑤ ' + p.row.name + '：行内几何 ' + mine.length + ' 枚 × ' + WIDTHS.length + ' 档；可判的刻度组 '
        + judgeable + '（跳过 ' + skipped.length + (skipped.length === 0 ? '' : '：' + skipped.join('；')) + '）'
        + (skippedDecl.length === 0 ? '' : '；不参与排版的声明 ' + skippedDecl.length + ' 条（' + skippedDecl.slice(0, 3).join('；') + '）'));
      for (const line of bad) console.error('⑤ 红 ' + p.row.name + '｜' + line);
      assert.deepEqual(bad, [], p.row.name + '：' + bad.length + ' 条行内几何在屏上没兑现它自己算出来的那个位置／长度：\n  '
        + bad.join('\n  '));
    });
  }

  it('（范围读数）哪些件没进 ⑤ 的认面、为什么', () => {
    const out = PIECES.filter((p) => !GEOM_FACE.includes(p));
    console.log('读数 ⑤：未进认面 ' + out.length + ' 件：' + out.map((p) => p.row.name + '（'
      + (p.loadErr !== '' ? '装不上' : p.html === null ? '样例渲染不出来' : '样例标记里没有行内几何') + '）').join('、'));
    assert.ok(GEOM_FACE.length > 0, '⑤ 的认面是空的 ⇒ 判据在空转');
  });
});
