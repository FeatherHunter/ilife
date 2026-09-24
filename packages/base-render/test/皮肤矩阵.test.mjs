/** 组件层 · **皮肤矩阵判据**（契约 §五「唯一新增的那条缝」）：**一条文件跑完全部件**。
 *
 *  它吃机器派生的**件清单**（`dist/components/清单.js`，由 `src/components/清单.ts` 编译而来），
 *  对清单里**每一件** × 各套皮肤（`SKIN_NAMES`）× 两个宽度档（390／1280）跑四类断言：
 *   ⓿ **各套皮肤真挂上**（不是「每个 token 三值互异」——那不是契约：broadsheet 与 neutral 的纸面本来就都是白，
 *      它们的差别在圆角／阴影／字面／强调色／字号）：① 每套皮肤给全 token（键集合逐名对上 `SKIN_TOKEN_NAMES`）；
 *      ② 每套的取值与它自己的取值表逐 token 相同；③ 任意两套**不得逐 token 完全相同**（抓「复制一份皮肤没改」）。
 *   ① **各套皮肤下标记逐字节相同**：同一份入参渲染三次逐字节相同；真机上三只皮肤容器里的 `innerHTML`
 *      也逐字节相同（**换皮不换结构**的机械保证）。
 *   ② **样式段纪律**：非空／scope／零 `:root`·`!important`／零 11 个冻结 token 名的**重定义**／
 *      出现的 `--ilife-*` 名**全在皮肤名单里**；本件类名与其余件的标记类名零交集（防跨件泄漏）。
 *      违规**逐条打出来**（哪一条、实际值是什么）——那是回给各组件席的整改单。
 *   ③ **零 DOM 纪律**：`dist/components/<件名>/**` 剥掉字面量与注释后，零 `document.`／`window.`／`navigator.`；
 *   ④ **两档溢出读数**：真机 headless Chrome ＋ CDP 把件放进 390／1280 定宽容器量
 *      `scrollWidth ≤ clientWidth`（先例 `test/editable-value.test.mjs`）；**起不来**则退回能确定的
 *      静态几何判据（标记与样式段里没有超过 390px 的固定宽度），并把「真机未跑」打进输出。
 *
 *  件数写进测试输出；清单里每一件都过一遍——不因「件太少」「这件还没在层出口加行」而跳过。
 *  环境开关：`ILIFE_SKIN_MATRIX_NO_MACHINE=1` 强制走静态判据；`ILIFE_SKIN_MATRIX_REQUIRE_MACHINE=1`
 *  要求真机（起不来就红——CI 想硬门时用它）。
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  BROADSHEET_VALUES, NEUTRAL_VALUES, PAPER_VALUES, SKIN_NAMES, SKINS, SKIN_TOKEN_NAMES, skinCss, skinTokenVar,
} from '../dist/blocks.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { COMPONENTS } from '../dist/components/清单.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const WIDTHS = [390, 1280];
/** 取值表**从注册表读**（不写死名单）：`SkinName` 一涨就自动跟上——
 *  早先这里是手写三套的映射，皮肤闭集一扩到六套就取到 `undefined` 当场抛（2026-09-24 实测踩过）。 */
const SKIN_VALUES = Object.fromEntries(SKIN_NAMES.map((s) => [s, SKINS[s].values]));
/** 剥 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把「解释」当「规则」）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
/** 剥 JS 字面量与注释（层红线说的是「剥掉字面量后不得出现 DOM 名」——运行时是**产出的文本**）。 */
const stripLiterals = (code) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/`(?:[^`\\]|\\.)*`/g, '``')
  .replace(/'(?:[^'\\]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\]|\\.)*"/g, '""');
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/* ── 吃件清单：每一件都装上（取不到就照实报，不静默少跑） ────────────── */

/** 把样例入参按路径写进去（`rows[0].label` 这种）。 */
function setPath(root, tokens, value) {
  const clone = JSON.parse(JSON.stringify(root === undefined || root === null ? {} : root));
  let at = clone;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const k = tokens[i];
    const nextIsIndex = typeof tokens[i + 1] === 'number';
    if (at[k] === undefined || at[k] === null || typeof at[k] !== 'object') at[k] = nextIsIndex ? [] : {};
    at = at[k];
  }
  at[tokens[tokens.length - 1]] = value;
  return clone;
}

const tokensOf = (path) => [...path.matchAll(/([A-Za-z_$][\w$]*)|\[(\d+)\]/g)]
  .map((m) => (m[1] === undefined ? Number(m[2]) : m[1]));

/** 从校验信息里读出被点到的那个入参路径（先找 `input.x.y`，没有就认 `名字: views[0].value 必须…` 这种写法）。 */
const PATH_RE = '[A-Za-z_$][\\w$]*(?:(?:\\[\\d+\\])|(?:\\.[A-Za-z_$][\\w$]*))*';
/** 中文数目字（件的校验信息里写「至少要两行」这种；只认个位与十）。 */
const CN_NUM = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const numberIn = (s) => (/^\d+$/.test(s) ? Number(s) : (CN_NUM[s] === undefined ? 2 : CN_NUM[s]));
function pathIn(message) {
  const withInput = new RegExp('input\\.(' + PATH_RE + ')').exec(message);
  if (withInput !== null) return withInput[1];
  const bare = new RegExp('(?:^|:\\s*)(' + PATH_RE + ')\\s*(?:的)?\\s*(?:必须|不得|只许|要|请|必填)').exec(message);
  return bare === null ? null : bare[1];
}

/** 读出一条路径上的现值。 */
function getPath(root, tokens) {
  let at = root;
  for (const k of tokens) {
    if (at === undefined || at === null) return undefined;
    at = at[k];
  }
  return at;
}

/** **按 render 自己的校验信息补一处**（通用文法，不按件名特判）；补不动返回 null。
 *
 *  为什么有这一层：README 的入参表说的是「字段面」，说不出「一周必须七格」「min 要小于 max」这类语义约束；
 *  而每一件的 `bad-input` 消息本来就点名了缺什么（层的硬规矩：入参违规一律报错、不静默降级），照它补一路即可。
 *  补的过程当读数打进测试输出——样例是照什么补出来的，谁都看得见。 */
function repairOnce(sample, message) {
  const path = pathIn(message);
  if (path === null) return null;
  const tokens = tokensOf(path);
  const say = (value) => ({ sample: setPath(sample, tokens, value), what: path + ' ← ' + JSON.stringify(value) });
  const exact = /恰好\s*(\d+)\s*个数/.exec(message);
  if (exact !== null) return say(new Array(Number(exact[1])).fill(1));
  const atLeast = /至少\s*(?:要\s*)?([一二三四五六七八九十两\d]+)\s*(?:行|条|个|项|格)/.exec(message);
  if (atLeast !== null) return say(new Array(numberIn(atLeast[1])).fill({}));
  const mult = /长度必须是\s*(\d+)\s*的倍数/.exec(message);
  // 补出来的格子给 `{}`，让件自己的校验信息把该有的字段一个个点出来——
  // 直接把第一格复制 N 份会把「只许出现在第一行」的字段也复制进去（invoice-lines 那类）。
  if (mult !== null) return say(new Array(Number(mult[1])).fill({}));
  const cmp = /必须\s*([A-Za-z_$][\w$]*)\s*<\s*([A-Za-z_$][\w$]*)/.exec(message);
  if (cmp !== null) {
    const a = setPath(sample, tokens.concat([cmp[1]]), 1);
    return {
      sample: setPath(a, tokens.concat([cmp[2]]), 2),
      what: path + '.' + cmp[1] + ' ← 1；' + path + '.' + cmp[2] + ' ← 2',
    };
  }
  const gt = new RegExp('必须大于\\s*input\\.(' + PATH_RE + ')').exec(message);
  if (gt !== null) {
    const other = getPath(sample, tokensOf(gt[1]));
    return say((typeof other === 'number' && Number.isFinite(other) ? other : 0) + 1);
  }
  if (/恰好给一个/.test(message)) {
    const named = [...message.matchAll(new RegExp('input\\.(' + PATH_RE + ')', 'g'))].map((m) => m[1]);
    if (named.length >= 2) {
      const clone = JSON.parse(JSON.stringify(sample));
      const t = tokensOf(named[1]);
      let at = clone;
      for (let i = 0; i < t.length - 1; i += 1) at = at[t[i]];
      delete at[t[t.length - 1]];
      return { sample: clone, what: '删掉 ' + named[1] + '（与 ' + named[0] + ' 恰好给一个）' };
    }
  }
  // 「要么给 X，要么给 Y」：给 X（1）。
  const either = /要么给\s*([A-Za-z_$][\w$]*)/.exec(message);
  if (either !== null) {
    return { sample: setPath(sample, tokens.concat([either[1]]), 1), what: path + '.' + either[1] + ' ← 1' };
  }
  // 「两个字段不许同一天／不许相同」：把第二个点名的那条换成一个不同的值。
  if (/不许同|不得同|不许一样/.test(message)) {
    const named = [...message.matchAll(new RegExp('input\\.(' + PATH_RE + ')', 'g'))].map((m) => m[1]);
    if (named.length >= 2) {
      const t = tokensOf(named[1]);
      const cur = getPath(sample, t);
      const next = typeof cur === 'string' ? bumpString(cur) : (typeof cur === 'number' ? cur + 1 : '示例2');
      return { sample: setPath(sample, t, next), what: named[1] + ' ← ' + JSON.stringify(next) + '（不许与 ' + named[0] + ' 相同）' };
    }
  }
  if (/只许标识符|标识符字符/.test(message)) return say('demo');
  // 闭集：「必须是 base／cut／add 之一」⇒ 取第一个档名。
  const oneOf = /必须[^：:]{0,6}是\s*([^\s（(]+?)\s*之一/.exec(message);
  if (oneOf !== null) {
    const first = oneOf[1].split(/[／/、,|]/).map((s) => s.replace(/[`'"]/g, '').trim()).filter((s) => s !== '')[0];
    if (first !== undefined) return say(first);
  }
  // 「必填（缺值请**显式**给 null：写成 —）」：让给 null 就给 null（那是这一件的「缺值」写法）。
  if (/必填/.test(message)) return say(/null/.test(message) ? null : '示例');
  if (/非空字符串|非空串|是字符串/.test(message)) return say(/(^|\.)(id|key)$/.test(path) ? 'demo' : '示例');
  if (/有限数|有穷数|数字|数值/.test(message)) return say(1);
  if (/非空数组/.test(message)) return say([{}]);
  if (/是数组/.test(message)) return say([{}]);
  if (/是对象/.test(message)) return say({});
  if (/布尔/.test(message)) return say(false);
  return null;
}

/** 换一个「确定不同」的值：日期型数字段末位 +1，其余串尾接 `-2`。 */
function bumpString(value) {
  const m = /^(.*?)(\d+)([^\d]*)$/.exec(value);
  if (m !== null) return m[1] + String(Number(m[2]) + 1).padStart(m[2].length, '0') + m[3];
  return value + '-2';
}

/** 渲染一次来拿标记：先用清单里那份样例；渲染不过就按件自己的报错补、再试（最多 12 轮）。 */
function renderWithRepair(mod, row) {
  let sample = row.sample === null ? {} : row.sample;
  const log = [];
  let last = '';
  for (let round = 0; round < 24; round += 1) {
    try {
      const html = mod[row.render](sample);
      if (typeof html !== 'string') return { err: row.render + '() 没吐出字符串' };
      return { html, sample, log };
    } catch (e) {
      const message = String(e && e.message ? e.message : e);
      last = message;
      const fixed = repairOnce(sample, message);
      if (fixed === null) return { err: message, log };
      sample = fixed.sample;
      log.push(fixed.what);
    }
  }
  return { err: '照 render 的报错补了 24 轮仍渲染不出来（最后一处：' + last + '）', log };
}

const PIECES = [];
for (const row of COMPONENTS) {
  const p = {
    row,
    entry: join(PKG, 'dist', 'components', row.name, 'index.js'),
    mod: null,
    css: null,
    html: null,
    sample: null,
    fixed: [],
    loadErr: '',
    renderSkip: '',
  };
  try {
    if (row.render === '') throw new Error('清单里这件抽不出渲染入口（index.ts 里没有 render*）');
    if (row.style === '') throw new Error('清单里这件抽不出样式函数（style.ts 里没有 *Css）');
    p.mod = await import(pathToFileURL(p.entry).href);
    if (typeof p.mod[row.render] !== 'function') {
      throw new Error('清单里的渲染入口 `' + row.render + '` 在该件的编译产物里不是函数'
        + '（件有多个 render* 出口时，清单取与本件同名的那一个）');
    }
    p.css = p.mod[row.style]();
    if (typeof p.css !== 'string') throw new Error(row.style + '() 没吐出字符串');
  } catch (e) {
    p.loadErr = String(e && e.message ? e.message : e);
  }
  if (p.loadErr === '') {
    const r = renderWithRepair(p.mod, row);
    if (r.err === undefined) {
      p.html = r.html;
      p.sample = r.sample;
      p.fixed = r.log;
    } else {
      // **明说跳过，不吞**：横切判据断的是「换皮不换结构／样式纪律」，
      // 它不该靠猜出一份能让每一件都渲染成功的入参 —— 猜不出来就把这一件的渲染类断言显式跳过，并打一行原因。
      p.renderSkip = r.err;
      console.log('跳过 ' + row.name + ' 的渲染类断言（① 标记逐字节相同／④ 两档溢出）：样例入参编不出来（'
        + r.err + '）——组件在正确地拦非法入参，这是判据侧的夹具缺口');
    }
  }
  PIECES.push(p);
}
/** 装不上（模块／样式函数取不到）＝真缺陷，红。 */
const ok = (p) => {
  if (p.loadErr !== '') throw new Error(p.row.name + '：' + p.loadErr);
  return p;
};
/** 渲染类断言（①／④）：样例编不出来就显式跳过（带原因），不红也不静默。 */
const renderable = (p, t) => {
  ok(p);
  if (p.renderSkip !== '') {
    t.skip(p.row.name + '：样例入参编不出来（' + p.renderSkip + '）');
    return false;
  }
  return true;
};

console.log('皮肤矩阵：件数=' + PIECES.length + '（' + PIECES.map((p) => p.row.name).join('、') + '）'
  + '；各套皮肤 × 两档 = ' + (PIECES.length * SKIN_NAMES.length * WIDTHS.length) + ' 格');

/* ── 样例从哪来（照实读数：README 派生 ＋ 照 render 报错补的那几件） ───── */

const REPAIRED = PIECES.filter((p) => p.fixed.length > 0);
if (REPAIRED.length > 0) {
  // 行本身截一下：补的明细可能很长（一周七格那种），但读数用不着把整份样例铺出来。
  const line = '读数：' + REPAIRED.length + ' 件的样例入参按 render 自己的校验信息补过：'
    + REPAIRED.map((p) => p.row.name + '（' + p.fixed.join('；') + '）').join(' ｜ ');
  console.log(line.length > 800 ? line.slice(0, 800) + '…（共 ' + line.length + ' 字）' : line);
}
const SKIPPED_RENDER = PIECES.filter((p) => p.renderSkip !== '');
if (SKIPPED_RENDER.length > 0) {
  console.log('读数：' + SKIPPED_RENDER.length + ' 件的渲染类断言显式跳过（①④）：' + SKIPPED_RENDER.map((p) => p.row.name).join('、')
    + '；② 样式纪律／③ 零 DOM 照跑（那两条不吃入参）');
}
const BROKEN = PIECES.filter((p) => p.loadErr !== '');
if (BROKEN.length > 0) {
  console.log('读数：' + BROKEN.length + ' 件装不上（模块／样式函数取不到，逐件报原文）：' + BROKEN.map((p) => p.row.name).join('、'));
}

/* ── 记录本（跨断言共用的派生面） ─────────────────────────────────── */

/** 一件样式段里的类名。 */
const classesIn = (css) => new Set([...css.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((m) => m[1]));
/** 一件标记里的类名。 */
const classesOfHtml = (html) => new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => c !== ''));
const PAGE_UI = 'ilife-page-ui';

/** 跨件泄漏面：每件标记里的类名（其余件的样式段一律不许提到它们）。 */
const MARKUP_CLASSES = new Map(PIECES.map((p) => [p.row.name, p.html === null ? new Set() : classesOfHtml(p.html)]));

/* ── 真机（headless Chrome ＋ CDP） ──────────────────────────────── */

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

/** 一页装下**全部件 × 各套皮肤 × 两档**（每格一只定宽容器），起 headless Chrome 读回来。 */
async function startMatrixPage(html) {
  const browser = findBrowser();
  if (browser === undefined) throw new Error('本机没找到 Chrome（试过 DSH_BROWSER／Program Files／Applications）');
  const dir = mkdtempSync(join(tmpdir(), 't-skin-'));
  const page = join(dir, 'matrix.html');
  writeFileSync(page, html, 'utf8');
  const profile = mkdtempSync(join(tmpdir(), 't-skin-chrome-'));
  const port = 9910 + (process.pid % 200);
  // stdio 一律 'ignore'：Chrome 的输出与测试进程间通信（node:test 的 IPC）之间不许有任何搭线机会
  // （实测过 `Unable to deserialize cloned data` 这类 runner 侧解析崩溃，就是被别的输出串了信道）。
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank'],
  { stdio: 'ignore', windowsHide: true });
  const cleanup = () => {
    try { chrome.kill(); } catch { /* 已退出 */ }
    for (const d of [profile, dir]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 临时目录 */ } }
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
        const why = d.exception && d.exception.description ? d.exception.description : d.text;
        throw new Error('页内抛错：' + why);
      }
      return r.result === undefined ? undefined : r.result.value;
    };
    await s('Page.enable'); await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(200);
    await ev(`window.__readPiece = function (name) {
      var stages = [].slice.call(document.querySelectorAll('[data-piece="' + name + '"]'));
      var markup = {}, geom = [];
      for (var i = 0; i < stages.length; i += 1) {
        var st = stages[i], skin = st.getAttribute('data-skin'), w = st.getAttribute('data-w');
        var host = st.firstElementChild;
        markup[w + '/' + skin] = host === null ? '' : host.innerHTML;
        var r = host === null ? null : host.getBoundingClientRect();
        var sr = st.getBoundingClientRect();
        geom.push({ w: Number(w), skin: skin, client: st.clientWidth, scroll: st.scrollWidth,
          rootW: r === null ? -1 : Math.round(r.width), stageW: Math.round(sr.width) });
      }
      var doc = document.scrollingElement;
      return { markup: markup, geom: geom, pageScroll: doc.scrollWidth, pageClient: doc.clientWidth };
    }; true`);
    // ⓿ 皮肤挂载读数：三只探针容器各读一遍**全 token**（缺一个都读成空串，判据那边抓得住）。
    await ev('window.__readSkins = function () {'
      + ' var tokens = ' + JSON.stringify([...SKIN_TOKEN_NAMES]) + ';'
      + ' var skins = ' + JSON.stringify([...SKIN_NAMES]) + ';'
      + ' var out = {};'
      + ' for (var i = 0; i < skins.length; i += 1) {'
      + '   var el = document.querySelector(\'[data-piece="__skin-probe"][data-skin="\' + skins[i] + \'"]\');'
      + '   var v = {};'
      + '   for (var k = 0; k < tokens.length; k += 1) {'
      + '     v[tokens[k]] = el === null ? "" : getComputedStyle(el).getPropertyValue("--ilife-" + tokens[k]).trim();'
      + '   }'
      + '   out[skins[i]] = v;'
      + ' }'
      + ' return out; }; true');
    return { ev, close: () => { cdp.close(); cleanup(); } };
  } catch (e) {
    cleanup();
    throw e;
  }
}

/** 整页 HTML：各套皮肤取值表 ＋ 各件自己的样式段 ＋ 「件 × 皮肤 × 宽度」全部格子（＋三只皮肤探针）。 */
function matrixPage() {
  const css = [skinCss(), ...PIECES.filter((p) => p.css !== null).map((p) => p.css)];
  const cells = [];
  for (const skin of SKIN_NAMES) {
    cells.push('<div class="stg ' + PAGE_UI + ' ilife-skin-' + skin + '" data-piece="__skin-probe" data-skin="'
      + skin + '" data-w="390" style="width:390px"><div class="host"></div></div>');
  }
  for (const p of PIECES) {
    if (p.html === null) continue;
    for (const skin of SKIN_NAMES) {
      for (const w of WIDTHS) {
        cells.push('<div class="stg ' + PAGE_UI + ' ' + 'ilife-skin-' + skin + '" data-piece="' + p.row.name
          + '" data-skin="' + skin + '" data-w="' + w + '" style="width:' + w + 'px">'
          + '<div class="host">' + p.html + '</div></div>');
      }
    }
  }
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><style>\n'
    + 'html,body{margin:0;padding:0;background:#f5f5f7}\n.stg{margin:0 0 12px}\n' + css.join('\n')
    + '\n</style></head>\n<body>\n' + cells.join('\n') + '\n</body></html>';
}

let machine = null;
let machineWhy = '';

before(async () => {
  if (process.env.ILIFE_SKIN_MATRIX_NO_MACHINE === '1') {
    machineWhy = 'ILIFE_SKIN_MATRIX_NO_MACHINE=1（按静态判据跑）';
    return;
  }
  try {
    machine = await startMatrixPage(matrixPage());
  } catch (e) {
    machine = null;
    machineWhy = String(e && e.message ? e.message : e);
  }
  if (machine === null) {
    console.log('真机未跑：' + machineWhy + ' ⇒ ④ 退回静态几何判据（标记与样式段里没有超过 ' + WIDTHS[0] + 'px 的固定宽度）');
    if (process.env.ILIFE_SKIN_MATRIX_REQUIRE_MACHINE === '1') {
      assert.fail('要求真机（ILIFE_SKIN_MATRIX_REQUIRE_MACHINE=1）但起不来：' + machineWhy);
    }
  } else {
    console.log('真机：headless Chrome ＋ CDP 起来了，两档溢出一律真量');
  }
});

after(() => { if (machine !== null) machine.close(); });

const readPiece = (name) => machine.ev('window.__readPiece(' + JSON.stringify(name) + ')');

/* ── ⓿ 各套皮肤真挂上（读数表逐 token 对上；两两不得重样） ─────────── */

describe('皮肤矩阵 ⓿ 各套皮肤真挂上（挂不上的话下面每一格都在测空气）', () => {
  it('每套给全 token、取值与自己的取值表逐 token 相同、任意两套不得逐 token 完全相同', async () => {
    if (machine === null) {
      // 真机起不来时退到不依赖浏览器的那一半：取值表本身的完备性与两两可分辨（读 TS 里的取值表）。
      for (const s of SKIN_NAMES) {
        assert.deepEqual(Object.keys(SKIN_VALUES[s]).slice().sort(), [...SKIN_TOKEN_NAMES].slice().sort(),
          s + ' 的取值表与 token 名单对不上（不漏不多）');
        for (const k of SKIN_TOKEN_NAMES) assert.notEqual(SKIN_VALUES[s][k].trim(), '', s + ' 的 ' + k + ' 是空值');
      }
      for (let i = 0; i < SKIN_NAMES.length; i += 1) {
        for (let j = i + 1; j < SKIN_NAMES.length; j += 1) {
          const a = SKIN_NAMES[i];
          const b = SKIN_NAMES[j];
          const diff = SKIN_TOKEN_NAMES.filter((k) => SKIN_VALUES[a][k] !== SKIN_VALUES[b][k]);
          assert.ok(diff.length > 0, a + ' 与 ' + b + ' 的取值表逐 token 完全相同（复制了一份没改？）');
        }
      }
      console.log('读数：真机未跑，⓿ 按取值表本身断（' + SKIN_TOKEN_NAMES.length + ' 个 token × ' + SKIN_NAMES.length + ' 套）');
      return;
    }
    const read = await machine.ev('window.__readSkins()');
    for (const s of SKIN_NAMES) {
      const got = read === undefined || read[s] === undefined ? {} : read[s];
      const keys = Object.keys(got);
      assert.deepEqual(keys.slice().sort(), [...SKIN_TOKEN_NAMES].slice().sort(),
        s + ' 皮肤没给全 token（挂在页面上的类没生效／少了几条）');
      for (const k of SKIN_TOKEN_NAMES) {
        assert.equal(got[k], SKIN_VALUES[s][k],
          s + ' 的 --ilife-' + k + ' 真机读到 ' + JSON.stringify(got[k]) + '，取值表里是 ' + JSON.stringify(SKIN_VALUES[s][k]));
      }
    }
    for (let i = 0; i < SKIN_NAMES.length; i += 1) {
      for (let j = i + 1; j < SKIN_NAMES.length; j += 1) {
        const a = SKIN_NAMES[i];
        const b = SKIN_NAMES[j];
        const diff = SKIN_TOKEN_NAMES.filter((k) => read[a][k] !== read[b][k]);
        assert.ok(diff.length > 0, a + ' 与 ' + b + ' 逐 token 完全相同（复制了一份皮肤没改）：'
          + JSON.stringify(SKIN_TOKEN_NAMES.map((k) => read[a][k])));
        console.log('读数：' + a + ' × ' + b + ' 有 ' + diff.length + '／' + SKIN_TOKEN_NAMES.length + ' 个 token 不同（' + diff.join('、') + '）');
      }
    }
  });
});

/* ── ① 各套皮肤下标记逐字节相同 ──────────────────────────────────── */

describe('皮肤矩阵 ① 各套皮肤下标记逐字节相同（换皮不换结构）', () => {
  for (const p of PIECES) {
    it(p.row.name + '：同一份入参渲染三次逐字节相同，且标记不带皮肤类', async (t) => {
      if (!renderable(p, t)) return;
      const again = p.mod[p.row.render](p.sample);
      const third = p.mod[p.row.render](p.sample);
      assert.equal(again, p.html, '第二次渲染与第一次不一致（同入参必须逐字节相同）');
      assert.equal(third, p.html, '第三次渲染与第一次不一致');
      assert.ok(p.html.length > 0, '样例入参渲出来的标记是空的（判据会空转）');
      assert.equal(/ilife-skin-/.test(p.html), false, '标记不许自带皮肤类（皮肤由页面挂，换皮才机械地不换结构）');
      if (machine === null) return;
      const r = await readPiece(p.row.name);
      for (const w of WIDTHS) {
        const [a, b, c] = SKIN_NAMES.map((s) => r.markup[w + '/' + s]);
        assert.ok(typeof a === 'string' && a.length > 0, w + ' 档真机上拿不到标记');
        assert.equal(b, a, w + ' 档：broadsheet 下的标记与 paper 下不同（只许样式不同）');
        assert.equal(c, a, w + ' 档：neutral 下的标记与 paper 下不同（只许样式不同）');
      }
    });
  }
});

/* ── ② 样式段纪律 ───────────────────────────────────────────────── */

describe('皮肤矩阵 ② 样式段纪律（违规逐条打出来：哪一条、实际值是什么）', () => {
  const scopeKind = new Map();
  for (const p of PIECES) {
    it(p.row.name + '：样式段非空／scope／零 :root·!important／零冻结 token 重定义／--ilife-* 全在名单里', () => {
      ok(p);
      const css = stripComments(p.css);
      const bad = [];
      const say = (line) => bad.push(p.row.name + '：' + line);
      if (css.trim() === '') say('样式段是空的（样式函数恒须返回非空 CSS 文本）');
      const selectors = (css.match(/^[^@\s][^{\n]*\{/gm) || []);
      if (selectors.length === 0) say('样式段里一条选择器规则都没有（剥离注释后）');
      const own = classesIn(css);
      const withScope = selectors.filter((sel) => sel.includes('.' + PAGE_UI));
      const without = selectors.filter((sel) => !sel.includes('.' + PAGE_UI));
      // 三种情形分得清清楚楚：全收进 page-ui／一条都没有（opt-in 注入型，见「跨件零交集」那条兜底）／夹生（半途而废的 scope ⇒ 违规）
      if (withScope.length > 0 && without.length > 0) {
        say('这些选择器没 scope 在 .' + PAGE_UI + ' 之下（同一段里夹生：要么全收，要么本件自己一套）：'
          + without.slice(0, 5).map((s) => JSON.stringify(s.trim())).join('；')
          + (without.length > 5 ? '；…共 ' + without.length + ' 条' : ''));
      }
      scopeKind.set(p.row.name, without.length === 0 ? 'page-ui' : (withScope.length === 0 ? '本件类名前缀（opt-in 注入型）' : '夹生'));
      for (const sel of selectors) {
        const classes = [...sel.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((m) => m[1]);
        if (classes.length === 0) say('选择器没落在类名上（裸元素／通配）：' + JSON.stringify(sel.trim()));
        if (withScope.length === 0) {
          for (const c of classes) {
            if (c !== PAGE_UI && !own.has(c)) say('选择器用了样式段里没有的类名：' + JSON.stringify(sel.trim()));
          }
        }
      }
      if (css.includes(':root')) {
        const at = css.indexOf(':root');
        say('写了 :root（第 ' + (css.slice(0, at).split('\n').length) + ' 行附近）：' + JSON.stringify(css.slice(Math.max(0, at - 20), at + 60)));
      }
      if (css.includes('!important')) {
        const at = css.indexOf('!important');
        say('写了 !important：' + JSON.stringify(css.slice(Math.max(0, at - 60), at + 12)));
      }
      for (const token of Object.keys(CSS_VAR_TOKENS)) {
        const m = new RegExp('(?:^|[;{\\s])(' + token + '\\s*:[^;}]*)[;}]').exec(css + ';');
        if (m !== null) say('重定义了冻结 token（本层只兜底到它，不改它）：' + JSON.stringify(m[1].trim()));
      }
      const known = new Set(SKIN_TOKEN_NAMES.map((k) => skinTokenVar(k)));
      const unknown = [...new Set([...css.matchAll(/--ilife-[a-z0-9-]+/g)].map((m) => m[0]))].filter((n) => !known.has(n));
      if (unknown.length > 0) say('用了名单外的 --ilife-* 名（拼错会被静默兜底）：' + unknown.join('、'));
      const defined = [...css.matchAll(/(?:^|[;{\s])(--ilife-[a-z0-9-]+\s*:[^;}]*)/g)].map((m) => m[1].trim());
      if (defined.length > 0) say('组件里**定义**了 --ilife-*（取值表住皮肤层，组件只许经 skinVar() 读）：' + defined.join('；'));
      if (bad.length > 0) {
        for (const line of bad) console.error(line);
        assert.deepEqual(bad, [], bad.length + ' 条样式段纪律不合格：' + bad.join('；'));
      }
    });
  }

  it('跨件零交集：一件的样式段不许提到**别件自己的名字面**里的类名', () => {
    // 只查 `ilife-` 打头的名字面类名：`is-*` 这类状态词是全层共用词汇（同名的 `is-on`／`is-ok` 各件都在用），
    // 不算泄漏；真有泄漏长这样：A 的样式段去改 B 的 `.ilife-block-sheet`。
    const bad = [];
    for (const p of PIECES) {
      if (p.css === null) continue;
      const mine = MARKUP_CLASSES.get(p.row.name);
      const others = [...MARKUP_CLASSES.entries()].filter(([other]) => other !== p.row.name);
      for (const c of classesIn(stripComments(p.css))) {
        if (mine.has(c) || !c.startsWith('ilife-')) continue;
        const owners = others.filter(([, classes]) => classes.has(c));
        if (owners.length === 1) bad.push(p.row.name + ' 的样式段提到了 ' + owners[0][0] + ' 的类名 .' + c);
      }
    }
    if (bad.length > 0) for (const line of bad) console.error('跨件泄漏：' + line);
    assert.deepEqual(bad, [], '跨件泄漏：' + bad.join('；'));
  });

  it('scope 读数：哪几件收进了 page-ui、哪几件是 opt-in 注入型、哪几件夹生', () => {
    const of = (kind) => [...scopeKind.entries()].filter(([, v]) => v === kind).map(([k]) => k);
    console.log('读数：scope＝page-ui 的件 ' + of('page-ui').length + '／本件自己一套（opt-in）的件 ' + of('本件类名前缀（opt-in 注入型）').length
      + '／夹生的件 ' + of('夹生').length);
    if (of('本件类名前缀（opt-in 注入型）').length > 0) {
      console.log('读数：未收进 .' + PAGE_UI + ' 的件（靠 opt-in 注入 ＋ 本件类名自限）：' + of('本件类名前缀（opt-in 注入型）').join('、'));
    }
    assert.ok(scopeKind.size > 0, '一件都没判到 ⇒ 判据空转');
  });
});

/* ── ③ 零 DOM 纪律 ─────────────────────────────────────────────── */

describe('皮肤矩阵 ③ 零 DOM 纪律（dist/components/<件名>/**）', () => {
  for (const p of PIECES) {
    it(p.row.name + '：模块代码剥掉字面量与注释后零 document.／window.／navigator.', () => {
      const root = join(PKG, 'dist', 'components', p.row.name);
      const files = [];
      const walk = (at) => {
        for (const e of readdirSync(at, { withFileTypes: true })) {
          const full = join(at, e.name);
          if (e.isDirectory()) walk(full); else if (e.name.endsWith('.js')) files.push(full);
        }
      };
      assert.ok(existsSync(root), '编译产物缺：dist/components/' + p.row.name + '/（先跑 tsc）');
      walk(root);
      assert.ok(files.length > 0, p.row.name + ' 的 dist 目录里没有 .js（判据会空转）');
      for (const file of files) {
        const code = stripLiterals(readFileSync(file, 'utf8'));
        for (const needle of ['document.', 'window.', 'navigator.']) {
          assert.equal(code.includes(needle), false,
            file.replace(/.*dist/, 'dist') + ' 里出现了 ' + needle + '（DOM 只许出现在产出的 JS 文本里）');
        }
      }
    });
  }
});

/* ── ④ 两档溢出读数（390／1280） ─────────────────────────────────── */

/** 把 **at-rule 的查询前置**（`@container`／`@media` 到它那个 `{` 之前）整段挖掉，换成等长空白。
 *
 *  为什么要有这一步：查询前置里写的宽度是**条件**，不是元素宽度——
 *  `@container (min-width: 620px) { … }` 里的 620 是「容器够宽才生效」的门槛，
 *  拿它当「这件元素宽 620px」判会**冤枉按容器查询分档的件**（2026-09-25 实测：`gantt-timeline`
 *  的宽档查询被 ④ 的静态判据误报成「过不了窄档的固定宽度」）。挖掉前置、留等长空白：
 *  位置不错位，元素级的固定宽度一条都不放过。
 */
function stripAtRulePreludes(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    if (!css.startsWith('@container', i) && !css.startsWith('@media', i)) { out += css[i]; i += 1; continue; }
    const open = css.indexOf('{', i);
    if (open === -1) { out += ' '.repeat(css.length - i); break; }
    out += ' '.repeat(open - i + 1);
    i = open + 1;
  }
  return out;
}

/** 一段文本里**过不了窄档的固定宽度**（px）：剥掉注释与 at-rule 查询前置之后，
 *  「元素级」`width`／`min-width` 超过 `limit` 的那些值。标记与样式段都走这一把（静态几何判据的唯一口径）。 */
function fixedWidthsOver(text, limit) {
  const clean = stripAtRulePreludes(stripComments(text));
  return [...clean.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)]
    .map((m) => Number(m[1])).filter((v) => v > limit);
}

describe('皮肤矩阵 ④ 两档溢出读数（390／1280）', () => {
  for (const p of PIECES) {
    it(p.row.name + '：两档定宽容器里不横溢', async (t) => {
      if (!renderable(p, t)) return;
      // 静态几何判据（哪台机器都跑）：标记与样式段里不得出现超过窄档的**元素级**固定宽度
      //（`@container`／`@media` 查询前置里的数值是条件、不是元素宽度——见 `stripAtRulePreludes()`）。
      const wide = [...fixedWidthsOver(p.html, WIDTHS[0]), ...fixedWidthsOver(p.css, WIDTHS[0])];
      assert.deepEqual(wide, [], p.row.name + ' 里出现过不了窄档的固定宽度（>' + WIDTHS[0] + 'px）：' + wide.join('、'));
      if (machine === null) {
        assert.ok(machineWhy !== '', '真机没跑就得给出原因（不许静默退回）');
        return;
      }
      const r = await readPiece(p.row.name);
      assert.ok(r.pageScroll <= r.pageClient + 1, p.row.name + '：整页出现横向滚动（' + r.pageScroll + ' > ' + r.pageClient + '）');
      const reads = [];
      for (const g of r.geom) {
        reads.push(g.w + '档（' + g.skin + '）：scroll ' + g.scroll + '/' + g.client + '，根宽 ' + g.rootW + '/' + g.stageW);
        assert.ok(g.scroll <= g.client, p.row.name + ' 在 ' + g.w + 'px 档（' + g.skin + '）横溢：scrollWidth=' + g.scroll + ' > clientWidth=' + g.client);
        assert.ok(g.rootW <= g.stageW + 1, p.row.name + ' 的根比容器还宽：' + g.rootW + ' > ' + g.stageW);
      }
      console.log('读数 ' + p.row.name + '：' + reads.join('；'));
    });
  }
});

describe('皮肤矩阵 ④b：静态几何检查器自证（守门人的守门人）', () => {
  it('查询前置里的宽度不算元素宽度；元素级固定宽度一个都不放过', () => {
    /** `[输入, 期望]`：**条件**里的数值一律不报（那是「容器够宽才生效」的门槛），**元素级**的照报。 */
    const cases = [
      ['@container (min-width: 620px) {\n  .a { width: 10px; }\n}', []],
      ['.x{min-width:620px}', [620]],
      ['.x{width:620px}', [620]],
      ['.x{max-width:620px}', []],
      ['@media (min-width: 620px) { .y { min-width: 900px; } }', [900]],
      ['/* 宽容器（≥620px） */\n.a { color: red; }', []],
      ['.a { width: 390px; }', []],
    ];
    const got = cases.map(([css]) => fixedWidthsOver(css, 390));
    assert.deepEqual(got, cases.map(([, want]) => want),
      '静态几何检查器与预期不符（把条件当元素宽度＝假阳性；放过元素级＝漏报）：'
      + JSON.stringify(cases.map(([css], i) => ({ css, got: got[i] }))));
  });
});
